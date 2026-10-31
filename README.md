# NEXLORD — COBALT CORE

Boutique en ligne responsive (français) avec administration Supabase.

## Fichiers
- `index.html` + `styles.css` + `app.js` → boutique publique
- `admin.html` + `admin.js` → espace administration (connexion, mot de passe oublié, produits)

## Technologies
HTML / CSS / JavaScript, Supabase (Auth + Database + Storage), déploiement conseillé : Cloudflare Pages.

## Récupération de compte par e-mail
Pour que le lien reçu par e-mail ramène sur la page admin, dans Supabase :
1. **Authentication → URL Configuration → Redirect URLs** : ajouter l’adresse exacte de la page, par exemple `https://votre-site.pages.dev/admin.html` (et l’adresse locale si vous testez en local).
2. **Authentication → Email Templates → Reset Password** : garder le lien `{{ .ConfirmationURL }}`.
3. L’envoi d’e-mails intégré à Supabase est limité à quelques messages par heure. Pour un usage régulier, configurez votre propre SMTP (Authentication → SMTP Settings).

## Règle RLS nécessaire à la connexion admin
```sql
create policy "admin lit sa ligne" on public.admins
for select to authenticated using (user_id = auth.uid());
```

## Sécurité
- Ne jamais écrire de mot de passe dans le code ou le README.
- Ne jamais exposer la clé `service_role` dans le navigateur.
- La clé `sb_publishable` peut être publique, à condition que le RLS soit activé sur `products`, `admins` et le bucket.
