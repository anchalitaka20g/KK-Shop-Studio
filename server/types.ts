/**
 * KK Shop Content Studio - TypeScript Core Data Models
 * Thai grocery store in Taiwan (ร้านขอนแก่น)
 */

export type TemperatureType = 'NORMAL' | 'CHILLED' | 'FROZEN';

export interface Product {
  id: string; // e.g. PROD-KK-01
  sku: string;
  name: string;
  priceNTD: number; // Currency in Taiwan NTD
  unit: string; // e.g. ขวด, แพ็ค, ถุง, กก.
  size: string; // e.g. 400 มล., 500g
  category: string; // e.g. เครื่องปรุงรส, น้ำพริก/ปลาร้า, อาหารสำเร็จรูป, ขนมไทย, ของสดแช่เย็น, สินค้าแช่แข็ง
  cost: number;
  orderCount: number;
  quantitySold: number;
  salesTotal: number;
  temperatureType: TemperatureType;
  aliases: string[];
  rawMediaIds: string[];
  inStock: boolean;
  origin: string; // e.g. ประเทศไทย (นำเข้า)
  description?: string;
  // Real Drive Sync provenance
  sourceFileId?: string;
  sourceRow?: number;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type DriveFolderPath =
  | '01_RAW/01_PRODUCT_IMAGES'
  | '01_RAW/02_RAW_PHOTOS'
  | '01_RAW/03_RAW_VIDEOS'
  | '02_GENERATED/01_AD_IMAGES'
  | '02_GENERATED/02_AD_VIDEOS'
  | '03_APPROVED'
  | '04_POSTED_ARCHIVE';

export type MediaMatchStatus = 'MATCHED' | 'MATCH_REVIEW_REQUIRED' | 'UNMATCHED';

export interface MediaAsset {
  id: string;
  driveFileId: string; // Secure Drive ID, never assume public URL
  name: string;
  folderPath: DriveFolderPath;
  type: 'IMAGE' | 'VIDEO';
  mimeType: string;
  sizeBytes: number;
  productId?: string;
  productName?: string;
  thumbnailUrl: string;
  previewUrl: string;
  dimensions?: string;
  durationSeconds?: number;
  // Real Media Matching fields
  matchStatus?: MediaMatchStatus;
  matchMethod?: 'PRODUCT_ID' | 'SKU' | 'NAME' | 'ALIAS' | 'MANUAL';
  matchConfidence?: number;
  createdTime?: string;
  modifiedTime?: string;
  createdAt: string;
}

export interface Character {
  id: string;
  name: string; // e.g. เจ๊อ๋อย
  role: string;
  clothingRules: string;
  visualRules: string;
  voiceRules: string; // Strictly Thai language!
  promptRules: string;
  referenceImages: string[];
  status?: 'REFERENCE_REQUIRED' | 'READY';
  isActive: boolean;
  createdAt: string;
}

export interface ProductImportPreview {
  totalRows: number;
  headers: string[];
  sampleRows: Record<string, string>[];
  suggestedMapping: Record<string, string>;
  stats: {
    newCount: number;
    updateCount: number;
    skipCount: number;
    errorCount: number;
  };
  parsedProducts: Partial<Product>[];
  errors: string[];
}

export interface ProductSyncResult {
  success: boolean;
  totalRows: number;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  sourceFileId: string;
  syncedAt: string;
  errors: string[];
}

export interface DriveSyncResult {
  success: boolean;
  totalFilesFound: number;
  newFilesAdded: number;
  matchedCount: number;
  unmatchedCount: number;
  reviewRequiredCount: number;
  scannedFolders: { folderKey: string; folderId: string; fileCount: number }[];
  syncedAt: string;
}

export interface CreativeBrief {
  productId: string;
  productName: string;
  priceNTD: number;
  category: string;
  mainSellingPoint: string;
  targetAudience: string;
  contentObjective: string;
  creativeConcept: string;
  headline: string;
  supportingText: string;
  cta: string;
  recommendedContentType: ContentType;
  recommendedVisualStyle: string;
  captionConcept: string;
  hashtags: string[];
  characterId?: string;
}

export interface ReelScene {
  sceneNumber: number;
  timeRange: string; // "0:00 - 0:03"
  durationSeconds: number;
  visualPrompt: string;
  cameraInstruction: string;
  characterAction: string;
  thaiDialogue: string; // THAI LANGUAGE ONLY
  soundInstruction: string;
  bgmInstruction: string;
}

export interface ReelStoryboard {
  hook: string;
  storyConcept: string;
  durationSeconds: number; // Max 10s
  scenes: ReelScene[];
  finalVeoPrompt: string;
  googleFlowPrompt: string;
  aspectRatio: '9:16';
  resolution: '720p';
  videoUrl?: string;
  hasDirectVeoApi: boolean;
}

export type ContentType = 'IMAGE_POST' | 'REEL' | 'VIDEO_POST';

export type ContentStatus =
  | 'NEW'
  | 'GENERATING'
  | 'WAITING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'REVISION'
  | 'SCHEDULED'
  | 'POSTING'
  | 'POSTED'
  | 'ANALYSIS_PENDING'
  | 'ANALYZED'
  | 'ERROR';

export interface ApprovedSnapshot {
  caption: string;
  generatedImageUrl?: string;
  videoUrl?: string;
  priceNTD: number;
  creativePrompt?: string;
}

export interface ContentJob {
  id: string; // CONTENT_ID e.g. CJ-20260930-001
  productId: string;
  productName: string;
  priceNTD: number;
  contentType: ContentType;
  creativeStyle: string;
  marketingObjective: string;
  rawMediaIds: string[];
  characterId?: string;
  status: ContentStatus;
  creativeBrief?: CreativeBrief;
  generatedImageUrl?: string;
  creativePrompt?: string;
  reelStoryboard?: ReelStoryboard;
  caption: string;
  hashtags: string[];
  // Strict approval tracking
  approvalId?: string;
  approvedVersion?: number;
  approvedAt?: string;
  approvedBy?: string;
  approvedSnapshot?: ApprovedSnapshot;
  scheduledAt?: string; // ISO Asia/Bangkok
  postedAt?: string;
  facebookPostId?: string;
  facebookPostUrl?: string;
  rejectionReason?: string;
  performanceCheckAt?: string; // publishedAt + 72 hours
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledPost {
  id: string;
  contentId: string;
  publishAt: string;
  publishAtBangkok: string;
  status: 'SCHEDULED' | 'POSTING' | 'POSTED' | 'ERROR' | 'CANCELLED';
  facebookPageId: string;
  retryCount: number;
  // Strict reference to approved record
  approvalId: string;
  approvedVersion: number;
  approvedAt: string;
  approvedBy: string;
  lastError?: string;
  createdAt: string;
}

export interface PublishedPost {
  id: string;
  contentId: string;
  facebookPostId: string;
  facebookPostUrl: string;
  productName: string;
  contentType: ContentType;
  caption: string;
  mediaUrl: string;
  publishedAt: string; // ISO
  publishedAtBangkok: string;
  performanceCheckAt: string; // publishedAt + 72h
  isPerformanceChecked: boolean;
  performanceCheckedAt?: string; // Stored timestamp when 72h evaluation was completed
}

export type LineConnectionStatus = 'NOT_CONNECTED' | 'WEBHOOK_READY' | 'CONNECTED' | 'ERROR';

export interface LineStatusResponse {
  status: LineConnectionStatus;
  channelAccessTokenConfigured: 'configured' | 'missing';
  channelSecretConfigured: 'configured' | 'missing';
  adminRecipientStatus: 'registered' | 'not registered';
  adminRecipient: 'registered' | 'not registered';
  maskedAdminUserId?: string | null;
  webhookUrl: string;
  lastWebhookReceivedAt?: string | null;
  lastError?: string | null;
}

export interface PerformanceCheck {
  id: string;
  contentId: string;
  facebookPostId: string;
  productName: string;
  publishedAt: string;
  evaluationDate: string;
  reach: number;
  impressions: number;
  reactions: number;
  comments: number;
  shares: number;
  clicks: number;
  engagement: number;
  engagementRate: number; // percentage
  summaryThai: string;
  lineNotified: boolean;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

export type AuditAction =
  | 'CONTENT_CREATED'
  | 'AI_GENERATION_STARTED'
  | 'AI_GENERATION_COMPLETED'
  | 'APPROVED'
  | 'REJECTED'
  | 'REGENERATED'
  | 'EDITED_AFTER_APPROVAL'
  | 'APPROVAL_INVALIDATED'
  | 'SCHEDULED'
  | 'PUBLISH_ATTEMPTED'
  | 'POSTING_STARTED'
  | 'POSTED'
  | 'PUBLISHED'
  | 'POST_FAILED'
  | 'PUBLISH_FAILED'
  | 'PERFORMANCE_CHECKED'
  | 'RECHECK_RUN'
  | 'LINE_NOTIFICATION_SENT'
  | 'PRODUCT_IMPORTED'
  | 'MEDIA_SYNCED'
  | 'SETTINGS_UPDATED';

export type PublishJobState = 'PENDING' | 'PROCESSING' | 'POSTED' | 'FAILED';

export interface PublishingLockRecord {
  idempotencyKey: string;
  contentId: string;
  approvedVersion: number;
  scheduledAt?: string;
  state: PublishJobState;
  lockedAt: string;
  facebookPostId?: string;
  errorMessage?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO
  user: string; // e.g. ผู้ดูแลระบบ (Admin)
  contentId?: string;
  action: AuditAction;
  result: 'SUCCESS' | 'WARNING' | 'FAILED';
  details: string;
  metadata?: Record<string, any>;
}

export interface LineNotificationRecord {
  id: string;
  type: 'DAILY_APPROVAL_SUMMARY' | 'PERFORMANCE_72H_REPORT' | 'TEST';
  timestamp: string;
  message: string;
  targetId: string;
  status: 'SENT' | 'SIMULATED' | 'FAILED';
  error?: string;
}

export interface SystemSettings {
  appName: string;
  storeName: string;
  timezone: string;
  currency: string;
  facebookPageId: string;
  approvalDailySummaryTime: string; // "21:00"
  performanceDelayHours: number; // 72
  hasGeminiKey: boolean;
  hasFacebookToken: boolean;
  hasLineToken: boolean;
  hasGoogleDriveAuth: boolean;
  googleFlowFallbackEnabled: boolean;
  lineAdminUserId?: string;
  lineWebhookStatus?: LineConnectionStatus;
  lastLineWebhookReceivedAt?: string;
  lastLineWebhookError?: string;
}

export interface ContentIntelligenceData {
  topCategories: { category: string; avgEngagementRate: number; totalPosts: number }[];
  topHooks: { hook: string; engagementRate: number; contentType: ContentType }[];
  bestPostingHours: { hour: string; performanceScore: number }[];
  winningConcepts: { concept: string; count: number; avgLikes: number }[];
  summaryRecommendations: string[];
}
