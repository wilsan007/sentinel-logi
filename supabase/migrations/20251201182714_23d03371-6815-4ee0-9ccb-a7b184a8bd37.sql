-- ============================================
-- 1. DIGITAL PROOF & QR SYSTEM
-- ============================================

-- Add QR code fields to inventory_batches and personnel
ALTER TABLE inventory_batches 
ADD COLUMN IF NOT EXISTS qr_code UUID DEFAULT gen_random_uuid() UNIQUE;

ALTER TABLE personnel 
ADD COLUMN IF NOT EXISTS qr_code UUID DEFAULT gen_random_uuid() UNIQUE;

-- Add signature proof to allocations
ALTER TABLE allocations 
ADD COLUMN IF NOT EXISTS signature_proof TEXT;

-- Create index for QR code lookups
CREATE INDEX IF NOT EXISTS idx_inventory_batches_qr_code ON inventory_batches(qr_code);
CREATE INDEX IF NOT EXISTS idx_personnel_qr_code ON personnel(qr_code);

-- ============================================
-- 2. INTELLIGENT AUDIT LOGS (SECURITY)
-- ============================================

-- Create suspicious_activities table
CREATE TABLE IF NOT EXISTS suspicious_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  description TEXT NOT NULL,
  related_table TEXT NOT NULL,
  related_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Enable RLS on suspicious_activities
ALTER TABLE suspicious_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for suspicious_activities
CREATE POLICY "Admins centraux peuvent voir suspicious_activities"
ON suspicious_activities FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin_central'::app_role));

CREATE POLICY "Admins centraux peuvent gérer suspicious_activities"
ON suspicious_activities FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin_central'::app_role));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_related ON suspicious_activities(related_table, related_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_detected_at ON suspicious_activities(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_reviewed ON suspicious_activities(reviewed) WHERE reviewed = false;

-- Function to detect repeated LOST items (more than twice in 6 months)
CREATE OR REPLACE FUNCTION detect_repeated_lost_items()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
  v_personnel_name TEXT;
  v_item_name TEXT;
