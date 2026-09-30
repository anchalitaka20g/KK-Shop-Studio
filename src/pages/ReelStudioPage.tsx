import React, { useState, useEffect } from 'react';
import {
  Video,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Play,
  Volume2,
  Clock,
  Film,
  Camera,
  Layers,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Product, Character, ReelStoryboard, ContentJob } from '../types';
import { api } from '../services/api';

export const ReelStudioPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('CHAR-01');
  const [isGenerating, setIsGenerating] = useState(false);
  const [storyboard, setStoryboard] = useState<ReelStoryboard | null>(null);
  const [createdJob, setCreatedJob] = useState<ContentJob | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [activeSceneTab, setActiveSceneTab] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prods, chars] = await Promise.all([
        api.getProducts(),
        api.getCharacters(),
      ]);
      setProducts(prods);
      setCharacters(chars);
      if (prods.length > 0) setSelectedProduct(prods[2] || prods[0]); // default to หมูยอ or first product
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateReel = async () => {
    if (!selectedProduct) return;
    setIsGenerating(true);

    try {
      const job = await api.createContentJob({
        productId: selectedProduct.id,
        contentType: 'REEL',
        creativeStyle: 'Reel 9:16 สั้นกระชับ 10 วินาที ASMR เสียงหั่นเนื้อเด้ง',
        marketingObjective: 'สร้างยอดวิว Reels และชวนทัก Inbox สั่งซื้อส่งทั่วไต้หวัน',
        characterId: selectedCharacterId || undefined,
        rawMediaIds: selectedProduct.rawMediaIds,
      });

      setCreatedJob(job);
      if (job.reelStoryboard) {
        setStoryboard(job.reelStoryboard);
      }
    } catch (err: any) {
      console.error(`สร้าง Reel ไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyGoogleFlow = () => {
    if (!storyboard) return;
    navigator.clipboard.writeText(storyboard.googleFlowPrompt || storyboard.finalVeoPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-cyan-400" />
            <h3 className="font-bold text-white text-base">Reel Studio (Facebook Reels 9:16)</h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              Max 10s • Thai Dialogue Only
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            ออกแบบวิดีโอแนวตั้ง 9:16 สปีดเร็ว ฮุคแรงใน 2 วินาทีแรก บทพูดภาษาไทยล้วน พร้อม Workflow เชื่อมต่อไปยัง Google Flow
          </p>
        </div>

        {storyboard && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyGoogleFlow}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg transition active:scale-95"
            >
              {copiedPrompt ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
              <span>{copiedPrompt ? 'คัดลอกแล้ว!' : 'คัดลอก Prompt สำหรับ Google Flow'}</span>
            </button>

            <a
              href="https://aistudio.google.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              <span>เปิดสตูดิโอสร้างวิดีโอ</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols): Product & Configuration */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              ตั้งค่าการผลิต Reel
            </h4>

            {/* Select Product */}
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                เลือกสินค้าที่จะทำ Reel *
              </label>
              <select
                value={selectedProduct?.id || ''}
                onChange={(e) => {
                  const p = products.find((x) => x.id === e.target.value);
                  if (p) setSelectedProduct(p);
                }}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — NT$ {p.priceNTD}
                  </option>
                ))}
              </select>
            </div>

            {/* Select Character */}
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                ตัวละครผู้ดำเนินเรื่อง (Host)
              </label>
              <select
                value={selectedCharacterId}
                onChange={(e) => setSelectedCharacterId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.voiceRules})
                  </option>
                ))}
              </select>
            </div>

            {/* Constraints Checklist */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-slate-300 block">เกณฑ์มาตรฐาน Reel ของ KK Shop:</span>
              <div className="flex items-center gap-2 text-slate-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>อัตราส่วน 9:16 ความละเอียด 720p+</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>ความยาวสูงสุดไม่เกิน 10 วินาที</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-amber-300 font-medium">บทพูดภาษาไทยล้วน (THAI ONLY)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>ระบุราคา NT$ จาก Master เสมอ</span>
              </div>
            </div>

            <button
              onClick={handleGenerateReel}
              disabled={isGenerating || !selectedProduct}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-2 transition active:scale-98"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  <span>Gemini กำลังร่าง Storyboard...</span>
                </>
              ) : (
                <>
                  <Film className="h-4 w-4" />
                  <span>สร้าง Storyboard & Prompt Veo</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column (8 cols): Storyboard Preview & 9:16 Device Mockup */}
        <div className="lg:col-span-8 space-y-4">
          {!storyboard ? (
            <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center flex flex-col items-center justify-center min-h-[460px]">
              <Film className="h-12 w-12 text-slate-600 mb-3" />
              <h4 className="text-base font-bold text-slate-300">
                พร้อมสร้าง Storyboard วิดีโอสั้น 9:16
              </h4>
              <p className="text-xs text-slate-500 max-w-md mt-1">
                คลิกปุ่มสร้างทางซ้าย เพื่อให้ Gemini วางโครงสร้าง 3 ซีน (0-3s, 3-7s, 7-10s) พร้อมบทพูดไทยคำต่อคำ และคำสั่งกล้องอย่างละเอียด
              </p>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 shadow-2xl">
              {/* Hook Banner */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <span className="text-[10px] uppercase font-bold text-amber-400 block mb-1">
                  🔥 Hook ดึงดูดสายตา 2 วินาทีแรก (Hook Concept):
                </span>
                <p className="text-sm font-bold text-white">"{storyboard.hook}"</p>
                <p className="text-xs text-slate-400 mt-1">
                  แนวเรื่อง: {storyboard.storyConcept} (ความยาว: {storyboard.durationSeconds} วินาที)
                </p>
              </div>

              {/* Scene Breakdown Tabs */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  {storyboard.scenes.map((scene, i) => (
                    <button
                      key={scene.sceneNumber}
                      onClick={() => setActiveSceneTab(i)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                        activeSceneTab === i
                          ? 'bg-cyan-500 text-slate-950 shadow-md'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <span>ซีน {scene.sceneNumber}</span>
                      <span className="text-[10px] font-mono opacity-80">({scene.timeRange})</span>
                    </button>
                  ))}
                </div>

                {/* Active Scene Card */}
                {storyboard.scenes[activeSceneTab] && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-cyan-400">
                        ซีนที่ {storyboard.scenes[activeSceneTab].sceneNumber} (ระยะเวลา:{' '}
                        {storyboard.scenes[activeSceneTab].durationSeconds} วินาที)
                      </span>
                      <span className="font-mono text-slate-400">
                        {storyboard.scenes[activeSceneTab].timeRange}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 font-bold block mb-1">
                          🗣️ บทพูดภาษาไทย (THAI DIALOGUE):
                        </span>
                        <p className="text-white font-medium text-sm leading-relaxed">
                          "{storyboard.scenes[activeSceneTab].thaiDialogue}"
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 font-bold block mb-1">
                          🎬 การกระทำของตัวละคร (Action):
                        </span>
                        <p className="text-slate-300">
                          {storyboard.scenes[activeSceneTab].characterAction}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 font-bold block mb-1">
                          📹 คำแนะนำกล้อง (Camera Instruction):
                        </span>
                        <p className="text-slate-300">
                          {storyboard.scenes[activeSceneTab].cameraInstruction}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 font-bold block mb-1">
                          🔊 เสียงเอฟเฟกต์ & เพลง (Sound & BGM):
                        </span>
                        <p className="text-slate-300">
                          {storyboard.scenes[activeSceneTab].soundInstruction} • {storyboard.scenes[activeSceneTab].bgmInstruction}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px]">
                      <span className="text-slate-400 font-bold block mb-0.5">
                        🖼️ Visual Prompt (สำหรับโมเดลภาพ/วิดีโอ):
                      </span>
                      <p className="text-slate-400 font-mono">
                        {storyboard.scenes[activeSceneTab].visualPrompt}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Google Flow Prompt Section */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Prompt สำหรับ Google Flow / Veo 3.1
                  </span>
                  <button
                    onClick={handleCopyGoogleFlow}
                    className="flex items-center gap-1.5 text-xs text-indigo-300 hover:text-white font-semibold"
                  >
                    {copiedPrompt ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedPrompt ? 'คัดลอกสำเร็จ' : 'คัดลอก Prompt'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-lg bg-slate-900 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-36">
                  {storyboard.googleFlowPrompt}
                </pre>
              </div>

              {/* Footer status */}
              <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
                <span>
                  สร้าง Content ID: <span className="font-mono text-slate-200">{createdJob?.id}</span>
                </span>
                <span className="text-emerald-400 font-semibold">
                  ✓ ส่งเข้าคิวรอตรวจ (Approval Center) เรียบร้อย
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
