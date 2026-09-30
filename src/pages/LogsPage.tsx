import React, { useState, useEffect } from 'react';
import {
  FileText,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { AuditLogEntry } from '../types';
import { api } from '../services/api';

export const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs(150);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter((log) => {
    if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        log.details.toLowerCase().includes(q) ||
        (log.contentId && log.contentId.toLowerCase().includes(q)) ||
        log.action.toLowerCase().includes(q) ||
        log.user.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const actions = [
    'ALL',
    'CONTENT_CREATED',
    'AI_GENERATION_STARTED',
    'AI_GENERATION_COMPLETED',
    'APPROVED',
    'REJECTED',
    'REGENERATED',
    'SCHEDULED',
    'POSTING_STARTED',
    'POSTED',
    'POST_FAILED',
    'PERFORMANCE_CHECKED',
    'LINE_NOTIFICATION_SENT',
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">บันทึกประวัติการทำงาน (Audit Logs)</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              Immutable Trace
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            เก็บบันทึกประวัติทุกการอนุมัติ การปฏิเสธ การสร้าง AI การโพสต์ และการแจ้งเตือน LINE เพื่อความโปร่งใสและตรวจสอบย้อนกลับได้
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          title="รีเฟรชประวัติ"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col md:flex-row gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="ค้นหาในบันทึก (Content ID, ข้อความ, ผู้ดำเนินการ)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-slate-500 shrink-0" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
          >
            {actions.map((act) => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">เวลา (Bangkok)</th>
                <th className="p-3">การกระทำ (Action)</th>
                <th className="p-3">Content ID</th>
                <th className="p-3">ผลลัพธ์</th>
                <th className="p-3">รายละเอียด (Details)</th>
                <th className="p-3">ผู้ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    กำลังโหลดประวัติ...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    ไม่พบบันทึกตามเงื่อนไข
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const resultBadge =
                    log.result === 'SUCCESS'
                      ? { bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 }
                      : log.result === 'WARNING'
                      ? { bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: AlertTriangle }
                      : { bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30', icon: XCircle };

                  const ResultIcon = resultBadge.icon;

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-amber-300 text-[11px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono text-cyan-400 text-[11px]">
                        {log.contentId || '—'}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${resultBadge.bg}`}>
                          <ResultIcon className="h-3 w-3" />
                          {log.result}
                        </span>
                      </td>
                      <td className="p-3 text-slate-200 min-w-[280px]">
                        {log.details}
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-400 text-[11px]">
                        {log.user}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
