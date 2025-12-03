import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Key, Lock, Check } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (openaiKey: string, geminiKey: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');

  useEffect(() => {
      if (typeof window !== 'undefined') {
          setOpenaiKey(localStorage.getItem('openai_api_key') || '');
          setGeminiKey(localStorage.getItem('gemini_api_key') || '');
      }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(openaiKey.trim(), geminiKey.trim());
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-sm flex items-center justify-center animate-fade-in-up p-4">
      <div className="bg-[#1a1a1a] border border-white/10 p-8 rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden">
        
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="text-center mb-6">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5 shadow-inner">
                <Lock className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Налаштування доступу</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
                Для коректної роботи всіх функцій (текст, картинки) потрібні API ключі.
            </p>
        </div>

        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <Key className="w-3 h-3" /> OpenAI API Key (ChatGPT)
                </label>
                <input 
                    type="password" 
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none transition-colors"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <Key className="w-3 h-3" /> Google Gemini API Key
                </label>
                <input 
                    type="password" 
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIza..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-colors"
                />
            </div>
            
            <p className="text-[10px] text-gray-500 text-center">
                Ключі зберігаються локально у вашому браузері.
            </p>

            <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={onClose} className="flex-1">Скасувати</Button>
                <Button onClick={handleSave} className="flex-1 bg-green-600 hover:bg-green-500 text-white" icon={<Check className="w-4 h-4" />}>Зберегти</Button>
            </div>
        </div>
      </div>
    </div>
  );
};