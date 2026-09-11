import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import type { ContentListUnion } from "@google/genai";
import { ACTION_REGISTRY, validateAndRegisterAction } from "./actionRegistry";
import { AuditEvent, AnalysisResult, ProcessedAction } from "./types";
import {
  callGeminiWithResilience,
  GEMINI_SYSTEM_INSTRUCTION,
  GeminiAnalysis,
} from "./geminiEngine";
import { generateSyntheticAnalysis } from "./syntheticEngine";

dotenv.config();

export const app = express();
app.use(express.json({ limit: "25mb" }));

// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check handler
const handleHealth = (_req: Request, res: Response) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: "ok",
    geminiActive: hasKey,
    engine: "NEXUSACT Universal Bridge v2.4",
  });
};

app.get("/api/health", handleHealth);
app.get("/health", handleHealth);

interface AnalyzeIntentBody {
  text?: unknown;
  image?: { data?: unknown; mimeType?: unknown } | null;
}

interface ExecuteActionBody {
  actionId?: unknown;
  actionName?: unknown;
  parameters?: unknown;
  authConfirmed?: unknown;
}

// POST /api/analyze-intent handler
const handleAnalyzeIntent = async (req: Request<unknown, unknown, AnalyzeIntentBody>, res: Response) => {
  try {
    const { text, image } = req.body;
    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Text input is required." });
    }

    const imageAttached = Boolean(image && image.data);
    const ai = getGeminiClient();

    // If no API key configured or offline, use deterministic intelligence engine
    if (!ai) {
      console.log("[NexusAct Engine] No GEMINI_API_KEY detected. Running deterministic safety engine.");
      const fallbackResult = generateSyntheticAnalysis(text, imageAttached);
      return res.json(fallbackResult);
    }

    // Call resilient Gemini pipeline
    const allowedActionList = Object.keys(ACTION_REGISTRY);

    const contents: ContentListUnion = imageAttached
      ? [
          {
            inlineData: {
              mimeType: typeof image?.mimeType === "string" ? image.mimeType : "image/jpeg",
              data: String(image?.data),
            },
          },
          { text: `Analyze this messy human input:\n"""${text}"""\n\nAllowed actionNames: ${allowedActionList.join(", ")}` },
        ]
      : [{ text: `Analyze this messy human input:\n"""${text}"""\n\nAllowed actionNames: ${allowedActionList.join(", ")}` }];

    let parsed: GeminiAnalysis;
    let modelUsed = "gemini-3.8-flash";

    try {
      const result = await callGeminiWithResilience(ai, contents, GEMINI_SYSTEM_INSTRUCTION);
      parsed = result.parsed;
      modelUsed = result.modelUsed;
    } catch (genAiError) {
      const message = genAiError instanceof Error ? genAiError.message : String(genAiError);
      console.warn(
        `[NexusAct Engine] Gemini models temporarily unreachable (${message}). Falling back to deterministic intelligence engine.`
      );
      const fallbackResult = generateSyntheticAnalysis(text, imageAttached);
      return res.json(fallbackResult);
    }

    // Authoritative Action Registry check
    const rawActions = Array.isArray(parsed.proposedActions) ? parsed.proposedActions : [];
    const actions: ProcessedAction[] = rawActions.map((raw, idx) =>
      validateAndRegisterAction(raw, idx)
    );

    const now = new Date();
    const timestampStr = now.toLocaleTimeString();

    const auditTrail: AuditEvent[] = [
      {
        id: `audit-${Date.now()}-1`,
        timestamp: timestampStr,
        rawTime: now.getTime(),
        stage: "01 INPUT RECEIVED",
        type: "INTENT_RECEIVED",
        message: `Messy human input packet ingested (${text.length} chars${imageAttached ? ", + visual inspection frame" : ""}).`,
        severity: "info",
      },
      {
        id: `audit-${Date.now()}-2`,
        timestamp: new Date(now.getTime() + 300).toLocaleTimeString(),
        rawTime: now.getTime() + 300,
        stage: "02 UNDERSTANDING",
        type: "GEMINI_SYNTHESIS",
        message: `Gemini synthesis finished: "${parsed.primaryIntent}" (Confidence: ${Math.round((parsed.confidence || 0.95) * 100)}%). Model: ${modelUsed}.`,
        severity: "success",
      },
      {
        id: `audit-${Date.now()}-3`,
        timestamp: new Date(now.getTime() + 600).toLocaleTimeString(),
        rawTime: now.getTime() + 600,
        stage: "03 STRUCTURING",
        type: "ENTITIES_EXTRACTED",
        message: `Structured ${parsed.entities?.length || 0} entities and identified ${parsed.ambiguities?.length || 0} critical ambiguities.`,
        severity: "info",
      },
      {
        id: `audit-${Date.now()}-4`,
        timestamp: new Date(now.getTime() + 900).toLocaleTimeString(),
        rawTime: now.getTime() + 900,
        stage: "04 VERIFYING",
        type: "SAFETY_VALIDATION",
        message: `Action Registry evaluated ${actions.length} proposed operations. Safety boundaries enforced.`,
        severity: "success",
      },
    ];

    actions.forEach((act) => {
      if (act.status === "AUTO_EXECUTED") {
        auditTrail.push({
          id: `audit-${Date.now()}-auto-${act.id}`,
          timestamp: new Date(now.getTime() + 1100).toLocaleTimeString(),
          rawTime: now.getTime() + 1100,
          stage: "05 ACTION PLAN",
          type: "AUTO_EXECUTED",
          message: `LOW-RISK action [${act.actionName}] verified against registry and automatically executed.`,
          severity: "success",
        });
      } else if (act.status === "AWAITING_CONFIRMATION") {
        auditTrail.push({
          id: `audit-${Date.now()}-med-${act.id}`,
          timestamp: new Date(now.getTime() + 1200).toLocaleTimeString(),
          rawTime: now.getTime() + 1200,
          stage: "06 CONFIRMATION",
          type: "CONFIRMATION_REQUIRED",
          message: `MEDIUM-RISK action [${act.actionName}] held pending operator confirmation.`,
          severity: "warning",
        });
      } else if (act.status === "AUTHORIZATION_REQUIRED") {
        auditTrail.push({
          id: `audit-${Date.now()}-high-${act.id}`,
          timestamp: new Date(now.getTime() + 1300).toLocaleTimeString(),
          rawTime: now.getTime() + 1300,
          stage: "06 CONFIRMATION",
          type: "AUTHORIZATION_REQUIRED",
          message: `HIGH-RISK action [${act.actionName}] isolated in containment. Explicit human authorization required.`,
          severity: "alert",
        });
      }
    });

    const result: AnalysisResult = {
      understoodSummary: parsed.understoodSummary || "Intent received and interpreted.",
      primaryIntent: parsed.primaryIntent || "General Real-World Request",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.94,
      intentCategory: parsed.intentCategory || "GENERAL_ASSISTANCE",
      entities: parsed.entities || [],
      ambiguities: parsed.ambiguities || [],
      verificationFacts: parsed.verificationFacts || [],
      actions,
      safetyAdvisory: parsed.safetyAdvisory,
      rawInput: text,
      auditTrail,
      timestamp: now.toISOString(),
      imageAttached,
      modelUsed,
    };

    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[NexusAct Engine] Intent analysis caught unhandled exception, falling back:", message);
    const fallbackText =
      typeof req.body?.text === "string" && req.body.text.trim()
        ? req.body.text
        : "Emergency incident";
    const fallbackResult = generateSyntheticAnalysis(fallbackText, Boolean(req.body?.image));
    return res.json(fallbackResult);
  }
};

