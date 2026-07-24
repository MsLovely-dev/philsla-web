import { sharedApiClient, type ApiClient } from './apiClient';
import type { ServiceResult } from './serviceResult';

export interface AdminUserAccount {
  id: string;
  fullName: string;
  email: string;
  role: string;
  moduleAccess: string[];
  isActive: boolean;
}

export interface AdminUserAccountInput {
  fullName: string;
  email: string;
  role: string;
  moduleAccess: string[];
  isActive?: boolean;
}

interface AdminUserListResponse {
  users: AdminUserAccount[];
}

export class BackendAdminUserService {
  constructor(private readonly apiClient: ApiClient = sharedApiClient) {}

  async listUsers(query: { search?: string; role?: string } = {}): Promise<ServiceResult<AdminUserAccount[]>> {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.role) params.set('role', query.role);

    const suffix = params.toString() ? `?${params.toString()}` : '';
    const result = await this.apiClient.request<AdminUserListResponse>(`/api/v1/auth/admin/users/${suffix}`);
    if (result.ok === false) return result;
    return { ok: true, data: result.data.users };
  }

  async createUser(input: AdminUserAccountInput): Promise<ServiceResult<AdminUserAccount>> {
    return this.apiClient.request<AdminUserAccount>('/api/v1/auth/admin/users/', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateUser(id: string, input: AdminUserAccountInput): Promise<ServiceResult<AdminUserAccount>> {
    return this.apiClient.request<AdminUserAccount>(`/api/v1/auth/admin/users/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  async deleteUser(id: string): Promise<ServiceResult<null>> {
    return this.apiClient.request<null>(`/api/v1/auth/admin/users/${id}/`, { method: 'DELETE' });
  }
}

export const backendAdminUserService = new BackendAdminUserService();
