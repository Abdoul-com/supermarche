export default function Utilisateurs() {
  return `
    <section class="page-card users-page" data-users-root>
      <div class="page-header users-header">
        <div>
          <h3>Utilisateurs</h3>
          <p class="page-description">Gestion des comptes, des rôles et de l’accès aux modules.</p>
        </div>
        <button class="btn btn-primary" type="button" data-users-add>+ Nouvel utilisateur</button>
      </div>

      <div class="stats-grid" data-users-stats>
        <article class="stat-card neutral">
          <span>Total utilisateurs</span>
          <strong data-users-total>0</strong>
          <small>comptes enregistrés</small>
        </article>
        <article class="stat-card primary">
          <span>Utilisateurs actifs</span>
          <strong data-users-active>0</strong>
          <small>actifs</small>
        </article>
        <article class="stat-card success">
          <span>Administrateurs</span>
          <strong data-users-admin>0</strong>
          <small>rôle principal</small>
        </article>
        <article class="stat-card warning">
          <span>Autres rôles</span>
          <strong data-users-other>0</strong>
          <small>autres accès</small>
        </article>
      </div>

      <div class="products-toolbar">
        <label class="searchbox products-search" aria-label="Recherche utilisateur">
          <span>⌕</span>
          <input type="search" data-users-search placeholder="Rechercher par nom, identifiant, email ou rôle" />
        </label>

        <select class="form-select" data-users-role-filter aria-label="Filtrer par rôle">
          <option value="all">Tous les rôles</option>
        </select>

        <select class="form-select" data-users-status-filter aria-label="Filtrer par statut">
          <option value="all">Tous les statuts</option>
          <option value="actif">Actifs</option>
          <option value="inactif">Inactifs</option>
        </select>

        <button class="btn btn-secondary" type="button" data-users-refresh>Actualiser</button>
      </div>

      <div class="table-wrapper">
        <table class="data-table products-table">
          <thead>
            <tr>
              <th>Nom / identifiant</th>
              <th>Nom complet</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Date de création</th>
              <th>Dernière activité</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody data-users-table-body>
            <tr>
              <td colspan="7" class="empty-state">Chargement des utilisateurs...</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="modal-backdrop hidden" data-users-modal aria-hidden="true">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="users-modal-title">
          <div class="modal-header">
            <h3 id="users-modal-title">Ajouter un utilisateur</h3>
            <button type="button" class="icon-button" data-users-close aria-label="Fermer">✕</button>
          </div>

          <form data-users-form>
            <div class="modal-body">
              <input type="hidden" name="id" data-user-id />

              <div class="form-grid">
                <label class="field-group">
                  <span>Nom</span>
                  <input type="text" name="nom" placeholder="Nom" />
                </label>

                <label class="field-group">
                  <span>Prénom</span>
                  <input type="text" name="prenom" placeholder="Prénom" />
                </label>

                <label class="field-group">
                  <span>Identifiant / username</span>
                  <input type="text" name="username" placeholder="username" />
                </label>

                <label class="field-group">
                  <span>Email</span>
                  <input type="email" name="email" placeholder="email@exemple.com" />
                </label>

                <label class="field-group">
                  <span>Téléphone</span>
                  <input type="tel" name="telephone" placeholder="Téléphone" />
                </label>

                <label class="field-group">
                  <span>Rôle</span>
                  <select name="role_id" class="form-select"></select>
                </label>

                <label class="field-group">
                  <span>Statut</span>
                  <select name="statut" class="form-select">
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                  </select>
                </label>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-users-close>Annuler</button>
              <button type="submit" class="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </div>
      </div>

      <div class="modal-backdrop hidden" data-users-detail-modal aria-hidden="true">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="users-detail-title">
          <div class="modal-header">
            <h3 id="users-detail-title">Détails utilisateur</h3>
            <button type="button" class="icon-button" data-users-detail-close aria-label="Fermer">✕</button>
          </div>

          <div class="modal-body">
            <div data-users-detail-content class="customer-detail-content"></div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-users-detail-close>Fermer</button>
          </div>
        </div>
      </div>
    </section>
  `;
}
