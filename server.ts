import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser limits elevated to handle screenshot uploads easily
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Helper to check for Gemini API key
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("WARNING: GEMINI_API_KEY is not configured or still placeholder in server.ts");
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// Helper function to call generateContent with automatic fallback chain on error
const generateContentWithFallback = async (ai: GoogleGenAI, params: any) => {
  const primaryModel = params.model || "gemini-3.5-flash";
  try {
    console.log(`[Gemini] Routing request via primary model ${primaryModel}...`);
    return await ai.models.generateContent(params);
  } catch (err: any) {
    console.log(`[Gemini] Note: Primary model ${primaryModel} is under heavy load. routing request via backup model 'gemini-3.1-flash-lite'...`);
    try {
      const fallbackParams = {
        ...params,
        model: "gemini-3.1-flash-lite"
      };
      return await ai.models.generateContent(fallbackParams);
    } catch (err2: any) {
      console.log(`[Gemini] Note: Backup model 'gemini-3.1-flash-lite' is under heavy load. Routing request via tertiary model 'gemini-flash-latest'...`);
      try {
        const tertiaryParams = {
          ...params,
          model: "gemini-flash-latest"
        };
        return await ai.models.generateContent(tertiaryParams);
      } catch (err3: any) {
        console.log(`[Gemini] All fallback models are currently under heavy load or offline.`);
        throw new Error("Gemini API models currently under heavy load.");
      }
    }
  }
};

// API Route: Health verification
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    aiEngine: process.env.GEMINI_API_KEY ? "connected" : "mock_fallback"
  });
});

// API Route: OTP delivery console simulator and Apps Script dispatcher
app.post("/api/auth/send-otp", async (req, res) => {
  const { email, otp } = req.body;
  console.log("\n========================================================");
  console.log(`[AUTH SERVICE] PASSWORD RESET SECURITY OTP EN ROUTE:`);
  console.log(`Destination: ${email}`);
  console.log(`Security Code: ${otp}`);
  console.log("========================================================\n");

  const appsScriptUrl = process.env.APPS_SCRIPT_URL;
  if (appsScriptUrl && appsScriptUrl.trim() !== "") {
    try {
      console.log(`[AUTH SERVICE] Forwarding OTP delivery request to Google Apps Script Web App...`);
      const response = await fetch(appsScriptUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp }),
      });
      
      const responseText = await response.text();
      console.log(`[AUTH SERVICE] Apps Script Response status: ${response.status}. Response body:`, responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseErr) {
        responseData = { raw: responseText };
      }
      
      if (response.ok) {
        res.json({ 
          success: true, 
          message: "OTP successfully sent to your email using Google Apps Script!",
          appsScriptResponse: responseData
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: `Google Apps Script returned an error (status ${response.status}).`,
          error: responseText
        });
      }
    } catch (fetchErr: any) {
      console.error(`[AUTH SERVICE] Error communicating with Apps Script:`, fetchErr);
      res.status(500).json({ 
        success: false, 
        message: "Failed to dispatch email via Google Apps Script.", 
        error: fetchErr.message || String(fetchErr) 
      });
    }
  } else {
    // Fallback mode for developer preview / local environment
    console.warn("[AUTH SERVICE] APPS_SCRIPT_URL is not configured. Falling back to simulator console delivery.");
    res.json({ 
      success: true, 
      message: "Security OTP simulated! Check your developer console or use the automatic helper.", 
      simulated: true,
      otp: otp // Keep it working seamlessly in developer preview!
    });
  }
});

