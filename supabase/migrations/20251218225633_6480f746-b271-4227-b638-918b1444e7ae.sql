-- Add role-based authorization checks to SECURITY DEFINER functions
-- This ensures that even though RLS is bypassed, only authorized users can execute

-- Fix distribute_food_fifo: Require admin_central or chef_camp role
CREATE OR REPLACE FUNCTION public.distribute_food_fifo(p_item_variant_id uuid, p_location_id uuid, p_amount_needed integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_batch RECORD;
  v_remaining integer := p_amount_needed;
  v_deducted integer;
  v_batches_used jsonb := '[]'::jsonb;
  v_batch_info jsonb;
BEGIN
  -- Authorization check: Only admin_central or chef_camp can distribute food
  IF NOT (has_role(auth.uid(), 'admin_central') OR has_role(auth.uid(), 'chef_camp')) THEN
    RAISE EXCEPTION 'Unauthorized: User does not have permission to distribute food';
  END IF;

  -- Validate input
  IF p_amount_needed <= 0 THEN
    RAISE EXCEPTION 'Amount needed must be positive';
  END IF;

  -- Loop through batches in FIFO order (oldest first, expiring soonest first)
  FOR v_batch IN
    SELECT id, quantity, batch_number, arrival_date, expiry_date
    FROM inventory_batches
    WHERE item_variant_id = p_item_variant_id
      AND location_id = p_location_id
      AND is_depleted = false
      AND quantity > 0
    ORDER BY 
      COALESCE(expiry_date, '2099-12-31'::date) ASC,
      arrival_date ASC
  LOOP
    -- Calculate how much to deduct from this batch
    v_deducted := LEAST(v_batch.quantity, v_remaining);
    
    -- Update batch quantity
    UPDATE inventory_batches
    SET 
      quantity = quantity - v_deducted,
      is_depleted = (quantity - v_deducted = 0),
      updated_at = now()
    WHERE id = v_batch.id;
    
    -- Record batch usage
    v_batch_info := jsonb_build_object(
      'batch_id', v_batch.id,
      'batch_number', v_batch.batch_number,
      'quantity_used', v_deducted,
      'arrival_date', v_batch.arrival_date,
      'expiry_date', v_batch.expiry_date
    );
    v_batches_used := v_batches_used || v_batch_info;
    
    -- Reduce remaining amount needed
    v_remaining := v_remaining - v_deducted;
    
    -- Exit if we've fulfilled the entire request
    EXIT WHEN v_remaining = 0;
  END LOOP;

  -- Check if we couldn't fulfill the entire request
  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Insufficient stock: needed %, only % available', 
      p_amount_needed, p_amount_needed - v_remaining;
  END IF;

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'amount_distributed', p_amount_needed,
    'batches_used', v_batches_used,
    'batches_count', jsonb_array_length(v_batches_used)
  );
END;
$function$;

-- Fix get_overdue_loans: Require authenticated user
CREATE OR REPLACE FUNCTION public.get_overdue_loans(p_location_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(allocation_id uuid, personnel_nom text, personnel_prenom text, item_type text, item_subtype text, expected_return_date date, days_overdue integer)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    a.id as allocation_id,
    p.nom as personnel_nom,
    p.prenom as personnel_prenom,
    si.type as item_type,
    si.sous_type as item_subtype,
    a.expected_return_date,
    (CURRENT_DATE - a.expected_return_date)::integer as days_overdue
  FROM allocations a
  JOIN personnel p ON a.personnel_id = p.id
  JOIN item_variants iv ON a.item_variant_id = iv.id
  JOIN stock_items si ON iv.stock_item_id = si.id
  WHERE a.transaction_type = 'LOAN'
    AND a.is_active = true
    AND a.actual_return_date IS NULL
    AND a.expected_return_date < CURRENT_DATE
    AND (p_location_id IS NULL OR p.location_id = p_location_id)
    -- Authorization: Admins see all, chef_camp sees only their location
    AND (
      has_role(auth.uid(), 'admin_central')
      OR (has_role(auth.uid(), 'chef_camp') AND p.location_id = get_user_location(auth.uid()))
    )
  ORDER BY days_overdue DESC;
$function$;

-- Fix get_expiring_batches: Require authenticated user with role
CREATE OR REPLACE FUNCTION public.get_expiring_batches(days_ahead integer DEFAULT 30)
 RETURNS TABLE(batch_id uuid, item_type text, batch_number text, quantity integer, expiry_date date, days_until_expiry integer, location_nom text)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    ib.id as batch_id,
    si.type as item_type,
    ib.batch_number,
    ib.quantity,
    ib.expiry_date,
    (ib.expiry_date - CURRENT_DATE)::integer as days_until_expiry,
    l.nom as location_nom
  FROM inventory_batches ib
  JOIN item_variants iv ON ib.item_variant_id = iv.id
  JOIN stock_items si ON iv.stock_item_id = si.id
  JOIN locations l ON ib.location_id = l.id
  WHERE ib.is_depleted = false
    AND ib.expiry_date IS NOT NULL
    AND ib.expiry_date <= CURRENT_DATE + days_ahead
    -- Authorization: Admins see all, chef_camp sees only their location
    AND (
      has_role(auth.uid(), 'admin_central')
      OR (has_role(auth.uid(), 'chef_camp') AND ib.location_id = get_user_location(auth.uid()))
    )
  ORDER BY ib.expiry_date ASC;
$function$;

-- Fix get_camp_consumption_rate: Require authenticated user with role
CREATE OR REPLACE FUNCTION public.get_camp_consumption_rate(p_location_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(location_id uuid, camp_name text, food_category text, food_subtype text, days_with_distribution bigint, total_quantity_90_days numeric, avg_daily_consumption numeric, max_daily_consumption numeric, min_daily_consumption numeric)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT * FROM view_camp_consumption_rate v
  WHERE (p_location_id IS NULL OR v.location_id = p_location_id)
    -- Authorization: Admins see all, chef_camp sees only their location
    AND (
      has_role(auth.uid(), 'admin_central')
      OR (has_role(auth.uid(), 'chef_camp') AND v.location_id = get_user_location(auth.uid()))
    );
$function$;