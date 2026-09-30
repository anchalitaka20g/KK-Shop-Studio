/**
 * KK Shop Content Studio - Centralized Configuration & Secret Validator
 * Validates environment variables server-side without leaking secret values.
 * Strictly enforces that secret values are NEVER sent to the frontend.
 */

import dotenv from 'dotenv';
import { DRIVE_FOLDERS } from './config/driveFolders.js';
import { db } from './db.js';
import { maskUserId } from './utils/redact.js';
dotenv.config();

export interface IntegrationStatusSummary {
  id: string;
  name: string;
  purpose: string;
  status: 'CONNECTED' | 'NOT_CONNECTED' | 'AUTH_REQUIRED' | 'TEST_MODE' | 'ERROR';
  isReady: boolean;
  note: string;
  envVar: string;
}

export const config = {
  system: {
    appName: 'KK Shop Content Studio',
    storeName: 'ร้านขอนแก่น (KK Shop Taiwan)',
    timezone: 'Asia/Bangkok',
    currency: 'NT$ / TWD',
    appUrl: process.env.APP_URL || 'https://ais-dev-ho5wdfnis5mrb5ahmty2by-354129825910.asia-southeast1.run.app',
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-3.8-flash',
    imageModel: 'gemini-3.1-flash-lite-image',
    get isConfigured(): boolean {
      return Boolean(this.apiKey && this.apiKey !== 'MY_GEMINI_API_KEY' && this.apiKey.length > 10);
    },
  },

  facebook: {
    pageId: process.env.FACEBOOK_PAGE_ID || '',
    pageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '',
    // Strict safety switch: Default must be false. Real publishing is refused unless explicitly "true".
    publishingEnabled: process.env.FACEBOOK_PUBLISHING_ENABLED === 'true',
    get isConfigured(): boolean {
      return Boolean(
        this.pageId &&
        this.pageAccessToken &&
        this.pageAccessToken !== 'MY_FACEBOOK_PAGE_ACCESS_TOKEN' &&
        this.pageAccessToken.length > 20
      );
    },
  },

  line: {
    get channelAccessToken(): string {
      return process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
    },
    get channelSecret(): string {
      return process.env.LINE_CHANNEL_SECRET || '';
    },
    get targetId(): string {
      return db.getLineAdminUserId() || process.env.LINE_TARGET_ID || '';
    },
    dailyApprovalSummaryTime: '21:00', // Asia/Bangkok
    get isConfigured(): boolean {
      return Boolean(
        this.channelAccessToken &&
        this.channelAccessToken !== 'MY_LINE_CHANNEL_ACCESS_TOKEN' &&
        this.channelAccessToken.length > 20 &&
        this.channelSecret &&
        this.channelSecret.length > 10
      );
    },
    get isConnected(): boolean {
      return this.isConfigured && Boolean(this.targetId);
    },
  },

  drive: {
    rootFolderId: DRIVE_FOLDERS.ROOT,
    folders: DRIVE_FOLDERS,
    authMode: 'oauth' as const, // Native AI Studio Google Drive Integration (OAuth)
    serviceAccountOptional: false,
    isConfigured: true,
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    get isConfigured(): boolean {
      return Boolean(this.apiKey && this.apiKey.length > 10 && !this.apiKey.startsWith('MY_'));
    },
  },
};

/**
 * Returns sanitized integration readiness for the frontend.
 * Only returns status flags (CONNECTED, TEST_MODE, NOT_CONNECTED, AUTH_REQUIRED, ERROR).
 * NEVER includes secret strings or tokens.
 */
