import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Users, ArrowLeft } from "lucide-react";
import { PersonnelManager } from "@/components/personnel/PersonnelManager";

export default function Personnel() {
  const [user, setUser] = useState<any>(null);
  const [locationId, setLocationId] = useState<string | undefined>();
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("location_id, role")
          .eq("user_id", session.user.id)
          .maybeSingle();
        // Admin central can see all, chef_camp sees only their location
        if (roleData?.role === "chef_camp" && roleData?.location_id) {
          setLocationId(roleData.location_id);
        }
      }
    };
    loadUserData();
  }, [navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-background">
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[150px] animate-glow-pulse"></div>
        <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] animate-glow-pulse" style={{ animationDelay: "1.5s" }}></div>
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
                  <Users className="h-8 w-8 text-accent" />
                  <div>
                    <h1 className="text-2xl font-bold text-accent">Module Personnel</h1>
                    <p className="text-xs text-muted-foreground">Gestion des effectifs</p>
                  </div>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">{user?.email}</span>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <PersonnelManager locationId={locationId} />
        </main>
      </div>
    </div>
  );
}
