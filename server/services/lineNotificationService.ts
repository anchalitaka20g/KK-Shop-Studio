/**
 * KK Shop Content Studio - Real LINE Notification Service
 * Sends daily 21:00 approval reminders and 72-hour performance reports
 * Uses LINE Messaging API (Push Messages, Reply Messages & Verified Webhooks)
 */

import { PerformanceCheck, LineNotificationRecord } from '../types.js';
import { db } from '../db.js';
import { config } from '../config.js';
import { safeLogger, maskUserId } from '../utils/redact.js';

export class LineNotificationService {
  constructor() {}

  private get channelAccessToken(): string {
    return config.line.channelAccessToken;
  }

  private get channelSecret(): string {
    return config.line.channelSecret;
  }

  private get adminUserId(): string | undefined {
    return db.getLineAdminUserId();
  }

  /**
   * Checks whether the required secrets are present in environment
   */
  isConfigured(): boolean {
    return config.line.isConfigured;
  }

  /**
   * Tests LINE connection credentials and reports registration state
   */
  async testConnection(reqBaseUrl?: string): Promise<{
    status: 'NOT_CONNECTED' | 'WEBHOOK_READY' | 'CONNECTED' | 'ERROR';
    hasChannelAccessToken: boolean;
    hasChannelSecret: boolean;
    channelAccessTokenConfigured: 'configured' | 'missing';
    channelSecretConfigured: 'configured' | 'missing';
    adminRecipientStatus: 'registered' | 'not registered';
    adminRecipient: 'registered' | 'not registered';
    maskedAdminUserId: string | null;
    webhookUrl: string;
    message: string;
    botInfo?: { displayName?: string; basicId?: string };
  }> {
    const hasToken = Boolean(this.channelAccessToken && this.channelAccessToken.length > 20);
    const hasSecret = Boolean(this.channelSecret && this.channelSecret.length > 10);
    const registeredAdmin = this.adminUserId;
    const base = reqBaseUrl || config.system.appUrl;
    const webhookUrl = `${base.replace(/\/$/, '')}/api/line/webhook`;
    const status = db.getLineWebhookStatus();

    let botInfo: { displayName?: string; basicId?: string } | undefined;
    let message = '';

    if (!hasToken || !hasSecret) {
      message = 'กรุณาระบุ LINE_CHANNEL_ACCESS_TOKEN และ LINE_CHANNEL_SECRET ใน AI Studio Secrets';
    } else {
      // Validate token with LINE bot info API
      try {
        const res = await fetch('https://api.line.me/v2/bot/info', {
          headers: { Authorization: `Bearer ${this.channelAccessToken}` },
        });
        if (res.ok) {
          const info = await res.json();
          botInfo = {
            displayName: info.displayName,
            basicId: info.basicId,
          };
          if (registeredAdmin) {
            message = `เชื่อมต่อกับ LINE OA "${info.displayName}" สำเร็จ และผูกบัญชีแอดมิน (${maskUserId(registeredAdmin)}) แล้ว`;
          } else {
            message = `เชื่อมต่อกับ LINE OA "${info.displayName}" พร้อมใช้งาน — กรุณาส่งข้อความ "test" เข้า LINE เพื่อผูกบัญชีแอดมิน`;
          }
        } else {
          const err = await res.json().catch(() => ({}));
          message = `LINE Access Token ไม่ถูกต้อง (${res.status}): ${err.message || 'Unauthorized'}`;
        }
      } catch (err: any) {
        message = `ไม่สามารถเชื่อมต่อ LINE API: ${err.message}`;
      }
    }

    return {
      status,
      hasChannelAccessToken: hasToken,
      hasChannelSecret: hasSecret,
      channelAccessTokenConfigured: hasToken ? 'configured' : 'missing',
      channelSecretConfigured: hasSecret ? 'configured' : 'missing',
      adminRecipientStatus: registeredAdmin ? 'registered' : 'not registered',
      adminRecipient: registeredAdmin ? 'registered' : 'not registered',
      maskedAdminUserId: registeredAdmin ? maskUserId(registeredAdmin) : null,
      webhookUrl,
      message,
      botInfo,
    };
  }

  /**
   * Sends real push message to registered administrator LINE user ID
   */
  async sendText(text: string): Promise<LineNotificationRecord> {
    return this.sendTextWithRecord(text, 'TEST');
  }

