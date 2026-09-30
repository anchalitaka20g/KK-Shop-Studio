import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Send,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Play,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Info,
} from 'lucide-react';
import { ScheduledPost, ContentJob } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

interface SchedulerPageProps {
  preselectedJob?: ContentJob | null;
  onNavigateToPublished: () => void;
}

export const SchedulerPage: React.FC<SchedulerPageProps> = ({
  preselectedJob,
  onNavigateToPublished,
}) => {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [approvedJobs, setApprovedJobs] = useState<ContentJob[]>([]);
  const [loading, setLoading] = useState(true);

  // Schedule Form
  const [targetJobId, setTargetJobId] = useState<string>(preselectedJob?.id || '');
  const [publishDate, setPublishDate] = useState<string>(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [publishTime, setPublishTime] = useState<string>('18:00');
  const [isScheduling, setIsScheduling] = useState(false);

  // Immediate Publish Form / Modal
  const [publishingJobId, setPublishingJobId] = useState<string | null>(null);
  const [publishSuccessNotice, setPublishSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (preselectedJob) {
      setTargetJobId(preselectedJob.id);
    }
  }, [preselectedJob]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [schedList, approvedList] = await Promise.all([
        api.getScheduledPosts(),
        api.getContentJobs('APPROVED'),
      ]);
      setScheduledPosts(schedList);
      setApprovedJobs(approvedList);
      if (!targetJobId && approvedList.length > 0) {
        setTargetJobId(approvedList[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetJobId) return;

    setIsScheduling(true);
    try {
      // Build ISO in Asia/Bangkok (+07:00)
      const dateTimeString = `${publishDate}T${publishTime}:00+07:00`;
      await api.schedulePost(targetJobId, dateTimeString);
      loadData();
      setPublishSuccessNotice('ตั้งเวลาโพสต์สำเร็จ!');
      setTimeout(() => setPublishSuccessNotice(null), 3000);
    } catch (err: any) {
      console.error(`ตั้งเวลาไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.cancelScheduledPost(id);
      loadData();
    } catch (err: any) {
      console.error(`ยกเลิกไม่สำเร็จ: ${err.message}`);
    }
  };

  const handlePublishNow = async (jobId: string, dryRun = false) => {
    setPublishingJobId(jobId);
    try {
      const res = await api.publishNow(jobId, dryRun);
      setPublishSuccessNotice(
        `โพสต์สำเร็จ! Post ID: ${res.facebookPostId} ${res.isSimulated ? '(โหมดจำลองปลอดภัย)' : '(บนเพจจริง)'}`
      );
      loadData();
      setTimeout(() => setPublishSuccessNotice(null), 5000);
    } catch (err: any) {
      console.error(`เกิดข้อผิดพลาดในการโพสต์: ${err.message}`);
    } finally {
      setPublishingJobId(null);
    }
  };

  const recommendedTimeSlots = [
    { time: '11:30', label: '11:30 น. (ช่วงพักเที่ยง)' },
    { time: '18:00', label: '18:00 น. (เลิกงานกะบ่าย)' },
    { time: '21:00', label: '21:00 น. (เวลาพักผ่อนในหอพัก - แนะนำ)' },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">
              ปฏิทินตั้งเวลาโพสต์ (Scheduler)
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              Asia/Bangkok (UTC+7)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            โพสต์เฉพาะคอนเทนต์ที่ผ่านการอนุมัติ (APPROVED) ป้องกันการโพสต์ซ้ำซ้อน และบันทึก Facebook Post ID อัตโนมัติ
          </p>
        </div>

        <button
          onClick={onNavigateToPublished}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5"
        >
          <span>ดูโพสต์ที่เผยแพร่แล้ว</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {publishSuccessNotice && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{publishSuccessNotice}</span>
          </div>
          <button
            onClick={onNavigateToPublished}
            className="underline hover:text-white"
          >
            ไปดูที่หน้าโพสต์แล้ว
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Schedule Form */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleCreateSchedule} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-amber-400" />
              <span>ตั้งเวลาโพสต์ใหม่</span>
            </h4>

            {/* Select Approved Content Job */}
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                เลือกคอนเทนต์ที่อนุมัติแล้ว (APPROVED) *
              </label>
              {approvedJobs.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 text-amber-300 text-xs">
                  ไม่มีคอนเทนต์ที่ผ่านการอนุมัติ กรุณาไปที่ "รอตรวจอนุมัติ" เพื่อ Approve ก่อน
                </div>
              ) : (
                <select
                  value={targetJobId}
                  onChange={(e) => setTargetJobId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  {approvedJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.productName} (NT$ {j.priceNTD}) — {j.contentType}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Date & Time Picker */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                  วันที่ต้องการโพสต์ *
                </label>
                <input
                  type="date"
                  required
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                  เวลา (Asia/Bangkok) *
                </label>
                <input
                  type="time"
                  required
                  value={publishTime}
                  onChange={(e) => setPublishTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* Recommended slots */}
            <div>
              <span className="text-[11px] text-slate-400 block mb-1.5">
                ช่วงเวลายอดนิยมสำหรับแรงงานไทยในไต้หวัน:
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {recommendedTimeSlots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => setPublishTime(slot.time)}
                    className={`p-2 rounded-lg text-left text-xs font-medium border transition ${
                      publishTime === slot.time
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Schedule */}
            <button
              type="submit"
              disabled={isScheduling || approvedJobs.length === 0}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition"
            >
              <Clock className="h-4 w-4" />
              <span>{isScheduling ? 'กำลังบันทึก...' : 'บันทึกเข้าปฏิทินโพสต์'}</span>
            </button>

            {/* Instant publish option */}
            {targetJobId && (
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">หรือต้องการโพสต์ทันที?</span>
                <button
                  type="button"
                  onClick={() => handlePublishNow(targetJobId, true)}
                  disabled={publishingJobId === targetJobId}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition"
                  title="ทดสอบส่งโพสต์ขึ้น Facebook ทันทีในโหมดปลอดภัย"
                >
                  {publishingJobId === targetJobId ? 'กำลังส่ง...' : 'ทดสอบโพสต์ทันที ⚡'}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Right Column (7 cols): Scheduled Posts List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-sm">
              รายการที่ตั้งเวลาไว้ในระบบ ({scheduledPosts.length})
            </h4>
            <span className="text-xs text-slate-500">
              สถานะ: SCHEDULED / POSTING / POSTED
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              กำลังโหลดข้อมูล...
            </div>
          ) : scheduledPosts.length === 0 ? (
            <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <CalendarIcon className="h-10 w-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">
                ยังไม่มีรายการที่ตั้งเวลาโพสต์
              </p>
              <p className="text-xs text-slate-500 mt-1">
                เลือกคอนเทนต์ที่อนุมัติแล้วทางด้านซ้ายเพื่อกำหนดวันและเวลา
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledPosts.map((sched) => (
                <div
                  key={sched.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          Content: {sched.contentId}
                        </span>
                        <StatusBadge status={sched.status} />
                      </div>
                      <div className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
                        <span className="text-indigo-300 font-medium">
                          📅 {sched.publishAtBangkok}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-slate-500">Page: {sched.facebookPageId}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {sched.status === 'SCHEDULED' && (
                      <>
                        <button
                          onClick={() => handlePublishNow(sched.contentId, false)}
                          disabled={publishingJobId === sched.contentId}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
                          title="สั่งยิงโพสต์ขึ้น Facebook ทันทีไม่ต้องรอเวลา"
                        >
                          โพสต์ทันที
                        </button>
                        <button
                          onClick={() => handleCancel(sched.id)}
                          className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                          title="ยกเลิกการตั้งเวลา"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
