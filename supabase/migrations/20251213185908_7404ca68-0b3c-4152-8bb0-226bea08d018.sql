-- Ajouter SPARE_PARTS à l'enum category_type pour le procurement
ALTER TYPE public.category_type ADD VALUE IF NOT EXISTS 'SPARE_PARTS';

-- Créer une table de demandes de pièces détachées (spare_parts_requests)
CREATE TABLE public.spare_parts_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spare_part_id UUID REFERENCES public.spare_parts(id) ON DELETE CASCADE,
  part_name TEXT NOT NULL,
  part_reference TEXT,
  categorie TEXT NOT NULL,
  quantite_demandee INTEGER NOT NULL DEFAULT 1,
  urgence TEXT DEFAULT 'NORMALE' CHECK (urgence IN ('BASSE', 'NORMALE', 'HAUTE', 'CRITIQUE')),
  motif TEXT,
  vehicle_id UUID REFERENCES public.vehicles(id),
  diagnostic_id UUID REFERENCES public.vehicle_diagnostics(id),
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'approuve', 'commande', 'recu', 'refuse')),
  demande_par UUID,
  approuve_par UUID,
  date_demande TIMESTAMP WITH TIME ZONE DEFAULT now(),
  date_traitement TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_spare_parts_requests_statut ON public.spare_parts_requests(statut);
CREATE INDEX idx_spare_parts_requests_urgence ON public.spare_parts_requests(urgence);
CREATE INDEX idx_spare_parts_requests_date ON public.spare_parts_requests(date_demande DESC);

-- Trigger pour updated_at
CREATE TRIGGER update_spare_parts_requests_updated_at
  BEFORE UPDATE ON public.spare_parts_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.spare_parts_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins centraux peuvent gérer spare_parts_requests"
  ON public.spare_parts_requests
  FOR ALL
  USING (has_role(auth.uid(), 'admin_central'::app_role));

-- Ajouter colonne procurement_order_id à spare_parts pour lier aux commandes
ALTER TABLE public.spare_parts ADD COLUMN IF NOT EXISTS procurement_order_id UUID REFERENCES public.procurement_orders(id);
ALTER TABLE public.spare_parts ADD COLUMN IF NOT EXISTS last_order_date DATE;
ALTER TABLE public.spare_parts ADD COLUMN IF NOT EXISTS last_order_quantity INTEGER;