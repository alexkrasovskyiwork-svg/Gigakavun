import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project, Scene, GeneratedImage, NicheConfig, ScriptPart } from '../types';
import { Button } from './Button';
import { Sparkles, Copy, Check, Layout, FileText, Lock, ChevronDown, ChevronRight, Loader2, PlayCircle, FolderOpen, List, FileVideo, Layers, Plus, Search, ArrowLeft, Languages, ChevronLeft, Image as ImageIcon, MoreHorizontal, Download, RefreshCw, X, ZoomIn, Settings2, Grid3X3, Palette, AlertTriangle, Info, Clock, Hash, Zap } from 'lucide-react';
import { generateImagePrompts, generateWarScenes, generateImage, generateRefinedImagePrompt } from '../services/geminiService';

interface ImagesViewProps {
  projects: Project[];
  onUpdateProject: (projectId: number, updates: Partial<Project>) => void;
  onCreateNew: () => void;
  onTransport: () => void;
  showToast: (message: string, type: 'error' | 'success' | 'info') => void;
  onAddCost: (amount: number) => void;
  onAddProject: (project: Project) => void;
  nicheOptions: NicheConfig[];
}

const parseProjectTitle = (fullTitle: string) => {
    const match = fullTitle.match(/(.*)\s\[Ver\s(\d+)-(\d+)\]/);
    if (match) {
        return {
            baseTitle: match[1].trim(),
            structIdx: parseInt(match[2]),
            scriptIdx: parseInt(match[3])
        };
    }
    return {
        baseTitle: fullTitle,
        structIdx: 1,
        scriptIdx: 1
    };
};

const formatDisplayTitle = (fullTitle: string) => {
    const match = fullTitle.match(/(.*)\s\[Ver\s(\d+)-(\d+)\]/);
    if (match) {
        return `${match[1].trim()} ${match[2]}.${match[3]}`;
    }
    return fullTitle;
};

const ASPECT_RATIOS = [
    { label: "16:9 (YouTube)", value: "16:9" },
    { label: "1:1 (Square)", value: "1:1" },
    { label: "9:16 (Shorts)", value: "9:16" },
    { label: "4:3", value: "4:3" },
    { label: "3:4", value: "3:4" },
];

const QUANTITY_OPTIONS = [1, 2, 4, 6, 8, 10];

const PromptSkeleton = () => (
    <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/4 mb-3"></div>
        <div className="h-3 bg-white/5 rounded w-full mb-2"></div>
        <div className="h-3 bg-white/5 rounded w-3/4 mb-4"></div>
        <div className="flex gap-2">
            <div className="h-8 w-16 bg-white/10 rounded"></div>
            <div className="h-8 w-8 bg-white/10 rounded"></div>
        </div>
    </div>
);

const ImageSkeleton = () => (
    <div className="aspect-video bg-[#1a1a1a] border border-white/5 rounded-xl animate-pulse relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-white/10 animate-bounce" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="h-2 bg-white/10 rounded w-2/3"></div>
        </div>
    </div>
);

