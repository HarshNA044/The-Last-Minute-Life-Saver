import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { KeyRound, Mail, User, Hourglass, ArrowRight, ArrowLeft, RefreshCw, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

// Native SHA-256 helper for high-performance secure client-side hashing
async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

interface AuthGatewayProps {
  onAuthenticated: (user: { email: string; displayName: string }) => void;
  theme: 'light' | 'dark';
}

type AuthMode = 'login' | 'signup';

export default function AuthGateway({ onAuthenticated, theme }: AuthGatewayProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  
  // Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const resetState = () => {
    setError('');
    setSuccessMsg('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleToggleMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetState();
  };

  const saveUserLocally = (emailStr: string, nameStr: string, hashStr: string) => {
    try {
      const saved = localStorage.getItem('life_saver_local_users');
      const localUsers = saved ? JSON.parse(saved) : [];
      const filtered = localUsers.filter((u: any) => u.email.toLowerCase() !== emailStr.toLowerCase());
      filtered.push({ email: emailStr.toLowerCase(), displayName: nameStr, passwordHash: hashStr });
      localStorage.setItem('life_saver_local_users', JSON.stringify(filtered));
    } catch (e) {
      console.warn("Could not save user locally:", e);
    }
  };

  const findLocalUser = (emailStr: string) => {
    try {
      const saved = localStorage.getItem('life_saver_local_users');
      if (!saved) return null;
      const localUsers = JSON.parse(saved);
      return localUsers.find((u: any) => u.email.toLowerCase() === emailStr.toLowerCase()) || null;
    } catch (e) {
      return null;
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all credentials.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const emailLower = email.trim().toLowerCase();
    const inputHash = await hashPassword(password);

    try {
      const userRef = doc(db, 'users', emailLower);
      let userSnap;
      try {
        userSnap = await getDoc(userRef);
      } catch (getErr: any) {
        if (getErr.message?.includes('permission') || getErr.message?.includes('Permission')) {
          handleFirestoreError(getErr, OperationType.GET, `users/${emailLower}`);
        }
        throw getErr;
      }
      
      if (!userSnap.exists()) {
        setError('No account found with this email.');
        setLoading(false);
        return;
      }
      
      const userData = userSnap.data();
      
      if (userData.passwordHash !== inputHash) {
        setError('Incorrect password. Please try again.');
        setLoading(false);
        return;
      }
      
      // Success online
      saveUserLocally(userData.email, userData.displayName || 'Life Saver', userData.passwordHash);
      onAuthenticated({
        email: userData.email,
        displayName: userData.displayName || 'Life Saver'
      });
    } catch (err: any) {
      console.warn("Authentication online check failed, trying offline validation:", err);
      const isOfflineError = 
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        err.message?.toLowerCase().includes('offline') ||
        err.message?.toLowerCase().includes('network') ||
        err.code === 'unavailable' ||
        err.message?.toLowerCase().includes('failed to get document');

      if (isOfflineError) {
        const localUser = findLocalUser(emailLower);
        if (localUser) {
          if (localUser.passwordHash === inputHash) {
            setSuccessMsg('Offline workspace verified successfully!');
            setTimeout(() => {
              onAuthenticated({
                email: localUser.email,
                displayName: localUser.displayName
              });
            }, 1000);
          } else {
            setError('Incorrect password (offline verification).');
          }
        } else {
          setError('Failed to contact secure server and no local backup profile exists for this email. Click the purple button below to enter as a guest.');
        }
      } else {
        setError(err.message || 'Authentication failed. Please check network connections.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) {
      setError('Please fill in all registration fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const emailLower = email.trim().toLowerCase();
    const passHash = await hashPassword(password);

    try {
      const userRef = doc(db, 'users', emailLower);
      let userSnap;
      try {
        userSnap = await getDoc(userRef);
      } catch (getErr: any) {
        if (getErr.message?.includes('permission') || getErr.message?.includes('Permission')) {
          handleFirestoreError(getErr, OperationType.GET, `users/${emailLower}`);
        }
        throw getErr;
      }
      
      if (userSnap.exists()) {
        setError('An account with this email already exists.');
        setLoading(false);
        return;
      }
      
      // Save secure user entry in Firestore
      try {
        await setDoc(userRef, {
          email: emailLower,
          displayName: displayName.trim(),
          passwordHash: passHash,
          createdAt: new Date().toISOString()
        });
      } catch (setErr: any) {
        if (setErr.message?.includes('permission') || setErr.message?.includes('Permission')) {
          handleFirestoreError(setErr, OperationType.WRITE, `users/${emailLower}`);
        }
        throw setErr;
      }
      
      saveUserLocally(emailLower, displayName.trim(), passHash);
      setSuccessMsg('Account registered successfully! Welcome.');
      setTimeout(() => {
        onAuthenticated({
          email: emailLower,
          displayName: displayName.trim()
        });
      }, 1000);
    } catch (err: any) {
      console.warn("Signup online connection failed, registering offline resilient profile:", err);
      const isOfflineError = 
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        err.message?.toLowerCase().includes('offline') ||
        err.message?.toLowerCase().includes('network') ||
        err.code === 'unavailable' ||
        err.message?.toLowerCase().includes('failed to get document');

      if (isOfflineError) {
        const localUserExists = findLocalUser(emailLower);
        if (localUserExists) {
          setError('An account with this email already exists in local backup.');
        } else {
          saveUserLocally(emailLower, displayName.trim(), passHash);
          setSuccessMsg('Offline workspace profile registered! Welcome.');
          setTimeout(() => {
            onAuthenticated({
              email: emailLower,
              displayName: displayName.trim()
            });
          }, 1000);
        }
      } else {
        setError(err.message || 'Failed to create account.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === 'dark';
  
  const containerClass = `min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 transition-all duration-150 relative ${
    isDark ? 'animate-gradient-dark text-neutral-100' : 'animate-gradient-light text-slate-900'
  }`;

  const cardClass = `w-full max-w-md p-8 rounded-2xl border ${
    isDark ? 'border-neutral-800 bg-neutral-900/80 text-neutral-100' : 'border-slate-200/80 bg-white/90 text-slate-800'
  } shadow-xl flex flex-col relative overflow-hidden backdrop-blur-md`;

  const inputClass = `block w-full pl-10 pr-4 py-3 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-150 ${
    isDark ? 'border-neutral-800 bg-neutral-950/50 text-neutral-100 placeholder:text-neutral-500' : 'border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400'
  }`;

  const inputPassClass = `block w-full pl-10 pr-10 py-3 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-150 ${
    isDark ? 'border-neutral-800 bg-neutral-950/50 text-neutral-100 placeholder:text-neutral-500' : 'border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400'
  }`;

  const labelClass = `block text-[10px] font-mono uppercase tracking-wider mb-1.5 ${
    isDark ? 'text-neutral-400' : 'text-slate-500'
  }`;

  const titleClass = `text-2xl font-bold tracking-tight ${
    isDark ? 'text-neutral-100 font-sans' : 'text-slate-900 font-sans'
  }`;

  const descClass = `mt-2 text-xs font-sans ${
    isDark ? 'text-neutral-400' : 'text-slate-500'
  }`;

  const dividerClass = `mt-8 pt-6 border-t flex justify-between items-center text-xs ${
    isDark ? 'border-neutral-800' : 'border-slate-200'
  }`;

  const footerSpanClass = isDark ? 'text-neutral-500' : 'text-slate-400';

  return (
    <div className={containerClass}>
      
      {/* Decorative Top Accent Card */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-500" />

      {/* Main Authentication Box Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={cardClass}
      >
        {/* Brand Banner Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 mb-4 border border-purple-500/20 shadow-inner">
            <Hourglass className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className={titleClass}>
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <p className={descClass}>
            {mode === 'login' 
              ? 'Access your workspace on The Last-Minute Life Saver' 
              : 'Register your account on The Last-Minute Life Saver'
            }
          </p>
        </div>

        {/* Global Notifications */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex flex-col gap-2"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
              {(error.toLowerCase().includes('offline') || error.toLowerCase().includes('network') || error.toLowerCase().includes('failed to get document') || error.toLowerCase().includes('internet')) && (
                <button
                  type="button"
                  onClick={() => {
                    onAuthenticated({
                      email: 'offline-user@lifesaver.local',
                      displayName: 'Offline Champion'
                    });
                  }}
                  className="mt-1.5 self-start px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-mono text-[10px] font-semibold cursor-pointer transition-colors duration-150"
                >
                  ⚡ ENTER OFFLINE RESILIENT WORKSPACE
                </button>
              )}
            </motion.div>
          )}

          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex items-center gap-2.5"
            >
              <Hourglass className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auth Forms */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Registered Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className={labelClass}>Account Password</label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputPassClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-neutral-400 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-white bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 font-sans text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors shadow-lg shadow-purple-500/20"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In To Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="relative flex py-2 items-center">
              <div className={`flex-grow border-t ${isDark ? 'border-neutral-800' : 'border-slate-200'}`}></div>
              <span className={`flex-shrink mx-4 text-[9px] font-mono uppercase tracking-wider ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>Or Quick Entry</span>
              <div className={`flex-grow border-t ${isDark ? 'border-neutral-800' : 'border-slate-200'}`}></div>
            </div>

            <button
              type="button"
              onClick={() => {
                onAuthenticated({
                  email: 'offline-user@lifesaver.local',
                  displayName: 'Guest Scholar'
                });
              }}
              className={`w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold cursor-pointer border border-dashed transition-all duration-150 ${
                isDark 
                  ? 'border-purple-500/30 hover:border-purple-500/60 bg-purple-500/5 hover:bg-purple-500/10 text-purple-400 hover:text-purple-300' 
                  : 'border-purple-400/45 hover:border-purple-500 bg-purple-50 hover:bg-purple-100 text-purple-700'
              }`}
            >
              ⚡ Instant Guest / Dummy Login
            </button>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Your Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Choose Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className={inputPassClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-neutral-400 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-white bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 font-sans text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors shadow-lg shadow-purple-500/20"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Dynamic Mode Switch Footer links */}
        <div className={dividerClass}>
          <span className={footerSpanClass}>
            {mode === 'login' ? "Don't have an account?" : "Already registered?"}
          </span>
          <button
            onClick={() => handleToggleMode(mode === 'login' ? 'signup' : 'login')}
            className="font-mono text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 cursor-pointer font-semibold transition-colors duration-150"
          >
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
