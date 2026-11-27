import type { createApiClient } from './client.ts';
import type { CharacterChanges, CreateSessionRequest, GenerateLocalSessionRequest, Session, YearFocusId } from './sessionTypes.ts';
import type { BuySpendingItemRequest } from './financeTypes.ts';
import type { BudgetActionRequest, BudgetSection } from './budgetTypes.ts';
import {
  decodeEmpty,
  decodeHealth,
  decodeSession,
  decodeSessionList,
  decodeFinances,
  decodeSpendingShop,
  decodeBudgetPage,
  decodeBudgetSalePreview,
  validateBudgetAction,
  validatePurchase,
  validateCreateSession,
  validateGenerateLocalSession,
  validateCharacterChanges,
  validateUuid,
  validateVersion,
  validateFocusId,
} from './sessionDecoders.ts';

export type SessionCommand = {
  readonly idempotencyKey: string;
  execute: (signal?: AbortSignal) => Promise<Session>;
};

export function createSessionsApi(client: ReturnType<typeof createApiClient>) {
  // Параллельные загрузки должны дождаться одной установки cookie гостя.
  let guestRequest: Promise<void> | undefined;

  function ensureGuest() {
    guestRequest ??= client.request('/v1/guest', {
      method: 'POST',
      body: {},
      decode: decodeEmpty,
    }).finally(() => {
      guestRequest = undefined;
    });
    return guestRequest;
  }

  function sessionPath(id: string) {
    validateUuid(id);
    return `/v1/sessions/${id}`;
  }

  function command(path: string, body: unknown, method: 'POST' | 'PATCH' = 'POST'): SessionCommand {
    const idempotencyKey = crypto.randomUUID();
    // Защита тела повтора от изменений объекта вызывающим компонентом.
    const payload = structuredClone(body);

    return {
      idempotencyKey,
      async execute(signal) {
        signal?.throwIfAborted();
        await ensureGuest();
        return client.request(path, {
          method,
          body: payload,
          signal,
          headers: { 'Idempotency-Key': idempotencyKey },
          decode: decodeSession,
        });
      },
    };
  }

  return {
    ensureGuest,
    getHealth(signal?: AbortSignal) {
      return client.request('/v1/health', { signal, decode: decodeHealth });
    },
    async listSessions(signal?: AbortSignal) {
      signal?.throwIfAborted();
      await ensureGuest();
      return client.request('/v1/sessions', { signal, decode: decodeSessionList });
    },
    async getSession(id: string, signal?: AbortSignal) {
      const path = sessionPath(id);
      signal?.throwIfAborted();
      await ensureGuest();
      return client.request(path, { signal, decode: decodeSession });
    },
    prepareCreateSession(request: CreateSessionRequest) {
      validateCreateSession(request);
      return command('/v1/sessions', request);
    },
    async getFinances(id: string, signal?: AbortSignal) {
      const path = `${sessionPath(id)}/finances`;
      signal?.throwIfAborted();
      await ensureGuest();
      return client.request(path, { signal, decode: decodeFinances });
    },
    async getSpending(id: string, categoryId: string, signal?: AbortSignal) {
      const path = `${sessionPath(id)}/spending/${encodeURIComponent(categoryId)}`;
      if (!categoryId || !/^[a-zA-Z0-9_-]{1,40}$/.test(categoryId)) {
        throw new Error('Некорректная категория покупки.');
      }
      signal?.throwIfAborted();
      await ensureGuest();
      return client.request(path, { signal, decode: decodeSpendingShop });
    },
    preparePurchase(id: string, request: BuySpendingItemRequest) {
      validatePurchase(request);
      return command(`${sessionPath(id)}/purchases`, request);
    },
    async getBudgetPage<K extends BudgetSection>(id: string, section: K, signal?: AbortSignal) {
      if (!['income', 'expenses', 'jobs', 'side-jobs', 'businesses', 'strategies', 'assets'].includes(section)) {
        throw new Error('Неизвестный раздел бюджета.');
      }
      const path = `${sessionPath(id)}/budget/${section}`;
      signal?.throwIfAborted();
      await ensureGuest();
      return client.request(path, { signal, decode: (data) => decodeBudgetPage(data, section) });
    },
    async getBudgetSalePreview(id: string, assetId: string, signal?: AbortSignal) {
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(assetId)) throw new Error('Некорректный ID имущества.');
      const path = `${sessionPath(id)}/budget/assets/${encodeURIComponent(assetId)}/sale-preview`;
      signal?.throwIfAborted();
      await ensureGuest();
      return client.request(path, { signal, decode: decodeBudgetSalePreview });
    },
    prepareBudgetAction(id: string, request: BudgetActionRequest) {
      validateBudgetAction(request);
      return command(`${sessionPath(id)}/budget/actions`, request);
    },
    prepareGenerateSession() {
      return command('/v1/sessions/generated', {});
    },
    prepareGenerateLocalSession(request: GenerateLocalSessionRequest = {}) {
      validateGenerateLocalSession(request);
      return command('/v1/sessions/generated/local', request);
    },
    prepareEditCharacter(id: string, expectedVersion: number, changes: CharacterChanges) {
      validateVersion(expectedVersion);
      validateCharacterChanges(changes);
      return command(`${sessionPath(id)}/character`, { expectedVersion, changes }, 'PATCH');
    },
    prepareFocus(id: string, expectedVersion: number, focusId: YearFocusId) {
      validateVersion(expectedVersion);
      validateFocusId(focusId);
      return command(`${sessionPath(id)}/focus`, { expectedVersion, focusId }, 'PATCH');
    },
    prepareAdvance(id: string, expectedVersion: number) {
      validateVersion(expectedVersion);
      return command(`${sessionPath(id)}/advance`, { expectedVersion });
    },
    prepareStep(id: string, expectedVersion: number) {
      validateVersion(expectedVersion);
      return command(`${sessionPath(id)}/step`, { expectedVersion });
    },
    prepareProgress(session: Session) {
      validateVersion(session.version);
      const action = session.simulation ? 'step' : 'advance';
      return command(`${sessionPath(session.id)}/${action}`, { expectedVersion: session.version });
    },
    prepareAnswer(id: string, decisionId: string, optionId: string, expectedVersion: number) {
      validateVersion(expectedVersion);
      if (!decisionId || !optionId || optionId.length > 80) {
        throw new Error('Некорректный идентификатор решения или ответа.');
      }
      return command(`${sessionPath(id)}/decisions/${encodeURIComponent(decisionId)}/answers`, {
        expectedVersion,
        optionId,
      });
    },
  };
}
