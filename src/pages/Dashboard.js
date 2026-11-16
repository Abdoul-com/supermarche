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
      meta: dashboardData.metrics.salesCount ? "ventes validées" : "aucune vente valide",
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
            <div class="panel card border-0 shadow-sm">
              <div class="panel-header card-header bg-white border-0">
                <h3 class="mb-0">Chargement du tableau de bord</h3>
              </div>
              <div class="card-body">
                <p class="empty-state text-muted mb-0">Chargement des données du magasin...</p>
              </div>
            </div>
          `
          : dashboardData.error
            ? `
              <div class="panel card border-0 shadow-sm">
                <div class="panel-header card-header bg-white border-0">
                  <h3 class="mb-0">Erreur de synchronisation</h3>
                </div>
                <div class="card-body">
                  <p class="empty-state text-danger mb-0">${dashboardData.error}</p>
                </div>
              </div>
            `
            : `
              <div class="row g-3 mb-4">
                ${stats
                  .map(
                    (stat) => `
                      <div class="col-12 col-sm-6 col-xl-3">
                        <article class="stat-card card border-0 shadow-sm h-100 ${stat.tone}">
                          <div class="card-body">
                            <span class="d-block small text-uppercase text-muted fw-semibold">${stat.label}</span>
                            <strong class="d-block fs-3 fw-bold mt-2">${stat.value}</strong>
                            <small class="text-muted">${stat.meta}</small>
                          </div>
                        </article>
                      </div>
                    `,
                  )
                  .join("")}
              </div>

              <div class="row g-4">
                <div class="col-12 col-xl-8">
                  <div class="panel card border-0 shadow-sm h-100">
                    <div class="panel-header card-header bg-white border-0 d-flex justify-content-between align-items-center">
                      <h3 class="mb-0">Dernières ventes</h3>
                    </div>

                    <div class="card-body p-0">
                      <div class="table-wrapper">
                        <table class="data-table table table-hover align-middle mb-0">
                          <thead class="table-light">
                            <tr>
                              <th>N° Vente</th>
                              <th>Client</th>
                              <th>Montant</th>
                              <th>Date</th>
                              <th>Statut</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${salesRows.length ? salesRows.join("") : '<tr><td colspan="5" class="text-center text-muted">Aucune vente enregistrée.</td></tr>'}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="col-12 col-xl-4">
                  <div class="panel card border-0 shadow-sm h-100">
                    <div class="panel-header card-header bg-white border-0">
                      <h3 class="mb-0">Produits presque en rupture</h3>
                    </div>

                    <div class="card-body p-0">
                      <div class="table-wrapper">
                        <table class="data-table table table-hover align-middle mb-0">
                          <thead class="table-light">
                            <tr>
                              <th>Produit</th>
                              <th>Stock</th>
                              <th>Min</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${stockRows.length ? stockRows.join("") : '<tr><td colspan="3" class="text-center text-muted">Aucun produit à surveiller.</td></tr>'}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `
      }
    </section>
  `;
}
