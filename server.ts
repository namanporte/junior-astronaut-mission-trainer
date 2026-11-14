import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-2.5-flash';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Function A: End-of-Sol CAPCOM Debrief Feedback
  app.post('/api/capcom/debrief', async (req: Request, res: Response) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({ error: 'Gemini API key unavailable' });
      return;
    }

    try {
      const {
        sol,
        mode,
        lifeSupportKw,
        shieldingKw,
        classType,
        sourceLocation,
        requiredShieldKw,
        osdrDoseMsv,
        lifeSupportChange,
        lifeSupportLevel,
        cropPenaltyTriggered
      } = req.body ?? {};

      const systemInstruction =
        'You are CAPCOM, a warm, encouraging NASA Mission Control flight director speaking to a 9-year-old Junior Astronaut commanding a lunar or Mars outpost. In 2 short, punchy sentences (maximum 35 words total), explain the real space science cause-and-effect of the player\'s power choices during this Sol. Reference Life Support (O2, Heat & Hydroponics) or Radiation Shielding and praise good tradeoffs or gently coach them if a stat dropped.';

      const userPrompt = `Mode: ${mode}, Sol ${sol} telemetry:
Power Allocation: Life Support (O2, Heat & Hydroponics) ${lifeSupportKw} kW, Radiation Shielding ${shieldingKw} kW.
NASA DONKI Solar Flare: Class ${classType} from Sun region ${sourceLocation} (needed ${requiredShieldKw} kW shielding).
NASA OSDR Radiation Dose: ${osdrDoseMsv} mSv/day.
Outcome: Life Support changed by ${lifeSupportChange >= 0 ? `+${lifeSupportChange}` : lifeSupportChange}% (now ${lifeSupportLevel}%). Crop yield penalty triggered for tomorrow: ${cropPenaltyTriggered ? 'Yes (-15%)' : 'No'}.`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });

      const text = response.text?.trim();
      if (!text) {
        res.status(502).json({ error: 'Empty Gemini response' });
        return;
      }

      res.json({ text });
    } catch (err) {
      console.error('CAPCOM debrief error:', err);
      res.status(500).json({ error: 'Failed to generate CAPCOM debrief' });
    }
  });

  // Function B: Earth Comms Tactical Hint (Moon 3s / Mars 45s scaled)
  app.post('/api/capcom/hint', async (req: Request, res: Response) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({ error: 'Gemini API key unavailable' });
      return;
    }

    try {
      const { upcomingFlare, currentSliders, requiredLifeSupportKw, commsTarget } =
        req.body ?? {};

      const systemInstruction =
        'You are Houston Mission Control radioing a 9-year-old outpost commander. Based on the incoming NASA DONKI solar flare (`classType`) and their current power sliders, give 1 urgent, friendly tactical tip (maximum 20 words) on which slider to adjust before the flare hits.';

      const userPrompt = `Outpost Destination: ${commsTarget}.
Incoming NASA DONKI flare: ${upcomingFlare?.classType} from region ${upcomingFlare?.sourceLocation} (requires ${upcomingFlare?.requiredShieldKw} kW Radiation Shielding).
Current sliders: Life Support (O2, Heat & Hydroponics) ${currentSliders?.lifeSupportKw} kW (needs ${requiredLifeSupportKw} kW), Radiation Shielding ${currentSliders?.shieldingKw} kW.`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });

      const text = response.text?.trim();
      if (!text) {
        res.status(502).json({ error: 'Empty Gemini response' });
        return;
      }

      res.json({ text });
    } catch (err) {
      console.error('CAPCOM hint error:', err);
      res.status(500).json({ error: 'Failed to generate CAPCOM hint' });
    }
  });

  // Final Victory Flight Director Commendation
  app.post('/api/capcom/victory', async (req: Request, res: Response) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({ error: 'Gemini API key unavailable' });
      return;
    }

    try {
      const { finalLifeSupport, totalSols, rank, avgLifeSupport, avgShielding, mode, siteName } =
        req.body ?? {};

      const systemInstruction =
        'You are the NASA Flight Director congratulating a 9-year-old Junior Astronaut who survived all mission Sols. Write a celebratory 2-sentence commendation (maximum 40 words total) praising their specific leadership style based on their stats and power priorities.';

      const userPrompt = `Mission Complete (${mode} Mode at ${siteName}, ${totalSols} Sols)! Final Life Support: ${finalLifeSupport}%, Rank Earned: ${rank}.
Average power priorities: Life Support (O2/Heat/Food) ${avgLifeSupport} kW, Radiation Shielding ${avgShielding} kW.`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });

      const text = response.text?.trim();
      if (!text) {
        res.status(502).json({ error: 'Empty Gemini response' });
        return;
      }

      res.json({ text });
    } catch (err) {
      console.error('CAPCOM victory error:', err);
      res.status(500).json({ error: 'Failed to generate Flight Director commendation' });
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
    console.log(`Lunar Outpost server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
