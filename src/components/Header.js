export default function Header({ title = 'Tableau de bord', subtitle = 'Vue générale de l’activité du supermarché', actions = [], userName = 'Admin Principal', userRole = 'Administrateur' }) {
  const initials = (userName || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'U';

  return `
    <header class="topbar">
      <div class="topbar-left">
        <button class="icon-button mobile-toggle" type="button" data-sidebar-toggle aria-label="Ouvrir le menu">
          ☰
        </button>
        <div>
          <p class="eyebrow">${title}</p>
          <h2>${subtitle}</h2>
        </div>
      </div>

      <div class="topbar-actions">
        <label class="searchbox" aria-label="Recherche">
          <span>⌕</span>
          <input type="search" placeholder="Rechercher..." />
        </label>

        <button class="icon-button" type="button" aria-label="Notifications">🔔</button>

        <div class="user-profile" aria-label="Profil utilisateur">
          <div class="avatar">${initials}</div>
          <div class="user-meta">
            <strong>${userName}</strong>
            <span>${userRole}</span>
          </div>
        </div>

        <button class="btn btn-secondary" type="button" data-auth-signout>Se déconnecter</button>

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
    </header>
  `;
}
