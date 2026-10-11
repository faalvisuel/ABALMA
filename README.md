# alma

**Application de location de matériel entre particuliers à Dakar.** Le nom alma remplace désormais l’ancien branding de l’application.

> **Important :** l’aperçu de fichiers GitHub ne lance pas cette application React. Pour voir l’interface, lancez le projet en local ou déployez-le sur Vercel/Netlify. Sans configuration Supabase, l’application affiche un écran expliquant que la base de données n’est pas connectée.

## Ouvrir l’application

### Option A — En local sur votre ordinateur

Prérequis : Node.js (version LTS) et Git.

1. Ouvrez le dépôt `https://github.com/faalvisuel/ABALMA`.
2. Téléchargez le projet via **Code > Download ZIP**, puis décompressez-le, ou clonez-le avec Git.
3. Ouvrez le dossier `ABALMA` dans un terminal.
4. Installez les dépendances :

   ```bash
   npm install
   ```

5. Copiez `.env.example` vers `.env.local` et ajoutez les informations de votre projet Supabase :

   ```bash
   cp .env.example .env.local
   ```

6. Démarrez l’application :

   ```bash
   npm run dev
   ```

7. Ouvrez l’adresse locale indiquée par Vite dans le terminal, généralement `http://localhost:5173`.

### Option B — Déploiement sur Vercel

1. Connectez-vous à [Vercel](https://vercel.com/) avec votre compte GitHub.
2. Importez le dépôt privé `faalvisuel/ABALMA` et autorisez l’accès si Vercel le demande.
3. Vérifiez les paramètres : commande de build `npm run build`, dossier de sortie `dist`.
4. Dans **Settings > Environment Variables**, ajoutez :
   - `VITE_SUPABASE_URL` : l’URL du projet Supabase.
   - `VITE_SUPABASE_ANON_KEY` : la clé publique `anon`/publishable du projet Supabase.
5. Déployez, puis ouvrez l’URL fournie par Vercel.
6. Après chaque modification, un nouveau push sur la branche `main` déclenche normalement un redéploiement.
7. Dans Supabase, ouvrez **Authentication > URL Configuration** et configurez les URL du site et de redirection avec le domaine Vercel.

**Sécurité :** ne placez jamais une clé `service_role` ou une clé secrète Supabase dans une variable `VITE_*` ni dans le code côté navigateur.

## Configurer Supabase

1. Créez un projet sur [Supabase](https://supabase.com/).
2. Dans **SQL Editor**, exécutez le contenu de [`supabase/schema.sql`](supabase/schema.sql).
3. Pour activer les photos de profil sur un projet déjà configuré, exécute une fois [`supabase/avatar-migration.sql`](supabase/avatar-migration.sql) dans le **SQL Editor**.
4. Récupérez l’URL du projet et sa clé publique dans les paramètres API.
5. Ajoutez ces deux valeurs dans `.env.local` en local et dans les variables d’environnement de l’hébergeur en ligne.
6. Pour les tests uniquement, la confirmation d’e-mail peut être désactivée dans les paramètres d’authentification. Réactivez-la avant toute ouverture publique.

Si ces variables ne sont pas renseignées, l’application n’a pas accès à la base et ne peut pas fournir le parcours complet.

## Fonctionnalités prévues

- Comptes e-mail/mot de passe et profils, avec vérification manuelle par l’administration.
- Annonces avec photos, recherche et catégories.
- Demandes de réservation, calendrier sur 12 mois et décision du loueur.
- Paiement de test, code de remise à quatre chiffres et confirmation du retour.
- Coordonnées du loueur révélées après l’étape de paiement prévue.
- Avis, score de confiance et niveaux de loueur.
- Interface d’administration sur `/admin`.

## Parcours de test

Utilisez deux comptes distincts :

1. Le compte A publie une annonce.
2. Le compte B demande une réservation.
3. Le compte A accepte ou refuse la demande.
4. Le compte B suit le parcours de paiement simulé.
5. Le compte A confirme la remise et le retour selon les étapes de l’application.
6. Les utilisateurs peuvent laisser leurs avis si la réservation a atteint l’étape prévue.

Les annonces de démonstration ne sont pas nécessairement réservables.

## Stack technique

- React, TypeScript et Vite
- Supabase : authentification, PostgreSQL et stockage
- CSS responsive, avec une interface pensée d’abord pour mobile

## État et précautions

Il s’agit d’une version de test. Wave et Orange Money ne sont pas connectés à un véritable système d’encaissement : aucun paiement réel ne doit être attendu. Avant un lancement public, il faut notamment tester les autorisations et règles RLS, le flux de réservation, les paiements, les annulations, les litiges, les notifications et les obligations applicables au Sénégal.
