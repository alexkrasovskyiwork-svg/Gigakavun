import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { VideoConfig, ScriptPart, AppState, Project, AppTab, NicheConfig } from './types';
import { generateStructure, generateScriptSection, refineStructure, regenerateScriptSection, CAPRIO_BASE_PROMPT, SLAVERY_PROMPT_TEMPLATE, WAR_BASE_PROMPT, CAPRIO_SCRIPT_PROMPT, SLAVERY_SCRIPT_PROMPT, WAR_SCRIPT_PROMPT_TEMPLATE } from './services/geminiService';
import { SetupForm } from './components/SetupForm';
import { NicheAnalysisView } from './components/NicheAnalysisView';
import { ImagesView } from './components/ImagesView';
import { ScriptsView } from './components/ScriptsView';
import { ProjectsView } from './components/ProjectsView';
import { CalendarView } from './components/CalendarView';
import { Toast } from './components/Toast';
import { TransportProjectModal } from './components/TransportProjectModal';
import { NicheDetailsModal } from './components/NicheDetailsModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { Youtube, Settings, Image as ImageIcon, FileVideo, List, Trash2, Plus, AlertTriangle, Check, Search, BarChart, FolderOpen, Calendar, Wallet, FileText, Key } from 'lucide-react';
import { Button } from './components/Button';
import { loadNiches as loadNichesFromStorage, saveNiches as persistNiches, loadProjects as loadProjectsFromStorage, saveProjects as persistProjects, AuthRequiredError } from './services/storage';
import { supabase } from './services/supabaseClient';

// ... (Rest of imports and DEFAULT_NICHES remain same, skipping for brevity to focus on change)
const DEFAULT_NICHES: NicheConfig[] = [
    { 
        id: 'caprio', 
        name: 'Judge Caprio Stories', 
        defaultDuration: 8, 
        defaultStructureVariants: 1, 
        defaultScriptVariants: 1,
        customStructurePrompt: CAPRIO_BASE_PROMPT,
        customScriptPrompt: CAPRIO_SCRIPT_PROMPT,
        workflowDescription: 'Використовується для створення емоційних історій із судової зали. Фокус на діалогах та людських емоціях.'
    },
    { 
        id: 'slavery', 
        name: 'Slavery Stories', 
        defaultDuration: 30, 
        defaultStructureVariants: 1, 
        defaultScriptVariants: 1,
        customStructurePrompt: SLAVERY_PROMPT_TEMPLATE,
        customScriptPrompt: SLAVERY_SCRIPT_PROMPT,
        workflowDescription: 'Історичні документальні історії від першої особи. Важлива історична точність та похмура атмосфера.'
    },
    { 
        id: 'war', 
        name: 'War Stories', 
        defaultDuration: 10, 
        defaultStructureVariants: 1, 
        defaultScriptVariants: 1,
        customStructurePrompt: WAR_BASE_PROMPT,
        customScriptPrompt: WAR_SCRIPT_PROMPT_TEMPLATE,
        workflowDescription: 'Гіперреалізм. Опис бойових дій, тактики та психології солдата. Мінімум пафосу, максимум деталей.'
    }
];

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
        structIdx: -1, 
        scriptIdx: -1
    };
};

const normalizeNiches = (items: NicheConfig[]): NicheConfig[] => {
    return items.map(n => {
        const defaultNiche = DEFAULT_NICHES.find(dn => dn.id === n.id);
        return {
            ...n,
            defaultDuration: n.defaultDuration ?? 10,
            defaultStructureVariants: n.defaultStructureVariants ?? 1,
            defaultScriptVariants: n.defaultScriptVariants ?? 1,
            promptHistory: n.promptHistory || [],
            customStructurePrompt: n.customStructurePrompt !== undefined ? n.customStructurePrompt : defaultNiche?.customStructurePrompt,
            customScriptPrompt: n.customScriptPrompt !== undefined ? n.customScriptPrompt : defaultNiche?.customScriptPrompt,
            workflowDescription: n.workflowDescription !== undefined ? n.workflowDescription : defaultNiche?.workflowDescription
        };
    });
};

const normalizeProjects = (items: Project[]): Project[] => {
    return items.map(p => {
        const rawPrompts = p.imagePrompts || [];
        const migratedPrompts = rawPrompts.map((item: any) => {
            if (typeof item === 'string') {
                return { en: item, ua: 'Переклад відсутній для старих проєктів' };
            }
            return item;
        });

        let migratedNicheId = p.config.nicheId;
        if (!migratedNicheId) {
            const nicheLower = (p.config.niche || '').toLowerCase();
            if (nicheLower.includes('caprio')) migratedNicheId = 'caprio';
            else if (nicheLower.includes('slavery')) migratedNicheId = 'slavery';
            else if (nicheLower.includes('war')) migratedNicheId = 'war';
            else migratedNicheId = 'generic';
        }

        return {
          ...p,
          config: {
              ...p.config,
              nicheId: migratedNicheId,
              releaseDate: p.config.releaseDate || '',
              structureVariants: p.config.structureVariants || 1,
              scriptVariants: p.config.scriptVariants || 1,
          },
          isCompleted: p.isCompleted ?? false,
          imagePrompts: migratedPrompts,
          imageInstructions: p.imageInstructions || '',
          generatedImages: p.generatedImages || [],
          structure: p.structure || [],
          scriptParts: p.scriptParts || [],
          structureInstructions: p.structureInstructions,
          scriptInstructions: p.scriptInstructions
        };
    });
};

