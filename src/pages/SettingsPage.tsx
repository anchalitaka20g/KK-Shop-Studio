import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Key,
  Facebook,
  MessageSquare,
  Sparkles,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Play,
  Clock,
  Layers,
  HelpCircle,
  ExternalLink,
  LogOut,
  FolderCheck,
  Copy,
  Check,
  Send,
} from 'lucide-react';
import { SystemSettings, IntegrationItem, DriveTestResult, LineStatusResponse } from '../types';
import { api } from '../services/api';
import {
  signInWithGoogleDrive,
  signOutGoogleDrive,
  subscribeDriveAuth,
  getCachedDriveToken,
} from '../services/driveAuth';
import { User } from 'firebase/auth';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [publishingEnabled, setPublishingEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Google Drive state
  const [driveUser, setDriveUser] = useState<User | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(getCachedDriveToken());
  const [driveStatus, setDriveStatus] = useState<'CONNECTED' | 'NOT_CONNECTED' | 'AUTH_REQUIRED' | 'ERROR'>('AUTH_REQUIRED');
  const [driveFolderName, setDriveFolderName] = useState<string | null>(null);
  const [connectingDrive, setConnectingDrive] = useState(false);
  const [testingDrive, setTestingDrive] = useState(false);
  const [driveTestResult, setDriveTestResult] = useState<DriveTestResult | null>(null);

  // Test statuses
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiResult, setGeminiResult] = useState<string | null>(null);

  const [testingFb, setTestingFb] = useState(false);
  const [fbResult, setFbResult] = useState<string | null>(null);

  const [testingLine, setTestingLine] = useState(false);
  const [lineResult, setLineResult] = useState<string | null>(null);
  const [lineStatus, setLineStatus] = useState<LineStatusResponse | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  useEffect(() => {
    loadSettings();

    const unsubscribe = subscribeDriveAuth((user, token) => {
      setDriveUser(user);
      setDriveToken(token);
      if (token) {
        setDriveStatus('CONNECTED');
      } else {
        setDriveStatus('AUTH_REQUIRED');
      }
    });

    return () => unsubscribe();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [res, lineRes] = await Promise.all([
        api.getStatus(),
        api.getLineStatus().catch(() => null),
      ]);
      setSettings(res.settings);
      setIntegrations(res.integrations);
      setPublishingEnabled(Boolean(res.publishingEnabled));
      if (res.driveConnected) {
        setDriveStatus('CONNECTED');
      }
      if (lineRes) {
        setLineStatus(lineRes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectDrive = async () => {
    setConnectingDrive(true);
    setDriveTestResult(null);
    try {
      const { user, accessToken } = await signInWithGoogleDrive();
      setDriveUser(user);
      setDriveToken(accessToken);
      // Test immediately to verify ROOT folder access
      const testRes = await api.testDriveConnection();
      setDriveTestResult(testRes);
      setDriveStatus(testRes.status);
      if (testRes.folderName) {
        setDriveFolderName(testRes.folderName);
      }
      loadSettings();
    } catch (err: any) {
      console.error('Connect Drive Error:', err);
      setDriveStatus('ERROR');
      setDriveTestResult({
        status: 'ERROR',
        message: err.message || 'การเชื่อมต่อ Google Drive ถูกยกเลิกหรือไม่สำเร็จ',
      });
    } finally {
      setConnectingDrive(false);
    }
  };

  const handleDisconnectDrive = async () => {
    try {
      await signOutGoogleDrive();
      setDriveStatus('AUTH_REQUIRED');
      setDriveTestResult(null);
      setDriveFolderName(null);
      loadSettings();
    } catch (err: any) {
      console.error(`ออกจากระบบ Google Drive ไม่สำเร็จ: ${err.message}`);
    }
  };

  const handleTestDrive = async () => {
    setTestingDrive(true);
    setDriveTestResult(null);
    try {
      const res = await api.testDriveConnection();
      setDriveTestResult(res);
      setDriveStatus(res.status);
      if (res.folderName) {
        setDriveFolderName(res.folderName);
      }
    } catch (err: any) {
      setDriveStatus('ERROR');
      setDriveTestResult({
        status: 'ERROR',
        message: err.message || 'เกิดข้อผิดพลาดในการทดสอบ Google Drive',
      });
    } finally {
      setTestingDrive(false);
    }
  };

  const handleTestGemini = async () => {
    setTestingGemini(true);
    setGeminiResult(null);
    try {
      const res = await api.testGemini();
      setGeminiResult(res.success ? `✓ ${res.message}` : `✗ ${res.message}`);
    } catch (err: any) {
      setGeminiResult(`✗ ข้อผิดพลาด: ${err.message}`);
    } finally {
      setTestingGemini(false);
    }
  };

  const handleTestFacebook = async () => {
    setTestingFb(true);
    setFbResult(null);
    try {
      const res = await api.testFacebook();
      setFbResult(
        res.success
          ? `✓ ${res.message}`
          : `ℹ️ ${res.message}`
      );
    } catch (err: any) {
      setFbResult(`✗ ข้อผิดพลาด: ${err.message}`);
    } finally {
      setTestingFb(false);
    }
  };

  const handleTestLine = async () => {
    setTestingLine(true);
    setLineResult(null);
    try {
      await api.testLine();
      setLineResult('✓ ส่งข้อความทดสอบเข้า LINE ผู้ดูแลระบบสำเร็จเรียบร้อย!');
      const updated = await api.getLineStatus().catch(() => null);
      if (updated) setLineStatus(updated);
    } catch (err: any) {
      setLineResult(`✗ ข้อผิดพลาด: ${err.message}`);
    } finally {
      setTestingLine(false);
    }
  };

  const handleCopyWebhook = () => {
    const url = lineStatus?.webhookUrl || `${window.location.origin}/api/line/webhook`;
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">
              ตั้งค่าระบบ & สถานะการเชื่อมต่อ (System Settings)
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Environment Secrets Guard
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            ความปลอดภัยสูงสุด: ข้อมูลลับ API Keys, Tokens และรหัสผ่านทั้งหมดจะถูกเก็บเป็นตัวแปรแวดล้อมฝั่งเซิร์ฟเวอร์เท่านั้น ไม่ถูกเปิดเผยในบราวเซอร์
          </p>
        </div>
      </div>

      {/* Integration Readiness Checklist (Highlighting what needs credentials) */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">
              รายงานความพร้อมของระบบและการเชื่อมต่อภายนอก (Integration Readiness)
            </h4>
          </div>
          <span className="text-xs text-slate-400">
            KK Shop Content Studio v1.0
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {integrations.map((item) => {
            const isReady = item.isReady;
            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border flex flex-col justify-between ${
                  isReady
                    ? 'bg-slate-950/80 border-emerald-500/30'
                    : 'bg-slate-950/80 border-amber-500/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{item.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isReady
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{item.purpose}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-900 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span>ตัวแปร Env:</span>
                    <span className="font-mono text-slate-300">{item.envVar}</span>
                  </div>
                  <p
                    className={`text-[11px] ${
                      isReady ? 'text-emerald-400/90' : 'text-amber-300/90'
                    }`}
                  >
                    💡 {item.note}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sections & Interactive Tests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Google Drive Integration & Test (Native OAuth) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-cyan-400" />
              <h4 className="font-bold text-white text-sm">Google Drive (OAuth Integration)</h4>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                driveStatus === 'CONNECTED'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : driveStatus === 'AUTH_REQUIRED'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : driveStatus === 'ERROR'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {driveStatus}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Root Folder ID:</span>
              <span className="font-mono text-cyan-300 font-medium">1Qa0FOKKeMjgQCsGTZin5NBsf1Zlc7fJ0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">ชื่อโฟลเดอร์ Root:</span>
              <span className="font-bold text-white">
                {driveFolderName || (driveStatus === 'CONNECTED' ? 'ROOT (ร้านขอนแก่น)' : 'รอการตรวจสอบ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">บัญชีผู้ดูแลระบบ:</span>
              <span className="font-mono text-emerald-400">
                {driveUser?.email || (driveToken ? 'เชื่อมต่อแล้ว (Admin Session)' : 'ยังไม่ได้เชื่อมต่อ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Product Master File:</span>
              <span className="font-mono text-slate-300">1-j7OrP1Z0y1rVjYk2fswuW3-3BC_8OpH</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {driveStatus !== 'CONNECTED' ? (
              <button
                onClick={handleConnectDrive}
                disabled={connectingDrive}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-white/5"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{connectingDrive ? 'กำลังเปิดหน้าต่างยืนยัน Google...' : 'เชื่อมต่อ Google Drive'}</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleTestDrive}
                  disabled={testingDrive}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <FolderCheck className="h-4 w-4" />
                  <span>{testingDrive ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ Google Drive'}</span>
                </button>
                <button
                  onClick={handleDisconnectDrive}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center justify-center gap-1.5"
                  title="ออกจากระบบ"
                >
                  <LogOut className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            )}

            {driveTestResult && (
              <div
                className={`p-3 rounded-xl border text-xs ${
                  driveTestResult.status === 'CONNECTED'
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  {driveTestResult.status === 'CONNECTED' ? '✓ เชื่อมต่อสำเร็จ' : '✗ ไม่สามารถเชื่อมต่อได้'}
                </div>
                {driveTestResult.folderName && (
                  <div>โฟลเดอร์: <span className="font-mono">{driveTestResult.folderName}</span></div>
                )}
                {driveTestResult.folderId && (
                  <div>ID: <span className="font-mono">{driveTestResult.folderId}</span></div>
                )}
                {driveTestResult.message && <div className="mt-1">{driveTestResult.message}</div>}
              </div>
            )}
          </div>
        </div>

        {/* Facebook Settings & Test */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-blue-400" />
            <h4 className="font-bold text-white text-sm">Facebook Publishing (Meta Graph API)</h4>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Facebook Page ID:</span>
              <span className="font-mono font-bold text-white">
                {settings?.facebookPageId || 'ยังไม่ได้ระบุ (ระบุใน Secrets)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Page Access Token:</span>
              <span className="font-mono text-emerald-400">
                {settings?.hasFacebookToken ? '•••••••••••••••• (ตั้งค่าแล้ว)' : 'ยังไม่ได้ระบุ (โหมดจำลอง)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">สวิตช์ความปลอดภัย:</span>
              <span className={`font-mono font-semibold ${publishingEnabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                {publishingEnabled ? 'PUBLISHING_ENABLED = true' : 'PUBLISHING_ENABLED = false (โหมดปลอดภัย)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">มาตรการควบคุม:</span>
              <span className="text-amber-300 font-semibold">Strict Approval & Idempotency 🔒</span>
            </div>
          </div>

          <button
            onClick={handleTestFacebook}
            disabled={testingFb}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-2"
          >
            {testingFb ? 'กำลังทดสอบเชื่อมต่อ Meta...' : 'ทดสอบการเชื่อมต่อ Meta Graph API'}
          </button>

          {fbResult && (
            <div className="p-3 rounded-xl bg-slate-950 border border-blue-500/30 text-xs text-slate-300">
              {fbResult}
            </div>
          )}
        </div>

        {/* LINE Messaging Settings & Webhook Setup */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-400" />
              <h4 className="font-bold text-white text-sm">LINE Messaging API & Webhook</h4>
            </div>

            {/* Connection Status Badge */}
            {(() => {
              const status = lineStatus?.status || 'NOT_CONNECTED';
              if (status === 'CONNECTED') {
                return (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>CONNECTED</span>
                  </span>
                );
              }
              if (status === 'WEBHOOK_READY') {
                return (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>WEBHOOK_READY</span>
                  </span>
                );
              }
              if (status === 'ERROR') {
                return (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>ERROR</span>
                  </span>
                );
              }
              return (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>NOT_CONNECTED</span>
                </span>
              );
            })()}
          </div>

          {/* Credentials and Status Info */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Channel Access Token:</span>
              <span className="font-mono font-semibold">
                {lineStatus?.channelAccessTokenConfigured === 'configured' ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> configured
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> missing
                  </span>
                )}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Channel Secret:</span>
              <span className="font-mono font-semibold">
                {lineStatus?.channelSecretConfigured === 'configured' ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> configured
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> missing
                  </span>
                )}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Admin LINE recipient:</span>
              <span className="font-mono font-semibold">
                {lineStatus?.adminRecipientStatus === 'registered' ? (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3" /> registered ({lineStatus.maskedAdminUserId})
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> not registered (รอข้อความ test)
                  </span>
                )}
              </span>
            </div>

            {/* Webhook endpoint URL with Copy button */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Webhook endpoint:</span>
                <span className="text-[11px] text-slate-500 font-mono">POST /api/line/webhook</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={lineStatus?.webhookUrl || `${window.location.origin}/api/line/webhook`}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-mono text-cyan-300 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyWebhook}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                  title="คัดลอก URL"
                >
                  {copiedWebhook ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">คัดลอกแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>คัดลอก</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Setup Instructions */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="font-bold text-slate-300 text-xs mb-1">ขั้นตอนการตั้งค่า LINE Official Account:</div>
            <div>1. นำ Webhook endpoint ด้านบนไปวางใน LINE Developers Console &gt; Messaging API &gt; Webhook settings และเปิด "Use webhook"</div>
            <div>2. ระบุ <span className="font-mono text-cyan-300">LINE_CHANNEL_ACCESS_TOKEN</span> และ <span className="font-mono text-cyan-300">LINE_CHANNEL_SECRET</span> ใน AI Studio Secrets</div>
            <div>3. แอดไลน์ OA เป็นเพื่อน แล้วส่งข้อความ <span className="font-mono font-bold text-amber-300">"test"</span> เข้าแชท</div>
            <div>4. บอทจะตอบกลับอัตโนมัติ และระบบจะจำ Admin User ID เพื่อเปิดใช้งานสถานะ CONNECTED</div>
          </div>

          {/* Test Button - Only enabled after administrator userId has been registered */}
          <div>
            <button
              onClick={handleTestLine}
              disabled={testingLine || lineStatus?.adminRecipientStatus !== 'registered'}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
              title={
                lineStatus?.adminRecipientStatus !== 'registered'
                  ? 'จะเปิดใช้งานเมื่อผู้ดูแลระบบส่งข้อความ "test" เข้า LINE เพื่อผูกบัญชีแล้ว'
                  : 'ทดสอบส่งข้อความเข้า LINE ผู้ดูแลระบบ'
              }
            >
              <Send className={`h-4 w-4 ${testingLine ? 'animate-spin' : ''}`} />
              <span>{testingLine ? 'กำลังส่ง...' : 'ทดสอบส่ง LINE'}</span>
            </button>
            {lineStatus?.adminRecipientStatus !== 'registered' && (
              <p className="text-[11px] text-center text-slate-500 mt-1.5">
                (ปุ่มทดสอบจะเปิดใช้งานหลังผู้ดูแลระบบส่งข้อความ "test" เข้า LINE Official Account แล้ว)
              </p>
            )}
          </div>

          {lineResult && (
            <div
              className={`p-3 rounded-xl border text-xs ${
                lineResult.startsWith('✓')
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}
            >
              {lineResult}
            </div>
          )}
        </div>

        {/* Gemini AI Settings & Test */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h4 className="font-bold text-white text-sm">Google Gemini AI Engine</h4>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">โมเดลหลัก:</span>
              <span className="font-mono font-bold text-white">gemini-3.8-flash</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">โมเดลรูปภาพ:</span>
              <span className="font-mono text-white">gemini-3.1-flash-lite-image</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Gemini API Key:</span>
              <span className="font-mono text-emerald-400">
                {settings?.hasGeminiKey ? '•••••••••••••••• (ตั้งค่าแล้ว)' : 'โหมด Smart Template'}
              </span>
            </div>
          </div>

          <button
            onClick={handleTestGemini}
            disabled={testingGemini}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-2"
          >
            {testingGemini ? 'กำลังประมวลผลผ่าน Gemini...' : 'ทดสอบสั่งการ Gemini สร้าง Creative Brief'}
          </button>

          {geminiResult && (
            <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 text-xs text-slate-300">
              {geminiResult}
            </div>
          )}
        </div>

        {/* General Business Config */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-400" />
            <h4 className="font-bold text-white text-sm">ข้อมูลธุรกิจร้านขอนแก่น (KK Shop Taiwan)</h4>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">ชื่อแอปพลิเคชัน:</span>
              <span className="font-bold text-white">KK Shop Content Studio</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">สกุลเงินราคาสินค้า:</span>
              <span className="font-bold text-emerald-400">NT$ / TWD (ไต้หวัน)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">ไทม์โซนระบบ:</span>
              <span className="font-bold text-amber-300">Asia/Bangkok (UTC+7)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">ระยะเวลาวิเคราะห์ผล:</span>
              <span className="font-bold text-white">72 ชั่วโมงหลังโพสต์</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
