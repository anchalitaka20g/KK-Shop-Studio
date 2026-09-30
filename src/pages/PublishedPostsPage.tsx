import React, { useState, useEffect } from 'react';
import {
  Send,
  ExternalLink,
  Clock,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { PublishedPost, PerformanceCheck } from '../types';
import { api } from '../services/api';

interface PublishedPostsPageProps {
  onNavigateToPerformance: () => void;
}

export const PublishedPostsPage: React.FC<PublishedPostsPageProps> = ({
  onNavigateToPerformance,
}) => {
  const [posts, setPosts] = useState<PublishedPost[]>([]);
  const [pageId, setPageId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [evalResult, setEvalResult] = useState<PerformanceCheck | null>(null);

  useEffect(() => {
    loadPublishedPosts();
    api.getStatus().then(res => {
      setPageId(res.settings?.facebookPageId || '');
    }).catch(() => {});
  }, []);

  const loadPublishedPosts = async () => {
    setLoading(true);
    try {
      const data = await api.getPublishedPosts();
      setPosts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async (postId: string, forceRecheck = false) => {
    setEvaluatingId(postId);
    try {
      const result = await api.evaluatePost72h(postId, forceRecheck);
      setEvalResult(result);
      loadPublishedPosts();
    } catch (err: any) {
      console.error(`การประเมิน 72 ชม. ล้มเหลว: ${err.message}`);
    } finally {
      setEvaluatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-400" />
            <h3 className="font-bold text-white text-base">
              โพสต์ที่เผยแพร่แล้วบน Facebook (Published Archive)
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 font-mono">
              {pageId ? `Page ID: ${pageId}` : 'ไม่ได้ระบุ Page ID'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            บันทึกประวัติการเผยแพร่จริงและจุดตรวจวัดผล 72 ชั่วโมง (72-Hour Checkpoint) เพื่อดึง Reach, Engagement และส่งสรุปเข้า LINE
          </p>
        </div>

        <button
          onClick={onNavigateToPerformance}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 text-xs font-semibold border border-teal-500/30 transition"
        >
          <BarChart3 className="h-4 w-4" />
          <span>ดูสถิติภาพรวมทั้งหมด</span>
        </button>
      </div>

      {evalResult && (
        <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-200 text-xs space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-teal-300">
              <CheckCircle2 className="h-5 w-5 text-teal-400" />
              <span>ประเมินผล 72 ชม. สำเร็จ: {evalResult.productName}</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono font-bold">
              Engagement Rate: {evalResult.engagementRate}%
            </span>
          </div>
          <p className="text-slate-300">{evalResult.summaryThai}</p>
          <div className="pt-2 flex items-center gap-4 text-[11px] text-slate-400 border-t border-teal-500/20">
            <span>Reach: {evalResult.reach.toLocaleString()}</span>
            <span>Impressions: {evalResult.impressions.toLocaleString()}</span>
            <span>ถูกใจ: {evalResult.reactions}</span>
            <span>คอมเมนต์: {evalResult.comments}</span>
            <span>แชร์: {evalResult.shares}</span>
            <span className="text-emerald-400">✓ ส่งแจ้งเตือน LINE แล้ว</span>
          </div>
        </div>
      )}

      {/* Posts List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          กำลังโหลดประวัติโพสต์...
        </div>
      ) : posts.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <Send className="h-10 w-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">
            ยังไม่มีโพสต์ที่เผยแพร่
          </p>
          <p className="text-xs text-slate-500 mt-1">
            เมื่ออนุมัติและตั้งเวลาโพสต์สำเร็จ โพสต์จะมาปรากฏในหน้านี้
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const checkDate = new Date(post.performanceCheckAt);
            const now = new Date();
            const isDue = now >= checkDate;
            const hoursLeft = Math.max(0, Math.round((checkDate.getTime() - now.getTime()) / (1000 * 60 * 60)));

            return (
              <div
                key={post.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow-xl flex flex-col md:flex-row gap-5 items-start"
              >
                {/* Image preview */}
                <div className="h-28 w-28 rounded-xl bg-slate-950 overflow-hidden shrink-0 border border-slate-800">
                  <img
                    src={post.mediaUrl}
                    alt={post.productName}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-base truncate">
                        {post.productName}
                      </h4>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                        <span>โพสต์เมื่อ: {post.publishedAtBangkok}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-500">Post ID: {post.facebookPostId}</span>
                      </div>
                    </div>

                    <a
                      href={post.facebookPostUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 text-xs font-semibold flex items-center gap-1.5 border border-blue-500/30 transition shrink-0"
                    >
                      <span>เปิดบน Facebook</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 font-sans">
                    {post.caption}
                  </p>

                  {/* 72h Status pill */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="h-4 w-4 text-purple-400" />
                      <span className="text-slate-400">จุดเช็ก 72 ชม.:</span>
                      {post.isPerformanceChecked ? (
                        <span className="text-teal-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>วิเคราะห์เสร็จสมบูรณ์แล้ว</span>
                        </span>
                      ) : isDue ? (
                        <span className="text-amber-400 font-semibold">
                          ครบ 72 ชม. แล้ว — พร้อมประเมินผล
                        </span>
                      ) : (
                        <span className="text-slate-300 font-medium">
                          จะครบในอีก ~{hoursLeft} ชั่วโมง
                        </span>
                      )}
                    </div>

                    <div>
                      {!post.isPerformanceChecked ? (
                        <button
                          onClick={() => handleEvaluate(post.id)}
                          disabled={evaluatingId === post.id}
                          className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-teal-600/20 flex items-center gap-1.5 transition active:scale-95"
                          title="ดึงตัวเลข Reach, Engagement จาก Meta API และสร้างบทวิเคราะห์ภาษาไทย"
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                          <span>
                            {evaluatingId === post.id
                              ? 'กำลังคำนวณ...'
                              : 'ดึงผลตอบรับ 72 ชม. ทันที'}
                          </span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEvaluate(post.id, true)}
                            disabled={evaluatingId === post.id}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition"
                            title="บังคับประเมินผลประสิทธิภาพใหม่อีกครั้ง"
                          >
                            {evaluatingId === post.id ? 'กำลังตรวจซ้ำ...' : 'บังคับตรวจซ้ำ'}
                          </button>
                          <button
                            onClick={onNavigateToPerformance}
                            className="text-xs text-teal-400 hover:underline flex items-center gap-1 font-semibold"
                          >
                            <span>ดูรายงานสถิติ</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
