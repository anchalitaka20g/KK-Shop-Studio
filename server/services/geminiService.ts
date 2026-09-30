/**
 * KK Shop Content Studio - Gemini AI Service
 * Powered by @google/genai TypeScript SDK
 * Server-side execution only. Never exposes API key to client.
 */

import { GoogleGenAI } from '@google/genai';
import { Product, Character, CreativeBrief, ReelStoryboard, ContentType, PerformanceCheck } from '../types.js';
import { config } from '../config.js';
import { safeLogger } from '../utils/redact.js';

let aiInstance: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  if (!config.gemini.isConfigured) return null;
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: config.gemini.apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

/**
 * System instruction enforcing Thai language, store identity, and price accuracy.
 */
const KK_SHOP_SYSTEM_INSTRUCTION = `คุณคือผู้เชี่ยวชาญด้านกลยุทธ์คอนเทนต์และการตลาดออนไลน์ระดับแนวหน้า สำหรับ "ร้านขอนแก่น (KK Shop Taiwan)"
ร้านขายของชำและอาหารไทยชั้นนำในไต้หวัน กลุ่มเป้าหมายหลักคือพี่น้องคนไทยในไต้หวัน (แรงงานไทย, ผู้ตั้งถิ่นฐานใหม่, นักเรียนไทย, แม่บ้านไทย)

กฎเหล็กสำคัญที่สุด (CRITICAL STRICT RULES):
1. ราคา (Price): ต้องใช้ราคา NT$ / TWD จากฐานข้อมูล Product Master เท่านั้น! ห้ามประดิษฐ์หรือเปลี่ยนแปลงราคาเองเด็ดขาด
2. โทนเสียง (Tone of voice): ภาษาไทยล้วน อบอุ่น เป็นกันเอง สอดแทรกความอบอุ่นคิดถึงบ้าน รสชาติไทยแท้
3. เมื่อมี "เจ๊อ๋อย" เจ้าของร้าน ให้ใช้บุคลิกเจ๊อ๋อย: ทักทาย "สวัสดีจ้าพี่น้อง", "สูเอ๊ยยย", "ของดีบ้านเฮามาฮอดไต้หวันแล้ว"
4. สินค้าจัดส่งทั่วไต้หวัน มีจุดรับของสะดวก เช่น 7-11 หรือ FamilyMart ใกล้ที่พัก
5. ผลลัพธ์ต้องส่งกลับเป็น JSON ตามโครงสร้างที่กำหนดเท่านั้น ใช้งานได้จริงบน Facebook Page และ Facebook Reels`;

/**
 * Safe connection test
 * Returns status without leaking the API key
 */
export async function testGeminiConnection(): Promise<{
  success: boolean;
  status: 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR';
  message: string;
  model: string;
}> {
  if (!config.gemini.isConfigured) {
    return {
      success: false,
      status: 'NOT_CONFIGURED',
      message: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY ใน Environment Secrets (ระบบจะใช้โหมด Smart Template จำลอง)',
      model: config.gemini.model,
    };
  }

  const ai = getAIClient();
  if (!ai) {
    return {
      success: false,
      status: 'NOT_CONFIGURED',
      message: 'ไม่สามารถสร้าง GenAI Client ได้',
      model: config.gemini.model,
    };
  }

  try {
    const res = await ai.models.generateContent({
      model: config.gemini.model,
      contents: 'ตอบกลับว่า "พร้อมใช้งาน" สั้นๆ',
      config: {
        maxOutputTokens: 20,
      },
    });

    const reply = res.text?.trim() || 'OK';
    return {
      success: true,
      status: 'CONNECTED',
      message: `เชื่อมต่อ Gemini API สำเร็จ (${config.gemini.model}): ${reply}`,
      model: config.gemini.model,
    };
  } catch (err: any) {
    safeLogger.error('Gemini connection test failed:', err);
    return {
      success: false,
      status: 'ERROR',
      message: `ข้อผิดพลาดการเชื่อมต่อ Gemini API: ${err.message || 'Unknown error'}`,
      model: config.gemini.model,
    };
  }
}

/**
 * Generates Creative Brief in structured JSON
 */
