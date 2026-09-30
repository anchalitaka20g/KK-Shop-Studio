/**
 * KK Shop Content Studio - Facebook Publishing Service
 * Communicates with Meta Graph API server-side
 * Hardened with Facebook Publishing Safety Switch & Transactional Idempotency
 */

import { ContentJob, PublishedPost, PublishingLockRecord, PublishJobState } from '../types.js';
import { db } from '../db.js';
import { config } from '../config.js';
import { safeLogger } from '../utils/redact.js';

export interface PublishResult {
  success: boolean;
  contentId: string;
  facebookPostId?: string;
  facebookPostUrl?: string;
  isSimulated: boolean;
  publishedAt: string;
  idempotencyKey?: string;
  error?: string;
  rawResponse?: any;
}

export class FacebookPublishingService {
  // In-memory lock registry for concurrency & idempotency protection
  private publishingLocks: Map<string, PublishingLockRecord> = new Map();

  constructor() {}

  private get pageId(): string {
    return config.facebook.pageId;
  }

  private get accessToken(): string {
    return config.facebook.pageAccessToken;
  }

  private isConfigured(): boolean {
    return config.facebook.isConfigured;
  }

  private isPublishingEnabled(): boolean {
    return config.facebook.publishingEnabled;
  }

  /**
   * Generates a deterministic idempotency key for the publishing job.
   */
  public generateIdempotencyKey(job: ContentJob): string {
    const version = job.approvedVersion || 1;
    const scheduleTime = job.scheduledAt ? new Date(job.scheduledAt).toISOString() : 'immediate';
    return `${job.id}_v${version}_${scheduleTime}`;
  }

