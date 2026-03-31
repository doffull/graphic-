import React, { useState, useCallback } from 'react';
import { 
  Upload, 
  Type, 
  Settings, 
  Layers, 
  Download, 
  RefreshCw, 
  MessageSquare, 
  Image as ImageIcon,
  ChevronRight,
  Sparkles,
  Trash2,
  FileJson,
  FileText,
  Maximize2,
  Palette,
  LayoutGrid,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Clock,
  Shirt,
  X
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';
import ImageTracer from 'imagetracerjs';
import { generateMicroGraphix, modifyWithAI, suggestThemes, ensureSafeImageSize, GenerationParams, VisualStyle, ColorPalette } from './services/gemini';

const THEMES = [
  { id: 'riot', name: 'Émeute & Rébellion', icon: '🔥' },
  { id: 'urban_guerrilla', name: 'Guérilla Urbaine', icon: '🏙️' },
  { id: 'revolution', name: 'Révolution Populaire', icon: '🚩' },
  { id: 'anarchy', name: 'Anarchie & Chaos', icon: 'Ⓐ' },
  { id: 'political_chaos', name: 'Corruption & Protestation', icon: '💸' },
  { id: 'inner_storm', name: 'Rage Intérieure', icon: '🌪️' },
  { id: 'lion_pigeons', name: 'Le Lion & les Rats', icon: '🦁' },
  { id: 'poker_rage', name: 'Rage au Poker', icon: '🃏' },
  { id: 'cbd_jungle', name: 'Jungle de CBD', icon: '🍃' },
  { id: 'silicon_city', name: 'Cité de Silicium', icon: '💾' },
];

const COLOR_PALETTES: { id: ColorPalette, name: string, colors: string[] }[] = [
  { id: 'vintage_gold', name: 'Or & Sang', colors: ['#D4AF37', '#8B0000'] },
  { id: 'cyber_neon', name: 'Néon Urbain', colors: ['#00FFFF', '#FF00FF'] },
  { id: 'deep_sea', name: 'Béton Armé', colors: ['#4A4A4A', '#2C2C2C'] },
  { id: 'forest_emerald', name: 'Asphalte Humide', colors: ['#1A1A1A', '#333333'] },
  { id: 'royal_velvet', name: 'Goudron & Plomb', colors: ['#0A0A0A', '#555555'] },
];

const VISUAL_STYLES: { id: VisualStyle, name: string, description: string }[] = [
  { id: 'typography', name: 'Typographie', description: 'Portrait fait de mots' },
  { id: 'half_text', name: 'Citation Split', description: 'Moitié visage, moitié texte' },
  { id: 'crowd_illusion', name: 'Foule Humaine', description: 'Formé de milliers de personnes' },
  { id: 'double_exposure', name: 'Double Expo', description: 'Fusion visage et ville' },
  { id: 'hyper_charcoal', name: 'Fusain Réaliste', description: 'Détails extrêmes au charbon' },
  { id: 'engraving', name: 'Gravure Brut', description: 'Traits secs et profonds' },
  { id: 'minimalist', name: 'Minimal', description: 'Lignes froides et précises' },
  { id: 'ornate', name: 'Détaillé', description: 'Richesse des textures' },
  { id: 'futuristic', name: 'Technique', description: 'Esthétique industrielle' },
  { id: 'organic', name: 'Viscéral', description: 'Formes brutes et fluides' },
  { id: 'glitch', name: 'Fragmenté', description: 'Rendu numérique cassé' },
  { id: 'blueprint', name: 'Plan Technique', description: 'Style ingénierie' },
  { id: 'sketch', name: 'Fusain Brut', description: 'Rendu charbon et ombre' },
  { id: 'custom', name: 'Libre', description: 'Définissez votre style' },
];

const MOCKUP_TEMPLATES = [
  { id: 'tshirt_white', name: 'T-Shirt Blanc', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=1000', overlayPos: { top: '38%', left: '50%', width: '22%' } },
  { id: 'tshirt_black', name: 'T-Shirt Noir', url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=1000', overlayPos: { top: '38%', left: '50%', width: '22%' } },
  { id: 'hoodie_black', name: 'Hoodie Noir', url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=1000', overlayPos: { top: '42%', left: '50%', width: '18%' } },
  { id: 'sweatshirt_grey', name: 'Sweat Gris', url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=1000', overlayPos: { top: '42%', left: '50%', width: '18%' } },
];

const PRESET_TEMPLATES = [
  { 
    id: 'typo_portrait', 
    name: 'Portrait Typographique', 
    params: { theme: 'custom', customPrompt: 'Portrait of a rapper, Tupac style', visualStyle: 'typography', words: 'CHANGE AINT NEVER COME WAY BACK', fineness: 90, density: 95, useColor: false },
    image: 'https://images.unsplash.com/photo-1503249023995-51b0f3778ccf?auto=format&fit=crop&q=80&w=200'
  },
  { 
    id: 'half_quote', 
    name: 'Citation Visuelle', 
    params: { theme: 'custom', customPrompt: 'Portrait of Einstein', visualStyle: 'half_text', words: 'LEARN FROM YESTERDAY LIVE FOR TODAY HOPE FOR TOMORROW', fineness: 85, density: 90, useColor: false },
    image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=200'
  },
  { 
    id: 'crowd_face', 
    name: 'Visage de Foule', 
    params: { theme: 'custom', customPrompt: 'Profile of a face', visualStyle: 'crowd_illusion', fineness: 95, density: 85, useColor: false },
    image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=200'
  },
  { 
    id: 'city_merge', 
    name: 'Fusion Citadine', 
    params: { theme: 'custom', customPrompt: 'Old man face merging with dystopian city', visualStyle: 'double_exposure', fineness: 90, density: 90, useColor: false },
    image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=200'
  },
  { 
    id: 'pure_charcoal', 
    name: 'Fusain Hyper-Réaliste', 
    params: { theme: 'custom', customPrompt: 'Charlie Chaplin with finger on lips', visualStyle: 'hyper_charcoal', fineness: 95, density: 80, useColor: false },
    image: 'https://images.unsplash.com/photo-1585110396000-c9fd4568c18b?auto=format&fit=crop&q=80&w=200'
  },
];

export default function App() {
  const [params, setParams] = useState<GenerationParams & { aspectRatio: any }>({
    text: '',
    theme: 'medieval',
    customPrompt: '',
    fineness: 80,
    density: 90,
    resolution: '1K',
    useColor: false,
    aspectRatio: 'auto',
    visualStyle: 'engraving',
    colorPalette: 'vintage_gold',
    customColor: '#D4AF37',
    customStylePrompt: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [generationDuration, setGenerationDuration] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showMockup, setShowMockup] = useState(false);
  const [selectedMockup, setSelectedMockup] = useState(MOCKUP_TEMPLATES[0]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [suggestedThemesList, setSuggestedThemesList] = useState<string[]>([]);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', text: string, image?: string }[]>([]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [creationMode, setCreationMode] = useState<'logo' | 'prompt'>('logo');
  const [activeTab, setActiveTab] = useState<'content' | 'style' | 'settings'>('content');
  const [viewMode, setViewMode] = useState<'design' | 'mockup'>('design');
  const [removeBackground, setRemoveBackground] = useState(false);
  const [bgThreshold, setBgThreshold] = useState(240);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check for API key on mount
  React.useEffect(() => {
    const checkKey = async () => {
      const aiStudio = (window as any).aistudio;
      if (aiStudio) {
        const selected = await aiStudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
      await aiStudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const getImageAspectRatio = (base64: string): Promise<number> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve(img.width / img.height);
      };
      img.src = base64;
    });
  };

  const getClosestAspectRatio = (ratio: number): "1:1" | "3:4" | "4:3" | "9:16" | "16:9" => {
    const targets = [
      { label: "1:1", value: 1 },
      { label: "3:4", value: 3/4 },
      { label: "4:3", value: 4/3 },
      { label: "9:16", value: 9/16 },
      { label: "16:9", value: 16/9 },
    ];
    let closest = targets[0];
    let minDiff = Math.abs(ratio - targets[0].value);
    for (let i = 1; i < targets.length; i++) {
      const diff = Math.abs(ratio - targets[i].value);
      if (diff < minDiff) {
        minDiff = diff;
        closest = targets[i];
      }
    }
    return closest.label as any;
  };

  const processImageForTransparency = (base64: string, threshold: number, keepColor: boolean): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(base64);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const len = data.length;
        
        for (let i = 0; i < len; i += 4) {
          // Faster brightness calculation
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          
          if (brightness >= threshold) {
            data[i + 3] = 0; // Make transparent
          } else if (!keepColor) {
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
            data[i + 3] = 255;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = base64;
    });
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.svg'] },
    multiple: false 
  } as any);

  interface ResultImage {
    full: string;
    thumb: string;
  }
  const [resultImages, setResultImages] = useState<ResultImage[]>([]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationStep('Initialisation...');
    setGenerationDuration(null);
    const startTime = Date.now();
    try {
      let finalAspectRatio = params.aspectRatio;
      if (params.aspectRatio === 'auto' && uploadedImage) {
        setGenerationStep('Analyse du ratio...');
        const ratio = await getImageAspectRatio(uploadedImage);
        finalAspectRatio = getClosestAspectRatio(ratio);
      } else if (params.aspectRatio === 'auto') {
        finalAspectRatio = '1:1';
      }

      let results = await generateMicroGraphix({
        ...params,
        aspectRatio: finalAspectRatio,
        baseImage: creationMode === 'logo' ? (uploadedImage || undefined) : undefined
      }, (msg) => setGenerationStep(msg));
      
      if (removeBackground) {
        setGenerationStep('Détourage en cours...');
        results = await Promise.all(results.map(img => processImageForTransparency(img, bgThreshold, params.useColor || false)));
      }

      const endTime = Date.now();
      setGenerationDuration((endTime - startTime) / 1000);
      
      setGenerationStep('Création des miniatures...');
      const resultsWithThumbs = await Promise.all(results.map(async (img) => ({
        full: img,
        thumb: await ensureSafeImageSize(img, 150)
      })));
      
      setResultImages(resultsWithThumbs);
      setResultImage(resultsWithThumbs[0].full);
      setGenerationStep('');
      setChatHistory([]); // Clear history on new generation
      setZoomLevel(1); // Reset zoom on new image
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffffff', '#000000', '#444444']
      });
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Erreur lors de la génération. Vérifiez votre clé API.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleModify = async () => {
    if (!resultImage || !chatInput) return;
    const currentInput = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: currentInput }]);
    setIsChatting(true);
    
    try {
      const result = await modifyWithAI(resultImage, currentInput);
      const newThumb = await ensureSafeImageSize(result, 150);
      setResultImage(result);
      setResultImages(prev => prev.map(img => img.full === resultImage ? { full: result, thumb: newThumb } : img));
      setChatHistory(prev => [...prev, { role: 'ai', text: `Modification appliquée : "${currentInput}"`, image: result }]);
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.message || "La modification a échoué.";
      setChatHistory(prev => [...prev, { role: 'ai', text: `Désolé, la modification a échoué : ${errorMsg}` }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleSuggestThemes = async () => {
    setIsSuggesting(true);
    try {
      const suggestions = await suggestThemes(params.text || params.customPrompt);
      setSuggestedThemesList(suggestions);
      confetti({
        particleCount: 50,
        spread: 40,
        origin: { y: 0.8 },
        colors: ['#ffffff', '#888888']
      });
    } catch (error: any) {
      console.error(error);
      alert("Erreur lors de la suggestion de thèmes.");
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleRemoveBackgroundPost = async () => {
    if (!resultImage) return;
    setIsProcessing(true);
    try {
      const processed = await processImageForTransparency(resultImage, bgThreshold, params.useColor || false);
      const newThumb = await ensureSafeImageSize(processed, 150);
      setResultImage(processed);
      setResultImages(prev => prev.map(img => img.full === resultImage ? { full: processed, thumb: newThumb } : img));
      confetti({
        particleCount: 30,
        spread: 30,
        origin: { y: 0.7 },
        colors: ['#ffffff']
      });
    } catch (error) {
      console.error("Error removing background:", error);
      alert("Erreur lors de la suppression du fond.");
    } finally {
      setIsProcessing(false);
    }
  };

  const applyTemplate = (template: typeof PRESET_TEMPLATES[0]) => {
    setParams(prev => ({
      ...prev,
      ...template.params
    }));
    // Optionally clear uploaded image if template is meant to be standalone
    // setUploadedImage(null);
  };

  const exportPNG = async () => {
    if (!resultImage) return;
    setIsExporting(true);
    try {
      const link = document.createElement('a');
      link.href = resultImage;
      link.download = `micro-graphix-${Date.now()}.png`;
      link.click();
    } finally {
      setIsExporting(false);
    }
  };

  const exportPDF = async () => {
    if (!resultImage) return;
    setIsExporting(true);
    try {
      const pdf = new jsPDF();
      pdf.addImage(resultImage, 'PNG', 10, 10, 190, 190);
      pdf.save(`micro-graphix-${Date.now()}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  const exportSVG = () => {
    if (!resultImage) return;
    
    // Use ImageTracer to vectorize the image
    ImageTracer.imageToSVG(
      resultImage,
      (svgString: string) => {
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `micro-graphix-${Date.now()}.svg`;
        link.click();
        URL.revokeObjectURL(url);
      },
      { 
        ltres: 0.1, 
        qtres: 0.1, 
        pathomit: 8, 
        strokewidth: 0.5,
        colorsampling: 0, // 0 = black and white
        numberofcolors: 2
      }
    );
  };

  return (
    <div className="flex h-screen w-full bg-[#050505] font-sans">
      {!hasApiKey && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="max-w-md w-full glass-panel p-8 rounded-2xl text-center space-y-6 border-white/20">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="text-black w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Clé API Requise</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Pour utiliser les modèles de génération d'images haute performance (4K), vous devez sélectionner votre propre clé API Google Cloud.
            </p>
            <div className="bg-zinc-800/50 p-4 rounded-xl text-xs text-zinc-500 text-left space-y-2">
              <p>1. Utilisez un projet Google Cloud avec facturation activée.</p>
              <p>2. Consultez la <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-white underline">documentation sur la facturation</a>.</p>
            </div>
            <button 
              onClick={handleSelectKey}
              className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors"
            >
              SÉLECTIONNER MA CLÉ API
            </button>
          </div>
        </div>
      )}

      {/* Left Panel: Controls */}
      <aside className="w-[400px] flex flex-col border-r border-white/5 bg-zinc-950/80 backdrop-blur-xl overflow-y-auto custom-scrollbar relative z-40 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <header className="p-6 border-b border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="w-10 h-10 bg-gradient-to-br from-zinc-800 to-black rounded-xl flex items-center justify-center border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tighter uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">Micro-Graphix</h1>
          </div>
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest relative z-10">Studio de Gravure IA</p>
        </header>

        <div className="flex border-b border-white/5 bg-zinc-900/30">
          <button
            onClick={() => setActiveTab('content')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'content' ? 'border-white text-white bg-white/5' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
          >
            Contenu
          </button>
          <button
            onClick={() => setActiveTab('style')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'style' ? 'border-white text-white bg-white/5' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
          >
            Style
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'settings' ? 'border-white text-white bg-white/5' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
          >
            Réglages
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          {activeTab === 'content' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
              {/* Creation Mode Toggle */}
              <div className="flex p-1 bg-zinc-900/80 rounded-xl border border-white/5">
                <button 
                  onClick={() => {
                    setCreationMode('logo');
                    setParams(prev => ({ ...prev, theme: 'medieval' }));
                  }}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${creationMode === 'logo' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                >
                  Logo & Structure
                </button>
                <button 
                  onClick={() => {
                    setCreationMode('prompt');
                    setParams(prev => ({ ...prev, theme: 'custom' }));
                  }}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${creationMode === 'prompt' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                >
                  Prompt Libre
                </button>
              </div>

              {/* Presets Section */}
              <section className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  <LayoutGrid size={14} /> Presets Inspirés
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_TEMPLATES.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setCreationMode('prompt');
                        setParams({ ...params, ...preset.params });
                      }}
                      className="relative h-20 rounded-xl overflow-hidden group border border-white/10 hover:border-white/40 transition-all"
                    >
                      <img src={preset.image} alt={preset.name} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <span className="absolute bottom-2 left-2 right-2 text-[10px] font-bold text-white text-left leading-tight z-10">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {creationMode === 'logo' ? (
                <>
                  {/* Section Texte */}
                  <section>
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                      <Type size={14} /> Structure Typographique
                    </label>
                    <input 
                      type="text" 
                      placeholder="Lettre ou mot court..."
                      className="w-full bg-zinc-800/50 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                      value={params.text}
                      onChange={(e) => setParams({...params, text: e.target.value})}
                    />
                  </section>

                  {/* Section Upload */}
                  <section>
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                      <Layers size={14} /> Masque de Structure
                    </label>
                    <div 
                      {...getRootProps()} 
                      className={`border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center gap-2
                        ${isDragActive ? 'border-white bg-white/5' : 'border-white/10 hover:border-white/30 bg-zinc-900/30'}`}
                    >
                      <input {...getInputProps()} />
                      {uploadedImage ? (
                        <div className="relative group w-full aspect-video rounded-lg overflow-hidden">
                          <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-contain" />
                          <button 
                            onClick={(e) => { e.stopPropagation(); setUploadedImage(null); }}
                            className="absolute top-2 right-2 p-1.5 bg-black/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="text-zinc-500" size={24} />
                          <p className="text-[10px] text-zinc-500 uppercase font-bold text-center">Glissez un logo PNG/SVG</p>
                        </>
                      )}
                    </div>
                  </section>

                  {/* Section Thématiques */}
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                        <ImageIcon size={14} /> Thématique
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2 mb-4">
                      {THEMES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setParams({...params, theme: t.id})}
                          className={`flex items-center justify-between p-3 rounded-lg text-sm transition-all border
                            ${params.theme === t.id 
                              ? 'bg-white text-black border-white font-bold' 
                              : 'bg-zinc-900/50 text-zinc-400 border-white/5 hover:border-white/20'}`}
                        >
                          <span className="flex items-center gap-3">
                            <span className="text-lg">{t.icon}</span>
                            {t.name}
                          </span>
                          {params.theme === t.id && <ChevronRight size={14} />}
                        </button>
                      ))}
                    </div>

                    {suggestedThemesList.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                          <Sparkles size={12} /> Suggestions IA
                        </label>
                        {suggestedThemesList.map((theme, idx) => (
                          <button
                            key={idx}
                            onClick={() => setParams({ ...params, theme: 'custom', customPrompt: theme })}
                            className="w-full text-left p-3 rounded-lg text-xs bg-zinc-800/30 border border-white/5 hover:border-white/20 transition-all text-zinc-300 italic"
                          >
                            "{theme}"
                          </button>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Section Prompt */}
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                        <MessageSquare size={14} /> Détails de la Gravure
                      </label>
                      <button 
                        onClick={handleSuggestThemes}
                        disabled={isSuggesting}
                        className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white flex items-center gap-1 transition-colors disabled:opacity-30"
                      >
                        {isSuggesting ? <RefreshCw size={10} className="animate-spin" /> : <Sparkles size={10} />}
                        Inspirer
                      </button>
                    </div>
                    <textarea 
                      placeholder="Décrivez la scène à cacher dans les traits..."
                      rows={3}
                      className="w-full bg-zinc-800/50 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all resize-none"
                      value={params.customPrompt}
                      onChange={(e) => setParams({...params, customPrompt: e.target.value})}
                    />
                  </section>
                </>
              ) : (
                <section className="space-y-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                      <Sparkles size={14} /> Prompt Principal
                    </label>
                    <button 
                      onClick={handleSuggestThemes}
                      disabled={isSuggesting}
                      className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white flex items-center gap-1 transition-colors disabled:opacity-30"
                    >
                      {isSuggesting ? <RefreshCw size={10} className="animate-spin" /> : <Sparkles size={10} />}
                      Inspirer
                    </button>
                  </div>
                  <textarea 
                    placeholder="Décrivez l'image que vous souhaitez créer de toutes pièces..."
                    rows={6}
                    className="w-full bg-zinc-800/50 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all resize-none font-medium leading-relaxed"
                    value={params.customPrompt}
                    onChange={(e) => setParams({...params, customPrompt: e.target.value})}
                  />
                  <p className="text-[10px] text-zinc-500 italic">
                    L'IA utilisera ce prompt comme base principale pour la micro-gravure.
                  </p>
                </section>
              )}
            </div>
          )}

          {activeTab === 'style' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
              {/* Visual Style Selector */}
              <section className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-white/80">
                    <Palette className="w-4 h-4" />
                    <h2 className="text-xs font-bold uppercase tracking-widest">Style Visuel</h2>
                  </div>
                  {params.visualStyle === 'custom' && (
                    <button 
                      onClick={() => setParams({...params, visualStyle: 'engraving'})}
                      className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white"
                    >
                      Retour
                    </button>
                  )}
                </div>

                {params.visualStyle === 'custom' ? (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <textarea 
                      placeholder="Décrivez le style artistique souhaité (ex: 'Style néon rétro des années 80', 'Aquarelle minimaliste')..."
                      rows={3}
                      className="w-full bg-zinc-800/50 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all resize-none"
                      value={params.customStylePrompt}
                      onChange={(e) => setParams({...params, customStylePrompt: e.target.value})}
                      autoFocus
                    />
                    <p className="text-[10px] text-zinc-500 italic">
                      Ce prompt définira l'esthétique globale de la gravure.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {VISUAL_STYLES.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => {
                          const newParams = { ...params, visualStyle: style.id };
                          if (style.id === 'custom' && !params.customStylePrompt) {
                            newParams.customStylePrompt = 'Graphismes abstraits inspirés par la musique électronique';
                          }
                          setParams(newParams);
                        }}
                        className={`flex flex-col p-3 rounded-xl border transition-all text-left ${
                          params.visualStyle === style.id 
                            ? 'bg-white border-white text-black' 
                            : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold">{style.name}</span>
                          {style.id === 'custom' && <ChevronRight size={12} />}
                        </div>
                        <span className={`text-[10px] opacity-60 ${params.visualStyle === style.id ? 'text-black' : 'text-zinc-500'}`}>
                          {style.description}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* Section Mots/Citation pour Typographie */}
              {['typography', 'half_text'].includes(params.visualStyle || '') && (
                <section className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <Type size={14} /> Mots / Citation à intégrer
                  </label>
                  <textarea 
                    placeholder="Entrez les mots qui formeront l'image (ex: 'LEARN FROM YESTERDAY...')..."
                    rows={3}
                    className="w-full bg-zinc-800/50 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all resize-none"
                    value={params.words || ''}
                    onChange={(e) => setParams({...params, words: e.target.value})}
                  />
                  <p className="text-[10px] text-zinc-500 italic">
                    Ces mots seront utilisés par l'IA pour construire le portrait.
                  </p>
                </section>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
              {/* Section Réglages */}
              <section className="space-y-6">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                  <Settings size={14} /> Précision Technique
                </label>
                
                <div className="space-y-4">
                  <div className="space-y-3 p-3 bg-zinc-900/50 border border-white/5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Fond Transparent</span>
                      <button 
                        onClick={() => setRemoveBackground(!removeBackground)}
                        className={`w-10 h-5 rounded-full transition-all relative ${removeBackground ? 'bg-white' : 'bg-zinc-700'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${removeBackground ? 'right-1 bg-black' : 'left-1 bg-zinc-400'}`} />
                      </button>
                    </div>
                    {removeBackground && (
                      <div className="pt-2 border-t border-white/5">
                        <div className="flex justify-between text-[9px] font-mono uppercase text-zinc-500 mb-1">
                          <span>Seuil de transparence</span>
                          <span>{bgThreshold}</span>
                        </div>
                        <input 
                          type="range" 
                          min="100" max="255" 
                          className="w-full accent-white h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                          value={bgThreshold}
                          onChange={(e) => setBgThreshold(parseInt(e.target.value))}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-white/5 rounded-lg">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Ratio d'image</span>
                    <div className="flex gap-1 flex-wrap justify-end max-w-[200px]">
                      {['auto', '1:1', '3:4', '4:3', '9:16', '16:9'].map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => setParams({ ...params, aspectRatio: ratio as any })}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${params.aspectRatio === ratio ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                        >
                          {ratio === 'auto' ? 'Auto' : ratio}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-white/5 rounded-lg">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Mode Couleur</span>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setParams({ ...params, useColor: !params.useColor })}
                        className={`w-10 h-5 rounded-full transition-all relative ${params.useColor ? 'bg-indigo-500' : 'bg-zinc-700'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${params.useColor ? 'right-1 bg-white' : 'left-1 bg-zinc-400'}`} />
                      </button>
                    </div>
                  </div>

                  {params.useColor && (
                    <div className="space-y-3 p-3 bg-zinc-900/50 border border-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Texture Double Couleur</span>
                        <button 
                          onClick={() => setParams({ ...params, useDoubleColor: !params.useDoubleColor })}
                          className={`w-10 h-5 rounded-full transition-all relative ${params.useDoubleColor ? 'bg-indigo-500' : 'bg-zinc-700'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${params.useDoubleColor ? 'right-1 bg-white' : 'left-1 bg-zinc-400'}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Couleur 1</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={params.customColor || '#D4AF37'}
                            onChange={(e) => setParams({...params, customColor: e.target.value, colorPalette: 'none'})}
                            className="w-6 h-6 bg-transparent border-none cursor-pointer rounded overflow-hidden"
                          />
                          <span className="text-[10px] font-mono text-zinc-400 uppercase">{params.customColor}</span>
                        </div>
                      </div>
                      {params.useDoubleColor && (
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Couleur 2</label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="color" 
                              value={params.customColor2 || '#8B0000'}
                              onChange={(e) => setParams({...params, customColor2: e.target.value, colorPalette: 'none'})}
                              className="w-6 h-6 bg-transparent border-none cursor-pointer rounded overflow-hidden"
                            />
                            <span className="text-[10px] font-mono text-zinc-400 uppercase">{params.customColor2 || '#8B0000'}</span>
                          </div>
                        </div>
                      )}
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Palettes Prédéfinies</label>
                      <div className="grid grid-cols-5 gap-2">
                        {COLOR_PALETTES.map((palette) => (
                          <button
                            key={palette.id}
                            onClick={() => setParams({ ...params, colorPalette: palette.id, customColor: palette.colors[0], customColor2: palette.colors[1], useDoubleColor: true })}
                            className={`group relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${params.colorPalette === palette.id ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                            title={palette.name}
                          >
                            <div className="absolute inset-0 flex flex-col">
                              <div className="flex-1" style={{ backgroundColor: palette.colors[0] }} />
                              <div className="flex-1" style={{ backgroundColor: palette.colors[1] }} />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-white/5 rounded-lg">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Nombre d'images</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((num) => (
                        <button
                          key={num}
                          onClick={() => setParams({ ...params, numberOfImages: num })}
                          className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${(params.numberOfImages || 1) === num ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-white/5 rounded-lg">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Résolution d'export</span>
                    <div className="flex gap-1">
                      {['1K', '4K'].map((res) => (
                        <button
                          key={res}
                          onClick={() => setParams({ ...params, resolution: res as '1K' | '4K' })}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${params.resolution === res ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                        >
                          {res}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-mono uppercase text-zinc-500 mb-2">
                      <span>Finesse du trait</span>
                      <span>{params.fineness}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="100" 
                      className="w-full accent-white h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      value={params.fineness}
                      onChange={(e) => setParams({...params, fineness: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono uppercase text-zinc-500 mb-2">
                      <span>Densité des détails</span>
                      <span>{params.density}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="100" 
                      className="w-full accent-white h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      value={params.density}
                      onChange={(e) => setParams({...params, density: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 bg-zinc-950/80">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-4 bg-gradient-to-r from-zinc-200 to-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:from-white hover:to-zinc-100 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed border border-white/50"
          >
            {isGenerating ? (
              <RefreshCw className="animate-spin" size={20} />
            ) : (
              <Sparkles size={20} />
            )}
            {isGenerating ? 'GRAVURE EN COURS...' : 'GÉNÉRER LA GRAVURE'}
          </button>
        </div>
      </aside>

      {/* Mockup Modal */}
      <AnimatePresence>
        {showMockup && resultImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 sm:p-8"
          >
            <div className="relative w-full max-w-6xl h-full flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-zinc-800 to-black rounded-2xl flex items-center justify-center border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
                    <Shirt className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Streetwear Mockup</h2>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Visualisez votre design sur des produits réels</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowMockup(false)}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white border border-white/5"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden">
                {/* Mockup View */}
                <div className="flex-[2] bg-zinc-900 rounded-[2rem] overflow-hidden relative flex items-center justify-center border border-white/10 shadow-2xl">
                  <img 
                    src={selectedMockup.url} 
                    alt={selectedMockup.name}
                    className="w-full h-full object-cover opacity-90"
                  />
                  <div 
                    className="absolute pointer-events-none"
                    style={{
                      top: selectedMockup.overlayPos.top,
                      left: selectedMockup.overlayPos.left,
                      width: selectedMockup.overlayPos.width,
                      transform: 'translate(-50%, -50%)',
                      mixBlendMode: selectedMockup.id.includes('black') ? 'screen' : 'multiply',
                      opacity: 0.85
                    }}
                  >
                    <img 
                      src={resultImage} 
                      alt="Overlay" 
                      className="w-full h-auto"
                      style={{
                        filter: selectedMockup.id.includes('black') ? 'invert(1) brightness(1.5)' : 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Mockup Controls */}
                <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Sélectionner un Produit</label>
                    <div className="grid grid-cols-1 gap-3">
                      {MOCKUP_TEMPLATES.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setSelectedMockup(m)}
                          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                            selectedMockup.id === m.id 
                              ? 'bg-white border-white text-black' 
                              : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:border-white/20'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                            <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                          </div>
                          <span className="text-sm font-bold">{m.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                    <p className="text-xs text-zinc-400 leading-relaxed italic">
                      "Ce mockup est une simulation visuelle. Pour un rendu optimal en impression textile, nous recommandons l'exportation en format SVG (Vectoriel)."
                    </p>
                    <button 
                      onClick={() => {
                        setShowMockup(false);
                        exportPNG();
                      }}
                      className="w-full py-4 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"
                    >
                      <Download size={18} /> Télécharger le Design
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right Panel: Preview & Export */}
      <main className="flex-1 flex flex-col relative bg-black overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#1a1a1a_0%,_#000000_100%)]" />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
          style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} 
        />

        {/* View Mode Switcher */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex p-1 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
          <button 
            onClick={() => setViewMode('design')}
            className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${viewMode === 'design' ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
          >
            Design
          </button>
          <button 
            onClick={() => setViewMode('mockup')}
            className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${viewMode === 'mockup' ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
          >
            Mockup
          </button>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-12 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {resultImage ? (
              viewMode === 'design' ? (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="relative group max-w-full max-h-full flex flex-col items-center"
                >
                  <div className="absolute -inset-4 bg-white/5 blur-3xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative z-10 w-full h-auto max-h-[70vh] rounded-lg shadow-2xl border border-white/10 bg-black overflow-hidden group/image">
                    <div 
                      className="w-full h-full transition-transform duration-200 ease-out cursor-grab active:cursor-grabbing"
                      style={{ 
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: 'center center'
                      }}
                      onWheel={(e) => {
                        if (e.ctrlKey || e.metaKey) {
                          e.preventDefault();
                          const delta = e.deltaY > 0 ? -0.1 : 0.1;
                          setZoomLevel(prev => Math.min(Math.max(prev + delta, 1), 5));
                        }
                      }}
                    >
                      <img 
                        src={resultImage} 
                        alt="Micro-Graphix Result" 
                        className="w-full h-auto max-h-[70vh] object-contain"
                        style={{ 
                          filter: `contrast(${100 + (params.fineness - 50) / 2}%) brightness(${100 + (params.density - 50) / 5}%)`,
                          imageRendering: params.fineness > 80 ? 'pixelated' : 'auto'
                        }}
                      />
                    </div>

                    {/* Zoom Controls Overlay */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 opacity-0 group-hover/image:opacity-100 transition-opacity z-20">
                      <button 
                        onClick={() => setZoomLevel(prev => Math.max(prev - 0.5, 1))}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                        title="Zoom arrière"
                      >
                        <ZoomOut size={16} />
                      </button>
                      <span className="text-[10px] font-mono w-10 text-center text-white">{Math.round(zoomLevel * 100)}%</span>
                      <button 
                        onClick={() => setZoomLevel(prev => Math.min(prev + 0.5, 5))}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                        title="Zoom avant"
                      >
                        <ZoomIn size={16} />
                      </button>
                      <div className="w-px h-4 bg-white/10 mx-1" />
                      <button 
                        onClick={() => setZoomLevel(1)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                        title="Réinitialiser"
                      >
                        <RotateCcw size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {generationDuration && (
                    <div className="mt-6 flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <Clock size={12} className="text-zinc-500" />
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                        Généré en {generationDuration.toFixed(2)}s
                      </span>
                    </div>
                  )}

                  {resultImages.length > 1 && (
                    <div className="mt-6 flex gap-3 overflow-x-auto max-w-full pb-2 custom-scrollbar justify-center">
                      {resultImages.map((imgObj, idx) => (
                        <button
                          key={idx}
                          onClick={() => setResultImage(imgObj.full)}
                          className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${resultImage === imgObj.full ? 'border-white scale-110 shadow-lg' : 'border-white/10 opacity-50 hover:opacity-100 hover:border-white/50'}`}
                        >
                          <img src={imgObj.thumb} alt={`Result ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {isGenerating && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg">
                      <RefreshCw className="w-12 h-12 text-white animate-spin mb-4" />
                      <p className="text-white font-mono text-sm uppercase tracking-widest animate-pulse">{generationStep}</p>
                    </div>
                  )}
                  
                  <div className="absolute top-4 right-4 z-20 flex gap-2">
                    <button className="p-2 bg-black/50 backdrop-blur-md rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                      <Maximize2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="mockup"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="w-full h-full flex flex-col lg:flex-row gap-8 items-center justify-center"
                >
                  {/* Mockup Preview Area */}
                  <div className="flex-[2] w-full h-full max-h-[70vh] bg-zinc-900 rounded-3xl overflow-hidden relative flex items-center justify-center border border-white/10 shadow-2xl">
                    <img 
                      src={selectedMockup.url} 
                      alt={selectedMockup.name}
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div 
                      className="absolute pointer-events-none"
                      style={{
                        top: selectedMockup.overlayPos.top,
                        left: selectedMockup.overlayPos.left,
                        width: selectedMockup.overlayPos.width,
                        transform: 'translate(-50%, -50%)',
                        mixBlendMode: selectedMockup.id.includes('black') ? 'screen' : 'multiply',
                        opacity: 0.85
                      }}
                    >
                      <img 
                        src={resultImage} 
                        alt="Overlay" 
                        className="w-full h-auto"
                        style={{
                          filter: selectedMockup.id.includes('black') ? 'invert(1) brightness(1.5)' : 'none'
                        }}
                      />
                    </div>
                    
                    {/* Mockup Selector Overlay */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10">
                      {MOCKUP_TEMPLATES.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setSelectedMockup(m)}
                          className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${selectedMockup.id === m.id ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                        >
                          <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mockup Info Panel */}
                  <div className="flex-1 max-w-sm space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-white">{selectedMockup.name}</h3>
                      <p className="text-sm text-zinc-500 leading-relaxed uppercase tracking-widest font-mono">Simulation Streetwear</p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                      <p className="text-xs text-zinc-400 leading-relaxed italic">
                        "Visualisez l'impact de votre micro-gravure sur des textiles réels. Le rendu s'adapte automatiquement aux ombres et aux textures."
                      </p>
                      <div className="space-y-2">
                        <button 
                          onClick={exportPNG}
                          className="w-full py-4 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"
                        >
                          <Download size={18} /> Télécharger PNG
                        </button>
                        <button 
                          onClick={() => setViewMode('design')}
                          className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl border border-white/10 flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors"
                        >
                          <RotateCcw size={18} /> Retour au Design
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-4"
              >
                <div className="w-24 h-24 border border-white/10 rounded-full flex items-center justify-center mx-auto bg-zinc-900/50">
                  <ImageIcon className="text-zinc-700" size={40} />
                </div>
                <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">En attente de génération...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Bar: Chat & Export */}
        <footer className="glass-panel border-t border-white/5 flex flex-col">
          {chatHistory.length > 0 && (
            <div className="max-h-40 overflow-y-auto p-4 space-y-3 border-b border-white/5 custom-scrollbar bg-black/20">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-2 rounded-lg text-xs ${msg.role === 'user' ? 'bg-zinc-800 text-white' : 'bg-white/10 text-zinc-300'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatting && (
                <div className="flex justify-start">
                  <div className="bg-white/10 p-2 rounded-lg text-xs text-zinc-500 animate-pulse">
                    L'IA affine votre gravure...
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="p-6 flex items-center justify-between gap-6">
            <div className="flex-1 flex items-center gap-4">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  placeholder="Affiner la gravure (ex: 'Ajoute plus de détails')..."
                  className="w-full bg-zinc-900/80 border border-white/10 rounded-xl py-3 px-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleModify()}
                  disabled={!resultImage || isChatting}
                />
                <button 
                  onClick={handleModify}
                  disabled={!resultImage || !chatInput || isChatting}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-white disabled:opacity-30"
                >
                  {isChatting ? <RefreshCw className="animate-spin" size={18} /> : <ChevronRight size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {resultImage && (
                <>
                  <button 
                    onClick={() => setViewMode(viewMode === 'design' ? 'mockup' : 'design')}
                    className={`flex items-center gap-2 px-4 py-3 border rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'mockup' ? 'bg-white text-black border-white' : 'bg-zinc-900 text-white/70 border-white/10 hover:text-white hover:bg-zinc-800'}`}
                  >
                    <Shirt size={16} />
                    <span className="hidden sm:inline">{viewMode === 'mockup' ? 'Mode Design' : 'Mode Mockup'}</span>
                  </button>
                  <button 
                    onClick={handleRemoveBackgroundPost}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors disabled:opacity-30 text-white/70 hover:text-white"
                    title="Supprimer le fond blanc de l'image actuelle"
                  >
                    {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <Layers size={16} />}
                    <span className="hidden sm:inline">Supprimer le fond</span>
                  </button>
                </>
              )}
              {chatHistory.length > 0 && (
                <button 
                  onClick={() => {
                    setChatHistory([]);
                    // Revert to original? For now just clear history
                  }}
                  className="p-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-500 hover:text-white transition-colors"
                  title="Effacer l'historique"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button 
                onClick={exportPNG}
                disabled={!resultImage || isExporting}
                className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors disabled:opacity-30"
              >
                {isExporting ? <RefreshCw className="animate-spin" size={16} /> : <Download size={16} />} PNG
              </button>
              <button 
                onClick={exportPDF}
                disabled={!resultImage || isExporting}
                className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors disabled:opacity-30"
              >
                {isExporting ? <RefreshCw className="animate-spin" size={16} /> : <FileText size={16} />} PDF
              </button>
              <button 
                onClick={exportSVG}
                disabled={!resultImage}
                className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors disabled:opacity-30"
              >
                <FileJson size={16} /> SVG
              </button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
