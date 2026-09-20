import './styles/main.css';
import Chart from 'chart.js/auto';
import App from './App.js';
import Login from './pages/Login.js';
import { getDashboardData } from './services/dashboardService.js';
import { getSupabaseConfigStatus, supabase } from './services/supabase.js';
import { signIn, signOut, onAuthStateChange } from './services/authService.js';
import { resolveAuthContext } from './utils/authGuard.js';
import {
  activateProduct,
  createProduct,
  deactivateProduct,
  getCategories as getProductCategories,
  getProducts,
  getSuppliers as getProductSuppliers,
  updateProduct
} from './services/productsService.js';
import {
  createSale,
  formatCurrency,
  getCustomers,
  getProductsForSale,
  getSales,
  getSaleById,
  getPayments,
  buildSaleSummary,
  validateCartItem
} from './services/salesService.js';
import {
  activateCustomer,
  createCustomer,
  deactivateCustomer,
  getCustomerById,
  getCustomerSales,
  getCustomers as getCustomerList,
  updateCustomer
} from './services/customersService.js';
import {
  createStockMovement,
  getCategories as getStockCategories,
  getStockMovements,
  getStockProducts
} from './services/stockService.js';
import {
  activateSupplier,
  createSupplier,
  deactivateSupplier,
  getActiveSuppliers,
  getSupplierById,
  getSupplierProducts,
  getSupplierPurchases,
  getSuppliers,
  updateSupplier
} from './services/suppliersService.js';
import {
  cancelPurchase,
  createPurchase,
  createPurchaseItems,
  getPurchaseById,
  getPurchaseItems,
  getPurchases,
  receivePurchase,
  replacePurchaseItems,
  updatePurchase
} from './services/purchasesService.js';
import {
  closeInventory,
  createInventory,
  getInventories,
  getInventoryById,
  getInventoryItems,
  getProductsForInventory,
  saveInventoryItem
} from './services/inventoryService.js';
import {
  activatePromotion,
  calculatePromotionalPrice,
  createPromotion,
  deactivatePromotion,
  getActivePromotionForProduct,
  getPromotionById,
  getPromotionStatus,
  getPromotions,
  updatePromotion
} from './services/promotionsService.js';
import {
  getDashboardMetrics,
  getPaymentMethodsReport,
  getPurchasesReport,
  getSalesByCategory,
  getSalesByDay,
  getStockReport,
  getTopSellingProducts
} from './services/reportsService.js';
import {
  activateUser,
  createUserProfile,
  deactivateUser,
  getRoles,
  getUserActivity,
  getUsers,
  updateUser
} from './services/usersService.js';
import { getSettings, updateSettings } from './services/settingsService.js';
import { defaultRolePermissions, hasPermission } from './utils/permissions.js';
import exportCsv from './utils/exportCsv.js';

const app = document.querySelector('#app');
const appState = {
  auth: {
    session: null,
    user: null,
    profile: null,
    roleName: null
  }
};

globalThis.__supermarcheAuth = appState.auth;

function updateAuthState(nextState = {}) {
  appState.auth = {
    ...appState.auth,
    ...nextState
  };
  globalThis.__supermarcheAuth = appState.auth;
}

function showToast(message) {
  let toast = document.querySelector('.toast');

  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;

  if (toast.timeoutId) {
    clearTimeout(toast.timeoutId);
  }

  toast.timeoutId = setTimeout(() => {
    toast.remove();
  }, 4000);
}

function toggleSidebar() {
  const shell = document.querySelector('.app-shell');
  if (!shell) return;
  shell.classList.toggle('sidebar-open');
}

function bindLoginForm() {
  const form = document.querySelector('[data-login-form]');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const emailInput = form.querySelector('[name="email"]');
    const passwordInput = form.querySelector('[name="password"]');
    const errorEl = form.parentElement.querySelector('.login-error');

    if (!emailInput || !passwordInput) return;

    const email = String(emailInput.value || '').trim();
    const password = String(passwordInput.value || '');

    if (!email || !password) {
      if (errorEl) errorEl.textContent = 'Veuillez saisir un email et un mot de passe.';
      return;
    }

    try {
      form.querySelector('.login-submit').disabled = true;
      form.querySelector('.login-submit').textContent = 'Connexion...';
      if (errorEl) errorEl.textContent = '';

      await signIn(email, password);
      const authContext = await resolveAuthContext();
      updateAuthState(authContext);

      if (!authContext.session || !authContext.user) {
        renderLoginPage('Session introuvable. Veuillez réessayer.');
        return;
      }

      renderPage('dashboard', { loading: true, error: null });
    } catch (error) {
      if (errorEl) errorEl.textContent = error?.message || 'Erreur de connexion.';
      showToast(error?.message || 'Erreur de connexion.');
    } finally {
      const submitButton = form.querySelector('.login-submit');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Se connecter';
      }
    }
  });
}

function renderLoginPage(error = '', loading = false) {
  app.innerHTML = Login({ error, loading });
  bindLoginForm();
}

function bindPageEvents() {
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => {
      const selectedPage = button.dataset.page;
      if (selectedPage) {
        renderPage(selectedPage);
      }
    });
  });

  const toggleButton = document.querySelector('[data-sidebar-toggle]');
  if (toggleButton) {
    toggleButton.addEventListener('click', toggleSidebar);
  }

  const refreshButton = document.querySelector('[data-action="refresh"]');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      if (document.querySelector('[data-reports-root]')) {
        renderPage('rapports');
        return;
      }

      renderPage('dashboard', { loading: true, error: null });
      loadDashboardData();
    });
  }

  const signOutButton = document.querySelector('[data-auth-signout]');
  if (signOutButton) {
    signOutButton.addEventListener('click', async () => {
      try {
        await signOut();
        updateAuthState({ session: null, user: null, profile: null, roleName: null });
        renderLoginPage('Vous avez ete deconnecte.');
      } catch (error) {
        showToast(error?.message || 'La deconnexion a echoue.');
      }
    });
  }
}

async function loadDashboardData() {
  if (!document.querySelector('[data-dashboard-root]')) {
    return;
  }

  try {
    const config = getSupabaseConfigStatus();

    if (!config.configured) {
      throw new Error('Supabase n’est pas configuré. Vérifiez les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.');
    }

    const dashboard = await getDashboardData();
    app.innerHTML = App('dashboard', dashboard);
    bindPageEvents();
  } catch (error) {
    const message = error?.message || 'Une erreur inconnue est survenue lors du chargement du dashboard.';
    console.error('Erreur Dashboard Supabase:', error);
    showToast(message);
    app.innerHTML = App('dashboard', {
      loading: false,
      error: message,
      metrics: {
        productsCount: 0,
        customersCount: 0,
        suppliersCount: 0,
        salesCount: 0,
        revenue: 0,
        lowStockCount: 0
      },
      lowStockProducts: [],
      recentSales: [],
      recentActivities: [],
      salesTrend: [0, 0, 0, 0, 0, 0, 0]
    });
    bindPageEvents();
  }
}

function renderPage(activePage = 'dashboard', dashboardData = null) {
  app.innerHTML = App(activePage, dashboardData);
  bindPageEvents();

  if (activePage === 'dashboard') {
    if (!dashboardData) {
      app.innerHTML = App(activePage, { loading: true, error: null });
      bindPageEvents();
    }

    loadDashboardData();
  }

  if (activePage === 'produits') {
    initializeProductsPage();
  }

  if (activePage === 'stock') {
    initializeStockPage();
  }

  if (activePage === 'fournisseurs') {
    initializeSuppliersPage();
  }

  if (activePage === 'achats') {
    initializePurchasesPage();
  }

  if (activePage === 'inventaire') {
    initializeInventoryPage();
  }

  if (activePage === 'promotions') {
    initializePromotionsPage();
  }

  if (activePage === 'rapports') {
    initializeReportsPage();
  }

  if (activePage === 'utilisateurs') {
    initializeUsersPage();
  }

  if (activePage === 'parametres') {
    initializeSettingsPage();
  }

  if (activePage === 'clients') {
    initializeCustomersPage();
  }

  if (activePage === 'ventes' || activePage === 'caisse') {
    initializeSalesPage();
  }
}

async function initializeSettingsPage() {
  const root = document.querySelector('[data-settings-root]');
  if (!root) return;

  const form = root.querySelector('[data-settings-form]');
  const statusNode = root.querySelector('[data-settings-status]');
  const saveButton = root.querySelector('[data-settings-save]');
  const refreshButton = root.querySelector('[data-settings-refresh]');
  let isSaving = false;

  const setStatus = (message = '', isError = false) => {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.classList.toggle('error', isError);
  };

  const fillForm = (settings = {}) => {
    if (!form) return;

    const values = {
      nom_supermarche: settings.nom_supermarche || '',
      telephone: settings.telephone || '',
      email: settings.email || '',
      adresse: settings.adresse || '',
      devise: settings.devise || 'FCFA'
    };

    Object.entries(values).forEach(([key, value]) => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) {
        input.value = value;
      }
    });
  };

  const loadSettings = async () => {
    try {
      setStatus('Chargement des paramètres…');
      const settings = await getSettings();
      if (!settings) {
        setStatus('Aucun paramètre trouvé dans Supabase.', true);
        return;
      }
      fillForm(settings);
      setStatus('');
    } catch (error) {
      console.error('Erreur settings Supabase:', error);
      setStatus(error?.message || 'Impossible de charger les paramètres.', true);
      showToast(error?.message || 'Impossible de charger les paramètres.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form || isSaving) return;

    const payload = {
      nom_supermarche: String(form.querySelector('[name="nom_supermarche"]')?.value ?? '').trim(),
      telephone: String(form.querySelector('[name="telephone"]')?.value ?? '').trim(),
      email: String(form.querySelector('[name="email"]')?.value ?? '').trim(),
      adresse: String(form.querySelector('[name="adresse"]')?.value ?? '').trim(),
      devise: String(form.querySelector('[name="devise"]')?.value ?? 'FCFA').trim() || 'FCFA'
    };

    const errors = [];
    if (!payload.nom_supermarche) errors.push('Le nom du supermarché est obligatoire.');
    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) errors.push('L’email n’est pas valide.');
    if (payload.telephone && !/^[0-9+\s().-]{8,20}$/.test(payload.telephone)) errors.push('Le téléphone n’est pas valide.');

    if (errors.length) {
      setStatus(errors[0], true);
      showToast(errors[0]);
      return;
    }

    isSaving = true;
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = 'Enregistrement…';
    }
    setStatus('Enregistrement des paramètres…');

    try {
      await updateSettings(payload);
      setStatus('Paramètres enregistrés avec succès.');
      showToast('Paramètres enregistrés avec succès.');
      await loadSettings();
    } catch (error) {
      console.error('Erreur sauvegarde settings:', error);
      setStatus(error?.message || 'Échec de la sauvegarde des paramètres.', true);
      showToast(error?.message || 'Échec de la sauvegarde des paramètres.');
    } finally {
      isSaving = false;
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = 'Enregistrer les paramètres';
      }
    }
  };

  if (form) {
    form.addEventListener('submit', handleSubmit);
  }

  if (refreshButton) {
    refreshButton.addEventListener('click', loadSettings);
  }

  await loadSettings();
}

