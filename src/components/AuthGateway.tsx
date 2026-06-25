import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { KeyRound, Mail, User, ShieldCheck, ArrowRight, ArrowLeft, RefreshCw, AlertCircle, Eye, EyeOff } from 'lucide-react';
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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all credentials.');
      return;
    }
    
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('Please check your internet connection. Authentication requires an active network.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const emailLower = email.trim().toLowerCase();
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
      const inputHash = await hashPassword(password);
      
      if (userData.passwordHash !== inputHash) {
        setError('Incorrect password. Please try again.');
        setLoading(false);
        return;
      }
      
      // Success
      onAuthenticated({
        email: userData.email,
        displayName: userData.displayName || 'Life Saver'
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please check network connections.');
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
    
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('Please check your internet connection. Authentication requires an active network.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const emailLower = email.trim().toLowerCase();
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
      
      const passHash = await hashPassword(password);
      
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
      
      setSuccessMsg('Account registered successfully! Welcome.');
      setTimeout(() => {
        onAuthenticated({
          email: emailLower,
          displayName: displayName.trim()
        });
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-150 bg-neutral-950 text-neutral-100">
      
      {/* Decorative Top Accent Card */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-sky-500" />

      {/* Main Authentication Box Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md p-8 rounded-2xl border border-neutral-850 shadow-xl flex flex-col relative overflow-hidden bg-neutral-900/90 backdrop-blur-md"
      >
        {/* Brand Banner Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 mb-4 border border-amber-500/20 shadow-inner">
            <ShieldCheck className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold font-sans tracking-tight text-neutral-100">
            {mode === 'login' && 'Access Life Saver'}
            {mode === 'signup' && 'Create Free Account'}
          </h2>
          <p className="mt-2 text-xs text-neutral-500 font-mono">
            {mode === 'login' && 'Synchronize your personal academic workspace'}
            {mode === 'signup' && 'Secure client-side cloud persistence database'}
          </p>
        </div>

        {/* Global Notifications */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex items-center gap-2.5"
            >
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auth Forms */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5">Registered Email</label>
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
                  className="block w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-800 bg-neutral-950/50 text-neutral-100 text-xs focus:outline-none focus:border-amber-500/50 transition-all duration-150"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Account Password</label>
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
                  className="block w-full pl-10 pr-10 py-3 rounded-xl border border-neutral-800 bg-neutral-950/50 text-neutral-100 text-xs focus:outline-none focus:border-amber-500/50 transition-all duration-150"
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
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-slate-955 bg-amber-500 hover:bg-amber-400 font-sans text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors shadow-lg shadow-amber-500/10 text-slate-950"
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
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5">Your Full Name</label>
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
                  className="block w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-800 bg-neutral-950/50 text-neutral-100 text-xs focus:outline-none focus:border-amber-500/50 transition-all duration-150"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5">Email Address</label>
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
                  className="block w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-800 bg-neutral-950/50 text-neutral-100 text-xs focus:outline-none focus:border-amber-500/50 transition-all duration-150"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5">Choose Password</label>
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
                  className="block w-full pl-10 pr-10 py-3 rounded-xl border border-neutral-800 bg-neutral-950/50 text-neutral-100 text-xs focus:outline-none focus:border-amber-500/50 transition-all duration-150"
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
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-slate-955 bg-amber-500 hover:bg-amber-400 font-sans text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors shadow-lg shadow-amber-500/10 text-slate-950"
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
        <div className="mt-8 pt-6 border-t border-neutral-850 flex justify-between items-center text-xs">
          <span className="text-neutral-500">
            {mode === 'login' ? "Don't have an account?" : "Already registered?"}
          </span>
          <button
            onClick={() => handleToggleMode(mode === 'login' ? 'signup' : 'login')}
            className="font-mono text-amber-500 hover:text-amber-400 cursor-pointer font-medium"
          >
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
