import { GoogleGenAI, Type } from "@google/genai";
import type { ContentListUnion } from "@google/genai";
import type {
  StructuredEntity,
  AmbiguityItem,
  VerificationFact,
} from "./types";
import {
  DEFAULT_CONFIDENCE,
  DEFAULT_INTENT_CATEGORY,
  CONFIDENCE_MIN,
  CONFIDENCE_MAX,
} from "./constants";

/**
 * One action proposed by the model. Strictly advisory — the Action Registry
 * remains the sole authority on whether it may be executed.
 */
export interface GeminiProposedAction {
  actionName?: string;
  rationale?: string;
  suggestedParameters?: Record<string, unknown>;
}

/**
 * Typed contract for the JSON emitted by the model under ANALYSIS_RESPONSE_SCHEMA.
 * The schema constrains shapes; the registry and validators harden values.
 */
export interface GeminiAnalysis {
  understoodSummary?: string;
  primaryIntent?: string;
  confidence?: number;
  intentCategory?: string;
  safetyAdvisory?: string;
  entities?: StructuredEntity[];
  ambiguities?: AmbiguityItem[];
  verificationFacts?: VerificationFact[];
  proposedActions?: GeminiProposedAction[];
}

/**
 * Response schema enforcing structured JSON output from the Gemini models.
 * Mirrors the analysis contract consumed by the intent-analysis route.
 */
export const ANALYSIS_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    understoodSummary: { type: Type.STRING, description: "Concise summary of what the user actually needs" },
    primaryIntent: { type: Type.STRING, description: "Primary intent title" },
    confidence: { type: Type.NUMBER, description: "Confidence score between 0.0 and 1.0" },
    intentCategory: { type: Type.STRING, description: "Category string" },
    safetyAdvisory: { type: Type.STRING, description: "Optional safety disclaimer" },
    entities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          label: { type: Type.STRING },
          value: { type: Type.STRING },
          source: { type: Type.STRING },
        },
        required: ["category", "label", "value", "source"],
      },
    },
    ambiguities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          impact: { type: Type.STRING },
          recommendedVerification: { type: Type.STRING },
        },
        required: ["description", "impact", "recommendedVerification"],
      },
    },
    verificationFacts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          claim: { type: Type.STRING },
          status: { type: Type.STRING },
          sourceType: { type: Type.STRING },
          notes: { type: Type.STRING },
        },
        required: ["claim", "status", "sourceType", "notes"],
      },
    },
    proposedActions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          actionName: { type: Type.STRING },
          rationale: { type: Type.STRING },
          suggestedParameters: {
            type: Type.OBJECT,
            description: "Key-value parameters for the action",
          },
        },
        required: ["actionName", "rationale"],
      },
    },
  },
  required: ["understoodSummary", "primaryIntent", "confidence", "entities", "ambiguities", "proposedActions"],
};

/**
 * System instruction grounding the model in the NEXUSACT product contract:
 * messy human intent must be transformed into verified, registry-bound actions
 * without bypassing the application's risk-governance layer.
 */
