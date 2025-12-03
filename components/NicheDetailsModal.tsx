import React, { useState, useEffect, useRef } from 'react';
import { NicheConfig, PromptVersion } from '../types';
import { X, FileText, List, AlignLeft, Hash, Save, RotateCcw, Clock, Check, History, Sparkles, Loader2, ArrowRight, Info, Edit3 } from 'lucide-react';
import { Button } from './Button';
import { refinePromptWithAI } from '../services/geminiService';

interface NicheDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  niche: NicheConfig | null;
  onSave?: (updatedNiche: NicheConfig) => void;
}

export const NicheDetailsModal: React.FC<NicheDetailsModalProps> = ({ isOpen, onClose, niche, onSave }) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'info' | 'data'>('editor');
  const [structureText, setStructureText] = useState('');
  const [scriptText, setScriptText] = useState('');
  const [workflowText, setWorkflowText] = useState('');
  const [history, setHistory] = useState<PromptVersion[]>([]);
  
  // AI Refinement State
  const [structureInstruction, setStructureInstruction] = useState('');
  const [scriptInstruction, setScriptInstruction] = useState('');
  const [isRefiningStructure, setIsRefiningStructure] = useState(false);
  const [isRefiningScript, setIsRefiningScript] = useState(false);
  
  // Track context for history (e.g. "AI Update: 'Make it funny'")
  const [changeReason, setChangeReason] = useState<string | null>(null);

  useEffect(() => {
    if (niche) {
        setStructureText(niche.customStructurePrompt || '');
        setScriptText(niche.customScriptPrompt || '');
        setWorkflowText(niche.workflowDescription || '');
        setHistory(niche.promptHistory || []);
        setStructureInstruction('');
        setScriptInstruction('');
        setChangeReason(null);
    }
  }, [niche]);

  if (!isOpen || !niche) return null;

  const handleApply = () => {
      // 1. Check for changes
      const hasChanges = 
          structureText !== (niche.customStructurePrompt || '') || 
          scriptText !== (niche.customScriptPrompt || '') ||
          workflowText !== (niche.workflowDescription || '');
      
      let newHistory = [...history];
      if (hasChanges) {
          // SAVE THE PREVIOUS VERSION TO HISTORY (Undo logic)
          const noteText = changeReason 
            ? `Архів до: ${changeReason}` 
            : `Архів до ручних змін (${new Date().toLocaleTimeString()})`;

          const previousVersion: PromptVersion = {
              timestamp: Date.now(),
              structurePrompt: niche.customStructurePrompt || '', // Save what was there BEFORE
              scriptPrompt: niche.customScriptPrompt || '',       // Save what was there BEFORE
              note: noteText
          };
          newHistory = [previousVersion, ...newHistory];
      }

      // 2. Create updated niche object with NEW prompts
      const updatedNiche: NicheConfig = {
          ...niche,
          customStructurePrompt: structureText,
          customScriptPrompt: scriptText,
          workflowDescription: workflowText,
          promptHistory: newHistory
      };

      // 3. Call parent save
      if (onSave) {
          onSave(updatedNiche);
          setHistory(newHistory); // Update local history state immediately
          setChangeReason(null);  // Reset reason after save
      }
  };

  const restoreVersion = (version: PromptVersion) => {
      if (window.confirm("Відновити цю версію промтів? Поточні незбережені зміни будуть втрачені.")) {
          setStructureText(version.structurePrompt);
          setScriptText(version.scriptPrompt);
          setChangeReason(`Відновлення версії від ${new Date(version.timestamp).toLocaleTimeString()}`);
      }
  };

  const handleRefineStructure = async () => {
      if (!structureInstruction.trim()) return;
      setIsRefiningStructure(true);
      try {
          const refined = await refinePromptWithAI(structureText, structureInstruction);
          setStructureText(refined);
          setChangeReason(`AI Структура: "${structureInstruction.substring(0, 50)}${structureInstruction.length > 50 ? '...' : ''}"`);
          setStructureInstruction('');
      } catch (error) {
          alert('Не вдалося оновити промт за допомогою ШІ.');
      } finally {
          setIsRefiningStructure(false);
      }
  };

  const handleRefineScript = async () => {
      if (!scriptInstruction.trim()) return;
      setIsRefiningScript(true);
      try {
          const refined = await refinePromptWithAI(scriptText, scriptInstruction);
          setScriptText(refined);
          setChangeReason(`AI Сценарій: "${scriptInstruction.substring(0, 50)}${scriptInstruction.length > 50 ? '...' : ''}"`);
          setScriptInstruction('');
      } catch (error) {
           alert('Не вдалося оновити промт за допомогою ШІ.');
      } finally {
          setIsRefiningScript(false);
      }
  };

  const handleManualChange = (type: 'structure' | 'script', val: string) => {
      if (type === 'structure') setStructureText(val);
      else setScriptText(val);
      
      // If user types manually, reset the "AI Reason" so we don't mislabel the history
      if (changeReason && changeReason.includes('AI')) {
          setChangeReason(null); 
      }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in-up p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl max-w-[90vw] w-full relative flex flex-col h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#151515]">
            <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold text-white">Налаштування Ніші: {niche.name}</h3>
                <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                    <button onClick={() => setActiveTab('editor')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'editor' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                        <FileText className="w-3 h-3" /> Редактор Промтів
                    </button>
                    <button onClick={() => setActiveTab('info')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'info' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                        <Info className="w-3 h-3" /> Принцип роботи
                    </button>
                    <button onClick={() => setActiveTab('data')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'data' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
                        <Hash className="w-3 h-3" /> Дані Аналізу
                    </button>
                </div>
            </div>
            <button 
                onClick={onClose}
                className="text-gray-500 hover:text-white transition-colors p-2 bg-white/5 rounded-lg hover:bg-white/10"
            >
                <X className="w-5 h-5" />
            </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar (History) - Visible only in Editor mode */}
            {activeTab === 'editor' && (
                <div className="w-64 border-r border-white/5 bg-[#121212] flex flex-col hidden lg:flex">
                    <div className="p-4 border-b border-white/5 text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                        <History className="w-3 h-3" /> Історія Змін
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                        {history.length === 0 && (
                            <div className="text-center py-8 text-gray-600 text-xs italic">
                                Історія змін порожня
                            </div>
                        )}
                        {history.map((ver, idx) => (
                            <div key={idx} className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg p-3 group transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[10px] text-gray-400 font-mono">{new Date(ver.timestamp).toLocaleDateString()}</span>
                                    <span className="text-[10px] text-gray-400 font-mono">{new Date(ver.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                </div>
                                {ver.note && <div className="text-xs text-gray-300 mb-2 leading-snug">{ver.note}</div>}
                                <button 
                                    onClick={() => restoreVersion(ver)}
                                    className="w-full mt-1 bg-black/40 hover:bg-purple-600 text-gray-400 hover:text-white text-[10px] py-1.5 rounded transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <RotateCcw className="w-3 h-3" /> Відновити
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#1a1a1a]">
                
                {activeTab === 'editor' && (
                    <div className="space-y-6 h-full flex flex-col">
                        <div className="bg-yellow-900/10 border border-yellow-500/20 p-4 rounded-xl flex items-start gap-3">
                            <div className="p-2 bg-yellow-500/10 rounded-lg"><AlignLeft className="w-5 h-5 text-yellow-500" /></div>
                            <div>
                                <h4 className="text-sm font-bold text-yellow-500 mb-1">Редагування Системних Промтів</h4>
                                <p className="text-xs text-yellow-200/70 leading-relaxed">
                                    Тут ви можете змінити логіку генерації структури та сценаріїв для цієї ніші. 
                                    Використовуйте <strong>AI Асистента</strong> праворуч від редактора, щоб швидко вносити правки (наприклад: "Зроби тон більш агресивним").
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-[500px]">
                            {/* Structure Editor & Assistant */}
                            <div className="flex flex-col gap-2 h-full bg-[#121212] rounded-xl border border-white/5 overflow-hidden">
                                <div className="p-3 bg-black/30 border-b border-white/5 flex items-center justify-between">
                                     <label className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                                        <AlignLeft className="w-3 h-3" /> Промт Структури
                                    </label>
                                    <span className="text-[10px] text-gray-600 font-mono">{structureText.length} chars</span>
                                </div>
                                
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    <textarea 
                                        value={structureText}
                                        onChange={(e) => handleManualChange('structure', e.target.value)}
                                        className="flex-1 w-full bg-transparent p-4 text-xs font-mono text-gray-300 outline-none resize-none leading-relaxed border-none focus:ring-0 overflow-y-auto custom-scrollbar"
                                        placeholder="Введіть промт для генерації структури..."
                                        spellCheck={false}
                                    />
                                    {/* AI Assistant Panel */}
                                    <div className="p-3 bg-black/40 border-t border-white/5">
                                        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-purple-400">
                                            <Sparkles className="w-3 h-3" /> AI Асистент
                                        </div>
                                        <div className="flex gap-2 items-start">
                                            <textarea
                                                id="structure-instruction-textarea"
                                                value={structureInstruction}
                                                onChange={(e) => setStructureInstruction(e.target.value)}
                                                placeholder="Напиши що змінити (напр. 'Додай більше драми')..."
                                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-500 resize-none overflow-y-auto custom-scrollbar h-14"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                                        handleRefineStructure();
                                                    }
                                                }}
                                            />
                                            <Button 
                                                onClick={handleRefineStructure} 
                                                disabled={!structureInstruction || isRefiningStructure}
                                                isLoading={isRefiningStructure}
                                                className="h-8 py-1 px-3 text-xs bg-purple-600 hover:bg-purple-500 shrink-0 self-center"
                                            >
                                                <ArrowRight className="w-3 h-3" />
                                            </Button>
                                        </div>
                                        <div className="text-[10px] text-gray-500 mt-1 pl-1">Ctrl+Enter для відправки</div>
                                    </div>
                                </div>
                            </div>

                            {/* Script Editor & Assistant */}
                            <div className="flex flex-col gap-2 h-full bg-[#121212] rounded-xl border border-white/5 overflow-hidden">
                                <div className="p-3 bg-black/30 border-b border-white/5 flex items-center justify-between">
                                    <label className="text-xs font-bold text-green-400 uppercase tracking-wider flex items-center gap-2">
                                        <FileText className="w-3 h-3" /> Промт Сценарію
                                    </label>
                                    <span className="text-[10px] text-gray-600 font-mono">{scriptText.length} chars</span>
                                </div>

                                <div className="flex-1 flex flex-col overflow-hidden">
                                    <textarea 
                                        value={scriptText}
                                        onChange={(e) => handleManualChange('script', e.target.value)}
                                        className="flex-1 w-full bg-transparent p-4 text-xs font-mono text-gray-300 outline-none resize-none leading-relaxed border-none focus:ring-0 overflow-y-auto custom-scrollbar"
                                        placeholder="Введіть промт для генерації сценарію..."
                                        spellCheck={false}
                                    />
                                    {/* AI Assistant Panel */}
                                    <div className="p-3 bg-black/40 border-t border-white/5">
                                        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-purple-400">
                                            <Sparkles className="w-3 h-3" /> AI Асистент
                                        </div>
                                        <div className="flex gap-2 items-start">
                                            <textarea 
                                                id="script-instruction-textarea"
                                                value={scriptInstruction}
                                                onChange={(e) => setScriptInstruction(e.target.value)}
                                                placeholder="Напиши що змінити (напр. 'Спрости мову')..."
                                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-500 resize-none overflow-y-auto custom-scrollbar h-14"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                                        handleRefineScript();
                                                    }
                                                }}
                                            />
                                            <Button 
                                                onClick={handleRefineScript} 
                                                disabled={!scriptInstruction || isRefiningScript}
                                                isLoading={isRefiningScript}
                                                className="h-8 py-1 px-3 text-xs bg-purple-600 hover:bg-purple-500 shrink-0 self-center"
                                            >
                                                <ArrowRight className="w-3 h-3" />
                                            </Button>
                                        </div>
                                        <div className="text-[10px] text-gray-500 mt-1 pl-1">Ctrl+Enter для відправки</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'info' && (
                    <div className="space-y-6 animate-fade-in-up h-full flex flex-col">
                        <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg"><Info className="w-5 h-5 text-blue-500" /></div>
                            <div>
                                <h4 className="text-sm font-bold text-blue-500 mb-1">Принцип Роботи (Активний)</h4>
                                <p className="text-xs text-blue-200/70 leading-relaxed">
                                    <strong>Увага:</strong> Текст, який ви напишете тут, буде додано до правил генерації ШІ. 
                                    Ви можете описати логіку (напр. "Пиши кожну частину окремо", "Використовуй цитату на початку"). 
                                    ШІ проаналізує ці вказівки та адаптує свій стиль.
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 bg-[#121212] rounded-xl border border-white/5 flex flex-col overflow-hidden">
                             <div className="p-3 bg-black/30 border-b border-white/5 flex items-center justify-between">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <Edit3 className="w-3 h-3" /> Логіка та Правила
                                </label>
                            </div>
                            <textarea 
                                value={workflowText}
                                onChange={(e) => setWorkflowText(e.target.value)}
                                className="flex-1 w-full bg-transparent p-6 text-sm text-gray-300 outline-none resize-none leading-loose border-none focus:ring-0 overflow-y-auto custom-scrollbar"
                                placeholder="Опишіть логіку, яку має враховувати ШІ..."
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'data' && (
                    <div className="space-y-8 animate-fade-in-up">
                        {/* Analyzed Titles */}
                        {niche.analyzedTitles && niche.analyzedTitles.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-purple-400 font-bold uppercase text-xs tracking-wider">
                                    <List className="w-4 h-4" /> Проаналізовані назви
                                </div>
                                <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                                    <ul className="space-y-2">
                                        {niche.analyzedTitles.map((title, idx) => (
                                            <li key={idx} className="text-sm text-gray-300 flex gap-2">
                                                <span className="text-gray-600 font-mono text-xs pt-0.5">{idx + 1}.</span>
                                                {title}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Analyzed Keywords */}
                        {niche.analyzedKeywords && niche.analyzedKeywords.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-orange-400 font-bold uppercase text-xs tracking-wider">
                                    <Hash className="w-4 h-4" /> Ключові слова
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {niche.analyzedKeywords.map((kw, idx) => (
                                        <span key={idx} className="bg-white/5 text-gray-300 px-2 py-1 rounded text-xs border border-white/5">
                                            {kw}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl">
                            <p className="text-xs text-blue-200/70">Ці дані були зібрані під час первинного аналізу ніші і використовуються для контексту, але не редагуються напряму.</p>
                        </div>
                    </div>
                )}

            </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#151515] flex justify-between items-center">
            <div className="text-xs text-gray-500">
                {history.length > 0 ? `Останнє збереження: ${new Date(history[0].timestamp).toLocaleString()}` : 'Змін ще не було'}
            </div>
            <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose} className="text-sm h-10">
                    Закрити
                </Button>
                
                <Button onClick={handleApply} className="bg-green-600 hover:bg-green-700 text-white text-sm h-10 px-6 shadow-lg shadow-green-900/20" icon={<Save className="w-4 h-4" />}>
                    Застосувати Зміни
                </Button>
                
            </div>
        </div>

      </div>
    </div>
  );
};