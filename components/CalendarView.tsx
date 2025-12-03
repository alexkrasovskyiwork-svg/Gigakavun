
import React, { useState, useMemo } from 'react';
import { Project } from '../types';
import { ChevronLeft, ChevronRight, Calendar, Filter } from 'lucide-react';

interface CalendarViewProps {
  projects: Project[];
}

const WEEKDAYS_UA = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const MONTHS_UA = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
];

const getBaseTitle = (fullTitle: string) => {
    const match = fullTitle.match(/(.*)\s\[Ver\s(\d+)-(\d+)\]/);
    return match ? match[1].trim() : fullTitle;
};

export const CalendarView: React.FC<CalendarViewProps> = ({ projects }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedNiche, setSelectedNiche] = useState<string>('all');

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  const niches = useMemo(() => {
      const set = new Set<string>();
      projects.forEach(p => { if (p.config.niche) set.add(p.config.niche); });
      return Array.from(set).sort();
  }, [projects]);

  const projectsByDate = useMemo(() => {
    const map: Record<string, Project[]> = {};
    projects.forEach(p => {
      if (selectedNiche !== 'all' && p.config.niche !== selectedNiche) return;
      if (p.config.releaseDate) {
        if (!map[p.config.releaseDate]) map[p.config.releaseDate] = [];
        map[p.config.releaseDate].push(p);
      }
    });
    return map;
  }, [projects, selectedNiche]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const startDayOffset = (firstDayOfMonth + 6) % 7;

  const calendarDays = [];
  for (let i = 0; i < startDayOffset; i++) calendarDays.push({ day: null, dateStr: '' });
  for (let i = 1; i <= daysInMonth; i++) {
    const monthStr = (currentMonth + 1).toString().padStart(2, '0');
    const dayStr = i.toString().padStart(2, '0');
    calendarDays.push({ day: i, dateStr: `${currentYear}-${monthStr}-${dayStr}` });
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-fade-in-up">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 bg-yt-gray border border-white/10 p-6 rounded-2xl">
        <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-orange-500 shrink-0"><Calendar className="w-6 h-6" /></div>
            <div>
                <h2 className="text-2xl font-bold text-white uppercase tracking-wider">{MONTHS_UA[currentMonth]} {currentYear}</h2>
                <p className="text-gray-400 text-xs">Планування контенту</p>
            </div>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
                <div className="absolute left-3 top-2.5 pointer-events-none text-gray-500"><Filter className="w-4 h-4" /></div>
                <select value={selectedNiche} onChange={(e) => setSelectedNiche(e.target.value)} className="w-full md:w-48 bg-black/30 border border-white/10 rounded-lg pl-9 pr-8 py-2 text-sm text-white focus:border-yt-red outline-none appearance-none cursor-pointer hover:bg-white/5 transition-colors">
                    <option value="all">Всі ніші</option>
                    {niches.map(n => (<option key={n} value={n}>{n}</option>))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none text-gray-500"><ChevronRight className="w-3 h-3 rotate-90" /></div>
            </div>
            <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg border border-white/5">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={handleToday} className="px-4 py-1.5 hover:bg-white/10 rounded-md text-sm font-bold text-gray-300 hover:text-white transition-colors">Сьогодні</button>
                <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"><ChevronRight className="w-5 h-5" /></button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-white/10 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {WEEKDAYS_UA.map(day => (<div key={day} className="bg-[#1a1a1a] p-3 text-center text-xs font-bold text-gray-500 uppercase tracking-widest">{day}</div>))}
        {calendarDays.map((item, idx) => {
            if (!item.day) return <div key={idx} className="bg-[#0F0F0F] min-h-[120px]" />;
            const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, item.day).toDateString();
            const rawProjects = projectsByDate[item.dateStr] || [];
            
            const groupedProjects: { title: string; count: number; allCompleted: boolean; ids: number[] }[] = [];
            const processedTitles = new Set<string>();

            rawProjects.forEach(p => {
                const baseTitle = getBaseTitle(p.config.title);
                if (processedTitles.has(baseTitle)) return;
                const variants = rawProjects.filter(rp => getBaseTitle(rp.config.title) === baseTitle);
                const allCompleted = variants.every(v => v.isCompleted);
                groupedProjects.push({ title: baseTitle, count: variants.length, allCompleted, ids: variants.map(v => v.id) });
                processedTitles.add(baseTitle);
            });

            return (
                <div key={idx} className={`bg-[#0F0F0F] min-h-[140px] p-2 hover:bg-white/5 transition-colors relative group border-t border-transparent ${isToday ? 'bg-white/[0.02]' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-yt-red text-white shadow-lg shadow-red-900/50' : 'text-gray-400 group-hover:text-white'}`}>{item.day}</span>
                        {rawProjects.length > 0 && (<span className="text-[10px] text-gray-600 font-mono bg-white/5 px-1.5 py-0.5 rounded">{rawProjects.length}</span>)}
                    </div>
                    <div className="space-y-1.5 overflow-y-auto max-h-[100px] custom-scrollbar pr-1">
                        {groupedProjects.map((group, gIdx) => {
                             const isCompleted = group.allCompleted;
                             const containerClass = isCompleted ? 'bg-green-900/20 border-green-500/20 text-gray-300 hover:text-white hover:border-green-500/50' : 'bg-purple-900/20 border-purple-500/20 text-gray-300 hover:text-white hover:border-purple-500/50';
                             const dotClass = isCompleted ? 'bg-green-500' : 'bg-purple-500';
                             return (
                                <div key={gIdx} className={`${containerClass} border rounded px-2 py-1.5 text-[10px] transition-all cursor-default truncate flex items-center gap-1.5`}>
                                    <div className={`w-1 h-1 rounded-full shrink-0 ${dotClass}`} />
                                    <span className="truncate" title={group.title}>{group.title}</span>
                                </div>
                             )
                        })}
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};
