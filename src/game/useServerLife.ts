import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, sessionsApi } from '../api';
import { localEngineErrorMessages } from '../api/errors';
import { validateUuid } from '../api/sessionDecoders';
import type { CharacterChanges, Session } from '../api/sessionTypes';
import type { SessionCommand } from '../api/sessions';
import type { BuySpendingItemRequest } from '../api/financeTypes';

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
    SPENDING_INSUFFICIENT_FUNDS: 'Недостаточно средств. Обновите бюджет и выберите другой вариант.',
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

  const connect = useCallback((onResult: (connection: Connection) => void, { latest = false } = {}) => {
    run(async (signal) => {
      if (!await checkConnection(signal)) {
        onResult('offline');
        return;
      }
      try {
        const id = latest ? null : readActiveId();
        if (id) {
          try {
            acceptSession(await sessionsApi.getSession(id, signal));
            onResult('saved');
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
          acceptSession(await sessionsApi.getSession(latestSave.id, signal));
          onResult('saved');
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

  function mutate(prepare: (current: Session) => SessionCommand, onSuccess?: () => void) {
    if (!session || session.state.status === 'COMPLETE' || failure?.retry) {
      return;
    }
    const current = session;
    let command: SessionCommand | undefined;
    run(async (signal) => {
      try {
        command ??= prepare(current);
        acceptSession(await command.execute(signal));
        onSuccess?.();
      } catch (error) {
        if (error instanceof ApiError && (error.code === 'VERSION_CONFLICT' || error.code === 'SESSION_COMPLETE')) {
          // Если GET тоже завершится ошибкой, кнопка повтора должна выполнить только GET.
          command = undefined;
          const refresh: Task = async (refreshSignal) => {
            acceptSession(await sessionsApi.getSession(current.id, refreshSignal));
            setNotice('Сохранение обновлено.');
          };
          try {
            await refresh(signal);
          } catch (refreshError) {
            if (!signal.aborted) {
              setFailure({
                message: errorMessage(refreshError),
                retry: () => run(refresh),
              });
            }
          }
          return;
        }
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

  function editCharacter(changes: CharacterChanges, onSuccess: () => void) {
    mutate((current) => sessionsApi.prepareEditCharacter(current.id, current.version, changes), onSuccess);
  }

  function purchase(payload: BuySpendingItemRequest, onSuccess: () => void) {
    if (session?.provider !== 'local' || session.state.status === 'COMPLETE') {
      return;
    }
    mutate((current) => sessionsApi.preparePurchase(current.id, payload), onSuccess);
  }

  function reset() {
    if (request.current) {
      return false;
    }
    setSession(null);
    setFailure(null);
    setNotice('');
    return true;
  }

  function refresh() {
    if (session) {
      run(async (signal) => {
        acceptSession(await sessionsApi.getSession(session.id, signal));
      });
    }
  }

  return { session, busy, failure, notice, connect, generate, advance, answer, editCharacter, purchase, reset, refresh };
}

export type ServerLife = ReturnType<typeof useServerLife>;
