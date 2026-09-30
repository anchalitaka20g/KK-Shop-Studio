/**
 * KK Shop Content Studio - Google Drive Media Service
 * Manages media metadata & secure server-side access to Google Drive hierarchy
 * Native Google Drive integration using OAuth Bearer tokens.
 * Folders and File IDs are configuration, not secrets.
 */

import { MediaAsset, DriveFolderPath, MediaMatchStatus, DriveSyncResult, Product } from '../types.js';
import { db } from '../db.js';
import { DRIVE_FOLDERS } from '../config/driveFolders.js';
import { safeLogger } from '../utils/redact.js';

import fs from 'fs';
import path from 'path';

export interface DriveFolderInfo {
  path: DriveFolderPath;
  nameThai: string;
  description: string;
  fileCount: number;
}

export interface DriveTestResult {
  status: 'CONNECTED' | 'NOT_CONNECTED' | 'AUTH_REQUIRED' | 'ERROR';
  folderId?: string;
  folderName?: string;
  message?: string;
}

const TOKEN_CACHE_FILE = path.resolve(process.cwd(), 'data', '.drive_token_cache');

export class GoogleDriveService {
  private inMemoryAccessToken: string | null = null;

  constructor() {
    try {
      if (fs.existsSync(TOKEN_CACHE_FILE)) {
        this.inMemoryAccessToken = fs.readFileSync(TOKEN_CACHE_FILE, 'utf-8').trim();
      }
    } catch (e) {}
  }

  setAccessToken(token: string | null) {
    this.inMemoryAccessToken = token;
    try {
      const dataDir = path.dirname(TOKEN_CACHE_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      if (token) {
        fs.writeFileSync(TOKEN_CACHE_FILE, token, 'utf-8');
      } else if (fs.existsSync(TOKEN_CACHE_FILE)) {
        fs.unlinkSync(TOKEN_CACHE_FILE);
      }
    } catch (e) {}
  }

  getAccessToken(): string | null {
    return this.inMemoryAccessToken;
  }

  hasValidToken(): boolean {
    return Boolean(this.inMemoryAccessToken && this.inMemoryAccessToken.length > 10);
  }

  getAuthMode(): string {
    return 'ADMIN_OAUTH';
  }

  /**
   * Test connection to ROOT folder: 1Qa0FOKKeMjgQCsGTZin5NBsf1Zlc7fJ0
   * Performs an actual Drive request.
   * Returns only safe metadata: status, folderName, folderId. Never returns tokens.
   */
  async testConnection(tokenOverride?: string): Promise<DriveTestResult> {
    const token = tokenOverride || this.inMemoryAccessToken;
    if (!token) {
      return {
        status: 'AUTH_REQUIRED',
        message: 'จำเป็นต้องเชื่อมต่อ Google Drive ผ่านปุ่ม "เชื่อมต่อ Google Drive"',
      };
    }

    try {
      const folderId = DRIVE_FOLDERS.ROOT;
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      if (res.status === 401 || res.status === 403) {
        return {
          status: 'AUTH_REQUIRED',
          message: 'สิทธิ์การเข้าถึง Google Drive หมดอายุหรือไม่ถูกต้อง กรุณากดเชื่อมต่อใหม่อีกครั้ง',
        };
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          status: 'ERROR',
          message: errorData.error?.message || `Google Drive API error (status ${res.status})`,
        };
      }

      const data = await res.json();
      return {
        status: 'CONNECTED',
        folderId: data.id,
        folderName: data.name || 'ROOT',
      };
    } catch (err: any) {
      safeLogger.error('Google Drive test connection failed:', err);
      return {
        status: 'ERROR',
        message: err.message || 'ไม่สามารถติดต่อ Google Drive API ได้',
      };
    }
  }

