# Conformité 21 CFR Part 11 — Matrice de couverture

Ce document décrit comment LDMFAB répond aux exigences du **21 CFR Part 11**
(enregistrements et signatures électroniques) et aux principes **ALCOA+**.
Il constitue un point de départ pour la documentation de validation (IQ/OQ/PQ).

> ⚠️ La conformité réglementaire complète relève d'un processus de **validation**
> formel (analyse de risque, qualification, procédures, formation). Ce document
> recense les **contrôles techniques** fournis par l'application.

---

## §11.10 — Contrôles des systèmes fermés

| Exigence | Implémentation dans LDMFAB |
|----------|----------------------------|
| (a) Validation du système | Tests unitaires (`backend/npm test`), schéma de données contraint, workflow déterministe |
| (b) Restitution des enregistrements (lecture/copie) | Consultation à l'écran + **export Excel** des ordres et de la piste d'audit |
| (c) Protection des enregistrements sur leur durée de conservation | **Suppression logique** (`deletedAt`) uniquement — aucune suppression physique des OF, utilisateurs ou logs |
| (d) Accès limité aux personnes autorisées | Authentification JWT + **RBAC** (rôles & permissions) sur chaque route |
| (e) **Piste d'audit** horodatée et sécurisée | Table `AuditLog` immuable : acteur, action, entité, **valeur avant/après**, motif, IP, horodatage UTC |
| (f) Contrôle de séquence des étapes | **Workflow** à transitions autorisées (Création → … → Clôture) |
| (g) Contrôles d'autorité (qui fait quoi) | Permissions distinctes : `of:create`, `of:verify`, `of:validate`, `of:sign`, etc. |
| (h) Contrôles des dispositifs | Origine des requêtes tracée (adresse IP enregistrée dans l'audit) |
| (i) Qualification des personnes | Gestion des comptes, rôles et services |
| (k) Documentation contrôlée | Versionnée dans le dépôt Git |

## §11.10 (d,g) — Politique d'accès & de mot de passe

- Longueur minimale **10 caractères**, majuscule + minuscule + chiffre + caractère spécial.
- **Verrouillage** du compte après *N* tentatives échouées (configurable, défaut 5 / 15 min).
- **Changement imposé** du mot de passe à la première connexion / après réinitialisation.
- **Expiration** des jetons d'accès (15 min) avec rafraîchissement contrôlé ; révocation à la déconnexion.

---

## §11.50 / §11.70 — Signatures électroniques

| Exigence | Implémentation |
|----------|----------------|
| Lien signature ↔ enregistrement | Table `ElectronicSignature` reliée à l'OF (`entity` + `entityId`) — non détachable |
| Composantes de la signature | **Nom du signataire** (matricule + nom), **date/heure**, **sens** (Auteur / Vérificateur / Approbateur), **motif** |
| Authentification du signataire | **Ré-authentification par mot de passe obligatoire** à chaque signature |
| Inclusion dans les enregistrements lisibles | Signatures affichées dans le détail de l'OF |
| Non-répudiation | Échec de ré-authentification tracé dans la piste d'audit |

---

## Principes ALCOA+

| Principe | Couverture |
|----------|-----------|
| **A**ttributable | Chaque action porte l'identité de l'utilisateur (audit + signatures) |
| **L**egible | Données structurées, restituées à l'écran et exportables |
| **C**ontemporaneous | Horodatage serveur au moment de l'action |
| **O**riginal | Enregistrement conservé, suppression logique uniquement |
| **A**ccurate | Validation des entrées (Zod), rendement recalculé, contraintes BDD |
| + Complete / Consistent / Enduring / Available | Audit exhaustif, workflow cohérent, conservation, export |

---

## Points à compléter pour une validation production

- Chiffrement en transit (**HTTPS/TLS**) au niveau de l'infrastructure.
- Sauvegardes chiffrées et plan de restauration de la base PostgreSQL.
- Expiration périodique des mots de passe et historique anti-réutilisation (selon SOP).
- Revue d'accès périodique et procédures (SOP) de gestion des comptes.
- Horloge synchronisée (NTP) sur les serveurs.
