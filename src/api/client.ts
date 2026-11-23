import { ApiError } from './errors.ts';

type ClientOptions = {
  baseUrl: string;
  timeoutMs?: number;
  credentials?: RequestCredentials;
  fetcher?: typeof fetch;
  debug?: boolean;
};

type RequestOptions<T> = {
  // Проверка ответа обязательна: generic сам по себе не проверяет JSON.
  decode: (data: unknown) => T;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  headers?: HeadersInit;
};

function httpMessage(status: number) {
  switch (status) {
    case 401:
      return 'Гостевой доступ истёк или недоступен. Требуется восстановить доступ.';
    case 403:
      return 'Нет доступа к этому действию.';
    case 409:
      return 'Состояние игры изменилось. Обновите данные.';
    case 429:
      return 'Слишком много запросов. Попробуйте позже.';
    default:
      return status >= 500
        ? 'Сервер временно недоступен. Попробуйте позже.'
        : 'Не удалось выполнить действие.';
  }
}

export function createApiClient({
  baseUrl,
  timeoutMs = 10_000,
  credentials = 'same-origin',
  fetcher = globalThis.fetch,
  debug = false,
}: ClientOptions) {
  if (!baseUrl.trim() || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Некорректные настройки API.');
  }

  const base = baseUrl.replace(/\/+$/, '');

  async function request<T>(path: string, options: RequestOptions<T>): Promise<T> {
    // Пути методов должны оставаться внутри настроенного API.
    const pathname = path.split('?')[0];
    if (!path.startsWith('/') || path.startsWith('//') || /[\\#]/.test(path)
      || pathname.split('/').some((part) => part === '.' || part === '..')
      || /%2e|%2f|%5c/i.test(pathname)) {
      throw new Error('Ожидается относительный путь метода API, например /game-sessions.');
    }

    const { decode, method = 'GET', body, signal } = options;
    if (method === 'GET' && body !== undefined) {
      throw new Error('GET-запрос не может содержать тело.');
    }

    signal?.throwIfAborted();
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', abort, { once: true });
    let timedOut = false;
    let receivedResponse = false;
    const startedAt = performance.now();
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const headers = new Headers(options.headers);
      headers.set('Accept', 'application/json');
      if (body !== undefined) {
        headers.set('Content-Type', 'application/json');
      }

      const response = await fetcher(`${base}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
        credentials,
        cache: 'no-store',
        redirect: 'error',
      });
      const raw = await response.text();
      let data: unknown;
      let invalidJson = false;

      try {
        data = raw.trim() ? JSON.parse(raw) : undefined;
      } catch {
        invalidJson = true;
      }

      receivedResponse = true;
      if (debug) {
        const duration = Math.round(performance.now() - startedAt);
        console.groupCollapsed(`[API] ${method} ${base}${path} → ${response.status} (${duration} мс)`);
        console.log('Ответ:', invalidJson ? raw : raw.trim() ? data : '(пустой ответ)');
        console.groupEnd();
      }

      // HTML-ошибки прокси не должны скрывать HTTP-статус.
      if (invalidJson && response.ok) {
        throw new ApiError('Сервер вернул некорректный ответ.', 'invalid-response', response.status);
      }

      if (!response.ok) {
        throw new ApiError(httpMessage(response.status), 'http', response.status, data);
      }

      try {
        return decode(data);
      } catch {
        throw new ApiError('Ответ сервера не соответствует ожидаемому формату.', 'invalid-response', response.status);
      }
    } catch (error) {
      if (debug && !receivedResponse) {
        console.warn(`[API] ${method} ${base}${path} — ${signal?.aborted
          ? 'запрос отменён'
          : timedOut ? 'время ожидания истекло' : 'ответ не получен'}`);
      }
      if (signal?.aborted) {
        throw signal.reason ?? new DOMException('Запрос отменён.', 'AbortError');
      }
      if (timedOut) {
        throw new ApiError('Сервер не ответил вовремя. Попробуйте позже.', 'timeout');
      }
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Не удалось связаться с сервером.', 'network');
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  }

  return { request };
}
