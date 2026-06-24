import React from 'react';
import { Shield, Radio, Activity, Zap, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  autopilot: boolean;
  setAutopilot: (val: boolean) => void;
  statusText: string;
  isProcessing: boolean;
}

export default function Header({ autopilot, setAutopilot, statusText, isProcessing }: HeaderProps) {
  return (
    <header className="relative w-full border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md py-4 px-6 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 z-40">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 shadow-lg shadow-neutral-950 overflow-hidden">
          <motion.div
            animate={{
              scale: autopilot ? 1.08 : 1,
              rotate: isProcessing ? 360 : 0,
            }}
            transition={{
              scale: { type: "spring", stiffness: 150, damping: 10 },
              rotate: isProcessing ? { ease: "linear", duration: 6, repeat: Infinity } : { duration: 0.5 }
            }}
            className="text-amber-500 absolute"
          >
            <Shield className="w-5 h-5 stroke-[1.8]" />
          </motion.div>
          <motion.div
            animate={{
              opacity: autopilot ? 0.6 : 0.2,
            }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
            className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 to-transparent rounded-xl"
          />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-sans font-bold tracking-tight text-neutral-100 text-lg leading-tight">
              The Last-Minute Life Saver
            </h1>
            <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500" />
          </div>
          <p className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest">
            Proactive AI Co-Pilot
          </p>
        </div>
      </div>

      {/* Dynamic Status HUD */}
      <div className="flex-1 max-w-md w-full sm:w-auto px-4 py-2 rounded-xl bg-neutral-900/40 border border-neutral-900 flex items-center gap-2.5 shadow-inner">
        <div className="relative flex h-2 w-2">
          {autopilot && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${autopilot ? 'bg-emerald-500' : 'bg-neutral-600'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider flex items-center gap-1">
            {autopilot ? (
              <>
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                Companion Autopilot Active
              </>
            ) : (
              <>
                <Activity className="w-3 h-3 text-neutral-500" />
                Autopilot Off
              </>
            )}
          </p>
          <div className="h-5 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={statusText}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -12, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="font-mono text-xs text-neutral-300 truncate font-medium"
              >
                {statusText}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Control Switch */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 bg-neutral-900 px-3.5 py-1.5 rounded-xl border border-neutral-800/80">
          <span className="font-sans text-xs text-neutral-400">Autopilot</span>
          <button
            onClick={() => setAutopilot(!autopilot)}
            role="switch"
            aria-checked={autopilot}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-1 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              autopilot ? 'bg-emerald-500' : 'bg-neutral-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                autopilot ? 'translate-x-4' : 'translate-x-0.5'
              } mt-0.5`}
            />
          </button>
        </div>
      </div>
    </header>
  );
}
