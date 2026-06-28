import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, Sparkles, FolderOpen, Image, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SyllabusUploaderProps {
  onExtract: (extractedTasks: any[]) => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
  setStatusText: (text: string) => void;
}

const TEMPLATES = [
  {
    id: "calc",
    label: "Project Brief & Deliverable Plan (Pasted text)",
    category: "General",
    description: "Multi-week timeline with client deliverables, project milestones & key deadlines.",
    content: `Math 221 - Calculus III: Multivariable Calculus
Instructor: Dr. Vance (Fall 2026)

DUE DATES:
* Quiz 1: Limit proofs, functions of several variables due next Wednesday, July 1st, 2026.
* Homework 3: Partial derivatives, gradients, tangent planes, chain rules - due Wednesday July 8th, 2026. Price: 30 pts.
* Midterm Exam: Thursday, July 16th, 2026 covers chapters 11-14. Focus on volume integration, polar conversions.
`
  }
];

export default function SyllabusUploader({ onExtract, isProcessing, setIsProcessing, setStatusText }: SyllabusUploaderProps) {
  const [pastedText, setPastedText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice input states
  const [isListening, setIsListening] = useState(false);
  const voiceLanguage = 'en-IN'; // Default to Hinglish/English
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn("Error stopping speech recognition:", e);
        }
      }
      setIsListening(false);
      return;
    }
    startListening();
  };

  const startListening = () => {
    setVoiceError(null);
    setErrorMessage(null);
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("Microphone speech recognition is not supported in this browser. Please use Google Chrome.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = voiceLanguage; 

      recognition.onstart = () => {
        setIsListening(true);
        setStatusText("Listening to Hinglish/English voice input... 🎙️");
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event);
        const errType = event ? event.error : "";
        if (errType === 'no-speech') {
          setVoiceError("No speech detected. Please speak clearly near your microphone.");
        } else if (errType === 'not-allowed') {
          setVoiceError("Microphone permission is blocked in this preview iframe. Try opening the app in a new tab, or type/paste your Hinglish text directly into the textbox below to test!");
        } else {
          setVoiceError(`Speech recognition is restricted in some iframe sandboxes. You can type/paste your Hinglish syllabus details directly into the text box below to parse!`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        
        setPastedText(transcript);
        
        const lastResult = event.results[event.results.length - 1];
        if (lastResult && lastResult.isFinal) {
          try {
            recognition.stop();
          } catch (e) {}
        }
      };

      recognition.start();
    } catch (err: any) {
      console.error(err);
      setVoiceError("Could not start speech recognition service.");
      setIsListening(false);
    }
  };

  const localParseSyllabusText = (textContent: string) => {
    const refDateStr = new Date().toISOString().split('T')[0];
    const parts = refDateStr.split('-');
    const today = parts.length === 3 
      ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0) 
      : new Date();

    const getOffsetDateStr = (offsetDays: number) => {
      const d = new Date(today);
      d.setDate(today.getDate() + offsetDays);
      const y = d.getFullYear();
      const m = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const cleanText = textContent || "";
    const lines = cleanText
      .split(/\n|\r|;|•|\|/)
      .map(line => line.trim())
      .filter(line => line.length > 5);

    let extractedTasks: any[] = [];

    for (const line of lines) {
      const lineLower = line.toLowerCase();
      
      // Relative Date Detection for this specific line
      let offset = 0; // default to today
      let foundRelative = false;
      let deadlineStr = "";

      // Parse yesterday
      if (lineLower.includes("yesterday") || (lineLower.includes("kal") && (lineLower.includes("tha") || lineLower.includes("beeta") || lineLower.includes("was")))) {
        offset = -1;
        foundRelative = true;
        deadlineStr = getOffsetDateStr(-1);
      }
      // Parse tomorrow
      else if (lineLower.includes("tomorrow") || lineLower.includes("tommorow") || lineLower.includes("kal") || lineLower.includes("parso") || lineLower.includes("parson")) {
        if (lineLower.includes("parso") || lineLower.includes("parson")) {
          offset = 2;
        } else {
          offset = 1;
        }
        foundRelative = true;
        deadlineStr = getOffsetDateStr(offset);
      }
      // Parse today
      else if (lineLower.includes("today") || lineLower.includes("aaj") || lineLower.includes("now") || lineLower.includes("abhibhi")) {
        offset = 0;
        foundRelative = true;
        deadlineStr = getOffsetDateStr(0);
      }

      if (!foundRelative) {
        // Look for days of week
        const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const foundDayIdx = days.findIndex(d => lineLower.includes(d));
        if (foundDayIdx !== -1) {
          const todayDay = today.getDay();
          let targetOffset = foundDayIdx - todayDay;
          if (targetOffset <= 0) targetOffset += 7; // next week
          offset = targetOffset;
          deadlineStr = getOffsetDateStr(offset);
          foundRelative = true;
        } else {
          // Default to a rolling deadline like 2 days from now to give realistic pacing
          offset = 2;
          deadlineStr = getOffsetDateStr(offset);
          foundRelative = true;
        }
      }

      // Subject/Category Detection
      let subject = "Academics";
      let category = "Academics";
      let estHours = 3;
      let priority = "medium";

      if (lineLower.includes("physics") || lineLower.includes("bhautik") || lineLower.includes("lab")) {
        subject = "Physics Lab Report";
        category = "Academics";
        estHours = 4;
        priority = "high";
      } else if (lineLower.includes("math") || lineLower.includes("calculus") || lineLower.includes("ganit") || lineLower.includes("quiz")) {
        subject = "Math Assignment";
        category = "Academics";
        estHours = 3;
        priority = "critical";
      } else if (lineLower.includes("computer") || lineLower.includes("cs") || lineLower.includes("coding") || lineLower.includes("programming") || lineLower.includes("project")) {
        subject = "Computer Science Project";
        category = "Project";
        estHours = 6;
        priority = "high";
      } else if (lineLower.includes("marketing") || lineLower.includes("campaign") || lineLower.includes("launch")) {
        subject = "Marketing Strategy";
        category = "Launch";
        estHours = 5;
        priority = "high";
      } else if (lineLower.includes("history") || lineLower.includes("itihas") || lineLower.includes("essay")) {
        subject = "History Research Essay";
        category = "Project";
        estHours = 4;
        priority = "medium";
      } else if (lineLower.includes("chemistry") || lineLower.includes("chem")) {
        subject = "Chemistry Practical";
        category = "Academics";
        estHours = 3;
        priority = "medium";
      } else if (lineLower.includes("biology") || lineLower.includes("bio")) {
        subject = "Biology Diagram Task";
        category = "Academics";
        estHours = 2;
        priority = "low";
      } else {
        const words = line.split(/\s+/).filter(w => w.trim().length > 0).slice(0, 4);
        subject = words.join(" ") || "Syllabus Task";
        subject = subject.replace(/^[-*•+\s]+/, "");
        subject = subject.charAt(0).toUpperCase() + subject.slice(1);
      }

      let formattedTitle = subject;
      if (offset === -1) {
        formattedTitle = `${subject} (Backlog)`;
      } else if (offset === 0) {
        formattedTitle = `${subject} (Due Today)`;
      } else if (offset === 1) {
        formattedTitle = `${subject} (Due Tomorrow)`;
      } else if (offset === 2) {
        formattedTitle = `${subject} (Due Day After)`;
      }

      const subtasks = [
        { id: `local-sub-${Date.now()}-${Math.random()}`, title: `Read the syllabus and criteria details thoroughly`, completed: false, estimatedMinutes: 45 },
        { id: `local-sub-${Date.now()}-${Math.random()}`, title: `Draft core structure & gather references in English`, completed: false, estimatedMinutes: 90 },
        { id: `local-sub-${Date.now()}-${Math.random()}`, title: `Incorporate specific task requirements & verify results`, completed: false, estimatedMinutes: 45 },
        { id: `local-sub-${Date.now()}-${Math.random()}`, title: `Final formatting and submit on student dashboard`, completed: false, estimatedMinutes: 30 }
      ];

      extractedTasks.push({
        id: `local-task-${Date.now()}-${Math.random()}`,
        title: formattedTitle,
        description: `Auto-extracted from: "${line}"`,
        originalDeadline: deadlineStr,
        priority: priority,
        estimatedHours: estHours,
        status: "backlog",
        category: category,
        subtasks: subtasks,
        tags: []
      });
    }

    if (extractedTasks.length === 0) {
      const lower = cleanText.toLowerCase();
      let hasYesterday = lower.includes("yesterday") || (lower.includes("kal") && (lower.includes("tha") || lower.includes("beeta") || lower.includes("was")));
      let hasTomorrow = lower.includes("tomorrow") || lower.includes("tommorow") || lower.includes("kal") || lower.includes("parso") || lower.includes("parson");

      if (hasYesterday) {
        extractedTasks.push({
          id: `local-task-yest-${Date.now()}`,
          title: "Academics Revision (Backlog)",
          description: `Auto-parsed task due yesterday: "${cleanText}"`,
          originalDeadline: getOffsetDateStr(-1),
          priority: "high",
          estimatedHours: 3.5,
          status: "backlog",
          category: "Academics",
          tags: [],
          subtasks: [
            { id: `sub-yest-1-${Date.now()}`, title: "Review instructions and guidelines", completed: false, estimatedMinutes: 45 },
            { id: `sub-yest-2-${Date.now()}`, title: "Draft core sections to clear backlog", completed: false, estimatedMinutes: 120 },
            { id: `sub-yest-3-${Date.now()}`, title: "Review and submit", completed: false, estimatedMinutes: 45 }
          ]
        });
      } else if (hasTomorrow) {
        extractedTasks.push({
          id: `local-task-tom-${Date.now()}`,
          title: "Core Preparation Objective",
          description: `Scheduled target due tomorrow: "${cleanText}"`,
          originalDeadline: getOffsetDateStr(1),
          priority: "high",
          estimatedHours: 4,
          status: "backlog",
          category: "Project",
          tags: [],
          subtasks: [
            { id: `sub-tom-1-${Date.now()}`, title: "Gather reference materials", completed: false, estimatedMinutes: 60 },
            { id: `sub-tom-2-${Date.now()}`, title: "Solve key problem sets or code segments", completed: false, estimatedMinutes: 120 },
            { id: `sub-tom-3-${Date.now()}`, title: "Verify with syllabus checklists", completed: false, estimatedMinutes: 60 }
          ]
        });
      } else {
        extractedTasks.push({
          id: `local-task-today-${Date.now()}`,
          title: "Syllabus Extraction Milestone",
          description: `Extracted scheduled objective: "${cleanText}"`,
          originalDeadline: getOffsetDateStr(0),
          priority: "medium",
          estimatedHours: 3,
          status: "backlog",
          category: "Academics",
          tags: [],
          subtasks: [
            { id: `sub-tod-1-${Date.now()}`, title: "Establish work setup", completed: false, estimatedMinutes: 30 },
            { id: `sub-tod-2-${Date.now()}`, title: "Perform deep work focus sprint", completed: false, estimatedMinutes: 120 },
            { id: `sub-tod-3-${Date.now()}`, title: "Final submission and validation", completed: false, estimatedMinutes: 30 }
          ]
        });
      }
    }

    return extractedTasks;
  };

  // Parse simulated file or direct text upload
  const handleExtractPress = async (customContent?: string) => {
    const textToAnalyze = customContent || pastedText.trim();
    if (!textToAnalyze && !customContent) {
      setErrorMessage("Please enter or paste list, prompt, or select a template first.");
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setStatusText("Deep learning scanner investigating structure... 🧠");

    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          textContent: textToAnalyze,
          clientDate: new Date().toISOString().split('T')[0]
        }),
      });

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error("Syllabus payload is too large for the server. Try pasting a shorter chunk or typing details directly to parse!");
        }
        console.warn(`Server responded with ${response.status}. Falling back to client-side parsing fallback...`);
        const clientTasks = localParseSyllabusText(textToAnalyze);
        onExtract(clientTasks);
        setStatusText(`Successfully parsed ${clientTasks.length} tasks locally (Client Fallback) ⚙️`);
        setPastedText("");
        return;
      }

      const resData = await response.json();
      if (resData.success) {
        onExtract(resData.tasks);
        setStatusText(`Successfully extracted ${resData.tasks.length} core tasks! Autopilot calibrating schedule... ⚙️`);
        setPastedText("");
      } else {
        console.warn("Server parsed failed flag. Falling back to local parser.");
        const clientTasks = localParseSyllabusText(textToAnalyze);
        onExtract(clientTasks);
        setStatusText(`Successfully parsed ${clientTasks.length} tasks locally (Client Fallback) ⚙️`);
        setPastedText("");
      }
    } catch (err: any) {
      console.warn("Connection to server failed or 404. Falling back to client-side local parser.", err);
      try {
        const clientTasks = localParseSyllabusText(textToAnalyze);
        onExtract(clientTasks);
        setStatusText(`Successfully parsed ${clientTasks.length} tasks locally (Client Fallback) ⚙️`);
        setPastedText("");
      } catch (fallbackErr: any) {
        console.error("Local parser error:", fallbackErr);
        setErrorMessage(err.message || "An unexpected error occurred during syllabus processing.");
        setStatusText("Extraction failed due to an unexpected interruption ⚠️");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag and drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processSimulatedFile = (filename: string) => {
    setIsProcessing(true);
    setStatusText(`Simulating OCR Scanner on uploaded brief: ${filename}...`);
    setTimeout(() => {
      // Generate realistic extracted text with today, yesterday, and tomorrow relative dates
      const nameLower = filename.toLowerCase();
      let dateKeyword = "today";
      if (nameLower.includes("yesterday") || nameLower.includes("backlog")) {
        dateKeyword = "yesterday";
      } else if (nameLower.includes("tomorrow") || nameLower.includes("future") || nameLower.includes("prep")) {
        dateKeyword = "tomorrow";
      } else {
        // If it's a generic file, include yesterday, today, and tomorrow references to showcase parsing!
        const simulatedText = `Syllabus Schedule from OCR scan of ${filename}:
- Math homework on partial derivatives is due yesterday. 3 hours.
- Computer Science assignment on binary search trees is due today. 5 hours.
- Physics Lab report on lens magnification and refraction is due tomorrow. 4 hours.`;
        handleExtractPress(simulatedText);
        return;
      }
      
      const simulatedText = `Extracted Text from OCR of: ${filename}\nDue ${dateKeyword}: Physics Project Milestone 2. Estimated 4 hours. Subtasks: finalize circuit assembly; measure resistance coefficients; write final report.`;
      handleExtractPress(simulatedText);
    }, 1500);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processSimulatedFile(file.name);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSimulatedFile(e.target.files[0].name);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 md:p-6 relative overflow-hidden" id="task-uploader-container">
      {/* Background Accent Grid */}
      <div className="absolute inset-0 bg-radial-gradient from-purple-500/5 to-transparent pointer-events-none opacity-40" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5 border-b border-neutral-800/60 pb-4 relative z-10">
        <div>
          <h2 className="text-sm font-sans font-bold text-neutral-200 flex items-center gap-1.5 uppercase tracking-wider">
            <FolderOpen className="w-4 h-4 text-purple-500" />
            Project Brief, Syllabus & Agenda Importer
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Paste project briefs, agendas, syllabus files, client requirements, or type custom tasks to automatically extract structured milestones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isProcessing ? (
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs font-mono text-purple-400">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
              Parsing Schedules...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-neutral-950/60 rounded-full text-[10px] font-mono text-neutral-500">
              Active
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 relative z-10">
        {/* Input box */}
        <div className="lg:col-span-7 flex flex-col gap-3.5">
          <div className="relative">
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste project briefs, syllabus segments, client requirements, or type: Deliver prototype by Friday, estimate 5 hours."
              className="w-full min-h-[105px] text-xs bg-neutral-950 text-neutral-100 placeholder-neutral-600 rounded-xl p-4 pr-12 pb-14 border border-neutral-800/60 focus:border-purple-500/50 focus:outline-none transition-colors duration-200 resize-none leading-relaxed font-sans"
              disabled={isProcessing}
            />
            <div className="absolute right-3.5 bottom-3.5 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleListening}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-sans font-bold transition-all duration-300 cursor-pointer ${
                  isListening
                    ? "bg-rose-600 text-white animate-pulse shadow-md shadow-rose-500/25 opacity-100"
                    : "bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white opacity-100 shadow-sm"
                }`}
                title="Dictate project schedules using voice"
              >
                {isListening ? (
                  <>
                    <MicOff className="w-3.5 h-3.5 text-white animate-pulse opacity-100" />
                    <span className="opacity-100">Stop Mic</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-white opacity-100 stroke-[2.5]" />
                    <span className="opacity-100">Speak (Mic)</span>
                  </>
                )}
              </button>

              {isListening && (
                <div className="flex items-center gap-1 text-[9px] font-mono text-rose-400 animate-pulse bg-neutral-900 border border-neutral-800 px-2 py-1 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>On</span>
                </div>
              )}

              {pastedText && (
                <button
                  type="button"
                  onClick={() => setPastedText("")}
                  className="text-[10px] font-mono text-neutral-500 hover:text-neutral-300 transition-colors bg-neutral-900 border border-neutral-800 px-2 py-1.5 rounded-lg"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {voiceError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-3.5 py-2.5 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{voiceError}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3.5">
            {/* Drag and Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 min-h-[50px] border-2 border-dashed rounded-xl flex items-center justify-center p-3 text-center cursor-pointer select-none transition-all duration-200 ${
                dragActive
                  ? "border-purple-500 bg-purple-500/5 text-purple-400"
                  : "border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-950/50 text-neutral-500"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpeg,.jpg,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 shrink-0 text-neutral-400" />
                <span className="font-sans text-[11px] font-medium truncate">
                  {dragActive ? "Drop files here!" : "Drag project document / screenshot or click"}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleExtractPress()}
              disabled={isProcessing || !pastedText.trim()}
              className={`h-[50px] shrink-0 sm:w-[150px] rounded-xl flex items-center justify-center gap-1.5 font-sans font-semibold text-xs transition-all duration-200 ${
                !pastedText.trim() || isProcessing
                  ? "bg-neutral-800 text-neutral-500 border border-neutral-800/50 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white shadow-md shadow-purple-500/10 cursor-pointer"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Extract Tasks
            </button>
          </div>

          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-3.5 py-2.5 rounded-xl flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Demo Templates */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div className="bg-neutral-950/40 rounded-xl p-4 border border-neutral-800/40">
            <h3 className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-neutral-400" />
              Practice Syllabi Blueprints
            </h3>
            <div className="flex flex-col gap-3">
              {TEMPLATES.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setPastedText(item.content);
                  }}
                  disabled={isProcessing}
                  className="w-full text-left p-3.5 rounded-xl bg-neutral-950 hover:bg-neutral-900 border border-neutral-850 hover:border-neutral-800 transition-all duration-200 group flex gap-3 cursor-pointer"
                >
                  <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 shrink-0 text-purple-400 group-hover:text-purple-300 font-mono text-[10px] font-bold">
                    {item.category}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-sans font-medium text-xs text-neutral-300 group-hover:text-neutral-100 transition-colors leading-tight">
                      {item.label}
                    </h4>
                    <p className="font-sans text-[10px] text-neutral-500 mt-1 line-clamp-1">
                      {item.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* No secure local proxy text here */}
        </div>
      </div>
    </div>
  );
}
