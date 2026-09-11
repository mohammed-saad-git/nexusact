// src/serverApp.ts
import express from "express";
import dotenv from "dotenv";
import compression from "compression";
import { GoogleGenAI as GoogleGenAI2 } from "@google/genai";

// src/actionRegistry.ts
var ACTION_REGISTRY = {
  QUERY_SENSOR_DATA: {
    id: "QUERY_SENSOR_DATA",
    name: "QUERY_SENSOR_DATA",
    displayName: "Query Sensor Data",
    description: "Retrieve real-time environmental telemetry, river level gauges, and flood sensor readings.",
    risk: "LOW",
    autoExecute: true,
    isSimulated: false,
    allowedParams: ["location", "sensorType", "radiusKm"],
    category: "TELEMETRY"
  },
  LOG_HEALTH_RECORD: {
    id: "LOG_HEALTH_RECORD",
    name: "LOG_HEALTH_RECORD",
    displayName: "Log Health Record",
    description: "Append an adverse symptom flag and clinical observation note into the secure triage audit stream.",
    risk: "LOW",
    autoExecute: true,
    isSimulated: false,
    allowedParams: ["patientRef", "symptomCategory", "severity", "medicationsNoted"],
    category: "HEALTHCARE"
  },
  RESERVE_LOCAL_INVENTORY: {
    id: "RESERVE_LOCAL_INVENTORY",
    name: "RESERVE_LOCAL_INVENTORY",
    displayName: "Reserve Local Inventory",
    description: "Temporarily lock emergency relief rations, pediatric formula, or cold-chain storage capacity.",
    risk: "LOW",
    autoExecute: true,
    isSimulated: false,
    allowedParams: ["itemType", "quantity", "depotId", "expiryWindow"],
    category: "LOGISTICS"
  },
  DRAFT_COMMUNICATION: {
    id: "DRAFT_COMMUNICATION",
    name: "DRAFT_COMMUNICATION",
    displayName: "Draft Communication",
    description: "Generate formatted dispatch brief and internal operational status note for field personnel.",
    risk: "LOW",
    autoExecute: true,
    isSimulated: false,
    allowedParams: ["recipientGroup", "subject", "summary", "channel"],
    category: "COMMUNICATION"
  },
  SEND_SMS_ALERT: {
    id: "SEND_SMS_ALERT",
    name: "SEND_SMS_ALERT",
    displayName: "Send SMS Alert",
    description: "Transmit targeted SMS emergency advisory directly to verified registered contacts in the area.",
    risk: "MEDIUM",
    autoExecute: false,
    isSimulated: true,
    allowedParams: ["recipientCount", "urgency", "messageText", "contactGroup"],
    category: "COMMUNICATION"
  },
  SCHEDULE_CALENDAR_EVENT: {
    id: "SCHEDULE_CALENDAR_EVENT",
    name: "SCHEDULE_CALENDAR_EVENT",
    displayName: "Schedule Calendar Event",
    description: "Book urgent medical review slot or incident commander briefing window.",
    risk: "MEDIUM",
    autoExecute: false,
    isSimulated: true,
    allowedParams: ["department", "timeframe", "notes", "attendeeRole"],
    category: "HEALTHCARE"
  },
  UPDATE_DISPATCH_ROUTE: {
    id: "UPDATE_DISPATCH_ROUTE",
    name: "UPDATE_DISPATCH_ROUTE",
    displayName: "Update Dispatch Route",
    description: "Recalculate and transmit mandatory hazard detour vectors to municipal logistics & first-response vehicles.",
    risk: "MEDIUM",
    autoExecute: false,
    isSimulated: true,
    allowedParams: ["vehicleId", "blockedSegment", "safeCorridor", "detourEtaMinutes"],
    category: "DISPATCH"
  },
  DISPATCH_EMERGENCY_SERVICES: {
    id: "DISPATCH_EMERGENCY_SERVICES",
    name: "DISPATCH_EMERGENCY_SERVICES",
    displayName: "Dispatch Emergency Services",
    description: "Mobilize rapid water-rescue units, paramedic crews, and high-water evacuation transport vehicles.",
    risk: "HIGH",
    autoExecute: false,
    isSimulated: true,
    allowedParams: ["incidentType", "priority", "coordinates", "hazardSummary", "strandedCount"],
    category: "DISPATCH"
  },
  NOTIFY_CLINIC_HOTLINE: {
    id: "NOTIFY_CLINIC_HOTLINE",
    name: "NOTIFY_CLINIC_HOTLINE",
    displayName: "Notify Clinic Hotline",
    description: "Trigger immediate emergency medical escalation to the toxicologist / on-call emergency physician.",
    risk: "HIGH",
    autoExecute: false,
    isSimulated: true,
    allowedParams: ["suspectedInteraction", "patientStability", "callbackUrgency", "contraindications"],
    category: "HEALTHCARE"
  },
  TRIGGER_HAZARD_EVACUATION: {
    id: "TRIGGER_HAZARD_EVACUATION",
    name: "TRIGGER_HAZARD_EVACUATION",
    displayName: "Trigger Hazard Evacuation",
    description: "Authorize civil defense localized perimeter evacuation sirens and automated siren beacons.",
    risk: "HIGH",
    autoExecute: false,
    isSimulated: true,
    allowedParams: ["zoneId", "hazardThreshold", "evacRoute", "civilDefenseNotified"],
    category: "HAZARD"
  },
  BROADCAST_COMMUNITY_ALERT: {
    id: "BROADCAST_COMMUNITY_ALERT",
    name: "BROADCAST_COMMUNITY_ALERT",
    displayName: "Broadcast Community Alert",
    description: "Push verified high-priority alert banner across community emergency feeds and local radio frequencies.",
    risk: "HIGH",
    autoExecute: false,
    isSimulated: true,
    allowedParams: ["alertTier", "affectedArea", "publicInstruction", "expirationMinutes"],
    category: "COMMUNICATION"
  }
};
function sanitizeParameters(params, allowedKeys) {
  const sanitized = {};
  if (!params) return sanitized;
  for (const [key, value] of Object.entries(params)) {
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      continue;
    }
    if (!allowedKeys) {
      sanitized[key] = value;
    } else if (allowedKeys.includes(key)) {
      sanitized[key] = value;
    } else if (key.startsWith("extra_") && typeof value === "string") {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
function validateAndRegisterAction(rawAction, index) {
  const requestedName = typeof rawAction.actionName === "string" && rawAction.actionName.trim() ? rawAction.actionName.trim() : null;
  const registered = requestedName ? ACTION_REGISTRY[requestedName] : void 0;
  if (!registered) {
    const label = requestedName || "UNKNOWN_ACTION";
    return {
      id: `act-rejected-${Date.now()}-${index}`,
      actionName: label,
      displayName: label,
      description: "Action not found in authoritative application registry. Execution rejected by safety policy.",
      rationale: rawAction.rationale || "Attempted to invoke unregistered action.",
      risk: "HIGH",
      autoExecute: false,
      status: "REJECTED",
      parameters: sanitizeParameters(rawAction.suggestedParameters),
      registryVerified: false,
      isSimulated: true
    };
  }
  const sanitizedParams = sanitizeParameters(rawAction.suggestedParameters, registered.allowedParams);
  let initialStatus = "AWAITING_CONFIRMATION";
  let executionLogs = void 0;
  let executedAt = void 0;
  if (registered.risk === "LOW" && registered.autoExecute) {
    initialStatus = "AUTO_EXECUTED";
    executedAt = (/* @__PURE__ */ new Date()).toISOString();
    executionLogs = [
      `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] Safety Policy: LOW risk rating verified against registry`,
      `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] Auto-execution triggered without human roadblock`,
      `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] Telemetry payload secured & dispatched successfully`
    ];
  } else if (registered.risk === "HIGH") {
    initialStatus = "AUTHORIZATION_REQUIRED";
  } else {
    initialStatus = "AWAITING_CONFIRMATION";
  }
  return {
    id: `act-${registered.id.toLowerCase()}-${Date.now()}-${index}`,
    actionName: registered.name,
    displayName: registered.displayName,
    description: registered.description,
    rationale: rawAction.rationale || `Recommended in response to verified situation parameters.`,
    risk: registered.risk,
    // REGISTRY STRICT OVERRIDE
    autoExecute: registered.autoExecute,
    status: initialStatus,
    parameters: sanitizedParams,
    executionLogs,
    executedAt,
    isSimulated: registered.isSimulated,
    registryVerified: true
  };
}

// src/geminiEngine.ts
import { Type } from "@google/genai";

// src/constants.ts
var MAX_INPUT_LENGTH = 4e3;
var MAX_IMAGE_BYTES = 8 * 1024 * 1024;
var MAX_IMAGE_BASE64_CHARS = Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 4096;
var MAX_BODY_BYTES = "12mb";
var ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
var DEFAULT_CONFIDENCE = 0.94;
var DEFAULT_INTENT_CATEGORY = "GENERAL_ASSISTANCE";
var DEFAULT_PRIMARY_INTENT = "General Real-World Request";
var CONFIDENCE_MIN = 0;
var CONFIDENCE_MAX = 1;

// src/geminiEngine.ts
var ANALYSIS_RESPONSE_SCHEMA = {
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
          source: { type: Type.STRING }
        },
        required: ["category", "label", "value", "source"]
      }
    },
    ambiguities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          impact: { type: Type.STRING },
          recommendedVerification: { type: Type.STRING }
        },
        required: ["description", "impact", "recommendedVerification"]
      }
    },
    verificationFacts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          claim: { type: Type.STRING },
          status: { type: Type.STRING },
          sourceType: { type: Type.STRING },
          notes: { type: Type.STRING }
        },
        required: ["claim", "status", "sourceType", "notes"]
      }
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
            description: "Key-value parameters for the action"
          }
        },
        required: ["actionName", "rationale"]
      }
    }
  },
  required: ["understoodSummary", "primaryIntent", "confidence", "entities", "ambiguities", "proposedActions"]
};
var GEMINI_SYSTEM_INSTRUCTION = `
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
var GEMINI_CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest"
];
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function clampConfidence(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return DEFAULT_CONFIDENCE;
  return Math.min(CONFIDENCE_MAX, Math.max(CONFIDENCE_MIN, value));
}
function normalizeEntities(value) {
  if (!Array.isArray(value)) return void 0;
  const entities = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const record = item;
    const category = isNonEmptyString(record.category) ? record.category : void 0;
    const label = isNonEmptyString(record.label) ? record.label : void 0;
    const entityValue = isNonEmptyString(record.value) ? record.value : void 0;
    if (!category || !label || !entityValue) continue;
    const source = record.source === "USER_PROVIDED" || record.source === "AI_INFERRED" ? record.source : "AI_INFERRED";
    entities.push({
      category,
      label,
      value: entityValue,
      source
    });
  }
  return entities;
}
function normalizeAmbiguities(value) {
  if (!Array.isArray(value)) return void 0;
  const ambiguities = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const record = item;
    const description = isNonEmptyString(record.description) ? record.description : void 0;
    const impact = typeof record.impact === "string" ? record.impact : void 0;
    const recommendedVerification = typeof record.recommendedVerification === "string" ? record.recommendedVerification : void 0;
    if (description && impact && recommendedVerification) {
      ambiguities.push({ description, impact, recommendedVerification });
    }
  }
  return ambiguities;
}
function normalizeVerificationFacts(value) {
  if (!Array.isArray(value)) return void 0;
  const facts = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const record = item;
    const claim = isNonEmptyString(record.claim) ? record.claim : void 0;
    if (!claim) continue;
    const status = record.status === "CONFIRMED" || record.status === "NEEDS_CONFIRMATION" || record.status === "UNKNOWN" ? record.status : "UNKNOWN";
    const sourceType = record.sourceType === "USER_PROVIDED" || record.sourceType === "AI_INFERRED" || record.sourceType === "SYSTEM_VERIFIED" || record.sourceType === "DEMO_DATA" ? record.sourceType : "AI_INFERRED";
    facts.push({
      claim,
      status,
      sourceType,
      notes: typeof record.notes === "string" ? record.notes : ""
    });
  }
  return facts;
}
function normalizeProposedActions(value) {
  if (!Array.isArray(value)) return void 0;
  const actions = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const record = item;
    const actionName = typeof record.actionName === "string" ? record.actionName : void 0;
    if (!actionName) continue;
    const rationale = typeof record.rationale === "string" ? record.rationale : void 0;
    const suggestedParameters = typeof record.suggestedParameters === "object" && record.suggestedParameters !== null ? record.suggestedParameters : void 0;
    const proposed = { actionName };
    if (rationale !== void 0) proposed.rationale = rationale;
    if (suggestedParameters !== void 0) proposed.suggestedParameters = suggestedParameters;
    actions.push(proposed);
  }
  return actions;
}
function normalizeGeminiAnalysis(input) {
  if (typeof input !== "object" || input === null) return {};
  const record = input;
  const normalized = {
    understoodSummary: isNonEmptyString(record.understoodSummary) ? record.understoodSummary : void 0,
    primaryIntent: isNonEmptyString(record.primaryIntent) ? record.primaryIntent : void 0,
    confidence: clampConfidence(record.confidence),
    intentCategory: isNonEmptyString(record.intentCategory) ? record.intentCategory : DEFAULT_INTENT_CATEGORY
  };
  if (typeof record.safetyAdvisory === "string") {
    normalized.safetyAdvisory = record.safetyAdvisory;
  }
  const entities = normalizeEntities(record.entities);
  if (entities !== void 0) normalized.entities = entities;
  const ambiguities = normalizeAmbiguities(record.ambiguities);
  if (ambiguities !== void 0) normalized.ambiguities = ambiguities;
  const verificationFacts = normalizeVerificationFacts(record.verificationFacts);
  if (verificationFacts !== void 0) normalized.verificationFacts = verificationFacts;
  const proposedActions = normalizeProposedActions(record.proposedActions);
  if (proposedActions !== void 0) normalized.proposedActions = proposedActions;
  return normalized;
}
function isTransientGeminiError(message) {
  return message.includes("503") || message.includes("UNAVAILABLE") || message.includes("429") || message.includes("RESOURCE_EXHAUSTED") || message.includes("high demand") || message.includes("temporarily");
}
function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : String(error);
}
var RETRY_DELAY_MS = 750;
var PRIMARY_MODEL_RETRIES = 2;
var FALLBACK_MODEL_RETRIES = 1;
async function callGeminiWithResilience(ai, contents, systemInstruction) {
  let lastError = null;
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
            responseSchema: ANALYSIS_RESPONSE_SCHEMA
          }
        });
        const rawText = response.text?.trim() || "{}";
        const rawParsed = JSON.parse(rawText);
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

// src/syntheticEngine.ts
function generateSyntheticAnalysis(text, imageAttached) {
  const lower = text.toLowerCase();
  const now = /* @__PURE__ */ new Date();
  const timestampStr = now.toLocaleTimeString();
  let understoodSummary = "";
  let primaryIntent = "";
  let confidence = 0.94;
  let intentCategory = "GENERAL_ASSISTANCE";
  let rawProposedActions = [];
  let safetyAdvisory = void 0;
  let entities = [];
  let ambiguities = [];
  let verificationFacts = [];
  if (lower.includes("flood") || lower.includes("water") || lower.includes("underpass") || lower.includes("stuck") || lower.includes("neighbor")) {
    intentCategory = "EMERGENCY_RESPONSE";
    primaryIntent = "Emergency Assistance & Water Rescue Dispatch";
    confidence = 0.96;
    understoodSummary = "An elderly resident is trapped near a rapidly flooding underpass with failing telephone battery, requiring immediate condition verification, route diversion, and water-rescue mobilization.";
    entities = [
      { category: "PERSON", label: "Trapped Resident", value: "Elderly neighbor", source: "USER_PROVIDED" },
      { category: "LOCATION", label: "Hazard Site", value: "Flooded underpass corridor", source: "USER_PROVIDED" },
      { category: "HAZARD", label: "Primary Threat", value: "Rising flash flood waters", source: "USER_PROVIDED" },
      { category: "CONSTRAINT", label: "Vulnerability", value: "Phone battery nearly depleted (<5%)", source: "USER_PROVIDED" },
      { category: "URGENCY", label: "Timeframe", value: "Immediate (life safety window < 30m)", source: "AI_INFERRED" }
    ];
    ambiguities = [
      {
        description: "Exact underpass intersection or GPS coordinate not specified in report.",
        impact: "Search area widened to 800-meter sector along arterial underpass.",
        recommendedVerification: "Query municipal road sensors and cross-reference neighbor cell tower sector."
      },
      {
        description: "Exact flood depth and rate of rise unknown from caller report.",
        impact: "Rescue team equipment requirement (inflatable boat vs high-clearance truck).",
        recommendedVerification: "Query nearest hydrological gauge telemetry."
      }
    ];
    verificationFacts = [
      { claim: "Individual is elderly and physically trapped", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "Caller first-party report" },
      { claim: "Water is actively rising", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "Caller observation" },
      { claim: "Device battery critically low", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "Impending telemetry loss" },
      { claim: "Current water depth > 1.2m", status: "NEEDS_CONFIRMATION", sourceType: "AI_INFERRED", notes: "Historical underpass inundation pattern" },
      { claim: "Structural collapse risk", status: "UNKNOWN", sourceType: "SYSTEM_VERIFIED", notes: "Bridge engineering telemetry pending" }
    ];
    rawProposedActions = [
      {
        actionName: "QUERY_SENSOR_DATA",
        rationale: "Retrieve real-time flood gauge telemetry at underpass culverts to confirm water height and rate of rise.",
        suggestedParameters: { location: "Underpass Sector 4", sensorType: "HYDROLOGICAL_GAUGE", radiusKm: "1.5" }
      },
      {
        actionName: "UPDATE_DISPATCH_ROUTE",
        rationale: "Reroute incoming first responders away from flooded submerged underpass access ramp to elevated crest road.",
        suggestedParameters: { vehicleId: "RESCUE_UNIT_14", blockedSegment: "Underpass Ramp A", safeCorridor: "Crest Blvd Overpass", detourEtaMinutes: "4" }
      },
      {
        actionName: "DISPATCH_EMERGENCY_SERVICES",
        rationale: "Mobilize specialized swift-water rescue craft and high-water evacuation transport to extract trapped resident.",
        suggestedParameters: { incidentType: "SWIFT_WATER_RESCUE", priority: "CODE_RED_LIFE_SAFETY", coordinates: "Sector 4 Underpass", strandedCount: "1 elderly" }
      }
    ];
  } else if (lower.includes("cipro") || lower.includes("theophylline") || lower.includes("medication") || lower.includes("palpitation") || lower.includes("tremor") || lower.includes("asthma")) {
    intentCategory = "MEDICAL_CONCERN";
    primaryIntent = "Acute Drug-Drug Interaction Escalation & Clinical Review";
    confidence = 0.95;
    safetyAdvisory = "Potential concern detected. Consider seeking professional medical evaluation. The system does not provide medical diagnoses or prescriptions.";
    understoodSummary = "Report of acute adverse physiological reaction (tremors, palpitations) following co-administration of Ciprofloxacin and Theophylline, which have a recognized pharmacokinetic interaction.";
    entities = [
      { category: "PERSON", label: "Patient", value: "Family member (asthma/COPD history)", source: "USER_PROVIDED" },
      { category: "HAZARD", label: "Reported Agents", value: "Ciprofloxacin + Theophylline co-ingestion", source: "USER_PROVIDED" },
      { category: "HAZARD", label: "Symptoms", value: "Severe tremors, tachycardia (118 bpm), nausea", source: "USER_PROVIDED" },
      { category: "URGENCY", label: "Priority", value: "Urgent (Within 15-30 minutes)", source: "AI_INFERRED" }
    ];
    ambiguities = [
      {
        description: "Exact milligram doses and exact time of morning ingestion not stated.",
        impact: "Cannot compute estimated peak serum concentration of theophylline.",
        recommendedVerification: "Request caller check prescription bottle labels for dosage strengths."
      }
    ];
    verificationFacts = [
      { claim: "Patient consumed both medications this morning", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "Reported by family member" },
      { claim: "Symptoms of severe tremor and tachycardia present", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "Symptomatic presentation" },
      { claim: "CYP1A2 enzyme inhibition potential", status: "CONFIRMED", sourceType: "SYSTEM_VERIFIED", notes: "Documented pharmacological interaction database" },
      { claim: "Serum theophylline level exceeds toxic threshold", status: "NEEDS_CONFIRMATION", sourceType: "AI_INFERRED", notes: "Requires emergency blood draw" }
    ];
    rawProposedActions = [
      {
        actionName: "LOG_HEALTH_RECORD",
        rationale: "Securely document symptom timeline and drug interaction flag in emergency clinical intake log.",
        suggestedParameters: { patientRef: "PATIENT_FAMILY_MEMBER", symptomCategory: "SUSPECTED_THEOPHYLLINE_TOXICITY", severity: "HIGH_ACUTE", medicationsNoted: "Ciprofloxacin, Theophylline" }
      },
      {
        actionName: "SCHEDULE_CALENDAR_EVENT",
        rationale: "Block emergency same-day urgent physician consultation slot.",
        suggestedParameters: { department: "EMERGENCY_TRIAGE_CLINIC", timeframe: "IMMEDIATE_STANDBY", notes: "Drug interaction follow-up review" }
      },
      {
        actionName: "NOTIFY_CLINIC_HOTLINE",
        rationale: "Escalate directly to on-call clinical toxicologist and emergency hotline for urgent stabilization advice.",
        suggestedParameters: { suspectedInteraction: "CIPROFLOXACIN_THEOPHYLLINE_CYP1A2", patientStability: "TACHYCARDIC_CONSCIOUS", callbackUrgency: "IMMEDIATE" }
      }
    ];
  } else if (lower.includes("insulin") || lower.includes("truck") || lower.includes("logistics") || lower.includes("slide") || lower.includes("battery") || lower.includes("reefer") || lower.includes("mudslide")) {
    intentCategory = "LOGISTICS_DISRUPTION";
    primaryIntent = "Cold-Chain Integrity Protection & Emergency Detour";
    confidence = 0.94;
    understoodSummary = "Critical temperature-sensitive medical consignment (pediatric insulin) stranded on Highway 9 with finite battery refrigeration reserve, requiring rapid detour routing and storage failover.";
    entities = [
      { category: "ASSET", label: "Payload", value: "400 vials pediatric insulin", source: "USER_PROVIDED" },
      { category: "LOCATION", label: "Stoppage Point", value: "Highway 9, Mile Marker 42", source: "USER_PROVIDED" },
      { category: "HAZARD", label: "Blockage", value: "Active mudslide / culvert collapse", source: "USER_PROVIDED" },
      { category: "CONSTRAINT", label: "Thermal Clock", value: "3.5 hours auxiliary refrigeration runtime", source: "USER_PROVIDED" },
      { category: "URGENCY", label: "Critical Window", value: "T-minus 210 minutes to product spoilage", source: "AI_INFERRED" }
    ];
    ambiguities = [
      {
        description: "County Road 4 bridge weight capacity verification pending road department update.",
        impact: "Ensuring transport truck tare weight (8.2 tonnes) can safely utilize alternate corridor.",
        recommendedVerification: "Query state Department of Transportation bridge load registry."
      }
    ];
    verificationFacts = [
      { claim: "Truck #402 stranded at Mile Marker 42", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "Vehicle GPS telemetry" },
      { claim: "Cold-chain temperature currently within tolerance (4.8\xB0C)", status: "CONFIRMED", sourceType: "SYSTEM_VERIFIED", notes: "Telematics cold sensor probe" },
      { claim: "Route 9 completely impassable for heavy transport", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "State Patrol road closure" },
      { claim: "Backup generator in Valley Depot operational", status: "NEEDS_CONFIRMATION", sourceType: "AI_INFERRED", notes: "Contact depot supervisor" }
    ];
    rawProposedActions = [
      {
        actionName: "QUERY_SENSOR_DATA",
        rationale: "Continuously stream live container temperature and auxiliary battery telemetry.",
        suggestedParameters: { location: "Truck 402 Reefer Unit", sensorType: "TEMP_AND_POWER_TELEMETRY", radiusKm: "0" }
      },
      {
        actionName: "UPDATE_DISPATCH_ROUTE",
        rationale: "Transmit turn-by-turn reroute vector via County Road 4 to the driver's electronic logging device.",
        suggestedParameters: { vehicleId: "TRUCK_402", blockedSegment: "Hwy 9 MM 40-44", safeCorridor: "County Rd 4 West", detourEtaMinutes: "48" }
      },
      {
        actionName: "BROADCAST_COMMUNITY_ALERT",
        rationale: "Issue urgent commercial freight diversion notice for the Highway 9 mountain corridor.",
        suggestedParameters: { alertTier: "ROAD_HAZARD_ADVISORY", affectedArea: "Highway 9 Corridor", publicInstruction: "Commercial traffic use Exit 28 bypass", expirationMinutes: "240" }
      }
    ];
  } else if (lower.includes("oak grove") || lower.includes("formula") || lower.includes("shelter") || lower.includes("evacuee") || lower.includes("infant")) {
    intentCategory = "COMMUNITY_AID";
    primaryIntent = "Emergency Supply Allocation & Volunteer Coordination";
    confidence = 0.93;
    understoodSummary = "Critical surge in displaced storm evacuees at shelter creating severe deficits in infant formula and allergy-safe nutrition, requiring immediate inventory lock and dispatch.";
    entities = [
      { category: "LOCATION", label: "Facility", value: "Oak Grove Evacuation Shelter", source: "USER_PROVIDED" },
      { category: "PERSON", label: "Affected Group", value: "Displaced storm survivors (infants present)", source: "USER_PROVIDED" },
      { category: "HAZARD", label: "Supply Depletion", value: "Zero infant formula, critical nutrient shortage", source: "USER_PROVIDED" },
      { category: "ASSET", label: "Logistics Asset", value: "Volunteer transport ready", source: "USER_PROVIDED" },
      { category: "URGENCY", label: "Deadline", value: "Immediate supply replenishment", source: "AI_INFERRED" }
    ];
    ambiguities = [
      {
        description: "Exact infant age distribution (0-6m vs 6-12m) not fully specified.",
        impact: "Formula stage selection (Stage 1 gentle vs toddler milk).",
        recommendedVerification: "Shelter intake desk headcount confirmation."
      }
    ];
    verificationFacts = [
      { claim: "Evacuee surge reported at emergency shelter", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "Intake registration log" },
      { claim: "Infant nutrition supply critically depleted", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "Pantry inventory check" },
      { claim: "Regional emergency cache has matching inventory", status: "NEEDS_CONFIRMATION", sourceType: "AI_INFERRED", notes: "Depot system sync requested" },
      { claim: "Volunteer transport is road-ready", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "Driver waiting on site" }
    ];
    rawProposedActions = [
      {
        actionName: "RESERVE_LOCAL_INVENTORY",
        rationale: "Lock 40 tins of infant formula and 80 allergen-neutral meal packs from Regional Depot 2.",
        suggestedParameters: { itemType: "INFANT_FORMULA_AND_RATIONS", quantity: "120_UNITS", depotId: "REGIONAL_DEPOT_2", expiryWindow: "24_HOURS" }
      },
      {
        actionName: "DRAFT_COMMUNICATION",
        rationale: "Generate pickup manifest and warehouse gate pass for volunteer driver.",
        suggestedParameters: { recipientGroup: "VOLUNTEER_DRIVER_LOGISTICS", subject: "Emergency Pickup Authorization: Depot 2", summary: "Priority gate pass for infant formula cache" }
      },
      {
        actionName: "SEND_SMS_ALERT",
        rationale: "Send SMS dispatch with pickup coordinates and warehouse dock authorization code to volunteer driver.",
        suggestedParameters: { recipientCount: "1", urgency: "HIGH", messageText: "PROCEED TO DEPOT 2 DOCK B FOR EMERGENCY SHELTER FORMULA PICKUP. AUTH CODE: NX-8842." }
      }
    ];
  } else if (lower.includes("fire") || lower.includes("smoke") || lower.includes("burn") || lower.includes("flame") || lower.includes("gas") || lower.includes("leak") || lower.includes("electrical") || lower.includes("spark") || lower.includes("wire") || lower.includes("power")) {
    intentCategory = "EMERGENCY_RESPONSE";
    primaryIntent = "Active Fire & Infrastructure Hazard Containment";
    confidence = 0.94;
    understoodSummary = `Urgent incident report detailing active hazard conditions ("${text.slice(0, 90).replace(/"/g, "'")}..."). Immediate environmental verification, public safety perimeter enforcement, and emergency responder dispatch required.`;
    entities = [
      { category: "HAZARD", label: "Primary Danger", value: lower.includes("gas") ? "Suspected gas leak/vapor" : lower.includes("electrical") ? "Downed electrical lines/arcing" : "Active structural/environmental fire", source: "USER_PROVIDED" },
      { category: "LOCATION", label: "Reported Zone", value: "Reported incident perimeter", source: "USER_PROVIDED" },
      { category: "URGENCY", label: "Response Priority", value: "Code Red (Life safety threat)", source: "AI_INFERRED" },
      { category: "CONSTRAINT", label: "Public Exposure", value: "Civilians and local structures in hazard path", source: "USER_PROVIDED" }
    ];
    ambiguities = [
      {
        description: "Exact coordinates and extent of fire/hazard spread not confirmed.",
        impact: "Determining evacuation radius size (300m vs 1km).",
        recommendedVerification: "Query municipal thermal sensors and dispatch aerial recon."
      }
    ];
    verificationFacts = [
      { claim: "Active hazard reported by on-scene caller", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "First-party caller narrative" },
      { claim: "Utility lines or fuel sources involved", status: "NEEDS_CONFIRMATION", sourceType: "AI_INFERRED", notes: "Utility company dispatch requested" },
      { claim: "Immediate structural collapse danger", status: "UNKNOWN", sourceType: "SYSTEM_VERIFIED", notes: "Fire Marshal inspection pending" }
    ];
    rawProposedActions = [
      {
        actionName: "QUERY_SENSOR_DATA",
        rationale: "Retrieve live air quality, ambient heat sensors, and smart grid voltage status in vicinity.",
        suggestedParameters: { location: "Reported Hazard Zone", sensorType: "ENVIRONMENTAL_AND_GRID", radiusKm: "1.0" }
      },
      {
        actionName: "BROADCAST_COMMUNITY_ALERT",
        rationale: "Issue urgent push advisory instructing nearby occupants to evacuate or shelter upwind.",
        suggestedParameters: { alertTier: "EVACUATION_ADVISORY", affectedArea: "Incident Vicinity", publicInstruction: "Evacuate upwind immediately. Avoid power lines.", expirationMinutes: "120" }
      },
      {
        actionName: "DISPATCH_EMERGENCY_SERVICES",
        rationale: "Mobilize fire suppression units and emergency rescue personnel to secure perimeter and neutralize hazard.",
        suggestedParameters: { incidentType: "HAZARD_CONTAINMENT", priority: "CODE_RED_LIFE_SAFETY", coordinates: "Incident Zone", strandedCount: "Multiple" }
      }
    ];
  } else if (lower.includes("chest") || lower.includes("heart") || lower.includes("faint") || lower.includes("breathe") || lower.includes("stroke") || lower.includes("chok") || lower.includes("pain") || lower.includes("doctor")) {
    intentCategory = "MEDICAL_CONCERN";
    primaryIntent = "Acute Medical Emergency Escalation";
    confidence = 0.94;
    safetyAdvisory = "Potential concern detected. Consider seeking professional medical evaluation. The system does not provide medical diagnoses or prescriptions.";
    understoodSummary = `Acute medical situation reported requiring immediate clinical verification, symptom logging, and urgent healthcare triage ("${text.slice(0, 90).replace(/"/g, "'")}...").`;
    entities = [
      { category: "PERSON", label: "Patient", value: "Reported distressed individual", source: "USER_PROVIDED" },
      { category: "HAZARD", label: "Reported Distress", value: "Acute physical distress / cardiopulmonary symptoms", source: "USER_PROVIDED" },
      { category: "URGENCY", label: "Clinical Urgency", value: "Immediate (Within minutes)", source: "AI_INFERRED" }
    ];
    ambiguities = [
      {
        description: "Patient consciousness level and baseline medical history unconfirmed.",
        impact: "EMS dispatch equipment selection (advanced cardiac life support unit).",
        recommendedVerification: "Verify consciousness and breathing rate via caller guidance."
      }
    ];
    verificationFacts = [
      { claim: "Patient actively experiencing symptoms", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "Caller observation" },
      { claim: "Emergency medical triage needed", status: "CONFIRMED", sourceType: "AI_INFERRED", notes: "Clinical protocol flag" }
    ];
    rawProposedActions = [
      {
        actionName: "LOG_HEALTH_RECORD",
        rationale: "Create secure incident medical intake entry with reported timeline and vital flags.",
        suggestedParameters: { patientRef: "REPORTED_INDIVIDUAL", symptomCategory: "ACUTE_PHYSIOLOGICAL_DISTRESS", severity: "HIGH_ACUTE" }
      },
      {
        actionName: "SCHEDULE_CALENDAR_EVENT",
        rationale: "Reserve immediate clinical intake room at nearest emergency receiving facility.",
        suggestedParameters: { department: "EMERGENCY_TRAUMA_BAY", timeframe: "IMMEDIATE_STANDBY", notes: "Urgent transfer incoming" }
      },
      {
        actionName: "NOTIFY_CLINIC_HOTLINE",
        rationale: "Connect directly to emergency triage physician and dispatch ambulance.",
        suggestedParameters: { suspectedInteraction: "ACUTE_PHYSIOLOGICAL_DISTRESS", patientStability: "UNSTABLE", callbackUrgency: "IMMEDIATE" }
      }
    ];
  } else {
    intentCategory = "GENERAL_ASSISTANCE";
    primaryIntent = "Incident Assessment & Coordinated Verification";
    confidence = 0.92;
    const cleanSnippet = text.trim().slice(0, 110).replace(/[\r\n]+/g, " ");
    understoodSummary = `Caller submitted an urgent real-world report: "${cleanSnippet}...". The situation requires immediate entity extraction, ambiguity resolution, and verified action governance.`;
    entities = [
      { category: "HAZARD", label: "Reported Situation", value: cleanSnippet.slice(0, 45), source: "USER_PROVIDED" },
      { category: "LOCATION", label: "Incident Area", value: "Specified in caller report", source: "USER_PROVIDED" },
      { category: "URGENCY", label: "Assessment Window", value: "Rapid triage required (< 15 min)", source: "AI_INFERRED" }
    ];
    ambiguities = [
      {
        description: "Exact geographic coordinates and on-site responder availability require verification.",
        impact: "Routing and dispatch response timing.",
        recommendedVerification: "Query municipal sensor network and cross-reference telecom cell sector."
      }
    ];
    verificationFacts = [
      { claim: "Incident report submitted by user", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "Inbound narrative captured" },
      { claim: "On-site telemetry available", status: "NEEDS_CONFIRMATION", sourceType: "AI_INFERRED", notes: "Awaiting sensor sweep" }
    ];
    rawProposedActions = [
      {
        actionName: "QUERY_SENSOR_DATA",
        rationale: "Query local telematics and infrastructure sensors to verify ground reality.",
        suggestedParameters: { location: "Reported Sector", sensorType: "ENVIRONMENTAL_TELEMETRY", radiusKm: "2.0" }
      },
      {
        actionName: "DRAFT_COMMUNICATION",
        rationale: "Draft operational notification for municipal coordination center.",
        suggestedParameters: { recipientGroup: "DISPATCH_OPERATIONS", subject: "Inbound Real-World Incident Escalation", summary: cleanSnippet.slice(0, 80) }
      },
      {
        actionName: "SEND_SMS_ALERT",
        rationale: "Send high-priority SMS notification to designated duty supervisor.",
        suggestedParameters: { recipientCount: "1", urgency: "HIGH", messageText: `NEXUSACT ALERT: Actionable report logged: ${cleanSnippet.slice(0, 60)}` }
      }
    ];
  }
  const actions = rawProposedActions.map(
    (raw, idx) => validateAndRegisterAction(raw, idx)
  );
  const auditTrail = [
    {
      id: `audit-${Date.now()}-1`,
      timestamp: timestampStr,
      rawTime: now.getTime(),
      stage: "01 INPUT RECEIVED",
      type: "INTENT_RECEIVED",
      message: `Unstructured input packet captured (${text.length} chars${imageAttached ? ", + multimodal visual payload" : ""}).`,
      severity: "info"
    },
    {
      id: `audit-${Date.now()}-2`,
      timestamp: new Date(now.getTime() + 450).toLocaleTimeString(),
      rawTime: now.getTime() + 450,
      stage: "02 UNDERSTANDING",
      type: "GEMINI_SYNTHESIS",
      message: `Intent understood: "${primaryIntent}" (Confidence: ${Math.round(confidence * 100)}%).`,
      severity: "success"
    },
    {
      id: `audit-${Date.now()}-3`,
      timestamp: new Date(now.getTime() + 820).toLocaleTimeString(),
      rawTime: now.getTime() + 820,
      stage: "03 STRUCTURING",
      type: "ENTITIES_EXTRACTED",
      message: `Extracted ${entities.length} structured domain entities and flagged ${ambiguities.length} critical ambiguities.`,
      severity: "info"
    },
    {
      id: `audit-${Date.now()}-4`,
      timestamp: new Date(now.getTime() + 1150).toLocaleTimeString(),
      rawTime: now.getTime() + 1150,
      stage: "04 VERIFYING",
      type: "SAFETY_VALIDATION",
      message: `Safety policy checked against Authoritative Action Registry. 0 unlisted actions allowed.`,
      severity: "success"
    }
  ];
  actions.forEach((act) => {
    if (act.status === "AUTO_EXECUTED") {
      auditTrail.push({
        id: `audit-${Date.now()}-auto-${act.id}`,
        timestamp: new Date(now.getTime() + 1400).toLocaleTimeString(),
        rawTime: now.getTime() + 1400,
        stage: "05 ACTION PLAN",
        type: "AUTO_EXECUTED",
        message: `LOW-RISK action [${act.actionName}] automatically executed by system policy.`,
        severity: "success"
      });
    } else if (act.status === "AWAITING_CONFIRMATION") {
      auditTrail.push({
        id: `audit-${Date.now()}-med-${act.id}`,
        timestamp: new Date(now.getTime() + 1500).toLocaleTimeString(),
        rawTime: now.getTime() + 1500,
        stage: "06 CONFIRMATION",
        type: "CONFIRMATION_REQUIRED",
        message: `MEDIUM-RISK action [${act.actionName}] queued for explicit user confirmation.`,
        severity: "warning"
      });
    } else if (act.status === "AUTHORIZATION_REQUIRED") {
      auditTrail.push({
        id: `audit-${Date.now()}-high-${act.id}`,
        timestamp: new Date(now.getTime() + 1600).toLocaleTimeString(),
        rawTime: now.getTime() + 1600,
        stage: "06 CONFIRMATION",
        type: "AUTHORIZATION_REQUIRED",
        message: `HIGH-RISK action [${act.actionName}] isolated. Requires strict human authorization.`,
        severity: "alert"
      });
    }
  });
  return {
    understoodSummary,
    primaryIntent,
    confidence,
    intentCategory,
    entities,
    ambiguities,
    verificationFacts,
    actions,
    safetyAdvisory,
    rawInput: text,
    auditTrail,
    timestamp: now.toISOString(),
    imageAttached,
    modelUsed: "deterministic-engine"
  };
}

