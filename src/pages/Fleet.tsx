import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Loader2, Car, ArrowLeft, Wrench, Fuel, AlertTriangle, FileText, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FleetVehiclesList } from "@/components/fleet/FleetVehiclesList";
import { FleetMaintenanceManager } from "@/components/fleet/FleetMaintenanceManager";
import { FleetRepairsManager } from "@/components/fleet/FleetRepairsManager";
import { FleetFuelManager } from "@/components/fleet/FleetFuelManager";
import { FleetIncidentsManager } from "@/components/fleet/FleetIncidentsManager";
import { FleetDocumentsManager } from "@/components/fleet/FleetDocumentsManager";

export default function Fleet() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("vehicles");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUser(session.user);
      
      // Vérifier le rôle admin_central
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();
      
      if (roleData?.role !== "admin_central") {
        // Rediriger si pas admin
        navigate("/");
        return;
      }
      
      setIsAdmin(true);
      setLoading(false);
    });
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fond animé */}
      <div className="absolute inset-0 bg-background">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/20 rounded-full blur-[120px] animate-glow-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-[120px] animate-glow-pulse" style={{ animationDelay: "1s" }}></div>
      </div>

      {/* Contenu */}
      <div className="relative z-10">
        {/* Header */}
        <header className="glass border-b border-border/50 sticky top-0 backdrop-blur-xl z-20">
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
                  <Car className="h-8 w-8 text-amber-500" />
                  <div>
                    <h1 className="text-2xl font-bold text-amber-500">
                      Parc Automobile
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Gestion de la flotte de véhicules
                    </p>
                  </div>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">
                {user?.email}
              </span>
            </div>
          </div>
        </header>

        {/* Contenu principal */}
        <main className="container mx-auto px-4 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="glass grid grid-cols-6 w-full max-w-4xl mx-auto">
              <TabsTrigger value="vehicles" className="gap-2 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-500">
                <Car className="h-4 w-4" />
                <span className="hidden md:inline">Véhicules</span>
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="gap-2 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-500">
                <Settings className="h-4 w-4" />
                <span className="hidden md:inline">Entretiens</span>
              </TabsTrigger>
              <TabsTrigger value="repairs" className="gap-2 data-[state=active]:bg-red-500/20 data-[state=active]:text-red-500">
                <Wrench className="h-4 w-4" />
                <span className="hidden md:inline">Réparations</span>
              </TabsTrigger>
              <TabsTrigger value="fuel" className="gap-2 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-500">
                <Fuel className="h-4 w-4" />
                <span className="hidden md:inline">Carburant</span>
              </TabsTrigger>
              <TabsTrigger value="incidents" className="gap-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-500">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden md:inline">Sinistres</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-500">
                <FileText className="h-4 w-4" />
                <span className="hidden md:inline">Documents</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="vehicles">
              <FleetVehiclesList />
            </TabsContent>

            <TabsContent value="maintenance">
              <FleetMaintenanceManager />
            </TabsContent>

            <TabsContent value="repairs">
              <FleetRepairsManager />
            </TabsContent>

            <TabsContent value="fuel">
              <FleetFuelManager />
            </TabsContent>

            <TabsContent value="incidents">
              <FleetIncidentsManager />
            </TabsContent>

            <TabsContent value="documents">
              <FleetDocumentsManager />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
