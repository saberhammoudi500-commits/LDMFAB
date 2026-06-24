-- ============================================================
--  LDMFAB - Données initiales (rôles système)
--  A exécuter UNE SEULE FOIS après la migration 001
-- ============================================================

insert into public.roles (name, description, permissions, is_system) values
  ('Administrateur', 'Accès complet au système',
   '["users:read","users:create","users:update","users:delete","roles:read","roles:manage","of:read","of:create","of:update","of:delete","of:verify","of:validate","of:sign","of:import","of:export","audit:read","dashboard:read"]',
   true),
  ('Responsable Fabrication', 'Gestion des ordres de fabrication',
   '["of:read","of:create","of:update","of:verify","of:validate","of:sign","of:export","dashboard:read"]',
   true),
  ('Opérateur', 'Saisie et consultation des ordres',
   '["of:read","of:create","of:update","dashboard:read"]',
   true),
  ('Contrôle Qualité', 'Vérification et signature des ordres',
   '["of:read","of:verify","of:sign","of:export","audit:read","dashboard:read"]',
   true),
  ('Consultation', 'Lecture seule',
   '["of:read","dashboard:read"]',
   true)
on conflict (name) do nothing;

-- ============================================================
--  NOTE : Le compte admin doit être créé depuis Supabase Auth
--  (Authentication > Users > Invite user) puis lié à profiles.
--  Voir README_SETUP.md pour la procédure complète.
-- ============================================================
