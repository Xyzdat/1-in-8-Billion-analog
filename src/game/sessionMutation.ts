import { ApiError } from '../api/errors.ts';
import type { Session } from '../api/sessionTypes.ts';
import type { SessionCommand } from '../api/sessions.ts';

const refreshCodes = new Set([
  'VERSION_CONFLICT', 'SESSION_COMPLETE', 'SPENDING_INSUFFICIENT_FUNDS', 'DECISION_CHANGED',
  'BIRTH_CONFIGURATION_LOCKED', 'BIRTH_CUSTOMIZATION_UNSUPPORTED', 'CHARACTER_FIELDS_READ_ONLY',
  'FOCUS_UNSUPPORTED', 'FOCUS_UNAVAILABLE', 'IDEMPOTENCY_CONFLICT',
  'BUDGET_UNSUPPORTED', 'ADULT_AGE_REQUIRED', 'BUDGET_ACTION_BLOCKED',
  'BUDGET_ACTION_UNAVAILABLE', 'STRATEGY_UNAVAILABLE', 'JOB_CHANGED', 'ASSET_UNAVAILABLE',
]);

// После отклонения команды любые повторы этой задачи выполняют только чтение.
export function prepareSessionMutation(
  current: Session,
  prepare: (session: Session) => SessionCommand,
  getSession: (id: string, signal?: AbortSignal) => Promise<Session>,
) {
  let command: SessionCommand | undefined;
  let rejectedCode: string | undefined;

  return async (signal: AbortSignal) => {
    if (rejectedCode === undefined) {
      command ??= prepare(current);
      try {
        return { session: await command.execute(signal), rejectedCode: undefined };
      } catch (error) {
        if (!(error instanceof ApiError) || !error.code || !refreshCodes.has(error.code)) throw error;
        rejectedCode = error.code;
      }
    }
    return { session: await getSession(current.id, signal), rejectedCode };
  };
}
