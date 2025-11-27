-- Création des énumérations
CREATE TYPE public.app_role AS ENUM ('admin_central', 'chef_camp');
CREATE TYPE public.category_type AS ENUM ('GEAR', 'FOOD');
CREATE TYPE public.unit_type AS ENUM ('kg', 'litre', 'boite', 'unite');
CREATE TYPE public.gender_type AS ENUM ('homme', 'femme', 'unisexe');
CREATE TYPE public.request_status AS ENUM ('en_attente', 'approuve', 'traite', 'refuse');

-- Table des rôles utilisateurs
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  location_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Table des profils utilisateurs
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom_complet TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des emplacements (camps)
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  adresse TEXT,
  chef_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ajouter la foreign key pour location_id dans user_roles
ALTER TABLE public.user_roles 
ADD CONSTRAINT fk_user_roles_location 
FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;

-- Table des articles de stock (base)
CREATE TABLE public.stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie category_type NOT NULL,
  type TEXT NOT NULL,
  sous_type TEXT,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des variantes d'articles
CREATE TABLE public.item_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id UUID REFERENCES public.stock_items(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  
  -- Attributs pour GEAR
  couleur TEXT,
  taille TEXT,
  genre gender_type,
  
  -- Attributs pour FOOD
  type_unite unit_type,
  
  quantite INTEGER NOT NULL DEFAULT 0,
  seuil_alerte INTEGER DEFAULT 10,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table du personnel
CREATE TABLE public.personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  matricule TEXT UNIQUE NOT NULL,
  grade TEXT NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT,
  date_entree DATE NOT NULL DEFAULT CURRENT_DATE,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des allocations (dotations)
CREATE TABLE public.allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id UUID REFERENCES public.personnel(id) ON DELETE CASCADE NOT NULL,
  item_variant_id UUID REFERENCES public.item_variants(id) ON DELETE CASCADE NOT NULL,
  quantite INTEGER NOT NULL DEFAULT 1,
  date_attribution TIMESTAMPTZ NOT NULL DEFAULT now(),
  motif TEXT NOT NULL,
  attribue_par UUID REFERENCES auth.users(id) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des demandes
CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  stock_item_id UUID REFERENCES public.stock_items(id) ON DELETE CASCADE NOT NULL,
  quantite_demandee INTEGER NOT NULL,
  statut request_status NOT NULL DEFAULT 'en_attente',
  demande_par UUID REFERENCES auth.users(id) NOT NULL,
  approuve_par UUID REFERENCES auth.users(id),
  date_demande TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_traitement TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fonction security definer pour vérifier les rôles (évite la récursion RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- Fonction pour obtenir le location_id d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_location(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT location_id
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fonction pour créer un profil automatiquement
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nom_complet, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nom_complet', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Triggers pour updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_stock_items_updated_at
  BEFORE UPDATE ON public.stock_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_item_variants_updated_at
  BEFORE UPDATE ON public.item_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_personnel_updated_at
  BEFORE UPDATE ON public.personnel
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger pour créer automatiquement un profil
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Activer RLS sur toutes les tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour user_roles
CREATE POLICY "Les utilisateurs peuvent voir leurs propres rôles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Les admins centraux peuvent tout voir"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin_central'));

-- Politiques RLS pour profiles
CREATE POLICY "Les profils sont visibles par tous les authentifiés"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Politiques RLS pour locations
CREATE POLICY "Les admins centraux peuvent tout voir sur locations"
  ON public.locations FOR ALL
  USING (public.has_role(auth.uid(), 'admin_central'));

CREATE POLICY "Les chefs de camp peuvent voir leur camp"
  ON public.locations FOR SELECT
  USING (
    public.has_role(auth.uid(), 'chef_camp') 
    AND id = public.get_user_location(auth.uid())
  );

-- Politiques RLS pour stock_items
CREATE POLICY "Les admins centraux peuvent gérer stock_items"
  ON public.stock_items FOR ALL
  USING (public.has_role(auth.uid(), 'admin_central'));

CREATE POLICY "Les chefs de camp peuvent voir stock_items"
  ON public.stock_items FOR SELECT
  TO authenticated
  USING (true);

-- Politiques RLS pour item_variants
CREATE POLICY "Les admins centraux peuvent gérer item_variants"
  ON public.item_variants FOR ALL
  USING (public.has_role(auth.uid(), 'admin_central'));

CREATE POLICY "Les chefs de camp peuvent voir leur stock"
  ON public.item_variants FOR SELECT
  USING (
    public.has_role(auth.uid(), 'chef_camp')
    AND location_id = public.get_user_location(auth.uid())
  );

CREATE POLICY "Les chefs de camp peuvent modifier leur stock"
  ON public.item_variants FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'chef_camp')
    AND location_id = public.get_user_location(auth.uid())
  );

-- Politiques RLS pour personnel
CREATE POLICY "Les admins centraux peuvent gérer personnel"
  ON public.personnel FOR ALL
  USING (public.has_role(auth.uid(), 'admin_central'));

CREATE POLICY "Les chefs de camp peuvent voir leur personnel"
  ON public.personnel FOR SELECT
  USING (
    public.has_role(auth.uid(), 'chef_camp')
    AND location_id = public.get_user_location(auth.uid())
  );

CREATE POLICY "Les chefs de camp peuvent gérer leur personnel"
  ON public.personnel FOR ALL
  USING (
    public.has_role(auth.uid(), 'chef_camp')
    AND location_id = public.get_user_location(auth.uid())
  );

-- Politiques RLS pour allocations
CREATE POLICY "Les admins centraux peuvent gérer allocations"
  ON public.allocations FOR ALL
  USING (public.has_role(auth.uid(), 'admin_central'));

CREATE POLICY "Les chefs de camp peuvent voir les allocations de leur camp"
  ON public.allocations FOR SELECT
  USING (
    public.has_role(auth.uid(), 'chef_camp')
    AND EXISTS (
      SELECT 1 FROM public.personnel
      WHERE personnel.id = allocations.personnel_id
      AND personnel.location_id = public.get_user_location(auth.uid())
    )
  );

CREATE POLICY "Les chefs de camp peuvent créer des allocations"
  ON public.allocations FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'chef_camp')
    AND EXISTS (
      SELECT 1 FROM public.personnel
      WHERE personnel.id = allocations.personnel_id
      AND personnel.location_id = public.get_user_location(auth.uid())
    )
  );

-- Politiques RLS pour requests
CREATE POLICY "Les admins centraux peuvent gérer requests"
  ON public.requests FOR ALL
  USING (public.has_role(auth.uid(), 'admin_central'));

CREATE POLICY "Les chefs de camp peuvent voir leurs demandes"
  ON public.requests FOR SELECT
  USING (
    public.has_role(auth.uid(), 'chef_camp')
    AND location_id = public.get_user_location(auth.uid())
  );

CREATE POLICY "Les chefs de camp peuvent créer des demandes"
  ON public.requests FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'chef_camp')
    AND location_id = public.get_user_location(auth.uid())
  );

-- Index pour améliorer les performances
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_location_id ON public.user_roles(location_id);
CREATE INDEX idx_item_variants_location_id ON public.item_variants(location_id);
CREATE INDEX idx_item_variants_stock_item_id ON public.item_variants(stock_item_id);
CREATE INDEX idx_personnel_location_id ON public.personnel(location_id);
CREATE INDEX idx_allocations_personnel_id ON public.allocations(personnel_id);
CREATE INDEX idx_allocations_item_variant_id ON public.allocations(item_variant_id);
CREATE INDEX idx_requests_location_id ON public.requests(location_id);