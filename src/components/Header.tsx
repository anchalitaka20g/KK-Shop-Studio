import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Video,
  Bell,
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { api } from '../services/api';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  waitingCount: number;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  waitingCount,
  onRefresh,
}) => {
  const [bangkokTime, setBangkokTime] = useState<string>('');
  const [isSendingLine, setIsSendingLine] = useState(false);
  const [lineMessage, setLineMessage] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat('th-TH', {
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(now);
      setBangkokTime(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const tabTitles: Record<string, { title: string; desc: string }> = {
    dashboard: {
      title: 'แดชบอร์ดภาพรวม (Overview)',
      desc: 'ศูนย์ควบคุมการผลิตคอนเทนต์ AI และการเผยแพร่ Facebook ร้านขอนแก่น',
    },
    products: {
      title: 'ข้อมูลสินค้าหลัก (Product Master)',
      desc: 'แคตตาล็อกสินค้าไทย ราคา NTD สต็อก และมีเดียตั้งต้น',
    },
    media: {
      title: 'คลังไฟล์ Google Drive (Media Library)',
      desc: 'โครงสร้างโฟลเดอร์ 01_RAW, 02_GENERATED, 03_APPROVED, 04_POSTED_ARCHIVE',
    },
    factory: {
      title: 'Content Factory (สร้างคอนเทนต์)',
      desc: 'ผสานพลัง Gemini AI วางแผน Creative Brief, แคปชั่น, และภาพแอดโฆษณา',
    },
    'reel-studio': {
      title: 'Reel Studio (สตูดิโอรีลส์ 9:16)',
      desc: 'สร้างวิดีโอสั้นแนวตั้ง 10 วินาที บทพูดภาษาไทยล้วน พร้อม Prompt Google Flow',
    },
    approval: {
      title: 'ศูนย์รอตรวจอนุมัติ (Approval Center)',
      desc: 'จุดตรวจคุณภาพก่อนเผยแพร่ — ทุกคอนเทนต์ต้องผ่านการอนุมัติจากแอดมินเท่านั้น',
    },
    scheduler: {
      title: 'ปฏิทินตั้งเวลาโพสต์ (Scheduler)',
      desc: 'จัดการคิวโพสต์ล่วงหน้าตามเวลาประเทศไทย (Asia/Bangkok) ป้องกันการโพสต์ซ้ำ',
    },
    published: {
      title: 'โพสต์ที่เผยแพร่แล้ว (Published Posts)',
      desc: 'ประวัติโพสต์บน Facebook Page และสถานะรอตรวจวัดผลครบ 72 ชั่วโมง',
    },
    performance: {
      title: 'ผลงาน 72 ชม. & Content Intelligence',
      desc: 'สถิติ Reach, Engagement และการเรียนรู้เพื่อพัฒนาคอนเทนต์ล็อตถัดไป',
    },
    characters: {
      title: 'คลังตัวละคร (Character Library)',
      desc: 'จัดการคาแรคเตอร์ "เจ๊อ๋อย" และกฎการสื่อสารประจำร้านขอนแก่น',
    },
    logs: {
      title: 'บันทึกประวัติระบบ (Audit Logs)',
      desc: 'ประวัติการดำเนินการ การอนุมัติ การโพสต์ และการแจ้งเตือนทั้งหมด',
    },
    settings: {
      title: 'ตั้งค่าระบบและการเชื่อมต่อ (Settings)',
      desc: 'ตรวจสอบสถานะ Facebook Meta API, Gemini AI, LINE Messaging, และ Google Drive',
    },
  };

  const currentInfo = tabTitles[currentTab] || {
    title: 'KK Shop Content Studio',
    desc: 'ระบบผลิตคอนเทนต์ร้านขอนแก่น ไต้หวัน',
  };

  const handleTriggerLineSummary = async () => {
    try {
      setIsSendingLine(true);
      const res = await api.triggerDailyApprovalSummary();
      setLineMessage(
        res.result
          ? `ส่งสรุปงาน ${waitingCount} รายการเข้า LINE เรียบร้อย!`
          : 'ไม่มีงานที่รอตรวจในขณะนี้'
      );
      setTimeout(() => setLineMessage(null), 4000);
    } catch (err: any) {
      setLineMessage(`ส่ง LINE ไม่สำเร็จ: ${err.message}`);
      setTimeout(() => setLineMessage(null), 4000);
    } finally {
      setIsSendingLine(false);
    }
  };

  return (
    <header className="h-20 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          {currentInfo.title}
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">{currentInfo.desc}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Bangkok Live Clock */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <Clock className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-slate-400">เวลาไทย (กทม.):</span>
          <span className="font-mono font-bold text-amber-300">{bangkokTime || '--:--:--'}</span>
        </div>

        {/* Trigger Line Summary Button */}
        <button
          onClick={handleTriggerLineSummary}
          disabled={isSendingLine}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-semibold transition"
          title="ทดสอบส่งสรุปงานรอตรวจเข้า LINE (รอบประจำวัน 21:00 น.)"
        >
          <Bell className={`h-3.5 w-3.5 ${isSendingLine ? 'animate-spin' : ''}`} />
          <span>ส่งสรุป LINE (21:00)</span>
        </button>

        {/* Create Reel Button */}
        <button
          onClick={() => onSelectTab('reel-studio')}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-semibold transition"
        >
          <Video className="h-3.5 w-3.5" />
          <span>สร้าง Reel 9:16</span>
        </button>

        {/* Create Content Job Button */}
        <button
          onClick={() => onSelectTab('factory')}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition active:scale-95"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>สร้าง Content ใหม่</span>
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition"
          title="รีเฟรชข้อมูล"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {lineMessage && (
        <div className="absolute top-22 right-6 bg-slate-900 border border-emerald-500/50 text-emerald-300 px-4 py-2 rounded-xl text-xs font-medium shadow-xl flex items-center gap-2 animate-bounce z-50">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>{lineMessage}</span>
        </div>
      )}
    </header>
  );
};
