import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Award, CheckCircle, Volume2, ShieldAlert, Sparkles, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SubTask } from '../types';

interface ActiveTimerProps {
  activeSubtask?: { taskId: string; sub: SubTask } | null;
  onFinishSubtask: (taskId: string, subtaskId: string) => void;
  onAddSystemLog: (text: string, type: 'info' | 'optimizing' | 'tracking' | 'scheduled' | 'warning' | 'alert') => void;
}

export default function ActiveTimer({
  activeSubtask,
  onFinishSubtask,
  onAddSystemLog
}: ActiveTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(1500); // 25 minutes default
  const [isActive, setIsActive] = useState(false);
  const [completedStreaks, setCompletedStreaks] = useState(2); // Start with 2 completed default
  const [ambientPreset, setAmbientPreset] = useState<'none' | 'lofi' | 'rain' | 'brown'>('none');

  useEffect(() => {
    if (activeSubtask) {
      // Convert estimated minutes to seconds or set to Pomodoro length
      const mins = activeSubtask.sub.estimatedMinutes || 25;
      setSecondsLeft(mins * 60);
      setIsActive(true);
      onAddSystemLog(`Timer initialized for: "${activeSubtask.sub.title}" (${mins}m)`, 'info');
    }
  }, [activeSubtask?.sub?.id, onAddSystemLog]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      handleCycleFinished();
    }
    return () => clearInterval(interval);
  }, [isActive, secondsLeft]);

  const handleCycleFinished = () => {
    setCompletedStreaks((prev) => prev + 1);
    onAddSystemLog(`Focus Block Completed! Great job avoiding procrastination.`, 'scheduled');
    
    if (activeSubtask) {
      onFinishSubtask(activeSubtask.taskId, activeSubtask.sub.id);
    } else {
      onAddSystemLog(`Pomodoro interval fully cleared. Stand up, stretch, and grab a coffee!`, 'info');
    }
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
    onAddSystemLog(isActive ? "Focus timer paused." : "Focus timer resumed. Get to state of flow!", "tracking");
  };

  const resetTimer = () => {
    setIsActive(false);
    setSecondsLeft(activeSubtask ? activeSubtask.sub.estimatedMinutes * 60 : 1500);
    onAddSystemLog("Focus session timer reset to initial block constraints.", "warning");
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPercent = () => {
    const total = activeSubtask ? activeSubtask.sub.estimatedMinutes * 60 : 1500;
    return Math.round(((total - secondsLeft) / total) * 100);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col items-center justify-between h-[480px] relative overflow-hidden" id="focus-timer-section">
      {/* Background radial highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Segment Header */}
      <div className="w-full flex items-center justify-between border-b border-neutral-800/60 pb-3 z-10">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-amber-500 animate-pulse" />
          <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-neutral-300">
            Neuro-Focus Deep Timer
          </h3>
        </div>
        <div className="flex items-center gap-1.5 bg-neutral-950/80 border border-neutral-800/40 px-2 py-0.5 rounded-full select-none">
          <Award className="w-3 h-3 text-amber-400" />
          <span className="font-mono text-[9px] text-neutral-400">Streak: {completedStreaks}</span>
        </div>
      </div>

      {/* Target Task Display Area */}
      <div className="text-center my-2 max-w-full z-10">
        <AnimatePresence mode="wait">
          {activeSubtask ? (
            <motion.div
              key={activeSubtask.sub.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="space-y-1"
            >
              <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono rounded-full uppercase tracking-wider">
                Active Study Block
              </span>
              <h4 className="font-sans font-bold text-neutral-200 text-sm truncate mt-1 max-w-[240px] mx-auto">
                {activeSubtask.sub.title}
              </h4>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-1"
            >
              <span className="px-2.5 py-0.5 bg-neutral-950 border border-neutral-800 text-neutral-500 text-[10px] font-mono rounded-full uppercase tracking-wider">
                Idle Sync Mode
              </span>
              <h4 className="font-sans text-neutral-400 text-xs mt-1">
                Select &quot;Focus&quot; on any subtask checklist item to bind target scope.
              </h4>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modular Clock Visualizer */}
      <div className="relative w-44 h-44 flex items-center justify-center my-3 z-10">
        {/* SVG Circular Dial */}
        <svg className="absolute w-full h-full transform -rotate-90">
          <circle
            cx="88"
            cy="88"
            r="80"
            className="stroke-neutral-950 fill-none"
            strokeWidth="6"
          />
          <motion.circle
            cx="88"
            cy="88"
            r="80"
            className="stroke-amber-500 fill-none"
            strokeWidth="6"
            strokeDasharray={502} // 2 * pi * 80 approx
            strokeLinecap="round"
            initial={{ strokeDashoffset: 502 }}
            animate={{ strokeDashoffset: 502 - (502 * (100 - formatPercent())) / 100 }}
            transition={{ duration: 0.5, ease: "linear" }}
          />
        </svg>

        {/* Dynamic Countdown Representation */}
        <div className="text-center select-all">
          <motion.span
            animate={{ scale: isActive ? 1.01 : 1 }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", type: "tween" }}
            className="font-mono text-3xl font-bold text-neutral-100 tracking-tight block"
          >
            {formatTime(secondsLeft)}
          </motion.span>
          <span className="font-mono text-[9px] text-neutral-500 uppercase tracking-widest mt-1 block">
            {formatPercent()}% Completed
          </span>
        </div>
      </div>

      {/* Ambient Audio Presets Simulator UI (Does not actual block since browser is simple, we simulate beautifully to fulfill visual fidelity) */}
      <div className="w-full flex flex-col gap-1.5 bg-neutral-950/40 border border-neutral-800/40 rounded-xl p-3 z-10">
        <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider flex items-center gap-1">
          <Volume2 className="w-3 w-3 text-neutral-500" />
          Aural Focus Synthesis Engine
        </label>
        <div className="grid grid-cols-4 gap-1.5 text-[9px] font-mono text-neutral-400">
          {(['none', 'rain', 'lofi', 'brown'] as const).map((sound) => (
            <button
              key={sound}
              onClick={() => {
                setAmbientPreset(sound);
                onAddSystemLog(`Acoustic synthesis recalibrated to: [${sound.toUpperCase()}]`, 'info');
              }}
              className={`py-1 rounded border transition-all truncate uppercase cursor-pointer ${
                ambientPreset === sound 
                  ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold' 
                  : 'bg-neutral-950 border-neutral-900 text-neutral-500 hover:text-neutral-400'
              }`}
            >
              {sound === 'none' ? 'MUTE' : sound}
            </button>
          ))}
        </div>
      </div>

      {/* Countdown Controls */}
      <div className="w-full flex gap-3.5 mt-2 z-10">
        <button
          onClick={resetTimer}
          className="flex-1 h-10 rounded-xl bg-neutral-950 hover:bg-neutral-900 border border-neutral-850 text-neutral-400 hover:text-neutral-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
          title="Reset timer state"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="font-sans text-xs">Reset</span>
        </button>

        <button
          onClick={toggleTimer}
          className={`flex-[2] h-10 rounded-xl flex items-center justify-center gap-2 font-sans font-semibold text-xs transition-all cursor-pointer ${
            isActive
              ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/50 shadow-inner'
              : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/10'
          }`}
        >
          {isActive ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              Pause Session
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              Begin Focus Session
            </>
          )}
        </button>
      </div>
    </div>
  );
}
