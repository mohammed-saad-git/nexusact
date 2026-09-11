import { RegisteredActionDefinition, ProcessedAction, ActionExecutionStatus } from './types';

export const ACTION_REGISTRY: Record<string, RegisteredActionDefinition> = {
  QUERY_SENSOR_DATA: {
    id: 'QUERY_SENSOR_DATA',
    name: 'QUERY_SENSOR_DATA',
    displayName: 'Query Sensor Data',
    description: 'Retrieve real-time environmental telemetry, river level gauges, and flood sensor readings.',
    risk: 'LOW',
    autoExecute: true,
    isSimulated: false,
    allowedParams: ['location', 'sensorType', 'radiusKm'],
    category: 'TELEMETRY',
  },
  LOG_HEALTH_RECORD: {
    id: 'LOG_HEALTH_RECORD',
    name: 'LOG_HEALTH_RECORD',
    displayName: 'Log Health Record',
    description: 'Append an adverse symptom flag and clinical observation note into the secure triage audit stream.',
    risk: 'LOW',
    autoExecute: true,
    isSimulated: false,
    allowedParams: ['patientRef', 'symptomCategory', 'severity', 'medicationsNoted'],
    category: 'HEALTHCARE',
  },
  RESERVE_LOCAL_INVENTORY: {
    id: 'RESERVE_LOCAL_INVENTORY',
    name: 'RESERVE_LOCAL_INVENTORY',
    displayName: 'Reserve Local Inventory',
    description: 'Temporarily lock emergency relief rations, pediatric formula, or cold-chain storage capacity.',
    risk: 'LOW',
    autoExecute: true,
    isSimulated: false,
    allowedParams: ['itemType', 'quantity', 'depotId', 'expiryWindow'],
    category: 'LOGISTICS',
  },
  DRAFT_COMMUNICATION: {
    id: 'DRAFT_COMMUNICATION',
    name: 'DRAFT_COMMUNICATION',
    displayName: 'Draft Communication',
    description: 'Generate formatted dispatch brief and internal operational status note for field personnel.',
    risk: 'LOW',
    autoExecute: true,
    isSimulated: false,
    allowedParams: ['recipientGroup', 'subject', 'summary', 'channel'],
    category: 'COMMUNICATION',
  },
  SEND_SMS_ALERT: {
    id: 'SEND_SMS_ALERT',
    name: 'SEND_SMS_ALERT',
    displayName: 'Send SMS Alert',
    description: 'Transmit targeted SMS emergency advisory directly to verified registered contacts in the area.',
    risk: 'MEDIUM',
    autoExecute: false,
    isSimulated: true,
    allowedParams: ['recipientCount', 'urgency', 'messageText', 'contactGroup'],
    category: 'COMMUNICATION',
  },
  SCHEDULE_CALENDAR_EVENT: {
    id: 'SCHEDULE_CALENDAR_EVENT',
    name: 'SCHEDULE_CALENDAR_EVENT',
    displayName: 'Schedule Calendar Event',
    description: 'Book urgent medical review slot or incident commander briefing window.',
    risk: 'MEDIUM',
    autoExecute: false,
    isSimulated: true,
    allowedParams: ['department', 'timeframe', 'notes', 'attendeeRole'],
    category: 'HEALTHCARE',
  },
  UPDATE_DISPATCH_ROUTE: {
    id: 'UPDATE_DISPATCH_ROUTE',
    name: 'UPDATE_DISPATCH_ROUTE',
    displayName: 'Update Dispatch Route',
    description: 'Recalculate and transmit mandatory hazard detour vectors to municipal logistics & first-response vehicles.',
    risk: 'MEDIUM',
    autoExecute: false,
    isSimulated: true,
    allowedParams: ['vehicleId', 'blockedSegment', 'safeCorridor', 'detourEtaMinutes'],
    category: 'DISPATCH',
  },
  DISPATCH_EMERGENCY_SERVICES: {
    id: 'DISPATCH_EMERGENCY_SERVICES',
    name: 'DISPATCH_EMERGENCY_SERVICES',
    displayName: 'Dispatch Emergency Services',
    description: 'Mobilize rapid water-rescue units, paramedic crews, and high-water evacuation transport vehicles.',
    risk: 'HIGH',
    autoExecute: false,
    isSimulated: true,
    allowedParams: ['incidentType', 'priority', 'coordinates', 'hazardSummary', 'strandedCount'],
    category: 'DISPATCH',
  },
  NOTIFY_CLINIC_HOTLINE: {
    id: 'NOTIFY_CLINIC_HOTLINE',
    name: 'NOTIFY_CLINIC_HOTLINE',
    displayName: 'Notify Clinic Hotline',
    description: 'Trigger immediate emergency medical escalation to the toxicologist / on-call emergency physician.',
    risk: 'HIGH',
    autoExecute: false,
    isSimulated: true,
    allowedParams: ['suspectedInteraction', 'patientStability', 'callbackUrgency', 'contraindications'],
    category: 'HEALTHCARE',
  },
  TRIGGER_HAZARD_EVACUATION: {
    id: 'TRIGGER_HAZARD_EVACUATION',
    name: 'TRIGGER_HAZARD_EVACUATION',
    displayName: 'Trigger Hazard Evacuation',
    description: 'Authorize civil defense localized perimeter evacuation sirens and automated siren beacons.',
    risk: 'HIGH',
    autoExecute: false,
    isSimulated: true,
    allowedParams: ['zoneId', 'hazardThreshold', 'evacRoute', 'civilDefenseNotified'],
    category: 'HAZARD',
  },
  BROADCAST_COMMUNITY_ALERT: {
    id: 'BROADCAST_COMMUNITY_ALERT',
    name: 'BROADCAST_COMMUNITY_ALERT',
    displayName: 'Broadcast Community Alert',
    description: 'Push verified high-priority alert banner across community emergency feeds and local radio frequencies.',
    risk: 'HIGH',
    autoExecute: false,
    isSimulated: true,
    allowedParams: ['alertTier', 'affectedArea', 'publicInstruction', 'expirationMinutes'],
    category: 'COMMUNICATION',
  },
};

