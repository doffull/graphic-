import { GoogleGenAI } from "@google/genai";

// Using 3.1 for better stability and quality as requested for "ultra-fine" details
const MODEL_NAME = "gemini-3.1-flash-image-preview";

export type VisualStyle = 'engraving' | 'minimalist' | 'ornate' | 'futuristic' | 'organic' | 'glitch' | 'blueprint' | 'sketch' | 'custom' | 'typography' | 'half_text' | 'crowd_illusion' | 'double_exposure' | 'hyper_charcoal';
export type ColorPalette = 'none' | 'vintage_gold' | 'cyber_neon' | 'deep_sea' | 'forest_emerald' | 'royal_velvet';

export interface GenerationParams {
  text?: string;
  words?: string;
  theme: string;
  customPrompt?: string;
  customStylePrompt?: string;
  fineness: number;
  density: number;
  baseImage?: string; // base64
  resolution?: '1K' | '4K';
  useColor?: boolean;
  colorPalette?: ColorPalette;
  customColor?: string;
  customColor2?: string;
  useDoubleColor?: boolean;
  numberOfImages?: number;
  aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  visualStyle?: VisualStyle;
}

function getMimeType(base64: string): string {
  const match = base64.match(/^data:([^;]+);base64,/);
  return match ? match[1] : "image/png";
}

export async function suggestThemes(userInput?: string): Promise<string[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  const context = userInput ? `basé sur l'entrée utilisateur : "${userInput}"` : "basées sur les tendances actuelles du design de gravure";
  const prompt = `Suggère 3 thématiques narratives originales et visuellement riche pour une micro-gravure ultra-fine, ${context}. 
  Réponds uniquement sous forme de liste JSON de chaînes de caractères, par exemple: ["Thème 1", "Thème 2", "Thème 3"]. 
  Chaque thème doit être une phrase courte et évocatrice.`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: "LOW" } as any
      }
    });
    
    const text = response.text?.trim() || "[]";
    return JSON.parse(text);
  } catch (error) {
    console.error("Error suggesting themes:", error);
    return ["Une cité sous-marine oubliée", "Forêt de cristaux géants", "Labyrinthe d'horlogerie céleste"];
  }
}

export async function ensureSafeImageSize(base64: string, maxSize: number = 1024): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width <= maxSize && height <= maxSize) {
        resolve(base64);
        return;
      }

      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

