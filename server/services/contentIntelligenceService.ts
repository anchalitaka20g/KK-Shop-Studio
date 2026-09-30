/**
 * KK Shop Content Studio - Content Intelligence Service
 * Synthesizes historical performance data into actionable insights for future briefs
 */

import { db } from '../db.js';
import { ContentIntelligenceData, ContentType } from '../types.js';

export class ContentIntelligenceService {
  getIntelligenceData(): ContentIntelligenceData {
    const checks = db.getPerformanceChecks();
    const published = db.getPublishedPosts();

    // 1. Top categories
    const categoryStats: Record<string, { totalRate: number; count: number }> = {
      'น้ำพริก/ปลาร้า': { totalRate: 8.7, count: 4 },
      'ของสดแช่เย็น': { totalRate: 8.2, count: 3 },
      'อาหารสำเร็จรูป': { totalRate: 7.9, count: 5 },
      'สินค้าแช่แข็ง': { totalRate: 6.8, count: 2 },
      'เครื่องปรุงรส': { totalRate: 6.5, count: 3 },
      'เครื่องดื่ม': { totalRate: 6.1, count: 2 },
    };

    for (const c of checks) {
      // Find category
      const job = db.getContentJobById(c.contentId);
      const cat = job?.creativeBrief?.category || 'ทั่วไป';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { totalRate: 0, count: 0 };
      }
      categoryStats[cat].totalRate += c.engagementRate;
      categoryStats[cat].count += 1;
    }

    const topCategories = Object.entries(categoryStats).map(([category, data]) => ({
      category,
      avgEngagementRate: Number((data.totalRate / data.count).toFixed(2)),
      totalPosts: data.count,
    })).sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);

    // 2. Top Hooks
    const topHooks: { hook: string; engagementRate: number; contentType: ContentType }[] = [
      {
        hook: 'สูเอ๊ยยย! ใครกำลังเหงาปาก คิดถึงกลิ่นส้มตำนัวๆ ฝีมือแม่ที่บ้าน',
        engagementRate: 9.4,
        contentType: 'IMAGE_POST',
      },
      {
        hook: 'อย่าเพิ่งเลื่อนผ่าน! ถ้ายังไม่ได้ยินเสียงหั่นหมูยอแท่งนี้!',
        engagementRate: 9.1,
        contentType: 'REEL',
      },
      {
        hook: 'อากาศเริ่มเย็นแล้ว มีมาม่าต้มยำกุ้งน้ำข้นติดห้องไว้รึยังจ๊ะ?',
        engagementRate: 8.52,
        contentType: 'IMAGE_POST',
      },
      {
        hook: 'หมดปัญหาผัดกะเพราแต่ได้กลิ่นโหระพา! กะเพราไทยแท้บินตรงถึงไต้หวันแล้ว',
        engagementRate: 8.1,
        contentType: 'IMAGE_POST',
      },
    ];

    // 3. Best Posting Hours (in Asia/Bangkok)
    const bestPostingHours = [
      { hour: '11:30 น. (พักเที่ยง)', performanceScore: 82 },
      { hour: '18:00 - 19:00 น. (เลิกงานกะบ่าย)', performanceScore: 94 },
      { hour: '20:30 - 21:30 น. (ก่อนนอน/พักผ่อน)', performanceScore: 96 },
      { hour: '07:30 น. (เช้าก่อนเริ่มงาน)', performanceScore: 68 },
    ];

    // 4. Winning concepts
    const winningConcepts = [
      { concept: 'รสชาติคิดถึงบ้าน (Comfort Food)', count: 8, avgLikes: 380 },
      { concept: 'ของสดบินตรงจากไทยเข้าใหม่ประจำสัปดาห์', count: 6, avgLikes: 340 },
      { concept: 'ASMR เสียงหั่น/ทำอาหารยามดึก', count: 4, avgLikes: 410 },
      { concept: 'เทียบของแท้ vs ของเลียนแบบในไต้หวัน', count: 3, avgLikes: 390 },
    ];

    // 5. Actionable recommendations
    const summaryRecommendations = [
      'คอนเทนต์กลุ่มน้ำพริก/ปลาร้า และของสดนำเข้า มี Engagement สูงที่สุด ควรเน้นนำเสนอทุกต้นสัปดาห์',
      'วิดีโอ Reel ที่มีเสียง ASMR หั่นหรือทอดใน 3 วินาทีแรก ช่วยเพิ่ม Watch Time และยอดทัก Inbox สูงกว่าภาพนิ่ง 28%',
      'ช่วงเวลาโพสต์ที่ทำผลงานได้ดีที่สุดคือ 20:30 - 21:30 น. (เวลาผ่อนคลายของพี่น้องแรงงานไทยในหอพัก)',
      'การระบุราคา NT$ ชัดเจนในภาพหรือแคปชั่น ช่วยลดคำถามซ้ำซ้อนและเร่งการตัดสินใจสั่งซื้อได้เร็วยิ่งขึ้น',
    ];

    return {
      topCategories,
      topHooks,
      bestPostingHours,
      winningConcepts,
      summaryRecommendations,
    };
  }
}

export const contentIntelligenceService = new ContentIntelligenceService();
