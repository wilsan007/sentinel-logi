-- Fix SECURITY DEFINER views by recreating them with security_invoker = true
-- This ensures RLS policies are evaluated using the querying user's permissions

-- Recreate view_camp_consumption_rate with security_invoker
DROP VIEW IF EXISTS public.view_camp_consumption_rate;

CREATE VIEW public.view_camp_consumption_rate
WITH (security_invoker = true)
AS
WITH daily_allocations AS (
  SELECT 
    l.id AS location_id,
    l.nom AS camp_name,
    si.type AS food_category,
    si.sous_type AS food_subtype,
    date(a.date_attribution) AS allocation_date,
    sum(a.quantite) AS daily_quantity
  FROM allocations a
  JOIN personnel p ON a.personnel_id = p.id
  JOIN locations l ON p.location_id = l.id
  JOIN item_variants iv ON a.item_variant_id = iv.id
  JOIN stock_items si ON iv.stock_item_id = si.id
  WHERE si.categorie = 'FOOD'::category_type 
    AND a.transaction_type = ANY (ARRAY['PERMANENT_ISSUE'::transaction_type, 'EMERGENCY_DISTRIBUTION'::transaction_type])
    AND a.date_attribution >= (CURRENT_DATE - '90 days'::interval)
  GROUP BY l.id, l.nom, si.type, si.sous_type, date(a.date_attribution)
)
SELECT 
  location_id,
  camp_name,
  food_category,
  food_subtype,
  count(DISTINCT allocation_date) AS days_with_distribution,
  sum(daily_quantity) AS total_quantity_90_days,
  round(avg(daily_quantity), 2) AS avg_daily_consumption,
  max(daily_quantity) AS max_daily_consumption,
  min(daily_quantity) AS min_daily_consumption
FROM daily_allocations
GROUP BY location_id, camp_name, food_category, food_subtype
ORDER BY camp_name, food_category, round(avg(daily_quantity), 2) DESC;

-- Recreate view_supplier_performance with security_invoker
DROP VIEW IF EXISTS public.view_supplier_performance;

CREATE VIEW public.view_supplier_performance
WITH (security_invoker = true)
AS
SELECT 
  s.id AS supplier_id,
  s.name AS supplier_name,
  s.code AS supplier_code,
  s.country,
  count(po.id) AS total_orders,
  count(
    CASE
      WHEN po.stage = 'RECEIVED'::procurement_stage OR po.stage = 'PAID'::procurement_stage THEN 1
      ELSE NULL::integer
    END) AS completed_orders,
  s.avg_delivery_days,
  count(
    CASE
      WHEN po.actual_delivery_date > po.expected_delivery_date THEN 1
      ELSE NULL::integer
    END) AS late_deliveries,
  sum(po.total_amount) AS total_order_value,
  s.rating AS current_rating,
  s.on_time_delivery_rate,
  s.is_active
FROM suppliers s
LEFT JOIN procurement_orders po ON s.id = po.supplier_id
GROUP BY s.id, s.name, s.code, s.country, s.avg_delivery_days, s.rating, s.on_time_delivery_rate, s.is_active;

-- Grant appropriate permissions
GRANT SELECT ON public.view_camp_consumption_rate TO authenticated;
GRANT SELECT ON public.view_supplier_performance TO authenticated;