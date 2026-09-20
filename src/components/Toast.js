export default function Toast({ title = 'Notification', message = 'Opération effectuée avec succès.' }) {
  return `
    <div class="toast" role="status" aria-live="polite">
      <strong>${title}</strong>
      <span>${message}</span>
    </div>
  `;
}
