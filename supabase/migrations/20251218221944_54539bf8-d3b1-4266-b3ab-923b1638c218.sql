
-- =====================================================
-- SECURITY FIXES MIGRATION
-- =====================================================

-- 1. FIX SUPPLIERS: Create a view for chef_camp without sensitive contact info
-- Drop the existing chef_camp SELECT policy
DROP POLICY IF EXISTS "Chefs de camp peuvent voir suppliers" ON public.suppliers;

-- Create a limited view for chef_camp users (no contact info)
CREATE OR REPLACE VIEW public.view_suppliers_limited
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  code,
  country,
  rating,
  avg_delivery_days,
  on_time_delivery_rate,
  total_orders_completed,
  is_active,
  payment_terms,
  -- Explicitly exclude: contact_email, contact_phone, notes
  created_at,
  updated_at
FROM suppliers;

-- Grant access to authenticated users (RLS on underlying table will filter)
GRANT SELECT ON public.view_suppliers_limited TO authenticated;

-- Create a new policy that allows chef_camp to only see limited supplier data via the view
-- The actual suppliers table remains restricted to admin_central only
-- Chef_camp users should use the view_suppliers_limited view

-- Create a function for chef_camp to get supplier data without contact info
CREATE OR REPLACE FUNCTION public.get_suppliers_for_camp()
RETURNS TABLE(
  id uuid,
  name text,
  code text,
  country text,
  rating supplier_rating,
  avg_delivery_days integer,
  on_time_delivery_rate numeric,
  total_orders_completed integer,
  is_active boolean,
  payment_terms text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id,
    s.name,
    s.code,
    s.country,
    s.rating,
    s.avg_delivery_days,
    s.on_time_delivery_rate,
    s.total_orders_completed,
    s.is_active,
    s.payment_terms,
    s.created_at,
    s.updated_at
  FROM suppliers s
  WHERE is_active = true
    AND (has_role(auth.uid(), 'admin_central') OR has_role(auth.uid(), 'chef_camp'));
$$;

-- 2. FIX VIEWS: Ensure security_invoker views have proper RLS
-- The views were created with security_invoker = true in previous migration
-- But we need RLS policies on underlying tables to work properly

-- 3. ADD audit logging capability for sensitive data access
-- Create an audit log table for tracking access to sensitive information
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admin_central can view audit logs
CREATE POLICY "Admins centraux peuvent voir audit logs"
ON public.security_audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin_central'));

-- System can insert audit logs (via trigger functions)
CREATE POLICY "System peut créer audit logs"
ON public.security_audit_log
FOR INSERT
WITH CHECK (true);

-- Grant insert to authenticated for logging
GRANT INSERT ON public.security_audit_log TO authenticated;
GRANT SELECT ON public.security_audit_log TO authenticated;
