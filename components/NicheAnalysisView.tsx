import React, { useState } from 'react';
import { BarChart, Link, ArrowRight, Youtube, Plus, Trash2, Search, Check, X, Loader2, PlayCircle, ExternalLink, Key } from 'lucide-react';
import { YouTubeVideoData, NicheConfig } from '../types';
import { fetchTranscript, searchSimilarVideos, extractVideoId, getVideoTitlesByIds } from '../services/transcriptService';
import { analyzeTitles, analyzeNicheContent, analyzeVisuals } from '../services/geminiService';

interface NicheAnalysisViewProps {
    onSaveNiche?: (niche: NicheConfig) => void;
}

export const NicheAnalysisView: React.FC<NicheAnalysisViewProps> = ({ onSaveNiche }) => {
  const [step, setStep] = useState<'initial' | 'input' | 'selection' | 'processing' | 'complete'>('initial');
  
  // Data State
  const [nicheName, setNicheName] = useState('');
  const [urls, setUrls] = useState<string[]>(['']);
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [analyzedKeywords, setAnalyzedKeywords] = useState<string[]>([]);
  const [analyzedTitles, setAnalyzedTitles] = useState<string[]>([]);
  const [foundVideos, setFoundVideos] = useState<YouTubeVideoData[]>([]);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  
  // Validation State
  const [nameError, setNameError] = useState(false);

  // Handlers
  const addUrlRow = () => setUrls([...urls, '']);
  const removeUrlRow = (idx: number) => setUrls(urls.filter((_, i) => i !== idx));
  const updateUrl = (idx: number, val: string) => {
      const newUrls = [...urls];
      newUrls[idx] = val;
      setUrls(newUrls);
  };

  const handleStartAnalysis = async () => {
      // Validate Name
      if (!nicheName.trim()) {
          setNameError(true);
          return;
      }
      
      // Validate URLs (at least one valid)
      const validUrls = urls.filter(u => u.trim());
      if (validUrls.length === 0) {
          alert("Введіть хоча б одне посилання на конкурента");
          return;
      }

      setStep('processing');
      setProgress(10);
      
      // 1. EXTRACT & FETCH TITLES FROM INPUT (Prioritize user examples)
      let titlesForAnalysis = [nicheName]; // Start with niche name
      let visualKeywords: string[] = [];
      const videoIds = validUrls.map(u => extractVideoId(u)).filter((id): id is string => !!id);

      if (youtubeApiKey && videoIds.length > 0) {
          setStatusText('Отримання даних про ваші відео...');
          const fetchedTitles = await getVideoTitlesByIds(videoIds, youtubeApiKey);
          if (fetchedTitles.length > 0) {
              titlesForAnalysis = [...fetchedTitles, nicheName]; // Prioritize fetched titles
          }
      }

      // 1.5 Analyze Visuals (Thumbnail/Title)
      if (titlesForAnalysis.length > 0) {
          setStatusText('Аналіз візуального стилю...');
          // Use the first valid video ID for thumbnail, otherwise just title
          const thumbId = videoIds.length > 0 ? videoIds[0] : undefined;
          const thumbUrl = thumbId ? `https://img.youtube.com/vi/${thumbId}/maxresdefault.jpg` : undefined;
          const mainTitle = titlesForAnalysis[0] === nicheName && titlesForAnalysis.length > 1 ? titlesForAnalysis[0] : titlesForAnalysis[0];
          
          visualKeywords = await analyzeVisuals(mainTitle, thumbUrl);
      }

      setAnalyzedTitles(titlesForAnalysis);

      setProgress(20);
      setStatusText('Аналіз ключових слів з прикладів...');
      
      const keywords = await analyzeTitles(titlesForAnalysis); 
      setAnalyzedKeywords([...keywords, ...visualKeywords]); // Combine text and visual keywords
      
      setProgress(30);
      setStatusText(youtubeApiKey ? 'Пошук релевантних відео (YouTube API)...' : 'Пошук схожих каналів (Демо режим)...');
      
      // Pass the API Key to the search service
      // We combine original keywords + visual keywords for a richer search
      const searchTerms = [...keywords];
      if (visualKeywords.length > 0) searchTerms.push(visualKeywords[0]); // Add primary visual tag

      const similar = await searchSimilarVideos(searchTerms.length > 0 ? searchTerms : titlesForAnalysis, youtubeApiKey);
      setFoundVideos(similar);

      setStep('selection');
  };

  const toggleSelection = (id: string, selection: 'yes' | 'no') => {
      setFoundVideos(prev => prev.map(v => v.id === id ? { ...v, selected: v.selected === selection ? null : selection } : v));
  };

  const handleDeepAnalysis = async () => {
      setStep('processing');
      setProgress(40);
      setStatusText('Отримання транскрипцій...');

      const validUserUrls = urls.filter(u => u.trim());
      const selectedVideoUrls = foundVideos.filter(v => v.selected === 'yes').map(v => v.url);
      const allUrls = [...validUserUrls, ...selectedVideoUrls];

      const transcripts: string[] = [];
      let doneCount = 0;

      for (const url of allUrls) {
          setStatusText(`Транскрибація відео ${doneCount + 1}/${allUrls.length}...`);
          const transcript = await fetchTranscript(url);
          if (transcript) {
              transcripts.push(transcript);
          }
          doneCount++;
          setProgress(40 + Math.floor((doneCount / allUrls.length) * 30)); // 40 -> 70%
      }

      if (transcripts.length === 0) {
          alert("Не вдалося отримати транскрипції. Перевірте посилання або спробуйте пізніше.");
          setStep('selection'); // Go back
          return;
      }

      setProgress(75);
      setStatusText('Аналіз структури та стилю...');
      
      const { structurePrompt, scriptPrompt } = await analyzeNicheContent(nicheName, transcripts);

      setProgress(90);
      setStatusText('Збереження результатів...');

      // Save Niche
      const newNiche: NicheConfig = {
          id: `analyzed-${Date.now()}`,
          name: nicheName,
          defaultDuration: 10, // Calculated average could go here
          defaultStructureVariants: 1,
          defaultScriptVariants: 1,
          customStructurePrompt: structurePrompt,
          customScriptPrompt: scriptPrompt,
          analyzedKeywords: analyzedKeywords,
          analyzedTitles: analyzedTitles
      };

      if (onSaveNiche) {
          onSaveNiche(newNiche);
      }

      setProgress(100);
      setStatusText('Готово!');
      setTimeout(() => setStep('complete'), 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in-up w-full max-w-5xl mx-auto pb-20">
      
      {/* INITIAL SCREEN */}
      {step === 'initial' && (
        <div className="text-center space-y-8">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                <BarChart className="w-10 h-10 text-gray-400" />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2">Аналіз Ніші</h2>
            <p className="text-gray-400 max-w-md mx-auto mb-8">
                Професійний аналіз конкурентів: структура, скрипти, ключові слова.
            </p>

            <button 
                onClick={() => setStep('input')}
                className="group relative px-8 py-4 bg-black/40 border border-white/10 rounded-2xl text-white font-bold text-lg overflow-hidden transition-all duration-500 hover:border-yt-red hover:shadow-[0_0_40px_-5px_rgba(255,0,0,0.5)] hover:scale-105"
            >
                <span className="relative z-10 flex items-center gap-3">
                    <Youtube className="w-6 h-6 text-gray-400 group-hover:text-yt-red transition-colors duration-500" />
                    Проаналізувати нішу
                    <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all duration-500" />
                </span>
                <div className="absolute inset-0 bg-yt-red/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </button>
        </div>
      )}

      {/* INPUT SCREEN */}
      {step === 'input' && (
        <div className="w-full max-w-2xl bg-yt-gray border border-white/10 rounded-3xl p-8 shadow-2xl animate-fade-in-up relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-yt-red/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

             <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Link className="w-6 h-6 text-yt-red" />
                Вхідні дані
             </h3>

             <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm text-gray-400 ml-1 font-bold">Назва Ніші</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={nicheName}
                            onChange={(e) => { setNicheName(e.target.value); setNameError(false); }}
                            placeholder="Наприклад: True Crime, Slavery Stories..."
                            className={`w-full bg-black/30 border rounded-xl px-4 py-3 text-white outline-none transition-all ${nameError ? 'border-red-500 ring-1 ring-red-500/50' : 'border-white/10 focus:border-yt-red'}`}
                        />
                        {nameError && (
                            <span className="absolute right-3 top-3.5 text-xs text-red-500 font-bold animate-pulse">
                                Ти забув за назву, зайчику
                            </span>
                        )}
                    </div>
                </div>

                {/* API Key Input */}
                <div className="space-y-2">
                    <label className="text-xs text-gray-500 ml-1 font-bold uppercase flex items-center gap-2">
                        <Key className="w-3 h-3" /> YouTube API Key (Опціонально)
                    </label>
                    <input 
                        type="password" 
                        value={youtubeApiKey}
                        onChange={(e) => setYoutubeApiKey(e.target.value)}
                        placeholder="Вставте ключ для РЕАЛЬНОГО пошуку..."
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                    />
                    <p className="text-[10px] text-gray-500 ml-1">
                        Без ключа пошук буде використовувати обмежену демо-базу. 
                        <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline ml-1">
                            Отримати ключ
                        </a>
                    </p>
                </div>

                <div className="space-y-3">
                    <label className="text-sm text-gray-400 ml-1 font-bold">Посилання на конкурентів</label>
                    {urls.map((url, idx) => (
                        <div key={idx} className="flex gap-2">
                            <div className="relative flex-1">
                                <input 
                                    type="text" 
                                    value={url}
                                    onChange={(e) => updateUrl(idx, e.target.value)}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-yt-red outline-none transition-all pl-12"
                                />
                                <div className="absolute left-4 top-3 text-gray-500"><Youtube className="w-5 h-5" /></div>
                            </div>
                            {urls.length > 1 && (
                                <button onClick={() => removeUrlRow(idx)} className="p-3 bg-white/5 rounded-xl hover:bg-red-900/20 text-gray-500 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    ))}
                    <button onClick={addUrlRow} className="text-xs flex items-center gap-1 text-gray-400 hover:text-white transition-colors ml-1">
                        <Plus className="w-3 h-3" /> Додати рядок
                    </button>
                </div>

                <div className="flex justify-end pt-2">
                    <button 
                        onClick={handleStartAnalysis}
                        className="px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-semibold transition-all duration-500 hover:bg-yt-red hover:border-yt-red hover:shadow-[0_0_30px_rgba(255,0,0,0.6)] active:scale-95"
                    >
                        Почати Аналіз
                    </button>
                </div>
             </div>
        </div>
      )}

      {/* PROCESSING SCREEN */}
      {step === 'processing' && (
          <div className="w-full max-w-xl text-center space-y-6 animate-fade-in-up">
              <div className="relative w-32 h-32 mx-auto">
                  <div className="absolute inset-0 border-4 border-white/10 rounded-full" />
                  <div className="absolute inset-0 border-4 border-yt-red rounded-full border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center font-bold text-2xl text-white">
                      {Math.round(progress)}%
                  </div>
              </div>
              <div>
                  <h3 className="text-xl font-bold text-white mb-2">{statusText}</h3>
                  <p className="text-gray-500 text-sm">ШІ аналізує контент, це може зайняти хвилину...</p>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-yt-red transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
          </div>
      )}

      {/* SELECTION SCREEN */}
      {step === 'selection' && (
          <div className="w-full animate-fade-in-up">
              <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Знайдені Відео</h2>
                    <p className="text-gray-400 text-sm">
                        {youtubeApiKey ? 'Результати реального пошуку YouTube (тільки горизонтальні, < 1 рік)' : 'Результати з демо-бази (Введіть API Key для реального пошуку)'}
                    </p>
                  </div>
                  <button 
                    onClick={handleDeepAnalysis}
                    disabled={foundVideos.filter(v => v.selected !== 'yes' && v.selected !== 'no').length > 0} 
                    className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                        foundVideos.filter(v => v.selected !== 'yes' && v.selected !== 'no').length > 0
                        ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-900/20 animate-pulse'
                    }`}
                  >
                      Продовжити <ArrowRight className="w-4 h-4" />
                  </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {foundVideos.map(video => (
                      <div 
                        key={video.id} 
                        className={`relative group rounded-2xl overflow-hidden bg-yt-gray border border-white/10 shadow-lg transform transition-all duration-500 hover:scale-105 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-0 hover:z-10`}
                      >
                          
                          {/* Content Layer (Blurred on hover) */}
                          <div className={`h-full flex flex-col transition-all duration-300 group-hover:blur-sm group-hover:opacity-40 pointer-events-none group-hover:pointer-events-none ${video.selected === 'yes' ? 'ring-2 ring-green-500' : video.selected === 'no' ? 'opacity-50 grayscale' : ''}`}>
                              <div className="aspect-video relative">
                                  <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                                  <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold text-white">
                                      {video.date}
                                  </div>
                              </div>
                              <div className="p-4 flex-1">
                                  <h4 className="font-bold text-white text-sm line-clamp-2 mb-2">{video.title}</h4>
                                  <div className="flex justify-between items-center text-xs text-gray-400">
                                      <span>{video.channelName}</span>
                                      <span className="flex items-center gap-1"><Youtube className="w-3 h-3" /> {video.views}</span>
                                  </div>
                                  
                                  {/* Spacer for button position */}
                                  <div className="h-10 mt-3"></div>
                              </div>
                          </div>

                          {/* Watch Button Layer (NOT BLURRED, TOP Z-INDEX) */}
                          <div className="absolute bottom-4 left-4 right-4 z-50 opacity-100 transition-opacity duration-300 pointer-events-none">
                              <a 
                                href={video.url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-xs font-bold text-white transition-colors border border-white/10 hover:border-white/30 cursor-pointer pointer-events-auto"
                                onClick={(e) => e.stopPropagation()}
                              >
                                  <ExternalLink className="w-3 h-3" /> Переглянути відео
                              </a>
                          </div>

                          {/* Hover Overlay Actions (Check/Cross) - POINTER EVENTS NONE on Container */}
                          <div className="absolute inset-0 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-[60] pointer-events-none">
                              <button 
                                onClick={() => toggleSelection(video.id, 'no')}
                                className={`p-4 rounded-full border-2 transition-all transform hover:scale-110 pointer-events-auto cursor-pointer ${
                                    video.selected === 'no' 
                                    ? 'bg-red-600 border-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)]' 
                                    : 'bg-black/60 border-red-500 text-red-500 hover:bg-red-600 hover:text-white backdrop-blur-sm'
                                }`}
                              >
                                  <X className="w-8 h-8 pointer-events-none" />
                              </button>
                              
                              <button 
                                onClick={() => toggleSelection(video.id, 'yes')}
                                className={`p-4 rounded-full border-2 transition-all transform hover:scale-110 pointer-events-auto cursor-pointer ${
                                    video.selected === 'yes' 
                                    ? 'bg-green-600 border-green-600 text-white shadow-[0_0_20px_rgba(22,163,74,0.5)]' 
                                    : 'bg-black/60 border-green-500 text-green-500 hover:bg-green-600 hover:text-white backdrop-blur-sm'
                                }`}
                              >
                                  <Check className="w-8 h-8 pointer-events-none" />
                              </button>
                          </div>

                          {/* Selection Indicators (Static) */}
                          {video.selected === 'yes' && (
                              <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1 z-20 shadow-lg animate-fade-in-up">
                                  <Check className="w-4 h-4 text-white" />
                              </div>
                          )}
                          {video.selected === 'no' && (
                              <div className="absolute top-2 right-2 bg-red-500 rounded-full p-1 z-20 shadow-lg animate-fade-in-up">
                                  <X className="w-4 h-4 text-white" />
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* COMPLETE SCREEN */}
      {step === 'complete' && (
          <div className="text-center space-y-6 animate-fade-in-up">
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/50">
                  <Check className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold text-white">Ніша успішно проаналізована!</h2>
              <p className="text-gray-400 max-w-md mx-auto">
                  Ми створили унікальні промти для структури та сценаріїв на основі {foundVideos.filter(v => v.selected === 'yes').length + urls.filter(u => u.trim()).length} відео.
                  Тепер ви можете створити новий проєкт у ніші <strong>"{nicheName}"</strong>.
              </p>
              <button 
                onClick={() => setStep('initial')}
                className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold transition-colors"
              >
                  Повернутися
              </button>
          </div>
      )}

    </div>
  );
};