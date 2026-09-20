export default function Rapports() {
  return `
    <section class="page-card reports-page" data-reports-root>
      <div class="page-header reports-header">
        <div>
          <h3>Rapports &amp; Statistiques</h3>
          <p class="page-description">Suivi des ventes, achats, stocks et performances du supermarché.</p>
        </div>

        <div class="reports-toolbar">
          <select class="form-select" data-reports-period>
            <option value="today">Aujourd’hui</option>
            <option value="week">Cette semaine</option>
            <option value="month" selected>Ce mois</option>
            <option value="year">Cette année</option>
            <option value="custom">Personnalisée</option>
          </select>

          <input class="form-input hidden" type="date" data-reports-custom-start />
          <input class="form-input hidden" type="date" data-reports-custom-end />
        </div>
      </div>

      <div class="reports-status hidden" data-reports-loading>Chargement des données en cours...</div>
      <div class="reports-status error hidden" data-reports-error></div>
      <div class="reports-empty hidden" data-reports-empty>Aucune donnée disponible pour cette période.</div>

      <div class="stats-grid">
        <article class="stat-card success">
          <span>Chiffre d’affaires</span>
          <strong data-reports-revenue>0 FCFA</strong>
          <small data-reports-revenue-meta>0 ventes</small>
        </article>

        <article class="stat-card primary">
          <span>Nombre de ventes</span>
          <strong data-reports-sales-count>0</strong>
          <small>validées</small>
        </article>

        <article class="stat-card neutral">
          <span>Panier moyen</span>
          <strong data-reports-average-basket>0 FCFA</strong>
          <small>moyenne</small>
        </article>

        <article class="stat-card warning">
          <span>Total des achats</span>
          <strong data-reports-purchases-total>0 FCFA</strong>
          <small data-reports-purchases-meta>0 achats</small>
        </article>

        <article class="stat-card danger">
          <span>Marge estimée</span>
          <strong data-reports-margin>0 FCFA</strong>
          <small>revenus - coût estimé</small>
        </article>

        <article class="stat-card neutral">
          <span>Produits vendus</span>
          <strong data-reports-products-sold>0</strong>
          <small>unités</small>
        </article>
      </div>

      <div class="content-grid">
        <div class="panel">
          <div class="panel-header">
            <h3>Performance des ventes</h3>
          </div>
          <div class="chart-wrap">
            <canvas data-reports-sales-chart></canvas>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h3>Évolution du chiffre d’affaires</h3>
          </div>
          <div class="chart-wrap">
            <canvas data-reports-revenue-chart></canvas>
          </div>
        </div>
      </div>

      <div class="content-grid two-col">
        <div class="panel">
          <div class="panel-header">
            <h3>Produits les plus vendus</h3>
          </div>

          <div class="table-wrapper">
            <table class="data-table compact">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Quantité</th>
                  <th>CA</th>
                  <th>Ventes</th>
                </tr>
              </thead>
              <tbody data-reports-top-products>
                <tr><td colspan="4">Aucune donnée.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h3>Ventes par catégorie</h3>
          </div>
          <div class="chart-wrap">
            <canvas data-reports-category-chart></canvas>
          </div>
        </div>
      </div>

      <div class="content-grid two-col">
        <div class="panel">
          <div class="panel-header">
            <h3>Modes de paiement</h3>
          </div>

          <div class="table-wrapper">
            <table class="data-table compact">
              <thead>
                <tr>
                  <th>Mode</th>
                  <th>Nombre</th>
                  <th>Montant</th>
                </tr>
              </thead>
              <tbody data-reports-payment-table>
                <tr><td colspan="3">Aucune donnée.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h3>Achats</h3>
          </div>

          <div class="mini-grid">
            <div class="mini-metric">
              <span>Nombre d’achats</span>
              <strong data-reports-purchases-count>0</strong>
            </div>
            <div class="mini-metric">
              <span>Montant total</span>
              <strong data-reports-purchases-amount>0 FCFA</strong>
            </div>
            <div class="mini-metric">
              <span>Fournisseurs concernés</span>
              <strong data-reports-suppliers-count>0</strong>
            </div>
          </div>

          <div class="chart-wrap chart-wrap-small">
            <canvas data-reports-purchase-chart></canvas>
          </div>
        </div>
      </div>

      <div class="content-grid two-col">
        <div class="panel">
          <div class="panel-header">
            <h3>État du stock</h3>
          </div>

          <div class="mini-grid">
            <div class="mini-metric">
              <span>Total produits</span>
              <strong data-reports-total-products>0</strong>
            </div>
            <div class="mini-metric">
              <span>Stock faible</span>
              <strong data-reports-low-stock>0</strong>
            </div>
            <div class="mini-metric">
              <span>Ruptures</span>
              <strong data-reports-out-of-stock>0</strong>
            </div>
            <div class="mini-metric">
              <span>Valeur estimée du stock</span>
              <strong data-reports-stock-value>0 FCFA</strong>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h3>Produits nécessitant un réapprovisionnement</h3>
          </div>

          <div class="table-wrapper">
            <table class="data-table compact">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Stock actuel</th>
                  <th>Stock minimum</th>
                  <th>Écart</th>
                  <th>Fournisseur</th>
                </tr>
              </thead>
              <tbody data-reports-stock-table>
                <tr><td colspan="5">Aucun produit à réapprovisionner.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  `;
}
