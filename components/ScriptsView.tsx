import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, AppState } from '../types';
import { ScriptSectionCard } from './ScriptSectionCard';
import { Button } from './Button';
import { ChevronDown, ChevronRight, FileVideo, CheckCircle, RefreshCw, Download, Plus, Layout, FolderOpen, List, Search, Loader2, AlertTriangle, ArrowLeft, Zap } from 'lucide-react';
import { StructureView } from './StructureView';
import { DownloadOptionsModal } from './DownloadOptionsModal';

interface ScriptsViewProps {
  projects: Project[];
  setAppState: (state: AppState) => void;
  onGenerateScript: (id: number, instructions?: string, model?: string) => void;
  onGenerateStructure: (id: number, instructions?: string, model?: string) => void;
  onCreateNew: () => void;
  onTransport: () => void;
  onRefineProject: (id: number, instr: string) => void;
  onRegeneratePart: (id: number) => void;
  onDownload: (id: number, customName?: string) => void;
  selectedTitle: string | null;
  setSelectedTitle: (title: string | null) => void;
  refinePartSelection: {[key: number]: string};
  setRefinePartSelection: React.Dispatch<React.SetStateAction<{[key: number]: string}>>;
  refineInstructions: {[key: number]: string};
  setRefineInstructions: React.Dispatch<React.SetStateAction<{[key: number]: string}>>;
  isRegeneratingPart: {[key: number]: boolean};
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

export const ScriptsView: React.FC<ScriptsViewProps> = ({
  projects,
  setAppState,
  onGenerateScript,
  onGenerateStructure,
  onCreateNew,
  onTransport,
  onRefineProject,
  onRegeneratePart,
  onDownload,
  selectedTitle,
  setSelectedTitle,
  refinePartSelection,
  setRefinePartSelection,
  refineInstructions,
  setRefineInstructions,
  isRegeneratingPart
}) => {
  const [activeTab, setActiveTab] = useState<'structure' | 'script'>('structure');
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadModalId, setDownloadModalId] = useState<number | null>(null);
  
  const prevActiveIdsRef = useRef<Set<number>>(new Set());

  const activeProjects = useMemo(() => {
      return projects.filter(p => !p.isCompleted);
  }, [projects]);

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

  useEffect(() => {
      if (selectedTitle) {
          const stillExists = activeProjects.some(p => {
              const { baseTitle } = parseProjectTitle(p.config.title);
              return baseTitle === selectedTitle;
          });
          if (!stillExists) setSelectedTitle(null);
      }
  }, [activeProjects, selectedTitle, setSelectedTitle]);

  useEffect(() => {
    if (selectedTitle) setActiveTab('structure');
  }, [selectedTitle]);

  const projectTree = useMemo(() => {
    const tree: Record<string, Record<string, Project[]>> = {};
    [...activeProjects].reverse().forEach(p => {
        const niche = p.config.niche || 'Other';
        const { baseTitle } = parseProjectTitle(p.config.title);
        if (!tree[niche]) tree[niche] = {};
        if (!tree[niche][baseTitle]) tree[niche][baseTitle] = [];
        tree[niche][baseTitle].push(p);
    });
    return tree;
  }, [activeProjects]);

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

  const currentProjects = useMemo(() => {
      if (!selectedTitle) return [];
      for (const niche in projectTree) {
          if (projectTree[niche][selectedTitle]) {
              return projectTree[niche][selectedTitle].sort((a,b) => a.id - b.id);
          }
      }
      return [];
  }, [selectedTitle, projectTree]);

  const structureGroups = useMemo(() => {
      const groups: Record<number, Project[]> = {};
      currentProjects.forEach(p => {
          const { structIdx } = parseProjectTitle(p.config.title);
          if (!groups[structIdx]) groups[structIdx] = [];
          groups[structIdx].push(p);
      });
      return groups;
  }, [currentProjects]);

  const toggleExpand = (key: string) => {
      setExpandedKeys(prev => {
          const newSet = new Set(prev);
          if (newSet.has(key)) newSet.delete(key);
          else newSet.add(key);
          return newSet;
      });
  };

  const handleTabSwitch = (tab: 'structure' | 'script') => {
      setActiveTab(tab);
  };

  const hasActiveProjects = Object.keys(filteredTree).length > 0;

