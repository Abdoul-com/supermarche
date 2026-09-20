import { formatCurrency, formatDate } from "../utils/formatters.js";

export default function Dashboard(data = {}) {
  const dashboardData = {
    loading: false,
    error: null,
    metrics: {
      productsCount: 0,
      customersCount: 0,
      salesCount: 0,
      revenue: 0,
      lowStockCount: 0,
    },
    lowStockProducts: [],
    recentSales: [],
    ...data,
  };

  const stats = [
    {
      label: "Chiffre d’affaires",
      value: formatCurrency(dashboardData.metrics.revenue),
      meta: dashboardData.metrics.salesCount
        ? "ventes validées"
        : "aucune vente valide",
      tone: "success",
    },
    {
      label: "Nombre de ventes",
      value: String(dashboardData.metrics.salesCount),
      meta: "validées",
      tone: "primary",
    },
    {
      label: "Nombre de produits",
      value: String(dashboardData.metrics.productsCount),
      meta: "actifs",
      tone: "neutral",
    },
    {
      label: "Stock faible",
      value: String(dashboardData.metrics.lowStockCount),
      meta: "à surveiller",
      tone: "warning",
    },
  ];

  const salesRows = (dashboardData.recentSales ?? []).map(
    (sale) => `
    <tr>
      <td>${sale.id ?? "—"}</td>
      <td>${sale.client ?? "Client de passage"}</td>
      <td>${formatCurrency(sale.montant ?? 0)}</td>
      <td>${sale.date ? formatDate(sale.date) : "—"}</td>
      <td>${sale.statut ? (String(sale.statut).toLowerCase() === "valide" ? "Valide" : sale.statut) : "Valide"}</td>
    </tr>
  `,
  );

  const stockRows = (dashboardData.lowStockProducts ?? []).map(
    (product) => `
    <tr>
      <td>${product.nom ?? "Produit"}</td>
      <td>${product.stock_actuel ?? 0}</td>
      <td>${product.stock_minimum ?? 0}</td>
    </tr>
  `,
  );

  return `
    <section class="dashboard-page" data-dashboard-root>
      ${
        dashboardData.loading
          ? `
        <div class="panel">
          <div class="panel-header">
            <h3>Chargement du tableau de bord</h3>
          </div>
          <p class="empty-state">Chargement des données du magasin...</p>
        </div>
      `
          : dashboardData.error
            ? `
        <div class="panel">
          <div class="panel-header">
            <h3>Erreur de synchronisation</h3>
          </div>
          <p class="empty-state">${dashboardData.error}</p>
        </div>
      `
            : `
        <div class="stats-grid">
          ${stats
            .map(
              (stat) => `
                <article class="stat-card ${stat.tone}">
                  <span>${stat.label}</span>
                  <strong>${stat.value}</strong>
                  <small>${stat.meta}</small>
                </article>
              `,
            )
            .join("")}
        </div>

        <div class="content-grid two-col">
          <div class="panel">
            <div class="panel-header">
              <h3>Dernières ventes</h3>
            </div>

            <div class="table-wrapper">
              <table class="data-table compact">
                <thead>
                  <tr>
                    <th>N° Vente</th>
                    <th>Client</th>
                    <th>Montant</th>
                    <th>Date</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  ${salesRows.length ? salesRows.join("") : '<tr><td colspan="5">Aucune vente enregistrée.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>

          <div class="panel">
            <div class="panel-header">
              <h3>Produits presque en rupture</h3>
            </div>

            <div class="table-wrapper">
              <table class="data-table compact">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Stock actuel</th>
                    <th>Stock min</th>
                  </tr>
                </thead>
                <tbody>
                  ${stockRows.length ? stockRows.join("") : '<tr><td colspan="3">Aucun produit à surveiller.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `
      }
    </section>
  `;
}
