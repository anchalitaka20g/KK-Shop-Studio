/**
 * KK Shop Content Studio - Main Express Full-Stack Server
 * Thai grocery store in Taiwan (ร้านขอนแก่น)
 * Hardened Architecture: Strict Approvals, Facebook Safety Switch & Log Redaction
 */

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { db } from './server/db.js';
import { config, getSanitizedIntegrationsStatus } from './server/config.js';
import { safeLogger, redactObject, maskUserId } from './server/utils/redact.js';
import {
  generateCreativeBrief,
  generateCaption,
  generateReelStoryboard,
  testGeminiConnection,
} from './server/services/geminiService.js';
import { getImageCreativeProvider, getAvailableImageProviders } from './server/services/imageCreativeProvider.js';
import { getVideoGenerationProvider } from './server/services/videoGenerationProvider.js';
import { facebookPublishingService } from './server/services/facebookPublishingService.js';
import { performanceCollector } from './server/services/performanceCollector.js';
import { lineNotificationService } from './server/services/lineNotificationService.js';
import { googleDriveService } from './server/services/driveService.js';
import { productCatalogService } from './server/services/productCatalogService.js';
import { DRIVE_FOLDERS } from './server/config/driveFolders.js';
import { contentIntelligenceService } from './server/services/contentIntelligenceService.js';
import { ContentJob, ContentType, Product, ScheduledPost } from './server/types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = config.system.port;

