import React from 'react';
import {
  Package,
  Sparkles,
  CheckCircle2,
  Clock,
  Calendar,
  Send,
  BarChart3,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  ExternalLink,
  ChevronRight,
  Eye,
  MessageCircle,
  ThumbsUp,
  Share2,
} from 'lucide-react';
import { DashboardResponse, ContentJob, ScheduledPost, PublishedPost } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface DashboardPageProps {
  data: DashboardResponse | null;
  loading: boolean;
  onNavigate: (tab: string) => void;
  onQuickApprove: (jobId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  data,
  loading,
  onNavigate,
  onQuickApprove,
}) => {
  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">กำลังโหลดข้อมูลแดชบอร์ด KK Shop Studio...</p>
        </div>
      </div>
    );
  }

  const { counts, waitingQueue, upcomingScheduled, recentPublished } = data;

  const statCards = [
    {
      id: 'products',
      label: 'สินค้าทั้งหมด',
      count: counts.totalProducts,
      sub: 'ในระบบ Master',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
      icon: Package,
      tab: 'products',
    },
    {
      id: 'generating',
      label: 'งานกำลังสร้าง',
      count: counts.generating,
      sub: 'AI Pipeline',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10 border-cyan-500/20',
      icon: Sparkles,
      tab: 'factory',
    },
    {
      id: 'waitingApproval',
      label: 'รอตรวจอนุมัติ',
      count: counts.waitingApproval,
      sub: 'ต้องตรวจก่อนโพสต์',
      color: 'text-amber-300',
      bgColor: 'bg-amber-500/20 border-amber-500/40 ring-1 ring-amber-500/30',
      icon: Clock,
      alert: counts.waitingApproval > 0,
      tab: 'approval',
    },
    {
      id: 'approved',
      label: 'อนุมัติแล้ว',
      count: counts.approved,
      sub: 'พร้อมตั้งเวลา',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
      icon: CheckCircle2,
      tab: 'scheduler',
    },
    {
      id: 'scheduled',
      label: 'ตั้งเวลาแล้ว',
      count: counts.scheduled,
      sub: 'รอถึงเวลาโพสต์',
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10 border-indigo-500/20',
      icon: Calendar,
      tab: 'scheduler',
    },
    {
      id: 'postedToday',
      label: 'โพสต์วันนี้',
      count: counts.postedToday,
      sub: 'Facebook Page',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
      icon: Send,
      tab: 'published',
    },
    {
      id: 'analysisPending',
      label: 'รอวิเคราะห์',
      count: counts.analysisPending,
      sub: 'นับถอยหลัง 72 ชม.',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/20',
      icon: Clock,
      tab: 'published',
    },
    {
      id: 'analyzed',
      label: 'วิเคราะห์แล้ว',
      count: counts.analyzed,
      sub: 'มีสถิติครบถ้วน',
      color: 'text-teal-400',
      bgColor: 'bg-teal-500/10 border-teal-500/20',
      icon: BarChart3,
      tab: 'performance',
    },
    {
      id: 'error',
      label: 'ข้อผิดพลาด',
      count: counts.error,
      sub: 'ต้องตรวจสอบ',
      color: counts.error > 0 ? 'text-rose-400' : 'text-slate-400',
      bgColor: counts.error > 0 ? 'bg-rose-500/20 border-rose-500/30' : 'bg-slate-900 border-slate-800',
      icon: AlertCircle,
      tab: 'logs',
    },
  ];

  const workflowSteps = [
    { num: '1', title: 'เลือกสินค้า', desc: 'ดึงจาก Master NT$', tab: 'products' },
    { num: '2', title: 'สร้าง Content', desc: 'Gemini Brief & ภาพ', tab: 'factory' },
    { num: '3', title: 'ตรวจงาน', desc: 'เช็กความถูกต้อง', tab: 'approval' },
    { num: '4', title: 'Approve', desc: 'อนุมัติโดยแอดมิน', tab: 'approval' },
    { num: '5', title: 'ตั้งเวลา', desc: 'เลือกเวลาไทย', tab: 'scheduler' },
    { num: '6', title: 'โพสต์', desc: 'ลงเพจร้านขอนแก่น', tab: 'published' },
    { num: '7', title: 'ดูผล 72 ชม.', desc: 'สถิติ & LINE', tab: 'performance' },
  ];

  return (
    <div className="space-y-6">
      {/* Workflow Stepper Guide */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            ขั้นตอนการทำงาน (Production Workflow)
          </span>
          <span className="text-xs text-slate-400">
            เข้มงวดกฎ: ไม่อนุมัติ = ไม่โพสต์เด็ดขาด 🔒
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {workflowSteps.map((step, idx) => (
            <button
              key={step.num}
              onClick={() => onNavigate(step.tab)}
              className="group p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 text-left transition flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="h-5 w-5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center">
                  {step.num}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-amber-400 transition" />
              </div>
              <div className="mt-2">
                <div className="text-xs font-bold text-slate-200 group-hover:text-white">
                  {step.title}
                </div>
                <div className="text-[11px] text-slate-500 truncate">{step.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 9 Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => onNavigate(card.tab)}
              className={`p-3.5 rounded-2xl border text-left transition hover:scale-[1.02] flex flex-col justify-between ${card.bgColor}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300 truncate">
                  {card.label}
                </span>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div className="mt-2">
                <div className={`text-2xl font-black ${card.color}`}>
                  {card.count}
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  {card.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Urgent Approval Queue vs Upcoming & Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Urgent Waiting Approval */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">
                รายการรอตรวจอนุมัติ ({waitingQueue.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigate('approval')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
            >
              <span>ไปที่ศูนย์อนุมัติทั้งหมด</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {waitingQueue.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-200">
                ไม่มีคอนเทนต์ค้างตรวจในขณะนี้
              </p>
              <p className="text-xs text-slate-400 mt-1">
                สร้างคอนเทนต์ใหม่จาก Product Master หรือรอรอบถัดไป
              </p>
              <button
                onClick={() => onNavigate('factory')}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition"
              >
                + สร้างคอนเทนต์ใหม่
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {waitingQueue.map((job) => (
                <div
                  key={job.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row gap-4 items-start"
                >
                  {/* Media Thumbnail */}
                  <div className="h-28 w-28 md:h-24 md:w-24 rounded-xl bg-slate-950 overflow-hidden shrink-0 border border-slate-800 relative group">
                    <img
                      src={
                        job.generatedImageUrl ||
                        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'
                      }
                      alt={job.productName}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute top-1.5 left-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-950/80 text-amber-400 border border-amber-500/30">
                        {job.contentType}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-white text-sm truncate">
                        {job.productName}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">
                        NT$ {job.priceNTD}
                      </span>
                      <StatusBadge status={job.status} />
                    </div>

                    <p className="text-xs text-amber-300/90 font-medium mt-1 truncate">
                      💡 {job.creativeBrief?.headline || job.creativeStyle}
                    </p>

                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {job.caption || 'ยังไม่มีแคปชั่น'}
                    </p>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-500">
                        ID: {job.id}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onNavigate('approval')}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                        >
                          ตรวจอย่างละเอียด
                        </button>
                        <button
                          onClick={() => onQuickApprove(job.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition active:scale-95"
                        >
                          อนุมัติทันที ✓
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Upcoming Scheduled & Published */}
        <div className="space-y-6">
          {/* Upcoming Scheduled */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-400" />
                <h4 className="font-bold text-white text-sm">
                  คิวรอโพสต์เร็วๆ นี้ ({upcomingScheduled.length})
                </h4>
              </div>
              <button
                onClick={() => onNavigate('scheduler')}
                className="text-[11px] text-indigo-400 hover:underline"
              >
                ดูปฏิทิน
              </button>
            </div>

            {upcomingScheduled.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                ยังไม่มีรายการตั้งเวลาไว้
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingScheduled.map((sched) => (
                  <div
                    key={sched.id}
                    className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        {sched.contentId}
                      </div>
                      <div className="text-[11px] text-indigo-300 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        <span>{sched.publishAtBangkok}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300">
                      SCHEDULED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recently Published */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-blue-400" />
                <h4 className="font-bold text-white text-sm">
                  โพสต์ล่าสุดบน Facebook
                </h4>
              </div>
              <button
                onClick={() => onNavigate('published')}
                className="text-[11px] text-blue-400 hover:underline"
              >
                ดูทั้งหมด
              </button>
            </div>

            {recentPublished.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                ยังไม่มีโพสต์ที่เผยแพร่
              </p>
            ) : (
              <div className="space-y-2">
                {recentPublished.map((post) => (
                  <div
                    key={post.id}
                    className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate max-w-[160px]">
                        {post.productName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {post.publishedAtBangkok}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span
                        className={`font-semibold ${
                          post.isPerformanceChecked
                            ? 'text-teal-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {post.isPerformanceChecked
                          ? '✓ วิเคราะห์ 72 ชม. แล้ว'
                          : '⏳ รอครบ 72 ชม.'}
                      </span>

                      <a
                        href={post.facebookPostUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <span>เปิด FB</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
