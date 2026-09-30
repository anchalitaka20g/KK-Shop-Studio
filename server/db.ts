/**
 * KK Shop Content Studio - Data Store & Persistence Layer
 * Simulates Firestore collections with local persistence
 */

import fs from 'fs';
import path from 'path';
import { redactObject } from './utils/redact.js';
import {
  Product,
  MediaAsset,
  Character,
  ContentJob,
  ScheduledPost,
  PublishedPost,
  PerformanceCheck,
  AuditLogEntry,
  LineNotificationRecord,
  SystemSettings,
  LineConnectionStatus,
  AuditAction,
  ContentStatus
} from './types.js';

interface DatabaseSchema {
  products: Product[];
  mediaAssets: MediaAsset[];
  characters: Character[];
  contentJobs: ContentJob[];
  scheduledPosts: ScheduledPost[];
  publishedPosts: PublishedPost[];
  performanceChecks: PerformanceCheck[];
  auditLogs: AuditLogEntry[];
  lineNotifications: LineNotificationRecord[];
  settings: SystemSettings;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

const isDemoMode = process.env.DEMO_MODE === 'true';

// Demo datasets (available ONLY when DEMO_MODE=true)
const demoProducts: Product[] = [
  {
    id: 'PROD-KK-01',
    sku: 'TH-PLA-001',
    name: 'ปลาร้าต้มสุกปรุงรส ตราแม่บุญล้ำ (เจ้าเก่า)',
    priceNTD: 95,
    unit: 'ขวด',
    size: '400 มล.',
    category: 'น้ำพริก/ปลาร้า',
    cost: 55,
    orderCount: 142,
    quantitySold: 480,
    salesTotal: 45600,
    temperatureType: 'NORMAL',
    aliases: ['ปลาร้าแม่บุญล้ำ', 'น้ำปลาร้าส้มตำ', 'ปลาร้าฝาส้ม'],
    rawMediaIds: ['DRIVE-RAW-001', 'DRIVE-RAW-002'],
    inStock: true,
    origin: 'ประเทศไทย (กาฬสินธุ์)',
    description: 'ปลาร้าต้มสุกสูตรดั้งเดิม หอมโหน่ง เข้มข้น นัวถึงใจ ไม่เหม็นคาว เหมาะกับส้มตำ ยำทุกชนิด',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'PROD-KK-02',
    sku: 'TH-KAP-002',
    name: 'กะปิแท้เคยแท้ 100% ระนอง ตรากุ้งไทย',
    priceNTD: 130,
    unit: 'กระปุก',
    size: '500 กรัม',
    category: 'เครื่องปรุงรส',
    cost: 75,
    orderCount: 88,
    quantitySold: 210,
    salesTotal: 27300,
    temperatureType: 'NORMAL',
    aliases: ['กะปิระนอง', 'เคยแท้', 'กะปิกุ้งเคย'],
    rawMediaIds: ['DRIVE-RAW-003'],
    inStock: true,
    origin: 'ประเทศไทย (ระนอง)',
    description: 'เคยแท้เกรดเอ กลิ่นหอมธรรมชาติ ไม่เค็มโดด ตำน้ำพริกกะปิขึ้นเงา แกงเลียงแกงส้มอร่อยเลิศ',
    createdAt: '2026-08-05T10:00:00Z',
    updatedAt: '2026-09-22T10:00:00Z',
  },
  {
    id: 'PROD-KK-03',
    sku: 'TH-YOO-003',
    name: 'หมูยออุบลแท้สูตรโบราณ (พริกไทยดำ) แช่เย็น',
    priceNTD: 160,
    unit: 'แท่ง',
    size: '450 กรัม',
    category: 'ของสดแช่เย็น',
    cost: 95,
    orderCount: 165,
    quantitySold: 520,
    salesTotal: 83200,
    temperatureType: 'CHILLED',
    aliases: ['หมูยออุบล', 'หมูยอหนัง', 'หมูยอพริกไทยดำ'],
    rawMediaIds: ['DRIVE-RAW-004', 'DRIVE-RAW-005'],
    inStock: true,
    origin: 'ประเทศไทย (อุบลราชธานี)',
    description: 'หมูล้วนไร้แป้ง หอมพริกไทยดำสวน เนื้อเด้งกรอบ นึ่ง ทอด หรือใส่ยำหมูยอแซ่บสะท้านลิ้น',
    createdAt: '2026-08-10T10:00:00Z',
    updatedAt: '2026-09-25T10:00:00Z',
  },
  {
    id: 'PROD-KK-04',
    sku: 'TH-MMA-004',
    name: 'มาม่ารสต้มยำกุ้งน้ำข้น แพ็ค 10 ซอง',
    priceNTD: 150,
    unit: 'แพ็ค',
    size: '10 ซอง (550 กรัม)',
    category: 'อาหารสำเร็จรูป',
    cost: 90,
    orderCount: 310,
    quantitySold: 980,
    salesTotal: 147000,
    temperatureType: 'NORMAL',
    aliases: ['มาม่าต้มยำกุ้ง', 'มาม่าน้ำข้น', 'บะหมี่สำเร็จรูป'],
    rawMediaIds: ['DRIVE-RAW-006'],
    inStock: true,
    origin: 'ประเทศไทย',
    description: 'รสชาติอันดับหนึ่งของคนไทยในต่างแดน ซุปต้มยำเข้มข้น หอมมะนาวและพริกเผาแท้',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-09-28T10:00:00Z',
  },
  {
    id: 'PROD-KK-05',
    sku: 'TH-KAP-005',
    name: 'เครื่องแกงไตปลาพัทลุงสูตรดั้งเดิม',
    priceNTD: 85,
    unit: 'ซอง',
    size: '250 กรัม',
    category: 'เครื่องปรุงรส',
    cost: 45,
    orderCount: 72,
    quantitySold: 180,
    salesTotal: 15300,
    temperatureType: 'NORMAL',
    aliases: ['พริกแกงไตปลา', 'พริกแกงใต้', 'ไตปลาแห้ง'],
    rawMediaIds: ['DRIVE-RAW-007'],
    inStock: true,
    origin: 'ประเทศไทย (พัทลุง)',
    description: 'เครื่องแกงใต้แท้ พริกไทยดำหอมฉุน เผ็ดร้อนถึงใจ ใส่ปลาซาบะหรือผักสดทำแกงไตปลาแบบใต้แท้',
    createdAt: '2026-08-15T10:00:00Z',
    updatedAt: '2026-09-18T10:00:00Z',
  },
  {
    id: 'PROD-KK-06',
    sku: 'TH-KAP-006',
    name: 'ใบกะเพราไทยสดนำเข้าทางเครื่องบิน',
    priceNTD: 120,
    unit: 'กล่อง',
    size: '200 กรัม',
    category: 'ของสดแช่เย็น',
    cost: 70,
    orderCount: 220,
    quantitySold: 640,
    salesTotal: 76800,
    temperatureType: 'CHILLED',
    aliases: ['กะเพราไทย', 'กะเพราป่า', 'กะเพราแดง'],
    rawMediaIds: ['DRIVE-RAW-008'],
    inStock: true,
    origin: 'ประเทศไทย (บินตรงทุกวันพุธ)',
    description: 'ใบกะเพราบ้านพันธุ์ไทยแท้ กลิ่นหอมฉุนร้อนแรง แตกต่างจากโหระพาไต้หวันอย่างสิ้นเชิง ผัดกะเพราสูตรโบราณ',
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-29T10:00:00Z',
  },
  {
    id: 'PROD-KK-07',
    sku: 'TH-CHA-007',
    name: 'ชาตรามือ สีทอง ชาไทยปรุงสำเร็จ ชนิดผง',
    priceNTD: 180,
    unit: 'ถุง',
    size: '400 กรัม',
    category: 'เครื่องดื่ม',
    cost: 110,
    orderCount: 195,
    quantitySold: 410,
    salesTotal: 73800,
    temperatureType: 'NORMAL',
    aliases: ['ชาตรามือทอง', 'ชาเย็นไทย', 'ชาส้มไทย'],
    rawMediaIds: ['DRIVE-RAW-009'],
    inStock: true,
    origin: 'ประเทศไทย',
    description: 'ใบชาคัดพิเศษ หอมละมุน ชงชาไทยใส่นมข้นหวาน หวานมันกลมกล่อม ชื่นใจคลายร้อน',
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-09-27T10:00:00Z',
  },
  {
    id: 'PROD-KK-08',
    sku: 'TH-ISN-008',
    name: 'ไส้กรอกอีสานหมูเปรี้ยว ตราครูพรรณี แช่แข็ง',
    priceNTD: 190,
    unit: 'แพ็ค',
    size: '500 กรัม (10 ลูก)',
    category: 'สินค้าแช่แข็ง',
    cost: 115,
    orderCount: 140,
    quantitySold: 380,
    salesTotal: 72200,
    temperatureType: 'FROZEN',
    aliases: ['ไส้กรอกอีสาน', 'ไส้กรอกหมูเปรี้ยว', 'ไส้กรอกย่าง'],
    rawMediaIds: ['DRIVE-RAW-010'],
    inStock: true,
    origin: 'ประเทศไทย (ขอนแก่น)',
    description: 'ไส้กรอกหมูวุ้นเส้น รสเปรี้ยวกำลังดี ทอดหรือเข้าหม้อทอดไร้น้ำมัน ทานแกล้มขิงดอง พริกสด และกะหล่ำปลี',
    createdAt: '2026-08-25T10:00:00Z',
    updatedAt: '2026-09-28T10:00:00Z',
  }
];

const initialCharacters: Character[] = [
  {
    id: 'CHAR-JAO-OY',
    name: 'เจ๊อ๋อย',
    role: 'เจ้าของร้านขอนแก่น / Host',
    clothingRules: 'เสื้อยืดร้านขอนแก่น / ผ้ากันเปื้อนสีแดง พร้อมกระเป๋าคาดเอวเก็บเงิน',
    visualRules: 'รอยยิ้มสดใส ท่าทางคล่องแคล่ว มีพลัง เป็นมิตร',
    voiceRules: 'ภาษาไทยสำเนียงอีสานอบอุ่น ทักทาย "สูเอ๊ย", "พี่น้องชาวเรา"',
    promptRules: 'Authentic Thai grocery shop owner, friendly warm Isan smile, commercial grocery setting',
    referenceImages: [], // Strictly no placeholder images
    status: 'REFERENCE_REQUIRED',
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
  }
];

const demoMediaAssets: MediaAsset[] = [
  {
    id: 'DRIVE-RAW-001',
    driveFileId: '1AbC_PLARAA_FRONT_001',
    name: 'plara_maeboonlum_front.jpg',
    folderPath: '01_RAW/01_PRODUCT_IMAGES',
    type: 'IMAGE',
    mimeType: 'image/jpeg',
    sizeBytes: 1845200,
    productId: 'PROD-KK-01',
    thumbnailUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1200&q=80',
    dimensions: '1920x1920',
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'DRIVE-RAW-002',
    driveFileId: '1AbC_PLARAA_SOMTUM_002',
    name: 'plara_somtum_lifestyle.jpg',
    folderPath: '01_RAW/02_RAW_PHOTOS',
    type: 'IMAGE',
    mimeType: 'image/jpeg',
    sizeBytes: 2450000,
    productId: 'PROD-KK-01',
    thumbnailUrl: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=600&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=1200&q=80',
    dimensions: '2048x1536',
    createdAt: '2026-09-05T09:30:00Z',
  },
  {
    id: 'DRIVE-RAW-003',
    driveFileId: '1AbC_KAPI_RANONG_003',
    name: 'kapi_ranong_jar.jpg',
    folderPath: '01_RAW/01_PRODUCT_IMAGES',
    type: 'IMAGE',
    mimeType: 'image/jpeg',
    sizeBytes: 1532000,
    productId: 'PROD-KK-02',
    thumbnailUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=1200&q=80',
    dimensions: '1600x1600',
    createdAt: '2026-09-10T11:00:00Z',
  },
  {
    id: 'DRIVE-RAW-004',
    driveFileId: '1AbC_MHOOYOO_UBON_004',
    name: 'mhooyoo_stick.jpg',
    folderPath: '01_RAW/01_PRODUCT_IMAGES',
    type: 'IMAGE',
    mimeType: 'image/jpeg',
    sizeBytes: 1980000,
    productId: 'PROD-KK-03',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    dimensions: '1800x1800',
    createdAt: '2026-09-12T14:10:00Z',
  },
  {
    id: 'DRIVE-RAW-005',
    driveFileId: '1AbC_MHOOYOO_VIDEO_005',
    name: 'mhooyoo_slicing_raw.mp4',
    folderPath: '01_RAW/03_RAW_VIDEOS',
    type: 'VIDEO',
    mimeType: 'video/mp4',
    sizeBytes: 14200000,
    productId: 'PROD-KK-03',
    thumbnailUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
    durationSeconds: 12,
    dimensions: '1080x1920',
    createdAt: '2026-09-15T15:20:00Z',
  },
  {
    id: 'DRIVE-RAW-006',
    driveFileId: '1AbC_MAMA_PACK_006',
    name: 'mama_tomyum_pack.jpg',
    folderPath: '01_RAW/01_PRODUCT_IMAGES',
    type: 'IMAGE',
    mimeType: 'image/jpeg',
    sizeBytes: 2100000,
    productId: 'PROD-KK-04',
    thumbnailUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=1200&q=80',
    dimensions: '1920x1920',
    createdAt: '2026-09-18T09:00:00Z',
  },
  {
    id: 'DRIVE-RAW-008',
    driveFileId: '1AbC_KRAPAO_LEAF_008',
    name: 'fresh_holy_basil_thai.jpg',
    folderPath: '01_RAW/02_RAW_PHOTOS',
    type: 'IMAGE',
    mimeType: 'image/jpeg',
    sizeBytes: 2890000,
    productId: 'PROD-KK-06',
    thumbnailUrl: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=600&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=1200&q=80',
    dimensions: '2048x1536',
    createdAt: '2026-09-22T08:00:00Z',
  },
  {
    id: 'DRIVE-GEN-001',
    driveFileId: '2AbC_AD_PLARAA_001',
    name: 'ad_creatives_plaraa_sep.png',
    folderPath: '02_GENERATED/01_AD_IMAGES',
    type: 'IMAGE',
    mimeType: 'image/png',
    sizeBytes: 3120000,
    productId: 'PROD-KK-01',
    thumbnailUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
    dimensions: '1080x1080',
    createdAt: '2026-09-28T14:00:00Z',
  }
];

const demoContentJobs: ContentJob[] = [
  {
    id: 'CJ-20260930-001',
    productId: 'PROD-KK-01',
    productName: 'ปลาร้าต้มสุกปรุงรส ตราแม่บุญล้ำ (เจ้าเก่า)',
    priceNTD: 95,
    contentType: 'IMAGE_POST',
    creativeStyle: 'อบอุ่นคิดถึงบ้าน อาหารอีสานแท้',
    marketingObjective: 'กระตุ้นยอดขายสินค้าประจำ และโปรสินค้าเข้าใหม่',
    rawMediaIds: ['DRIVE-RAW-001', 'DRIVE-RAW-002'],
    characterId: 'CHAR-01',
    status: 'WAITING_APPROVAL',
    creativeBrief: {
      productId: 'PROD-KK-01',
      productName: 'ปลาร้าต้มสุกปรุงรส ตราแม่บุญล้ำ (เจ้าเก่า)',
      priceNTD: 95,
      category: 'น้ำพริก/ปลาร้า',
      mainSellingPoint: 'ปลาร้าต้มสุก กลิ่นหอมนัว ไม่เหม็นคาว ตำส้มตำรสชาติเหมือนนั่งกินที่ขอนแก่น',
      targetAudience: 'คนไทยและแรงงานไทยในไต้หวัน ที่คิดถึงรสชาติส้มตำอีสานแท้ๆ',
      contentObjective: 'กระตุ้นการสั่งซื้อส่งตรงถึงหอพัก/บ้านทั่วไต้หวัน',
      creativeConcept: 'เจ๊อ๋อยชวนตำส้มตำคลายเหงา ตำรับขอนแก่นแท้ขวดละ 95 ดอลล่าร์ไต้หวัน',
      headline: 'น้ำปลาร้าแม่บุญล้ำขวดนี้... กลิ่นความสุขส่งตรงถึงไต้หวันแล้วจ้า!',
      supportingText: 'ส้มตำจานโปรดจะขาดปลาร้าแท้ไปได้ยังไง! ขวดละ NT$95 นัวถึงใจ ไม่ต้องแบกข้ามน้ำข้ามทะเลมาเอง',
      cta: 'ทักแชทสั่งเจ๊อ๋อยตอนนี้ ส่งด่วน 7-ELEVEN / FamilyMart ทั่วไต้หวัน!',
      recommendedContentType: 'IMAGE_POST',
      recommendedVisualStyle: 'ภาพส้มตำแซ่บๆ โทนสีอบอุ่น พร้อมขวดปลาร้าและป้ายราคา NT$95 เด่นชัด',
      captionConcept: 'ความนัวที่คุ้นเคย กลิ่นหอมปลาร้าต้มสุกแท้จากบ้านเกิด',
      hashtags: ['#ร้านขอนแก่นในไต้หวัน', '#KKShopTaiwan', '#ปลาร้าแม่บุญล้ำ', '#ของกินไทยในไต้หวัน', '#คนไทยในไต้หวัน'],
      characterId: 'CHAR-01',
    },
    generatedImageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    creativePrompt: 'Authentic Thai papaya salad somtum platter with a bottle of Mae Boonlum fermented fish sauce, appetizing red chili, lime, sticky rice, Thai supermarket grocery style in Taiwan, clear price badge NT$95, warm appetizing lighting',
    caption: `สูเอ๊ยยย! ใครกำลังเหงาปาก คิดถึงกลิ่นส้มตำนัวๆ ฝีมือแม่ที่บ้าน 🌶️🇹🇼\n\nปลาร้าแม่บุญล้ำ (เจ้าเก่า) ล็อตใหม่เพิ่งลงเครื่องสดๆ ร้อนๆ ที่ร้านขอนแก่นแล้วเด้อ! 💥\n\n✅ ต้มสุก สะอาด ปลอดภัย\n✅ หอมนัวลึก ไม่เหม็นคาว\n✅ ตำส้มตำ แกงอ่อม ยำขนมจีน นัวสะท้านลิ้น\n\n💰 ขวดละ NT$ 95 เท่านั้น!\n📦 มีบริการส่งทั่วเกาะไต้หวัน รับที่ 7-11 หรือ FamilyMart ใกล้หอพักได้เลยจ้า\n\n👉 ทักแชท Inbox เพจร้านขอนแก่นได้เลย เจ๊อ๋อยรอแพ็คให้อยู่น้าาา! ❤️`,
    hashtags: ['#ร้านขอนแก่น', '#KKShop', '#ของกินไทยในไต้หวัน', '#คนไทยในไต้หวัน', '#ปลาร้าแม่บุญล้ำ', '#คิดถึงอาหารไทย'],
    createdAt: '2026-09-29T14:30:00Z',
    updatedAt: '2026-09-29T14:30:00Z',
  },
  {
    id: 'CJ-20260929-002',
    productId: 'PROD-KK-03',
    productName: 'หมูยออุบลแท้สูตรโบราณ (พริกไทยดำ) แช่เย็น',
    priceNTD: 160,
    contentType: 'REEL',
    creativeStyle: 'คลิปสั้นกระชับ สนุกสนาน ASMR เสียงหั่นเนื้อเด้ง',
    marketingObjective: 'ชูจุดเด่นหมูล้วนไร้แป้ง และความสดใหม่นำเข้า',
    rawMediaIds: ['DRIVE-RAW-004', 'DRIVE-RAW-005'],
    characterId: 'CHAR-01',
    status: 'WAITING_APPROVAL',
    creativeBrief: {
      productId: 'PROD-KK-03',
      productName: 'หมูยออุบลแท้สูตรโบราณ (พริกไทยดำ) แช่เย็น',
      priceNTD: 160,
      category: 'ของสดแช่เย็น',
      mainSellingPoint: 'หมูล้วนเนื้อเด้ง หอมพริกไทยดำอุบลแท้ๆ ไม่ผสมแป้ง หั่นทอดกรอบหรือยำแซ่บสะใจ',
      targetAudience: 'พี่น้องคนไทยในโรงงานและแม่บ้านไทยในไต้หวัน ที่อยากทำกับแกล้มหรือยำแซ่บๆ ทาน',
      contentObjective: 'สร้างกระแส Reels โชว์เนื้อสัมผัสเด้งกรอบ ชวนคอมเมนต์และทักสั่ง',
      creativeConcept: 'หั่นหมูยอเสียงกรอบเด้ง เจ๊อ๋อยท้าลองหมูยอไร้แป้งจากอุบล',
      headline: 'หมูยออุบลแท้ในไต้หวัน! เนื้อเด้ง ไร้แป้ง พริกไทยดำหอมเตะจมูก',
      supportingText: 'แท่งใหญ่ 450 กรัม เพียง NT$160 เก็บแช่เย็นไว้ทำยำหรือทอดกินแกล้มข้าวเหนียวร้อนๆ',
      cta: 'คอมเมนต์ "หมูยอ" หรือกดส่งข้อความ สั่งส่งถึงหอพักได้ทันที!',
      recommendedContentType: 'REEL',
      recommendedVisualStyle: 'Reel แนวตั้ง 9:16 โคลสอัพมีดหั่นหมูยอเสียงดังกริ๊บ เนื้อแน่นฉ่ำ',
      captionConcept: 'กับแกล้มคืนนี้ไม่ต้องคิดเยอะ หมูยออุบลทอดจิ้มซอสพริกแซ่บๆ',
      hashtags: ['#หมูยออุบล', '#ร้านขอนแก่นไต้หวัน', '#KKShop', '#Reelsไทยในไต้หวัน'],
      characterId: 'CHAR-01',
    },
    reelStoryboard: {
      hook: 'อย่าเพิ่งเลื่อนผ่าน! ถ้ายังไม่ได้ยินเสียงหั่นหมูยอแท่งนี้!',
      storyConcept: 'เจ๊อ๋อยโชว์หั่นหมูยออุบลแท้ๆ ชิ้นหนาเตอะ ดังกริ๊บ ไร้แป้ง หอมพริกไทยดำ',
      durationSeconds: 10,
      aspectRatio: '9:16',
      resolution: '720p',
      scenes: [
        {
          sceneNumber: 1,
          timeRange: '0:00 - 0:03',
          durationSeconds: 3,
          visualPrompt: 'Vertical 9:16 close up shot, sharp knife cutting thick slices of authentic Thai pork sausage on wooden board, pork texture bounces back',
          cameraInstruction: 'Macro zoom-in with slight slow motion, tracking blade down',
          characterAction: 'เจ๊อ๋อยถือมีดหั่นหมูยอดังกริ๊บ ยิ้มกว้างมองกล้อง',
          thaiDialogue: 'สูเอ๊ยยย! ฟังเสียงนี้ให้ดีๆ หมูยออุบลแท้เนื้อเด้งดึ๋ง!',
          soundInstruction: 'Crisp ASMR cutting sound on wooden cutting board, juicy squeak',
          bgmInstruction: 'Upbeat modern Thai folk isan beat with catchy bassline'
        },
        {
          sceneNumber: 2,
          timeRange: '0:03 - 0:07',
          durationSeconds: 4,
          visualPrompt: 'Medium shot inside Thai grocery aisle, Je Oy holding whole 450g chilled roll showing dark peppercorn spots',
          cameraInstruction: 'Dynamic push-in to product label and price tag NT$160',
          characterAction: 'บิหมูยอให้ดูเนื้อหมูล้วนไร้แป้ง ส่งเข้าปากเคี้ยวฟินๆ',
          thaiDialogue: 'หมูล้วนไร้แป้ง พริกไทยดำอุบลแท้ๆ แท่งใหญ่สะใจ NT$160 เท่านั้น!',
          soundInstruction: 'Crunch and sizzle effect',
          bgmInstruction: 'Energetic rhythm building up'
        },
        {
          sceneNumber: 3,
          timeRange: '0:07 - 0:10',
          durationSeconds: 3,
          visualPrompt: 'End card graphic with KK Shop logo, 7-11 and FamilyMart pickup icons, WhatsApp and Messenger buttons',
          cameraInstruction: 'Static high-contrast text overlay with subtle pulse animation',
          characterAction: 'เจ๊อ๋อยกวักมือเรียก ยิ้มหวานชูป้ายแชท',
          thaiDialogue: 'ทักแชทร้านขอนแก่นด่วน ส่งไวทั่วไต้หวันจ้า!',
          soundInstruction: 'Bell chime ding sound',
          bgmInstruction: 'Punchy finishing sting'
        }
      ],
      finalVeoPrompt: 'Cinematic 9:16 vertical video of Thai grocery store in Taiwan. Close up of knife cutting authentic steamed pork sausage with peppercorn on wooden board. Warm cozy lighting, 720p quality, lively vibrant Thai market atmosphere.',
      googleFlowPrompt: 'Prompt for Google Flow Video Generation:\nModel: Veo 9:16 Vertical Reel\nSubject: Authentic Thai pork sausage (Moo Yor Ubon) cutting ASMR and cheerful Thai store owner Je Oy holding product with NT$160 price tag in Taiwan grocery shop.\nStyle: Crisp commercial quality, vivid appetizing colors, 10 seconds duration.',
      hasDirectVeoApi: false,
    },
    caption: `ดึกแล้วหิวบ่? ทอดหมูยออุบลหอมๆ สักจานมั้ยจ๊ะ! 🐷🇹🇼\n\nหมูยออุบลแท้ส่งตรงถึงไต้หวัน เนื้อหมูเน้นๆ ไร้แป้ง หอมพริกไทยดำแท้ๆ กัดตรงไหนก็ฟิน!\n\nแท่งใหญ่ 450 กรัม เพียง NT$ 160\nทอดก็เด้ง ยำก็แซ่บ นึ่งจิ้มซีฟู้ดก็เลิศ!\n\n📍 สั่งง่ายๆ ทัก Inbox ร้านขอนแก่นได้เลย มีส่งสะดวกรับที่ร้านสะดวกซื้อทั่วไต้หวันจ้า`,
    hashtags: ['#หมูยออุบล', '#ร้านขอนแก่นไต้หวัน', '#KKShop', '#อาหารไทยในไต้หวัน', '#คนไทยในไต้หวัน'],
    createdAt: '2026-09-28T16:00:00Z',
    updatedAt: '2026-09-28T16:00:00Z',
  },
  {
    id: 'CJ-20260927-003',
    productId: 'PROD-KK-06',
    productName: 'ใบกะเพราไทยสดนำเข้าทางเครื่องบิน',
    priceNTD: 120,
    contentType: 'IMAGE_POST',
    creativeStyle: 'สินค้าเข้าใหม่ สดจากไร่ บินตรงสู่ไต้หวัน',
    marketingObjective: 'แจ้งสินค้าสดเข้าประจำสัปดาห์ (วันพุธ)',
    rawMediaIds: ['DRIVE-RAW-008'],
    characterId: 'CHAR-01',
    status: 'APPROVED',
    creativeBrief: {
      productId: 'PROD-KK-06',
      productName: 'ใบกะเพราไทยสดนำเข้าทางเครื่องบิน',
      priceNTD: 120,
      category: 'ของสดแช่เย็น',
      mainSellingPoint: 'กะเพราไทยแท้ กลิ่นหอมฉุนร้อนแรง ไม่ใช่โหระพา ผัดกะเพราหอมฟุ้งทั้งตึก',
      targetAudience: 'คนไทยที่ทำอาหารกินเองในไต้หวัน เบื่อกะเพราเลียนแบบ',
      contentObjective: 'แจ้งรอบของสดเข้าทุกวันพุธ และปิดยอดสั่งจองล่วงหน้า',
      creativeConcept: 'ผัดกะเพราแท้ต้องใช้กะเพราไทย บินตรงสดๆ ถึงร้านขอนแก่นแล้ว',
      headline: 'หมดปัญหาผัดกะเพราแต่ได้กลิ่นโหระพา! กะเพราไทยแท้บินตรงถึงไต้หวันแล้ว!',
      supportingText: 'ใบกะเพราป่าไทยแท้ กลิ่นหอมฉุนสะใจ กล่องละ NT$120 มีจำนวนจำกัดในแต่ละสัปดาห์',
      cta: 'รีบจองก่อนหมด ทักแชทสั่งด่วน!',
      recommendedContentType: 'IMAGE_POST',
      recommendedVisualStyle: 'ภาพใบกะเพราเขียวสดประกบกับจานผัดกะเพราหมูสับไข่ดาวเยิ้มๆ ป้ายราคา NT$120 ชัดเจน',
      captionConcept: 'กลิ่นหอมกะเพราแท้ที่ทุกคนตามหาในไต้หวัน',
      hashtags: ['#กะเพราไทยแท้', '#ผักสดไทยในไต้หวัน', '#ร้านขอนแก่น'],
      characterId: 'CHAR-01'
    },
    generatedImageUrl: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=800&q=80',
    caption: `ใครอยู่ไต้หวันแล้วคิดถึงผัดกะเพราแท้ๆ ยกมือขึ้น! 🙋‍♀️🌿🇹🇼\n\nเบื่อมั้ยสั่งผัดกะเพราแล้วได้ใบโหระพามาแทน? วันนี้เจ๊อ๋อยจัดให้แล้วจ้า! ใบกะเพราพันธุ์ไทยแท้ บินตรงสดๆ จากสวน กลิ่นหอมฉุนจัดจ้าน ผัดทีหอมไปสามบ้านแปดบ้าน!\n\n🍃 กล่องละ NT$ 120 (200 กรัม สดใหม่กริ๊บ)\n🔥 ของเข้าสดๆ มีจำนวนจำกัดในแต่ละรอบ\n\nอยากได้ทักแชทร้านขอนแก่นไว้เลย เจ๊จัดส่งให้ด่วนจี๋!`,
    hashtags: ['#ใบกะเพราไทย', '#ผักไทยในไต้หวัน', '#ร้านขอนแก่น', '#KKShop', '#อาหารไทย'],
    scheduledAt: '2026-10-01T11:30:00+07:00',
    createdAt: '2026-09-27T10:00:00Z',
    updatedAt: '2026-09-29T11:00:00Z',
  },
  {
    id: 'CJ-20260925-004',
    productId: 'PROD-KK-04',
    productName: 'มาม่ารสต้มยำกุ้งน้ำข้น แพ็ค 10 ซอง',
    priceNTD: 150,
    contentType: 'IMAGE_POST',
    creativeStyle: 'คอมฟอร์ตฟู้ดยามดึก คลายหนาวในไต้หวัน',
    marketingObjective: 'โปรโมชั่นแพ็คคู่ ซื้อตุนติดห้อง',
    rawMediaIds: ['DRIVE-RAW-006'],
    characterId: 'CHAR-01',
    status: 'POSTED',
    facebookPostId: 'FB_DEMO_POST_109283749283471',
    facebookPostUrl: 'https://facebook.com/posts/109283749283471',
    postedAt: '2026-09-26T18:00:00+07:00',
    performanceCheckAt: '2026-09-29T18:00:00+07:00',
    generatedImageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=800&q=80',
    caption: `อากาศเริ่มเย็นแล้ว มีมาม่าต้มยำกุ้งน้ำข้นติดห้องไว้รึยังจ๊ะ? 🍜🇹🇼\n\nมาม่าต้มยำกุ้งน้ำข้นแท้จากไทย ซุปเข้มข้นจัดจ้าน บีบมะนาวเพิ่มอีกนิด ฟินเหมือนอยู่บ้านเราเลย!\n\nแพ็ค 10 ซอง ราคาเพียง NT$ 150 เท่านั้น\nมีของพร้อมส่ง สั่งตุนกันได้เลยจ้าที่ร้านขอนแก่น ❤️`,
    hashtags: ['#มาม่าต้มยำกุ้ง', '#ร้านขอนแก่นไต้หวัน', '#ของกินไทยในไต้หวัน'],
    createdAt: '2026-09-25T11:00:00Z',
    updatedAt: '2026-09-26T18:00:00Z',
  }
];

const demoPublishedPosts: PublishedPost[] = [
  {
    id: 'PUB-001',
    contentId: 'CJ-20260925-004',
    facebookPostId: 'FB_DEMO_POST_109283749283471',
    facebookPostUrl: 'https://facebook.com/posts/109283749283471',
    productName: 'มาม่ารสต้มยำกุ้งน้ำข้น แพ็ค 10 ซอง',
    contentType: 'IMAGE_POST',
    caption: 'อากาศเริ่มเย็นแล้ว มีมาม่าต้มยำกุ้งน้ำข้นติดห้องไว้รึยังจ๊ะ? 🍜🇹🇼...',
    mediaUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=800&q=80',
    publishedAt: '2026-09-26T18:00:00+07:00',
    publishedAtBangkok: '26 ก.ย. 2026 18:00 น.',
    performanceCheckAt: '2026-09-29T18:00:00+07:00',
    isPerformanceChecked: true,
  }
];

const demoPerformanceChecks: PerformanceCheck[] = [
  {
    id: 'PERF-001',
    contentId: 'CJ-20260925-004',
    facebookPostId: 'FB_DEMO_POST_109283749283471',
    productName: 'มาม่ารสต้มยำกุ้งน้ำข้น แพ็ค 10 ซอง',
    publishedAt: '2026-09-26T18:00:00+07:00',
    evaluationDate: '2026-09-29T18:05:00+07:00',
    reach: 4850,
    impressions: 7210,
    reactions: 342,
    comments: 48,
    shares: 26,
    clicks: 198,
    engagement: 614,
    engagementRate: 8.52, // 614 / 7210
    summaryThai: 'โพสต์มาม่าต้มยำกุ้งทำผลงานได้ดีเยี่ยม อัตรามีส่วนร่วม 8.52% เนื่องจากเนื้อหาตรงใจช่วงอากาศเย็นและราคาจับต้องได้ง่าย NT$150 แนะนำให้คงสไตล์การโพสต์ช่วงเย็น 18:00 น.',
    lineNotified: true,
    status: 'COMPLETED'
  }
];

const initialAuditLogs: AuditLogEntry[] = [
  {
    id: 'LOG-001',
    timestamp: '2026-09-29T18:05:00+07:00',
    user: 'ระบบอัตโนมัติ (Performance Collector)',
    contentId: 'CJ-20260925-004',
    action: 'PERFORMANCE_CHECKED',
    result: 'SUCCESS',
    details: 'ประเมินผลครบ 72 ชั่วโมงสำหรับโพสต์มาม่าต้มยำกุ้งสำเร็จ Engagement 614 ครั้ง (8.52%)',
  },
  {
    id: 'LOG-002',
    timestamp: '2026-09-29T18:06:00+07:00',
    user: 'ระบบอัตโนมัติ (LineNotificationService)',
    contentId: 'CJ-20260925-004',
    action: 'LINE_NOTIFICATION_SENT',
    result: 'SUCCESS',
    details: 'ส่งรายงานสรุปผลงาน 72 ชม. เข้า LINE กลุ่มทีมงานเรียบร้อยแล้ว',
  },
  {
    id: 'LOG-003',
    timestamp: '2026-09-29T14:30:00+07:00',
    user: 'ผู้ดูแลระบบ (Admin)',
    contentId: 'CJ-20260930-001',
    action: 'CONTENT_CREATED',
    result: 'SUCCESS',
    details: 'สร้างงานคอนเทนต์ใหม่ ปลาร้าแม่บุญล้ำ ด้วย Gemini Creative Brief',
  },
  {
    id: 'LOG-004',
    timestamp: '2026-09-29T11:00:00+07:00',
    user: 'ผู้ดูแลระบบ (Admin)',
    contentId: 'CJ-20260927-003',
    action: 'APPROVED',
    result: 'SUCCESS',
    details: 'อนุมัติโพสต์ใบกะเพราไทยสดนำเข้า พร้อมส่งต่อคิวตั้งเวลาโพสต์',
  }
];

const initialSettings: SystemSettings = {
  appName: 'KK Shop Content Studio',
  storeName: 'ร้านขอนแก่น (KK Shop Taiwan)',
  timezone: 'Asia/Bangkok',
  currency: 'NT$ / TWD',
  facebookPageId: process.env.FACEBOOK_PAGE_ID || '',
  approvalDailySummaryTime: '21:00',
  performanceDelayHours: 72,
  hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
  hasFacebookToken: Boolean(process.env.FACEBOOK_PAGE_ACCESS_TOKEN && process.env.FACEBOOK_PAGE_ACCESS_TOKEN !== 'MY_FACEBOOK_PAGE_ACCESS_TOKEN'),
  hasLineToken: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_CHANNEL_ACCESS_TOKEN !== 'MY_LINE_CHANNEL_ACCESS_TOKEN'),
  hasGoogleDriveAuth: Boolean(process.env.GOOGLE_DRIVE_FOLDER_ID && process.env.GOOGLE_DRIVE_FOLDER_ID !== 'MY_ROOT_DRIVE_FOLDER_ID'),
  googleFlowFallbackEnabled: true,
};

