export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'invalid-response';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly details?: unknown;

  get code(): string | undefined {
    if (typeof this.details !== 'object' || this.details === null) {
      return undefined;
    }
    const code = (this.details as Record<string, unknown>).code;
    return typeof code === 'string' ? code : undefined;
  }

  constructor(
    message: string,
    kind: ApiErrorKind,
    status?: number,
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.details = details;
  }
}
