export default function Modal({ title = 'Fenêtre', content = '', footer = '' }) {
  return `
    <div class="modal-backdrop">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <h3 id="modal-title">${title}</h3>
          <button class="icon-button" type="button" aria-label="Fermer la fenêtre">×</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        <div class="modal-footer">
          ${footer}
        </div>
      </div>
    </div>
  `;
}
