export default function Ventes() {
  return `
    <section class="page-card sales-page" data-sales-root>
      <div class="page-header sales-header">
        <div>
          <h3>Ventes</h3>
          <p class="page-description">Recherche rapide, panier, paiement et validation de la vente.</p>
        </div>
        <button class="btn btn-secondary" type="button" data-sales-refresh>Actualiser</button>
      </div>

      <div class="sales-layout">
        <div class="panel sales-panel">
          <div class="sales-toolbar">
            <label class="searchbox sales-search" aria-label="Recherche produit">
              <span>⌕</span>
              <input type="search" placeholder="Rechercher un produit" data-sales-product-search />
            </label>

            <label class="field-group sales-code" aria-label="Code-barres">
              <span>Code-barres</span>
              <input type="text" placeholder="Scanner ou saisir le code" data-sales-barcode-input />
            </label>
          </div>

          <div class="sales-grid" data-sales-product-list>
            <div class="empty-state">Chargement des produits...</div>
          </div>
        </div>

        <aside class="panel sales-cart-panel">
          <div class="panel-header">
            <h3>Panier</h3>
            <span class="panel-tag" data-sales-item-count>0 article(s)</span>
          </div>

          <div class="sales-form-stack">
            <label class="field-group">
              <span>Client</span>
              <select class="form-select" data-sales-customer>
                <option value="">Client de passage</option>
              </select>
            </label>

            <label class="field-group">
              <span>Recherche client</span>
              <input type="search" placeholder="Nom ou téléphone" data-sales-customer-search />
            </label>

            <label class="field-group">
              <span>Mode de paiement</span>
              <select class="form-select" data-sales-payment>
                <option value="especes">Espèces</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="carte_bancaire">Carte bancaire</option>
                <option value="autre">Autre</option>
              </select>
            </label>
          </div>

          <div class="cart-table-wrapper">
            <table class="data-table compact sales-cart-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Qté</th>
                  <th>Remise</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody data-sales-cart-body>
                <tr>
                  <td colspan="5" class="empty-state">Aucun produit dans le panier.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="sale-total-box">
            <div class="total-line">
              <span>Sous-total</span>
              <strong data-sales-subtotal>0 FCFA</strong>
            </div>
            <div class="total-line">
              <span>Remise</span>
              <strong data-sales-discount>0 FCFA</strong>
            </div>
            <div class="total-line grand">
              <span>TOTAL À PAYER</span>
              <strong data-sales-total>0 FCFA</strong>
            </div>
          </div>

          <button class="btn btn-primary btn-block" type="button" data-sales-submit disabled>Valider la vente</button>
        </aside>
      </div>

      <div class="panel sales-history-panel">
        <div class="panel-header">
          <h3>Historique des ventes</h3>
        </div>

        <div class="table-wrapper">
          <table class="data-table compact">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Date</th>
                <th>Client</th>
                <th>Montant</th>
                <th>Mode de paiement</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody data-sales-history-body>
              <tr>
                <td colspan="7" class="empty-state">Chargement des ventes...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="modal-backdrop hidden" data-sales-detail-modal aria-hidden="true">
        <div class="modal sales-details-modal" role="dialog" aria-modal="true" aria-labelledby="sales-detail-title">
          <div class="modal-header">
            <h3 id="sales-detail-title">Détail de la vente</h3>
            <button type="button" class="icon-button" data-sales-detail-close aria-label="Fermer">✕</button>
          </div>
          <div class="modal-body">
            <div data-sales-detail-content></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-sales-detail-close>Fermer</button>
          </div>
        </div>
      </div>

      <div class="modal-backdrop hidden" data-sales-receipt-modal aria-hidden="true">
        <div class="modal sales-receipt-modal" role="dialog" aria-modal="true" aria-labelledby="sales-receipt-title">
          <div class="modal-header">
            <h3 id="sales-receipt-title">Reçu</h3>
            <button type="button" class="icon-button" data-sales-receipt-close aria-label="Fermer">✕</button>
          </div>
          <div class="modal-body">
            <div class="receipt" data-sales-receipt-content></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-sales-receipt-close>Fermer</button>
            <button type="button" class="btn btn-primary" data-sales-print-receipt>Imprimer le reçu</button>
          </div>
        </div>
      </div>
    </section>
  `;
}
