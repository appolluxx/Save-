/**
 * SaveRaks Server-Side AI Computer Vision Service
 * 
 * DESIGN PRINCIPLE:
 * - Evaluates waste photos for material classification and bin recommendation.
 * - Primary provider: Groq Vision (fast open inference).
 * - Fallback provider: Google Gemini Flash.
 * - Defensive Resilience: If providers are unreachable or unconfigured, falls back
 *   safely to PENDING for manual teacher review (NEVER auto-approves on error).
 * - Output validated against shared aiVisionOutputSchema.
 * 
 * @module services/ai-vision
 */

import { aiVisionOutputSchema } from '@saveraks/shared/schemas';
import { env } from '../config/env.js';

const SYSTEM_INSTRUCTION = `
You are an expert waste sorting and recycling AI for Surasakmontree School in Bangkok, Thailand.
Analyze the user-submitted photo and identify the item, its material, and the correct Thai standard waste bin.

Available 4-Color Waste Bins:
- YELLOW: Recyclable (ขวดพลาสติก PET, กระป๋องอลูมิเนียม, กล่องลัง, กระดาษ, ขวดแก้ว)
- GREEN: Organic / Wet (เศษอาหาร, เปลือกผลไม้, เศษผัก, ใบไม้)
- BLUE: General (ซองขนม, กล่องโฟม, หลอดพลาสติก, ฟิล์มห่ออาหาร, ทิชชู่เปื้อน)
- ORANGE_RED: Hazardous (ถ่านไฟฉาย, แบตเตอรี่, หลอดไฟ, กระป๋องสเปรย์, ขยะอิเล็กทรอนิกส์)

Respond STRICTLY with a single JSON object matching this schema (no markdown fences, no extra text):
{
  "isValid": boolean (true if image shows recognizable environmental or waste sorting action),
  "detectedCategory": string (e.g. "RECYCLE_PET", "RECYCLE_CAN", "ORGANIC_FOOD", "GENERAL_WRAPPER", "HAZARDOUS_BATTERY"),
  "confidence": number (between 0.0 and 1.0),
  "detectedObjects": string[] (list of recognized items, e.g. ["plastic bottle", "yellow bin"]),
  "thaiSummary": string (clear Thai advice, e.g. "ขวดน้ำดื่ม PET ควรเทน้ำออก บีบขวดให้แบน แล้วทิ้งลงถังสีเหลือง"),
  "recommendedBinColor": "YELLOW" | "GREEN" | "BLUE" | "ORANGE_RED"
}
`;

/**
 * Analyzes waste photo and returns structured classification.
 * @param {Buffer} imageBuffer - WebP or JPEG image buffer
 * @returns {Promise<{ isValid: boolean, detectedCategory: string, confidence: number, detectedObjects: string[], thaiSummary: string, recommendedBinColor: string }>}
 */
export async function analyzeWasteImage(imageBuffer) {
  const base64Image = imageBuffer.toString('base64');
  const dataUri = `data:image/webp;base64,${base64Image}`;

  // 1. Try Groq Vision API
  if (env.GROQ_API_KEY) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.2-11b-vision-preview',
          messages: [
            { role: 'system', content: SYSTEM_INSTRUCTION },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Identify this waste item and recommend the correct bin.' },
                { type: 'image_url', image_url: { url: dataUri } },
              ],
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 500,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const content = result.choices?.[0]?.message?.content;
        const parsed = JSON.parse(content);
        const validated = aiVisionOutputSchema.safeParse(parsed);
        if (validated.success) {
          return validated.data;
        }
      }
    } catch (groqErr) {
      console.warn('⚠️ Groq Vision API failed, attempting Gemini fallback:', groqErr.message);
    }
  }

  // 2. Try Gemini Flash API (Fallback)
  if (env.GEMINI_API_KEY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [
            {
              parts: [
                { text: 'Analyze this waste item and output JSON:' },
                {
                  inlineData: {
                    mimeType: 'image/webp',
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(content);
        const validated = aiVisionOutputSchema.safeParse(parsed);
        if (validated.success) {
          return validated.data;
        }
      }
    } catch (geminiErr) {
      console.warn('⚠️ Gemini Flash API failed:', geminiErr.message);
    }
  }

  // 3. Graceful Fallback: Queued for Staff Review
  // When external APIs are unconfigured or offline, provide a safe deterministic pending response.
  return {
    isValid: true,
    detectedCategory: 'MANUAL_REVIEW',
    confidence: 0.5,
    detectedObjects: ['unverified photo'],
    thaiSummary: 'ระบบกำลังจัดคิวให้คุณครูหรือเจ้าหน้าที่ตรวจสอบภาพถ่ายด้วยตนเอง',
    recommendedBinColor: 'YELLOW',
  };
}
