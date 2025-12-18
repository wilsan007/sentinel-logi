-- Ajouter les nouveaux champs pour gérer les différents types de ravitaillement
ALTER TABLE public.vehicle_fuel_logs
ADD COLUMN IF NOT EXISTS type_ravitaillement text DEFAULT 'KILOMETRIQUE' CHECK (type_ravitaillement IN ('KILOMETRIQUE', 'MENSUEL', 'EXCEPTIONNEL')),
ADD COLUMN IF NOT EXISTS km_parcourus integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS alerte_km boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS justification text,
ADD COLUMN IF NOT EXISTS mission_description text,
ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id),
ADD COLUMN IF NOT EXISTS statut_validation text DEFAULT 'EN_ATTENTE' CHECK (statut_validation IN ('EN_ATTENTE', 'APPROUVE', 'REFUSE')),
ADD COLUMN IF NOT EXISTS valide_par uuid,
ADD COLUMN IF NOT EXISTS date_validation timestamp with time zone;

-- Créer un index pour les recherches par type
CREATE INDEX IF NOT EXISTS idx_fuel_logs_type ON public.vehicle_fuel_logs(type_ravitaillement);

-- Créer un index pour les alertes
CREATE INDEX IF NOT EXISTS idx_fuel_logs_alerte ON public.vehicle_fuel_logs(alerte_km) WHERE alerte_km = true;