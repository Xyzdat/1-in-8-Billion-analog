import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, sessionsApi } from '../api';
import { localEngineErrorMessages } from '../api/errors';
import { validateUuid } from '../api/sessionDecoders';
import type { CharacterChanges, Session, YearFocusId } from '../api/sessionTypes';
import type { SessionCommand } from '../api/sessions';
import type { BuySpendingItemRequest } from '../api/financeTypes';
import type { BudgetActionRequest, BudgetOutcome } from '../api/budgetTypes';
import { prepareSessionMutation } from './sessionMutation';

const activeSessionKey = 'life.activeServerSession';

type Task = (signal: AbortSignal) => Promise<unknown>;
type Connection = 'saved' | 'ready' | 'offline';
type Failure = {
  message: string;
  retry?: () => void;
};

function readActiveId() {
  const id = localStorage.getItem(activeSessionKey);
  try {
    validateUuid(id);
    return id;
  } catch {
    return null;
  }
}

function unavailableSave(error: unknown) {
  return error instanceof ApiError && error.status === 404;
}

function lostConnection(error: unknown) {
  return error instanceof ApiError && (
    error.kind === 'network' || error.kind === 'timeout'
    || error.status === 502 || error.status === 503 || error.status === 504
  );
}

function canRetryCommand(error: unknown) {
  return error instanceof ApiError
    && (error.kind !== 'http' || error.status === 429 || (error.status ?? 0) >= 500);
}

