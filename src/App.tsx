import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import SyllabusUploader from './components/SyllabusUploader';
import DeadlinesList from './components/DeadlinesList';
import CalendarPlanner from './components/CalendarPlanner';
import ChatAssistant from './components/ChatAssistant';
import ActiveTimer from './components/ActiveTimer';
import AgentLogsHUD from './components/AgentLogsHUD';
import QuickTips from './components/QuickTips';
import Analytics from './components/Analytics';
import { Task, CalendarBlock, AgentLog, SubTask } from './types';
import { ShieldCheck, HelpCircle, Activity, Sparkles, AlertOctagon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Auth Gateway and Firebase Imports
import AuthGateway from './components/AuthGateway';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, firebaseError } from './firebase';

// Default tasks to ensure the dashboard looks complete and premium on load
const INITIAL_TASKS: Task[] = [
  {
    id: "task-1",
    title: "Syllabus Project Option: OS Kernel Threading",
    description: "Write concurrent lock strategies & process priority queues for the operating systems lab.",
    originalDeadline: "2026-06-28",
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
    originalDeadline: "2026-06-25",
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
    start: "2026-06-23T10:00:00",
    end: "2026-06-23T11:30:00",
    type: "class",
    completed: false
  },
  {
    id: "block-2",
    title: "Post-Lecture Decompression Phase",
    start: "2026-06-23T12:00:00",
    end: "2026-06-23T13:00:00",
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

  const [autopilot, setAutopilot] = useState<boolean>(() => {
    const saved = localStorage.getItem('life_saver_autopilot');
    return saved ? JSON.parse(saved) : true;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('life_saver_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  const [blocks, setBlocks] = useState<CalendarBlock[]>(() => {
    const saved = localStorage.getItem('life_saver_blocks');
    return saved ? JSON.parse(saved) : INITIAL_BLOCKS;
  });

  const [logs, setLogs] = useState<AgentLog[]>(() => {
    const saved = localStorage.getItem('life_saver_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });

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

  // Keep references to current state values to prevent recreation of auth state listener
  const latestTasks = useRef<Task[]>(tasks);
  const latestBlocks = useRef<CalendarBlock[]>(blocks);
  const latestAutopilot = useRef<boolean>(autopilot);

  useEffect(() => {
    latestTasks.current = tasks;
  }, [tasks]);

  useEffect(() => {
    latestBlocks.current = blocks;
  }, [blocks]);

  useEffect(() => {
    latestAutopilot.current = autopilot;
  }, [autopilot]);

  // Sync to local storage as local fallback
  useEffect(() => {
    localStorage.setItem('life_saver_autopilot', JSON.stringify(autopilot));
  }, [autopilot]);

  useEffect(() => {
    localStorage.setItem('life_saver_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('life_saver_blocks', JSON.stringify(blocks));
  }, [blocks]);

  useEffect(() => {
    localStorage.setItem('life_saver_logs', JSON.stringify(logs));
  }, [logs]);

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
        if (data.tasks) setTasks(data.tasks);
        if (data.blocks) setBlocks(data.blocks);
        if (data.autopilot !== undefined) setAutopilot(data.autopilot);
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
      console.error("Error reading/writing user doc:", err);
      const isOfflineError = 
        err.message?.includes('offline') || 
        err.message?.includes('network') || 
        err.code === 'unavailable' || 
        err.message?.includes('network connection');
      
      if (isOfflineError) {
        addSystemLog("Running in offline mode: loaded workspace from local backup.", "info");
      } else {
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
    if (user && !initialLoadCompleted.current) {
      fetchUserData(user.email);
    }
  }, [user, fetchUserData]);

  // Save State Changes to Cloud Firestore
  useEffect(() => {
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
            email: user.email,
            displayName: user.displayName,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (err: any) {
          console.error("Failed to save state to Firestore:", err);
          if (err.message?.includes('permission') || err.message?.includes('Permission')) {
            handleFirestoreError(err, OperationType.WRITE, `users/${user.email.trim().toLowerCase()}`);
          }
        }
      };
      
      // Debounce saving to prevent fast successive writes
      const timeoutId = setTimeout(saveToFirestore, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [tasks, blocks, autopilot, user]);

  const handleAuthenticated = (authUser: { email: string; displayName: string }) => {
    setUser(authUser);
    localStorage.setItem('life_saver_user', JSON.stringify(authUser));
    fetchUserData(authUser.email);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('life_saver_user');
    initialLoadCompleted.current = false;
    setTasks(INITIAL_TASKS);
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
    setStatusText("Autopilot scanner seeking study gaps... ⚙️");
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
        const testStart = `2026-06-23T${currentHourCursor.toString().padStart(2, '0')}:00:00`;
        const testEnd = `2026-06-23T${(currentHourCursor + 1).toString().padStart(2, '0')}:00:00`;

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
        const blockStart = `2026-06-23T${currentHourCursor.toString().padStart(2, '0')}:00:00`;
        const blockEnd = `2026-06-23T${(currentHourCursor + 1).toString().padStart(2, '0')}:00:00`;

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
    addSystemLog(`Autopilot optimized: arranged ${scheduledCount} study intervals.`, 'scheduled');
  }, [blocks, addSystemLog]);

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
      start: `2026-06-23T${sH.toString().padStart(2, '0')}:00:00`,
      end: `2026-06-23T${eH.toString().padStart(2, '0')}:00:00`,
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
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-500/10 text-amber-500">
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
            <p className="mt-2 text-amber-500/80 font-semibold">* Note: In Google AI Studio, this is automatically configured for you via the Firebase tool in the lower-right menu.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthGateway onAuthenticated={handleAuthenticated} theme={theme} />;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-white" id="main-application-frame">
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
      />

      {/* Primary Dashboard Body Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Row 1: Syllabus PDF & Screengrab Ingestion */}
        <SyllabusUploader
          onExtract={handleExtractTasks}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
          setStatusText={setStatusText}
        />

        {/* Syllabus Calendar & Assignment Board */}
        <DeadlinesList
          tasks={tasks}
          onToggleSubtask={handleToggleSubtask}
          onAddTask={handleAddTask}
          onDeleteTask={handleDeleteTask}
          onStartFocus={handleStartFocus}
        />

        {/* Live Course Progression Analytics */}
        <Analytics
          tasks={tasks}
          onAddSystemLog={addSystemLog}
        />

        {/* Row 2: Grid distribution split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Column A (Left): Task Board with Sub-tasks checklists & Cognitive Logs HUD */}
          <div className="lg:col-span-7 space-y-6">
            {/* Cognitive Logs HUD */}
            <AgentLogsHUD
              logs={logs}
              onClearLogs={() => setLogs([])}
              statusText={statusText}
            />
          </div>

          {/* Column B (Right): Interactive Timetable calendar + chat / timer panels */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Quick Tips and Suggestions Tooltip System */}
            <QuickTips tasks={tasks} onAddSystemLog={addSystemLog} />
            
            {/* Split row for widgets depending on active binding */}
            <div className="grid grid-cols-1 gap-6">
              {/* Core Countdown active clock state */}
              <ActiveTimer
                activeSubtask={activeSubtask}
                onFinishSubtask={(tId, sId) => {
                  handleToggleSubtask(tId, sId);
                  setActiveSubtask(null);
                }}
                onAddSystemLog={addSystemLog}
              />

              {/* Chat companion portal */}
              <ChatAssistant
                currentTasks={tasks}
                onTriggerOptimization={() => autoScheduleBlocks()}
                statusText={statusText}
                isProcessing={isProcessing}
                onAddSystemLog={addSystemLog}
              />
            </div>

            {/* Calendar Blocks list planner */}
            <CalendarPlanner
              blocks={blocks}
              tasks={tasks}
              onToggleBlockComplete={handleToggleBlockComplete}
              onClearBlocks={handleClearBlocks}
              onAutoSchedule={() => autoScheduleBlocks()}
              onAddManualBlock={handleAddManualBlock}
            />
          </div>
        </div>
      </main>

      {/* Ambient status indicator footer */}
      <footer className="py-6 px-6 border-t border-neutral-850 bg-neutral-950 mt-12 text-center text-xs text-neutral-600 font-mono flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© 2026 The Last-Minute Life Saver. Autonomous Agenda Optimization.</p>
        <div className="flex gap-4">
          <span>Client Storage: DURABLE</span>
          <span>Security Rules: ENABLED</span>
          <span>Model: Gemini 3.5 Flash</span>
        </div>
      </footer>
    </div>
  );
}
