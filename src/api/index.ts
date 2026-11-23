import { createApiClient } from './client';
import { createSessionsApi } from './sessions';

// Создание клиентов не отправляет запросы и не переключает моковую игру.
export const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  timeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS || 10_000),
  debug: import.meta.env.DEV,
});

export const sessionsApi = createSessionsApi(apiClient);

export { ApiError } from './errors';
