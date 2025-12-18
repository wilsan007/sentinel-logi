-- Fix: Restrict profile visibility to prevent email harvesting
-- Users can only see their own profile, admins can see all profiles

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Les profils sont visibles par tous les authentifiés" ON public.profiles;

-- Create new restricted SELECT policy
-- Users can see their own profile, admin_central can see all profiles
CREATE POLICY "Les utilisateurs peuvent voir leur propre profil" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id 
  OR has_role(auth.uid(), 'admin_central'::app_role)
);