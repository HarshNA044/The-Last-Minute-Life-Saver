import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import SyllabusUploader from './components/SyllabusUploader';
import DeadlinesList from './components/DeadlinesList';
import CalendarPlanner from './components/CalendarPlanner';
import ChatAssistant from './components/ChatAssistant';
import ActiveTimer from './components/ActiveTimer';
import QuickTips from './components/QuickTips';
import Analytics from './components/Analytics';
import { Task, CalendarBlock, AgentLog, SubTask } from './types';
import { ShieldCheck, HelpCircle, Activity, Sparkles, AlertOctagon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Auth Gateway and Firebase Imports
import AuthGateway from './components/AuthGateway';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, firebaseError } from './firebase';

// Dynamic helper functions for actual calendar dates alignment
const getTodayDateOffset = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getTodayDateTimeStr = (hour: number, minute: number = 0) => {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hStr = hour.toString().padStart(2, '0');
  const mStr = minute.toString().padStart(2, '0');
  return `${y}-${m}-${day}T${hStr}:${mStr}:00`;
};

// Default tasks to ensure the dashboard looks complete and premium on load
const INITIAL_TASKS: Task[] = [
  {
    id: "task-1",
    title: "Syllabus Project Option: OS Kernel Threading",
    description: "Write concurrent lock strategies & process priority queues for the operating systems lab.",
    originalDeadline: getTodayDateOffset(2),
    priority: "critical",
    estimatedHours: 5,
    category: "Computer Science",
    status: "backlog",
    subtasks: [
      { id: "sub-1-1", title: "Complete thread sleep & yield implementations", estimatedMinutes: 90, completed: false },
      { id: "sub-1-2", title: "Debug mutual exclusion lock deadlock conditions", estimatedMinutes: 120, completed: false },
      { id: "sub-1-3", title: "Generate benchmark execution trace files", estimatedMinutes: 60, completed: false }
    ]
  },
  {
    id: "task-2",
    title: "Math 101 Midterm Prep",
    description: "Final study sessions covering multidimensional gradients & space integrals.",
    originalDeadline: getTodayDateOffset(0),
    priority: "high",
    estimatedHours: 3.5,
    category: "Mathematics",
    status: "backlog",
    subtasks: [
      { id: "sub-2-1", title: "Review polar volume converters formulas", estimatedMinutes: 60, completed: true },
      { id: "sub-2-2", title: "Resolve past year calculus midterm papers", estimatedMinutes: 120, completed: false },
      { id: "sub-2-3", title: "Read Chapter 14 optimization proofs", estimatedMinutes: 45, completed: false }
    ]
  }
];

// Initial preloaded calendar blocks so the day has initial lectures & breaks configured
const INITIAL_BLOCKS: CalendarBlock[] = [
  {
    id: "block-1",
    title: "System Integration Lectures (CS 350)",
    start: getTodayDateTimeStr(10),
    end: getTodayDateTimeStr(11, 30),
    type: "class",
    completed: false
  },
  {
    id: "block-2",
    title: "Post-Lecture Decompression Phase",
    start: getTodayDateTimeStr(12),
    end: getTodayDateTimeStr(13),
    type: "break",
    completed: true
  }
];

const INITIAL_LOGS: AgentLog[] = [
  {
    id: "log-1",
    timestamp: "08:00 AM",
    text: "The Last-Minute Life Saver fully booted. Pro-active AI monitoring system active.",
    type: "info"
  },
  {
    id: "log-2",
    timestamp: "08:02 AM",
    text: "Detected high-stakes deadline: OS Kernel Threading coming due in 5 days.",
    type: "warning"
  },
  {
    id: "log-3",
    timestamp: "08:04 AM",
    text: "Scanning agenda schedules: 2 unoccupied gaps mapped.",
    type: "tracking"
  }
];

// Helper to play highly optimized and realistic ring chime sounds using the Web Audio API
const playRingSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    const playPulse = (startTime: number) => {
      // High chime
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, startTime); // A5
      osc1.frequency.exponentialRampToValueAtTime(1320, startTime + 0.1); // E6
      gain1.gain.setValueAtTime(0.12, startTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(startTime);
      osc1.stop(startTime + 0.3);

      // Warm background resonance
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(440, startTime + 0.05); // A4
      osc2.frequency.exponentialRampToValueAtTime(880, startTime + 0.15); // A5
      gain2.gain.setValueAtTime(0.08, startTime + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(startTime + 0.05);
      osc2.stop(startTime + 0.35);
    };

    const now = ctx.currentTime;
    playPulse(now);          // Ring pulse 1
    playPulse(now + 0.4);    // Ring pulse 2
  } catch (err) {
    console.warn("Failed to play ring sound via AudioContext:", err);
  }
};

