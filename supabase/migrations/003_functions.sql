-- ============================================================
--  Fonction RPC : créer un utilisateur (auth + profile + rôles)
--  Appelée depuis le frontend avec les droits service_role
-- ============================================================

create or replace function public.create_user_with_role(
  p_email      text,
  p_matricule  text,
  p_first_name text,
  p_last_name  text,
  p_service    text default null,
  p_password   text default null,
  p_role_ids   uuid[] default '{}'
) returns uuid
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
begin
  -- Créer l'utilisateur dans auth.users
  v_user_id := (
    select id from auth.users where email = p_email
  );

  if v_user_id is null then
    -- Utiliser la fonction admin de Supabase (nécessite service_role)
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) values (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      p_email,
      crypt(coalesce(p_password, 'Pharma@2026!'), gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      false
    )
    returning id into v_user_id;
  end if;

  -- Créer le profil
  insert into public.profiles (id, matricule, email, first_name, last_name, service, must_change_password)
  values (v_user_id, p_matricule, p_email, p_first_name, p_last_name, p_service, true)
  on conflict (id) do update set
    matricule = p_matricule, first_name = p_first_name,
    last_name = p_last_name, service = p_service;

  -- Assigner les rôles
  if array_length(p_role_ids, 1) > 0 then
    insert into public.user_roles (user_id, role_id)
    select v_user_id, unnest(p_role_ids)
    on conflict (user_id, role_id) do nothing;
  end if;

  return v_user_id;
end;
$$;
