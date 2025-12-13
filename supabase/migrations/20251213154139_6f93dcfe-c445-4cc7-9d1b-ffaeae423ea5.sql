
-- Create table for garage vehicle intakes/receptions
CREATE TABLE public.vehicle_garage_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  conducteur_id uuid REFERENCES public.personnel(id),
  is_authorized_driver boolean NOT NULL DEFAULT false,
  kilometrage_arrivee integer NOT NULL,
  motif text NOT NULL CHECK (motif IN ('REVISION', 'PANNE', 'ACCIDENT_INTERNE', 'ACCIDENT_EXTERNE', 'CONTROLE_TECHNIQUE', 'REPARATION', 'RAVITAILLEMENT', 'AUTRE')),
  motif_precision text,
  impressions_conducteur text,
  service_oriente text CHECK (service_oriente IN ('MAINTENANCE', 'REPARATION_LEGERE', 'REPARATION_LOURDE', 'CARBURANT', 'INCIDENT', 'EXPERTISE')),
  date_arrivee timestamptz NOT NULL DEFAULT now(),
  date_sortie timestamptz,
  statut text NOT NULL DEFAULT 'EN_COURS' CHECK (statut IN ('EN_COURS', 'TERMINE', 'EN_ATTENTE')),
  enregistre_par uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicle_garage_intakes ENABLE ROW LEVEL SECURITY;

-- RLS policy for admin_central only
CREATE POLICY "Admins centraux peuvent gérer vehicle_garage_intakes"
ON public.vehicle_garage_intakes
FOR ALL
USING (has_role(auth.uid(), 'admin_central'::app_role));

-- Create indexes
CREATE INDEX idx_vehicle_garage_intakes_vehicle ON public.vehicle_garage_intakes(vehicle_id);
CREATE INDEX idx_vehicle_garage_intakes_date ON public.vehicle_garage_intakes(date_arrivee DESC);
CREATE INDEX idx_vehicle_garage_intakes_statut ON public.vehicle_garage_intakes(statut);

-- Add trigger for updated_at
CREATE TRIGGER update_vehicle_garage_intakes_updated_at
  BEFORE UPDATE ON public.vehicle_garage_intakes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
