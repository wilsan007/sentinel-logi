
-- Table des catégories de diagnostic (systèmes du véhicule)
CREATE TABLE public.diagnostic_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  description TEXT,
  ordre INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des options de diagnostic (problèmes spécifiques par catégorie)
CREATE TABLE public.diagnostic_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.diagnostic_categories(id) ON DELETE CASCADE NOT NULL,
  nom TEXT NOT NULL,
  description TEXT,
  ordre INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des diagnostics véhicule
CREATE TABLE public.vehicle_diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID REFERENCES public.vehicle_garage_intakes(id) ON DELETE CASCADE NOT NULL,
  mecanicien_id UUID REFERENCES public.personnel(id),
  assigned_by UUID,
  assigned_at TIMESTAMPTZ,
  diagnostic_date TIMESTAMPTZ,
  impressions_conducteur_validees BOOLEAN DEFAULT false,
  notes_mecanicien TEXT,
  diagnostic_resume TEXT,
  statut TEXT NOT NULL DEFAULT 'EN_ATTENTE' CHECK (statut IN ('EN_ATTENTE', 'EN_COURS', 'TERMINE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des options sélectionnées pour chaque diagnostic
CREATE TABLE public.vehicle_diagnostic_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id UUID REFERENCES public.vehicle_diagnostics(id) ON DELETE CASCADE NOT NULL,
  option_id UUID REFERENCES public.diagnostic_options(id) ON DELETE CASCADE NOT NULL,
  severite TEXT DEFAULT 'MOYEN' CHECK (severite IN ('FAIBLE', 'MOYEN', 'GRAVE', 'CRITIQUE')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diagnostic_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_diagnostic_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins centraux peuvent gérer diagnostic_categories" ON public.diagnostic_categories
  FOR ALL USING (has_role(auth.uid(), 'admin_central'::app_role));

CREATE POLICY "Admins centraux peuvent gérer diagnostic_options" ON public.diagnostic_options
  FOR ALL USING (has_role(auth.uid(), 'admin_central'::app_role));

CREATE POLICY "Admins centraux peuvent gérer vehicle_diagnostics" ON public.vehicle_diagnostics
  FOR ALL USING (has_role(auth.uid(), 'admin_central'::app_role));

CREATE POLICY "Admins centraux peuvent gérer vehicle_diagnostic_items" ON public.vehicle_diagnostic_items
  FOR ALL USING (has_role(auth.uid(), 'admin_central'::app_role));

-- Trigger updated_at
CREATE TRIGGER handle_vehicle_diagnostics_updated_at
  BEFORE UPDATE ON public.vehicle_diagnostics
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insérer les catégories de diagnostic standards
INSERT INTO public.diagnostic_categories (nom, description, ordre) VALUES
  ('Moteur', 'Problèmes liés au moteur et système de combustion', 1),
  ('Transmission', 'Boîte de vitesses, embrayage, différentiel', 2),
  ('Freinage', 'Système de freinage, disques, plaquettes, ABS', 3),
  ('Suspension', 'Amortisseurs, ressorts, triangles, rotules', 4),
  ('Direction', 'Crémaillère, biellettes, pompe de direction', 5),
  ('Électricité', 'Batterie, alternateur, démarreur, éclairage', 6),
  ('Climatisation', 'Compresseur, condenseur, gaz réfrigérant', 7),
  ('Carrosserie', 'Dégâts extérieurs, peinture, pare-chocs', 8),
  ('Pneus & Roues', 'État des pneus, jantes, équilibrage', 9),
  ('Fluides', 'Huile moteur, liquide de refroidissement, freins', 10);

-- Insérer les options de diagnostic par catégorie
INSERT INTO public.diagnostic_options (category_id, nom, ordre)
SELECT c.id, o.nom, o.ordre FROM public.diagnostic_categories c
CROSS JOIN (VALUES
  ('Moteur', 'Bruit anormal moteur', 1),
  ('Moteur', 'Fumée excessive échappement', 2),
  ('Moteur', 'Perte de puissance', 3),
  ('Moteur', 'Surchauffe moteur', 4),
  ('Moteur', 'Fuite huile moteur', 5),
  ('Moteur', 'Voyant moteur allumé', 6),
  ('Transmission', 'Difficulté passage vitesses', 1),
  ('Transmission', 'Bruit boîte de vitesses', 2),
  ('Transmission', 'Embrayage patine', 3),
  ('Transmission', 'Fuite huile transmission', 4),
  ('Freinage', 'Freins usés', 1),
  ('Freinage', 'Bruit au freinage', 2),
  ('Freinage', 'Pédale de frein molle', 3),
  ('Freinage', 'Voyant ABS allumé', 4),
  ('Freinage', 'Fuite liquide de frein', 5),
  ('Suspension', 'Amortisseurs défaillants', 1),
  ('Suspension', 'Bruits suspension', 2),
  ('Suspension', 'Véhicule penche', 3),
  ('Suspension', 'Rotules usées', 4),
  ('Direction', 'Direction dure', 1),
  ('Direction', 'Jeu dans la direction', 2),
  ('Direction', 'Vibrations volant', 3),
  ('Direction', 'Fuite direction assistée', 4),
  ('Électricité', 'Batterie faible', 1),
  ('Électricité', 'Alternateur défaillant', 2),
  ('Électricité', 'Problème démarrage', 3),
  ('Électricité', 'Éclairage défectueux', 4),
  ('Électricité', 'Fusibles grillés', 5),
  ('Climatisation', 'Clim ne refroidit pas', 1),
  ('Climatisation', 'Bruit compresseur', 2),
  ('Climatisation', 'Fuite gaz réfrigérant', 3),
  ('Carrosserie', 'Bosses/Enfoncements', 1),
  ('Carrosserie', 'Rayures profondes', 2),
  ('Carrosserie', 'Pare-chocs endommagé', 3),
  ('Carrosserie', 'Vitres fissurées', 4),
  ('Pneus & Roues', 'Pneus usés', 1),
  ('Pneus & Roues', 'Crevaison', 2),
  ('Pneus & Roues', 'Déséquilibrage roues', 3),
  ('Pneus & Roues', 'Jantes endommagées', 4),
  ('Fluides', 'Niveau huile bas', 1),
  ('Fluides', 'Liquide refroidissement bas', 2),
  ('Fluides', 'Liquide frein bas', 3),
  ('Fluides', 'Liquide direction bas', 4)
) AS o(cat_nom, nom, ordre)
WHERE c.nom = o.cat_nom;
