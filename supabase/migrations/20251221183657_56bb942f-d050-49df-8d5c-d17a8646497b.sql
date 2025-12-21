-- Table pour les dommages carrosserie des véhicules
CREATE TABLE public.vehicle_body_damages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intake_id UUID REFERENCES public.vehicle_garage_intakes(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  damage_type TEXT NOT NULL, -- scratch, dent, crack, paint_chip, collision, rust, broken_glass, tire_damage
  severity TEXT NOT NULL DEFAULT 'minor', -- minor, moderate, severe
  vehicle_view TEXT NOT NULL, -- top, front, rear, left, right
  position_x NUMERIC NOT NULL, -- position sur le croquis (0-100%)
  position_y NUMERIC NOT NULL,
  notes TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recorded_by UUID,
  is_pre_existing BOOLEAN DEFAULT false, -- existait avant l'entrée ou nouveau dommage
  is_repaired BOOLEAN DEFAULT false, -- si le dommage a été réparé
  repaired_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les sorties/restitutions de véhicules
CREATE TABLE public.vehicle_exits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intake_id UUID NOT NULL REFERENCES public.vehicle_garage_intakes(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  date_sortie TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  kilometrage_sortie INTEGER NOT NULL,
  travaux_effectues TEXT,
  pieces_remplacees TEXT[],
  cout_pieces NUMERIC DEFAULT 0,
  cout_main_oeuvre NUMERIC DEFAULT 0,
  cout_total NUMERIC DEFAULT 0,
  etat_general TEXT, -- bon, acceptable, a_surveiller
  observations_sortie TEXT,
  conducteur_id UUID REFERENCES public.personnel(id),
  remis_par UUID, -- le mécanicien/responsable qui remet le véhicule
  valide_par UUID, -- le responsable qui valide la sortie
  validated_at TIMESTAMP WITH TIME ZONE,
  signature_conducteur TEXT,
  signature_responsable TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les éléments d'inspection lors de la réception
CREATE TABLE public.vehicle_inspection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intake_id UUID NOT NULL REFERENCES public.vehicle_garage_intakes(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- exterior, interior, mechanical, documents
  item_name TEXT NOT NULL,
  status TEXT NOT NULL, -- ok, defective, missing, not_checked
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicle_body_damages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_exits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_inspection_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for vehicle_body_damages
CREATE POLICY "Admins centraux peuvent gérer vehicle_body_damages" 
ON public.vehicle_body_damages 
FOR ALL 
USING (has_role(auth.uid(), 'admin_central'));

-- RLS policies for vehicle_exits
CREATE POLICY "Admins centraux peuvent gérer vehicle_exits" 
ON public.vehicle_exits 
FOR ALL 
USING (has_role(auth.uid(), 'admin_central'));

-- RLS policies for vehicle_inspection_items
CREATE POLICY "Admins centraux peuvent gérer vehicle_inspection_items" 
ON public.vehicle_inspection_items 
FOR ALL 
USING (has_role(auth.uid(), 'admin_central'));

-- Triggers for updated_at
CREATE TRIGGER update_vehicle_body_damages_updated_at
BEFORE UPDATE ON public.vehicle_body_damages
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_vehicle_exits_updated_at
BEFORE UPDATE ON public.vehicle_exits
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add signature fields to vehicle_garage_intakes for reception
ALTER TABLE public.vehicle_garage_intakes 
ADD COLUMN IF NOT EXISTS signature_conducteur TEXT,
ADD COLUMN IF NOT EXISTS signature_receptionniste TEXT,
ADD COLUMN IF NOT EXISTS inspection_complete BOOLEAN DEFAULT false;