export type ParamValue = string | number | boolean;

/**
 * Reduces arbitrary model- or client-supplied parameters to safe primitive
 * values. When an allowlist is provided, only those keys pass through, plus
 * the explicit `extra_` escape hatch for string payloads explicitly flagged
 * by the proposing agent. The registry therefore remains the boundary for
 * arbitrary external data.
 */
export function sanitizeParameters(
  params: Record<string, unknown> | undefined,
  allowedKeys?: string[]
): Record<string, ParamValue> {
  const sanitized: Record<string, ParamValue> = {};
  if (!params) return sanitized;
  for (const [key, value] of Object.entries(params)) {
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      continue;
    }
    if (!allowedKeys) {
      sanitized[key] = value;
    } else if (allowedKeys.includes(key)) {
      sanitized[key] = value;
    } else if (key.startsWith('extra_') && typeof value === 'string') {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export interface ProposedActionInput {
  actionName?: unknown;
  rationale?: string;
  suggestedParameters?: Record<string, unknown>;
}

/**
 * Validates a proposed action against the authoritative Action Registry.
 * The registry is the SOLE authority on:
 * - Validity
 * - Risk Level (registry ALWAYS overrides model output)
 * - Auto-execute capability
 * - Allowed parameters
 */
export function validateAndRegisterAction(
  rawAction: ProposedActionInput,
  index: number
): ProcessedAction {
  const requestedName =
    typeof rawAction.actionName === 'string' && rawAction.actionName.trim()
      ? rawAction.actionName.trim()
      : null;
  const registered = requestedName ? ACTION_REGISTRY[requestedName] : undefined;

  if (!registered) {
    const label = requestedName || 'UNKNOWN_ACTION';
    return {
      id: `act-rejected-${Date.now()}-${index}`,
      actionName: label,
      displayName: label,
      description: 'Action not found in authoritative application registry. Execution rejected by safety policy.',
      rationale: rawAction.rationale || 'Attempted to invoke unregistered action.',
      risk: 'HIGH',
      autoExecute: false,
      status: 'REJECTED',
      parameters: sanitizeParameters(rawAction.suggestedParameters),
      registryVerified: false,
      isSimulated: true,
    };
  }

  // Filter parameters to only those declared in the registry
  const sanitizedParams = sanitizeParameters(rawAction.suggestedParameters, registered.allowedParams);

  // Canonical Risk determines execution status:
  // LOW -> AUTO_EXECUTED
  // MEDIUM -> AWAITING_CONFIRMATION
  // HIGH -> AUTHORIZATION_REQUIRED
  let initialStatus: ActionExecutionStatus = 'AWAITING_CONFIRMATION';
  let executionLogs: string[] | undefined = undefined;
  let executedAt: string | undefined = undefined;

  if (registered.risk === 'LOW' && registered.autoExecute) {
    initialStatus = 'AUTO_EXECUTED';
    executedAt = new Date().toISOString();
    executionLogs = [
      `[${new Date().toLocaleTimeString()}] Safety Policy: LOW risk rating verified against registry`,
      `[${new Date().toLocaleTimeString()}] Auto-execution triggered without human roadblock`,
      `[${new Date().toLocaleTimeString()}] Telemetry payload secured & dispatched successfully`,
    ];
  } else if (registered.risk === 'HIGH') {
    initialStatus = 'AUTHORIZATION_REQUIRED';
  } else {
    initialStatus = 'AWAITING_CONFIRMATION';
  }

  return {
    id: `act-${registered.id.toLowerCase()}-${Date.now()}-${index}`,
    actionName: registered.name,
    displayName: registered.displayName,
    description: registered.description,
    rationale: rawAction.rationale || `Recommended in response to verified situation parameters.`,
    risk: registered.risk, // REGISTRY STRICT OVERRIDE
    autoExecute: registered.autoExecute,
    status: initialStatus,
    parameters: sanitizedParams,
    executionLogs,
    executedAt,
    isSimulated: registered.isSimulated,
    registryVerified: true,
  };
}
