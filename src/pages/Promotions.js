export default function Promotions() {
  return `
    <section class="page-card promotions-page" data-promotions-root>
      <div class="page-header promotions-header">
        <div>
          <h3>Promotions</h3>
          <p class="page-description">Suivi des offres, des dates d’application et des produits concernés.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" type="button" data-promotions-add>+ Nouvelle promotion</button>
          <button class="btn btn-secondary" type="button" data-promotions-refresh>Actualiser</button>
        </div>
      </div>

      <div class="stats-grid" data-promotions-stats>
        <article class="stat-card neutral">
          <span>Total promotions</span>
          <strong data-promotions-total>0</strong>
          <small>enregistrées</small>
        </article>
        <article class="stat-card success">
          <span>Promotions actives</span>
          <strong data-promotions-active>0</strong>
          <small>actuellement</small>
        </article>
        <article class="stat-card warning">
          <span>Promotions à venir</span>
          <strong data-promotions-upcoming>0</strong>
          <small>futures</small>
        </article>
        <article class="stat-card danger">
          <span>Promotions expirées</span>
          <strong data-promotions-expired>0</strong>
          <small>à relancer</small>
        </article>
      </div>

      <div class="products-toolbar">
        <label class="searchbox products-search" aria-label="Recherche promotion">
          <span>⌕</span>
          <input type="search" data-promotions-search placeholder="Rechercher par nom ou produit" />
        </label>

        <label class="field-group compact-field">
          <span>Statut</span>
          <select data-promotions-status-filter>
            <option value="all">Toutes</option>
            <option value="a_venir">À venir</option>
            <option value="active">Actives</option>
            <option value="expiree">Expirées</option>
            <option value="desactive">Désactivées</option>
          </select>
        </label>
      </div>

      <div class="table-wrapper">
        <table class="data-table products-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Produit</th>
              <th>Remise</th>
              <th>Prix promo</th>
              <th>Date de début</th>
              <th>Date de fin</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody data-promotions-table-body>
            <tr>
              <td colspan="8" class="empty-state">Chargement des promotions...</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="modal-backdrop hidden" data-promotions-modal aria-hidden="true">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="promotion-modal-title">
          <div class="modal-header">
            <h3 id="promotion-modal-title">Nouvelle promotion</h3>
            <button type="button" class="icon-button" data-promotion-close aria-label="Fermer">✕</button>
          </div>

          <form data-promotions-form>
            <div class="modal-body">
              <input type="hidden" name="id" data-promotion-id />

              <div class="form-grid">
                <label class="field-group">
                  <span>Nom *</span>
                  <input type="text" name="nom" required />
                </label>

                <label class="field-group">
                  <span>Produit *</span>
                  <select name="product_id" required>
                    <option value="">Sélectionner un produit</option>
                  </select>
                </label>

                <label class="field-group">
                  <span>Prix promotionnel *</span>
                  <input type="number" name="prix_promotionnel" min="1" step="0.01" required />
                </label>

                <label class="field-group">
                  <span>Statut</span>
                  <label class="toggle-row">
                    <input type="checkbox" name="statut" checked />
                    <span>Active</span>
                  </label>
                </label>

                <label class="field-group">
                  <span>Date de début</span>
                  <input type="date" name="date_debut" />
                </label>

                <label class="field-group">
                  <span>Date de fin</span>
                  <input type="date" name="date_fin" />
                </label>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-promotion-close>Annuler</button>
              <button type="submit" class="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </div>
      </div>

      <div class="modal-backdrop hidden" data-promotions-detail-modal aria-hidden="true">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="promotion-detail-title">
          <div class="modal-header">
            <h3 id="promotion-detail-title">Détail promotion</h3>
            <button type="button" class="icon-button" data-promotion-detail-close aria-label="Fermer">✕</button>
          </div>

          <div class="modal-body">
            <div data-promotions-detail-content class="promotion-detail-content"></div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-promotion-detail-close>Fermer</button>
          </div>
        </div>
      </div>
    </section>
  `;
}