BEGIN
  -- Only check for LOST reasons in RETURN transactions
  IF NEW.transaction_type = 'RETURN' AND NEW.return_reason = 'RETIRED' THEN
    -- Count occurrences of same item_variant_id for same personnel in last 6 months
    SELECT COUNT(*) INTO v_count
    FROM allocations
    WHERE personnel_id = NEW.personnel_id
      AND item_variant_id = NEW.item_variant_id
      AND transaction_type = 'RETURN'
      AND return_reason = 'RETIRED'
      AND date_attribution >= (CURRENT_DATE - INTERVAL '6 months')
      AND id != NEW.id;
    
    -- If this is the 3rd or more occurrence, create alert
    IF v_count >= 2 THEN
      -- Get personnel and item names for better description
      SELECT p.nom || ' ' || p.prenom INTO v_personnel_name
      FROM personnel p WHERE p.id = NEW.personnel_id;
      
      SELECT si.type || ' - ' || COALESCE(si.sous_type, '') INTO v_item_name
      FROM item_variants iv
      JOIN stock_items si ON iv.stock_item_id = si.id
      WHERE iv.id = NEW.item_variant_id;
      
      INSERT INTO suspicious_activities (
        activity_type,
        severity,
        description,
        related_table,
        related_id,
        metadata
      ) VALUES (
        'REPEATED_LOST_ITEMS',
        'HIGH',
        format('Personnel %s a déclaré %s fois la perte de %s en 6 mois', 
               v_personnel_name, v_count + 1, v_item_name),
        'allocations',
        NEW.id,
        jsonb_build_object(
          'personnel_id', NEW.personnel_id,
          'item_variant_id', NEW.item_variant_id,
          'occurrences', v_count + 1
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for repeated lost items detection
DROP TRIGGER IF EXISTS trigger_detect_repeated_lost_items ON allocations;
CREATE TRIGGER trigger_detect_repeated_lost_items
AFTER INSERT ON allocations
FOR EACH ROW
EXECUTE FUNCTION detect_repeated_lost_items();

-- Function to detect excessive inventory write-offs (>10% of batch)
CREATE OR REPLACE FUNCTION detect_excessive_writeoff()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_writeoff_percentage NUMERIC;
  v_item_name TEXT;
BEGIN
  -- Calculate percentage of write-off
  v_writeoff_percentage := ((OLD.quantity - NEW.quantity)::NUMERIC / OLD.quantity::NUMERIC) * 100;
  
  -- If write-off is greater than 10% and quantity decreased significantly
  IF v_writeoff_percentage > 10 AND (OLD.quantity - NEW.quantity) > 0 THEN
    -- Get item name
    SELECT si.type || ' - ' || COALESCE(si.sous_type, '') INTO v_item_name
    FROM item_variants iv
    JOIN stock_items si ON iv.stock_item_id = si.id
    WHERE iv.id = NEW.item_variant_id;
    
    INSERT INTO suspicious_activities (
      activity_type,
      severity,
      description,
      related_table,
      related_id,
      metadata
    ) VALUES (
      'EXCESSIVE_WRITEOFF',
      'CRITICAL',
      format('Perte de %s%% du lot %s (%s unités sur %s)', 
             ROUND(v_writeoff_percentage, 2), 
             NEW.batch_number,
             OLD.quantity - NEW.quantity,
             OLD.quantity),
      'inventory_batches',
      NEW.id,
      jsonb_build_object(
        'batch_id', NEW.id,
        'item_variant_id', NEW.item_variant_id,
        'original_quantity', OLD.quantity,
        'new_quantity', NEW.quantity,
        'writeoff_percentage', ROUND(v_writeoff_percentage, 2)
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for excessive write-off detection
DROP TRIGGER IF EXISTS trigger_detect_excessive_writeoff ON inventory_batches;
CREATE TRIGGER trigger_detect_excessive_writeoff
AFTER UPDATE ON inventory_batches
FOR EACH ROW
WHEN (OLD.quantity > NEW.quantity)
EXECUTE FUNCTION detect_excessive_writeoff();

-- ============================================
-- 3. ANALYTICS VIEWS (SQL VIEWS)
-- ============================================

-- View: Supplier Performance
CREATE OR REPLACE VIEW view_supplier_performance AS
SELECT 
  s.id as supplier_id,
  s.name as supplier_name,
  s.code as supplier_code,
  s.country,
  COUNT(po.id) as total_orders,
  COUNT(CASE WHEN po.stage = 'RECEIVED' THEN 1 END) as completed_orders,
  AVG(
    CASE 
      WHEN po.actual_delivery_date IS NOT NULL AND po.created_at IS NOT NULL 
      THEN EXTRACT(DAY FROM (po.actual_delivery_date::timestamp - po.created_at::timestamp))
      ELSE NULL 
    END
  )::INTEGER as avg_delivery_days,
  SUM(
    CASE 
      WHEN po.actual_delivery_date IS NOT NULL 
           AND po.expected_delivery_date IS NOT NULL 
           AND po.actual_delivery_date > po.expected_delivery_date 
      THEN 1 
      ELSE 0 
    END
  ) as late_deliveries,
  SUM(po.total_amount) as total_order_value,
  s.rating as current_rating,
  s.on_time_delivery_rate,
  s.is_active
FROM suppliers s
LEFT JOIN procurement_orders po ON s.id = po.supplier_id
GROUP BY s.id, s.name, s.code, s.country, s.rating, s.on_time_delivery_rate, s.is_active
ORDER BY completed_orders DESC, avg_delivery_days ASC;

-- View: Camp Consumption Rate (Food Categories)
CREATE OR REPLACE VIEW view_camp_consumption_rate AS
WITH daily_allocations AS (
  SELECT 
    l.id as location_id,
    l.nom as camp_name,
    si.type as food_category,
    si.sous_type as food_subtype,
    DATE(a.date_attribution) as allocation_date,
    SUM(a.quantite) as daily_quantity
  FROM allocations a
  JOIN personnel p ON a.personnel_id = p.id
  JOIN locations l ON p.location_id = l.id
  JOIN item_variants iv ON a.item_variant_id = iv.id
  JOIN stock_items si ON iv.stock_item_id = si.id
  WHERE si.categorie = 'FOOD'
    AND a.transaction_type IN ('PERMANENT_ISSUE', 'EMERGENCY_DISTRIBUTION')
    AND a.date_attribution >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY l.id, l.nom, si.type, si.sous_type, DATE(a.date_attribution)
)
SELECT 
  location_id,
  camp_name,
  food_category,
  food_subtype,
  COUNT(DISTINCT allocation_date) as days_with_distribution,
  SUM(daily_quantity) as total_quantity_90_days,
  ROUND(AVG(daily_quantity), 2) as avg_daily_consumption,
  MAX(daily_quantity) as max_daily_consumption,
  MIN(daily_quantity) as min_daily_consumption
FROM daily_allocations
GROUP BY location_id, camp_name, food_category, food_subtype
ORDER BY camp_name, food_category, avg_daily_consumption DESC;

-- Grant SELECT permissions on views
GRANT SELECT ON view_supplier_performance TO authenticated;
GRANT SELECT ON view_camp_consumption_rate TO authenticated;

-- Create RLS-compatible function to query supplier performance
CREATE OR REPLACE FUNCTION get_supplier_performance(p_supplier_id UUID DEFAULT NULL)
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
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM view_supplier_performance
  WHERE p_supplier_id IS NULL OR view_supplier_performance.supplier_id = p_supplier_id;
$$;

-- Create RLS-compatible function to query camp consumption
CREATE OR REPLACE FUNCTION get_camp_consumption_rate(p_location_id UUID DEFAULT NULL)
RETURNS TABLE (
  location_id UUID,
  camp_name TEXT,
  food_category TEXT,
  food_subtype TEXT,
  days_with_distribution BIGINT,
  total_quantity_90_days NUMERIC,
  avg_daily_consumption NUMERIC,
  max_daily_consumption NUMERIC,
  min_daily_consumption NUMERIC
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM view_camp_consumption_rate
  WHERE p_location_id IS NULL OR view_camp_consumption_rate.location_id = p_location_id;
$$;