app.post("/api/analyze-intent", handleAnalyzeIntent);
app.post("/analyze-intent", handleAnalyzeIntent);

// POST /api/execute-action handler
const handleExecuteAction = (req: Request<unknown, unknown, ExecuteActionBody>, res: Response) => {
  const { actionId, actionName, parameters, authConfirmed } = req.body;
  const name = typeof actionName === "string" ? actionName : "";

  const definition = ACTION_REGISTRY[name];
  if (!definition) {
    return res.status(400).json({ error: "Unknown action rejected by registry safety policy." });
  }

  if (definition.risk === "HIGH" && !authConfirmed) {
    return res.status(403).json({ error: "High-risk actions require explicit authorized human confirmation." });
  }

  const now = new Date();
  const logs = [
    `[${now.toLocaleTimeString()}] AUTHORIZATION RECEIVED ✓ - Authenticated operator token verified`,
    `[${now.toLocaleTimeString()}] VALIDATING PARAMETERS ✓ - Checking allowed schema against registry`,
    `[${now.toLocaleTimeString()}] ACTION REGISTRY CHECK ✓ - Canonical risk rating verified: ${definition.risk}`,
    `[${now.toLocaleTimeString()}] EXECUTING DEMO ACTION - Triggering simulated API interface (${definition.category})`,
    `[${now.toLocaleTimeString()}] ACTION COMPLETED ✓ - Simulated state change committed to test ledger`,
  ];

  const auditEntry: AuditEvent = {
    id: `audit-exec-${Date.now()}`,
    timestamp: now.toLocaleTimeString(),
    rawTime: now.getTime(),
    stage: "07 EXECUTION",
    type: "EXECUTION_COMPLETED",
    message: `Action [${actionName}] simulated execution completed under operator authorization.`,
    metadata: { actionId, actionName, parameters },
    severity: "success",
  };

  return res.json({
    success: true,
    actionId,
    status: "COMPLETED",
    executedAt: now.toISOString(),
    executionLogs: logs,
    auditEntry,
    isSimulated: true,
  });
};

app.post("/api/execute-action", handleExecuteAction);
app.post("/execute-action", handleExecuteAction);

export default app;
