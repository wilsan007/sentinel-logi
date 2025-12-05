import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ClipboardList, ArrowLeft } from "lucide-react";
import { DemandesManager } from "@/components/demandes/DemandesManager";

export default function Demandes() {
  const [user, setUser] = useState<any>(null);
  const [locationId, setLocationId] = useState<string>("");
  const [locationName, setLocationName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUser(session.user);
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("location_id, role")
        .eq("user_id", session.user.id)
        .maybeSingle();
      
      // Only chef_camp can access this module
      if (roleData?.role === "admin_central") {
        // Redirect admin to procurement
        navigate("/procurement");
        return;
      }
      
      if (roleData?.location_id) {
        setLocationId(roleData.location_id);
        
        // Get location name
        const { data: locationData } = await supabase
          .from("locations")
          .select("nom")
          .eq("id", roleData.location_id)
          .single();
        
        if (locationData) {
          setLocationName(locationData.nom);
        }
      }
      
      setLoading(false);
    };
    loadUserData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-background">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[150px] animate-glow-pulse"></div>
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] animate-glow-pulse" style={{ animationDelay: "1.5s" }}></div>
      </div>

      <div className="relative z-10">
        <header className="glass border-b border-border/50 sticky top-0 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </Button>
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-8 w-8 text-purple-500" />
                  <div>
                    <h1 className="text-2xl font-bold text-purple-500">Demandes au Stock Central</h1>
                    <p className="text-xs text-muted-foreground">Exprimez vos besoins en équipement et provisions</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 rounded-lg glass border border-purple-500/30">
                  <span className="text-sm text-muted-foreground">Camp: </span>
                  <span className="text-sm font-medium text-purple-500">{locationName}</span>
                </div>
                <span className="text-sm text-muted-foreground">{user?.email}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {locationId ? (
            <DemandesManager locationId={locationId} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <ClipboardList className="h-16 w-16 mx-auto mb-4 text-purple-500/30" />
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
