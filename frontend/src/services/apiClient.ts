import { authorizationError, conflictError, networkError, notFoundError, serviceSuccess, unknownError, validationError } from './serviceResult';
import type { ServiceFailure, ServiceResult } from './serviceResult';

interface ApiErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string[] | string>;
    meta?: Record<string, unknown>;
    correlationId?: string;
  };
}

interface BackendTokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  expiresAt: string;
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
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  }

  setBearerToken(token: string | null): void {
    this.bearerToken = token;
  }

  hasBearerToken(): boolean {
    return Boolean(this.bearerToken);
  }

  async request<TData>(path: string, init: RequestInit = {}): Promise<ServiceResult<TData>> {
    const urls = Array.from(
      new Set(
        [
          this.baseUrl ? `${this.baseUrl}${path}` : path,
          path,
          `http://127.0.0.1:8000${path}`,
          `http://localhost:8000${path}`,
        ].filter(Boolean),
      ),
    );

    const failures: string[] = [];

    for (const url of urls) {
      try {
        return await this.send<TData>(url, path, init);
      } catch (error) {
        failures.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
        // Try the next local route before reporting a network failure.
      }
    }

    if (import.meta.env.DEV) {
      console.error('Backend API request failed for all local routes.', failures);
    }

    return networkError(
      `The backend API could not be reached through /api, http://127.0.0.1:8000, or http://localhost:8000. Open the app from the local Vite URL and confirm Django is running.`,
    );
  }

  async requestBlob(path: string, init: RequestInit = {}): Promise<ServiceResult<Blob>> {
    const urls = Array.from(
      new Set(
        [
          this.baseUrl ? `${this.baseUrl}${path}` : path,
          path,
          `http://127.0.0.1:8000${path}`,
          `http://localhost:8000${path}`,
        ].filter(Boolean),
      ),
    );

    const failures: string[] = [];

    for (const url of urls) {
      try {
        return await this.sendBlob(url, path, init);
      } catch (error) {
        failures.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (import.meta.env.DEV) {
      console.error('Backend API blob request failed for all local routes.', failures);
    }

    return networkError(
      `The backend API could not be reached through /api, http://127.0.0.1:8000, or http://localhost:8000. Open the app from the local Vite URL and confirm Django is running.`,
    );
  }

  private async send<TData>(url: string, path: string, init: RequestInit): Promise<ServiceResult<TData>> {
    let response = await this.fetchOnce(url, init);

    if (response.status === 401 && this.shouldAttemptRefresh(path) && await this.refreshBearerToken()) {
      response = await this.fetchOnce(url, init);
    }

    return this.responseToResult<TData>(response);
  }

  private async fetchOnce(url: string, init: RequestInit, includeBearerToken = true): Promise<Response> {
    const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
    return this.fetcher(url, {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(init.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(includeBearerToken && this.bearerToken ? { Authorization: `Bearer ${this.bearerToken}` } : {}),
        ...init.headers,
      },
    });
  }

  private async responseToResult<TData>(response: Response): Promise<ServiceResult<TData>> {
    if (response.status === 204) {
      return serviceSuccess(null as TData);
    }

    const payload = await this.readJson<TData | ApiErrorEnvelope>(response);

    if (response.ok) {
      return serviceSuccess(payload as TData);
    }

    return this.mapError(response, payload as ApiErrorEnvelope);
  }

  private async sendBlob(url: string, path: string, init: RequestInit): Promise<ServiceResult<Blob>> {
    let response = await this.fetchBlobOnce(url, init);

    if (response.status === 401 && this.shouldAttemptRefresh(path) && await this.refreshBearerToken()) {
      response = await this.fetchBlobOnce(url, init);
    }

    if (response.ok) {
      return serviceSuccess(await response.blob());
    }

    const payload = await this.readJson<ApiErrorEnvelope>(response).catch(() => ({} as ApiErrorEnvelope));
    return this.mapError(response, payload as ApiErrorEnvelope);
  }

  private async fetchBlobOnce(url: string, init: RequestInit): Promise<Response> {
    return this.fetcher(url, {
      ...init,
      credentials: 'include',
      headers: {
        ...(this.bearerToken ? { Authorization: `Bearer ${this.bearerToken}` } : {}),
        ...init.headers,
      },
    });
  }

  private shouldAttemptRefresh(path: string): boolean {
    return Boolean(this.bearerToken) && !path.startsWith('/api/v1/auth/');
  }

  private async refreshBearerToken(): Promise<boolean> {
    const refreshPath = '/api/v1/auth/token/refresh/';
    const urls = Array.from(
      new Set(
        [
          this.baseUrl ? `${this.baseUrl}${refreshPath}` : refreshPath,
          refreshPath,
          `http://127.0.0.1:8000${refreshPath}`,
          `http://localhost:8000${refreshPath}`,
        ].filter(Boolean),
      ),
    );

    for (const url of urls) {
      try {
        const response = await this.fetchOnce(url, { method: 'POST' }, false);
        if (!response.ok) {
          this.setBearerToken(null);
          return false;
        }

        const payload = await this.readJson<BackendTokenResponse>(response);
        if (payload?.tokenType === 'Bearer' && payload.accessToken) {
          this.setBearerToken(payload.accessToken);
          return true;
        }
      } catch {
        // Try the next configured backend route.
      }
    }

    this.setBearerToken(null);
    return false;
  }

  private async readJson<TData>(response: Response): Promise<TData | null> {
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text) as TData;
  }

  private mapError(response: Response, payload: ApiErrorEnvelope): ServiceFailure {
    const code = payload.error?.code ?? 'API_ERROR';
    const fields = this.normalizeFieldErrors(payload.error?.fields);
    const message = this.normalizeErrorMessage(payload.error?.message, fields);
    const meta = payload.error?.meta ?? {};

    const failure =
      response.status === 400 ? validationError(message, fields, code) :
      response.status === 401 || response.status === 403 ? authorizationError(message, code) :
      response.status === 404 ? notFoundError(message, code) :
      response.status === 409 ? conflictError(message, code) :
      response.status === 429 ? networkError(message, code) :
      unknownError(message, code);
    failure.error.meta = meta;
    return failure;
  }

  private normalizeFieldErrors(fields: ApiErrorEnvelope['error'] extends infer T ? T extends { fields?: infer F } ? F : never : never): Record<string, string[]> {
    if (!fields) return {};

    return Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, Array.isArray(value) ? value.map(String) : [String(value)]]),
    );
  }

  private normalizeErrorMessage(message: string | undefined, fields: Record<string, string[]>): string {
    const fallback = 'The request could not be processed.';
    const genericValidationMessages = new Set([
      'Invalid input.',
      'Invalid input',
      'The request could not be processed.',
    ]);
    if (message && !genericValidationMessages.has(message)) {
      return message;
    }

    const firstFieldError = Object.values(fields).flat().find(Boolean);
    return firstFieldError ?? message ?? fallback;
  }
}

export function createApiClient(fetcher?: typeof fetch): ApiClient {
  return new ApiClient({
    baseUrl: import.meta.env.VITE_BACKEND_API_BASE_URL ?? 'http://localhost:8000',
    fetcher,
  });
}

export const sharedApiClient = createApiClient();