const App: React.FC = () => {
  // ... (State declarations)
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.PROJECTS); 
  const [isProjectCreationMode, setIsProjectCreationMode] = useState(false);
  const scrollPositions = useRef<Partial<Record<AppTab, number>>>({});

  const [niches, setNiches] = useState<NicheConfig[]>(DEFAULT_NICHES);
  const [draftNiches, setDraftNiches] = useState<NicheConfig[]>(DEFAULT_NICHES);
  const [validationErrorIds, setValidationErrorIds] = useState<Set<string>>(new Set());

  const [pendingTab, setPendingTab] = useState<AppTab | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [nicheToDelete, setNicheToDelete] = useState<string | null>(null);
  const [detailsNicheId, setDetailsNicheId] = useState<string | null>(null);
  const [showTransportModal, setShowTransportModal] = useState(false);

  const [appState, setAppState] = useState<AppState>(AppState.INPUT);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedScriptTitle, setSelectedScriptTitle] = useState<string | null>(null);

  const [refinePartSelection, setRefinePartSelection] = useState<{[key: number]: string}>({}); 
  const [refineInstructions, setRefineInstructions] = useState<{[key: number]: string}>({});
  const [isRegeneratingPart, setIsRegeneratingPart] = useState<{[key: number]: boolean}>({});

  const [toast, setToast] = useState<{message: string, type: 'error' | 'success' | 'info'} | null>(null);
  const [sessionCost, setSessionCost] = useState(0);

  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [settingsApiKey, setSettingsApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);

  const nichesLoadedRef = useRef(false);
  const projectsLoadedRef = useRef(false);

  useEffect(() => {
      if (!supabase) {
          setAuthChecked(true);
          return;
      }

      let mounted = true;
      supabase.auth.getSession()
          .then(({ data, error }) => {
              if (!mounted) return;
              if (error) {
                  setAuthError(error.message);
              }
              setAuthSession(data.session);
          })
          .catch(() => {
              if (!mounted) return;
              setAuthError('Не вдалося перевірити сесію Supabase');
          })
          .finally(() => {
              if (!mounted) return;
              setAuthChecked(true);
          });

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted) return;
          setAuthSession(session);
          if (session) {
              setAuthError(null);
          } else {
              setAuthMode('login');
          }
      });

      return () => {
          mounted = false;
          listener?.subscription.unsubscribe();
      };
  }, []);

  useEffect(() => {
      let mounted = true;
      (async () => {
          if (!authChecked) return;
          const canUseRemote = !!authSession && !!supabase;
          try {
              const loadedNiches = await loadNichesFromStorage(DEFAULT_NICHES, { useRemote: canUseRemote });
              const normalizedNiches = normalizeNiches(loadedNiches.length ? loadedNiches : DEFAULT_NICHES);
              if (!mounted) return;
              setNiches(normalizedNiches);
              setDraftNiches(normalizedNiches);
              nichesLoadedRef.current = true;
          } catch (error) {
              if (error instanceof AuthRequiredError) {
                  setAuthError('Потрібно увійти, щоб читати дані з Supabase.');
              }
              const localNiches = await loadNichesFromStorage(DEFAULT_NICHES, { useRemote: false });
              const normalizedLocal = normalizeNiches(localNiches.length ? localNiches : DEFAULT_NICHES);
              if (!mounted) return;
              setNiches(normalizedLocal);
              setDraftNiches(normalizedLocal);
              nichesLoadedRef.current = true;
          }
      })();
      return () => { mounted = false; };
  }, [authChecked, authSession]);

  useEffect(() => {
      let mounted = true;
      (async () => {
          if (!authChecked) return;
          const canUseRemote = !!authSession && !!supabase;
          try {
              const loadedProjects = await loadProjectsFromStorage({ useRemote: canUseRemote });
              const normalizedProjects = normalizeProjects(loadedProjects);
              if (!mounted) return;
              setProjects(normalizedProjects);
              projectsLoadedRef.current = true;
          } catch (error) {
              if (error instanceof AuthRequiredError) {
                  setAuthError('Потрібно увійти, щоб читати дані з Supabase.');
              }
              const localProjects = await loadProjectsFromStorage({ useRemote: false });
              const normalizedProjects = normalizeProjects(localProjects);
              if (!mounted) return;
              setProjects(normalizedProjects);
              projectsLoadedRef.current = true;
          }
      })();
      return () => { mounted = false; };
  }, [authChecked, authSession]);

  useEffect(() => {
      if (!nichesLoadedRef.current) return;
      const canUseRemote = !!authSession && !!supabase;
      void (async () => {
          try {
              await persistNiches(niches, { useRemote: canUseRemote });
          } catch (error) {
              if (error instanceof AuthRequiredError) {
                  showToast('Увійдіть, щоб синхронізувати налаштування ніш у Supabase', 'error');
              }
          }
      })();
  }, [niches, authSession]);

  useEffect(() => {
      if (!projectsLoadedRef.current) return;
      const canUseRemote = !!authSession && !!supabase;
      void (async () => {
          try {
              await persistProjects(projects, { useRemote: canUseRemote });
          } catch (error) {
              if (error instanceof AuthRequiredError) {
                  showToast('Увійдіть, щоб синхронізувати проєкти у Supabase', 'error');
              }
          }
      })();
  }, [projects, authSession]);

  useEffect(() => {
      if (typeof window !== 'undefined') {
          const storedOpenAI = localStorage.getItem('openai_api_key');
          const storedGemini = localStorage.getItem('gemini_api_key');
          if (storedOpenAI) setSettingsApiKey(storedOpenAI);
          if (storedGemini) setGeminiApiKey(storedGemini);
      }
  }, []);

  const executeWithOpenAI = (action: () => void) => { action(); };

  const handleSaveKeys = (openai: string, gemini: string) => {
      localStorage.setItem('openai_api_key', openai);
      localStorage.setItem('gemini_api_key', gemini);
      setSettingsApiKey(openai);
      setGeminiApiKey(gemini);
      setShowApiKeyModal(false);
      showToast("API ключі збережено", "success");
  };

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
      setToast({ message, type });
  };

  const handleAuthSubmit = async (event: React.FormEvent) => {
      event.preventDefault();
      if (!supabase) {
          setAuthError('Supabase не налаштований. Додайте URL і ключ у .env.local');
          return;
      }

      setIsAuthLoading(true);
      setAuthError(null);
      if (authMode === 'login') {
          const { data, error } = await supabase.auth.signInWithPassword({
              email: authEmail,
              password: authPassword,
          });
          if (error) {
              setAuthError(error.message);
          } else {
              setAuthSession(data.session);
              showToast('Вхід виконано', 'success');
          }
      } else {
          const { data, error } = await supabase.auth.signUp({
              email: authEmail,
              password: authPassword,
          });
          if (error) {
              setAuthError(error.message);
          } else {
              setAuthSession(data.session);
              showToast('Реєстрація успішна. Перевірте пошту для підтвердження.', 'success');
          }
      }
      setIsAuthLoading(false);
  };

  const handleSignOut = async () => {
      if (!supabase) return;
      await supabase.auth.signOut();
      setAuthSession(null);
      showToast('Ви вийшли з акаунту', 'info');
  };

  const addToCost = (amount: number) => {
      setSessionCost(prev => prev + amount);
  };

  // ... (Other handlers like handleTabChange, handleBatchConfigSubmit etc. remain unchanged from previous implementation)
  const handleTabChange = (newTab: AppTab) => {
    if (activeTab === AppTab.SETTINGS) {
        const hasChanges = JSON.stringify(niches) !== JSON.stringify(draftNiches);
        if (hasChanges) {
            setPendingTab(newTab);
            setShowUnsavedModal(true);
            return;
        }
    }
    scrollPositions.current[activeTab] = window.scrollY;
    setActiveTab(newTab);
  };

  useLayoutEffect(() => {
      const savedScroll = scrollPositions.current[activeTab] || 0;
      window.scrollTo(0, savedScroll);
  }, [activeTab]);

  const handleConfirmUnsaved = (save: boolean) => {
      if (save) {
          setNiches(draftNiches);
      } else {
          setDraftNiches(niches); 
          setValidationErrorIds(new Set()); 
      }
      setShowUnsavedModal(false);
      if (pendingTab) {
          scrollPositions.current[activeTab] = window.scrollY;
          setActiveTab(pendingTab);
          setPendingTab(null);
      }
  };

  const handleAddNiche = () => {
      const newNiche: NicheConfig = {
          id: `custom-${Date.now()}`,
          name: 'Нова ніша',
          defaultDuration: 10,
          defaultStructureVariants: 1,
          defaultScriptVariants: 1
      };
      const updated = [...niches, newNiche];
      setNiches(updated);
      setDraftNiches(updated);
  };

  const handleSaveAnalyzedNiche = (niche: NicheConfig) => {
      const updated = [...niches, niche];
      setNiches(updated);
      setDraftNiches(updated); 
      showToast(`Ніша "${niche.name}" збережена!`, 'success');
  };

  const handleUpdateDraftNiche = (id: string, field: keyof NicheConfig, value: any) => {
      setDraftNiches(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n));
      if (validationErrorIds.has(id)) {
          setValidationErrorIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
          });
      }
  };

  const handleUpdateNiche = (updatedNiche: NicheConfig) => {
      const newNiches = niches.map(n => n.id === updatedNiche.id ? updatedNiche : n);
      setNiches(newNiches);
      setDraftNiches(newNiches);
      try {
        localStorage.setItem('tubeScript_niches', JSON.stringify(newNiches)); 
      } catch (e) { console.error("Storage error", e); }
      showToast(`Налаштування ніші "${updatedNiche.name}" оновлено!`, 'success');
  };

  const handleSaveNiche = (id: string) => {
      const nicheToSave = draftNiches.find(n => n.id === id);
      if (nicheToSave) {
          const durVal = Number(nicheToSave.defaultDuration);
          const structVal = Number(nicheToSave.defaultStructureVariants);
          const scriptVal = Number(nicheToSave.defaultScriptVariants);

          const isDurationInvalid = isNaN(durVal) || durVal <= 0;
          const isStructInvalid = isNaN(structVal) || !Number.isInteger(structVal) || structVal < 1;
          const isScriptInvalid = isNaN(scriptVal) || !Number.isInteger(scriptVal) || scriptVal < 1;

          if (isDurationInvalid || isStructInvalid || isScriptInvalid) {
              setValidationErrorIds(prev => {
                  const newSet = new Set(prev);
                  newSet.add(id);
                  return newSet;
              });
              return;
          }

          setNiches(prev => prev.map(n => n.id === id ? nicheToSave : n));
          setValidationErrorIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
          });
      }
  };

  const handleDeleteNicheRequest = (id: string) => {
      setNicheToDelete(id);
  };

  const confirmDeleteNiche = () => {
      if (nicheToDelete) {
          const updated = niches.filter(n => n.id !== nicheToDelete);
          setNiches(updated);
          setDraftNiches(updated);
          setNicheToDelete(null);
      }
  };
  
  const handleTransportProject = (project: Project) => {
      setProjects(prev => [...prev, project]);
      if (activeTab === AppTab.SCRIPTS) {
          setSelectedScriptTitle(project.config.title);
      }
  };

  const handleAddProject = (project: Project) => {
      setProjects(prev => [...prev, project]);
  };

  const handleBatchConfigSubmit = async (configs: VideoConfig[], startGeneration: boolean, instructions?: string, model: string = 'gpt-4o') => {
    const newProjects: Project[] = [];
    let idCounter = 0;
    const batchId = `batch-${Date.now()}`;

    configs.forEach((cfg) => {
        const structCount = Math.max(1, Math.floor(cfg.structureVariants));
        const scriptCount = Math.max(1, Math.floor(cfg.scriptVariants));

        for (let s = 1; s <= structCount; s++) {
            for (let sc = 1; sc <= scriptCount; sc++) {
                let variantTitle = cfg.title;
                if (structCount > 1 || scriptCount > 1) {
                    variantTitle += ` [Ver ${s}-${sc}]`;
                }

                newProjects.push({
                    id: Date.now() + idCounter++,
                    batchId: batchId,
                    config: { ...cfg, title: variantTitle },
                    structure: [],
                    scriptParts: [],
                    isStructureLoading: startGeneration,
                    isScriptGenerating: false,
                    isCompleted: false,
                    filename: variantTitle.replace(/[^a-z0-9а-яіїєґ ]/gi, '_').trim().substring(0, 50),
                    generatedImages: [],
                    structureInstructions: instructions
                });
            }
        }
    });
    
    setProjects(prev => [...prev, ...newProjects]);
    setIsProjectCreationMode(false);
    
    if (startGeneration) {
        executeWithOpenAI(() => {
            const structureGroups: Record<number, Project[]> = {};
            newProjects.forEach(p => {
                 const { structIdx } = parseProjectTitle(p.config.title);
                 const key = structIdx > 0 ? structIdx : p.id;
                 if (!structureGroups[key]) structureGroups[key] = [];
                 structureGroups[key].push(p);
            });

            Object.keys(structureGroups).forEach(key => {
                const group = structureGroups[parseInt(key)];
                const representative = group[0];
                
                addToCost(0.001);

                generateStructure(representative.config, instructions, model)
                    .then((structure) => {
                        setProjects(prev => prev.map(p => 
                            group.some(g => g.id === p.id)
                                ? { ...p, structure: structure || [], isStructureLoading: false } 
                                : p
                        ));
                    })
                    .catch(err => {
                        console.error(`Error generating structure for group ${key}`, err);
                        showToast(`Помилка генерації структури: ${err.message || 'Unknown error'}`, 'error');
                        setProjects(prev => prev.map(p => 
                            group.some(g => g.id === p.id) 
                                ? { ...p, isStructureLoading: false } 
                                : p
                        ));
                    });
            });
        });
    }
  };

  const handleGenerateStructure = (projectId: number, instructions?: string, model: string = 'gpt-4o') => {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      executeWithOpenAI(() => {
          const { baseTitle, structIdx } = parseProjectTitle(project.config.title);
          
          let siblings: Project[] = [];
          if (structIdx !== -1) {
              siblings = projects.filter(p => {
                  const info = parseProjectTitle(p.config.title);
                  return p.config.niche === project.config.niche && 
                         info.baseTitle === baseTitle && 
                         info.structIdx === structIdx;
              });
          } else {
              siblings = [project];
          }
          
          addToCost(0.001);

          setProjects(prev => prev.map(p => 
              siblings.some(s => s.id === p.id) 
                ? { ...p, isStructureLoading: true, structureInstructions: instructions } 
                : p
          ));
          
          generateStructure(project.config, instructions, model)
            .then((structure) => {
                setProjects(prev => prev.map(p => 
                    siblings.some(s => s.id === p.id)
                        ? { ...p, structure: structure || [], isStructureLoading: false } 
                        : p
                ));
            })
            .catch(err => {
                console.error(err);
                showToast(`Помилка генерації структури: ${err.message || 'Unknown error'}`, 'error');
                setProjects(prev => prev.map(p => 
                    siblings.some(s => s.id === p.id) 
                        ? { ...p, isStructureLoading: false } 
                        : p
                ));
            });
      });
  };

  const handleRefineProject = async (projectId: number, instructions: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    executeWithOpenAI(async () => {
        const { baseTitle, structIdx } = parseProjectTitle(project.config.title);
        let siblings: Project[] = [];
        if (structIdx !== -1) {
            siblings = projects.filter(p => {
                const info = parseProjectTitle(p.config.title);
                return p.config.niche === project.config.niche && 
                       info.baseTitle === baseTitle && 
                       info.structIdx === structIdx;
            });
        } else {
            siblings = [project];
        }
        
        addToCost(0.001);
        setProjects(prev => prev.map(p => siblings.some(s => s.id === p.id) ? { ...p, isStructureLoading: true } : p));

        try {
            const updatedStructure = await refineStructure(project.structure, project.config, instructions, 'gpt-4o');
            setProjects(prev => prev.map(p => 
                siblings.some(s => s.id === p.id)
                    ? { ...p, structure: updatedStructure || [], isStructureLoading: false } 
                    : p
            ));
        } catch (error) {
            alert("Не вдалося оновити структуру. Спробуйте ще раз.");
            setProjects(prev => prev.map(p => siblings.some(s => s.id === p.id) ? { ...p, isStructureLoading: false } : p));
        }
    });
  };

  const handleUpdateProject = (projectId: number, updates: Partial<Project>) => {
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updates } : p));
  };
  
  const handleToggleProjectComplete = (projectId: number) => {
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, isCompleted: !p.isCompleted } : p));
  };

  const handleDeleteProject = (projectId: number) => {
      setProjects(prev => prev.filter(p => p.id !== projectId));
  };

  const generateScriptLoop = async (projectId: number, instructions?: string, model: string = 'gpt-4o') => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    executeWithOpenAI(async () => {
        setProjects(prev => prev.map(p => p.id === projectId ? { 
            ...p, 
            isScriptGenerating: true, 
            scriptParts: [],
            scriptInstructions: instructions 
        } : p));

        const structure = project.structure;
        const placeholders: ScriptPart[] = structure.map((item, i) => ({
            id: `proj-${projectId}-part-${i}`,
            sectionTitle: item.title,
            contentEn: '',
            contentUa: '',
            isGenerating: true
        }));

        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, scriptParts: placeholders } : p));

        for (let i = 0; i < structure.length; i++) {
            if (i === 0 && projectId === projects[0].id) {
                 setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
            addToCost(0.02);
            const { contentEn, contentUa } = await generateScriptSection(project.config, structure, i, instructions, model);
            setProjects(prev => prev.map(p => {
                if (p.id !== projectId) return p;
                const newParts = [...p.scriptParts];
                newParts[i] = { ...newParts[i], contentEn, contentUa, isGenerating: false };
                return { ...p, scriptParts: newParts };
            }));
        }
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, isScriptGenerating: false } : p));
    });
  };

  const handleRegeneratePart = async (projectId: number) => {
      const partId = refinePartSelection[projectId] || 'ALL_PARTS';
      const instructions = refineInstructions[projectId];
      if (!instructions) return;

      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      executeWithOpenAI(async () => {
          setIsRegeneratingPart(prev => ({...prev, [projectId]: true}));

          if (partId === 'ALL_PARTS') {
              for (let i = 0; i < project.scriptParts.length; i++) {
                  setProjects(prev => {
                      const p = prev.find(pr => pr.id === projectId);
                      if (!p) return prev;
                      const newParts = [...p.scriptParts];
                      newParts[i] = { ...newParts[i], isGenerating: true };
                      return prev.map(pr => pr.id === projectId ? { ...pr, scriptParts: newParts } : pr);
                  });
                  addToCost(0.02);
                  try {
                      const currentPart = project.scriptParts[i];
                      const { contentEn, contentUa } = await regenerateScriptSection(
                          project.config, project.structure, i, currentPart.contentEn, instructions, 'gpt-4o'
                      );
                      setProjects(prev => {
                          const p = prev.find(pr => pr.id === projectId);
                          if (!p) return prev;
                          const newParts = [...p.scriptParts];
                          newParts[i] = { ...newParts[i], contentEn, contentUa, isGenerating: false };
                          return prev.map(pr => pr.id === projectId ? { ...pr, scriptParts: newParts } : pr);
                      });
                  } catch (e) {
                      setProjects(prev => {
                          const p = prev.find(pr => pr.id === projectId);
                          if (!p) return prev;
                          const newParts = [...p.scriptParts];
                          newParts[i] = { ...newParts[i], isGenerating: false };
                          return prev.map(pr => pr.id === projectId ? { ...pr, scriptParts: newParts } : pr);
                      });
                  }
              }
          } else {
              const partIndex = project.scriptParts.findIndex(p => p.id === partId);
              if (partIndex === -1) return;
              const updatedPartsBefore = [...project.scriptParts];
              updatedPartsBefore[partIndex] = { ...updatedPartsBefore[partIndex], isGenerating: true };
              setProjects(prev => prev.map(p => p.id === projectId ? { ...p, scriptParts: updatedPartsBefore } : p));
              addToCost(0.02);
              try {
                  const { contentEn, contentUa } = await regenerateScriptSection(
                      project.config, project.structure, partIndex, project.scriptParts[partIndex].contentEn, instructions, 'gpt-4o'
                  );
                  setProjects(prev => prev.map(p => {
                      if (p.id !== projectId) return p;
                      const newParts = [...p.scriptParts];
                      newParts[partIndex] = { ...newParts[partIndex], contentEn, contentUa, isGenerating: false };
                      return { ...p, scriptParts: newParts };
                  }));
              } catch (e) {
                  setProjects(prev => prev.map(p => {
                      if (p.id !== projectId) return p;
                      const newParts = [...p.scriptParts];
                      newParts[partIndex] = { ...newParts[partIndex], isGenerating: false };
                      return { ...p, scriptParts: newParts };
                  }));
              }
          }
          setIsRegeneratingPart(prev => ({...prev, [projectId]: false}));
          setRefineInstructions(prev => ({...prev, [projectId]: ''}));
      });
  };

  const handleDownloadProject = (projectId: number, customName?: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const content = project.scriptParts.map(part => {
            let text = part.contentEn || '';
            text = text.replace(/^(Part\s+\d+|Section\s+\d+|#|\*\*Part).*/gim, '');
            return text.trim();
        }).filter(text => text.length > 0).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    let finalName = customName || project.filename || 'script';
    finalName = finalName.replace(/[^a-z0-9а-яіїєґ_\- ]/gi, '_');
    a.download = `${finalName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetApp = () => {
    setAppState(AppState.INPUT);
    setIsProjectCreationMode(false);
    handleTabChange(AppTab.PROJECTS);
  };

  const handleCreateNewFromProjects = () => {
      setActiveTab(AppTab.PROJECTS);
      setIsProjectCreationMode(true);
  };
  
  const handleCancelCreateNew = () => {
      setIsProjectCreationMode(false);
  };

  // RENDER SETTINGS TAB
  const renderSettingsTab = () => {
    const detailsNiche = detailsNicheId ? niches.find(n => n.id === detailsNicheId) : null;

    return (
      <div className="max-w-6xl mx-auto pb-20 animate-fade-in-up">
        <NicheDetailsModal 
            isOpen={!!detailsNicheId}
            onClose={() => setDetailsNicheId(null)}
            niche={detailsNiche || null}
            onSave={handleUpdateNiche}
        />

        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                 <Settings className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                  <h2 className="text-2xl font-bold text-white">Налаштування</h2>
                  <p className="text-gray-400 text-sm">Керуйте пресетами та ключами доступу</p>
              </div>
           </div>
           <Button onClick={handleAddNiche} icon={<Plus className="w-5 h-5" />}>
              Додати нішу
           </Button>
        </div>

        {/* API ACCESS SETTINGS */}
        <div className="bg-yt-gray border border-white/10 rounded-xl p-6 mb-8 shadow-lg">
            <h4 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2"><Key className="w-4 h-4" /> API Доступ</h4>
            <div className="space-y-4">
                <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-xl p-4">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">Ключі доступу (OpenAI, Gemini)</span>
                        <span className="text-xs text-gray-500">Налаштуйте ключі для роботи генератора</span>
                    </div>
                    <Button onClick={() => setShowApiKeyModal(true)} variant="secondary" className="text-sm h-10 px-4">Налаштувати</Button>
                </div>
            </div>
        </div>

        <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
            <List className="w-4 h-4" /> Шаблони Ніш
        </h3>

        <div className="space-y-4">
           {draftNiches.map((niche, index) => {
              const original = niches.find(n => n.id === niche.id);
              const isChanged = JSON.stringify(original) !== JSON.stringify(niche);
              const hasError = validationErrorIds.has(niche.id);
              
              const totalItems = (Number(niche.defaultStructureVariants) || 0) * (Number(niche.defaultScriptVariants) || 0);
              const durVal = Number(niche.defaultDuration);
              const strVal = Number(niche.defaultStructureVariants);
              const scrVal = Number(niche.defaultScriptVariants);
              
              return (
                 <div key={niche.id} className={`bg-yt-gray border rounded-xl p-6 transition-all ${hasError ? 'border-red-500/50 bg-red-900/10' : 'border-white/10'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                       <div className="md:col-span-3 space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase">Назва ніші</label>
                          <input 
                             type="text" 
                             value={niche.name}
                             onChange={(e) => handleUpdateDraftNiche(niche.id, 'name', e.target.value)}
                             className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-white/50"
                          />
                       </div>

                       <div className="md:col-span-2 space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Базова тривалість(хв)</label>
                          <input 
                             type="text" 
                             value={niche.defaultDuration}
                             onChange={(e) => handleUpdateDraftNiche(niche.id, 'defaultDuration', e.target.value)}
                             className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-white/50"
                          />
                          {hasError && (isNaN(durVal) || durVal <= 0) && <p className="text-[10px] text-purple-400">Подумай ще</p>}
                       </div>
                       
                       <div className="md:col-span-2 space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase">К-сть структур</label>
                          <input 
                             type="text" 
                             value={niche.defaultStructureVariants}
                             onChange={(e) => handleUpdateDraftNiche(niche.id, 'defaultStructureVariants', e.target.value)}
                             className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-white/50"
                          />
                          {hasError && (isNaN(strVal) || !Number.isInteger(strVal) || strVal < 1) && <p className="text-[10px] text-purple-400">Зроби інакше</p>}
                       </div>

                       <div className="md:col-span-2 space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase">К-сть сценаріїв</label>
                          <input 
                             type="text" 
                             value={niche.defaultScriptVariants}
                             onChange={(e) => handleUpdateDraftNiche(niche.id, 'defaultScriptVariants', e.target.value)}
                             className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-white/50"
                          />
                          {hasError && (isNaN(scrVal) || !Number.isInteger(scrVal) || scrVal < 1) && <p className="text-[10px] text-purple-400">Так не піде</p>}
                       </div>
                       
                        <div className="md:col-span-1 space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase">Разом</label>
                          <div className="w-full h-[38px] flex items-center justify-center bg-white/5 rounded-lg border border-white/5 text-gray-300 font-mono text-sm">
                              {isNaN(totalItems) ? '-' : totalItems}
                          </div>
                       </div>

                       <div className="md:col-span-2 flex justify-end gap-2 pt-6">
                          {isChanged && (
                              <button onClick={() => handleSaveNiche(niche.id)} className="p-2 bg-green-600 rounded-lg text-white hover:bg-green-500 transition-all shadow-[0_0_15px_rgba(22,163,74,0.4)]" title="Зберегти"><Check className="w-5 h-5" /></button>
                          )}
                          <button onClick={() => setDetailsNicheId(niche.id)} className="p-2 bg-white/5 rounded-lg text-blue-400 hover:bg-blue-900/30 hover:text-blue-300 transition-colors" title="Деталі"><FileText className="w-5 h-5" /></button>
                          <button onClick={() => handleDeleteNicheRequest(niche.id)} className="p-2 bg-white/5 rounded-lg text-gray-400 hover:bg-red-900/30 hover:text-red-500 transition-colors" title="Видалити"><Trash2 className="w-5 h-5" /></button>
                       </div>
                    </div>
                 </div>
              );
           })}
        </div>
      </div>
    );
  };

  // ... (Render main app layout - same structure as before, just updated renderSettingsTab is called inside)
  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white font-sans selection:bg-yt-red selection:text-white pb-20">
      
      <ApiKeyModal 
          isOpen={showApiKeyModal}
          onClose={() => { setShowApiKeyModal(false); setPendingAction(null); }}
          onSave={handleSaveKeys}
      />

      <TransportProjectModal 
          isOpen={showTransportModal}
          onClose={() => setShowTransportModal(false)}
          onSubmit={handleTransportProject}
          onCreateEmpty={() => {
              setShowTransportModal(false);
              handleCreateNewFromProjects();
          }}
          nicheOptions={niches}
      />
      {toast && (<Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />)}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Зайчику, підтверди зміни:)</h3>
                <div className="flex gap-3 justify-center mt-6">
                    <Button variant="secondary" onClick={() => handleConfirmUnsaved(false)} className="flex-1 whitespace-nowrap text-sm px-2">Відхилити, я передумав</Button>
                    <Button variant="primary" onClick={() => handleConfirmUnsaved(true)} className="flex-1 bg-green-600 hover:bg-green-700 shadow-green-900/20 whitespace-nowrap text-sm px-2">Зберегти</Button>
                </div>
            </div>
        </div>
      )}
      {nicheToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Сер, ви впевнені?</h3>
                <div className="flex gap-3 justify-center mt-6">
                    <Button variant="secondary" onClick={() => setNicheToDelete(null)} className="flex-1 whitespace-nowrap text-sm px-2">Ні, я передумав</Button>
                    <Button variant="primary" onClick={confirmDeleteNiche} className="flex-1 bg-red-600 hover:bg-red-700 shadow-red-900/20 whitespace-nowrap text-sm px-2">Так</Button>
                </div>
            </div>
        </div>
      )}

      <header className="sticky top-0 z-50 bg-[#0F0F0F]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={resetApp}>
            {/* Custom Watermelon SVG Icon */}
            <div className="bg-green-600 p-1.5 rounded-lg shadow-lg shadow-green-900/40 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-500">
                    <path d="M12 22C17.5 22 22 17.5 22 12H2C2 17.5 6.5 22 12 22Z" fill="currentColor" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                    <path d="M12 22C17.5 22 22 17.5 22 12" stroke="#166534" strokeWidth="3" strokeLinecap="round"/> 
                    <path d="M2 12C2 17.5 6.5 22 12 22" stroke="#166534" strokeWidth="3" strokeLinecap="round"/> 
                    <circle cx="8" cy="16" r="1" fill="black"/>
                    <circle cx="12" cy="18" r="1" fill="black"/>
                    <circle cx="16" cy="16" r="1" fill="black"/>
                </svg>
            </div>
            <span className="text-xl font-bold tracking-tight">Giga<span className="text-red-500">Kavun</span></span>
          </div>
          <div className="ml-auto flex items-center gap-4">
              <button onClick={() => window.open('https://console.cloud.google.com/billing', '_blank')} className="hidden md:flex items-center gap-2 bg-black/40 hover:bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 transition-colors group" title="Перевірити детальний білінг у Google Cloud">
                  <div className="p-1.5 bg-green-500/10 rounded-md group-hover:bg-green-500/20 transition-colors"><Wallet className="w-4 h-4 text-green-400" /></div>
                  <div className="flex flex-col items-end leading-none"><span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Session Usage</span><span className="text-sm font-bold text-white">${sessionCost.toFixed(3)}</span></div>
              </button>
              <nav className="flex items-center gap-1 overflow-x-auto max-w-[calc(100vw-300px)] no-scrollbar">
                  {[
                      { id: AppTab.CALENDAR, label: 'Календар', icon: Calendar },
                      { id: AppTab.SEARCH_NICHE, label: 'Пошук ніші', icon: Search },
                      { id: AppTab.ANALYZE_NICHE, label: 'Аналіз ніші', icon: BarChart },
                      { id: AppTab.TOPICS, label: 'Теми', icon: List },
                      { id: AppTab.PROJECTS, label: 'Проєкти', icon: FolderOpen },
                      { id: AppTab.SCRIPTS, label: 'Сценарії', icon: FileVideo },
                      { id: AppTab.IMAGES, label: 'Картинки', icon: ImageIcon },
                      { id: AppTab.SETTINGS, label: 'Налаштування', icon: Settings },
                  ].map(tab => (
                      <button key={tab.id} onClick={() => handleTabChange(tab.id)} className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0 ${activeTab === tab.id ? 'bg-white/10 text-white shadow-inner' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                          <tab.icon className="w-4 h-4" /><span className="hidden lg:inline whitespace-nowrap">{tab.label}</span>
                      </button>
                  ))}
              </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-12">
          <div id="supabase-auth" className="mb-8">
              {supabase ? (
                  authSession ? (
                      <div className="bg-yt-gray border border-white/10 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div>
                              <p className="text-sm text-gray-400">Ви увійшли як</p>
                              <p className="text-lg font-semibold text-white">{authSession.user.email}</p>
                          </div>
                          <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">Сесія збережена</span>
                              <Button variant="secondary" onClick={handleSignOut} className="text-sm h-10 px-4">Вийти</Button>
                          </div>
                      </div>
                  ) : (
                      <div className="bg-yt-gray border border-white/10 rounded-xl p-6">
                          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                              <div>
                                  <p className="text-xs uppercase tracking-wide text-gray-400 font-bold mb-1">Supabase Auth</p>
                                  <h2 className="text-xl font-bold text-white">Увійдіть або зареєструйтесь, щоб синхронізувати дані</h2>
                                  <p className="text-sm text-gray-400">Доступ до таблиці collections дозволено лише для автентифікованих користувачів</p>
                              </div>
                              <Button variant="secondary" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-sm h-10 px-4">
                                  {authMode === 'login' ? 'Немає акаунту? Зареєструватися' : 'Вже є акаунт? Увійти'}
                              </Button>
                          </div>
                          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleAuthSubmit}>
                              <label className="flex flex-col gap-2 text-sm text-gray-300">
                                  Email
                                  <input
                                      type="email"
                                      required
                                      value={authEmail}
                                      onChange={(e) => setAuthEmail(e.target.value)}
                                      className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                                  />
                              </label>
                              <label className="flex flex-col gap-2 text-sm text-gray-300">
                                  Пароль
                                  <input
                                      type="password"
                                      required
                                      value={authPassword}
                                      onChange={(e) => setAuthPassword(e.target.value)}
                                      className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                                  />
                              </label>
                              <div className="md:col-span-2 flex flex-col gap-2">
                                  {authError && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">{authError}</div>}
                                  {!authChecked && <div className="text-sm text-gray-400">Перевіряємо активну сесію...</div>}
                              </div>
                              <div className="md:col-span-2 flex justify-end gap-3">
                                  <Button type="submit" disabled={isAuthLoading} className="text-sm h-10 px-4">
                                      {isAuthLoading ? 'Зачекайте...' : authMode === 'login' ? 'Увійти' : 'Зареєструватись'}
                                  </Button>
                              </div>
                          </form>
                      </div>
                  )
              ) : (
                  <div className="bg-red-900/10 border border-red-700/30 text-red-200 rounded-xl p-6">
                      <p className="font-semibold mb-1">Supabase не налаштований</p>
                      <p className="text-sm text-red-100/90">Додайте <code className="bg-black/40 px-2 py-1 rounded">VITE_SUPABASE_URL</code> та <code className="bg-black/40 px-2 py-1 rounded">VITE_SUPABASE_ANON_KEY</code> у .env.local, щоб увімкнути збереження в базі.</p>
                  </div>
              )}
          </div>
          <div style={{ display: activeTab === AppTab.PROJECTS ? 'block' : 'none' }}>
              {isProjectCreationMode ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in-up">
                    <SetupForm onSubmit={handleBatchConfigSubmit} onCancel={handleCancelCreateNew} isLoading={false} nicheOptions={niches} />
                </div>
              ) : (
                <ProjectsView 
                    projects={projects}
                    onSelectProject={(title) => { setSelectedScriptTitle(title); handleTabChange(AppTab.SCRIPTS); }}
                    onCreateNew={handleCreateNewFromProjects}
                    onTransport={() => setShowTransportModal(true)}
                    onToggleComplete={handleToggleProjectComplete}
                    onUpdateProject={handleUpdateProject}
                    onDeleteProject={handleDeleteProject}
                />
              )}
          </div>

          <div style={{ display: activeTab === AppTab.SCRIPTS ? 'block' : 'none' }}>
             <ScriptsView 
                projects={projects}
                setAppState={setAppState}
                onGenerateScript={generateScriptLoop}
                onGenerateStructure={handleGenerateStructure}
                onCreateNew={handleCreateNewFromProjects}
                onTransport={() => setShowTransportModal(true)}
                onRefineProject={handleRefineProject}
                onRegeneratePart={handleRegeneratePart}
                onDownload={handleDownloadProject}
                selectedTitle={selectedScriptTitle}
                setSelectedTitle={setSelectedScriptTitle}
                refinePartSelection={refinePartSelection}
                setRefinePartSelection={setRefinePartSelection}
                refineInstructions={refineInstructions}
                setRefineInstructions={setRefineInstructions}
                isRegeneratingPart={isRegeneratingPart}
            />
          </div>
          
          <div style={{ display: activeTab === AppTab.SETTINGS ? 'block' : 'none' }}>{renderSettingsTab()}</div>
          <div style={{ display: activeTab === AppTab.ANALYZE_NICHE ? 'block' : 'none' }}>
             <NicheAnalysisView onSaveNiche={handleSaveAnalyzedNiche} />
          </div>
          
          <div style={{ display: activeTab === AppTab.IMAGES ? 'block' : 'none' }}>
             <ImagesView 
                projects={projects} 
                onUpdateProject={handleUpdateProject} 
                onCreateNew={handleCreateNewFromProjects}
                onTransport={() => setShowTransportModal(true)}
                showToast={showToast}
                onAddCost={addToCost}
                onAddProject={handleAddProject}
                nicheOptions={niches}
             />
          </div>
          
          <div style={{ display: activeTab === AppTab.CALENDAR ? 'block' : 'none' }}><CalendarView projects={projects} /></div>

          {(activeTab === AppTab.TOPICS || activeTab === AppTab.SEARCH_NICHE) && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-500 animate-fade-in-up">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                     {activeTab === AppTab.TOPICS && <List className="w-8 h-8" />}
                     {activeTab === AppTab.SEARCH_NICHE && <Search className="w-8 h-8" />}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Піди подихай свіжим повітрям, бо ми дамо тут зараз газку</h3>
              </div>
          )}
      </main>
    </div>
  );
};

export default App;