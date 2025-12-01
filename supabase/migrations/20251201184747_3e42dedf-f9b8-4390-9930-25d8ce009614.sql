
-- Fonction pour assigner automatiquement les rôles aux utilisateurs de test
CREATE OR REPLACE FUNCTION assign_test_user_roles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_chef_id uuid;
  v_location_id uuid;
BEGIN
  -- Récupérer l'ID de l'admin central
  SELECT id INTO v_admin_id FROM profiles WHERE email = 'awalehnasri@gmail.com';
  
  -- Récupérer l'ID du chef de camp
  SELECT id INTO v_chef_id FROM profiles WHERE email = 'zdouce.zz@gmail.com';
  
  -- Récupérer un camp pour le chef
  SELECT id INTO v_location_id FROM locations WHERE code = 'CA-002' LIMIT 1;
  
  -- Assigner le rôle admin central
  IF v_admin_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role, location_id)
    VALUES (v_admin_id, 'admin_central', NULL)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Assigner le rôle chef de camp
  IF v_chef_id IS NOT NULL AND v_location_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role, location_id)
    VALUES (v_chef_id, 'chef_camp', v_location_id)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- Exécuter l'assignation des rôles
SELECT assign_test_user_roles();