export async function generateMicroGraphix(params: GenerationParams, onProgress?: (msg: string) => void) {
  const isHighRes = params.resolution === '4K';
  const modelToUse = isHighRes ? "gemini-3.1-flash-image-preview" : "gemini-2.5-flash-image";
  
  onProgress?.(isHighRes ? "Initialisation du moteur 4K..." : "Préparation de la gravure...");
  
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  const palettePrompts: Record<ColorPalette, string> = {
    none: "Black and white 1-bit style.",
    vintage_gold: "Vintage gold and sepia tones, aged parchment feel, metallic highlights.",
    cyber_neon: "Electric cyan, magenta, and neon green accents on dark background.",
    deep_sea: "Bioluminescent blues, deep teals, and shimmering aquatic highlights.",
    forest_emerald: "Rich emerald greens, mossy textures, and golden sunlight filtering through.",
    royal_velvet: "Deep crimson, royal purple, and gold filigree accents."
  };

  let activeColorPrompt = palettePrompts[params.colorPalette || 'none'];
  if (params.customColor) {
    if (params.useDoubleColor && params.customColor2) {
      activeColorPrompt = `Use a dual-color texture with ${params.customColor} and ${params.customColor2} for the engraving lines, creating a striking two-tone colored engraving on a dark background.`;
    } else {
      activeColorPrompt = `Use the specific color ${params.customColor} for all the engraving lines and details, creating a monochrome colored engraving on a dark background.`;
    }
  }

  const stylePrompts: Record<VisualStyle, string> = {
    engraving: params.useColor 
      ? `Fine line colored engraving style, ${activeColorPrompt} high contrast, microscopic details, intricate patterns.`
      : "Fine line black and white engraving, high contrast, 1-bit style, microscopic details, no shading, optimized for screen printing.",
    minimalist: "Clean minimalist design, ultra-thin precise lines, geometric simplicity, high contrast, microscopic precision, no clutter.",
    ornate: "Extremely ornate and decorative, Victorian/Baroque flourishes, microscopic filigree, dense intricate patterns, high luxury feel.",
    futuristic: "Futuristic tech aesthetic, microscopic circuit patterns, neon-like fine lines, digital glitch textures, high-tech microscopic precision.",
    organic: "Organic flowing lines, microscopic biological textures, intricate leaf veins, cellular patterns, natural ultra-fine details.",
    glitch: "Digital glitch art style, fragmented lines, microscopic data corruption textures, high contrast, tech-noir aesthetic.",
    blueprint: "Technical blueprint style, architectural fine lines, microscopic measurements and annotations, cyanotype aesthetic, precise engineering feel.",
    sketch: "Hand-drawn charcoal sketch style, microscopic graphite textures, fine cross-hatching, artistic raw feel, high contrast.",
    custom: params.customStylePrompt || "Custom artistic style based on user description.",
    typography: `Calligram and typography art style. The subject is constructed ENTIRELY out of text and words. Use the following words to build the image: "${params.words || 'WORDS TEXT'}". The letters vary in size, weight, and density to create shadows and highlights. No standard lines, ONLY text. Black background, white text, high contrast.`,
    half_text: `Split portrait style. One half of the image is a high-contrast realistic portrait, the other half is composed of bold typography reading: "${params.words || 'QUOTE'}". Deep black background, dramatic lighting.`,
    crowd_illusion: `Optical illusion macro art. The subject's features are entirely formed by thousands of tiny, microscopic people walking and standing. The density of the crowd creates the shading. Black and white, high contrast ink style.`,
    double_exposure: `Surreal double exposure portrait. The subject's face seamlessly merges with a highly detailed, chaotic cityscape, buildings, and smoke. Intricate architectural details blend into facial features. Monochrome, charcoal and ink wash aesthetic.`,
    hyper_charcoal: `Hyper-realistic charcoal and graphite sketch. Extreme detail, dramatic chiaroscuro lighting, deep blacks, textured paper feel, masterful shading, photorealistic but with artistic pencil strokes.`
  };

  const selectedStyle = stylePrompts[params.visualStyle || 'engraving'];
  
  const themeDescriptions: Record<string, string> = {
    medieval: "Epic medieval battlefield, thousands of microscopic knights and archers, intricate chainmail textures, ultra-fine heraldic symbols, dense cross-hatching",
    baroque: "Opulent baroque palace interior, microscopic filigree, ultra-detailed gold leaf patterns, intricate lace textures, divine celestial figures in the background",
    riot: "High-energy urban uprising, microscopic protesters and stylized figures, intricate smoke and fire patterns, dense architectural details, symbolic movement, high contrast rebellion.",
    lion_pigeons: "Surreal microscopic encounter: a majestic lion composed of thousands of tiny pigeons and rats, intricate fur and feather textures, dreamlike composition",
    political_chaos: "Symbolic scene of corruption: figures in shadows, flying banknotes like microscopic leaves, open suitcases with intricate patterns, surreal and narrative",
    poker_rage: "Dramatic high-stakes poker game, microscopic cards and chips flying in mid-air, intricate wood grain on the table, expressive microscopic faces",
    revolution: "Massive revolutionary barricade, thousands of microscopic citizens holding flags and torches, intricate cobblestone textures, smoke and fire in ultra-fine detail, symbolic figure of liberty leading the people.",
    anarchy: "Symbolic anarchy: a royal crown being shattered into thousands of microscopic pieces, intricate cracks and splinters, chaotic but precise lines, symbols of broken chains and falling statues, raw energy.",
    urban_guerrilla: "Urban guerrilla warfare in a microscopic concrete jungle, figures in shadows, intricate spray-paint textures, ultra-fine detail on barricades and broken glass, high-tension atmosphere.",
    inner_storm: "Abstract expression of inner rage: a microscopic human heart composed of thousands of tiny thorns and lightning bolts, intricate vascular patterns, explosive energy lines, high contrast, visceral emotion.",
    cyberpunk: "Dystopian cyberpunk megacity, microscopic neon signs, intricate circuit board patterns on buildings, ultra-fine rain and steam effects",
    steampunk: "Colossal steampunk engine room, thousands of microscopic gears and pistons, intricate copper pipe networks, ultra-detailed steam and pressure gauges",
    space: "Cosmic space odyssey, microscopic astronauts floating near massive intricate spacecraft, ultra-fine star clusters and nebula textures",
    jungle: "Overgrown tropical jungle, microscopic exotic insects, intricate leaf veins, ultra-detailed vine networks, dense botanical textures",
    cbd_jungle: "Microscopic jungle of cannabis leaves and CBD flowers, ultra-fine trichome details, intricate leaf serrations, dense botanical engraving, microscopic crystalline structures",
    clockwork: "Microscopic clockwork mechanism, thousands of interlocking gears, tiny springs and escapements, intricate brass textures, horological precision",
    coral_reef: "Microscopic coral reef ecosystem, tiny polyps and sea anemones, intricate calcium structures, bioluminescent plankton, dense aquatic textures",
    ice_fractals: "Microscopic ice crystals and fractals, intricate snowflake geometry, frozen air bubbles, ultra-fine crystalline light refraction",
    alchemy: "Alchemical laboratory, microscopic glass vials and alembics, intricate mystical symbols, tiny bubbling potions, dense esoteric details",
    silicon_city: "Microscopic silicon wafer city, intricate transistor architectures, glowing data paths, ultra-fine nanotech structures, digital metropolis"
  };

  const themeDesc = params.theme === 'custom' ? params.customPrompt : (themeDescriptions[params.theme] || params.theme);
  let prompt = `Create a micro-engraving visual. Theme: ${themeDesc}. `;
  if (params.text) prompt += `Incorporate the text, word, or phrase "${params.text}" as the central structure. The typography should be formed entirely by the micro-engravings and clearly legible. `;
  if (params.customPrompt && params.theme !== 'custom') prompt += `Details to include: ${params.customPrompt}. `;
  prompt += `Technical specs: Line fineness level ${params.fineness}/100, Detail density level ${params.density}/100. `;
  prompt += selectedStyle;

  const parts: any[] = [{ text: prompt }];

  if (params.baseImage) {
    onProgress?.("Analyse du logo source...");
    const safeBaseImage = await ensureSafeImageSize(params.baseImage);
    const mimeType = getMimeType(safeBaseImage);
    const base64Data = safeBaseImage.split(',')[1];
    
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    });
    
    const maskPrompt = `Using the provided image as a structural guide and silhouette, fill the shape with ultra-fine micro-engravings matching the theme: ${themeDesc}. ${params.useColor ? activeColorPrompt : 'Maintain the 1-bit black and white engraving style.'} ${selectedStyle}`;
    parts[0].text = maskPrompt;
  }

  onProgress?.(isHighRes ? "Génération des détails 4K (cela peut prendre 30s)..." : "Génération des micro-détails...");

  const numImages = params.numberOfImages || 1;
  const generateSingleImage = async () => {
    try {
      const config: any = {
        imageConfig: {
          aspectRatio: params.aspectRatio || "1:1"
        }
      };

      if (isHighRes) {
        config.imageConfig.imageSize = "4K";
      }

      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: { parts },
        config
      });

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error("L'IA n'a pas pu générer de contenu. Cela peut être dû à une demande trop complexe ou à une erreur temporaire du serveur.");
      }

      const candidate = response.candidates[0];
      
      if (candidate.finishReason === "SAFETY") {
        throw new Error("La génération a été bloquée par les filtres de sécurité de l'IA (IMAGE_SAFETY). Cela arrive souvent avec des thèmes sensibles comme la politique ou la violence. Essayez de reformuler votre demande ou de choisir un thème plus neutre.");
      }

      if (!candidate.content?.parts) {
        throw new Error(`Erreur de réponse (Raison: ${candidate.finishReason}). Veuillez réessayer avec des paramètres différents.`);
      }

      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      
      const textPart = response.candidates[0].content.parts.find(p => p.text);
      if (textPart) {
        console.warn("Model returned text instead of image:", textPart.text);
        throw new Error("Le modèle a renvoyé du texte au lieu d'une image. Cela peut arriver si la demande est trop abstraite. Essayez d'être plus spécifique.");
      }

      throw new Error("Aucune image n'a été générée dans la réponse de l'IA.");
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      if (error.message?.includes("INTERNAL")) {
        throw new Error("Erreur interne du serveur AI (500). Cela arrive parfois avec des images complexes. Réessayez ou changez de thématique.");
      }
      if (error.message?.includes("INVALID_ARGUMENT")) {
        throw new Error("Argument invalide : l'image fournie ou les paramètres sont incorrects. Vérifiez votre logo ou vos réglages.");
      }
      if (error.message?.includes("RESOURCE_EXHAUSTED") || error.message?.includes("spending cap") || error.message?.includes("429")) {
        throw new Error("Quota d'utilisation dépassé (Erreur 429). Votre projet a dépassé son plafond de dépenses mensuel. Veuillez vous rendre sur https://ai.studio/spend pour gérer votre plafond de dépenses, ou sélectionnez une autre clé API.");
      }
      throw error;
    }
  };

  try {
    const promises = Array.from({ length: numImages }).map(() => generateSingleImage());
    const results = await Promise.all(promises);
    onProgress?.("Finalisation des images...");
    return results;
  } catch (error) {
    throw error;
  }
}

