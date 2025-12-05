-- Create table for procurement stage history
CREATE TABLE public.procurement_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.procurement_orders(id) ON DELETE CASCADE,
  previous_stage public.procurement_stage,
  new_stage public.procurement_stage NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text
);

-- Enable RLS
ALTER TABLE public.procurement_stage_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins centraux peuvent voir historique" 
ON public.procurement_stage_history 
FOR SELECT 
USING (has_role(auth.uid(), 'admin_central'::app_role));

CREATE POLICY "Chefs de camp peuvent voir historique de leurs commandes" 
ON public.procurement_stage_history 
FOR SELECT 
USING (
  has_role(auth.uid(), 'chef_camp'::app_role) 
  AND EXISTS (
    SELECT 1 FROM procurement_orders po 
    WHERE po.id = procurement_stage_history.order_id 
    AND po.location_id = get_user_location(auth.uid())
  )
);

CREATE POLICY "Admins peuvent créer historique" 
ON public.procurement_stage_history 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin_central'::app_role));

CREATE POLICY "Chefs de camp peuvent créer historique pour leurs commandes" 
ON public.procurement_stage_history 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'chef_camp'::app_role) 
  AND EXISTS (
    SELECT 1 FROM procurement_orders po 
    WHERE po.id = procurement_stage_history.order_id 
    AND po.location_id = get_user_location(auth.uid())
  )
);

-- Create trigger function to automatically record stage changes
CREATE OR REPLACE FUNCTION public.record_procurement_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only record if stage actually changed
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.procurement_stage_history (
      order_id,
      previous_stage,
      new_stage,
      changed_by,
      changed_at
    ) VALUES (
      NEW.id,
      OLD.stage,
      NEW.stage,
      auth.uid(),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on procurement_orders
CREATE TRIGGER on_procurement_stage_change
  AFTER UPDATE OF stage ON public.procurement_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.record_procurement_stage_change();

-- Create index for faster queries
CREATE INDEX idx_stage_history_order_id ON public.procurement_stage_history(order_id);
CREATE INDEX idx_stage_history_changed_at ON public.procurement_stage_history(changed_at DESC);