import React, { useState } from 'react';
import { Button } from './Button';
import { X, Download, FileText, Type } from 'lucide-react';

interface DownloadOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (filename: string) => void;
  defaultName: string;
}

export const DownloadOptionsModal: React.FC<DownloadOptionsModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  defaultName
}) => {
  const [option, setOption] = useState<'default' | 'custom'>('default');
  const [customName, setCustomName] = useState(defaultName);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const finalName = option === 'default' ? defaultName : customName;
    onConfirm(finalName);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in-up p-4">
      <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-2xl shadow-2xl max-w-md w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-purple-400" /> Завантаження сценарію
        </h3>

        <div className="space-y-3 mb-6">
            <button 
                onClick={() => setOption('default')}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${option === 'default' ? 'bg-purple-900/20 border-purple-500 text-white' : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/30'}`}
            >
                <FileText className="w-5 h-5" />
                <div>
                    <div className="text-sm font-bold">Використати назву проєкту</div>
                    <div className="text-xs opacity-70 truncate max-w-[250px]">{defaultName}.txt</div>
                </div>
            </button>

            <button 
                onClick={() => setOption('custom')}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${option === 'custom' ? 'bg-purple-900/20 border-purple-500 text-white' : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/30'}`}
            >
                <Type className="w-5 h-5" />
                <div className="flex-1">
                    <div className="text-sm font-bold mb-1">Власна назва</div>
                    {option === 'custom' && (
                        <input 
                            type="text" 
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            className="w-full bg-black/50 border border-white/20 rounded px-2 py-1 text-sm text-white focus:border-purple-500 outline-none"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                </div>
            </button>
        </div>

        <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Скасувати</Button>
            <Button onClick={handleConfirm} className="bg-purple-600 hover:bg-purple-700 text-white">Завантажити</Button>
        </div>
      </div>
    </div>
  );
};