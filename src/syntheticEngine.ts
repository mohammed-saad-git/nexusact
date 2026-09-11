import { AuditEvent, AnalysisResult, ProcessedAction } from "./types";
import { validateAndRegisterAction } from "./actionRegistry";

/**
 * Deterministic fallback intelligence engine used when the Gemini API key is
 * unavailable or all model attempts fail. It maps characteristic keywords in
 * the raw human input to curated emergency scenarios so the application
 * remains fully demonstrable offline.
 */
export function generateSyntheticAnalysis(text: string, imageAttached: boolean): AnalysisResult {
  const lower = text.toLowerCase();
  const now = new Date();
  const timestampStr = now.toLocaleTimeString();

  let understoodSummary = "";
  let primaryIntent = "";
  let confidence = 0.94;
  let intentCategory = "GENERAL_ASSISTANCE";
  let rawProposedActions: Array<{ actionName: string; rationale: string; suggestedParameters: Record<string, string> }> = [];
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