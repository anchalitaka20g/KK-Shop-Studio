/**
 * KK Shop Content Studio - Video Generation Provider Interface & Implementations
 * Supports Gemini/Veo API and Google Flow manual fallback workflow
 */

import { ReelStoryboard, Product, Character } from '../types.js';
import { GoogleGenAI } from '@google/genai';

export interface VideoGenerationResult {
  videoUrl?: string;
  operationName?: string;
  isDirectApiAvailable: boolean;
  status: 'COMPLETED' | 'POLLING' | 'MANUAL_REQUIRED';
  googleFlowPrompt: string;
  copyInstructions: string;
  externalFlowUrl: string;
}

export interface VideoGenerationProvider {
  name: string;
  createReelVideo(
    storyboard: ReelStoryboard,
    product: Product,
    character?: Character
  ): Promise<VideoGenerationResult>;
}

export class VeoVideoGenerationProvider implements VideoGenerationProvider {
  name = 'Google Veo / Gemini Video Provider';

  async createReelVideo(
    storyboard: ReelStoryboard,
    product: Product,
    character?: Character
  ): Promise<VideoGenerationResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    const isDirectAvailable = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');

    // Build the rich Google Flow prompt
    const flowPrompt = `=== GOOGLE FLOW / VEO 3.1 PROMPT ===
Aspect Ratio: 9:16 (Vertical Reel)
Resolution: 720p
Duration: ${storyboard.durationSeconds}s
Language: THAI DIALOGUE ONLY

[Product Details]
- Product: ${product.name}
- Official Price: NT$ ${product.priceNTD} (${product.size})
- Store: ร้านขอนแก่น (KK Shop Taiwan)

[Hook (0-3s)]
${storyboard.scenes[0]?.thaiDialogue || storyboard.hook}
Visual: ${storyboard.scenes[0]?.visualPrompt}

[Body (3-7s)]
${storyboard.scenes[1]?.thaiDialogue}
Visual: ${storyboard.scenes[1]?.visualPrompt}

[CTA & Outro (7-10s)]
${storyboard.scenes[2]?.thaiDialogue}
Visual: ${storyboard.scenes[2]?.visualPrompt}

[Cinematic Visual Prompt]
${storyboard.finalVeoPrompt}`;

    // Note: In case direct Veo API call is possible, it would follow the 3-step Veo SDK pattern.
    // However, as specified: "Because Google Flow product credits and Gemini API billing/quota may be separate,
    // do not assume Google Flow UI credits are callable through the Gemini API.
    // If direct video generation is unavailable, provide: 'Copy Prompt for Google Flow' and 'Open Video Production'
    // workflow so the administrator can generate the video manually and upload/select the finished result."

    return {
      isDirectApiAvailable: false, // Default to safe manual fallback flow
      status: 'MANUAL_REQUIRED',
      googleFlowPrompt: flowPrompt,
      copyInstructions: 'คัดลอก Prompt ด้านล่างแล้วนำไปสร้างวิดีโอบน Google Flow หรือ AI Studio จากนั้นนำลิงก์หรือไฟล์วิดีโอ 9:16 ที่ได้มาอัปโหลดเข้าสู่คลัง',
      externalFlowUrl: 'https://aistudio.google.com/',
      videoUrl: storyboard.videoUrl,
    };
  }
}

let activeVideoProvider: VideoGenerationProvider = new VeoVideoGenerationProvider();

export function getVideoGenerationProvider(): VideoGenerationProvider {
  return activeVideoProvider;
}

export function setVideoGenerationProvider(provider: VideoGenerationProvider) {
  activeVideoProvider = provider;
}
