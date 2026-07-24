import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Check, Edit2, Eye, Filter, Plus, Search, Settings2, Shield, Trash2, UserPlus, Users, X } from 'lucide-react';
import { INITIAL_MAINTENANCE_MODULES, usePhilSA, type MaintenanceModule } from '../PhilSAContext';
import { cn } from '../lib/utils';
import {
  backendAdminUserService,
  type AdminUserAccount,
  type AdminUserAccountInput,
} from '../services/backendAdminUserService';

const permissionActions = [
  { key: 'READ', initial: 'R', label: 'Read' },
  { key: 'WRITE', initial: 'W', label: 'Write' },
  { key: 'EDIT', initial: 'E', label: 'Edit' },
  { key: 'DELETE', initial: 'D', label: 'Delete' },
  { key: 'APPROVE', initial: 'A', label: 'Approve' },
  { key: 'REJECT', initial: 'RJ', label: 'Reject' },
] as const;

type PermissionActionKey = typeof permissionActions[number]['key'];

interface RolePermissionRule {
  moduleIds: string[];
  modules?: string[];
  actions: PermissionActionKey[];
}

type SettingsSection = 'users' | 'roles';

interface RoleDefinition {
  id: string;
  name: string;
  moduleAccess: string[];
  isCustom: boolean;
}

interface RoleForm {
  name: string;
  moduleAccess: string[];
}

const readOnly: PermissionActionKey[] = ['READ'];
const operate: PermissionActionKey[] = ['READ', 'WRITE', 'EDIT'];
const decide: PermissionActionKey[] = ['READ', 'EDIT', 'APPROVE', 'REJECT'];
const manage: PermissionActionKey[] = ['READ', 'WRITE', 'EDIT', 'DELETE', 'APPROVE'];
const fullAccess: PermissionActionKey[] = ['READ', 'WRITE', 'EDIT', 'DELETE', 'APPROVE', 'REJECT'];

const defaultRolePermissionRules: Record<string, RolePermissionRule[]> = {
  ADMISSIONS_REVIEWER: [
    { moduleIds: ['1', '12', '48'], actions: readOnly },
    { moduleIds: ['9', '37'], actions: decide },
    { moduleIds: ['36', '38', '39'], actions: operate },
  ],
  PROCTOR: [
    { moduleIds: ['26'], actions: readOnly },
    { moduleIds: ['25', '27', '28', '29', '40', '41', '42'], actions: operate },
  ],
  PROCTOR_ADMIN: [
    { moduleIds: ['26'], actions: readOnly },
    { moduleIds: ['25', '27', '28', '29', '40', '41', '42'], actions: operate },
    { moduleIds: ['30'], actions: manage },
  ],
  UNIVERSITY_ADMIN: [
    { moduleIds: ['1', '10', '15'], actions: readOnly },
    { moduleIds: ['11', '12', '13', '14', '36', '38', '39', '43', '44', '45'], actions: operate },
    { moduleIds: ['20'], actions: decide },
  ],
  TESTING_CENTER_ADMIN: [
    { moduleIds: ['35', '11', '30'], actions: operate },
  ],
  EXAM_ADMINISTRATOR: [
    { moduleIds: ['16', '22', '15', '7', '6'], actions: readOnly },
    { moduleIds: ['17', '18', '19', '21', '43'], actions: manage },
    { moduleIds: ['20', '46'], actions: decide },
  ],
  SYSTEM_ADMIN: [
    { moduleIds: ['*'], actions: fullAccess },
  ],
  CHED_ADMIN: [
    { moduleIds: ['5', '6', '7', '15'], actions: readOnly },
  ],
  DEPED_ADMIN: [
    { moduleIds: ['5', '6', '7', '15'], actions: readOnly },
  ],
  TESDA_ADMIN: [
    { moduleIds: ['5', '6', '7', '15'], actions: readOnly },
  ],
  EXECUTIVE: [
    { moduleIds: ['5', '6', '7', '15'], actions: readOnly },
  ],
};