function errorMessage(error: unknown) {
  const engineMessages: Record<string, string> = {
    ...localEngineErrorMessages,
    ENGINE_RATE_LIMIT: 'Слишком много обращений к движку. Попробуйте немного позже.',
    ENGINE_QUOTA_EXCEEDED: 'Лимит генерации жизней исчерпан.',
    ENGINE_KEY_REJECTED: 'Движок отклонил доступ. Требуется проверить настройки сервера.',
    ENGINE_TOKEN_EXPIRED: 'Срок продолжения этой жизни истёк. Летопись доступна для просмотра.',
    ENGINE_CURSOR_UNREADABLE: 'Сервер не смог открыть сохранение движка.',
    ENGINE_CURSOR_REJECTED: 'Движок не смог продолжить сохранённую жизнь.',
    ENGINE_INVALID_RESPONSE: 'Не удалось обработать ответ движка. Попробуйте повторить запрос.',
    ENGINE_UNAVAILABLE: 'Генерация сейчас недоступна. Попробуйте позже.',
    CHARACTER_FIELDS_READ_ONLY: 'Эти параметры доступны только для просмотра. Обновите анкету.',
    SPENDING_READ_ONLY: 'Покупки для 1in8b пока доступны только для просмотра.',
    SPENDING_INSUFFICIENT_FUNDS: 'Недостаточно средств для этого действия. Выберите другой вариант.',
    DECISION_CHANGED: 'Условия решения изменились. Проверьте актуальные варианты и выберите ответ.',
    SPENDING_AGE_RESTRICTED: 'Это действие ещё недоступно в текущем возрасте.',
    SPENDING_ALREADY_OWNED: 'Этот предмет уже приобретён.',
    SPENDING_CURRENT_LOCATION: 'Персонаж уже живёт в выбранном месте.',
    SPENDING_ITEM_NOT_FOUND: 'Этот вариант больше недоступен. Обновите список.',
    SPENDING_CATEGORY_NOT_FOUND: 'Категория пока недоступна.',
    INVALID_PET_NAME: 'Укажите кличку питомца длиной до 40 символов.',
  };
  if (error instanceof ApiError && error.code && engineMessages[error.code]) {
    return engineMessages[error.code];
  }
  if (unavailableSave(error)) {
    return 'Сохранение больше недоступно.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Не удалось выполнить запрос.';
}

async function checkConnection(signal: AbortSignal) {
  try {
    await sessionsApi.getHealth(AbortSignal.any([signal, AbortSignal.timeout(2000)]));
    return true;
  } catch {
    signal.throwIfAborted();
    return false;
  }
}

export function useServerLife() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [notice, setNotice] = useState('');
  const [resourceRevision, setResourceRevision] = useState(0);
  const [decisionReviewRequired, setDecisionReviewRequired] = useState(false);
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => {
    request.current?.abort();
    request.current = null;
  }, []);

  const acceptSession = useCallback((updated: Session) => {
    localStorage.setItem(activeSessionKey, updated.id);
    setSession(updated);
  }, []);

  const run = useCallback(function run(
    task: Task,
    retryable: (error: unknown) => boolean = () => true,
  ) {
    if (request.current) {
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setFailure(null);
    setNotice('');

    void task(controller.signal).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setFailure({
          message: errorMessage(error),
          retry: retryable(error) ? () => run(task, retryable) : undefined,
        });
      }
    }).finally(() => {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    });
  }, []);

  const connect = useCallback((onResult: (connection: Connection, saved?: Session) => void, { latest = false } = {}) => {
    run(async (signal) => {
      if (!await checkConnection(signal)) {
        onResult('offline');
        return;
      }
      try {
        const id = latest ? null : readActiveId();
        if (id) {
          try {
            const saved = await sessionsApi.getSession(id, signal);
            acceptSession(saved);
            onResult('saved', saved);
            return;
          } catch (error) {
            if (!unavailableSave(error)) {
              throw error;
            }
            localStorage.removeItem(activeSessionKey);
          }
        }
        const [latestSave] = await sessionsApi.listSessions(signal);
        if (latestSave) {
          const saved = await sessionsApi.getSession(latestSave.id, signal);
          acceptSession(saved);
          onResult('saved', saved);
          return;
        }
        onResult('ready');
      } catch (error) {
        if (!lostConnection(error)) {
          throw error;
        }
        onResult('offline');
      }
    });
  }, [acceptSession, run]);

  function generate(onSuccess: () => void) {
    // Команда создаётся один раз и сохраняется в замыкании кнопки повтора.
    let command: SessionCommand | undefined;
    run(async (signal) => {
      command ??= sessionsApi.prepareGenerateLocalSession();
      acceptSession(await command.execute(signal));
      onSuccess();
    });
  }

  function mutate(prepare: (current: Session) => SessionCommand, onSuccess?: (updated: Session) => void) {
    if (!session || session.state.status === 'COMPLETE' || failure?.retry) {
      return;
    }
    const current = session;
    const execute = prepareSessionMutation(current, prepare, sessionsApi.getSession);
    run(async (signal) => {
      try {
        const result = await execute(signal);
        acceptSession(result.session);
        if (result.rejectedCode) {
          const review = ['SPENDING_INSUFFICIENT_FUNDS', 'DECISION_CHANGED'].includes(result.rejectedCode);
          setDecisionReviewRequired(review);
          setResourceRevision((previous) => previous + 1);
          setNotice(review
            ? `${errorMessage(new ApiError('', 'http', 409, { code: result.rejectedCode }))} Сохранение обновлено.`
            : ['BIRTH_CONFIGURATION_LOCKED', 'BIRTH_CUSTOMIZATION_UNSUPPORTED', 'CHARACTER_FIELDS_READ_ONLY',
              'FOCUS_UNSUPPORTED', 'FOCUS_UNAVAILABLE', 'IDEMPOTENCY_CONFLICT'].includes(result.rejectedCode)
              ? `${errorMessage(new ApiError('', 'http', 409, { code: result.rejectedCode }))} Сохранение обновлено.`
              : `${errorMessage(new ApiError('Сохранение обновлено.', 'http', 409, { code: result.rejectedCode }))} Проверьте актуальные данные перед подтверждением.`);
          if (result.session.state.status === 'COMPLETE') onSuccess?.(result.session);
        } else {
          setDecisionReviewRequired(false);
          onSuccess?.(result.session);
        }
      } catch (error) {
        if (unavailableSave(error)) {
          if (readActiveId() === current.id) {
            localStorage.removeItem(activeSessionKey);
          }
        }
        throw error;
      }
    }, canRetryCommand);
  }

  function advance() {
    if (!session || session.state.status === 'COMPLETE' || session.state.pendingDecision) {
      return;
    }
    mutate((current) => sessionsApi.prepareProgress(current));
  }

  function answer(optionId: string) {
    const decision = session?.state.pendingDecision;
    if (session?.state.status !== 'ACTIVE' || !decision?.options.some((option) => option.id === optionId)) {
      return;
    }
    mutate((current) => sessionsApi.prepareAnswer(current.id, decision.id, optionId, current.version));
  }

  function editCharacter(changes: CharacterChanges, onSuccess: (updated: Session) => void) {
    mutate((current) => sessionsApi.prepareEditCharacter(current.id, current.version, changes), onSuccess);
  }

  function changeFocus(focusId: YearFocusId) {
    const focus = session?.simulation?.yearlyFocus;
    if (session?.provider !== 'local' || session.state.status !== 'ACTIVE' || !focus?.canChange
      || !focus.options.some((option) => option.id === focusId && option.available)) return;
    mutate((current) => sessionsApi.prepareFocus(current.id, current.version, focusId));
  }

  function purchase(payload: BuySpendingItemRequest, onSuccess: () => void) {
    if (session?.provider !== 'local' || session.state.status === 'COMPLETE') {
      return;
    }
    mutate((current) => sessionsApi.preparePurchase(current.id, payload), onSuccess);
  }

  function manageBudget(payload: BudgetActionRequest, onResult?: (outcome: BudgetOutcome | null) => void) {
    if (session?.provider !== 'local' || session.state.status !== 'ACTIVE'
      || session.state.pendingDecision || session.state.age < 18) return;
    mutate((current) => sessionsApi.prepareBudgetAction(current.id, payload), (updated) => {
      // DECLINED keeps the version, but catalogs and the recorded outcome still need refreshing.
      setResourceRevision((previous) => previous + 1);
      setNotice(updated.budgetAction?.message ?? 'Данные бюджета обновлены.');
      onResult?.(updated.budgetAction ?? null);
    });
  }

  function reset() {
    if (request.current) {
      return false;
    }
    setSession(null);
    setFailure(null);
    setNotice('');
    setDecisionReviewRequired(false);
    return true;
  }

  function refresh() {
    if (session) {
      run(async (signal) => {
        acceptSession(await sessionsApi.getSession(session.id, signal));
      });
    }
  }

  return { session, busy, failure, notice, resourceRevision, decisionReviewRequired, connect, generate, advance, answer, editCharacter, changeFocus, purchase, manageBudget, reset, refresh };
}

export type ServerLife = ReturnType<typeof useServerLife>;
