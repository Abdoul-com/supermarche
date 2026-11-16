export default function Header({ title = 'Tableau de bord', subtitle = 'Vue générale de l’activité du supermarché', actions = [], userName = 'Admin Principal', userRole = 'Administrateur' }) {
  const initials = (userName || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'U';

  return `
    <header class="topbar navbar navbar-expand-lg bg-white border-bottom shadow-sm px-3 py-3 rounded-4">
      <div class="container-fluid px-0">
        <div class="topbar-left d-flex align-items-center gap-3">
          <button class="icon-button mobile-toggle btn btn-light border-0 rounded-circle" type="button" data-sidebar-toggle aria-label="Ouvrir le menu">
            ☰
          </button>
          <div>
            <p class="eyebrow text-uppercase small text-primary fw-semibold mb-1">${title}</p>
            <h2 class="mb-0 fs-4 fw-bold">${subtitle}</h2>
          </div>
        </div>

        <div class="topbar-actions d-flex align-items-center gap-2 ms-auto flex-wrap">
          <label class="searchbox input-group shadow-sm" aria-label="Recherche">
            <span class="input-group-text bg-light border-0">⌕</span>
            <input class="form-control border-0 bg-light" type="search" placeholder="Rechercher..." />
          </label>

          <button class="icon-button btn btn-light border-0 rounded-circle" type="button" aria-label="Notifications">🔔</button>

          <div class="user-profile d-flex align-items-center gap-2 bg-light rounded-pill px-2 py-1" aria-label="Profil utilisateur">
            <div class="avatar">${initials}</div>
            <div class="user-meta">
              <strong class="d-block">${userName}</strong>
              <span class="text-muted small">${userRole}</span>
            </div>
          </div>

          <button class="btn btn-outline-secondary" type="button" data-auth-signout>Se déconnecter</button>

          ${actions
            .map(
              (action) => `
                <button
                  class="btn ${action.variant || 'btn-secondary'}"
                  type="button"
                  data-action="${action.action || ''}"
                >
                  ${action.label}
                </button>
              `
            )
            .join('')}
        </div>
      </div>
    </header>
  `;
}
