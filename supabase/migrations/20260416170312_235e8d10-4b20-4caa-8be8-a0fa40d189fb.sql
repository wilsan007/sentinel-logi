
-- Fix 1: Drop and recreate get_supplier_performance with role check
DROP FUNCTION IF EXISTS public.get_supplier_performance(UUID);

CREATE FUNCTION public.get_supplier_performance(p_supplier_id UUID DEFAULT NULL)
RETURNS TABLE (
  supplier_id UUID,
  supplier_name TEXT,
  supplier_code TEXT,
  country TEXT,
  total_orders BIGINT,
  completed_orders BIGINT,
  avg_delivery_days INTEGER,
  late_deliveries BIGINT,
  total_order_value NUMERIC,
  current_rating supplier_rating,
  on_time_delivery_rate NUMERIC,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin_central') THEN
    RAISE EXCEPTION 'Unauthorized: admin_central role required';
  END IF;
  
  RETURN QUERY
  SELECT vsp.supplier_id, vsp.supplier_name, vsp.supplier_code, vsp.country,
         vsp.total_orders, vsp.completed_orders, vsp.avg_delivery_days,
         vsp.late_deliveries, vsp.total_order_value, vsp.current_rating,
         vsp.on_time_delivery_rate, vsp.is_active
  FROM view_supplier_performance vsp
  WHERE p_supplier_id IS NULL OR vsp.supplier_id = p_supplier_id;
END;
$$;

-- Fix 2: Replace overly permissive INSERT policy on security_audit_log
DROP POLICY IF EXISTS "System peut créer audit logs" ON public.security_audit_log;

CREATE POLICY "Authenticated users can create audit logs"
ON public.security_audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);
