import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Edit3,
  Calendar,
  Layers,
  Sparkles,
  AlertTriangle,
  Clock,
  ExternalLink,
  Save,
  X,
  ShieldAlert,
} from 'lucide-react';
import { ContentJob } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

interface ApprovalCenterPageProps {
  onScheduleJob: (job: ContentJob) => void;
}

export const ApprovalCenterPage: React.FC<ApprovalCenterPageProps> = ({ onScheduleJob }) => {
  const [jobs, setJobs] = useState<ContentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('WAITING_APPROVAL');

  // Edit Caption Modal
  const [editingJob, setEditingJob] = useState<ContentJob | null>(null);
  const [editCaptionText, setEditCaptionText] = useState('');
  const [editHashtagsText, setEditHashtagsText] = useState('');
  const [isSavingCaption, setIsSavingCaption] = useState(false);

  // Reject Modal
  const [rejectingJob, setRejectingJob] = useState<ContentJob | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Processing indicator
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, [filterStatus]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await api.getContentJobs(filterStatus === 'ALL' ? undefined : filterStatus);
      setJobs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await api.approveContent(id);
      loadJobs();
    } catch (err: any) {
      console.error(`อนุมัติไม่สำเร็จ: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRegenerate = async (id: string) => {
    setProcessingId(id);
    try {
      await api.regenerateContent(id);
      loadJobs();
    } catch (err: any) {
      console.error(`สั่งสร้างใหม่ไม่สำเร็จ: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenEdit = (job: ContentJob) => {
    setEditingJob(job);
    setEditCaptionText(job.caption);
    setEditHashtagsText(job.hashtags.join(' '));
  };

  const handleSaveEditCaption = async () => {
    if (!editingJob) return;
    setIsSavingCaption(true);
    try {
      const tags = editHashtagsText
        .split(' ')
        .map((t) => t.trim())
        .filter((t) => t.startsWith('#'));
      await api.updateCaption(editingJob.id, editCaptionText, tags);
      setEditingJob(null);
      loadJobs();
    } catch (err: any) {
      console.error(`บันทึกไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsSavingCaption(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingJob) return;
    try {
      await api.rejectContent(rejectingJob.id, rejectReason || 'ไม่อนุมัติโดยแอดมิน');
      setRejectingJob(null);
      setRejectReason('');
      loadJobs();
    } catch (err: any) {
      console.error(`ปฏิเสธไม่สำเร็จ: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">
              ศูนย์ตรวจอนุมัติเนื้อหา (Approval Center)
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
              Mandatory Approval Rule
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            กฎเหล็กความปลอดภัย: คอนเทนต์จะไม่สามารถเข้าคิวโพสต์หรือเผยแพร่บน Facebook ได้จนกว่าจะผ่านการตรวจและอนุมัติ (APPROVED) จากผู้ดูแลระบบ
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          {[
            { id: 'WAITING_APPROVAL', label: 'รอตรวจ' },
            { id: 'APPROVED', label: 'อนุมัติแล้ว' },
            { id: 'REJECTED', label: 'ปฏิเสธแล้ว' },
            { id: 'ALL', label: 'ทั้งหมด' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                filterStatus === f.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          กำลังโหลดรายการคอนเทนต์...
        </div>
      ) : jobs.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">
            {filterStatus === 'WAITING_APPROVAL'
              ? 'ไม่มีงานรอตรวจในขณะนี้!'
              : 'ไม่พบรายการตามสถานะที่เลือก'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            สร้างคอนเทนต์ใหม่จาก Content Factory เพื่อส่งมาตรวจ
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const isProcessing = processingId === job.id;
            return (
              <div
                key={job.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow-xl space-y-4"
              >
                <div className="flex flex-col md:flex-row gap-5 items-start">
                  {/* Media Preview (large preview) */}
                  <div className="h-48 w-48 md:h-52 md:w-52 rounded-2xl bg-slate-950 overflow-hidden shrink-0 border border-slate-800 relative group shadow-md">
                    <img
                      src={
                        job.generatedImageUrl ||
                        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
                      }
                      alt={job.productName}
                      className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950/80 text-amber-300 border border-amber-500/30">
                        {job.contentType}
                      </span>
                    </div>

                    <div className="absolute bottom-2 left-2 right-2 p-2 rounded-xl bg-slate-950/90 backdrop-blur border border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-400">ราคา NTD</span>
                      <span className="font-mono font-black text-emerald-400">
                        NT$ {job.priceNTD}
                      </span>
                    </div>
                  </div>

                  {/* Content Info & Body */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-white text-base">
                            {job.productName}
                          </h4>
                          <StatusBadge status={job.status} />
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                          <span className="font-mono text-slate-500">ID: {job.id}</span>
                          <span>•</span>
                          <span>สร้างเมื่อ: {new Date(job.createdAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</span>
                        </div>
                      </div>

                      {job.status === 'APPROVED' && (
                        <button
                          onClick={() => onScheduleJob(job)}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition active:scale-95 shrink-0"
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          <span>ตั้งเวลาโพสต์</span>
                        </button>
                      )}
                    </div>

                    {/* Creative Headline */}
                    {job.creativeBrief?.headline && (
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                        <span className="text-[10px] uppercase font-bold text-amber-400 block mb-0.5">
                          พาดหัวโฆษณา (Headline)
                        </span>
                        <p className="font-bold text-white">
                          {job.creativeBrief.headline}
                        </p>
                      </div>
                    )}

                    {/* Caption Preview */}
                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        เนื้อหาแคปชั่น (Caption Preview)
                      </span>
                      <p className="text-slate-200 whitespace-pre-line leading-relaxed">
                        {job.caption || 'ยังไม่มีแคปชั่น'}
                      </p>
                      {job.hashtags && job.hashtags.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-1 border-t border-slate-900 text-cyan-400">
                          {job.hashtags.join(' ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rejection notice if any */}
                {job.rejectionReason && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>เหตุผลที่ปฏิเสธ: {job.rejectionReason}</span>
                  </div>
                )}

                {/* 4 Standard Action Buttons: อนุมัติ, แก้ Caption, สร้างใหม่, ปฏิเสธ */}
                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    แนวคิด: {job.creativeBrief?.creativeConcept || job.creativeStyle}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* EDIT CAPTION */}
                    <button
                      onClick={() => handleOpenEdit(job)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-cyan-400" />
                      <span>แก้ Caption</span>
                    </button>

                    {/* REGENERATE */}
                    <button
                      onClick={() => handleRegenerate(job.id)}
                      disabled={isProcessing}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 text-amber-400 ${isProcessing ? 'animate-spin' : ''}`} />
                      <span>สร้างใหม่</span>
                    </button>

                    {/* REJECT */}
                    {job.status !== 'REJECTED' && (
                      <button
                        onClick={() => {
                          setRejectingJob(job);
                          setRejectReason('');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold border border-rose-500/30 flex items-center gap-1.5 transition"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>ปฏิเสธ</span>
                      </button>
                    )}

                    {/* APPROVE */}
                    {job.status !== 'APPROVED' && (
                      <button
                        onClick={() => handleApprove(job.id)}
                        disabled={isProcessing}
                        className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition active:scale-95"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>อนุมัติ (APPROVE)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Caption Modal */}
      {editingJob && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">แก้ไขแคปชั่นสำหรับ Facebook</h3>
              <button onClick={() => setEditingJob(null)} className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  ข้อความแคปชั่น (Thai Language)
                </label>
                <textarea
                  rows={8}
                  value={editCaptionText}
                  onChange={(e) => setEditCaptionText(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-amber-500 font-sans"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  แฮชแท็ก (คั่นด้วยวรรค)
                </label>
                <input
                  type="text"
                  value={editHashtagsText}
                  onChange={(e) => setEditHashtagsText(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-cyan-400 font-mono"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setEditingJob(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveEditCaption}
                disabled={isSavingCaption}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20"
              >
                {isSavingCaption ? 'กำลังบันทึก...' : 'บันทึกแคปชั่น'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingJob && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <XCircle className="h-5 w-5" />
              <h3 className="text-base font-bold text-white">ปฏิเสธคอนเทนต์</h3>
            </div>

            <p className="text-xs text-slate-300">
              คอนเทนต์ "{rejectingJob.productName}" จะถูกทำเครื่องหมายเป็น REJECTED และจะไม่สามารถโพสต์ได้
            </p>

            <div>
              <label className="text-xs text-slate-400 block mb-1 font-semibold">
                ระบุเหตุผลการปฏิเสธ (เพื่อบันทึกลงระบบ):
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="เช่น ราคาโปรโมชั่นไม่ถูกต้อง, ข้อความยาวเกินไป, หรือรูปภาพไม่ตรงล็อต"
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setRejectingJob(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md"
              >
                ยืนยันการปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
