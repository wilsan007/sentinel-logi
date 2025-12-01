-- ============================================================================
-- SENTINEL LOGISTICS - ADVANCED SCHEMA REFINEMENT
-- ============================================================================

-- 1. CREATE NEW ENUMS
-- ============================================================================

-- Sizing standards for international procurement
CREATE TYPE sizing_standard AS ENUM ('EU', 'US', 'ASIAN', 'UNIVERSAL');

-- Transaction types for allocations
CREATE TYPE transaction_type AS ENUM (
  'PERMANENT_ISSUE',
  'LOAN',
  'RETURN',
  'EMERGENCY_DISTRIBUTION'
);

-- Return reasons for reverse logistics
CREATE TYPE return_reason AS ENUM (
  'RETIRED',
  'REVOKED',
  'REFORMED',
  'DAMAGED_EXCHANGE',
  'SIZE_EXCHANGE',
  'END_OF_LOAN'
);

-- Procurement workflow stages
CREATE TYPE procurement_stage AS ENUM (
  'DRAFT',
  'SUPPLIER_SELECTION',
  'ORDER_PLACED',
  'PAYMENT_VERIFIED',
  'IN_TRANSIT',
  'CUSTOMS_ENTRY',
  'RECEIVED',
  'CANCELLED'
);

-- Transport modes for procurement
CREATE TYPE transport_mode AS ENUM ('AIR', 'SEA', 'LAND', 'MULTIMODAL');

-- Supplier rating categories
CREATE TYPE supplier_rating AS ENUM ('EXCELLENT', 'GOOD', 'AVERAGE', 'POOR', 'BLACKLISTED');

-- 2. EXTEND EXISTING TABLES
-- ============================================================================

-- Add sizing standard to item_variants
ALTER TABLE item_variants 
ADD COLUMN sizing_standard sizing_standard DEFAULT 'EU',
ADD COLUMN is_unisex boolean DEFAULT false,
ADD COLUMN female_only boolean DEFAULT false,
ADD COLUMN male_only boolean DEFAULT false,
ADD COLUMN requires_size boolean DEFAULT true,
ADD COLUMN requires_gender boolean DEFAULT true,
ADD COLUMN item_constraints jsonb DEFAULT '{}'::jsonb;

-- Add sex field to personnel if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'personnel' AND column_name = 'sexe') THEN
    ALTER TABLE personnel ADD COLUMN sexe gender_type;
  END IF;
END $$;

-- Update allocations table for reverse logistics
ALTER TABLE allocations 
ADD COLUMN transaction_type transaction_type DEFAULT 'PERMANENT_ISSUE',
ADD COLUMN expected_return_date date,
ADD COLUMN actual_return_date date,
ADD COLUMN return_reason return_reason,
ADD COLUMN justification_text text,
ADD COLUMN parent_allocation_id uuid REFERENCES allocations(id),
ADD COLUMN is_active boolean DEFAULT true,
ADD COLUMN loan_status text;

-- Add index for active allocations
CREATE INDEX idx_allocations_active ON allocations(is_active) WHERE is_active = true;
CREATE INDEX idx_allocations_transaction_type ON allocations(transaction_type);
CREATE INDEX idx_allocations_expected_return ON allocations(expected_return_date) WHERE expected_return_date IS NOT NULL;

-- 3. INVENTORY BATCHES FOR FIFO (FOOD MANAGEMENT)
-- ============================================================================

CREATE TABLE inventory_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_variant_id uuid NOT NULL REFERENCES item_variants(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id),
  batch_number text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  original_quantity integer NOT NULL,
  arrival_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date,
  supplier_name text,
  supplier_id uuid,
  unit_cost decimal(10,2),
  total_cost decimal(10,2),
  customs_document_ref text,
  is_depleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT positive_quantity CHECK (quantity >= 0),
  CONSTRAINT valid_dates CHECK (expiry_date IS NULL OR expiry_date > arrival_date)
);

-- Indexes for FIFO queries
CREATE INDEX idx_batches_item_location ON inventory_batches(item_variant_id, location_id);
CREATE INDEX idx_batches_fifo ON inventory_batches(arrival_date, expiry_date) WHERE is_depleted = false;
CREATE INDEX idx_batches_expiry_alert ON inventory_batches(expiry_date) WHERE expiry_date IS NOT NULL AND is_depleted = false;

-- Trigger for updated_at
CREATE TRIGGER update_inventory_batches_updated_at
  BEFORE UPDATE ON inventory_batches
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- 4. PROCUREMENT MANAGEMENT
-- ============================================================================

-- Suppliers table
CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  country text,
  contact_email text,
  contact_phone text,
  payment_terms text,
  rating supplier_rating DEFAULT 'AVERAGE',
  avg_delivery_days integer,
  on_time_delivery_rate decimal(5,2),
  total_orders_completed integer DEFAULT 0,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Procurement orders
CREATE TABLE procurement_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id),
  location_id uuid NOT NULL REFERENCES locations(id),
  stage procurement_stage DEFAULT 'DRAFT',
  total_amount decimal(12,2),
  currency text DEFAULT 'XAF',
  transport_mode transport_mode,
  port_of_entry text,
  customs_entry_date date,
  expected_delivery_date date,
  actual_delivery_date date,
  tracking_number text,
  payment_reference text,
  payment_date date,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Procurement order items
