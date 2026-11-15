import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';
const TTS_MODEL_NAME = 'gemini-3.8-flash-lite-tts';

const VALID_VOICES = new Set(['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr']);
const ttsCache = new Map<string, string>();
let ttsCooldownUntil = 0;
let capcomCooldownUntil = 0;

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function isQuotaOrRateLimitError(err: unknown): boolean {
  const msg = extractErrorMessage(err);
  return (
    msg.includes('"code":429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    /quota|rate[- ]?limit/i.test(msg)
  );
}

function extractRetryDelayMs(err: unknown, defaultMs = 15 * 60 * 1000): number {
  const msg = extractErrorMessage(err);
  const jsonDelayMatch = msg.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/i);
  if (jsonDelayMatch) {
    const secs = Number(jsonDelayMatch[1]);
    if (Number.isFinite(secs) && secs > 0) {
      return Math.min(60 * 60 * 1000, Math.max(60 * 1000, Math.ceil(secs * 1000)));
    }
  }
  const humanDelayMatch = msg.match(/retry in\s+(?:(\d+)m)?(\d+(?:\.\d+)?)s/i);
  if (humanDelayMatch) {
    const mins = Number(humanDelayMatch[1] || 0);
    const secs = Number(humanDelayMatch[2] || 0);
    const totalMs = (mins * 60 + secs) * 1000;
    if (Number.isFinite(totalMs) && totalMs > 0) {
      return Math.min(60 * 60 * 1000, Math.max(60 * 1000, Math.ceil(totalMs)));
    }
  }
  return defaultMs;
}

