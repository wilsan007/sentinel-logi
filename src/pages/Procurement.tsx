import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import { ProcurementManager } from "@/components/procurement/ProcurementManager";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Location {
  id: string;
  nom: string;
  code: string;
}

export default function Procurement() {
  const [user, setUser] = useState<any>(null);
  const [locationId, setLocationId] = useState<string>("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
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
      
      const userIsAdmin = roleData?.role === "admin_central";
      setIsAdmin(userIsAdmin);
      
      // Only admin_central can access Procurement
      if (!userIsAdmin) {
        navigate("/");
        return;
      }
      
      // Load all locations for admin - Stock Central is the only one that can procure
      const { data: locationsData } = await supabase
        .from("locations")
        .select("id, nom, code")
        .order("nom");
      
      if (locationsData && locationsData.length > 0) {
        setLocations(locationsData);
        // Always default to Stock Central for procurement
        const stockCentral = locationsData.find(l => l.code === "STOCK_CENTRAL");
        if (stockCentral) {
          setLocationId(stockCentral.id);
        } else {
          // If no Stock Central, use first location
          setLocationId(locationsData[0].id);
        }
      }
    };
    loadUserData();
  }, [navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-background">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[150px] animate-glow-pulse"></div>
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[120px] animate-glow-pulse" style={{ animationDelay: "1.5s" }}></div>
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
                  <ShoppingCart className="h-8 w-8 text-emerald-500" />
                  <div>
                    <h1 className="text-2xl font-bold text-emerald-500">Module Procurement</h1>
                    <p className="text-xs text-muted-foreground">Gestion des commandes fournisseurs</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {isAdmin && locations.length > 0 && (
                  <Select value={locationId} onValueChange={setLocationId}>
                    <SelectTrigger className="w-[220px] glass border-emerald-500/30">
                      <SelectValue placeholder="Sélectionner un camp" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.nom} ({loc.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <span className="text-sm text-muted-foreground">{user?.email}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {locationId ? (
            <ProcurementManager locationId={locationId} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-emerald-500/30" />
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
