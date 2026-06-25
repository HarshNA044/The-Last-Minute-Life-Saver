import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Area, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  Bar
} from 'recharts';
import { Task } from '../types';

interface AnalyticsProps {
  tasks: Task[];
  onAddSystemLog?: (text: string, type: 'info' | 'optimizing' | 'tracking' | 'scheduled' | 'warning' | 'alert') => void;
}

export default function Analytics({ tasks, onAddSystemLog }: AnalyticsProps) {
  const [viewMode, setViewMode] = useState<'daywise' | 'monthwise'>('daywise');
  const [showHelp, setShowHelp] = useState(false);
  
  // Anchored around June 25, 2026 as default
  const [selectedDayStr, setSelectedDayStr] = useState<string>('2026-06-25');
  const [selectedMonthStr, setSelectedMonthStr] = useState<string>('2026-06');

  // Normalized date parser helper (same as DeadlinesList to align dates correctly)
  const getNormalizedDate = (dateStr: string): string => {
    if (!dateStr) return '2026-06-25';
    const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
    
    const lower = dateStr.toLowerCase();
    if (lower.includes('today')) return '2026-06-25';
    if (lower.includes('tomorrow')) return '2026-06-26';
    if (lower.includes('yesterday')) return '2026-06-24';
    
    // Parse timestamp
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      const y = d.getFullYear();
      const m = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    
    return '2026-06-25';
  };

  const getNormalizedMonthStr = (dateStr: string): string => {
    const norm = getNormalizedDate(dateStr);
    return norm.substring(0, 7); // e.g. "2026-06"
  };

  const getMonthLabel = (monthStr: string): string => {
    const [year, m] = monthStr.split('-');
    const date = new Date(Number(year), Number(m) - 1, 1);
    if (isNaN(date.getTime())) return monthStr;
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // 1. General stats calculations
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.status === 'completed' || (t.subtasks.length > 0 && t.subtasks.every(st => st.completed))).length;
  
  let totalSubtasks = 0;
  let completedSubtasks = 0;
  let remainingSubtasks = 0;

  tasks.forEach(t => {
    t.subtasks.forEach(st => {
      totalSubtasks++;
      if (st.completed) {
        completedSubtasks++;
      } else {
        remainingSubtasks++;
      }
    });
  });

  const completionRate = totalSubtasks > 0 
    ? Math.round((completedSubtasks / totalSubtasks) * 100) 
    : 0;

  // 2. Daywise Analytics Calculations
  const getDaywiseChartData = () => {
    if (tasks.length === 0) {
      // Sleek placeholder data for visual guidance when empty
      return [
        { name: 'Jun 22', Completed: 2, Remaining: 1, 'Completion Rate (%)': 66 },
        { name: 'Jun 23', Completed: 4, Remaining: 2, 'Completion Rate (%)': 66 },
        { name: 'Jun 24', Completed: 6, Remaining: 1, 'Completion Rate (%)': 85 },
        { name: 'Jun 25', Completed: 5, Remaining: 3, 'Completion Rate (%)': 62 },
        { name: 'Jun 26', Completed: 3, Remaining: 5, 'Completion Rate (%)': 37 },
        { name: 'Jun 27', Completed: 1, Remaining: 4, 'Completion Rate (%)': 20 },
      ];
    }

    // Accumulate tasks by date
    const dateMap: Record<string, { completed: number; remaining: number }> = {};
    
    // Seed standard baseline window around Jun 25
    const baselineDate = new Date('2026-06-25T00:00:00');
    for (let i = -4; i <= 4; i++) {
      const d = new Date(baselineDate);
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const label = `${y}-${m}-${day}`;
      dateMap[label] = { completed: 0, remaining: 0 };
    }

    // Populate actual user tasks
    tasks.forEach(task => {
      const label = getNormalizedDate(task.originalDeadline);
      const completedCount = task.subtasks.filter(st => st.completed).length;
      const remainingCount = task.subtasks.length - completedCount;

      if (!dateMap[label]) {
        dateMap[label] = { completed: 0, remaining: 0 };
      }
      dateMap[label].completed += completedCount;
      dateMap[label].remaining += remainingCount;
    });

    // Format for Recharts
    const sortedDates = Object.keys(dateMap).sort();
    return sortedDates.map(dateKey => {
      const dayData = dateMap[dateKey];
      const total = dayData.completed + dayData.remaining;
      const rate = total > 0 ? Math.round((dayData.completed / total) * 100) : 0;
      
      // Simple visual date label "Jun 25"
      const dateObj = new Date(dateKey + 'T00:00:00');
      const formattedLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      return {
        name: formattedLabel,
        fullDate: dateKey,
        Completed: dayData.completed,
        Remaining: dayData.remaining,
        'Completion Rate (%)': rate
      };
    });
  };

  // 3. Monthwise Analytics Calculations
  const getMonthwiseChartData = () => {
    if (tasks.length === 0) {
      // Sample data
      return [
        { name: 'Apr 2026', Completed: 12, Remaining: 2, 'Completion Rate (%)': 85 },
        { name: 'May 2026', Completed: 18, Remaining: 5, 'Completion Rate (%)': 78 },
        { name: 'Jun 2026', Completed: 15, Remaining: 12, 'Completion Rate (%)': 55 },
        { name: 'Jul 2026', Completed: 8, Remaining: 14, 'Completion Rate (%)': 36 },
      ];
    }

    const monthMap: Record<string, { completed: number; remaining: number }> = {};

    // Seed standard months
    monthMap['2026-05'] = { completed: 0, remaining: 0 };
    monthMap['2026-06'] = { completed: 0, remaining: 0 };
    monthMap['2026-07'] = { completed: 0, remaining: 0 };

    tasks.forEach(task => {
      const mStr = getNormalizedMonthStr(task.originalDeadline);
      const completedCount = task.subtasks.filter(st => st.completed).length;
      const remainingCount = task.subtasks.length - completedCount;

      if (!monthMap[mStr]) {
        monthMap[mStr] = { completed: 0, remaining: 0 };
      }
      monthMap[mStr].completed += completedCount;
      monthMap[mStr].remaining += remainingCount;
    });

    const sortedMonths = Object.keys(monthMap).sort();
    return sortedMonths.map(mStr => {
      const monthData = monthMap[mStr];
      const total = monthData.completed + monthData.remaining;
      const rate = total > 0 ? Math.round((monthData.completed / total) * 100) : 0;

      return {
        name: getMonthLabel(mStr),
        fullMonth: mStr,
        Completed: monthData.completed,
        Remaining: monthData.remaining,
        'Completion Rate (%)': rate
      };
    });
  };

  // Get active selected metrics for Daywise
  const getSelectedDayMetrics = () => {
    const dayTasks = tasks.filter(t => getNormalizedDate(t.originalDeadline) === selectedDayStr);
    let totalSubs = 0;
    let completedSubs = 0;
    
    dayTasks.forEach(t => {
      t.subtasks.forEach(st => {
        totalSubs++;
        if (st.completed) completedSubs++;
      });
    });

    const rate = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;
    return {
      totalTasks: dayTasks.length,
      completedTasks: dayTasks.filter(t => t.status === 'completed' || (t.subtasks.length > 0 && t.subtasks.every(st => st.completed))).length,
      totalSubs,
      completedSubs,
      rate
    };
  };

  // Get active selected metrics for Monthwise
  const getSelectedMonthMetrics = () => {
    const monthTasks = tasks.filter(t => getNormalizedMonthStr(t.originalDeadline) === selectedMonthStr);
    let totalSubs = 0;
    let completedSubs = 0;
    
    monthTasks.forEach(t => {
      t.subtasks.forEach(st => {
        totalSubs++;
        if (st.completed) completedSubs++;
      });
    });

    const rate = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;
    return {
      totalTasks: monthTasks.length,
      completedTasks: monthTasks.filter(t => t.status === 'completed' || (t.subtasks.length > 0 && t.subtasks.every(st => st.completed))).length,
      totalSubs,
      completedSubs,
      rate
    };
  };

  const dayMetrics = getSelectedDayMetrics();
  const monthMetrics = getSelectedMonthMetrics();

  const handleToggleView = (mode: 'daywise' | 'monthwise') => {
    setViewMode(mode);
    if (onAddSystemLog) {
      onAddSystemLog(`Analytics card switched to ${mode.toUpperCase()} timeline scope.`, 'info');
    }
  };

  const chartData = viewMode === 'daywise' ? getDaywiseChartData() : getMonthwiseChartData();
  const isEmptyState = tasks.length === 0;

  return (
    <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col" id="course-analytics-panel">
      
      {/* Header with Switch Controllers */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800/60 pb-4 mb-5">
        <div>
          <h2 className="text-sm font-mono font-medium text-neutral-300 flex items-center gap-1.5 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            Course Progress & Productivity Trends
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Daywise and monthwise molecular subtask completion ratios and trends.
          </p>
        </div>

        {/* Navigation toggles */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800/60">
            <button
              type="button"
              id="analytics-toggle-daywise"
              onClick={() => handleToggleView('daywise')}
              className={`px-3.5 py-1 text-[11px] font-mono rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'daywise'
                  ? 'bg-amber-500 text-neutral-950 font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Daywise
            </button>
            <button
              type="button"
              id="analytics-toggle-monthwise"
              onClick={() => handleToggleView('monthwise')}
              className={`px-3.5 py-1 text-[11px] font-mono rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'monthwise'
                  ? 'bg-amber-500 text-neutral-950 font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Monthwise
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
              showHelp 
                ? 'bg-neutral-800 border-neutral-700 text-amber-400' 
                : 'bg-neutral-950 border-neutral-800/80 text-neutral-400 hover:text-neutral-300'
            }`}
            title="Help Panel"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Help Overlay Panel */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-5 bg-neutral-950/40 rounded-xl border border-neutral-800/60"
            id="analytics-help-overlay-panel"
          >
            <div className="p-4 space-y-3 text-xs leading-relaxed text-neutral-400">
              <h3 className="font-mono text-xs font-semibold uppercase text-neutral-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Adaptive Analytics Engine
              </h3>
              <p>
                We parse your syllabus files, extract scheduled deliverables, and track completion indices dynamically.
              </p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li><span className="text-amber-400 font-medium">Gold Area</span>: Volume of checklist actions completed.</li>
                <li><span className="text-neutral-500 font-medium">Gray Area</span>: Leftover syllabus workload.</li>
                <li><span className="text-emerald-400 font-medium">Trend Curve (%)</span>: Real-time efficiency velocity. Selecting specific days/months below reveals precise animated completion sliders.</li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daywise or Monthwise Context Specific Interactive Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-6">
        
        {/* Daywise interactive slider / card */}
        {viewMode === 'daywise' ? (
          <div className="md:col-span-6 bg-neutral-950/50 border border-neutral-850 rounded-xl p-4 flex flex-col justify-between" id="daywise-completed-tasks-card">
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" />
                Select Specific Calendar Day
              </span>
              
              <div className="flex items-center justify-between gap-2 bg-neutral-900/60 p-2 rounded-lg border border-neutral-850">
                <button
                  type="button"
                  onClick={() => {
                    const current = new Date(selectedDayStr + 'T00:00:00');
                    current.setDate(current.getDate() - 1);
                    const y = current.getFullYear();
                    const m = (current.getMonth() + 1).toString().padStart(2, '0');
                    const d = current.getDate().toString().padStart(2, '0');
                    setSelectedDayStr(`${y}-${m}-${d}`);
                  }}
                  className="p-1 rounded bg-neutral-955 text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-sans text-xs font-bold text-neutral-200">
                  {new Date(selectedDayStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const current = new Date(selectedDayStr + 'T00:00:00');
                    current.setDate(current.getDate() + 1);
                    const y = current.getFullYear();
                    const m = (current.getMonth() + 1).toString().padStart(2, '0');
                    const d = current.getDate().toString().padStart(2, '0');
                    setSelectedDayStr(`${y}-${m}-${d}`);
                  }}
                  className="p-1 rounded bg-neutral-955 text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Dynamic Animated Daywise Progress Bar */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-mono font-medium text-neutral-400">Day Completed Tasks:</span>
                <span className="text-sm font-bold font-mono text-amber-400">{dayMetrics.rate}%</span>
              </div>
              
              {/* Animated Progress Bar Frame */}
              <div className="h-2.5 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${dayMetrics.rate}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                <span>{dayMetrics.completedSubs} of {dayMetrics.totalSubs} subtasks finished</span>
                <span>{dayMetrics.totalTasks} milestones due</span>
              </div>
            </div>
          </div>
        ) : (
          /* Monthwise interactive slider / card */
          <div className="md:col-span-6 bg-neutral-950/50 border border-neutral-850 rounded-xl p-4 flex flex-col justify-between" id="monthwise-completed-tasks-card">
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-500" />
                Select Academic Month
              </span>
              
              <div className="flex items-center justify-between gap-2 bg-neutral-900/60 p-2 rounded-lg border border-neutral-850">
                <button
                  type="button"
                  onClick={() => {
                    const [year, m] = selectedMonthStr.split('-');
                    let prevMonth = Number(m) - 1;
                    let prevYear = Number(year);
                    if (prevMonth === 0) {
                      prevMonth = 12;
                      prevYear -= 1;
                    }
                    setSelectedMonthStr(`${prevYear}-${prevMonth.toString().padStart(2, '0')}`);
                  }}
                  className="p-1 rounded bg-neutral-955 text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-sans text-xs font-bold text-neutral-200">
                  {getMonthLabel(selectedMonthStr)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const [year, m] = selectedMonthStr.split('-');
                    let nextMonth = Number(m) + 1;
                    let nextYear = Number(year);
                    if (nextMonth === 13) {
                      nextMonth = 1;
                      nextYear += 1;
                    }
                    setSelectedMonthStr(`${nextYear}-${nextMonth.toString().padStart(2, '0')}`);
                  }}
                  className="p-1 rounded bg-neutral-955 text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Dynamic Animated Monthwise Progress Bar */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-mono font-medium text-neutral-400">Month Completed Tasks:</span>
                <span className="text-sm font-bold font-mono text-emerald-400">{monthMetrics.rate}%</span>
              </div>
              
              {/* Animated Progress Bar Frame */}
              <div className="h-2.5 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${monthMetrics.rate}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                <span>{monthMetrics.completedSubs} of {monthMetrics.totalSubs} subtasks finished</span>
                <span>{monthMetrics.totalTasks} milestones scheduled</span>
              </div>
            </div>
          </div>
        )}

        {/* Universal Cumulative Stats Summary Column */}
        <div className="md:col-span-6 grid grid-cols-2 gap-3.5">
          <div className="bg-neutral-950/30 border border-neutral-850 p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[9px] font-mono text-neutral-500 uppercase">Cumulative Index</span>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-xl font-bold font-sans text-amber-500">{completionRate}%</span>
              <span className="text-[9px] font-mono text-neutral-600">rate</span>
            </div>
            <div className="w-full bg-neutral-900 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${completionRate}%` }} />
            </div>
          </div>

          <div className="bg-neutral-950/30 border border-neutral-850 p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[9px] font-mono text-neutral-500 uppercase">Total Subtasks</span>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-xl font-bold font-sans text-neutral-200">{remainingSubtasks}</span>
              <span className="text-[9px] font-mono text-neutral-600">left</span>
            </div>
            <span className="text-[8px] font-mono text-neutral-600">Out of {totalSubtasks} total steps</span>
          </div>
        </div>
      </div>

      {/* Main Chart Section */}
      <div className="relative bg-neutral-950/20 border border-neutral-850 rounded-2xl p-4 h-[280px] w-full" id="analytics-recharts-container">
        
        {isEmptyState && (
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-[2.5px] rounded-2xl flex flex-col items-center justify-center text-center p-6 z-20">
            <AlertCircle className="w-8 h-8 text-amber-500/80 mb-2 animate-bounce" />
            <h4 className="font-sans font-medium text-xs text-neutral-200">Demonstration Analytics Active</h4>
            <p className="font-sans text-[11px] text-neutral-400 max-w-sm mt-1">
              Import a syllabus document or schedule assignments to display active completion rates!
            </p>
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
          >
            <defs>
              <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={viewMode === 'daywise' ? '#f59e0b' : '#10b981'} stopOpacity={0.25}/>
                <stop offset="95%" stopColor={viewMode === 'daywise' ? '#f59e0b' : '#10b981'} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="remainingGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#525252" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#525252" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
            
            <XAxis 
              dataKey="name" 
              stroke="#525252"
              fontSize={10}
              tickLine={false}
              dy={10}
            />
            
            <YAxis 
              yAxisId="left"
              stroke="#525252"
              fontSize={10}
              tickLine={false}
              allowDecimals={false}
              dx={-5}
            />
            
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#525252"
              fontSize={10}
              tickLine={false}
              domain={[0, 100]}
              tickFormatter={(val) => `${val}%`}
              dx={5}
            />
            
            <Tooltip
              contentStyle={{
                backgroundColor: '#171717',
                borderColor: '#404040',
                borderRadius: '12px',
                fontSize: '11px',
                fontFamily: 'sans-serif'
              }}
              labelStyle={{ color: '#a3a3a3', fontWeight: 'bold', marginBottom: '4px' }}
            />
            
            <Legend 
              wrapperStyle={{ fontSize: '10px', paddingTop: '15px' }}
              iconSize={8}
            />

            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="Completed" 
              stackId="1" 
              stroke={viewMode === 'daywise' ? '#f59e0b' : '#10b981'} 
              fillOpacity={1} 
              fill="url(#completedGrad)" 
              strokeWidth={1.5}
            />
            
            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="Remaining" 
              stackId="1" 
              stroke="#737373" 
              fillOpacity={1} 
              fill="url(#remainingGrad)" 
              strokeWidth={1.5}
            />

            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="Completion Rate (%)" 
              stroke={viewMode === 'daywise' ? '#f59e0b' : '#10b981'} 
              strokeWidth={2}
              dot={{ stroke: viewMode === 'daywise' ? '#f59e0b' : '#10b981', strokeWidth: 2, r: 3, fill: '#0a0a0a' }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