export async function generateCreativeBrief(
  product: Product,
  contentType: ContentType,
  creativeStyle: string,
  marketingObjective: string,
  character?: Character,
  previousPerformanceSummary?: string
): Promise<CreativeBrief> {
  const characterPrompt = character
    ? `\nตัวละครหลัก: "${character.name}" (${character.role})
กฎการแต่งกาย: ${character.clothingRules}
กฎการนำเสนอ: ${character.visualRules}
กฎน้ำเสียง: ${character.voiceRules}`
    : '';

  const perfContext = previousPerformanceSummary
    ? `\nบทเรียนจากผลงานคอนเทนต์ในอดีต: ${previousPerformanceSummary}`
    : '';

  const prompt = `วางแผน Creative Brief สำหรับสินค้าชิ้นนี้:
- รหัสสินค้า: ${product.id} (SKU: ${product.sku})
- ชื่อสินค้า: ${product.name}
- หมวดหมู่: ${product.category}
- ราคาเป๊ะตามระบบ: NT$ ${product.priceNTD} (${product.unit})
- ขนาด: ${product.size}
- จุดเด่นสินค้า: ${product.description || product.name}
- รูปแบบคอนเทนต์: ${contentType}
- สไตล์การนำเสนอ: ${creativeStyle}
- วัตถุประสงค์ทางการตลาด: ${marketingObjective}
${characterPrompt}
${perfContext}

ส่งกลับเป็น JSON format เท่านั้น:
{
  "mainSellingPoint": "จุดขายเด่นสุด",
  "targetAudience": "กลุ่มเป้าหมายในไต้หวัน",
  "contentObjective": "วัตถุประสงค์คอนเทนต์",
  "creativeConcept": "แนวคิดสร้างสรรค์",
  "headline": "พาดหัวดึงดูดใจ (ต้องมีราคา NT$ ${product.priceNTD} ชัดเจน)",
  "supportingText": "ข้อความสนับสนุน",
  "cta": "Call to action ชัดเจน สั่งทาง Inbox ส่งถึง 7-11 หรือ FamilyMart",
  "recommendedContentType": "${contentType}",
  "recommendedVisualStyle": "คำแนะนำสไตล์ภาพหรือฉากหลัง",
  "captionConcept": "แนวทางการเล่าเรื่องในแคปชั่น",
  "hashtags": ["#แฮชแท็ก1", "#แฮชแท็ก2", "#แฮชแท็ก3", "#แฮชแท็ก4", "#แฮชแท็ก5"]
}`;

  const ai = getAIClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: config.gemini.model,
        contents: prompt,
        config: {
          systemInstruction: KK_SHOP_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const text = response.text?.trim() || '';
      const parsed = JSON.parse(text);
      return {
        productId: product.id,
        productName: product.name,
        priceNTD: product.priceNTD,
        category: product.category,
        mainSellingPoint: parsed.mainSellingPoint || `รสชาติไทยแท้ ราคาเพียง NT$ ${product.priceNTD}`,
        targetAudience: parsed.targetAudience || 'คนไทยในไต้หวันที่คิดถึงอาหารบ้านเกิด',
        contentObjective: parsed.contentObjective || marketingObjective,
        creativeConcept: parsed.creativeConcept || creativeStyle,
        headline: parsed.headline || `${product.name} ส่งตรงถึงไต้หวัน เพียง NT$ ${product.priceNTD}`,
        supportingText: parsed.supportingText || `${product.size} ราคาคุ้มค่า รสชาติเข้มข้น`,
        cta: parsed.cta || 'ทักแชทร้านขอนแก่น ส่งตรงถึง 7-11 หรือ FamilyMart ทั่วไต้หวัน!',
        recommendedContentType: contentType,
        recommendedVisualStyle: parsed.recommendedVisualStyle || 'ภาพมุมมองอาหารน่ารับประทาน พร้อมป้ายราคา NT$ ชัดเจน',
        captionConcept: parsed.captionConcept || 'เรื่องเล่าคลายความคิดถึงบ้านเกิด',
        hashtags: parsed.hashtags || ['#ร้านขอนแก่นไต้หวัน', '#KKShop', '#อาหารไทยในไต้หวัน'],
        characterId: character?.id,
      };
    } catch (err) {
      safeLogger.warn('Gemini API call failed, falling back to smart local template:', err);
    }
  }

  // Fallback template when Gemini key is not yet set
  return {
    productId: product.id,
    productName: product.name,
    priceNTD: product.priceNTD,
    category: product.category,
    mainSellingPoint: `${product.name} นำเข้าคุณภาพเกรดดี รสชาติต้นตำรับไทยแท้ 100%`,
    targetAudience: 'พี่น้องคนไทยในไต้หวัน แรงงานไทย และผู้ชื่นชอบอาหารไทยรสชาติดั้งเดิม',
    contentObjective: marketingObjective || 'แนะนำสินค้าและกระตุ้นการสั่งซื้อผ่าน Inbox',
    creativeConcept: character ? `เจ๊อ๋อยพาทัวร์สินค้าเด่น ชวนชิม ${product.name}` : `ชูจุดเด่น ${product.name} รสชาติที่คุ้นเคยในไต้หวัน`,
    headline: `${product.name} เข้าใหม่แล้วจ้า! ราคาพิเศษเพียง NT$ ${product.priceNTD}`,
    supportingText: `ขนาด ${product.size} มีสินค้าพร้อมส่งทั่วไต้หวัน รับที่ร้านสะดวกซื้อใกล้หอพัก`,
    cta: 'ทัก Inbox เพจร้านขอนแก่น ด่วนจ้า สินค้ามีจำนวนจำกัดในแต่ละรอบ!',
    recommendedContentType: contentType,
    recommendedVisualStyle: 'โทนสีสดใส อบอุ่น มีป้ายราคา NT$ เด่นชัด พร้อมตราสัญลักษณ์ร้านขอนแก่น',
    captionConcept: 'เล่าถึงความหอม อร่อย และความสะดวกในการรับสินค้าในไต้หวัน',
    hashtags: ['#ร้านขอนแก่นในไต้หวัน', '#KKShopTaiwan', '#ของกินไทยในไต้หวัน', '#คนไทยในไต้หวัน'],
    characterId: character?.id,
  };
}

