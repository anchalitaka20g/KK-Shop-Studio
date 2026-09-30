/**
 * KK Shop Content Studio - Product Catalog Service
 * Real Google Drive Product Master Import & Sync Pipeline
 * Google Drive File ID: 1-j7OrP1Z0y1rVjYk2fswuW3-3BC_8OpH
 */

import { Product, ProductImportPreview, ProductSyncResult, TemperatureType } from '../types.js';
import { db } from '../db.js';
import { DRIVE_FOLDERS } from '../config/driveFolders.js';
import { googleDriveService } from './driveService.js';
import { safeLogger } from '../utils/redact.js';

import fs from 'fs';
import path from 'path';

const CSV_CACHE_FILE = path.resolve(process.cwd(), 'data', '.product_master_cache.csv');

/**
 * Standard CSV Parser supporting RFC 4180 (quotes, commas inside quotes, CRLF/LF)
 */
export function parseCSV(rawText: string): { headers: string[]; rows: Record<string, string>[] } {
  // Strip BOM if present
  const cleanText = rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText;

  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentLine.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++; // Skip \n in \r\n
      currentLine.push(currentVal.trim());
      if (currentLine.some(c => c.length > 0)) {
        lines.push(currentLine);
      }
      currentLine = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentLine.length > 0) {
    currentLine.push(currentVal.trim());
    if (currentLine.some(c => c.length > 0)) {
      lines.push(currentLine);
    }
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = lines[0].map(h => h.replace(/^["'\s]+|["'\s]+$/g, ''));
  const headers = rawHeaders.filter(Boolean);

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < lines.length; r++) {
    const line = lines[r];
    const rowObj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      rowObj[headers[c]] = line[c] || '';
    }
    // Only add row if at least one column has content
    if (Object.values(rowObj).some(v => v.trim().length > 0)) {
      rows.push(rowObj);
    }
  }

  return { headers, rows };
}

/**
 * Creates suggested mappings from real CSV headers to standard fields
 * Only populates HIGH confidence mappings. Leaves unmapped if no reliable source column exists.
 */
export function generateSuggestedMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  // High confidence mappings for real KK Shop Product Master CSV headers
  const exactRules: Record<string, RegExp> = {
    PRODUCT_NAME: /^(ชื่อสินค้า|product_?name|รายการสินค้า|name)$/i,
    PRICE_NTD: /^(ราคาขาย\(NT\$\)|ราคาขาย|price_?ntd)$/i,
    PRODUCT_ID: /^(รหัส|รหัสสินค้า|product_?id)$/i,
    UNIT: /^(หน่วยที่ขาย|หน่วย|unit)$/i,
    SIZE: /^(ขนาดต่อหน่วย|ขนาด|size)$/i,
    COST: /^(ต้นทุนต่อชิ้น\(NT\$\)|ต้นทุนต่อชิ้น|ราคาทุน|cost)$/i,
    ORDER_COUNT: /^(สั่งกี่ครั้ง|จำนวนออเดอร์|order_?count)$/i,
    QTY_SOLD: /^(กี่ชิ้น|จำนวนชิ้นที่ขาย|qty_?sold)$/i,
    SALES_TOTAL: /^(ยอดขาย|ยอดขายรวม|sales_?total)$/i,
    TEMP_TYPE: /^(ของเย็น\(Y\/N\)\*?|ของเย็น|temp_?type)$/i,
    ALIASES: /^(ชื่ออื่นที่เคยเขียน|ชื่ออื่นที่เคยเรียก|ชื่ออื่น|aliases)$/i,
  };

  // Only assign HIGH confidence matches
  for (const [field, regex] of Object.entries(exactRules)) {
    const match = headers.find(h => regex.test(h.trim()));
    if (match) {
      mapping[field] = match;
    }
  }

  // NOTE:
  // SKU is explicitly left UNMAPPED because there is no separate barcode/SKU header.
  // CATEGORY is explicitly left UNMAPPED because 'ประเภท*' is empty/draft in the source CSV.
  // 'อันดับ' is NOT mapped to PRODUCT_ID because it is merely a row/rank number.

  return mapping;
}

/**
 * Creates stable deterministic internal ID from product name
 */
function createDeterministicId(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(6, '0');
  return `PROD-AUTO-${hex}`;
}

export class ProductCatalogService {
  readonly fileId = DRIVE_FOLDERS.PRODUCT_MASTER_FILE;