  /**
   * Internal sender that records the notification log
   */
  private async sendTextWithRecord(
    text: string,
    type: 'DAILY_APPROVAL_SUMMARY' | 'PERFORMANCE_72H_REPORT' | 'TEST'
  ): Promise<LineNotificationRecord> {
    const adminId = this.adminUserId;
    if (!adminId) {
      throw new Error(
        'ยังไม่มีการลงทะเบียน Admin LINE User ID (กรุณาส่งข้อความ "test" เข้า LINE Official Account เพื่อเชื่อมต่อบัญชี)'
      );
    }

    if (!this.channelAccessToken) {
      throw new Error('ยังไม่ได้กำหนด LINE_CHANNEL_ACCESS_TOKEN ใน Secrets');
    }

    const timestamp = new Date().toISOString();
    const maskedTarget = maskUserId(adminId);

    try {
      const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.channelAccessToken}`,
        },
        body: JSON.stringify({
          to: adminId,
          messages: [
            {
              type: 'text',
              text,
            },
          ],
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.message || `LINE API error HTTP ${res.status}`;
        throw new Error(errorMsg);
      }

      const record: LineNotificationRecord = {
        id: `LINE-${Date.now()}`,
        type,
        timestamp,
        message: text,
        targetId: maskedTarget,
        status: 'SENT',
      };
      db.saveLineNotification(record);
      db.addAuditLog({
        id: `LOG-${Date.now()}`,
        timestamp,
        user: 'ระบบแจ้งเตือน (LineNotificationService)',
        action: 'LINE_NOTIFICATION_SENT',
        result: 'SUCCESS',
        details: `ส่งข้อความแจ้งเตือนผ่าน LINE Push เข้าผู้ดูแลระบบ (${maskedTarget}) สำเร็จ (${type})`,
        metadata: { isSimulated: false, type },
      });

      return record;
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      safeLogger.error('LINE notification dispatch failed:', errorMsg);

      const record: LineNotificationRecord = {
        id: `LINE-${Date.now()}`,
        type,
        timestamp,
        message: text,
        targetId: maskedTarget,
        status: 'FAILED',
        error: errorMsg,
      };
      db.saveLineNotification(record);
      db.addAuditLog({
        id: `LOG-${Date.now()}`,
        timestamp,
        user: 'ระบบแจ้งเตือน (LineNotificationService)',
        action: 'LINE_NOTIFICATION_SENT',
        result: 'FAILED',
        details: `ส่งแจ้งเตือน LINE ล้มเหลว (${maskedTarget}): ${errorMsg}`,
      });
      throw new Error(`ส่ง LINE ไม่สำเร็จ: ${errorMsg}`);
    }
  }

  /**
   * Daily 21:00 Asia/Bangkok Approval Summary
   * Sends ONE summary containing only real jobs with WAITING_APPROVAL
   */
  async sendApprovalSummary(): Promise<LineNotificationRecord | null> {
    const waitingJobs = db.getContentJobs('WAITING_APPROVAL');
    if (waitingJobs.length === 0) {
      safeLogger.info('No jobs WAITING_APPROVAL, skipping daily LINE notification');
      return null;
    }

    const appUrl = config.system.appUrl;
    const approvalLink = `${appUrl}/#approval`;

    let message = `📋 [KK Shop Studio] รายงานสรุปงานรอตรวจประจำวัน (21:00 น.)\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `จำนวนงานรอตรวจ: ${waitingJobs.length} รายการ\n\n`;

    waitingJobs.forEach((job, index) => {
      message += `【รายการที่ ${index + 1}】\n`;
      message += `• CONTENT_ID: ${job.id}\n`;
      message += `• ประเภท Content: ${job.contentType}\n`;
      message += `• ชื่อสินค้า: ${job.productName}\n`;
      message += `• ราคา: NT$ ${job.priceNTD}\n`;
      message += `• Headline: ${job.creativeBrief?.headline || '-'}\n`;
      if (job.creativeBrief?.scheduledRecommendation) {
        message += `• คำแนะนำเวลาโพสต์: ${job.creativeBrief.scheduledRecommendation}\n`;
      }
      message += `\n`;
    });

    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `⚠️ ข้อกำหนดความปลอดภัย:\n`;
    message += `ระบบจะไม่ทำการอนุมัติหรือตั้งเวลาโพสต์โดยอัตโนมัติ เนื้อหาต้องผ่านการตรวจและอนุมัติจากผู้ดูแลระบบเท่านั้น\n\n`;
    message += `👉 ตรวจสอบและอนุมัติได้ที่ Approval Center:\n${approvalLink}`;

    return this.sendTextWithRecord(message, 'DAILY_APPROVAL_SUMMARY');
  }

  /**
   * Alias for sendApprovalSummary for cron trigger compatibility
   */
  async sendDailyApprovalSummary(): Promise<LineNotificationRecord | null> {
    return this.sendApprovalSummary();
  }

  /**
   * 72-Hour Performance Evaluation Alert
   * Evaluated only once per Facebook post that reached 72 hours
   */
  async sendPerformanceReport(checkOrContentId: string | PerformanceCheck): Promise<LineNotificationRecord> {
    let check: PerformanceCheck | undefined;
    if (typeof checkOrContentId === 'string') {
      check = db.getPerformanceChecks().find(
        c => c.contentId === checkOrContentId || c.facebookPostId === checkOrContentId || c.id === checkOrContentId
      );
      if (!check) {
        throw new Error(`ไม่พบรายงานผลงานประสิทธิภาพ 72 ชม. สำหรับ: ${checkOrContentId}`);
      }
    } else {
      check = checkOrContentId;
    }

    const appUrl = config.system.appUrl;
    const perfLink = `${appUrl}/#performance`;

    const bangkokPubDate = new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(check.publishedAt));

