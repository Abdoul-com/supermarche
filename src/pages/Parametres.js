export default function Parametres() {
  return `
    <section class="page-card settings-page" data-settings-root>
      <div class="page-header settings-header">
        <div>
          <h3>Paramètres</h3>
          <p class="page-description">Informations du supermarché et configuration générale.</p>
        </div>
        <button class="btn btn-secondary" type="button" data-settings-refresh>Actualiser</button>
      </div>

      <div class="content-grid two-col">
        <div class="panel">
          <div class="panel-header">
            <h3>Informations du supermarché</h3>
          </div>

          <form data-settings-form>
            <div class="form-grid">
              <label class="field-group full-width">
                <span>Nom du supermarché</span>
                <input type="text" name="nom_supermarche" placeholder="Nom du supermarché" />
              </label>

              <label class="field-group">
                <span>Téléphone</span>
                <input type="tel" name="telephone" placeholder="Téléphone" />
              </label>

              <label class="field-group">
                <span>Email</span>
                <input type="email" name="email" placeholder="contact@monsupermarche.local" />
              </label>

              <label class="field-group full-width">
                <span>Adresse</span>
                <textarea name="adresse" rows="4" placeholder="Adresse complète"></textarea>
              </label>

              <label class="field-group">
                <span>Devise</span>
                <input type="text" name="devise" placeholder="FCFA" maxlength="10" />
              </label>
            </div>

            <div class="modal-footer" style="padding-left:0; padding-right:0; padding-top:18px;">
              <button type="submit" class="btn btn-primary" data-settings-save>Enregistrer les paramètres</button>
            </div>
          </form>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h3>État</h3>
          </div>

          <div class="reports-status" data-settings-status aria-live="polite">
            Chargement des paramètres…
          </div>

          <div style="margin-top:18px; color: var(--muted); line-height:1.7;">
            <p><strong>Table source :</strong> settings</p>
            <p><strong>Colonnes utilisées :</strong> nom_supermarche, telephone, email, adresse, devise</p>
            <p>Les autres champs existants restent non exposés si la base ne les utilise pas.</p>
          </div>
        </div>
      </div>
    </section>
  `;
}