/**
 * Generates Caption and Hashtags in structured format
 */
export async function generateCaption(
  product: Product,
  brief: CreativeBrief,
  character?: Character
): Promise<{ caption: string; hashtags: string[] }> {
  const prompt = `เขียนแคปชั่น Facebook สไตล์เพจร้านขายของชำไทยในไต้หวัน (ร้านขอนแก่น)
สินค้า: ${product.name}
ราคาเป๊ะ: NT$ ${product.priceNTD} (${product.unit})
ขนาด: ${product.size}
จุดเด่น: ${brief.mainSellingPoint}
พาดหัว: ${brief.headline}
แนวคิด: ${brief.creativeConcept}
Call to Action: ${brief.cta}
${character ? `ตัวละครเจ๊อ๋อย: ทักทายอย่างอบอุ่น มีพลัง มีคำว่า "สูเอ๊ย", "พี่น้อง"` : ''}

ความต้องการ:
1. ภาษาไทยเท่านั้น โครงสร้างอ่านง่าย สบายตา มีเว้นบรรทัด มี Emoji เหมาะสม
2. ระบุราคา NT$ ${product.priceNTD} อย่างชัดเจน (ห้ามเปลี่ยนราคา)
3. ระบุบริการจัดส่งทั่วไต้หวัน (7-11 / FamilyMart)
4. ส่งกลับเป็น JSON:
{
  "caption": "เนื้อหาแคปชั่นที่สมบูรณ์",
  "hashtags": ["#แฮชแท็ก1", "#แฮชแท็ก2", "#แฮชแท็ก3", "#แฮชแท็ก4", "#แฮชแท็ก5"]
}`;

  const ai = getAIClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: config.gemini.model,
        contents: prompt,
        config: {
          systemInstruction: KK_SHOP_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      if (parsed.caption) {
        return {
          caption: parsed.caption,
          hashtags: parsed.hashtags || brief.hashtags || ['#ร้านขอนแก่น', '#KKShop'],
        };
      }
    } catch (err) {
      safeLogger.warn('Gemini caption generation error, using smart template:', err);
    }
  }

  // Fallback caption
  const greeting = character
    ? `สูเอ๊ยยย! ใครคิดถึงรสชาติบ้านเฮา ยกมือขึ้น! 🇹🇼🌶️`
    : `สวัสดีจ้าพี่น้องคนไทยในไต้หวันทุกคน! 🇹🇼✨`;

  const caption = `${greeting}\n\n${product.name} ล็อตใหม่ส่งตรงจากไทยมาถึงร้านขอนแก่นแล้วจ้า! 🔥\n\n` +
    `✅ ${brief.mainSellingPoint}\n` +
    `✅ ขนาด ${product.size} คุ้มค่า จุใจ\n` +
    `✅ ของแท้ 100% สดใหม่ สะอาด ถูกสุขอนามัย\n\n` +
    `💰 ราคาพิเศษเพียงขวดละ / ชิ้นละ NT$ ${product.priceNTD} เท่านั้น!\n\n` +
    `📦 บริการส่งด่วนทั่วเกาะไต้หวัน รับของสะดวกที่ 7-11 หรือ FamilyMart ใกล้บ้านคุณ\n\n` +
    `👉 ${brief.cta}`;

  return {
    caption,
    hashtags: brief.hashtags || ['#ร้านขอนแก่นไต้หวัน', '#KKShop', '#อาหารไทยในไต้หวัน', '#คนไทยในไต้หวัน'],
  };
}

