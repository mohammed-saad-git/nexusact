import { describe, it, expect } from 'vitest';
import { validateAndRegisterAction } from './actionRegistry';

describe('validateAndRegisterAction', () => {
  it('rejects an action not present in the registry', () => {
    const result = validateAndRegisterAction({ actionName: 'LAUNCH_MISSILES' }, 0);
    expect(result.status).toBe('REJECTED');
    expect(result.registryVerified).toBe(false);
    expect(result.risk).toBe('HIGH');
    expect(result.actionName).toBe('LAUNCH_MISSILES');
  });

  it('rejects an action with no name', () => {
    const result = validateAndRegisterAction({}, 1);
    expect(result.status).toBe('REJECTED');
    expect(result.actionName).toBe('UNKNOWN_ACTION');
  });

  it('rejects a non-string action name', () => {
    const result = validateAndRegisterAction({ actionName: 12345 }, 2);
    expect(result.status).toBe('REJECTED');
    expect(result.actionName).toBe('UNKNOWN_ACTION');
  });

  it('trims whitespace around the requested action name', () => {
    const result = validateAndRegisterAction({ actionName: '  SEND_SMS_ALERT  ' }, 3);
    expect(result.registryVerified).toBe(true);
    expect(result.actionName).toBe('SEND_SMS_ALERT');
  });

  it('auto-executes LOW risk actions registered for auto-execution', () => {
    const result = validateAndRegisterAction(
      { actionName: 'QUERY_SENSOR_DATA', suggestedParameters: { location: 'Cedar Bend' } },
      4
    );
    expect(result.status).toBe('AUTO_EXECUTED');
    expect(result.risk).toBe('LOW');
    expect(result.parameters.location).toBe('Cedar Bend');
  });

  it('holds MEDIUM risk actions awaiting confirmation', () => {
    const result = validateAndRegisterAction({ actionName: 'SEND_SMS_ALERT' }, 5);
    expect(result.status).toBe('AWAITING_CONFIRMATION');
    expect(result.risk).toBe('MEDIUM');
  });

  it('requires authorization for HIGH risk actions', () => {
    const result = validateAndRegisterAction({ actionName: 'DISPATCH_EMERGENCY_SERVICES' }, 6);
    expect(result.status).toBe('AUTHORIZATION_REQUIRED');
    expect(result.risk).toBe('HIGH');
  });

  it('filters parameters to registry-allowed keys only', () => {
    const result = validateAndRegisterAction(
      {
        actionName: 'QUERY_SENSOR_DATA',
        suggestedParameters: {
          location: 'River North',
          icbmTarget: 'Do Not Dispatch',
          payload: { nested: true },
        },
      },
      7
    );
    expect(result.parameters).toEqual({ location: 'River North' });
  });

  it('drops non-primitive parameters', () => {
    const result = validateAndRegisterAction(
      {
        actionName: 'LOG_HEALTH_RECORD',
        suggestedParameters: { severity: 'HIGH', tags: ['a', 'b'], meta: { x: 1 } },
      },
      8
    );
    expect(result.parameters).toEqual({ severity: 'HIGH' });
  });

  it('allows string params through ONLY when prefixed with extra_', () => {
    const result = validateAndRegisterAction(
      {
        actionName: 'DRAFT_COMMUNICATION',
        suggestedParameters: { summary: 'ok', extra_targetMobility: 'detailed', sneakThrough: 'denied' },
      },
      9
    );
    expect(result.parameters).toEqual({ summary: 'ok', extra_targetMobility: 'detailed' });
  });

  it('registry risk rating overrides model claims for HIGH risk actions', () => {
    const result = validateAndRegisterAction(
      { actionName: 'DISPATCH_EMERGENCY_SERVICES', suggestedParameters: {} },
      10
    );
    expect(result.risk).toBe('HIGH');
    expect(result.status).toBe('AUTHORIZATION_REQUIRED');
  });
});