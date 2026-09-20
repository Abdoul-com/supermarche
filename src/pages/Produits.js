export default function Produits() {
  return `
    <section class="page-card products-page" data-products-root>
      <div class="page-header products-header">
        <div>
          <h3>Produits</h3>
          <p class="page-description">Suivi du catalogue, des prix, du stock et de l'état des articles.</p>
        </div>
        <button class="btn btn-primary" type="button" data-add-product>+ Ajouter un produit</button>
      </div>

      <div class="products-toolbar">
        <label class="searchbox products-search" aria-label="Recherche produit">
          <span>⌕</span>
          <input type="search" data-product-search placeholder="Rechercher un produit, une référence ou un code-barres" />
        </label>

        <select class="form-select" data-product-category-filter>
          <option value="all">Toutes les catégories</option>
        </select>

        <button class="btn btn-secondary" type="button" data-product-refresh>Actualiser</button>
      </div>

      <div class="table-wrapper">
        <table class="data-table products-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Référence</th>
              <th>Catégorie</th>
              <th>Prix achat</th>
              <th>Prix vente</th>
              <th>Stock</th>
              <th>Stock min</th>
              <th>Fournisseur</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody data-products-table-body>
            <tr>
              <td colspan="10" class="empty-state">Chargement des produits...</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="modal-backdrop hidden" data-product-modal aria-hidden="true">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
          <div class="modal-header">
            <h3 id="product-modal-title">Ajouter un produit</h3>
            <button type="button" class="icon-button" data-product-close aria-label="Fermer">✕</button>
          </div>

          <form data-product-form>
            <div class="modal-body">
              <input type="hidden" name="id" data-product-id />

              <div class="form-grid">
                <label class="field-group">
                  <span>Nom du produit *</span>
                  <input type="text" name="nom" data-product-field="nom" required />
                </label>

                <label class="field-group">
                  <span>Référence</span>
                  <input type="text" name="reference" data-product-field="reference" />
                </label>

                <label class="field-group">
                  <span>Code-barres</span>
                  <input type="text" name="code_barres" data-product-field="code_barres" />
                </label>

                <label class="field-group">
                  <span>Marque</span>
                  <input type="text" name="marque" data-product-field="marque" />
                </label>

                <label class="field-group">
                  <span>Catégorie *</span>
                  <select name="category_id" data-product-field="category_id" required>
                    <option value="">Sélectionner</option>
                  </select>
                </label>

                <label class="field-group">
                  <span>Fournisseur</span>
                  <select name="supplier_id" data-product-field="supplier_id">
                    <option value="">Sélectionner</option>
                  </select>
                </label>

                <label class="field-group">
                  <span>Unité</span>
                  <input type="text" name="unite" data-product-field="unite" placeholder="Ex. paquet, carton, kg" />
                </label>

                <label class="field-group">
                  <span>Prix d'achat *</span>
                  <input type="number" step="0.01" min="0" name="prix_achat" data-product-field="prix_achat" required />
                </label>

                <label class="field-group">
                  <span>Prix de vente *</span>
                  <input type="number" step="0.01" min="0" name="prix_vente" data-product-field="prix_vente" required />
                </label>

                <label class="field-group">
                  <span>Stock actuel</span>
                  <input type="number" step="1" min="0" name="stock_actuel" data-product-field="stock_actuel" />
                </label>

                <label class="field-group">
                  <span>Stock minimum</span>
                  <input type="number" step="1" min="0" name="stock_minimum" data-product-field="stock_minimum" />
                </label>

                <label class="field-group">
                  <span>Date d'expiration</span>
                  <input type="date" name="date_expiration" data-product-field="date_expiration" />
                </label>

                <label class="field-group">
                  <span>Image URL</span>
                  <input type="url" name="image" data-product-field="image" placeholder="https://..." />
                </label>

                <label class="field-group checkbox-field">
                  <input type="checkbox" name="statut" data-product-field="statut" checked />
                  <span>Produit actif</span>
                </label>
              </div>

              <label class="field-group full-width">
                <span>Description</span>
                <textarea name="description" data-product-field="description" rows="4" placeholder="Description du produit"></textarea>
              </label>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-product-close>Annuler</button>
              <button type="submit" class="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  `;
}
