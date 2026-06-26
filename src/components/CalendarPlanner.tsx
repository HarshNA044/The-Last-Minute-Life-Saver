import React from 'react';
import { Calendar, Plus, RefreshCw, AlertOctagon, HelpCircle, HeartPulse, Check, Trash2, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarBlock, Task } from '../types';

interface CalendarPlannerProps {
  blocks: CalendarBlock[];
  tasks: Task[];
  onToggleBlockComplete: (id: string) => void;
  onClearBlocks: () => void;
  onAutoSchedule: () => void;
  onAddManualBlock: (title: string, startHour: number, endHour: number, type: 'focus' | 'break' | 'class') => void;
}

export default function CalendarPlanner({
  blocks,
  tasks,
  onToggleBlockComplete,
  onClearBlocks,
  onAutoSchedule,
  onAddManualBlock
}: CalendarPlannerProps) {
  // Simple form for manual adding
  const [newTitle, setNewTitle] = React.useState("");
  const [newType, setNewType] = React.useState<'focus' | 'break' | 'class'>('focus');
  const [startHour, setStartHour] = React.useState(14); // 2 PM default
  const [endHour, setEndHour] = React.useState(15);

  // Math to calculate stress level
  const incompleteSubtasks = tasks.flatMap(t => t.subtasks).filter(st => !st.completed);
  const scheduledFocusMinutes = blocks
    .filter(b => b.type === 'focus')
    .reduce((acc, b) => {
      const diffMs = new Date(b.end).getTime() - new Date(b.start).getTime();
      return acc + (diffMs / (1000 * 60));
    }, 0);

  const neededMinutes = incompleteSubtasks.reduce((sum, st) => sum + st.estimatedMinutes, 0);
  
  let riskStatus: { label: string; color: string; desc: string; progress: number } = {
    label: "Fully Scheduled",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    desc: "All of your study subtasks have scheduled focus slots on your calendar.",
    progress: 10
  };

  if (neededMinutes > 0 && scheduledFocusMinutes === 0) {
    riskStatus = {
      label: "Action Required",
      color: "text-rose-400 bg-rose-500/10 border-rose-500/20 animate-pulse",
      desc: "Warning: You have assignments listed, but haven't scheduled any study blocks yet!",
      progress: 95
    };
  } else if (neededMinutes > scheduledFocusMinutes) {
    riskStatus = {
      label: "More Study Time Needed",
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      desc: `You have about ${Math.round(neededMinutes / 60)}h of work, but only ${Math.round(scheduledFocusMinutes / 60)}h scheduled. Click "Optimize Now" below to fill the gaps!`,
      progress: 60
    };
  } else if (neededMinutes > 0) {
    riskStatus = {
      label: "Schedule Fully Optimized",
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      desc: "You have plenty of study sessions scheduled to cover all your assignments!",
      progress: 25
    };
  }

  // Sorted list of blocks for neat list rendering
  const sortedBlocks = [...blocks].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const handleManualForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddManualBlock(newTitle, startHour, endHour, newType);
    setNewTitle("");
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 md:p-6 relative" id="calendar-planner-container">
      {/* HUD Stress Meter */}
      <div className="mb-5 p-4 rounded-xl border border-neutral-800/80 bg-neutral-950/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-rose-500" />
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Study Preparation Status
            </h3>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${riskStatus.color}`}>
            {riskStatus.label}
          </span>
        </div>
        
        <p className="text-xs text-neutral-400 font-sans leading-relaxed">
          {riskStatus.desc}
        </p>

        {/* Dynamic bar */}
        <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden mt-3.5 border border-neutral-800/30">
          <motion.div
            className={`h-full ${
              riskStatus.progress > 70 
                ? 'bg-rose-500' 
                : riskStatus.progress > 40 
                ? 'bg-amber-500' 
                : 'bg-emerald-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${riskStatus.progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between items-center text-[9px] font-mono text-neutral-500 mt-2">
          <span>0h Slotted</span>
          <span>Target: {Math.ceil(neededMinutes / 60)}h required work</span>
        </div>
      </div>

      {/* Primary Calendar Bar */}
      <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-neutral-800/50">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-emerald-400" />
          <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-neutral-300">
            Your Daily Study Schedule
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClearBlocks}
            className="text-[10px] font-mono border border-neutral-800/80 hover:border-rose-500/30 hover:text-rose-400 text-neutral-400 bg-neutral-950 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Reset Slots
          </button>
          <button
            onClick={onAutoSchedule}
            className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '4s' }} />
            Optimize Now
          </button>
        </div>
      </div>

      {/* Grid view of hours */}
      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar text-xs">
        {sortedBlocks.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-neutral-800/80 rounded-xl bg-neutral-950/20">
            <Calendar className="w-7 h-7 text-neutral-600 mx-auto mb-2" />
            <p className="text-neutral-400 font-sans text-xs">No focus intervals planned for today.</p>
            <p className="text-[10px] text-neutral-500 mt-1">Click &quot;Optimize Now&quot; above to find target slots.</p>
          </div>
        ) : (
          sortedBlocks.map((block) => {
            const startStr = new Date(block.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const endStr = new Date(block.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const colors = {
              focus: {
                bg: "bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20 text-neutral-200",
                badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                iconColor: "text-amber-500"
              },
              break: {
                bg: "bg-sky-500/5 hover:bg-sky-500/10 border-sky-500/15 text-neutral-300",
                badge: "bg-sky-500/10 text-sky-400 border-sky-500/20",
                iconColor: "text-sky-400"
              },
              class: {
                bg: "bg-violet-500/5 hover:bg-violet-500/10 border-violet-500/15 text-neutral-300",
                badge: "bg-violet-500/10 text-violet-400 border-violet-500/20",
                iconColor: "text-violet-400"
              },
              sleep: {
                bg: "bg-indigo-500/5 hover:bg-indigo-500/10 border-indigo-500/10 text-neutral-400",
                badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/10",
                iconColor: "text-indigo-400"
              },
              personal: {
                bg: "bg-neutral-950 hover:bg-neutral-900 border-neutral-800 text-neutral-400",
                badge: "bg-neutral-900 text-neutral-400 border-neutral-800",
                iconColor: "text-neutral-400"
              }
            }[block.type] || {
              bg: "bg-neutral-950 border-neutral-800 text-neutral-300",
              badge: "bg-neutral-900 text-neutral-400 border-neutral-800",
              iconColor: "text-neutral-400"
            };

            return (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className={`py-3 px-4 rounded-xl border flex items-center justify-between gap-4 transition-all duration-150 relative overflow-hidden ${colors.bg} ${
                  block.completed ? 'opacity-50 line-through' : ''
                }`}
              >
                {/* Visual Glow to make it stand out */}
                {!block.completed && block.type === 'focus' && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                )}

                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-[10px] text-neutral-500 shrink-0 select-none">
                    {startStr} - {endStr}
                  </span>
                  
                  <div className="min-w-0">
                    <h4 className="font-sans font-medium text-xs text-neutral-200 select-all truncate">
                      {block.title}
                    </h4>
                    <span className={`inline-block font-mono text-[9px] px-1.5 py-0.2 rounded mt-1 border ${colors.badge}`}>
                      {block.type.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2shrink-0">
                  <button
                    onClick={() => onToggleBlockComplete(block.id)}
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                      block.completed 
                        ? 'bg-emerald-500 border-emerald-500 text-neutral-950' 
                        : 'bg-neutral-950 hover:bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-400'
                    }`}
                    title={block.completed ? "Mark incomplete" : "Mark Focus Session Complete"}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Manual block addition segment */}
      <form onSubmit={handleManualForm} className="mt-5 pt-4 border-t border-neutral-800/80 grid grid-cols-1 sm:grid-cols-12 gap-3.5">
        <div className="sm:col-span-5">
          <input
            type="text"
            required
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add offline math study step..."
            className="w-full h-8 px-3 rounded-lg bg-neutral-950 border border-neutral-800/70 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-700"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={newType}
            onChange={(e: any) => setNewType(e.target.value)}
            className="w-full h-8 px-2.5 rounded-lg bg-neutral-950 border border-neutral-800/70 text-[10px] font-sans text-neutral-300 opacity-90 focus:outline-none"
          >
            <option value="focus">🔥 Focus Work</option>
            <option value="break">☕ Relaxation Break</option>
            <option value="class">🎓 Active Lecture</option>
          </select>
        </div>

        <div className="sm:col-span-2 flex items-center gap-1.5 text-[10px] font-semibold text-neutral-500">
          <span className="shrink-0">Time:</span>
          <select
            value={startHour}
            onChange={(e) => {
              const val = Number(e.target.value);
              setStartHour(val);
              setEndHour(val + 1);
            }}
            className="w-full bg-neutral-950 border border-neutral-800/60 p-1 text-[10px] rounded text-neutral-300"
          >
            {Array.from({ length: 15 }, (_, i) => i + 8).map((hour) => (
              <option key={hour} value={hour}>
                {hour}:00
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            className="w-full h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 border border-neutral-700/50 hover:text-white transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </form>
    </div>
  );
}
