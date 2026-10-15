# Site vitrine VibeDeck

Landing page statique du projet (design « Site VibeDeck v2 », Claude Design). Aucun build : `index.html` charge `analytics.js` et le script local `downloads.js`.

- Prévisualiser : `open index.html` (ou `python3 -m http.server` dans ce dossier). Les pages vues ne partent pas depuis `file://`, `localhost` ou `127.0.0.1`.
- Déployer : `vercel deploy --prod` depuis ce dossier (projet Vercel `vibedeck-site`). Ce dossier est la racine du projet, afin que `api/` réponde sur `/api`.

## Mesure d’audience

Le site public charge [posthog-js](https://posthog.com/docs/libraries/js) par le snippet HTML officiel et enregistre les pages vues sur `https://us.i.posthog.com`. Il n’y a pas de comptes : aucun `identify`, aucun événement `signed_up`. L’enregistrement de session et les enquêtes sont désactivés.

La clé publique est lue dans `POSTHOG_KEY`, puis `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_KEY` et `VITE_POSTHOG_KEY`. Sans valeur valide, la clé publique du projet est utilisée. `GET /api/posthog-bootstrap` ne publie que cette clé.

## `GET /api/stats`

Endpoint de lecture seule. Il exige `Authorization: Bearer $STATS_TOKEN`. Sans `STATS_TOKEN`, ou si le jeton diffère, la réponse est `401`. Le corps autorisé est :

```json
{"total_users":null,"new_users_1d":null,"new_users_7d":null,"active_users_1d":null,"active_users_7d":null}
```

Ces compteurs restent vides : VibeDeck n’a pas de comptes utilisateurs. L’application de bureau ne charge pas PostHog.