    const message =
      `📊 [KK Shop] รายงานผลงาน 72 ชม. หลังโพสต์ Facebook\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 สินค้า: ${check.productName}\n` +
      `🆔 CONTENT_ID: ${check.contentId}\n` +
      `🗓️ วันที่โพสต์: ${bangkokPubDate} น.\n\n` +
      `📈 สถิติจริงจาก Facebook Insights (72 ชม.):\n` +
      `• Reach (เข้าถึง): ${check.reach.toLocaleString()} คน\n` +
      `• Impressions: ${check.impressions.toLocaleString()} ครั้ง\n` +
      `• Reactions: ${check.reactions.toLocaleString()}\n` +
      `• Comments: ${check.comments.toLocaleString()}\n` +
      `• Shares: ${check.shares.toLocaleString()}\n` +
      `• Engagement รวม: ${check.engagement.toLocaleString()} ครั้ง\n` +
      `• Engagement Rate: ${check.engagementRate}%\n\n` +
      `💡 สรุปการวิเคราะห์:\n${check.summaryThai}\n\n` +
      `👉 ดูแดชบอร์ดสถิติเต็ม: ${perfLink}`;

    return this.sendTextWithRecord(message, 'PERFORMANCE_72H_REPORT');
  }

  /**
   * Replies to webhook event using replyToken
   */
  async replyMessage(replyToken: string, text: string): Promise<void> {
    if (!this.channelAccessToken) {
      safeLogger.warn('Cannot reply to LINE event: LINE_CHANNEL_ACCESS_TOKEN is not configured');
      return;
    }

    try {
      const res = await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.channelAccessToken}`,
        },
        body: JSON.stringify({
          replyToken,
          messages: [
            {
              type: 'text',
              text,
            },
          ],
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        safeLogger.error('LINE Reply API error:', errorData);
      }
    } catch (err: any) {
      safeLogger.error('LINE Reply API network error:', err.message);
    }
  }

  /**
   * Processes verified webhook event:
   * When user sends "test", register event.source.userId securely and reply with confirmation.
   */
  async handleWebhookEvent(event: any): Promise<void> {
    if (event.type === 'message' && event.message?.type === 'text') {
      const text = (event.message.text || '').trim();
      if (text.toLowerCase() === 'test') {
        const userId = event.source?.userId;
        if (userId) {
          db.setLineAdminUserId(userId);
          const masked = maskUserId(userId);

          safeLogger.info(`Registered administrator LINE userId: ${masked}`);
          db.addAuditLog({
            id: `LOG-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user: 'ผู้ดูแลระบบ (LINE Webhook)',
            action: 'LINE_NOTIFICATION_SENT',
            result: 'SUCCESS',
            details: `ผู้ดูแลระบบลงทะเบียน LINE User ID สำเร็จ (${masked}) จากการส่งข้อความ "test"`,
          });

          // Reply with required confirmation text
          if (event.replyToken) {
            await this.replyMessage(event.replyToken, '✅ KK Shop Studio เชื่อมต่อ LINE สำเร็จ');
          }
        }
      }
    }
  }

  /**
   * Sends test message to the registered administrator
   */
  async sendTestMessage(): Promise<LineNotificationRecord> {
    const nowBangkok = new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(new Date());

    const text =
      `🔔 [KK Shop Content Studio] ข้อความทดสอบการเชื่อมต่อระบบแจ้งเตือน LINE\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `สถานะ: เชื่อมต่อสำเร็จ ✅\n` +
      `เวลาส่ง: ${nowBangkok} น. (เวลาไทย)\n` +
      `ระบบพร้อมส่งสรุปงานรอตรวจประจำวัน (21:00 น.) และรายงานผลงาน 72 ชม. เข้าบัญชีนี้`;

    return this.sendText(text);
  }
}

export const lineNotificationService = new LineNotificationService();
