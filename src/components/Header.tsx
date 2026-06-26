import React, { useState } from 'react';
import { Shield, Radio, Activity, Zap, Sparkles, Sun, Moon, LogOut, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  autopilot: boolean;
  setAutopilot: (val: boolean) => void;
  statusText: string;
  isProcessing: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  user: any;
  onLogin: () => void;
  onLogout: () => void;
}

export default function Header({ autopilot, setAutopilot, statusText, isProcessing, theme, onToggleTheme, user, onLogin, onLogout }: HeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const isDark = theme === 'dark';

  // Click outside to close signout button
  React.useEffect(() => {
    if (!showProfileMenu) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#profile-container')) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [showProfileMenu]);

  const headerClass = `relative w-full border-b py-4 px-6 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 z-50 transition-all duration-150 ${
    isDark 
      ? 'bg-neutral-950/80 border-neutral-850 backdrop-blur-md text-neutral-100' 
      : 'bg-white/80 border-slate-200/80 backdrop-blur-md shadow-sm text-slate-800'
  }`;

  const logoBgClass = `relative flex items-center justify-center w-10 h-10 rounded-xl border shadow-lg overflow-hidden ${
    isDark 
      ? 'bg-neutral-900 border-neutral-800 shadow-neutral-950/40' 
      : 'bg-slate-50 border-slate-200 shadow-slate-100'
  }`;

  const titleClass = `font-sans font-bold tracking-tight text-lg leading-tight ${
    isDark ? 'text-neutral-100' : 'text-slate-900'
  }`;

  const subtitleClass = `font-mono text-[10px] uppercase tracking-widest ${
    isDark ? 'text-neutral-500' : 'text-slate-400'
  }`;

  return (
    <header className={headerClass}>
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3">
        <div className={logoBgClass}>
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
            <h1 className={titleClass}>
              The Last-Minute Life Saver
            </h1>
            <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500" />
          </div>
          <p className={subtitleClass}>
            Smart Deadline Planner & AI Companion
          </p>
        </div>
      </div>

      {/* Control Switch */}
      <div className="flex items-center gap-3">
        {/* Improved Theme Toggle Button (Circular) */}
        <button
          onClick={onToggleTheme}
          type="button"
          className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 cursor-pointer overflow-hidden shadow-sm active:scale-90 ${
            isDark
              ? 'bg-neutral-900 border-neutral-800 text-amber-400 hover:text-amber-300 hover:border-neutral-700 hover:bg-neutral-850 hover:shadow-md hover:shadow-amber-500/10'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-950 hover:border-slate-300 hover:bg-slate-100/80 hover:shadow-md hover:shadow-slate-200/50'
          }`}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          id="theme-toggle-button"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={theme}
              initial={{ y: -15, rotate: -90, opacity: 0 }}
              animate={{ y: 0, rotate: 0, opacity: 1 }}
              exit={{ y: 15, rotate: 90, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="flex items-center justify-center"
            >
              {isDark ? (
                <Sun className="w-4 h-4 fill-amber-500/10 stroke-[2.2]" />
              ) : (
                <Moon className="w-4 h-4 fill-indigo-500/5 stroke-[2.2] text-indigo-600" />
              )}
            </motion.div>
          </AnimatePresence>
        </button>

        {/* User profile with inline transition option */}
        {user && (
          <div className="relative" id="profile-container">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border relative shadow-sm transition-all duration-200 active:scale-95 cursor-pointer shrink-0 ${
                isDark 
                  ? 'bg-amber-500/10 text-amber-400 border-neutral-800 hover:border-amber-500/50 hover:bg-amber-500/15' 
                  : 'bg-amber-500/15 text-amber-700 border-slate-200 hover:border-amber-500/50 hover:bg-amber-500/20'
              }`}
              id="profile-logo-button"
              title={user.displayName || 'User profile'}
              aria-label="Toggle sign out"
            >
              {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
              <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 ring-1 ring-emerald-500/35 ${
                isDark ? 'border-neutral-950' : 'border-white'
              }`} />
            </button>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className={`absolute right-0 mt-2 w-36 rounded-xl border p-1 shadow-xl z-50 focus:outline-none backdrop-blur-md ${
                    isDark
                      ? 'bg-neutral-900/95 border-neutral-800 text-neutral-100 shadow-neutral-950/80'
                      : 'bg-white/95 border-slate-200/85 text-slate-800 shadow-slate-200/40'
                  }`}
                >
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors text-left ${
                      isDark
                        ? 'text-neutral-300 hover:text-rose-400 hover:bg-neutral-800/60'
                        : 'text-slate-600 hover:text-rose-600 hover:bg-slate-50'
                    }`}
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500 stroke-[2.2]" />
                    <span>Sign Out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </header>
  );
}
