import React from 'react';
import { ContentStatus } from '../types';

interface StatusBadgeProps {
  status: ContentStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-sm font-semibold',
    lg: 'px-3 py-1.5 text-base font-bold',
  }[size];

  switch (status) {
    case 'WAITING_APPROVAL':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 ${sizeClasses}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          รอตรวจอนุมัติ
        </span>
      );
    case 'APPROVED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 ${sizeClasses}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          อนุมัติแล้ว
        </span>
      );
    case 'GENERATING':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 ${sizeClasses}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-spin" />
          กำลังผลิต AI
        </span>
      );
    case 'SCHEDULED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 ${sizeClasses}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
          ตั้งเวลาแล้ว
        </span>
      );
    case 'POSTING':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 ${sizeClasses}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
          กำลังส่งโพสต์
        </span>
      );
    case 'POSTED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 ${sizeClasses}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          โพสต์แล้ว
        </span>
      );
    case 'ANALYZED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 ${sizeClasses}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
          วิเคราะห์ครบ 72 ชม.
        </span>
      );
    case 'REJECTED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 ${sizeClasses}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
          ปฏิเสธแล้ว
        </span>
      );
    case 'ERROR':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-red-600/20 text-red-300 border border-red-500/40 ${sizeClasses}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          ข้อผิดพลาด
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 ${sizeClasses}`}>
          {status}
        </span>
      );
  }
};
