/**
 * KK Shop Content Studio - Frontend API Client
 */

import {
  Product,
  MediaAsset,
  Character,
  ContentJob,
  ScheduledPost,
  PublishedPost,
  PerformanceCheck,
  AuditLogEntry,
  LineNotificationRecord,
  SystemSettings,
  AppStatusResponse,
  DashboardResponse,
  ContentIntelligenceData,
  DriveFolderInfo,
  ProductImportPreview,
  ProductSyncResult,
  DriveSyncResult,
  DriveTestResult,
  LineStatusResponse,
} from '../types';
import { tokenStore } from './tokenStore';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = tokenStore.getToken();
  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Status & Dashboard
  getStatus: () => request<AppStatusResponse>('/api/status'),
  getDashboard: () => request<DashboardResponse>('/api/dashboard'),

  // Products
  getProducts: (query?: string, category?: string) => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (category) params.append('category', category);
    return request<Product[]>(`/api/products?${params.toString()}`);
  },
  getProductById: (id: string) => request<{ product: Product; relatedMedia: MediaAsset[] }>(`/api/products/${id}`),
  saveProduct: (product: Partial<Product>) =>
    request<Product>('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    }),
  importProductsCSV: (items: any[]) =>
    request<{ added: number; updated: number }>('/api/products/import', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  // Media Library
  getMedia: (folder?: string) => {
    const q = folder ? `?folder=${encodeURIComponent(folder)}` : '';
    return request<{ folders: DriveFolderInfo[]; assets: MediaAsset[] }>(`/api/media${q}`);
  },
  registerMedia: (asset: Partial<MediaAsset>) =>
    request<MediaAsset>('/api/media', {
      method: 'POST',
      body: JSON.stringify(asset),
    }),

  // Characters
  getCharacters: () => request<Character[]>('/api/characters'),
  saveCharacter: (char: Partial<Character>) =>
    request<Character>('/api/characters', {
      method: 'POST',
      body: JSON.stringify(char),
    }),

  // Content Factory
  getContentJobs: (status?: string) => {
    const q = status ? `?status=${status}` : '';
    return request<ContentJob[]>(`/api/content-jobs${q}`);
  },
  getContentJobById: (id: string) => request<ContentJob>(`/api/content-jobs/${id}`),
  createContentJob: (data: {
    productId: string;
    contentType: string;
    creativeStyle: string;
    marketingObjective: string;
    characterId?: string;
    rawMediaIds?: string[];
  }) =>
    request<ContentJob>('/api/content-jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  regenerateContent: (id: string) =>
    request<ContentJob>(`/api/content-jobs/${id}/regenerate`, {
      method: 'POST',
    }),
  updateCaption: (id: string, caption: string, hashtags: string[]) =>
    request<ContentJob>(`/api/content-jobs/${id}/caption`, {
      method: 'POST',
      body: JSON.stringify({ caption, hashtags }),
    }),

  // Approval Center
  approveContent: (id: string) =>
    request<ContentJob>(`/api/content-jobs/${id}/approve`, {
      method: 'POST',
    }),
  rejectContent: (id: string, reason: string) =>
    request<ContentJob>(`/api/content-jobs/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Scheduling & Publishing
  getScheduledPosts: () => request<ScheduledPost[]>('/api/scheduled'),
  schedulePost: (id: string, publishAt: string) =>
    request<{ job: ContentJob; scheduledItem: ScheduledPost }>(`/api/content-jobs/${id}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ publishAt }),
    }),
  cancelScheduledPost: (id: string) =>
    request<{ success: boolean }>(`/api/scheduled/${id}`, {
      method: 'DELETE',
    }),
  publishNow: (id: string, dryRun = false) =>
    request<any>(`/api/content-jobs/${id}/publish-now`, {
      method: 'POST',
      body: JSON.stringify({ dryRun }),
    }),

  // Published & Performance
  getPublishedPosts: () => request<PublishedPost[]>('/api/published'),
  evaluatePost72h: (id: string, forceRecheck = false) =>
    request<PerformanceCheck>(`/api/published/${id}/evaluate`, {
      method: 'POST',
      body: JSON.stringify({ forceRecheck }),
    }),
  getPerformanceOverview: () =>
    request<{
      metrics: {
        totalAnalyzed: number;
        totalPublished: number;
        pendingAnalysis: number;
        totalReach: number;
        totalImpressions: number;
        totalEngagement: number;
        avgEngagementRate: number;
      };
      checks: PerformanceCheck[];
    }>('/api/performance'),
  getContentIntelligence: () => request<ContentIntelligenceData>('/api/content-intelligence'),

  // Logs & Notifications & Settings
  getAuditLogs: (limit = 100) => request<AuditLogEntry[]>(`/api/audit-logs?limit=${limit}`),
  getNotifications: () => request<LineNotificationRecord[]>('/api/notifications'),
  getSettings: () => request<SystemSettings>('/api/settings'),
  saveSettings: (settings: Partial<SystemSettings>) =>
    request<SystemSettings>('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    }),

  // Connection Tests
  getLineStatus: () => request<LineStatusResponse>('/api/line/status'),
  testGemini: () => request<any>('/api/test/gemini', { method: 'POST' }),
  testFacebook: () => request<any>('/api/test/facebook', { method: 'POST' }),
  testLine: () => request<any>('/api/test/line', { method: 'POST' }),
  triggerDailyApprovalSummary: () =>
    request<any>('/api/cron/daily-approval-summary', { method: 'POST' }),

  // Real Google Drive & Product Master APIs
  setDriveToken: (accessToken: string) =>
    request<{ success: boolean; message: string }>('/api/drive/auth', {
      method: 'POST',
      body: JSON.stringify({ accessToken }),
    }),
  testDriveConnection: () =>
    request<DriveTestResult>('/api/drive/test-connection', { method: 'POST' }),
  previewDriveProductMaster: () =>
    request<ProductImportPreview>('/api/drive/products/preview'),
  importDriveProductMaster: (columnMapping: Record<string, string>) =>
    request<ProductSyncResult>('/api/drive/products/import', {
      method: 'POST',
      body: JSON.stringify({ columnMapping }),
    }),
  syncDriveProductMaster: () =>
    request<ProductSyncResult>('/api/drive/products/sync', { method: 'POST' }),
  getDriveProductMasterStatus: () =>
    request<{ sourceFileId: string; totalProducts: number; syncedProductsCount: number; lastSyncedAt: string | null }>(
      '/api/drive/products/status'
    ),
  scanDriveMedia: () =>
    request<DriveSyncResult>('/api/drive/media/scan', { method: 'POST' }),
  assignProductToMedia: (mediaId: string, productId?: string, matchMethod?: string) =>
    request<MediaAsset>(`/api/media/${mediaId}/assign-product`, {
      method: 'POST',
      body: JSON.stringify({ productId, matchMethod }),
    }),
};
