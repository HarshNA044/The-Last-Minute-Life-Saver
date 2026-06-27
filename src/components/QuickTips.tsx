import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, X, Sparkles, ChevronRight, Zap, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import { Task } from '../types';

interface QuickTipsProps {
  tasks: Task[];
  onAddSystemLog?: (text: string, type: 'info' | 'optimizing' | 'tracking' | 'scheduled' | 'warning' | 'alert') => void;
}

interface Tip {
  id: string;
  title: string;
  content: string;
  type: 'general' | 'focus' | 'mindset' | 'strategy';
}

const GENERAL_TIPS: Tip[] = [
  {
    id: 'g1',
    title: 'The Pomodoro Power Play',
    content: 'Work intently for 25 minutes, then take a strict 5-minute screen-free break. This sustains high cognitive capacity over long sessions.',
    type: 'focus'
  },
  {
    id: 'g2',
    title: 'Eat the Frog First',
    content: 'Tackle your heaviest, most dreaded assignment at the absolute start of your day. Everything else feels effortless once the frog is eaten.',
    type: 'strategy'
  },
  {
    id: 'g3',
    title: 'Feynman Learning Method',
    content: 'Explain core syllabus concepts as if teaching a 10-year-old child. This immediately exposes knowledge gaps and speeds up exam prep.',
    type: 'strategy'
  },
  {
    id: 'g4',
    title: 'Durable Spaced Repetition',
    content: 'Review key exam concepts on intervals of 1, 3, and 7 days. This intercepts the forgetting curve and cements memories permanently.',
    type: 'general'
  },
  {
    id: 'g5',
    title: 'Time Blocking Strategy',
    content: 'Assign explicit, time-boxed blocks for active tasks on your daily schedule instead of using generic lists. This blocks procrastination.',
    type: 'strategy'
  },
  {
    id: 'g6',
    title: 'The Eisenhower Priority Grid',
    content: 'Filter workload by Urgent vs Important. Spend 80% of your energy on Important but Non-Urgent tasks to secure deadlines early.',
    type: 'strategy'
  },
  {
    id: 'g7',
    title: 'Beat the Zeigarnik Effect',
    content: 'Unfinished tasks occupy active memory. Writing down exactly when and how you will complete a task immediately frees up mental bandwidth.',
    type: 'mindset'
  },
  {
    id: 'g8',
    title: 'Ultradian Rhythm Alignment',
    content: 'Human focus naturally peaks and drops in 90-minute waves. Sync deep focus blocks with your peak daily energy levels.',
    type: 'general'
  }
];

