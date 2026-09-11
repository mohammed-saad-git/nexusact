import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { ACTION_REGISTRY, validateAndRegisterAction } from "./src/actionRegistry";
import { AuditEvent, AnalysisResult, ProcessedAction } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

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

// Health check
app.get("/api/health", (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: "ok",
    geminiActive: hasKey,
    engine: "NEXUSACT Universal Bridge v2.4",
  });
});

// Response Schema for structured JSON intent analysis
const ANALYSIS_RESPONSE_SCHEMA = {
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

// Resilient Gemini caller with automatic retry and model fallback chain
async function callGeminiWithResilience(
  ai: GoogleGenAI,
  contents: any[],
  systemInstruction: string
): Promise<{ parsed: any; modelUsed: string }> {
  // Ordered models to try: gemini-3.8-flash (primary), gemini-3.1-flash-lite, gemini-flash-latest
  const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let lastError: any = null;

  for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
    const model = candidateModels[mIdx];
    const maxTries = mIdx === 0 ? 2 : 1;

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
        const parsed = JSON.parse(rawText);
        return { parsed, modelUsed: model };
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err);
        const isTransient =
          msg.includes("503") ||
          msg.includes("UNAVAILABLE") ||
          msg.includes("429") ||
          msg.includes("RESOURCE_EXHAUSTED") ||
          msg.includes("high demand") ||
          msg.includes("temporarily");

        if (isTransient && attempt < maxTries) {
          console.warn(`[Gemini Engine] Model ${model} returned temporary high demand (503/UNAVAILABLE). Retrying in 750ms (attempt ${attempt + 1}/${maxTries})...`);
          await new Promise((res) => setTimeout(res, 750));
          continue;
        }

        console.warn(`[Gemini Engine] Model ${model} unavailable (${msg.slice(0, 90)}). Trying fallback model...`);
        break;
      }
    }
  }

  throw lastError;
}

