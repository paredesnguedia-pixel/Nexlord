# NEXLORD — COBALT CORE
Boutique responsive en français, préparée pour GitHub Pages et Supabase.

## Fichiers
- `index.html` : structure de la boutique
- `styles.css` : design responsive
- `app.js` : produits, recherche, filtres et commandes WhatsApp

## Connexion à Supabase
1. Ouvrez Supabase puis votre projet **NexLord**.
2. Allez dans **Project Settings → API** (ou Data API).
3. Copiez l'URL du projet et la clé publique/anon (publishable).
4. Dans `app.js`, remplacez `PASTE_YOUR_SUPABASE_PROJECT_URL_HERE` et `PASTE_YOUR_SUPABASE_PUBLIC_ANON_KEY_HERE`.
5. Enregistrez et envoyez la modification sur GitHub.

N'utilisez jamais la clé `service_role`/secrète dans le site public. La boutique affiche les produits avec `published = true`. Les politiques RLS doivent rester activées.

## Publication
Dans GitHub, ouvrez **Settings → Pages**, sélectionnez la branche principale et le dossier `/ (root)`, puis enregistrez.

Les commandes WhatsApp sont dirigées vers le numéro configuré dans `app.js` : 237657420284.

Cette version est la vitrine publique. Le tableau de bord admin pour ajouter des produits sera à créer séparément.
