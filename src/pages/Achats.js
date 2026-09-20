export default function Achats() {
  return `
    <section class="page-card purchases-page" data-purchases-root>
      <div class="page-header purchases-header">
        <div>
          <h3>Achats</h3>
          <p class="page-description">Suivi des approvisionnements fournisseurs et du réapprovisionnement de stock.</p>
        </div>
        <button class="btn btn-primary" type="button" data-purchase-add>+ Nouvel achat</button>
      </div>

      <div class="stats-grid" data-purchases-stats>
        <article class="stat-card neutral">
          <span>Total achats</span>
          <strong>0</strong>
          <small>achats enregistrés</small>
        </article>
        <article class="stat-card primary">
          <span>Achats du mois</span>
          <strong>0</strong>
          <small>ce mois</small>
        </article>
        <article class="stat-card success">
          <span>Montant total</span>
          <strong>0 FCFA</strong>
          <small>achats cumulés</small>
        </article>
        <article class="stat-card warning">
          <span>Achats en attente</span>
          <strong>0</strong>
          <small>à réceptionner</small>
        </article>
      </div>

      <div class="products-toolbar">
        <label class="searchbox products-search" aria-label="Recherche achat">
          <span>⌕</span>
          <input type="search" data-purchase-search placeholder="Rechercher par fournisseur, référence ou statut" />
        </label>

        <label class="field-group compact-field">
          <span>Fournisseur</span>
          <select data-purchase-filter-supplier>
            <option value="all">Tous</option>
          </select>
        </label>

        <label class="field-group compact-field">
          <span>Statut</span>
          <select data-purchase-filter-status>
            <option value="all">Tous</option>
            <option value="En attente">En attente</option>
            <option value="Réceptionné">Réceptionné</option>
            <option value="Annulé">Annulé</option>
          </select>
        </label>

        <button class="btn btn-secondary" type="button" data-purchase-refresh>Actualiser</button>
      </div>

      <div class="table-wrapper">
        <table class="data-table products-table">
          <thead>
            <tr>
              <th>Référence</th>
              <th>Date</th>
              <th>Fournisseur</th>
              <th>Articles</th>
              <th>Montant total</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody data-purchases-table-body>
            <tr>
              <td colspan="7" class="empty-state">Chargement des achats...</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="modal-backdrop hidden" data-purchase-modal aria-hidden="true">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="purchase-modal-title">
          <div class="modal-header">
            <h3 id="purchase-modal-title">Nouvel achat</h3>
            <button type="button" class="icon-button" data-purchase-close aria-label="Fermer">✕</button>
          </div>

          <form data-purchase-form>
            <div class="modal-body">
              <input type="hidden" name="id" data-purchase-id />

              <div class="form-grid">
                <label class="field-group">
                  <span>Fournisseur *</span>
                  <select name="supplier_id" data-purchase-supplier required></select>
                </label>

                <label class="field-group">
                  <span>Date d’achat</span>
                  <input type="date" name="date_achat" data-purchase-date />
                </label>

                <label class="field-group">
                  <span>Référence fournisseur</span>
                  <input type="text" name="numero_facture" data-purchase-reference />
                </label>

                <label class="field-group full-width">
                  <span>Notes</span>
                  <textarea name="notes" data-purchase-notes rows="3"></textarea>
                </label>
              </div>

              <div class="panel purchase-items-panel">
                <div class="panel-header">
                  <h3>Produits achetés</h3>
                  <button type="button" class="btn btn-secondary" data-purchase-add-line>+ Ajouter un produit</button>
                </div>

                <div class="table-wrapper">
                  <table class="data-table compact">
                    <thead>
                      <tr>
                        <th>Produit</th>
                        <th>Quantité</th>
                        <th>Prix unitaire</th>
                        <th>Remise</th>
                        <th>Sous-total</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody data-purchase-items-body></tbody>
                  </table>
                </div>

                <div class="purchase-summary">
                  <div><span>Sous-total</span><strong data-purchase-subtotal>0 FCFA</strong></div>
                  <div><span>Remise</span><strong data-purchase-discount>0 FCFA</strong></div>
                  <div class="grand-total"><span>Total achat</span><strong data-purchase-total>0 FCFA</strong></div>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-purchase-close>Annuler</button>
              <button type="submit" class="btn btn-primary">Enregistrer achat</button>
            </div>
          </form>
        </div>
      </div>

      <div class="modal-backdrop hidden" data-purchase-detail-modal aria-hidden="true">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="purchase-detail-title">
          <div class="modal-header">
            <h3 id="purchase-detail-title">Détails achat</h3>
            <button type="button" class="icon-button" data-purchase-detail-close aria-label="Fermer">✕</button>
          </div>

          <div class="modal-body">
            <div data-purchase-detail-content class="purchase-detail-content"></div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-purchase-detail-close>Fermer</button>
          </div>
        </div>
      </div>
    </section>
  `;
}
