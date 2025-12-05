-- Table des accès exceptionnels pour les demandes hors fenêtre
CREATE TABLE public.exceptional_submission_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL,
  reason TEXT NOT NULL,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exceptional_submission_access ENABLE ROW LEVEL SECURITY;

-- Admins peuvent tout faire
CREATE POLICY "Admins centraux peuvent gérer exceptional_submission_access" 
ON public.exceptional_submission_access 
FOR ALL 
USING (has_role(auth.uid(), 'admin_central'::app_role));

-- Chefs de camp peuvent voir leurs accès exceptionnels
CREATE POLICY "Chefs de camp peuvent voir leurs accès exceptionnels" 
ON public.exceptional_submission_access 
FOR SELECT 
USING (
  has_role(auth.uid(), 'chef_camp'::app_role) 
  AND location_id = get_user_location(auth.uid())
);

-- Index pour performance
CREATE INDEX idx_exceptional_access_location ON public.exceptional_submission_access(location_id);
CREATE INDEX idx_exceptional_access_active ON public.exceptional_submission_access(is_active, valid_until);