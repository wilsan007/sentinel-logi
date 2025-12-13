import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Loader2, Car, ArrowLeft, Wrench, Fuel, AlertTriangle, FileText, Settings, ClipboardCheck, Package, CalendarDays, LayoutDashboard, ShoppingCart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FleetVehiclesList } from "@/components/fleet/FleetVehiclesList";
import { FleetMaintenanceManager } from "@/components/fleet/FleetMaintenanceManager";
import { FleetRepairsManager } from "@/components/fleet/FleetRepairsManager";
import { FleetFuelManager } from "@/components/fleet/FleetFuelManager";
import { FleetIncidentsManager } from "@/components/fleet/FleetIncidentsManager";
import { FleetDocumentsManager } from "@/components/fleet/FleetDocumentsManager";
import { GarageIntakesList } from "@/components/fleet/GarageIntakesList";
import { SparePartsManager } from "@/components/fleet/SparePartsManager";
import { SparePartsRequestsList } from "@/components/fleet/SparePartsRequestsList";
import { MaintenanceScheduler } from "@/components/fleet/MaintenanceScheduler";
import { FleetDashboard } from "@/components/fleet/FleetDashboard";

export default function Fleet() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
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
        <div className="absolute top-1/4 left-1/4 w-64 md:w-96 h-64 md:h-96 bg-amber-500/20 rounded-full blur-[120px] animate-glow-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 md:w-96 h-64 md:h-96 bg-orange-500/20 rounded-full blur-[120px] animate-glow-pulse" style={{ animationDelay: "1s" }}></div>
      </div>

      {/* Contenu */}
      <div className="relative z-10">
        {/* Header */}
        <header className="glass border-b border-border/50 sticky top-0 backdrop-blur-xl z-20">
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/")}
                  className="gap-1 sm:gap-2 shrink-0 px-2 sm:px-3"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Retour</span>
                </Button>
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <Car className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <h1 className="text-lg sm:text-2xl font-bold text-amber-500 truncate">
                      Parc Automobile
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                      Gestion de la flotte de véhicules
                    </p>
                  </div>
                </div>
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground hidden md:block truncate">
                {user?.email}
              </span>
            </div>
          </div>
        </header>

        {/* Contenu principal */}
        <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            {/* TabsList scrollable horizontalement sur mobile */}
            <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
              <TabsList className="glass inline-flex w-max min-w-full sm:grid sm:grid-cols-11 sm:w-full max-w-7xl mx-auto gap-1">
                <TabsTrigger value="dashboard" className="gap-1 px-2 sm:px-3 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-500 whitespace-nowrap">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden md:inline text-xs lg:text-sm">Dashboard</span>
                </TabsTrigger>
                <TabsTrigger value="intake" className="gap-1 px-2 sm:px-3 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-500 whitespace-nowrap">
                  <ClipboardCheck className="h-4 w-4" />
                  <span className="hidden md:inline text-xs lg:text-sm">Réception</span>
                </TabsTrigger>
                <TabsTrigger value="vehicles" className="gap-1 px-2 sm:px-3 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-500 whitespace-nowrap">
                  <Car className="h-4 w-4" />
                  <span className="hidden md:inline text-xs lg:text-sm">Véhicules</span>
                </TabsTrigger>
                <TabsTrigger value="planning" className="gap-1 px-2 sm:px-3 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-500 whitespace-nowrap">
                  <CalendarDays className="h-4 w-4" />
                  <span className="hidden md:inline text-xs lg:text-sm">Planning</span>
                </TabsTrigger>
                <TabsTrigger value="maintenance" className="gap-1 px-2 sm:px-3 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-500 whitespace-nowrap">
                  <Settings className="h-4 w-4" />
                  <span className="hidden md:inline text-xs lg:text-sm">Entretiens</span>
                </TabsTrigger>
                <TabsTrigger value="repairs" className="gap-1 px-2 sm:px-3 data-[state=active]:bg-red-500/20 data-[state=active]:text-red-500 whitespace-nowrap">
                  <Wrench className="h-4 w-4" />
                  <span className="hidden md:inline text-xs lg:text-sm">Réparations</span>
                </TabsTrigger>
                <TabsTrigger value="parts" className="gap-1 px-2 sm:px-3 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-500 whitespace-nowrap">
                  <Package className="h-4 w-4" />
                  <span className="hidden md:inline text-xs lg:text-sm">Pièces</span>
                </TabsTrigger>
                <TabsTrigger value="parts-requests" className="gap-1 px-2 sm:px-3 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-500 whitespace-nowrap">
                  <ShoppingCart className="h-4 w-4" />
                  <span className="hidden md:inline text-xs lg:text-sm">Demandes</span>
                </TabsTrigger>
                <TabsTrigger value="fuel" className="gap-1 px-2 sm:px-3 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-500 whitespace-nowrap">
                  <Fuel className="h-4 w-4" />
                  <span className="hidden md:inline text-xs lg:text-sm">Carburant</span>
                </TabsTrigger>
                <TabsTrigger value="incidents" className="gap-1 px-2 sm:px-3 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-500 whitespace-nowrap">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="hidden md:inline text-xs lg:text-sm">Sinistres</span>
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-1 px-2 sm:px-3 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-500 whitespace-nowrap">
                  <FileText className="h-4 w-4" />
                  <span className="hidden md:inline text-xs lg:text-sm">Documents</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="dashboard">
              <FleetDashboard />
            </TabsContent>

            <TabsContent value="intake">
              <GarageIntakesList />
            </TabsContent>

            <TabsContent value="vehicles">
              <FleetVehiclesList />
            </TabsContent>

            <TabsContent value="planning">
              <MaintenanceScheduler />
            </TabsContent>

            <TabsContent value="maintenance">
              <FleetMaintenanceManager />
            </TabsContent>

            <TabsContent value="repairs">
              <FleetRepairsManager />
            </TabsContent>

            <TabsContent value="parts">
              <SparePartsManager />
            </TabsContent>

            <TabsContent value="parts-requests">
              <SparePartsRequestsList />
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
