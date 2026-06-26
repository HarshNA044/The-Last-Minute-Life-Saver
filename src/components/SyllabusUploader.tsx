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
    label: "Calculus III Syllabus (Pasted text)",
    category: "Math",
    description: "Multi-week timeline with quiz deadlines, homework assignments & comprehensive midterms.",
    content: `Math 221 - Calculus III: Multivariable Calculus
Instructor: Dr. Vance (Fall 2026)

DUE DATES:
* Quiz 1: Limit proofs, functions of several variables due next Wednesday, July 1st, 2026.
* Homework 3: Partial derivatives, gradients, tangent planes, chain rules - due Wednesday July 8th, 2026. Price: 30 pts.
* Midterm Exam: Thursday, July 16th, 2026 covers chapters 11-14. Focus on volume integration, polar conversions.
`
  },
  {
    id: "cs",
    label: "CS 350 Syllabus: Operating Systems",
    category: "Computer Science",
    description: "Complex system design problems, file layout coding labs & core thread deadlock project.",
    content: `CS 350: Operating Systems
Fall 2026 Syllabus - Department of Engineering

REQUIRED RELEASES:
* Lab 1: Thread Scheduling & Locks synchronization. Implement thread sleep, yield, join loops. Due July 4th, 2026 at midnight.
* Major Project: Design virtual memory memory map file system. Requires custom TLB page replacement algorithms. Due July 20th, 2026 (very heavy load!).
`
  },
  {
    id: "marketing",
    label: "Product Launch Brief (Pasted text)",
    category: "Business",
    description: "Comprehensive timeline of campaign launches, press release schedules, and marketing deliverables.",
    content: `Q3 Product Launch Plan
Owner: Launch Management Office (Fall 2026)

CRITICAL DEADLINES:
* Kickoff Brief: Finalize slide deck and coordinate investor calendar invitations next Wednesday, July 1st, 2026.
* Social Media Assets: Create image banners, copy drafts, and coordinate publication approvals due Wednesday July 8th, 2026.
* Press Release Wire: Release official announcement wire to media outlets, covers core architecture and client pricing - due Thursday, July 16th, 2026.
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
  const [voiceLanguage, setVoiceLanguage] = useState<'en-IN' | 'hi-IN'>('en-IN');
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
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = voiceLanguage; 

      recognition.onstart = () => {
        setIsListening(true);
        setStatusText(voiceLanguage === 'hi-IN' ? "Aap boliye, hum sun rahe hain... 🎙️" : "Listening to your voice input... 🎙️");
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
      };

      recognition.start();
    } catch (err: any) {
      console.error(err);
      setVoiceError("Could not start speech recognition service.");
      setIsListening(false);
    }
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

      if (!response.ok) throw new Error("Server extraction pipeline error");

      const resData = await response.json();
      if (resData.success) {
        onExtract(resData.tasks);
        setStatusText(`Successfully extracted ${resData.tasks.length} core tasks! Autopilot calibrating schedule... ⚙️`);
        setPastedText("");
      } else {
        throw new Error(resData.message || "Failed to extract task data.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An unexpected error occurred during syllabus processing.");
      setStatusText("Extraction failed due to an unexpected interruption ⚠️");
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
      <div className="absolute inset-0 bg-radial-gradient from-amber-500/5 to-transparent pointer-events-none opacity-40" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5 border-b border-neutral-800/60 pb-4 relative z-10">
        <div>
          <h2 className="text-sm font-mono font-medium text-neutral-400 flex items-center gap-1.5 uppercase tracking-wider">
            <FolderOpen className="w-4 h-4 text-amber-500" />
            Project Brief & Syllabus Importer
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Paste project briefs, work deliverables, meeting prompts, or upload files to automatically generate structured milestones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isProcessing ? (
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-mono text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
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
              placeholder="Paste project briefs, syllabus segments, task list, or type something like:
- Client feedback and deck revisions due Friday, estimate 4 hours.
- Calculus exam prep or marketing kickoff plan due July 15."
              className="w-full min-h-[140px] text-xs bg-neutral-950 text-neutral-100 placeholder-neutral-600 rounded-xl p-4 border border-neutral-800/60 focus:border-amber-500/50 focus:outline-none transition-colors duration-200 resize-none leading-relaxed font-sans"
              disabled={isProcessing}
            />
            {pastedText && (
              <button
                onClick={() => setPastedText("")}
                className="absolute right-3.5 bottom-3.5 text-[10px] font-mono text-neutral-500 hover:text-neutral-300 transition-colors bg-neutral-900 border border-neutral-800 px-2 py-1 rounded"
              >
                Clear
              </button>
            )}
          </div>

          {/* Voice Microphone Controls panel */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-950/40 border border-neutral-850 p-3 rounded-xl">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={toggleListening}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold font-sans transition-all duration-300 cursor-pointer ${
                  isListening
                    ? "bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/35"
                    : "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 hover:text-amber-300"
                }`}
                title="Dictate project schedules using voice"
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4 text-white" />
                    <span>Stop Recording</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 text-amber-400" />
                    <span>Speak Brief (Mic)</span>
                  </>
                )}
              </button>
              
              {isListening && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-rose-400 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Listening...</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-neutral-500">Language:</span>
              <button
                type="button"
                onClick={() => setVoiceLanguage('en-IN')}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-medium transition-colors cursor-pointer ${
                  voiceLanguage === 'en-IN'
                    ? "bg-amber-500 text-neutral-950 font-semibold"
                    : "bg-neutral-900 text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Hinglish/English 🇮🇳
              </button>
              <button
                type="button"
                onClick={() => setVoiceLanguage('hi-IN')}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-medium transition-colors cursor-pointer ${
                  voiceLanguage === 'hi-IN'
                    ? "bg-amber-500 text-neutral-950 font-semibold"
                    : "bg-neutral-900 text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Hindi/हिन्दी 🇮🇳
              </button>
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
                  ? "border-amber-500 bg-amber-500/5 text-amber-500"
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
                  : "bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/10 cursor-pointer"
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
                    handleExtractPress(item.content);
                  }}
                  disabled={isProcessing}
                  className="w-full text-left p-3.5 rounded-xl bg-neutral-950 hover:bg-neutral-900 border border-neutral-850 hover:border-neutral-800 transition-all duration-200 group flex gap-3 cursor-pointer"
                >
                  <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 shrink-0 text-amber-500 group-hover:text-amber-400 font-mono text-[10px] font-bold">
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

          <div className="mt-4 flex items-center gap-2 text-[10px] font-mono text-neutral-500 bg-neutral-950/20 p-2.5 rounded-lg border border-neutral-800/10">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
            <span>Files are processed securely through a local server proxy without public exposure.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
