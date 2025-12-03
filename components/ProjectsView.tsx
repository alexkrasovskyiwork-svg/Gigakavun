
import React, { useMemo, useState } from 'react';
import { Project } from '../types';
import { FolderOpen, FileVideo, Clock, ChevronRight, Briefcase, MoreVertical, Edit2, Trash2, CheckSquare, Square, Check, X, Calendar, AlertTriangle, Plus, Zap } from 'lucide-react';
import { Button } from './Button';

interface ProjectsViewProps {
  projects: Project[];
  onSelectProject: (baseTitle: string) => void;
  onCreateNew: () => void;
  onTransport: () => void;
  onToggleComplete: (id: number) => void;
  onUpdateProject: (id: number, updates: Partial<Project>) => void;
  onDeleteProject: (id: number) => void;
}

// Helper to parse title strings "Title [Ver X-Y]" -> baseTitle
const getBaseTitle = (fullTitle: string) => {
    const match = fullTitle.match(/(.*)\s\[Ver\s(\d+)-(\d+)\]/);
    return match ? match[1].trim() : fullTitle;
};

// Helper to format YYYY-MM-DD to DD.MM.YYYY
const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return dateStr.split('-').reverse().join('.');
};

export const ProjectsView: React.FC<ProjectsViewProps> = ({ 
    projects, 
    onSelectProject, 
    onCreateNew,
    onTransport,
    onToggleComplete,
    onUpdateProject,
    onDeleteProject
}) => {
  
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Edit State
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');

  // Group projects by Niche -> Base Title
  const groups = useMemo(() => {
    const tree: Record<string, Record<string, Project[]>> = {};
    
    // Sort by newest first
    [...projects].reverse().forEach(p => {
        const niche = p.config.niche || 'Інше';
        const baseTitle = getBaseTitle(p.config.title);

        if (!tree[niche]) tree[niche] = {};
        if (!tree[niche][baseTitle]) tree[niche][baseTitle] = [];
        
        tree[niche][baseTitle].push(p);
    });
    return tree;
  }, [projects]);

  const nicheKeys = Object.keys(groups);

  const handleEditStart = (project: Project, baseTitle: string) => {
      setEditingId(project.id);
      setEditTitle(baseTitle);
      setEditDate(project.config.releaseDate || '');
      setOpenMenuId(null);
  };

  const handleEditSave = (variants: Project[]) => {
      // Apply changes to ALL variants in the group
      variants.forEach(p => {
          let newTitle = p.config.title;
          
          // Reconstruct title preserving the version tag if user changed the base name
          const match = p.config.title.match(/\[Ver\s(\d+)-(\d+)\]/);
          if (match) {
              // If title matches specific version pattern, replace the base part
              const currentBase = getBaseTitle(p.config.title);
              if (currentBase !== editTitle) {
                  newTitle = `${editTitle} ${match[0]}`; 
              }
          } else {
              // Simple title change
              newTitle = editTitle;
          }

          onUpdateProject(p.id, {
              config: {
                  ...p.config,
                  title: newTitle,
                  releaseDate: editDate // This overwrites the old date completely
              }
          });
      });
      
      setEditingId(null);
  };

  const handleDeleteRequest = (id: number) => {
      setDeleteId(id);
      setOpenMenuId(null);
  };

  if (projects.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in-up">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <Briefcase className="w-10 h-10 text-gray-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Настав час попрацювати</h2>
              <p className="text-gray-400 mb-8">У тебе зовсім немає проєктів</p>
              <div className="flex gap-4">
                  <Button 
                      onClick={onCreateNew} 
                      className="flex items-center gap-2 bg-gradient-to-r from-yt-red to-red-700 hover:from-red-600 hover:to-red-800 shadow-lg shadow-red-900/30"
                  >
                      <Plus className="w-5 h-5" />
                      <span>Створити перший проєкт</span>
                  </Button>
                  <Button 
                      onClick={onTransport} 
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-900/30"
                  >
                      <Zap className="w-5 h-5" />
                      <span>Транспортувати</span>
                  </Button>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-fade-in-up relative">
        
        {/* Delete Modal */}
        {deleteId !== null && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in-up">
                <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Сер, ви впевнені?</h3>
                    <div className="flex gap-3 justify-center mt-6">
                        <Button 
                            variant="secondary" 
                            onClick={() => setDeleteId(null)}
                            className="flex-1 whitespace-nowrap text-sm px-2"
                        >
                            Ні, я передумав
                        </Button>
                        <Button 
                            variant="primary" 
                            onClick={() => { onDeleteProject(deleteId); setDeleteId(null); }}
                            className="flex-1 bg-red-600 hover:bg-red-700 shadow-red-900/20 whitespace-nowrap text-sm px-2"
                        >
                            Так
                        </Button>
                    </div>
                </div>
            </div>
        )}

        <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <FolderOpen className="w-8 h-8 text-yt-red" />
                Мої Проєкти
            </h2>
            <div className="flex gap-2">
                <Button 
                    onClick={onTransport} 
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-900/30 h-10 text-sm px-4"
                >
                    <Zap className="w-4 h-4" />
                    <span>Транспортувати</span>
                </Button>
                <Button 
                    onClick={onCreateNew} 
                    className="flex items-center gap-2 bg-gradient-to-r from-yt-red to-red-700 hover:from-red-600 hover:to-red-800 shadow-lg shadow-red-900/30 h-10 text-sm px-4"
                >
                    <Plus className="w-4 h-4" />
                    <span>Новий проєкт</span>
                </Button>
            </div>
        </div>

        <div className="space-y-12">
            {nicheKeys.map(niche => {
                const titles = groups[niche];
                const titleKeys = Object.keys(titles);
                
                if (titleKeys.length === 0) return null;

                return (
                    <div key={niche} className="space-y-4">
                        <h3 className="text-xl font-bold text-gray-400 border-b border-white/10 pb-2 flex items-center gap-2">
                            {niche} 
                            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-gray-500">{titleKeys.length}</span>
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {titleKeys.map(title => {
                                const variants = titles[title];
                                const latestProject = variants[0]; // First one is newest because we reversed
                                const variantCount = variants.length;
                                const totalParts = variants.reduce((acc, p) => acc + (p.structure.length || 0), 0);
                                const totalGenerated = variants.reduce((acc, p) => acc + p.scriptParts.length, 0);
                                const progress = totalParts > 0 ? Math.round((totalGenerated / totalParts) * 100) : 0;
                                const isCompleted = latestProject.isCompleted;
                                const isEditing = editingId === latestProject.id;

                                return (
                                    <div 
                                        key={title}
                                        className={`bg-yt-gray border rounded-xl p-5 transition-all group relative overflow-hidden flex flex-col justify-between
                                            ${isCompleted 
                                                ? 'border-green-500/30 opacity-75 hover:opacity-100 hover:border-green-500/50' 
                                                : 'border-white/10 hover:border-white/50 hover:bg-white/5 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                            }
                                        `}
                                    >
                                        <div>
                                            {/* Header: Complete Toggle & Info */}
                                            <div className="flex justify-between items-start mb-3 relative z-10">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onToggleComplete(latestProject.id); }}
                                                    className={`transition-colors ${isCompleted ? 'text-green-500' : 'text-gray-600 hover:text-gray-400'}`}
                                                    title={isCompleted ? "Mark as incomplete" : "Mark as complete"}
                                                >
                                                    {isCompleted ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                                </button>

                                                {/* Actions Menu Trigger */}
                                                <div className="relative">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === latestProject.id ? null : latestProject.id); }}
                                                        className="text-gray-500 hover:text-white transition-colors p-1"
                                                    >
                                                        <MoreVertical className="w-5 h-5" />
                                                    </button>
                                                    
                                                    {/* Dropdown Menu */}
                                                    {openMenuId === latestProject.id && (
                                                        <div className="absolute right-0 top-full mt-1 w-32 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in-up">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleEditStart(latestProject, title); }}
                                                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-2"
                                                            >
                                                                <Edit2 className="w-3 h-3" /> Редагувати
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteRequest(latestProject.id); }}
                                                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 flex items-center gap-2"
                                                            >
                                                                <Trash2 className="w-3 h-3" /> Видалити
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Title Area */}
                                            {isEditing ? (
                                                <div className="space-y-2 mb-4 relative z-20">
                                                    <input 
                                                        type="text" 
                                                        value={editTitle}
                                                        onChange={(e) => setEditTitle(e.target.value)}
                                                        className="w-full bg-black/50 border border-white/20 rounded px-2 py-1 text-sm text-white focus:border-purple-500 outline-none"
                                                        placeholder="Назва..."
                                                        autoFocus
                                                    />
                                                    <div className="relative">
                                                        <input 
                                                            type="date" 
                                                            value={editDate}
                                                            onChange={(e) => setEditDate(e.target.value)}
                                                            className="w-full bg-black/50 border border-white/20 rounded px-2 py-1 text-xs text-white focus:border-purple-500 outline-none"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2 justify-end pt-1">
                                                        <button onClick={() => setEditingId(null)} className="p-1 bg-white/10 rounded hover:bg-white/20"><X className="w-3 h-3 text-white" /></button>
                                                        <button onClick={() => handleEditSave(variants)} className="p-1 bg-green-600 rounded hover:bg-green-500"><Check className="w-3 h-3 text-white" /></button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div onClick={() => onSelectProject(title)} className="cursor-pointer">
                                                    <h4 className={`font-bold text-lg leading-tight mb-2 line-clamp-2 transition-colors ${isCompleted ? 'text-gray-400 line-through' : 'text-white group-hover:text-purple-500'}`}>
                                                        {title}
                                                    </h4>
                                                    
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="text-xs font-mono text-gray-500 flex items-center gap-1 bg-black/40 px-2 py-1 rounded">
                                                            <Clock className="w-3 h-3" />
                                                            {latestProject.config.durationMinutes} хв
                                                        </div>
                                                        {latestProject.config.releaseDate && (
                                                            <div className="text-xs font-mono text-orange-400/80 flex items-center gap-1 bg-black/40 px-2 py-1 rounded border border-orange-500/10">
                                                                <Calendar className="w-3 h-3" />
                                                                {formatDate(latestProject.config.releaseDate)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div onClick={() => onSelectProject(title)} className="cursor-pointer mt-auto">
                                            <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                                                <span>{variantCount} варіантів</span>
                                                <span className={`font-bold ${progress === 100 ? 'text-green-500' : 'text-blue-400'}`}>
                                                    {progress}% готово
                                                </span>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="w-full h-1 bg-white/5 mt-3 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        {!isEditing && (
                                            <ChevronRight className="absolute bottom-4 right-4 w-4 h-4 text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all opacity-0 group-hover:opacity-100 pointer-events-none" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};
