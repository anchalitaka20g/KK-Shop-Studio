import React from 'react';
import {
  LayoutDashboard,
  Package,
  FolderKanban,
  Sparkles,
  Video,
  CheckCircle2,
  Calendar,
  Send,
  BarChart3,
  UserCheck,
  FileText,
  Settings,
  Store,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  waitingCount: number;
  scheduledCount: number;
  isAllReady: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  waitingCount,
  scheduledCount,
  isAllReady,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
    { id: 'products', label: 'สินค้า (Master)', icon: Package },
    { id: 'media', label: 'คลังไฟล์ (Drive)', icon: FolderKanban },
    { id: 'factory', label: 'Content Factory', icon: Sparkles, badgeText: 'AI' },
    { id: 'reel-studio', label: 'Reel Studio (9:16)', icon: Video, badgeText: '10s' },
    {
      id: 'approval',
      label: 'รอตรวจอนุมัติ',
      icon: CheckCircle2,
      count: waitingCount,
      alert: waitingCount > 0,
    },
    {
      id: 'scheduler',
      label: 'ปฏิทินโพสต์',
      icon: Calendar,
      count: scheduledCount,
    },
    { id: 'published', label: 'โพสต์แล้ว (72h)', icon: Send },
    { id: 'performance', label: 'Performance & AI', icon: BarChart3 },
    { id: 'characters', label: 'เจ๊อ๋อย (Character)', icon: UserCheck },
    { id: 'logs', label: 'บันทึกระบบ (Logs)', icon: FileText },
    { id: 'settings', label: 'ตั้งค่าระบบ', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-screen text-slate-300">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <Store className="h-6 w-6 text-slate-950" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base leading-tight tracking-wide">
              KK Shop Studio
            </h1>
            <p className="text-xs text-amber-400 font-medium">ร้านขอนแก่น ไต้หวัน 🇹🇼</p>
          </div>
        </div>

        {/* Timezone badge */}
        <div className="mt-3 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-emerald-400" />
            Asia/Bangkok (UTC+7)
          </span>
          <span className="text-amber-300 font-medium">NT$ / TWD</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          เมนูการจัดการ
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-white'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.count !== undefined && item.count > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive
                      ? 'bg-slate-950 text-amber-400'
                      : item.alert
                      ? 'bg-amber-500 text-slate-950 animate-pulse'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.count}
                </span>
              )}

              {item.badgeText && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isActive
                      ? 'bg-slate-950 text-amber-400'
                      : 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
                  }`}
                >
                  {item.badgeText}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/50">
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">สถานะระบบ</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              พร้อมใช้งาน
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Facebook Page:</span>
            <span className="font-mono text-slate-300">1858484...</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
