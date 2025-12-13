-- Enum pour le type de véhicule
CREATE TYPE public.vehicle_type AS ENUM ('VOITURE', 'CAMION', 'MOTO', 'BUS', 'UTILITAIRE', 'ENGIN_SPECIAL');

-- Enum pour le statut opérationnel
CREATE TYPE public.vehicle_status AS ENUM ('OPERATIONNEL', 'EN_MAINTENANCE', 'EN_REPARATION', 'HORS_SERVICE', 'EN_MISSION');

-- Enum pour le type de carburant
CREATE TYPE public.fuel_type AS ENUM ('ESSENCE', 'DIESEL', 'GPL');

-- Enum pour le type de réparation
CREATE TYPE public.repair_type AS ENUM ('LEGERE', 'LOURDE');

-- Enum pour le statut de sinistre
CREATE TYPE public.incident_status AS ENUM ('DECLARE', 'EN_EXPERTISE', 'EN_REPARATION', 'CLOTURE');

-- Enum pour le type de document
CREATE TYPE public.vehicle_document_type AS ENUM ('ASSURANCE', 'CARTE_GRISE', 'CONTROLE_TECHNIQUE', 'VIGNETTE', 'AUTRE');

-- Table principale des véhicules
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  immatriculation TEXT NOT NULL UNIQUE,
  marque TEXT NOT NULL,
  modele TEXT NOT NULL,
  vehicle_type vehicle_type NOT NULL,
  annee INTEGER,
  couleur TEXT,
  vin TEXT,
  fuel_type fuel_type NOT NULL DEFAULT 'DIESEL',
  capacite_reservoir INTEGER, -- en litres
  consommation_moyenne NUMERIC, -- L/100km
  kilometrage_actuel INTEGER NOT NULL DEFAULT 0,
  status vehicle_status NOT NULL DEFAULT 'OPERATIONNEL',
  location_id UUID REFERENCES public.locations(id),
  conducteur_principal_id UUID REFERENCES public.personnel(id),
  notes TEXT,
  qr_code UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des entretiens
CREATE TABLE public.vehicle_maintenances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  date_entretien DATE NOT NULL,
  type_entretien TEXT NOT NULL, -- Vidange, Filtres, Pneus, Freins, etc.
  description TEXT,
  kilometrage INTEGER NOT NULL,
  cout NUMERIC,
  prestataire TEXT,
  prochain_entretien_km INTEGER,
  prochain_entretien_date DATE,
  effectue_par UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des réparations
CREATE TABLE public.vehicle_repairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  repair_type repair_type NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE,
  description TEXT NOT NULL,
  pieces_changees TEXT[],
  cout_pieces NUMERIC,
  cout_main_oeuvre NUMERIC,
  cout_total NUMERIC,
  garage TEXT,
  kilometrage INTEGER,
  est_termine BOOLEAN DEFAULT false,
  effectue_par UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des pleins de carburant
CREATE TABLE public.vehicle_fuel_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  date_plein TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  litres NUMERIC NOT NULL,
  prix_litre NUMERIC NOT NULL,
  cout_total NUMERIC NOT NULL,
  kilometrage INTEGER NOT NULL,
  station TEXT,
  plein_complet BOOLEAN DEFAULT true,
  conducteur_id UUID REFERENCES public.personnel(id),
  enregistre_par UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des sinistres
CREATE TABLE public.vehicle_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  date_incident TIMESTAMP WITH TIME ZONE NOT NULL,
  lieu TEXT,
  description TEXT NOT NULL,
  status incident_status NOT NULL DEFAULT 'DECLARE',
  conducteur_responsable_id UUID REFERENCES public.personnel(id),
  degre_responsabilite TEXT, -- Totale, Partielle, Aucune
  tiers_implique BOOLEAN DEFAULT false,
  tiers_info JSONB, -- Nom, contact, assurance du tiers
  cout_estimation NUMERIC,
  cout_reel NUMERIC,
  couvert_assurance BOOLEAN,
  montant_franchise NUMERIC,
  numero_dossier_assurance TEXT,
  photos_urls TEXT[],
  sanctions TEXT,
  notes TEXT,
  declare_par UUID REFERENCES auth.users(id),
  expertise_date DATE,
  expertise_rapport TEXT,
  cloture_date DATE,
  cloture_par UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des documents véhicule (accès restreint)
CREATE TABLE public.vehicle_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  document_type vehicle_document_type NOT NULL,
  numero_document TEXT,
  date_emission DATE,
  date_expiration DATE,
  organisme_emetteur TEXT,
  cout NUMERIC,
  document_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour vehicles (admin_central uniquement)
CREATE POLICY "Admins centraux peuvent gérer vehicles" 
ON public.vehicles FOR ALL 
USING (has_role(auth.uid(), 'admin_central'::app_role));

-- RLS Policies pour vehicle_maintenances
CREATE POLICY "Admins centraux peuvent gérer vehicle_maintenances" 
ON public.vehicle_maintenances FOR ALL 
USING (has_role(auth.uid(), 'admin_central'::app_role));

-- RLS Policies pour vehicle_repairs
CREATE POLICY "Admins centraux peuvent gérer vehicle_repairs" 
ON public.vehicle_repairs FOR ALL 
USING (has_role(auth.uid(), 'admin_central'::app_role));

-- RLS Policies pour vehicle_fuel_logs
CREATE POLICY "Admins centraux peuvent gérer vehicle_fuel_logs" 
ON public.vehicle_fuel_logs FOR ALL 
USING (has_role(auth.uid(), 'admin_central'::app_role));

-- RLS Policies pour vehicle_incidents
CREATE POLICY "Admins centraux peuvent gérer vehicle_incidents" 
ON public.vehicle_incidents FOR ALL 
USING (has_role(auth.uid(), 'admin_central'::app_role));

-- RLS Policies pour vehicle_documents (accès très restreint)
CREATE POLICY "Admins centraux peuvent gérer vehicle_documents" 
ON public.vehicle_documents FOR ALL 
USING (has_role(auth.uid(), 'admin_central'::app_role));

-- Triggers pour updated_at
CREATE TRIGGER update_vehicles_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_vehicle_maintenances_updated_at
BEFORE UPDATE ON public.vehicle_maintenances
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_vehicle_repairs_updated_at
BEFORE UPDATE ON public.vehicle_repairs
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_vehicle_incidents_updated_at
BEFORE UPDATE ON public.vehicle_incidents
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_vehicle_documents_updated_at
BEFORE UPDATE ON public.vehicle_documents
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Index pour améliorer les performances
CREATE INDEX idx_vehicles_location ON public.vehicles(location_id);
CREATE INDEX idx_vehicles_status ON public.vehicles(status);
CREATE INDEX idx_vehicle_maintenances_vehicle ON public.vehicle_maintenances(vehicle_id);
CREATE INDEX idx_vehicle_repairs_vehicle ON public.vehicle_repairs(vehicle_id);
CREATE INDEX idx_vehicle_fuel_logs_vehicle ON public.vehicle_fuel_logs(vehicle_id);
CREATE INDEX idx_vehicle_incidents_vehicle ON public.vehicle_incidents(vehicle_id);
CREATE INDEX idx_vehicle_incidents_status ON public.vehicle_incidents(status);
CREATE INDEX idx_vehicle_documents_vehicle ON public.vehicle_documents(vehicle_id);
CREATE INDEX idx_vehicle_documents_expiration ON public.vehicle_documents(date_expiration);