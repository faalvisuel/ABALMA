# Alma

Application de mise en relation pour la location de matériel entre particuliers, d’abord pensée pour Dakar.

## Architecture

- `src/`: application web React, TypeScript et Vite; pages, navigation, authentification et composants.
- `src/lib/`: client Supabase et fonctions partagées (dates, prix indicatifs, images).
- `supabase/schema.sql`: schéma complet pour un nouveau projet Supabase, fonctions PostgreSQL, RLS et stockage.
- `supabase/prelaunch-migration.sql`: migration à appliquer aux projets Supabase déjà configurés.
- `public/`: identité visuelle, logo Alma et redirections SPA.
- `vercel.json`: réécritures des URL de l’application; le déploiement Vercel utilise `npm run build` et `dist/`.

La plateforme gère les comptes, annonces avec 3 à 5 photos, recherche, calendrier et demandes de réservation, profils, avis, code de remise à quatre chiffres, vérification manuelle d’identité et modération par un administrateur. Les copies d’identité sont gardées dans un stockage privé et supprimées après décision. Alma facilite la mise en relation et ne possède ni ne détient physiquement les biens annoncés. Aucun paiement, caution ou versement n’est traité par l’application pour le moment; les prix affichés sont indicatifs.

## Lancer un aperçu local

Prérequis : Node.js LTS et npm.

```bash
npm install
npm run dev
```

Sans configuration Supabase, la page d’accueil et les pages d’information restent visibles en aperçu hors ligne. Les annonces, comptes et réservations nécessitent le projet Supabase.

## Configuration Supabase

1. Pour un **nouveau** projet, exécuter `supabase/schema.sql` dans le SQL Editor de Supabase. Le fichier comprend les mises à jour de pré-lancement.
2. Pour un projet **déjà configuré**, exécuter une fois `supabase/prelaunch-migration.sql`. Elle ajoute l’enregistrement des versions de CGU acceptées, la suspension des comptes, le contrôle d’identité, un stockage privé pour les pièces, des règles RLS plus strictes et le parcours de réservation impayé. Elle remet à zéro les anciens indicateurs de paiement simulé; les anciennes réservations marquées comme payées redeviennent acceptées et impayées. Les fonctions de location et publication restent bloquées jusqu’à la vérification manuelle.
3. Dans `Authentication > URL Configuration`, déclarer les URL de développement et de production utilisées par le site.
4. Copier `.env.example` vers `.env.local` et renseigner les deux valeurs publiques de Supabase :

   ```dotenv
   VITE_SUPABASE_URL=https://votre-projet.supabase.co
   VITE_SUPABASE_ANON_KEY=votre-cle-publique-anon
   ```

   La même configuration doit être ajoutée dans Vercel sous **Settings > Environment Variables**, pour les environnements souhaités, puis redéployée.

## Connexion Google

Le bouton « Continuer avec Google » utilise Supabase Auth et demande l’acceptation des CGU avant la redirection. Pour l’activer, créer un client OAuth de type Web dans Google Cloud, puis activer **Authentication > Sign In / Providers > Google** dans Supabase et y saisir le Client ID et le Client Secret Google. Dans Google Cloud, ajouter comme URI de redirection autorisée l’URL de callback affichée par Supabase (format `https://<project-ref>.supabase.co/auth/v1/callback`). Dans **Authentication > URL Configuration** de Supabase, autoriser l’URL locale `http://127.0.0.1:5174/connexion` et l’URL de production. Exécuter la migration Alma mise à jour pour permettre la création de profil Google et enregistrer l’acceptation des conditions après le retour OAuth.

Ne jamais mettre une clé `service_role`, une clé `secret` ou un mot de passe dans une variable `VITE_*`, le dépôt ou un message. La clé `anon` / publishable est publique et doit toujours être associée aux règles RLS du schéma.

## Déploiement Vercel

Importer `faalvisuel/ABALMA` dans Vercel, utiliser `npm run build` et le répertoire de sortie `dist`. Configurer les deux variables d’environnement publiques ci-dessus et le domaine du site dans les URL d’authentification Supabase. `vercel.json` redirige les routes de l’application vers `index.html`.

## Documents et informations à compléter avant ouverture publique

Les pages `/cgu`, `/mentions-legales`, `/confidentialite` et `/cookies` sont accessibles depuis le site. Les mentions `[à compléter]` identifient les informations de l’exploitant qui ne doivent pas être inventées. Il n’y a pas de CGV séparées à ce stade, car Alma ne vend pas le matériel et n’encaisse pas de paiement. Les accords de location se font directement entre utilisateurs. Faire valider les clauses et les formalités sénégalaises par un juriste local, notamment les informations de l’éditeur et les traitements de données.

## Parcours principal

1. Visiter l’accueil et parcourir les annonces; créer un compte ou se connecter.
2. À l’inscription, accepter explicitement les CGU et la politique de confidentialité. La version et l’heure d’acceptation sont enregistrées. Les comptes existants doivent accepter la version actuelle avant de continuer les actions privées.
3. Le propriétaire publie une annonce, ajoute 3 à 5 photos et décrit les conditions proposées.
4. L’emprunteur demande des dates dans les 12 prochains mois; le propriétaire accepte ou refuse.
5. Si la demande est acceptée, les utilisateurs organisent directement les modalités et la remise. Le code confirme la remise déclarée, jamais un paiement.
6. Le propriétaire confirme le retour ou signale un problème; les deux parties peuvent ensuite se laisser un avis.

Administration : `/admin`, visible aux comptes dont `profiles.is_admin` est activé de manière contrôlée dans Supabase.
