# LDMFAB — Management du département Fabrication pharmaceutique

Application web de **gestion et de suivi des réalisations** (Ordres de Fabrication) d'un
département de fabrication pharmaceutique, conçue pour être **validable selon le 21 CFR Part 11**.

- Gestion des **utilisateurs**, des **rôles** et des **responsabilités** (RBAC granulaire)
- Suivi complet des **Ordres de Fabrication** (modèle Excel d'origine reproduit)
- **Piste d'audit** immuable, **signatures électroniques**, **workflow** de validation
- **Import / Export Excel**, **tableau de bord** avec indicateurs et graphiques
- Interface **en français**

---

## 🏗️ Architecture

| Couche      | Technologie                                            |
|-------------|--------------------------------------------------------|
| Frontend    | React 18 + TypeScript + Vite + TailwindCSS + Recharts  |
| Backend     | Node.js + Express + TypeScript                          |
| ORM / BDD   | Prisma — **SQLite** (dev) / **PostgreSQL** (production) |
| Auth        | JWT (access + refresh), bcrypt, RBAC                    |

```
LDMFAB/
├── backend/            API REST (Express + Prisma)
│   ├── prisma/         schema.prisma + seed.ts
│   └── src/
│       ├── routes/     auth, users, roles, ordres, signatures, audit, dashboard, importExport
│       ├── middleware/ authentification + contrôle d'accès (RBAC)
│       ├── services/   logique métier (token, schéma OF, colonnes Excel)
│       └── utils/      dates FR, rendement, audit, JWT/mot de passe
└── frontend/           SPA React
    └── src/
        ├── pages/      Login, Dashboard, Réalisations, Utilisateurs, Rôles, Audit
        ├── components/ Layout, Modal, route protégée
        └── auth/       contexte d'authentification
```

---

## 🚀 Démarrage rapide

Prérequis : **Node.js ≥ 18**.

```bash
# 1. Installer les dépendances (backend + frontend)
npm run install:all        # ou: cd backend && npm i ; cd ../frontend && npm i

# 2. Configurer le backend
cd backend
cp .env.example .env        # ajuster les secrets en production

# 3. Créer la base et charger les données de démo
npm run db:push             # crée le schéma (SQLite dev.db)
npm run seed                # crée l'admin, les rôles et 5 OF d'exemple

# 4. Lancer le backend (port 4000)
npm run dev
```

Dans un second terminal :

```bash
cd frontend
npm run dev                 # interface sur http://localhost:5173
```

> Le frontend proxifie automatiquement `/api` vers `http://localhost:4000`.

### Compte administrateur initial (créé par le seed)

| Identifiant            | Mot de passe   |
|------------------------|----------------|
| `admin@ldmfab.local`   | `Admin@12345`  |

> Le changement de mot de passe est **imposé à la première connexion**.

---

## 🔐 Conformité 21 CFR Part 11

Voir [`docs/CONFORMITE-21CFR11.md`](docs/CONFORMITE-21CFR11.md) pour le détail.
En résumé, l'application implémente :

- **Piste d'audit** inviolable (qui / quoi / quand / avant-après / motif / IP) pour toute
  création, modification, suppression, connexion, signature, import et export.
- **Signatures électroniques** avec ré-authentification, sens de la signature
  (Auteur / Vérificateur / Approbateur), motif et horodatage.
- **Contrôle d'accès** par rôles et permissions, politique de mot de passe robuste,
  verrouillage après tentatives échouées, expiration de session, déconnexion automatique.
- **Intégrité des données (ALCOA+)** : suppression logique uniquement (jamais physique),
  horodatages UTC, motif obligatoire sur les modifications critiques.

---

## 🏭 Module Réalisations (Ordres de Fabrication)

Reproduit fidèlement le modèle Excel d'origine : identification & validité, étapes de
fabrication (pesée, granulation, mélange, compression/remplissage, pelliculage),
quantités, rendements (Y %), contrôle et libération (vérificateur, AQL, CNDT).

- **Rendement total** recalculé automatiquement (`quantité / quantité théorique`),
  avec **alerte visuelle** sous le seuil de 95 %.
- **Workflow** : Création → En cours → Fabrication terminée → Vérification →
  (Rectification) → Clôture, avec transitions contrôlées par permission.
- **Import / Export Excel** aux mêmes colonnes que le fichier d'origine.

---

## 🧪 Tests

```bash
cd backend && npm test     # calcul de rendement, parsing dates/nombres FR
```

---

## 🐘 Passage en production (PostgreSQL)

1. Dans `backend/prisma/schema.prisma`, remplacer `provider = "sqlite"` par
   `provider = "postgresql"`.
2. Dans `backend/.env`, définir `DATABASE_URL="postgresql://user:pass@host:5432/ldmfab"`.
3. `npm run prisma:migrate` puis `npm run seed`.
4. Changer impérativement `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` et le mot de passe admin.
```