CREATE TABLE procurement_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES procurement_orders(id) ON DELETE CASCADE,
  stock_item_id uuid NOT NULL REFERENCES stock_items(id),
  variant_specs jsonb,
  quantity_ordered integer NOT NULL,
  quantity_received integer DEFAULT 0,
  unit_price decimal(10,2),
  total_price decimal(10,2),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for procurement
CREATE INDEX idx_procurement_orders_stage ON procurement_orders(stage);
CREATE INDEX idx_procurement_orders_supplier ON procurement_orders(supplier_id);
CREATE INDEX idx_procurement_orders_location ON procurement_orders(location_id);
CREATE INDEX idx_procurement_order_items_order ON procurement_order_items(order_id);

-- Triggers
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_procurement_orders_updated_at
  BEFORE UPDATE ON procurement_orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- 5. FIFO DISTRIBUTION FUNCTION (STORED PROCEDURE)
-- ============================================================================

CREATE OR REPLACE FUNCTION distribute_food_fifo(
  p_item_variant_id uuid,
  p_location_id uuid,
  p_amount_needed integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch RECORD;
  v_remaining integer := p_amount_needed;
  v_deducted integer;
  v_batches_used jsonb := '[]'::jsonb;
  v_batch_info jsonb;
BEGIN
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
$$;

-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to get overdue loans
CREATE OR REPLACE FUNCTION get_overdue_loans(p_location_id uuid DEFAULT NULL)
RETURNS TABLE (
  allocation_id uuid,
  personnel_nom text,
  personnel_prenom text,
  item_type text,
  item_subtype text,
  expected_return_date date,
  days_overdue integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  ORDER BY days_overdue DESC;
$$;

-- Function to check expiring food batches
CREATE OR REPLACE FUNCTION get_expiring_batches(days_ahead integer DEFAULT 30)
RETURNS TABLE (
  batch_id uuid,
  item_type text,
  batch_number text,
  quantity integer,
  expiry_date date,
  days_until_expiry integer,
  location_nom text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  ORDER BY ib.expiry_date ASC;
$$;

-- 7. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_order_items ENABLE ROW LEVEL SECURITY;

-- inventory_batches policies
CREATE POLICY "Admins centraux peuvent gérer inventory_batches"
  ON inventory_batches FOR ALL
  USING (has_role(auth.uid(), 'admin_central'::app_role));

CREATE POLICY "Chefs de camp peuvent voir leurs batches"
  ON inventory_batches FOR SELECT
  USING (
    has_role(auth.uid(), 'chef_camp'::app_role) 
    AND location_id = get_user_location(auth.uid())
  );

CREATE POLICY "Chefs de camp peuvent créer des batches"
  ON inventory_batches FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'chef_camp'::app_role) 
    AND location_id = get_user_location(auth.uid())
  );

-- suppliers policies
CREATE POLICY "Admins centraux peuvent gérer suppliers"
  ON suppliers FOR ALL
  USING (has_role(auth.uid(), 'admin_central'::app_role));

CREATE POLICY "Chefs de camp peuvent voir suppliers"
  ON suppliers FOR SELECT
  USING (has_role(auth.uid(), 'chef_camp'::app_role));

-- procurement_orders policies
CREATE POLICY "Admins centraux peuvent gérer procurement_orders"
  ON procurement_orders FOR ALL
  USING (has_role(auth.uid(), 'admin_central'::app_role));

CREATE POLICY "Chefs de camp peuvent voir leurs commandes"
  ON procurement_orders FOR SELECT
  USING (
    has_role(auth.uid(), 'chef_camp'::app_role) 
    AND location_id = get_user_location(auth.uid())
  );

CREATE POLICY "Chefs de camp peuvent créer des commandes"
  ON procurement_orders FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'chef_camp'::app_role) 
    AND location_id = get_user_location(auth.uid())
  );

-- procurement_order_items policies
CREATE POLICY "Admins centraux peuvent gérer procurement_order_items"
  ON procurement_order_items FOR ALL
  USING (has_role(auth.uid(), 'admin_central'::app_role));

CREATE POLICY "Chefs de camp peuvent voir items de leurs commandes"
  ON procurement_order_items FOR SELECT
  USING (
    has_role(auth.uid(), 'chef_camp'::app_role) 
    AND EXISTS (
      SELECT 1 FROM procurement_orders po
      WHERE po.id = procurement_order_items.order_id
        AND po.location_id = get_user_location(auth.uid())
    )
  );

-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE inventory_batches IS 'FIFO inventory management for food items with expiry tracking';
COMMENT ON TABLE suppliers IS 'Supplier master data with performance metrics';
COMMENT ON TABLE procurement_orders IS 'Complete procurement workflow from draft to delivery';
COMMENT ON FUNCTION distribute_food_fifo IS 'Automatically distributes food stock using FIFO logic (oldest first)';
COMMENT ON FUNCTION get_overdue_loans IS 'Returns all loans past their expected return date';
COMMENT ON FUNCTION get_expiring_batches IS 'Alert for food batches approaching expiry date';