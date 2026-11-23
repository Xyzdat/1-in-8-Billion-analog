import type { createApiClient } from './client.ts';
import type { CharacterChanges, CreateSessionRequest, Session } from './sessionTypes.ts';
import type { BuySpendingItemRequest } from './financeTypes.ts';
import {
  decodeEmpty,
  decodeHealth,
  decodeSession,
  decodeSessionList,
  decodeFinances,
  decodeSpendingShop,
  validatePurchase,
  validateCreateSession,
  validateCharacterChanges,
  validateUuid,
  validateVersion,
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
    prepareGenerateSession() {
      return command('/v1/sessions/generated', {});
    },
    prepareEditCharacter(id: string, expectedVersion: number, changes: CharacterChanges) {
      validateVersion(expectedVersion);
      validateCharacterChanges(changes);
      return command(`${sessionPath(id)}/character`, { expectedVersion, changes }, 'PATCH');
    },
    prepareAdvance(id: string, expectedVersion: number) {
      validateVersion(expectedVersion);
      return command(`${sessionPath(id)}/advance`, { expectedVersion });
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
