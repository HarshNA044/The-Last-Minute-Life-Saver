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

type AuthMode = 'login' | 'signup' | 'forgot_password';
type ForgotStage = 'enter_email' | 'enter_otp' | 'new_password';

export default function AuthGateway({ onAuthenticated, theme }: AuthGatewayProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [forgotStage, setForgotStage] = useState<ForgotStage>('enter_email');
  
  // Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Simulated OTP preview for easy testing in sandboxed iframe environment
  const [simulatedEmailOtp, setSimulatedEmailOtp] = useState<string | null>(null);

  const resetState = () => {
    setError('');
    setSuccessMsg('');
    setPassword('');
    setConfirmPassword('');
    setOtp('');
    setNewPassword('');
    setSimulatedEmailOtp(null);
  };

  const handleToggleMode = (newMode: AuthMode) => {
    setMode(newMode);
    setForgotStage('enter_email');
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

  // Stage 1: Generate & Save OTP, trigger backend simulation API
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email to proceed.');
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
      
      // Confirm user actually exists in users database
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
        setError('Email is not registered in our database.');
        setLoading(false);
        return;
      }
      
      // Generate secure 6-digit numeric OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
      
      // Save to Firebase firestore password_resets collection
      const resetRef = doc(db, 'password_resets', emailLower);
      try {
        await setDoc(resetRef, {
          otp: generatedOtp,
          expiresAt
        });
      } catch (setErr: any) {
        if (setErr.message?.includes('permission') || setErr.message?.includes('Permission')) {
          handleFirestoreError(setErr, OperationType.WRITE, `password_resets/${emailLower}`);
        }
        throw setErr;
      }
      
      // Trigger Node.js server API to deliver OTP
      try {
        const response = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailLower, otp: generatedOtp })
        });
        const resData = await response.json();
        if (resData.success) {
          if (resData.simulated) {
            setSuccessMsg(`OTP sent to console for dev preview: ${generatedOtp}`);
          } else {
            setSuccessMsg(`OTP sent successfully to your email!`);
          }
        } else {
          setError(resData.message || 'Apps Script email delivery failed.');
          setLoading(false);
          return;
        }
      } catch (apiErr: any) {
        console.warn("API route notice: OTP delivery failed.", apiErr);
        setError('Failed to send OTP via backend service.');
        setLoading(false);
        return;
      }
      
      // Show OTP simulated toast in browser for perfect developer testing
      setSimulatedEmailOtp(generatedOtp);
      setForgotStage('enter_otp');
    } catch (err: any) {
      console.error(err);
      setError('Failed to initiate password reset.');
    } finally {
      setLoading(false);
    }
  };

  // Stage 2: Match OTP code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the 6-digit OTP code.');
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
      const resetRef = doc(db, 'password_resets', emailLower);
      let resetSnap;
      try {
        resetSnap = await getDoc(resetRef);
      } catch (getErr: any) {
        if (getErr.message?.includes('permission') || getErr.message?.includes('Permission')) {
          handleFirestoreError(getErr, OperationType.GET, `password_resets/${emailLower}`);
        }
        throw getErr;
      }
      
      if (!resetSnap.exists()) {
        setError('OTP session expired. Please request another code.');
        setLoading(false);
        return;
      }
      
      const resetData = resetSnap.data();
      if (resetData.otp !== otp.trim()) {
        setError('Incorrect OTP verification code.');
        setLoading(false);
        return;
      }
      
      if (Date.now() > resetData.expiresAt) {
        setError('OTP code has expired (10 mins limit). Please request a new one.');
        setLoading(false);
        return;
      }
      
      // Valid! Move to Password change stage
      setSuccessMsg('OTP verified successfully! Create your new password.');
      setForgotStage('new_password');
    } catch (err: any) {
      console.error(err);
      setError('Failed to verify OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // Stage 3: Create and hash new password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
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
      const newHash = await hashPassword(newPassword);
      
      // Update password hash in users collection
      const userRef = doc(db, 'users', emailLower);
      try {
        await setDoc(userRef, { passwordHash: newHash }, { merge: true });
      } catch (setErr: any) {
        if (setErr.message?.includes('permission') || setErr.message?.includes('Permission')) {
          handleFirestoreError(setErr, OperationType.WRITE, `users/${emailLower}`);
        }
        throw setErr;
      }
      
      // Clean up verification collection doc
      const resetRef = doc(db, 'password_resets', emailLower);
      try {
        await deleteDoc(resetRef);
      } catch (delErr: any) {
        if (delErr.message?.includes('permission') || delErr.message?.includes('Permission')) {
          handleFirestoreError(delErr, OperationType.DELETE, `password_resets/${emailLower}`);
        }
        throw delErr;
      }
      
      setSuccessMsg('Your password has been reset! Logging you in...');
      
      // Fetch user profile to login
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
        const userData = userSnap.data();
        setTimeout(() => {
          onAuthenticated({
            email: userData.email,
            displayName: userData.displayName || 'Life Saver'
          });
        }, 1200);
      }
    } catch (err: any) {
      console.error(err);
      setError('Could not update your password.');
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
            {mode === 'forgot_password' && 'Password Recovery'}
          </h2>
          <p className="mt-2 text-xs text-neutral-500 font-mono">
            {mode === 'login' && 'Synchronize your personal academic workspace'}
            {mode === 'signup' && 'Secure client-side cloud persistence database'}
            {mode === 'forgot_password' && 'Step-by-step secure OTP verification'}
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
                <button
                  type="button"
                  onClick={() => handleToggleMode('forgot_password')}
                  className="text-[10px] font-mono text-amber-500 hover:text-amber-400 cursor-pointer"
                >
                  Forgot Password?
                </button>
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

        {mode === 'forgot_password' && (
          <div className="space-y-4">
            {forgotStage === 'enter_email' && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <p className="text-[11px] text-neutral-500 leading-relaxed font-sans mb-2">
                  Enter your registered account email. We will generate and securely save a 6-digit verification code to reset your account.
                </p>
                <div>
                  <label className="block text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5">Account Email</label>
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 font-sans text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors shadow-lg text-slate-955 text-slate-955 text-slate-955 text-slate-955 text-slate-950"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Request Verification OTP</span>}
                </button>
              </form>
            )}

            {forgotStage === 'enter_otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <p className="text-[11px] text-neutral-500 leading-relaxed font-sans mb-2">
                  We sent a 6-digit security code to <strong className="text-neutral-400">{email}</strong>. Check your inbox (or the simulated delivery badge below) and enter it to verify.
                </p>
                <div>
                  <label className="block text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5">Verification Code (OTP)</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 123456"
                    className="block w-full text-center tracking-[1em] text-lg py-3 rounded-xl border border-neutral-800 bg-neutral-950/50 text-neutral-100 font-mono focus:outline-none focus:border-amber-500/50 transition-all duration-150"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 font-sans text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors shadow-lg text-slate-950"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Verify Security OTP</span>}
                </button>
                
                <div className="text-center mt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStage('enter_email')}
                    className="text-[10px] font-mono text-neutral-500 hover:text-amber-500 cursor-pointer"
                  >
                    Change Email Address
                  </button>
                </div>
              </form>
            )}

            {forgotStage === 'new_password' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-[11px] text-neutral-500 leading-relaxed font-sans mb-2">
                  OTP verified successfully! Create a new security credential for <strong className="text-neutral-400">{email}</strong>.
                </p>
                <div>
                  <label className="block text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5">New Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="block w-full pl-10 pr-10 py-3 rounded-xl border border-neutral-800 bg-neutral-950/50 text-neutral-100 text-xs focus:outline-none focus:border-amber-500/50 transition-all duration-150"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type password"
                      className="block w-full pl-10 pr-10 py-3 rounded-xl border border-neutral-800 bg-neutral-950/50 text-neutral-100 text-xs focus:outline-none focus:border-amber-500/50 transition-all duration-150"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 font-sans text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors shadow-lg text-slate-950"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Update and Save Password</span>}
                </button>
              </form>
            )}

            <button
              onClick={() => handleToggleMode('login')}
              className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-500 hover:text-neutral-400 cursor-pointer pt-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </button>
          </div>
        )}

        {/* Dynamic Mode Switch Footer links */}
        {mode !== 'forgot_password' && (
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
        )}
      </motion.div>

      {/* Beautiful Simulated Email Delivery Toast / Badge for Testing Sandbox in iFrame */}
      <AnimatePresence>
        {simulatedEmailOtp && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 max-w-sm w-full bg-neutral-900 border border-neutral-800 text-neutral-200 p-4 rounded-xl shadow-2xl z-50 overflow-hidden font-sans"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
            <div className="flex items-start gap-3">
              <div className="bg-amber-500/10 text-amber-500 p-2 rounded-lg shrink-0">
                <Mail className="w-5 h-5 animate-bounce" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-semibold font-mono text-amber-400 uppercase tracking-wide">Simulated Email Inbox</span>
                  <button 
                    onClick={() => setSimulatedEmailOtp(null)}
                    className="text-[9px] font-mono text-neutral-500 hover:text-neutral-300"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 leading-snug">
                  To: <span className="text-neutral-200 font-mono text-[9px]">{email}</span>
                </p>
                <div className="mt-2.5 p-2 bg-neutral-950 rounded-lg border border-neutral-850 flex items-center justify-between gap-2">
                  <div className="font-sans text-[11px]">
                    Your Reset Security OTP is: <strong className="text-amber-500 font-mono tracking-wider text-xs">{simulatedEmailOtp}</strong>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(simulatedEmailOtp);
                      // Visual state feedback
                    }}
                    className="text-[9px] font-mono text-neutral-500 hover:text-amber-400 cursor-pointer border border-neutral-800 px-1.5 py-0.5 rounded"
                  >
                    Copy Code
                  </button>
                </div>
                <p className="text-[8px] text-neutral-500 font-mono mt-2 leading-none">
                  *This notification helps you test the OTP loop instantly inside the workspace iframe.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