export default function QuickTips({ tasks, onAddSystemLog }: QuickTipsProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [currentTip, setCurrentTip] = useState<Tip | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [isDynamic, setIsDynamic] = useState(false);

  // Analyze active tasks to generate custom dynamic tips
  const getDynamicTips = (): Tip[] => {
    const dynamicList: Tip[] = [];

    // Filter active (incomplete) tasks
    const activeTasks = tasks.filter(t => t.status !== 'completed' && t.subtasks.some(st => !st.completed));
    const criticalTasks = activeTasks.filter(t => t.priority === 'critical');
    const highTasks = activeTasks.filter(t => t.priority === 'high');

    // 1. Critical Tasks Advice
    if (criticalTasks.length > 0) {
      const target = criticalTasks[0];
      const incompleteCount = target.subtasks.filter(st => !st.completed).length;
      dynamicList.push({
        id: `dyn-critical-${target.id}`,
        title: 'Critical Mission Sprint',
        content: `Your highest priority assignment is "${target.title}". Don't multitask—tackle its ${incompleteCount} remaining subtasks first.`,
        type: 'focus'
      });
    }

    // 2. High Tasks Advice
    if (highTasks.length > 0) {
      const target = highTasks[0];
      dynamicList.push({
        id: `dyn-high-${target.id}`,
        title: 'High Impact Focus',
        content: `Allocate your next 45-minute block exclusively to "${target.title}". Group similar small steps together to build rhythm.`,
        type: 'strategy'
      });
    }

    // 3. Subtasks overwhelm
    const complexTask = activeTasks.find(t => t.subtasks.length > 4);
    if (complexTask) {
      const incomplete = complexTask.subtasks.filter(st => !st.completed);
      if (incomplete.length > 0) {
        dynamicList.push({
          id: `dyn-complex-${complexTask.id}`,
          title: 'Deconstruct to Conquer',
          content: `"${complexTask.title}" has many subtasks. Check off just "${incomplete[0].title}" to trigger a dopamine loop.`,
          type: 'strategy'
        });
      }
    }

    // 4. Backlog tasks advice
    const backlogTasks = activeTasks.filter(t => t.status === 'backlog');
    if (backlogTasks.length > 1) {
      dynamicList.push({
        id: 'dyn-backlog-cleanup',
        title: 'Defeat Backlog Inertia',
        content: `You have ${backlogTasks.length} tasks sitting in your backlog. Move one to "Working" mode now and schedule a 30-minute deep block.`,
        type: 'general'
      });
    }

    return dynamicList;
  };

  // Compile full set of recommendations (Dynamic prioritized, then general)
  const getCombinedTips = (): Tip[] => {
    const dynamic = getDynamicTips();
    return [...dynamic, ...GENERAL_TIPS];
  };

  // Rotate tips periodically
  useEffect(() => {
    const combined = getCombinedTips();
    if (combined.length === 0) return;

    // Boundary check index
    const index = tipIndex % combined.length;
    const selected = combined[index];
    setCurrentTip(selected);
    setIsDynamic(selected.id.startsWith('dyn-'));
  }, [tasks, tipIndex]);

  // Set interval to periodically switch tips (e.g. every 45 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(prev => prev + 1);
    }, 45000); // 45s periodic update

    return () => clearInterval(interval);
  }, []);

  const handleNextTip = () => {
    setTipIndex(prev => prev + 1);
    if (onAddSystemLog) {
      onAddSystemLog("Time management engine rotated to next advisory tip.", "info");
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    if (onAddSystemLog) {
      onAddSystemLog("Time management advisor minimized. Restore anytime via lightbulb icon.", "warning");
    }
  };

  return (
    <div className="w-full" id="quick-tips-system-container">
      <AnimatePresence mode="wait">
        {isVisible ? (
          <motion.div
            key="tips-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 border border-purple-500/30 shadow-[0_0_15px_rgba(147,51,234,0.08)] rounded-2xl p-4 relative overflow-hidden flex flex-col justify-between"
            id="quick-tips-panel"
          >
            {/* Background glowing aura */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-800/60 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-purple-400 shrink-0" />
                <h3 className="font-sans text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-1.5">
                  Time Management Advisor
                  {isDynamic && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded-md text-[9px] font-mono text-purple-300 font-normal uppercase animate-pulse">
                      <Sparkles className="w-2.5 h-2.5" />
                      Smart Sync
                    </span>
                  )}
                </h3>
              </div>
              <button
                type="button"
                id="close-tips-button"
                onClick={handleDismiss}
                className="text-neutral-500 hover:text-neutral-300 transition-colors p-1 rounded-lg hover:bg-neutral-800/60 cursor-pointer"
                title="Dismiss Tips"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Body Recommendation content */}
            <div className="min-h-[84px] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                {currentTip && (
                  <motion.div
                    key={currentTip.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-1.5"
                    id={`tip-content-${currentTip.id}`}
                  >
                    <h4 className="text-xs font-sans font-medium text-neutral-200 flex items-center gap-1.5">
                      {currentTip.type === 'focus' && <Zap className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                      {currentTip.type === 'strategy' && <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      {currentTip.type === 'mindset' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                      {currentTip.type === 'general' && <Lightbulb className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
                      {currentTip.title}
                    </h4>
                    <p className="text-[11px] leading-relaxed text-neutral-400 font-sans">
                      {currentTip.content}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between border-t border-neutral-800/40 pt-2.5 mt-3">
              <span className="text-[9px] font-mono text-neutral-600">
                Rotates dynamically based on workload
              </span>
              <button
                type="button"
                id="next-tip-button"
                onClick={handleNextTip}
                className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-purple-400 hover:text-purple-300 transition-colors cursor-pointer hover:bg-purple-500/5 px-2 py-0.5 rounded-md"
              >
                Next Tip
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ) : (
          /* Small elegant indicator to restore the tips system */
          <motion.div
            key="restore-tips"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-between bg-neutral-900/60 border border-neutral-800/40 rounded-xl px-4 py-2.5"
            id="restore-tips-panel"
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-neutral-500 animate-pulse" />
              <span className="text-[11px] font-sans text-neutral-400">Time Management Advisor is minimized</span>
            </div>
            <button
              type="button"
              id="restore-tips-button"
              onClick={() => setIsVisible(true)}
              className="text-[10px] font-mono font-medium text-purple-400 hover:text-purple-300 transition-colors cursor-pointer hover:underline"
            >
              Restore tips
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