const getAlreadyNotified = (): string[] => {
  try {
    const saved = localStorage.getItem('life_saver_notified_deadlines');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const markAsNotified = (taskId: string) => {
  try {
    const notified = getAlreadyNotified();
    if (!notified.includes(taskId)) {
      localStorage.setItem('life_saver_notified_deadlines', JSON.stringify([...notified, taskId]));
    }
  } catch {}
};

export default function App() {
  const [user, setUser] = useState<{ email: string; displayName: string } | null>(() => {
    const saved = localStorage.getItem('life_saver_user');
    return saved ? JSON.parse(saved) : null;
  });
  const initialLoadCompleted = useRef<boolean>(false);

  const [autopilot, setAutopilot] = useState<boolean>(true);

  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const [removedTaskIds, setRemovedTaskIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('life_saver_removed_tasks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('life_saver_tasks');
      const parsed = saved ? (JSON.parse(saved) as Task[]) : INITIAL_TASKS;
      const savedRemoved = localStorage.getItem('life_saver_removed_tasks');
      const removed = savedRemoved ? (JSON.parse(savedRemoved) as string[]) : [];
      
      const filtered = parsed.filter(t => !removed.includes(t.id));

      // Make sure default tasks (from INITIAL_TASKS) are included if not removed and not already in there
      const missingDefaults = INITIAL_TASKS.filter(
        def => !filtered.some(t => t.id === def.id) && !removed.includes(def.id)
      );

      return [...filtered, ...missingDefaults];
    } catch {
      return INITIAL_TASKS;
    }
  });

  const [blocks, setBlocks] = useState<CalendarBlock[]>(() => {
    const saved = localStorage.getItem('life_saver_blocks');
    return saved ? JSON.parse(saved) : INITIAL_BLOCKS;
  });

  const [logs, setLogs] = useState<AgentLog[]>(() => {
    const saved = localStorage.getItem('life_saver_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });

  // Helper to add system log entries
  const addSystemLog = useCallback((text: string, type: 'info' | 'optimizing' | 'tracking' | 'scheduled' | 'warning' | 'alert') => {
    const now = new Date();
    const isNowShort = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newLog: AgentLog = {
      id: Math.random().toString(),
      timestamp: isNowShort,
      text,
      type
    };
    setLogs((prev) => [newLog, ...prev]);
  }, []);

  const [statusText, setStatusText] = useState<string>("All systems operational. Tracking 2 core deadlines.");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeSubtask, setActiveSubtask] = useState<{ taskId: string; sub: SubTask } | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('life_saver_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    // Fallback to system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Device Notifications & Calming Focus Sounds state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return window.Notification.permission;
    }
    return 'default';
  });

  const [notifiedTaskIds, setNotifiedTaskIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('life_saver_notified_tasks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Procedural calming chime generator (E4, B4, F#5 perfect intervals for mindfulness)
  const playCalmingChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Master gain envelope
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(0.35, now + 0.12);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
      masterGain.connect(ctx.destination);

      // Calming E major 9th intervals: E4 (329.63Hz), B4 (493.88Hz), F#5 (739.99Hz)
      const frequencies = [329.63, 493.88, 739.99];

      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine'; // pure sine wave is the softest and most soothing
        osc.frequency.setValueAtTime(freq, now);

        // Warm lowpass filter to attenuate high frequency harshness
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(650, now);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0, now);

        // Stagger notes to produce a beautiful, organic arpeggio chime effect
        const delay = idx * 0.08;
        oscGain.gain.setValueAtTime(0, now + delay);
        oscGain.gain.linearRampToValueAtTime(0.25, now + delay + 0.08);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 2.2);

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 3.2);
      });
    } catch (e) {
      console.warn("Calming chime playback bypassed:", e);
    }
  }, []);

  // Request Notification permission
  const handleRequestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      addSystemLog("This browser or container does not support system notifications.", "warning");
      return;
    }

    // If permission is already granted, play the beautiful study sound as test/feedback!
    if (window.Notification.permission === 'granted') {
      playCalmingChime();
      addSystemLog("[SOUND TEST] Played mindfulness study chime successfully.", "info");
      
      try {
        new window.Notification("🎵 Reminders Active!", {
          body: "Mindfulness sound reminder test succeeded. You are all set to beat procrastination!",
          tag: "sound-test"
        });
      } catch (err) {
        console.warn("Could not fire system test notification:", err);
      }
      return;
    }

    try {
      const result = await window.Notification.requestPermission();
      setNotificationPermission(result);

      if (result === 'granted') {
        addSystemLog("Device reminders authorized! We will alert you 24 hours before any deadline.", "info");
        playCalmingChime();
        
        try {
          new window.Notification("🔔 Reminders Authorized!", {
            body: "You will receive calming focus chimes and reminders 24h before your milestone deadlines.",
            tag: "welcome-reminders"
          });
        } catch (err) {
          console.warn("Could not fire welcome notification:", err);
        }
      } else if (result === 'denied') {
        addSystemLog("Reminders permission denied. Open browser page info to reset and allow notifications.", "warning");
      }
    } catch (err) {
      console.error("Error setting notification permissions:", err);
    }
  }, [addSystemLog, playCalmingChime]);

  // Keep references to current state values to prevent recreation of auth state listener
  const latestTasks = useRef<Task[]>(tasks);
  const latestBlocks = useRef<CalendarBlock[]>(blocks);
  const latestAutopilot = useRef<boolean>(autopilot);
  const latestRemovedTaskIds = useRef<string[]>(removedTaskIds);

  useEffect(() => {
    latestTasks.current = tasks;
  }, [tasks]);

  useEffect(() => {
    latestBlocks.current = blocks;
  }, [blocks]);

  useEffect(() => {
    latestAutopilot.current = autopilot;
  }, [autopilot]);

  useEffect(() => {
    latestRemovedTaskIds.current = removedTaskIds;
  }, [removedTaskIds]);

  // Sync to local storage as local fallback
  useEffect(() => {
    localStorage.setItem('life_saver_autopilot', JSON.stringify(autopilot));
  }, [autopilot]);

  useEffect(() => {
    localStorage.setItem('life_saver_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('life_saver_removed_tasks', JSON.stringify(removedTaskIds));
  }, [removedTaskIds]);

  useEffect(() => {
    localStorage.setItem('life_saver_blocks', JSON.stringify(blocks));
  }, [blocks]);

  useEffect(() => {
    localStorage.setItem('life_saver_logs', JSON.stringify(logs));
  }, [logs]);

  // Sync notified task IDs to local storage
  useEffect(() => {
    localStorage.setItem('life_saver_notified_tasks', JSON.stringify(notifiedTaskIds));
  }, [notifiedTaskIds]);

  // 24h Deadline checker engine
  useEffect(() => {
    if (notificationPermission !== 'granted') return;

    const checkDeadlines = () => {
      const now = new Date();
      let updatedNotified = [...notifiedTaskIds];
      let hasChange = false;

      tasks.forEach((task) => {
        // Skip completed tasks or already notified tasks
        if (task.status === 'completed' || updatedNotified.includes(task.id)) {
          return;
        }

        // Parse and normalize original deadline
        let deadlineStr = '';
        if (task.originalDeadline) {
          const match = task.originalDeadline.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (match) {
            deadlineStr = `${match[1]}-${match[2]}-${match[3]}`;
          } else {
            const lower = task.originalDeadline.toLowerCase();
            const d = new Date();
            if (lower.includes('today')) {
              // already today
            } else if (lower.includes('tomorrow')) {
              d.setDate(d.getDate() + 1);
            } else if (lower.includes('yesterday')) {
              d.setDate(d.getDate() - 1);
            }
            const y = d.getFullYear();
            const m = (d.getMonth() + 1).toString().padStart(2, '0');
            const day = d.getDate().toString().padStart(2, '0');
            deadlineStr = `${y}-${m}-${day}`;
          }
        }

        if (!deadlineStr) return;

        // Deadline Date starts at midnight of that date
        const deadlineDate = new Date(deadlineStr + 'T00:00:00');
        const diffMs = deadlineDate.getTime() - now.getTime();
        const hoursLeft = diffMs / (1000 * 60 * 60);

        // Notify if task deadline is within the next 24 hours
        if (hoursLeft > 0 && hoursLeft <= 24) {
          // Play mind calming study chime
          playCalmingChime();

          // Native device notification
          try {
            if ('Notification' in window) {
              const notificationTitle = `⚠️ 24-Hour Deadline: ${task.title}`;
              const notificationOptions = {
                body: `"${task.title}" is due tomorrow! (${Math.round(hoursLeft)} hours remaining). Keep your focus steady.`,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%239333ea" stroke-width="2"><path d="M6 3H18M6 21H18M6 3C6 3 7 9 12 12M18 3C18 3 17 9 12 12M6 21C6 21 7 15 12 12M18 21C18 21 17 15 12 12"/></svg>',
                tag: `reminder-${task.id}`,
              };
              new window.Notification(notificationTitle, notificationOptions);
            }
          } catch (e) {
            console.error("System notification failed:", e);
          }

          // Log in internal activity log
          addSystemLog(`[REMINDER ENCRYPTED] "${task.title}" reaches critical deadline threshold in ${Math.round(hoursLeft)}h. Played soothing focus chime.`, "alert");

          updatedNotified.push(task.id);
          hasChange = true;
        }
      });

      if (hasChange) {
        setNotifiedTaskIds(updatedNotified);
      }
    };

    // Run lookahead check immediately
    checkDeadlines();

    // Check every 3 minutes
    const intervalId = setInterval(checkDeadlines, 180000);
    return () => clearInterval(intervalId);
  }, [tasks, notifiedTaskIds, notificationPermission, playCalmingChime, addSystemLog]);

  // Helper to fetch user's saved data from Firestore
  const fetchUserData = useCallback(async (userEmail: string) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      addSystemLog("Offline: running on local backup workspace.", "info");
      initialLoadCompleted.current = true;
      return;
    }

    try {
      setIsProcessing(true);
      const emailLower = userEmail.trim().toLowerCase();
      const userDocRef = doc(db, "users", emailLower);
      const docSnap = await getDoc(userDocRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const syncedRemoved = data.removedTaskIds || [];
        setRemovedTaskIds(syncedRemoved);
        localStorage.setItem('life_saver_removed_tasks', JSON.stringify(syncedRemoved));

        if (data.tasks) {
          let loadedTasks = data.tasks as Task[];
          // Filter out any task in the deleted list
          loadedTasks = loadedTasks.filter(t => !syncedRemoved.includes(t.id));

          // Guarantee default tasks (from INITIAL_TASKS) are loaded if missing and not explicitly removed
          const missingDefaults = INITIAL_TASKS.filter(
            def => !loadedTasks.some(t => t.id === def.id) && !syncedRemoved.includes(def.id)
          );

          setTasks([...loadedTasks, ...missingDefaults]);
        }
        if (data.blocks) setBlocks(data.blocks);
        setAutopilot(true);
        addSystemLog("Workspace synced perfectly with Google Cloud.", "info");
      } else {
        // First login/registration or fresh start: save defaults
        try {
          await setDoc(userDocRef, {
            email: emailLower,
            displayName: user?.displayName || 'Life Saver',
            tasks: latestTasks.current,
            blocks: latestBlocks.current,
            autopilot: latestAutopilot.current,
            removedTaskIds: latestRemovedTaskIds.current,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (setErr: any) {
          if (setErr.message?.includes('permission') || setErr.message?.includes('Permission')) {
            handleFirestoreError(setErr, OperationType.WRITE, `users/${emailLower}`);
          }
          throw setErr;
        }
        addSystemLog("Initialized your safe space on the secure cloud.", "info");
      }
    } catch (err: any) {
      const isOfflineError = 
        err.message?.includes('offline') || 
        err.message?.includes('network') || 
        err.code === 'unavailable' || 
        err.message?.includes('network connection');
      
      if (isOfflineError) {
        console.warn("Running in offline mode: loaded workspace from local backup.", err);
        addSystemLog("Running in offline mode: loaded workspace from local backup.", "info");
      } else {
        console.error("Error reading/writing user doc:", err);
        addSystemLog(`Failed to sync cloud database: ${err.message || err}`, "warning");
        if (err.message?.includes('permission') || err.message?.includes('Permission')) {
          handleFirestoreError(err, OperationType.GET, `users/${userEmail}`);
        }
      }
    } finally {
      setIsProcessing(false);
      initialLoadCompleted.current = true;
    }
  }, [addSystemLog, user?.displayName]);

  // If there's an active user session, auto-fetch their data on mount
  useEffect(() => {
    if (firebaseError) return;
    if (user && !initialLoadCompleted.current) {
      fetchUserData(user.email);
    }
  }, [user, fetchUserData]);

  // Save State Changes to Cloud Firestore
  useEffect(() => {
    if (firebaseError) return;
    if (user && initialLoadCompleted.current) {
      const saveToFirestore = async () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          return; // Skip saving to cloud while offline to prevent persistent offline errors
        }
        try {
          const emailLower = user.email.trim().toLowerCase();
          const userDocRef = doc(db, "users", emailLower);
          await setDoc(userDocRef, {
            tasks,
            blocks,
            autopilot,
            removedTaskIds,
            email: user.email,
            displayName: user.displayName,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (err: any) {
          const isOfflineError = 
            err.message?.includes('offline') || 
            err.message?.includes('network') || 
            err.code === 'unavailable' || 
            err.message?.includes('network connection');
          
          if (isOfflineError) {
            console.warn("Failed to save state to Firestore (offline):", err);
          } else {
            console.error("Failed to save state to Firestore:", err);
            if (err.message?.includes('permission') || err.message?.includes('Permission')) {
              handleFirestoreError(err, OperationType.WRITE, `users/${user.email.trim().toLowerCase()}`);
            }
          }
        }
      };
      
      // Debounce saving to prevent fast successive writes
      const timeoutId = setTimeout(saveToFirestore, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [tasks, blocks, autopilot, removedTaskIds, user]);

  const handleAuthenticated = (authUser: { email: string; displayName: string }) => {
    setUser(authUser);
    localStorage.setItem('life_saver_user', JSON.stringify(authUser));
    fetchUserData(authUser.email);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('life_saver_user');
    initialLoadCompleted.current = false;
    
    // Reset to default tasks but excluding removed tasks
    const savedRemoved = localStorage.getItem('life_saver_removed_tasks');
    const removed = savedRemoved ? (JSON.parse(savedRemoved) as string[]) : [];
    const filteredDefaults = INITIAL_TASKS.filter(t => !removed.includes(t.id));
    
    setTasks(filteredDefaults);
    setBlocks(INITIAL_BLOCKS);
    addSystemLog("Signed out securely. Reset to default environment view.", "info");
  };

  // Synchronize CSS class with current theme state
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('life_saver_theme', theme);
  }, [theme]);

  // Auto-adapt to system default changes dynamically if no custom choice is set
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem('life_saver_theme');
      if (!saved) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  // Request notification permission on first visit
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            addSystemLog("Device notifications enabled! We will alert you of upcoming deadlines.", "info");
          }
        }).catch((err) => {
          console.warn("Notification permission request failed:", err);
        });
      }
    }
  }, [addSystemLog]);

  // Check for tasks with deadlines approaching within 24 hours
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;

    const now = new Date();
    const notifiedList = getAlreadyNotified();
    let hasNewAlert = false;

    tasks.forEach((task) => {
      if (task.status === 'completed') return;
      if (notifiedList.includes(task.id)) return;

      // Parse the deadline safely
      let deadline: Date | null = null;
      if (task.originalDeadline && task.originalDeadline.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const parts = task.originalDeadline.split('-');
        deadline = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 23, 59, 59);
      } else if (task.originalDeadline) {
        const parsed = Date.parse(task.originalDeadline);
        if (!isNaN(parsed)) {
          deadline = new Date(parsed);
        }
      }

      if (deadline) {
        const diffMs = deadline.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // Notify if it is due in less than 24 hours (and not already past by more than 2 hours to avoid stale alerts)
        if (diffHours > -2 && diffHours <= 24) {
          hasNewAlert = true;
          markAsNotified(task.id);

          const hoursLeft = Math.max(0, Math.ceil(diffHours));
          const alertMessage = hoursLeft > 0 
            ? `CRITICAL DEADLINE INBOUND: "${task.title}" is due in less than ${hoursLeft} hours! Action required.`
            : `CRITICAL DEADLINE INBOUND: "${task.title}" is due TODAY! Action required.`;

          // 1. Add to system log
          addSystemLog(alertMessage, 'alert');

          // 2. Sent browser device notification
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification("Deadline Approaching! 🚨", {
                body: alertMessage,
                tag: task.id // avoid duplicate system notifications
              });
            } catch (e) {
              console.warn("Notification failed to trigger", e);
            }
          }
        }
      }
    });

    if (hasNewAlert) {
      playRingSound();
    }
  }, [tasks, addSystemLog]);

  // Extract from Syllabus callback
  const handleExtractTasks = (extractedTasks: any[]) => {
    // Map extracted tasks with subtask structures
    const parsed: Task[] = extractedTasks.map((t, index) => ({
      id: `task-extracted-${Math.random()}-${index}`,
      title: t.title,
      description: t.description || "Synthesized assignment requirements parsed from file.",
      originalDeadline: t.originalDeadline || "2026-06-30",
      priority: t.priority || "medium",
      estimatedHours: t.estimatedHours || 4,
      status: "backlog",
      category: t.category || "General",
      subtasks: t.subtasks.map((st: any, sIdx: number) => ({
        id: `sub-extracted-${Math.random()}-${sIdx}`,
        title: st.title,
        estimatedMinutes: st.estimatedMinutes || 60,
        completed: false
      }))
    }));

    setTasks((prev) => [...parsed, ...prev]);
    addSystemLog(`Successfully logged ${parsed.length} brand new assignments to task list.`, 'info');

    // Trigger auto-schedule autonomously if autopilot is turned on!
    if (autopilot) {
      setTimeout(() => {
        autoScheduleBlocks([...parsed, ...tasks]);
      }, 800);
    }
  };

  // Core Scheduling Algorithm: Scans vacant blocks and maps focus sessions
  const autoScheduleBlocks = useCallback((activeTasks: Task[] = tasks) => {
    setIsProcessing(true);
    setStatusText("Autopilot scanner seeking focus gaps... ⚙️");
    addSystemLog("Initiated proactive agenda slot scanning procedures.", "optimizing");

    // Filter out previous focus sessions so we can re-optimize cleanly
    const solidReservedBlocks = blocks.filter(b => b.type !== 'focus');

    // Gather all incomplete subtasks from our active assignments
    const uncompletedSubtasks: { taskId: string; taskTitle: string; sub: SubTask }[] = [];
    activeTasks.forEach((t) => {
      t.subtasks.forEach((st) => {
        if (!st.completed) {
          uncompletedSubtasks.push({
            taskId: t.id,
            taskTitle: t.title,
            sub: st
          });
        }
      });
    });

    if (uncompletedSubtasks.length === 0) {
      setIsProcessing(false);
      setStatusText("Hooray! No uncompleted subtasks found. Zero procrastination threat today!");
      addSystemLog("Optimization scan halted: all assignments are 100% finished.", "info");
      return;
    }

    // Available target hours for study (e.g. 8:00 AM, 13:00 PM, 14:00 PM, up to 21:00 PM)
    const proposedFocusBlocks: CalendarBlock[] = [];
    let scheduledCount = 0;

    // Start scanning from 13:00 to 22:00
    let currentHourCursor = 13; 

    uncompletedSubtasks.forEach((item) => {
      // Find subsequent available starting hour that has no overlapping class/personal reserved block
      let occupied = true;
      while (occupied && currentHourCursor < 22) {
        const testStart = `${selectedDateStr}T${currentHourCursor.toString().padStart(2, '0')}:00:00`;
        const testEnd = `${selectedDateStr}T${(currentHourCursor + 1).toString().padStart(2, '0')}:00:00`;

        const hasOverlap = solidReservedBlocks.some((b) => {
          const bStart = new Date(b.start).getTime();
          const bEnd = new Date(b.end).getTime();
          const tStart = new Date(testStart).getTime();
          const tEnd = new Date(testEnd).getTime();
          return (tStart < bEnd && tEnd > bStart);
        });

        if (!hasOverlap) {
          occupied = false;
        } else {
          currentHourCursor++;
        }
      }

      if (currentHourCursor < 22) {
        // Place the Focus slot!
        const blockStart = `${selectedDateStr}T${currentHourCursor.toString().padStart(2, '0')}:00:00`;
        const blockEnd = `${selectedDateStr}T${(currentHourCursor + 1).toString().padStart(2, '0')}:00:00`;

        proposedFocusBlocks.push({
          id: `focus-slot-${Math.random()}-${item.sub.id}`,
          taskId: item.taskId,
          subTaskId: item.sub.id,
          title: `Focus: ${item.sub.title}`,
          start: blockStart,
          end: blockEnd,
          type: 'focus',
          completed: false
        });

        addSystemLog(`Mapped slot [${currentHourCursor}:00] to subtask: "${item.sub.title}"`, "scheduled");
        currentHourCursor++; // increment cursor for next subtask
        scheduledCount++;
      }
    });

    setBlocks([...solidReservedBlocks, ...proposedFocusBlocks]);
    setIsProcessing(false);
    setStatusText(`Successfully optimized calendar! Slotted ${scheduledCount} critical focus sessions.`);
    addSystemLog(`Autopilot optimized: arranged ${scheduledCount} focus intervals.`, 'scheduled');
  }, [blocks, addSystemLog, selectedDateStr]);

  // Toggle checklist subtask complete
  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prevTasks) => 
      prevTasks.map((t) => {
        if (t.id === taskId) {
          const updatedSubs = t.subtasks.map((st) => {
            if (st.id === subtaskId) {
              const nextVal = !st.completed;
              addSystemLog(`Sub-task compliance updated: "${st.title}" -> ${nextVal ? 'DONE' : 'INCOMPLETE'}`, nextVal ? 'scheduled' : 'warning');
              return { ...st, completed: nextVal };
            }
            return st;
          });
          const allCompleted = updatedSubs.length > 0 && updatedSubs.every(st => st.completed);
          return { 
            ...t, 
            subtasks: updatedSubs,
            status: allCompleted ? 'completed' : 'backlog'
          };
        }
        return t;
      })
    );
  };

  // Add customized task manually
  const handleAddTask = (newTask: Task) => {
    setTasks((prev) => [newTask, ...prev]);
    addSystemLog(`Manually entered new target deadline: "${newTask.title}"`, 'info');
    
    if (autopilot) {
      setTimeout(() => {
        autoScheduleBlocks([newTask, ...tasks]);
      }, 500);
    }
  };

  // Delete/discard task
  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setRemovedTaskIds((prev) => {
      if (!prev.includes(taskId)) {
        return [...prev, taskId];
      }
      return prev;
    });
    // Clear previous focus blocks bound to this deleted task
    setBlocks((prev) => prev.filter((b) => b.taskId !== taskId));
    addSystemLog(`Discarded assignment checklist: #${taskId.substring(0, 5)}`, 'warning');
  };

  // Toggle calendar block completed (streaks tracking!)
  const handleToggleBlockComplete = (blockId: string) => {
    setBlocks((bList) =>
      bList.map((b) => {
        if (b.id === blockId) {
          const nextVal = !b.completed;
          addSystemLog(`Agenda block "${b.title}" marked: ${nextVal ? 'COMPLETED' : 'INCOMPLETE'}`, nextVal ? 'scheduled' : 'info');
          
          // If this calendar block was linked to a subtask, set the subtask completed too!
          if (b.subTaskId && b.taskId) {
            setTasks((prevTasks) =>
              prevTasks.map((t) => {
                if (t.id === b.taskId) {
                  const updatedSubs = t.subtasks.map((st) => 
                    st.id === b.subTaskId ? { ...st, completed: nextVal } : st
                  );
                  const allCompleted = updatedSubs.length > 0 && updatedSubs.every(st => st.completed);
                  return {
                    ...t,
                    subtasks: updatedSubs,
                    status: allCompleted ? 'completed' : 'backlog'
                  };
                }
                return t;
              })
            );
          }

          return { ...b, completed: nextVal };
        }
        return b;
      })
    );
  };

  // Clear focus blocks
  const handleClearBlocks = () => {
    setBlocks(blocks.filter((b) => b.type !== 'focus'));
    addSystemLog("Purged all auto-scheduled focus blocks from the daily visual grid.", "warning");
  };

  // Manual fast add of agenda block items (classes, breaks, etc)
  const handleAddManualBlock = (title: string, sH: number, eH: number, type: 'focus' | 'break' | 'class') => {
    const newBlock: CalendarBlock = {
      id: `manual-block-${Math.random()}`,
      title,
      start: `${selectedDateStr}T${sH.toString().padStart(2, '0')}:00:00`,
      end: `${selectedDateStr}T${eH.toString().padStart(2, '0')}:00:00`,
      type,
      completed: false
    };

    setBlocks((prev) => [...prev, newBlock]);
    addSystemLog(`Manually reserved block: "${title}" [${sH}:00 - ${eH}:00]`, 'info');
  };

  // Binding selected subtask directly to Pomodoro timer overlay
  const handleStartFocus = (taskId: string, subtask: SubTask) => {
    setActiveSubtask({ taskId, sub: subtask });
    setStatusText(`Focus session locked in for subtask: "${subtask.title}"!`);
  };

  const handleToggleTheme = () => {
    const root = window.document.documentElement;
    root.classList.add('theme-transitioning');
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    addSystemLog(`User toggled application visual theme mode.`, 'info');
    setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 300);
  };

  if (firebaseError) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 p-8 rounded-2xl shadow-2xl space-y-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-purple-500/10 text-purple-400">
            <AlertOctagon className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-neutral-100">
              Firebase Configuration Required
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed font-mono">
              {firebaseError}
            </p>
          </div>
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 text-left space-y-2 font-mono text-[10px] text-neutral-500 leading-normal">
            <p className="text-neutral-400 font-semibold uppercase tracking-wider mb-1">🛠️ How to resolve in Vercel:</p>
            <p>1. Go to your Vercel Project Dashboard ➔ Settings ➔ Environment Variables.</p>
            <p>2. Add the following keys with values from your Firebase Console:</p>
            <ul className="list-disc pl-4 space-y-1 mt-1 text-neutral-400">
              <li>VITE_FIREBASE_API_KEY</li>
              <li>VITE_FIREBASE_PROJECT_ID</li>
              <li>VITE_FIREBASE_AUTH_DOMAIN</li>
              <li>VITE_FIREBASE_DATABASE_ID</li>
            </ul>
            <p className="mt-2 text-purple-400 font-semibold">* Note: In Google AI Studio, this is automatically configured for you via the Firebase tool in the lower-right menu.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthGateway onAuthenticated={handleAuthenticated} theme={theme} />;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-purple-500/30 selection:text-white" id="main-application-frame">
      {/* Dynamic Header */}
      <Header
        autopilot={autopilot}
        setAutopilot={setAutopilot}
        statusText={statusText}
        isProcessing={isProcessing}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        user={user}
        onLogin={() => {}}
        onLogout={handleLogout}
        notificationPermission={notificationPermission}
        onRequestNotificationPermission={handleRequestNotificationPermission}
      />

      {/* Primary Dashboard Body Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Row 1: Project Brief & Agenda Importer */}
        <SyllabusUploader
          onExtract={handleExtractTasks}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
          setStatusText={setStatusText}
        />

        {/* Agenda Calendar & Deliverable Board */}
        <DeadlinesList
          tasks={tasks}
          onToggleSubtask={handleToggleSubtask}
          onAddTask={handleAddTask}
          onDeleteTask={handleDeleteTask}
          onStartFocus={handleStartFocus}
          selectedDateStr={selectedDateStr}
          onSelectDate={setSelectedDateStr}
        />

        {/* Row 2: Grid distribution split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Column A (Left): Interactive Work Schedule & Status */}
          <div className="lg:col-span-7 space-y-6">
            <CalendarPlanner
              blocks={blocks}
              tasks={tasks}
              onToggleBlockComplete={handleToggleBlockComplete}
              onClearBlocks={handleClearBlocks}
              onAutoSchedule={() => autoScheduleBlocks()}
              onAddManualBlock={handleAddManualBlock}
              selectedDateStr={selectedDateStr}
            />
          </div>

          {/* Column B (Right): Countdown Clock & Time Management Tips */}
          <div className="lg:col-span-5 space-y-6">
            {/* Quick Tips and Suggestions Tooltip System */}
            <QuickTips tasks={tasks} onAddSystemLog={addSystemLog} />
            
            {/* Core Countdown active clock state */}
            <ActiveTimer
              activeSubtask={activeSubtask}
              onFinishSubtask={(tId, sId) => {
                handleToggleSubtask(tId, sId);
                setActiveSubtask(null);
              }}
              onAddSystemLog={addSystemLog}
            />
          </div>
        </div>

        {/* Live Project Progression Analytics */}
        <Analytics
          tasks={tasks}
          onAddSystemLog={addSystemLog}
        />
      </main>

      {/* Ambient status indicator footer */}
      <footer className="py-10 px-6 border-t border-neutral-900 bg-black mt-12 text-center sm:text-left text-xs text-white font-sans">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-8 items-start md:items-center">
          <div className="space-y-3 max-w-lg">
            <h4 className="font-mono text-xs font-bold tracking-wider text-white">THE LAST-MINUTE LIFE SAVER</h4>
            <p className="text-white leading-relaxed text-xs">
              An autonomous, AI-powered schedule optimizer and task architect built to help students, professionals, and entrepreneurs conquer procrastination, structure complex agendas, and align daily focus workflows seamlessly.
            </p>
            <p className="text-white font-mono text-[11px] pt-1">
              Design & Develop by <span className="text-white font-bold underline decoration-purple-500">Harsh</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Redesigned Floating Chat Companion */}
      <ChatAssistant
        currentTasks={tasks}
        onTriggerOptimization={() => autoScheduleBlocks()}
        statusText={statusText}
        isProcessing={isProcessing}
        onAddSystemLog={addSystemLog}
        onAddTask={handleAddTask}
        onDeleteTask={handleDeleteTask}
      />
    </div>
  );
}
