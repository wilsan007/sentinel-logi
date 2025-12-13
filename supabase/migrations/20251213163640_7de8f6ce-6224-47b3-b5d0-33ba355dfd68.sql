
-- Add validation fields to vehicle_diagnostics
ALTER TABLE public.vehicle_diagnostics 
ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS validated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS validation_status text DEFAULT 'EN_ATTENTE_VALIDATION' CHECK (validation_status IN ('EN_ATTENTE_VALIDATION', 'VALIDE', 'REJETE', 'REVISION_DEMANDEE')),
ADD COLUMN IF NOT EXISTS validation_notes text,
ADD COLUMN IF NOT EXISTS estimated_hours numeric,
ADD COLUMN IF NOT EXISTS estimated_completion_date date,
ADD COLUMN IF NOT EXISTS work_type text CHECK (work_type IN ('REPARATION', 'ENTRETIEN', 'INSPECTION'));

-- Add date_mise_en_service to vehicles
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS date_mise_en_service date;

-- Add planning fields to vehicle_maintenances
ALTER TABLE public.vehicle_maintenances
ADD COLUMN IF NOT EXISTS statut text DEFAULT 'PLANIFIE' CHECK (statut IN ('PLANIFIE', 'EN_COURS', 'TERMINE', 'ANNULE')),
ADD COLUMN IF NOT EXISTS estimated_hours numeric,
ADD COLUMN IF NOT EXISTS pieces_requises text[];

-- Add planning fields to vehicle_repairs
ALTER TABLE public.vehicle_repairs
ADD COLUMN IF NOT EXISTS diagnostic_id uuid REFERENCES public.vehicle_diagnostics(id),
ADD COLUMN IF NOT EXISTS estimated_hours numeric,
ADD COLUMN IF NOT EXISTS statut text DEFAULT 'EN_ATTENTE' CHECK (statut IN ('EN_ATTENTE', 'PIECES_EN_ATTENTE', 'EN_COURS', 'TERMINE', 'ANNULE'));

-- Create spare parts inventory table
CREATE TABLE IF NOT EXISTS public.spare_parts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference text NOT NULL,
  nom text NOT NULL,
  description text,
  categorie text NOT NULL,
  quantite integer NOT NULL DEFAULT 0,
  seuil_alerte integer DEFAULT 5,
  prix_unitaire numeric,
  fournisseur text,
  emplacement_stock text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for parts required in repairs
CREATE TABLE IF NOT EXISTS public.vehicle_repair_parts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repair_id uuid REFERENCES public.vehicle_repairs(id) ON DELETE CASCADE,
  diagnostic_id uuid REFERENCES public.vehicle_diagnostics(id) ON DELETE CASCADE,
  spare_part_id uuid REFERENCES public.spare_parts(id),
  part_name text NOT NULL,
  quantity_needed integer NOT NULL DEFAULT 1,
  quantity_available integer DEFAULT 0,
  is_available boolean DEFAULT false,
  prix_estime numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create maintenance schedule/planning table
CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  type_entretien text NOT NULL,
  description text,
  date_prevue date NOT NULL,
  kilometrage_prevu integer,
  statut text DEFAULT 'PLANIFIE' CHECK (statut IN ('PLANIFIE', 'CONFIRME', 'EN_COURS', 'TERMINE', 'REPORTE', 'ANNULE')),
  priorite text DEFAULT 'NORMALE' CHECK (priorite IN ('BASSE', 'NORMALE', 'HAUTE', 'URGENTE')),
  pieces_requises text[],
  notes text,
  rappel_envoye boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_repair_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies for spare_parts
CREATE POLICY "Admins centraux peuvent gérer spare_parts" 
ON public.spare_parts FOR ALL 
USING (has_role(auth.uid(), 'admin_central'::app_role));

-- RLS policies for vehicle_repair_parts
CREATE POLICY "Admins centraux peuvent gérer vehicle_repair_parts" 
ON public.vehicle_repair_parts FOR ALL 
USING (has_role(auth.uid(), 'admin_central'::app_role));

-- RLS policies for maintenance_schedules
CREATE POLICY "Admins centraux peuvent gérer maintenance_schedules" 
ON public.maintenance_schedules FOR ALL 
USING (has_role(auth.uid(), 'admin_central'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_spare_parts_updated_at
BEFORE UPDATE ON public.spare_parts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_maintenance_schedules_updated_at
BEFORE UPDATE ON public.maintenance_schedules
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert sample spare parts categories
INSERT INTO public.spare_parts (reference, nom, categorie, quantite, seuil_alerte, prix_unitaire) VALUES
('FLT-HUI-001', 'Filtre à huile universel', 'Filtres', 25, 10, 2500),
('FLT-AIR-001', 'Filtre à air standard', 'Filtres', 20, 8, 3500),
('FLT-CAR-001', 'Filtre à carburant diesel', 'Filtres', 15, 5, 4000),
('HUI-MOT-5W30', 'Huile moteur 5W30 (5L)', 'Huiles', 30, 10, 8500),
('HUI-MOT-10W40', 'Huile moteur 10W40 (5L)', 'Huiles', 25, 10, 7500),
('PLQ-FRE-AVT', 'Plaquettes de frein avant', 'Freinage', 12, 4, 12000),
('PLQ-FRE-ARR', 'Plaquettes de frein arrière', 'Freinage', 10, 4, 10000),
('DSQ-FRE-001', 'Disque de frein standard', 'Freinage', 8, 3, 18000),
('BAT-12V-70', 'Batterie 12V 70Ah', 'Électrique', 5, 2, 35000),
('BOU-ALL-001', 'Jeu de bougies d''allumage', 'Allumage', 15, 5, 6000),
('COU-DIST-001', 'Courroie de distribution', 'Courroies', 6, 2, 25000),
('COU-ACC-001', 'Courroie d''accessoires', 'Courroies', 8, 3, 8000),
('AMO-AVT-001', 'Amortisseur avant', 'Suspension', 4, 2, 45000),
('AMO-ARR-001', 'Amortisseur arrière', 'Suspension', 4, 2, 38000),
('PNE-175-65', 'Pneu 175/65 R14', 'Pneumatiques', 8, 4, 22000);