  async analyzeColumns(tokenOverride?: string) {
    const token = tokenOverride || googleDriveService.getAccessToken();

    let csvText = '';
    if (token) {
      try {
        const contentRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${this.fileId}?alt=media`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (contentRes.ok) {
          csvText = await contentRes.text();
          try {
            const dataDir = path.dirname(CSV_CACHE_FILE);
            if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
            fs.writeFileSync(CSV_CACHE_FILE, csvText, 'utf-8');
          } catch (e) {}
        }
      } catch (e) {}
    }

    if (!csvText && fs.existsSync(CSV_CACHE_FILE)) {
      csvText = fs.readFileSync(CSV_CACHE_FILE, 'utf-8');
    }

    if (!csvText) {
      if (!token) {
        throw new Error('จำเป็นต้องเชื่อมต่อ Google Drive (OAuth) ก่อนวิเคราะห์คอลัมน์');
      }
      throw new Error('ไม่สามารถดาวน์โหลดข้อมูล CSV จาก Google Drive ได้');
    }

    const { headers, rows } = parseCSV(csvText);

    const columnStats = headers.map(header => {
      const values = rows.map(r => (r[header] || '').trim());
      const filledValues = values.filter(v => v.length > 0);
      const uniqueValues = Array.from(new Set(filledValues));
      const sampleValues = uniqueValues.slice(0, 8);
      const isAllDigits = filledValues.length > 0 && filledValues.every(v => /^\d+(\.\d+)?$/.test(v));
      const isSequential = filledValues.length > 10 && filledValues.slice(0, 10).every((v, i) => v === String(i + 1));

      return {
        header,
        totalRows: rows.length,
        filledCount: filledValues.length,
        emptyCount: rows.length - filledValues.length,
        uniqueCount: uniqueValues.length,
        fillRatePercent: Math.round((filledValues.length / (rows.length || 1)) * 100),
        uniquenessPercent: filledValues.length > 0 ? Math.round((uniqueValues.length / filledValues.length) * 100) : 0,
        sampleValues,
        isAllDigits,
        isSequential,
      };
    });

    return {
      totalRows: rows.length,
      headers,
      columnStats,
    };
  }

  /**
   * Preview Product Master CSV from real Google Drive
   * Inspects and returns file info, headers, sample rows, suggested mapping
   */
  async previewImport(tokenOverride?: string): Promise<ProductImportPreview> {
    const token = tokenOverride || googleDriveService.getAccessToken();

    // 1. Fetch File Metadata if token available
    let fileMeta = { id: this.fileId, name: 'Product_Master.csv', mimeType: 'text/csv' };
    if (token) {
      try {
        const metaRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${this.fileId}?fields=id,name,mimeType,size`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (metaRes.ok) {
          fileMeta = await metaRes.json();
        }
      } catch (e) {}
    }

    // 2. Download Real CSV Content with cache fallback
    let csvText = '';
    if (token) {
      try {
        const contentRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${this.fileId}?alt=media`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (contentRes.ok) {
          csvText = await contentRes.text();
          try {
            const dataDir = path.dirname(CSV_CACHE_FILE);
            if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
            fs.writeFileSync(CSV_CACHE_FILE, csvText, 'utf-8');
          } catch (e) {}
        }
      } catch (e) {}
    }

    if (!csvText && fs.existsSync(CSV_CACHE_FILE)) {
      csvText = fs.readFileSync(CSV_CACHE_FILE, 'utf-8');
    }

    if (!csvText) {
      if (!token) {
        throw new Error('จำเป็นต้องเชื่อมต่อ Google Drive (OAuth) ก่อนดูตัวอย่างไฟล์ Product Master');
      }
      throw new Error(`ไม่สามารถดาวน์โหลดข้อมูล CSV จาก Google Drive ได้`);
    }

    const { headers, rows } = parseCSV(csvText);

    if (headers.length === 0) {
      throw new Error('ไม่พบแถวส่วนหัว (Header) ในไฟล์ Product Master CSV');
    }

    const suggestedMapping = generateSuggestedMapping(headers);

    // Calculate preliminary stats
    const nameCol = suggestedMapping.PRODUCT_NAME;
    let newCount = 0;
    let updateCount = 0;
    let skipCount = 0;
    const errors: string[] = [];

    const existingProducts = db.getProducts();

    rows.forEach((row, idx) => {
      const name = nameCol ? (row[nameCol] || '').trim() : '';
      if (!name) {
        skipCount++;
        if (errors.length < 5) {
          errors.push(`แถวที่ ${idx + 2}: ไม่มีชื่อสินค้า (ข้าม)`);
        }
        return;
      }

      const idCol = suggestedMapping.PRODUCT_ID;
      const skuCol = suggestedMapping.SKU;
      const id = idCol && row[idCol] ? row[idCol].trim() : '';
      const sku = skuCol && row[skuCol] ? row[skuCol].trim() : '';

      const exists = existingProducts.some(
        p => (id && p.id === id) || (sku && p.sku === sku) || p.name === name
      );

      if (exists) updateCount++;
      else newCount++;
    });

    return {
      totalRows: rows.length,
      headers,
      sampleRows: rows.slice(0, 8),
      suggestedMapping,
      stats: {
        newCount,
        updateCount,
        skipCount,
        errorCount: errors.length,
      },
      parsedProducts: [],
      errors,
    };
  }

  /**
   * Import products from Google Drive CSV using confirmed column mapping
   */
  async importProducts(
    columnMapping: Record<string, string>,
    tokenOverride?: string
  ): Promise<ProductSyncResult> {
    const token = tokenOverride || googleDriveService.getAccessToken();
    if (!token) {
      throw new Error('จำเป็นต้องเชื่อมต่อ Google Drive (OAuth) ก่อนนำเข้าข้อมูลสินค้า');
    }

    const nameHeader = columnMapping.PRODUCT_NAME;
    if (!nameHeader) {
      throw new Error('กรุณาระบุคอลัมน์ชื่อสินค้า (PRODUCT_NAME) ซึ่งจำเป็นต้องมี');
    }

    // Download CSV with cache fallback
    let csvText = '';
    if (token) {
      try {
        const contentRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${this.fileId}?alt=media`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (contentRes.ok) {
          csvText = await contentRes.text();
          try {
            fs.writeFileSync(CSV_CACHE_FILE, csvText, 'utf-8');
          } catch (e) {}
        }
      } catch (e) {}
    }

    if (!csvText && fs.existsSync(CSV_CACHE_FILE)) {
      csvText = fs.readFileSync(CSV_CACHE_FILE, 'utf-8');
    }

    if (!csvText) {
      throw new Error(`ไม่สามารถดาวน์โหลดไฟล์ Product Master CSV ได้ กรุณาเชื่อมต่อ Google Drive ใหม่อีกครั้ง`);
    }

    const { rows } = parseCSV(csvText);

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    const now = new Date().toISOString();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const sourceRow = i + 2; // 1-based, accounting for header
      const name = (row[nameHeader] || '').trim();

      if (!name) {
        skippedCount++;
        continue;
      }

      // Map values without inventing missing values
      const rawId = columnMapping.PRODUCT_ID ? (row[columnMapping.PRODUCT_ID] || '').trim() : '';
      const rawSku = columnMapping.SKU ? (row[columnMapping.SKU] || '').trim() : '';
      const rawPrice = columnMapping.PRICE_NTD ? parseFloat(row[columnMapping.PRICE_NTD]) : NaN;
      const rawCost = columnMapping.COST ? parseFloat(row[columnMapping.COST]) : NaN;
      const rawUnit = columnMapping.UNIT ? (row[columnMapping.UNIT] || '').trim() : '';
      const rawSize = columnMapping.SIZE ? (row[columnMapping.SIZE] || '').trim() : '';
      const rawCategory = columnMapping.CATEGORY ? (row[columnMapping.CATEGORY] || '').trim() : '';
      const rawOrderCount = columnMapping.ORDER_COUNT ? parseInt(row[columnMapping.ORDER_COUNT], 10) : 0;
      const rawQtySold = columnMapping.QTY_SOLD ? parseInt(row[columnMapping.QTY_SOLD], 10) : 0;
      const rawSalesTotal = columnMapping.SALES_TOTAL ? parseFloat(row[columnMapping.SALES_TOTAL]) : 0;
      const rawTemp = columnMapping.TEMP_TYPE ? (row[columnMapping.TEMP_TYPE] || '').toUpperCase() : '';
      const rawAliases = columnMapping.ALIASES ? (row[columnMapping.ALIASES] || '').trim() : '';

      // Determine stable identity
      const id = rawId || (rawSku ? `PROD-${rawSku}` : createDeterministicId(name));
      const sku = rawSku || id;

      let temperatureType: TemperatureType = 'NORMAL';
      if (rawTemp === 'Y' || rawTemp.includes('CHILL') || rawTemp.includes('เย็น') || rawTemp.includes('สด') || (row['ของสด(Y/N)'] || '').toUpperCase() === 'Y') {
        temperatureType = 'CHILLED';
      } else if (rawTemp.includes('FROZEN') || rawTemp.includes('แข็ง')) {
        temperatureType = 'FROZEN';
      }

      const aliases = rawAliases
        ? rawAliases.split(/[,;\n|]/).map(a => a.trim()).filter(Boolean)
        : [];

      const rawSizeUnit = (row['หน่วยของขนาด'] || '').trim();
      const combinedSize = rawSize && rawSizeUnit && !rawSize.includes(rawSizeUnit)
        ? `${rawSize} ${rawSizeUnit}`
        : rawSize;

      const existing = db.getProductById(id) || db.getProductById(sku);

      const product: Product = {
        id,
        sku,
        name,
        priceNTD: !isNaN(rawPrice) ? rawPrice : (existing ? existing.priceNTD : 0),
        unit: rawUnit || (existing ? existing.unit : 'ชิ้น'),
        size: combinedSize || (existing ? existing.size : ''),
        category: rawCategory || (existing ? existing.category : 'สินค้าทั่วไป'),
        cost: !isNaN(rawCost) ? rawCost : (existing ? existing.cost : 0),
        orderCount: !isNaN(rawOrderCount) ? rawOrderCount : (existing ? existing.orderCount : 0),
        quantitySold: !isNaN(rawQtySold) ? rawQtySold : (existing ? existing.quantitySold : 0),
        salesTotal: !isNaN(rawSalesTotal) ? rawSalesTotal : (existing ? existing.salesTotal : 0),
        temperatureType: temperatureType || (existing ? existing.temperatureType : 'NORMAL'),
        aliases: aliases.length > 0 ? aliases : (existing ? existing.aliases : []),
        rawMediaIds: existing ? existing.rawMediaIds : [],
        inStock: existing ? existing.inStock : true,
        origin: existing ? existing.origin : 'ประเทศไทย (นำเข้า)',
        description: existing?.description || '',
        sourceFileId: this.fileId,
        sourceRow,
        lastSyncedAt: now,
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now,
      };

      if (existing) {
        db.saveProduct(product);
        updatedCount++;
      } else {
        db.saveProduct(product);
        importedCount++;
      }
    }

