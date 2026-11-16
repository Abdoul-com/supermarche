import { menuItems } from '../utils/constants.js';

export default function Sidebar({ active = 'dashboard' }) {
  return `
    <aside class="sidebar bg-dark text-white shadow-sm">
      <div class="brand d-flex align-items-center gap-3 px-3 py-3" aria-label="Supermarché Manager">
        <div class="brand-mark">SM</div>
        <div class="brand-text">
          <span class="brand-label d-block text-uppercase small text-white-50">SUPERMARCHÉ</span>
          <strong class="d-block fs-5 fw-bold">MANAGER</strong>
        </div>
      </div>

      <nav class="nav flex-column gap-2 px-3 pb-3" aria-label="Menu principal">
        ${menuItems
          .map(
            (item) => `
              <button
                class="nav-item btn btn-sm w-100 text-start d-flex align-items-center gap-3 ${active === item.key ? 'active btn-primary' : 'btn-link text-white-50'}"
                type="button"
                data-page="${item.key}"
              >
                <span class="nav-icon" aria-hidden="true">${item.icon}</span>
                <span class="nav-label">${item.label}</span>
              </button>
            `
          )
          .join('')}
      </nav>
    </aside>
  `;
}
