export default function Inventaire() {
  return `
    <section class="page-card inventory-page" data-inventory-root>
      <div class="page-header inventory-header">
        <div>
          <h3>Inventaire</h3>
          <p class="page-description">Suivi des écarts physiques et comparaison avec le stock théorique.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" type="button" data-inventory-add>+ Nouvel inventaire</button>
          <button class="btn btn-secondary" type="button" data-inventory-refresh>Actualiser</button>
        </div>
      </div>

      <div class="stats-grid" data-inventory-stats>
        <article class="stat-card neutral">
          <span>Inventaires réalisés</span>
          <strong data-inventory-total>0</strong>
          <small>total</small>
        </article>
        <article class="stat-card warning">
          <span>Inventaires en cours</span>
          <strong data-inventory-open>0</strong>
          <small>à clôturer</small>
        </article>
        <article class="stat-card primary">
          <span>Produits comptés</span>
          <strong data-inventory-counted>0</strong>
          <small>articles suivis</small>
        </article>
        <article class="stat-card danger">
          <span>Nombre total d'écarts</span>
          <strong data-inventory-differences>0</strong>
          <small>écarts détectés</small>
        </article>
      </div>

      <div class="products-toolbar">
        <label class="searchbox products-search" aria-label="Recherche inventaire">
          <span>⌕</span>
          <input type="search" data-inventory-search placeholder="Rechercher une référence ou un statut" />
        </label>

        <label class="field-group compact-field">
          <span>Statut</span>
          <select data-inventory-status-filter>
            <option value="all">Tous</option>
            <option value="en_cours">En cours</option>
            <option value="cloture">Clôturé</option>
          </select>
        </label>
      </div>

      <div class="table-wrapper">
        <table class="data-table products-table">
          <thead>
            <tr>
              <th>Référence</th>
              <th>Date</th>
              <th>Produits</th>
              <th>Écarts</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody data-inventory-table-body>
            <tr>
              <td colspan="6" class="empty-state">Chargement des inventaires...</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="modal-backdrop hidden" data-inventory-modal aria-hidden="true">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="inventory-modal-title">
          <div class="modal-header">
            <h3 id="inventory-modal-title">Nouvel inventaire</h3>
            <button type="button" class="icon-button" data-inventory-close aria-label="Fermer">✕</button>
          </div>

          <form data-inventory-form>
            <div class="modal-body">
              <div class="form-grid">
                <label class="field-group">
                  <span>Date *</span>
                  <input type="date" name="date" data-inventory-date required />
                </label>

                <label class="field-group full-width">
                  <span>Notes</span>
                  <textarea name="notes" data-inventory-notes rows="3" placeholder="Informations complémentaires"></textarea>
                </label>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-inventory-close>Annuler</button>
              <button type="submit" class="btn btn-primary">Créer l’inventaire</button>
            </div>
          </form>
        </div>
      </div>

      <div class="modal-backdrop hidden" data-inventory-detail-modal aria-hidden="true">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="inventory-detail-title">
          <div class="modal-header">
            <h3 id="inventory-detail-title">Détail inventaire</h3>
            <button type="button" class="icon-button" data-inventory-detail-close aria-label="Fermer">✕</button>
          </div>

          <div class="modal-body">
            <div data-inventory-detail-content class="inventory-detail-content"></div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-inventory-detail-close>Fermer</button>
          </div>
        </div>
      </div>
    </section>
  `;
}
