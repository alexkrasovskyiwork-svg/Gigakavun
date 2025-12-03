import React, { useState, useEffect } from 'react';
import { VideoConfig, NicheConfig } from '../types';
import { Button } from './Button';
import { Sparkles, Layers, Plus, Minus, Target, X, AlertTriangle, Calendar, FilePlus, Play, ArrowLeft, Cpu } from 'lucide-react';
import { InstructionsModal } from './InstructionsModal';

interface SetupFormProps {
  onSubmit: (configs: VideoConfig[], startGeneration: boolean, instructions?: string, model?: string) => void;
  onCancel: () => void;
  isLoading: boolean;
  nicheOptions: NicheConfig[];
}

interface ValidationError {
  [key: number]: {
    niche?: boolean;
    duration?: boolean;
    structures?: boolean;
    scripts?: boolean;
  }
}

const DEFAULT_CONFIG: VideoConfig = {
  title: '',
  niche: '', 
  nicheId: '',
  durationMinutes: 8,
  structureVariants: 1,
  scriptVariants: 1,
  releaseDate: ''
};

const MODEL_OPTIONS = [
    { id: 'gpt-4o', label: 'GPT-4o (Best)' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', label: 'GPT-3.5 (Fast)' }
];

export const SetupForm: React.FC<SetupFormProps> = ({ onSubmit, onCancel, isLoading, nicheOptions }) => {
  const [quantity, setQuantity] = useState(1);
  const [errors, setErrors] = useState<ValidationError>({});
  
  const [deleteConfirmationIndex, setDeleteConfirmationIndex] = useState<number | null>(null);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o');

  const [configs, setConfigs] = useState<VideoConfig[]>(
    Array(10).fill({ ...DEFAULT_CONFIG })
  );

  const isDirty = (index: number) => {
      const c = configs[index];
      return c.title.trim() !== '' || 
             c.niche !== '' || 
             c.durationMinutes !== 8 ||
             c.structureVariants !== 1 ||
             c.scriptVariants !== 1 ||
             c.releaseDate !== '';
  };

  const handleDecreaseQuantity = () => {
    if (quantity <= 1) return;
    const indexToRemove = quantity - 1;
    if (isDirty(indexToRemove)) {
        setDeleteConfirmationIndex(indexToRemove);
    } else {
        performDelete(indexToRemove);
    }
  };

  const updateConfig = (index: number, field: keyof VideoConfig, value: string | number) => {
    const newConfigs = [...configs];
    newConfigs[index] = { ...newConfigs[index], [field]: value };
    
    if (field === 'niche') {
        const selectedNiche = nicheOptions.find(n => n.name === value);
        if (selectedNiche) {
            let nId = selectedNiche.id;
            const nicheNameLower = String(value).toLowerCase();
            if (nicheNameLower.includes('war')) nId = 'war';
            else if (nicheNameLower.includes('slavery')) nId = 'slavery';
            else if (nicheNameLower.includes('caprio')) nId = 'caprio';
            
            newConfigs[index].nicheId = nId;
            newConfigs[index].durationMinutes = Number(selectedNiche.defaultDuration);
            newConfigs[index].structureVariants = Number(selectedNiche.defaultStructureVariants);
            newConfigs[index].scriptVariants = Number(selectedNiche.defaultScriptVariants);
        }
    }

    setConfigs(newConfigs);
    
    if (errors[index]) {
      const newErrors = { ...errors };
      if (field === 'niche') delete newErrors[index].niche;
      if (field === 'durationMinutes') delete newErrors[index].duration;
      if (field === 'structureVariants') delete newErrors[index].structures;
      if (field === 'scriptVariants') delete newErrors[index].scripts;
      setErrors(newErrors);
    }
  };

  const handleDeleteRequest = (index: number) => {
    if (isDirty(index)) {
        setDeleteConfirmationIndex(index);
    } else {
        performDelete(index);
    }
  };

  const performDelete = (index: number) => {
    const newConfigs = configs.filter((_, i) => i !== index);
    newConfigs.push({ ...DEFAULT_CONFIG });
    setConfigs(newConfigs);
    if (quantity > 1) setQuantity(prev => prev - 1);
    setErrors({});
    setDeleteConfirmationIndex(null);
  };

  const validate = (activeConfigs: VideoConfig[]): boolean => {
    const newErrors: ValidationError = {};
    let isValid = true;

    activeConfigs.forEach((cfg, index) => {
      const itemErrors: { niche?: boolean; duration?: boolean; structures?: boolean; scripts?: boolean } = {};
      
      if (!cfg.niche || cfg.niche.trim() === '') {
          itemErrors.niche = true;
          isValid = false;
      }
      if (isNaN(cfg.durationMinutes) || cfg.durationMinutes <= 0) {
        itemErrors.duration = true;
        isValid = false;
      }
      if (isNaN(cfg.structureVariants) || !Number.isInteger(cfg.structureVariants) || cfg.structureVariants < 1) {
        itemErrors.structures = true;
        isValid = false;
      }
      if (isNaN(cfg.scriptVariants) || !Number.isInteger(cfg.scriptVariants) || cfg.scriptVariants < 1) {
        itemErrors.scripts = true;
        isValid = false;
      }

      if (Object.keys(itemErrors).length > 0) {
        newErrors[index] = itemErrors;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleAttemptSubmit = (e: React.FormEvent | React.MouseEvent, startGeneration: boolean) => {
    e.preventDefault();
    const activeConfigs = configs.slice(0, quantity);
    
    if (!activeConfigs.every(c => c.title.trim())) {
      alert("Будь ласка, заповніть назву для всіх обраних відео.");
      return;
    }

    if (validate(activeConfigs)) {
      if (startGeneration) {
          setShowInstructionsModal(true);
      } else {
          onSubmit(activeConfigs, false, undefined, selectedModel);
      }
    } else {
        alert("Будь ласка, виправте помилки у формах (підсвічені червоним).");
    }
  };

  const handleInstructionsConfirm = (instructions: string) => {
      const activeConfigs = configs.slice(0, quantity);
      onSubmit(activeConfigs, true, instructions, selectedModel);
      setShowInstructionsModal(false);
  };

  const totalGenerations = configs.slice(0, quantity).reduce((acc, curr) => {
    const s = Math.max(0, curr.structureVariants);
    const sc = Math.max(0, curr.scriptVariants);
    return acc + (s * sc);
  }, 0);

  const estimatedCost = (totalGenerations * 0.001).toFixed(3);

  return (
    <div className="w-full max-w-5xl mx-auto bg-yt-gray border border-white/10 rounded-2xl p-8 shadow-2xl relative animate-fade-in-up">
      
      <InstructionsModal 
          isOpen={showInstructionsModal}
          onClose={() => setShowInstructionsModal(false)}
          onConfirm={handleInstructionsConfirm}
          title="Зайчику, є побажання до структури?"
          description="Ти можеш надати додаткові вказівки для ШІ перед генерацією (напр., 'Зроби акцент на містиці', 'Почни з цитати')."
          confirmLabel="Почати генерацію"
      />

      {deleteConfirmationIndex !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl animate-fade-in-up">
            <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Сер, ви впевнені?</h3>
                <p className="text-gray-400 mb-6 text-sm">Ви внесли зміни в цю картку. Видалення незворотнє.</p>
                <div className="flex gap-3 justify-center">
                    <Button variant="secondary" onClick={() => setDeleteConfirmationIndex(null)} className="flex-1 whitespace-nowrap text-sm px-2">Ні, я передумав</Button>
                    <Button variant="primary" onClick={() => performDelete(deleteConfirmationIndex)} className="flex-1 bg-red-600 hover:bg-red-700 shadow-red-900/20 whitespace-nowrap text-sm px-2">Так</Button>
                </div>
            </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <button onClick={onCancel} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Назад</span>
        </button>
        <div className="text-right"><h2 className="text-2xl font-bold text-white">Створити новий проєкт</h2></div>
      </div>
      
      <div className="text-center mb-8"><p className="text-yt-text">Оберіть кількість проєктів та налаштуйте параметри генерації.</p></div>

      <form className="space-y-8">
        <div className="flex flex-col items-center gap-4 mb-8">
            <div className="flex items-center justify-center bg-black/20 p-4 rounded-xl border border-white/5 w-fit">
                <span className="mr-4 text-lg font-medium text-gray-300 flex items-center gap-2"><Layers className="w-5 h-5 text-yt-red" /> Кількість проєктів:</span>
                <div className="flex items-center gap-4">
                    <button type="button" onClick={handleDecreaseQuantity} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors disabled:opacity-30" disabled={quantity <= 1}><Minus className="w-5 h-5" /></button>
                    <span className="text-2xl font-bold w-8 text-center">{quantity}</span>
                    <button type="button" onClick={() => setQuantity(q => Math.min(10, q + 1))} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors disabled:opacity-30" disabled={quantity >= 10}><Plus className="w-5 h-5" /></button>
                </div>
            </div>

            {/* Model Selector */}
            <div className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/10">
                <Cpu className="w-4 h-4 text-purple-400 ml-1" />
                <span className="text-xs font-bold text-gray-500 uppercase mr-1">Модель ШІ:</span>
                <select 
                    value={selectedModel} 
                    onChange={(e) => setSelectedModel(e.target.value)} 
                    className="bg-transparent text-sm text-white font-medium outline-none cursor-pointer hover:text-purple-400 transition-colors"
                >
                    {MODEL_OPTIONS.map(opt => <option key={opt.id} value={opt.id} className="bg-gray-900 text-gray-300">{opt.label}</option>)}
                </select>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
            {Array.from({ length: quantity }).map((_, index) => {
                const config = configs[index];
                const totalItems = (config.structureVariants || 0) * (config.scriptVariants || 0);
                const hasError = errors[index];

                return (
                <div key={index} className="bg-black/30 border border-white/10 rounded-xl p-6 relative group hover:border-white/20 transition-all">
                    <div className="absolute -top-3 -left-3 w-8 h-8 bg-yt-red rounded-lg flex items-center justify-center font-bold text-white shadow-lg z-10">{index + 1}</div>
                    {quantity > 1 && (
                        <button type="button" onClick={() => handleDeleteRequest(index)} className="absolute -top-3 -right-3 w-8 h-8 bg-yt-gray border border-white/20 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-900/50 hover:border-red-500 transition-all shadow-lg z-10" title="Видалити"><X className="w-4 h-4" /></button>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
                        <div className="md:col-span-5 space-y-2">
                            <label className="text-xs font-medium text-gray-400 ml-1">Назва відео</label>
                            <input type="text" value={config.title} onChange={(e) => updateConfig(index, 'title', e.target.value)} placeholder="напр., Загадка..." className="w-full bg-yt-gray border border-white/10 rounded-lg px-3 py-2 text-white focus:border-yt-red outline-none transition-colors" required />
                        </div>
                        <div className="md:col-span-3 space-y-2">
                            <label className="text-xs font-medium text-gray-400 ml-1">Ніша / Стиль</label>
                            <div className="relative">
                                <select value={config.niche} onChange={(e) => updateConfig(index, 'niche', e.target.value)} className={`w-full bg-yt-gray border rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none appearance-none cursor-pointer ${hasError?.niche ? 'border-red-500 bg-red-900/10' : 'border-white/10'}`}>
                                    <option value="" disabled className="text-gray-500">Оберіть нішу...</option>
                                    {nicheOptions.map(opt => (<option key={opt.id} value={opt.name}>{opt.name}</option>))}
                                </select>
                                <div className="absolute right-3 top-2.5 pointer-events-none"><Target className="w-4 h-4 text-gray-400" /></div>
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-2 relative">
                             {hasError?.duration && config.durationMinutes <= 0 && (<div className="absolute -top-5 left-1 text-[10px] text-purple-400 font-bold animate-pulse whitespace-nowrap">Подумай ще</div>)}
                            <label className="text-xs font-medium text-gray-400 ml-1">Тривалість(хв)</label>
                            <div className="relative">
                                <input type="number" step="0.1" value={config.durationMinutes} onChange={(e) => updateConfig(index, 'durationMinutes', parseFloat(e.target.value))} className={`w-full bg-yt-gray border rounded-lg px-3 py-2 text-white outline-none focus:border-green-500 ${hasError?.duration ? 'border-red-500 focus:border-red-500 bg-red-900/10' : 'border-white/10'}`} />
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-medium text-gray-400 ml-1">Дата (опц.)</label>
                            <div className="relative">
                                <input type="date" value={config.releaseDate || ''} onChange={(e) => updateConfig(index, 'releaseDate', e.target.value)} className="w-full bg-yt-gray border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:border-orange-500 outline-none appearance-none" />
                                <div className="absolute right-2 top-2.5 pointer-events-none text-gray-500"><Calendar className="w-3 h-3" /></div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/5">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-400 ml-1 flex justify-between">Кількість структур {hasError?.structures && <span className="text-purple-400 text-[10px]">Зроби інакше</span>}</label>
                            <input type="number" min="1" step="1" value={config.structureVariants} onChange={(e) => updateConfig(index, 'structureVariants', parseFloat(e.target.value))} className={`w-full bg-yt-gray border rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 ${hasError?.structures ? 'border-red-500 focus:border-red-500 bg-red-900/10' : 'border-white/10'}`} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-400 ml-1 flex justify-between">Кількість сценаріїв {hasError?.scripts && <span className="text-purple-400 text-[10px]">Так не піде</span>}</label>
                            <input type="number" min="1" step="1" value={config.scriptVariants} onChange={(e) => updateConfig(index, 'scriptVariants', parseFloat(e.target.value))} className={`w-full bg-yt-gray border rounded-lg px-3 py-2 text-white outline-none focus:border-purple-500 ${hasError?.scripts ? 'border-red-500 focus:border-red-500 bg-red-900/10' : 'border-white/10'}`} />
                        </div>
                        <div className="space-y-2">
                             <label className="text-xs font-medium text-gray-500 ml-1">Всього відео</label>
                             <div className={`w-full h-[42px] flex items-center justify-center font-mono text-lg font-bold rounded-lg border border-white/10 ${hasError ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-gray-300'}`}>{isNaN(totalItems) ? '-' : totalItems}</div>
                        </div>
                    </div>
                </div>
                );
            })}
        </div>

        <div className="pt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button type="button" onClick={(e) => handleAttemptSubmit(e, false)} variant="secondary" isLoading={isLoading} className="w-full text-base h-14 bg-gray-700 hover:bg-gray-600 border-none text-white shadow-none" icon={<FilePlus className="w-5 h-5" />}>Створити (Чернетка)</Button>
          <Button type="button" onClick={(e) => handleAttemptSubmit(e, true)} isLoading={isLoading} className="w-full text-lg h-14 flex flex-col items-center justify-center leading-tight gap-0.5">
             <div className="flex items-center gap-2"><Play className="w-5 h-5 fill-current" /><span>Почати генерацію ({totalGenerations})</span></div>
             <span className="block text-[10px] opacity-60 font-normal mt-0.5">~${estimatedCost}</span>
          </Button>
        </div>
      </form>
    </div>
  );
};