export default function Stock() {
  return `
    <section class="page-card stock-page" data-stock-root>
      <div class="page-header stock-header">
        <div>
          <h3>Gestion du stock</h3>
          <p class="page-description">Suivi des niveaux de stock, alertes et mouvements d’inventaire.</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" type="button" data-stock-add>+ Mouvement de stock</button>
          <button class="btn btn-secondary" type="button" data-stock-refresh>Actualiser</button>
        </div>
      </div>

      <div class="stock-toolbar">
        <label class="searchbox stock-search" aria-label="Recherche stock">
          <span>⌕</span>
          <input type="search" data-stock-search placeholder="Rechercher un produit ou un code-barres" />
        </label>

        <select class="form-select" data-stock-category-filter>
          <option value="all">Toutes les catégories</option>
        </select>

        <select class="form-select" data-stock-state-filter>
          <option value="all">Tous</option>
          <option value="available">Disponible</option>
          <option value="low">Stock faible</option>
          <option value="rupture">Rupture</option>
        </select>

        <button class="btn btn-secondary" type="button" data-stock-low-only>Voir uniquement les stocks faibles</button>
      </div>

      <div class="stats-grid stock-stats">
        <article class="stat-card primary">
          <span>Total produits</span>
          <strong data-stock-total-products>0</strong>
          <small>catalogue</small>
        </article>

        <article class="stat-card success">
          <span>Stock disponible</span>
          <strong data-stock-available>0</strong>
          <small>unités</small>
        </article>

        <article class="stat-card warning">
          <span>Stock faible</span>
          <strong data-stock-low-count>0</strong>
          <small>à surveiller</small>
        </article>

        <article class="stat-card danger">
          <span>Produits en rupture</span>
          <strong data-stock-out-count>0</strong>
          <small>urgence</small>
        </article>
      </div>

      <div class="table-wrapper">
        <table class="data-table stock-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Code-barres</th>
              <th>Catégorie</th>
              <th>Stock actuel</th>
              <th>Stock minimum</th>
              <th>Stock maximum</th>
              <th>Unité</th>
              <th>Emplacement</th>
              <th>État</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody data-stock-table-body>
            <tr>
              <td colspan="10" class="empty-state">Chargement du stock...</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="panel stock-history-panel">
        <div class="panel-header">
          <h3>Historique des mouvements</h3>
          <select class="form-select" data-stock-movement-filter>
            <option value="all">Tous les types</option>
            <option value="Entrée">Entrée</option>
            <option value="Sortie">Sortie</option>
            <option value="Ajustement positif">Ajustement positif</option>
            <option value="Ajustement négatif">Ajustement négatif</option>
          </select>
        </div>

        <div class="table-wrapper">
          <table class="data-table compact stock-history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Produit</th>
                <th>Type</th>
                <th>Quantité</th>
                <th>Stock avant</th>
                <th>Stock après</th>
                <th>Motif</th>
                <th>Référence</th>
              </tr>
            </thead>
            <tbody data-stock-history-body>
              <tr>
                <td colspan="8" class="empty-state">Chargement de l’historique...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="modal-backdrop hidden" data-stock-modal aria-hidden="true">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="stock-modal-title">
          <div class="modal-header">
            <h3 id="stock-modal-title">Ajouter un mouvement de stock</h3>
            <button type="button" class="icon-button" data-stock-close aria-label="Fermer">✕</button>
          </div>

          <form data-stock-form>
            <div class="modal-body">
              <div class="form-grid">
                <label class="field-group">
                  <span>Produit *</span>
                  <select name="product_id" required data-stock-field="product_id">
                    <option value="">Sélectionner</option>
                  </select>
                </label>

                <label class="field-group">
                  <span>Type de mouvement *</span>
                  <select name="type" required data-stock-field="type">
                    <option value="">Sélectionner</option>
                    <option value="Entrée">Entrée</option>
                    <option value="Sortie">Sortie</option>
                    <option value="Ajustement positif">Ajustement positif</option>
                    <option value="Ajustement négatif">Ajustement négatif</option>
                  </select>
                </label>

                <label class="field-group">
                  <span>Quantité *</span>
                  <input type="number" step="1" min="1" name="quantity" data-stock-field="quantity" required />
                </label>

                <label class="field-group">
                  <span>Date du mouvement</span>
                  <input type="date" name="date_mouvement" data-stock-field="date_mouvement" />
                </label>

                <label class="field-group">
                  <span>Motif</span>
                  <input type="text" name="motif" data-stock-field="motif" placeholder="Ex. Réapprovisionnement, inventaire..." />
                </label>

                <label class="field-group">
                  <span>Référence</span>
                  <input type="text" name="reference" data-stock-field="reference" placeholder="Ex. BL-2026-001" />
                </label>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-stock-close>Annuler</button>
              <button type="submit" class="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  `;
}
