import { menuItems } from '../utils/constants.js';

export default function Sidebar({ active = 'dashboard' }) {
  return `
    <aside class="sidebar">
      <div class="brand" aria-label="Supermarché Manager">
        <div class="brand-mark">SM</div>
        <div class="brand-text">
          <span class="brand-label">SUPERMARCHÉ</span>
          <strong>MANAGER</strong>
        </div>
      </div>

      <nav class="nav" aria-label="Menu principal">
        ${menuItems
          .map(
            (item) => `
              <button class="nav-item ${active === item.key ? 'active' : ''}" type="button" data-page="${item.key}">
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