class DataStore {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        // Refresh env status flags
        parsed.settings.hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
        parsed.settings.hasFacebookToken = Boolean(process.env.FACEBOOK_PAGE_ACCESS_TOKEN && process.env.FACEBOOK_PAGE_ACCESS_TOKEN !== 'MY_FACEBOOK_PAGE_ACCESS_TOKEN');
        parsed.settings.hasLineToken = Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_CHANNEL_ACCESS_TOKEN !== 'MY_LINE_CHANNEL_ACCESS_TOKEN');
        parsed.settings.hasGoogleDriveAuth = true;

        if (!isDemoMode) {
          // Strictly remove all seeded/mock/demo business records from production runtime
          parsed.products = (parsed.products || []).filter((p: Product) => !p.id.startsWith('PROD-KK-0'));
          parsed.mediaAssets = (parsed.mediaAssets || []).filter((m: MediaAsset) => !m.id.startsWith('DRIVE-RAW-0'));
          parsed.contentJobs = (parsed.contentJobs || []).filter((j: ContentJob) => !j.id.startsWith('CJ-202609'));
          parsed.scheduledPosts = (parsed.scheduledPosts || []).filter((s: ScheduledPost) => !s.id.startsWith('SCHED-DEMO'));
          parsed.publishedPosts = (parsed.publishedPosts || []).filter((p: PublishedPost) => p.id !== 'PUB-001' && !p.id.startsWith('PUB-DEMO'));
          parsed.performanceChecks = (parsed.performanceChecks || []).filter((c: PerformanceCheck) => c.id !== 'PERF-001' && !c.id.startsWith('PERF-DEMO'));
        }

        // Strictly enforce character as only เจ๊อ๋อย (CHAR-JAO-OY) with REFERENCE_REQUIRED
        parsed.characters = initialCharacters;

        return parsed;
      }
    } catch (err) {
      console.error('Error loading DB_FILE, falling back to seed:', err);
    }

    const defaultData: DatabaseSchema = {
      products: isDemoMode ? demoProducts : [],
      mediaAssets: isDemoMode ? demoMediaAssets : [],
      characters: initialCharacters,
      contentJobs: isDemoMode ? demoContentJobs : [],
      scheduledPosts: [],
      publishedPosts: isDemoMode ? demoPublishedPosts : [],
      performanceChecks: isDemoMode ? demoPerformanceChecks : [],
      auditLogs: isDemoMode ? initialAuditLogs : [],
      lineNotifications: [],
      settings: initialSettings,
    };

    this.saveData(defaultData);
    return defaultData;
  }

  private saveData(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing DB_FILE:', err);
    }
  }

  // Products
  getProducts(): Product[] {
    return this.data.products;
  }

  getProductById(id: string): Product | undefined {
    return this.data.products.find(p => p.id === id || p.sku === id);
  }

  saveProduct(product: Product): Product {
    const index = this.data.products.findIndex(p => p.id === product.id);
    if (index >= 0) {
      this.data.products[index] = { ...product, updatedAt: new Date().toISOString() };
    } else {
      this.data.products.unshift(product);
    }
    this.saveData(this.data);
    return product;
  }

  importProducts(newProducts: Product[]): { added: number; updated: number } {
    let added = 0;
    let updated = 0;
    for (const prod of newProducts) {
      const idx = this.data.products.findIndex(p => p.id === prod.id || p.sku === prod.sku);
      if (idx >= 0) {
        this.data.products[idx] = { ...this.data.products[idx], ...prod, updatedAt: new Date().toISOString() };
        updated++;
      } else {
        this.data.products.push(prod);
        added++;
      }
    }
    this.saveData(this.data);
    this.addAuditLog({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: 'ผู้ดูแลระบบ (Admin)',
      action: 'PRODUCT_IMPORTED',
      result: 'SUCCESS',
      details: `นำเข้าสินค้าผ่าน CSV สำเร็จ: เพิ่มใหม่ ${added} รายการ, อัปเดต ${updated} รายการ`,
    });
    return { added, updated };
  }

  // Media Assets
  getMediaAssets(folderPath?: string): MediaAsset[] {
    if (folderPath) {
      return this.data.mediaAssets.filter(m => m.folderPath === folderPath);
    }
    return this.data.mediaAssets;
  }

  getMediaById(id: string): MediaAsset | undefined {
    return this.data.mediaAssets.find(m => m.id === id || m.driveFileId === id);
  }

  saveMediaAsset(asset: MediaAsset): MediaAsset {
    const idx = this.data.mediaAssets.findIndex(m => m.id === asset.id);
    if (idx >= 0) {
      this.data.mediaAssets[idx] = asset;
    } else {
      this.data.mediaAssets.unshift(asset);
    }
    this.saveData(this.data);
    return asset;
  }

  // Characters
  getCharacters(): Character[] {
    return this.data.characters;
  }

  getCharacterById(id: string): Character | undefined {
    return this.data.characters.find(c => c.id === id);
  }

  saveCharacter(char: Character): Character {
    const idx = this.data.characters.findIndex(c => c.id === char.id);
    if (idx >= 0) {
      this.data.characters[idx] = char;
    } else {
      this.data.characters.push(char);
    }
    this.saveData(this.data);
    return char;
  }

  // Content Jobs
  getContentJobs(status?: ContentStatus): ContentJob[] {
    if (status) {
      return this.data.contentJobs.filter(j => j.status === status);
    }
    return this.data.contentJobs;
  }

  getContentJobById(id: string): ContentJob | undefined {
    return this.data.contentJobs.find(j => j.id === id);
  }

  saveContentJob(job: ContentJob): ContentJob {
    const idx = this.data.contentJobs.findIndex(j => j.id === job.id);
    if (idx >= 0) {
      this.data.contentJobs[idx] = { ...job, updatedAt: new Date().toISOString() };
    } else {
      this.data.contentJobs.unshift(job);
    }
    this.saveData(this.data);
    return job;
  }

  updateContentJobStatus(id: string, status: ContentStatus, extra?: Partial<ContentJob>): ContentJob | null {
    const job = this.getContentJobById(id);
    if (!job) return null;
    const updated: ContentJob = {
      ...job,
      ...extra,
      status,
      updatedAt: new Date().toISOString(),
    };
    return this.saveContentJob(updated);
  }

  // Scheduled Posts
  getScheduledPosts(): ScheduledPost[] {
    return this.data.scheduledPosts;
  }

  saveScheduledPost(sched: ScheduledPost): ScheduledPost {
    const idx = this.data.scheduledPosts.findIndex(s => s.id === sched.id);
    if (idx >= 0) {
      this.data.scheduledPosts[idx] = sched;
    } else {
      this.data.scheduledPosts.push(sched);
    }
    this.saveData(this.data);
    return sched;
  }

  cancelScheduledPost(id: string): boolean {
    const sched = this.data.scheduledPosts.find(s => s.id === id);
    if (!sched) return false;
    sched.status = 'CANCELLED';
    this.saveData(this.data);
    return true;
  }

  // Published Posts
  getPublishedPosts(): PublishedPost[] {
    return this.data.publishedPosts;
  }

  savePublishedPost(post: PublishedPost): PublishedPost {
    this.data.publishedPosts.unshift(post);
    this.saveData(this.data);
    return post;
  }

  // Performance Checks
  getPerformanceChecks(): PerformanceCheck[] {
    return this.data.performanceChecks;
  }

  savePerformanceCheck(check: PerformanceCheck): PerformanceCheck {
    const idx = this.data.performanceChecks.findIndex(p => p.id === check.id || p.contentId === check.contentId);
    if (idx >= 0) {
      this.data.performanceChecks[idx] = check;
    } else {
      this.data.performanceChecks.unshift(check);
    }
    this.saveData(this.data);
    return check;
  }

  // Audit Logs
  getAuditLogs(limit = 100): AuditLogEntry[] {
    return this.data.auditLogs.slice(0, limit);
  }

  addAuditLog(entry: AuditLogEntry): AuditLogEntry {
    const sanitized = redactObject(entry);
    this.data.auditLogs.unshift(sanitized);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.saveData(this.data);
    return sanitized;
  }

  /**
   * Strict Approval Hardening:
   * If an approved or scheduled content job is modified in caption, image, prompt, or price,
   * invalidate the approval immediately and reset status to WAITING_APPROVAL.
   */
  invalidateApprovalIfModified(id: string, proposedChanges: Partial<ContentJob>): { invalidated: boolean; job: ContentJob | null } {
    const job = this.getContentJobById(id);
    if (!job) return { invalidated: false, job: null };

    if (job.status === 'APPROVED' || job.status === 'SCHEDULED') {
      const isCaptionChanged = proposedChanges.caption !== undefined && proposedChanges.caption !== job.caption;
      const isImageChanged = proposedChanges.generatedImageUrl !== undefined && proposedChanges.generatedImageUrl !== job.generatedImageUrl;
      const isPriceChanged = proposedChanges.priceNTD !== undefined && proposedChanges.priceNTD !== job.priceNTD;
      const isPromptChanged = proposedChanges.creativePrompt !== undefined && proposedChanges.creativePrompt !== job.creativePrompt;

      if (isCaptionChanged || isImageChanged || isPriceChanged || isPromptChanged) {
        job.status = 'WAITING_APPROVAL';
        job.approvalId = undefined;
        job.approvedSnapshot = undefined;
        job.scheduledAt = undefined;

        // Cancel any pending scheduled posts linked to this job
        const linkedScheduled = this.data.scheduledPosts.filter(s => s.contentId === job.id && s.status === 'SCHEDULED');
        for (const s of linkedScheduled) {
          s.status = 'CANCELLED';
          s.lastError = 'ยกเลิกเนื่องจากมีการแก้ไขเนื้อหาคอนเทนต์หลังผ่านการอนุมัติ';
        }

        this.addAuditLog({
          id: `LOG-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: 'ระบบความปลอดภัย (Approval Guard)',
          contentId: job.id,
          action: 'APPROVAL_INVALIDATED',
          result: 'WARNING',
          details: `ยกเลิกการอนุมัติสำหรับ "${job.productName}" เนื่องจากตรวจพบการแก้ไขเนื้อหาหลังการอนุมัติ — ปรับสถานะกลับสู่ WAITING_APPROVAL`,
          metadata: {
            isCaptionChanged,
            isImageChanged,
            isPriceChanged,
            isPromptChanged,
          },
        });

        this.saveContentJob(job);
        return { invalidated: true, job };
      }
    }

    return { invalidated: false, job };
  }

  // Line Notifications
  getLineNotifications(): LineNotificationRecord[] {
    return this.data.lineNotifications;
  }

  saveLineNotification(record: LineNotificationRecord): LineNotificationRecord {
    this.data.lineNotifications.unshift(record);
    this.saveData(this.data);
    return record;
  }

  // LINE Webhook & Admin User Management
  getLineAdminUserId(): string | undefined {
    return this.data.settings.lineAdminUserId || (process.env.LINE_TARGET_ID && process.env.LINE_TARGET_ID !== 'MY_LINE_TARGET_ID' ? process.env.LINE_TARGET_ID : undefined);
  }

  setLineAdminUserId(userId: string): void {
    this.data.settings.lineAdminUserId = userId;
    this.data.settings.lineWebhookStatus = 'CONNECTED';
    this.data.settings.lastLineWebhookReceivedAt = new Date().toISOString();
    this.data.settings.lastLineWebhookError = undefined;
    this.saveData(this.data);
  }

  recordLineWebhookError(error: string): void {
    this.data.settings.lastLineWebhookError = error;
    if (!this.data.settings.lineAdminUserId) {
      this.data.settings.lineWebhookStatus = 'ERROR';
    }
    this.saveData(this.data);
  }

  recordLineWebhookSuccess(): void {
    this.data.settings.lastLineWebhookReceivedAt = new Date().toISOString();
    this.data.settings.lastLineWebhookError = undefined;
    if (this.data.settings.lineAdminUserId) {
      this.data.settings.lineWebhookStatus = 'CONNECTED';
    } else {
      this.data.settings.lineWebhookStatus = 'WEBHOOK_READY';
    }
    this.saveData(this.data);
  }

  getLineWebhookStatus(): LineConnectionStatus {
    const hasToken = Boolean(
      process.env.LINE_CHANNEL_ACCESS_TOKEN &&
      process.env.LINE_CHANNEL_ACCESS_TOKEN !== 'MY_LINE_CHANNEL_ACCESS_TOKEN' &&
      process.env.LINE_CHANNEL_ACCESS_TOKEN.length > 20
    );
    const hasSecret = Boolean(
      process.env.LINE_CHANNEL_SECRET &&
      process.env.LINE_CHANNEL_SECRET.length > 10
    );

    if (!hasToken || !hasSecret) {
      return 'NOT_CONNECTED';
    }

    if (this.data.settings.lastLineWebhookError && !this.data.settings.lineAdminUserId) {
      return 'ERROR';
    }

    if (this.data.settings.lineAdminUserId) {
      return 'CONNECTED';
    }

    return 'WEBHOOK_READY';
  }

  // Settings
  getSettings(): SystemSettings {
    this.data.settings.hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
    this.data.settings.hasFacebookToken = Boolean(process.env.FACEBOOK_PAGE_ACCESS_TOKEN && process.env.FACEBOOK_PAGE_ACCESS_TOKEN !== 'MY_FACEBOOK_PAGE_ACCESS_TOKEN');
    this.data.settings.hasLineToken = Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_CHANNEL_ACCESS_TOKEN !== 'MY_LINE_CHANNEL_ACCESS_TOKEN');
    this.data.settings.hasGoogleDriveAuth = Boolean(process.env.GOOGLE_DRIVE_FOLDER_ID && process.env.GOOGLE_DRIVE_FOLDER_ID !== 'MY_ROOT_DRIVE_FOLDER_ID');
    this.data.settings.lineWebhookStatus = this.getLineWebhookStatus();
    return this.data.settings;
  }

  updateSettings(patch: Partial<SystemSettings>): SystemSettings {
    this.data.settings = { ...this.data.settings, ...patch };
    this.saveData(this.data);
    this.addAuditLog({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: 'ผู้ดูแลระบบ (Admin)',
      action: 'SETTINGS_UPDATED',
      result: 'SUCCESS',
      details: 'อัปเดตการตั้งค่าระบบ KK Shop Content Studio สำเร็จ',
    });
    return this.data.settings;
  }
}

export const db = new DataStore();
