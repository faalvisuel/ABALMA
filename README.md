# Abalma

Location de matériel entre particuliers à Dakar. « Abal ma » veut dire « prête-moi » en wolof.

Ceci est une **version de test** : le paiement Wave / Orange Money est **simulé**, aucun argent ne circule.

## Ce que fait l'appli

- Comptes par e-mail et mot de passe, profil, vérification d'identité par l'administrateur
- Annonces avec 3 à 5 photos, recherche, filtres par catégorie (dont « Autre »)
- Calendrier de réservation sur 12 mois, demande, acceptation ou refus par le loueur
- Paiement simulé, code de remise à 4 chiffres, validation du retour, signalement d'un problème
- Adresse exacte et numéro WhatsApp du loueur visibles seulement après paiement
- Avis dans les deux sens, score de confiance de l'emprunteur, niveaux de loueur
- Page d'administration (`/admin`)

## Mise en ligne gratuite, pas à pas

### 1. Base de données (Supabase)

1. Sur [supabase.com](https://supabase.com), créez un projet (région la plus proche, par exemple Europe de l'Ouest).
2. Ouvrez **SQL Editor > New query**, collez tout le contenu de [`supabase/schema.sql`](supabase/schema.sql), puis cliquez sur **Run**.
3. Pour tester sans attendre d'e-mail : **Authentication > Sign In / Providers > Email**, désactivez **Confirm email**. Réactivez-le avant d'ouvrir au public.
4. Dans **Project Settings > API**, notez **Project URL** et la clé **anon public**. N'utilisez jamais la clé `service_role` dans l'appli.

### 2. Hébergement (Vercel ou Netlify)

1. Créez un compte avec votre GitHub, puis importez le dépôt `abalma`.
2. Réglages de construction : commande `npm run build`, dossier de sortie `dist` (détectés automatiquement pour Vite).
3. Ajoutez deux variables d'environnement :
   - `VITE_SUPABASE_URL` = votre Project URL
   - `VITE_SUPABASE_ANON_KEY` = votre clé anon public
4. Lancez le déploiement. Vous obtenez une adresse du type `abalma.vercel.app`.
5. Dans Supabase, **Authentication > URL Configuration**, mettez cette adresse dans **Site URL**.

Chaque modification poussée sur la branche `main` se remet en ligne toute seule.

### 3. Devenir administrateur

Créez votre compte dans l'appli, puis dans Supabase **SQL Editor** exécutez, avec votre e-mail :

```sql
update public.profiles set is_admin = true, verified = true
where id = (select id from auth.users where email = 'vous@exemple.com');
```

La page d'administration apparaît alors dans **Mon profil**.

## Tester le parcours complet

Il faut deux comptes (deux adresses e-mail), par exemple dans deux navigateurs :

1. Compte A publie un matériel (onglet **Publier**).
2. Compte B ouvre l'annonce, choisit ses dates et envoie la demande.
3. Compte A accepte la demande (onglet **Revenus**).
4. Compte B paie (simulé) et reçoit son code de remise, l'adresse et le numéro WhatsApp.
5. Compte A saisit le code, puis valide le retour.
6. Les deux se notent. Le score de B augmente.

Les 8 annonces d'exemple ne sont pas réservables ; supprimez-les depuis l'administration quand vous avez de vraies annonces.

## Lancer en local

```bash
npm install
cp .env.example .env.local   # puis remplissez les deux valeurs
npm run dev
```

## Règles appliquées (modifiables)

| Règle | Valeur | Où la changer |
| --- | --- | --- |
| Commission | 15 % du prix plein | `supabase/schema.sql` (`request_booking`) et `src/lib/util.ts` |
| Réduction du score | 5 % dès 500 points, 10 % dès 750, prise sur la commission | `request_booking` |
| Caution réduite de moitié | dès 750 points | `request_booking` |
| Acceptation automatique | dès 900 points | `request_booking` |
| Points | +40 location terminée, +10 retour à l'heure, +10 note de 5 étoiles, −50 retard, −150 litige à ses torts | `confirm_return`, `submit_review`, `admin_resolve_dispute` |
| Niveaux de loueur | Confirmé : 5 locations et 4,5 ; Vedette : 15 locations et 4,7 | `src/lib/util.ts` |

## Ce qui reste à faire avant un vrai lancement

- Brancher Wave et Orange Money à la place de `pay_booking` (encaissement, versement au loueur, caution)
- Faire valider par un juriste la détention des fonds (règles BCEAO) et déclarer le traitement des données à la CDP
- Téléversement de la pièce d'identité (aujourd'hui l'administrateur coche « vérifié » à la main)
- Notifications (SMS ou WhatsApp) à chaque étape, photos d'état des lieux à la remise et au retour
- Modification d'une annonce existante, annulation après paiement, conditions générales

## Technique

React + Vite + TypeScript, Supabase (PostgreSQL, authentification, stockage). Toute la logique sensible (montants, code de remise, score) est dans des fonctions SQL côté serveur, protégées par des règles d'accès par ligne.
