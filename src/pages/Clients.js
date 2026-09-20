export default function Clients() {
  return `
    <section class="page-card customers-page" data-clients-root>
      <div class="page-header customers-header">
        <div>
          <h3>Clients</h3>
          <p class="page-description">Gestion des profils clients, historique d’achats et fidélisation.</p>
        </div>
        <button class="btn btn-primary" type="button" data-client-add>+ Ajouter un client</button>
      </div>

      <div class="stats-grid" data-clients-stats>
        <article class="stat-card neutral">
          <span>Total clients</span>
          <strong>0</strong>
          <small>clients enregistrés</small>
        </article>
        <article class="stat-card primary">
          <span>Clients actifs</span>
          <strong>0</strong>
          <small>avec achats</small>
        </article>
        <article class="stat-card success">
          <span>Nouveaux clients</span>
          <strong>0</strong>
          <small>30 derniers jours</small>
        </article>
        <article class="stat-card warning">
          <span>Clients ayant effectué un achat</span>
          <strong>0</strong>
          <small>transactions</small>
        </article>
      </div>

      <div class="products-toolbar">
        <label class="searchbox products-search" aria-label="Recherche client">
          <span>⌕</span>
          <input type="search" data-client-search placeholder="Rechercher par nom, prénom, téléphone ou email" />
        </label>

        <button class="btn btn-secondary" type="button" data-client-refresh>Actualiser</button>
      </div>

      <div class="table-wrapper">
        <table class="data-table products-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Téléphone</th>
              <th>Email</th>
              <th>Adresse</th>
              <th>Nombre d’achats</th>
              <th>Montant dépensé</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody data-clients-table-body>
            <tr>
              <td colspan="9" class="empty-state">Chargement des clients...</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="modal-backdrop hidden" data-client-modal aria-hidden="true">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="client-modal-title">
          <div class="modal-header">
            <h3 id="client-modal-title">Ajouter un client</h3>
            <button type="button" class="icon-button" data-client-close aria-label="Fermer">✕</button>
          </div>

          <form data-client-form>
            <div class="modal-body">
              <input type="hidden" name="id" data-client-id />

              <div class="form-grid">
                <label class="field-group">
                  <span>Nom *</span>
                  <input type="text" name="nom" data-client-field="nom" required />
                </label>

                <label class="field-group">
                  <span>Prénom</span>
                  <input type="text" name="prenom" data-client-field="prenom" />
                </label>

                <label class="field-group">
                  <span>Téléphone</span>
                  <input type="tel" name="telephone" data-client-field="telephone" />
                </label>

                <label class="field-group">
                  <span>Email</span>
                  <input type="email" name="email" data-client-field="email" />
                </label>

                <label class="field-group full-width">
                  <span>Adresse</span>
                  <textarea name="adresse" data-client-field="adresse" rows="3"></textarea>
                </label>

                <div class="field-group full-width" data-client-status-field></div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-client-close>Annuler</button>
              <button type="submit" class="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </div>
      </div>

      <div class="modal-backdrop hidden" data-client-detail-modal aria-hidden="true">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="client-detail-title">
          <div class="modal-header">
            <h3 id="client-detail-title">Fiche client</h3>
            <button type="button" class="icon-button" data-client-detail-close aria-label="Fermer">✕</button>
          </div>

          <div class="modal-body">
            <div data-client-detail-content class="customer-detail-content"></div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-client-detail-close>Fermer</button>
          </div>
        </div>
      </div>
    </section>
  `;
}
