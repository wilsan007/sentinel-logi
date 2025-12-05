-- 1. Drop the dependent view first
DROP VIEW IF EXISTS view_supplier_performance;

-- 2. Create verification status enum (may already exist, so use IF NOT EXISTS workaround)
DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('PENDING', 'VALIDATED', 'ADJUSTED', 'PARTIAL_REJECT', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Modify procurement_stage enum - need to recreate it
-- First, store existing data
ALTER TABLE procurement_orders ADD COLUMN IF NOT EXISTS stage_temp TEXT;
UPDATE procurement_orders SET stage_temp = stage::TEXT WHERE stage_temp IS NULL;
ALTER TABLE procurement_orders ALTER COLUMN stage DROP DEFAULT;
ALTER TABLE procurement_orders ALTER COLUMN stage TYPE TEXT USING stage::TEXT;

DROP TYPE IF EXISTS procurement_stage;

CREATE TYPE procurement_stage AS ENUM (
  'DRAFT',
  'SUPPLIER_SELECTION',
  'ORDER_PLACED',
  'PAYMENT_VERIFIED',
  'IN_TRANSIT',
  'CUSTOMS_ENTRY',
  'QUOTE_REQUEST',
  'QUOTE_SELECTION',
  'INVOICE_RECEIVED',
  'DELIVERY_PENDING',
  'VERIFICATION',
  'PAYMENT_ORDER',
  'PAYMENT_TRACKING',
  'PAID',
  'RECEIVED',
  'CANCELLED'
);

-- Restore stage column with new type
ALTER TABLE procurement_orders ALTER COLUMN stage TYPE procurement_stage USING stage_temp::procurement_stage;
ALTER TABLE procurement_orders ALTER COLUMN stage SET DEFAULT 'DRAFT'::procurement_stage;
ALTER TABLE procurement_orders DROP COLUMN IF EXISTS stage_temp;

-- 4. Add new fields to procurement_orders
ALTER TABLE procurement_orders ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE procurement_orders ADD COLUMN IF NOT EXISTS invoice_date DATE;
ALTER TABLE procurement_orders ADD COLUMN IF NOT EXISTS invoice_amount NUMERIC;
ALTER TABLE procurement_orders ADD COLUMN IF NOT EXISTS payment_order_number TEXT;
ALTER TABLE procurement_orders ADD COLUMN IF NOT EXISTS payment_order_date DATE;
ALTER TABLE procurement_orders ADD COLUMN IF NOT EXISTS payment_slip_number TEXT;
ALTER TABLE procurement_orders ADD COLUMN IF NOT EXISTS payment_slip_date DATE;
ALTER TABLE procurement_orders ADD COLUMN IF NOT EXISTS treasury_payment_date DATE;
ALTER TABLE procurement_orders ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'PENDING';
ALTER TABLE procurement_orders ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE procurement_orders ADD COLUMN IF NOT EXISTS verified_by UUID;
ALTER TABLE procurement_orders ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- 5. Add reception tracking fields to procurement_order_items
ALTER TABLE procurement_order_items ADD COLUMN IF NOT EXISTS quantity_accepted INTEGER DEFAULT 0;
ALTER TABLE procurement_order_items ADD COLUMN IF NOT EXISTS quantity_rejected INTEGER DEFAULT 0;
ALTER TABLE procurement_order_items ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE procurement_order_items ADD COLUMN IF NOT EXISTS item_status TEXT DEFAULT 'pending';

-- 6. Create procurement_quotes table
CREATE TABLE IF NOT EXISTS procurement_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES procurement_orders(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'DJF',
  validity_date DATE,
  is_selected BOOLEAN DEFAULT false,
  document_url TEXT,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Enable RLS on procurement_quotes
ALTER TABLE procurement_quotes ENABLE ROW LEVEL SECURITY;

-- 8. RLS policies for procurement_quotes
CREATE POLICY "Admins centraux peuvent gérer procurement_quotes"
ON procurement_quotes FOR ALL
USING (has_role(auth.uid(), 'admin_central'::app_role));

CREATE POLICY "Chefs de camp peuvent voir quotes de leurs commandes"
ON procurement_quotes FOR SELECT
USING (
  has_role(auth.uid(), 'chef_camp'::app_role) AND
  EXISTS (
    SELECT 1 FROM procurement_orders po
    WHERE po.id = procurement_quotes.order_id
    AND po.location_id = get_user_location(auth.uid())
  )
);

-- 9. Recreate view_supplier_performance
CREATE OR REPLACE VIEW view_supplier_performance AS
SELECT 
  s.id as supplier_id,
  s.name as supplier_name,
  s.code as supplier_code,
  s.country,
  COUNT(po.id) as total_orders,
  COUNT(CASE WHEN po.stage = 'RECEIVED' OR po.stage = 'PAID' THEN 1 END) as completed_orders,
  s.avg_delivery_days,
  COUNT(CASE WHEN po.actual_delivery_date > po.expected_delivery_date THEN 1 END) as late_deliveries,
  SUM(po.total_amount) as total_order_value,
  s.rating as current_rating,
  s.on_time_delivery_rate,
  s.is_active
FROM suppliers s
LEFT JOIN procurement_orders po ON s.id = po.supplier_id
GROUP BY s.id, s.name, s.code, s.country, s.avg_delivery_days, s.rating, s.on_time_delivery_rate, s.is_active;

-- 10. Create function to check if supplier is national
CREATE OR REPLACE FUNCTION is_national_supplier(p_supplier_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(country = 'Djibouti', false)
  FROM suppliers
  WHERE id = p_supplier_id
$$;

-- 11. Create indexes
CREATE INDEX IF NOT EXISTS idx_procurement_quotes_order_id ON procurement_quotes(order_id);
CREATE INDEX IF NOT EXISTS idx_procurement_quotes_supplier_id ON procurement_quotes(supplier_id);
CREATE INDEX IF NOT EXISTS idx_procurement_orders_verification_status ON procurement_orders(verification_status);