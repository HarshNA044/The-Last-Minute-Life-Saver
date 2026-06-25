import React, { useState, useEffect, useCallback } from 'react';
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

export default function App() {
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

  // Sync to local storage
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
          return { ...t, subtasks: updatedSubs };
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
                  return {
                    ...t,
                    subtasks: t.subtasks.map((st) => 
                      st.id === b.subTaskId ? { ...st, completed: nextVal } : st
                    )
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
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    addSystemLog(`User toggled application visual theme mode.`, 'info');
  };

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
