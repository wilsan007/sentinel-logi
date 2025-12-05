import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, ArrowLeft, Building2 } from "lucide-react";
import { ProcurementManager } from "@/components/procurement/ProcurementManager";

export default function Procurement() {
  const [user, setUser] = useState<any>(null);
  const [stockCentralId, setStockCentralId] = useState<string>("");
  const [stockCentralName, setStockCentralName] = useState<string>("Stock Central");
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
      
      const userIsAdmin = roleData?.role === "admin_central";
      
      // Only admin_central can access Procurement - redirect others to Demandes
      if (!userIsAdmin) {
        navigate("/demandes");
        return;
      }
      
      // Find Stock Central - the only location for procurement
      const { data: stockCentral } = await supabase
        .from("locations")
        .select("id, nom, code")
        .eq("code", "STOCK_CENTRAL")
        .single();
      
      if (stockCentral) {
        setStockCentralId(stockCentral.id);
        setStockCentralName(stockCentral.nom);
      } else {
        // Fallback: use first location if Stock Central doesn't exist
        const { data: firstLocation } = await supabase
          .from("locations")
          .select("id, nom")
          .limit(1)
          .single();
        
        if (firstLocation) {
          setStockCentralId(firstLocation.id);
          setStockCentralName(firstLocation.nom);
        }
      }
      
      setLoading(false);
    };
    loadUserData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

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
                {/* Fixed location indicator - Stock Central only */}
                <Badge variant="outline" className="px-4 py-2 border-emerald-500/30 gap-2">
                  <Building2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-emerald-500 font-medium">{stockCentralName}</span>
                </Badge>
                <span className="text-sm text-muted-foreground">{user?.email}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {stockCentralId ? (
            <ProcurementManager locationId={stockCentralId} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-emerald-500/30" />
                <p className="text-muted-foreground">Stock Central non trouvé</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
