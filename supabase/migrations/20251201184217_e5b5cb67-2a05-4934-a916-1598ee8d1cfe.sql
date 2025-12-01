-- ============================================
-- AMÉLIORATION COMPLÈTE DU SYSTÈME RLS
-- ============================================

-- 1. POLITIQUES MANQUANTES POUR ALLOCATIONS
-- Les chefs de camp doivent pouvoir mettre à jour les allocations de leur camp
CREATE POLICY "Les chefs de camp peuvent modifier allocations de leur camp"
ON allocations FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'chef_camp'::app_role) 
  AND EXISTS (
    SELECT 1 FROM personnel
    WHERE personnel.id = allocations.personnel_id
    AND personnel.location_id = get_user_location(auth.uid())
  )
);

-- 2. POLITIQUES MANQUANTES POUR INVENTORY_BATCHES
-- Les chefs de camp doivent pouvoir modifier leurs batches
CREATE POLICY "Chefs de camp peuvent modifier leurs batches"
ON inventory_batches FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'chef_camp'::app_role)
  AND location_id = get_user_location(auth.uid())
);

-- 3. POLITIQUES MANQUANTES POUR PROCUREMENT_ORDERS
-- Les chefs de camp doivent pouvoir modifier leurs commandes
CREATE POLICY "Chefs de camp peuvent modifier leurs commandes"
ON procurement_orders FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'chef_camp'::app_role)
  AND location_id = get_user_location(auth.uid())
);

-- 4. POLITIQUES POUR PROCUREMENT_ORDER_ITEMS
-- Les chefs de camp doivent pouvoir créer et modifier les items de leurs commandes
CREATE POLICY "Chefs de camp peuvent créer items de leurs commandes"
ON procurement_order_items FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'chef_camp'::app_role)
  AND EXISTS (
    SELECT 1 FROM procurement_orders po
    WHERE po.id = procurement_order_items.order_id
    AND po.location_id = get_user_location(auth.uid())
  )
);

CREATE POLICY "Chefs de camp peuvent modifier items de leurs commandes"
ON procurement_order_items FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'chef_camp'::app_role)
  AND EXISTS (
    SELECT 1 FROM procurement_orders po
    WHERE po.id = procurement_order_items.order_id
    AND po.location_id = get_user_location(auth.uid())
  )
);

CREATE POLICY "Chefs de camp peuvent supprimer items de leurs commandes"
ON procurement_order_items FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'chef_camp'::app_role)
  AND EXISTS (
    SELECT 1 FROM procurement_orders po
    WHERE po.id = procurement_order_items.order_id
    AND po.location_id = get_user_location(auth.uid())
  )
);

-- 5. POLITIQUES POUR REQUESTS
-- Les chefs de camp doivent pouvoir modifier leurs demandes
CREATE POLICY "Les chefs de camp peuvent modifier leurs demandes"
ON requests FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'chef_camp'::app_role)
  AND location_id = get_user_location(auth.uid())
);

-- 6. POLITIQUES POUR ITEM_VARIANTS
-- Les chefs de camp doivent pouvoir créer des variants
CREATE POLICY "Les chefs de camp peuvent créer variants dans leur camp"
ON item_variants FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'chef_camp'::app_role)
  AND location_id = get_user_location(auth.uid())
);

-- 7. AMÉLIORER LOCATIONS - Les chefs de camp peuvent modifier leur camp
CREATE POLICY "Les chefs de camp peuvent modifier leur camp"
ON locations FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'chef_camp'::app_role)
  AND id = get_user_location(auth.uid())
);

-- 8. POLITIQUES POUR SUPPLIERS - Les admins seulement peuvent modifier
CREATE POLICY "Admins centraux peuvent modifier suppliers"
ON suppliers FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin_central'::app_role));

CREATE POLICY "Admins centraux peuvent créer suppliers"
ON suppliers FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin_central'::app_role));

CREATE POLICY "Admins centraux peuvent supprimer suppliers"
ON suppliers FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin_central'::app_role));

-- 9. POLITIQUES POUR SUSPICIOUS_ACTIVITIES - UPDATE
CREATE POLICY "Admins centraux peuvent modifier suspicious_activities"
ON suspicious_activities FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin_central'::app_role));

-- 10. AMÉLIORER PROFILES - Les utilisateurs peuvent insérer leur propre profil
CREATE POLICY "Les utilisateurs peuvent créer leur propre profil"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 11. POLITIQUES POUR STOCK_ITEMS - Les chefs de camp peuvent créer
CREATE POLICY "Les chefs de camp peuvent créer stock_items"
ON stock_items FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'chef_camp'::app_role));

CREATE POLICY "Les chefs de camp peuvent modifier stock_items"
ON stock_items FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'chef_camp'::app_role));

-- 12. Fonction helper pour vérifier si l'utilisateur est admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(_user_id, 'admin_central'::app_role)
$$;

-- 13. Fonction helper pour vérifier si l'utilisateur est chef de camp
CREATE OR REPLACE FUNCTION public.is_chef_camp(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(_user_id, 'chef_camp'::app_role)
$$;

-- 14. POLITIQUES POUR PERSONNEL - DELETE pour admins seulement
CREATE POLICY "Les admins centraux peuvent supprimer personnel"
ON personnel FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin_central'::app_role));

-- 15. POLITIQUES POUR ALLOCATIONS - DELETE pour admins seulement
CREATE POLICY "Les admins centraux peuvent supprimer allocations"
ON allocations FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin_central'::app_role));

-- 16. POLITIQUES POUR INVENTORY_BATCHES - DELETE
CREATE POLICY "Admins centraux peuvent supprimer inventory_batches"
ON inventory_batches FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin_central'::app_role));

CREATE POLICY "Chefs de camp peuvent supprimer leurs batches"
ON inventory_batches FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'chef_camp'::app_role)
  AND location_id = get_user_location(auth.uid())
);

-- 17. POLITIQUES POUR PROCUREMENT_ORDERS - DELETE
CREATE POLICY "Admins centraux peuvent supprimer procurement_orders"
ON procurement_orders FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin_central'::app_role));

CREATE POLICY "Chefs de camp peuvent supprimer leurs commandes"
ON procurement_orders FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'chef_camp'::app_role)
  AND location_id = get_user_location(auth.uid())
);

-- 18. POLITIQUES POUR REQUESTS - DELETE
CREATE POLICY "Admins centraux peuvent supprimer requests"
ON requests FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin_central'::app_role));

CREATE POLICY "Chefs de camp peuvent supprimer leurs demandes"
ON requests FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'chef_camp'::app_role)
  AND location_id = get_user_location(auth.uid())
);

-- 19. POLITIQUES POUR ITEM_VARIANTS - DELETE
CREATE POLICY "Admins centraux peuvent supprimer item_variants"
ON item_variants FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin_central'::app_role));

-- 20. POLITIQUES POUR STOCK_ITEMS - DELETE
CREATE POLICY "Admins centraux peuvent supprimer stock_items"
ON stock_items FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin_central'::app_role));

-- 21. COMMENTAIRES pour documentation
COMMENT ON FUNCTION public.is_admin IS 'Vérifie si un utilisateur a le rôle admin_central';
COMMENT ON FUNCTION public.is_chef_camp IS 'Vérifie si un utilisateur a le rôle chef_camp';
COMMENT ON FUNCTION public.has_role IS 'Vérifie si un utilisateur a un rôle spécifique';
COMMENT ON FUNCTION public.get_user_location IS 'Retourne le location_id d''un utilisateur';