async function initializeUsersPage() {
  const root = document.querySelector('[data-users-root]');
  if (!root) return;

  const state = {
    users: [],
    roles: [],
    activities: {},
    currentUserId: 0,
    canManageUsers: hasPermission('users.manage', defaultRolePermissions.Administrateur || [])
  };

  const searchInput = root.querySelector('[data-users-search]');
  const roleFilter = root.querySelector('[data-users-role-filter]');
  const statusFilter = root.querySelector('[data-users-status-filter]');
  const tableBody = root.querySelector('[data-users-table-body]');
  const modal = root.querySelector('[data-users-modal]');
  const detailModal = root.querySelector('[data-users-detail-modal]');
  const detailContent = root.querySelector('[data-users-detail-content]');
  const form = root.querySelector('[data-users-form]');
  const addButton = root.querySelector('[data-users-add]');
  const refreshButton = root.querySelector('[data-users-refresh]');
  const hiddenUserId = root.querySelector('[data-user-id]');
  const modalTitle = root.querySelector('#users-modal-title');

  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatActivityDate = (value) => {
    if (!value) return 'Aucune activité';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Aucune activité';
    return date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getRoleNameById = (roleId) => {
    const role = state.roles.find((item) => String(item.id) === String(roleId));
    return role?.nom || 'Rôle inconnu';
  };

  const getStatusValue = (user) => {
    const raw = String(user?.statut ?? 'actif').trim().toLowerCase();
    if (['actif', 'active', 'enabled', 'true', '1'].includes(raw)) return 'actif';
    if (['inactif', 'inactive', 'disabled', 'false', '0'].includes(raw)) return 'inactif';
    return raw || 'actif';
  };

  const renderRoleOptions = () => {
    const filter = roleFilter;
    if (filter) {
      filter.innerHTML = `<option value="all">Tous</option>${state.roles.map((role) => `<option value="${role.id}">${role.nom}</option>`).join('')}`;
    }

    const formRoleSelect = form?.querySelector('[name="role_id"]');
    if (formRoleSelect) {
      formRoleSelect.innerHTML = state.roles.map((role) => `<option value="${role.id}">${role.nom}</option>`).join('');
    }
  };

  const renderStats = () => {
    const total = state.users.length;
    const actifs = state.users.filter((user) => getStatusValue(user) === 'actif').length;
    const admins = state.users.filter((user) => /administrateur/i.test(getRoleNameById(user.role_id))).length;
    const otherRoles = total - admins;

    const statEls = [
      root.querySelector('[data-users-total]'),
      root.querySelector('[data-users-active]'),
      root.querySelector('[data-users-admin]'),
      root.querySelector('[data-users-other]')
    ];

    if (statEls[0]) statEls[0].textContent = String(total);
    if (statEls[1]) statEls[1].textContent = String(actifs);
    if (statEls[2]) statEls[2].textContent = String(admins);
    if (statEls[3]) statEls[3].textContent = String(otherRoles);
  };

  const renderRows = () => {
    const searchTerm = (searchInput?.value || '').trim().toLowerCase();
    const selectedRole = roleFilter?.value || 'all';
    const selectedStatus = statusFilter?.value || 'all';

    const filtered = state.users.filter((user) => {
      const roleName = getRoleNameById(user.role_id).toLowerCase();
      const matchesSearch = !searchTerm || `${user.nom || ''} ${user.prenom || ''} ${user.username || ''} ${user.email || ''} ${roleName}`.toLowerCase().includes(searchTerm);
      const matchesRole = selectedRole === 'all' || String(user.role_id) === String(selectedRole);
      const matchesStatus = selectedStatus === 'all' || getStatusValue(user) === selectedStatus;
      return matchesSearch && matchesRole && matchesStatus;
    });

    if (!tableBody) return;

    if (!filtered.length) {
      tableBody.innerHTML = '<tr><td colspan="8" class="empty-state">Aucun utilisateur ne correspond aux filtres.</td></tr>';
      return;
    }

    tableBody.innerHTML = filtered.map((user) => {
      const lastActivity = state.activities[user.id]?.[0]?.created_at || null;
      const status = getStatusValue(user);
      const roleName = getRoleNameById(user.role_id);
      const isAdmin = /administrateur/i.test(roleName);
      const isSelf = Number(state.currentUserId) === Number(user.id) && isAdmin;
      const canEdit = state.canManageUsers;

      return `
        <tr>
          <td>${user.nom || '—'} ${user.prenom || ''}</td>
          <td>${user.username || user.email || '—'}</td>
          <td>${user.nom || user.prenom ? `${user.prenom || ''} ${user.nom || ''}`.trim() : '—'}</td>
          <td>${roleName}</td>
          <td><span class="status-badge ${status === 'actif' ? 'active' : 'inactive'}">${status === 'actif' ? 'Actif' : 'Inactif'}</span></td>
          <td>${formatDate(user.created_at)}</td>
          <td>${formatActivityDate(lastActivity)}</td>
          <td>
            <div class="table-actions">
              <button type="button" class="table-action-btn primary" data-user-action="view" data-user-id="${user.id}">Voir</button>
              ${canEdit ? `<button type="button" class="table-action-btn secondary" data-user-action="edit" data-user-id="${user.id}">Modifier</button>` : ''}
              ${canEdit ? `<button type="button" class="table-action-btn ${status === 'actif' ? 'danger' : 'primary'}" data-user-action="toggle" data-user-id="${user.id}" ${isSelf ? 'disabled' : ''}>${status === 'actif' ? 'Désactiver' : 'Activer'}</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  };

  const toggleModal = (show) => {
    if (!modal) return;
    modal.classList.toggle('hidden', !show);
    modal.setAttribute('aria-hidden', String(!show));
  };

  const toggleDetailModal = (show) => {
    if (!detailModal) return;
    detailModal.classList.toggle('hidden', !show);
    detailModal.setAttribute('aria-hidden', String(!show));
  };

  const openCreateModal = () => {
    if (!form || !state.canManageUsers) return;
    form.reset();
    if (modalTitle) modalTitle.textContent = 'Ajouter un utilisateur';
    if (hiddenUserId) hiddenUserId.value = '';
    const formRoleSelect = form.querySelector('[name="role_id"]');
    if (formRoleSelect && state.roles.length) formRoleSelect.value = String(state.roles[0]?.id || '');
    const formStatusSelect = form.querySelector('[name="statut"]');
    if (formStatusSelect) formStatusSelect.value = 'actif';
    toggleModal(true);
  };

  const openEditModal = (user) => {
    if (!form || !state.canManageUsers) return;
    if (!user) return;
    if (modalTitle) modalTitle.textContent = 'Modifier l’utilisateur';
    if (hiddenUserId) hiddenUserId.value = user.id;

    form.querySelector('[name="nom"]').value = user.nom || '';
    form.querySelector('[name="prenom"]').value = user.prenom || '';
    form.querySelector('[name="telephone"]').value = user.telephone || '';
    form.querySelector('[name="email"]').value = user.email || '';
    form.querySelector('[name="username"]').value = user.username || '';
    form.querySelector('[name="role_id"]').value = String(user.role_id || '');
    form.querySelector('[name="statut"]').value = getStatusValue(user);

    toggleModal(true);
  };

  const openDetailModal = async (userId) => {
    const user = state.users.find((item) => String(item.id) === String(userId));
    if (!user || !detailContent) return;

    const activities = state.activities[user.id] || await getUserActivity(userId);
    const roleName = getRoleNameById(user.role_id);
    const status = getStatusValue(user);

    detailContent.innerHTML = `
      <div class="customer-detail-header">
        <div>
          <h4>${user.nom || 'Utilisateur'} ${user.prenom || ''}</h4>
          <p>${user.username || user.email || 'Identifiant non renseigné'}</p>
        </div>
        <span class="status-badge ${status === 'actif' ? 'active' : 'inactive'}">${status === 'actif' ? 'Actif' : 'Inactif'}</span>
      </div>
      <div class="detail-grid">
        <div><strong>Email</strong><p>${user.email || '—'}</p></div>
        <div><strong>Téléphone</strong><p>${user.telephone || '—'}</p></div>
        <div><strong>Rôle</strong><p>${roleName}</p></div>
        <div><strong>Statut</strong><p>${status === 'actif' ? 'Actif' : 'Inactif'}</p></div>
        <div><strong>Date de création</strong><p>${formatDate(user.created_at)}</p></div>
        <div><strong>Dernière activité</strong><p>${formatActivityDate((activities || [])[0]?.created_at || null)}</p></div>
      </div>
      <div class="table-wrapper" style="margin-top: 12px;">
        <table class="data-table compact">
          <thead>
            <tr>
              <th>Action</th>
              <th>Description</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${(activities || []).length ? activities.map((activity) => `
              <tr>
                <td>${activity.action || 'Activité'}</td>
                <td>${activity.description || 'Aucune description'}</td>
                <td>${formatActivityDate(activity.created_at)}</td>
              </tr>
            `).join('') : '<tr><td colspan="3" class="empty-state">Aucune activité récente trouvée.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    toggleDetailModal(true);
  };

  const refreshUsersData = async () => {
    try {
      const [users, roles] = await Promise.all([getUsers(), getRoles()]);
      state.users = users ?? [];
      state.roles = roles ?? [];
      state.currentUserId = Number(localStorage.getItem('supermarche-current-user-id') || state.users.find((user) => /administrateur/i.test(getRoleNameById(user.role_id)) || /admin/i.test(user.username || user.email || ''))?.id || state.users[0]?.id || 0);
      localStorage.setItem('supermarche-current-user-id', String(state.currentUserId || ''));

      const activityResults = await Promise.all(
        state.users.map(async (user) => ({
          userId: user.id,
          items: await getUserActivity(user.id).catch(() => [])
        }))
      );

      state.activities = {};
      for (const item of activityResults) {
        state.activities[item.userId] = item.items || [];
      }

      renderRoleOptions();
      renderStats();
      renderRows();
    } catch (error) {
      console.error('Erreur Utilisateurs Supabase:', error);
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="8" class="empty-state">Erreur lors du chargement des utilisateurs.</td></tr>';
      }
      showToast(error?.message || 'Impossible de charger les utilisateurs.');
    }
  };

  const handleUserAction = async (button) => {
    const action = button.dataset.userAction;
    const userId = button.dataset.userId;
    if (!action || !userId) return;

    const user = state.users.find((item) => String(item.id) === String(userId));
    if (!user) return;

    if (action === 'view') {
      await openDetailModal(userId);
      return;
    }

    if (action === 'edit') {
      if (!state.canManageUsers) return;
      openEditModal(user);
      return;
    }

    if (action === 'toggle') {
      if (!state.canManageUsers) return;
      const isAdminRole = /administrateur/i.test(getRoleNameById(user.role_id));
      if (Number(user.id) === Number(state.currentUserId) && isAdminRole) {
        showToast('Impossible de désactiver votre propre compte administrateur.');
        return;
      }

      const confirmText = getStatusValue(user) === 'actif' ? 'Désactiver cet utilisateur ?' : 'Activer cet utilisateur ?';
      if (!window.confirm(confirmText)) return;

      try {
        if (getStatusValue(user) === 'actif') {
          await deactivateUser(user.id);
          showToast('Utilisateur désactivé.');
        } else {
          await activateUser(user.id);
          showToast('Utilisateur activé.');
        }
        await refreshUsersData();
      } catch (error) {
        console.error(error);
        showToast(error?.message || 'Impossible de modifier le statut de l’utilisateur.');
      }
    }
  };

  if (searchInput) {
    searchInput.addEventListener('input', renderRows);
  }

  if (roleFilter) {
    roleFilter.addEventListener('change', renderRows);
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', renderRows);
  }

  if (addButton) {
    addButton.disabled = !state.canManageUsers;
    addButton.addEventListener('click', openCreateModal);
  }

  if (refreshButton) {
    refreshButton.addEventListener('click', refreshUsersData);
  }

  if (modal) {
    modal.querySelectorAll('[data-users-close]').forEach((button) => {
      button.addEventListener('click', () => toggleModal(false));
    });

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!state.canManageUsers) return;

      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      const userId = hiddenUserId?.value || null;

      try {
        const record = {
          nom: String(payload.nom || '').trim(),
          prenom: String(payload.prenom || '').trim(),
          telephone: String(payload.telephone || '').trim(),
          email: String(payload.email || '').trim(),
          username: String(payload.username || '').trim(),
          role_id: Number(payload.role_id || 0),
          statut: payload.statut || 'actif'
        };

        if (!record.role_id) {
          throw new Error('Veuillez sélectionner un rôle.');
        }

        if (!record.username && !record.email && !record.nom) {
          throw new Error('Veuillez renseigner au moins un identifiant ou un nom.');
        }

        if (userId) {
          await updateUser(userId, record);
          showToast('Utilisateur modifié avec succès.');
        } else {
          await createUserProfile(record);
          showToast('Utilisateur créé avec succès.');
        }

        toggleModal(false);
        await refreshUsersData();
      } catch (error) {
        console.error(error);
        showToast(error?.message || 'Erreur lors de l’enregistrement de l’utilisateur.');
      }
    });
  }

  if (detailModal) {
    detailModal.querySelectorAll('[data-users-detail-close]').forEach((button) => {
      button.addEventListener('click', () => toggleDetailModal(false));
    });
  }

  root.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-user-action]');
    if (button) {
      await handleUserAction(button);
    }
  });

  await refreshUsersData();
}

async function initializeInventoryPage() {
  const root = document.querySelector('[data-inventory-root]');
  if (!root) return;

  const state = {
    inventories: [],
    products: [],
    itemsByInventory: {},
    loading: false,
    currentInventoryId: null
  };

  const searchInput = root.querySelector('[data-inventory-search]');
  const statusFilter = root.querySelector('[data-inventory-status-filter]');
  const tableBody = root.querySelector('[data-inventory-table-body]');
  const modal = root.querySelector('[data-inventory-modal]');
  const form = root.querySelector('[data-inventory-form]');
  const detailModal = root.querySelector('[data-inventory-detail-modal]');
  const detailContent = root.querySelector('[data-inventory-detail-content]');
  const refreshButton = root.querySelector('[data-inventory-refresh]');
  const addButton = root.querySelector('[data-inventory-add]');

  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const normalizeStatus = (value) => {
    const raw = String(value ?? '').trim().toLowerCase();
    if (!raw) return 'en_cours';
    if (['en cours', 'encours', 'en_cours', 'pending', 'in_progress', 'in progress', 'brouillon', 'draft', 'ouvert', 'open'].includes(raw)) return 'en_cours';
    if (['cloture', 'clôturé', 'cloturée', 'cloturee', 'closed', 'done', 'termine', 'terminé', 'finalisé', 'finalise'].includes(raw)) return 'cloture';
    return raw;
  };

  const getStatusValue = (inventory) => normalizeStatus(inventory?.statut ?? inventory?.status ?? inventory?.etat ?? inventory?.state ?? 'en_cours');
  const getStatusLabel = (inventory) => (getStatusValue(inventory) === 'cloture' ? 'Clôturé' : 'En cours');
  const getReference = (inventory) => `INV-${inventory?.id ?? 'NEW'}`;

  const getInventoryItemsList = async (inventoryId) => {
    if (!inventoryId) return [];
    if (state.itemsByInventory[inventoryId]) return state.itemsByInventory[inventoryId];
    const items = await getInventoryItems(inventoryId);
    state.itemsByInventory[inventoryId] = items ?? [];
    return state.itemsByInventory[inventoryId];
  };

  const renderStats = () => {
    const total = state.inventories.length;
    const open = state.inventories.filter((inventory) => getStatusValue(inventory) === 'en_cours').length;
    const counted = state.inventories.reduce((sum, inventory) => sum + (state.itemsByInventory[inventory.id] || []).length, 0);
    const totalDifferences = state.inventories.reduce((sum, inventory) => {
      const items = state.itemsByInventory[inventory.id] || [];
      return sum + items.filter((item) => Number(item.difference ?? item.ecart ?? 0) !== 0).length;
    }, 0);

    const totalNode = root.querySelector('[data-inventory-total]');
    const openNode = root.querySelector('[data-inventory-open]');
    const countedNode = root.querySelector('[data-inventory-counted]');
    const differencesNode = root.querySelector('[data-inventory-differences]');

    if (totalNode) totalNode.textContent = String(total);
    if (openNode) openNode.textContent = String(open);
    if (countedNode) countedNode.textContent = String(counted);
    if (differencesNode) differencesNode.textContent = String(totalDifferences);
  };

  const renderRows = () => {
    const searchTerm = (searchInput?.value || '').trim().toLowerCase();
    const statusTerm = statusFilter?.value || 'all';

    const filtered = state.inventories.filter((inventory) => {
      const status = getStatusValue(inventory);
      const haystack = `${getReference(inventory)} ${status}`.toLowerCase();
      const matchesSearch = !searchTerm || haystack.includes(searchTerm);
      const matchesStatus = statusTerm === 'all' || status === statusTerm;
      return matchesSearch && matchesStatus;
    });

    if (!tableBody) return;

    if (!filtered.length) {
      tableBody.innerHTML = '<tr><td colspan="6" class="empty-state">Aucun inventaire ne correspond aux filtres.</td></tr>';
      return;
    }

    tableBody.innerHTML = filtered.map((inventory) => {
      const items = state.itemsByInventory[inventory.id] || [];
      const differenceCount = items.filter((item) => Number(item.difference ?? item.ecart ?? 0) !== 0).length;
      const status = getStatusValue(inventory);
      return `
        <tr>
          <td>${getReference(inventory)}</td>
          <td>${formatDate(inventory.date_inventaire || inventory.created_at)}</td>
          <td>${items.length}</td>
          <td>${differenceCount}</td>
          <td><span class="status-badge ${status === 'cloture' ? 'active' : 'warning'}">${getStatusLabel(inventory)}</span></td>
          <td>
            <div class="table-actions">
              <button type="button" class="table-action-btn primary" data-inventory-action="detail" data-inventory-id="${inventory.id}">Voir</button>
              <button type="button" class="table-action-btn secondary" data-inventory-action="continue" data-inventory-id="${inventory.id}">Continuer</button>
              ${status !== 'cloture' ? `<button type="button" class="table-action-btn danger" data-inventory-action="close" data-inventory-id="${inventory.id}">Clôturer</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  };

  const toggleModal = (show) => {
    if (!modal) return;
    modal.classList.toggle('hidden', !show);
    modal.setAttribute('aria-hidden', String(!show));
  };

  const toggleDetailModal = (show) => {
    if (!detailModal) return;
    detailModal.classList.toggle('hidden', !show);
    detailModal.setAttribute('aria-hidden', String(!show));
  };

  const renderDetail = (inventory) => {
    if (!detailContent || !inventory) return;

    const items = state.itemsByInventory[inventory.id] || [];
    const productMap = new Map((state.products || []).map((product) => [String(product.id), product]));

    detailContent.innerHTML = `
      <div class="customer-detail-header">
        <div>
          <h4>${getReference(inventory)}</h4>
          <p>${formatDate(inventory.date_inventaire || inventory.created_at)}</p>
        </div>
        <span class="status-badge ${getStatusValue(inventory) === 'cloture' ? 'active' : 'warning'}">${getStatusLabel(inventory)}</span>
      </div>
      <div class="detail-grid">
        <div><strong>Notes</strong><p>${inventory.notes || 'Aucune note'}</p></div>
        <div><strong>Produits comptés</strong><p>${items.length}</p></div>
        <div><strong>Écarts</strong><p>${items.filter((item) => Number(item.difference ?? item.ecart ?? 0) !== 0).length}</p></div>
        <div><strong>Sans écart</strong><p>${items.filter((item) => Number(item.difference ?? item.ecart ?? 0) === 0).length}</p></div>
      </div>
      <div class="table-wrapper">
        <table class="data-table compact">
          <thead><tr><th>Produit</th><th>Théorique</th><th>Physique</th><th>Écart</th></tr></thead>
          <tbody>
            ${items.length ? items.map((item) => {
              const product = productMap.get(String(item.product_id));
              const diff = Number(item.difference ?? item.ecart ?? 0);
              return `
                <tr>
                  <td>${product?.nom || 'Produit'}</td>
                  <td>${Number(item.stock_theorique ?? 0)}</td>
                  <td>${Number(item.stock_reel ?? 0)}</td>
                  <td><span class="status-badge ${diff > 0 ? 'active' : diff < 0 ? 'inactive' : 'warning'}">${diff > 0 ? '+' : ''}${diff}</span></td>
                </tr>
              `;
            }).join('') : '<tr><td colspan="4" class="empty-state">Aucun produit compté pour cet inventaire.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  };

  const openCreateForm = () => {
    if (!form) return;
    form.reset();
    const dateField = form.querySelector('[data-inventory-date]');
    if (dateField) dateField.value = new Date().toISOString().slice(0, 10);
    toggleModal(true);
  };

  const refreshInventoryData = async () => {
    try {
      state.loading = true;
      const [inventories, products] = await Promise.all([getInventories(), getProductsForInventory()]);
      state.inventories = inventories ?? [];
      state.products = products ?? [];

      for (const inventory of state.inventories) {
        state.itemsByInventory[inventory.id] = await getInventoryItems(inventory.id);
      }

      renderStats();
      renderRows();
    } catch (error) {
      console.error('Erreur Inventaire Supabase:', error);
      showToast(error?.message || 'Impossible de charger les inventaires.');
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="6" class="empty-state">Erreur lors du chargement des inventaires.</td></tr>';
      }
    } finally {
      state.loading = false;
    }
  };

  const openCountModal = async (inventoryId) => {
    const inventory = state.inventories.find((item) => String(item.id) === String(inventoryId));
    if (!inventory) return;

    state.currentInventoryId = inventoryId;
    const products = await getProductsForInventory();
    state.products = products ?? [];
    const existingItems = state.itemsByInventory[inventoryId] || [];

    const rowsMarkup = products.map((product) => {
      const item = existingItems.find((entry) => String(entry.product_id) === String(product.id));
      const theoretical = Number(item?.stock_theorique ?? product.stock_actuel ?? 0);
      const physical = Number(item?.stock_reel ?? item?.stock_physique ?? theoretical ?? 0);
      const diff = physical - theoretical;

      return `
        <tr>
          <td>${product.nom}</td>
          <td>${product.code_barres || '—'}</td>
          <td>${theoretical}</td>
          <td><input type="number" min="0" step="1" value="${physical}" data-inventory-qty="${product.id}" /></td>
          <td>${diff > 0 ? '+' : ''}${diff}</td>
          <td>${product.unite || '—'}</td>
          <td>${product.emplacement || '—'}</td>
        </tr>
      `;
    }).join('');

    detailContent.innerHTML = `
      <div class="customer-detail-header">
        <div>
          <h4>${getReference(inventory)}</h4>
          <p>${formatDate(inventory.date_inventaire || inventory.created_at)}</p>
        </div>
        <span class="status-badge ${getStatusValue(inventory) === 'cloture' ? 'active' : 'warning'}">${getStatusLabel(inventory)}</span>
      </div>
      <div class="table-wrapper">
        <table class="data-table compact">
          <thead><tr><th>Produit</th><th>Code-barres</th><th>Théorique</th><th>Physique</th><th>Écart</th><th>Unité</th><th>Emplacement</th></tr></thead>
          <tbody>${rowsMarkup}</tbody>
        </table>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-inventory-detail-close>Fermer</button>
        <button type="button" class="btn btn-primary" data-inventory-save-count>Enregistrer le comptage</button>
      </div>
    `;

    detailContent.querySelector('[data-inventory-save-count]')?.addEventListener('click', async () => {
      try {
        const inputs = detailContent.querySelectorAll('[data-inventory-qty]');
        for (const input of inputs) {
          const productId = Number(input.dataset.inventoryQty);
          const product = state.products.find((entry) => String(entry.id) === String(productId));
          if (!product) continue;

          const theoretical = Number(product.stock_actuel ?? 0);
          const physical = Number(input.value ?? 0);
          if (Number.isNaN(physical) || physical < 0) {
            throw new Error('Quantité physique invalide pour un produit.');
          }

          await saveInventoryItem({
            inventory_id: inventoryId,
            product_id: productId,
            stock_theorique: theoretical,
            stock_reel: physical,
            difference: physical - theoretical,
            motif: 'Comptage d’inventaire'
          });
        }

        state.itemsByInventory[inventoryId] = await getInventoryItems(inventoryId);
        toggleDetailModal(false);
        await refreshInventoryData();
        showToast('Comptage enregistré.');
      } catch (error) {
        console.error(error);
        showToast(error?.message || 'Erreur lors de l’enregistrement du comptage.');
      }
    });

    toggleDetailModal(true);
  };

  const handleInventoryAction = async (button) => {
    const action = button.dataset.inventoryAction;
    const inventoryId = button.dataset.inventoryId;
    if (!action || !inventoryId) return;

    if (action === 'detail') {
      const inventory = state.inventories.find((item) => String(item.id) === String(inventoryId));
      if (!inventory) return;
      state.itemsByInventory[inventoryId] = await getInventoryItems(inventoryId);
      renderDetail(inventory);
      toggleDetailModal(true);
      return;
    }

    if (action === 'continue') {
      await openCountModal(inventoryId);
      return;
    }

    if (action === 'close') {
      try {
        const items = state.itemsByInventory[inventoryId] || (await getInventoryItems(inventoryId));
        if (!items.length) {
          showToast('Aucun produit n’a été compté pour cet inventaire.');
          return;
        }
        await closeInventory(inventoryId, items);
        showToast('Inventaire clôturé avec mise à jour du stock.');
        await refreshInventoryData();
      } catch (error) {
        console.error(error);
        showToast(error?.message || 'La clôture de l’inventaire a échoué.');
      }
    }
  };

  if (searchInput) {
    searchInput.addEventListener('input', renderRows);
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', renderRows);
  }

  if (addButton) {
    addButton.addEventListener('click', openCreateForm);
  }

  if (refreshButton) {
    refreshButton.addEventListener('click', refreshInventoryData);
  }

  if (modal) {
    modal.querySelectorAll('[data-inventory-close]').forEach((button) => {
      button.addEventListener('click', () => toggleModal(false));
    });

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());

      try {
        const inventory = await createInventory({
          date_inventaire: payload.date || new Date().toISOString(),
          notes: payload.notes || '',
          statut: 'en_cours'
        });

        if (inventory) {
          toggleModal(false);
          showToast('Inventaire créé avec succès.');
          await refreshInventoryData();
          await openCountModal(inventory.id);
        }
      } catch (error) {
        console.error(error);
        showToast(error?.message || 'Erreur lors de la création de l’inventaire.');
      }
    });
  }

  if (detailModal) {
    detailModal.querySelectorAll('[data-inventory-detail-close]').forEach((button) => {
      button.addEventListener('click', () => toggleDetailModal(false));
    });
  }

  root.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-inventory-action]');
    if (button) await handleInventoryAction(button);
  });

  await refreshInventoryData();
}

