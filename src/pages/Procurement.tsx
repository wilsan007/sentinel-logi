import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowLeft, Plus, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProcurementOrdersList } from "@/components/procurement/ProcurementOrdersList";
import { CreateOrderDialog } from "@/components/procurement/CreateOrderDialog";
import { SmartPurchaseWizard } from "@/components/procurement/SmartPurchaseWizard";

export default function Procurement() {
  const [user, setUser] = useState<any>(null);
  const [locationId, setLocationId] = useState<string>("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [smartWizardOpen, setSmartWizardOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("location_id")
          .eq("user_id", session.user.id)
          .single();
        
        if (roleData?.location_id) {
          setLocationId(roleData.location_id);
        }
      }
    };
    
    loadUserData();
  }, [navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fond animé avec accents verts */}
      <div className="absolute inset-0 bg-background">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[150px] animate-glow-pulse"></div>
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[120px] animate-glow-pulse" style={{ animationDelay: "1.5s" }}></div>
      </div>

      {/* Contenu */}
      <div className="relative z-10">
        {/* Header */}
        <header className="glass border-b border-border/50 sticky top-0 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/")}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </Button>
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-8 w-8 text-emerald-500" />
                  <div>
                    <h1 className="text-2xl font-bold text-emerald-500">
                      Module Procurement
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      Gestion des commandes fournisseurs
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => setSmartWizardOpen(true)}
                  className="gap-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-500 border border-emerald-500/30"
                  disabled={!locationId}
                >
                  <Wand2 className="h-4 w-4" />
                  Smart Purchase
                </Button>
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  variant="outline"
                  className="gap-2 glass border-border/50"
                  disabled={!locationId}
                >
                  <Plus className="h-4 w-4" />
                  Commande Manuelle
                </Button>
                <span className="text-sm text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Contenu principal */}
        <main className="container mx-auto px-4 py-8">
          <ProcurementOrdersList 
            locationId={locationId} 
            refreshKey={refreshKey}
            onRefresh={() => setRefreshKey(prev => prev + 1)}
          />
        </main>
      </div>

      <CreateOrderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        locationId={locationId}
        onSuccess={() => {
          toast({
            title: "Commande créée",
            description: "La commande a été enregistrée avec succès.",
          });
          setRefreshKey(prev => prev + 1);
        }}
      />

      <SmartPurchaseWizard
        open={smartWizardOpen}
        onOpenChange={setSmartWizardOpen}
        locationId={locationId}
        onSuccess={() => {
          setRefreshKey(prev => prev + 1);
        }}
      />
    </div>
  );
}
