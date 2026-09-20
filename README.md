# Supermarché Manager

Application de gestion de supermarché développée avec Vite, JavaScript vanilla, HTML5 et CSS3, connectée à Supabase.

## Prérequis

- Node.js 18+
- Un projet Supabase avec le schéma public déjà créé

## Installation

1. Copier `.env.example` vers `.env`
2. Ajouter vos valeurs Supabase :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Installer les dépendances :
   ```bash
   npm install
   ```
4. Démarrer le projet :
   ```bash
   npm run dev -- --host
   ```

## Sécurité

- Ne jamais utiliser la clé `service_role` côté frontend.
- Conserver les clés dans `.env` seulement.
- Préparer l’application pour une intégration future avec Supabase Auth.

## Structure

- `src/components` : composants UI réutilisables
- `src/pages` : écrans de l’application
- `src/services` : accès aux données Supabase
- `src/styles` : styles globaux et responsive