// Helper function to mock parse syllabus or text prompts with relative date matching
const mockParseSyllabusText = (textContent: string, clientDate?: string) => {
  const lower = (textContent || "").toLowerCase();
  
  // Parse clientDate or default to today's date
  const refDateStr = clientDate || new Date().toISOString().split('T')[0];
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

  let tasks = [];

  // Subject and Category detection
  let subject = "Academics";
  let category = "Academics";
  if (lower.includes("physics") || lower.includes("bhautik")) {
    subject = "Physics Lab";
    category = "Academics";
  } else if (lower.includes("math") || lower.includes("calculus") || lower.includes("ganit")) {
    subject = "Mathematics Quiz";
    category = "Academics";
  } else if (lower.includes("computer") || lower.includes("cs") || lower.includes("coding") || lower.includes("lab") || lower.includes("os")) {
    subject = "Computer Science Assignment";
    category = "Project";
  } else if (lower.includes("marketing") || lower.includes("campaign") || lower.includes("launch")) {
    subject = "Marketing Campaign";
    category = "Launch";
  } else if (lower.includes("history") || lower.includes("itihas")) {
    subject = "History Research Paper";
    category = "Project";
  }

  // Look for relative keywords "yesterday" (or "kal" in a past context), "tomorrow" (or "kal"), and "today" (or "aaj")
  const hasYesterday = lower.includes("yesterday") || (lower.includes("kal") && (lower.includes("tha") || lower.includes("beeta") || lower.includes("was")));
  const hasTomorrow = lower.includes("tomorrow") || lower.includes("tommorow") || lower.includes("kal") || lower.includes("parso") || lower.includes("parson");
  const hasToday = lower.includes("today") || lower.includes("aaj") || (!hasYesterday && !hasTomorrow); // default to today if unspecified

  if (hasYesterday) {
    tasks.push({
      title: `${subject} Revision`,
      description: `Auto-translated assignment due yesterday: "${textContent}"`,
      originalDeadline: getOffsetDateStr(-1),
      priority: "high",
      estimatedHours: 3.5,
      category: category,
      subtasks: [
        { title: "Review past requirements and syllabus milestones", estimatedMinutes: 45 },
        { title: "Draft high-priority sections to clear backlog", estimatedMinutes: 120 },
        { title: "Final check and submit on student portal", estimatedMinutes: 45 }
      ]
    });
  }
  
  if (hasToday) {
    tasks.push({
      title: `${subject} Urgency`,
      description: `Auto-translated assignment due today: "${textContent}"`,
      originalDeadline: getOffsetDateStr(0),
      priority: "critical",
      estimatedHours: 4,
      category: category,
      subtasks: [
        { title: "Review assignment criteria and layout guidelines", estimatedMinutes: 60 },
        { title: "Execute priority modules and content development", estimatedMinutes: 150 },
        { title: "Perform final verification checks & submit", estimatedMinutes: 30 }
      ]
    });
  }

  if (hasTomorrow) {
    tasks.push({
      title: `${subject} Prep`,
      description: `Auto-translated assignment due tomorrow: "${textContent}"`,
      originalDeadline: getOffsetDateStr(1),
      priority: "high",
      estimatedHours: 4.5,
      category: category,
      subtasks: [
        { title: "Deconstruct assignment rules & requirements", estimatedMinutes: 45 },
        { title: "Develop core implementation and draft sections", estimatedMinutes: 180 },
        { title: "Refine language or code and execute submission", estimatedMinutes: 45 }
      ]
    });
  }

  // Fallback if no specific dynamic relative dates detected (or to ensure variety)
  if (tasks.length === 0) {
    tasks.push({
      title: "Math 101 Midterm Prep",
      description: "Covers Chapters 1-4: Limits, derivatives, optimization problems, and curve sketching.",
      originalDeadline: getOffsetDateStr(2),
      priority: "critical",
      estimatedHours: 6,
      category: "Academics",
      subtasks: [
        { title: "Review chapter 1-2 limit calculations", estimatedMinutes: 60 },
        { title: "Complete practice midterm problems", estimatedMinutes: 120 },
        { title: "Create sheet of master integration cheat codes", estimatedMinutes: 45 },
        { title: "Run dynamic 45-minute practice diagnostic test", estimatedMinutes: 45 }
      ]
    });
    tasks.push({
      title: "Computer Science BST Assignment",
      description: "Implement core insertion, deletion, and rotation commands in standard Python without external helpers.",
      originalDeadline: getOffsetDateStr(5),
      priority: "high",
      estimatedHours: 8,
      category: "Project",
      subtasks: [
        { title: "Read project specifications and write template classes", estimatedMinutes: 90 },
        { title: "Code balancing and tree rotation rotations", estimatedMinutes: 180 },
        { title: "Write custom stress-test framework with 10k insertions", estimatedMinutes: 90 },
        { title: "Polish clean coding standards and generate visual dump", estimatedMinutes: 60 }
      ]
    });
  }

  return tasks;
};

