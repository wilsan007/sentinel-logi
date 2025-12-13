
-- Add carte grise and assurance fields to vehicles
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS carte_grise_numero text,
ADD COLUMN IF NOT EXISTS assurance_dossier_numero text;

-- Create table for authorized drivers (multiple drivers per vehicle)
CREATE TABLE public.vehicle_authorized_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  personnel_id uuid NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(vehicle_id, personnel_id)
);

-- Enable RLS
ALTER TABLE public.vehicle_authorized_drivers ENABLE ROW LEVEL SECURITY;

-- RLS policy for admin_central only
CREATE POLICY "Admins centraux peuvent gérer vehicle_authorized_drivers"
ON public.vehicle_authorized_drivers
FOR ALL
USING (has_role(auth.uid(), 'admin_central'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_vehicle_authorized_drivers_vehicle ON public.vehicle_authorized_drivers(vehicle_id);
CREATE INDEX idx_vehicle_authorized_drivers_personnel ON public.vehicle_authorized_drivers(personnel_id);
