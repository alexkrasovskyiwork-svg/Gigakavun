import React, { useState } from 'react';
import { ScriptPart } from '../types';
import { Copy, Check, Loader, Languages } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ScriptSectionCardProps {
  part: ScriptPart;
  index: number;
}

export const ScriptSectionCard: React.FC<ScriptSectionCardProps> = ({ part, index }) => {
  const [copied, setCopied] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const contentToShow = showTranslation ? part.contentUa : part.contentEn;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(contentToShow);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  if (part.isGenerating) {
    return (
      <div className="w-full bg-yt-gray/50 border border-yt-red/20 rounded-2xl p-8 animate-pulse flex flex-col items-center justify-center min-h-[300px]">
        <Loader className="w-10 h-10 text-yt-red animate-spin mb-4" />
        <h3 className="text-xl font-semibold text-white">Пишемо частину {index + 1}...</h3>
        <p className="text-gray-400 mt-2 text-center max-w-md">
          ШІ генерує сценарій англійською та перекладає українською (~3000 символів) для розділу "{part.sectionTitle}".
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-yt-gray border border-white/10 rounded-2xl overflow-hidden shadow-lg mb-8">
      <div className="bg-black/30 px-6 py-4 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center sticky top-0 z-10 backdrop-blur-md gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-8 h-8 rounded-lg bg-yt-red/20 text-yt-red flex items-center justify-center font-bold text-sm shrink-0">
            #{index + 1}
          </div>
          <h3 className="font-bold text-white text-lg truncate max-w-[200px] md:max-w-md">
            {part.sectionTitle}
          </h3>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center bg-black/40 rounded-lg p-1 border border-white/10 mr-2">
              <button 
                onClick={() => setShowTranslation(false)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${!showTranslation ? 'bg-yt-red text-white' : 'text-gray-400 hover:text-white'}`}
              >
                ENG
              </button>
              <button 
                onClick={() => setShowTranslation(true)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1 ${showTranslation ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                UA <Languages className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 font-mono hidden md:block">
                    {contentToShow?.length || 0} символів
                </span>
                <button
                onClick={handleCopy}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    copied 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                }`}
                >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline">{copied ? 'Скопійовано' : 'Копіювати'}</span>
                </button>
            </div>
        </div>
      </div>
      
      <div className="p-6 md:p-8 prose prose-invert prose-headings:text-white prose-p:text-gray-300 max-w-none leading-relaxed">
        <ReactMarkdown>{contentToShow || ''}</ReactMarkdown>
      </div>
    </div>
  );
};