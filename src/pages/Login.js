export default function Login({ error = '', loading = false } = {}) {
  return `
    <div class="login-page">
      <div class="login-card">
        <div class="login-brand" aria-label="Supermarché Manager">
          <div class="login-brand-mark">SM</div>
          <div>
            <span>SUPERMARCHÉ</span>
            <strong>MANAGER</strong>
          </div>
        </div>

        <div class="login-header">
          <h1>Connexion</h1>
          <p>Accédez à votre espace de gestion.</p>
        </div>

        <form class="login-form" data-login-form novalidate>
          <label class="field-group">
            <span>Email</span>
            <input type="email" name="email" placeholder="nom@exemple.com" autocomplete="email" required />
          </label>

          <label class="field-group">
            <span>Mot de passe</span>
            <input type="password" name="password" placeholder="Votre mot de passe" autocomplete="current-password" required />
          </label>

          <button type="submit" class="btn btn-primary login-submit" ${loading ? 'disabled' : ''}>
            ${loading ? 'Connexion...' : 'Se connecter'}
          </button>

          <p class="login-error" aria-live="polite">${error || ''}</p>
        </form>
      </div>
    </div>
  `;
}
