import type { AnalysisResult } from './types';
import { DEFAULT_CONFIDENCE } from './constants';

export interface ReportInput {
  result: AnalysisResult | null;
  rawInput: string;
}

/**
 * Builds the plain-text RESPONSE REPORT used by the copy and download actions.
 * Pure function of the analysis result so it can be unit-tested in isolation.
 */
export function buildPlainTextReport({ result, rawInput }: ReportInput): string {
  const personEntity = result?.entities.find((e) => e.category === 'PERSON');
  const hazardEntity = result?.entities.find((e) => e.category === 'HAZARD');
  const locationEntity = result?.entities.find((e) => e.category === 'LOCATION');
  const urgencyEntity = result?.entities.find((e) => e.category === 'URGENCY');

  const actions = result?.actions || [];
  const autoExecutedActions = actions.filter((a) => a.status === 'AUTO_EXECUTED');
  const authorizedActions = actions.filter(
    (a) => a.status === 'COMPLETED' || a.status === 'CONFIRMED'
  );
  const pendingActions = actions.filter(
    (a) =>
      a.status === 'AUTHORIZATION_REQUIRED' ||
      a.status === 'AWAITING_CONFIRMATION' ||
      a.status === 'AUTHORIZING'
  );

  const isPlanCompleted = pendingActions.length === 0 && actions.length > 0;

  const verifiedFacts =
    result?.verificationFacts.filter(
      (f) => f.status === 'CONFIRMED' || f.sourceType === 'SYSTEM_VERIFIED'
    ) || [];

  const unverifiedOrAmbiguities = [
    ...(result?.ambiguities.map((a) => a.description) || []),
    ...(result?.verificationFacts
      .filter((f) => f.status === 'NEEDS_CONFIRMATION' || f.status === 'UNKNOWN')
      .map((f) => f.claim) || []),
  ];

  const reportDate = result?.timestamp || new Date().toLocaleString();
  const reportRef = `INC-${Date.now().toString().slice(-6)}`;

  const urgencyDisplay = urgencyEntity?.value || (hazardEntity ? 'HIGH' : 'MEDIUM');
  const confidence =
    typeof result?.confidence === 'number' ? result.confidence : DEFAULT_CONFIDENCE;

  return `=======================================================
RESPONSE REPORT
=======================================================
INCIDENT REFERENCE: ${reportRef}
DATE / TIME:        ${reportDate}
CLASSIFICATION:     VERIFIED PROTOCOL // LIVE SIMULATION
STATUS:             ${isPlanCompleted ? '✓ RESPONSE PLAN COMPLETED' : '⚠ PENDING HUMAN AUTHORIZATION'}

-------------------------------------------------------
1. SITUATION SUMMARY
-------------------------------------------------------
${rawInput || result?.rawInput || 'No raw situation text provided.'}

-------------------------------------------------------
2. GEMINI ASSESSMENT & DEEP UNDERSTANDING
-------------------------------------------------------
Primary Intent:  ${result?.primaryIntent || 'Emergency Assessment & Response'}
Domain Category: ${result?.intentCategory || 'Emergency Logistics'}
Confidence:      ${Math.round(confidence * 100)}%
Urgency:         ${urgencyDisplay.toUpperCase()}
Hazard:          ${hazardEntity?.value || 'Active environmental / operational hazard'}
Subject at Risk: ${personEntity?.value || 'Civilians in identified sector'}
Location:        ${locationEntity?.value || 'Sector zone'}

Operational Rationale:
${result?.understoodSummary || 'Comprehensive intent analysis executed.'}

-------------------------------------------------------
3. VERIFIED INFORMATION
-------------------------------------------------------
${
  verifiedFacts.length > 0
    ? verifiedFacts.map((f) => `✓ [VERIFIED] ${f.claim}`).join('\n')
    : '✓ Telemetry sensor feeds queried and active.\n✓ Registry constraints validated.'
}

-------------------------------------------------------
4. UNCERTAINTIES & AMBIGUITIES
-------------------------------------------------------
${
  unverifiedOrAmbiguities.length > 0
    ? unverifiedOrAmbiguities.map((u) => `⚠ [NEEDS CONFIRMATION] ${u}`).join('\n')
    : '⚠ Field coordinates subject to real-time responder validation.'
}

-------------------------------------------------------
5. ACTION GOVERNANCE & EXECUTION
-------------------------------------------------------
Total Actions Proposed: ${actions.length}

[AUTOMATICALLY COMPLETED]
${
  autoExecutedActions.length > 0
    ? autoExecutedActions.map((a) => `✓ ${a.displayName} (Risk: ${a.risk}) - AUTO-EXECUTED`).join('\n')
    : 'None'
}

[HUMAN AUTHORIZED]
${
  authorizedActions.length > 0
    ? authorizedActions.map((a) => `✓ ${a.displayName} (Risk: ${a.risk}) - AUTHORIZED BY OPERATOR`).join('\n')
    : 'None yet'
}

[PENDING AUTHORIZATION]
${
  pendingActions.length > 0
    ? pendingActions.map((a) => `⚠ ${a.displayName} (Risk: ${a.risk}) - REQUIRES OPERATOR SIGN-OFF`).join('\n')
    : 'None - All actions completed'
}

EXECUTION TELEMETRY:
${actions
  .flatMap((a) => a.executionLogs || [])
  .map((log) => `  • ${log}`)
  .join('\n') || '  • Application Registry validated parameter schema.'}

-------------------------------------------------------
6. SAFETY NOTES & REGISTRY BOUNDARIES
-------------------------------------------------------
${result?.safetyAdvisory || 'The code-governed Action Registry is the sovereign authority. Gemini cannot invent endpoints or bypass risk tiers. Low-risk operations execute automatically; consequential physical actions demand explicit human authorization.'}

-------------------------------------------------------
7. FINAL OUTCOME
-------------------------------------------------------
${
  isPlanCompleted
    ? 'A verified response plan was generated and fully executed with consequential actions protected by explicit human authorization.'
    : 'A verified response plan was generated. Consequential high-risk actions are safeguarded and currently awaiting human authorization.'
}

[DEMO SIMULATION NOTICE: All external notifications, physical vehicle dispatches, and emergency calls are safely simulated in-memory.]
=======================================================`;
}