function getGeminiClient(apiVersion = 'v1beta'): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion,
    httpOptions: {
      apiVersion
    }
  });
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.post('/api/tts', async (req: Request, res: Response) => {
    const now = Date.now();
    if (now < ttsCooldownUntil) {
      res.json({
        audioBase64: null,
        fallback: true,
        retryAfterMs: ttsCooldownUntil - now
      });
      return;
    }

    const ai = getGeminiClient('v1beta');
    if (!ai) {
      res.json({ audioBase64: null, fallback: true, retryAfterMs: 10 * 60 * 1000 });
      return;
    }

    try {
      const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
      if (!rawText) {
        res.status(400).json({ error: 'Missing text for TTS' });
        return;
      }

      const clippedText = rawText.slice(0, 420);
      const requestedVoice = typeof req.body?.voiceName === 'string' ? req.body.voiceName : 'Kore';
      const voiceName = VALID_VOICES.has(requestedVoice) ? requestedVoice : 'Kore';
      const style =
        typeof req.body?.style === 'string' && req.body.style.trim()
          ? req.body.style.trim().slice(0, 140)
          : 'Clear, enthusiastic space mission voice';

      const cacheKey = `${voiceName}|${style}|${clippedText}`;
      const cached = ttsCache.get(cacheKey);
      if (cached) {
        res.json({ audioBase64: cached, mimeType: 'audio/wav', cached: true });
        return;
      }

      const response = await ai.models.generateContent({
        model: TTS_MODEL_NAME,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: clippedText,
                speechMetadata: {
                  style
                }
              }
            ]
          }
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName }
            }
          }
        }
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        res.json({ audioBase64: null, fallback: true, retryAfterMs: 60 * 1000 });
        return;
      }

      if (ttsCache.size >= 48) {
        const oldestKey = ttsCache.keys().next().value;
        if (oldestKey) ttsCache.delete(oldestKey);
      }
      ttsCache.set(cacheKey, base64Audio);

      res.json({ audioBase64: base64Audio, mimeType: 'audio/wav' });
    } catch (err) {
      const retryAfterMs = isQuotaOrRateLimitError(err)
        ? extractRetryDelayMs(err)
        : 10 * 60 * 1000;
      if (Date.now() >= ttsCooldownUntil) {
        console.warn(
          `TTS switched to Web Speech fallback for ${Math.round(retryAfterMs / 1000)}s:`,
          isQuotaOrRateLimitError(err) ? 'quota/rate limit reached' : extractErrorMessage(err)
        );
      }
      ttsCooldownUntil = Date.now() + retryAfterMs;
      res.json({ audioBase64: null, fallback: true, retryAfterMs });
    }
  });

  app.post('/api/capcom/debrief', async (req: Request, res: Response) => {
    const now = Date.now();
    if (now < capcomCooldownUntil) {
      res.json({ text: null, fallback: true, retryAfterMs: capcomCooldownUntil - now });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.json({ text: null, fallback: true, retryAfterMs: 10 * 60 * 1000 });
      return;
    }

    try {
      const {
        sol,
        world,
        electrolysisKw,
        growHeatKw,
        shieldingKw,
        stormName,
        requiredShieldKw,
        waterO2Pct,
        cropsPct,
        cabinTempC,
        co2Ppm,
        sunBlanketSaved
      } = req.body ?? {};

      const systemInstruction =
        'You are Earth Buddy, an encouraging Moon/Mars base flight mentor. In 2 crisp sentences (max 36 words total, zero external data-source names), react to the base physics telemetry (electrolysis water/O2, cabin temperature, CO2 ppm, crops, and Forcefield defense) and give one practical survival tip.';

      const userPrompt = `${world} Base Sol ${sol}:
Power: Electrolysis ${electrolysisKw}⚡, Grow/Heat ${growHeatKw}⚡, Forcefield ${shieldingKw}⚡ (needed ${requiredShieldKw}⚡ for ${stormName}).
Sun Blanket saved base: ${sunBlanketSaved ? 'Yes' : 'No'}.
Systems: Water/O2 ${waterO2Pct}%, Crops ${cropsPct}%, Temp ${cabinTempC}°C, CO2 ${co2Ppm} ppm.`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: userPrompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });

      const text = response.text?.trim();
      if (!text) {
        res.json({ text: null, fallback: true, retryAfterMs: 60 * 1000 });
        return;
      }

      res.json({ text });
    } catch (err) {
      const retryAfterMs = isQuotaOrRateLimitError(err)
        ? extractRetryDelayMs(err)
        : 10 * 60 * 1000;
      if (Date.now() >= capcomCooldownUntil) {
        console.warn(
          `CAPCOM radio switched to local fallback for ${Math.round(retryAfterMs / 1000)}s:`,
          isQuotaOrRateLimitError(err) ? 'quota/rate limit reached' : extractErrorMessage(err)
        );
      }
      capcomCooldownUntil = Date.now() + retryAfterMs;
      res.json({ text: null, fallback: true, retryAfterMs });
    }
  });

  app.post('/api/capcom/hint', async (req: Request, res: Response) => {
    const now = Date.now();
    if (now < capcomCooldownUntil) {
      res.json({ text: null, fallback: true, retryAfterMs: capcomCooldownUntil - now });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.json({ text: null, fallback: true, retryAfterMs: 10 * 60 * 1000 });
      return;
    }

    try {
      const {
        upcomingFlare,
        currentSliders,
        requiredLifeSupportKw,
        requiredGrowHeatKw,
        commsTarget
      } = req.body ?? {};

      const systemInstruction =
        'You are Earth Buddy radioing a Moon/Mars base commander. Give 1 sharp, friendly tactical tip (max 24 words) about balancing Electrolysis, Grow/Heaters, or Forcefield ⚡ power.';

      const userPrompt = `World: ${commsTarget}. Storm: ${upcomingFlare?.stormName} (needs ${upcomingFlare?.requiredShieldKw}⚡ Forcefield).
Sliders: Electrolysis ${currentSliders?.electrolysisKw}⚡ (req ${requiredLifeSupportKw}⚡), Grow/Heat ${currentSliders?.growHeatKw}⚡ (req ${requiredGrowHeatKw}⚡), Forcefield ${currentSliders?.shieldingKw}⚡.`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: userPrompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });

      const text = response.text?.trim();
      if (!text) {
        res.json({ text: null, fallback: true, retryAfterMs: 60 * 1000 });
        return;
      }

      res.json({ text });
    } catch (err) {
      const retryAfterMs = isQuotaOrRateLimitError(err)
        ? extractRetryDelayMs(err)
        : 10 * 60 * 1000;
      if (Date.now() >= capcomCooldownUntil) {
        console.warn(
          `CAPCOM radio switched to local fallback for ${Math.round(retryAfterMs / 1000)}s:`,
          isQuotaOrRateLimitError(err) ? 'quota/rate limit reached' : extractErrorMessage(err)
        );
      }
      capcomCooldownUntil = Date.now() + retryAfterMs;
      res.json({ text: null, fallback: true, retryAfterMs });
    }
  });

  app.post('/api/capcom/victory', async (req: Request, res: Response) => {
    const now = Date.now();
    if (now < capcomCooldownUntil) {
      res.json({ text: null, fallback: true, retryAfterMs: capcomCooldownUntil - now });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.json({ text: null, fallback: true, retryAfterMs: 10 * 60 * 1000 });
      return;
    }

    try {
      const { finalWaterO2, finalCrops, totalSols, rank, world, siteName } = req.body ?? {};

      const systemInstruction =
        'You are Space Camp Mission Lead cheering a base commander who survived real Moon/Mars hazards. Write 2 lively sentences (max 38 words total) celebrating their engineering and quick decisions.';

      const userPrompt = `Completed ${totalSols} Sols at ${siteName} (${world})! Final Water/O2: ${finalWaterO2}%, Crops: ${finalCrops}%, Rank: ${rank}.`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: userPrompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });

      const text = response.text?.trim();
      if (!text) {
        res.json({ text: null, fallback: true, retryAfterMs: 60 * 1000 });
        return;
      }

      res.json({ text });
    } catch (err) {
      const retryAfterMs = isQuotaOrRateLimitError(err)
        ? extractRetryDelayMs(err)
        : 10 * 60 * 1000;
      if (Date.now() >= capcomCooldownUntil) {
        console.warn(
          `CAPCOM radio switched to local fallback for ${Math.round(retryAfterMs / 1000)}s:`,
          isQuotaOrRateLimitError(err) ? 'quota/rate limit reached' : extractErrorMessage(err)
        );
      }
      capcomCooldownUntil = Date.now() + retryAfterMs;
      res.json({ text: null, fallback: true, retryAfterMs });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AstroJun server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