async function initializePromotionsPage() {
  const root = document.querySelector('[data-promotions-root]');
  if (!root) return;

  const state = {
    promotions: [],
    products: []
  };

  const searchInput = root.querySelector('[data-promotions-search]');
  const statusFilter = root.querySelector('[data-promotions-status-filter]');
  const tableBody = root.querySelector('[data-promotions-table-body]');
  const refreshButton = root.querySelector('[data-promotions-refresh]');
  const addButton = root.querySelector('[data-promotions-add]');
  const modal = root.querySelector('[data-promotions-modal]');
  const form = root.querySelector('[data-promotions-form]');
  const modalTitle = root.querySelector('#promotion-modal-title');
  const hiddenId = root.querySelector('[data-promotion-id]');
  const detailModal = root.querySelector('[data-promotions-detail-modal]');
  const detailContent = root.querySelector('[data-promotions-detail-content]');

  const formatCurrency = (value) => `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(value ?? 0))} FCFA`;
  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getProductMap = () => new Map((state.products || []).map((product) => [String(product.id), product]));

  const resolvePromotionStatus = (promotion) => {
    if (promotion?.statut === false) return 'desactive';
    const status = getPromotionStatus(promotion?.date_debut, promotion?.date_fin, promotion?.statut ?? true);
    return status;
  };

  const statusLabelMap = {
    a_venir: 'À venir',
    active: 'Active',
    expiree: 'Expirée',
    desactive: 'Désactivée'
  };

  const statusClassMap = {
    a_venir: 'warning',
    active: 'success',
    expiree: 'danger',
    desactive: 'neutral'
  };

  const normalizeDiscount = (promotion) => {
    const product = getProductMap().get(String(promotion?.product_id));
    const normalPrice = Number(product?.prix_vente ?? 0);
    const promoPrice = Number(promotion?.prix_promotionnel ?? 0);

    if (!normalPrice || !promoPrice || promoPrice >= normalPrice) {
      return 0;
    }

    return Math.round(((normalPrice - promoPrice) / normalPrice) * 100);
  };

  const renderStats = () => {
    const total = state.promotions.length;
    const active = state.promotions.filter((promotion) => resolvePromotionStatus(promotion) === 'active').length;
    const upcoming = state.promotions.filter((promotion) => resolvePromotionStatus(promotion) === 'a_venir').length;
    const expired = state.promotions.filter((promotion) => resolvePromotionStatus(promotion) === 'expiree').length;

    const totalNode = root.querySelector('[data-promotions-total]');
    const activeNode = root.querySelector('[data-promotions-active]');
    const upcomingNode = root.querySelector('[data-promotions-upcoming]');
    const expiredNode = root.querySelector('[data-promotions-expired]');

    if (totalNode) totalNode.textContent = String(total);
    if (activeNode) activeNode.textContent = String(active);
    if (upcomingNode) upcomingNode.textContent = String(upcoming);
    if (expiredNode) expiredNode.textContent = String(expired);
  };

  const renderRows = () => {
    const searchTerm = (searchInput?.value || '').trim().toLowerCase();
    const statusTerm = statusFilter?.value || 'all';
    const productMap = getProductMap();

    const filtered = state.promotions.filter((promotion) => {
      const status = resolvePromotionStatus(promotion);
      const productName = productMap.get(String(promotion.product_id))?.nom || 'Produit inconnu';
      const haystack = `${promotion.nom || ''} ${productName}`.toLowerCase();
      const matchesSearch = !searchTerm || haystack.includes(searchTerm);
      const matchesStatus = statusTerm === 'all' || status === statusTerm;
      return matchesSearch && matchesStatus;
    });

    if (!tableBody) return;

    if (!filtered.length) {
      tableBody.innerHTML = '<tr><td colspan="8" class="empty-state">Aucune promotion ne correspond aux filtres.</td></tr>';
      return;
    }

    tableBody.innerHTML = filtered.map((promotion) => {
      const status = resolvePromotionStatus(promotion);
      const product = productMap.get(String(promotion.product_id));
      const discountPercent = normalizeDiscount(promotion);
      return `
        <tr>
          <td>${promotion.nom || 'Sans nom'}</td>
          <td>${product?.nom || 'Produit'}</td>
          <td>${discountPercent ? `${discountPercent}%` : '—'}</td>
          <td>${formatCurrency(promotion.prix_promotionnel)}</td>
          <td>${formatDate(promotion.date_debut)}</td>
          <td>${formatDate(promotion.date_fin)}</td>
          <td><span class="status-badge ${statusClassMap[status] || 'neutral'}">${statusLabelMap[status] || 'Inconnu'}</span></td>
          <td>
            <div class="table-actions">
              <button type="button" class="table-action-btn primary" data-promotion-action="view" data-promotion-id="${promotion.id}">Voir</button>
              <button type="button" class="table-action-btn secondary" data-promotion-action="edit" data-promotion-id="${promotion.id}">Modifier</button>
              <button type="button" class="table-action-btn ${(promotion.statut === false ? 'primary' : 'warning')}" data-promotion-action="toggle" data-promotion-id="${promotion.id}">${promotion.statut === false ? 'Activer' : 'Désactiver'}</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  };

  const toggleModal = (show) => {
    if (!modal) return;
    modal.classList.toggle('hidden', !show);
    modal.setAttribute('aria-hidden', String(!show));
  };

  const toggleDetailModal = (show) => {
    if (!detailModal) return;
    detailModal.classList.toggle('hidden', !show);
    detailModal.setAttribute('aria-hidden', String(!show));
  };

  const populateProducts = (selectedId = '') => {
    const productSelect = form?.querySelector('[name="product_id"]');
    if (!productSelect) return;

    productSelect.innerHTML = '<option value="">Sélectionner un produit</option>' + state.products.map((product) => `
      <option value="${product.id}" ${selectedId && String(product.id) === String(selectedId) ? 'selected' : ''}>${product.nom}</option>
    `).join('');
  };

  const openForm = (promotion = null) => {
    if (!form) return;
    form.reset();

    if (hiddenId) hiddenId.value = promotion?.id ?? '';
    if (modalTitle) {
      modalTitle.textContent = promotion ? 'Modifier la promotion' : 'Nouvelle promotion';
    }

    populateProducts(promotion?.product_id ?? '');

    if (promotion) {
      const productSelect = form.querySelector('[name="product_id"]');
      if (productSelect) {
        productSelect.value = promotion.product_id ?? '';
      }
      form.querySelector('[name="nom"]').value = promotion.nom ?? '';
      form.querySelector('[name="prix_promotionnel"]').value = promotion.prix_promotionnel ?? '';
      form.querySelector('[name="date_debut"]').value = promotion.date_debut ? new Date(promotion.date_debut).toISOString().slice(0, 10) : '';
      form.querySelector('[name="date_fin"]').value = promotion.date_fin ? new Date(promotion.date_fin).toISOString().slice(0, 10) : '';
      form.querySelector('[name="statut"]').checked = promotion.statut !== false;
    } else {
      const today = new Date().toISOString().slice(0, 10);
      form.querySelector('[name="date_debut"]').value = today;
      form.querySelector('[name="date_fin"]').value = today;
      form.querySelector('[name="statut"]').checked = true;
    }

    toggleModal(true);
  };

  const openDetail = (promotionId) => {
    const promotion = state.promotions.find((item) => String(item.id) === String(promotionId));
    if (!promotion || !detailContent) return;

    const product = getProductMap().get(String(promotion.product_id));
    const normalPrice = Number(product?.prix_vente ?? 0);
    const promoPrice = Number(promotion.prix_promotionnel ?? 0);
    const discountPercent = Math.round(((normalPrice - promoPrice) / normalPrice) * 100) || 0;
    const status = resolvePromotionStatus(promotion);
    const statusText = statusLabelMap[status] || 'Inconnu';

    detailContent.innerHTML = `
      <div class="customer-detail-header">
        <div>
          <h4>${promotion.nom || 'Promotion'}</h4>
          <p>${product?.nom || 'Produit inconnu'}</p>
        </div>
        <span class="status-badge ${statusClassMap[status] || 'neutral'}">${statusText}</span>
      </div>
      <div class="detail-grid">
        <div><strong>Produit</strong><p>${product?.nom || 'Produit inconnu'}</p></div>
        <div><strong>Prix normal</strong><p>${normalPrice ? formatCurrency(normalPrice) : '—'}</p></div>
        <div><strong>Prix promotionnel</strong><p>${formatCurrency(promoPrice)}</p></div>
        <div><strong>Réduction</strong><p>${discountPercent}%</p></div>
        <div><strong>Début</strong><p>${formatDate(promotion.date_debut)}</p></div>
        <div><strong>Fin</strong><p>${formatDate(promotion.date_fin)}</p></div>
      </div>
    `;

    toggleDetailModal(true);
  };

  const refreshPromotions = async () => {
    try {
      const [promotions, products] = await Promise.all([
        getPromotions(),
        getProducts()
      ]);

      state.promotions = promotions ?? [];
      state.products = products ?? [];

      renderStats();
      renderRows();
    } catch (error) {
      console.error('Erreur Promotions Supabase:', error);
      showToast(error?.message || 'Impossible de charger les promotions.');
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="8" class="empty-state">Erreur lors du chargement des promotions.</td></tr>';
      }
    }
  };

  const handleAction = async (button) => {
    const action = button.dataset.promotionAction;
    const promotionId = button.dataset.promotionId;
    if (!action || !promotionId) return;

    const promotion = state.promotions.find((item) => String(item.id) === String(promotionId));
    if (!promotion) return;

    if (action === 'view') {
      openDetail(promotionId);
      return;
    }

    if (action === 'edit') {
      openForm(promotion);
      return;
    }

    if (action === 'toggle') {
      const confirmText = promotion.statut === false ? 'Activer cette promotion ?' : 'Désactiver cette promotion ?';
      if (!window.confirm(confirmText)) return;

      try {
        if (promotion.statut === false) {
          await activatePromotion(promotionId);
          showToast('Promotion activée.');
        } else {
          await deactivatePromotion(promotionId);
          showToast('Promotion désactivée.');
        }
        await refreshPromotions();
      } catch (error) {
        console.error(error);
        showToast(error?.message || 'Impossible de modifier le statut de la promotion.');
      }
    }
  };

  if (searchInput) {
    searchInput.addEventListener('input', renderRows);
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', renderRows);
  }

  if (refreshButton) {
    refreshButton.addEventListener('click', refreshPromotions);
  }

  if (addButton) {
    addButton.addEventListener('click', () => openForm());
  }

  if (modal) {
    modal.querySelectorAll('[data-promotion-close]').forEach((button) => {
      button.addEventListener('click', () => toggleModal(false));
    });

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      const promotionId = hiddenId?.value || null;

      try {
        const productId = Number(payload.product_id);
        const nom = String(payload.nom ?? '').trim();
        const prixPromotionnel = Number(payload.prix_promotionnel ?? 0);
        const dateDebut = payload.date_debut || null;
        const dateFin = payload.date_fin || null;

        if (!productId) {
          throw new Error('Veuillez sélectionner un produit.');
        }

        if (!nom) {
          throw new Error('Le nom de la promotion est obligatoire.');
        }

        if (!Number.isFinite(prixPromotionnel) || prixPromotionnel <= 0) {
          throw new Error('Le prix promotionnel doit être supérieur à 0.');
        }

        if (dateDebut && dateFin && new Date(dateFin) < new Date(dateDebut)) {
          throw new Error('La date de fin ne peut pas être antérieure à la date de début.');
        }

        const record = {
          nom,
          product_id: productId,
          prix_promotionnel: prixPromotionnel,
          date_debut: dateDebut || null,
          date_fin: dateFin || null,
          statut: form.querySelector('[name="statut"]').checked
        };

        if (promotionId) {
          await updatePromotion(promotionId, record);
          showToast('Promotion modifiée avec succès.');
        } else {
          await createPromotion(record);
          showToast('Promotion créée avec succès.');
        }

        toggleModal(false);
        await refreshPromotions();
      } catch (error) {
        console.error(error);
        showToast(error?.message || 'Erreur lors de l’enregistrement de la promotion.');
      }
    });
  }

  if (detailModal) {
    detailModal.querySelectorAll('[data-promotion-detail-close]').forEach((button) => {
      button.addEventListener('click', () => toggleDetailModal(false));
    });
  }

  root.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-promotion-action]');
    if (button) {
      await handleAction(button);
    }
  });

  await refreshPromotions();
}

async function initializeReportsPage() {
  const root = document.querySelector('[data-reports-root]');
  if (!root) return;

  const state = {
    period: 'month',
    charts: {},
    exportRows: []
  };

  const periodSelect = root.querySelector('[data-reports-period]');
  const customStartInput = root.querySelector('[data-reports-custom-start]');
  const customEndInput = root.querySelector('[data-reports-custom-end]');
  const loadingEl = root.querySelector('[data-reports-loading]');
  const errorEl = root.querySelector('[data-reports-error]');
  const emptyState = root.querySelector('[data-reports-empty]');
  const refreshButton = root.querySelector('[data-action="refresh"]');
  const exportButton = root.querySelector('[data-action="export-report"]');

  const formatCurrency = (value) => `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(value ?? 0))} FCFA`;
  const formatNumber = (value) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(value ?? 0));

  const setLoading = (isLoading) => {
    if (loadingEl) {
      loadingEl.classList.toggle('hidden', !isLoading);
    }
    if (emptyState) {
      emptyState.classList.toggle('hidden', true);
    }
  };

  const setError = (message) => {
    if (errorEl) {
      errorEl.textContent = message || 'Une erreur est survenue lors du chargement du rapport.';
      errorEl.classList.toggle('hidden', !message);
    }
  };

  const toggleCustomFields = () => {
    const isCustom = (periodSelect?.value || 'month') === 'custom';
    customStartInput?.classList.toggle('hidden', !isCustom);
    customEndInput?.classList.toggle('hidden', !isCustom);
  };

  const destroyCharts = () => {
    Object.values(state.charts).forEach((chart) => {
      if (chart) {
        chart.destroy();
      }
    });
    state.charts = {};
  };

  const updateSummaryCards = (report) => {
    const revenueNode = root.querySelector('[data-reports-revenue]');
    const revenueMetaNode = root.querySelector('[data-reports-revenue-meta]');
    const salesCountNode = root.querySelector('[data-reports-sales-count]');
    const averageBasketNode = root.querySelector('[data-reports-average-basket]');
    const purchasesTotalNode = root.querySelector('[data-reports-purchases-total]');
    const purchasesMetaNode = root.querySelector('[data-reports-purchases-meta]');
    const marginNode = root.querySelector('[data-reports-margin]');
    const productsSoldNode = root.querySelector('[data-reports-products-sold]');
    const purchasesCountNode = root.querySelector('[data-reports-purchases-count]');
    const purchasesAmountNode = root.querySelector('[data-reports-purchases-amount]');
    const suppliersCountNode = root.querySelector('[data-reports-suppliers-count]');
    const totalProductsNode = root.querySelector('[data-reports-total-products]');
    const lowStockNode = root.querySelector('[data-reports-low-stock]');
    const outOfStockNode = root.querySelector('[data-reports-out-of-stock]');
    const stockValueNode = root.querySelector('[data-reports-stock-value]');

    if (revenueNode) revenueNode.textContent = formatCurrency(report?.revenue ?? 0);
    if (revenueMetaNode) revenueMetaNode.textContent = `${formatNumber(report?.salesCount ?? 0)} ventes`;
    if (salesCountNode) salesCountNode.textContent = formatNumber(report?.salesCount ?? 0);
    if (averageBasketNode) averageBasketNode.textContent = formatCurrency(report?.averageBasket ?? 0);
    if (purchasesTotalNode) purchasesTotalNode.textContent = formatCurrency(report?.purchasesReport?.totalAmount ?? 0);
    if (purchasesMetaNode) purchasesMetaNode.textContent = `${report?.purchasesReport?.purchaseCount ?? 0} achats`;
    if (marginNode) marginNode.textContent = formatCurrency(report?.estimatedMargin ?? 0);
    if (productsSoldNode) productsSoldNode.textContent = formatNumber(report?.productsSold ?? 0);
    if (purchasesCountNode) purchasesCountNode.textContent = formatNumber(report?.purchasesReport?.purchaseCount ?? 0);
    if (purchasesAmountNode) purchasesAmountNode.textContent = formatCurrency(report?.purchasesReport?.totalAmount ?? 0);
    if (suppliersCountNode) suppliersCountNode.textContent = formatNumber(report?.purchasesReport?.suppliersCount ?? 0);
    if (totalProductsNode) totalProductsNode.textContent = formatNumber(report?.stockReport?.totalProducts ?? 0);
    if (lowStockNode) lowStockNode.textContent = formatNumber(report?.stockReport?.lowStockCount ?? 0);
    if (outOfStockNode) outOfStockNode.textContent = formatNumber(report?.stockReport?.outOfStockCount ?? 0);
    if (stockValueNode) stockValueNode.textContent = formatCurrency(report?.stockReport?.stockValue ?? 0);
  };

  const renderTopProducts = (rows = []) => {
    const tbody = root.querySelector('[data-reports-top-products]');
    if (!tbody) return;

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="4">Aucune donnée.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map((row) => `
      <tr>
        <td>${row.product || 'Produit'}</td>
        <td>${formatNumber(row.quantity ?? 0)}</td>
        <td>${formatCurrency(row.revenue ?? 0)}</td>
        <td>${formatNumber(row.salesCount ?? 0)}</td>
      </tr>
    `).join('');
  };

  const renderPaymentTable = (rows = []) => {
    const tbody = root.querySelector('[data-reports-payment-table]');
    if (!tbody) return;

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="3">Aucune donnée.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map((row) => `
      <tr>
        <td>${String(row.mode || 'Autres').replace(/_/g, ' ')}</td>
        <td>${formatNumber(row.count ?? 0)}</td>
        <td>${formatCurrency(row.total ?? 0)}</td>
      </tr>
    `).join('');
  };

  const renderStockTable = (rows = []) => {
    const tbody = root.querySelector('[data-reports-stock-table]');
    if (!tbody) return;

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5">Aucun produit à réapprovisionner.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map((row) => `
      <tr>
        <td>${row.product || 'Produit'}</td>
        <td>${formatNumber(row.stockActuel ?? 0)}</td>
        <td>${formatNumber(row.stockMinimum ?? 0)}</td>
        <td>${formatNumber(row.ecart ?? 0)}</td>
        <td>${row.fournisseur || '—'}</td>
      </tr>
    `).join('');
  };

  const renderCharts = ({ salesByDay = [], salesByCategory = [], paymentMethods = [], purchasesByPeriod = [] }) => {
    const salesCanvas = root.querySelector('[data-reports-sales-chart]');
    const revenueCanvas = root.querySelector('[data-reports-revenue-chart]');
    const categoryCanvas = root.querySelector('[data-reports-category-chart]');
    const purchaseCanvas = root.querySelector('[data-reports-purchase-chart]');

    if (salesCanvas) {
      const ctx = salesCanvas.getContext('2d');
      if (state.charts.salesChart) state.charts.salesChart.destroy();
      state.charts.salesChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: salesByDay.map((entry) => entry.label),
          datasets: [{
            label: 'Nombre de ventes',
            data: salesByDay.map((entry) => entry.salesCount),
            backgroundColor: 'rgba(37, 99, 235, 0.6)',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: true } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
      });
    }

    if (revenueCanvas) {
      const ctx = revenueCanvas.getContext('2d');
      if (state.charts.revenueChart) state.charts.revenueChart.destroy();
      state.charts.revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: salesByDay.map((entry) => entry.label),
          datasets: [{
            label: 'Chiffre d’affaires',
            data: salesByDay.map((entry) => entry.revenue),
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22, 163, 74, 0.15)',
            tension: 0.35,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    if (categoryCanvas) {
      const ctx = categoryCanvas.getContext('2d');
      if (state.charts.categoryChart) state.charts.categoryChart.destroy();
      state.charts.categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: salesByCategory.map((entry) => entry.category),
          datasets: [{
            data: salesByCategory.map((entry) => entry.revenue),
            backgroundColor: ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#14b8a6']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }

    if (purchaseCanvas) {
      const ctx = purchaseCanvas.getContext('2d');
      if (state.charts.purchaseChart) state.charts.purchaseChart.destroy();
      state.charts.purchaseChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: purchasesByPeriod.map((entry) => entry.label),
          datasets: [{
            label: 'Achats',
            data: purchasesByPeriod.map((entry) => entry.value),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            tension: 0.35,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true } }
        }
      });
    }
  };

  const buildExportRows = ({ topProducts, salesByCategory, paymentMethods, purchasesReport, stockReport }) => {
    const rows = [
      ['Type', 'Libellé', 'Quantité', 'Montant'],
      ['Métrique', 'Chiffre d’affaires', '', (state.report?.revenue ?? 0)],
      ['Métrique', 'Nombre de ventes', state.report?.salesCount ?? 0, '']
    ];

    topProducts.forEach((entry) => {
      rows.push(['Produit', entry.product, entry.quantity, entry.revenue]);
    });

    salesByCategory.forEach((entry) => {
      rows.push(['Catégorie', entry.category, entry.quantity, entry.revenue]);
    });

    paymentMethods.forEach((entry) => {
      rows.push(['Paiement', entry.mode, entry.count, entry.total]);
    });

    rows.push(['Achats', 'Nombre', purchasesReport.purchaseCount, '']);
    rows.push(['Achats', 'Montant total', '', purchasesReport.totalAmount]);
    stockReport.restockProducts.forEach((entry) => {
      rows.push(['Réapprovisionnement', entry.product, entry.stockActuel, entry.ecart]);
    });

    return rows;
  };

  const loadReportsData = async () => {
    const periodValue = periodSelect?.value || 'month';
    state.period = periodValue;
    const customFrom = customStartInput?.value || null;
    const customTo = customEndInput?.value || null;

    setLoading(true);
    setError('');

    try {
      const [metrics, salesByDay, topProducts, salesByCategory, paymentMethods, purchasesReport, stockReport] = await Promise.all([
        getDashboardMetrics(periodValue, customFrom, customTo),
        getSalesByDay(periodValue, customFrom, customTo),
        getTopSellingProducts(periodValue, customFrom, customTo),
        getSalesByCategory(periodValue, customFrom, customTo),
        getPaymentMethodsReport(periodValue, customFrom, customTo),
        getPurchasesReport(periodValue, customFrom, customTo),
        getStockReport()
      ]);

      state.report = metrics;
      state.exportRows = buildExportRows({
        topProducts,
        salesByCategory,
        paymentMethods,
        purchasesReport,
        stockReport
      });

      updateSummaryCards(metrics);
      renderTopProducts(topProducts);
      renderPaymentTable(paymentMethods);
      renderStockTable(stockReport.restockProducts);
      renderCharts({
        salesByDay,
        salesByCategory,
        paymentMethods,
        purchasesByPeriod: purchasesReport.byPeriod
      });

      if (!salesByDay.length && !topProducts.length && !salesByCategory.length && !paymentMethods.length && !purchasesReport.purchaseCount && !stockReport.restockProducts.length) {
        emptyState?.classList.remove('hidden');
      } else {
        emptyState?.classList.add('hidden');
      }
    } catch (error) {
      console.error('Erreur Rapports Supabase:', error);
      const message = error?.message || 'Impossible de charger le rapport demandé.';
      setError(message);
      showToast(message);
      destroyCharts();
      renderTopProducts([]);
      renderPaymentTable([]);
      renderStockTable([]);
      updateSummaryCards({
        revenue: 0,
        salesCount: 0,
        averageBasket: 0,
        purchasesReport: { totalAmount: 0, purchaseCount: 0, suppliersCount: 0 },
        estimatedMargin: 0,
        productsSold: 0,
        stockReport: { totalProducts: 0, lowStockCount: 0, outOfStockCount: 0, stockValue: 0, restockProducts: [] }
      });
    } finally {
      setLoading(false);
    }
  };

  toggleCustomFields();

  periodSelect?.addEventListener('change', () => {
    toggleCustomFields();
    if (periodSelect.value !== 'custom') {
      loadReportsData();
    }
  });

  customStartInput?.addEventListener('change', () => {
    if (periodSelect?.value === 'custom' && customStartInput.value && customEndInput?.value) {
      loadReportsData();
    }
  });

  customEndInput?.addEventListener('change', () => {
    if (periodSelect?.value === 'custom' && customStartInput?.value && customEndInput.value) {
      loadReportsData();
    }
  });

  refreshButton?.addEventListener('click', loadReportsData);

  exportButton?.addEventListener('click', () => {
    if (!state.exportRows || !state.exportRows.length) {
      showToast('Aucune donnée à exporter pour cette période.');
      return;
    }

    const fileName = `rapport-${state.period || 'periode'}.csv`;
    const exported = exportCsv(state.exportRows, fileName);
    if (exported) {
      showToast('Export CSV généré.');
    }
  });

  await loadReportsData();
}

async function initializeSuppliersPage() {
  const root = document.querySelector('[data-suppliers-root]');
  if (!root) return;

  const state = {
    suppliers: [],
    products: [],
    purchases: [],
    hasStatusField: false,
    loading: false
  };

  const searchInput = root.querySelector('[data-supplier-search]');
  const refreshButton = root.querySelector('[data-supplier-refresh]');
  const addButton = root.querySelector('[data-supplier-add]');
  const tableBody = root.querySelector('[data-suppliers-table-body]');
  const statsGrid = root.querySelector('[data-suppliers-stats]');
  const modal = root.querySelector('[data-supplier-modal]');
  const form = root.querySelector('[data-supplier-form]');
  const hiddenId = root.querySelector('[data-supplier-id]');
  const modalTitle = document.querySelector('#supplier-modal-title');
  const statusField = root.querySelector('[data-supplier-status-field]');
  const detailModal = root.querySelector('[data-supplier-detail-modal]');
  const detailContent = root.querySelector('[data-supplier-detail-content]');

  const formatMoney = (value) => `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(value ?? 0))} FCFA`;
  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const statusLabel = (supplier) => {
    if (!state.hasStatusField) return 'Actif';
    return supplier?.statut === false ? 'Inactif' : 'Actif';
  };

  const renderStatusField = () => {
    if (!statusField) return;
    if (!state.hasStatusField) {
      statusField.innerHTML = '';
      return;
    }

    statusField.innerHTML = `
      <label class="field-group checkbox-field">
        <input type="checkbox" name="statut" checked />
        <span>Fournisseur actif</span>
      </label>
    `;
  };

  const openModal = (open) => {
    if (!modal) return;
    modal.classList.toggle('hidden', !open);
    modal.setAttribute('aria-hidden', String(!open));
  };

  const openDetailModal = (open) => {
    if (!detailModal) return;
    detailModal.classList.toggle('hidden', !open);
    detailModal.setAttribute('aria-hidden', String(!open));
  };

  const renderStats = () => {
    if (!statsGrid) return;

    const totalSuppliers = state.suppliers.length;
    const activeSuppliers = state.hasStatusField
      ? state.suppliers.filter((supplier) => supplier.statut !== false).length
      : totalSuppliers;
    const suppliersWithProducts = state.suppliers.filter((supplier) =>
      state.products.some((product) => String(product.supplier_id) === String(supplier.id))
    ).length;
    const suppliersWithPurchases = state.suppliers.filter((supplier) =>
      state.purchases.some((purchase) => String(purchase.supplier_id) === String(supplier.id))
    ).length;

    statsGrid.innerHTML = `
      <article class="stat-card neutral">
        <span>Total fournisseurs</span>
        <strong>${totalSuppliers}</strong>
        <small>fournisseurs enregistrés</small>
      </article>
      <article class="stat-card primary">
        <span>Fournisseurs actifs</span>
        <strong>${activeSuppliers}</strong>
        <small>actifs</small>
      </article>
      <article class="stat-card success">
        <span>Fournisseurs liés à des produits</span>
        <strong>${suppliersWithProducts}</strong>
        <small>liens catalogues</small>
      </article>
      <article class="stat-card warning">
        <span>Fournisseurs ayant des achats</span>
        <strong>${suppliersWithPurchases}</strong>
        <small>transactions</small>
      </article>
    `;
  };

  const renderRows = () => {
    if (!tableBody) return;

    const searchTerm = String(searchInput?.value || '').trim().toLowerCase();
    const filtered = state.suppliers.filter((supplier) => {
      if (!searchTerm) return true;
      const haystack = [supplier.nom, supplier.contact, supplier.telephone, supplier.email, supplier.adresse]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(searchTerm);
    });

    if (!filtered.length) {
      tableBody.innerHTML = '<tr><td colspan="8" class="empty-state">Aucun fournisseur trouvé.</td></tr>';
      return;
    }

    tableBody.innerHTML = filtered.map((supplier) => {
      const productCount = state.products.filter((product) => String(product.supplier_id) === String(supplier.id)).length;
      const label = statusLabel(supplier);
      const badgeClass = state.hasStatusField && supplier.statut === false ? 'inactive' : 'active';

      const actions = [
        `<button type="button" class="table-action-btn primary" data-supplier-action="view" data-supplier-id="${supplier.id}">Voir détails</button>`,
        `<button type="button" class="table-action-btn primary" data-supplier-action="edit" data-supplier-id="${supplier.id}">Modifier</button>`
      ];

      if (state.hasStatusField) {
        actions.push(`<button type="button" class="table-action-btn ${supplier.statut === false ? 'primary' : 'danger'}" data-supplier-action="toggle-status" data-supplier-id="${supplier.id}">${supplier.statut === false ? 'Réactiver' : 'Désactiver'}</button>`);
      }

      return `
        <tr>
          <td>${supplier.nom || '—'}</td>
          <td>${supplier.contact || '—'}</td>
          <td>${supplier.telephone || '—'}</td>
          <td>${supplier.email || '—'}</td>
          <td>${supplier.adresse || '—'}</td>
          <td><span class="status-badge ${badgeClass}">${label}</span></td>
          <td>${productCount}</td>
          <td>
            <div class="table-actions">
              ${actions.join('')}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  };

  const resetForm = () => {
    if (!form) return;
    form.reset();
    if (hiddenId) hiddenId.value = '';
    if (modalTitle) modalTitle.textContent = 'Ajouter un fournisseur';
    renderStatusField();
  };

  const openEditor = (supplier = null) => {
    if (!form) return;
    resetForm();

    if (supplier) {
      if (modalTitle) modalTitle.textContent = 'Modifier le fournisseur';
      if (hiddenId) hiddenId.value = supplier.id;

      const mapping = {
        nom: supplier.nom || '',
        contact: supplier.contact || '',
        telephone: supplier.telephone || '',
        email: supplier.email || '',
        adresse: supplier.adresse || ''
      };

      Object.entries(mapping).forEach(([field, value]) => {
        const fieldNode = form.querySelector(`[name="${field}"]`);
        if (fieldNode) fieldNode.value = value;
      });

      if (state.hasStatusField) {
        const statutField = form.querySelector('[name="statut"]');
        if (statutField) statutField.checked = supplier.statut !== false;
      }
    }

    openModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form) return;

    const formData = new FormData(form);
    const payload = {
      nom: String(formData.get('nom') || '').trim(),
      contact: String(formData.get('contact') || '').trim(),
      telephone: String(formData.get('telephone') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      adresse: String(formData.get('adresse') || '').trim()
    };

    if (!payload.nom) {
      showToast('Le nom du fournisseur est obligatoire.');
      return;
    }

    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      showToast('L’adresse email du fournisseur est invalide.');
      return;
    }

    if (state.hasStatusField) {
      payload.statut = Boolean(formData.get('statut'));
    }

    const supplierId = hiddenId?.value;

    try {
      if (supplierId) {
        await updateSupplier(supplierId, payload);
        showToast('Fournisseur mis à jour.');
      } else {
        await createSupplier(payload);
        showToast('Fournisseur ajouté avec succès.');
      }

      openModal(false);
      resetForm();
      await loadSuppliersData();
    } catch (error) {
      console.error('Erreur fournisseur:', error);
      showToast(error?.message || 'Erreur lors de l’enregistrement du fournisseur.');
    }
  };

  const openDetail = async (supplierId) => {
    if (!detailContent) return;

    const supplier = state.suppliers.find((item) => String(item.id) === String(supplierId));
    if (!supplier) return;

    try {
      const [supplierProducts, supplierPurchases] = await Promise.all([
        getSupplierProducts(supplierId),
        getSupplierPurchases(supplierId)
      ]);

      const purchaseTotal = supplierPurchases.reduce((sum, purchase) => sum + Number(purchase.montant_total ?? 0), 0);
      const lastPurchase = supplierPurchases[0] ?? null;

      detailContent.innerHTML = `
        <div class="customer-detail-header">
          <div>
            <h4>${supplier.nom || 'Fournisseur'}</h4>
            <p>${supplier.email || 'Aucun email'}</p>
          </div>
          <span class="status-badge ${state.hasStatusField && supplier.statut === false ? 'inactive' : 'active'}">${statusLabel(supplier)}</span>
        </div>

        <div class="detail-grid">
          <div><strong>Contact</strong><p>${supplier.contact || '—'}</p></div>
          <div><strong>Téléphone</strong><p>${supplier.telephone || '—'}</p></div>
          <div><strong>Email</strong><p>${supplier.email || '—'}</p></div>
          <div><strong>Adresse</strong><p>${supplier.adresse || '—'}</p></div>
          <div><strong>Achats associés</strong><p>${supplierPurchases.length}</p></div>
          <div><strong>Montant total</strong><p>${formatMoney(purchaseTotal)}</p></div>
          <div><strong>Dernier achat</strong><p>${lastPurchase ? `${lastPurchase.numero_facture || '—'} • ${formatDate(lastPurchase.date_achat)}` : 'Aucun achat'}</p></div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h3>Produits du fournisseur</h3>
          </div>
          <div class="table-wrapper">
            <table class="data-table compact">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Code-barres</th>
                  <th>Prix achat</th>
                  <th>Prix vente</th>
                  <th>Stock</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${supplierProducts.length ? supplierProducts.map((product) => `
                  <tr>
                    <td>${product.nom || '—'}</td>
                    <td>${product.code_barres || '—'}</td>
                    <td>${formatMoney(product.prix_achat ?? 0)}</td>
                    <td>${formatMoney(product.prix_vente ?? 0)}</td>
                    <td>${Number(product.stock_actuel ?? 0)}</td>
                    <td>${product.statut ? 'Actif' : 'Inactif'}</td>
                    <td><button type="button" class="table-action-btn primary" data-product-detail-id="${product.id}">Voir</button></td>
                  </tr>
                `).join('') : '<tr><td colspan="7" class="empty-state">Aucun produit associé.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h3>Historique des achats</h3>
          </div>
          <div class="table-wrapper">
            <table class="data-table compact">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                ${supplierPurchases.length ? supplierPurchases.map((purchase) => `
                  <tr>
                    <td>${purchase.numero_facture || '—'}</td>
                    <td>${formatDate(purchase.date_achat)}</td>
                    <td>${formatMoney(purchase.montant_total ?? 0)}</td>
                    <td>${purchase.statut || '—'}</td>
                  </tr>
                `).join('') : '<tr><td colspan="4" class="empty-state">Aucun achat enregistré.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;

      openDetailModal(true);
    } catch (error) {
      console.error('Erreur détail fournisseur:', error);
      showToast(error?.message || 'Impossible d’afficher le détail du fournisseur.');
    }
  };

  const loadSuppliersData = async () => {
    if (state.loading) return;
    state.loading = true;

    try {
      tableBody.innerHTML = '<tr><td colspan="8" class="empty-state">Chargement des fournisseurs...</td></tr>';
      const [suppliers, products] = await Promise.all([
        getSuppliers(),
        getProducts()
      ]);

      let purchases = [];
      if (supabase) {
        const { data, error } = await supabase.from('purchases').select('*');
        if (error) {
          throw error;
        }
        purchases = data ?? [];
      }

      state.suppliers = suppliers ?? [];
      state.products = products ?? [];
      state.purchases = purchases ?? [];
      state.hasStatusField = state.suppliers.some((supplier) => Object.prototype.hasOwnProperty.call(supplier, 'statut'));

      renderStatusField();
      renderStats();
      renderRows();
    } catch (error) {
      console.error('Erreur chargement fournisseurs:', error);
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="8" class="empty-state">Impossible de charger les fournisseurs.</td></tr>';
      }
      showToast(error?.message || 'Erreur de chargement des fournisseurs.');
    } finally {
      state.loading = false;
    }
  };

  if (addButton) {
    addButton.addEventListener('click', () => openEditor());
  }

  if (searchInput) {
    searchInput.addEventListener('input', renderRows);
  }

  if (refreshButton) {
    refreshButton.addEventListener('click', () => loadSuppliersData());
  }

  if (form) {
    form.addEventListener('submit', handleSubmit);
  }

  document.querySelectorAll('[data-supplier-close]').forEach((button) => {
    button.addEventListener('click', () => {
      openModal(false);
      resetForm();
    });
  });

  document.querySelectorAll('[data-supplier-detail-close]').forEach((button) => {
    button.addEventListener('click', () => openDetailModal(false));
  });

  tableBody?.addEventListener('click', async (event) => {
    const trigger = event.target.closest('[data-supplier-action]');
    if (!trigger) return;

    const supplierId = trigger.dataset.supplierId;
    const action = trigger.dataset.supplierAction;
    const supplier = state.suppliers.find((item) => String(item.id) === String(supplierId));
    if (!supplier) return;

    try {
      if (action === 'view') {
        await openDetail(supplier.id);
        return;
      }

      if (action === 'edit') {
        openEditor(supplier);
        return;
      }

      if (action === 'toggle-status') {
        if (!state.hasStatusField) {
          showToast('La table suppliers ne dispose pas de colonne statut dans le schéma actuel.');
          return;
        }

        if (supplier.statut === false) {
          await activateSupplier(supplier.id);
          showToast('Fournisseur réactivé.');
        } else {
          const confirmed = window.confirm('Désactiver ce fournisseur ? Il restera visible dans l’historique des achats et des produits.');
          if (!confirmed) return;
          await deactivateSupplier(supplier.id);
          showToast('Fournisseur désactivé.');
        }

        await loadSuppliersData();
      }
    } catch (error) {
      console.error('Erreur action fournisseur:', error);
      showToast(error?.message || 'Une erreur est survenue sur le fournisseur.');
    }
  });

  detailContent?.addEventListener('click', async (event) => {
    const productButton = event.target.closest('[data-product-detail-id]');
    if (!productButton) return;

    const productId = productButton.dataset.productDetailId;
    if (!productId) return;

    try {
      const { getProductById } = await import('./services/productsService.js');
      const product = await getProductById(productId);
      if (!product) {
        showToast('Produit introuvable.');
        return;
      }

      const summary = `Produit: ${product.nom || '—'}\nCode-barres: ${product.code_barres || '—'}\nPrix achat: ${formatMoney(product.prix_achat ?? 0)}\nPrix vente: ${formatMoney(product.prix_vente ?? 0)}\nStock: ${Number(product.stock_actuel ?? 0)}`;
      window.alert(summary);
    } catch (error) {
      console.error('Erreur produit fournisseur:', error);
      showToast(error?.message || 'Impossible d’afficher le produit.');
    }
  });

  loadSuppliersData();
}

async function initializePurchasesPage() {
  const root = document.querySelector('[data-purchases-root]');
  if (!root) return;

  const state = {
    purchases: [],
    suppliers: [],
    products: [],
    purchasesItems: {},
    loading: false,
    draftLines: [],
    editingId: null
  };

  const searchInput = root.querySelector('[data-purchase-search]');
  const supplierFilter = root.querySelector('[data-purchase-filter-supplier]');
  const statusFilter = root.querySelector('[data-purchase-filter-status]');
  const refreshButton = root.querySelector('[data-purchase-refresh]');
  const addButton = root.querySelector('[data-purchase-add]');
  const tableBody = root.querySelector('[data-purchases-table-body]');
  const statsGrid = root.querySelector('[data-purchases-stats]');
  const modal = root.querySelector('[data-purchase-modal]');
  const form = root.querySelector('[data-purchase-form]');
  const modalTitle = document.querySelector('#purchase-modal-title');
  const supplierSelect = root.querySelector('[data-purchase-supplier]');
  const purchaseDate = root.querySelector('[data-purchase-date]');
  const purchaseReference = root.querySelector('[data-purchase-reference]');
  const purchaseNotes = root.querySelector('[data-purchase-notes]');
  const itemsBody = root.querySelector('[data-purchase-items-body]');
  const subtotalEl = root.querySelector('[data-purchase-subtotal]');
  const discountEl = root.querySelector('[data-purchase-discount]');
  const totalEl = root.querySelector('[data-purchase-total]');
  const addLineButton = root.querySelector('[data-purchase-add-line]');
  const detailModal = root.querySelector('[data-purchase-detail-modal]');
  const detailContent = root.querySelector('[data-purchase-detail-content]');

  const formatMoney = (value) => `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(value ?? 0))} FCFA`;
  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const normalizePurchaseStatus = (value) => {
    const raw = String(value ?? '').trim().toLowerCase();
    if (!raw) return 'En attente';
    if (raw.includes('attente') || raw === 'pending' || raw === 'enattente') return 'En attente';
    if (raw.includes('reception') || raw.includes('recu') || raw.includes('valide') || raw === 'valid' || raw === 'valide') return 'valide';
    if (raw.includes('annule') || raw.includes('cancel')) return 'annule';
    return raw;
  };

  const getSupplierName = (supplierId) => {
    const supplier = state.suppliers.find((item) => String(item.id) === String(supplierId));
    return supplier?.nom || 'Fournisseur inconnu';
  };

  const getProductName = (productId) => {
    const product = state.products.find((item) => String(item.id) === String(productId));
    return product?.nom || 'Produit inconnu';
  };

  const buildDraftLine = (line = {}) => ({
    id: line.id || `line-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    product_id: line.product_id ?? '',
    quantity: Number(line.quantite ?? line.quantity ?? 1),
    unit_price: Number(line.prix_unitaire ?? line.unit_price ?? 0),
    remise: Number(line.remise ?? 0),
    subtotal: Number(line.sous_total ?? line.subtotal ?? 0)
  });

  const renderSupplierOptions = () => {
    if (!supplierSelect) return;
    const selected = form?.querySelector('[name="supplier_id"]')?.value || supplierSelect.value || 'all';

    const options = state.suppliers
      .filter((supplier) => supplier.statut !== false)
      .map((supplier) => `<option value="${supplier.id}">${supplier.nom}</option>`)
      .join('');

    supplierSelect.innerHTML = `<option value="">Sélectionner un fournisseur</option>${options}`;
    if (selected && selected !== 'all') {
      supplierSelect.value = selected;
    }

    if (supplierFilter) {
      const filterValue = supplierFilter.value || 'all';
      supplierFilter.innerHTML = '<option value="all">Tous</option>' + state.suppliers
        .map((supplier) => `<option value="${supplier.id}">${supplier.nom}</option>`)
        .join('');
      supplierFilter.value = filterValue;
    }
  };

  const renderStatusOptions = () => {
    if (!statusFilter) return;

    const statuses = ['all', ...new Set(state.purchases
      .map((purchase) => normalizePurchaseStatus(purchase.statut))
      .filter((status) => status && status !== 'all'))];

    const valueBefore = statusFilter.value || 'all';
    statusFilter.innerHTML = statuses
      .map((status) => `<option value="${status}">${status === 'all' ? 'Tous' : status}</option>`)
      .join('');
    statusFilter.value = statuses.includes(valueBefore) ? valueBefore : 'all';
  };

  const renderDraftLines = () => {
    if (!itemsBody) return;

    if (!state.draftLines.length) {
      itemsBody.innerHTML = '<tr><td colspan="6" class="empty-state">Aucun produit ajouté.</td></tr>';
      syncDraftTotals();
      return;
    }

    const productOptions = state.products.map((product) => `<option value="${product.id}">${product.nom}</option>`).join('');
    itemsBody.innerHTML = state.draftLines.map((line) => {
      const qty = Number(line.quantity ?? 1);
      const unitPrice = Number(line.unit_price ?? 0);
      const discount = Number(line.remise ?? 0);
      const subtotal = Math.max(0, qty * unitPrice - discount);
      const optionValue = String(line.product_id ?? '');

      return `
        <tr data-line-id="${line.id}">
          <td>
            <select data-line-product>
              <option value="">Sélectionner</option>
              ${productOptions.replace(new RegExp(`value="${optionValue}"`, 'g'), `value="${optionValue}" selected`)}
            </select>
          </td>
          <td><input type="number" min="1" step="1" value="${Number.isFinite(qty) && qty > 0 ? qty : 1}" data-line-quantity /></td>
          <td><input type="number" min="0" step="100" value="${Number.isFinite(unitPrice) ? unitPrice : 0}" data-line-price /></td>
          <td><input type="number" min="0" step="100" value="${Number.isFinite(discount) ? discount : 0}" data-line-discount /></td>
          <td><strong>${formatMoney(subtotal)}</strong></td>
          <td><button type="button" class="table-action-btn danger" data-line-remove="${line.id}">Supprimer</button></td>
        </tr>
      `;
    }).join('');

    syncDraftTotals();
  };

  const syncDraftTotals = () => {
    if (!subtotalEl || !discountEl || !totalEl) return;

    const summary = state.draftLines.reduce((acc, line) => {
      const quantity = Number(line.quantity ?? 1);
      const price = Number(line.unit_price ?? 0);
      const discount = Number(line.remise ?? 0);
      const subtotal = Math.max(0, quantity * price - discount);
      acc.subtotal += quantity * price;
      acc.discount += discount;
      acc.total += subtotal;
      return acc;
    }, { subtotal: 0, discount: 0, total: 0 });

    subtotalEl.textContent = formatMoney(summary.subtotal);
    discountEl.textContent = formatMoney(summary.discount);
    totalEl.textContent = formatMoney(summary.total);
  };

  const setModalOpen = (open) => {
    if (!modal) return;
    modal.classList.toggle('hidden', !open);
    modal.setAttribute('aria-hidden', String(!open));
  };

  const setDetailModalOpen = (open) => {
    if (!detailModal) return;
    detailModal.classList.toggle('hidden', !open);
    detailModal.setAttribute('aria-hidden', String(!open));
  };

  const resetForm = () => {
    state.editingId = null;
    state.draftLines = [buildDraftLine({ quantity: 1, unit_price: 0, remise: 0 })];
    if (form) form.reset();
    if (modalTitle) modalTitle.textContent = 'Nouvel achat';
    renderSupplierOptions();
    renderDraftLines();
  };

  const openEditor = (purchase = null) => {
    state.editingId = purchase?.id ?? null;
    state.draftLines = [];
    if (form) form.reset();
    if (modalTitle) modalTitle.textContent = purchase ? 'Modifier achat' : 'Nouvel achat';

    if (purchase) {
      const purchaseId = purchase.id;
      if (supplierSelect) supplierSelect.value = purchase.supplier_id || '';
      if (purchaseDate) purchaseDate.value = purchase.date_achat ? purchase.date_achat.slice(0, 10) : '';
      if (purchaseReference) purchaseReference.value = purchase.numero_facture || '';
      if (purchaseNotes) purchaseNotes.value = purchase.notes || '';

      const loadPurchaseItems = async () => {
        const items = await getPurchaseItems(purchaseId);
        state.draftLines = items.length ? items.map((item) => buildDraftLine({
          id: `line-${item.id}`,
          product_id: item.product_id,
          quantity: item.quantite || 1,
          unit_price: item.prix_unitaire || 0,
          remise: 0,
          subtotal: item.sous_total || 0
        })) : [buildDraftLine({ quantity: 1, unit_price: 0, remise: 0 })];
        renderDraftLines();
      };

      loadPurchaseItems();
    } else {
      state.draftLines = [buildDraftLine({ quantity: 1, unit_price: 0, remise: 0 })];
      renderDraftLines();
    }

    renderSupplierOptions();
    setModalOpen(true);
  };

  const renderStats = () => {
    if (!statsGrid) return;

    const totalPurchases = state.purchases.length;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const purchasesThisMonth = state.purchases.filter((purchase) => {
      if (!purchase.date_achat) return false;
      const date = new Date(purchase.date_achat);
      return date >= monthStart;
    }).length;

    const totalAmount = state.purchases.reduce((sum, purchase) => sum + Number(purchase.montant_total ?? 0), 0);
    const pending = state.purchases.filter((purchase) => normalizePurchaseStatus(purchase.statut) === 'En attente').length;

    statsGrid.innerHTML = `
      <article class="stat-card neutral">
        <span>Total achats</span>
        <strong>${totalPurchases}</strong>
        <small>achats enregistrés</small>
      </article>
      <article class="stat-card primary">
        <span>Achats du mois</span>
        <strong>${purchasesThisMonth}</strong>
        <small>ce mois</small>
      </article>
      <article class="stat-card success">
        <span>Montant total</span>
        <strong>${formatMoney(totalAmount)}</strong>
        <small>achats cumulés</small>
      </article>
      <article class="stat-card warning">
        <span>Achats en attente</span>
        <strong>${pending}</strong>
        <small>à réceptionner</small>
      </article>
    `;
  };

  const renderRows = () => {
    if (!tableBody) return;

    const searchTerm = String(searchInput?.value || '').toLowerCase().trim();
    const supplierTerm = supplierFilter?.value || 'all';
    const statusTerm = statusFilter?.value || 'all';

    const filtered = state.purchases.filter((purchase) => {
      const supplierLabel = getSupplierName(purchase.supplier_id).toLowerCase();
      const reference = (purchase.numero_facture || '').toLowerCase();
      const status = normalizePurchaseStatus(purchase.statut).toLowerCase();
      const text = `${supplierLabel} ${reference} ${status}`;
      const matchesSearch = !searchTerm || text.includes(searchTerm);
      const matchesSupplier = supplierTerm === 'all' || String(purchase.supplier_id) === String(supplierTerm);
      const matchesStatus = statusTerm === 'all' || normalizePurchaseStatus(purchase.statut) === statusTerm;
      return matchesSearch && matchesSupplier && matchesStatus;
    });

    if (!filtered.length) {
      tableBody.innerHTML = '<tr><td colspan="7" class="empty-state">Aucun achat trouvé.</td></tr>';
      return;
    }

    tableBody.innerHTML = filtered.map((purchase) => {
      const items = state.purchasesItems?.[purchase.id] || [];
      const actionButtons = [
        `<button type="button" class="table-action-btn primary" data-purchase-action="view" data-purchase-id="${purchase.id}">Voir détails</button>`
      ];

      const purchaseStatus = normalizePurchaseStatus(purchase.statut);
      if (purchaseStatus === 'En attente') {
        actionButtons.push(`<button type="button" class="table-action-btn primary" data-purchase-action="edit" data-purchase-id="${purchase.id}">Modifier</button>`);
        actionButtons.push(`<button type="button" class="table-action-btn primary" data-purchase-action="receive" data-purchase-id="${purchase.id}">Réceptionner</button>`);
      }

      if (purchaseStatus !== 'annule' && purchaseStatus !== 'valide') {
        actionButtons.push(`<button type="button" class="table-action-btn danger" data-purchase-action="cancel" data-purchase-id="${purchase.id}">Annuler</button>`);
      }

      return `
        <tr>
          <td>${purchase.numero_facture || `ACH-${purchase.id}`}</td>
          <td>${formatDate(purchase.date_achat)}</td>
          <td>${getSupplierName(purchase.supplier_id)}</td>
          <td>${items.length}</td>
          <td>${formatMoney(purchase.montant_total ?? 0)}</td>
          <td><span class="status-badge ${purchaseStatus === 'valide' ? 'active' : purchaseStatus === 'annule' ? 'inactive' : 'warning'}">${purchase.statut || 'En attente'}</span></td>
          <td>
            <div class="table-actions">
              ${actionButtons.join('')}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  };

  const loadPurchaseItemsById = async () => {
    const itemsMap = {};
    for (const purchase of state.purchases) {
      try {
        itemsMap[purchase.id] = await getPurchaseItems(purchase.id);
      } catch (error) {
        itemsMap[purchase.id] = [];
      }
    }
    state.purchasesItems = itemsMap;
  };

  const loadPurchasesData = async () => {
    if (state.loading) return;
    state.loading = true;

    try {
      const [purchases, suppliers, products] = await Promise.all([
        getPurchases(),
        getSuppliers(),
        getProducts()
      ]);

      state.purchases = purchases ?? [];
      state.suppliers = suppliers ?? [];
      state.products = products ?? [];
      await loadPurchaseItemsById();
      renderSupplierOptions();
      renderStatusOptions();
      renderStats();
      renderRows();
    } catch (error) {
      console.error('Erreur chargement achats:', error);
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="7" class="empty-state">Impossible de charger les achats.</td></tr>';
      }
      showToast(error?.message || 'Erreur de chargement des achats.');
    } finally {
      state.loading = false;
    }
  };

  const validateDraftLines = () => {
    const validLines = state.draftLines.filter((line) => {
      const productId = Number(line.product_id ?? 0);
      const quantity = Number(line.quantity ?? 0);
      const unitPrice = Number(line.unit_price ?? 0);
      return productId > 0 && quantity > 0 && unitPrice >= 0;
    });

    if (!validLines.length) {
      throw new Error('Ajoutez au moins un produit valide avec une quantité positive.');
    }

    const productIds = validLines.map((line) => Number(line.product_id));
    const hasDuplicate = new Set(productIds).size !== productIds.length;
    if (hasDuplicate) {
      throw new Error('Un même produit ne peut pas être ajouté plusieurs fois dans la même commande.');
    }

    return validLines;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form) return;

    const supplierId = Number(supplierSelect?.value || 0);
    const dateVal = purchaseDate?.value || new Date().toISOString();
    const refVal = purchaseReference?.value || '';
    const notesVal = purchaseNotes?.value || '';

    if (!supplierId) {
      showToast('Sélectionnez un fournisseur.');
      return;
    }

    try {
      const validLines = validateDraftLines();
      const total = validLines.reduce((sum, line) => {
        const quantity = Number(line.quantity ?? 0);
        const unitPrice = Number(line.unit_price ?? 0);
        const discount = Number(line.remise ?? 0);
        return sum + Math.max(0, quantity * unitPrice - discount);
      }, 0);

      const payload = {
        supplier_id: supplierId,
        date_achat: dateVal,
        numero_facture: refVal || `ACH-${Date.now()}`,
        notes: notesVal,
        montant_total: total,
        statut: 'En attente'
      };

      let purchaseId = state.editingId;
      if (purchaseId) {
        await updatePurchase(purchaseId, payload);
        await replacePurchaseItems(purchaseId, validLines.map((line) => ({
          product_id: Number(line.product_id),
          quantite: Number(line.quantity || 1),
          prix_unitaire: Number(line.unit_price || 0),
          sous_total: Math.max(0, Number(line.quantity || 0) * Number(line.unit_price || 0) - Number(line.remise || 0))
        })));
        showToast(`Achat #${purchaseId} mis à jour.`);
      } else {
        const purchase = await createPurchase(payload);
        purchaseId = purchase?.id;
        if (!purchaseId) {
          throw new Error('Impossible de créer l’achat.');
        }
        await createPurchaseItems(purchaseId, validLines.map((line) => ({
          product_id: Number(line.product_id),
          quantite: Number(line.quantity || 1),
          prix_unitaire: Number(line.unit_price || 0),
          sous_total: Math.max(0, Number(line.quantity || 0) * Number(line.unit_price || 0) - Number(line.remise || 0))
        })));
        showToast(`Achat #${purchaseId} enregistré.`);
      }

      setModalOpen(false);
      resetForm();
      await loadPurchasesData();
    } catch (error) {
      console.error('Erreur enregistrement achat:', error);
      showToast(error?.message || 'Erreur lors de l’enregistrement de l’achat.');
    }
  };

  const openDetail = async (purchaseId) => {
    const purchase = state.purchases.find((item) => String(item.id) === String(purchaseId));
    if (!purchase || !detailContent) return;

    try {
      const items = await getPurchaseItems(purchaseId);
      const supplierName = getSupplierName(purchase.supplier_id);
      const itemRows = items.length ? items.map((item) => `
        <tr>
          <td>${getProductName(item.product_id)}</td>
          <td>${Number(item.quantite ?? 0)}</td>
          <td>${formatMoney(item.prix_unitaire ?? 0)}</td>
          <td>${formatMoney(Number(item.sous_total ?? 0) - Number(item.quantite ?? 0) * Number(item.prix_unitaire ?? 0))}</td>
          <td>${formatMoney(item.sous_total ?? 0)}</td>
        </tr>
      `).join('') : '<tr><td colspan="5" class="empty-state">Aucun produit associé.</td></tr>';

      const purchaseStatus = normalizePurchaseStatus(purchase.statut);
      detailContent.innerHTML = `
        <div class="customer-detail-header">
          <div>
            <h4>Achat #${purchase.id}</h4>
            <p>${purchase.numero_facture || 'Sans référence'}</p>
          </div>
          <span class="status-badge ${purchaseStatus === 'valide' ? 'active' : purchaseStatus === 'annule' ? 'inactive' : 'warning'}">${purchase.statut || 'En attente'}</span>
        </div>

        <div class="detail-grid">
          <div><strong>Référence</strong><p>${purchase.numero_facture || '—'}</p></div>
          <div><strong>Date</strong><p>${formatDate(purchase.date_achat)}</p></div>
          <div><strong>Fournisseur</strong><p>${supplierName}</p></div>
          <div><strong>Statut</strong><p>${purchase.statut || 'En attente'}</p></div>
          <div><strong>Montant total</strong><p>${formatMoney(purchase.montant_total ?? 0)}</p></div>
          <div><strong>Notes</strong><p>${purchase.notes || '—'}</p></div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h3>Produits achetés</h3>
          </div>
          <div class="table-wrapper">
            <table class="data-table compact">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Quantité</th>
                  <th>Prix unitaire</th>
                  <th>Remise</th>
                  <th>Sous-total</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
          </div>
        </div>
      `;

      setDetailModalOpen(true);
    } catch (error) {
      console.error('Erreur détail achat:', error);
      showToast(error?.message || 'Impossible d’afficher le détail de l’achat.');
    }
  };

  if (addButton) {
    addButton.addEventListener('click', () => openEditor());
  }

  if (searchInput) {
    searchInput.addEventListener('input', renderRows);
  }

  if (supplierFilter) {
    supplierFilter.addEventListener('change', renderRows);
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', renderRows);
  }

  if (refreshButton) {
    refreshButton.addEventListener('click', loadPurchasesData);
  }

  if (form) {
    form.addEventListener('submit', handleSubmit);
  }

  if (addLineButton) {
    addLineButton.addEventListener('click', () => {
      state.draftLines.push(buildDraftLine({ quantity: 1, unit_price: 0, remise: 0 }));
      renderDraftLines();
    });
  }

  itemsBody?.addEventListener('input', (event) => {
    const target = event.target;
    const row = target.closest('[data-line-id]');
    if (!row) return;

    const lineId = row.dataset.lineId;
    const line = state.draftLines.find((item) => item.id === lineId);
    if (!line) return;

    const productSelect = row.querySelector('[data-line-product]');
    const qtyInput = row.querySelector('[data-line-quantity]');
    const priceInput = row.querySelector('[data-line-price]');
    const discountInput = row.querySelector('[data-line-discount]');

    line.product_id = productSelect?.value || '';
    line.quantity = Number(qtyInput?.value || 0);
    line.unit_price = Number(priceInput?.value || 0);
    line.remise = Number(discountInput?.value || 0);
    renderDraftLines();
  });

  itemsBody?.addEventListener('change', (event) => {
    const target = event.target;
    const row = target.closest('[data-line-id]');
    if (!row) return;

    const lineId = row.dataset.lineId;
    const line = state.draftLines.find((item) => item.id === lineId);
    if (!line) return;

    const productSelect = row.querySelector('[data-line-product]');
    const qtyInput = row.querySelector('[data-line-quantity]');
    const priceInput = row.querySelector('[data-line-price]');
    const discountInput = row.querySelector('[data-line-discount]');

    line.product_id = productSelect?.value || '';
    line.quantity = Number(qtyInput?.value || 0);
    line.unit_price = Number(priceInput?.value || 0);
    line.remise = Number(discountInput?.value || 0);
    renderDraftLines();
  });

  itemsBody?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-line-remove]');
    if (!button) return;
    const lineId = button.dataset.lineRemove;
    state.draftLines = state.draftLines.filter((line) => line.id !== lineId);
    renderDraftLines();
  });

  document.querySelectorAll('[data-purchase-close]').forEach((button) => {
    button.addEventListener('click', () => {
      setModalOpen(false);
      resetForm();
    });
  });

  document.querySelectorAll('[data-purchase-detail-close]').forEach((button) => {
    button.addEventListener('click', () => setDetailModalOpen(false));
  });

  tableBody?.addEventListener('click', async (event) => {
    const trigger = event.target.closest('[data-purchase-action]');
    if (!trigger) return;

    const purchaseId = trigger.dataset.purchaseId;
    const action = trigger.dataset.purchaseAction;
    const purchase = state.purchases.find((item) => String(item.id) === String(purchaseId));
    if (!purchase) return;

    try {
      if (action === 'view') {
        await openDetail(purchase.id);
        return;
      }

      if (action === 'edit') {
        if (normalizePurchaseStatus(purchase.statut) !== 'En attente') {
          showToast('Seuls les achats en attente peuvent être modifiés.');
          return;
        }
        openEditor(purchase);
        return;
      }

      if (action === 'receive') {
        if (normalizePurchaseStatus(purchase.statut) === 'valide') {
          showToast('Cet achat a déjà été réceptionné.');
          return;
        }
        await receivePurchase(purchase.id, { motif: 'Réception d’achat fournisseur' });
        showToast(`Achat #${purchase.id} réceptionné avec mise à jour du stock.`);
        await loadPurchasesData();
        return;
      }

      if (action === 'cancel') {
        if (normalizePurchaseStatus(purchase.statut) === 'valide') {
          showToast('Un achat réceptionné ne peut pas être annulé.');
          return;
        }
        const confirmed = window.confirm('Annuler cet achat ?');
        if (!confirmed) return;
        await cancelPurchase(purchase.id);
        showToast(`Achat #${purchase.id} annulé.`);
        await loadPurchasesData();
      }
    } catch (error) {
      console.error('Erreur achat action:', error);
      showToast(error?.message || 'Une erreur est survenue sur l’achat.');
    }
  });

  resetForm();
  loadPurchasesData();
}

