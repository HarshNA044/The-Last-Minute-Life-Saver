import React, { useState } from 'react';
import { Shield, Radio, Activity, Zap, Sparkles, Sun, Moon, LogOut, ChevronDown, Bell, BellOff } from 'lucide-react';
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
  notificationPermission?: 'default' | 'granted' | 'denied';
  onRequestNotificationPermission?: () => void;
}

export default function Header({ 
  autopilot, 
  setAutopilot, 
  statusText, 
  isProcessing, 
  theme, 
  onToggleTheme, 
  user, 
  onLogin, 
  onLogout,
  notificationPermission = 'default',
  onRequestNotificationPermission
}: HeaderProps) {
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

  const headerClass = `relative w-full border-b py-3 px-4 sm:px-6 md:px-8 flex flex-row items-center justify-between gap-2 sm:gap-4 z-50 transition-all duration-150 ${
    isDark 
      ? 'bg-neutral-950/80 border-neutral-850 backdrop-blur-md text-neutral-100' 
      : 'bg-white/80 border-slate-200/80 backdrop-blur-md shadow-sm text-slate-800'
  }`;

  return (
    <header className={headerClass}>
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-2 sm:gap-3 select-none shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-4">
          
          {/* 🔮 THE VISUAL LOGO ICON (HOURGLASS + AI SPARKLE) */}
          <div className="relative h-10 w-10 sm:h-14 sm:w-14 flex items-center justify-center bg-white dark:bg-white rounded-xl border border-slate-200 dark:border-slate-200 shadow-sm shrink-0 overflow-hidden">
            <motion.div
              animate={{
                rotate: isProcessing ? 360 : 0,
              }}
              transition={{
                rotate: isProcessing ? { ease: "linear", duration: 6, repeat: Infinity } : { duration: 0.5 }
              }}
              className="relative z-10 w-7 h-7 sm:w-9 sm:h-9"
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <defs>
                  <linearGradient id="cyber-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9333ea" />
                    <stop offset="100%" stopColor="#0891b2" />
                  </linearGradient>
                </defs>
                
                <path 
                  d="M6 3H18M6 21H18M6 3C6 3 7 9 12 12M18 3C18 3 17 9 12 12M6 21C6 21 7 15 12 12M18 21C18 21 17 15 12 12" 
                  stroke="url(#cyber-gradient)" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
                
                <path 
                  d="M12 7.5C12 9.2 11.2 10.2 10 11C11.2 11.8 12 12.8 12 14.5C12 12.8 12.8 11.8 14 11C12.8 10.2 12 9.2 12 7.5Z" 
                  fill="url(#cyber-gradient)"
                  className="animate-pulse-slow"
                />
              </svg>
            </motion.div>
          </div>

          {/* 🏷️ BRAND TYPOGRAPHY BLOCK */}
          <div className="flex flex-col justify-center">
            <span className="text-[7px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-[0.22em] sm:tracking-[0.28em] uppercase mb-0.5 sm:mb-1 leading-none">
              THE
            </span>
            <h1 className={`text-sm sm:text-xl font-black tracking-wider leading-none font-sans ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              <span className={`mr-1 font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>LAST</span><span className="bg-gradient-to-r from-purple-600 to-cyan-500 dark:from-purple-400 dark:to-cyan-400 bg-clip-text text-transparent">MINUTE</span>
            </h1>
            <p className="text-[7px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-[0.22em] sm:tracking-[0.28em] uppercase mt-1 sm:mt-1.5 leading-none">
              LIFE SAVER
            </p>
          </div>
        </div>
      </div>

      {/* Control Switch / Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Real-time Status Bar Area */}
        <motion.div
          key={`status-bar-${theme}`}
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 4 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className={`hidden md:flex items-center gap-2.5 px-4 py-1.5 rounded-full border transition-all duration-300 ${
            isDark
              ? 'bg-neutral-900/60 border-neutral-800 text-neutral-300'
              : 'bg-slate-50 border-slate-200 text-slate-700 shadow-inner'
          }`}
          id="status-bar-area"
        >
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isProcessing ? 'bg-purple-400' : 'bg-emerald-400'
            }`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              isProcessing ? 'bg-purple-500' : 'bg-emerald-500'
            }`} />
          </span>
          <span className={`font-mono text-[9px] uppercase tracking-wider font-bold ${
            isDark ? 'text-neutral-500' : 'text-slate-400'
          }`}>
            Status:
          </span>
          <span className="font-mono text-[10px] truncate max-w-[120px] lg:max-w-[200px] font-medium" title={statusText}>
            {statusText}
          </span>
        </motion.div>

        {/* Dynamic Device Notification Bell Button */}
        <AnimatePresence mode="wait">
          {notificationPermission === 'granted' ? (
            <motion.button
              key="granted-bell"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={onRequestNotificationPermission}
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border transition-all duration-300 cursor-pointer overflow-hidden shadow-sm shrink-0 ${
                isDark
                  ? 'bg-purple-500/10 border-purple-500/40 text-purple-400 hover:text-purple-300 hover:border-purple-500/60 hover:shadow-md hover:shadow-purple-500/10'
                  : 'bg-purple-50 border-purple-300 text-purple-700 hover:text-purple-800 hover:shadow-md hover:shadow-purple-500/5'
              }`}
              title="24h Deadline reminders are ACTIVE. Click to test focus chime!"
              aria-label="Deadline reminders active"
              id="notification-bell-granted"
            >
              <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-purple-500 dark:text-purple-400 stroke-[2.2]" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-950 animate-pulse" />
            </motion.button>
          ) : notificationPermission === 'denied' ? (
            <motion.button
              key="denied-bell"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={() => {
                alert("Notification permission is blocked. Please open browser settings, reset permissions for this page, and click the notification button to enable reminders!");
              }}
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border transition-all duration-300 cursor-pointer overflow-hidden shadow-sm shrink-0 bg-neutral-900 border-neutral-800 text-neutral-600"
              title="24h Reminders are blocked. Reset browser permission to enable."
              aria-label="Reminders blocked"
              id="notification-bell-denied"
            >
              <BellOff className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2] text-neutral-600" />
            </motion.button>
          ) : (
            <motion.button
              key="default-bell"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={onRequestNotificationPermission}
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border transition-all duration-300 cursor-pointer overflow-hidden shadow-sm shrink-0 ${
                isDark
                  ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-purple-400 hover:border-purple-500/40'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-purple-600 hover:border-purple-300'
              }`}
              title="Click to enable 24h deadline notifications on this device!"
              aria-label="Enable deadline reminders"
              id="notification-bell-default"
            >
              <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2] text-neutral-400 dark:text-neutral-500" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-purple-500 ring-1 ring-white dark:ring-neutral-950 animate-ping" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Improved Theme Toggle Button (Circular with tactile feedback) */}
        <motion.button
          onClick={onToggleTheme}
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9, rotate: theme === 'dark' ? 15 : -15 }}
          animate={{
            rotate: theme === 'dark' ? 360 : 0,
          }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className={`relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border transition-all duration-300 cursor-pointer overflow-hidden shadow-sm shrink-0 ${
            isDark
              ? 'bg-neutral-900 border-neutral-800 text-purple-400 hover:text-purple-300 hover:border-purple-500/40 hover:bg-neutral-850 hover:shadow-md hover:shadow-purple-500/10'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-purple-600 hover:border-purple-300 hover:bg-slate-100/80 hover:shadow-md hover:shadow-purple-500/5'
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
                <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-purple-400 stroke-[2.2]" />
              ) : (
                <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-purple-600 stroke-[2.2]" />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.button>

        {/* User profile with inline transition option */}
        {user && (
          <div className="relative shrink-0" id="profile-container">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm border relative shadow-sm transition-all duration-200 active:scale-95 cursor-pointer ${
                isDark 
                  ? 'bg-purple-500/10 text-purple-400 border-neutral-850 hover:border-purple-500/50 hover:bg-purple-500/15' 
                  : 'bg-purple-500/15 text-purple-700 border-slate-200 hover:border-purple-500/50 hover:bg-purple-500/20'
              }`}
              id="profile-logo-button"
              title={user.displayName || 'User profile'}
              aria-label="Toggle sign out"
            >
              {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-neutral-950 ring-1 ring-emerald-500/35" />
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
