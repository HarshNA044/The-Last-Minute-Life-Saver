import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Clock, AlertTriangle, Play, HelpCircle, Plus, Trash2, Tag, Percent } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, TaskPriority, SubTask } from '../types';

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
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [sortBy, setSortBy] = useState<'deadline' | 'priority' | 'status'>('deadline');

  // Priority weights for sorting (Critical/High first)
  const priorityWeights: Record<TaskPriority, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  };

  // Status weights for sorting (Active first, completed last)
  const statusWeights: Record<string, number> = {
    working: 4,
    scheduled: 3,
    backlog: 2,
    completed: 1
  };

  // Compute sorted list of tasks based on selected option
  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortBy === 'deadline') {
      const dateA = a.originalDeadline ? Date.parse(a.originalDeadline) : Infinity;
      const dateB = b.originalDeadline ? Date.parse(b.originalDeadline) : Infinity;
      const valA = isNaN(dateA) ? Infinity : dateA;
      const valB = isNaN(dateB) ? Infinity : dateB;
      return valA - valB;
    } else if (sortBy === 'priority') {
      const weightA = priorityWeights[a.priority] || 0;
      const weightB = priorityWeights[b.priority] || 0;
      return weightB - weightA;
    } else if (sortBy === 'status') {
      const weightA = statusWeights[a.status] || 0;
      const weightB = statusWeights[b.status] || 0;
      return weightB - weightA;
    }
    return 0;
  });

  // Manual Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [hours, setHours] = useState(3);
  const [deadline, setDeadline] = useState("2026-06-25");
  const [category, setCategory] = useState("Academics");
  const [rawSubtasks, setRawSubtasks] = useState("Draft first model outline\nSynthesize final test codes\nProofread double-check checks");

  const toggleExpand = (id: string) => {
    setExpandedTasks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getPriorityBadge = (p: TaskPriority) => {
    const presets = {
      low: "border-neutral-800 text-neutral-400 bg-neutral-950",
      medium: "border-sky-500/20 text-sky-400 bg-sky-500/5",
      high: "border-amber-500/20 text-amber-400 bg-amber-500/5",
      critical: "border-rose-500/30 text-rose-400 bg-rose-500/5 animate-pulse"
    };
    return presets[p] || presets.medium;
  };

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Build subtask nodes
    const subs: SubTask[] = rawSubtasks
      .split('\n')
      .filter(line => line.trim())
      .map((line, idx) => ({
        id: Math.random().toString(),
        title: line.trim(),
        estimatedMinutes: Math.round((hours * 60) / 3), // distribute estimated time
        completed: false
      }));

    const newTask: Task = {
      id: Math.random().toString(),
      title,
      description: description || "Manually introduced assignment checklist step.",
      originalDeadline: deadline,
      priority,
      estimatedHours: hours,
      status: "backlog",
      category,
      subtasks: subs
    };

    onAddTask(newTask);
    
    // Clear Form
    setTitle("");
    setDescription("");
    setRawSubtasks("Draft first outline\nComplete implementation tests");
    setShowAddForm(false);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 md:p-6 shadow-xl" id="deadlines-list-container">
      <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-neutral-800/60">
        <div>
          <h2 className="text-sm font-mono font-medium text-neutral-400 flex items-center gap-1.5 uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-amber-500" />
            AI Extracted Task Board
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Check off molecular sub-tasks or command custom pomodoro intervals.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-xs font-sans text-amber-400 hover:text-amber-300 bg-neutral-950 border border-neutral-800 hover:border-amber-500/30 px-3 py-1.5 rounded-xl transition-all duration-150 flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          {showAddForm ? "Show Active Board" : "Manually Add Task"}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {showAddForm ? (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleAddTaskSubmit}
            className="space-y-4 p-4 rounded-xl bg-neutral-950/40 border border-neutral-800/80"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono text-neutral-500 uppercase mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="CS Essay, Physics Lab 2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-neutral-700 font-sans"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-neutral-500 uppercase mb-1">Due Date</label>
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
                <label className="block text-[10px] font-mono text-neutral-500 uppercase mb-1">Subject Area</label>
                <input
                  type="text"
                  placeholder="Engineering, Design"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-neutral-700 font-sans"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-neutral-500 uppercase mb-1">Total Effort Hours</label>
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
                  <option value="critical">CRITICAL DANGER</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-neutral-500 uppercase mb-1">Short Context / Goals</label>
              <input
                type="text"
                placeholder="Brief guidelines or instructions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-neutral-700"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-neutral-500 uppercase mb-1">
                Molecular Subtasks (One per line)
              </label>
              <textarea
                value={rawSubtasks}
                onChange={(e) => setRawSubtasks(e.target.value)}
                placeholder="Step 1: Focus outline&#10;Step 2: Complete first section"
                rows={3}
                className="w-full text-xs p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-neutral-700 font-mono"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-xs px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg font-semibold cursor-pointer"
              >
                Add Board Task
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3.5"
          >
            {tasks.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-neutral-800/80 rounded-2xl bg-neutral-950/20">
                <AlertTriangle className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                <h4 className="font-sans text-xs text-neutral-400 font-medium">No deadlines recorded yet.</h4>
                <p className="text-[10px] text-neutral-500 mt-1">Paste a syllabus template or click manual creation to construct the cockpit!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Elegant Sorting Header Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-950/40 rounded-xl border border-neutral-800/40" id="task-board-sorting-header">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                      Sorting Criteria:
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      id="sort-btn-deadline"
                      onClick={() => setSortBy('deadline')}
                      className={`px-3 py-1 text-[11px] font-sans font-medium rounded-lg transition-all cursor-pointer ${
                        sortBy === 'deadline'
                          ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/10'
                          : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 bg-neutral-950 border border-neutral-800/50'
                      }`}
                    >
                      Deadline (Soonest)
                    </button>
                    <button
                      type="button"
                      id="sort-btn-priority"
                      onClick={() => setSortBy('priority')}
                      className={`px-3 py-1 text-[11px] font-sans font-medium rounded-lg transition-all cursor-pointer ${
                        sortBy === 'priority'
                          ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/10'
                          : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 bg-neutral-950 border border-neutral-800/50'
                      }`}
                    >
                      Priority (Critical First)
                    </button>
                    <button
                      type="button"
                      id="sort-btn-status"
                      onClick={() => setSortBy('status')}
                      className={`px-3 py-1 text-[11px] font-sans font-medium rounded-lg transition-all cursor-pointer ${
                        sortBy === 'status'
                          ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/10'
                          : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 bg-neutral-950 border border-neutral-800/50'
                      }`}
                    >
                      Status
                    </button>
                  </div>
                </div>

                {sortedTasks.map((task) => {
                const totalSubs = task.subtasks.length;
                const completedSubs = task.subtasks.filter(s => s.completed).length;
                const pct = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;
                const isExpanded = expandedTasks[task.id] ?? true; // Default expanded for visual presence

                return (
                  <div
                    key={task.id}
                    className="bg-neutral-950/80 border border-neutral-800/80 hover:border-neutral-700/60 rounded-xl overflow-hidden transition-all duration-200 shadow-md"
                  >
                    {/* Header line */}
                    <div
                      className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer select-none"
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
                          <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-1 ml-auto sm:ml-0">
                            <Clock className="w-3.5 h-3.5 text-neutral-500" />
                            Due: {task.originalDeadline}
                          </span>
                        </div>

                        <h3 className="font-sans font-bold text-sm text-neutral-100 select-all leading-snug">
                          {task.title}
                        </h3>

                        {task.description && (
                          <p className="text-xs text-neutral-500 font-sans mt-1 line-clamp-1">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Completion status circles */}
                      <div className="flex items-center gap-4 shrink-0 mt-2 sm:mt-0">
                        <div className="text-right">
                          <p className="text-xs font-semibold text-neutral-300 font-sans">
                            {pct}% Completed
                          </p>
                          <p className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest mt-0.5">
                            {completedSubs} of {totalSubs} sub-tasks Done
                          </p>
                        </div>

                        {/* Miniature status circle graph */}
                        <div className="h-9 w-9 rounded-full bg-neutral-900 border border-neutral-850 flex items-center justify-center relative">
                          <Percent className="w-2.5 h-2.5 text-neutral-600" />
                          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                            <circle
                              cx="18"
                              cy="18"
                              r="16"
                              className="stroke-neutral-800 fill-none"
                              strokeWidth="2"
                            />
                            <motion.circle
                              cx="18"
                              cy="18"
                              r="16"
                              className="stroke-amber-400 fill-none"
                              strokeWidth="2"
                              strokeDasharray={100}
                              initial={{ strokeDashoffset: 100 }}
                              animate={{ strokeDashoffset: 100 - pct }}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                            />
                          </svg>
                        </div>

                        <button className="text-neutral-500 hover:text-neutral-300 transition-colors">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable checklists & milestones */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-neutral-900 bg-neutral-950/20 px-4 pb-4"
                        >
                          <div className="pt-3.5 space-y-2.5">
                            <h4 className="text-[9px] font-mono uppercase text-neutral-500 tracking-wider mb-2">
                              Systematic Progress Milestones
                            </h4>
                            {task.subtasks.map((sub) => (
                              <div
                                key={sub.id}
                                className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-neutral-950/50 hover:bg-neutral-950 border border-neutral-900 hover:border-neutral-850 transition-all duration-150"
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

                            <div className="flex justify-between items-center pt-2.5 border-t border-neutral-900">
                              <p className="text-[10px] font-mono text-neutral-500">
                                Effort calculation: ~{task.estimatedHours} hours total
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
                  </div>
                );
              })}
            </div>
          )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
