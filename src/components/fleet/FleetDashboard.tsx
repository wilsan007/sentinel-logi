import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  Wrench,
  Fuel,
  AlertTriangle,
  Package,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format, differenceInDays, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

export function FleetDashboard() {
  // Statistiques véhicules
  const { data: vehicleStats } = useQuery({
    queryKey: ["fleet-vehicle-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("status, date_mise_en_service");
      if (error) throw error;
      
      const total = data.length;
      const operationnels = data.filter(v => v.status === "OPERATIONNEL").length;
      const enMaintenance = data.filter(v => v.status === "EN_MAINTENANCE").length;
      const enReparation = data.filter(v => v.status === "EN_REPARATION").length;
      const horsService = data.filter(v => v.status === "HORS_SERVICE").length;
      const enMission = data.filter(v => v.status === "EN_MISSION").length;
      
      return { total, operationnels, enMaintenance, enReparation, horsService, enMission };
    },
  });

  // Coûts carburant ce mois
  const { data: fuelStats } = useQuery({
    queryKey: ["fleet-fuel-stats-monthly"],
    queryFn: async () => {
      const startDate = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const endDate = format(endOfMonth(new Date()), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("vehicle_fuel_logs")
        .select("litres, cout_total")
        .gte("date_plein", startDate)
        .lte("date_plein", endDate);
      if (error) throw error;
      
      const totalLitres = data.reduce((sum, f) => sum + Number(f.litres), 0);
      const totalCost = data.reduce((sum, f) => sum + Number(f.cout_total), 0);
      const fillCount = data.length;
      
      return { totalLitres, totalCost, fillCount };
    },
  });

  // Réparations en cours
  const { data: repairStats } = useQuery({
    queryKey: ["fleet-repair-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_repairs")
        .select("statut, cout_total, date_debut")
        .eq("est_termine", false);
      if (error) throw error;
      
      const enCours = data.length;
      const coutEstime = data.reduce((sum, r) => sum + Number(r.cout_total || 0), 0);
      
      return { enCours, coutEstime };
    },
  });

  // Entretiens planifiés à venir
  const { data: maintenanceStats } = useQuery({
    queryKey: ["fleet-maintenance-upcoming"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const next30Days = format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("maintenance_schedules")
        .select("*, vehicle:vehicles(immatriculation)")
        .gte("date_prevue", today)
        .lte("date_prevue", next30Days)
        .eq("statut", "PLANIFIE")
        .order("date_prevue");
      if (error) throw error;
      
      return data;
    },
  });

  // Pièces en alerte stock
  const { data: partsStats } = useQuery({
    queryKey: ["fleet-parts-alert"],
    queryFn: async () => {
      const { data, error } = await supabase.from("spare_parts").select("quantite, seuil_alerte, is_recycled");
      if (error) throw error;
      
      const lowStock = data.filter(p => p.quantite <= (p.seuil_alerte || 5)).length;
      const totalParts = data.length;
      const recycledCount = data.filter(p => p.is_recycled).length;
      
      return { lowStock, totalParts, recycledCount };
    },
  });

  // Incidents ouverts
  const { data: incidentStats } = useQuery({
    queryKey: ["fleet-incident-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_incidents")
        .select("status")
        .neq("status", "CLOTURE");
      if (error) throw error;
      
      return { openIncidents: data.length };
    },
  });

  // Diagnostics en attente de validation
  const { data: diagnosticStats } = useQuery({
    queryKey: ["fleet-diagnostic-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_diagnostics")
        .select("validation_status")
        .eq("validation_status", "EN_ATTENTE_VALIDATION");
      if (error) throw error;
      
      return { pendingValidation: data.length };
    },
  });

  // Entrées garage en cours
  const { data: intakeStats } = useQuery({
    queryKey: ["fleet-intake-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_garage_intakes")
        .select("statut")
        .eq("statut", "EN_COURS");
      if (error) throw error;
      
      return { activeIntakes: data.length };
    },
  });

  return (
    <div className="space-y-6">
      {/* Stats principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass border-amber-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-amber-500/20">
                <Car className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Flotte totale</p>
                <p className="text-2xl font-bold">{vehicleStats?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-green-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/20">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Opérationnels</p>
                <p className="text-2xl font-bold text-green-500">{vehicleStats?.operationnels || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-orange-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-orange-500/20">
                <Wrench className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En réparation</p>
                <p className="text-2xl font-bold text-orange-500">
                  {(vehicleStats?.enMaintenance || 0) + (vehicleStats?.enReparation || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-red-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-red-500/20">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hors service</p>
                <p className="text-2xl font-bold text-red-500">{vehicleStats?.horsService || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Carburant et coûts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass border-blue-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Fuel className="h-4 w-4 text-blue-500" />
              Carburant ce mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Litres consommés</span>
                <span className="font-bold">{fuelStats?.totalLitres?.toFixed(0) || 0} L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coût total</span>
                <span className="font-bold text-blue-500">
                  {fuelStats?.totalCost?.toLocaleString() || 0} FDJ
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pleins effectués</span>
                <span>{fuelStats?.fillCount || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-purple-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4 text-purple-500" />
              Réparations en cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Véhicules</span>
                <span className="font-bold text-purple-500">{repairStats?.enCours || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coût estimé</span>
                <span className="font-bold">{repairStats?.coutEstime?.toLocaleString() || 0} FDJ</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-cyan-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-cyan-500" />
              Stock pièces
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total pièces</span>
                <span className="font-bold">{partsStats?.totalParts || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">En alerte stock</span>
                <span className={`font-bold ${partsStats?.lowStock ? "text-red-500" : ""}`}>
                  {partsStats?.lowStock || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pièces récupérées</span>
                <Badge className="bg-green-500/20 text-green-500">{partsStats?.recycledCount || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes et actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              Alertes & Actions requises
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {incidentStats?.openIncidents ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <span>Incidents ouverts</span>
                <Badge className="bg-red-500">{incidentStats.openIncidents}</Badge>
              </div>
            ) : null}
            
            {diagnosticStats?.pendingValidation ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <span>Diagnostics à valider</span>
                <Badge className="bg-orange-500">{diagnosticStats.pendingValidation}</Badge>
              </div>
            ) : null}

            {intakeStats?.activeIntakes ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <span>Véhicules au garage</span>
                <Badge className="bg-blue-500">{intakeStats.activeIntakes}</Badge>
              </div>
            ) : null}

            {partsStats?.lowStock ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <span>Pièces en rupture/alerte</span>
                <Badge className="bg-yellow-500">{partsStats.lowStock}</Badge>
              </div>
            ) : null}

            {!incidentStats?.openIncidents && !diagnosticStats?.pendingValidation && 
             !intakeStats?.activeIntakes && !partsStats?.lowStock && (
              <p className="text-muted-foreground text-center py-4">Aucune alerte en cours</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-500">
              <Calendar className="h-5 w-5" />
              Entretiens planifiés (30 jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {maintenanceStats && maintenanceStats.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {maintenanceStats.slice(0, 5).map((m: any) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div>
                      <span className="font-mono text-sm text-amber-500">
                        {m.vehicle?.immatriculation}
                      </span>
                      <p className="text-xs text-muted-foreground">{m.type_entretien}</p>
                    </div>
                    <Badge variant="outline">
                      {format(new Date(m.date_prevue), "dd MMM", { locale: fr })}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Aucun entretien planifié
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