  getFolderStructure(): DriveFolderInfo[] {
    const assets = db.getMediaAssets();
    const countByFolder: Record<string, number> = {};
    for (const a of assets) {
      countByFolder[a.folderPath] = (countByFolder[a.folderPath] || 0) + 1;
    }

    return [
      {
        path: '01_RAW/01_PRODUCT_IMAGES',
        nameThai: '01 รูปสินค้าดิบ (พื้นหลังขาว/แพ็คเกจ)',
        description: 'รูปถ่ายแพ็คเกจจิ้งสินค้า ภาพพื้นหลังขาวสำหรับทำกราฟิกโฆษณา',
        fileCount: countByFolder['01_RAW/01_PRODUCT_IMAGES'] || 0,
      },
      {
        path: '01_RAW/02_RAW_PHOTOS',
        nameThai: '02 ภาพถ่ายไลฟ์สไตล์ดิบ',
        description: 'ภาพถ่ายสินค้าในร้าน ภาพของสด ภาพประกอบอาหารจริง',
        fileCount: countByFolder['01_RAW/02_RAW_PHOTOS'] || 0,
      },
      {
        path: '01_RAW/03_RAW_VIDEOS',
        nameThai: '03 วิดีโอดิบ / ฟุตเทจ',
        description: 'คลิปสั้นถ่ายจากหน้าร้าน ฟุตเทจหั่นหมูยอ ฟุตเทจทำอาหาร',
        fileCount: countByFolder['01_RAW/03_RAW_VIDEOS'] || 0,
      },
      {
        path: '02_GENERATED/01_AD_IMAGES',
        nameThai: '01 รูปภาพโฆษณาที่สร้างเสร็จ',
        description: 'ภาพแอดโฆษณาที่ผ่านการแต่งภาพและเติมป้ายราคา NT$ เรียบร้อย',
        fileCount: countByFolder['02_GENERATED/01_AD_IMAGES'] || 0,
      },
      {
        path: '02_GENERATED/02_AD_VIDEOS',
        nameThai: '02 วิดีโอสั้น / รีลส์ที่สร้างเสร็จ',
        description: 'คลิป Reels 9:16 ที่พร้อมใช้งานบน Facebook',
        fileCount: countByFolder['02_GENERATED/02_AD_VIDEOS'] || 0,
      },
      {
        path: '03_APPROVED',
        nameThai: '03 คอนเทนต์ที่ผ่านการอนุมัติแล้ว',
        description: 'ไฟล์มีเดียของคอนเทนต์ที่แอดมินตรวจผ่าน พร้อมตั้งเวลาโพสต์',
        fileCount: countByFolder['03_APPROVED'] || 0,
      },
      {
        path: '04_POSTED_ARCHIVE',
        nameThai: '04 คลังอาร์ไคฟ์หลังโพสต์แล้ว',
        description: 'ไฟล์คอนเทนต์ที่โพสต์ขึ้น Facebook สำเร็จแล้ว เก็บเป็นประวัติ',
        fileCount: countByFolder['04_POSTED_ARCHIVE'] || 0,
      },
    ];
  }

  getMediaByFolder(folderPath?: DriveFolderPath): MediaAsset[] {
    return db.getMediaAssets(folderPath);
  }

