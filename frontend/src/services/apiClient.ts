import { authorizationError, conflictError, networkError, notFoundError, serviceSuccess, unknownError, validationError } from './serviceResult';
import type { ServiceFailure, ServiceResult } from './serviceResult';

interface ApiErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string[] | string>;
    correlationId?: string;
  };
}

export interface ApiClientOptions {
  baseUrl: string;
  fetcher?: typeof fetch;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private bearerToken: string | null = null;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetcher = options.fetcher ?? fetch;
  }

  setBearerToken(token: string | null): void {
    this.bearerToken = token;
  }

  async request<TData>(path: string, init: RequestInit = {}): Promise<ServiceResult<TData>> {
    try {
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        ...init,
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...(this.bearerToken ? { Authorization: `Bearer ${this.bearerToken}` } : {}),
          ...init.headers,
        },
      });

      if (response.status === 204) {
        return serviceSuccess(null as TData);
      }

      const payload = await this.readJson<TData | ApiErrorEnvelope>(response);

      if (response.ok) {
        return serviceSuccess(payload as TData);
      }

      return this.mapError(response, payload as ApiErrorEnvelope);
    } catch {
      return networkError('The backend API could not be reached. Check that the Django server is running.');
    }
  }

  private async readJson<TData>(response: Response): Promise<TData | null> {
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text) as TData;
  }

  private mapError(response: Response, payload: ApiErrorEnvelope): ServiceFailure {
    const code = payload.error?.code ?? 'API_ERROR';
    const message = payload.error?.message ?? 'The request could not be processed.';
    const fields = this.normalizeFieldErrors(payload.error?.fields);

    if (response.status === 400) return validationError(message, fields, code);
    if (response.status === 401 || response.status === 403) return authorizationError(message, code);
    if (response.status === 404) return notFoundError(message, code);
    if (response.status === 409) return conflictError(message, code);
    if (response.status === 429) return networkError(message, code);
    return unknownError(message, code);
  }

  private normalizeFieldErrors(fields: ApiErrorEnvelope['error'] extends infer T ? T extends { fields?: infer F } ? F : never : never): Record<string, string[]> {
    if (!fields) return {};

    return Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, Array.isArray(value) ? value.map(String) : [String(value)]]),
    );
  }
}

export function createApiClient(fetcher?: typeof fetch): ApiClient {
  return new ApiClient({
    baseUrl: import.meta.env.VITE_BACKEND_API_BASE_URL ?? 'http://localhost:8000',
    fetcher,
  });
}