export const GEMINI_SYSTEM_INSTRUCTION = `
You are the intelligence core of NEXUSACT: "Turn human intent into verified action."
Your task:
1. Understand messy, unstructured, emotional, or fragmented human reports.
2. Formulate a concise understood summary explaining what the human actually needs.
3. Determine the primary intent and confidence (between 0.70 and 0.99).
4. Categorize intent: EMERGENCY_RESPONSE, MEDICAL_CONCERN, LOGISTICS_DISRUPTION, COMMUNITY_AID, or GENERAL_ASSISTANCE.
5. Extract structured entities with categories: PERSON, LOCATION, HAZARD, CONSTRAINT, URGENCY, ASSET, TIMEFRAME. Label whether each was USER_PROVIDED or AI_INFERRED.
6. Identify critical ambiguities and gaps in knowledge that must be resolved before dangerous actions are committed.
7. Provide verification checklist facts with status (CONFIRMED, NEEDS_CONFIRMATION, UNKNOWN) and sourceType (USER_PROVIDED, AI_INFERRED, SYSTEM_VERIFIED, DEMO_DATA).
8. Propose specific, concrete actions ONLY from the allowed registry:
   - QUERY_SENSOR_DATA (LOW risk)
   - LOG_HEALTH_RECORD (LOW risk)
   - RESERVE_LOCAL_INVENTORY (LOW risk)
   - DRAFT_COMMUNICATION (LOW risk)
   - SEND_SMS_ALERT (MEDIUM risk)
   - SCHEDULE_CALENDAR_EVENT (MEDIUM risk)
   - UPDATE_DISPATCH_ROUTE (MEDIUM risk)
   - DISPATCH_EMERGENCY_SERVICES (HIGH risk)
   - NOTIFY_CLINIC_HOTLINE (HIGH risk)
   - TRIGGER_HAZARD_EVACUATION (HIGH risk)
   - BROADCAST_COMMUNITY_ALERT (HIGH risk)
9. Medical safety rule: Do NOT provide diagnoses or prescriptions. For medical situations, include a safety advisory: "Potential concern detected. Consider seeking professional medical evaluation."
Output strictly compliant JSON.
`.trim();

/** Ordered candidate models: primary first (with one retry), then fallbacks. */
export const GEMINI_CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
];

export interface GeminiModelResult {
  /** The JSON object returned by the model (schema-constrained model output). */
  parsed: GeminiAnalysis;
  modelUsed: string;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function clampConfidence(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return DEFAULT_CONFIDENCE;
  return Math.min(CONFIDENCE_MAX, Math.max(CONFIDENCE_MIN, value));
}

function normalizeEntities(value: unknown): StructuredEntity[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const entities: StructuredEntity[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const category = isNonEmptyString(record.category) ? record.category : undefined;
    const label = isNonEmptyString(record.label) ? record.label : undefined;
    const entityValue = isNonEmptyString(record.value) ? record.value : undefined;
    if (!category || !label || !entityValue) continue;
    const source: StructuredEntity["source"] =
      record.source === "USER_PROVIDED" || record.source === "AI_INFERRED"
        ? record.source
        : "AI_INFERRED";
    entities.push({
      category: category as StructuredEntity["category"],
      label,
      value: entityValue,
      source,
    });
  }
  return entities;
}

function normalizeAmbiguities(value: unknown): AmbiguityItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const ambiguities: AmbiguityItem[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const description = isNonEmptyString(record.description) ? record.description : undefined;
    const impact = typeof record.impact === "string" ? record.impact : undefined;
    const recommendedVerification =
      typeof record.recommendedVerification === "string" ? record.recommendedVerification : undefined;
    if (description && impact && recommendedVerification) {
      ambiguities.push({ description, impact, recommendedVerification });
    }
  }
  return ambiguities;
}

function normalizeVerificationFacts(value: unknown): VerificationFact[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const facts: VerificationFact[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const claim = isNonEmptyString(record.claim) ? record.claim : undefined;
    if (!claim) continue;
    const status: VerificationFact["status"] =
      record.status === "CONFIRMED" ||
      record.status === "NEEDS_CONFIRMATION" ||
      record.status === "UNKNOWN"
        ? record.status
        : "UNKNOWN";
    const sourceType: VerificationFact["sourceType"] =
      record.sourceType === "USER_PROVIDED" ||
      record.sourceType === "AI_INFERRED" ||
      record.sourceType === "SYSTEM_VERIFIED" ||
      record.sourceType === "DEMO_DATA"
        ? record.sourceType
        : "AI_INFERRED";
    facts.push({
      claim,
      status,
      sourceType,
      notes: typeof record.notes === "string" ? record.notes : "",
    });
  }
  return facts;
}

function normalizeProposedActions(value: unknown): GeminiProposedAction[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const actions: GeminiProposedAction[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const actionName = typeof record.actionName === "string" ? record.actionName : undefined;
    if (!actionName) continue;
    const rationale = typeof record.rationale === "string" ? record.rationale : undefined;
    const suggestedParameters =
      typeof record.suggestedParameters === "object" && record.suggestedParameters !== null
        ? (record.suggestedParameters as Record<string, unknown>)
        : undefined;
    const proposed: GeminiProposedAction = { actionName };
    if (rationale !== undefined) proposed.rationale = rationale;
    if (suggestedParameters !== undefined) proposed.suggestedParameters = suggestedParameters;
    actions.push(proposed);
  }
  return actions;
}

