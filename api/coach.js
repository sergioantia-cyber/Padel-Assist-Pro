import { GoogleGenAI } from '@google/genai';

/**
 * Vercel Serverless Function: /api/coach
 * Keeps GEMINI_API_KEY strictly on the server so it is never exposed in the client JS bundle.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { playerCategory = '5ª Categoría', courtType = 'Panorámica Pro' } = req.body || {};

  const fallbackRoutine = `🔥 Rutina Pro (${playerCategory} en ${courtType}):\n• Calentamiento dinámico: 4 min de movilidad articular de hombros y desplazamientos laterales en fondo.\n• Táctica 1: Aprovecha el rebote controlado en cristal para salir con globo profundo a la esquina descubierta.\n• Táctica 2: Juega bolas por el centro para generar duda en la pareja contraria y subir rápido a la red.`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ routine: fallbackRoutine, source: 'fallback' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Eres el Head Coach de pádel del club. Diseña una rutina de calentamiento y 2 tácticas clave para un jugador de ${playerCategory} jugando en pista ${courtType}. Mantén la respuesta breve (máximo 120 palabras), motivadora y estructurada en viñetas.`,
    });

    if (response.text) {
      return res.status(200).json({ routine: response.text, source: 'gemini' });
    }
  } catch (err) {
    console.warn('Server-side Gemini API warning:', err);
  }

  return res.status(200).json({ routine: fallbackRoutine, source: 'fallback' });
}
