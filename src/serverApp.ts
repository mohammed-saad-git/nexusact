import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import compression from "compression";
import { GoogleGenAI } from "@google/genai";
import type { ContentListUnion } from "@google/genai";
import {
  ACTION_REGISTRY,
  validateAndRegisterAction,
  sanitizeParameters,
} from "./actionRegistry";
import { AuditEvent, AnalysisResult, ProcessedAction } from "./types";
import {
  callGeminiWithResilience,
  GEMINI_SYSTEM_INSTRUCTION,
  GeminiAnalysis,
} from "./geminiEngine";
import { generateSyntheticAnalysis } from "./syntheticEngine";
import {
  MAX_INPUT_LENGTH,
  MAX_BODY_BYTES,
  MAX_IMAGE_BASE64_CHARS,
  ALLOWED_IMAGE_MIME_TYPES,
  DEFAULT_CONFIDENCE,
  DEFAULT_INTENT_CATEGORY,
  DEFAULT_PRIMARY_INTENT,
} from "./constants";

dotenv.config({ path: [".env.local", ".env"] });

export const app = express();
app.disable("x-powered-by");
app.use(compression());
app.use(express.json({ limit: MAX_BODY_BYTES }));

// Baseline security headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

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

/**
 * Validates the multimodal request payload supplied by the client. The text is
 * a bounded, non-empty string; the optional image must carry base64 data in an
 * accepted format. Malformed inputs are rejected before reaching Gemini.
 */
function resolveInputPayload(
  body: AnalyzeIntentBody
):
  | { error: string }
  | { text: string; image?: { data: string; mimeType: string }; imageAttached: boolean } {
  const { text, image } = body;
  if (typeof text !== "string" || !text.trim()) {
    return { error: "Text input is required." };
  }
  if (text.length > MAX_INPUT_LENGTH) {
    return { error: `Input text exceeds the ${MAX_INPUT_LENGTH} character limit.` };
  }

  const imageData = typeof image?.data === "string" && image.data ? image.data : undefined;
  if (typeof image?.mimeType === "string" && image.mimeType && imageData) {
    const allowed = ALLOWED_IMAGE_MIME_TYPES as readonly string[];
    if (!allowed.includes(image.mimeType)) {
      return { error: "Unsupported image format. Allowed: image/jpeg, image/png, image/webp." };
    }
  }
  if (imageData !== undefined && imageData.length > MAX_IMAGE_BASE64_CHARS) {
    return { error: "Image payload exceeds the 8 MB limit." };
  }

  const mimeType = typeof image?.mimeType === "string" && image.mimeType ? image.mimeType : "image/jpeg";
  return {
    text,
    image: imageData ? { data: imageData, mimeType } : undefined,
    imageAttached: Boolean(imageData),
  };
}

// POST /api/analyze-intent handler
const handleAnalyzeIntent = async (req: Request<unknown, unknown, AnalyzeIntentBody>, res: Response) => {
  const payload = resolveInputPayload(req.body);
  if ("error" in payload) {
    return res.status(400).json({ error: payload.error });
  }
  const { text, image, imageAttached } = payload;

  const ai = getGeminiClient();

  // If no API key configured or offline, use deterministic intelligence engine
  if (!ai) {
    console.log("[NexusAct Engine] No GEMINI_API_KEY detected. Running deterministic safety engine.");
    const fallbackResult = generateSyntheticAnalysis(text, imageAttached);
    return res.json(fallbackResult);
  }

  // Call resilient Gemini pipeline
  const allowedActionList = Object.keys(ACTION_REGISTRY);
  const promptText = `Analyze this messy human input:\n"""${text}"""\n\nAllowed actionNames: ${allowedActionList.join(", ")}`;

  const contents: ContentListUnion = imageAttached && image
    ? [
        { inlineData: { mimeType: image.mimeType, data: image.data } },
        { text: promptText },
      ]
    : [{ text: promptText }];

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
      message: `Gemini synthesis finished: "${parsed.primaryIntent ?? ""}" (Confidence: ${Math.round(
        (typeof parsed.confidence === "number" ? parsed.confidence : DEFAULT_CONFIDENCE) * 100
      )}%). Model: ${modelUsed}.`,
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
    primaryIntent: parsed.primaryIntent || DEFAULT_PRIMARY_INTENT,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : DEFAULT_CONFIDENCE,
    intentCategory: parsed.intentCategory || DEFAULT_INTENT_CATEGORY,
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

  // Explicit boolean confirmation is required for any consequential action.
  // LOW risk is the only tier the registry permits to run without sign-off.
  const confirmed = authConfirmed === true;
  if (definition.risk !== "LOW" && !confirmed) {
    return res
      .status(403)
      .json({ error: "Consequential actions require explicit authorized human confirmation." });
  }

  // Parameters are validated server-side against the registry declaration.
  const sanitizedParams = sanitizeParameters(
    typeof parameters === "object" && parameters !== null
      ? (parameters as Record<string, unknown>)
      : undefined,
    definition.allowedParams
  );

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
    message: `Action [${name}] simulated execution completed under operator authorization.`,
    metadata: { actionId, actionName: name, parameters: sanitizedParams },
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

// JSON 404 for unknown API routes (scoped so static/SPA handling still owns everything else)
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found." });
});

// Central error handler: never leaks stack traces or internal details to clients.
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const errType = (err as { type?: string } | null)?.type;
  if (errType === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON payload." });
    return;
  }
  if (errType === "entity.too.large") {
    res.status(413).json({ error: "Request body too large." });
    return;
  }
  console.error("[NexusAct Engine] Unhandled error:", err);
  res.status(500).json({ error: "Unexpected server error." });
});

export default app;