/**
 * Validates and normalizes untrusted model output into the typed analysis
 * contract. This is the security boundary between Gemini and the rest of the
 * pipeline: malformed items are dropped, out-of-range values are clamped, and
 * every field is coerced to a finite primitive before it can influence
 * entities, facts, or proposed actions.
 */
export function normalizeGeminiAnalysis(input: unknown): GeminiAnalysis {
  if (typeof input !== "object" || input === null) return {};

  const record = input as Record<string, unknown>;
  const normalized: GeminiAnalysis = {
    understoodSummary: isNonEmptyString(record.understoodSummary)
      ? record.understoodSummary
      : undefined,
    primaryIntent: isNonEmptyString(record.primaryIntent) ? record.primaryIntent : undefined,
    confidence: clampConfidence(record.confidence),
    intentCategory: isNonEmptyString(record.intentCategory)
      ? record.intentCategory
      : DEFAULT_INTENT_CATEGORY,
  };

  if (typeof record.safetyAdvisory === "string") {
    normalized.safetyAdvisory = record.safetyAdvisory;
  }

  const entities = normalizeEntities(record.entities);
  if (entities !== undefined) normalized.entities = entities;

  const ambiguities = normalizeAmbiguities(record.ambiguities);
  if (ambiguities !== undefined) normalized.ambiguities = ambiguities;

  const verificationFacts = normalizeVerificationFacts(record.verificationFacts);
  if (verificationFacts !== undefined) normalized.verificationFacts = verificationFacts;

  const proposedActions = normalizeProposedActions(record.proposedActions);
  if (proposedActions !== undefined) normalized.proposedActions = proposedActions;

  return normalized;
}

function isTransientGeminiError(message: string): boolean {
  return (
    message.includes("503") ||
    message.includes("UNAVAILABLE") ||
    message.includes("429") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("high demand") ||
    message.includes("temporarily")
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : String(error);
}

const RETRY_DELAY_MS = 750;
const PRIMARY_MODEL_RETRIES = 2;
const FALLBACK_MODEL_RETRIES = 1;

/**
 * Resilient Gemini caller with automatic retry on transient load errors and a
 * model fallback chain. Never swallows a terminal failure — consumers decide
 * how to respond (e.g. deterministic fallback) when every model fails.
 */
export async function callGeminiWithResilience(
  ai: GoogleGenAI,
  contents: ContentListUnion,
  systemInstruction: string
): Promise<GeminiModelResult> {
  let lastError: unknown = null;

  for (let mIdx = 0; mIdx < GEMINI_CANDIDATE_MODELS.length; mIdx++) {
    const model = GEMINI_CANDIDATE_MODELS[mIdx];
    const maxTries = mIdx === 0 ? PRIMARY_MODEL_RETRIES : FALLBACK_MODEL_RETRIES;

    for (let attempt = 1; attempt <= maxTries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: ANALYSIS_RESPONSE_SCHEMA,
          },
        });

        const rawText = response.text?.trim() || "{}";
        const rawParsed: unknown = JSON.parse(rawText);
        return { parsed: normalizeGeminiAnalysis(rawParsed), modelUsed: model };
      } catch (err) {
        lastError = err;
        const message = getErrorMessage(err);

        if (isTransientGeminiError(message) && attempt < maxTries) {
          console.warn(
            `[Gemini Engine] Model ${model} returned temporary high demand (503/UNAVAILABLE). Retrying in ${RETRY_DELAY_MS}ms (attempt ${attempt + 1}/${maxTries})...`
          );
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }

        console.warn(
          `[Gemini Engine] Model ${model} unavailable (${message.slice(0, 90)}). Trying fallback model...`
        );
        break;
      }
    }
  }

  throw lastError;
}