/**
 * Generates Reel Storyboard, Scenes, and Veo/Flow Prompts in structured JSON
 */
export async function generateReelStoryboard(
  product: Product,
  brief: CreativeBrief,
  character?: Character
): Promise<ReelStoryboard> {
  const prompt = `ออกแบบ Storyboard สำหรับคลิปสั้น Facebook Reels (ความยาว 10 วินาที, อัตราส่วน 9:16 แนวตั้ง)
สำหรับสินค้า: ${product.name}
ราคา: NT$ ${product.priceNTD}
กลุ่มเป้าหมาย: คนไทยในไต้หวัน
ตัวละคร: ${character?.name || 'เจ๊อ๋อย เจ้าของร้านขอนแก่น'}
พาดหัว: ${brief.headline}
จุดขาย: ${brief.mainSellingPoint}

ต้องการผลลัพธ์เป็น JSON โครงสร้างตามนี้เท่านั้น:
{
  "hook": "ประโยคเปิดคลิป 0-3 วินาทีแรกที่หยุดนิ้วโป้งคนดู",
  "storyConcept": "แนวคิดเรื่องราวสั้น 10 วินาที",
  "scenes": [
    {
      "sceneNumber": 1,
      "timeRange": "0:00 - 0:03",
      "durationSeconds": 3,
      "visualPrompt": "คำสั่งภาพ 9:16 สำหรับ AI Video (ภาษาอังกฤษ)",
      "cameraInstruction": "การเคลื่อนกล้อง (Close-up, Pan, Zoom)",
      "characterAction": "การเคลื่อนไหวของเจ๊อ๋อย",
      "thaiDialogue": "บทพูดภาษาไทยของเจ๊อ๋อย",
      "soundInstruction": "เสียงเอฟเฟกต์ (SFX/ASMR)",
      "bgmInstruction": "สไตล์ดนตรีประกอบ"
    },
    {
      "sceneNumber": 2,
      "timeRange": "0:03 - 0:07",
      "durationSeconds": 4,
      "visualPrompt": "คำสั่งภาพแสดงสินค้าและป้ายราคา NT$ ${product.priceNTD}",
      "cameraInstruction": "การเคลื่อนกล้อง",
      "characterAction": "การเคลื่อนไหวของเจ๊อ๋อย",
      "thaiDialogue": "บทพูดภาษาไทยของเจ๊อ๋อย",
      "soundInstruction": "เสียงเอฟเฟกต์",
      "bgmInstruction": "สไตล์ดนตรีประกอบ"
    },
    {
      "sceneNumber": 3,
      "timeRange": "0:07 - 0:10",
      "durationSeconds": 3,
      "visualPrompt": "คำสั่งภาพ End Card โลโก้ร้านขอนแก่น และปุ่มทักแชท",
      "cameraInstruction": "การเคลื่อนกล้อง",
      "characterAction": "การกวักมือเรียก ชวนสั่งซื้อ",
      "thaiDialogue": "บทพูดภาษาไทย Call to action",
      "soundInstruction": "เสียงเอฟเฟกต์",
      "bgmInstruction": "สไตล์ดนตรีประกอบ"
    }
  ],
  "finalVeoPrompt": "Prompt ภาษาอังกฤษสำหรับ Veo / Gemini Video Generation",
  "googleFlowPrompt": "Prompt ละเอียดสำหรับนำไปวางใน Google Flow Video Studio"
}`;

  const ai = getAIClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: config.gemini.model,
        contents: prompt,
        config: {
          systemInstruction: KK_SHOP_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      if (parsed.scenes && parsed.scenes.length > 0) {
        return {
          hook: parsed.hook || `หยุดดูด่วน! ${product.name} มาถึงไต้หวันแล้ว`,
          storyConcept: parsed.storyConcept || brief.creativeConcept,
          durationSeconds: 10,
          aspectRatio: '9:16',
          resolution: '720p',
          scenes: parsed.scenes,
          finalVeoPrompt: parsed.finalVeoPrompt || `Vertical 9:16 commercial video of authentic Thai product ${product.name} in a colorful Taiwanese Thai grocery store, appetizing display, 720p, warm lighting.`,
          googleFlowPrompt: parsed.googleFlowPrompt || `Veo Prompt (9:16 Vertical Reel, 10s):\nSubject: ${product.name} priced NT$${product.priceNTD} at KK Shop Taiwan.\nScene: Lively Thai shop with cheerful owner Je Oy presenting fresh authentic Thai grocery.\nAudio: Upbeat energetic Thai music.`,
          hasDirectVeoApi: false,
        };
      }
    } catch (err) {
      safeLogger.warn('Gemini Reel Storyboard error, falling back to smart template:', err);
    }
  }

  // Fallback Reel Storyboard
  return {
    hook: `อย่าเพิ่งเลื่อนผ่าน! ถ้ายังไม่ได้ชิม ${product.name}!`,
    storyConcept: `เจ๊อ๋อยโชว์ความอร่อยของ ${product.name} ของแท้จากไทย ราคาโดนใจ NT$ ${product.priceNTD}`,
    durationSeconds: 10,
    aspectRatio: '9:16',
    resolution: '720p',
    scenes: [
      {
        sceneNumber: 1,
        timeRange: '0:00 - 0:03',
        durationSeconds: 3,
        visualPrompt: `Vertical 9:16 dynamic shot of authentic ${product.name} being showcased inside a warm Thai grocery store. High quality food close-up.`,
        cameraInstruction: 'Dynamic zoom in from medium shot to extreme close-up',
        characterAction: 'เจ๊อ๋อยถือสินค้าชูขึ้นตรงหน้ากล้องด้วยรอยยิ้มสดใส',
        thaiDialogue: `สูเอ๊ยยย! ${product.name} ล็อตใหม่ลงเครื่องแล้วเด้อ!`,
        soundInstruction: 'Whoosh transition sound effect followed by appetizing sizzle',
        bgmInstruction: 'Catchy fast-paced Thai pop-folk beat',
      },
      {
        sceneNumber: 2,
        timeRange: '0:03 - 0:07',
        durationSeconds: 4,
        visualPrompt: `Macro shot showing product texture and large vibrant price tag NT$ ${product.priceNTD}. Delicious prepared dish alongside raw packaging.`,
        cameraInstruction: 'Smooth panning shot with soft background blur',
        characterAction: 'สาธิตชวนชิมและชี้ป้ายราคา NT$ ชัดเจน',
        thaiDialogue: `ของแท้จากไทย นัวสะท้านลิ้น เพียง NT$ ${product.priceNTD} เท่านั้น!`,
        soundInstruction: 'Crisp ding chime on price badge reveal',
        bgmInstruction: 'Energetic rhythm building up',
      },
      {
        sceneNumber: 3,
        timeRange: '0:07 - 0:10',
        durationSeconds: 3,
        visualPrompt: `End card with KK Shop logo, 7-11 / FamilyMart pickup emblems, and messenger chat CTA button.`,
        cameraInstruction: 'Clean graphic pop-up with pulsing button highlight',
        characterAction: 'เจ๊อ๋อยกวักมือเรียก ยิ้มหวานเชิญชวน',
        thaiDialogue: 'ทัก Inbox ร้านขอนแก่น ส่งด่วนทั่วเกาะไต้หวันจ้า!',
        soundInstruction: 'Notification ping and cheerful cashier bell',
        bgmInstruction: 'Ending punch chord',
      },
    ],
    finalVeoPrompt: `Cinematic vertical 9:16 video of Thai grocery store in Taiwan. Cheerful Thai shopkeeper presenting authentic ${product.name} with price tag NT$ ${product.priceNTD}. Warm bright appetizing lighting, 720p, high frame rate.`,
    googleFlowPrompt: `Prompt for Google Flow Video Studio:\nAspect: 9:16 (Vertical Reel)\nDuration: 10 seconds\nResolution: 720p\nPrompt: Authentic Thai grocery product "${product.name}" presented by friendly Thai shopkeeper woman in Taiwan shop. Bright commercial lighting, crisp product details, NT$ ${product.priceNTD} price tag badge. Thai authentic atmosphere.`,
    hasDirectVeoApi: false,
  };
}

