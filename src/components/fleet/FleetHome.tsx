import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Car,
  Wrench,
  Fuel,
  AlertTriangle,
  Package,
  CalendarDays,
  ClipboardCheck,
  ShoppingCart,
  Settings,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  LayoutDashboard,
  Plus,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { GarageIntakeWizard } from "./GarageIntakeWizard";

interface FleetHomeProps {
  onNavigate: (tab: string) => void;
}

const SERVICE_LABELS: Record<string, string> = {
  MAINTENANCE: "Entretiens",
  REPARATION_LEGERE: "Réparation légère",
  REPARATION_LOURDE: "Réparation lourde",
  CARBURANT: "Carburant",
  INCIDENT: "Incident",
  EXPERTISE: "Expertise",
};

export function FleetHome({ onNavigate }: FleetHomeProps) {
  const [showIntakeWizard, setShowIntakeWizard] = useState(false);

  // Statistiques véhicules
  const { data: vehicleStats } = useQuery({
    queryKey: ["fleet-vehicle-stats-home"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("status");
      if (error) throw error;
      
      const total = data.length;
      const operationnels = data.filter(v => v.status === "OPERATIONNEL").length;
      const enMaintenance = data.filter(v => v.status === "EN_MAINTENANCE").length;
      const enReparation = data.filter(v => v.status === "EN_REPARATION").length;
      const horsService = data.filter(v => v.status === "HORS_SERVICE").length;
      
      return { total, operationnels, enMaintenance, enReparation, horsService };
    },
  });

  // Véhicules en attente par service (réception)
  const { data: pendingByService } = useQuery({
    queryKey: ["fleet-pending-by-service"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_garage_intakes")
        .select(`
          id,
          service_oriente,
          statut,
          vehicle:vehicles(immatriculation, marque, modele)
        `)
        .in("statut", ["EN_COURS", "EN_ATTENTE"]);
      
      if (error) throw error;
      
      const byService: Record<string, any[]> = {
        MAINTENANCE: [],
        REPARATION_LEGERE: [],
        REPARATION_LOURDE: [],
      };
      
      data.forEach(intake => {
        const service = intake.service_oriente || "MAINTENANCE";
        if (byService[service]) {
          byService[service].push(intake);
        } else if (service === "REPARATION_LEGERE" || service === "REPARATION_LOURDE") {
          if (!byService[service]) byService[service] = [];
          byService[service].push(intake);
        }
      });
      
      return { byService, total: data.length };
    },
  });

  // Pièces en alerte stock
  const { data: partsStats } = useQuery({
    queryKey: ["fleet-parts-alert-home"],
    queryFn: async () => {
      const { data, error } = await supabase.from("spare_parts").select("quantite, seuil_alerte");
      if (error) throw error;
      
      const lowStock = data.filter(p => p.quantite <= (p.seuil_alerte || 5)).length;
      const totalParts = data.length;
      
      return { lowStock, totalParts };
    },
  });

  // Demandes de pièces en attente
  const { data: partsRequests } = useQuery({
    queryKey: ["fleet-parts-requests-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spare_parts_requests")
        .select("id")
        .eq("statut", "EN_ATTENTE");
      if (error) throw error;
      return { pending: data.length };
    },
  });

  // Carburant ce mois
  const { data: fuelStats } = useQuery({
    queryKey: ["fleet-fuel-stats-home"],
    queryFn: async () => {
      const startDate = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const endDate = format(endOfMonth(new Date()), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("vehicle_fuel_logs")
        .select("cout_total")
        .gte("date_plein", startDate)
        .lte("date_plein", endDate);
      if (error) throw error;
      
      const totalCost = data.reduce((sum, f) => sum + Number(f.cout_total), 0);
      return { totalCost, fillCount: data.length };
    },
  });

  // Incidents ouverts
  const { data: incidentStats } = useQuery({
    queryKey: ["fleet-incident-stats-home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_incidents")
        .select("id")
        .neq("status", "CLOTURE");
      if (error) throw error;
      return { openIncidents: data.length };
    },
  });

  // Planning - entretiens planifiés
  const { data: planningStats } = useQuery({
    queryKey: ["fleet-planning-stats"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const next30Days = format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("maintenance_schedules")
        .select("id")
        .gte("date_prevue", today)
        .lte("date_prevue", next30Days)
        .eq("statut", "PLANIFIE");
      if (error) throw error;
      
      return { upcoming: data.length };
    },
  });

  return (
    <div className="space-y-6">
      {/* En-tête stats rapides */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="glass border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Car className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Flotte</p>
                <p className="text-xl font-bold">{vehicleStats?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Opérationnels</p>
                <p className="text-xl font-bold text-green-500">{vehicleStats?.operationnels || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Au garage</p>
                <p className="text-xl font-bold text-orange-500">{pendingByService?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hors service</p>
                <p className="text-xl font-bold text-red-500">{vehicleStats?.horsService || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cartes principales de navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Dashboard */}
        <Card 
          className="glass border-amber-500/30 hover:border-amber-500/60 cursor-pointer transition-all hover:scale-[1.02]"
          onClick={() => onNavigate("dashboard")}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <LayoutDashboard className="h-5 w-5 text-amber-500" />
                </div>
                <CardTitle className="text-lg">Dashboard</CardTitle>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>Statistiques détaillées et alertes</CardDescription>
          </CardContent>
        </Card>

        {/* Réception - Carte principale avec sous-cartes */}
        <Card className="glass border-amber-500/30 col-span-1 md:col-span-2 lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <ClipboardCheck className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Réception</CardTitle>
                  <CardDescription>Véhicules en attente par service</CardDescription>
                </div>
              </div>
              <Button 
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white gap-1"
                onClick={() => setShowIntakeWizard(true)}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nouvelle Réception</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Sous-cartes services */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Entretiens */}
              <Card 
                className="bg-blue-500/10 border-blue-500/30 hover:border-blue-500/60 cursor-pointer transition-all"
                onClick={() => onNavigate("maintenance")}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-sm">Entretiens</span>
                    </div>
                    <Badge className="bg-blue-500">
                      {pendingByService?.byService?.MAINTENANCE?.length || 0}
                    </Badge>
                  </div>
                  {pendingByService?.byService?.MAINTENANCE?.slice(0, 2).map((intake: any) => (
                    <div key={intake.id} className="text-xs text-muted-foreground truncate">
                      {intake.vehicle?.immatriculation} - {intake.vehicle?.marque}
                    </div>
                  ))}
                  {(pendingByService?.byService?.MAINTENANCE?.length || 0) > 2 && (
                    <div className="text-xs text-blue-500 mt-1">
                      +{(pendingByService?.byService?.MAINTENANCE?.length || 0) - 2} autres
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Réparations */}
              <Card 
                className="bg-orange-500/10 border-orange-500/30 hover:border-orange-500/60 cursor-pointer transition-all"
                onClick={() => onNavigate("repairs")}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-orange-500" />
                      <span className="font-medium text-sm">Réparations</span>
                    </div>
                    <Badge className="bg-orange-500">
                      {(pendingByService?.byService?.REPARATION_LEGERE?.length || 0) + 
                       (pendingByService?.byService?.REPARATION_LOURDE?.length || 0)}
                    </Badge>
                  </div>
                  {[...(pendingByService?.byService?.REPARATION_LEGERE || []), 
                    ...(pendingByService?.byService?.REPARATION_LOURDE || [])].slice(0, 2).map((intake: any) => (
                    <div key={intake.id} className="text-xs text-muted-foreground truncate">
                      {intake.vehicle?.immatriculation} - {intake.vehicle?.marque}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Pièces */}
              <Card 
                className="bg-purple-500/10 border-purple-500/30 hover:border-purple-500/60 cursor-pointer transition-all"
                onClick={() => onNavigate("parts")}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-purple-500" />
                      <span className="font-medium text-sm">Pièces</span>
                    </div>
                    <Badge className={partsStats?.lowStock ? "bg-red-500" : "bg-purple-500"}>
                      {partsStats?.lowStock || 0} alerte
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {partsStats?.totalParts || 0} références en stock
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button 
              variant="outline" 
              className="w-full gap-2 border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
              onClick={() => onNavigate("intake")}
            >
              <ClipboardCheck className="h-4 w-4" />
              Voir toutes les réceptions
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          </CardContent>
        </Card>

        {/* Planning */}
        <Card 
          className="glass border-blue-500/30 hover:border-blue-500/60 cursor-pointer transition-all hover:scale-[1.02]"
          onClick={() => onNavigate("planning")}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <CalendarDays className="h-5 w-5 text-blue-500" />
                </div>
                <CardTitle className="text-lg">Planning</CardTitle>
              </div>
              <Badge className="bg-blue-500">{planningStats?.upcoming || 0}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>Entretiens planifiés (30 jours)</CardDescription>
          </CardContent>
        </Card>

        {/* Véhicules */}
        <Card 
          className="glass border-amber-500/30 hover:border-amber-500/60 cursor-pointer transition-all hover:scale-[1.02]"
          onClick={() => onNavigate("vehicles")}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Car className="h-5 w-5 text-amber-500" />
                </div>
                <CardTitle className="text-lg">Véhicules</CardTitle>
              </div>
              <Badge className="bg-amber-500">{vehicleStats?.total || 0}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>Gestion de la flotte</CardDescription>
          </CardContent>
        </Card>

        {/* Demandes de pièces */}
        <Card 
          className="glass border-orange-500/30 hover:border-orange-500/60 cursor-pointer transition-all hover:scale-[1.02]"
          onClick={() => onNavigate("parts-requests")}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <ShoppingCart className="h-5 w-5 text-orange-500" />
                </div>
                <CardTitle className="text-lg">Demandes</CardTitle>
              </div>
              {partsRequests?.pending ? (
                <Badge className="bg-orange-500">{partsRequests.pending}</Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>Demandes de pièces détachées</CardDescription>
          </CardContent>
        </Card>

        {/* Carburant */}
        <Card 
          className="glass border-green-500/30 hover:border-green-500/60 cursor-pointer transition-all hover:scale-[1.02]"
          onClick={() => onNavigate("fuel")}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Fuel className="h-5 w-5 text-green-500" />
                </div>
                <CardTitle className="text-lg">Carburant</CardTitle>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              {fuelStats?.totalCost?.toLocaleString() || 0} FDJ ce mois
            </CardDescription>
          </CardContent>
        </Card>

        {/* Sinistres */}
        <Card 
          className="glass border-red-500/30 hover:border-red-500/60 cursor-pointer transition-all hover:scale-[1.02]"
          onClick={() => onNavigate("incidents")}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <CardTitle className="text-lg">Sinistres</CardTitle>
              </div>
              {incidentStats?.openIncidents ? (
                <Badge className="bg-red-500">{incidentStats.openIncidents}</Badge>
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>Accidents et incidents</CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Wizard de nouvelle réception */}
      <GarageIntakeWizard 
        open={showIntakeWizard} 
        onOpenChange={setShowIntakeWizard} 
      />
    </div>
  );
}
