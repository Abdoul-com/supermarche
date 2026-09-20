export default function Fournisseurs() {
  return `
    <section class="page-card suppliers-page" data-suppliers-root>
      <div class="page-header suppliers-header">
        <div>
          <h3>Fournisseurs</h3>
          <p class="page-description">Suivi des fournisseurs, contacts, achats et statuts commerciaux.</p>
        </div>
        <button class="btn btn-primary" type="button" data-supplier-add>+ Ajouter un fournisseur</button>
      </div>

      <div class="stats-grid" data-suppliers-stats>
        <article class="stat-card neutral">
          <span>Total fournisseurs</span>
          <strong>0</strong>
          <small>fournisseurs enregistrés</small>
        </article>
        <article class="stat-card primary">
          <span>Fournisseurs actifs</span>
          <strong>0</strong>
          <small>actifs</small>
        </article>
        <article class="stat-card success">
          <span>Fournisseurs liés à des produits</span>
          <strong>0</strong>
          <small>liens catalogues</small>
        </article>
        <article class="stat-card warning">
          <span>Fournisseurs ayant des achats</span>
          <strong>0</strong>
          <small>transactions</small>
        </article>
      </div>

      <div class="products-toolbar">
        <label class="searchbox products-search" aria-label="Recherche fournisseur">
          <span>⌕</span>
          <input type="search" data-supplier-search placeholder="Rechercher par nom, contact, téléphone ou email" />
        </label>

        <button class="btn btn-secondary" type="button" data-supplier-refresh>Actualiser</button>
      </div>

      <div class="table-wrapper">
        <table class="data-table products-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Contact</th>
              <th>Téléphone</th>
              <th>Email</th>
              <th>Adresse</th>
              <th>Statut</th>
              <th>Nombre de produits</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody data-suppliers-table-body>
            <tr>
              <td colspan="8" class="empty-state">Chargement des fournisseurs...</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="modal-backdrop hidden" data-supplier-modal aria-hidden="true">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="supplier-modal-title">
          <div class="modal-header">
            <h3 id="supplier-modal-title">Ajouter un fournisseur</h3>
            <button type="button" class="icon-button" data-supplier-close aria-label="Fermer">✕</button>
          </div>

          <form data-supplier-form>
            <div class="modal-body">
              <input type="hidden" name="id" data-supplier-id />

              <div class="form-grid">
                <label class="field-group">
                  <span>Nom *</span>
                  <input type="text" name="nom" data-supplier-field="nom" required />
                </label>

                <label class="field-group">
                  <span>Contact</span>
                  <input type="text" name="contact" data-supplier-field="contact" />
                </label>

                <label class="field-group">
                  <span>Téléphone</span>
                  <input type="tel" name="telephone" data-supplier-field="telephone" />
                </label>

                <label class="field-group">
                  <span>Email</span>
                  <input type="email" name="email" data-supplier-field="email" />
                </label>

                <label class="field-group full-width">
                  <span>Adresse</span>
                  <textarea name="adresse" data-supplier-field="adresse" rows="3"></textarea>
                </label>

                <div class="field-group full-width" data-supplier-status-field></div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-supplier-close>Annuler</button>
              <button type="submit" class="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </div>
      </div>

      <div class="modal-backdrop hidden" data-supplier-detail-modal aria-hidden="true">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="supplier-detail-title">
          <div class="modal-header">
            <h3 id="supplier-detail-title">Détails fournisseur</h3>
            <button type="button" class="icon-button" data-supplier-detail-close aria-label="Fermer">✕</button>
          </div>

          <div class="modal-body">
            <div data-supplier-detail-content class="supplier-detail-content"></div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-supplier-detail-close>Fermer</button>
          </div>
        </div>
      </div>
    </section>
  `;
}