export function getSanitizedIntegrationsStatus(driveConnected = false): {
  integrations: IntegrationStatusSummary[];
  allReady: boolean;
  publishingEnabled: boolean;
  configuredPageId: string;
} {
  const geminiStatus: IntegrationStatusSummary = {
    id: 'gemini',
    name: 'Google Gemini AI Engine',
    purpose: 'สร้าง Creative Brief, แคปชั่นภาษาไทย, และ Storyboard รีลส์ 9:16',
    status: config.gemini.isConfigured ? 'CONNECTED' : 'TEST_MODE',
    isReady: config.gemini.isConfigured,
    envVar: 'GEMINI_API_KEY',
    note: config.gemini.isConfigured
      ? 'เชื่อมต่อพร้อมใช้งานโมเดล gemini-3.8-flash ผ่าน Server-Side SDK'
      : 'โหมด Smart Template (ระบุ GEMINI_API_KEY ใน Secrets เพื่อเปิดใช้งานระบบ AI เต็มรูปแบบ)',
  };

  const facebookStatus: IntegrationStatusSummary = {
    id: 'facebook',
    name: 'Meta Graph API (Facebook Page)',
    purpose: config.facebook.pageId
      ? `เผยแพร่โพสต์และ Reels ไปยัง Facebook Page ID: ${config.facebook.pageId}`
      : 'เผยแพร่โพสต์และ Reels ไปยัง Facebook Page ร้านขอนแก่น',
    status: !config.facebook.isConfigured
      ? 'NOT_CONNECTED'
      : config.facebook.publishingEnabled
      ? 'CONNECTED'
      : 'TEST_MODE',
    isReady: config.facebook.isConfigured && config.facebook.publishingEnabled,
    envVar: 'FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN, FACEBOOK_PUBLISHING_ENABLED',
    note: !config.facebook.isConfigured
      ? 'ยังไม่ได้ระบุ Page ID หรือ Access Token (ระบบทำงานในโหมดจำลองความปลอดภัย)'
      : config.facebook.publishingEnabled
      ? 'พร้อมเผยแพร่จริงไปยัง Facebook Page (Safety Switch: เปิดใช้งาน)'
      : 'สวิตช์ความปลอดภัยเปิดอยู่ (FACEBOOK_PUBLISHING_ENABLED=false) — ระบบจะจำลองผลการโพสต์อย่างปลอดภัยโดยไม่แตะต้องเพจจริง',
  };

  const lineWebhookStatus = db.getLineWebhookStatus();
  const lineStatus: IntegrationStatusSummary = {
    id: 'line',
    name: 'LINE Messaging API',
    purpose: 'ส่งสรุปงานรอตรวจประจำวันเวลา 21:00 น. (เวลาไทย) และรายงานผลงาน 72 ชม.',
    status: lineWebhookStatus,
    isReady: lineWebhookStatus === 'CONNECTED',
    envVar: 'LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET',
    note: lineWebhookStatus === 'CONNECTED'
      ? `พร้อมส่งข้อความแจ้งเตือนผ่าน LINE Push ให้ผู้ดูแลระบบ (${maskUserId(db.getLineAdminUserId())})`
      : lineWebhookStatus === 'WEBHOOK_READY'
      ? 'ตั้งค่า Token และ Secret เรียบร้อย — รอผู้ดูแลระบบส่งข้อความ "test" เข้า LINE OA เพื่อผูกบัญชี'
      : 'ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN หรือ LINE_CHANNEL_SECRET ใน Secrets',
  };

  const driveStatus: IntegrationStatusSummary = {
    id: 'drive',
    name: 'Google Drive Media & Product Master',
    purpose: 'อ่านไฟล์ Product Master CSV และโครงสร้างโฟลเดอร์มีเดีย 01_RAW ถึง 04_POSTED_ARCHIVE',
    status: driveConnected ? 'CONNECTED' : 'AUTH_REQUIRED',
    isReady: driveConnected,
    envVar: 'AI Studio Native Integration (OAuth)',
    note: driveConnected
      ? `เชื่อมต่อ Google Drive สำเร็จ (Root Folder: ${DRIVE_FOLDERS.ROOT})`
      : 'กดปุ่ม "เชื่อมต่อ Google Drive" เพื่อให้อนุมัติสิทธิ์เข้าถึงโฟลเดอร์ร้านขอนแก่นอย่างปลอดภัย',
  };

  const openaiStatus: IntegrationStatusSummary = {
    id: 'openai',
    name: 'OpenAI Image API Adapter (DALL-E)',
    purpose: 'ทางเลือกเสริมสำหรับสร้างภาพประกอบโฆษณาด้วยโมเดล DALL-E',
    status: config.openai.isConfigured ? 'CONNECTED' : 'NOT_CONNECTED',
    isReady: config.openai.isConfigured,
    envVar: 'OPENAI_API_KEY (Optional)',
    note: config.openai.isConfigured
      ? 'เชื่อมต่อ OpenAI Images API พร้อมใช้งาน'
      : 'ยังไม่ได้ตั้งค่า OPENAI_API_KEY (ระบบจะใช้ Gemini Flash Image / Branded Studio เป็นหลัก)',
  };

  const integrations = [geminiStatus, facebookStatus, lineStatus, driveStatus, openaiStatus];

  return {
    integrations,
    allReady: config.gemini.isConfigured && config.facebook.isConfigured && config.line.isConfigured && driveConnected,
    publishingEnabled: config.facebook.publishingEnabled,
    configuredPageId: config.facebook.pageId || '',
  };
}
