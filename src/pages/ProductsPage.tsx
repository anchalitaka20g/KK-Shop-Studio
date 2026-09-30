import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Plus,
  UploadCloud,
  Filter,
  CheckCircle,
  FileSpreadsheet,
  X,
  ExternalLink,
  Sparkles,
  Thermometer,
  Layers,
  DollarSign,
  Tag,
  Image as ImageIcon,
  HardDrive,
  RefreshCw,
  AlertTriangle,
  Database,
  CheckCircle2,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { Product, MediaAsset, ProductImportPreview, ProductSyncResult } from '../types';
import { api } from '../services/api';
import { signInWithGoogleDrive, getCachedDriveToken } from '../services/driveAuth';

interface ProductsPageProps {
  onSelectForContent: (product: Product) => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({ onSelectForContent }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  
  // Real Google Drive Product Master Sync state
  const [showDriveSyncModal, setShowDriveSyncModal] = useState(false);
  const [driveSyncLoading, setDriveSyncLoading] = useState(false);
  const [drivePreview, setDrivePreview] = useState<ProductImportPreview | null>(null);
  const [driveMapping, setDriveMapping] = useState<Record<string, string>>({});
  const [driveSyncResult, setDriveSyncResult] = useState<ProductSyncResult | null>(null);
  const [driveSyncError, setDriveSyncError] = useState<string | null>(null);
  const [needsDriveAuth, setNeedsDriveAuth] = useState(false);
  const [catalogStatus, setCatalogStatus] = useState<{
    sourceFileId: string;
    totalProducts: number;
    syncedProductsCount: number;
    lastSyncedAt: string | null;
  } | null>(null);

  // Detail modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productMedia, setProductMedia] = useState<MediaAsset[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // New product modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    priceNTD: 100,
    unit: 'ชิ้น',
    size: '',
    category: 'เครื่องปรุงรส',
    cost: 60,
    temperatureType: 'NORMAL' as 'NORMAL' | 'CHILLED' | 'FROZEN',
    aliases: '',
    origin: 'ประเทศไทย',
    description: '',
  });

  // CSV Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState({
    name: 'name',
    priceNTD: 'price',
    sku: 'sku',
    category: 'category',
    size: 'size',
    unit: 'unit',
  });
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
    loadCatalogStatus();
  }, [searchQuery, selectedCategory]);

  const loadCatalogStatus = async () => {
    try {
      const status = await api.getDriveProductMasterStatus();
      setCatalogStatus(status);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenDriveSync = async () => {
    setShowDriveSyncModal(true);
    setDriveSyncError(null);
    setDriveSyncResult(null);
    setDriveSyncLoading(true);
    setNeedsDriveAuth(false);

    try {
      const preview = await api.previewDriveProductMaster();
      setDrivePreview(preview);
      setDriveMapping(preview.suggestedMapping || {});
    } catch (err: any) {
      if (err.message?.includes('จำเป็นต้องเชื่อมต่อ Google Drive') || err.message?.includes('สิทธิ์ Google Drive')) {
        setNeedsDriveAuth(true);
      } else {
        setDriveSyncError(err.message || 'ไม่สามารถเปิดไฟล์ Product Master จาก Google Drive ได้');
      }
    } finally {
      setDriveSyncLoading(false);
    }
  };

  const handleConnectDriveInModal = async () => {
    setDriveSyncLoading(true);
    setDriveSyncError(null);
    try {
      await signInWithGoogleDrive();
      setNeedsDriveAuth(false);
      // Retry preview
      const preview = await api.previewDriveProductMaster();
      setDrivePreview(preview);
      setDriveMapping(preview.suggestedMapping || {});
    } catch (err: any) {
      setDriveSyncError(`การเชื่อมต่อ Google Drive ล้มเหลว: ${err.message}`);
    } finally {
      setDriveSyncLoading(false);
    }
  };

  const handleCommitDriveImport = async () => {
    if (!driveMapping.PRODUCT_NAME) {
      setDriveSyncError('กรุณาเลือกคอลัมน์ชื่อสินค้า (PRODUCT_NAME) ซึ่งเป็นฟิลด์บังคับ');
      return;
    }

    setDriveSyncError('ระบบอยู่ในขั้นตอนตรวจสอบโครงสร้าง Column Mapping (ยังไม่อนุญาตให้นำเข้าตามคำสั่ง)');
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getProducts(searchQuery, selectedCategory);
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (prod: Product) => {
    setSelectedProduct(prod);
    setLoadingDetails(true);
    try {
      const res = await api.getProductById(prod.id);
      setProductMedia(res.relatedMedia);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveProduct({
        ...formData,
        priceNTD: Number(formData.priceNTD),
        cost: Number(formData.cost),
        aliases: formData.aliases.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setShowAddModal(false);
      loadProducts();
    } catch (err: any) {
      console.error(`บันทึกสินค้าไม่สำเร็จ: ${err.message}`);
    }
  };

  // CSV parsing logic
  const handleParseCsv = (text: string) => {
    setCsvRawText(text);
    const lines = text.trim().split('\n');
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    setCsvColumns(headers);

    // Auto guess column mapping
    const mapping: any = { ...columnMapping };
    headers.forEach((h) => {
      const lower = h.toLowerCase();
      if (lower.includes('name') || lower.includes('ชื่อ')) mapping.name = h;
      if (lower.includes('price') || lower.includes('ราคา') || lower.includes('ntd')) mapping.priceNTD = h;
      if (lower.includes('sku') || lower.includes('รหัส')) mapping.sku = h;
      if (lower.includes('category') || lower.includes('หมวด')) mapping.category = h;
      if (lower.includes('size') || lower.includes('ขนาด')) mapping.size = h;
      if (lower.includes('unit') || lower.includes('หน่วย')) mapping.unit = h;
    });
    setColumnMapping(mapping);

    const rows = lines.slice(1, 11).map((line) => {
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const obj: any = {};
      headers.forEach((h, i) => {
        obj[h] = values[i] || '';
      });
      return obj;
    });
    setParsedRows(rows);
  };

  const handleExecuteImport = async () => {
    const lines = csvRawText.trim().split('\n');
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const allItems = lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: any = {};
      headers.forEach((h, i) => {
        row[h] = values[i] || '';
      });

      return {
        name: row[columnMapping.name] || '',
        priceNTD: parseFloat(row[columnMapping.priceNTD]) || 0,
        sku: row[columnMapping.sku] || `SKU-${Date.now()}`,
        category: row[columnMapping.category] || 'สินค้าทั่วไป',
        size: row[columnMapping.size] || '',
        unit: row[columnMapping.unit] || 'ชิ้น',
      };
    });

    try {
      setImportStatus('กำลังนำเข้า...');
      const res = await api.importProductsCSV(allItems);
      setImportStatus(`นำเข้าสำเร็จ! เพิ่มใหม่ ${res.added} รายการ, อัปเดต ${res.updated} รายการ`);
      setTimeout(() => {
        setShowImportModal(false);
        setImportStatus(null);
        setCsvRawText('');
        loadProducts();
      }, 1500);
    } catch (err: any) {
      setImportStatus(`ข้อผิดพลาด: ${err.message}`);
    }
  };

  const categories = [
    'ALL',
    'เครื่องปรุงรส',
    'น้ำพริก/ปลาร้า',
    'อาหารสำเร็จรูป',
    'ของสดแช่เย็น',
    'สินค้าแช่แข็ง',
    'เครื่องดื่ม',
    'ขนมไทย',
  ];

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาด้วยชื่อสินค้า, รหัส, SKU, หรือชื่อเล่น/Alias..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <Filter className="h-4 w-4 text-slate-500 shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat === 'ALL' ? 'ทั้งหมด' : cat}
            </button>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenDriveSync}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 transition"
          >
            <HardDrive className="h-4 w-4" />
            <span>ซิงก์ Product Master</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>เพิ่มสินค้าใหม่</span>
          </button>
        </div>
      </div>

      {/* Catalog Provenance Banner */}
      {catalogStatus && (
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Database className="h-4 w-4 text-cyan-400" />
            <span>แหล่งข้อมูล Product Master:</span>
            <span className="font-mono text-cyan-300 font-semibold">{catalogStatus.sourceFileId}</span>
            <span className="text-slate-500">|</span>
            <span>สินค้าทั้งหมด:</span>
            <span className="font-bold text-white">{catalogStatus.totalProducts} รายการ</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span>ซิงก์ล่าสุด:</span>
            <span className="font-medium text-amber-300">
              {catalogStatus.lastSyncedAt
                ? new Date(catalogStatus.lastSyncedAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) + ' น.'
                : 'ยังไม่เคยซิงก์ (Zero Records)'}
            </span>
            <button
              onClick={handleOpenDriveSync}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold ml-2"
            >
              <RefreshCw className="h-3 w-3" />
              <span>ซิงก์ใหม่</span>
            </button>
          </div>
        </div>
      )}

      {/* Product Grid / Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          กำลังค้นหาสินค้า...
        </div>
      ) : products.length === 0 ? (
        <div className="p-16 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <HardDrive className="h-8 w-8 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white">ยังไม่มีสินค้าจริงในระบบ (Zero Records)</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              ระบบทำงานในโหมดข้อมูลจริง ไม่แสดงข้อมูลจำลอง กดปุ่มด้านล่างเพื่อเชื่อมต่อและดึงข้อมูลจาก Google Drive Product Master (ไฟล์ ID: 1-j7OrP1Z0y1rVjYk2fswuW3-3BC_8OpH)
            </p>
          </div>
          <button
            onClick={handleOpenDriveSync}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition"
          >
            <RefreshCw className="h-4 w-4" />
            <span>ซิงก์ Product Master (Google Drive)</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((p) => {
            const tempBadge =
              p.temperatureType === 'FROZEN'
                ? { label: 'แช่แข็ง', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' }
                : p.temperatureType === 'CHILLED'
                ? { label: 'แช่เย็น', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' }
                : { label: 'อุณหภูมิปกติ', color: 'bg-slate-800 text-slate-400 border-slate-700' };

            return (
              <div
                key={p.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition group flex flex-col justify-between shadow-lg"
              >
                <div>
                  {/* Category & Temperature */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[11px] font-medium text-amber-400/90 truncate">
                      {p.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${tempBadge.color}`}>
                      {tempBadge.label}
                    </span>
                  </div>

                  {/* Title & SKU */}
                  <h3 className="font-bold text-white text-sm line-clamp-2 group-hover:text-amber-300 transition">
                    {p.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                    <span>{p.sku}</span>
                    <span>•</span>
                    <span>{p.size || p.unit}</span>
                  </div>

                  {/* Aliases */}
                  {p.aliases && p.aliases.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.aliases.slice(0, 2).map((a, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400">
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Price & Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      ราคาจำหน่าย
                    </span>
                    <span className="text-lg font-black text-emerald-400 font-mono">
                      NT$ {p.priceNTD}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenDetail(p)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                      title="ดูรายละเอียดสินค้าและมีเดีย"
                    >
                      มีเดีย
                    </button>
                    <button
                      onClick={() => onSelectForContent(p)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition active:scale-95"
                      title="นำสินค้านี้ไปสร้างคอนเทนต์ใน Content Factory"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>สร้างแอด</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold text-amber-400">{selectedProduct.category}</span>
                <h3 className="text-lg font-bold text-white mt-0.5">{selectedProduct.name}</h3>
                <p className="text-xs font-mono text-slate-400">
                  ID: {selectedProduct.id} | SKU: {selectedProduct.sku}
                </p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Info Badges */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">ราคาขาย NTD</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  NT$ {selectedProduct.priceNTD}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">ขนาด/หน่วย</span>
                <span className="text-sm font-bold text-slate-200">
                  {selectedProduct.size} ({selectedProduct.unit})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">ยอดขายสะสม</span>
                <span className="text-sm font-bold text-amber-400">
                  {selectedProduct.quantitySold} {selectedProduct.unit}
                </span>
              </div>
            </div>

            {/* Description */}
            {selectedProduct.description && (
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300">
                <span className="font-bold text-amber-400 block mb-1">จุดเด่น/คำอธิบาย:</span>
                {selectedProduct.description}
              </div>
            )}

            {/* Associated Raw Media from Google Drive */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-cyan-400" />
                <span>ไฟล์มีเดียใน Google Drive ({productMedia.length})</span>
              </h4>

              {loadingDetails ? (
                <p className="text-xs text-slate-500 py-4 text-center">กำลังโหลดมีเดีย...</p>
              ) : productMedia.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500">
                  ยังไม่มีรูปหรือวิดีโอดิบสำหรับสินค้านี้ใน Drive (ระบบจะใช้รูปสแตนดาร์ดของร้าน)
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {productMedia.map((m) => (
                    <div key={m.id} className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 group relative">
                      <img src={m.previewUrl} alt={m.name} className="h-28 w-full object-cover" />
                      <div className="p-1.5 text-[10px] bg-slate-900 border-t border-slate-800 truncate text-slate-300">
                        {m.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                ปิดหน้าต่าง
              </button>
              <button
                onClick={() => {
                  const p = selectedProduct;
                  setSelectedProduct(null);
                  onSelectForContent(p);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5"
              >
                <Sparkles className="h-4 w-4" />
                <span>นำไปสร้าง Content ทันที</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real Google Drive Product Master Sync Modal */}
      {showDriveSyncModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <HardDrive className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    ซิงก์ Product Master (Google Drive)
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    ไฟล์จริง ID: 1-j7OrP1Z0y1rVjYk2fswuW3-3BC_8OpH (Google Drive CSV Pipeline)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDriveSyncModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Need Auth State */}
            {needsDriveAuth && (
              <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center space-y-4">
                <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-white">จำเป็นต้องเชื่อมต่อ Google Drive</h4>
                  <p className="text-xs text-slate-300 max-w-md mx-auto mt-1">
                    กรุณายืนยันสิทธิ์บัญชี Google ของร้านขอนแก่น เพื่อให้ระบบสามารถดาวน์โหลดไฟล์ Product Master CSV ได้อย่างปลอดภัย
                  </p>
                </div>
                <button
                  onClick={handleConnectDriveInModal}
                  disabled={driveSyncLoading}
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold shadow-lg transition inline-flex items-center gap-2"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{driveSyncLoading ? 'กำลังเชื่อมต่อ...' : 'เชื่อมต่อ Google Drive'}</span>
                </button>
              </div>
            )}

            {/* Loading State */}
            {driveSyncLoading && !needsDriveAuth && (
              <div className="p-12 text-center space-y-3">
                <div className="h-10 w-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400">กำลังดาวน์โหลดและประมวลผลไฟล์ CSV จาก Google Drive...</p>
              </div>
            )}

            {/* Error Message */}
            {driveSyncError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                <span>{driveSyncError}</span>
                <button
                  onClick={handleOpenDriveSync}
                  className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-rose-200 text-xs font-semibold"
                >
                  ลองใหม่
                </button>
              </div>
            )}

            {/* Success Result */}
            {driveSyncResult && (
              <div className="p-5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>ซิงก์ Product Master เข้าสู่ฐานข้อมูลสำเร็จ!</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 block">จำนวนแถวทั้งหมด:</span>
                    <span className="text-lg font-bold text-white font-mono">{driveSyncResult.totalRows}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 block">สินค้าใหม่ (Imported):</span>
                    <span className="text-lg font-bold text-emerald-400 font-mono">+{driveSyncResult.importedCount}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 block">อัปเดต (Updated):</span>
                    <span className="text-lg font-bold text-cyan-400 font-mono">{driveSyncResult.updatedCount}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 block">แถวที่ข้าม (Skipped):</span>
                    <span className="text-lg font-bold text-slate-400 font-mono">{driveSyncResult.skippedCount}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 text-[11px] text-slate-400">
                  <span>บันทึกประวัติการนำเข้า: {new Date(driveSyncResult.syncedAt).toLocaleString('th-TH')}</span>
                  <button
                    onClick={() => setShowDriveSyncModal(false)}
                    className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              </div>
            )}

            {/* Preview & Mapping Step */}
            {!driveSyncLoading && !needsDriveAuth && drivePreview && !driveSyncResult && (
              <div className="space-y-4">
                {/* Detected Headers */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">
                      พบคอลัมน์จริงใน CSV ({drivePreview.headers.length} คอลัมน์):
                    </span>
                    <span className="text-[11px] text-cyan-400 font-medium">
                      รวมทั้งสิ้น {drivePreview.totalRows} แถวข้อมูล
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {drivePreview.headers.map(h => (
                      <span
                        key={h}
                        className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-[11px] font-mono text-slate-300"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Column Mapping Grid */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      ตรวจสอบและเลือกจับคู่คอลัมน์ (Column Mapping)
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      * ต้องมีชื่อสินค้า (PRODUCT_NAME)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {[
                      { key: 'PRODUCT_NAME', label: 'ชื่อสินค้า (PRODUCT_NAME)', required: true },
                      { key: 'PRICE_NTD', label: 'ราคา NT$ (PRICE_NTD)', required: false },
                      { key: 'PRODUCT_ID', label: 'รหัสสินค้า (PRODUCT_ID)', required: false },
                      { key: 'SKU', label: 'รหัส SKU (SKU)', required: false },
                      { key: 'UNIT', label: 'หน่วยนับ (UNIT)', required: false },
                      { key: 'SIZE', label: 'ขนาด/ปริมาณ (SIZE)', required: false },
                      { key: 'CATEGORY', label: 'หมวดหมู่ (CATEGORY)', required: false },
                      { key: 'COST', label: 'ราคาทุน (COST)', required: false },
                      { key: 'ORDER_COUNT', label: 'ยอดสั่ง (ORDER_COUNT)', required: false },
                      { key: 'QTY_SOLD', label: 'ยอดขายชิ้น (QTY_SOLD)', required: false },
                      { key: 'SALES_TOTAL', label: 'ยอดขายรวม (SALES_TOTAL)', required: false },
                      { key: 'TEMP_TYPE', label: 'อุณหภูมิ (TEMP_TYPE)', required: false },
                      { key: 'ALIASES', label: 'ชื่ออื่น/Alias (ALIASES)', required: false },
                    ].map(field => (
                      <div key={field.key} className="space-y-1">
                        <label className="text-[11px] text-slate-400 block truncate">
                          {field.label} {field.required && <span className="text-rose-400">*</span>}
                        </label>
                        <select
                          value={driveMapping[field.key] || ''}
                          onChange={e => setDriveMapping({ ...driveMapping, [field.key]: e.target.value })}
                          className={`w-full p-2 rounded-lg bg-slate-900 border text-xs text-white ${
                            field.required && !driveMapping[field.key]
                              ? 'border-rose-500/50'
                              : 'border-slate-800'
                          }`}
                        >
                          <option value="">(ไม่ระบุ)</option>
                          {drivePreview.headers.map(h => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pre-commit Summary Card */}
                <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
                  <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Database className="h-4 w-4" />
                    <span>สรุปการนำเข้าก่อนบันทึกจริง (Pre-commit Summary):</span>
                  </h4>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">จำนวนแถวทั้งหมด:</span>
                      <span className="text-sm font-bold text-white">{drivePreview.totalRows} แถว</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">สินค้าใหม่:</span>
                      <span className="text-sm font-bold text-emerald-400">+{drivePreview.stats.newCount}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">สินค้าที่จะอัปเดต:</span>
                      <span className="text-sm font-bold text-cyan-400">{drivePreview.stats.updateCount}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">แถวที่ข้าม (ไม่มีชื่อ):</span>
                      <span className="text-sm font-bold text-slate-400">{drivePreview.stats.skipCount}</span>
                    </div>
                  </div>
                </div>

                {/* Sample Rows Table */}
                {drivePreview.sampleRows && drivePreview.sampleRows.length > 0 && (
                  <div className="space-y-1.5">
                    <h5 className="text-[11px] font-semibold text-slate-400">
                      ตัวอย่างข้อมูลจาก Google Drive CSV (แถวแรกๆ):
                    </h5>
                    <div className="max-h-48 overflow-auto rounded-xl border border-slate-800 bg-slate-950 text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-900 text-slate-400 sticky top-0">
                          <tr>
                            <th className="p-2">ชื่อที่แมป</th>
                            <th className="p-2">ราคา NT$</th>
                            <th className="p-2">SKU</th>
                            <th className="p-2">หมวด</th>
                            <th className="p-2">หน่วย</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {drivePreview.sampleRows.map((r, i) => (
                            <tr key={i}>
                              <td className="p-2 font-medium text-white">
                                {driveMapping.PRODUCT_NAME ? r[driveMapping.PRODUCT_NAME] || '-' : '-'}
                              </td>
                              <td className="p-2 font-mono text-emerald-400">
                                NT$ {driveMapping.PRICE_NTD ? r[driveMapping.PRICE_NTD] || '0' : '0'}
                              </td>
                              <td className="p-2 font-mono text-slate-400">
                                {driveMapping.SKU ? r[driveMapping.SKU] || '-' : '-'}
                              </td>
                              <td className="p-2">
                                {driveMapping.CATEGORY ? r[driveMapping.CATEGORY] || '-' : '-'}
                              </td>
                              <td className="p-2">
                                {driveMapping.UNIT ? r[driveMapping.UNIT] || '-' : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 18 Real Columns Detailed Analysis Table */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <FileSpreadsheet className="h-4 w-4 text-amber-400" />
                      <span>ผลการวิเคราะห์ความหมาย 18 คอลัมน์จริงจาก Google Drive</span>
                    </h4>
                    <span className="text-[11px] text-emerald-400 font-medium">
                      แมปเฉพาะ HIGH Confidence เท่านั้น
                    </span>
                  </div>

                  <div className="max-h-56 overflow-auto rounded-xl border border-slate-800 bg-slate-900 text-[11px]">
                    <table className="w-full text-left">
                      <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="p-2 w-8">#</th>
                          <th className="p-2 font-mono">ชื่อคอลัมน์จริง (CSV)</th>
                          <th className="p-2">ตัวอย่างข้อมูลจริง</th>
                          <th className="p-2">ฟิลด์เป้าหมาย (Target)</th>
                          <th className="p-2">ความมั่นใจ</th>
                          <th className="p-2">เหตุผลการแมป</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {[
                          { no: 1, header: 'รหัส', sample: 'KE271E4C, K7A1A36A', target: 'PRODUCT_ID', conf: 'HIGH', confBg: 'bg-emerald-500/20 text-emerald-300', reason: 'รหัสสินค้าเฉพาะ 8 หลัก (K+Hex) มีความนิ่งและไม่ซ้ำซ้อน ไม่ใช่เลขแถว' },
                          { no: 2, header: 'ชั้น', sample: 'A, B, C', target: '(ไม่แมป / Unmapped)', conf: 'UNMAPPED', confBg: 'bg-slate-800 text-slate-400', reason: 'การจัดกลุ่มยอดขาย ABC (Sales Tier) ไม่ใช่หมวดหมู่สินค้า' },
                          { no: 3, header: 'อันดับ', sample: '1, 2, 3...', target: '(ไม่แมป / Unmapped)', conf: 'UNMAPPED', confBg: 'bg-slate-800 text-slate-400', reason: 'อันดับยอดขาย/ลำดับแถว เปลี่ยนแปลงได้ตลอดเวลา ห้ามใช้เป็น ID' },
                          { no: 4, header: 'ชื่อสินค้า', sample: 'ดักแด้, แคปไก่, หมูยอ', target: 'PRODUCT_NAME', conf: 'HIGH', confBg: 'bg-emerald-500/20 text-emerald-300', reason: 'ชื่อสินค้าภาษาไทยหลัก ตรงตามฟิลด์บังคับ 100%' },
                          { no: 5, header: 'ราคาขาย(NT$)', sample: '380, 100, 75', target: 'PRICE_NTD', conf: 'HIGH', confBg: 'bg-emerald-500/20 text-emerald-300', reason: 'ราคาจำหน่ายหน้าร้านสกุลเงินดอลลาร์ไต้หวัน NT$' },
                          { no: 6, header: 'สั่งกี่ครั้ง', sample: '124, 232, 304', target: 'ORDER_COUNT', conf: 'HIGH', confBg: 'bg-emerald-500/20 text-emerald-300', reason: 'ความถี่การสั่งซื้อของลูกค้า (Order Frequency)' },
                          { no: 7, header: 'กี่ชิ้น', sample: '175, 542, 788', target: 'QTY_SOLD', conf: 'HIGH', confBg: 'bg-emerald-500/20 text-emerald-300', reason: 'จำนวนชิ้นหรือหน่วยที่จำหน่ายได้จริง (Unit Quantity Sold)' },
                          { no: 8, header: 'ยอดขาย', sample: '62920, 54050', target: 'SALES_TOTAL', conf: 'HIGH', confBg: 'bg-emerald-500/20 text-emerald-300', reason: 'ยอดขายรวมเป็นจำนวนเงิน NT$ (ไม่ใช่จำนวนชิ้น)' },
                          { no: 9, header: 'ประเภท*', sample: '"" (ว่างในข้อมูลตัวอย่าง)', target: '(ไม่แมป / Unmapped)', conf: 'UNMAPPED', confBg: 'bg-slate-800 text-slate-400', reason: 'ข้อมูลส่วนใหญ่ว่าง/เป็นร่าง ห้ามเดาหมวดหมู่ ให้คงค่าเป็นสินค้าทั่วไป' },
                          { no: 10, header: 'หน่วยที่ขาย', sample: 'แพ็ค, ขวด, กระปุก, ชิ้น', target: 'UNIT', conf: 'HIGH', confBg: 'bg-emerald-500/20 text-emerald-300', reason: 'หน่วยนับบรรจุภัณฑ์สำหรับจำหน่าย' },
                          { no: 11, header: 'ขนาดต่อหน่วย', sample: '500, 100, 960', target: 'SIZE', conf: 'HIGH', confBg: 'bg-emerald-500/20 text-emerald-300', reason: 'ปริมาณหรือน้ำหนักตัวเลขต่อหนึ่งหน่วย' },
                          { no: 12, header: 'หน่วยของขนาด', sample: 'กรัม, มล.', target: '(รวมเข้ากับ SIZE)', conf: 'SUPPLEMENT', confBg: 'bg-cyan-500/20 text-cyan-300', reason: 'นำมารวมกับขนาดต่อหน่วย เช่น "500 กรัม"' },
                          { no: 13, header: 'ลังละกี่ชิ้น', sample: '"" (ว่าง)', target: '(ไม่แมป / Unmapped)', conf: 'UNMAPPED', confBg: 'bg-slate-800 text-slate-400', reason: 'จำนวนชิ้นต่อลังสำหรับราคาส่ง B2B ไม่จำเป็นในระบบ' },
                          { no: 14, header: 'ต้นทุนต่อชิ้น(NT$)', sample: '300, 60, 40', target: 'COST', conf: 'HIGH', confBg: 'bg-emerald-500/20 text-emerald-300', reason: 'ราคาทุนต่อชิ้นสกุลเงิน NT$' },
                          { no: 15, header: 'ของเย็น(Y/N)*', sample: 'Y, ""', target: 'TEMP_TYPE', conf: 'HIGH', confBg: 'bg-emerald-500/20 text-emerald-300', reason: 'ระบุสินค้าควบคุมความเย็น (CHILLED / NORMAL)' },
                          { no: 16, header: 'ของสด(Y/N)', sample: 'Y, ""', target: '(เสริม TEMP_TYPE)', conf: 'SUPPLEMENT', confBg: 'bg-cyan-500/20 text-cyan-300', reason: 'ช่วยยืนยันการจัดเก็บสินค้าสด/แช่เย็น' },
                          { no: 17, header: 'ที่มาของหน่วย', sample: 'owner_confirmed', target: '(ไม่แมป / Unmapped)', conf: 'UNMAPPED', confBg: 'bg-slate-800 text-slate-400', reason: 'ประวัติการยืนยันข้อมูลของเจ้าของร้าน (Internal Meta)' },
                          { no: 18, header: 'ชื่ออื่นที่เคยเขียน', sample: 'แคบไก่ | แค้ปไก่ | แค๊บไก่', target: 'ALIASES', conf: 'HIGH', confBg: 'bg-emerald-500/20 text-emerald-300', reason: 'ชื่อเรียกอื่น/คำค้นหา คั่นด้วยเครื่องหมายไปป์ (|)' },
                        ].map(col => (
                          <tr key={col.no}>
                            <td className="p-2 text-slate-500">{col.no}</td>
                            <td className="p-2 font-mono text-cyan-300 font-semibold">{col.header}</td>
                            <td className="p-2 text-slate-400 truncate max-w-[140px]">{col.sample}</td>
                            <td className="p-2 font-mono font-bold text-amber-300">{col.target}</td>
                            <td className="p-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${col.confBg}`}>
                                {col.conf}
                              </span>
                            </td>
                            <td className="p-2 text-slate-400">{col.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Commit Action Buttons */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 text-xs">
                    <ShieldAlert className="h-4 w-4" />
                    <span>ระบบถูกล็อค: อยู่ในขั้นตอนการวิเคราะห์โครงสร้างข้อมูล (ยังไม่อนุญาตให้นำเข้าจริง)</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDriveSyncModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                    >
                      ปิดหน้าต่าง
                    </button>
                    <button
                      disabled={true}
                      className="px-5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-xs font-bold cursor-not-allowed flex items-center gap-2"
                      title="อยู่ในขั้นตอนตรวจสอบ Column Mapping (ยังไม่อนุญาตให้นำเข้าตามคำสั่ง)"
                    >
                      <Lock className="h-4 w-4 text-amber-400" />
                      <span>ระงับการนำเข้า (รอตรวจสอบ Mapping)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">นำเข้าแคตตาล็อกสินค้าผ่าน CSV (Mapping Screen)</h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 block">
                วางข้อมูล CSV จาก Google Sheets หรือไฟล์ Export:
              </label>
              <textarea
                rows={4}
                value={csvRawText}
                onChange={(e) => handleParseCsv(e.target.value)}
                placeholder="name,price,sku,category,size,unit&#10;ปลาร้าแม่บุญล้ำ,95,PLA-001,น้ำพริก/ปลาร้า,400 มล.,ขวด&#10;กะปิระนอง,130,KAP-002,เครื่องปรุงรส,500g,กระปุก"
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />

              {/* Column Mapping Selector */}
              {csvColumns.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    จับคู่คอลัมน์ (Column Mapping)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">ชื่อสินค้า (Name) *</label>
                      <select
                        value={columnMapping.name}
                        onChange={(e) => setColumnMapping({ ...columnMapping, name: e.target.value })}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                      >
                        {csvColumns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">ราคา NTD *</label>
                      <select
                        value={columnMapping.priceNTD}
                        onChange={(e) => setColumnMapping({ ...columnMapping, priceNTD: e.target.value })}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                      >
                        {csvColumns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">รหัส SKU</label>
                      <select
                        value={columnMapping.sku}
                        onChange={(e) => setColumnMapping({ ...columnMapping, sku: e.target.value })}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                      >
                        {csvColumns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">หมวดหมู่</label>
                      <select
                        value={columnMapping.category}
                        onChange={(e) => setColumnMapping({ ...columnMapping, category: e.target.value })}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                      >
                        {csvColumns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">ขนาด / ปริมาตร</label>
                      <select
                        value={columnMapping.size}
                        onChange={(e) => setColumnMapping({ ...columnMapping, size: e.target.value })}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                      >
                        {csvColumns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">หน่วยนับ</label>
                      <select
                        value={columnMapping.unit}
                        onChange={(e) => setColumnMapping({ ...columnMapping, unit: e.target.value })}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                      >
                        {csvColumns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview table */}
              {parsedRows.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 mb-1">
                    ตัวอย่างข้อมูลที่ตรวจพบ (Preview แถวแรกๆ):
                  </h4>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-900 text-slate-400 sticky top-0">
                        <tr>
                          <th className="p-2">ชื่อ</th>
                          <th className="p-2">ราคา NTD</th>
                          <th className="p-2">SKU</th>
                          <th className="p-2">หมวด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {parsedRows.map((r, i) => (
                          <tr key={i}>
                            <td className="p-2 font-medium">{r[columnMapping.name]}</td>
                            <td className="p-2 font-mono text-emerald-400">NT$ {r[columnMapping.priceNTD]}</td>
                            <td className="p-2 font-mono text-slate-500">{r[columnMapping.sku]}</td>
                            <td className="p-2">{r[columnMapping.category]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importStatus && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                  {importStatus}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                disabled={parsedRows.length === 0}
                onClick={handleExecuteImport}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-md"
              >
                ยืนยันการนำเข้าสู่ระบบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveProduct} className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">เพิ่มสินค้าใหม่ลง Product Master</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">ชื่อสินค้าภาษาไทย *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น ปลาร้าต้มสุก ตราแม่บุญล้ำ"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">ราคาขาย NTD (ไต้หวัน) *</label>
                  <input
                    type="number"
                    required
                    value={formData.priceNTD}
                    onChange={(e) => setFormData({ ...formData, priceNTD: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-bold font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">หมวดหมู่</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    {categories.filter((c) => c !== 'ALL').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">ขนาด</label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    placeholder="400 มล."
                    className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">หน่วย</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">ประเภทการเก็บ</label>
                  <select
                    value={formData.temperatureType}
                    onChange={(e) => setFormData({ ...formData, temperatureType: e.target.value as any })}
                    className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="NORMAL">ปกติ</option>
                    <option value="CHILLED">แช่เย็น</option>
                    <option value="FROZEN">แช่แข็ง</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">ชื่อเล่น / Alias (คั่นด้วยจุลภาค ,)</label>
                <input
                  type="text"
                  value={formData.aliases}
                  onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
                  placeholder="ปลาร้าส้มตำ, ปลาร้าฝาส้ม"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20"
              >
                บันทึกสินค้า
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