    const result: ProductSyncResult = {
      success: true,
      totalRows: rows.length,
      importedCount,
      updatedCount,
      skippedCount,
      errorCount: errors.length,
      sourceFileId: this.fileId,
      syncedAt: now,
      errors,
    };

    db.addAuditLog({
      id: `LOG-${Date.now()}`,
      timestamp: now,
      user: 'ผู้ดูแลระบบ (Product Master Sync)',
      action: 'PRODUCT_IMPORTED',
      result: 'SUCCESS',
      details: `ซิงก์ Product Master จาก Google Drive (${this.fileId}): แถวทั้งหมด ${rows.length} (เพิ่มใหม่ ${importedCount}, อัปเดต ${updatedCount}, ข้าม ${skippedCount})`,
    });

    return result;
  }

  /**
   * Fast sync products using auto-detected mappings
   */
  async syncProducts(tokenOverride?: string): Promise<ProductSyncResult> {
    const preview = await this.previewImport(tokenOverride);
    return this.importProducts(preview.suggestedMapping, tokenOverride);
  }

  /**
   * Get current import status & catalog summary
   */
  getImportStatus() {
    const products = db.getProducts();
    const syncedProducts = products.filter(p => p.sourceFileId === this.fileId);
    const lastSyncedAt = syncedProducts.reduce((latest, p) => {
      if (!p.lastSyncedAt) return latest;
      return !latest || p.lastSyncedAt > latest ? p.lastSyncedAt : latest;
    }, '');

    return {
      sourceFileId: this.fileId,
      totalProducts: products.length,
      syncedProductsCount: syncedProducts.length,
      lastSyncedAt: lastSyncedAt || null,
    };
  }
}

export const productCatalogService = new ProductCatalogService();
