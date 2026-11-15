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

function getGeminiClient(apiVersion = 'v1beta'): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion,
    httpOptions: {
      apiVersion,
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.post('/api/tts', async (req: Request, res: Response) => {
    const ai = getGeminiClient('v1beta');
    if (!ai) {
      res.status(503).json({ error: 'Gemini API key unavailable' });
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
        res.status(502).json({ error: 'Empty audio response from TTS' });
        return;
      }

      if (ttsCache.size >= 48) {
        const oldestKey = ttsCache.keys().next().value;
        if (oldestKey) ttsCache.delete(oldestKey);
      }
      ttsCache.set(cacheKey, base64Audio);

      res.json({ audioBase64: base64Audio, mimeType: 'audio/wav' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('TTS generation error:', err);
      res.status(500).json({ error: 'Failed to synthesize voice', detail: msg });
    }
  });

  app.post('/api/capcom/debrief', async (req: Request, res: Response) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({ error: 'Gemini API key unavailable' });
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
        res.status(502).json({ error: 'Empty Gemini response' });
        return;
      }

      res.json({ text });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('CAPCOM debrief error:', err);
      res.status(500).json({ error: 'Failed to generate debrief', detail: msg });
    }
  });

  app.post('/api/capcom/hint', async (req: Request, res: Response) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({ error: 'Gemini API key unavailable' });
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
        res.status(502).json({ error: 'Empty Gemini response' });
        return;
      }

      res.json({ text });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('CAPCOM hint error:', err);
      res.status(500).json({ error: 'Failed to generate hint', detail: msg });
    }
  });

  app.post('/api/capcom/victory', async (req: Request, res: Response) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({ error: 'Gemini API key unavailable' });
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
        res.status(502).json({ error: 'Empty Gemini response' });
        return;
      }

      res.json({ text });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('CAPCOM victory error:', err);
      res.status(500).json({ error: 'Failed to generate victory note', detail: msg });
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
    console.log(`Lunar/Mars Outpost server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
