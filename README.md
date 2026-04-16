# Logistique Militaire — SaaS de gestion intégrée

Application SaaS de gestion logistique pour camps militaires : habillement, alimentation, parc automobile, approvisionnement, personnel, prêts et demandes inter-camps.

> Stack : React 18 · TypeScript 5 · Vite 5 · Tailwind CSS · shadcn/ui · TanStack Query · Lovable Cloud (Supabase) · react-i18next · Sentry

---

## 🚀 Démarrage rapide

```bash
# 1. Installer les dépendances
npm install      # ou bun install

# 2. Configurer l'environnement
cp .env.example .env
# Remplir les variables (auto-renseignées en projet Lovable)

# 3. Lancer le serveur de dev
npm run dev
```

L'application est ensuite disponible sur `http://localhost:8080`.

---

## 📁 Architecture

```
src/
├── components/        # Composants React par domaine métier
│   ├── fleet/         # Parc automobile
│   ├── procurement/   # Approvisionnement
│   ├── gear/          # Habillement
│   ├── food/          # Alimentation
│   ├── personnel/     # Gestion du personnel
│   ├── loans/         # Prêts d'équipement
│   ├── demandes/      # Demandes des camps
│   └── ui/            # shadcn/ui (design system)
├── pages/             # Routes React Router
├── hooks/             # Hooks React partagés
├── lib/               # Utilitaires, i18n, monitoring
├── integrations/
│   └── supabase/      # Client + types générés (read-only)
└── test/              # Setup Vitest + tests partagés

supabase/
├── functions/         # Edge Functions
└── migrations/        # Migrations SQL (read-only, gérées par Lovable)
```

---

## 🧪 Tests

```bash
npm run test           # Lance Vitest en mode watch
npm run test:run       # Exécution unique (CI)
npm run test:coverage  # Avec couverture
```

Les tests unitaires utilisent **Vitest** + **@testing-library/react**.

---

## 🔧 Scripts utiles

| Commande              | Description                                  |
|-----------------------|----------------------------------------------|
| `npm run dev`         | Serveur de développement                     |
| `npm run build`       | Build production                             |
| `npm run build:dev`   | Build mode développement                     |
| `npm run lint`        | Lint ESLint                                  |
| `npm run test`        | Tests Vitest                                 |
| `npm run analyze`     | Analyse du bundle (rollup-plugin-visualizer) |

---

## 🔐 Sécurité

- **RLS systématique** : toutes les tables Supabase ont des politiques RLS activées.
- **Roles applicatifs** : table `user_roles` séparée + fonction `has_role()` SECURITY DEFINER.
- **Rotation des clés** : la clé `anon` peut être régénérée via la console Lovable Cloud à tout moment.
- **Audit trail** : table `security_audit_log` + détection d'activités suspectes (triggers).
- **Aucun secret côté client** : seules les clés publiques (`anon`) sont exposées.

⚠️ **Ne jamais committer un vrai `.env`.** Utiliser `.env.example` comme référence.

---

## 🌍 Internationalisation

Le projet utilise `react-i18next`. Langue par défaut : **français**.
Pour ajouter une langue, créer `src/lib/i18n/locales/<code>.json` puis l'enregistrer dans `src/lib/i18n/index.ts`.

---

## 📊 Observabilité

Sentry est initialisé automatiquement si `VITE_SENTRY_DSN` est défini. Sinon, le monitoring est désactivé en silence (pratique pour le local).

Un `ErrorBoundary` global capture les erreurs React non interceptées et affiche une page de fallback.

---

## 🚢 Déploiement

Le déploiement est géré par Lovable :

- **Frontend** : cliquer sur **Publish** dans l'éditeur Lovable.
- **Backend** (Edge Functions, migrations) : déployé automatiquement à chaque modification.

Un workflow GitHub Actions (`.github/workflows/ci.yml`) exécute lint + build + tests sur chaque PR.

---

## 📜 Licence

Propriétaire — usage interne.
