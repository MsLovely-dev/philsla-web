export type ServiceErrorKind =
  | 'VALIDATION'
  | 'AUTHORIZATION'
  | 'NETWORK'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNKNOWN';

export interface ServiceSuccess<TData, TMeta = undefined> {
  ok: true;
  data: TData;
  meta?: TMeta;
}

export interface ServiceFailure {
  ok: false;
  error: ServiceError;
}

export interface ServiceError {
  kind: ServiceErrorKind;
  message: string;
  status?: number;
  code?: string;
  fieldErrors?: Record<string, string[]>;
  meta?: Record<string, unknown>;
  retryable?: boolean;
}

export type ServiceResult<TData, TMeta = undefined> =
  | ServiceSuccess<TData, TMeta>
  | ServiceFailure;

/** Standard DRF page-number response shape (count/next/previous/results). */
export interface PaginatedResult<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export function serviceSuccess<TData, TMeta = undefined>(
  data: TData,
  meta?: TMeta,
): ServiceSuccess<TData, TMeta> {
  return meta === undefined ? { ok: true, data } : { ok: true, data, meta };
}

export function validationError(
  message: string,
  fieldErrors: Record<string, string[]> = {},
  code = 'VALIDATION_ERROR',
): ServiceFailure {
  return {
    ok: false,
    error: {
      kind: 'VALIDATION',
      status: 422,
      code,
      message,
      fieldErrors,
      meta: {},
      retryable: false,
    },
  };
}

export function authorizationError(
  message = 'You are not authorized to perform this action.',
  code = 'AUTHORIZATION_ERROR',
): ServiceFailure {
  return {
    ok: false,
    error: {
      kind: 'AUTHORIZATION',
      status: 403,
      code,
      message,
      retryable: false,
    },
  };
}

export function networkError(
  message = 'The request could not be completed. Please try again.',
  code = 'NETWORK_ERROR',
): ServiceFailure {
  return {
    ok: false,
    error: {
      kind: 'NETWORK',
      code,
      message,
      retryable: true,
    },
  };
}

export function notFoundError(
  message = 'The requested record could not be found.',
  code = 'NOT_FOUND',
): ServiceFailure {
  return {
    ok: false,
    error: {
      kind: 'NOT_FOUND',
      status: 404,
      code,
      message,
      retryable: false,
    },
  };
}

export function conflictError(
  message: string,
  code = 'CONFLICT',
): ServiceFailure {
  return {
    ok: false,
    error: {
      kind: 'CONFLICT',
      status: 409,
      code,
      message,
      retryable: false,
    },
  };
}

export function unknownError(
  message = 'An unexpected error occurred.',
  code = 'UNKNOWN_ERROR',
): ServiceFailure {
  return {
    ok: false,
    error: {
      kind: 'UNKNOWN',
      code,
      message,
      retryable: false,
    },
  };
}