/**
 * Structured Performance Analysis using Gemini
 */
export async function analyzePerformanceWithGemini(
  check: PerformanceCheck
): Promise<{ summaryThai: string; recommendations: string[] }> {
  const prompt = `วิเคราะห์ผลงานโพสต์ Facebook ของร้านของชำไทยในไต้หวัน (ร้านขอนแก่น) หลังเผยแพร่ครบ 72 ชั่วโมง:
- สินค้า: ${check.productName}
- Reach (การเข้าถึง): ${check.reach} คน
- Impressions (การแสดงผล): ${check.impressions} ครั้ง
- Reactions: ${check.reactions}
- Comments: ${check.comments}
- Shares: ${check.shares}
- Clicks: ${check.clicks}
- Engagement Rate: ${check.engagementRate}%

ให้วิเคราะห์และส่งผลลัพธ์เป็น JSON:
{
  "summaryThai": "สรุปผลงานความยาว 2-3 ประโยคเป็นภาษาไทยแบบกระชับ มีคุณค่าเชิงธุรกิจ",
  "recommendations": [
    "คำแนะนำข้อที่ 1 สำหรับการยิงคอนเทนต์หรือสต็อกสินค้า",
    "คำแนะนำข้อที่ 2 เกี่ยวกับเวลาหรือรูปแบบคอนเทนต์"
  ]
}`;

  const ai = getAIClient();
  if (ai) {
    try {
      const res = await ai.models.generateContent({
        model: config.gemini.model,
        contents: prompt,
        config: {
          systemInstruction: KK_SHOP_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          temperature: 0.6,
        },
      });

      const parsed = JSON.parse(res.text?.trim() || '{}');
      if (parsed.summaryThai) {
        return {
          summaryThai: parsed.summaryThai,
          recommendations: parsed.recommendations || [],
        };
      }
    } catch (err) {
      safeLogger.warn('Gemini performance analysis fallback:', err);
    }
  }

  // Fallback analysis
  let summaryThai = '';
  if (check.engagementRate >= 7.0) {
    summaryThai = `โพสต์ "${check.productName}" ทำผลงานได้ดีเยี่ยม อัตรามีส่วนร่วม ${check.engagementRate}% แสดงว่าคอนเทนต์และป้ายราคาจับใจลูกค้าคนไทยในไต้หวันอย่างมาก แนะนำให้ทำซ้ำสไตล์นี้`;
  } else if (check.engagementRate >= 4.0) {
    summaryThai = `โพสต์ "${check.productName}" ผลตอบรับอยู่ในเกณฑ์ดีตามมาตรฐาน อัตรามีส่วนร่วม ${check.engagementRate}% แนะนำให้เพิ่มคำถามกระตุ้นคอมเมนต์เพื่อเพิ่มยอดแชร์`;
  } else {
    summaryThai = `โพสต์ "${check.productName}" อัตรามีส่วนร่วม ${check.engagementRate}% ต่ำกว่าเกณฑ์เฉลี่ย แนะนำให้ปรับเวลาโพสต์เป็นช่วง 18:30-21:00 น. และเน้นโปรโมชั่นให้สะดุดตายิ่งขึ้น`;
  }

  return {
    summaryThai,
    recommendations: [
      'เน้นการโปรโมทสินค้ากลุ่มเครื่องปรุงรสและของสดในช่วงต้นสัปดาห์',
      'โพสต์ในช่วงเวลาเลิกงานของพี่น้องแรงงานไทย (18:00 - 20:30 น.)',
    ],
  };
}
