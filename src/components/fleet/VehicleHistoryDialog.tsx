import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Car,
  Loader2,
  Wrench,
  Settings,
  Fuel,
  AlertTriangle,
  Calendar,
  History,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

interface VehicleHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: any;
}

export function VehicleHistoryDialog({
  open,
  onOpenChange,
  vehicle,
}: VehicleHistoryDialogProps) {
  // Fetch repairs
  const { data: repairs, isLoading: loadingRepairs } = useQuery({
    queryKey: ["vehicle-repairs-history", vehicle?.id],
    queryFn: async () => {
      if (!vehicle?.id) return [];
      const { data, error } = await supabase
        .from("vehicle_repairs")
        .select("*")
        .eq("vehicle_id", vehicle.id)
        .order("date_debut", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!vehicle?.id,
  });

  // Fetch maintenances
  const { data: maintenances, isLoading: loadingMaintenances } = useQuery({
    queryKey: ["vehicle-maintenances-history", vehicle?.id],
    queryFn: async () => {
      if (!vehicle?.id) return [];
      const { data, error } = await supabase
        .from("vehicle_maintenances")
        .select("*")
        .eq("vehicle_id", vehicle.id)
        .order("date_entretien", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!vehicle?.id,
  });

  // Fetch fuel logs
  const { data: fuelLogs, isLoading: loadingFuel } = useQuery({
    queryKey: ["vehicle-fuel-history", vehicle?.id],
    queryFn: async () => {
      if (!vehicle?.id) return [];
      const { data, error } = await supabase
        .from("vehicle_fuel_logs")
        .select("*, conducteur:personnel(nom, prenom)")
        .eq("vehicle_id", vehicle.id)
        .order("date_plein", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: open && !!vehicle?.id,
  });

  // Fetch incidents
  const { data: incidents, isLoading: loadingIncidents } = useQuery({
    queryKey: ["vehicle-incidents-history", vehicle?.id],
    queryFn: async () => {
      if (!vehicle?.id) return [];
      const { data, error } = await supabase
        .from("vehicle_incidents")
        .select("*")
        .eq("vehicle_id", vehicle.id)
        .order("date_incident", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!vehicle?.id,
  });

  // Fetch garage intakes
  const { data: intakes, isLoading: loadingIntakes } = useQuery({
    queryKey: ["vehicle-intakes-history", vehicle?.id],
    queryFn: async () => {
      if (!vehicle?.id) return [];
      const { data, error } = await supabase
        .from("vehicle_garage_intakes")
        .select("*, conducteur:personnel(nom, prenom)")
        .eq("vehicle_id", vehicle.id)
        .order("date_arrivee", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!vehicle?.id,
  });

  const isLoading =
    loadingRepairs ||
    loadingMaintenances ||
    loadingFuel ||
    loadingIncidents ||
    loadingIntakes;

  // Calculate vehicle age if date_mise_en_service exists
  const vehicleAge = vehicle?.date_mise_en_service
    ? differenceInDays(new Date(), new Date(vehicle.date_mise_en_service))
    : null;

  // Total costs
  const totalRepairCost =
    repairs?.reduce((sum, r) => sum + (r.cout_total || 0), 0) || 0;
  const totalMaintenanceCost =
    maintenances?.reduce((sum, m) => sum + (m.cout || 0), 0) || 0;
  const totalFuelCost =
    fuelLogs?.reduce((sum, f) => sum + (f.cout_total || 0), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-500">
            <History className="h-5 w-5" />
            Historique du véhicule
          </DialogTitle>
        </DialogHeader>

        {/* Vehicle info header */}
        <div className="glass rounded-lg p-4 flex items-center gap-4">
          <Car className="h-12 w-12 text-amber-500" />
          <div className="flex-1">
            <div className="font-mono font-bold text-xl text-amber-500">
              {vehicle?.immatriculation}
            </div>
            <div className="text-sm text-muted-foreground">
              {vehicle?.marque} {vehicle?.modele} {vehicle?.annee && `(${vehicle.annee})`}
            </div>
            <div className="text-sm text-muted-foreground">
              Kilométrage actuel: {vehicle?.kilometrage_actuel?.toLocaleString()} km
            </div>
          </div>
          <div className="text-right">
            {vehicle?.date_mise_en_service && (
              <div>
                <div className="text-sm text-muted-foreground">En service depuis</div>
                <div className="font-medium">
                  {format(new Date(vehicle.date_mise_en_service), "dd/MM/yyyy", {
                    locale: fr,
                  })}
                </div>
                {vehicleAge && (
                  <Badge variant="outline">
                    {Math.floor(vehicleAge / 365)} ans {Math.floor((vehicleAge % 365) / 30)} mois
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-4 my-4">
          <div className="glass rounded-lg p-3 text-center">
            <Wrench className="h-5 w-5 mx-auto mb-1 text-red-500" />
            <div className="text-2xl font-bold">{repairs?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Réparations</div>
            <div className="text-xs text-red-500">
              {totalRepairCost.toLocaleString()} FDJ
            </div>
          </div>
          <div className="glass rounded-lg p-3 text-center">
            <Settings className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <div className="text-2xl font-bold">{maintenances?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Entretiens</div>
            <div className="text-xs text-blue-500">
              {totalMaintenanceCost.toLocaleString()} FDJ
            </div>
          </div>
          <div className="glass rounded-lg p-3 text-center">
            <Fuel className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <div className="text-2xl font-bold">{fuelLogs?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Pleins</div>
            <div className="text-xs text-green-500">
              {totalFuelCost.toLocaleString()} FDJ
            </div>
          </div>
          <div className="glass rounded-lg p-3 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-orange-500" />
            <div className="text-2xl font-bold">{incidents?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Incidents</div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : (
          <Tabs defaultValue="repairs" className="flex-1 overflow-hidden">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="repairs" className="gap-1">
                <Wrench className="h-3 w-3" />
                Réparations
              </TabsTrigger>
              <TabsTrigger value="maintenances" className="gap-1">
                <Settings className="h-3 w-3" />
                Entretiens
              </TabsTrigger>
              <TabsTrigger value="fuel" className="gap-1">
                <Fuel className="h-3 w-3" />
                Carburant
              </TabsTrigger>
              <TabsTrigger value="incidents" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Incidents
              </TabsTrigger>
              <TabsTrigger value="intakes" className="gap-1">
                <Calendar className="h-3 w-3" />
                Passages
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 h-[400px] mt-4">
              <TabsContent value="repairs" className="m-0">
                {repairs && repairs.length > 0 ? (
                  <div className="space-y-3">
                    {repairs.map((repair) => (
                      <div
                        key={repair.id}
                        className="glass rounded-lg p-4 border-l-4 border-l-red-500"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <Badge
                              className={
                                repair.repair_type === "LOURDE"
                                  ? "bg-red-500/20 text-red-500"
                                  : "bg-orange-500/20 text-orange-500"
                              }
                            >
                              {repair.repair_type === "LOURDE"
                                ? "Réparation lourde"
                                : "Réparation légère"}
                            </Badge>
                            <p className="mt-2">{repair.description}</p>
                            {repair.pieces_changees && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {repair.pieces_changees.map((piece: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {piece}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm">
                              {format(new Date(repair.date_debut), "dd/MM/yyyy", {
                                locale: fr,
                              })}
                            </div>
                            {repair.cout_total && (
                              <div className="font-bold text-red-500">
                                {repair.cout_total.toLocaleString()} FDJ
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    Aucune réparation enregistrée
                  </p>
                )}
              </TabsContent>

              <TabsContent value="maintenances" className="m-0">
                {maintenances && maintenances.length > 0 ? (
                  <div className="space-y-3">
                    {maintenances.map((maint) => (
                      <div
                        key={maint.id}
                        className="glass rounded-lg p-4 border-l-4 border-l-blue-500"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{maint.type_entretien}</div>
                            {maint.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {maint.description}
                              </p>
                            )}
                            <div className="text-sm text-muted-foreground">
                              {maint.kilometrage?.toLocaleString()} km
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm">
                              {format(new Date(maint.date_entretien), "dd/MM/yyyy", {
                                locale: fr,
                              })}
                            </div>
                            {maint.cout && (
                              <div className="font-bold text-blue-500">
                                {maint.cout.toLocaleString()} FDJ
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    Aucun entretien enregistré
                  </p>
                )}
              </TabsContent>

              <TabsContent value="fuel" className="m-0">
                {fuelLogs && fuelLogs.length > 0 ? (
                  <div className="space-y-3">
                    {fuelLogs.map((log) => (
                      <div
                        key={log.id}
                        className="glass rounded-lg p-4 border-l-4 border-l-green-500"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">
                              {log.litres} L @ {log.prix_litre} FDJ/L
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {log.station || "Station non précisée"} •{" "}
                              {log.kilometrage?.toLocaleString()} km
                            </div>
                            {log.conducteur && (
                              <div className="text-xs text-muted-foreground">
                                {log.conducteur.prenom} {log.conducteur.nom}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm">
                              {format(new Date(log.date_plein), "dd/MM/yyyy", {
                                locale: fr,
                              })}
                            </div>
                            <div className="font-bold text-green-500">
                              {log.cout_total.toLocaleString()} FDJ
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    Aucun plein enregistré
                  </p>
                )}
              </TabsContent>

              <TabsContent value="incidents" className="m-0">
                {incidents && incidents.length > 0 ? (
                  <div className="space-y-3">
                    {incidents.map((incident) => (
                      <div
                        key={incident.id}
                        className="glass rounded-lg p-4 border-l-4 border-l-orange-500"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <Badge
                              className={
                                incident.status === "CLOTURE"
                                  ? "bg-green-500/20 text-green-500"
                                  : "bg-orange-500/20 text-orange-500"
                              }
                            >
                              {incident.status}
                            </Badge>
                            <p className="mt-2">{incident.description}</p>
                            {incident.lieu && (
                              <div className="text-sm text-muted-foreground">
                                📍 {incident.lieu}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm">
                              {format(new Date(incident.date_incident), "dd/MM/yyyy", {
                                locale: fr,
                              })}
                            </div>
                            {incident.cout_reel && (
                              <div className="font-bold text-orange-500">
                                {incident.cout_reel.toLocaleString()} FDJ
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    Aucun incident enregistré
                  </p>
                )}
              </TabsContent>

              <TabsContent value="intakes" className="m-0">
                {intakes && intakes.length > 0 ? (
                  <div className="space-y-3">
                    {intakes.map((intake) => (
                      <div
                        key={intake.id}
                        className="glass rounded-lg p-4 border-l-4 border-l-amber-500"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <Badge variant="outline">{intake.motif}</Badge>
                            {intake.motif_precision && (
                              <p className="text-sm mt-1">{intake.motif_precision}</p>
                            )}
                            <div className="text-sm text-muted-foreground mt-1">
                              {intake.kilometrage_arrivee?.toLocaleString()} km
                            </div>
                            {intake.conducteur && (
                              <div className="text-xs text-muted-foreground">
                                {intake.conducteur.prenom} {intake.conducteur.nom}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm">
                              {format(new Date(intake.date_arrivee), "dd/MM/yyyy HH:mm", {
                                locale: fr,
                              })}
                            </div>
                            <Badge
                              className={
                                intake.statut === "TERMINE"
                                  ? "bg-green-500/20 text-green-500"
                                  : "bg-amber-500/20 text-amber-500"
                              }
                            >
                              {intake.statut}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    Aucun passage enregistré
                  </p>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