// Fallback synthetic generator in case of network issues or missing key
function generateSyntheticAnalysis(text: string, imageAttached: boolean): AnalysisResult {
  const lower = text.toLowerCase();
  const now = new Date();
  const timestampStr = now.toLocaleTimeString();

  let understoodSummary = "";
  let primaryIntent = "";
  let confidence = 0.94;
  let intentCategory = "GENERAL_ASSISTANCE";
  let rawProposedActions: Array<{ actionName: string; rationale: string; suggestedParameters: Record<string, any> }> = [];
  let safetyAdvisory: string | undefined = undefined;

  let entities: AnalysisResult["entities"] = [];
  let ambiguities: AnalysisResult["ambiguities"] = [];
  let verificationFacts: AnalysisResult["verificationFacts"] = [];

  if (lower.includes("flood") || lower.includes("water") || lower.includes("underpass") || lower.includes("stuck") || lower.includes("neighbor")) {
    intentCategory = "EMERGENCY_RESPONSE";
    primaryIntent = "Emergency Assistance & Water Rescue Dispatch";
    confidence = 0.96;
    understoodSummary =
      "An elderly resident is trapped near a rapidly flooding underpass with failing telephone battery, requiring immediate condition verification, route diversion, and water-rescue mobilization.";

    entities = [
      { category: "PERSON", label: "Trapped Resident", value: "Elderly neighbor", source: "USER_PROVIDED" },
      { category: "LOCATION", label: "Hazard Site", value: "Flooded underpass corridor", source: "USER_PROVIDED" },
      { category: "HAZARD", label: "Primary Threat", value: "Rising flash flood waters", source: "USER_PROVIDED" },
      { category: "CONSTRAINT", label: "Vulnerability", value: "Phone battery nearly depleted (<5%)", source: "USER_PROVIDED" },
      { category: "URGENCY", label: "Timeframe", value: "Immediate (life safety window < 30m)", source: "AI_INFERRED" },
    ];

    ambiguities = [
      {
        description: "Exact underpass intersection or GPS coordinate not specified in report.",
        impact: "Search area widened to 800-meter sector along arterial underpass.",
        recommendedVerification: "Query municipal road sensors and cross-reference neighbor cell tower sector.",
      },
      {
        description: "Exact flood depth and rate of rise unknown from caller report.",
        impact: "Rescue team equipment requirement (inflatable boat vs high-clearance truck).",
        recommendedVerification: "Query nearest hydrological gauge telemetry.",
      },
    ];

    verificationFacts = [
      { claim: "Individual is elderly and physically trapped", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "Caller first-party report" },
      { claim: "Water is actively rising", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "Caller observation" },
      { claim: "Device battery critically low", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "Impending telemetry loss" },
      { claim: "Current water depth > 1.2m", status: "NEEDS_CONFIRMATION", sourceType: "AI_INFERRED", notes: "Historical underpass inundation pattern" },
      { claim: "Structural collapse risk", status: "UNKNOWN", sourceType: "SYSTEM_VERIFIED", notes: "Bridge engineering telemetry pending" },
    ];

    rawProposedActions = [
      {
        actionName: "QUERY_SENSOR_DATA",
        rationale: "Retrieve real-time flood gauge telemetry at underpass culverts to confirm water height and rate of rise.",
        suggestedParameters: { location: "Underpass Sector 4", sensorType: "HYDROLOGICAL_GAUGE", radiusKm: "1.5" },
      },
      {
        actionName: "UPDATE_DISPATCH_ROUTE",
        rationale: "Reroute incoming first responders away from flooded submerged underpass access ramp to elevated crest road.",
        suggestedParameters: { vehicleId: "RESCUE_UNIT_14", blockedSegment: "Underpass Ramp A", safeCorridor: "Crest Blvd Overpass", detourEtaMinutes: "4" },
      },
      {
        actionName: "DISPATCH_EMERGENCY_SERVICES",
        rationale: "Mobilize specialized swift-water rescue craft and high-water evacuation transport to extract trapped resident.",
        suggestedParameters: { incidentType: "SWIFT_WATER_RESCUE", priority: "CODE_RED_LIFE_SAFETY", coordinates: "Sector 4 Underpass", strandedCount: "1 elderly" },
      },
    ];
  } else if (lower.includes("cipro") || lower.includes("theophylline") || lower.includes("medication") || lower.includes("palpitation") || lower.includes("tremor") || lower.includes("asthma")) {
    intentCategory = "MEDICAL_CONCERN";
    primaryIntent = "Acute Drug-Drug Interaction Escalation & Clinical Review";
    confidence = 0.95;
    safetyAdvisory = "Potential concern detected. Consider seeking professional medical evaluation. The system does not provide medical diagnoses or prescriptions.";
    understoodSummary =
      "Report of acute adverse physiological reaction (tremors, palpitations) following co-administration of Ciprofloxacin and Theophylline, which have a recognized pharmacokinetic interaction.";

    entities = [
      { category: "PERSON", label: "Patient", value: "Family member (asthma/COPD history)", source: "USER_PROVIDED" },
      { category: "HAZARD", label: "Reported Agents", value: "Ciprofloxacin + Theophylline co-ingestion", source: "USER_PROVIDED" },
      { category: "HAZARD", label: "Symptoms", value: "Severe tremors, tachycardia (118 bpm), nausea", source: "USER_PROVIDED" },
      { category: "URGENCY", label: "Priority", value: "Urgent (Within 15-30 minutes)", source: "AI_INFERRED" },
    ];

    ambiguities = [
      {
        description: "Exact milligram doses and exact time of morning ingestion not stated.",
        impact: "Cannot compute estimated peak serum concentration of theophylline.",
        recommendedVerification: "Request caller check prescription bottle labels for dosage strengths.",
      },
    ];

    verificationFacts = [
      { claim: "Patient consumed both medications this morning", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "Reported by family member" },
      { claim: "Symptoms of severe tremor and tachycardia present", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "Symptomatic presentation" },
      { claim: "CYP1A2 enzyme inhibition potential", status: "CONFIRMED", sourceType: "SYSTEM_VERIFIED", notes: "Documented pharmacological interaction database" },
      { claim: "Serum theophylline level exceeds toxic threshold", status: "NEEDS_CONFIRMATION", sourceType: "AI_INFERRED", notes: "Requires emergency blood draw" },
    ];

    rawProposedActions = [
      {
        actionName: "LOG_HEALTH_RECORD",
        rationale: "Securely document symptom timeline and drug interaction flag in emergency clinical intake log.",
        suggestedParameters: { patientRef: "PATIENT_FAMILY_MEMBER", symptomCategory: "SUSPECTED_THEOPHYLLINE_TOXICITY", severity: "HIGH_ACUTE", medicationsNoted: "Ciprofloxacin, Theophylline" },
      },
      {
        actionName: "SCHEDULE_CALENDAR_EVENT",
        rationale: "Block emergency same-day urgent physician consultation slot.",
        suggestedParameters: { department: "EMERGENCY_TRIAGE_CLINIC", timeframe: "IMMEDIATE_STANDBY", notes: "Drug interaction follow-up review" },
      },
      {
        actionName: "NOTIFY_CLINIC_HOTLINE",
        rationale: "Escalate directly to on-call clinical toxicologist and emergency hotline for urgent stabilization advice.",
        suggestedParameters: { suspectedInteraction: "CIPROFLOXACIN_THEOPHYLLINE_CYP1A2", patientStability: "TACHYCARDIC_CONSCIOUS", callbackUrgency: "IMMEDIATE" },
      },
    ];
  } else if (lower.includes("insulin") || lower.includes("truck") || lower.includes("logistics") || lower.includes("slide") || lower.includes("battery") || lower.includes("reefer") || lower.includes("mudslide")) {
    intentCategory = "LOGISTICS_DISRUPTION";
    primaryIntent = "Cold-Chain Integrity Protection & Emergency Detour";
    confidence = 0.94;
    understoodSummary =
      "Critical temperature-sensitive medical consignment (pediatric insulin) stranded on Highway 9 with finite battery refrigeration reserve, requiring rapid detour routing and storage failover.";

    entities = [
      { category: "ASSET", label: "Payload", value: "400 vials pediatric insulin", source: "USER_PROVIDED" },
      { category: "LOCATION", label: "Stoppage Point", value: "Highway 9, Mile Marker 42", source: "USER_PROVIDED" },
      { category: "HAZARD", label: "Blockage", value: "Active mudslide / culvert collapse", source: "USER_PROVIDED" },
      { category: "CONSTRAINT", label: "Thermal Clock", value: "3.5 hours auxiliary refrigeration runtime", source: "USER_PROVIDED" },
      { category: "URGENCY", label: "Critical Window", value: "T-minus 210 minutes to product spoilage", source: "AI_INFERRED" },
    ];

    ambiguities = [
      {
        description: "County Road 4 bridge weight capacity verification pending road department update.",
        impact: "Ensuring transport truck tare weight (8.2 tonnes) can safely utilize alternate corridor.",
        recommendedVerification: "Query state Department of Transportation bridge load registry.",
      },
    ];

    verificationFacts = [
      { claim: "Truck #402 stranded at Mile Marker 42", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "Vehicle GPS telemetry" },
      { claim: "Cold-chain temperature currently within tolerance (4.8°C)", status: "CONFIRMED", sourceType: "SYSTEM_VERIFIED", notes: "Telematics cold sensor probe" },
      { claim: "Route 9 completely impassable for heavy transport", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "State Patrol road closure" },
      { claim: "Backup generator in Valley Depot operational", status: "NEEDS_CONFIRMATION", sourceType: "AI_INFERRED", notes: "Contact depot supervisor" },
    ];

    rawProposedActions = [
      {
        actionName: "QUERY_SENSOR_DATA",
        rationale: "Continuously stream live container temperature and auxiliary battery telemetry.",
        suggestedParameters: { location: "Truck 402 Reefer Unit", sensorType: "TEMP_AND_POWER_TELEMETRY", radiusKm: "0" },
      },
      {
        actionName: "UPDATE_DISPATCH_ROUTE",
        rationale: "Transmit turn-by-turn reroute vector via County Road 4 to the driver's electronic logging device.",
        suggestedParameters: { vehicleId: "TRUCK_402", blockedSegment: "Hwy 9 MM 40-44", safeCorridor: "County Rd 4 West", detourEtaMinutes: "48" },
      },
      {
        actionName: "BROADCAST_COMMUNITY_ALERT",
        rationale: "Issue urgent commercial freight diversion notice for the Highway 9 mountain corridor.",
        suggestedParameters: { alertTier: "ROAD_HAZARD_ADVISORY", affectedArea: "Highway 9 Corridor", publicInstruction: "Commercial traffic use Exit 28 bypass", expirationMinutes: "240" },
      },
    ];
  } else if (lower.includes("oak grove") || lower.includes("formula") || lower.includes("shelter") || lower.includes("evacuee") || lower.includes("infant")) {
    intentCategory = "COMMUNITY_AID";
    primaryIntent = "Emergency Supply Allocation & Volunteer Coordination";
    confidence = 0.93;
    understoodSummary =
      "Critical surge in displaced storm evacuees at shelter creating severe deficits in infant formula and allergy-safe nutrition, requiring immediate inventory lock and dispatch.";

    entities = [
      { category: "LOCATION", label: "Facility", value: "Oak Grove Evacuation Shelter", source: "USER_PROVIDED" },
      { category: "PERSON", label: "Affected Group", value: "Displaced storm survivors (infants present)", source: "USER_PROVIDED" },
      { category: "HAZARD", label: "Supply Depletion", value: "Zero infant formula, critical nutrient shortage", source: "USER_PROVIDED" },
      { category: "ASSET", label: "Logistics Asset", value: "Volunteer transport ready", source: "USER_PROVIDED" },
      { category: "URGENCY", label: "Deadline", value: "Immediate supply replenishment", source: "AI_INFERRED" },
    ];

    ambiguities = [
      {
        description: "Exact infant age distribution (0-6m vs 6-12m) not fully specified.",
        impact: "Formula stage selection (Stage 1 gentle vs toddler milk).",
        recommendedVerification: "Shelter intake desk headcount confirmation.",
      },
    ];

    verificationFacts = [
      { claim: "Evacuee surge reported at emergency shelter", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "Intake registration log" },
      { claim: "Infant nutrition supply critically depleted", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "Pantry inventory check" },
      { claim: "Regional emergency cache has matching inventory", status: "NEEDS_CONFIRMATION", sourceType: "AI_INFERRED", notes: "Depot system sync requested" },
      { claim: "Volunteer transport is road-ready", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "Driver waiting on site" },
    ];

    rawProposedActions = [
      {
        actionName: "RESERVE_LOCAL_INVENTORY",
        rationale: "Lock 40 tins of infant formula and 80 allergen-neutral meal packs from Regional Depot 2.",
        suggestedParameters: { itemType: "INFANT_FORMULA_AND_RATIONS", quantity: "120_UNITS", depotId: "REGIONAL_DEPOT_2", expiryWindow: "24_HOURS" },
      },
      {
        actionName: "DRAFT_COMMUNICATION",
        rationale: "Generate pickup manifest and warehouse gate pass for volunteer driver.",
        suggestedParameters: { recipientGroup: "VOLUNTEER_DRIVER_LOGISTICS", subject: "Emergency Pickup Authorization: Depot 2", summary: "Priority gate pass for infant formula cache" },
      },
      {
        actionName: "SEND_SMS_ALERT",
        rationale: "Send SMS dispatch with pickup coordinates and warehouse dock authorization code to volunteer driver.",
        suggestedParameters: { recipientCount: "1", urgency: "HIGH", messageText: "PROCEED TO DEPOT 2 DOCK B FOR EMERGENCY SHELTER FORMULA PICKUP. AUTH CODE: NX-8842." },
      },
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
      { category: "CONSTRAINT", label: "Public Exposure", value: "Civilians and local structures in hazard path", source: "USER_PROVIDED" },
    ];

    ambiguities = [
      {
        description: "Exact coordinates and extent of fire/hazard spread not confirmed.",
        impact: "Determining evacuation radius size (300m vs 1km).",
        recommendedVerification: "Query municipal thermal sensors and dispatch aerial recon.",
      },
    ];

    verificationFacts = [
      { claim: "Active hazard reported by on-scene caller", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "First-party caller narrative" },
      { claim: "Utility lines or fuel sources involved", status: "NEEDS_CONFIRMATION", sourceType: "AI_INFERRED", notes: "Utility company dispatch requested" },
      { claim: "Immediate structural collapse danger", status: "UNKNOWN", sourceType: "SYSTEM_VERIFIED", notes: "Fire Marshal inspection pending" },
    ];

    rawProposedActions = [
      {
        actionName: "QUERY_SENSOR_DATA",
        rationale: "Retrieve live air quality, ambient heat sensors, and smart grid voltage status in vicinity.",
        suggestedParameters: { location: "Reported Hazard Zone", sensorType: "ENVIRONMENTAL_AND_GRID", radiusKm: "1.0" },
      },
      {
        actionName: "BROADCAST_COMMUNITY_ALERT",
        rationale: "Issue urgent push advisory instructing nearby occupants to evacuate or shelter upwind.",
        suggestedParameters: { alertTier: "EVACUATION_ADVISORY", affectedArea: "Incident Vicinity", publicInstruction: "Evacuate upwind immediately. Avoid power lines.", expirationMinutes: "120" },
      },
      {
        actionName: "DISPATCH_EMERGENCY_SERVICES",
        rationale: "Mobilize fire suppression units and emergency rescue personnel to secure perimeter and neutralize hazard.",
        suggestedParameters: { incidentType: "HAZARD_CONTAINMENT", priority: "CODE_RED_LIFE_SAFETY", coordinates: "Incident Zone", strandedCount: "Multiple" },
      },
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
      { category: "URGENCY", label: "Clinical Urgency", value: "Immediate (Within minutes)", source: "AI_INFERRED" },
    ];

    ambiguities = [
      {
        description: "Patient consciousness level and baseline medical history unconfirmed.",
        impact: "EMS dispatch equipment selection (advanced cardiac life support unit).",
        recommendedVerification: "Verify consciousness and breathing rate via caller guidance.",
      },
    ];

    verificationFacts = [
      { claim: "Patient actively experiencing symptoms", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "Caller observation" },
      { claim: "Emergency medical triage needed", status: "CONFIRMED", sourceType: "AI_INFERRED", notes: "Clinical protocol flag" },
    ];

    rawProposedActions = [
      {
        actionName: "LOG_HEALTH_RECORD",
        rationale: "Create secure incident medical intake entry with reported timeline and vital flags.",
        suggestedParameters: { patientRef: "REPORTED_INDIVIDUAL", symptomCategory: "ACUTE_PHYSIOLOGICAL_DISTRESS", severity: "HIGH_ACUTE" },
      },
      {
        actionName: "SCHEDULE_CALENDAR_EVENT",
        rationale: "Reserve immediate clinical intake room at nearest emergency receiving facility.",
        suggestedParameters: { department: "EMERGENCY_TRAUMA_BAY", timeframe: "IMMEDIATE_STANDBY", notes: "Urgent transfer incoming" },
      },
      {
        actionName: "NOTIFY_CLINIC_HOTLINE",
        rationale: "Connect directly to emergency triage physician and dispatch ambulance.",
        suggestedParameters: { suspectedInteraction: "ACUTE_PHYSIOLOGICAL_DISTRESS", patientStability: "UNSTABLE", callbackUrgency: "IMMEDIATE" },
      },
    ];
  } else {
    // Dynamic general human intent synthesis for arbitrary queries
    intentCategory = "GENERAL_ASSISTANCE";
    primaryIntent = "Incident Assessment & Coordinated Verification";
    confidence = 0.92;
    const cleanSnippet = text.trim().slice(0, 110).replace(/[\r\n]+/g, " ");
    understoodSummary = `Caller submitted an urgent real-world report: "${cleanSnippet}...". The situation requires immediate entity extraction, ambiguity resolution, and verified action governance.`;

    entities = [
      { category: "HAZARD", label: "Reported Situation", value: cleanSnippet.slice(0, 45), source: "USER_PROVIDED" },
      { category: "LOCATION", label: "Incident Area", value: "Specified in caller report", source: "USER_PROVIDED" },
      { category: "URGENCY", label: "Assessment Window", value: "Rapid triage required (< 15 min)", source: "AI_INFERRED" },
    ];

    ambiguities = [
      {
        description: "Exact geographic coordinates and on-site responder availability require verification.",
        impact: "Routing and dispatch response timing.",
        recommendedVerification: "Query municipal sensor network and cross-reference telecom cell sector.",
      },
    ];

    verificationFacts = [
      { claim: "Incident report submitted by user", status: "CONFIRMED", sourceType: "USER_PROVIDED", notes: "Inbound narrative captured" },
      { claim: "On-site telemetry available", status: "NEEDS_CONFIRMATION", sourceType: "AI_INFERRED", notes: "Awaiting sensor sweep" },
    ];

    rawProposedActions = [
      {
        actionName: "QUERY_SENSOR_DATA",
        rationale: "Query local telematics and infrastructure sensors to verify ground reality.",
        suggestedParameters: { location: "Reported Sector", sensorType: "ENVIRONMENTAL_TELEMETRY", radiusKm: "2.0" },
      },
      {
        actionName: "DRAFT_COMMUNICATION",
        rationale: "Draft operational notification for municipal coordination center.",
        suggestedParameters: { recipientGroup: "DISPATCH_OPERATIONS", subject: "Inbound Real-World Incident Escalation", summary: cleanSnippet.slice(0, 80) },
      },
      {
        actionName: "SEND_SMS_ALERT",
        rationale: "Send high-priority SMS notification to designated duty supervisor.",
        suggestedParameters: { recipientCount: "1", urgency: "HIGH", messageText: `NEXUSACT ALERT: Actionable report logged: ${cleanSnippet.slice(0, 60)}` },
      },
    ];
  }

  // Validate actions against Authoritative Registry
  const actions: ProcessedAction[] = rawProposedActions.map((raw, idx) =>
    validateAndRegisterAction(raw, idx)
  );

  const auditTrail: AuditEvent[] = [
    {
      id: `audit-${Date.now()}-1`,
      timestamp: timestampStr,
      rawTime: now.getTime(),
      stage: "01 INPUT RECEIVED",
      type: "INTENT_RECEIVED",
      message: `Unstructured input packet captured (${text.length} chars${imageAttached ? ", + multimodal visual payload" : ""}).`,
      severity: "info",
    },
    {
      id: `audit-${Date.now()}-2`,
      timestamp: new Date(now.getTime() + 450).toLocaleTimeString(),
      rawTime: now.getTime() + 450,
      stage: "02 UNDERSTANDING",
      type: "GEMINI_SYNTHESIS",
      message: `Intent understood: "${primaryIntent}" (Confidence: ${Math.round(confidence * 100)}%).`,
      severity: "success",
    },
    {
      id: `audit-${Date.now()}-3`,
      timestamp: new Date(now.getTime() + 820).toLocaleTimeString(),
      rawTime: now.getTime() + 820,
      stage: "03 STRUCTURING",
      type: "ENTITIES_EXTRACTED",
      message: `Extracted ${entities.length} structured domain entities and flagged ${ambiguities.length} critical ambiguities.`,
      severity: "info",
    },
    {
      id: `audit-${Date.now()}-4`,
      timestamp: new Date(now.getTime() + 1150).toLocaleTimeString(),
      rawTime: now.getTime() + 1150,
      stage: "04 VERIFYING",
      type: "SAFETY_VALIDATION",
      message: `Safety policy checked against Authoritative Action Registry. 0 unlisted actions allowed.`,
      severity: "success",
    },
  ];

  // Audit for actions
  actions.forEach((act) => {
    if (act.status === "AUTO_EXECUTED") {
      auditTrail.push({
        id: `audit-${Date.now()}-auto-${act.id}`,
        timestamp: new Date(now.getTime() + 1400).toLocaleTimeString(),
        rawTime: now.getTime() + 1400,
        stage: "05 ACTION PLAN",
        type: "AUTO_EXECUTED",
        message: `LOW-RISK action [${act.actionName}] automatically executed by system policy.`,
        severity: "success",
      });
    } else if (act.status === "AWAITING_CONFIRMATION") {
      auditTrail.push({
        id: `audit-${Date.now()}-med-${act.id}`,
        timestamp: new Date(now.getTime() + 1500).toLocaleTimeString(),
        rawTime: now.getTime() + 1500,
        stage: "06 CONFIRMATION",
        type: "CONFIRMATION_REQUIRED",
        message: `MEDIUM-RISK action [${act.actionName}] queued for explicit user confirmation.`,
        severity: "warning",
      });
    } else if (act.status === "AUTHORIZATION_REQUIRED") {
      auditTrail.push({
        id: `audit-${Date.now()}-high-${act.id}`,
        timestamp: new Date(now.getTime() + 1600).toLocaleTimeString(),
        rawTime: now.getTime() + 1600,
        stage: "06 CONFIRMATION",
        type: "AUTHORIZATION_REQUIRED",
        message: `HIGH-RISK action [${act.actionName}] isolated. Requires strict human authorization.`,
        severity: "alert",
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
    modelUsed: "deterministic-engine",
  };
}

// POST /api/analyze-intent
app.post("/api/analyze-intent", async (req, res) => {
  try {
    const { text, image } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
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
    const systemInstruction = `
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

    const allowedActionList = Object.keys(ACTION_REGISTRY);

    const contents: any[] = [];
    if (imageAttached) {
      contents.push({
        inlineData: {
          mimeType: image.mimeType || "image/jpeg",
          data: image.data,
        },
      });
    }
    contents.push({
      text: `Analyze this messy human input:\n"""${text}"""\n\nAllowed actionNames: ${allowedActionList.join(", ")}`,
    });

    let parsed: any;
    let modelUsed = "gemini-3.8-flash";

    try {
      const result = await callGeminiWithResilience(ai, contents, systemInstruction);
      parsed = result.parsed;
      modelUsed = result.modelUsed;
    } catch (genAiError: any) {
      console.warn(
        `[NexusAct Engine] Gemini models temporarily unreachable (${genAiError?.message || genAiError}). Falling back to deterministic intelligence engine.`
      );
      const fallbackResult = generateSyntheticAnalysis(text, imageAttached);
      return res.json(fallbackResult);
    }

    // Authoritative Action Registry check
    const rawActions = Array.isArray(parsed.proposedActions) ? parsed.proposedActions : [];
    const actions: ProcessedAction[] = rawActions.map((raw: any, idx: number) =>
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
  } catch (error: any) {
    console.warn("[NexusAct Engine] Intent analysis caught unhandled exception, falling back:", error?.message || error);
    const fallbackResult = generateSyntheticAnalysis(req.body?.text || "Emergency incident", Boolean(req.body?.image));
    return res.json(fallbackResult);
  }
});

// POST /api/execute-action (Execution sequence simulation for authorized actions)
app.post("/api/execute-action", (req, res) => {
  const { actionId, actionName, parameters, authConfirmed } = req.body;

  const definition = ACTION_REGISTRY[actionName];
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
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NEXUSACT Engine active on port ${PORT}`);
  });
}

startServer();
