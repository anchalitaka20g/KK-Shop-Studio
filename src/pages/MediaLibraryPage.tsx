import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  Folder,
  FileImage,
  FileVideo,
  UploadCloud,
  ExternalLink,
  ShieldCheck,
  Search,
  HardDrive,
  Copy,
  Check,
  RefreshCw,
  Link,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  X,
  Layers,
} from 'lucide-react';
import { DriveFolderInfo, MediaAsset, Product, DriveSyncResult, MediaMatchStatus } from '../types';
import { api } from '../services/api';
import { signInWithGoogleDrive, getCachedDriveToken } from '../services/driveAuth';

export const MediaLibraryPage: React.FC = () => {
  const [folders, setFolders] = useState<DriveFolderInfo[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('01_RAW/01_PRODUCT_IMAGES');
  const [matchFilter, setMatchFilter] = useState<'ALL' | MediaMatchStatus>('ALL');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Drive Scanning state
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<DriveSyncResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Assign Product Modal state
  const [assigningAsset, setAssigningAsset] = useState<MediaAsset | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  useEffect(() => {
    loadMedia(selectedFolder);
    loadProducts();
  }, [selectedFolder]);

  const loadMedia = async (folder?: string) => {
    setLoading(true);
    try {
      const data = await api.getMedia(folder);
      setFolders(data.folders);
      setAssets(data.assets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const prods = await api.getProducts();
      setProducts(prods);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleScanMedia = async () => {
    setScanning(true);
    setScanError(null);
    setScanResult(null);
    try {
      const res = await api.scanDriveMedia();
      setScanResult(res);
      await loadMedia(selectedFolder);
      await loadProducts();
    } catch (err: any) {
      if (err.message?.includes('จำเป็นต้องเชื่อมต่อ Google Drive')) {
        try {
          await signInWithGoogleDrive();
          const retryRes = await api.scanDriveMedia();
          setScanResult(retryRes);
          await loadMedia(selectedFolder);
        } catch (innerErr: any) {
          setScanError(innerErr.message || 'การเชื่อมต่อ Google Drive ล้มเหลว');
        }
      } else {
        setScanError(err.message || 'ไม่สามารถสแกนโฟลเดอร์ Google Drive ได้');
      }
    } finally {
      setScanning(false);
    }
  };

  const handleOpenAssign = (asset: MediaAsset) => {
    setAssigningAsset(asset);
    setSelectedProductId(asset.productId || '');
  };

  const handleSaveAssign = async () => {
    if (!assigningAsset) return;
    try {
      await api.assignProductToMedia(assigningAsset.id, selectedProductId || undefined, 'MANUAL');
      setAssigningAsset(null);
      await loadMedia(selectedFolder);
    } catch (err: any) {
      console.error(`บันทึกการจับคู่ไม่สำเร็จ: ${err.message}`);
    }
  };

  const filteredAssets = assets.filter(a => {
    if (matchFilter === 'ALL') return true;
    return a.matchStatus === matchFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-cyan-400" />
            <h3 className="font-bold text-white text-base">
              Google Drive Media Library
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              Authenticated Proxy
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            อ่านและแคชเมตาดาตาจากโฟลเดอร์ Google Drive (01_RAW ถึง 04_POSTED_ARCHIVE) พร้อมจับคู่สินค้าจริงอัตโนมัติ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleScanMedia}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'กำลังสแกน Drive...' : 'สแกน Google Drive Media'}</span>
          </button>
        </div>
      </div>

      {/* Scan Result Feedback */}
      {scanResult && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>สแกนโฟลเดอร์มีเดียเรียบร้อย (พบ {scanResult.totalFilesFound} ไฟล์)</span>
            </div>
            <button
              onClick={() => setScanResult(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-4 text-[11px] text-slate-300 pt-1">
            <span>✓ แมปตรงสินค้า: <strong className="text-emerald-400 font-mono">{scanResult.matchedCount}</strong></span>
            <span>⚠️ รอตรวจสอบ: <strong className="text-amber-400 font-mono">{scanResult.reviewRequiredCount}</strong></span>
            <span>⚪ ยังไม่จับคู่: <strong className="text-slate-400 font-mono">{scanResult.unmatchedCount}</strong></span>
          </div>
        </div>
      )}

      {scanError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span>{scanError}</span>
          <button onClick={() => setScanError(null)} className="text-rose-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Folder Tree */}
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            โครงสร้างโฟลเดอร์ Drive
          </div>
          {folders.map((f) => {
            const isSelected = selectedFolder === f.path;
            return (
              <button
                key={f.path}
                onClick={() => setSelectedFolder(f.path)}
                className={`w-full p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-lg shadow-amber-500/20'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Folder className={`h-4 w-4 ${isSelected ? 'text-slate-950' : 'text-amber-400'}`} />
                    <span className="text-xs font-bold leading-tight">{f.nameThai}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isSelected ? 'bg-slate-950 text-amber-400' : 'bg-slate-950 text-slate-400'
                    }`}
                  >
                    {f.fileCount}
                  </span>
                </div>
                <div className={`text-[10px] mt-1.5 truncate ${isSelected ? 'text-slate-900/80 font-medium' : 'text-slate-500'}`}>
                  {f.description}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Files Grid */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h4 className="font-bold text-white text-sm">
              ไฟล์ในโฟลเดอร์ ({filteredAssets.length} รายการ)
            </h4>

            {/* Match Status Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
              {(['ALL', 'MATCHED', 'MATCH_REVIEW_REQUIRED', 'UNMATCHED'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setMatchFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition whitespace-nowrap ${
                    matchFilter === tab
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {tab === 'ALL' && 'ทั้งหมด'}
                  {tab === 'MATCHED' && '✓ แมปตรงสินค้า'}
                  {tab === 'MATCH_REVIEW_REQUIRED' && '⚠️ รอตรวจสอบ'}
                  {tab === 'UNMATCHED' && '⚪ ยังไม่แมป'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              กำลังโหลดไฟล์จาก Drive...
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <FolderKanban className="h-10 w-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">ไม่มีไฟล์ในหมวดนี้</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                กดปุ่ม "สแกน Google Drive Media" เพื่อให้ระบบอ่านไฟล์จริงจากโฟลเดอร์ Google Drive
              </p>
              <button
                onClick={handleScanMedia}
                disabled={scanning}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>สแกน Drive ทันที</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between group shadow-lg"
                >
                  <div className="relative aspect-square rounded-xl bg-slate-950 overflow-hidden border border-slate-800 mb-2 flex items-center justify-center">
                    <img
                      src={asset.thumbnailUrl || asset.previewUrl}
                      alt={asset.name}
                      onError={(e) => {
                        // Fallback on preview error
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                      className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950/80 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                        {asset.type === 'VIDEO' ? <FileVideo className="h-3 w-3" /> : <FileImage className="h-3 w-3" />}
                        {asset.type}
                      </span>
                    </div>

                    {/* Match Badge Overlay */}
                    <div className="absolute top-2 right-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                          asset.matchStatus === 'MATCHED'
                            ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/40'
                            : asset.matchStatus === 'MATCH_REVIEW_REQUIRED'
                            ? 'bg-amber-950/90 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-950/80 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {asset.matchStatus === 'MATCHED' ? '✓ MATCHED' : asset.matchStatus === 'MATCH_REVIEW_REQUIRED' ? '⚠️ REVIEW' : 'UNMATCHED'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-bold text-white text-xs truncate" title={asset.name}>
                      {asset.name}
                    </h5>

                    {/* Product Matching Info */}
                    <div className="mt-1.5 p-2 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">สินค้า:</span>
                        <span className="font-medium text-white truncate max-w-[140px]" title={asset.productName || 'ยังไม่ระบุ'}>
                          {asset.productName || 'ยังไม่จับคู่'}
                        </span>
                      </div>
                      {asset.matchMethod && (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500">วิธีจับคู่:</span>
                          <span className="font-mono text-cyan-400">[{asset.matchMethod}]</span>
                        </div>
                      )}
                      <button
                        onClick={() => handleOpenAssign(asset)}
                        className="w-full mt-1 py-1 rounded bg-slate-900 hover:bg-slate-800 text-[11px] text-cyan-300 font-semibold border border-slate-700 transition"
                      >
                        {asset.productId ? 'เปลี่ยน/ยืนยันสินค้า' : 'จับคู่สินค้า'}
                      </button>
                    </div>

                    <div className="mt-2 p-1.5 rounded-lg bg-slate-950/50 flex items-center justify-between text-[10px]">
                      <span className="font-mono text-slate-500 truncate max-w-[130px]">
                        ID: {asset.driveFileId}
                      </span>
                      <button
                        onClick={() => handleCopyId(asset.driveFileId)}
                        className="p-1 text-slate-400 hover:text-amber-400 transition"
                        title="คัดลอก Drive File ID"
                      >
                        {copiedId === asset.driveFileId ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Manual Product Assignment Modal */}
      {assigningAsset && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">จับคู่มีเดียกับสินค้า</h3>
              <button onClick={() => setAssigningAsset(null)} className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">ชื่อไฟล์มีเดีย:</label>
                <p className="font-mono font-bold text-white truncate">{assigningAsset.name}</p>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">เลือกสินค้าในระบบ Master:</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                >
                  <option value="">(ไม่ระบุ / ลบการจับคู่)</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) - NT$ {p.priceNTD}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setAssigningAsset(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveAssign}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
              >
                บันทึกการจับคู่
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