async function initializeCustomersPage() {
  const root = document.querySelector('[data-clients-root]');
  if (!root) return;

  const state = {
    customers: [],
    sales: [],
    hasActiveField: false,
    loading: false
  };

  const searchInput = root.querySelector('[data-client-search]');
  const refreshButton = root.querySelector('[data-client-refresh]');
  const addButton = root.querySelector('[data-client-add]');
  const tableBody = root.querySelector('[data-clients-table-body]');
  const statsGrid = root.querySelector('[data-clients-stats]');
  const modal = root.querySelector('[data-client-modal]');
  const form = root.querySelector('[data-client-form]');
  const hiddenId = root.querySelector('[data-client-id]');
  const modalTitle = document.querySelector('#client-modal-title');
  const statusField = root.querySelector('[data-client-status-field]');
  const detailModal = root.querySelector('[data-client-detail-modal]');
  const detailContent = root.querySelector('[data-client-detail-content]');

  const formatMoney = (value) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(value ?? 0)) + ' FCFA';
  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getCustomerName = (customer) => {
    if (!customer) return 'Client';
    return `${customer.nom || ''} ${customer.prenom || ''}`.trim() || 'Client';
  };

  const getCustomerStatusLabel = (customer) => {
    if (!state.hasActiveField) {
      return 'Actif';
    }
    return customer?.active === false ? 'Inactif' : 'Actif';
  };

  const setModalOpen = (open) => {
    if (!modal) return;
    modal.classList.toggle('hidden', !open);
    modal.setAttribute('aria-hidden', String(!open));
  };

  const setDetailModalOpen = (open) => {
    if (!detailModal) return;
    detailModal.classList.toggle('hidden', !open);
    detailModal.setAttribute('aria-hidden', String(!open));
  };

  const renderStatusField = () => {
    if (!statusField) return;

    if (!state.hasActiveField) {
      statusField.innerHTML = '';
      return;
    }

    statusField.innerHTML = `
      <label class="field-group checkbox-field">
        <input type="checkbox" name="active" checked />
        <span>Client actif</span>
      </label>
    `;
  };

  const renderStats = () => {
    if (!statsGrid) return;

    const salesByCustomer = new Map();
    for (const sale of state.sales) {
      const customerId = String(sale.customer_id ?? '');
      if (!customerId) continue;
      const current = salesByCustomer.get(customerId) ?? { count: 0, total: 0 };
      current.count += 1;
      current.total += Number(sale.montant_final ?? sale.montant_total ?? 0);
      salesByCustomer.set(customerId, current);
    }

    const totalClients = state.customers.length;
    const customersWithPurchase = [...new Set(state.sales.filter((sale) => sale.customer_id).map((sale) => String(sale.customer_id)))].length;
    const recentWindow = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const newClients = state.customers.filter((customer) => {
      if (!customer.created_at) return false;
      const date = new Date(customer.created_at);
      return !Number.isNaN(date.getTime()) && date.getTime() >= recentWindow;
    }).length;

    const activeClients = state.hasActiveField
      ? state.customers.filter((customer) => customer.active !== false).length
      : totalClients;

    statsGrid.innerHTML = `
      <article class="stat-card neutral">
        <span>Total clients</span>
        <strong>${totalClients}</strong>
        <small>clients enregistrés</small>
      </article>
      <article class="stat-card primary">
        <span>Clients actifs</span>
        <strong>${activeClients}</strong>
        <small>clients actifs</small>
      </article>
      <article class="stat-card success">
        <span>Nouveaux clients</span>
        <strong>${newClients}</strong>
        <small>30 derniers jours</small>
      </article>
      <article class="stat-card warning">
        <span>Clients ayant effectué un achat</span>
        <strong>${customersWithPurchase}</strong>
        <small>transactions</small>
      </article>
    `;
  };

  const renderRows = () => {
    if (!tableBody) return;

    const searchTerm = String(searchInput?.value || '').trim().toLowerCase();
    const filtered = state.customers.filter((customer) => {
      if (!searchTerm) return true;
      const haystack = [
        customer.nom,
        customer.prenom,
        customer.telephone,
        customer.email,
        customer.adresse
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(searchTerm);
    });

    if (!filtered.length) {
      tableBody.innerHTML = '<tr><td colspan="9" class="empty-state">Aucun client trouvé.</td></tr>';
      return;
    }

    const byCustomer = new Map();
    for (const sale of state.sales) {
      const customerId = String(sale.customer_id ?? '');
      if (!customerId) continue;
      const current = byCustomer.get(customerId) ?? { count: 0, total: 0 };
      current.count += 1;
      current.total += Number(sale.montant_final ?? sale.montant_total ?? 0);
      byCustomer.set(customerId, current);
    }

    tableBody.innerHTML = filtered.map((customer) => {
      const summary = byCustomer.get(String(customer.id)) ?? { count: 0, total: 0 };
      const statusLabel = getCustomerStatusLabel(customer);
      const statusClass = state.hasActiveField && customer?.active === false ? 'inactive' : 'active';
      const actions = [
        `<button type="button" class="table-action-btn primary" data-client-action="view" data-client-id="${customer.id}">Voir</button>`,
        `<button type="button" class="table-action-btn primary" data-client-action="edit" data-client-id="${customer.id}">Modifier</button>`
      ];

      if (state.hasActiveField) {
        actions.push(`<button type="button" class="table-action-btn ${customer?.active === false ? 'primary' : 'danger'}" data-client-action="toggle-status" data-client-id="${customer.id}">${customer?.active === false ? 'Réactiver' : 'Désactiver'}</button>`);
      }

      return `
        <tr>
          <td>${customer.nom || '—'}</td>
          <td>${customer.prenom || '—'}</td>
          <td>${customer.telephone || '—'}</td>
          <td>${customer.email || '—'}</td>
          <td>${customer.adresse || '—'}</td>
          <td>${summary.count}</td>
          <td>${formatMoney(summary.total)}</td>
          <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
          <td>
            <div class="table-actions">
              ${actions.join('')}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  };

  const loadCustomersData = async () => {
    if (state.loading) return;
    state.loading = true;

    try {
      tableBody.innerHTML = '<tr><td colspan="9" class="empty-state">Chargement des clients...</td></tr>';

      const [customers, sales] = await Promise.all([
        getCustomerList(),
        getSales()
      ]);

      state.customers = customers ?? [];
      state.sales = sales ?? [];
      state.hasActiveField = state.customers.some((customer) => Object.prototype.hasOwnProperty.call(customer, 'active'));

      renderStatusField();
      renderStats();
      renderRows();
    } catch (error) {
      console.error('Erreur chargement clients:', error);
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="9" class="empty-state">Impossible de charger les clients.</td></tr>';
      }
      showToast(error?.message || 'Erreur de chargement des clients.');
    } finally {
      state.loading = false;
    }
  };

  const resetForm = () => {
    if (!form) return;
    form.reset();
    if (hiddenId) hiddenId.value = '';
    if (modalTitle) modalTitle.textContent = 'Ajouter un client';
    renderStatusField();
  };

  const openEditor = (customer = null) => {
    if (!form) return;
    resetForm();

    if (customer) {
      if (modalTitle) modalTitle.textContent = 'Modifier le client';
      if (hiddenId) hiddenId.value = customer.id;

      const mapping = {
        nom: customer.nom || '',
        prenom: customer.prenom || '',
        telephone: customer.telephone || '',
        email: customer.email || '',
        adresse: customer.adresse || ''
      };

      Object.entries(mapping).forEach(([field, value]) => {
        const fieldNode = form.querySelector(`[name="${field}"]`);
        if (fieldNode) {
          fieldNode.value = value;
        }
      });

      if (state.hasActiveField) {
        const activeField = form.querySelector('[name="active"]');
        if (activeField) {
          activeField.checked = customer.active !== false;
        }
      }
    }

    setModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form) return;

    const formData = new FormData(form);
    const payload = {
      nom: String(formData.get('nom') || '').trim(),
      prenom: String(formData.get('prenom') || '').trim(),
      telephone: String(formData.get('telephone') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      adresse: String(formData.get('adresse') || '').trim()
    };

    if (!payload.nom) {
      showToast('Le nom du client est obligatoire.');
      return;
    }

    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      showToast('L’adresse email est invalide.');
      return;
    }

    if (state.hasActiveField) {
      payload.active = Boolean(formData.get('active'));
    }

    const customerId = hiddenId?.value;

    try {
      if (customerId) {
        await updateCustomer(customerId, payload);
        showToast('Client mis à jour avec succès.');
      } else {
        await createCustomer(payload);
        showToast('Client ajouté avec succès.');
      }

      setModalOpen(false);
      resetForm();
      await loadCustomersData();
    } catch (error) {
      console.error('Erreur enregistrement client:', error);
      showToast(error?.message || 'Erreur lors de l’enregistrement du client.');
    }
  };

  const openDetail = async (customerId) => {
    if (!detailContent) return;

    const customer = state.customers.find((item) => String(item.id) === String(customerId));
    if (!customer) return;

    try {
      const [sales, payments] = await Promise.all([
        getCustomerSales(customerId),
        getPayments()
      ]);
      const paymentMap = new Map((payments ?? []).map((payment) => [String(payment.sale_id), payment]));
      const totalSpent = sales.reduce((sum, sale) => sum + Number(sale.montant_final ?? sale.montant_total ?? 0), 0);
      const lastSale = sales[0] ?? null;
      const status = getCustomerStatusLabel(customer);

      detailContent.innerHTML = `
        <div class="customer-detail-header">
          <div>
            <h4>${getCustomerName(customer)}</h4>
            <p>${customer.email || 'Aucun email'}</p>
          </div>
          <span class="status-badge ${state.hasActiveField && customer?.active === false ? 'inactive' : 'active'}">${status}</span>
        </div>

        <div class="detail-grid">
          <div><strong>Nom</strong><p>${customer.nom || '—'}</p></div>
          <div><strong>Prénom</strong><p>${customer.prenom || '—'}</p></div>
          <div><strong>Téléphone</strong><p>${customer.telephone || '—'}</p></div>
          <div><strong>Email</strong><p>${customer.email || '—'}</p></div>
          <div><strong>Adresse</strong><p>${customer.adresse || '—'}</p></div>
          <div><strong>Date de création</strong><p>${formatDate(customer.created_at)}</p></div>
          <div><strong>Nombre de ventes</strong><p>${sales.length}</p></div>
          <div><strong>Total dépensé</strong><p>${formatMoney(totalSpent)}</p></div>
          <div><strong>Dernière vente</strong><p>${lastSale ? `${lastSale.numero_vente || '—'} • ${formatMoney(lastSale.montant_final ?? lastSale.montant_total ?? 0)}` : 'Aucune vente'}</p></div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h3>Historique des achats</h3>
          </div>

          <div class="table-wrapper">
            <table class="data-table compact">
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Mode de paiement</th>
                </tr>
              </thead>
              <tbody>
                ${sales.length ? sales.map((sale) => {
                  const payment = paymentMap.get(String(sale.id));
                  const paymentMethod = payment?.mode_paiement || '—';
                  return `
                    <tr>
                      <td>${sale.numero_vente || '—'}</td>
                      <td>${formatDate(sale.date_vente)}</td>
                      <td>${formatMoney(sale.montant_final ?? sale.montant_total ?? 0)}</td>
                      <td>${sale.statut || '—'}</td>
                      <td>${paymentMethod}</td>
                    </tr>
                  `;
                }).join('') : '<tr><td colspan="5" class="empty-state">Aucun achat enregistré.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;

      setDetailModalOpen(true);
    } catch (error) {
      console.error('Erreur détail client:', error);
      showToast(error?.message || 'Impossible d’afficher le détail du client.');
    }
  };

  if (addButton) {
    addButton.addEventListener('click', () => openEditor());
  }

  if (searchInput) {
    searchInput.addEventListener('input', renderRows);
  }

  if (refreshButton) {
    refreshButton.addEventListener('click', () => loadCustomersData());
  }

  if (form) {
    form.addEventListener('submit', handleSubmit);
  }

  document.querySelectorAll('[data-client-close]').forEach((button) => {
    button.addEventListener('click', () => {
      setModalOpen(false);
      resetForm();
    });
  });

  document.querySelectorAll('[data-client-detail-close]').forEach((button) => {
    button.addEventListener('click', () => setDetailModalOpen(false));
  });

  tableBody?.addEventListener('click', async (event) => {
    const trigger = event.target.closest('[data-client-action]');
    if (!trigger) return;

    const { clientAction, clientId } = trigger.dataset;
    const customer = state.customers.find((item) => String(item.id) === String(clientId));
    if (!customer) return;

    try {
      if (clientAction === 'view') {
        await openDetail(customer.id);
        return;
      }

      if (clientAction === 'edit') {
        openEditor(customer);
        return;
      }

      if (clientAction === 'toggle-status') {
        if (!state.hasActiveField) {
          showToast('Aucune colonne active n’existe dans le schéma de la table customers.');
          return;
        }

        if (customer.active === false) {
          await activateCustomer(customer.id);
          showToast('Client réactivé.');
        } else {
          const confirmed = window.confirm('Désactiver ce client ? Il restera visible dans l’historique mais ne sera plus proposé comme client lors des ventes.');
          if (!confirmed) return;
          await deactivateCustomer(customer.id);
          showToast('Client désactivé.');
        }

        await loadCustomersData();
      }
    } catch (error) {
      console.error('Erreur action client:', error);
      showToast(error?.message || 'Une erreur est survenue sur le client.');
    }
  });

  loadCustomersData();
}

async function initializeSalesPage() {
  const root = document.querySelector('[data-sales-root]');
  if (!root) return;

  const state = {
    products: [],
    customerSearch: '',
    customers: [],
    sales: [],
    payments: [],
    cart: [],
    paymentMethod: 'especes',
    selectedCustomerId: '',
    processing: false
  };

  const productList = root.querySelector('[data-sales-product-list]');
  const productSearch = root.querySelector('[data-sales-product-search]');
  const barcodeInput = root.querySelector('[data-sales-barcode-input]');
  const customerSelect = root.querySelector('[data-sales-customer]');
  const customerSearchInput = root.querySelector('[data-sales-customer-search]');
  const paymentSelect = root.querySelector('[data-sales-payment]');
  const cartBody = root.querySelector('[data-sales-cart-body]');
  const historyBody = root.querySelector('[data-sales-history-body]');
  const submitButton = root.querySelector('[data-sales-submit]');
  const itemCountNode = root.querySelector('[data-sales-item-count]');
  const subtotalNode = root.querySelector('[data-sales-subtotal]');
  const discountNode = root.querySelector('[data-sales-discount]');
  const totalNode = root.querySelector('[data-sales-total]');
  const refreshButton = root.querySelector('[data-sales-refresh]');
  const detailModal = root.querySelector('[data-sales-detail-modal]');
  const detailContent = root.querySelector('[data-sales-detail-content]');
  const receiptModal = root.querySelector('[data-sales-receipt-modal]');
  const receiptContent = root.querySelector('[data-sales-receipt-content]');

  const formatMoney = (value) => formatCurrency(value);

  const renderProductList = () => {
    if (!productList) return;

    const searchTerm = String(productSearch?.value || '').trim().toLowerCase();
    const barcodeTerm = String(barcodeInput?.value || '').trim().toLowerCase();

    const filteredProducts = state.products.filter((product) => {
      const searchable = [product.nom, product.code_barres, product.reference, product.marque]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesText = !searchTerm || searchable.includes(searchTerm);
      const matchesBarcode = !barcodeTerm || String(product.code_barres || '').toLowerCase().includes(barcodeTerm);
      return matchesText && matchesBarcode;
    });

    if (!filteredProducts.length) {
      productList.innerHTML = '<div class="empty-state">Aucun produit disponible pour la vente.</div>';
      return;
    }

    productList.innerHTML = filteredProducts.map((product) => `
      <article class="sale-product-card">
        <div class="product-card-header">
          <div>
            <strong>${product.nom || 'Produit'}</strong>
            <small>${product.code_barres || '—'} • ${product.unite || 'unité'}</small>
          </div>
          <span class="sale-price">${formatMoney(product.prix_vente ?? 0)}</span>
        </div>
        <div class="product-card-meta">
          <span>Stock: ${Number(product.stock_actuel ?? 0)}</span>
          <span>${product.category_id ? 'Catégorie' : 'Sans catégorie'}</span>
        </div>
        <button
          type="button"
          class="btn btn-primary btn-small"
          data-sales-add-item="${product.id}"
          ${Number(product.stock_actuel ?? 0) <= 0 || product.statut === false ? 'disabled' : ''}
        >Ajouter</button>
      </article>
    `).join('');
  };

  const updateSummary = () => {
    const summary = buildSaleSummary(state.cart);
    if (subtotalNode) subtotalNode.textContent = formatMoney(summary.sousTotal);
    if (discountNode) discountNode.textContent = formatMoney(summary.remise);
    if (totalNode) totalNode.textContent = formatMoney(summary.total);
    if (itemCountNode) itemCountNode.textContent = `${state.cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} article(s)`;

    const hasCart = state.cart.length > 0 && state.cart.some((item) => Number(item.quantity || 0) > 0);
    if (submitButton) {
      submitButton.disabled = state.processing || !hasCart || summary.total <= 0;
    }
  };

  const renderCart = () => {
    if (!cartBody) return;

    if (!state.cart.length) {
      cartBody.innerHTML = '<tr><td colspan="5" class="empty-state">Aucun produit dans le panier.</td></tr>';
      updateSummary();
      return;
    }

    cartBody.innerHTML = state.cart.map((item) => {
      const product = state.products.find((entry) => String(entry.id) === String(item.product_id));
      const unitPrice = Number(item.prix_vente ?? product?.prix_vente ?? 0);
      const lineTotal = (unitPrice * Number(item.quantity || 0)) - Number(item.remise || 0);
      return `
        <tr>
          <td>
            <strong>${product?.nom || 'Produit'}</strong><br>
            <small>${formatMoney(unitPrice)}</small>
          </td>
          <td>
            <div class="quantity-control">
              <button type="button" data-sales-qty="decrease" data-product-id="${item.product_id}" aria-label="Diminuer">−</button>
              <input type="number" min="1" max="${Number(product?.stock_actuel ?? 0)}" value="${item.quantity}" data-sales-quantity-input="${item.product_id}" />
              <button type="button" data-sales-qty="increase" data-product-id="${item.product_id}" aria-label="Augmenter">+</button>
            </div>
          </td>
          <td>
            <input type="number" min="0" step="100" value="${item.remise ?? 0}" data-sales-discount-input="${item.product_id}" />
          </td>
          <td>${formatMoney(lineTotal)}</td>
          <td><button type="button" class="table-action-btn danger" data-sales-remove-item="${item.product_id}">Supprimer</button></td>
        </tr>
      `;
    }).join('');

    updateSummary();
  };

  const renderCustomerOptions = () => {
    if (!customerSelect) return;

    const query = String(customerSearchInput?.value || '').trim().toLowerCase();
    const visibleCustomers = state.customers.filter((customer) => {
      const text = [customer.nom, customer.prenom, customer.telephone, customer.email].filter(Boolean).join(' ').toLowerCase();
      const matchesQuery = !query || text.includes(query);
      const hasActiveFlag = Object.prototype.hasOwnProperty.call(customer, 'active');
      const matchesStatus = !hasActiveFlag || customer.active !== false;
      return matchesQuery && matchesStatus;
    });

    const options = ['<option value="">Client de passage</option>']
      .concat(
        visibleCustomers.map((customer) => {
          const label = [customer.nom, customer.prenom].filter(Boolean).join(' ') || `Client #${customer.id}`;
          return `<option value="${customer.id}">${label}</option>`;
        })
      )
      .join('');

    customerSelect.innerHTML = options;
    if (state.selectedCustomerId) {
      customerSelect.value = String(state.selectedCustomerId);
    }
  };

  const renderHistory = () => {
    if (!historyBody) return;

    const sales = [...state.sales].sort((a, b) => new Date(b.date_vente || b.created_at || 0) - new Date(a.date_vente || a.created_at || 0));

    if (!sales.length) {
      historyBody.innerHTML = '<tr><td colspan="7" class="empty-state">Aucune vente enregistrée.</td></tr>';
      return;
    }

    historyBody.innerHTML = sales.map((sale) => {
      const customer = state.customers.find((entry) => String(entry.id) === String(sale.customer_id));
      const payment = state.payments.find((entry) => String(entry.sale_id) === String(sale.id));
      const displayName = customer ? `${customer.nom} ${customer.prenom || ''}`.trim() : 'Client de passage';
      return `
        <tr>
          <td>${sale.numero_vente || `#${sale.id}`}</td>
          <td>${sale.date_vente ? new Date(sale.date_vente).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
          <td>${displayName}</td>
          <td>${formatMoney(sale.montant_final ?? 0)}</td>
          <td>${payment?.mode_paiement || '—'}</td>
          <td>${sale.statut || '—'}</td>
          <td>
            <div class="table-actions">
              <button type="button" class="table-action-btn primary" data-sales-detail="${sale.id}">Voir détails</button>
              <button type="button" class="table-action-btn" data-sales-receipt="${sale.id}">Imprimer reçu</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  };

  const syncCartFromProducts = () => {
    state.cart = state.cart.map((item) => {
      const product = state.products.find((entry) => String(entry.id) === String(item.product_id));
      const maxStock = Number(product?.stock_actuel ?? 0);
      const nextQty = Math.min(Number(item.quantity || 1), Math.max(1, maxStock || 1));
      return { ...item, quantity: nextQty, prix_vente: Number(product?.prix_vente ?? item.prix_vente ?? 0) };
    }).filter((item) => {
      const product = state.products.find((entry) => String(entry.id) === String(item.product_id));
      return Boolean(product && product.statut !== false);
    });
  };

  const addToCart = (productId) => {
    const product = state.products.find((entry) => String(entry.id) === String(productId));
    if (!product) return;

    const validation = validateCartItem({
      product,
      quantity: 1,
      remise: 0
    });

    if (!validation.valid) {
      showToast(validation.message);
      return;
    }

    const existingIndex = state.cart.findIndex((entry) => String(entry.product_id) === String(productId));
    if (existingIndex >= 0) {
      state.cart[existingIndex].quantity = Number(state.cart[existingIndex].quantity || 0) + 1;
    } else {
      state.cart.push({
        product_id: product.id,
        quantity: 1,
        remise: 0,
        prix_vente: Number(product.prix_vente ?? 0)
      });
    }

    renderCart();
  };

  const updateLineQuantity = (productId, nextQuantity) => {
    const product = state.products.find((entry) => String(entry.id) === String(productId));
    if (!product) return;

    const normalizedQty = Math.max(1, Number(nextQuantity || 1));
    const validation = validateCartItem({ product, quantity: normalizedQty, remise: 0 });

    if (!validation.valid) {
      showToast(validation.message);
      renderCart();
      return;
    }

    const item = state.cart.find((entry) => String(entry.product_id) === String(productId));
    if (!item) return;
    item.quantity = normalizedQty;
    renderCart();
  };

  const setDiscount = (productId, nextDiscount) => {
    const item = state.cart.find((entry) => String(entry.product_id) === String(productId));
    if (!item) return;

    const discount = Math.max(0, Number(nextDiscount || 0));
    item.remise = discount;
    renderCart();
  };

  const removeFromCart = (productId) => {
    state.cart = state.cart.filter((item) => String(item.product_id) !== String(productId));
    renderCart();
  };

  const openDetailModal = async (saleId) => {
    if (!detailModal || !detailContent) return;

    try {
      const data = await getSaleById(saleId);
      if (!data) {
        detailContent.innerHTML = '<p class="empty-state">Aucune information disponible.</p>';
        detailModal.classList.remove('hidden');
        detailModal.setAttribute('aria-hidden', 'false');
        return;
      }

      const sale = data.sale || {};
      const payment = data.payment || {};
      const customer = state.customers.find((entry) => String(entry.id) === String(sale.customer_id));
      const customerLabel = customer ? `${customer.nom} ${customer.prenom || ''}`.trim() : 'Client de passage';

      detailContent.innerHTML = `
        <div class="sale-detail-grid">
          <div><strong>Vente</strong><p>${sale.numero_vente || `#${sale.id}`}</p></div>
          <div><strong>Date</strong><p>${sale.date_vente ? new Date(sale.date_vente).toLocaleString('fr-FR') : '—'}</p></div>
          <div><strong>Client</strong><p>${customerLabel}</p></div>
          <div><strong>Statut</strong><p>${sale.statut || '—'}</p></div>
          <div><strong>Mode de paiement</strong><p>${payment.mode_paiement || '—'}</p></div>
          <div><strong>Montant</strong><p>${formatMoney(sale.montant_final ?? 0)}</p></div>
        </div>
        <table class="data-table compact">
          <thead><tr><th>Produit</th><th>Qté</th><th>Prix uni.</th><th>Remise</th><th>Sous-total</th></tr></thead>
          <tbody>
            ${(data.items || []).map((item) => {
              const product = state.products.find((entry) => String(entry.id) === String(item.product_id));
              const productName = product?.nom || `Produit #${item.product_id}`;
              const lineTotal = (Number(item.prix_unitaire ?? 0) * Number(item.quantite ?? 0)) - Number(item.remise ?? 0);
              return `
                <tr>
                  <td>${productName}</td>
                  <td>${item.quantite || 0}</td>
                  <td>${formatMoney(item.prix_unitaire ?? 0)}</td>
                  <td>${formatMoney(item.remise ?? 0)}</td>
                  <td>${formatMoney(lineTotal)}</td>
                </tr>
              `;
            }).join('') || '<tr><td colspan="5" class="empty-state">Aucune ligne.</td></tr>'}
          </tbody>
        </table>
      `;

      detailModal.classList.remove('hidden');
      detailModal.setAttribute('aria-hidden', 'false');
    } catch (error) {
      console.error('Erreur détail vente:', error);
      showToast(error?.message || 'Impossible d’afficher le détail de la vente.');
    }
  };

  const openReceiptModal = async (saleId) => {
    if (!receiptModal || !receiptContent) return;

    try {
      const data = await getSaleById(saleId);
      if (!data) return;

      const sale = data.sale || {};
      const payment = data.payment || {};
      const customer = state.customers.find((entry) => String(entry.id) === String(sale.customer_id));
      const customerLabel = customer ? `${customer.nom} ${customer.prenom || ''}`.trim() : 'Client de passage';

      receiptContent.innerHTML = `
        <div class="receipt-header">
          <h4>MON SUPERMARCHÉ</h4>
          <p>${new Date().toLocaleDateString('fr-FR')}</p>
          <p>N° vente: ${sale.numero_vente || `#${sale.id}`}</p>
          <p>Client: ${customerLabel}</p>
        </div>
        <table class="receipt-table">
          <thead>
            <tr><th>Produit</th><th>Qté</th><th>Prix</th><th>Total</th></tr>
          </thead>
          <tbody>
            ${(data.items || []).map((item) => {
              const product = state.products.find((entry) => String(entry.id) === String(item.product_id));
              const productName = product?.nom || `Produit #${item.product_id}`;
              const lineTotal = (Number(item.prix_unitaire ?? 0) * Number(item.quantite ?? 0)) - Number(item.remise ?? 0);
              return `
                <tr>
                  <td>${productName}</td>
                  <td>${item.quantite || 0}</td>
                  <td>${formatMoney(item.prix_unitaire ?? 0)}</td>
                  <td>${formatMoney(lineTotal)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        <div class="receipt-summary">
          <div><span>Sous-total</span><strong>${formatMoney(sale.montant_total ?? 0)}</strong></div>
          <div><span>Remise</span><strong>${formatMoney(sale.remise ?? 0)}</strong></div>
          <div><span>TOTAL</span><strong>${formatMoney(sale.montant_final ?? 0)}</strong></div>
          <div><span>Mode de paiement</span><strong>${payment.mode_paiement || '—'}</strong></div>
        </div>
        <p class="receipt-footer">Merci pour votre achat.</p>
      `;

      receiptModal.classList.remove('hidden');
      receiptModal.setAttribute('aria-hidden', 'false');
    } catch (error) {
      console.error('Erreur reçu:', error);
      showToast(error?.message || 'Impossible d’afficher le reçu.');
    }
  };

  const resetSaleState = () => {
    state.cart = [];
    state.selectedCustomerId = '';
    if (customerSelect) customerSelect.value = '';
    if (paymentSelect) paymentSelect.value = 'especes';
    if (customerSearchInput) customerSearchInput.value = '';
    renderProductList();
    renderCart();
    renderCustomerOptions();
  };

  const submitSale = async () => {
    if (state.processing) return;
    if (!state.cart.length) {
      showToast('Le panier est vide.');
      return;
    }

    const saleLines = state.cart.map((item) => {
      const product = state.products.find((entry) => String(entry.id) === String(item.product_id));
      if (!product) {
        throw new Error('Produit introuvable dans le panier.');
      }

      const validation = validateCartItem({
        product,
        quantity: Number(item.quantity || 0),
        remise: Number(item.remise || 0)
      });

      if (!validation.valid) {
        throw new Error(validation.message);
      }

      return {
        product_id: product.id,
        quantity: Number(item.quantity || 0),
        prix_vente: Number(product.prix_vente ?? 0),
        remise: Number(item.remise || 0),
        sous_total: Number((Number(product.prix_vente ?? 0) * Number(item.quantity || 0)) - Number(item.remise || 0))
      };
    });

    const summary = buildSaleSummary(saleLines);
    if (summary.total <= 0) {
      showToast('Le montant de la vente doit être supérieur à 0.');
      return;
    }

    state.processing = true;
    if (submitButton) submitButton.disabled = true;

    try {
      const result = await createSale({
        customer_id: state.selectedCustomerId || null,
        user_id: 1,
        mode_paiement: paymentSelect?.value || 'especes',
        payment_reference: null,
        items: saleLines
      });

      const saleNumber = result?.numero_vente || result?.details?.sale?.numero_vente || `#${result?.id || 'N/A'}`;
      showToast(`Vente enregistrée avec succès — ${saleNumber}`);
      resetSaleState();
      const salesResponse = await getSales();
      state.sales = salesResponse;
      renderHistory();
      const productListData = await getProductsForSale();
      state.products = productListData;
      renderProductList();
      syncCartFromProducts();
      renderCart();

      if (receiptModal && receiptContent) {
        const currentSale = await getSaleById(result?.id || salesResponse[0]?.id);
        if (currentSale) {
          const sale = currentSale.sale || {};
          const payment = currentSale.payment || {};
          const customer = state.customers.find((entry) => String(entry.id) === String(sale.customer_id));
          const customerLabel = customer ? `${customer.nom} ${customer.prenom || ''}`.trim() : 'Client de passage';
          receiptContent.innerHTML = `
            <div class="receipt-header">
              <h4>MON SUPERMARCHÉ</h4>
              <p>${new Date().toLocaleDateString('fr-FR')}</p>
              <p>N° vente: ${sale.numero_vente || `#${sale.id}`}</p>
              <p>Client: ${customerLabel}</p>
            </div>
            <table class="receipt-table">
              <thead><tr><th>Produit</th><th>Qté</th><th>Prix</th><th>Total</th></tr></thead>
              <tbody>
                ${(currentSale.items || []).map((item) => `
                  <tr>
                    <td>${item.product_id || 'Produit'}</td>
                    <td>${item.quantite || 0}</td>
                    <td>${formatMoney(item.prix_unitaire ?? 0)}</td>
                    <td>${formatMoney(item.sous_total ?? 0)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="receipt-summary">
              <div><span>Sous-total</span><strong>${formatMoney(sale.montant_total ?? 0)}</strong></div>
              <div><span>Remise</span><strong>${formatMoney(sale.remise ?? 0)}</strong></div>
              <div><span>TOTAL</span><strong>${formatMoney(sale.montant_final ?? 0)}</strong></div>
              <div><span>Mode de paiement</span><strong>${payment.mode_paiement || '—'}</strong></div>
            </div>
            <p class="receipt-footer">Merci pour votre achat.</p>
          `;
          receiptModal.classList.remove('hidden');
          receiptModal.setAttribute('aria-hidden', 'false');
        }
      }
    } catch (error) {
      console.error('Erreur validation vente:', error);
      showToast(error?.message || 'La vente n’a pas pu être validée.');
    } finally {
      state.processing = false;
      if (submitButton) submitButton.disabled = false;
      renderCart();
    }
  };

  const loadSalesData = async () => {
    try {
      const [products, customers, sales, payments] = await Promise.all([
        getProductsForSale(),
        getCustomers(),
        getSales(),
        getPayments()
      ]);

      state.products = products;
      state.customers = customers;
      state.sales = sales;
      state.payments = payments;
      renderCustomerOptions();
      renderHistory();
      renderProductList();
      renderCart();
    } catch (error) {
      console.error('Erreur chargement vente:', error);
      showToast(error?.message || 'Impossible de charger les données de vente.');
    }
  };

  if (productSearch) {
    productSearch.addEventListener('input', renderProductList);
  }

  if (barcodeInput) {
    barcodeInput.addEventListener('input', renderProductList);
  }

  if (customerSearchInput) {
    customerSearchInput.addEventListener('input', renderCustomerOptions);
  }

  if (customerSelect) {
    customerSelect.addEventListener('change', (event) => {
      state.selectedCustomerId = event.target.value || '';
    });
  }

  if (paymentSelect) {
    paymentSelect.addEventListener('change', (event) => {
      state.paymentMethod = event.target.value || 'especes';
    });
  }

  if (refreshButton) {
    refreshButton.addEventListener('click', () => loadSalesData());
  }

  root.addEventListener('click', async (event) => {
    const addButton = event.target.closest('[data-sales-add-item]');
    if (addButton) {
      addToCart(addButton.dataset.salesAddItem);
      return;
    }

    const removeButton = event.target.closest('[data-sales-remove-item]');
    if (removeButton) {
      removeFromCart(removeButton.dataset.salesRemoveItem);
      return;
    }

    const qtyButton = event.target.closest('[data-sales-qty]');
    if (qtyButton) {
      const item = state.cart.find((entry) => String(entry.product_id) === String(qtyButton.dataset.productId));
      const product = state.products.find((entry) => String(entry.id) === String(qtyButton.dataset.productId));
      if (!item || !product) return;

      const currentQty = Number(item.quantity || 1);
      const nextQty = qtyButton.dataset.salesQty === 'increase'
        ? Math.min(currentQty + 1, Number(product.stock_actuel ?? 0))
        : Math.max(1, currentQty - 1);
      updateLineQuantity(item.product_id, nextQty);
      return;
    }

    const detailTrigger = event.target.closest('[data-sales-detail]');
    if (detailTrigger) {
      await openDetailModal(detailTrigger.dataset.salesDetail);
      return;
    }

    const receiptTrigger = event.target.closest('[data-sales-receipt]');
    if (receiptTrigger) {
      await openReceiptModal(receiptTrigger.dataset.salesReceipt);
      return;
    }

    const submitTrigger = event.target.closest('[data-sales-submit]');
    if (submitTrigger) {
      await submitSale();
    }
  });

  root.addEventListener('input', (event) => {
    const newQuantityInput = event.target.closest('[data-sales-quantity-input]');
    if (newQuantityInput) {
      updateLineQuantity(newQuantityInput.dataset.salesQuantityInput, newQuantityInput.value);
      return;
    }

    const discountInput = event.target.closest('[data-sales-discount-input]');
    if (discountInput) {
      setDiscount(discountInput.dataset.salesDiscountInput, discountInput.value);
      return;
    }
  });

  detailModal?.addEventListener('click', (event) => {
    if (event.target.closest('[data-sales-detail-close]')) {
      detailModal.classList.add('hidden');
      detailModal.setAttribute('aria-hidden', 'true');
    }
  });

  receiptModal?.addEventListener('click', (event) => {
    if (event.target.closest('[data-sales-receipt-close]')) {
      receiptModal.classList.add('hidden');
      receiptModal.setAttribute('aria-hidden', 'true');
    }

    if (event.target.closest('[data-sales-print-receipt]')) {
      window.print();
    }
  });

  state.paymentMethod = paymentSelect?.value || 'especes';
  loadSalesData();
}

async function initializeProductsPage() {
  const root = document.querySelector('[data-products-root]');
  if (!root) return;

  const searchInput = root.querySelector('[data-product-search]');
  const categoryFilter = root.querySelector('[data-product-category-filter]');
  const refreshButton = root.querySelector('[data-product-refresh]');
  const tableBody = root.querySelector('[data-products-table-body]');
  const modal = root.querySelector('[data-product-modal]');
  const form = root.querySelector('[data-product-form]');
  const modalTitle = root.querySelector('#product-modal-title');
  const hiddenId = root.querySelector('[data-product-id]');
  const addButton = root.querySelector('[data-add-product]');

  const state = {
    products: [],
    categories: [],
    suppliers: []
  };

  const getCategoryName = (product) => {
    const category = state.categories.find((item) => String(item.id) === String(product.category_id ?? ''));
    return category?.nom || 'Sans catégorie';
  };

  const getSupplierName = (product) => {
    const supplier = state.suppliers.find((item) => String(item.id) === String(product.supplier_id ?? ''));
    return supplier?.nom || '—';
  };

  const setModalOpen = (isOpen) => {
    if (!modal) return;
    modal.classList.toggle('hidden', !isOpen);
    modal.setAttribute('aria-hidden', String(!isOpen));
  };

  const resetForm = () => {
    form.reset();
    if (hiddenId) hiddenId.value = '';
    const statusCheckbox = form.querySelector('[name="statut"]');
    if (statusCheckbox) statusCheckbox.checked = true;
    if (modalTitle) modalTitle.textContent = 'Ajouter un produit';
  };

  const fillMetaSelects = () => {
    const categorySelect = form.querySelector('[name="category_id"]');
    const supplierSelect = form.querySelector('[name="supplier_id"]');

    if (categorySelect) {
      categorySelect.innerHTML = '<option value="">Sélectionner</option>' + state.categories
        .map((category) => `<option value="${category.id}">${category.nom}</option>`)
        .join('');
    }

    if (supplierSelect) {
      supplierSelect.innerHTML = '<option value="">Sélectionner</option>' + state.suppliers
        .map((supplier) => `<option value="${supplier.id}">${supplier.nom}</option>`)
        .join('');
    }

    if (categoryFilter) {
      categoryFilter.innerHTML = '<option value="all">Toutes les catégories</option>' + state.categories
        .map((category) => `<option value="${category.id}">${category.nom}</option>`)
        .join('');
    }
  };

  const renderRows = () => {
    const term = String(searchInput?.value || '').trim().toLowerCase();
    const selectedCategory = categoryFilter?.value || 'all';

    const filteredProducts = state.products.filter((product) => {
      const matchesCategory = selectedCategory === 'all' || String(product.category_id ?? '') === String(selectedCategory);
      const haystack = [
        product.nom,
        product.reference,
        product.code_barres,
        product.marque,
        getCategoryName(product),
        getSupplierName(product)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesTerm = !term || haystack.includes(term);
      return matchesCategory && matchesTerm;
    });

    if (!tableBody) return;

    if (!filteredProducts.length) {
      tableBody.innerHTML = '<tr><td colspan="10" class="empty-state">Aucun produit trouvé.</td></tr>';
      return;
    }

    tableBody.innerHTML = filteredProducts.map((product) => {
      const categoryName = getCategoryName(product);
      const supplierName = getSupplierName(product);
      const statusClass = product.statut ? 'active' : 'inactive';
      const statusLabel = product.statut ? 'Actif' : 'Inactif';

      return `
        <tr>
          <td>
            <strong>${product.nom || 'Produit sans nom'}</strong><br>
            <small>${product.marque || 'Sans marque'}</small>
          </td>
          <td>${product.reference || '—'}</td>
          <td>${categoryName}</td>
          <td>${Number(product.prix_achat ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FCFA</td>
          <td>${Number(product.prix_vente ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FCFA</td>
          <td>${Number(product.stock_actuel ?? 0)}</td>
          <td>${Number(product.stock_minimum ?? 0)}</td>
          <td>${supplierName}</td>
          <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
          <td>
            <div class="table-actions">
              <button type="button" class="table-action-btn primary" data-product-action="edit" data-product-id="${product.id}">Modifier</button>
              <button type="button" class="table-action-btn ${product.statut ? 'danger' : 'primary'}" data-product-action="toggle-status" data-product-id="${product.id}">${product.statut ? 'Désactiver' : 'Réactiver'}</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  };

  const loadProducts = async () => {
    try {
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="10" class="empty-state">Chargement des produits...</td></tr>';
      }

      const [products, categories, suppliers] = await Promise.all([
        getProducts(),
        getProductCategories(),
        getProductSuppliers()
      ]);

      state.products = products;
      state.categories = categories;
      state.suppliers = suppliers;
      fillMetaSelects();
      renderRows();
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="10" class="empty-state">Impossible de charger les produits.</td></tr>';
      }
      showToast(error?.message || 'Erreur de chargement des produits.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form) return;

    const formData = new FormData(form);
    const payload = {
      nom: String(formData.get('nom') || '').trim(),
      reference: String(formData.get('reference') || '').trim(),
      code_barres: String(formData.get('code_barres') || '').trim(),
      marque: String(formData.get('marque') || '').trim(),
      category_id: formData.get('category_id') || null,
      supplier_id: formData.get('supplier_id') || null,
      unite: String(formData.get('unite') || '').trim(),
      prix_achat: Number(formData.get('prix_achat') || 0),
      prix_vente: Number(formData.get('prix_vente') || 0),
      stock_actuel: Number(formData.get('stock_actuel') || 0),
      stock_minimum: Number(formData.get('stock_minimum') || 0),
      date_expiration: formData.get('date_expiration') || null,
      image: String(formData.get('image') || '').trim(),
      description: String(formData.get('description') || '').trim(),
      statut: form.querySelector('[name="statut"]').checked
    };

    if (!payload.nom) {
      showToast('Le nom du produit est obligatoire.');
      return;
    }

    if (!payload.prix_achat || !payload.prix_vente) {
      showToast('Les prix d’achat et de vente sont obligatoires.');
      return;
    }

    const productId = hiddenId?.value;

    try {
      if (productId) {
        await updateProduct(productId, payload);
        showToast('Produit mis à jour.');
      } else {
        await createProduct(payload);
        showToast('Produit ajouté.');
      }

      setModalOpen(false);
      resetForm();
      await loadProducts();
    } catch (error) {
      console.error('Erreur sauvegarde produit:', error);
      showToast(error?.message || 'Erreur lors de l’enregistrement du produit.');
    }
  };

  const openEditor = (product = null) => {
    if (!form) return;

    resetForm();
    fillMetaSelects();

    if (product) {
      if (modalTitle) modalTitle.textContent = 'Modifier le produit';
      if (hiddenId) hiddenId.value = product.id;

      Object.entries({
        nom: product.nom || '',
        reference: product.reference || '',
        code_barres: product.code_barres || '',
        marque: product.marque || '',
        category_id: product.category_id ?? '',
        supplier_id: product.supplier_id ?? '',
        unite: product.unite || '',
        prix_achat: product.prix_achat ?? 0,
        prix_vente: product.prix_vente ?? 0,
        stock_actuel: product.stock_actuel ?? 0,
        stock_minimum: product.stock_minimum ?? 0,
        date_expiration: product.date_expiration || '',
        image: product.image || '',
        description: product.description || ''
      }).forEach(([field, value]) => {
        const fieldNode = form.querySelector(`[name="${field}"]`);
        if (fieldNode) {
          fieldNode.value = value;
        }
      });

      const statusCheckbox = form.querySelector('[name="statut"]');
      if (statusCheckbox) {
        statusCheckbox.checked = Boolean(product.statut !== undefined ? product.statut : true);
      }
    }

    setModalOpen(true);
  };

  if (addButton) {
    addButton.addEventListener('click', () => openEditor());
  }

  if (searchInput) {
    searchInput.addEventListener('input', renderRows);
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', renderRows);
  }

  if (refreshButton) {
    refreshButton.addEventListener('click', () => loadProducts());
  }

  if (form) {
    form.addEventListener('submit', handleSubmit);
  }

  document.querySelectorAll('[data-product-close]').forEach((button) => {
    button.addEventListener('click', () => {
      setModalOpen(false);
      resetForm();
    });
  });

  tableBody?.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('[data-product-action]');
    if (!actionButton) return;

    const id = actionButton.dataset.productId;
    const action = actionButton.dataset.productAction;
    const product = state.products.find((item) => String(item.id) === String(id));
    if (!product) return;

    try {
      if (action === 'edit') {
        openEditor(product);
        return;
      }

      if (action === 'toggle-status') {
        if (product.statut) {
          await deactivateProduct(id);
          showToast('Produit désactivé.');
        } else {
          await activateProduct(id);
          showToast('Produit réactivé.');
        }
        await loadProducts();
      }
    } catch (error) {
      console.error('Erreur action produit:', error);
      showToast(error?.message || 'Une erreur est survenue sur le produit.');
    }
  });

  loadProducts();
}

async function initializeStockPage() {
  const root = document.querySelector('[data-stock-root]');
  if (!root) return;

  const state = {
    products: [],
    categories: [],
    movements: []
  };

  const searchInput = root.querySelector('[data-stock-search]');
  const categoryFilter = root.querySelector('[data-stock-category-filter]');
  const stateFilter = root.querySelector('[data-stock-state-filter]');
  const lowOnlyButton = root.querySelector('[data-stock-low-only]');
  const refreshButton = root.querySelector('[data-stock-refresh]');
  const addButton = root.querySelector('[data-stock-add]');
  const modal = root.querySelector('[data-stock-modal]');
  const form = root.querySelector('[data-stock-form]');
  const productSelect = root.querySelector('[name="product_id"]');
  const historyFilter = root.querySelector('[data-stock-movement-filter]');
  const historyBody = root.querySelector('[data-stock-history-body]');
  const tableBody = root.querySelector('[data-stock-table-body]');

  const getStockStateLabel = (product) => {
    const stockActuel = Number(product.stock_actuel ?? 0);
    const stockMinimum = Number(product.stock_minimum ?? 0);

    if (stockActuel === 0) return 'rupture';
    if (stockActuel <= stockMinimum) return 'low';
    return 'available';
  };

  const getCategoryName = (product) => {
    const category = state.categories.find((item) => String(item.id) === String(product.category_id ?? ''));
    return category?.nom || 'Sans catégorie';
  };

  const renderStats = () => {
    const totalProducts = state.products.length;
    const available = state.products.reduce((sum, product) => sum + Number(product.stock_actuel ?? 0), 0);
    const lowCount = state.products.filter((product) => Number(product.stock_actuel ?? 0) <= Number(product.stock_minimum ?? 0) && Number(product.stock_actuel ?? 0) > 0).length;
    const outCount = state.products.filter((product) => Number(product.stock_actuel ?? 0) === 0).length;

    const totalProductsNode = root.querySelector('[data-stock-total-products]');
    const availableNode = root.querySelector('[data-stock-available]');
    const lowCountNode = root.querySelector('[data-stock-low-count]');
    const outCountNode = root.querySelector('[data-stock-out-count]');

    if (totalProductsNode) totalProductsNode.textContent = String(totalProducts);
    if (availableNode) availableNode.textContent = String(available);
    if (lowCountNode) lowCountNode.textContent = String(lowCount);
    if (outCountNode) outCountNode.textContent = String(outCount);
  };

  const fillProductSelect = () => {
    if (!productSelect) return;
    productSelect.innerHTML = '<option value="">Sélectionner</option>' + state.products
      .filter((product) => product.statut !== false)
      .map((product) => `<option value="${product.id}">${product.nom} (${product.stock_actuel ?? 0})</option>`)
      .join('');
  };

  const fillCategoryFilter = () => {
    if (!categoryFilter) return;
    categoryFilter.innerHTML = '<option value="all">Toutes les catégories</option>' + state.categories
      .map((category) => `<option value="${category.id}">${category.nom}</option>`)
      .join('');
  };

  const renderRows = () => {
    const term = String(searchInput?.value || '').trim().toLowerCase();
    const selectedCategory = categoryFilter?.value || 'all';
    const selectedState = stateFilter?.value || 'all';
    const lowOnly = lowOnlyButton?.dataset.lowOnly === 'true';

    const filtered = state.products.filter((product) => {
      const stockState = getStockStateLabel(product);
      const matchesSearch = !term || [product.nom, product.code_barres].filter(Boolean).join(' ').toLowerCase().includes(term);
      const matchesCategory = selectedCategory === 'all' || String(product.category_id ?? '') === String(selectedCategory);
      const matchesState = selectedState === 'all'
        || (selectedState === 'available' && stockState === 'available')
        || (selectedState === 'low' && stockState === 'low')
        || (selectedState === 'rupture' && stockState === 'rupture');
      const matchesLowOnly = !lowOnly || stockState === 'low';

      return matchesSearch && matchesCategory && matchesState && matchesLowOnly;
    });

    if (!tableBody) return;

    if (!filtered.length) {
      tableBody.innerHTML = '<tr><td colspan="10" class="empty-state">Aucun produit ne correspond aux filtres.</td></tr>';
      return;
    }

    tableBody.innerHTML = filtered.map((product) => {
      const stockState = getStockStateLabel(product);
      const label = stockState === 'rupture' ? 'Rupture' : stockState === 'low' ? 'Stock faible' : 'Disponible';
      const badgeClass = stockState === 'rupture' ? 'inactive' : stockState === 'low' ? 'warning' : 'active';

      return `
        <tr>
          <td><strong>${product.nom || 'Produit'}</strong></td>
          <td>${product.code_barres || '—'}</td>
          <td>${getCategoryName(product)}</td>
          <td>${Number(product.stock_actuel ?? 0)}</td>
          <td>${Number(product.stock_minimum ?? 0)}</td>
          <td>${Number(product.stock_maximum ?? 0) || '—'}</td>
          <td>${product.unite || '—'}</td>
          <td>${product.emplacement || '—'}</td>
          <td><span class="status-badge ${badgeClass}">${label}</span></td>
          <td>
            <div class="table-actions">
              <button type="button" class="table-action-btn primary" data-stock-action="movement" data-product-id="${product.id}">Mouvement</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  };

  const renderHistory = () => {
    if (!historyBody) return;

    const selectedType = historyFilter?.value || 'all';
    const filteredMovements = state.movements.filter((movement) => {
      if (selectedType === 'all') return true;
      return movement.type === selectedType;
    });

    if (!filteredMovements.length) {
      historyBody.innerHTML = '<tr><td colspan="8" class="empty-state">Aucun mouvement enregistré.</td></tr>';
      return;
    }

    historyBody.innerHTML = filteredMovements.map((movement) => {
      const product = state.products.find((item) => String(item.id) === String(movement.product_id ?? ''));
      return `
        <tr>
          <td>${movement.created_at ? new Date(movement.created_at).toLocaleDateString('fr-FR') : '—'}</td>
          <td>${product?.nom || 'Produit'}</td>
          <td>${movement.type || '—'}</td>
          <td>${Number(movement.quantity ?? 0)}</td>
          <td>${Number(movement.stock_before ?? 0)}</td>
          <td>${Number(movement.stock_after ?? 0)}</td>
          <td>${movement.motif || '—'}</td>
          <td>${movement.reference || '—'}</td>
        </tr>
      `;
    }).join('');
  };

  const setModalOpen = (open) => {
    if (!modal) return;
    modal.classList.toggle('hidden', !open);
    modal.setAttribute('aria-hidden', String(!open));
  };

  const resetForm = () => {
    if (!form) return;
    form.reset();
    const typeInput = form.querySelector('[name="type"]');
    if (typeInput) typeInput.value = '';
    const productInput = form.querySelector('[name="product_id"]');
    if (productInput) productInput.value = '';
  };

  const loadData = async () => {
    try {
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="10" class="empty-state">Chargement du stock...</td></tr>';
      }

      const [products, categories, movements] = await Promise.all([
        getStockProducts(),
        getStockCategories(),
        getStockMovements()
      ]);

      state.products = products;
      state.categories = categories;
      state.movements = movements;

      fillCategoryFilter();
      fillProductSelect();
      renderStats();
      renderRows();
      renderHistory();
    } catch (error) {
      console.error('Erreur chargement stock:', error);
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="10" class="empty-state">Impossible de charger le stock.</td></tr>';
      }
      showToast(error?.message || 'Erreur de chargement du stock.');
    }
  };

  const submitMovement = async (event) => {
    event.preventDefault();
    if (!form) return;

    const formData = new FormData(form);
    const payload = {
      product_id: formData.get('product_id'),
      type: formData.get('type'),
      quantity: Number(formData.get('quantity') || 0),
      motif: String(formData.get('motif') || '').trim(),
      reference: String(formData.get('reference') || '').trim(),
      date_mouvement: formData.get('date_mouvement') || new Date().toISOString().slice(0, 10)
    };

    if (!payload.product_id) {
      showToast('Le produit est obligatoire.');
      return;
    }

    if (!payload.type) {
      showToast('Le type de mouvement est obligatoire.');
      return;
    }

    if (!Number.isFinite(payload.quantity) || payload.quantity <= 0) {
      showToast('La quantité doit être un nombre supérieur à 0.');
      return;
    }

    try {
      const selectedProduct = state.products.find((product) => String(product.id) === String(payload.product_id));
      const currentStock = Number(selectedProduct?.stock_actuel ?? 0);

      if (['Sortie', 'Ajustement négatif'].includes(payload.type) && payload.quantity > currentStock) {
        showToast(`Stock insuffisant. Quantité demandée: ${payload.quantity}. Stock disponible: ${currentStock}.`);
        return;
      }

      await createStockMovement(payload);
      resetForm();
      setModalOpen(false);
      showToast('Mouvement enregistré.');
      await loadData();
    } catch (error) {
      console.error('Erreur mouvement stock:', error);
      showToast(error?.message || 'Une erreur est survenue lors de l’enregistrement du mouvement.');
    }
  };

  if (searchInput) {
    searchInput.addEventListener('input', renderRows);
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', renderRows);
  }

  if (stateFilter) {
    stateFilter.addEventListener('change', renderRows);
  }

  if (historyFilter) {
    historyFilter.addEventListener('change', renderHistory);
  }

  if (lowOnlyButton) {
    lowOnlyButton.dataset.lowOnly = 'false';
    lowOnlyButton.addEventListener('click', () => {
      const nextValue = lowOnlyButton.dataset.lowOnly === 'true' ? 'false' : 'true';
      lowOnlyButton.dataset.lowOnly = nextValue;
      lowOnlyButton.textContent = nextValue === 'true' ? 'Afficher tous les produits' : 'Voir uniquement les stocks faibles';
      renderRows();
    });
  }

  if (refreshButton) {
    refreshButton.addEventListener('click', () => loadData());
  }

  if (addButton) {
    addButton.addEventListener('click', () => {
      resetForm();
      setModalOpen(true);
    });
  }

  document.querySelectorAll('[data-stock-close]').forEach((button) => {
    button.addEventListener('click', () => {
      setModalOpen(false);
      resetForm();
    });
  });

  if (form) {
    form.addEventListener('submit', submitMovement);
  }

  root.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('[data-stock-action]');
    if (!actionButton) return;

    const selectedProductId = actionButton.dataset.productId;
    const selectedProduct = state.products.find((product) => String(product.id) === String(selectedProductId));
    if (!selectedProduct) return;

    resetForm();
    if (productSelect) {
      productSelect.value = String(selectedProductId);
    }
    setModalOpen(true);
  });

  loadData();
}

async function bootstrapAuth() {
  const authContext = await resolveAuthContext();

  if (!authContext.session || !authContext.user) {
    updateAuthState({
      session: null,
      user: null,
      profile: null,
      roleName: null
    });
    renderLoginPage();
    return;
  }

  updateAuthState(authContext);
  renderPage('dashboard', { loading: true, error: null });

  onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT') {
      updateAuthState({ session: null, user: null, profile: null, roleName: null });
      renderLoginPage('Vous avez ete deconnecte.');
      return;
    }

    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      const refreshedContext = await resolveAuthContext();
      updateAuthState(refreshedContext);

      if (!refreshedContext.session || !refreshedContext.user) {
        renderLoginPage('Session expiree. Veuillez vous reconnecter.');
        return;
      }

      renderPage('dashboard', { loading: true, error: null });
    }
  });
}

bootstrapAuth();
