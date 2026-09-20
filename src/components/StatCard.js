export default function StatCard({ label, value, meta, tone = 'neutral' }) {
  return `
    <article class="stat-card ${tone}">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${meta}</small>
    </article>
  `;
}
