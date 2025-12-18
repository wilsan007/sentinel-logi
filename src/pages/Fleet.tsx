import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Loader2, Car, ArrowLeft, Home } from "lucide-react";
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
import { FleetHome } from "@/components/fleet/FleetHome";

const VIEW_TITLES: Record<string, string> = {
  home: "Accueil",
  dashboard: "Dashboard",
  intake: "Réception",
  vehicles: "Véhicules",
  planning: "Planning",
  maintenance: "Entretiens",
  repairs: "Réparations",
  parts: "Pièces détachées",
  "parts-requests": "Demandes de pièces",
  fuel: "Carburant",
  incidents: "Sinistres",
  documents: "Documents",
};

export default function Fleet() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("home");
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

  const handleNavigate = (view: string) => {
    setActiveView(view);
  };

  const handleBackToHome = () => {
    setActiveView("home");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderView = () => {
    switch (activeView) {
      case "home":
        return <FleetHome onNavigate={handleNavigate} />;
      case "dashboard":
        return <FleetDashboard />;
      case "intake":
        return <GarageIntakesList />;
      case "vehicles":
        return <FleetVehiclesList />;
      case "planning":
        return <MaintenanceScheduler />;
      case "maintenance":
        return <FleetMaintenanceManager />;
      case "repairs":
        return <FleetRepairsManager />;
      case "parts":
        return <SparePartsManager />;
      case "parts-requests":
        return <SparePartsRequestsList />;
      case "fuel":
        return <FleetFuelManager />;
      case "incidents":
        return <FleetIncidentsManager />;
      case "documents":
        return <FleetDocumentsManager />;
      default:
        return <FleetHome onNavigate={handleNavigate} />;
    }
  };

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
                {activeView === "home" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/")}
                    className="gap-1 sm:gap-2 shrink-0 px-2 sm:px-3"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Retour</span>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToHome}
                    className="gap-1 sm:gap-2 shrink-0 px-2 sm:px-3"
                  >
                    <Home className="h-4 w-4" />
                    <span className="hidden sm:inline">Accueil</span>
                  </Button>
                )}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <Car className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <h1 className="text-lg sm:text-2xl font-bold text-amber-500 truncate">
                      {activeView === "home" ? "Parc Automobile" : VIEW_TITLES[activeView] || "Parc Automobile"}
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                      {activeView === "home" ? "Gestion de la flotte de véhicules" : "Parc Automobile"}
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
          {renderView()}
        </main>
      </div>
    </div>
  );
}