// API Route: Extraction of Tasks from files or syllabus texts
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { textContent, imageBase64, imageMime, clientDate } = req.body;
    const ai = getGeminiClient();

    // Dynamically calculate the reference date based on clientDate or current server time
    const refDateStr = clientDate || new Date().toISOString().split('T')[0];
    const refDateObj = new Date(refDateStr + 'T12:00:00');
    const dayName = refDateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const extractionPrompt = `
      You are 'The Last-Minute Life Saver' AI Engine. Your goal is to analyze the provided syllabus text, task description, schedule image, or user voice transcription, and extract a list of actionable assignments, projects, or exams.
      
      Current Date Reference: ${dayName} (ISO format: ${refDateStr}).
      
      Instructions for parsing:
      1. Carefully identify all upcoming items that need active preparation, coding, researching, study, or submission.
      2. The source text or speech may be in English, Hindi, or Hinglish (mixed English and Hindi) in an Indian speaking style (e.g., 'yaar kal exam hai physics ka, revision karna hai subah 9 baje' or 'we need to launch the marketing campaign on next Friday, add subtasks for design, content and emails, should take around 6 hours'). 
         - Translate any Hindi, Hinglish, or Indian slang parts into clean, professional English.
         - Convert the resulting tasks, titles, descriptions, and subtasks completely into English.
      3. Handle relative dates like 'today', 'yesterday', 'tomorrow' or 'kal' (tomorrow/yesterday), 'parso' (day after tomorrow) perfectly by calculating their exact YYYY-MM-DD date mathematically relative to the Current Date Reference: ${refDateStr}.
         - Today is ${refDateStr}
         - Tomorrow is 1 day after ${refDateStr}
         - Yesterday is 1 day before ${refDateStr}
         - For other days, calculate the correct day index relative to the day of the week of the current reference date ${refDateStr}.
      4. For each identified assignment, determine a realistic completion estimate in hours (e.g. general homework: 2 hours, midterms: 6 hours, papers: 8-10 hours, major projects: 12-15 hours).
      5. Create 3-5 specific, smaller atomic sub-tasks (milestones) for each task to guide the student from start to finish. Ensure each milestone has an estimated time in minutes (typically 30 to 180 mins).
      6. Characterize the priority of each: 'low', 'medium', 'high', 'critical'.
      
      Source Content:
      ${textContent ? `TEXT CONTENT/SYLLABUS DESCRIPTION:\n"""\n${textContent}\n"""\n` : "No direct text provided."}
    `;

    // Handle Mock Fallback if no real API Key
    if (!ai) {
      console.log("No Gemini API key. Injecting premium synthetic extracted tasks for presentation.");
      const mockTasks = mockParseSyllabusText(textContent || "", refDateStr);
      return res.json({ success: true, tasks: mockTasks, mode: "mock" });
    }

    // Call Real Gemini
    let response;
    
    if (imageBase64 && imageMime) {
      console.log(`Analyzing input image leveraging multimodal Gemini Flash... Mime: ${imageMime}`);
      const imagePart = {
        inlineData: {
          mimeType: imageMime,
          data: imageBase64,
        },
      };

      const textPart = {
        text: extractionPrompt
      };

      response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    originalDeadline: { type: Type.STRING },
                    priority: { type: Type.STRING, enum: ["low", "medium", "high", "critical"] },
                    estimatedHours: { type: Type.NUMBER },
                    category: { type: Type.STRING },
                    subtasks: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          estimatedMinutes: { type: Type.INTEGER }
                        },
                        required: ["title", "estimatedMinutes"]
                      }
                    }
                  },
                  required: ["title", "description", "originalDeadline", "priority", "estimatedHours", "subtasks"]
                }
              }
            },
            required: ["tasks"]
          }
        }
      });
    } else {
      console.log("Analyzing syllabus/description using text-only Gemini Flash...");
      response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents: extractionPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    originalDeadline: { type: Type.STRING },
                    priority: { type: Type.STRING, enum: ["low", "medium", "high", "critical"] },
                    estimatedHours: { type: Type.NUMBER },
                    category: { type: Type.STRING },
                    subtasks: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          estimatedMinutes: { type: Type.INTEGER }
                        },
                        required: ["title", "estimatedMinutes"]
                      }
                    }
                  },
                  required: ["title", "description", "originalDeadline", "priority", "estimatedHours", "subtasks"]
                }
              }
            },
            required: ["tasks"]
          }
        }
      });
    }

    const data = JSON.parse(response.text || "{}");
    return res.json({ success: true, tasks: data.tasks || [], mode: "gemini" });

  } catch (err: any) {
    console.log(`[Parser] Note: Gracefully activated local syllabus parser fallback. (Reason: ${err.message || err})`);
    const refDateStr = req.body.clientDate || new Date().toISOString().split('T')[0];
    const mockTasks = mockParseSyllabusText(req.body.textContent || "", refDateStr);
    return res.json({ success: true, tasks: mockTasks, mode: "fallback" });
  }
});