const roleAliases: Record<string, string> = {
  ADMISSION_REVIEWER: 'ADMISSIONS_REVIEWER',
};

const roles = [
  'ADMISSIONS_REVIEWER',
  'PROCTOR',
  'PROCTOR_ADMIN',
  'UNIVERSITY_ADMIN',
  'TESTING_CENTER_ADMIN',
  'EXAM_ADMINISTRATOR',
  'SYSTEM_ADMIN',
  'CHED_ADMIN',
  'DEPED_ADMIN',
  'TESDA_ADMIN',
  'EXECUTIVE',
];

const emptyForm: AdminUserAccountInput = {
  fullName: '',
  email: '',
  role: 'ADMISSIONS_REVIEWER',
  moduleAccess: [],
  isActive: true,
};

const emptyRoleForm: RoleForm = {
  name: '',
  moduleAccess: [],
};

function formatLabel(value: string) {
  return value.replace(/_/g, ' ');
}

function moduleKey(moduleName: string) {
  return moduleName.replace(/&/g, '').replace(/\s+/g, '_').toUpperCase();
}

function modulePermissionKey(module: MaintenanceModule, permission: string) {
  return `MOD_${module.id}_${permission}`;
}

function normalizeRoleKey(role: string) {
  const normalized = role.trim().replace(/\s+/g, '_').toUpperCase();
  return roleAliases[normalized] ?? normalized;
}

function getDefaultModuleAccessForRole(role: string, modules: MaintenanceModule[]) {
  const rules = defaultRolePermissionRules[normalizeRoleKey(role)] ?? [];
  const access = new Set<string>();

  rules.forEach((rule) => {
    const matchedModules = rule.moduleIds.includes('*')
      ? modules
      : modules.filter((module) => rule.moduleIds.includes(module.id) || rule.modules?.includes(module.name));

    matchedModules.forEach((module) => {
      rule.actions.forEach((permission) => {
        access.add(modulePermissionKey(module, permission));
      });
    });
  });

  return modules.flatMap((module) =>
    permissionActions
      .map((permission) => modulePermissionKey(module, permission.key))
      .filter((permissionKey) => access.has(permissionKey))
  );
}

function isPermissionSelected(access: Set<string>, module: MaintenanceModule, permission: string) {
  return access.has(modulePermissionKey(module, permission)) || (permission === 'READ' && access.has(moduleKey(module.name)));
}

function getInitials(name: string) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('');
  return initials.slice(0, 3).toUpperCase() || 'UA';
}

interface PermissionMatrixProps {
  modules: MaintenanceModule[];
  selectedAccess: Set<string>;
  onToggle: (module: MaintenanceModule, permission: PermissionActionKey) => void;
  readOnly?: boolean;
}