  const renderScriptContent = () => {
    return (
        <div className="space-y-12 pb-20 animate-fade-in-up">
            {Object.keys(structureGroups).map(structIdxStr => {
                const structIdx = parseInt(structIdxStr);
                const projectsInStruct = structureGroups[structIdx];
                
                return (
                    <div key={structIdx} className="space-y-6">
                         {Object.keys(structureGroups).length > 1 && (
                             <div className="flex items-center gap-2 text-gray-400 border-b border-white/5 pb-2">
                                 <List className="w-4 h-4" />
                                 <h3 className="text-sm font-bold uppercase tracking-wider">Структура №{structIdx}</h3>
                             </div>
                         )}

                         {projectsInStruct.map(project => {
                            const isDone = !project.isScriptGenerating && project.scriptParts.length > 0 && !project.scriptParts.some(p => p.isGenerating);
                            const currentRegenerating = isRegeneratingPart ? isRegeneratingPart[project.id] : false;
                            const { scriptIdx } = parseProjectTitle(project.config.title);
                            const hasStructure = project.structure.length > 0;
                            const estimatedCost = (project.structure.length * 0.02).toFixed(2);
                            
                            const scriptLabel = projectsInStruct.length > 1 ? `Сценарій ${structIdx}.${scriptIdx}` : `Сценарій`;

                            return (
                                <div key={project.id} className="bg-black/20 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                                    <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                                        <div>
                                            <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                                <span className="bg-white/10 text-xs px-2 py-1 rounded text-gray-300 font-mono">{scriptLabel}</span>
                                                {formatDisplayTitle(project.config.title)}
                                            </h3>
                                            <p className="text-gray-400 text-xs mt-1">{project.config.niche} • {project.config.durationMinutes} хв</p>
                                        </div>
                                        {isDone ? (
                                            <span className="flex items-center gap-1 text-green-400 text-sm font-medium bg-green-400/10 px-3 py-1 rounded-full border border-green-400/20"><CheckCircle className="w-4 h-4" /> Готово</span>
                                        ) : project.isScriptGenerating ? (
                                            <span className="flex items-center gap-2 text-yt-red text-sm font-medium animate-pulse">Пишемо...</span>
                                        ) : null}
                                    </div>

                                    {project.scriptParts.length === 0 && !project.isScriptGenerating && (
                                        <div className="text-center py-10">
                                            {!hasStructure ? (
                                                <div className="flex flex-col items-center gap-4">
                                                    <AlertTriangle className="w-12 h-12 text-amber-500/50" />
                                                    <p className="text-amber-200 font-medium">Зайчику, спочатку потрібно створити структуру</p>
                                                    <Button onClick={() => setActiveTab('structure')} variant="secondary" className="text-xs h-9" icon={<ArrowLeft className="w-4 h-4" />}>Повернутись до структури</Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-gray-500 mb-4">Сценарій ще не згенеровано.</p>
                                                    <Button onClick={() => onGenerateScript(project.id)} className="flex flex-col items-center leading-tight py-2 px-6 gap-0.5">
                                                        <div className="flex items-center gap-2"><FileVideo className="w-4 h-4" /><span>Згенерувати сценарій</span></div>
                                                        <span className="text-[10px] opacity-70 mt-0.5 font-normal">~${estimatedCost}</span>
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    
                                    <div className="space-y-4 pl-2 border-l-2 border-white/5">
                                        {project.scriptParts.map((part, index) => (
                                            <div key={part.id} className={`transition-all duration-500 ${part.isGenerating ? 'opacity-70' : 'opacity-100'}`}>
                                                <ScriptSectionCard part={part} index={index} />
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {isDone && (
                                        <>
                                            <div className="mt-8 pt-6 border-t border-white/10 bg-purple-900/10 -mx-6 px-6 py-6 border-b border-white/5">
                                                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><RefreshCw className="w-4 h-4 text-purple-400" /> Корекція та Покращення</h4>
                                                <div className="flex flex-col md:flex-row gap-4">
                                                    <div className="w-full md:w-1/3">
                                                        <select value={refinePartSelection[project.id] || ''} onChange={(e) => setRefinePartSelection(prev => ({...prev, [project.id]: e.target.value}))} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-purple-500">
                                                            <option value="" className="text-gray-400">Всі частини (Переписати все)</option>
                                                            {project.scriptParts.map((p, idx) => (<option key={p.id} value={p.id}>{idx + 1}. {p.sectionTitle}</option>))}
                                                        </select>
                                                    </div>
                                                    <div className="w-full md:w-2/3 flex gap-2">
                                                        <input type="text" placeholder="Що змінити?..." value={refineInstructions[project.id] || ''} onChange={(e) => setRefineInstructions(prev => ({...prev, [project.id]: e.target.value}))} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-purple-500" />
                                                        <Button onClick={() => onRegeneratePart(project.id)} disabled={!refineInstructions[project.id] || currentRegenerating} isLoading={currentRegenerating} className="bg-purple-600 hover:bg-purple-700 text-xs px-4 whitespace-nowrap flex flex-col items-center justify-center leading-tight gap-0.5">
                                                            <span>{(!refinePartSelection[project.id]) ? 'Переписати все' : 'Переписати частину'}</span>
                                                            <span className="block text-[8px] opacity-70">{(!refinePartSelection[project.id]) ? `(~$${estimatedCost})` : '(~$0.02)'}</span>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="pt-6 bg-white/5 -mx-6 -mb-6 p-6 flex justify-end">
                                                <Button onClick={() => setDownloadModalId(project.id)} variant="secondary" icon={<Download className="w-4 h-4" />}>Завантажити RAW (TXT)</Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
            {downloadModalId !== null && (
                <DownloadOptionsModal 
                    isOpen={true}
                    onClose={() => setDownloadModalId(null)}
                    onConfirm={(filename) => {
                        if (downloadModalId !== null) {
                            onDownload(downloadModalId, filename);
                            setDownloadModalId(null);
                        }
                    }}
                    defaultName={projects.find(p => p.id === downloadModalId)?.filename || 'script'}
                />
            )}
        </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-6 animate-fade-in-up pb-20">
        
        {/* Sidebar: Project Navigation */}
        <div className="w-full lg:w-1/4 bg-black/20 rounded-2xl border border-white/5 flex flex-col overflow-hidden shadow-lg flex-shrink-0">
            <div className="p-4 border-b border-white/10 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    <Button onClick={onCreateNew} className="flex items-center justify-center gap-2 bg-yt-red hover:bg-red-700 text-white font-bold shadow-lg shadow-red-900/30 rounded-xl h-12 text-xs px-2">
                        <Plus className="w-4 h-4" /> <span>Новий</span>
                    </Button>
                    <Button onClick={() => { setSelectedTitle(null); onTransport(); }} className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg shadow-purple-900/30 rounded-xl h-12 text-xs px-2">
                        <Zap className="w-4 h-4" /> <span>Транспорт.</span>
                    </Button>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                    <input 
                        type="text" 
                        placeholder="Пошук проєкту..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:border-yt-red outline-none transition-colors placeholder:text-gray-600"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                {!hasActiveProjects ? (
                    <div className="text-center text-gray-500 text-xs py-8 italic px-4">
                        {searchQuery ? 'Проєктів не знайдено' : 'Немає активних проєктів. Створіть новий проєкт, щоб почати.'}
                    </div>
                ) : (
                    Object.keys(filteredTree).map((niche) => {
                        const nicheKey = `niche:${niche}`;
                        const isExpanded = expandedKeys.has(nicheKey);
                        const titles = filteredTree[niche];

                        return (
                            <div key={nicheKey} className="rounded-xl overflow-hidden">
                                <button 
                                    onClick={() => toggleExpand(nicheKey)}
                                    className="w-full flex items-center justify-between p-3 text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <FolderOpen className="w-3 h-3" /> {niche}
                                    </span>
                                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                </button>
                                
                                {isExpanded && (
                                    <div className="bg-black/20 pb-2">
                                        {Object.keys(titles).map(baseTitle => {
                                            const isSelected = selectedTitle === baseTitle;
                                            const variants = titles[baseTitle];
                                            const totalParts = variants.reduce((acc, p) => acc + p.scriptParts.length, 0);
                                            const totalExpected = variants.reduce((acc, p) => acc + (p.structure.length || 0), 0);
                                            const isComplete = totalExpected > 0 && totalParts >= totalExpected;
                                            
                                            return (
                                                <button 
                                                    key={baseTitle}
                                                    onClick={() => setSelectedTitle(baseTitle)}
                                                    className={`w-full flex items-center justify-between p-3 text-left transition-all border-l-2 ${
                                                        isSelected 
                                                        ? 'bg-purple-900/20 border-purple-500 text-white' 
                                                        : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'
                                                    }`}
                                                >
                                                    <span className="text-sm font-medium truncate pr-2">{baseTitle}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-mono text-gray-500">{variants.length}</span>
                                                        {isComplete && <CheckCircle className="w-3 h-3 text-green-500" />}
                                                    </div>
                                                </button>
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

        {/* Main Content */}
        <div className="w-full lg:w-3/4 flex flex-col bg-[#0F0F0F] rounded-2xl shadow-2xl overflow-hidden relative">
            {selectedTitle ? (
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#151515]">
                        <h2 className="text-xl font-bold text-white uppercase tracking-wider truncate max-w-xl">
                            {selectedTitle}
                        </h2>
                        <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                            <button 
                                onClick={() => handleTabSwitch('structure')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${
                                    activeTab === 'structure' 
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <Layout className="w-3 h-3" /> Структура
                            </button>
                            <button 
                                onClick={() => handleTabSwitch('script')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${
                                    activeTab === 'script' 
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <FileVideo className="w-3 h-3" /> Сценарій
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#0F0F0F]">
                        {activeTab === 'structure' ? (
                            <StructureView 
                                projects={currentProjects}
                                onGenerateAllScripts={(instr, model) => {
                                    currentProjects.forEach(p => onGenerateScript(p.id, instr, model));
                                    setActiveTab('script');
                                }}
                                onGenerateStructure={onGenerateStructure}
                                onBack={() => setSelectedTitle(null)}
                                onRefineProject={onRefineProject}
                            />
                        ) : (
                            renderScriptContent()
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#0F0F0F]">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <FolderOpen className="w-10 h-10 text-gray-600" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Оберіть проєкт</h3>
                    <p className="text-gray-500 max-w-sm">
                        Оберіть проєкт зі списку ліворуч, щоб переглянути структуру, згенерувати сценарій або експортувати дані.
                    </p>
                </div>
            )}
        </div>
    </div>
  );
};