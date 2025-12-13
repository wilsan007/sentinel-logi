-- Ajouter colonne pour tracer les pièces récupérées/recyclées
ALTER TABLE public.spare_parts
ADD COLUMN IF NOT EXISTS is_recycled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recovered_from_vehicle_id uuid REFERENCES vehicles(id),
ADD COLUMN IF NOT EXISTS recovered_date date,
ADD COLUMN IF NOT EXISTS original_part_id uuid REFERENCES spare_parts(id),
ADD COLUMN IF NOT EXISTS condition_note text;

-- Créer index pour les pièces recyclées
CREATE INDEX IF NOT EXISTS idx_spare_parts_recycled ON spare_parts(is_recycled) WHERE is_recycled = true;
CREATE INDEX IF NOT EXISTS idx_spare_parts_recovered_vehicle ON spare_parts(recovered_from_vehicle_id) WHERE recovered_from_vehicle_id IS NOT NULL;