function PermissionMatrix({ modules, selectedAccess, onToggle, readOnly = false }: PermissionMatrixProps) {
  return (
    <div className="bg-philsa-bg rounded-2xl border border-philsa-border overflow-hidden">
      <div className="max-h-[46vh] overflow-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 z-10 bg-white text-[10px] text-philsa-gray font-semibold uppercase tracking-widest shadow-sm">
            <tr>
              <th className="min-w-64 px-4 py-3">Module</th>
              {permissionActions.map((permission) => (
                <th key={permission.key} className="w-12 px-2 py-3 text-center" title={permission.label}>
                  {permission.initial}
                  <span className="sr-only"> {permission.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-philsa-border/70">
            {modules.flatMap((module, index) => {
              const rows = [];

              if (modules[index - 1]?.category !== module.category) {
                rows.push(
                  <tr key={`${module.category}-section`} className="bg-white">
                    <td
                      colSpan={permissionActions.length + 1}
                      className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-philsa-gray"
                    >
                      {module.category}
                    </td>
                  </tr>
                );
              }

              rows.push(
                <tr key={`${module.id}-${module.path}`} className="bg-philsa-bg/60">
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-philsa-navy">{module.name}</p>
                  </td>
                  {permissionActions.map((permission) => (
                    <td key={permission.key} className="px-2 py-3 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-philsa-border text-philsa-red focus:ring-philsa-red"
                        aria-label={`${permission.label} ${module.name}`}
                        checked={isPermissionSelected(selectedAccess, module, permission.key)}
                        disabled={readOnly}
                        onChange={() => onToggle(module, permission.key)}
                      />
                    </td>
                  ))}
                </tr>
              );

              return rows;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const { addAuditLog, maintenanceModules } = usePhilSA();
  const [activeSection, setActiveSection] = useState<SettingsSection>('users');
  const [users, setUsers] = useState<AdminUserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserAccount | null>(null);
  const [form, setForm] = useState<AdminUserAccountInput>(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [customRoles, setCustomRoles] = useState<RoleDefinition[]>([]);
  const [roleAccessOverrides, setRoleAccessOverrides] = useState<Record<string, string[]>>({});
  const [deletedRoleIds, setDeletedRoleIds] = useState<string[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [viewingRoleId, setViewingRoleId] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState<RoleForm>(emptyRoleForm);
  const [roleFormError, setRoleFormError] = useState('');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError('');

    backendAdminUserService.listUsers({ search, role: roleFilter }).then((result) => {
      if (!isMounted) return;
      if (result.ok === true) {
        setUsers(result.data);
      } else {
        setError(result.error.message);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [search, roleFilter]);

  const modalTitle = isAdding ? 'Add New Account' : 'Edit User Account';
  const hasUsers = users.length > 0;
  const systemModules = useMemo(() => {
    const source = maintenanceModules.length ? maintenanceModules : INITIAL_MAINTENANCE_MODULES;
    return INITIAL_MAINTENANCE_MODULES.map((module) => {
      const savedModule = source.find((item) => item.id === module.id);
      return savedModule ? { ...module, status: savedModule.status } : module;
    });
  }, [maintenanceModules]);

  const selectedModuleAccess = useMemo(() => new Set(form.moduleAccess), [form.moduleAccess]);
  const allRoles = useMemo(
    () => Array.from(new Set([
      ...roles.filter((role) => !deletedRoleIds.includes(role)),
      ...customRoles.filter((role) => !deletedRoleIds.includes(role.id)).map((role) => role.name),
    ])),
    [customRoles, deletedRoleIds]
  );
  const roleDefinitions = useMemo<RoleDefinition[]>(
    () => [
      ...roles.filter((role) => !deletedRoleIds.includes(role)).map((role) => ({
        id: role,
        name: role,
        moduleAccess: roleAccessOverrides[role] ?? getDefaultModuleAccessForRole(role, systemModules),
        isCustom: false,
      })),
      ...customRoles.filter((role) => !deletedRoleIds.includes(role.id)).map((role) => ({
        ...role,
        moduleAccess: roleAccessOverrides[role.id] ?? role.moduleAccess,
      })),
    ],
    [customRoles, deletedRoleIds, roleAccessOverrides, systemModules]
  );
  const viewingRoleDefinition = useMemo(
    () => roleDefinitions.find((role) => role.id === viewingRoleId) ?? null,
    [roleDefinitions, viewingRoleId]
  );
  const viewingRoleModuleAccess = useMemo(
    () => new Set(viewingRoleDefinition?.moduleAccess ?? []),
    [viewingRoleDefinition]
  );
  const selectedRoleModuleAccess = useMemo(() => new Set(roleForm.moduleAccess), [roleForm.moduleAccess]);

  function getRoleDefinition(role: string) {
    const normalizedRole = normalizeRoleKey(role);
    return roleDefinitions.find((definition) => normalizeRoleKey(definition.name) === normalizedRole);
  }

  function getModuleAccessForRole(role: string) {
    return getRoleDefinition(role)?.moduleAccess ?? getDefaultModuleAccessForRole(role, systemModules);
  }

  function openAddModal() {
    const defaultRole = allRoles.includes(emptyForm.role) ? emptyForm.role : allRoles[0] ?? emptyForm.role;
    setForm({
      ...emptyForm,
      role: defaultRole,
      moduleAccess: getModuleAccessForRole(defaultRole),
    });
    setFormError('');
    setSelectedUser(null);
    setIsAdding(true);
  }

  function openEditModal(user: AdminUserAccount) {
    setForm({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      moduleAccess: Array.from(new Set([...getModuleAccessForRole(user.role), ...user.moduleAccess])),
      isActive: user.isActive,
    });
    setFormError('');
    setSelectedUser(user);
    setIsAdding(false);
  }

  function closeModal() {
    setIsAdding(false);
    setSelectedUser(null);
    setForm(emptyForm);
    setFormError('');
  }

  function openAddRoleModal() {
    setRoleForm(emptyRoleForm);
    setRoleFormError('');
    setEditingRole(null);
    setIsAddingRole(true);
  }

  function openEditRoleModal(role: RoleDefinition) {
    setViewingRoleId(null);
    setRoleForm({
      name: role.name,
      moduleAccess: role.moduleAccess,
    });
    setRoleFormError('');
    setEditingRole(role);
    setIsAddingRole(true);
  }

  function openViewRolePermissions(role: RoleDefinition) {
    setSelectedRoleId(role.id);
    setViewingRoleId(role.id);
  }

  function closeRoleModal() {
    setIsAddingRole(false);
    setEditingRole(null);
    setRoleForm(emptyRoleForm);
    setRoleFormError('');
  }

  function togglePermission(module: MaintenanceModule, permission: PermissionActionKey) {
    const key = modulePermissionKey(module, permission);
    const legacyModuleKey = moduleKey(module.name);

    setForm((current) => ({
      ...current,
      moduleAccess: current.moduleAccess.includes(key) || (permission === 'READ' && current.moduleAccess.includes(legacyModuleKey))
        ? current.moduleAccess.filter((access) => access !== key && access !== legacyModuleKey)
        : [...current.moduleAccess, key],
    }));
  }

  function toggleRolePermission(module: MaintenanceModule, permission: PermissionActionKey) {
    const key = modulePermissionKey(module, permission);
    const legacyModuleKey = moduleKey(module.name);

    setRoleForm((current) => ({
      ...current,
      moduleAccess: current.moduleAccess.includes(key) || (permission === 'READ' && current.moduleAccess.includes(legacyModuleKey))
        ? current.moduleAccess.filter((access) => access !== key && access !== legacyModuleKey)
        : [...current.moduleAccess, key],
    }));
  }

  function handleRoleChange(role: string) {
    setForm((current) => ({
      ...current,
      role,
      moduleAccess: getModuleAccessForRole(role),
    }));
  }

  function handleRoleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedRoleName = editingRole?.isCustom === false ? editingRole.name : normalizeRoleKey(roleForm.name);

    if (!normalizedRoleName) {
      setRoleFormError('Enter a role name.');
      return;
    }

    if (allRoles.some((role) => normalizeRoleKey(role) === normalizedRoleName && normalizeRoleKey(role) !== editingRole?.id)) {
      setRoleFormError('A role with this name already exists.');
      return;
    }

    if (editingRole) {
      const previousRoleName = editingRole.name;
      if (editingRole.isCustom) {
        setCustomRoles((current) => current.map((role) => (
          role.id === editingRole.id
            ? { ...role, id: normalizedRoleName, name: normalizedRoleName, moduleAccess: roleForm.moduleAccess }
            : role
        )));
        setRoleAccessOverrides((current) => {
          const next = { ...current };
          delete next[editingRole.id];
          return { ...next, [normalizedRoleName]: roleForm.moduleAccess };
        });
      } else {
        setRoleAccessOverrides((current) => ({
          ...current,
          [editingRole.id]: roleForm.moduleAccess,
        }));
      }
      setUsers((current) => current.map((user) => (
        normalizeRoleKey(user.role) === normalizeRoleKey(previousRoleName)
          ? { ...user, role: normalizedRoleName, moduleAccess: roleForm.moduleAccess }
          : user
      )));
      setForm((current) => (
        normalizeRoleKey(current.role) === normalizeRoleKey(previousRoleName)
          ? { ...current, role: normalizedRoleName, moduleAccess: roleForm.moduleAccess }
          : current
      ));
      if (normalizeRoleKey(roleFilter) === normalizeRoleKey(previousRoleName)) {
        setRoleFilter(normalizedRoleName);
      }
      setSelectedRoleId(normalizedRoleName);
      setViewingRoleId(normalizedRoleName);
      addAuditLog('ROLE_PROVISIONING', `Updated role ${normalizedRoleName}`);
      closeRoleModal();
      return;
    }

    setCustomRoles((current) => [
      ...current,
      {
        id: normalizedRoleName,
        name: normalizedRoleName,
        moduleAccess: roleForm.moduleAccess,
        isCustom: true,
      },
    ]);
    setSelectedRoleId(normalizedRoleName);
    addAuditLog('ROLE_PROVISIONING', `Created role ${normalizedRoleName}`);
    closeRoleModal();
  }

  function handleRoleDelete(role: RoleDefinition) {
    const assignedUsers = users.filter((user) => normalizeRoleKey(user.role) === normalizeRoleKey(role.name));
    if (assignedUsers.length > 0) {
      window.alert(`Cannot delete ${formatLabel(role.name)} while ${assignedUsers.length} user account${assignedUsers.length === 1 ? ' is' : 's are'} assigned to it.`);
      return;
    }

    const confirmed = window.confirm(`Delete ${formatLabel(role.name)} role?`);
    if (!confirmed) return;

    if (role.isCustom) {
      setCustomRoles((current) => current.filter((item) => item.id !== role.id));
    } else {
      setDeletedRoleIds((current) => Array.from(new Set([...current, role.id])));
    }

    setRoleAccessOverrides((current) => {
      const next = { ...current };
      delete next[role.id];
      return next;
    });

    if (selectedRoleId === role.id) setSelectedRoleId(null);
    if (viewingRoleId === role.id) setViewingRoleId(null);
    if (editingRole?.id === role.id) closeRoleModal();
    if (normalizeRoleKey(roleFilter) === normalizeRoleKey(role.name)) setRoleFilter('');
    if (normalizeRoleKey(form.role) === normalizeRoleKey(role.name)) {
      const nextRole = allRoles.find((item) => normalizeRoleKey(item) !== normalizeRoleKey(role.name)) ?? emptyForm.role;
      setForm((current) => ({
        ...current,
        role: nextRole,
        moduleAccess: getModuleAccessForRole(nextRole),
      }));
    }
    addAuditLog('ROLE_PROVISIONING', `Deleted role ${role.name}`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormError('');

    const result = selectedUser
      ? await backendAdminUserService.updateUser(selectedUser.id, form)
      : await backendAdminUserService.createUser(form);

    if (result.ok === true) {
      setUsers((current) => {
        if (!selectedUser) return [...current, result.data];
        return current.map((user) => (user.id === result.data.id ? result.data : user));
      });
      addAuditLog('USER_PROVISIONING', `${selectedUser ? 'Updated' : 'Created'} account ${result.data.email}`);
      closeModal();
    } else {
      setFormError(result.error.message);
    }

    setIsSaving(false);
  }

  async function handleDelete(user: AdminUserAccount) {
    const confirmed = window.confirm(`Deactivate ${user.email}?`);
    if (!confirmed) return;

    setDeletingId(user.id);
    const result = await backendAdminUserService.deleteUser(user.id);
    if (result.ok === true) {
      setUsers((current) => current.filter((item) => item.id !== user.id));
      addAuditLog('USER_PROVISIONING', `Deactivated account ${user.email}`);
    } else {
      setError(result.error.message);
    }
    setDeletingId(null);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-philsa-navy mb-2 tracking-tight">User & Role Settings</h1>
          <p className="text-philsa-gray">Manage admin access and set module permissions.</p>
        </div>
        {activeSection === 'users' ? (
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
            <UserPlus className="w-5 h-5" /> Add User
          </button>
        ) : (
          <button onClick={openAddRoleModal} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" /> Add Role
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setActiveSection('users')}
          className={cn(
            'text-left rounded-2xl border p-5 transition-all bg-white',
            activeSection === 'users'
              ? 'border-philsa-red shadow-sm ring-2 ring-philsa-red/10'
              : 'border-philsa-border hover:border-philsa-red/40'
          )}
        >
          <div className="flex items-start gap-4">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', activeSection === 'users' ? 'bg-philsa-red text-white' : 'bg-philsa-bg text-philsa-navy')}>
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-philsa-navy">Users Settings</p>
              <p className="mt-1 text-xs leading-relaxed text-philsa-gray">User accounts, assigned roles, modular permissions, and adding new users.</p>
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('roles')}
          className={cn(
            'text-left rounded-2xl border p-5 transition-all bg-white',
            activeSection === 'roles'
              ? 'border-philsa-red shadow-sm ring-2 ring-philsa-red/10'
              : 'border-philsa-border hover:border-philsa-red/40'
          )}
        >
          <div className="flex items-start gap-4">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', activeSection === 'roles' ? 'bg-philsa-red text-white' : 'bg-philsa-bg text-philsa-navy')}>
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-philsa-navy">Role Settings</p>
              <p className="mt-1 text-xs leading-relaxed text-philsa-gray">Role creation, default role access, and modular permission templates.</p>
            </div>
          </div>
        </button>
      </div>

      {activeSection === 'users' && (
      <div className="bg-white rounded-3xl border border-philsa-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-philsa-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, or role..."
              className="w-full bg-philsa-bg border-none rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-philsa-red/10"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-philsa-gray pointer-events-none" />
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="btn-secondary py-2.5 pl-11 pr-9 text-sm appearance-none bg-white"
              aria-label="Filter roles"
            >
              <option value="">All Roles</option>
              {allRoles.map((role) => (
                <option key={role} value={role}>{formatLabel(role)}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="m-6 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-philsa-red">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-philsa-bg text-[10px] text-philsa-gray font-bold uppercase tracking-widest">
                <th className="px-8 py-5">User Name</th>
                <th className="px-8 py-5">Role</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-philsa-border">
              {isLoading && (
                <tr>
                  <td colSpan={3} className="px-8 py-12 text-center text-sm font-semibold text-philsa-gray">
                    Loading backend users...
                  </td>
                </tr>
              )}
              {!isLoading && !hasUsers && (
                <tr>
                  <td colSpan={3} className="px-8 py-12 text-center">
                    <Users className="w-10 h-10 mx-auto mb-3 text-philsa-gray/50" />
                    <p className="text-sm font-extrabold text-philsa-navy">No backend users found</p>
                    <p className="text-xs text-philsa-gray">Create a staff or admin account to populate this table.</p>
                  </td>
                </tr>
              )}
              {!isLoading && users.map((user) => (
                <tr key={user.id} className="hover:bg-philsa-bg/30 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-philsa-navy/5 rounded-full flex items-center justify-center font-bold text-philsa-navy text-xs">
                        {getInitials(user.fullName)}
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-philsa-navy">{user.fullName}</p>
                        <p className="text-xs text-philsa-gray">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 px-3 py-1 bg-philsa-bg border border-philsa-border rounded-lg w-fit">
                      <Shield className="w-3 h-3 text-philsa-red" />
                      <span className="text-[10px] font-bold text-philsa-navy uppercase tracking-wider">{formatLabel(user.role)}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEditModal(user)} className="p-2 text-philsa-gray hover:text-philsa-navy hover:bg-white rounded-lg border border-transparent hover:border-philsa-border transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={deletingId === user.id}
                        className="p-2 text-philsa-gray hover:text-philsa-red hover:bg-white rounded-lg border border-transparent hover:border-philsa-border transition-all disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {activeSection === 'roles' && (
        <div className="bg-white rounded-3xl border border-philsa-border overflow-hidden shadow-sm">
          <div className="p-6 border-b border-philsa-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-philsa-navy">Role Settings</h2>
              <p className="text-xs text-philsa-gray">Create roles and assign default modular permissions.</p>
            </div>
            <button onClick={openAddRoleModal} className="btn-secondary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Role
            </button>
          </div>

          <div className="divide-y divide-philsa-border">
            {roleDefinitions.map((role) => (
              <div
                key={role.id}
                className={cn(
                  'flex items-center gap-4 p-6 transition-all hover:bg-philsa-bg/40',
                  selectedRoleId === role.id && 'bg-philsa-bg/70'
                )}
              >
                <button
                  type="button"
                  onClick={() => openViewRolePermissions(role)}
                  className="flex min-w-0 flex-1 items-center gap-4 text-left"
                >
                  <div className="w-11 h-11 rounded-xl bg-philsa-bg flex items-center justify-center text-philsa-red">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-extrabold text-philsa-navy">{formatLabel(role.name)}</p>
                      <span className="rounded-full border border-philsa-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-philsa-gray">
                        {role.isCustom ? 'Custom' : 'Default'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-philsa-gray">{role.moduleAccess.length} permissions selected</p>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openViewRolePermissions(role)}
                    className="p-2 text-philsa-gray hover:text-philsa-navy hover:bg-white rounded-lg border border-transparent hover:border-philsa-border transition-all"
                    aria-label={`View permissions for ${formatLabel(role.name)}`}
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditRoleModal(role)}
                    className="p-2 text-philsa-gray hover:text-philsa-navy hover:bg-white rounded-lg border border-transparent hover:border-philsa-border transition-all"
                    aria-label={`Edit ${formatLabel(role.name)}`}
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleDelete(role)}
                    className="p-2 text-philsa-gray hover:text-philsa-red hover:bg-white rounded-lg border border-transparent hover:border-philsa-border transition-all"
                    aria-label={`Delete ${formatLabel(role.name)}`}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewingRoleDefinition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-philsa-navy/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-8 border-b border-philsa-border flex justify-between items-center bg-philsa-bg/30">
              <div>
                <h2 className="text-2xl font-extrabold text-philsa-navy">{formatLabel(viewingRoleDefinition.name)} Permissions</h2>
                <p className="text-philsa-gray text-sm">{viewingRoleDefinition.moduleAccess.length} checked modular permissions.</p>
              </div>
              <button type="button" onClick={() => setViewingRoleId(null)} className="p-2 hover:bg-white rounded-full text-philsa-gray transition-colors">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10">
              <h3 className="text-xs font-bold text-philsa-navy uppercase tracking-widest border-l-4 border-philsa-red pl-4 mb-4">Modular Permissions</h3>
              <PermissionMatrix
                modules={systemModules}
                selectedAccess={viewingRoleModuleAccess}
                onToggle={() => undefined}
                readOnly
              />
            </div>

            <div className="p-8 border-t border-philsa-border bg-philsa-bg/30 flex justify-end gap-4">
              <button type="button" onClick={() => setViewingRoleId(null)} className="btn-secondary px-8">Close</button>
              <button type="button" onClick={() => openEditRoleModal(viewingRoleDefinition)} className="btn-primary px-8 flex items-center gap-2">
                <Edit2 className="w-4 h-4" /> Edit Role
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {(isAdding || selectedUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-philsa-navy/40 backdrop-blur-sm">
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-8 border-b border-philsa-border flex justify-between items-center bg-philsa-bg/30">
              <div>
                <h2 className="text-2xl font-extrabold text-philsa-navy">{modalTitle}</h2>
                <p className="text-philsa-gray text-sm">Assign roles and permissions for {selectedUser?.fullName || 'the new user'}.</p>
              </div>
              <button type="button" onClick={closeModal} className="p-2 hover:bg-white rounded-full text-philsa-gray transition-colors">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10">
              {formError && (
                <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-philsa-red">
                  <AlertTriangle className="w-4 h-4" />
                  {formError}
                </div>
              )}
              <div className="grid lg:grid-cols-[0.85fr_1.35fr] gap-8">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-philsa-navy uppercase tracking-widest border-l-4 border-philsa-red pl-4">Identification</h3>
                  <div className="space-y-4">
                    <label className="space-y-1.5 block">
                      <span className="text-[10px] font-bold text-philsa-gray uppercase tracking-widest pl-1">Full Name</span>
                      <input type="text" required className="input-philsa" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="e.g. Maria Clara" />
                    </label>
                    <label className="space-y-1.5 block">
                      <span className="text-[10px] font-bold text-philsa-gray uppercase tracking-widest pl-1">Organization Email</span>
                      <input type="email" required className="input-philsa" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@agency.gov.ph" />
                    </label>
                    <label className="space-y-1.5 block">
                      <span className="text-[10px] font-bold text-philsa-gray uppercase tracking-widest pl-1">Role</span>
                      <select className="input-philsa" value={form.role} onChange={(event) => handleRoleChange(event.target.value)}>
                        {allRoles.map((role) => <option key={role} value={role}>{formatLabel(role)}</option>)}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-philsa-navy uppercase tracking-widest border-l-4 border-philsa-red pl-4">Modular Permissions</h3>
                  <PermissionMatrix modules={systemModules} selectedAccess={selectedModuleAccess} onToggle={togglePermission} />
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-philsa-border bg-philsa-bg/30 flex justify-end gap-4">
              <button type="button" onClick={closeModal} className="btn-secondary px-8">Discard</button>
              <button disabled={isSaving} className={cn('btn-primary px-12 flex items-center gap-2', isSaving && 'opacity-70')}>
                <Check className="w-5 h-5" /> {isSaving ? 'Saving...' : isAdding ? 'Create User' : 'Save Changes'}
              </button>
            </div>
          </motion.form>
        </div>
      )}

      {isAddingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-philsa-navy/40 backdrop-blur-sm">
          <motion.form
            onSubmit={handleRoleSubmit}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-8 border-b border-philsa-border flex justify-between items-center bg-philsa-bg/30">
              <div>
                <h2 className="text-2xl font-extrabold text-philsa-navy">{editingRole ? 'Edit Role' : 'Add New Role'}</h2>
                <p className="text-philsa-gray text-sm">Set the role name and default modular permissions.</p>
              </div>
              <button type="button" onClick={closeRoleModal} className="p-2 hover:bg-white rounded-full text-philsa-gray transition-colors">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-8">
              {roleFormError && (
                <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-philsa-red">
                  <AlertTriangle className="w-4 h-4" />
                  {roleFormError}
                </div>
              )}

              <div className="grid lg:grid-cols-[0.85fr_1.35fr] gap-8">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-philsa-navy uppercase tracking-widest border-l-4 border-philsa-red pl-4">Role Details</h3>
                  <label className="space-y-1.5 block">
                    <span className="text-[10px] font-bold text-philsa-gray uppercase tracking-widest pl-1">Role Name</span>
                    <input
                      type="text"
                      required
                      className="input-philsa"
                      value={roleForm.name}
                      disabled={editingRole?.isCustom === false}
                      onChange={(event) => setRoleForm({ ...roleForm, name: event.target.value })}
                      placeholder="e.g. Regional Admin"
                    />
                  </label>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-philsa-navy uppercase tracking-widest border-l-4 border-philsa-red pl-4">Modular Permissions</h3>
                  <PermissionMatrix modules={systemModules} selectedAccess={selectedRoleModuleAccess} onToggle={toggleRolePermission} />
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-philsa-border bg-philsa-bg/30 flex justify-end gap-4">
              <button type="button" onClick={closeRoleModal} className="btn-secondary px-8">Discard</button>
              <button className="btn-primary px-12 flex items-center gap-2">
                <Check className="w-5 h-5" /> {editingRole ? 'Save Role' : 'Create Role'}
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </div>
  );
}
