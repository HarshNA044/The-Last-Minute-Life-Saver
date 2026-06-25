import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  AlertTriangle, 
  Play, 
  Plus, 
  Trash2, 
  Tag, 
  Percent,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckSquare,
  Sparkles,
  Layers,
  XCircle,
  TrendingUp,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, TaskPriority, TaskStatus, SubTask } from '../types';

interface DeadlinesListProps {
  tasks: Task[];
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onStartFocus: (taskId: string, subtask?: SubTask) => void;
}

export default function DeadlinesList({
  tasks,
  onToggleSubtask,
  onAddTask,
  onDeleteTask,
  onStartFocus
}: DeadlinesListProps) {
  // Navigation & View Mode states
  const [viewMode, setViewMode] = useState<'daywise' | 'monthwise'>('daywise');
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-06-25'); // Default anchored to the system context date
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(5); // June is 5 (0-indexed)
  
  // Checklist UI States
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Filter States
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Manual Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [hours, setHours] = useState(3);
  const [deadline, setDeadline] = useState("2026-06-25");
  const [category, setCategory] = useState("Academics");
  const [rawSubtasks, setRawSubtasks] = useState("Draft first outline\nComplete implementation tests");

  // Normalized date parser helper
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

  // Extract unique categories from tasks for filter dropdown
  const uniqueCategories = ['all', ...Array.from(new Set(tasks.map(t => t.category).filter(Boolean)))];

  // Map of priority badges colors
  const getPriorityBadge = (p: TaskPriority) => {
    const presets = {
      low: "border-neutral-850 text-neutral-400 bg-neutral-950",
      medium: "border-sky-500/20 text-sky-400 bg-sky-500/5",
      high: "border-amber-500/20 text-amber-400 bg-amber-500/5",
      critical: "border-rose-500/30 text-rose-400 bg-rose-500/5 animate-pulse"
    };
    return presets[p] || presets.medium;
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Generate calendar cells (42 cells to support neat grids)
  const getCalendarDays = (year: number, month: number) => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday = 0
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];
    
    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${(prevMonth + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
      days.push({ dateStr, dayNum, isCurrentMonth: false });
    }
    
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      days.push({ dateStr, dayNum: i, isCurrentMonth: true });
    }
    
    // Next month padding to make full 6-row grid (42 days)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${(nextMonth + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      days.push({ dateStr, dayNum: i, isCurrentMonth: false });
    }
    
    return days;
  };

  // Slider week days centered around selectedDateStr
  const getWeekDays = (centerDateStr: string) => {
    const center = new Date(centerDateStr + 'T00:00:00');
    const days = [];
    // Show 4 days before and 5 days after center (10 day timeline)
    for (let i = -4; i <= 5; i++) {
      const d = new Date(center);
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      days.push({
        dateStr,
        dayNum: d.getDate(),
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        monthName: d.toLocaleDateString('en-US', { month: 'short' })
      });
    }
    return days;
  };

  // Helper to filter tasks based on active criteria
  const getFilteredTasks = (taskList: Task[], dateConstraintStr?: string) => {
    return taskList.filter(task => {
      // 1. Date constraint check
      if (dateConstraintStr) {
        if (getNormalizedDate(task.originalDeadline) !== dateConstraintStr) {
          return false;
        }
      }

      // 2. Priority check
      if (filterPriority !== 'all' && task.priority !== filterPriority) {
        return false;
      }

      // 3. Status check
      if (filterStatus !== 'all' && task.status !== filterStatus) {
        return false;
      }

      // 4. Category check
      if (filterCategory !== 'all' && task.category !== filterCategory) {
        return false;
      }

      return true;
    });
  };

  // Stats generators for active selections
  const getStatsForDate = (dateStr: string) => {
    const dayTasks = tasks.filter(t => getNormalizedDate(t.originalDeadline) === dateStr);
    const filteredDayTasks = getFilteredTasks(tasks, dateStr);
    
    const total = dayTasks.length;
    const completed = dayTasks.filter(t => t.status === 'completed' || (t.subtasks.length > 0 && t.subtasks.every(st => st.completed))).length;
    
    // Subtasks counters
    let totalSubs = 0;
    let completedSubs = 0;
    dayTasks.forEach(t => {
      t.subtasks.forEach(st => {
        totalSubs++;
        if (st.completed) completedSubs++;
      });
    });

    return {
      total,
      completed,
      filteredCount: filteredDayTasks.length,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      totalSubs,
      completedSubs,
      subtaskRate: totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0
    };
  };

  // Get cumulative stats for currently displayed month
  const getStatsForMonth = (year: number, month: number) => {
    const prefix = `${year}-${(month + 1).toString().padStart(2, '0')}`;
    const monthTasks = tasks.filter(t => getNormalizedDate(t.originalDeadline).startsWith(prefix));
    
    const total = monthTasks.length;
    const completed = monthTasks.filter(t => t.status === 'completed' || (t.subtasks.length > 0 && t.subtasks.every(st => st.completed))).length;

    let totalSubs = 0;
    let completedSubs = 0;
    monthTasks.forEach(t => {
      t.subtasks.forEach(st => {
        totalSubs++;
        if (st.completed) completedSubs++;
      });
    });

    return {
      total,
      completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      totalSubs,
      completedSubs,
      subtaskRate: totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0
    };
  };

  const currentMonthStats = getStatsForMonth(currentYear, currentMonth);
  const activeDayStats = getStatsForDate(selectedDateStr);

  // Sorting of the active list
  const activeDayTasks = getFilteredTasks(tasks, selectedDateStr);
  const priorityWeights: Record<TaskPriority, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  };
  const sortedActiveDayTasks = [...activeDayTasks].sort((a, b) => priorityWeights[b.priority] - priorityWeights[a.priority]);

  // Submit manual task form handler
  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Distribute estimated minutes into subtasks
    const subs: SubTask[] = rawSubtasks
      .split('\n')
      .filter(line => line.trim())
      .map((line) => ({
        id: `manual-sub-${Math.random()}`,
        title: line.trim(),
        estimatedMinutes: Math.round((hours * 60) / 3),
        completed: false
      }));

    const newTask: Task = {
      id: `manual-task-${Date.now()}`,
      title,
      description: description || "Manually designated calendar assignment.",
      originalDeadline: deadline,
      priority,
      estimatedHours: hours,
      status: "backlog",
      category,
      subtasks: subs
    };

    onAddTask(newTask);
    
    // Auto-select the newly added task date so they can verify instantly on the calendar
    setSelectedDateStr(deadline);
    
    // Parse and set the calendar month to show the new deadline
    const parsedDate = new Date(deadline + 'T00:00:00');
    if (!isNaN(parsedDate.getTime())) {
      setCurrentYear(parsedDate.getFullYear());
      setCurrentMonth(parsedDate.getMonth());
    }

    // Reset Form
    setTitle("");
    setDescription("");
    setRawSubtasks("Draft first outline\nComplete implementation tests");
    setShowAddForm(false);
  };

  // Reset all filters easily
  const resetFilters = () => {
    setFilterPriority('all');
    setFilterStatus('all');
    setFilterCategory('all');
  };

  const isFiltersActive = filterPriority !== 'all' || filterStatus !== 'all' || filterCategory !== 'all';

  return (
    <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-4 md:p-6 shadow-xl flex flex-col gap-6" id="calendar-deadlines-container">
      
      {/* Title block with Manual creation toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800/60 pb-4">
        <div>
          <h2 className="text-sm font-mono font-medium text-neutral-400 flex items-center gap-1.5 uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-amber-500" />
            Syllabus Calendar & Assignment Board
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Visualize your workloads daywise and monthwise. Check off subtasks and monitor real-time completion.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-xs font-sans text-amber-400 hover:text-amber-300 bg-neutral-950 border border-neutral-800 hover:border-amber-500/30 px-3 py-1.5 rounded-xl transition-all duration-150 flex items-center gap-1 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          {showAddForm ? "Show Active Calendar" : "Add Task to Calendar"}
        </button>
      </div>

      {/* Expandable Manual Creation Form */}
      <AnimatePresence mode="wait">
        {showAddForm && (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleAddTaskSubmit}
            className="space-y-4 p-4 rounded-xl bg-neutral-950/40 border border-neutral-800/80"
          >
            <h3 className="text-xs font-mono font-semibold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Schedule New Assignment Milestone
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono text-neutral-500 uppercase mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chemistry Homework, Physics Quiz"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-neutral-700 font-sans"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-neutral-500 uppercase mb-1">Target Due Date</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-neutral-700 font-sans"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-mono text-neutral-500 uppercase mb-1">Subject Area / Category</label>
                <input
                  type="text"
                  placeholder="e.g. Academics, Personal"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-neutral-700 font-sans"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-neutral-500 uppercase mb-1">Estimated Hours</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-neutral-500 uppercase mb-1">Urgency Priority</label>
                <select
                  value={priority}
                  onChange={(e: any) => setPriority(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="critical">CRITICAL PRIORITY</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-neutral-500 uppercase mb-1">Short Description</label>
              <input
                type="text"
                placeholder="Key assignment outcomes or study goals..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-neutral-700"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-neutral-500 uppercase mb-1">
                Subtasks / Steps (One per line)
              </label>
              <textarea
                value={rawSubtasks}
                onChange={(e) => setRawSubtasks(e.target.value)}
                placeholder="Step 1: Read materials&#10;Step 2: Draft answers"
                rows={3}
                className="w-full text-xs p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-neutral-700 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3.5 py-1.5 text-xs font-sans border border-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-sans bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400 font-medium shadow-md transition-colors cursor-pointer"
              >
                Schedule Task
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Grid Controller, View Switcher & Filters */}
      {!showAddForm && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 bg-neutral-950 rounded-2xl border border-neutral-800/60">
            {/* Daywise / Monthwise toggle buttons */}
            <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('daywise')}
                className={`px-4 py-1.5 text-xs font-mono font-medium rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'daywise'
                    ? 'bg-amber-500 text-neutral-950 shadow-md font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Daywise View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('monthwise')}
                className={`px-4 py-1.5 text-xs font-mono font-medium rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'monthwise'
                    ? 'bg-amber-500 text-neutral-950 shadow-md font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Monthwise View
              </button>
            </div>

            {/* Quick stats label */}
            <div className="flex items-center gap-2 px-3">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-neutral-500" />
                Filters
              </span>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-2 py-0.5 text-[9px] font-mono rounded border transition-colors cursor-pointer ${
                  showFilters 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                    : 'bg-neutral-900 border-neutral-850 text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {showFilters ? 'Hide Panel' : 'Show Panel'}
              </button>
            </div>
          </div>

          {/* Interactive Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-neutral-950/40 rounded-xl border border-neutral-850/80 p-3 space-y-3"
                id="tasks-filter-drawer"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-[9px] font-mono text-neutral-500 uppercase mb-1 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-neutral-500" />
                      Category Filter
                    </label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full text-xs p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300 focus:outline-none"
                    >
                      {uniqueCategories.map(cat => (
                        <option key={cat} value={cat}>
                          {cat === 'all' ? 'All Categories' : cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority Filter */}
                  <div>
                    <label className="block text-[9px] font-mono text-neutral-500 uppercase mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-neutral-500" />
                      Priority Level
                    </label>
                    <select
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value)}
                      className="w-full text-xs p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300 focus:outline-none"
                    >
                      <option value="all">All Priorities</option>
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="critical">Critical Only</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-[9px] font-mono text-neutral-500 uppercase mb-1 flex items-center gap-1">
                      <CheckSquare className="w-3 h-3 text-neutral-500" />
                      Workload Status
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full text-xs p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300 focus:outline-none"
                    >
                      <option value="all">All Statuses</option>
                      <option value="backlog">Backlog</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="working">Working</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                {isFiltersActive && (
                  <div className="flex items-center justify-between border-t border-neutral-850 pt-2 text-[10px] font-mono">
                    <span className="text-amber-500 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5" />
                      Active filters are screening calendar dates & completion rates.
                    </span>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-neutral-500 hover:text-neutral-300 transition-colors underline flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle className="w-3 h-3" />
                      Clear Filters
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* DAYWISE CALENDAR TIMELINE SELECTOR */}
          {viewMode === 'daywise' && (
            <div className="space-y-4" id="daywise-selector-block">
              {/* Horizontal Timeline bar */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const current = new Date(selectedDateStr + 'T00:00:00');
                    current.setDate(current.getDate() - 1);
                    const y = current.getFullYear();
                    const m = (current.getMonth() + 1).toString().padStart(2, '0');
                    const d = current.getDate().toString().padStart(2, '0');
                    setSelectedDateStr(`${y}-${m}-${d}`);
                  }}
                  className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200 cursor-pointer"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Horizontal timeline cards container */}
                <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-800 flex gap-1.5 py-1 scroll-smooth">
                  {getWeekDays(selectedDateStr).map((day) => {
                    const isSelected = day.dateStr === selectedDateStr;
                    const stats = getStatsForDate(day.dateStr);
                    const hasTasks = stats.total > 0;
                    const allDone = hasTasks && stats.total === stats.completed;

                    return (
                      <button
                        key={day.dateStr}
                        type="button"
                        onClick={() => setSelectedDateStr(day.dateStr)}
                        className={`flex-1 min-w-[56px] py-2.5 px-1.5 rounded-xl border flex flex-col items-center justify-between gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-amber-500 border-amber-500 text-neutral-950 shadow-md shadow-amber-500/15"
                            : "bg-neutral-950 border-neutral-850 text-neutral-400 hover:border-neutral-700/60 hover:bg-neutral-900"
                        }`}
                      >
                        <span className={`text-[9px] font-mono uppercase tracking-wide ${isSelected ? 'text-neutral-900 font-semibold' : 'text-neutral-500'}`}>
                          {day.dayName}
                        </span>
                        <span className={`text-sm font-bold font-sans ${isSelected ? 'text-neutral-950' : 'text-neutral-200'}`}>
                          {day.dayNum}
                        </span>
                        <span className={`text-[8px] font-mono tracking-tighter ${isSelected ? 'text-neutral-900' : 'text-neutral-500'}`}>
                          {day.monthName}
                        </span>

                        {/* Interactive Task count / Completion display indicator */}
                        {hasTasks ? (
                          <span className={`inline-flex items-center justify-center text-[8px] font-mono font-bold w-4 h-4 rounded-full mt-0.5 border ${
                            isSelected 
                              ? allDone 
                                ? 'bg-neutral-950 border-neutral-950 text-emerald-400' 
                                : 'bg-neutral-950 border-neutral-950 text-amber-500'
                              : allDone
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                          }`}>
                            {stats.completed}/{stats.total}
                          </span>
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-800 mt-1.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const current = new Date(selectedDateStr + 'T00:00:00');
                    current.setDate(current.getDate() + 1);
                    const y = current.getFullYear();
                    const m = (current.getMonth() + 1).toString().padStart(2, '0');
                    const d = current.getDate().toString().padStart(2, '0');
                    setSelectedDateStr(`${y}-${m}-${d}`);
                  }}
                  className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200 cursor-pointer"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Daywise Completion Stats Summary Bar */}
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-850 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="font-mono text-xs text-neutral-400">
                    Daywise Completion:
                  </span>
                  <span className="font-sans text-xs font-bold text-neutral-200">
                    {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                
                <div className="flex-1 max-w-sm w-full">
                  <div className="flex justify-between text-[10px] font-mono text-neutral-500 mb-1">
                    <span>Task clearance: {activeDayStats.completed} of {activeDayStats.total} done</span>
                    <span>{activeDayStats.completionRate}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${activeDayStats.completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MONTHWISE GRID SELECTOR */}
          {viewMode === 'monthwise' && (
            <div className="space-y-4 animate-fadeIn" id="monthwise-selector-block">
              {/* Header Navigator */}
              <div className="flex items-center justify-between bg-neutral-950 p-3 rounded-xl border border-neutral-850">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold font-sans text-neutral-200">
                    {new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 rounded bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentYear(2026);
                      setCurrentMonth(5);
                      setSelectedDateStr('2026-06-25');
                    }}
                    className="px-2 py-0.5 text-[9px] font-mono bg-neutral-900 border border-neutral-850 text-neutral-500 hover:text-neutral-300 rounded cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 rounded bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Traditional 7-column Calendar Grid */}
              <div className="bg-neutral-950 border border-neutral-850 rounded-2xl p-3">
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <span key={i} className="text-[10px] font-mono text-neutral-600 uppercase py-1">
                      {day}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {getCalendarDays(currentYear, currentMonth).map((cell, idx) => {
                    const isSelected = cell.dateStr === selectedDateStr;
                    const stats = getStatsForDate(cell.dateStr);
                    const hasTasks = stats.total > 0;
                    const allDone = hasTasks && stats.total === stats.completed;

                    // Filtered tasks on this day for colored dots
                    const dayFiltered = getFilteredTasks(tasks, cell.dateStr);

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedDateStr(cell.dateStr)}
                        className={`h-11 rounded-lg border flex flex-col items-center justify-between p-1 transition-all cursor-pointer relative overflow-hidden ${
                          !cell.isCurrentMonth ? 'opacity-25' : ''
                        } ${
                          isSelected
                            ? 'bg-amber-500 border-amber-500 text-neutral-950 shadow-sm shadow-amber-500/10'
                            : 'bg-neutral-900/40 border-neutral-850/60 hover:bg-neutral-900 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-neutral-950' : 'text-neutral-200'}`}>
                          {cell.dayNum}
                        </span>

                        {/* Workload Dot representation inside Month cells */}
                        <div className="flex gap-0.5 justify-center items-center h-2.5 w-full">
                          {dayFiltered.slice(0, 3).map((t, idxDot) => {
                            let dotColor = 'bg-sky-400';
                            if (t.priority === 'critical') dotColor = 'bg-rose-500';
                            else if (t.priority === 'high') dotColor = 'bg-amber-500';
                            else if (t.status === 'completed' || (t.subtasks.length > 0 && t.subtasks.every(st => st.completed))) dotColor = 'bg-emerald-400';

                            return (
                              <span 
                                key={idxDot} 
                                className={`w-1 h-1 rounded-full ${isSelected ? 'bg-neutral-950' : dotColor}`} 
                              />
                            );
                          })}
                          {dayFiltered.length > 3 && (
                            <span className={`text-[7px] font-mono leading-none ${isSelected ? 'text-neutral-950' : 'text-neutral-500'}`}>
                              +
                            </span>
                          )}
                        </div>

                        {/* Top corner completion stamp */}
                        {allDone && (
                          <div className={`absolute top-0.5 right-0.5 rounded-full p-px ${isSelected ? 'text-neutral-950' : 'text-emerald-400'}`}>
                            <CheckCircle2 className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Monthwise Completion Stats Panel */}
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-850 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-mono text-neutral-400 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Monthwise Progress Summary:
                  </h4>
                  <p className="text-[10px] text-neutral-500 mt-0.5 uppercase tracking-wide">
                    {new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Complete Stats
                  </p>
                </div>
                
                <div className="flex-1 max-w-sm w-full">
                  <div className="flex justify-between text-[10px] font-mono text-neutral-500 mb-1">
                    <span>Task completion: {currentMonthStats.completed} of {currentMonthStats.total} done</span>
                    <span>{currentMonthStats.completionRate}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-300"
                      style={{ width: `${currentMonthStats.completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FILTERED TASKS CHECKLIST (DUE ON CURRENTLY SELECTED DATE) */}
      {!showAddForm && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between border-t border-neutral-800/40 pt-4" id="selected-day-details-title">
            <div className="flex items-center gap-1.5 text-neutral-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider">
                Assignments Due on {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-950 rounded-full text-neutral-500">
                {sortedActiveDayTasks.length} found
              </span>
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {sortedActiveDayTasks.length === 0 ? (
              <motion.div
                key="empty-day-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-10 border border-dashed border-neutral-800/80 rounded-2xl bg-neutral-950/20"
              >
                <CheckCircle2 className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
                <h4 className="font-sans text-xs text-neutral-400 font-medium">No deadlines mapped on this day.</h4>
                <p className="text-[10px] text-neutral-500 mt-1 max-w-sm mx-auto pl-4 pr-4">
                  Everything cleared! Tap on another calendar day or use the &quot;Manually Add Task&quot; drawer above to schedule additional courses.
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4" id="tasks-checklists-group">
                {sortedActiveDayTasks.map((task) => {
                  const totalSubs = task.subtasks.length;
                  const completedSubs = task.subtasks.filter(s => s.completed).length;
                  const pct = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;
                  const isExpanded = expandedTasks[task.id] ?? true;

                  const toggleExpand = (id: string) => {
                    setExpandedTasks(prev => ({ ...prev, [id]: !prev[id] }));
                  };

                  return (
                    <motion.div
                      key={task.id}
                      layoutId={`task-card-${task.id}`}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-neutral-950/85 border border-neutral-850 rounded-xl overflow-hidden shadow-md"
                    >
                      {/* Interactive Card Header */}
                      <div
                        className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-neutral-900/20"
                        onClick={() => toggleExpand(task.id)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-[9px] font-mono border px-2 py-0.5 rounded-full uppercase tracking-wider ${getPriorityBadge(task.priority)}`}>
                              {task.priority}
                            </span>
                            {task.category && (
                              <span className="text-[9px] font-mono text-neutral-500 flex items-center gap-1 uppercase bg-neutral-900 px-2 py-0.5 rounded-full">
                                <Tag className="w-2.5 h-2.5" />
                                {task.category}
                              </span>
                            )}
                            <span className="text-[9px] font-mono text-neutral-500 flex items-center gap-1 bg-neutral-900 px-2 py-0.5 rounded-full capitalize">
                              {task.status}
                            </span>
                          </div>

                          <h3 className="font-sans font-bold text-sm text-neutral-100 leading-snug">
                            {task.title}
                          </h3>

                          {task.description && (
                            <p className="text-xs text-neutral-500 font-sans mt-1 line-clamp-1">
                              {task.description}
                            </p>
                          )}
                        </div>

                        {/* Task Progress Percent Visuals */}
                        <div className="flex items-center gap-4 shrink-0 mt-2 sm:mt-0">
                          {/* Main Circular Progress Ring with embedded text */}
                          <div className="h-14 w-14 rounded-full bg-neutral-900/60 border border-neutral-850/50 flex items-center justify-center relative shadow-inner">
                            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                              {/* Background track */}
                              <circle
                                cx="28"
                                cy="28"
                                r="24"
                                className="stroke-neutral-800/80 fill-none"
                                strokeWidth="3"
                              />
                              {/* Progress indicator */}
                              <motion.circle
                                cx="28"
                                cy="28"
                                r="24"
                                className="stroke-amber-500 fill-none"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray={150.8}
                                initial={{ strokeDashoffset: 150.8 }}
                                animate={{ strokeDashoffset: 150.8 - (150.8 * pct) / 100 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                              />
                            </svg>
                            {/* Inner embedded labels */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center select-none leading-none">
                              <span className="text-xs font-bold text-neutral-100 font-mono">
                                {pct}%
                              </span>
                              <span className="text-[8px] font-semibold text-neutral-500 font-mono mt-0.5">
                                {completedSubs}/{totalSubs}
                              </span>
                            </div>
                          </div>

                          <button className="text-neutral-500 hover:text-neutral-300 transition-colors">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Subtask List */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="border-t border-neutral-850 bg-neutral-950/20 px-4 pb-4"
                          >
                            <div className="pt-3.5 space-y-2.5">
                              <h4 className="text-[9px] font-mono uppercase text-neutral-500 tracking-wider mb-2">
                                Daily Study Tasks Checklist
                              </h4>
                              {task.subtasks.map((sub) => (
                                <div
                                  key={sub.id}
                                  className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-neutral-950/50 hover:bg-neutral-950 border border-neutral-850 hover:border-neutral-850 transition-all duration-150 animate-fadeIn"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleSubtask(task.id, sub.id);
                                      }}
                                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                        sub.completed
                                          ? "bg-amber-500 border-amber-500 text-neutral-950"
                                          : "border-neutral-800 hover:border-neutral-700 bg-neutral-950"
                                      }`}
                                    >
                                      {sub.completed && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                                    </button>
                                    <span className={`text-xs truncate font-sans text-neutral-300 ${sub.completed ? 'line-through text-neutral-600' : ''}`}>
                                      {sub.title}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-[10px] font-mono text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                                      ⏱️ {sub.estimatedMinutes}m
                                    </span>
                                    
                                    <button
                                      onClick={() => onStartFocus(task.id, sub)}
                                      disabled={sub.completed}
                                      className={`px-2.5 py-1 text-[10px] rounded-lg font-medium flex items-center gap-1 transition-all ${
                                        sub.completed 
                                          ? "bg-neutral-900 text-neutral-600 cursor-not-allowed" 
                                          : "bg-amber-500/10 hover:bg-amber-500 hover:text-neutral-950 border border-amber-500/15 text-amber-400 cursor-pointer"
                                      }`}
                                    >
                                      <Play className="w-2.5 h-2.5 fill-current" />
                                      Focus
                                    </button>
                                  </div>
                                </div>
                              ))}

                              {/* Task Actions Block */}
                              <div className="flex justify-between items-center pt-2.5 border-t border-neutral-850">
                                <p className="text-[10px] font-mono text-neutral-500">
                                  Estimated time effort: ~{task.estimatedHours} hours total
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteTask(task.id);
                                  }}
                                  className="text-[10px] font-mono text-rose-500 flex items-center gap-1.5 hover:text-rose-400 hover:underline transition-all cursor-pointer"
                                  title="Remove assignment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Discard Task
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
