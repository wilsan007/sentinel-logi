-- Table des jours fériés de Djibouti
CREATE TABLE public.djibouti_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.djibouti_holidays ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les jours fériés
CREATE POLICY "Jours fériés visibles par tous les authentifiés" 
ON public.djibouti_holidays 
FOR SELECT 
USING (true);

-- Seuls les admins peuvent gérer les jours fériés
CREATE POLICY "Admins centraux peuvent gérer djibouti_holidays" 
ON public.djibouti_holidays 
FOR ALL 
USING (has_role(auth.uid(), 'admin_central'::app_role));

-- Insérer les jours fériés de Djibouti pour 2025
INSERT INTO public.djibouti_holidays (date, name, description) VALUES
('2025-01-01', 'Jour de l''An', 'Nouvel An'),
('2025-03-30', 'Aïd al-Fitr', 'Fin du Ramadan - jour 1'),
('2025-03-31', 'Aïd al-Fitr', 'Fin du Ramadan - jour 2'),
('2025-05-01', 'Fête du Travail', 'Journée internationale des travailleurs'),
('2025-06-06', 'Aïd al-Adha', 'Fête du Sacrifice - jour 1'),
('2025-06-07', 'Aïd al-Adha', 'Fête du Sacrifice - jour 2'),
('2025-06-27', 'Fête de l''Indépendance', 'Indépendance de Djibouti'),
('2025-06-28', 'Lendemain Indépendance', 'Jour férié supplémentaire'),
('2025-07-06', 'Nouvel An Islamique', 'Premier jour de Muharram'),
('2025-09-15', 'Mawlid', 'Anniversaire du Prophète'),
('2025-12-25', 'Noël', 'Jour de Noël');