export async function modifyWithAI(currentImage: string, instruction: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  const modelToUse = "gemini-2.5-flash-image"; // Faster for iterations

  // Ensure image is a safe size for processing as input - optimized for speed (512px)
  const safeImage = await ensureSafeImageSize(currentImage, 512);
  const mimeType = getMimeType(safeImage);
  const base64Data = safeImage.split(',')[1];

  const prompt = `Modify this micro-engraving image according to this instruction: "${instruction}". Maintain the ultra-fine black and white engraving style, high contrast, 1-bit style.`;

  try {
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    const candidate = response.candidates?.[0];
    if (candidate?.finishReason === "SAFETY") {
      throw new Error("La modification a été bloquée par les filtres de sécurité (IMAGE_SAFETY). Essayez une instruction plus simple ou moins sensible.");
    }

    for (const part of candidate?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("Modification failed: No image returned");
  } catch (error: any) {
    console.error("Gemini API Error (Modify):", error);
    if (error.message?.includes("RESOURCE_EXHAUSTED") || error.message?.includes("spending cap") || error.message?.includes("429")) {
      throw new Error("Quota d'utilisation dépassé (Erreur 429). Votre projet a dépassé son plafond de dépenses mensuel. Veuillez vous rendre sur https://ai.studio/spend pour gérer votre plafond de dépenses, ou sélectionnez une autre clé API.");
    }
    throw error;
  }
}
