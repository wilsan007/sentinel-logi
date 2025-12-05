-- Table pour les demandes d'accès exceptionnel
CREATE TABLE public.exceptional_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_response TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exceptional_access_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Chefs de camp peuvent créer des demandes d'accès"
ON public.exceptional_access_requests
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'chef_camp') 
  AND location_id = get_user_location(auth.uid())
  AND requested_by = auth.uid()
);

CREATE POLICY "Chefs de camp peuvent voir leurs demandes"
ON public.exceptional_access_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'chef_camp') 
  AND location_id = get_user_location(auth.uid())
);

CREATE POLICY "Admins centraux peuvent tout voir"
ON public.exceptional_access_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin_central'));

CREATE POLICY "Admins centraux peuvent modifier"
ON public.exceptional_access_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin_central'));

-- Index pour les demandes en attente
CREATE INDEX idx_exceptional_access_requests_pending 
ON public.exceptional_access_requests(status) 
WHERE status = 'pending';