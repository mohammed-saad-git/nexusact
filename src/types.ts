export type ActionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type ActionExecutionStatus =
  | 'AUTO_EXECUTED'
  | 'AWAITING_CONFIRMATION'
  | 'CONFIRMED'
  | 'AUTHORIZATION_REQUIRED'
  | 'AUTHORIZING'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

export interface RegisteredActionDefinition {
  id: string;
  name: string;
  displayName: string;
  description: string;
  risk: ActionRiskLevel;
  autoExecute: boolean;
  isSimulated: boolean;
  allowedParams: string[];
  category: 'TELEMETRY' | 'DISPATCH' | 'COMMUNICATION' | 'LOGISTICS' | 'HEALTHCARE' | 'HAZARD';
}

export interface ProcessedAction {
  id: string;
  actionName: string;
  displayName: string;
  description: string;
  rationale: string;
  risk: ActionRiskLevel;
  autoExecute: boolean;
  status: ActionExecutionStatus;
  parameters: Record<string, string | number | boolean>;
  executionLogs?: string[];
  executedAt?: string;
  isSimulated: boolean;
  registryVerified: boolean;
}

export interface StructuredEntity {
  category: 'PERSON' | 'LOCATION' | 'HAZARD' | 'CONSTRAINT' | 'URGENCY' | 'ASSET' | 'TIMEFRAME';
  label: string;
  value: string;
  source: 'USER_PROVIDED' | 'AI_INFERRED';
}

export interface AmbiguityItem {
  description: string;
  impact: string;
  recommendedVerification: string;
}

export interface VerificationFact {
  claim: string;
  status: 'CONFIRMED' | 'NEEDS_CONFIRMATION' | 'UNKNOWN';
  sourceType: 'USER_PROVIDED' | 'AI_INFERRED' | 'SYSTEM_VERIFIED' | 'DEMO_DATA';
  notes: string;
}

export type AuditEventType =
  | 'INTENT_RECEIVED'
  | 'GEMINI_SYNTHESIS'
  | 'ENTITIES_EXTRACTED'
  | 'SAFETY_VALIDATION'
  | 'AUTO_EXECUTED'
  | 'CONFIRMATION_REQUIRED'
  | 'CONFIRMATION_GRANTED'
  | 'AUTHORIZATION_REQUIRED'
  | 'USER_AUTHORIZED'
  | 'EXECUTION_STARTED'
  | 'EXECUTION_COMPLETED'
  | 'ACTION_CANCELLED'
  | 'SYSTEM_SECURITY';

export interface AuditEvent {
  id: string;
  timestamp: string;
  rawTime: number;
  stage: string;
  type: AuditEventType;
  message: string;
  metadata?: Record<string, any>;
  severity: 'info' | 'success' | 'warning' | 'alert' | 'danger';
}

export interface PipelineStageState {
  code: string;
  number: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
}

export interface AnalysisResult {
  understoodSummary: string;
  primaryIntent: string;
  confidence: number;
  intentCategory: string;
  entities: StructuredEntity[];
  ambiguities: AmbiguityItem[];
  verificationFacts: VerificationFact[];
  actions: ProcessedAction[];
  safetyAdvisory?: string;
  rawInput: string;
  auditTrail: AuditEvent[];
  timestamp: string;
  imageAttached?: boolean;
  modelUsed?: string;
}

export interface DemoScenario {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  badgeColor: string;
  prompt: string;
  simulatedContext: string;
}
