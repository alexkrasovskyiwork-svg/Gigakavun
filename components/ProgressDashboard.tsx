import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { Youtube, FileText, CheckCircle2, Layout, PenTool } from 'lucide-react';

interface ProgressDashboardProps {
  projects: Project[];
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ projects }) => {
  const totalProjects = projects.length;
  if (totalProjects === 0) return null;

  // Metric 1: Structure Progress (How many projects have structures)
  const projectsWithStructure = projects.filter(p => p.structure.length > 0 && !p.isStructureLoading).length;
  const structureProgress = (projectsWithStructure / totalProjects) * 100;

  // Metric 2: Script Generation Started (How many projects have at least started script generation)
  const projectsScripting = projects.filter(p => p.scriptParts.length > 0).length;
  const scriptingStartedProgress = (projectsScripting / totalProjects) * 100;

  // Metric 3: Parts Completion (Granular progress of all parts)
  const totalPartsExpected = projects.reduce((acc, p) => acc + (p.structure.length || 0), 0);
  const totalPartsDone = projects.reduce((acc, p) => acc + p.scriptParts.filter(part => !part.isGenerating && part.contentEn).length, 0);
  const contentProgress = totalPartsExpected > 0 ? (totalPartsDone / totalPartsExpected) * 100 : 0;

  // Metric 4: Final Readiness (Projects completely done)
  const projectsDone = projects.filter(p => !p.isScriptGenerating && p.scriptParts.length > 0 && !p.scriptParts.some(part => part.isGenerating)).length;
  const finalProgress = (projectsDone / totalProjects) * 100;

  // Overall weighted progress for the big number
  const overallWeighted = (structureProgress * 0.15) + (contentProgress * 0.85);

  const isGenerating = projects.some(p => p.isStructureLoading || p.isScriptGenerating || p.scriptParts.some(part => part.isGenerating));

  return (
    <div className="w-full max-w-6xl mx-auto mb-8 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden animate-fade-in-up">
      {/* Animated Loading Line */}
      {isGenerating && (
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-yt-red to-transparent animate-[shimmer_2s_infinite]" />
      )}
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-5">
             <div className="relative group">
                <div className={`absolute inset-0 bg-yt-red/30 blur-2xl rounded-full transition-opacity duration-700 ${isGenerating ? 'opacity-100' : 'opacity-0'}`} />
                <Youtube className={`w-12 h-12 text-yt-red relative z-10 transition-transform duration-[3s] ${isGenerating ? 'animate-[spin_3s_linear_infinite]' : ''}`} />
             </div>
             <div>
                 <h3 className="text-xl font-bold text-white tracking-tight">
                    {isGenerating ? 'ШІ Працює...' : 'Очікування'}
                 </h3>
                 <p className="text-gray-400 text-xs mt-1">
                    {isGenerating ? 'Створюємо вірусний контент' : 'Готові до роботи'}
                 </p>
             </div>
        </div>
        <div className="text-right">
            <div className="text-4xl font-black text-white tracking-tighter">{Math.round(overallWeighted)}%</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Загальний прогрес</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        <ProgressScale 
            icon={<Layout className="w-4 h-4" />}
            label="Структури"
            value={structureProgress}
            color="bg-blue-500"
            textColor="text-blue-400"
            detail={`${projectsWithStructure}/${totalProjects}`}
        />
        
        <ProgressScale 
            icon={<PenTool className="w-4 h-4" />}
            label="Запуск"
            value={scriptingStartedProgress}
            color="bg-purple-500"
            textColor="text-purple-400"
            detail={`${projectsScripting}/${totalProjects}`}
        />

        <ProgressScale 
            icon={<FileText className="w-4 h-4" />}
            label="Написання"
            value={contentProgress}
            color="bg-amber-500"
            textColor="text-amber-400"
            detail={totalPartsExpected > 0 ? `${totalPartsDone}/${totalPartsExpected}` : '...'}
            isActive={isGenerating && totalPartsExpected > 0}
        />

        <ProgressScale 
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Готово"
            value={finalProgress}
            color="bg-green-500"
            textColor="text-green-400"
            detail={`${projectsDone}/${totalProjects}`}
        />
      </div>
    </div>
  );
};

const ProgressScale = ({ icon, label, value, color, textColor, detail, isActive }: any) => (
    <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col justify-between h-full relative overflow-hidden group hover:bg-white/10 transition-colors">
        <div className="flex justify-between items-start mb-3 relative z-10">
            <div className={`flex items-center gap-2 text-sm font-bold ${textColor}`}>
                {icon} {label}
            </div>
            <span className="text-xs text-gray-500 font-mono bg-black/30 px-2 py-1 rounded">{detail}</span>
        </div>
        
        <div className="w-full bg-black/50 h-1.5 rounded-full overflow-hidden relative z-10">
            <div 
                className={`h-full rounded-full transition-all duration-700 ease-out ${color} ${isActive ? 'animate-pulse' : ''}`} 
                style={{ width: `${value}%` }}
            />
        </div>

        {/* Subtle background fill based on progress */}
        <div 
            className={`absolute bottom-0 left-0 h-1/3 w-full opacity-10 transition-all duration-700 ${color}`} 
            style={{ transform: `scaleX(${value / 100})`, transformOrigin: 'left' }}
        />
    </div>
);