// API Route: Conversation chat with active context modeling
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { history, message, currentTasksState } = req.body;
    const ai = getGeminiClient();

    const todayDateInfo = "Tuesday, June 23, 2026";
    const systemInstruction = `
      You are 'The Last-Minute Life Saver' AI Companion, an autonomous, proactive, supportive productivity partner.
      Your primary job is to encourage the user, help them structure task backlogs, manage procrastination, and optimize their daily calendar effortlessly.
      
      Personality Principles:
      1. Sassy but deeply supportive and incredibly competent. Use highly motivating, proactive, light-hearted wit.
      2. Keep replies brief, punchy, beautiful, and structured with clean markdown.
      3. Proactively point out procrastination habits and encourage immediate Pomodoro deep-focus bursts.
      4. Today's date is: ${todayDateInfo}. Use this dates information to answer with precise context.
      
      User's Active Task List context:
      ${JSON.stringify(currentTasksState || [])}
      
      Always provide 2 or 3 brief action suggestion suggestions (e.g., ["Start Pomodoro Now", "Schedule Math Exam", "Re-optimize week"]) at the end of your response, returned as a JSON structure.
    `;

    // Mock response if no API Key is available
    if (!ai) {
      console.log("No Gemini API key. Generating high-quality proactive mock response.");
      let responseText = "";
      let suggestions = ["Start Focus Hour Now", "Let's Re-Optimize", "Explain Study Strategy"];
      
      const userMsg = message.toLowerCase();
      if (userMsg.includes("overwhelmed") || userMsg.includes("stressed") || userMsg.includes("anxious")) {
        responseText = `Breathe down! **The Last-Minute Life Saver** is fully synchronized.

Looking at your load, you have **2 major items** coming up. Specifically, the **Math 101 Midterm Prep** needs some urgent love within the next 4 days.

Here is the emergency micro-plan:
1. We will carve out direct **45 minutes** tonight at **7:00 PM** to tackle Chapters 1-2 limits.
2. I have auto-placed a 10-minute break with zero notifications directly after.
3. You do not need to look at the entire task yet. Just complete *one single sub-task*!

Should I activate Autopilot to lock this block in?`;
        suggestions = ["Activate Autopilot", "No, push to tomorrow", "Show Study Cheat Sheet"];
      } else if (userMsg.includes("optimize") || userMsg.includes("schedule") || userMsg.includes("procrastinate")) {
        responseText = `Initiating autonomous scanner sweep. 🛰️
Scanning for empty focus gaps between 8:00 AM and 10:00 PM:
- **Found block:** Wednesday morning gap (09:00 - 11:30)
- **Found block:** Thursday evening rest phase (19:30 - 21:00)

I have dynamically assigned these to **Computer Science Assignment 2** rotation and balancing algorithms. Completing these milestones now completely sweeps away last-minute panic.

Shall we lock these into your active agenda calendar?`;
        suggestions = ["Lock in Focus Blocks", "Adjust to Night-Owl Mode", "Set 25-min Timer"];
      } else {
        responseText = `I'm fully online and scanning your upcoming deadlines! 🎯 

With the current schedule, you've got everything completely locked-in. If you want, we can do a **25-minute Pomodoro study block** right now, or we can fetch tasks from any syllabus you drop in!

What is your immediate focus goal?`;
      }
      return res.json({
        success: true,
        text: responseText,
        suggestions
      });
    }

    // Call Real Gemini
    const contents = [];
    if (history && history.length > 0) {
      for (const hist of history) {
        contents.push({
          role: hist.role === "assistant" ? "model" : "user",
          parts: [{ text: hist.text }]
        });
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: `User message: ${message}\n\nCurrent State: ${JSON.stringify(currentTasksState || [])}` }]
    });

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING, description: "Your chat reply message. Standard supportive sassy markdown text." },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2 or 3 quick auto-clickable reply templates representing natural user choices."
            }
          },
          required: ["reply", "suggestions"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      text: parsed.reply || "I am listening closely. Let's conquer these deadlines!",
      suggestions: parsed.suggestions || ["Start Focus Session", "Optimize Schedule", "Show tasks"]
    });

  } catch (err: any) {
    console.log(`[Chat] Note: Gracefully activated local companion fallback. (Reason: ${err.message || err})`);
    // Graceful fallback response when real Gemini API call fails (e.g. 503 high demand)
    let responseText = "";
    let suggestions = ["Start Focus Hour Now", "Let's Re-Optimize", "Explain Study Strategy"];
    
    const userMsg = (req.body.message || "").toLowerCase();
    if (userMsg.includes("overwhelmed") || userMsg.includes("stressed") || userMsg.includes("anxious")) {
      responseText = `Breathe down! **The Last-Minute Life Saver** is fully synchronized.

Looking at your load, you have some tasks coming up. Specifically, your highest priority exam prep needs some urgent love within the next few days.

Here is the emergency micro-plan:
1. We will carve out direct **45 minutes** tonight at **7:00 PM** to tackle the first sub-task.
2. I have auto-placed a 10-minute break with zero notifications directly after.
3. You do not need to look at the entire task yet. Just complete *one single sub-task*!

Should I activate Autopilot to lock this block in?`;
      suggestions = ["Activate Autopilot", "No, push to tomorrow", "Show Study Cheat Sheet"];
    } else if (userMsg.includes("optimize") || userMsg.includes("schedule") || userMsg.includes("procrastinate")) {
      responseText = `Initiating autonomous scanner sweep. 🛰️
Scanning for empty focus gaps between 8:00 AM and 10:00 PM:
- **Found block:** Wednesday morning gap (09:00 - 11:30)
- **Found block:** Thursday evening rest phase (19:30 - 21:00)

I have dynamically assigned these to your high-priority study blocks. Completing these milestones now completely sweeps away last-minute panic.

Shall we lock these into your active agenda calendar?`;
      suggestions = ["Lock in Focus Blocks", "Adjust to Night-Owl Mode", "Set 25-min Timer"];
    } else {
      responseText = `I'm fully online and scanning your upcoming deadlines! 🎯 

With the current schedule, you've got everything completely locked-in. If you want, we can do a **25-minute Pomodoro study block** right now, or we can fetch tasks from any syllabus you drop in!

What is your immediate focus goal?`;
    }

    return res.json({
      success: true,
      text: responseText,
      suggestions,
      mode: "fallback"
    });
  }
});

