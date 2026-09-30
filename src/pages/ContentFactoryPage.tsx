import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Package,
  Layers,
  Image as ImageIcon,
  Video,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Eye,
  Send,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Product, Character, MediaAsset, ContentJob, ContentType } from '../types';
import { api } from '../services/api';

interface ContentFactoryPageProps {
  initialProduct?: Product | null;
  onNavigateToApproval: () => void;
}

export const ContentFactoryPage: React.FC<ContentFactoryPageProps> = ({
  initialProduct,
  onNavigateToApproval,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [availableMedia, setAvailableMedia] = useState<MediaAsset[]>([]);

  // Selection states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null);
  const [selectedContentType, setSelectedContentType] = useState<ContentType>('IMAGE_POST');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('CHAR-01');
  const [creativeStyle, setCreativeStyle] = useState<string>('อบอุ่นคิดถึงบ้าน รสชาติไทยแท้');
  const [marketingObjective, setMarketingObjective] = useState<string>('แนะนำสินค้าเข้าใหม่และกระตุ้นยอดสั่งซื้อส่งทั่วไต้หวัน');
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);

  // Execution states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedJob, setGeneratedJob] = useState<ContentJob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadPrerequisites();
  }, []);

  useEffect(() => {
    if (initialProduct) {
      setSelectedProduct(initialProduct);
    }
  }, [initialProduct]);

  useEffect(() => {
    if (selectedProduct) {
      api.getProductById(selectedProduct.id).then((res) => {
        setAvailableMedia(res.relatedMedia);
        setSelectedMediaIds(res.relatedMedia.map((m) => m.id));
      });
    }
  }, [selectedProduct]);

  const loadPrerequisites = async () => {
    try {
      const [prods, chars] = await Promise.all([
        api.getProducts(),
        api.getCharacters(),
      ]);
      setProducts(prods);
      setCharacters(chars);
      if (!selectedProduct && prods.length > 0) {
        setSelectedProduct(prods[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateJob = async () => {
    if (!selectedProduct) {
      setErrorMessage('กรุณาเลือกสินค้าจาก Product Master');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const job = await api.createContentJob({
        productId: selectedProduct.id,
        contentType: selectedContentType,
        creativeStyle,
        marketingObjective,
        characterId: selectedCharacterId || undefined,
        rawMediaIds: selectedMediaIds,
      });

      setGeneratedJob(job);
    } catch (err: any) {
      setErrorMessage(`เกิดข้อผิดพลาดในการสร้างคอนเทนต์: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const creativeStyles = [
    'อบอุ่นคิดถึงบ้าน รสชาติไทยแท้',
    'โปรโมชั่นสุดคุ้ม ซื้อตุนยามดึก',
    'สินค้าสดเข้าใหม่ บินตรงถึงไต้หวัน',
    'เมนูแซ่บสะท้านลิ้น สูตรเจ๊อ๋อยพาทำ',
    'เทียบรสชาติแท้ vs ของเลียนแบบในไต้หวัน',
  ];

  const objectives = [
    'แนะนำสินค้าเข้าใหม่และกระตุ้นยอดสั่งซื้อส่งทั่วไต้หวัน',
    'เน้นการทัก Inbox เพื่อปิดการขายรับที่ 7-11 / FamilyMart',
    'สร้างการรับรู้แบรนด์ร้านขอนแก่น (KK Shop) ในกลุ่มคนไทย',
    'กระตุ้นยอดขายสินค้าประจำที่คนไทยต้องมีติดห้อง',
  ];

  return (
    <div className="space-y-6">
      {/* Introduction Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">Content Factory (AI Studio)</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Gemini Creative Brief
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            ระบุความต้องการเพื่อสั่งการให้ AI วิเคราะห์ข้อมูลสินค้า, ราคา NTD, และผลิตโฆษณาพร้อมส่งเข้าศูนย์รอตรวจ
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Parameter Selectors */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              1. เลือกสินค้า & วัตถุดิบ (Product Master)
            </h4>

            {/* Select Product */}
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                เลือกสินค้าจากฐานข้อมูล *
              </label>
              <select
                value={selectedProduct?.id || ''}
                onChange={(e) => {
                  const p = products.find((prod) => prod.id === e.target.value);
                  if (p) setSelectedProduct(p);
                }}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — NT$ {p.priceNTD} ({p.category})
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>รหัส / SKU:</span>
                  <span className="font-mono text-slate-200">{selectedProduct.id} / {selectedProduct.sku}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ราคาทางการ:</span>
                  <span className="font-mono font-bold text-emerald-400">NT$ {selectedProduct.priceNTD}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>หมวดหมู่:</span>
                  <span className="text-amber-400">{selectedProduct.category}</span>
                </div>
              </div>
            )}

            {/* Select Content Type */}
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                2. ประเภทคอนเทนต์ (Content Type) *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'IMAGE_POST', label: 'Image Post', icon: ImageIcon, desc: 'รูปแอด 1:1' },
                  { id: 'REEL', label: 'Reel (9:16)', icon: Video, desc: 'คลิปสั้น 10 วิ' },
                  { id: 'VIDEO_POST', label: 'Video Post', icon: Video, desc: 'วิดีโอโพสต์' },
                ].map((t) => {
                  const Icon = t.icon;
                  const isSel = selectedContentType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedContentType(t.id as ContentType)}
                      className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                        isSel
                          ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs">{t.label}</span>
                      <span className={`text-[10px] ${isSel ? 'text-slate-900/80' : 'text-slate-500'}`}>
                        {t.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Select Character */}
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1.5 flex items-center justify-between">
                <span>3. ตัวละครประจำร้าน (Character)</span>
                <span className="text-[10px] text-amber-400">ใช้กฎตัวตนตายตัว</span>
              </label>
              <select
                value={selectedCharacterId}
                onChange={(e) => setSelectedCharacterId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.role})
                  </option>
                ))}
                <option value="">ไม่ใช้ตัวละคร (นำเสนอสินค้าเพียวๆ)</option>
              </select>
            </div>

            {/* Creative Style */}
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                4. สไตล์ความคิดสร้างสรรค์ (Creative Style)
              </label>
              <select
                value={creativeStyle}
                onChange={(e) => setCreativeStyle(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                {creativeStyles.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Marketing Objective */}
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                5. วัตถุประสงค์ทางการตลาด
              </label>
              <select
                value={marketingObjective}
                onChange={(e) => setMarketingObjective(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                {objectives.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Generate Action Button */}
            <button
              onClick={handleCreateJob}
              disabled={isGenerating}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition active:scale-98"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Gemini กำลังวางแผนและสร้างคอนเทนต์...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>เริ่มผลิตคอนเทนต์ AI (Generate)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column (7 cols): Result Preview & Brief Card */}
        <div className="lg:col-span-7 space-y-4">
          {!generatedJob ? (
            <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center flex flex-col items-center justify-center min-h-[480px]">
              <div className="h-16 w-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 mb-4">
                <Layers className="h-8 w-8" />
              </div>
              <h4 className="text-base font-bold text-slate-300">
                พร้อมเริ่มกระบวนการผลิตคอนเทนต์
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                เลือกสินค้าทางด้านซ้ายแล้วกดปุ่ม "เริ่มผลิตคอนเทนต์ AI" ระบบจะสร้าง Creative Brief แคปชั่นภาษาไทย และอาร์ตเวิร์คโฆษณาให้ทันที
              </p>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-2xl">
              {/* Header result */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <div>
                    <h4 className="text-base font-bold text-white">
                      สร้างผลงานสำเร็จ (CONTENT_ID: {generatedJob.id})
                    </h4>
                    <p className="text-xs text-amber-400">สถานะ: รอตรวจอนุมัติ (WAITING_APPROVAL)</p>
                  </div>
                </div>

                <button
                  onClick={onNavigateToApproval}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition"
                >
                  <span>ไปหน้าตรวจอนุมัติ</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Media Preview + Brief */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 relative group aspect-square">
                  <img
                    src={generatedJob.generatedImageUrl}
                    alt={generatedJob.productName}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 right-2 p-2 rounded-xl bg-slate-950/80 backdrop-blur border border-slate-800 text-xs">
                    <span className="font-bold text-white block truncate">{generatedJob.productName}</span>
                    <span className="font-mono text-emerald-400 font-bold">NT$ {generatedJob.priceNTD}</span>
                  </div>
                </div>

                {/* Structured Creative Brief */}
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-amber-400 block">พาดหัว (Headline)</span>
                    <p className="font-bold text-white mt-0.5">{generatedJob.creativeBrief?.headline}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">จุดขายเด่น (Selling Point)</span>
                    <p className="text-slate-300 mt-0.5">{generatedJob.creativeBrief?.mainSellingPoint}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">กลุ่มเป้าหมาย (Target)</span>
                    <p className="text-slate-300 mt-0.5">{generatedJob.creativeBrief?.targetAudience}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-cyan-400 block">Call to Action (CTA)</span>
                    <p className="text-cyan-300 font-medium mt-0.5">{generatedJob.creativeBrief?.cta}</p>
                  </div>
                </div>
              </div>

              {/* Generated Caption */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">
                  แคปชั่นสำหรับ Facebook (Spoken in Thai):
                </span>
                <p className="text-slate-200 whitespace-pre-line leading-relaxed font-sans">
                  {generatedJob.caption}
                </p>
                <div className="pt-2 flex flex-wrap gap-1 border-t border-slate-900">
                  {generatedJob.hashtags.map((h, i) => (
                    <span key={i} className="text-cyan-400 font-medium">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
