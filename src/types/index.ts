/**
 * KK Shop Content Studio - Frontend Type Definitions
 */

export type TemperatureType = 'NORMAL' | 'CHILLED' | 'FROZEN';

export interface Product {
  id: string;
  sku: string;
  name: string;
  priceNTD: number;
  unit: string;
  size: string;
  category: string;
  cost: number;
  orderCount: number;
  quantitySold: number;
  salesTotal: number;
  temperatureType: TemperatureType;
  aliases: string[];
  rawMediaIds: string[];
  inStock: boolean;
  origin: string;
  description?: string;
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
  driveFileId: string;
  name: string;
  folderPath: DriveFolderPath;
  type: 'IMAGE' | 'VIDEO';
  mimeType: string;
  sizeBytes: number;
  productId?: string;
  productName?: string;
  matchStatus?: MediaMatchStatus;
  matchMethod?: 'PRODUCT_ID' | 'SKU' | 'NAME' | 'ALIAS' | 'MANUAL';
  matchConfidence?: number;
  thumbnailUrl: string;
  previewUrl: string;
  dimensions?: string;
  durationSeconds?: number;
  createdTime?: string;
  modifiedTime?: string;
  createdAt: string;
}

export interface DriveFolderInfo {
  path: DriveFolderPath;
  nameThai: string;
  description: string;
  fileCount: number;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  clothingRules: string;
  visualRules: string;
  voiceRules: string;
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

export interface DriveTestResult {
  status: 'CONNECTED' | 'NOT_CONNECTED' | 'AUTH_REQUIRED' | 'ERROR';
  folderId?: string;
  folderName?: string;
  message?: string;
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
  timeRange: string;
  durationSeconds: number;
  visualPrompt: string;
  cameraInstruction: string;
  characterAction: string;
  thaiDialogue: string;
  soundInstruction: string;
  bgmInstruction: string;
}

export interface ReelStoryboard {
  hook: string;
  storyConcept: string;
  durationSeconds: number;
  scenes: ReelScene[];
  finalVeoPrompt: string;
  googleFlowPrompt: string;
  aspectRatio: '9:16';
  resolution: '720p';
  videoUrl?: string;
  hasDirectVeoApi: boolean;
}

export interface ContentJob {
  id: string;
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
  approvalId?: string;
  approvedVersion?: number;
  approvedAt?: string;
  approvedBy?: string;
  approvedSnapshot?: {
    caption: string;
    generatedImageUrl?: string;
    videoUrl?: string;
    priceNTD: number;
    creativePrompt?: string;
  };
  scheduledAt?: string;
  postedAt?: string;
  facebookPostId?: string;
  facebookPostUrl?: string;
  rejectionReason?: string;
  performanceCheckAt?: string;
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
  approvalId?: string;
  approvedVersion?: number;
  approvedAt?: string;
  approvedBy?: string;
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
  publishedAt: string;
  publishedAtBangkok: string;
  performanceCheckAt: string;
  isPerformanceChecked: boolean;
  performanceCheckedAt?: string;
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
  engagementRate: number;
  summaryThai: string;
  lineNotified: boolean;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  contentId?: string;
  action: string;
  result: 'SUCCESS' | 'WARNING' | 'FAILED';
  details: string;
  metadata?: Record<string, any>;
}

export interface LineNotificationRecord {
  id: string;
  type: string;
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
  approvalDailySummaryTime: string;
  performanceDelayHours: number;
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

export interface IntegrationItem {
  id: string;
  name: string;
  purpose: string;
  status: string;
  envVar: string;
  isReady: boolean;
  note: string;
}

export interface AppStatusResponse {
  settings: SystemSettings;
  integrations: IntegrationItem[];
  allReady: boolean;
  publishingEnabled?: boolean;
  driveConnected?: boolean;
  driveFolderId?: string;
  availableImageProviders?: { id: string; name: string; isReady: boolean }[];
  timezone: string;
  currentTimeBangkok: string;
}

export interface DashboardResponse {
  counts: {
    totalProducts: number;
    realMediaFiles?: number;
    generating: number;
    waitingApproval: number;
    approved: number;
    scheduled: number;
    postedToday: number;
    analysisPending: number;
    analyzed: number;
    error: number;
  };
  waitingQueue: ContentJob[];
  upcomingScheduled: ScheduledPost[];
  recentPublished: PublishedPost[];
}

export interface ContentIntelligenceData {
  topCategories: { category: string; avgEngagementRate: number; totalPosts: number }[];
  topHooks: { hook: string; engagementRate: number; contentType: ContentType }[];
  bestPostingHours: { hour: string; performanceScore: number }[];
  winningConcepts: { concept: string; count: number; avgLikes: number }[];
  summaryRecommendations: string[];
}
