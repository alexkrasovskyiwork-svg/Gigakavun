
import React, { useState } from 'react';
import { NicheConfig, Project, StructureItem, ScriptPart } from '../types';
import { Button } from './Button';
import { X, Zap, Layout, FileVideo, AlertTriangle, Check, Layers, AlignLeft } from 'lucide-react';

interface TransportProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (project: Project) => void;
  onCreateEmpty: () => void; // Callback for "Create Empty Project" fallback
  nicheOptions: NicheConfig[];
}

export const TransportProjectModal: React.FC<TransportProjectModalProps> = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    onCreateEmpty,
    nicheOptions 
}) => {
  const [step, setStep] = useState<'input' | 'error'>('input');
  
  // Form State
  const [title, setTitle] = useState('');
  const [niche, setNiche] = useState('Інше');
  const [nicheId, setNicheId] = useState('generic');
  
  const [structureText, setStructureText] = useState('');
  
  // Script State
  const [scriptMode, setScriptMode] = useState<'whole' | 'parts'>('whole');
  const [wholeScriptText, setWholeScriptText] = useState('');
  const [partsCount, setPartsCount] = useState(1);
  const [scriptPartsText, setScriptPartsText] = useState<string[]>(['']);
  
  // Navigation State for Parts
  const [activePartIndex, setActivePartIndex] = useState(0);

  if (!isOpen) return null;

  const handleNicheChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      const selected = nicheOptions.find(n => n.name === val);
      let nid = 'generic';
      if (selected) nid = selected.id;
      if (val.toLowerCase().includes('war')) nid = 'war';
      
      setNiche(val);
      setNicheId(nid);
  };

  const handlePartsCountChange = (count: number) => {
      const newCount = Math.max(1, Math.min(20, count));
      setPartsCount(newCount);
      
      // Adjust array size
      setScriptPartsText(prev => {
          const newArr = [...prev];
          if (newCount > prev.length) {
              for (let i = prev.length; i < newCount; i++) newArr.push('');
          } else {
              newArr.splice(newCount);
          }
          return newArr;
      });

      // Adjust active index if it exceeds new count
      if (activePartIndex >= newCount) {
          setActivePartIndex(Math.max(0, newCount - 1));
      }
  };

  const updatePartText = (index: number, text: string) => {
      const newArr = [...scriptPartsText];
      newArr[index] = text;
      setScriptPartsText(newArr);
  };

  const handleSubmit = () => {
      // VALIDATION
      const hasStructure = structureText.trim().length > 0;
      const hasScript = scriptMode === 'whole' 
          ? wholeScriptText.trim().length > 0 
          : scriptPartsText.some(t => t.trim().length > 0);

      if (!hasStructure && !hasScript) {
          setStep('error');
          return;
      }

      if (!title.trim()) {
          alert("Будь ласка, введіть назву проєкту");
          return;
      }

      // BUILD PROJECT
      const projectId = Date.now();
      
      // Structure Construction
      const structure: StructureItem[] = [];
      if (hasStructure) {
          structure.push({
              title: "Imported Structure",
              titleUa: "Імпортована структура",
              description: structureText,
              descriptionUa: structureText,
              estimatedDuration: "N/A"
          });
      }

      // Script Construction
      const scriptParts: ScriptPart[] = [];
      if (hasScript) {
          if (scriptMode === 'whole') {
              scriptParts.push({
                  id: `manual-part-${projectId}-0`,
                  sectionTitle: "Full Script",
                  contentEn: wholeScriptText,
                  contentUa: wholeScriptText,
                  isGenerating: false
              });
          } else {
              scriptPartsText.forEach((text, idx) => {
                  scriptParts.push({
                      id: `manual-part-${projectId}-${idx}`,
                      sectionTitle: `Part ${idx + 1}`,
                      contentEn: text,
                      contentUa: text,
                      isGenerating: false
                  });
              });
          }
      }

      const newProject: Project = {
          id: projectId,
          batchId: `transport-${projectId}`,
          config: {
              title: title,
              niche: niche,
              nicheId: nicheId,
              durationMinutes: 10,
              structureVariants: 1,
              scriptVariants: 1,
              releaseDate: ''
          },
          structure: structure,
          scriptParts: scriptParts,
          isStructureLoading: false,
          isScriptGenerating: false,
          isCompleted: false,
          filename: title.replace(/[^a-z0-9а-яіїєґ ]/gi, '_').trim().substring(0, 50),
          generatedImages: []
      };

      onSubmit(newProject);
      handleClose();
  };

  const handleClose = () => {
      // Reset state
      setStep('input');
      setTitle('');
      setStructureText('');
      setWholeScriptText('');
      setScriptPartsText(['']);
      setPartsCount(1);
      setActivePartIndex(0);
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center animate-fade-in-up p-4">
        
        {step === 'error' ? (
            <div className="bg-[#1a1a1a] border border-white/10 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center animate-fade-in-up">
                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Зайчику, введи текст структури або сценарію</h3>
                <p className="text-gray-400 text-sm mb-6">Проєкт не може бути пустим при транспортуванні.</p>
                
                <div className="space-y-3">
                    <Button 
                        onClick={() => setStep('input')} 
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white"
                    >
                        Спробувати ще
                    </Button>
                    <Button 
                        variant="secondary"
                        onClick={() => { handleClose(); onCreateEmpty(); }}
                        className="w-full"
                    >
                        Створити порожній проєкт
                    </Button>
                </div>
            </div>
        ) : (
            <div className="bg-[#0F0F0F] border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#151515]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-xl">
                            <Zap className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Транспортувати проєкт</h2>
                            <p className="text-gray-400 text-xs">Ручний імпорт даних</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                    
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Назва Проєкту *</label>
                            <input 
                                type="text" 
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Введіть назву..."
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Ніша / Стиль</label>
                            <select 
                                value={niche}
                                onChange={handleNicheChange}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none appearance-none cursor-pointer"
                            >
                                {nicheOptions.map(n => (
                                    <option key={n.id} value={n.name}>{n.name}</option>
                                ))}
                                <option value="Інше">Інше</option>
                            </select>
                        </div>
                    </div>

                    {/* Structure Input (First) */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1 flex items-center gap-2">
                            <Layout className="w-4 h-4" /> Текст Структури
                        </label>
                        <textarea 
                            value={structureText}
                            onChange={(e) => setStructureText(e.target.value)}
                            placeholder="Вставте опис структури сюди..."
                            className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-gray-300 focus:border-purple-500 outline-none resize-none h-32"
                        />
                    </div>

                    {/* Script Input (Second) */}
                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1 flex items-center gap-2">
                                <FileVideo className="w-4 h-4" /> Текст Сценарію
                            </label>
                            
                            <div className="flex bg-black/30 p-1 rounded-lg border border-white/10 self-start sm:self-auto">
                                <button 
                                    onClick={() => setScriptMode('whole')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${scriptMode === 'whole' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <AlignLeft className="w-3 h-3" /> Один текст
                                </button>
                                <button 
                                    onClick={() => setScriptMode('parts')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${scriptMode === 'parts' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <Layers className="w-3 h-3" /> По частинах
                                </button>
                            </div>
                        </div>

                        {scriptMode === 'whole' ? (
                            <textarea 
                                value={wholeScriptText}
                                onChange={(e) => setWholeScriptText(e.target.value)}
                                placeholder="Вставте весь сценарій сюди..."
                                className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-gray-300 focus:border-purple-500 outline-none resize-none h-48"
                            />
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-400">Кількість частин:</span>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="20"
                                        value={partsCount}
                                        onChange={(e) => handlePartsCountChange(parseInt(e.target.value))}
                                        className="w-16 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-center text-white focus:border-purple-500 outline-none"
                                    />
                                </div>
                                
                                <div className="flex flex-col gap-4">
                                    {/* Tabs */}
                                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-white/5">
                                        {scriptPartsText.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setActivePartIndex(idx)}
                                                className={`px-3 py-1.5 rounded-t-lg text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
                                                    activePartIndex === idx 
                                                    ? 'border-purple-500 text-white bg-white/5' 
                                                    : 'border-transparent text-gray-500 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                Частина {idx + 1}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Active Part Textarea */}
                                    <div className="animate-fade-in-up">
                                        <textarea 
                                            value={scriptPartsText[activePartIndex] || ''}
                                            onChange={(e) => updatePartText(activePartIndex, e.target.value)}
                                            placeholder={`Текст для Частини ${activePartIndex + 1}...`}
                                            className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-gray-300 focus:border-purple-500 outline-none resize-none h-64"
                                            autoFocus
                                        />
                                        <div className="text-right text-xs text-gray-500 mt-1">
                                            {scriptPartsText[activePartIndex]?.length || 0} символів
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-[#151515] flex justify-end">
                    <Button 
                        onClick={handleSubmit}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-8 h-12 text-base shadow-lg shadow-purple-900/30"
                        icon={<Check className="w-5 h-5" />}
                    >
                        Готово
                    </Button>
                </div>
            </div>
        )}
    </div>
  );
};
