export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'invalid-response';

export const localEngineErrorMessages: Readonly<Record<string, string>> = {
  STEP_REQUIRED: 'Для этой жизни нужны двухмесячные шаги. Обновите сохранение и повторите действие.',
  STEP_UNSUPPORTED: 'Это сохранение использует прежний движок. Обновите сохранение и повторите действие.',
  STATISTICS_NOT_READY: 'Статистика рождения ещё не подготовлена на сервере. Попробуйте позже.',
  CONTENT_UNAVAILABLE: 'События локального движка временно недоступны. Попробуйте позже.',
  ENGINE_VERSION_UNAVAILABLE: 'Версия движка этого сохранения сейчас недоступна на сервере.',
  DECISION_REQUIRED: 'Сначала ответьте на ожидающее решение.',
  BIRTH_CONFIGURATION_LOCKED: 'Жизнь уже началась. Место рождения, пол и семью больше нельзя менять.',
  BIRTH_CUSTOMIZATION_UNSUPPORTED: 'В этом старом сохранении можно изменить только имя и характеристики.',
  INVALID_COUNTRY: 'Выберите одну из поддерживаемых стран.',
  INVALID_FAMILY: 'Не удалось сохранить состав семьи. Проверьте родственников и их возраст.',
  INVALID_REQUEST: 'Проверьте введённые параметры: сервер отклонил изменение.',
  IDEMPOTENCY_CONFLICT: 'Эта команда уже использована с другими данными. Отправьте изменения заново.',
};

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