// Helper function to mock parse voice transcripts in Hinglish/English/Hindi with elegant translation to English
const mockParseVoiceTask = (transcript: string, clientDate?: string) => {
  const lower = transcript.toLowerCase();
  
  // Set defaults
  let title = "Voice Task";
  let description = `Created from voice transcript: "${transcript}"`;
  let category = "Work";
  let priority: "low" | "medium" | "high" | "critical" = "medium";
  let estimatedHours = 2;
  
  // Parse relative date from clientDate or default to June 25, 2026
  const refDateStr = clientDate || "2026-06-25";
  const parts = refDateStr.split('-');
  const today = parts.length === 3 
    ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0) 
    : new Date(2026, 5, 25, 12, 0, 0);

  let deadlineDate = new Date(today);
  deadlineDate.setDate(today.getDate() + 3); // Default 3 days

  // Check for day modifications
  if (lower.includes("tomorrow") || lower.includes("kal") || lower.includes("agli subah") || lower.includes("agli subha")) {
    deadlineDate = new Date(today);
    deadlineDate.setDate(today.getDate() + 1);
  } else if (lower.includes("parso") || lower.includes("parson") || lower.includes("day after tomorrow")) {
    deadlineDate = new Date(today);
    deadlineDate.setDate(today.getDate() + 2);
  } else if (lower.includes("monday") || lower.includes("somvar") || lower.includes("somvaar")) {
    const day = today.getDay();
    const daysToAdd = (8 - day) % 7 || 7;
    deadlineDate = new Date(today);
    deadlineDate.setDate(today.getDate() + daysToAdd);
  } else if (lower.includes("tuesday") || lower.includes("mangalvar") || lower.includes("mangalvaar")) {
    const day = today.getDay();
    const daysToAdd = (9 - day) % 7 || 7;
    deadlineDate = new Date(today);
    deadlineDate.setDate(today.getDate() + daysToAdd);
  } else if (lower.includes("wednesday") || lower.includes("budhvar") || lower.includes("budhvaar")) {
    const day = today.getDay();
    const daysToAdd = (10 - day) % 7 || 7;
    deadlineDate = new Date(today);
    deadlineDate.setDate(today.getDate() + daysToAdd);
  } else if (lower.includes("thursday") || lower.includes("guruvar") || lower.includes("guruvaar") || lower.includes("veervar") || lower.includes("veervaar")) {
    const day = today.getDay();
    const daysToAdd = (11 - day) % 7 || 7;
    deadlineDate = new Date(today);
    deadlineDate.setDate(today.getDate() + daysToAdd);
  } else if (lower.includes("friday") || lower.includes("shukravar") || lower.includes("shukravaar")) {
    const day = today.getDay();
    const daysToAdd = (12 - day) % 7 || 7;
    deadlineDate = new Date(today);
    deadlineDate.setDate(today.getDate() + daysToAdd);
  } else if (lower.includes("saturday") || lower.includes("shanivar") || lower.includes("shanivaar")) {
    const day = today.getDay();
    const daysToAdd = (13 - day) % 7 || 7;
    deadlineDate = new Date(today);
    deadlineDate.setDate(today.getDate() + daysToAdd);
  } else if (lower.includes("sunday") || lower.includes("ravivar") || lower.includes("ravivaar")) {
    const day = today.getDay();
    const daysToAdd = (14 - day) % 7 || 7;
    deadlineDate = new Date(today);
    deadlineDate.setDate(today.getDate() + daysToAdd);
  }

  // Support duration parsing
  if (lower.includes("1 hour") || lower.includes("1 ghanta") || lower.includes("ek ghanta")) {
    estimatedHours = 1;
  } else if (lower.includes("2 hours") || lower.includes("2 ghante") || lower.includes("do ghante")) {
    estimatedHours = 2;
  } else if (lower.includes("3 hours") || lower.includes("3 ghante") || lower.includes("teen ghante")) {
    estimatedHours = 3;
  } else if (lower.includes("4 hours") || lower.includes("4 ghante") || lower.includes("char ghante")) {
    estimatedHours = 4;
  } else if (lower.includes("5 hours") || lower.includes("5 ghante") || lower.includes("paanch ghante")) {
    estimatedHours = 5;
  } else if (lower.includes("6 hours") || lower.includes("6 ghante") || lower.includes("chhe ghante")) {
    estimatedHours = 6;
  }

  // Detect Subject (English / Hindi / Hinglish translation)
  let subject = "";
  if (lower.includes("physics") || lower.includes("bhautik")) {
    subject = "Physics";
  } else if (lower.includes("chemistry") || lower.includes("rasayan")) {
    subject = "Chemistry";
  } else if (lower.includes("math") || lower.includes("ganit") || lower.includes("hisab")) {
    subject = "Mathematics";
  } else if (lower.includes("computer") || lower.includes("coding") || lower.includes("programming")) {
    subject = "Computer Science";
  } else if (lower.includes("history") || lower.includes("itihas")) {
    subject = "History";
  } else if (lower.includes("biology") || lower.includes("jeev")) {
    subject = "Biology";
  } else if (lower.includes("english") || lower.includes("angrezi")) {
    subject = "English";
  } else if (lower.includes("marketing") || lower.includes("bazar") || lower.includes("prachari")) {
    subject = "Marketing";
  }

  // Keywords logic
  if (lower.includes("exam") || lower.includes("pariksha") || lower.includes("test") || lower.includes("quiz") || lower.includes("revision") || lower.includes("doohraav") || lower.includes("padhna")) {
    title = subject ? `${subject} Exam Revision` : "Exam Preparation Study Block";
    category = "Academics";
    priority = "high";
    description = `Auto-translated: Complete deep study and active revision prep${subject ? ` for ${subject}` : ''}.`;
  } else if (lower.includes("meeting") || lower.includes("client") || lower.includes("baithak") || lower.includes("call") || lower.includes("synch")) {
    title = subject ? `${subject} Team Sync` : "Client Sync & Review Meeting";
    category = "Work";
    priority = "medium";
    description = `Auto-translated: Synchronize deliverables, milestones, and align next sprint objectives${subject ? ` for ${subject}` : ''}.`;
  } else if (lower.includes("launch") || lower.includes("campaign") || lower.includes("product") || lower.includes("start")) {
    title = subject ? `${subject} Launch Campaign` : "Marketing Campaign Launch Preparation";
    category = "Launch";
    priority = "critical";
    description = `Auto-translated: Orchestrate production, deployment steps, and monitor real-time launch metrics${subject ? ` for ${subject}` : ''}.`;
  } else if (lower.includes("project") || lower.includes("karya") || lower.includes("assignment") || lower.includes("report") || lower.includes("submit")) {
    title = subject ? `${subject} Project Assignment` : "Project Milestones Deliverables";
    category = "Project";
    priority = "high";
    description = `Auto-translated: Write, compile, test, and package syllabus submission deliverables${subject ? ` for ${subject}` : ''}.`;
  } else {
    title = "Syllabus Milestone Goal";
    category = "Personal";
    priority = "medium";
  }

  // Fallback specific subtasks based on category in English
  let subtasks = [
    { title: "Review requirements and draft initial outline", estimatedMinutes: 45 },
    { title: "Execute core task segments & content draft", estimatedMinutes: 90 },
    { title: "Final quality checks, reviews and submission", estimatedMinutes: 30 }
  ];

  if (category === "Academics") {
    subtasks = [
      { title: "Organize formulas, class notes, and syllabus materials", estimatedMinutes: 40 },
      { title: "Solve practice problems and sample question sets", estimatedMinutes: 90 },
      { title: "Draft high-yield flashcards and test-run weak topics", estimatedMinutes: 50 }
    ];
  } else if (category === "Project") {
    subtasks = [
      { title: "Draft technical architecture and initial implementation mockup", estimatedMinutes: 60 },
      { title: "Write code base or core content sections", estimatedMinutes: 120 },
      { title: "Run extensive tests, fix glitches, and format documentation", estimatedMinutes: 60 }
    ];
  } else if (category === "Launch") {
    subtasks = [
      { title: "Validate production configurations & environment variables", estimatedMinutes: 45 },
      { title: "Coordinate team roles and prepare active rollback procedures", estimatedMinutes: 60 },
      { title: "Go live, monitor server telemetry, and capture telemetry logs", estimatedMinutes: 120 }
    ];
  }

  return {
    title,
    description,
    category,
    priority,
    estimatedHours,
    deadline: deadlineDate.toISOString().split('T')[0],
    subtasks
  };
};