  /**
   * Publishes content to Facebook Page
   * STRICT ENFORCEMENT:
   * 1. Safety switch FACEBOOK_PUBLISHING_ENABLED === 'true'
   * 2. Content must be APPROVED or SCHEDULED with a valid approval record
   * 3. Snapshot must match current content
   * 4. Concurrency lock & Idempotency key prevent duplicate publishing
   */
  async publishContent(job: ContentJob, dryRun = false): Promise<PublishResult> {
    const requestTime = new Date().toISOString();
    const idempotencyKey = this.generateIdempotencyKey(job);

    // 1. Strict approval check: Content must be APPROVED or SCHEDULED from an approved version
    if (job.status !== 'APPROVED' && job.status !== 'SCHEDULED') {
      const errorMsg = `การละเมิดกฎความปลอดภัย: คอนเทนต์ ${job.id} ไม่อยู่ในสถานะ APPROVED หรือ SCHEDULED (สถานะปัจจุบัน: ${job.status})`;
      db.addAuditLog({
        id: `LOG-${Date.now()}`,
        timestamp: requestTime,
        user: 'ระบบความปลอดภัย (Approval Guard)',
        contentId: job.id,
        action: 'PUBLISH_FAILED',
        result: 'FAILED',
        details: errorMsg,
      });
      throw new Error(errorMsg);
    }

    // 2. Strict approval verification: Check approvalId & snapshot match
    if (!job.approvalId) {
      const errorMsg = `การปฏิเสธการเผยแพร่: คอนเทนต์ ${job.id} ไม่มีรหัสการอนุมัติ (Approval ID) ที่ถูกต้องจากผู้ดูแลระบบ`;
      db.addAuditLog({
        id: `LOG-${Date.now()}`,
        timestamp: requestTime,
        user: 'ระบบความปลอดภัย (Approval Guard)',
        contentId: job.id,
        action: 'PUBLISH_FAILED',
        result: 'FAILED',
        details: errorMsg,
      });
      throw new Error(errorMsg);
    }

    // If an approved snapshot exists, verify it matches the current content
    if (job.approvedSnapshot) {
      const isCaptionTampered = job.approvedSnapshot.caption !== job.caption;
      const isPriceTampered = job.approvedSnapshot.priceNTD !== job.priceNTD;
      if (isCaptionTampered || isPriceTampered) {
        // Invalidate approval
        job.status = 'WAITING_APPROVAL';
        job.approvalId = undefined;
        job.approvedSnapshot = undefined;
        db.saveContentJob(job);

        const errorMsg = `ตรวจพบการแก้ไขเนื้อหาหลังการอนุมัติ (Caption หรือ Price เปลี่ยนแปลง): ยกเลิกการอนุมัติทันทีและปรับสถานะเป็น WAITING_APPROVAL`;
        db.addAuditLog({
          id: `LOG-${Date.now()}`,
          timestamp: requestTime,
          user: 'ระบบความปลอดภัย (Tamper Guard)',
          contentId: job.id,
          action: 'APPROVAL_INVALIDATED',
          result: 'FAILED',
          details: errorMsg,
        });
        throw new Error(errorMsg);
      }
    }

    // 3. Prevent duplicate publishing if already POSTED with facebookPostId
    if (Boolean(job.facebookPostId)) {
      const errorMsg = `ป้องกันการโพสต์ซ้ำ (Idempotency): คอนเทนต์ ${job.id} ได้รับการเผยแพร่ไปแล้ว มี Facebook Post ID: ${job.facebookPostId}`;
      safeLogger.warn(errorMsg);
      db.addAuditLog({
        id: `LOG-${Date.now()}`,
        timestamp: requestTime,
        user: 'ระบบป้องกันโพสต์ซ้ำ (Idempotency Guard)',
        contentId: job.id,
        action: 'PUBLISH_FAILED',
        result: 'WARNING',
        details: errorMsg,
      });

      return {
        success: true,
        contentId: job.id,
        facebookPostId: job.facebookPostId,
        facebookPostUrl: job.facebookPostUrl,
        isSimulated: false,
        publishedAt: job.postedAt || requestTime,
        idempotencyKey,
      };
    }

    // 4. Transactional Concurrency Lock Check
    const existingLock = this.publishingLocks.get(idempotencyKey);
    if (existingLock) {
      if (existingLock.state === 'PROCESSING') {
        const errorMsg = `ป้องกันการส่งซ้ำพร้อมกัน: งานเผยแพร่ ${idempotencyKey} กำลังอยู่ระหว่างดำเนินการ (PROCESSING) โดย worker อื่น`;
        safeLogger.warn(errorMsg);
        throw new Error(errorMsg);
      }
      if (existingLock.state === 'POSTED' && existingLock.facebookPostId) {
        return {
          success: true,
          contentId: job.id,
          facebookPostId: existingLock.facebookPostId,
          facebookPostUrl: `https://facebook.com/${this.pageId}/posts/${existingLock.facebookPostId}`,
          isSimulated: false,
          publishedAt: existingLock.lockedAt,
          idempotencyKey,
        };
      }
    }

    // Acquire lock
    this.publishingLocks.set(idempotencyKey, {
      idempotencyKey,
      contentId: job.id,
      approvedVersion: job.approvedVersion || 1,
      scheduledAt: job.scheduledAt,
      state: 'PROCESSING',
      lockedAt: requestTime,
    });

    // Determine if this is a live publish or simulation
    const canPublishLive =
      this.isConfigured() &&
      this.isPublishingEnabled() &&
      !dryRun;

    // If real publishing requested but safety switch is disabled or missing credentials
    if (!dryRun && !canPublishLive) {
      // Check specific reason
      if (!this.pageId || !this.accessToken) {
        safeLogger.info(`Facebook credentials missing; falling back to secure dry-run/simulation for ${job.id}`);
      } else if (!this.isPublishingEnabled()) {
        safeLogger.info(`FACEBOOK_PUBLISHING_ENABLED is false; executing in safe test mode for ${job.id}`);
      }
    }

    // Update job status to POSTING
    db.updateContentJobStatus(job.id, 'POSTING');
    db.addAuditLog({
      id: `LOG-${Date.now()}`,
      timestamp: requestTime,
      user: 'ผู้ดูแลระบบ (Admin)',
      contentId: job.id,
      action: 'POSTING_STARTED',
      result: 'SUCCESS',
      details: canPublishLive
        ? `เริ่มกระบวนการเผยแพร่จริงไปยัง Meta Graph API (Page ID: ${this.pageId})`
        : `เริ่มกระบวนการเผยแพร่ในโหมดจำลองความปลอดภัย (Dry Run / Test Mode)`,
      metadata: { idempotencyKey, canPublishLive, dryRun },
    });

    if (!canPublishLive) {
      // Simulation / Test Publishing Mode
      const mockPostNumber = Math.floor(100000000000000 + Math.random() * 900000000000000);
      const simulatedPostId = this.pageId ? `${this.pageId}_${mockPostNumber}` : `SIM_POST_${mockPostNumber}`;
      const simulatedPostUrl = this.pageId
        ? `https://facebook.com/${this.pageId}/posts/${mockPostNumber}`
        : `https://facebook.com/demo/posts/${mockPostNumber}`;
      const publishedAt = new Date().toISOString();
      const performanceCheckAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

      const bangkokDate = new Intl.DateTimeFormat('th-TH', {
        timeZone: 'Asia/Bangkok',
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(publishedAt));

      // Mark content job as POSTED
      db.updateContentJobStatus(job.id, 'POSTED', {
        postedAt: publishedAt,
        facebookPostId: simulatedPostId,
        facebookPostUrl: simulatedPostUrl,
        performanceCheckAt,
      });

      // Save to publishedPosts
      const publishedRecord: PublishedPost = {
        id: `PUB-${Date.now()}`,
        contentId: job.id,
        facebookPostId: simulatedPostId,
        facebookPostUrl: simulatedPostUrl,
        productName: job.productName,
        contentType: job.contentType,
        caption: job.caption,
        mediaUrl: job.generatedImageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
        publishedAt,
        publishedAtBangkok: `${bangkokDate} น.`,
        performanceCheckAt,
        isPerformanceChecked: false,
      };
      db.savePublishedPost(publishedRecord);

      // Release lock with POSTED state
      this.publishingLocks.set(idempotencyKey, {
        idempotencyKey,
        contentId: job.id,
        approvedVersion: job.approvedVersion || 1,
        scheduledAt: job.scheduledAt,
        state: 'POSTED',
        lockedAt: publishedAt,
        facebookPostId: simulatedPostId,
      });

      db.addAuditLog({
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: 'ผู้ดูแลระบบ (Admin)',
        contentId: job.id,
        action: 'POSTED',
        result: 'SUCCESS',
        details: `บันทึกการเผยแพร่เรียบร้อย (โหมดจำลองความปลอดภัย / Safety Switch: ${config.facebook.publishingEnabled}): Post ID ${simulatedPostId}`,
        metadata: { isSimulated: true, pageId: this.pageId || 'DEMO' },
      });

      return {
        success: true,
        contentId: job.id,
        facebookPostId: simulatedPostId,
        facebookPostUrl: simulatedPostUrl,
        isSimulated: true,
        publishedAt,
        idempotencyKey,
        rawResponse: { simulated: true, id: simulatedPostId },
      };
    }

    // Live Meta Graph API Call
    try {
      const graphApiUrl = `https://graph.facebook.com/v19.0/${this.pageId}/photos`;
      const fullMessage = `${job.caption}\n\n${(job.hashtags || []).join(' ')}`;

      const response = await fetch(graphApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: job.generatedImageUrl,
          message: fullMessage,
          access_token: this.accessToken,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error?.message || 'Meta Graph API Error');
      }

      const realPostId = data.post_id || data.id;
      const realPostUrl = `https://facebook.com/${this.pageId}/posts/${realPostId.split('_')[1] || realPostId}`;
      const publishedAt = new Date().toISOString();
      const performanceCheckAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

      const bangkokDate = new Intl.DateTimeFormat('th-TH', {
        timeZone: 'Asia/Bangkok',
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(publishedAt));

      db.updateContentJobStatus(job.id, 'POSTED', {
        postedAt: publishedAt,
        facebookPostId: realPostId,
        facebookPostUrl: realPostUrl,
        performanceCheckAt,
      });

      db.savePublishedPost({
        id: `PUB-${Date.now()}`,
        contentId: job.id,
        facebookPostId: realPostId,
        facebookPostUrl: realPostUrl,
        productName: job.productName,
        contentType: job.contentType,
        caption: job.caption,
        mediaUrl: job.generatedImageUrl || '',
        publishedAt,
        publishedAtBangkok: `${bangkokDate} น.`,
        performanceCheckAt,
        isPerformanceChecked: false,
      });

      // Update lock to POSTED
      this.publishingLocks.set(idempotencyKey, {
        idempotencyKey,
        contentId: job.id,
        approvedVersion: job.approvedVersion || 1,
        scheduledAt: job.scheduledAt,
        state: 'POSTED',
        lockedAt: publishedAt,
        facebookPostId: realPostId,
      });

      db.addAuditLog({
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: 'ผู้ดูแลระบบ (Admin)',
        contentId: job.id,
        action: 'PUBLISHED',
        result: 'SUCCESS',
        details: `โพสต์ขึ้น Facebook สำเร็จจริง: Post ID ${realPostId}`,
        metadata: { isSimulated: false, realPostId },
      });

      return {
        success: true,
        contentId: job.id,
        facebookPostId: realPostId,
        facebookPostUrl: realPostUrl,
        isSimulated: false,
        publishedAt,
        idempotencyKey,
        rawResponse: data,
      };
    } catch (err: any) {
      const errorDetail = err.message || String(err);
      
      // Update lock to FAILED
      this.publishingLocks.set(idempotencyKey, {
        idempotencyKey,
        contentId: job.id,
        approvedVersion: job.approvedVersion || 1,
        scheduledAt: job.scheduledAt,
        state: 'FAILED',
        lockedAt: requestTime,
        errorMessage: errorDetail,
      });

      db.updateContentJobStatus(job.id, 'ERROR', {
        rejectionReason: `เกิดข้อผิดพลาดในการโพสต์: ${errorDetail}`,
      });

      db.addAuditLog({
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: 'ผู้ดูแลระบบ (Admin)',
        contentId: job.id,
        action: 'PUBLISH_FAILED',
        result: 'FAILED',
        details: `โพสต์ไปยัง Facebook ล้มเหลว: ${errorDetail}`,
        metadata: { error: errorDetail, idempotencyKey },
      });

      return {
        success: false,
        contentId: job.id,
        isSimulated: false,
        publishedAt: requestTime,
        idempotencyKey,
        error: errorDetail,
      };
    }
  }

  /**
   * Safe connection test
   * Never exposes access tokens or confidential metadata
   */
  async testConnection(): Promise<{
    success: boolean;
    status: 'CONNECTED' | 'NOT_CONNECTED' | 'TEST_MODE' | 'ERROR';
    message: string;
    pageName?: string;
    pageId?: string;
    isSimulated: boolean;
    publishingEnabled: boolean;
  }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        status: 'NOT_CONNECTED',
        isSimulated: true,
        publishingEnabled: this.isPublishingEnabled(),
        pageId: this.pageId || undefined,
        message: 'ยังไม่ได้ระบุ FACEBOOK_PAGE_ID หรือ FACEBOOK_PAGE_ACCESS_TOKEN (ระบบจะทำงานในโหมดจำลองอย่างปลอดภัย)',
      };
    }

    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${this.pageId}?fields=id,name&access_token=${this.accessToken}`
      );
      const data = await res.json();
      if (res.ok && data.name) {
        return {
          success: true,
          status: this.isPublishingEnabled() ? 'CONNECTED' : 'TEST_MODE',
          isSimulated: !this.isPublishingEnabled(),
          publishingEnabled: this.isPublishingEnabled(),
          pageName: data.name,
          pageId: this.pageId,
          message: this.isPublishingEnabled()
            ? `เชื่อมต่อ Meta Graph API สำเร็จ: เพจ "${data.name}" (พร้อมโพสต์จริง)`
            : `ยืนยันสิทธิ์เพจ "${data.name}" สำเร็จ (แต่สวิตช์ FACEBOOK_PUBLISHING_ENABLED=false ระบบจะทำงานในโหมดจำลอง)`,
        };
      } else {
        return {
          success: false,
          status: 'ERROR',
          isSimulated: true,
          publishingEnabled: this.isPublishingEnabled(),
          message: data.error?.message || 'ไม่สามารถยืนยันสิทธิ์ Facebook Page ได้ กรุณาตรวจสอบ Access Token',
        };
      }
    } catch (err: any) {
      return {
        success: false,
        status: 'ERROR',
        isSimulated: true,
        publishingEnabled: this.isPublishingEnabled(),
        message: `ข้อผิดพลาดการเชื่อมต่อเครือข่าย: ${err.message}`,
      };
    }
  }
}

export const facebookPublishingService = new FacebookPublishingService();