app.use(
  express.json({
    limit: '25mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Helper to extract bearer token from headers
function extractBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return undefined;
}

// Request logger for API with automatic redaction
app.use('/api', (req, res, next) => {
  const token = extractBearerToken(req);
  if (token) {
    googleDriveService.setAccessToken(token);
  }
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (res.statusCode >= 400) {
      safeLogger.warn(`[API] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// ==========================================
// 1. INTEGRATION STATUS & READINESS
// ==========================================
app.get('/api/status', (req: Request, res: Response) => {
  const token = extractBearerToken(req);
  if (token) googleDriveService.setAccessToken(token);
  const settings = db.getSettings();
  const driveConnected = googleDriveService.hasValidToken();
  const sanitized = getSanitizedIntegrationsStatus(driveConnected);

  res.json({
    settings: {
      ...settings,
      facebookPageId: config.facebook.pageId || settings.facebookPageId,
    },
    integrations: sanitized.integrations,
    allReady: sanitized.allReady,
    publishingEnabled: sanitized.publishingEnabled,
    driveConnected,
    driveFolderId: DRIVE_FOLDERS.ROOT,
    availableImageProviders: getAvailableImageProviders(),
    timezone: 'Asia/Bangkok',
    currentTimeBangkok: new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(new Date()),
  });
});

// ==========================================
// 2. DASHBOARD
// ==========================================
app.get('/api/dashboard', (req: Request, res: Response) => {
  const products = db.getProducts();
  const allMedia = db.getMediaAssets();
  const allJobs = db.getContentJobs();
  const scheduled = db.getScheduledPosts().filter(s => s.status === 'SCHEDULED');
  const published = db.getPublishedPosts();
  const performanceChecks = db.getPerformanceChecks();

  const generatingCount = allJobs.filter(j => j.status === 'GENERATING').length;
  const waitingApprovalCount = allJobs.filter(j => j.status === 'WAITING_APPROVAL').length;
  const approvedCount = allJobs.filter(j => j.status === 'APPROVED').length;
  const scheduledCount = scheduled.length;

  const todayBangkok = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
  const postedTodayCount = published.filter(p => p.publishedAt.startsWith(todayBangkok)).length;

  const analysisPendingCount = published.filter(p => !p.isPerformanceChecked).length;
  const analyzedCount = performanceChecks.length;
  const errorCount = allJobs.filter(j => j.status === 'ERROR').length;

  const waitingQueue = allJobs.filter(j => j.status === 'WAITING_APPROVAL').slice(0, 5);
  const upcomingScheduled = scheduled.slice(0, 5);
  const recentPublished = published.slice(0, 5);

  res.json({
    counts: {
      totalProducts: products.length,
      realMediaFiles: allMedia.length,
      generating: generatingCount,
      waitingApproval: waitingApprovalCount,
      approved: approvedCount,
      scheduled: scheduledCount,
      postedToday: postedTodayCount,
      analysisPending: analysisPendingCount,
      analyzed: analyzedCount,
      error: errorCount,
    },
    waitingQueue,
    upcomingScheduled,
    recentPublished,
  });
});

// ==========================================
// 3. PRODUCT MASTER
// ==========================================
app.get('/api/products', (req: Request, res: Response) => {
  const { query, category } = req.query;
  let products = db.getProducts();

  if (query && typeof query === 'string') {
    const q = query.toLowerCase().trim();
    products = products.filter(p =>
      p.id.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.aliases.some(a => a.toLowerCase().includes(q))
    );
  }

  if (category && typeof category === 'string' && category !== 'ALL') {
    products = products.filter(p => p.category === category);
  }

  res.json(products);
});

app.get('/api/products/:id', (req: Request, res: Response) => {
  const product = db.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'ไม่พบข้อมูลสินค้านี้ในระบบ' });
  }

  const allMedia = db.getMediaAssets();
  const relatedMedia = allMedia.filter(m =>
    m.productId === product.id ||
    product.rawMediaIds.includes(m.id) ||
    product.rawMediaIds.includes(m.driveFileId)
  );

  res.json({ product, relatedMedia });
});

app.post('/api/products', (req: Request, res: Response) => {
  const body = req.body;
  if (!body.name || !body.priceNTD) {
    return res.status(400).json({ error: 'กรุณาระบุชื่อสินค้าและราคา NT$ ให้ครบถ้วน' });
  }

  const existing = body.id ? db.getProductById(body.id) : null;
  const product: Product = {
    id: body.id || `PROD-KK-${Date.now().toString().slice(-4)}`,
    sku: body.sku || `SKU-${Date.now().toString().slice(-6)}`,
    name: body.name,
    priceNTD: Number(body.priceNTD),
    unit: body.unit || 'ชิ้น',
    size: body.size || '',
    category: body.category || 'สินค้าทั่วไป',
    cost: Number(body.cost || 0),
    orderCount: Number(body.orderCount || 0),
    quantitySold: Number(body.quantitySold || 0),
    salesTotal: Number(body.salesTotal || 0),
    temperatureType: body.temperatureType || 'NORMAL',
    aliases: Array.isArray(body.aliases) ? body.aliases : (body.aliases ? body.aliases.split(',').map((s: string) => s.trim()) : []),
    rawMediaIds: body.rawMediaIds || [],
    inStock: body.inStock !== false,
    origin: body.origin || 'ประเทศไทย',
    description: body.description || '',
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.saveProduct(product);
  res.json(product);
});

app.post('/api/products/import', (req: Request, res: Response) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'ไม่พบข้อมูลแถวสินค้าสำหรับนำเข้า' });
  }

  const validProducts: Product[] = [];
  for (const item of items) {
    if (!item.name || isNaN(Number(item.priceNTD))) continue;
    validProducts.push({
      id: item.id || `PROD-CSV-${Math.floor(1000 + Math.random() * 9000)}`,
      sku: item.sku || `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
      name: item.name,
      priceNTD: Number(item.priceNTD),
      unit: item.unit || 'ชิ้น',
      size: item.size || '',
      category: item.category || 'สินค้าทั่วไป',
      cost: Number(item.cost || 0),
      orderCount: Number(item.orderCount || 0),
      quantitySold: Number(item.quantitySold || 0),
      salesTotal: Number(item.salesTotal || 0),
      temperatureType: item.temperatureType || 'NORMAL',
      aliases: Array.isArray(item.aliases) ? item.aliases : (item.aliases ? String(item.aliases).split(',').map(s => s.trim()) : []),
      rawMediaIds: item.rawMediaIds || [],
      inStock: item.inStock !== false,
      origin: item.origin || 'ประเทศไทย',
      description: item.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const result = db.importProducts(validProducts);
  res.json(result);
});

// ==========================================
// 3.1 REAL PRODUCT MASTER (GOOGLE DRIVE)
// ==========================================
// Preview CSV from Google Drive file: 1-j7OrP1Z0y1rVjYk2fswuW3-3BC_8OpH
app.get('/api/drive/products/preview', async (req: Request, res: Response) => {
  const token = extractBearerToken(req);
  try {
    const preview = await productCatalogService.previewImport(token);
    res.json(preview);
  } catch (err: any) {
    safeLogger.error('Product Master CSV preview error:', err);
    res.status(500).json({ error: err.message || 'ไม่สามารถเปิดไฟล์ Product Master CSV ได้' });
  }
});

// Analyze all CSV columns in detail
app.get('/api/drive/products/column-analysis', async (req: Request, res: Response) => {
  const token = extractBearerToken(req);
  try {
    const analysis = await productCatalogService.analyzeColumns(token);
    res.json(analysis);
  } catch (err: any) {
    safeLogger.error('Product Master column analysis error:', err);
    res.status(500).json({ error: err.message || 'ไม่สามารถวิเคราะห์คอลัมน์ได้' });
  }
});

// Import products with column mapping
app.post('/api/drive/products/import', async (req: Request, res: Response) => {
  const token = extractBearerToken(req);
  const { columnMapping } = req.body;
  if (!columnMapping || typeof columnMapping !== 'object') {
    return res.status(400).json({ error: 'กรุณาระบุโครงสร้างจับคู่คอลัมน์ (Column Mapping)' });
  }

  try {
    const result = await productCatalogService.importProducts(columnMapping, token);
    res.json(result);
  } catch (err: any) {
    safeLogger.error('Product Master import error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Fast Sync Product Master
app.post('/api/drive/products/sync', async (req: Request, res: Response) => {
  const token = extractBearerToken(req);
  try {
    const result = await productCatalogService.syncProducts(token);
    res.json(result);
  } catch (err: any) {
    safeLogger.error('Product Master sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Product Master Sync Status
app.get('/api/drive/products/status', (req: Request, res: Response) => {
  res.json(productCatalogService.getImportStatus());
});

// ==========================================
// 4. MEDIA LIBRARY (GOOGLE DRIVE)
// ==========================================
// Authenticate Google Drive Token from Client
app.post('/api/drive/auth', (req: Request, res: Response) => {
  const { accessToken } = req.body;
  if (accessToken) {
    googleDriveService.setAccessToken(accessToken);
    safeLogger.info('Google Drive access token updated successfully');
    return res.json({ success: true, message: 'บันทึก Google Drive Token ฝั่งเซิร์ฟเวอร์เรียบร้อย' });
  }
  res.status(400).json({ error: 'ไม่พบ Access Token' });
});

// Test Connection to ROOT Folder
app.all(['/api/drive/test-connection', '/api/test/drive'], async (req: Request, res: Response) => {
  const token = extractBearerToken(req);
  try {
    const result = await googleDriveService.testConnection(token);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
});

// Scan Media Folders
app.post('/api/drive/media/scan', async (req: Request, res: Response) => {
  const token = extractBearerToken(req);
  try {
    const result = await googleDriveService.scanMediaFolders(token);
    res.json(result);
  } catch (err: any) {
    safeLogger.error('Google Drive media scan error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Assign Media to Product
app.post('/api/media/:id/assign-product', (req: Request, res: Response) => {
  const { productId, matchMethod } = req.body;
  const asset = db.getMediaById(req.params.id);
  if (!asset) return res.status(404).json({ error: 'ไม่พบไฟล์มีเดีย' });

  if (productId) {
    const product = db.getProductById(productId);
    if (!product) return res.status(404).json({ error: 'ไม่พบสินค้าที่ระบุ' });

    asset.productId = product.id;
    asset.productName = product.name;
    asset.matchStatus = 'MATCHED';
    asset.matchMethod = matchMethod || 'MANUAL';
    asset.matchConfidence = 1.0;

    if (!product.rawMediaIds.includes(asset.id)) {
      product.rawMediaIds.push(asset.id);
      db.saveProduct(product);
    }
  } else {
    asset.productId = undefined;
    asset.productName = undefined;
    asset.matchStatus = 'UNMATCHED';
    asset.matchMethod = undefined;
  }

  db.saveMediaAsset(asset);
  res.json(asset);
});

// Safe Authenticated Media Content Proxy (no public URLs needed)
app.get('/api/drive/files/:fileId/content', async (req: Request, res: Response) => {
  const token = extractBearerToken(req) || googleDriveService.getAccessToken();
  if (!token) {
    return res.status(401).send('Unauthorized: Google Drive access token missing');
  }

  try {
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${req.params.fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!driveRes.ok) {
      return res.status(driveRes.status).send('Failed to fetch file from Google Drive');
    }

    const contentType = driveRes.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const arrayBuffer = await driveRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

// Safe Authenticated Media Thumbnail Proxy
app.get('/api/drive/files/:fileId/thumbnail', async (req: Request, res: Response) => {
  const token = extractBearerToken(req) || googleDriveService.getAccessToken();
  if (!token) {
    return res.status(401).send('Unauthorized: Google Drive access token missing');
  }

  try {
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${req.params.fileId}?fields=thumbnailLink`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (metaRes.ok) {
      const meta = await metaRes.json();
      if (meta.thumbnailLink) {
        const thumbRes = await fetch(meta.thumbnailLink, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (thumbRes.ok) {
          const contentType = thumbRes.headers.get('content-type') || 'image/jpeg';
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=3600');
          const buf = await thumbRes.arrayBuffer();
          return res.send(Buffer.from(buf));
        }
      }
    }

    // Direct fallback
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${req.params.fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (driveRes.ok) {
      const contentType = driveRes.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      const buf = await driveRes.arrayBuffer();
      return res.send(Buffer.from(buf));
    }

    res.status(404).send('Thumbnail not found');
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

app.get('/api/media', (req: Request, res: Response) => {
  const folder = req.query.folder as any;
  const assets = googleDriveService.getMediaByFolder(folder);
  const folders = googleDriveService.getFolderStructure();
  res.json({ folders, assets, authMode: googleDriveService.getAuthMode() });
});

app.post('/api/media', (req: Request, res: Response) => {
  const body = req.body;
  if (!body.name || !body.folderPath) {
    return res.status(400).json({ error: 'กรุณาระบุชื่อไฟล์และโฟลเดอร์ปลายทาง' });
  }

  const newAsset = googleDriveService.registerMedia({
    driveFileId: body.driveFileId || `DRIVE_${Date.now()}`,
    name: body.name,
    folderPath: body.folderPath,
    type: body.type || 'IMAGE',
    mimeType: body.mimeType || 'image/jpeg',
    sizeBytes: Number(body.sizeBytes || 1024000),
    productId: body.productId,
    thumbnailUrl: body.thumbnailUrl || body.previewUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    previewUrl: body.previewUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
    dimensions: body.dimensions || '1080x1080',
    durationSeconds: body.durationSeconds,
  });

  res.json(newAsset);
});

// ==========================================
// 5. CHARACTER LIBRARY (เจ๊อ๋อย)
// ==========================================
app.get('/api/characters', (req: Request, res: Response) => {
  res.json(db.getCharacters());
});

app.post('/api/characters', (req: Request, res: Response) => {
  const body = req.body;
  if (!body.name) {
    return res.status(400).json({ error: 'กรุณาระบุชื่อตัวละคร' });
  }

  const char: any = {
    id: body.id || `CHAR-${Date.now()}`,
    name: body.name,
    role: body.role || 'ตัวแทนร้าน',
    clothingRules: body.clothingRules || '',
    visualRules: body.visualRules || '',
    voiceRules: body.voiceRules || 'ภาษาไทยล้วน (THAI ONLY)',
    promptRules: body.promptRules || '',
    referenceImages: body.referenceImages || [],
    isActive: body.isActive !== false,
    createdAt: new Date().toISOString(),
  };

  db.saveCharacter(char);
  res.json(char);
});

// ==========================================
// 6. CONTENT FACTORY & AI PIPELINE
// ==========================================
app.get('/api/content-jobs', (req: Request, res: Response) => {
  const status = req.query.status as any;
  res.json(db.getContentJobs(status));
});

app.get('/api/content-jobs/:id', (req: Request, res: Response) => {
  const job = db.getContentJobById(req.params.id);
  if (!job) return res.status(404).json({ error: 'ไม่พบงานคอนเทนต์' });
  res.json(job);
});

app.post('/api/content-jobs', async (req: Request, res: Response) => {
  try {
    const { productId, contentType, creativeStyle, marketingObjective, characterId, rawMediaIds } = req.body;

    const product = db.getProductById(productId);
    if (!product) {
      return res.status(400).json({ error: 'ไม่พบสินค้าที่ระบุใน Product Master' });
    }

    const character = characterId ? db.getCharacterById(characterId) : undefined;
    const contentId = `CJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    let job: ContentJob = {
      id: contentId,
      productId: product.id,
      productName: product.name,
      priceNTD: product.priceNTD,
      contentType: (contentType as ContentType) || 'IMAGE_POST',
      creativeStyle: creativeStyle || 'รสชาติต้นตำรับไทยในไต้หวัน',
      marketingObjective: marketingObjective || 'แนะนำสินค้าและกระตุ้นการสั่งซื้อ',
      rawMediaIds: rawMediaIds || product.rawMediaIds || [],
      characterId: character?.id,
      status: 'GENERATING',
      caption: '',
      hashtags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.saveContentJob(job);

    db.addAuditLog({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: 'ผู้ดูแลระบบ (Admin)',
      contentId: job.id,
      action: 'AI_GENERATION_STARTED',
      result: 'SUCCESS',
      details: `เริ่มต้นผลิตคอนเทนต์ AI สำหรับ "${product.name}" (ราคา NT$ ${product.priceNTD})`,
    });

    // Step 1: Gemini Creative Brief
    const brief = await generateCreativeBrief(
      product,
      job.contentType,
      job.creativeStyle,
      job.marketingObjective,
      character
    );
    job.creativeBrief = brief;

    // Step 2: Gemini Caption
    const { caption, hashtags } = await generateCaption(product, brief, character);
    job.caption = caption;
    job.hashtags = hashtags;

    // Step 3: Creative Generation
    if (job.contentType === 'REEL') {
      const storyboard = await generateReelStoryboard(product, brief, character);
      job.reelStoryboard = storyboard;
      await getVideoGenerationProvider().createReelVideo(storyboard, product, character);
      job.creativePrompt = storyboard.finalVeoPrompt;
      job.generatedImageUrl = product.rawMediaIds[0]
        ? db.getMediaById(product.rawMediaIds[0])?.thumbnailUrl
        : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';
    } else {
      const sourceUrls = (job.rawMediaIds || []).map(id => db.getMediaById(id)?.previewUrl).filter(Boolean) as string[];
      const imageResult = await getImageCreativeProvider().generateAdCreative(product, brief, character, sourceUrls);
      job.generatedImageUrl = imageResult.imageUrl;
      job.creativePrompt = imageResult.creativePrompt;

      googleDriveService.registerMedia({
        driveFileId: `GEN_IMG_${job.id}`,
        name: `ad_${product.sku}_${Date.now()}.png`,
        folderPath: '02_GENERATED/01_AD_IMAGES',
        type: 'IMAGE',
        mimeType: 'image/png',
        sizeBytes: 2500000,
        productId: product.id,
        thumbnailUrl: imageResult.imageUrl,
        previewUrl: imageResult.imageUrl,
        dimensions: '1080x1080',
      });
    }

    // Step 4: Move to WAITING_APPROVAL
    job.status = 'WAITING_APPROVAL';
    job.updatedAt = new Date().toISOString();
    db.saveContentJob(job);

    db.addAuditLog({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: 'ระบบ AI Studio (Gemini)',
      contentId: job.id,
      action: 'AI_GENERATION_COMPLETED',
      result: 'SUCCESS',
      details: `สร้าง Creative Brief และสื่อโฆษณาเสร็จสมบูรณ์ พร้อมส่งเข้าศูนย์รอตรวจ (Waiting Approval)`,
    });

    res.json(job);
  } catch (err: any) {
    safeLogger.error('Content creation pipeline error:', err);
    res.status(500).json({ error: `เกิดข้อผิดพลาดในการสร้างคอนเทนต์: ${err.message}` });
  }
});

// Update Caption - With strict approval invalidation if modified after approval
app.post('/api/content-jobs/:id/caption', (req: Request, res: Response) => {
  const { caption, hashtags } = req.body;
  const job = db.getContentJobById(req.params.id);
  if (!job) return res.status(404).json({ error: 'ไม่พบงานคอนเทนต์' });

  // Security check: if content was already APPROVED or SCHEDULED, modifying it invalidates the approval!
  if (job.status === 'APPROVED' || job.status === 'SCHEDULED') {
    db.invalidateApprovalIfModified(job.id, { caption });
    db.addAuditLog({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: 'ผู้ดูแลระบบ (Admin)',
      contentId: job.id,
      action: 'EDITED_AFTER_APPROVAL',
      result: 'WARNING',
      details: `แก้ไขเนื้อหาแคปชั่นหลังการอนุมัติ: ระบบยกเลิกการอนุมัติเดิม และปรับสถานะกลับเป็น WAITING_APPROVAL`,
    });
  }

  job.caption = caption;
  if (Array.isArray(hashtags)) job.hashtags = hashtags;
  job.updatedAt = new Date().toISOString();
  db.saveContentJob(job);

  res.json(job);
});

// Regenerate content - Also invalidates any previous approval
app.post('/api/content-jobs/:id/regenerate', async (req: Request, res: Response) => {
  const job = db.getContentJobById(req.params.id);
  if (!job) return res.status(404).json({ error: 'ไม่พบงานคอนเทนต์' });

  const product = db.getProductById(job.productId);
  if (!product) return res.status(400).json({ error: 'ไม่พบข้อมูลสินค้า' });

  const character = job.characterId ? db.getCharacterById(job.characterId) : undefined;

  // Invalidate any approval
  job.approvalId = undefined;
  job.approvedSnapshot = undefined;
  job.scheduledAt = undefined;
  db.updateContentJobStatus(job.id, 'GENERATING');

  try {
    const brief = await generateCreativeBrief(
      product,
      job.contentType,
      job.creativeStyle,
      job.marketingObjective,
      character
    );
    job.creativeBrief = brief;

    const { caption, hashtags } = await generateCaption(product, brief, character);
    job.caption = caption;
    job.hashtags = hashtags;

    if (job.contentType === 'REEL') {
      const storyboard = await generateReelStoryboard(product, brief, character);
      job.reelStoryboard = storyboard;
      job.creativePrompt = storyboard.finalVeoPrompt;
    } else {
      const sourceUrls = (job.rawMediaIds || []).map(id => db.getMediaById(id)?.previewUrl).filter(Boolean) as string[];
      const imageResult = await getImageCreativeProvider().generateAdCreative(product, brief, character, sourceUrls);
      job.generatedImageUrl = imageResult.imageUrl;
      job.creativePrompt = imageResult.creativePrompt;
    }

    job.status = 'WAITING_APPROVAL';
    job.updatedAt = new Date().toISOString();
    db.saveContentJob(job);

    db.addAuditLog({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: 'ผู้ดูแลระบบ (Admin)',
      contentId: job.id,
      action: 'REGENERATED',
      result: 'SUCCESS',
      details: 'สั่งสร้างคอนเทนต์ใหม่อีกครั้งผ่าน Gemini AI (สถานะปรับเป็น WAITING_APPROVAL)',
    });

    res.json(job);
  } catch (err: any) {
    db.updateContentJobStatus(job.id, 'ERROR', { rejectionReason: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. APPROVAL CENTER - STRICT APPROVAL MODEL
// ==========================================
app.post('/api/content-jobs/:id/approve', (req: Request, res: Response) => {
  const job = db.getContentJobById(req.params.id);
  if (!job) return res.status(404).json({ error: 'ไม่พบงานคอนเทนต์' });

  const approvalId = `APPV-${Date.now()}`;
  const approvedVersion = (job.approvedVersion || 0) + 1;
  const approvedAt = new Date().toISOString();
  const approvedBy = 'ผู้ดูแลระบบ (Admin)';

  // Immutable approval snapshot to prevent tampering
  job.approvalId = approvalId;
  job.approvedVersion = approvedVersion;
  job.approvedAt = approvedAt;
  job.approvedBy = approvedBy;
  job.approvedSnapshot = {
    caption: job.caption,
    generatedImageUrl: job.generatedImageUrl,
    priceNTD: job.priceNTD,
    creativePrompt: job.creativePrompt,
  };
  job.status = 'APPROVED';
  job.updatedAt = approvedAt;
  db.saveContentJob(job);

  // Move media to 03_APPROVED
  if (job.generatedImageUrl) {
    googleDriveService.registerMedia({
      driveFileId: `APPROVED_${job.id}`,
      name: `approved_${job.productId}_v${approvedVersion}.png`,
      folderPath: '03_APPROVED',
      type: job.contentType === 'REEL' ? 'VIDEO' : 'IMAGE',
      mimeType: 'image/png',
      sizeBytes: 2800000,
      productId: job.productId,
      thumbnailUrl: job.generatedImageUrl,
      previewUrl: job.generatedImageUrl,
      dimensions: '1080x1080',
    });
  }

  db.addAuditLog({
    id: `LOG-${Date.now()}`,
    timestamp: approvedAt,
    user: approvedBy,
    contentId: job.id,
    action: 'APPROVED',
    result: 'SUCCESS',
    details: `อนุมัติคอนเทนต์ "${job.productName}" สำเร็จ (Approval ID: ${approvalId}, Version: ${approvedVersion}) พร้อมเข้าคิวตั้งเวลาโพสต์`,
    metadata: {
      approvalId,
      approvedVersion,
      priceNTD: job.priceNTD,
    },
  });

  res.json(job);
});

app.post('/api/content-jobs/:id/reject', (req: Request, res: Response) => {
  const { reason } = req.body;
  const job = db.getContentJobById(req.params.id);
  if (!job) return res.status(404).json({ error: 'ไม่พบงานคอนเทนต์' });

  job.status = 'REJECTED';
  job.approvalId = undefined;
  job.approvedSnapshot = undefined;
  job.rejectionReason = reason || 'ไม่อนุมัติโดยแอดมิน';
  job.updatedAt = new Date().toISOString();
  db.saveContentJob(job);

  db.addAuditLog({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: 'ผู้ดูแลระบบ (Admin)',
    contentId: job.id,
    action: 'REJECTED',
    result: 'WARNING',
    details: `ปฏิเสธคอนเทนต์ "${job.productName}": ${job.rejectionReason}`,
  });

  res.json(job);
});

// ==========================================
// 8. SCHEDULER & FACEBOOK PUBLISHING
// ==========================================
app.get('/api/scheduled', (req: Request, res: Response) => {
  res.json(db.getScheduledPosts());
});

app.post('/api/content-jobs/:id/schedule', (req: Request, res: Response) => {
  const { publishAt } = req.body;
  const job = db.getContentJobById(req.params.id);
  if (!job) return res.status(404).json({ error: 'ไม่พบงานคอนเทนต์' });

  // STRICT RULE: Only APPROVED content with a valid approval record can be scheduled
  if (job.status !== 'APPROVED') {
    return res.status(400).json({
      error: `กฎความปลอดภัย: คอนเทนต์ต้องได้รับการอนุมัติ (APPROVED) ก่อนตั้งเวลาโพสต์ (สถานะปัจจุบัน: ${job.status})`,
    });
  }

  if (!job.approvalId || !job.approvedVersion || !job.approvedAt) {
    return res.status(400).json({
      error: 'ไม่พบบันทึกการอนุมัติ (Approval Record) กรุณากดอนุมัติเนื้อหาใหม่อีกครั้ง',
    });
  }

  if (!publishAt) {
    return res.status(400).json({ error: 'กรุณาระบุวันและเวลาที่ต้องการโพสต์' });
  }

  const bangkokDate = new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(publishAt));

  const scheduledItem: ScheduledPost = {
    id: `SCHED-${Date.now()}`,
    contentId: job.id,
    publishAt,
    publishAtBangkok: `${bangkokDate} น.`,
    status: 'SCHEDULED',
    facebookPageId: config.facebook.pageId || 'UNCONFIGURED_PAGE',
    retryCount: 0,
    approvalId: job.approvalId,
    approvedVersion: job.approvedVersion,
    approvedAt: job.approvedAt,
    approvedBy: job.approvedBy || 'ผู้ดูแลระบบ (Admin)',
    createdAt: new Date().toISOString(),
  };

  db.saveScheduledPost(scheduledItem);

  job.status = 'SCHEDULED';
  job.scheduledAt = publishAt;
  job.updatedAt = new Date().toISOString();
  db.saveContentJob(job);

  db.addAuditLog({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: 'ผู้ดูแลระบบ (Admin)',
    contentId: job.id,
    action: 'SCHEDULED',
    result: 'SUCCESS',
    details: `ตั้งเวลาโพสต์สำหรับ "${job.productName}" ในวันที่ ${bangkokDate} น. (Approval ID: ${job.approvalId})`,
    metadata: {
      scheduledPostId: scheduledItem.id,
      approvalId: job.approvalId,
      approvedVersion: job.approvedVersion,
    },
  });

  res.json({ job, scheduledItem });
});

app.delete('/api/scheduled/:id', (req: Request, res: Response) => {
  const success = db.cancelScheduledPost(req.params.id);
  res.json({ success });
});

/**
 * Publish Now endpoint
 * STRICT ENFORCEMENT: Content must be APPROVED or SCHEDULED with matching approval snapshot
 */
app.post('/api/content-jobs/:id/publish-now', async (req: Request, res: Response) => {
  const { dryRun } = req.body;
  const job = db.getContentJobById(req.params.id);
  if (!job) return res.status(404).json({ error: 'ไม่พบงานคอนเทนต์' });

  // STRICT RULE: Backend verification
  if (job.status !== 'APPROVED' && job.status !== 'SCHEDULED') {
    return res.status(400).json({
      error: `ไม่สามารถโพสต์ได้: คอนเทนต์ยังไม่ได้รับการอนุมัติจากผู้ดูแลระบบ (สถานะปัจจุบัน: ${job.status})`,
    });
  }

  db.addAuditLog({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: 'ผู้ดูแลระบบ (Admin)',
    contentId: job.id,
    action: 'PUBLISH_ATTEMPTED',
    result: 'SUCCESS',
    details: `เริ่มส่งคำสั่งโพสต์ไปยัง Facebook (DryRun: ${Boolean(dryRun)})`,
  });

  try {
    const result = await facebookPublishingService.publishContent(job, dryRun === true);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. PUBLISHED POSTS & 72-HOUR PERFORMANCE
// ==========================================
app.get('/api/published', (req: Request, res: Response) => {
  res.json(db.getPublishedPosts());
});

app.post('/api/published/:id/evaluate', async (req: Request, res: Response) => {
  const { forceRecheck } = req.body;
  const publishedList = db.getPublishedPosts();
  const post = publishedList.find(
    p => p.id === req.params.id || p.contentId === req.params.id || p.facebookPostId === req.params.id
  );
  if (!post) {
    return res.status(404).json({ error: 'ไม่พบข้อมูลโพสต์ที่เผยแพร่' });
  }

  try {
    const result = await performanceCollector.evaluatePost(post, forceRecheck === true);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/performance', (req: Request, res: Response) => {
  const checks = db.getPerformanceChecks();
  const published = db.getPublishedPosts();

  let totalReach = 0;
  let totalImpressions = 0;
  let totalEngagement = 0;
  for (const c of checks) {
    totalReach += c.reach;
    totalImpressions += c.impressions;
    totalEngagement += c.engagement;
  }
  const avgEngagementRate =
    checks.length > 0
      ? Number((checks.reduce((acc, c) => acc + c.engagementRate, 0) / checks.length).toFixed(2))
      : 0;

  res.json({
    metrics: {
      totalAnalyzed: checks.length,
      totalPublished: published.length,
      pendingAnalysis: published.filter(p => !p.isPerformanceChecked).length,
      totalReach,
      totalImpressions,
      totalEngagement,
      avgEngagementRate,
    },
    checks,
  });
});

app.get('/api/content-intelligence', (req: Request, res: Response) => {
  res.json(contentIntelligenceService.getIntelligenceData());
});

// ==========================================
// 10. NOTIFICATIONS & CRON TRIGGERS
// ==========================================
app.get('/api/notifications', (req: Request, res: Response) => {
  res.json(db.getLineNotifications());
});

app.post('/api/cron/daily-approval-summary', async (req: Request, res: Response) => {
  try {
    const result = await lineNotificationService.sendDailyApprovalSummary();
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cron/check-72h-performance', async (req: Request, res: Response) => {
  try {
    const results = await performanceCollector.checkAllDuePosts();
    res.json({ success: true, count: results.length, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 11. AUDIT LOGS & SETTINGS
// ==========================================
app.get('/api/audit-logs', (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  res.json(db.getAuditLogs(limit));
});

app.get('/api/settings', (req: Request, res: Response) => {
  res.json(db.getSettings());
});

app.post('/api/settings', (req: Request, res: Response) => {
  // Sanitize patch before storing
  const safePatch = redactObject(req.body);
  const updated = db.updateSettings(safePatch);
  res.json(updated);
});

// ==========================================
// 12. LINE MESSAGING API & WEBHOOK
// ==========================================

/**
 * Public LINE Webhook Endpoint
 * Receives signed events from LINE Messaging API.
 * Strictly verifies x-line-signature with LINE_CHANNEL_SECRET using HMAC-SHA256.
 */
app.post('/api/line/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['x-line-signature'] as string;
  if (!signature) {
    safeLogger.warn('LINE Webhook rejected: Missing x-line-signature header');
    db.recordLineWebhookError('Missing x-line-signature header');
    return res.status(401).json({ error: 'Missing x-line-signature header' });
  }

  const channelSecret = config.line.channelSecret;
  if (!channelSecret) {
    safeLogger.error('LINE Webhook rejected: LINE_CHANNEL_SECRET is not configured on the server');
    db.recordLineWebhookError('LINE_CHANNEL_SECRET not configured');
    return res.status(500).json({ error: 'LINE_CHANNEL_SECRET not configured' });
  }

  try {
    const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
    const expectedSignature = crypto
      .createHmac('SHA256', channelSecret)
      .update(rawBody)
      .digest('base64');

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      safeLogger.warn('LINE Webhook signature verification failed: Invalid signature');
      db.recordLineWebhookError('Invalid x-line-signature');
      return res.status(401).json({ error: 'Invalid LINE signature' });
    }

    // Signature is cryptographically verified!
    db.recordLineWebhookSuccess();
    const { events } = req.body;
    safeLogger.info(`LINE Webhook verified: ${events?.length || 0} events received`);

    if (Array.isArray(events)) {
      for (const event of events) {
        try {
          await lineNotificationService.handleWebhookEvent(event);
        } catch (eventErr: any) {
          safeLogger.error('Error handling LINE webhook event:', eventErr.message);
        }
      }
    }

    // LINE requires immediate 200 OK response
    res.status(200).send('OK');
  } catch (err: any) {
    safeLogger.error('LINE Webhook error:', err.message);
    db.recordLineWebhookError(err.message);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

/**
 * Get LIVE LINE Integration Status
 */
app.get('/api/line/status', async (req: Request, res: Response) => {
  try {
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;
    const reqBaseUrl = host ? `${proto}://${host}` : undefined;
    const statusData = await lineNotificationService.testConnection(reqBaseUrl);
    res.json(statusData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 13. INTEGRATION TESTS (SAFE & REDACTED)
// ==========================================
app.post('/api/test/gemini', async (req: Request, res: Response) => {
  const result = await testGeminiConnection();
  res.json(result);
});

app.post('/api/test/facebook', async (req: Request, res: Response) => {
  const result = await facebookPublishingService.testConnection();
  res.json(result);
});

app.post('/api/test/line', async (req: Request, res: Response) => {
  try {
    const result = await lineNotificationService.sendTestMessage();
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// FRONTEND SERVING (VITE DEV / PRODUCTION)
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    safeLogger.info(`====================================================`);
    safeLogger.info(` KK Shop Content Studio (ร้านขอนแก่น ไต้หวัน)`);
    safeLogger.info(` Full-Stack Server running at: http://0.0.0.0:${PORT}`);
    safeLogger.info(` Timezone: Asia/Bangkok (UTC+7) | Currency: NT$`);
    safeLogger.info(` Safety Switch (FACEBOOK_PUBLISHING_ENABLED): ${config.facebook.publishingEnabled}`);
    safeLogger.info(`====================================================`);
  });
}

startServer().catch(err => {
  safeLogger.error('Fatal error starting server:', err);
});