// API Route: Transcribe, translate, and parse voice task inputs
app.post("/api/gemini/voice-task", async (req, res) => {
  try {
    const { transcript, clientDate } = req.body;
    if (!transcript) {
      return res.status(400).json({ success: false, error: "Transcript is required" });
    }

    const ai = getGeminiClient();
    
    // Fallback if no Gemini client is configured
    if (!ai) {
      console.log("[Voice Task] No API key, running mock translator & parser");
      const parsed = mockParseVoiceTask(transcript, clientDate);
      return res.json({
        success: true,
        task: parsed,
        mode: "mock"
      });
    }

    // Prepare contextual date anchor for precise ISO translation
    const refDateStr = clientDate || "2026-06-25";
    const refDate = new Date(refDateStr + 'T12:00:00');
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const todayDateInfo = refDate.toLocaleDateString('en-US', options) + ` (ISO Format: ${refDateStr})`;

    const parsePrompt = `
      You are 'The Last-Minute Life Saver' AI Voice Assistant.
      You will receive a voice transcript of a user describing a task they want to add to their calendar.
      The user might speak in English, Hindi, or a mix of both (Hinglish) in an Indian speaking style. 
      E.g., 'yaar kal exam hai physics ka, revision karna hai subah 9 baje' or 'we need to launch the marketing campaign on next Friday, add subtasks for design, content and emails, should take around 6 hours'.

      Your job is to:
      1. Translate any Hindi, Hinglish, or Indian slang parts into clean, professional, or academic English.
      2. Parse the transcript to extract the following fields for a Task:
         - title: A concise, highly clear English task title suitable for a student, professional, or entrepreneur (e.g. 'Physics Exam Revision' or 'Marketing Campaign Launch').
         - description: A brief explanation of the task in English.
         - category: Choose the most fitting category out of: 'Academics', 'Project', 'Launch', 'Work', 'Personal'.
         - priority: Choose one of: 'low' | 'medium' | 'high' | 'critical'.
         - estimatedHours: A number representing total hours (default to 2 if not stated).
         - deadline: An ISO Date String (YYYY-MM-DD). Calculate this relative to current date: ${todayDateInfo}. E.g., 'tomorrow' or 'kal' is 1 day after, 'parso' is 2 days after, 'Monday' or 'somvar' is the next Monday, etc. Calculate mathematically based on ISO: ${refDateStr}. If no deadline is specified, default to 3 days from ${refDateStr}.
         - subtasks: A list of 3-5 logical, smaller, sequential steps (subtasks) in English to complete the main task, each with an estimatedMinutes (number, typically 30-120 mins).

      User's Voice Transcript: "${transcript}"
    `;

    console.log(`[Voice Task] Transcribing and parsing: "${transcript}"`);
    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: { parts: [{ text: parsePrompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            priority: { type: Type.STRING, enum: ["low", "medium", "high", "critical"] },
            estimatedHours: { type: Type.NUMBER },
            deadline: { type: Type.STRING },
            subtasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  estimatedMinutes: { type: Type.INTEGER }
                },
                required: ["title", "estimatedMinutes"]
              }
            }
          },
          required: ["title", "description", "category", "priority", "estimatedHours", "deadline", "subtasks"]
        }
      }
    });

    const responseText = response.text;
    const parsed = JSON.parse(responseText);

    return res.json({
      success: true,
      task: parsed,
      mode: "live"
    });

  } catch (err: any) {
    console.error("[Voice Task Error]", err);
    const parsedFallback = mockParseVoiceTask(req.body.transcript || "", req.body.clientDate);
    return res.json({
      success: true,
      task: parsedFallback,
      mode: "fallback",
      error: err.message || String(err)
    });
  }
});

// Configure Vite as Middleware in non-production mode, serving files statically in production
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite Developer server middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Production mode: Serving static client bundle from 'dist/'");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`The Last-Minute Life Saver is listening on http://0.0.0.0:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Fatal exception during server initiation: ", error);
});
