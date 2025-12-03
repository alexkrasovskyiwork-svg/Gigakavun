
import React, { useState } from 'react';
import { Button } from './Button';
import { Settings2, X, Check, ArrowRight } from 'lucide-react';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (instructions: string) => void;
  title: string;
  description: string;
  placeholder?: string;
  confirmLabel?: string;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  placeholder = "Наприклад: зроби акцент на...",
  confirmLabel = "Почати генерацію"
}) => {
  const [text, setText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    onConfirm(text);
    setText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in-up p-4">
      <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-2xl shadow-2xl max-w-lg w-full relative">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
            <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-500/10 rounded-full flex items-center justify-center">
                <Settings2 className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>

        <p className="text-gray-400 text-sm mb-4">{description}</p>

        <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-purple-500 outline-none resize-none h-32 mb-6"
            autoFocus
        />

        <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => onConfirm('')} className="text-sm">
                Пропустити (Без вказівок)
            </Button>
            <Button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700 text-white text-sm">
                {confirmLabel} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
        </div>
      </div>
    </div>
  );
};
