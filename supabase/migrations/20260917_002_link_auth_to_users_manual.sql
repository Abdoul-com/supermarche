-- Migration de rattachement manuel des comptes Auth aux profils de la table public.users.
-- À exécuter seulement après création des comptes Supabase Auth valides.
-- Les e-mails doivent être valides et non pas terminés par .local.

-- Exemple de compte Auth valide : admin@example.com
-- Supprimer l'exemple et utiliser les vrais e-mails de votre organisation.

UPDATE public.users u
SET auth_user_id = a.id
FROM auth.users a
WHERE a.email = u.email
  AND u.auth_user_id IS NULL;

-- Vérification rapide :
SELECT u.id, u.email, u.auth_user_id, a.email AS auth_email
FROM public.users u
LEFT JOIN auth.users a ON a.id = u.auth_user_id
ORDER BY u.id;

-- Si certains profils ne sont pas rattachés, il faudra créer le compte Auth correspondant,
-- puis relancer la requête UPDATE ci-dessus.