export const ImagesView: React.FC<ImagesViewProps> = ({ 
    projects, 
    onUpdateProject, 
    onCreateNew, 
    onTransport,
    showToast, 
    onAddCost, 
    onAddProject, 
    nicheOptions 
}) => {
  
  const activeProjects = useMemo(() => {
      return projects.filter(p => !p.isCompleted);
  }, [projects]);

  const prevActiveIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
      const currentActiveIds = new Set(activeProjects.map(p => p.id));
      const prevActiveIds = prevActiveIdsRef.current;

      if (prevActiveIds.size > 0) {
          const restoredIds = activeProjects.filter(p => !prevActiveIds.has(p.id));
          
          if (restoredIds.length > 0) {
              setExpandedKeys(prev => {
                  const newSet = new Set(prev);
                  restoredIds.forEach(p => {
                      const niche = p.config.niche || 'Other';
                      const { baseTitle } = parseProjectTitle(p.config.title);
                      newSet.delete(`niche:${niche}`);
                      newSet.delete(`title:${niche}:${baseTitle}`);
                  });
                  return newSet;
              });
          }
      }
      
      prevActiveIdsRef.current = currentActiveIds;
  }, [activeProjects]);

  const projectTree = useMemo(() => {
    const tree: Record<string, Record<string, Record<number, Project[]>>> = {};
    const reversedProjects = [...activeProjects].reverse();

    reversedProjects.forEach(p => {
        const niche = p.config.niche || 'Інше';
        const { baseTitle, structIdx } = parseProjectTitle(p.config.title);

        if (!tree[niche]) tree[niche] = {};
        if (!tree[niche][baseTitle]) tree[niche][baseTitle] = {};
        if (!tree[niche][baseTitle][structIdx]) tree[niche][baseTitle][structIdx] = [];

        tree[niche][baseTitle][structIdx].push(p);
    });
    
    Object.keys(tree).forEach(niche => {
        Object.keys(tree[niche]).forEach(title => {
            Object.keys(tree[niche][title]).forEach(structIdx => {
                tree[niche][title][parseInt(structIdx)].sort((a,b) => a.id - b.id);
            });
        });
    });

    return tree;
  }, [activeProjects]);

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [generationSource, setGenerationSource] = useState<{ [key: number]: 'structure' | 'script' }>({});
  const [loading, setLoading] = useState<{ [key: number]: boolean }>({});
  const [imageGenerating, setImageGenerating] = useState<{ [key: number]: boolean }>({});
  const [pendingImages, setPendingImages] = useState<{ [key: number]: number }>({}); // To show skeletons
  const [copiedIndex, setCopiedIndex] = useState<{ [key: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showTranslation, setShowTranslation] = useState(false);
  const [showSceneTranslation, setShowSceneTranslation] = useState<{[key: number]: boolean}>({});
  const [showTextTranslation, setShowTextTranslation] = useState<{[key: number]: boolean}>({});
  
  // War Stories Source Preview Translation
  const [showSourcePreviewTranslation, setShowSourcePreviewTranslation] = useState(false);

  const [activeSettings, setActiveSettings] = useState<{ projectId: number, type: 'prompt' | 'image' } | null>(null);
  const [settingsMenuLevel, setSettingsMenuLevel] = useState<'main' | 'format' | 'quantity'>('main');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const [activePartIndex, setActivePartIndex] = useState(0);
  const [minChars, setMinChars] = useState(100);
  const [maxChars, setMaxChars] = useState(250);
  const [customInstructions, setCustomInstructions] = useState('');
  const [warTextBuffer, setWarTextBuffer] = useState(''); 

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const isWarNiche = selectedProject?.config.nicheId?.includes('war') || false;

  useEffect(() => {
      if (selectedProjectId) {
          setActivePartIndex(0);
          setMinChars(150);
          setMaxChars(250);
          setCustomInstructions('');
          setSettingsMenuLevel('main');
          setActiveSettings(null);
          setShowSourcePreviewTranslation(false);
      }
  }, [selectedProjectId]);

  useEffect(() => {
      if (activePartIndex === 0) {
          setMinChars(150);
          setMaxChars(250);
      } else {
          setMinChars(400);
          setMaxChars(600);
      }
      
      if (selectedProject?.scriptParts[activePartIndex]?.contentEn) {
          setWarTextBuffer(selectedProject.scriptParts[activePartIndex].contentEn);
      } else {
          setWarTextBuffer('');
      }
      
      setCustomInstructions('');
      
  }, [activePartIndex, selectedProject]);

  useEffect(() => {
      if (selectedProjectId) {
          const stillExists = activeProjects.some(p => p.id === selectedProjectId);
          if (!stillExists) {
              setSelectedProjectId(null);
          }
      }
  }, [activeProjects, selectedProjectId]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (lightboxIndex === null || !selectedProject?.generatedImages) return;
          if (e.key === 'Escape') setLightboxIndex(null);
          else if (e.key === 'ArrowLeft') handlePrevImage();
          else if (e.key === 'ArrowRight') handleNextImage();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, selectedProject]);

  const filteredTree = useMemo(() => {
      if (!searchQuery.trim()) return projectTree;
      const lowerQuery = searchQuery.toLowerCase();
      const filtered: typeof projectTree = {};
      Object.keys(projectTree).forEach(niche => {
          const titles = projectTree[niche];
          const matchingTitles = Object.keys(titles).filter(t => t.toLowerCase().includes(lowerQuery));
          if (matchingTitles.length > 0) {
              filtered[niche] = {};
              matchingTitles.forEach(t => {
                  filtered[niche][t] = titles[t];
              });
          }
      });
      return filtered;
  }, [projectTree, searchQuery]);

  useEffect(() => {
      if (searchQuery.trim()) {
          const initialKeys = new Set<string>();
          Object.keys(filteredTree).forEach(niche => {
              initialKeys.add(`niche:${niche}`);
              Object.keys(filteredTree[niche]).forEach(title => {
                  initialKeys.add(`title:${niche}:${title}`);
              });
          });
          setExpandedKeys(initialKeys);
      }
  }, [filteredTree, searchQuery]);

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => {
        const newSet = new Set(prev);
        if (newSet.has(key)) newSet.delete(key);
        else newSet.add(key);
        return newSet;
    });
  };

  const handleGenerateGeneric = async (project: Project) => {
    const source = generationSource[project.id];
    if (!source) {
        showToast("Будь ласка, оберіть джерело генерації (Структура або Сценарій)", 'error');
        return;
    }
    const quantity = project.numberOfPrompts || 4;
    const aspectRatio = project.preferredAspectRatio || "16:9";
    let sourceText = '';
    if (source === 'structure') {
        sourceText = project.structure.map(s => `${s.title}: ${s.description}`).join('\n');
    } else {
        sourceText = project.scriptParts.map(p => p.contentEn).join('\n');
    }
    onAddCost(0.001);
    setLoading(prev => ({ ...prev, [project.id]: true }));
    try {
        const prompts = await generateImagePrompts(project.config, sourceText, project.imageInstructions || '', quantity, aspectRatio);
        const existingPrompts = project.imagePrompts || [];
        onUpdateProject(project.id, { imagePrompts: [...prompts, ...existingPrompts] });
    } catch (e) {
        console.error(e);
        showToast("Не вдалося згенерувати промти. Спробуйте пізніше.", 'error');
    } finally {
        setLoading(prev => ({ ...prev, [project.id]: false }));
    }
  };

  // Re-write handleGenerateImage to use the accumulator pattern correctly
  const handleGenerateImageSequential = async (project: Project) => {
      const source = generationSource[project.id];
      if (!source) {
        showToast("Будь ласка, оберіть джерело генерації (Структура або Сценарій)", 'error');
        return;
      }
      if ((window as any).aistudio) {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          if (!hasKey) {
              try { await (window as any).aistudio.openSelectKey(); } catch (e) { return; }
          }
      }
      
      const quantity = project.numberOfImages || 1;
      const aspectRatio = project.preferredAspectRatio || "16:9";
      
      setImageGenerating(prev => ({...prev, [project.id]: true}));
      setPendingImages(prev => ({...prev, [project.id]: quantity}));

      try {
          onAddCost(0.001 + (0.04 * quantity));
          
          let sourceText = '';
          if (source === 'structure') {
              sourceText = project.structure.map(s => `${s.title}: ${s.description}`).join('\n');
          } else {
              sourceText = project.scriptParts.map(p => p.contentEn).join('\n');
          }
          
          const refinedPrompt = await generateRefinedImagePrompt(project.config, sourceText, project.imageInstructions || '');
          
          // Accumulator for images to ensure we don't lose previous ones in the batch loop
          // We start with the images currently in the project
          const currentImages = [...(project.generatedImages || [])];
          let successCount = 0;

          for (let i = 0; i < quantity; i++) {
              const url = await generateImage(refinedPrompt, aspectRatio);
              
              if (url) {
                  const newImg: GeneratedImage = {
                      id: Date.now().toString() + Math.random().toString().slice(2,6),
                      url: url,
                      prompt: refinedPrompt,
                      aspectRatio,
                      createdAt: Date.now()
                  };
                  
                  currentImages.unshift(newImg); // Add to beginning
                  onUpdateProject(project.id, { generatedImages: [...currentImages] });
                  successCount++;
              }
              
              setPendingImages(prev => ({...prev, [project.id]: Math.max(0, quantity - (i + 1))}));
              
              // 2s Delay to prevent 429
              if (i < quantity - 1) await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          if (successCount === 0) showToast("Генерація не повернула зображень.", 'error');
          else showToast(`Готово! ${successCount} зображень.`, 'success');

      } catch (e: any) {
          showToast("Помилка генерації.", 'error');
      } finally {
          setImageGenerating(prev => ({...prev, [project.id]: false}));
          setPendingImages(prev => ({...prev, [project.id]: 0}));
      }
  };

  const handleGenerateWarScenes = async (project: Project) => {
      const partText = warTextBuffer;
      const partExists = !!project.scriptParts[activePartIndex];

      if (!partText.trim()) {
          showToast("Схоже, сценарій для цієї частини пустий. Спочатку згенеруйте сценарій.", "error");
          return;
      }

      setLoading(prev => ({...prev, [project.id]: true}));
      onAddCost(0.01); 
      
      try {
          const scenes = await generateWarScenes(partText, minChars, maxChars, customInstructions);
          
          if (!scenes || scenes.length === 0) {
              throw new Error("Empty scenes returned");
          }

          const updatedParts = [...project.scriptParts];
          
          if (partExists) {
              updatedParts[activePartIndex] = { ...updatedParts[activePartIndex], warScenes: scenes };
          } else {
              updatedParts[activePartIndex] = {
                  id: `war-part-${Date.now()}`,
                  sectionTitle: `Частина ${activePartIndex + 1}`,
                  contentEn: partText,
                  contentUa: '',
                  isGenerating: false,
                  warScenes: scenes
              };
          }

          onUpdateProject(project.id, { scriptParts: updatedParts });
          showToast("Сцени успішно розбито!", 'success');
          setCustomInstructions(''); 
      } catch (e) {
          console.error(e);
          showToast("Помилка при генерації сцен. Перевірте API ключ.", 'error');
      } finally {
          setLoading(prev => ({...prev, [project.id]: false}));
      }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(prev => ({ ...prev, [id]: true }));
    setTimeout(() => { setCopiedIndex(prev => ({ ...prev, [id]: false })); }, 2000);
  };

  const toggleSource = (projectId: number, source: 'structure' | 'script') => {
      setGenerationSource(prev => ({...prev, [projectId]: source}));
  };

  const handleDownloadImage = (url: string, filename: string) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const setAspectRatio = (projectId: number, ratio: string) => {
      onUpdateProject(projectId, { preferredAspectRatio: ratio });
      setSettingsMenuLevel('main');
      setActiveSettings(null);
  };

  const setQuantity = (projectId: number, qty: number, type: 'prompt' | 'image') => {
      if (type === 'image') onUpdateProject(projectId, { numberOfImages: qty });
      else onUpdateProject(projectId, { numberOfPrompts: qty });
      setSettingsMenuLevel('main');
      setActiveSettings(null);
  };

  const handlePrevImage = () => { if (lightboxIndex !== null && lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1); };
  const handleNextImage = () => { if (selectedProject?.generatedImages && lightboxIndex !== null && lightboxIndex < selectedProject.generatedImages.length - 1) setLightboxIndex(lightboxIndex + 1); };

  const toggleSettingsMenu = (id: number, type: 'prompt' | 'image') => {
      if (activeSettings?.projectId === id && activeSettings?.type === type) setActiveSettings(null);
      else { setActiveSettings({ projectId: id, type }); setSettingsMenuLevel('main'); }
  };

  const isProcessing = (p: Project) => p.isStructureLoading || p.isScriptGenerating || p.scriptParts.some(part => part.isGenerating);
  const isDone = (p: Project) => !isProcessing(p) && p.scriptParts.length > 0;
  
  const isGenerationReady = (project: Project, source?: 'structure' | 'script'): boolean => {
      if (!source) return false;
      if (source === 'structure') return project.structure.length > 0;
      else return project.scriptParts.length > 0 && project.scriptParts.some(p => p.contentEn && p.contentEn.length > 50);
  };

  const hasActiveProjects = Object.keys(filteredTree).length > 0;

  const renderWarMode = () => {
      if (!selectedProject) return null;
      
      const currentPart = selectedProject.scriptParts[activePartIndex];
      const hasScript = !!currentPart && !!currentPart.contentEn;
      const scriptTextToShow = showSourcePreviewTranslation ? (currentPart?.contentUa || currentPart?.contentEn) : currentPart?.contentEn;

      return (
          <div className="flex flex-col h-full bg-[#0F0F0F] rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#151515]">
                  <h2 className="text-xl font-bold text-white uppercase tracking-wider truncate max-w-2xl">
                       {formatDisplayTitle(selectedProject.config.title)} <span className="text-purple-500 text-sm ml-2 font-black">[WAR STORIES MODE]</span>
                  </h2>
                   <Button variant="outline" className="text-xs h-8 px-3 border-white/10 text-gray-400 hover:text-white" onClick={() => setSelectedProjectId(null)}>
                      <ArrowLeft className="w-3 h-3 mr-1" /> Закрити проєкт
                  </Button>
              </div>

              <div className="bg-[#151515] border-b border-white/5 p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex items-center gap-2 max-w-full md:max-w-md">
                      <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                        {selectedProject.scriptParts.map((part, idx) => (
                            <button
                                key={part.id}
                                onClick={() => setActivePartIndex(idx)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                                    activePartIndex === idx ? 'bg-yt-red text-white' : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                Частина {idx + 1}
                            </button>
                        ))}
                      </div>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                  {/* --- SCRIPT PREVIEW BLOCK --- */}
                  {hasScript && (
                      <div className="bg-[#1a1a1a] rounded-xl border border-white/10 mb-6 overflow-hidden">
                          <div className="px-4 py-2 border-b border-white/5 flex justify-between items-center bg-black/20">
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Вихідний текст сценарію</span>
                              <div className="flex items-center gap-3">
                                  <span className="text-[10px] text-gray-500 font-mono">{scriptTextToShow?.length || 0} символів</span>
                                  <div className="flex bg-black/40 rounded p-0.5">
                                      <button onClick={() => setShowSourcePreviewTranslation(false)} className={`px-2 py-0.5 rounded text-[10px] font-bold ${!showSourcePreviewTranslation ? 'bg-white/20 text-white' : 'text-gray-500'}`}>ENG</button>
                                      <button onClick={() => setShowSourcePreviewTranslation(true)} className={`px-2 py-0.5 rounded text-[10px] font-bold ${showSourcePreviewTranslation ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500'}`}>UA</button>
                                  </div>
                              </div>
                          </div>
                          <div className="p-4 max-h-48 overflow-y-auto custom-scrollbar">
                              <p className="text-sm text-gray-300 leading-relaxed font-serif whitespace-pre-wrap">
                                  {scriptTextToShow}
                              </p>
                          </div>
                      </div>
                  )}

                  {/* Config & Controls */}
                  <div className="flex flex-col gap-4 mb-6">
                      <div className="flex items-center justify-between gap-4 bg-[#1a1a1a] p-3 rounded-xl border border-white/5">
                          <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 bg-black/30 p-1.5 rounded-lg border border-white/5">
                                  <span className="text-[10px] text-gray-500 uppercase px-1">Символи</span>
                                  <input type="number" value={minChars} onChange={(e) => setMinChars(parseInt(e.target.value))} className="w-12 bg-transparent text-white text-xs text-center outline-none border-b border-white/20 focus:border-purple-500" />
                                  <span className="text-gray-600">-</span>
                                  <input type="number" value={maxChars} onChange={(e) => setMaxChars(parseInt(e.target.value))} className="w-12 bg-transparent text-white text-xs text-center outline-none border-b border-white/20 focus:border-purple-500" />
                              </div>
                              <div className="w-px h-8 bg-white/10 mx-2" />
                              <div className="flex items-center gap-2 flex-1">
                                  <Settings2 className="w-4 h-4 text-gray-500" />
                                  <input type="text" value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} placeholder="Корективи для промтів (напр. 'зробити похмуріше')..." className="w-full bg-transparent text-sm text-gray-300 placeholder:text-gray-600 outline-none" />
                              </div>
                          </div>
                          <Button onClick={() => handleGenerateWarScenes(selectedProject)} isLoading={loading[selectedProject.id]} className="bg-purple-600 hover:bg-purple-700 text-xs px-6 h-10" icon={<RefreshCw className="w-3 h-3" />}>
                              {currentPart?.warScenes?.length ? 'Перегенерувати сцени' : 'Згенерувати сцени'}
                          </Button>
                      </div>
                  </div>

                  {hasScript && currentPart.warScenes && currentPart.warScenes.length > 0 ? (
                      <div className="grid grid-cols-2 gap-6">
                          {currentPart.warScenes.map((scene, idx) => (
                              <React.Fragment key={idx}>
                                  <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5 flex flex-col gap-2 relative group">
                                      <div className="flex justify-between items-start">
                                          <span className="text-[10px] font-bold text-gray-500 bg-black/20 px-2 py-0.5 rounded">#{idx + 1} • {scene.segmentText.length} char</span>
                                          <div className="flex gap-1">
                                               <button onClick={() => setShowTextTranslation(prev => ({...prev, [idx]: !prev[idx]}))} className={`p-1 rounded hover:bg-white/10 text-[10px] font-bold ${showTextTranslation[idx] ? 'text-blue-400' : 'text-gray-500'}`}>UA</button>
                                               <button onClick={() => handleCopy(showTextTranslation[idx] ? (scene.segmentTextUa || scene.segmentText) : scene.segmentText, `txt-${idx}`)} className="text-gray-500 hover:text-white">{copiedIndex[`txt-${idx}`] ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}</button>
                                          </div>
                                      </div>
                                      <p className="text-sm text-gray-300 leading-relaxed font-serif">{showTextTranslation[idx] ? (scene.segmentTextUa || scene.segmentText) : scene.segmentText}</p>
                                  </div>
                                  <div className="bg-[#151515] rounded-xl p-4 border border-purple-500/20 flex flex-col gap-2 relative group hover:border-purple-500/50 transition-colors">
                                      <div className="flex justify-between items-start">
                                          <span className="text-[10px] font-bold text-purple-400 bg-purple-900/20 px-2 py-0.5 rounded uppercase">PROMPT</span>
                                          <div className="flex gap-1">
                                               <button onClick={() => setShowSceneTranslation(prev => ({...prev, [idx]: !prev[idx]}))} className={`p-1 rounded hover:bg-white/10 text-[10px] font-bold ${showSceneTranslation[idx] ? 'text-blue-400' : 'text-gray-500'}`}>UA</button>
                                               <button onClick={() => handleCopy(showSceneTranslation[idx] ? (scene.imagePromptUa || scene.imagePrompt) : scene.imagePrompt, `prm-${idx}`)} className="text-gray-500 hover:text-white">{copiedIndex[`prm-${idx}`] ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}</button>
                                          </div>
                                      </div>
                                      <p className="text-xs text-gray-400 leading-relaxed font-mono">{showSceneTranslation[idx] ? (scene.imagePromptUa || scene.imagePrompt) : scene.imagePrompt}</p>
                                  </div>
                              </React.Fragment>
                          ))}
                      </div>
                  ) : hasScript ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-white/5 rounded-xl min-h-[200px]">
                          <Grid3X3 className="w-10 h-10 mb-2 opacity-30" />
                          <p>Натисніть "Згенерувати сцени", щоб розбити текст на кадри.</p>
                      </div>
                  ) : (
                      <div className="bg-yellow-900/10 border border-yellow-500/20 p-4 rounded-xl flex items-center gap-3">
                          <Info className="w-5 h-5 text-yellow-500" />
                          <p className="text-sm text-yellow-200/80">Сценарій для цієї частини ще не створено або не знайдено. Перевірте розділ "Сценарії".</p>
                      </div>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fade-in-up pb-20 h-[calc(100vh-140px)]">
        {lightboxIndex !== null && selectedProject?.generatedImages && selectedProject.generatedImages[lightboxIndex] && (
            <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex items-center justify-center animate-fade-in-up">
                <button onClick={() => setLightboxIndex(null)} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white hover:bg-red-500 transition-colors z-[310]"><X className="w-6 h-6" /></button>
                <button onClick={handlePrevImage} disabled={lightboxIndex === 0} className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed z-[310]"><ChevronLeft className="w-8 h-8" /></button>
                <button onClick={handleNextImage} disabled={lightboxIndex === selectedProject.generatedImages.length - 1} className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed z-[310]"><ChevronRight className="w-8 h-8" /></button>
                <div className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center gap-4">
                     <img src={selectedProject.generatedImages[lightboxIndex].url} alt={selectedProject.generatedImages[lightboxIndex].prompt} className="object-contain max-h-[85vh] max-w-full rounded-lg shadow-2xl border border-white/10" />
                     <div className="bg-black/60 backdrop-blur px-6 py-2 rounded-full border border-white/10 text-gray-300 text-sm max-w-2xl text-center truncate">{selectedProject.generatedImages[lightboxIndex].prompt}</div>
                </div>
            </div>
        )}

        <div className="w-full lg:w-1/4 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar bg-black/20 p-4 rounded-2xl border border-white/5 flex-shrink-0 shadow-lg">
             <div className="pb-4 border-b border-white/10 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                      <Button onClick={onCreateNew} className="flex items-center justify-center gap-2 bg-yt-red hover:bg-red-700 text-white font-bold shadow-lg shadow-red-900/30 rounded-xl h-12 text-xs px-2"><Plus className="w-4 h-4" /> <span>Новий</span></Button>
                      <Button onClick={() => { setSelectedProjectId(null); onTransport(); }} className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg shadow-purple-900/30 rounded-xl h-12 text-xs px-2"><Zap className="w-4 h-4" /> <span>Транспорт.</span></Button>
                  </div>
                  <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                      <input type="text" placeholder="Пошук проєкту..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:border-yt-red outline-none transition-colors placeholder:text-gray-600" />
                  </div>
              </div>
              <div className="flex-1 space-y-4">
                {!hasActiveProjects ? (
                      <div className="text-center text-gray-500 text-xs py-4 italic">
                          {searchQuery ? 'Проєктів не знайдено' : 'Немає активних проєктів. Створіть новий проєкт, щоб бути ближче до мети'}
                      </div>
                ) : (
                    Object.keys(filteredTree).map((niche) => {
                        const nicheKey = `niche:${niche}`;
                        const isNicheExpanded = expandedKeys.has(nicheKey);
                        const nicheTitles = filteredTree[niche];
                        return (
                            <div key={nicheKey}>
                                <button onClick={() => toggleExpand(nicheKey)} className="w-full flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2 hover:text-white transition-colors">
                                    <span className="flex items-center gap-2"><FolderOpen className="w-3 h-3" /> {niche}</span>
                                    {isNicheExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                </button>
                                {isNicheExpanded && (
                                    <div className="pl-3 space-y-2 ml-2 mt-1">
                                        {Object.keys(nicheTitles).map(baseTitle => {
                                            const titleKey = `title:${niche}:${baseTitle}`;
                                            const isTitleExpanded = expandedKeys.has(titleKey);
                                            const structures = nicheTitles[baseTitle];
                                            const allVariants = Object.values(structures).flat();
                                            const anyProcessing = allVariants.some(isProcessing);
                                            const allFinished = allVariants.every(isDone);
                                            let statusClass = "border-white/10 bg-yt-gray text-gray-300";
                                            if (anyProcessing) statusClass = "border-purple-500/50 bg-purple-900/10 text-white shadow-[0_0_10px_rgba(168,85,247,0.1)]";
                                            else if (allFinished) statusClass = "border-green-500/20 bg-green-900/5 text-gray-200";

                                            return (
                                                <div key={titleKey} className="space-y-1">
                                                    <button onClick={() => toggleExpand(titleKey)} className={`w-full flex items-center justify-between p-3 rounded-lg border text-left text-sm font-medium transition-all group relative overflow-hidden ${statusClass}`}>
                                                        <div className="relative z-10 truncate pr-2">{baseTitle}</div>
                                                        <div className="relative z-10 flex items-center gap-1">
                                                            {anyProcessing && <Loader2 className="w-3 h-3 animate-spin text-purple-400" />}
                                                            {!anyProcessing && allFinished && <Check className="w-3 h-3 text-green-500" />}
                                                            {isTitleExpanded ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
                                                        </div>
                                                    </button>
                                                    {isTitleExpanded && (
                                                        <div className="pl-3 space-y-1 border-l border-white/10 ml-2 mt-1">
                                                            {Object.keys(structures).map(structIdxStr => {
                                                                const sIdx = parseInt(structIdxStr);
                                                                const structKey = `struct:${niche}:${baseTitle}:${sIdx}`;
                                                                const isStructExpanded = expandedKeys.has(structKey);
                                                                const scriptVariants = structures[sIdx];
                                                                const structProcessing = scriptVariants.some(isProcessing);
                                                                return (
                                                                    <div key={structKey}>
                                                                        <button onClick={() => toggleExpand(structKey)} className={`w-full flex items-center gap-2 p-2 rounded hover:bg-white/5 text-xs transition-colors ${structProcessing ? 'text-purple-300' : 'text-gray-400'}`}>
                                                                            <List className="w-3 h-3" /> Структура №{sIdx}
                                                                            {isStructExpanded ? <ChevronDown className="w-3 h-3 ml-auto opacity-50" /> : <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
                                                                        </button>
                                                                        {isStructExpanded && (
                                                                            <div className="pl-3 space-y-1 mt-1">
                                                                                {scriptVariants.map((proj, idx) => {
                                                                                    const isSelected = selectedProjectId === proj.id;
                                                                                    const { scriptIdx } = parseProjectTitle(proj.config.title);
                                                                                    const scriptLabel = scriptVariants.length > 1 ? `Сценарій ${sIdx}.${scriptIdx}` : `Сценарій`;
                                                                                    return (
                                                                                        <button key={proj.id} onClick={() => { setSelectedProjectId(proj.id); }} className={`w-full flex items-center gap-2 p-2 rounded-md text-xs transition-all ${isSelected ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'bg-white/5 hover:bg-white/10 text-gray-500 hover:text-gray-300'}`}>
                                                                                            <FileVideo className="w-3 h-3" /> {scriptLabel}
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>

        <div className="w-full lg:w-3/4 flex flex-col bg-[#0F0F0F] rounded-2xl shadow-2xl overflow-hidden relative">
            {selectedProject ? (
                isWarNiche ? renderWarMode() : (
                <div className="flex flex-col h-full">
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#151515]">
                        <h2 className="text-xl font-bold text-white uppercase tracking-wider truncate max-w-2xl">
                             {formatDisplayTitle(selectedProject.config.title)} <span className="text-gray-500 text-base normal-case">/ {selectedProject.config.niche} / ID: {selectedProject.id}</span>
                        </h2>
                         <Button variant="outline" className="text-xs h-8 px-3 border-white/10 text-gray-400 hover:text-white" onClick={() => setSelectedProjectId(null)}>
                            <ArrowLeft className="w-3 h-3 mr-1" /> Закрити проєкт
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">З чого генеруємо картинки?</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button onClick={() => toggleSource(selectedProject.id, 'structure')} className={`relative p-6 rounded-xl border flex items-center justify-between transition-all duration-300 group ${(generationSource[selectedProject.id]) === 'structure' ? 'bg-[#1a1a1a] border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)] ring-1 ring-purple-500/50' : 'bg-[#151515] border-white/10 hover:border-white/20 hover:bg-[#1a1a1a] opacity-60 hover:opacity-100'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${(generationSource[selectedProject.id]) === 'structure' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-400 group-hover:bg-white/10'}`}>
                                            <Layout className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <div className={`text-xl font-black uppercase tracking-wide transition-colors ${(generationSource[selectedProject.id]) === 'structure' ? 'text-white' : 'text-gray-400'}`}>СТРУКТУРА</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-gray-500 uppercase">Тривалість</div>
                                        <div className="text-white font-mono">{selectedProject.config.durationMinutes} хв</div>
                                    </div>
                                    {(generationSource[selectedProject.id]) === 'structure' && (<div className="absolute top-3 right-3 w-2.5 h-2.5 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,1)]" />)}
                                </button>

                                <button onClick={() => toggleSource(selectedProject.id, 'script')} className={`relative p-6 rounded-xl border flex items-center justify-between transition-all duration-300 group ${(generationSource[selectedProject.id]) === 'script' ? 'bg-[#1a1a1a] border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)] ring-1 ring-purple-500/50' : 'bg-[#151515] border-white/10 hover:border-white/20 hover:bg-[#1a1a1a] opacity-60 hover:opacity-100'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${(generationSource[selectedProject.id]) === 'script' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-400 group-hover:bg-white/10'}`}>
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <div className={`text-xl font-black uppercase tracking-wide transition-colors ${(generationSource[selectedProject.id]) === 'script' ? 'text-white' : 'text-gray-400'}`}>СЦЕНАРІЙ</div>
                                            <div className={`text-xs font-bold mt-1 ${isDone(selectedProject) ? 'text-green-500' : 'text-gray-500'}`}>{isDone(selectedProject) ? 'ГОТОВО' : 'В ПРОЦЕСІ'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center bg-black/40 rounded-lg p-1 border border-white/10" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => setShowTranslation(false)} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${!showTranslation ? 'bg-yt-red text-white' : 'text-gray-400 hover:text-white'}`}>ENG</button>
                                        <button onClick={() => setShowTranslation(true)} className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${showTranslation ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>UA <Languages className="w-3 h-3" /></button>
                                    </div>
                                    {(generationSource[selectedProject.id]) === 'script' && (<div className="absolute top-3 right-3 w-2.5 h-2.5 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,1)]" />)}
                                </button>
                            </div>
                        </div>

                        <div className="bg-[#151515] border border-white/10 rounded-xl p-6 space-y-4 shadow-lg">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Введіть текст для генерації зображень, вказівки</label>
                                <div className="text-xs text-gray-500 font-mono bg-white/5 px-2 py-1 rounded">{(selectedProject.generatedImages?.length || 0) + (selectedProject.imagePrompts?.length || 0)} елементів</div>
                            </div>
                            <textarea value={selectedProject.imageInstructions || ''} onChange={(e) => onUpdateProject(selectedProject.id, { imageInstructions: e.target.value })} placeholder="Опишіть стиль (напр. Cinematic, Dark, 35mm film, Hyper-realistic)..." className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none resize-none h-24 transition-all placeholder:text-gray-600" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div className="flex gap-2">
                                    <Button onClick={() => handleGenerateGeneric(selectedProject)} isLoading={loading[selectedProject.id]} disabled={!isGenerationReady(selectedProject, generationSource[selectedProject.id])} className={`flex-1 h-14 border-0 shadow-none flex flex-col items-center justify-center leading-tight gap-0.5 transition-all duration-300 ${isGenerationReady(selectedProject, generationSource[selectedProject.id]) ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]' : 'bg-white/5 text-gray-600 cursor-not-allowed'}`} icon={isGenerationReady(selectedProject, generationSource[selectedProject.id]) ? <Sparkles className="w-5 h-5" /> : <Lock className="w-5 h-5" />}>
                                        <span className="font-bold">Згенерувати Промт</span>
                                        {isGenerationReady(selectedProject, generationSource[selectedProject.id]) && (<span className="block text-[9px] opacity-80 font-normal">~${0.001} ({selectedProject.numberOfPrompts || 4} шт)</span>)}
                                    </Button>
                                    <div className="relative">
                                        <button onClick={() => toggleSettingsMenu(selectedProject.id, 'prompt')} className="h-14 w-12 flex items-center justify-center bg-black/40 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white"><Settings2 className="w-5 h-5" /></button>
                                        {activeSettings?.projectId === selectedProject.id && activeSettings.type === 'prompt' && (
                                            <div className="absolute top-full left-0 mt-2 w-56 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in-up">
                                                {settingsMenuLevel === 'main' && (
                                                    <>
                                                        <div className="px-4 py-3 border-b border-white/5 text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Settings2 className="w-3 h-3" /> Налаштування Промтів</div>
                                                        <div className="p-1">
                                                            <button onClick={() => setSettingsMenuLevel('format')} className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/5 hover:text-white flex justify-between items-center transition-colors"><span>Формат (Співвідн.)</span> <span className="text-gray-500">{selectedProject.preferredAspectRatio || '16:9'}</span></button>
                                                            <button onClick={() => setSettingsMenuLevel('quantity')} className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/5 hover:text-white flex justify-between items-center transition-colors"><span>Кількість</span> <span className="text-gray-500">{selectedProject.numberOfPrompts || 4}</span></button>
                                                        </div>
                                                    </>
                                                )}
                                                {settingsMenuLevel === 'format' && (
                                                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                                        <div className="px-4 py-3 border-b border-white/5 text-xs font-bold text-gray-500 uppercase flex items-center gap-2 cursor-pointer hover:text-white" onClick={() => setSettingsMenuLevel('main')}><ChevronLeft className="w-3 h-3" /> Формат</div>
                                                        {ASPECT_RATIOS.map(ratio => (
                                                            <button key={ratio.value} onClick={() => setAspectRatio(selectedProject.id, ratio.value)} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-white/5 transition-colors ${selectedProject.preferredAspectRatio === ratio.value ? 'text-purple-400 bg-purple-900/10' : 'text-gray-300'}`}>{ratio.label}</button>
                                                        ))}
                                                    </div>
                                                )}
                                                {settingsMenuLevel === 'quantity' && (
                                                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                                        <div className="px-4 py-3 border-b border-white/5 text-xs font-bold text-gray-500 uppercase flex items-center gap-2 cursor-pointer hover:text-white" onClick={() => setSettingsMenuLevel('main')}><ChevronLeft className="w-3 h-3" /> Кількість</div>
                                                        {QUANTITY_OPTIONS.map(qty => (
                                                            <button key={qty} onClick={() => setQuantity(selectedProject.id, qty, 'prompt')} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-white/5 transition-colors ${selectedProject.numberOfPrompts === qty ? 'text-purple-400 bg-purple-900/10' : 'text-gray-300'}`}>{qty}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button onClick={() => handleGenerateImageSequential(selectedProject)} isLoading={imageGenerating[selectedProject.id]} className="flex-1 h-14 bg-green-600 hover:bg-green-500 text-white border-0 shadow-lg shadow-green-900/20 flex flex-col items-center justify-center leading-tight gap-0.5 transition-all duration-300" icon={<ImageIcon className="w-5 h-5" />}>
                                        <span className="font-bold">Згенерувати Зображення</span>
                                        <span className="block text-[9px] opacity-80 font-normal">~${(0.04 * (selectedProject.numberOfImages || 1)).toFixed(2)} ({selectedProject.numberOfImages || 1} шт)</span>
                                    </Button>
                                    <div className="relative">
                                        <button onClick={() => toggleSettingsMenu(selectedProject.id, 'image')} className="h-14 w-12 flex items-center justify-center bg-black/40 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white"><Settings2 className="w-5 h-5" /></button>
                                        {activeSettings?.projectId === selectedProject.id && activeSettings.type === 'image' && (
                                            <div className="absolute top-full right-0 mt-2 w-56 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in-up">
                                                {settingsMenuLevel === 'main' && (
                                                    <>
                                                        <div className="px-4 py-3 border-b border-white/5 text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Settings2 className="w-3 h-3" /> Налаштування Зображень</div>
                                                        <div className="p-1">
                                                            <button onClick={() => setSettingsMenuLevel('format')} className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/5 hover:text-white flex justify-between items-center transition-colors"><span>Формат (Співвідн.)</span> <span className="text-gray-500">{selectedProject.preferredAspectRatio || '16:9'}</span></button>
                                                            <button onClick={() => setSettingsMenuLevel('quantity')} className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/5 hover:text-white flex justify-between items-center transition-colors"><span>Кількість</span> <span className="text-gray-500">{selectedProject.numberOfImages || 1}</span></button>
                                                        </div>
                                                    </>
                                                )}
                                                {settingsMenuLevel === 'format' && (
                                                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                                        <div className="px-4 py-3 border-b border-white/5 text-xs font-bold text-gray-500 uppercase flex items-center gap-2 cursor-pointer hover:text-white" onClick={() => setSettingsMenuLevel('main')}><ChevronLeft className="w-3 h-3" /> Формат</div>
                                                        {ASPECT_RATIOS.map(ratio => (
                                                            <button key={ratio.value} onClick={() => setAspectRatio(selectedProject.id, ratio.value)} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-white/5 transition-colors ${selectedProject.preferredAspectRatio === ratio.value ? 'text-purple-400 bg-purple-900/10' : 'text-gray-300'}`}>{ratio.label}</button>
                                                        ))}
                                                    </div>
                                                )}
                                                {settingsMenuLevel === 'quantity' && (
                                                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                                        <div className="px-4 py-3 border-b border-white/5 text-xs font-bold text-gray-500 uppercase flex items-center gap-2 cursor-pointer hover:text-white" onClick={() => setSettingsMenuLevel('main')}><ChevronLeft className="w-3 h-3" /> Кількість</div>
                                                        {QUANTITY_OPTIONS.map(qty => (
                                                            <button key={qty} onClick={() => setQuantity(selectedProject.id, qty, 'image')} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-white/5 transition-colors ${selectedProject.numberOfImages === qty ? 'text-purple-400 bg-purple-900/10' : 'text-gray-300'}`}>{qty}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* --- NEW: Generated Text Prompts List with Skeleton --- */}
                        <div className="space-y-4">
                            {loading[selectedProject.id] && <PromptSkeleton />}
                            
                            {selectedProject.imagePrompts && selectedProject.imagePrompts.length > 0 && (
                                <div className="grid grid-cols-1 gap-4 animate-fade-in-up">
                                    {selectedProject.imagePrompts.map((prompt, idx) => (
                                        <div key={idx} className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4 flex flex-col gap-2 relative group hover:border-purple-500/30 transition-all">
                                            <div className="flex justify-between items-start">
                                                <span className="text-[10px] font-bold text-purple-400 bg-purple-900/20 px-2 py-0.5 rounded uppercase">PROMPT #{idx + 1}</span>
                                                <div className="flex gap-1">
                                                    <button onClick={() => setShowTranslation(!showTranslation)} className={`p-1 rounded hover:bg-white/10 text-[10px] font-bold ${showTranslation ? 'text-blue-400' : 'text-gray-500'}`}>UA</button>
                                                    <button onClick={() => handleCopy(showTranslation ? prompt.ua : prompt.en, `prm-gen-${idx}`)} className="text-gray-500 hover:text-white">{copiedIndex[`prm-gen-${idx}`] ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}</button>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-300 leading-relaxed font-mono">{showTranslation ? prompt.ua : prompt.en}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* --- Generated Images Grid --- */}
                        {/* Display Skeletons while generating */}
                        {(imageGenerating[selectedProject.id] && pendingImages[selectedProject.id] > 0) && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-white/5">
                                {Array.from({ length: pendingImages[selectedProject.id] || 1 }).map((_, i) => (
                                    <ImageSkeleton key={`skeleton-${i}`} />
                                ))}
                            </div>
                        )}

                        {selectedProject.generatedImages && selectedProject.generatedImages.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-white/5">
                                {selectedProject.generatedImages.map((img, idx) => (
                                    <div key={img.id} className="group relative aspect-video bg-black/50 rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-all cursor-pointer animate-fade-in-up" onClick={() => setLightboxIndex(idx)}>
                                        <img src={img.url} alt={img.prompt} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }} className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white backdrop-blur-sm"><ZoomIn className="w-5 h-5" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDownloadImage(img.url, `image-${idx}.png`); }} className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white backdrop-blur-sm"><Download className="w-5 h-5" /></button>
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                                            <p className="text-[10px] text-gray-300 truncate font-mono opacity-0 group-hover:opacity-100 transition-opacity">{img.prompt}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                )
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#0F0F0F]">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <ImageIcon className="w-10 h-10 text-gray-600" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Оберіть проєкт</h3>
                    <p className="text-gray-500 max-w-sm">
                        Оберіть проєкт зі списку ліворуч, щоб почати генерацію промтів та зображень.
                    </p>
                </div>
            )}
        </div>
    </div>
  );
};