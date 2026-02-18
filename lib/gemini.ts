import { GoogleGenAI, Modality, Part } from "@google/genai";

const API_KEY =
  process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("Missing GEMINI_API_KEY for Gemini integration");
}

const MODEL_ID =
  process.env.GEMINI_MODEL_ID || "gemini-2.5-flash-image";

const ai = new GoogleGenAI({ apiKey: API_KEY });

// buttlet prompt
// const YARN_PROMPT = `crea una reinterpretación del warplet, el personaje principal de la imagen, en el que en lugar de brazos tenga tenazas de langosta, cambia los pies por patas de langosta y agrega una cola y antenas de langosta. manten el tamaño, formato, colores y estilo de la imagen original.`;
// crochet warplet prompt
// const YARN_PROMPT = `Realiza una reinterpretación de la imagen proporcionada en una figura 3d de estambre hecha a mano tipo crochet, deberás respetar los rasgos, caracteristica física, colores, accesorios, tamaño y postura de la imagen original. La imagen final deberá ser realista, como si se tratara de una fotografía, elaborada en estambre grueso tejido en crochet y sin ningun tipo de contorno o linea que la defina para garantizar que se vea como una figura 3d heca de estambre, la escala de la imagen siempre sera 1:1`;
const YARN_PROMPT = `Rotate the provided Warplet character to a full back view (180° turn), showing the character from behind.
The back view must clearly show a large, rounded, fluffy buttocks in a playful, cartoonish, non-sexual way, consistent with the original character design.
If the character is wearing clothing, do not remove it — simply define and emphasize the buttocks shape naturally through the clothing.
Preserve the original cartoon illustration style, proportions, line work, shading, and color palette.
The output image proportion must always be 1:1.`;
export async function generateYarnImageFromPart(
  imagePart: Part 
): Promise<{ data: string; mimeType: string }> {
  const response = await ai.models.generateContent({
    model: MODEL_ID,
    contents: {
      parts: [
        imagePart,
        {
          text: YARN_PROMPT,
        },
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return {
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType || "image/png",
      };
    }
  }
  throw new Error("Gemini did not return an image payload");
}

export async function generateYarnImageFromBuffer(
  buffer: Buffer,
  mimeType: string
) {
  return generateYarnImageFromPart({
    inlineData: {
      data: buffer.toString("base64"),
      mimeType,
    },
  });
}