  /**
   * Scan actual files from configured Google Drive folders:
   * PRODUCT_IMAGES, RAW_PHOTOS, RAW_VIDEOS, GENERATED_AD_IMAGES, GENERATED_VIDEOS, APPROVED, POSTED_ARCHIVE
   */
  async scanMediaFolders(tokenOverride?: string): Promise<DriveSyncResult> {
    const token = tokenOverride || this.inMemoryAccessToken;
    if (!token) {
      throw new Error('จำเป็นต้องเชื่อมต่อ Google Drive (OAuth) ก่อนสแกนไฟล์มีเดีย');
    }

    const folderMappings: { key: string; folderId: string; path: DriveFolderPath }[] = [
      { key: 'PRODUCT_IMAGES', folderId: DRIVE_FOLDERS.PRODUCT_IMAGES, path: '01_RAW/01_PRODUCT_IMAGES' },
      { key: 'RAW_PHOTOS', folderId: DRIVE_FOLDERS.RAW_PHOTOS, path: '01_RAW/02_RAW_PHOTOS' },
      { key: 'RAW_VIDEOS', folderId: DRIVE_FOLDERS.RAW_VIDEOS, path: '01_RAW/03_RAW_VIDEOS' },
      { key: 'GENERATED_AD_IMAGES', folderId: DRIVE_FOLDERS.GENERATED_AD_IMAGES, path: '02_GENERATED/01_AD_IMAGES' },
      { key: 'GENERATED_VIDEOS', folderId: DRIVE_FOLDERS.GENERATED_VIDEOS, path: '02_GENERATED/02_AD_VIDEOS' },
      { key: 'APPROVED', folderId: DRIVE_FOLDERS.APPROVED, path: '03_APPROVED' },
      { key: 'POSTED_ARCHIVE', folderId: DRIVE_FOLDERS.POSTED_ARCHIVE, path: '04_POSTED_ARCHIVE' },
    ];

    const products = db.getProducts();
    const scannedFolders: { folderKey: string; folderId: string; fileCount: number }[] = [];
    let totalFilesFound = 0;
    let newFilesAdded = 0;
    let matchedCount = 0;
    let unmatchedCount = 0;
    let reviewRequiredCount = 0;

    for (const mapping of folderMappings) {
      try {
        const query = encodeURIComponent(`'${mapping.folderId}' in parents and trashed = false`);
        const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink)&pageSize=100`;

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });

        if (!res.ok) {
          const errText = await res.text();
          safeLogger.warn(`Folder scan failed for ${mapping.key} (${mapping.folderId}):`, errText);
          scannedFolders.push({ folderKey: mapping.key, folderId: mapping.folderId, fileCount: 0 });
          continue;
        }

        const data = await res.json();
        const files: any[] = data.files || [];
        scannedFolders.push({ folderKey: mapping.key, folderId: mapping.folderId, fileCount: files.length });
        totalFilesFound += files.length;

        for (const file of files) {
          const isVideo = (file.mimeType || '').startsWith('video/');
          const matchResult = this.matchMediaToProduct(file.name, products);

          if (matchResult.matchStatus === 'MATCHED') matchedCount++;
          else if (matchResult.matchStatus === 'MATCH_REVIEW_REQUIRED') reviewRequiredCount++;
          else unmatchedCount++;

          const existingAsset = db.getMediaById(`DRIVE-${file.id}`);
          const asset: MediaAsset = {
            id: `DRIVE-${file.id}`,
            driveFileId: file.id,
            name: file.name,
            folderPath: mapping.path,
            type: isVideo ? 'VIDEO' : 'IMAGE',
            mimeType: file.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
            sizeBytes: parseInt(file.size || '0', 10),
            productId: matchResult.productId,
            productName: matchResult.productName,
            matchStatus: matchResult.matchStatus,
            matchMethod: matchResult.matchMethod,
            matchConfidence: matchResult.matchConfidence,
            thumbnailUrl: `/api/drive/files/${file.id}/thumbnail`,
            previewUrl: `/api/drive/files/${file.id}/content`,
            createdTime: file.createdTime,
            modifiedTime: file.modifiedTime,
            createdAt: existingAsset ? existingAsset.createdAt : new Date().toISOString(),
          };

          if (!existingAsset) newFilesAdded++;
          db.saveMediaAsset(asset);

          // If matched, link to product's rawMediaIds
          if (matchResult.productId && matchResult.matchStatus === 'MATCHED') {
            const product = db.getProductById(matchResult.productId);
            if (product && !product.rawMediaIds.includes(asset.id)) {
              product.rawMediaIds.push(asset.id);
              db.saveProduct(product);
            }
          }
        }
      } catch (err: any) {
        safeLogger.error(`Error scanning folder ${mapping.key}:`, err);
        scannedFolders.push({ folderKey: mapping.key, folderId: mapping.folderId, fileCount: 0 });
      }
    }

    const syncResult: DriveSyncResult = {
      success: true,
      totalFilesFound,
      newFilesAdded,
      matchedCount,
      unmatchedCount,
      reviewRequiredCount,
      scannedFolders,
      syncedAt: new Date().toISOString(),
    };

    db.addAuditLog({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: 'ระบบสแกน Google Drive (Media Sync)',
      action: 'MEDIA_SYNCED',
      result: 'SUCCESS',
      details: `สแกนไฟล์จาก Google Drive สำเร็จ: พบ ${totalFilesFound} ไฟล์ (ตรงสินค้า ${matchedCount}, รอตรวจ ${reviewRequiredCount}, ไม่ตรง ${unmatchedCount})`,
    });

    return syncResult;
  }

  /**
   * Matches media filename to products using:
   * 1. PRODUCT_ID
   * 2. SKU
   * 3. Normalized product name
   * 4. Aliases
   */
  matchMediaToProduct(
    fileName: string,
    products: Product[]
  ): {
    productId?: string;
    productName?: string;
    matchStatus: MediaMatchStatus;
    matchMethod?: 'PRODUCT_ID' | 'SKU' | 'NAME' | 'ALIAS' | 'MANUAL';
    matchConfidence?: number;
  } {
    const cleanFileName = fileName.toLowerCase().replace(/[_-]/g, ' ');

    // 1. PRODUCT_ID
    for (const p of products) {
      if (p.id && (fileName.includes(p.id) || cleanFileName.includes(p.id.toLowerCase()))) {
        return {
          productId: p.id,
          productName: p.name,
          matchStatus: 'MATCHED',
          matchMethod: 'PRODUCT_ID',
          matchConfidence: 1.0,
        };
      }
    }

    // 2. SKU
    for (const p of products) {
      if (p.sku && p.sku.length > 2 && (fileName.includes(p.sku) || cleanFileName.includes(p.sku.toLowerCase()))) {
        return {
          productId: p.id,
          productName: p.name,
          matchStatus: 'MATCHED',
          matchMethod: 'SKU',
          matchConfidence: 0.95,
        };
      }
    }

    // 3. Normalized product name
    for (const p of products) {
      const cleanProdName = p.name.toLowerCase().replace(/[()_-\s]/g, '');
      const cleanFileNoSpace = fileName.toLowerCase().replace(/[()_-\s]/g, '');
      if (cleanFileNoSpace.includes(cleanProdName) && cleanProdName.length > 3) {
        return {
          productId: p.id,
          productName: p.name,
          matchStatus: 'MATCHED',
          matchMethod: 'NAME',
          matchConfidence: 0.9,
        };
      }
    }

    // 4. Aliases
    for (const p of products) {
      for (const alias of p.aliases || []) {
        const cleanAlias = alias.toLowerCase().replace(/[()_-\s]/g, '');
        const cleanFileNoSpace = fileName.toLowerCase().replace(/[()_-\s]/g, '');
        if (cleanAlias.length > 3 && cleanFileNoSpace.includes(cleanAlias)) {
          return {
            productId: p.id,
            productName: p.name,
            matchStatus: 'MATCHED',
            matchMethod: 'ALIAS',
            matchConfidence: 0.85,
          };
        }
      }
    }

    // 5. Partial/Fuzzy check for review
    for (const p of products) {
      const words = p.name.toLowerCase().split(/[\s,()_-]+/).filter(w => w.length > 3);
      for (const w of words) {
        if (cleanFileName.includes(w)) {
          return {
            productId: p.id,
            productName: p.name,
            matchStatus: 'MATCH_REVIEW_REQUIRED',
            matchMethod: 'NAME',
            matchConfidence: 0.5,
          };
        }
      }
    }

    return {
      matchStatus: 'UNMATCHED',
    };
  }

  registerMedia(asset: Omit<MediaAsset, 'id' | 'createdAt'>): MediaAsset {
    const newAsset: MediaAsset = {
      ...asset,
      id: `DRIVE-FILE-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    db.saveMediaAsset(newAsset);
    db.addAuditLog({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: 'ผู้ดูแลระบบ (Admin)',
      action: 'CONTENT_CREATED',
      result: 'SUCCESS',
      details: `ลงทะเบียนไฟล์มีเดียเข้าโฟลเดอร์ Google Drive: ${newAsset.folderPath} (${newAsset.name})`,
    });
    return newAsset;
  }
}

export const googleDriveService = new GoogleDriveService();
