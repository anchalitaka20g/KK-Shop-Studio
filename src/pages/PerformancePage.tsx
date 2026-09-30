import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Award,
  Sparkles,
  Eye,
  ThumbsUp,
  MessageCircle,
  Share2,
  Clock,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';
import { PerformanceCheck, ContentIntelligenceData } from '../types';
import { api } from '../services/api';

export const PerformancePage: React.FC = () => {
  const [checks, setChecks] = useState<PerformanceCheck[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [intelligence, setIntelligence] = useState<ContentIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    setLoading(true);
    try {
      const [perfData, intelData] = await Promise.all([
        api.getPerformanceOverview(),
        api.getContentIntelligence(),
      ]);
      setChecks(perfData.checks);
      setMetrics(perfData.metrics);
      setIntelligence(intelData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-teal-400" />
            <h3 className="font-bold text-white text-base">
              การวิเคราะห์ผล 72 ชม. & Content Intelligence
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
              Data-Driven Learning
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            รวบรวมตัวเลข Engagement จริงจาก Meta API และสังเคราะห์บทเรียนเพื่อยกระดับ Creative Brief ของร้านขอนแก่น
          </p>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Reach เข้าถึงทั้งหมด</span>
              <Eye className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-white font-mono">
                {metrics.totalReach.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">คนไทยในไต้หวัน</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Impressions การแสดงผล</span>
              <BarChart3 className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-white font-mono">
                {metrics.totalImpressions.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">ครั้งบนหน้าฟีด</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Engagement รวม</span>
              <ThumbsUp className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-amber-300 font-mono">
                {metrics.totalEngagement.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">ไลก์ คอมเมนต์ แชร์ คลิก</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-teal-300 font-semibold">
              <span>เฉลี่ย Engagement Rate</span>
              <TrendingUp className="h-4 w-4 text-teal-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-teal-300 font-mono">
                {metrics.avgEngagementRate}%
              </span>
              <span className="text-[10px] text-teal-400/80 block mt-0.5">เกณฑ์สูงกว่าเฉลี่ยตลาด (4%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Content Intelligence Learning Section */}
      {intelligence && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Top Categories & Winning Concepts */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-400" />
                <h4 className="font-bold text-white text-sm">
                  หมวดสินค้าที่ทำผลงานยอดเยี่ยม (Top Performing Categories)
                </h4>
              </div>

              <div className="space-y-2">
                {intelligence.topCategories.map((cat, idx) => (
                  <div
                    key={cat.category}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-6 w-6 rounded-full bg-slate-900 text-amber-400 font-bold text-xs flex items-center justify-center border border-slate-800">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-white">{cat.category}</span>
                        <span className="text-[11px] text-slate-500 block">
                          จำนวน {cat.totalPosts} โพสต์ที่วิเคราะห์
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {cat.avgEngagementRate}%
                      </span>
                      <span className="text-[10px] text-slate-500 block">Avg Rate</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Winning Concepts */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <h4 className="font-bold text-white text-sm">
                  แนวคิดคอนเทนต์ที่ชนะใจคนไทย (Winning Concepts)
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {intelligence.winningConcepts.map((item, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-200 font-medium">{item.concept}</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-mono text-[11px]">
                      เฉลี่ย {item.avgLikes} Likes
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Hooks & Posting Hours & Actionable Advice */}
          <div className="lg:col-span-6 space-y-4">
            {/* Top Hooks */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-400" />
                <h4 className="font-bold text-white text-sm">
                  Hook ที่เปิดคลิป/โพสต์ได้คะแนนสูงสุด
                </h4>
              </div>

              <div className="space-y-2">
                {intelligence.topHooks.map((h, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="text-amber-400 font-bold uppercase">{h.contentType}</span>
                      <span className="font-mono text-emerald-400 font-bold">Rate {h.engagementRate}%</span>
                    </div>
                    <p className="text-slate-200 font-medium">"{h.hook}"</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Posting Times */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-400" />
                <h4 className="font-bold text-white text-sm">
                  ช่วงเวลาโพสต์ที่ได้ Engagement สูงสุดในไต้หวัน
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {intelligence.bestPostingHours.map((slot, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">{slot.hour}</span>
                    <span className="text-indigo-400 font-bold font-mono">Score {slot.performanceScore}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
              <span className="font-bold text-amber-300 block uppercase tracking-wider">
                ข้อเสนอแนะเชิงกลยุทธ์ (AI Recommendations):
              </span>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                {intelligence.summaryRecommendations.map((rec, i) => (
                  <li key={i} className="leading-relaxed">{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Checkpoint Records */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h4 className="font-bold text-white text-sm">
          ประวัติการประเมินผลรายโพสต์ครบ 72 ชม. ({checks.length} รายการ)
        </h4>

        {checks.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            ยังไม่มีโพสต์ที่ครบกำหนด 72 ชม.
          </p>
        ) : (
          <div className="space-y-3">
            {checks.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-900 pb-2">
                  <div>
                    <h5 className="font-bold text-white text-sm">{c.productName}</h5>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Post ID: {c.facebookPostId} • ประเมินเมื่อ: {new Date(c.evaluationDate).toLocaleDateString('th-TH')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                      Rate: {c.engagementRate}%
                    </span>
                    {c.lineNotified && (
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>แจ้ง LINE แล้ว</span>
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  💡 <span className="font-semibold text-amber-300">สรุปการวิเคราะห์:</span> {c.summaryThai}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-2 border-t border-slate-900 text-center text-xs">
                  <div className="p-2 rounded-lg bg-slate-900">
                    <span className="text-[10px] text-slate-500 block">Reach</span>
                    <span className="font-bold text-white font-mono">{c.reach.toLocaleString()}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900">
                    <span className="text-[10px] text-slate-500 block">Impressions</span>
                    <span className="font-bold text-white font-mono">{c.impressions.toLocaleString()}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900">
                    <span className="text-[10px] text-slate-500 block">Reactions</span>
                    <span className="font-bold text-white font-mono">{c.reactions}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900">
                    <span className="text-[10px] text-slate-500 block">Comments</span>
                    <span className="font-bold text-white font-mono">{c.comments}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900">
                    <span className="text-[10px] text-slate-500 block">Shares</span>
                    <span className="font-bold text-white font-mono">{c.shares}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900">
                    <span className="text-[10px] text-slate-500 block">Clicks</span>
                    <span className="font-bold text-white font-mono">{c.clicks}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
