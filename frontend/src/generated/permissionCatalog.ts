// Generated from backend/apps/accounts/permission_catalog.json.
// Run `python scripts/generate_permission_catalog.py` after catalog changes.

export const permissionCatalog = {
  defaultRange: {
    start: 1,
    end: 48,
    actions: ['READ', 'WRITE', 'EDIT', 'DELETE', 'APPROVE', 'REJECT'],
  },
  modules: {
    '49': ['READ', 'WRITE', 'EDIT', 'DELETE'],
    '50': ['READ'],
    '51': ['READ'],
    '52': ['READ', 'WRITE', 'EDIT'],
    '53': ['READ'],
    '54': ['READ', 'WRITE', 'EDIT'],
    '55': ['READ', 'WRITE', 'EDIT', 'DELETE'],
    '56': ['READ'],
  },
} as const;
