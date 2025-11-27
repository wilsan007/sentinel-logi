-- Ajouter les colonnes de tailles au personnel
ALTER TABLE public.personnel
ADD COLUMN taille_chemise TEXT,
ADD COLUMN taille_pantalon TEXT,
ADD COLUMN pointure_chaussures TEXT,
ADD COLUMN taille_casquette TEXT,
ADD COLUMN taille_chapeau TEXT,
ADD COLUMN taille_beret TEXT,
ADD COLUMN taille_chaussettes TEXT,
ADD COLUMN notes_tailles TEXT;

COMMENT ON COLUMN public.personnel.taille_chemise IS 'Taille de chemise (S, M, L, XL, XXL, etc.)';
COMMENT ON COLUMN public.personnel.taille_pantalon IS 'Taille de pantalon (38, 40, 42, etc.)';
COMMENT ON COLUMN public.personnel.pointure_chaussures IS 'Pointure de chaussures (39, 40, 41, etc.)';
COMMENT ON COLUMN public.personnel.taille_casquette IS 'Taille de casquette';
COMMENT ON COLUMN public.personnel.taille_chapeau IS 'Taille de chapeau';
COMMENT ON COLUMN public.personnel.taille_beret IS 'Taille de béret';
COMMENT ON COLUMN public.personnel.taille_chaussettes IS 'Taille de chaussettes';
COMMENT ON COLUMN public.personnel.notes_tailles IS 'Notes additionnelles sur les tailles';