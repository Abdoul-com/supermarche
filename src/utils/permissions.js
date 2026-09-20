export const permissions = Object.freeze({
  dashboard: {
    view: 'dashboard.view'
  },
  products: {
    view: 'products.view',
    create: 'products.create',
    update: 'products.update'
  },
  stock: {
    view: 'stock.view',
    manage: 'stock.manage'
  },
  sales: {
    view: 'sales.view',
    create: 'sales.create'
  },
  customers: {
    view: 'customers.view',
    manage: 'customers.manage'
  },
  suppliers: {
    view: 'suppliers.view',
    manage: 'suppliers.manage'
  },
  purchases: {
    view: 'purchases.view',
    manage: 'purchases.manage'
  },
  inventory: {
    view: 'inventory.view',
    manage: 'inventory.manage'
  },
  promotions: {
    view: 'promotions.view',
    manage: 'promotions.manage'
  },
  reports: {
    view: 'reports.view'
  },
  users: {
    view: 'users.view',
    manage: 'users.manage'
  },
  settings: {
    view: 'settings.view',
    manage: 'settings.manage'
  }
});

export const defaultRolePermissions = Object.freeze({
  Administrateur: Object.values(permissions).flatMap((scope) => Object.values(scope)),
  Gérant: [
    permissions.dashboard.view,
    permissions.products.view,
    permissions.products.create,
    permissions.products.update,
    permissions.stock.view,
    permissions.stock.manage,
    permissions.sales.view,
    permissions.sales.create,
    permissions.customers.view,
    permissions.customers.manage,
    permissions.suppliers.view,
    permissions.suppliers.manage,
    permissions.purchases.view,
    permissions.purchases.manage,
    permissions.inventory.view,
    permissions.inventory.manage,
    permissions.promotions.view,
    permissions.promotions.manage,
    permissions.reports.view,
    permissions.users.view,
    permissions.settings.view
  ],
  Caissier: [
    permissions.dashboard.view,
    permissions.sales.view,
    permissions.sales.create,
    permissions.customers.view,
    permissions.promotions.view,
    permissions.reports.view
  ],
  'Gestionnaire de stock': [
    permissions.dashboard.view,
    permissions.products.view,
    permissions.products.create,
    permissions.products.update,
    permissions.stock.view,
    permissions.stock.manage,
    permissions.inventory.view,
    permissions.inventory.manage,
    permissions.suppliers.view,
    permissions.promotions.view
  ],
  Comptable: [
    permissions.dashboard.view,
    permissions.sales.view,
    permissions.purchases.view,
    permissions.reports.view,
    permissions.settings.view
  ]
});

export function hasPermission(permission, grantedPermissions = []) {
  if (!permission) return true;
  if (!Array.isArray(grantedPermissions)) return false;
  if (grantedPermissions.includes('*')) return true;
  return grantedPermissions.includes(permission);
}

export function resolvePermissionsForRole(roleName = '') {
  const safeName = String(roleName || '').trim();
  if (!safeName) return [];
  return defaultRolePermissions[safeName] || [];
}
