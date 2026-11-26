-- À utiliser après avoir créé le compte dans Supabase Auth.
-- Remplacer l’adresse ci-dessous par l’e-mail exact du compte Auth, puis exécuter
-- ce script avec le rôle propriétaire de la base. Ne pas le publier comme endpoint.

DO $$
DECLARE
  target_email text := lower('REMPLACER_PAR_EMAIL_AUTH');
  auth_user_uuid uuid;
  admin_role_id bigint;
  profile_id bigint;
BEGIN
  IF target_email = 'remplacer_par_email_auth' OR target_email = '' THEN
    RAISE EXCEPTION 'Remplacez target_email par l’adresse du compte Auth administrateur.';
  END IF;

  SELECT a.id INTO auth_user_uuid
  FROM auth.users AS a
  WHERE lower(a.email) = target_email
  LIMIT 1;

  IF auth_user_uuid IS NULL THEN
    RAISE EXCEPTION 'Aucun compte Supabase Auth ne correspond à %.', target_email;
  END IF;

  SELECT r.id INTO admin_role_id
  FROM public.roles AS r
  WHERE r.nom = 'Administrateur'
  LIMIT 1;

  IF admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Le rôle Administrateur est absent. Appliquez d’abord la migration initiale.';
  END IF;

  UPDATE public.users AS u
  SET auth_user_id = auth_user_uuid,
      role_id = admin_role_id,
      statut = 'actif',
      updated_at = now()
  WHERE lower(u.email) = target_email
  RETURNING u.id INTO profile_id;

  IF profile_id IS NULL THEN
    INSERT INTO public.users (
      auth_user_id, nom, prenom, telephone, email, username, role_id, statut
    ) VALUES (
      auth_user_uuid, 'Administrateur', '', '', target_email, target_email, admin_role_id, 'actif'
    )
    RETURNING id INTO profile_id;
  END IF;

  RAISE NOTICE 'Profil administrateur créé ou lié (id=%).', profile_id;
END $$;
