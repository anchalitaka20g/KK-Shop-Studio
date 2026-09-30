/**
 * KK Shop Content Studio - 72-Hour Performance Collector
 * Hardened for Meta Graph API Rate Limits, Missing Insights & Controlled Rechecks
 */

import { db } from '../db.js';
import { PerformanceCheck, PublishedPost } from '../types.js';
import { lineNotificationService } from './lineNotificationService.js';
import { analyzePerformanceWithGemini } from './geminiService.js';
import { config } from '../config.js';
import { safeLogger } from '../utils/redact.js';

export class PerformanceCollector {
  constructor() {}

  private get accessToken(): string {
    return config.facebook.pageAccessToken;
  }

  private isConfigured(): boolean {
    return config.facebook.isConfigured;
  }

  /**
   * Evaluates post performance after 72 hours
   * @param post Published post record
   * @param forceRecheck If true, allows manual administrator re-evaluation even if already checked
   */
  async evaluatePost(post: PublishedPost, forceRecheck = false): Promise<PerformanceCheck> {
    const existingChecks = db.getPerformanceChecks();
    const existingCheck = existingChecks.find(c => c.contentId === post.contentId || c.facebookPostId === post.facebookPostId);

    // Each Facebook post should be evaluated only once. Store performanceCheckedAt to prevent duplicate evaluation.
    if ((post.performanceCheckedAt || post.isPerformanceChecked) && existingCheck && !forceRecheck) {
      safeLogger.info(`Performance check already completed at ${post.performanceCheckedAt || 'previously'} for post ${post.facebookPostId}. Returning existing check.`);
      return existingCheck;
    }

    if (forceRecheck) {
      db.addAuditLog({
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: 'ผู้ดูแลระบบ (Admin)',
        contentId: post.contentId,
        action: 'RECHECK_RUN',
        result: 'SUCCESS',
        details: `ผู้ดูแลระบบสั่งประเมินผลประสิทธิภาพ 72 ชม. ซ้ำ (Force Recheck) สำหรับ "${post.productName}"`,
      });
    }

    let metrics = {
      reach: 0,
      impressions: 0,
      reactions: 0,
      comments: 0,
      shares: 0,
      clicks: 0,
      engagement: 0,
      engagementRate: 0,
    };

    let usedLiveInsights = false;

    if (this.isConfigured() && post.facebookPostId && !post.facebookPostId.startsWith('SIM_') && !post.facebookPostId.startsWith('FB_DEMO_')) {
      try {
        // Query Meta Graph API for post metrics with error resilience
        const fields = 'reactions.summary(total_count),comments.summary(total_count),shares';
        const url = `https://graph.facebook.com/v19.0/${post.facebookPostId}?fields=${fields}&access_token=${this.accessToken}`;
        const res = await fetch(url);
        const data = await res.json();

        if (res.ok) {
          metrics.reactions = data.reactions?.summary?.total_count || 0;
          metrics.comments = data.comments?.summary?.total_count || 0;
          metrics.shares = data.shares?.count || 0;

          // Attempt post_impressions / reach insights query gracefully
          try {
            const insightsUrl = `https://graph.facebook.com/v19.0/${post.facebookPostId}/insights?metric=post_impressions,post_impressions_unique,post_clicks&access_token=${this.accessToken}`;
            const insRes = await fetch(insightsUrl);
            const insData = await insRes.json();

            if (insRes.ok && Array.isArray(insData.data)) {
              for (const item of insData.data) {
                if (item.name === 'post_impressions') metrics.impressions = item.values?.[0]?.value || 0;
                if (item.name === 'post_impressions_unique') metrics.reach = item.values?.[0]?.value || 0;
                if (item.name === 'post_clicks') metrics.clicks = item.values?.[0]?.value || 0;
              }
            }
          } catch (insightsErr) {
            safeLogger.warn('Insights subquery unavailable:', insightsErr);
          }

          metrics.engagement = metrics.reactions + metrics.comments + metrics.shares + metrics.clicks;
          metrics.engagementRate = metrics.impressions > 0
            ? Number(((metrics.engagement / metrics.impressions) * 100).toFixed(2))
            : 0;

          usedLiveInsights = true;
        } else if (data.error) {
          safeLogger.warn(`Meta API rate limit or error (${data.error.code}): ${data.error.message}`);
          throw new Error(`Meta Graph API Error: ${data.error.message}`);
        }
      } catch (err: any) {
        safeLogger.warn('Meta Insights request error:', err.message);
        throw new Error(`ไม่สามารถดึงข้อมูลสถิติจาก Facebook Insights ได้: ${err.message}`);
      }
    }

    // Do NOT fabricate Facebook metrics. If Facebook Insights data is unavailable, report an error instead of generating fake metrics.
    if (!usedLiveInsights) {
      throw new Error(
        `ไม่สามารถดึงข้อมูลสถิติจาก Facebook Insights ได้สำหรับโพสต์ ${post.facebookPostId || post.contentId} (ข้อมูลไม่พร้อมใช้งานหรือยังไม่ได้ตั้งค่าสิทธิ์ Meta Graph API) - ระบบไม่สร้างข้อมูลจำลองเพื่อความถูกต้องของข้อมูล`
      );
    }

    const checkRecord: PerformanceCheck = {
      id: existingCheck?.id || `PERF-${Date.now()}`,
      contentId: post.contentId,
      facebookPostId: post.facebookPostId,
      productName: post.productName,
      publishedAt: post.publishedAt,
      evaluationDate: new Date().toISOString(),
      reach: metrics.reach,
      impressions: metrics.impressions,
      reactions: metrics.reactions,
      comments: metrics.comments,
      shares: metrics.shares,
      clicks: metrics.clicks,
      engagement: metrics.engagement,
      engagementRate: metrics.engagementRate,
      summaryThai: '',
      lineNotified: existingCheck?.lineNotified || false,
      status: 'COMPLETED',
    };

    // Generate intelligent Thai summary using Gemini
    try {
      const analysis = await analyzePerformanceWithGemini(checkRecord);
      checkRecord.summaryThai = analysis.summaryThai;
    } catch {
      checkRecord.summaryThai = `โพสต์ "${post.productName}" อัตรามีส่วนร่วม ${metrics.engagementRate}% (Reach ${metrics.reach.toLocaleString()} คน, Engagement ${metrics.engagement.toLocaleString()} ครั้ง)`;
    }

    // Save performance check
    db.savePerformanceCheck(checkRecord);

    // Update content job status to ANALYZED
    db.updateContentJobStatus(post.contentId, 'ANALYZED');

    // Mark published post as checked with explicit performanceCheckedAt timestamp to prevent duplicate evaluation
    post.isPerformanceChecked = true;
    post.performanceCheckedAt = new Date().toISOString();
    db.savePublishedPost(post);

    // Audit log
    db.addAuditLog({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: 'ระบบอัตโนมัติ (Performance Collector)',
      contentId: post.contentId,
      action: 'PERFORMANCE_CHECKED',
      result: 'SUCCESS',
      details: `วิเคราะห์ผล 72 ชม. สำเร็จ: Reach ${metrics.reach}, Engagement Rate ${metrics.engagementRate}% (${checkRecord.summaryThai})`,
    });

    // Send LINE Notification for 72h report if not already sent
    if (!checkRecord.lineNotified) {
      try {
        await lineNotificationService.sendPerformanceReport(checkRecord);
        checkRecord.lineNotified = true;
        db.savePerformanceCheck(checkRecord);
      } catch (err) {
        safeLogger.warn('Failed to send LINE notification for performance check:', err);
      }
    }

    return checkRecord;
  }

  /**
   * Runs evaluation on all posts that have reached 72 hours and are not yet analyzed
   */
  async checkAllDuePosts(): Promise<PerformanceCheck[]> {
    const published = db.getPublishedPosts();
    const now = Date.now();
    const results: PerformanceCheck[] = [];

    for (const post of published) {
      if (!post.isPerformanceChecked) {
        const checkTime = new Date(post.performanceCheckAt).getTime();
        if (now >= checkTime) {
          const result = await this.evaluatePost(post, false);
          results.push(result);
        }
      }
    }
    return results;
  }
}

export const performanceCollector = new PerformanceCollector();
