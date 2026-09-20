export default function Table({ columns = [], rows = [] }) {
  return `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            ${columns.map((column) => `<th>${column}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.length
            ? rows
                .map(
                  (row) => `
                    <tr>
                      ${row.map((cell) => `<td>${cell}</td>`).join('')}
                    </tr>
                  `
                )
                .join('')
            : `<tr><td colspan="${columns.length}" class="empty-state">Aucune donnée pour le moment.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}
