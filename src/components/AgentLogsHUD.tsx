import React from 'react';
import { Activity, ShieldCheck, Terminal, Trash, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AgentLog } from '../types';

interface AgentLogsHUDProps {
  logs: AgentLog[];
  onClearLogs: () => void;
  statusText: string;
}

export default function AgentLogsHUD({ logs, onClearLogs, statusText }: AgentLogsHUDProps) {
  return (
    <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-4 md:p-5 shadow-xl flex flex-col h-[180px]" id="agent-logs-hud-container">
      {/* HUD Header */}
      <div className="flex items-center justify-between border-b border-neutral-800/60 pb-2.5 mb-2.5">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">
            Activity & System Logs
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {onClearLogs && (
            <button
              onClick={onClearLogs}
              className="text-[9px] font-mono hover:text-neutral-300 text-neutral-500 border border-neutral-800 hover:border-neutral-700 bg-neutral-950 px-2 py-0.5 rounded transition-all cursor-pointer"
            >
              Clear Logs
            </button>
          )}
          <span className="flex h-1.5 w-1.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
        </div>
      </div>

      {/* Actual Logs Stream */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <p className="font-mono text-[10px] text-neutral-600">
              No recent activity. Import a syllabus or click "Optimize Now" to populate.
            </p>
          </div>
        ) : (
          <div className="font-mono text-[10px] text-neutral-300 space-y-1.5">
            {logs.map((log) => {
              const colors = {
                info: 'text-neutral-400',
                optimizing: 'text-amber-400 font-medium',
                tracking: 'text-sky-400',
                scheduled: 'text-emerald-400 font-bold',
                warning: 'text-amber-500',
                alert: 'text-rose-400 animate-pulse font-medium'
              }[log.type] || 'text-neutral-400';

              return (
                <div key={log.id} className="flex items-start gap-2 border-b border-neutral-800/10 pb-1 leading-normal selection:bg-amber-500/20">
                  <span className="text-[9px] text-neutral-500 shrink-0 select-none">
                    [{log.timestamp}]
                  </span>
                  <p className={`flex-1 ${colors}`}>
                    <span className="text-neutral-600 mr-1">⚡</span>
                    {log.text}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
