-- Ajouter le type d'activité pour les articles d'habillement
ALTER TABLE public.stock_items 
ADD COLUMN type_activite text;

-- Mettre à jour les articles existants avec leur type d'activité
UPDATE public.stock_items SET type_activite = 'CEREMONIE' WHERE type ILIKE '%Cérémonie%' OR type ILIKE '%ceremonie%';
UPDATE public.stock_items SET type_activite = 'TRAVAIL' WHERE type ILIKE '%Travail%' OR type ILIKE '%travail%';
UPDATE public.stock_items SET type_activite = 'SPORT' WHERE type ILIKE '%Sport%' OR type ILIKE '%sport%';
UPDATE public.stock_items SET type_activite = 'INTERVENTION' WHERE type ILIKE '%Intervention%' OR type ILIKE '%intervention%';
UPDATE public.stock_items SET type_activite = 'UNIVERSEL' WHERE type_activite IS NULL AND categorie = 'GEAR';

-- Ajouter un commentaire pour la colonne
COMMENT ON COLUMN public.stock_items.type_activite IS 'Type d activité: CEREMONIE, TRAVAIL, SPORT, INTERVENTION, UNIVERSEL';