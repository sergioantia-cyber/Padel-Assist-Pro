import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { playerCategory = '5ª Categoría', courtType = 'Panorámica Pro' } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    res.status(200).json({
      routine: `🔥 Rutina Pro (${playerCategory} en ${courtType}):\n• Calentamiento dinámico: 4 min de movilidad articular de hombros y desplazamientos laterales en fondo.\n• Táctica 1: Aprovecha el rebote controlado en cristal para salir con globo profundo a la esquina descubierta.\n• Táctica 2: Juega bolas por el centro para generar duda en la pareja contraria y subir rápido a la red.`,
      source: 'fallback',
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Eres el Head Coach de pádel del club. Diseña una rutina de calentamiento y 2 tácticas clave para un jugador de ${playerCategory} jugando en pista ${courtType}. Mantén la respuesta breve (máximo 120 palabras), motivadora y estructurada en viñetas.`,
    });

    res.status(200).json({
      routine: response.text || 'Calentamiento activo de 5 min y control de red por el centro.',
      source: 'gemini',
    });
  } catch (err) {
    console.warn('Server Gemini API error:', err);
    res.status(200).json({
      routine: `🔥 Rutina Pro (${playerCategory} en ${courtType}):\n• Calentamiento dinámico: 4 min de movilidad articular de hombros y desplazamientos laterales en fondo.\n• Táctica 1: Aprovecha el rebote controlado en cristal para salir con globo profundo a la esquina descubierta.\n• Táctica 2: Juega bolas por el centro para generar duda en la pareja contraria y subir rápido a la red.`,
      source: 'fallback',
    });
  }
}
