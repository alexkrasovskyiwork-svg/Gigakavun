import React, { useState, useMemo } from 'react';
import { Project } from '../types';
import { Button } from './Button';
import { PlayCircle, RefreshCw, ChevronDown, ChevronUp, Edit3, Languages, ArrowLeft, Zap, Cpu } from 'lucide-react';
import { InstructionsModal } from './InstructionsModal';

interface StructureViewProps {
  projects: Project[];
  onGenerateAllScripts: (instructions?: string, model?: string) => void;
  onGenerateStructure: (id: number, instructions?: string, model?: string) => void;
  onBack: () => void;
  onRefineProject: (projectId: number, instructions: string) => void;
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

const MODEL_OPTIONS = [
    { id: 'gpt-4o', label: 'GPT-4o (Best)' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', label: 'GPT-3.5 (Fast)' }
];

export const StructureView: React.FC<StructureViewProps> = ({ 
  projects, 
  onGenerateAllScripts, 
  onGenerateStructure,
  onBack,
  onRefineProject
}) => {
  const structureGroups = useMemo(() => {
    const groups: Record<number, Project[]> = {};
    projects.forEach(p => {
        const { structIdx } = parseProjectTitle(p.config.title);
        const isVersioned = p.config.title.includes('[Ver');
        const key = isVersioned ? structIdx : p.id; // Fallback to ID if not versioned, but logically we group by structIdx for new flow
        
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
    });
    return groups;
  }, [projects]);

  const groupKeys = Object.keys(structureGroups).map(Number).sort((a, b) => a - b);

  const [expandedKeys, setExpandedKeys] = useState<number[]>(groupKeys.length <= 2 ? groupKeys : [groupKeys[0]]);
  const [refineInputs, setRefineInputs] = useState<{[key: number]: string}>({});
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o');
  
  // Instructions Modal State
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [modalAction, setModalAction] = useState<'scripts' | 'structure' | null>(null);
  const [selectedStructId, setSelectedStructId] = useState<number | null>(null);

  const toggleExpand = (key: number) => {
    setExpandedKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleRefineInput = (key: number, text: string) => {
    setRefineInputs(prev => ({...prev, [key]: text}));
  };

  const submitRefine = (key: number, projectId: number) => {
    const text = refineInputs[key];
    if (text && text.trim()) {
      onRefineProject(projectId, text);
      setRefineInputs(prev => ({...prev, [key]: ''}));
    }
  };

  const handleStartScriptGen = () => {
      setModalAction('scripts');
      setShowInstructionsModal(true);
  };

  const handleStartStructGen = (projectId: number) => {
      setSelectedStructId(projectId);
      setModalAction('structure');
      setShowInstructionsModal(true);
  };

  const handleInstructionsConfirm = (instructions: string) => {
      if (modalAction === 'scripts') {
          onGenerateAllScripts(instructions, selectedModel);
      } else if (modalAction === 'structure' && selectedStructId) {
          onGenerateStructure(selectedStructId, instructions, selectedModel);
      }
      setShowInstructionsModal(false);
      setModalAction(null);
      setSelectedStructId(null);
  };

  const isAnyUpdating = projects.some(p => p.isStructureLoading);
  const totalParts = projects.reduce((acc, p) => acc + (p.structure.length || 0), 0);
  const estimatedScriptCost = (totalParts * 0.02).toFixed(2);

  return (
    <div className="w-full h-full animate-fade-in-up">
      <InstructionsModal 
          isOpen={showInstructionsModal}
          onClose={() => setShowInstructionsModal(false)}
          onConfirm={handleInstructionsConfirm}
          title={modalAction === 'scripts' ? "Зайчику, є побажання до сценаріїв?" : "Зайчику, є побажання до структури?"}
          description="Ти можеш надати додаткові вказівки для ШІ перед генерацією."
          confirmLabel="Почати генерацію"
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Згенеровані Структури</h2>
          <p className="text-yt-text text-sm mt-1">Всього {groupKeys.length} унікальних структур (варіантів: {projects.length}). Перевірте та відредагуйте.</p>
        </div>
        
        <div className="flex items-center bg-black/40 rounded-lg p-1 border border-white/10 self-end md:self-auto">
          <button onClick={() => setShowTranslation(false)} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${!showTranslation ? 'bg-yt-red text-white' : 'text-gray-400 hover:text-white'}`}>ENG</button>
          <button onClick={() => setShowTranslation(true)} className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${showTranslation ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>UA <Languages className="w-3 h-3" /></button>
        </div>
      </div>

      <div className="space-y-6 mb-10">
        {groupKeys.map((structKey, index) => {
          const groupProjects = structureGroups[structKey];
          const mainProject = groupProjects[0]; 
          
          const isExpanded = expandedKeys.includes(structKey);
          const isUpdating = mainProject.isStructureLoading;
          const isDraft = !isUpdating && mainProject.structure.length === 0;
          
          const { baseTitle, structIdx } = parseProjectTitle(mainProject.config.title);
          const isVersioned = mainProject.config.title.includes('[Ver');
          
          const displayTitle = isVersioned ? `${baseTitle} [Структура ${structIdx}]` : mainProject.config.title;

          return (
            <div key={structKey} className="bg-yt-gray border border-white/10 rounded-2xl overflow-hidden shadow-lg transition-all duration-300">
              <div className="bg-black/30 p-4 flex items-center justify-between cursor-pointer hover:bg-black/40 transition-colors" onClick={() => toggleExpand(structKey)}>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center font-bold text-sm text-gray-300">{index + 1}</div>
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                         {displayTitle}
                         <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-gray-400 font-normal">{groupProjects.length} варіантів</span>
                    </h3>
                    <p className="text-gray-500 text-xs">{isDraft ? 'Чернетка' : `${mainProject.structure.length} частин`}</p>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
              </div>

              {isExpanded && (
                <div className="p-6 border-t border-white/5 bg-black/10">
                    {isUpdating ? (
                        <div className="py-12 text-center">
                             <RefreshCw className="w-8 h-8 text-yt-red animate-spin mx-auto mb-3" />
                             <p className="text-gray-400">Оновлюємо структуру...</p>
                        </div>
                    ) : isDraft ? (
                        <div className="py-8 text-center flex flex-col items-center">
                            <p className="text-gray-400 mb-4 text-sm max-w-md">Цей проєкт створено як чернетку. Структуру ще не згенеровано.</p>
                            <div className="flex flex-col gap-2 items-center">
                                {/* Model Selector for Single Structure */}
                                <div className="flex items-center gap-2 bg-black/30 p-1 rounded-lg border border-white/10 mb-2">
                                    <Cpu className="w-4 h-4 text-gray-500 ml-2" />
                                    <select 
                                        value={selectedModel} 
                                        onChange={(e) => setSelectedModel(e.target.value)} 
                                        onClick={(e) => e.stopPropagation()}
                                        className="bg-transparent text-xs text-gray-300 font-medium outline-none py-1 pr-2 cursor-pointer hover:text-white"
                                    >
                                        {MODEL_OPTIONS.map(opt => <option key={opt.id} value={opt.id} className="bg-gray-900 text-gray-300">{opt.label}</option>)}
                                    </select>
                                </div>
                                <Button 
                                    onClick={(e) => { e.stopPropagation(); handleStartStructGen(mainProject.id); }}
                                    className="bg-purple-600 hover:bg-purple-700 flex flex-col items-center leading-tight py-2 px-6 gap-0.5"
                                >
                                    <div className="flex items-center gap-2"><Zap className="w-4 h-4" /><span>Згенерувати структуру</span></div>
                                    <span className="text-[10px] opacity-70 mt-0.5 font-normal">~$0.001</span>
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3 mb-6">
                                {mainProject.structure.map((item, i) => {
                                    const titleToShow = showTranslation ? (item.titleUa || item.title) : item.title;
                                    const descToShow = showTranslation ? (item.descriptionUa || item.description) : item.description;
                                    return (
                                        <div key={i} className="bg-black/20 p-4 rounded-xl border border-white/5 flex gap-3 hover:border-white/10 transition-colors">
                                            <span className="text-yt-red font-bold text-sm mt-0.5">{i + 1}.</span>
                                            <div className="flex-1">
                                                <div className="flex justify-between mb-1">
                                                    <h4 className="font-medium text-white text-sm">{titleToShow}</h4>
                                                    <span className="text-xs text-gray-500 font-mono bg-black/40 px-2 rounded">{item.estimatedDuration}</span>
                                                </div>
                                                <p className="text-gray-400 text-xs leading-relaxed">{descToShow}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex gap-3 bg-white/5 p-3 rounded-xl border border-white/5 items-start">
                                <Edit3 className="w-5 h-5 text-gray-500 mt-2 ml-1" />
                                <textarea value={refineInputs[structKey] || ''} onChange={(e) => handleRefineInput(structKey, e.target.value)} placeholder={`Змінити структуру...`} className="flex-grow bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 outline-none text-sm resize-none mt-1" rows={2} />
                                <Button onClick={(e) => { e.stopPropagation(); submitRefine(structKey, mainProject.id); }} disabled={!refineInputs[structKey]?.trim()} variant="secondary" className="self-center text-xs px-3 py-2 h-auto">Оновити</Button>
                            </div>
                        </>
                    )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col-reverse md:flex-row justify-between items-center gap-4 pt-6 border-t border-white/10 mt-8">
        <div>
             {/* Global Model Selector for Scripts */}
             <div className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/10">
                <Cpu className="w-4 h-4 text-purple-400 ml-1" />
                <span className="text-xs font-bold text-gray-500 uppercase mr-1">Модель:</span>
                <select 
                    value={selectedModel} 
                    onChange={(e) => setSelectedModel(e.target.value)} 
                    className="bg-transparent text-sm text-white font-medium outline-none cursor-pointer hover:text-purple-400 transition-colors"
                >
                    {MODEL_OPTIONS.map(opt => <option key={opt.id} value={opt.id} className="bg-gray-900 text-gray-300">{opt.label}</option>)}
                </select>
            </div>
        </div>
        <Button 
            onClick={handleStartScriptGen} 
            disabled={isAnyUpdating}
            className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white border-none shadow-lg shadow-green-900/20 py-3 text-base px-8 flex flex-col items-center leading-tight gap-0.5"
        >
            <div className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5" />
                <span>{projects.length === 1 ? 'Перейти до написання сценарію' : 'Перейти до написання сценаріїв'}</span>
            </div>
            {totalParts > 0 && <span className="text-[10px] opacity-70 mt-0.5 font-normal">~${estimatedScriptCost} (за все)</span>}
        </Button>
      </div>
    </div>
  );
};