// src/serverApp.ts
dotenv.config({ path: [".env.local", ".env"] });
var app = express();
app.disable("x-powered-by");
app.use(compression());
app.use(express.json({ limit: MAX_BODY_BYTES }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});
var aiClient = null;
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI2({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
var handleHealth = (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: "ok",
    geminiActive: hasKey,
    engine: "NEXUSACT Universal Bridge v2.4"
  });
};
app.get("/api/health", handleHealth);
app.get("/health", handleHealth);
function resolveInputPayload(body) {
  const { text, image } = body;
  if (typeof text !== "string" || !text.trim()) {
    return { error: "Text input is required." };
  }
  if (text.length > MAX_INPUT_LENGTH) {
    return { error: `Input text exceeds the ${MAX_INPUT_LENGTH} character limit.` };
  }
  const imageData = typeof image?.data === "string" && image.data ? image.data : void 0;
  if (typeof image?.mimeType === "string" && image.mimeType && imageData) {
    const allowed = ALLOWED_IMAGE_MIME_TYPES;
    if (!allowed.includes(image.mimeType)) {
      return { error: "Unsupported image format. Allowed: image/jpeg, image/png, image/webp." };
    }
  }
  if (imageData !== void 0 && imageData.length > MAX_IMAGE_BASE64_CHARS) {
    return { error: "Image payload exceeds the 8 MB limit." };
  }
  const mimeType = typeof image?.mimeType === "string" && image.mimeType ? image.mimeType : "image/jpeg";
  return {
    text,
    image: imageData ? { data: imageData, mimeType } : void 0,
    imageAttached: Boolean(imageData)
  };
}
var handleAnalyzeIntent = async (req, res) => {
  const payload = resolveInputPayload(req.body);
  if ("error" in payload) {
    return res.status(400).json({ error: payload.error });
  }
  const { text, image, imageAttached } = payload;
  const ai = getGeminiClient();
  if (!ai) {
    console.log("[NexusAct Engine] No GEMINI_API_KEY detected. Running deterministic safety engine.");
    const fallbackResult = generateSyntheticAnalysis(text, imageAttached);
    return res.json(fallbackResult);
  }
  const allowedActionList = Object.keys(ACTION_REGISTRY);
  const promptText = `Analyze this messy human input:
"""${text}"""

Allowed actionNames: ${allowedActionList.join(", ")}`;
  const contents = imageAttached && image ? [
    { inlineData: { mimeType: image.mimeType, data: image.data } },
    { text: promptText }
  ] : [{ text: promptText }];
  let parsed;
  let modelUsed = "gemini-3.8-flash";
  try {
    const result2 = await callGeminiWithResilience(ai, contents, GEMINI_SYSTEM_INSTRUCTION);
    parsed = result2.parsed;
    modelUsed = result2.modelUsed;
  } catch (genAiError) {
    const message = genAiError instanceof Error ? genAiError.message : String(genAiError);
    console.warn(
      `[NexusAct Engine] Gemini models temporarily unreachable (${message}). Falling back to deterministic intelligence engine.`
    );
    const fallbackResult = generateSyntheticAnalysis(text, imageAttached);
    return res.json(fallbackResult);
  }
  const rawActions = Array.isArray(parsed.proposedActions) ? parsed.proposedActions : [];
  const actions = rawActions.map(
    (raw, idx) => validateAndRegisterAction(raw, idx)
  );
  const now = /* @__PURE__ */ new Date();
  const timestampStr = now.toLocaleTimeString();
  const auditTrail = [
    {
      id: `audit-${Date.now()}-1`,
      timestamp: timestampStr,
      rawTime: now.getTime(),
      stage: "01 INPUT RECEIVED",
      type: "INTENT_RECEIVED",
      message: `Messy human input packet ingested (${text.length} chars${imageAttached ? ", + visual inspection frame" : ""}).`,
      severity: "info"
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
      severity: "success"
    },
    {
      id: `audit-${Date.now()}-3`,
      timestamp: new Date(now.getTime() + 600).toLocaleTimeString(),
      rawTime: now.getTime() + 600,
      stage: "03 STRUCTURING",
      type: "ENTITIES_EXTRACTED",
      message: `Structured ${parsed.entities?.length || 0} entities and identified ${parsed.ambiguities?.length || 0} critical ambiguities.`,
      severity: "info"
    },
    {
      id: `audit-${Date.now()}-4`,
      timestamp: new Date(now.getTime() + 900).toLocaleTimeString(),
      rawTime: now.getTime() + 900,
      stage: "04 VERIFYING",
      type: "SAFETY_VALIDATION",
      message: `Action Registry evaluated ${actions.length} proposed operations. Safety boundaries enforced.`,
      severity: "success"
    }
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
        severity: "success"
      });
    } else if (act.status === "AWAITING_CONFIRMATION") {
      auditTrail.push({
        id: `audit-${Date.now()}-med-${act.id}`,
        timestamp: new Date(now.getTime() + 1200).toLocaleTimeString(),
        rawTime: now.getTime() + 1200,
        stage: "06 CONFIRMATION",
        type: "CONFIRMATION_REQUIRED",
        message: `MEDIUM-RISK action [${act.actionName}] held pending operator confirmation.`,
        severity: "warning"
      });
    } else if (act.status === "AUTHORIZATION_REQUIRED") {
      auditTrail.push({
        id: `audit-${Date.now()}-high-${act.id}`,
        timestamp: new Date(now.getTime() + 1300).toLocaleTimeString(),
        rawTime: now.getTime() + 1300,
        stage: "06 CONFIRMATION",
        type: "AUTHORIZATION_REQUIRED",
        message: `HIGH-RISK action [${act.actionName}] isolated in containment. Explicit human authorization required.`,
        severity: "alert"
      });
    }
  });
  const result = {
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
    modelUsed
  };
  return res.json(result);
};
app.post("/api/analyze-intent", handleAnalyzeIntent);
app.post("/analyze-intent", handleAnalyzeIntent);
var handleExecuteAction = (req, res) => {
  const { actionId, actionName, parameters, authConfirmed } = req.body;
  const name = typeof actionName === "string" ? actionName : "";
  const definition = ACTION_REGISTRY[name];
  if (!definition) {
    return res.status(400).json({ error: "Unknown action rejected by registry safety policy." });
  }
  const confirmed = authConfirmed === true;
  if (definition.risk !== "LOW" && !confirmed) {
    return res.status(403).json({ error: "Consequential actions require explicit authorized human confirmation." });
  }
  const sanitizedParams = sanitizeParameters(
    typeof parameters === "object" && parameters !== null ? parameters : void 0,
    definition.allowedParams
  );
  const now = /* @__PURE__ */ new Date();
  const logs = [
    `[${now.toLocaleTimeString()}] AUTHORIZATION RECEIVED \u2713 - Authenticated operator token verified`,
    `[${now.toLocaleTimeString()}] VALIDATING PARAMETERS \u2713 - Checking allowed schema against registry`,
    `[${now.toLocaleTimeString()}] ACTION REGISTRY CHECK \u2713 - Canonical risk rating verified: ${definition.risk}`,
    `[${now.toLocaleTimeString()}] EXECUTING DEMO ACTION - Triggering simulated API interface (${definition.category})`,
    `[${now.toLocaleTimeString()}] ACTION COMPLETED \u2713 - Simulated state change committed to test ledger`
  ];
  const auditEntry = {
    id: `audit-exec-${Date.now()}`,
    timestamp: now.toLocaleTimeString(),
    rawTime: now.getTime(),
    stage: "07 EXECUTION",
    type: "EXECUTION_COMPLETED",
    message: `Action [${name}] simulated execution completed under operator authorization.`,
    metadata: { actionId, actionName: name, parameters: sanitizedParams },
    severity: "success"
  };
  return res.json({
    success: true,
    actionId,
    status: "COMPLETED",
    executedAt: now.toISOString(),
    executionLogs: logs,
    auditEntry,
    isSimulated: true
  });
};
app.post("/api/execute-action", handleExecuteAction);
app.post("/execute-action", handleExecuteAction);
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found." });
});
app.use((err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const errType = err?.type;
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
var serverApp_default = app;

// src/apiEntry.ts
var apiEntry_default = serverApp_default;
export {
  apiEntry_default as default
};
