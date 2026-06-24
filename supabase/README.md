# Migrations Supabase

Exécuter dans l'ordre dans **Supabase → SQL Editor** (ou `supabase db push` si CLI installé).

| Fichier | Contenu |
|---------|---------|
| `001_referentiels.sql` | DonneurOrdre, FormeGalenique, Produit, Equipement, Cadence, Pcsu |
| `002_of_fabrication.sql` | OrdreFabrication, PhaseRealisation, Conditionnement, DossierLot, ProlongationOF |
| `003_pdp.sql` | Pdp, PdpLigne, CalendrierJour |
| `004_effectifs.sql` | Employe, BudgetPoste |
| `005_audit.sql` | AuditLog, ElectronicSignature (immuables — pas de UPDATE/DELETE policy) |

Toutes les tables ont **RLS activé**. Les policies autorisent select/insert/update/delete
aux utilisateurs `authenticated` (géré par Supabase Auth).
