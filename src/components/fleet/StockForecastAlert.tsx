import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  Calendar,
  Package,
  TrendingDown,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";

interface ForecastItem {
  partName: string;
  partReference: string;
  category: string;
  currentStock: number;
  alertThreshold: number;
  forecastedNeed: number;
  deficit: number;
  maintenanceCount: number;
  repairCount: number;
  urgency: "critical" | "warning" | "ok";
}

interface StockForecastAlertProps {
  daysAhead?: number;
  onRequestPart?: (partName: string, category: string) => void;
}

export function StockForecastAlert({
  daysAhead = 30,
  onRequestPart,
}: StockForecastAlertProps) {
  // Fetch spare parts with stock levels
  const { data: spareParts, isLoading: partsLoading } = useQuery({
    queryKey: ["spare-parts-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spare_parts")
        .select("id, nom, reference, categorie, quantite, seuil_alerte")
        .order("categorie, nom");
      if (error) throw error;
      return data;
    },
  });

  // Fetch upcoming maintenance schedules
  const { data: upcomingMaintenances, isLoading: maintLoading } = useQuery({
    queryKey: ["upcoming-maintenances", daysAhead],
    queryFn: async () => {
      const futureDate = addDays(new Date(), daysAhead);
      const { data, error } = await supabase
        .from("maintenance_schedules")
        .select(`
          id,
          type_entretien,
          pieces_requises,
          date_prevue,
          vehicle:vehicles(immatriculation, marque, modele)
        `)
        .eq("statut", "PLANIFIE")
        .lte("date_prevue", futureDate.toISOString().split("T")[0])
        .order("date_prevue");
      if (error) throw error;
      return data;
    },
  });

  // Fetch pending repairs
  const { data: pendingRepairs, isLoading: repairsLoading } = useQuery({
    queryKey: ["pending-repairs-parts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_repairs")
        .select(`
          id,
          description,
          pieces_changees,
          vehicle:vehicles(immatriculation)
        `)
        .in("statut", ["EN_ATTENTE", "EN_COURS"]);
      if (error) throw error;
      return data;
    },
  });

  // Fetch pending spare parts requests (already approved or in order)
  const { data: pendingRequests } = useQuery({
    queryKey: ["pending-parts-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spare_parts_requests")
        .select("part_name, quantite_demandee, statut")
        .in("statut", ["en_attente", "approuve", "commande"]);
      if (error) throw error;
      return data;
    },
  });

  // Calculate forecast
  const forecast = useMemo<ForecastItem[]>(() => {
    if (!spareParts) return [];

    // Count needs from maintenances
    const maintenanceNeeds: Record<string, { count: number; maintenance: number }> = {};
    upcomingMaintenances?.forEach((m: any) => {
      if (m.pieces_requises && Array.isArray(m.pieces_requises)) {
        m.pieces_requises.forEach((piece: string) => {
          const normalized = piece.toLowerCase().trim();
          if (!maintenanceNeeds[normalized]) {
            maintenanceNeeds[normalized] = { count: 0, maintenance: 0 };
          }
          maintenanceNeeds[normalized].count += 1;
          maintenanceNeeds[normalized].maintenance += 1;
        });
      }
    });

    // Count needs from repairs
    const repairNeeds: Record<string, { count: number; repair: number }> = {};
    pendingRepairs?.forEach((r: any) => {
      if (r.pieces_changees && Array.isArray(r.pieces_changees)) {
        r.pieces_changees.forEach((piece: string) => {
          const normalized = piece.toLowerCase().trim();
          if (!repairNeeds[normalized]) {
            repairNeeds[normalized] = { count: 0, repair: 0 };
          }
          repairNeeds[normalized].count += 1;
          repairNeeds[normalized].repair += 1;
        });
      }
    });

    // Build forecast items
    const items: ForecastItem[] = spareParts.map((part) => {
      const normalized = part.nom.toLowerCase().trim();
      const maintNeed = maintenanceNeeds[normalized]?.count || 0;
      const repairNeed = repairNeeds[normalized]?.count || 0;
      const totalNeed = maintNeed + repairNeed;
      
      // Check pending requests
      const pendingQty =
        pendingRequests
          ?.filter((r) => r.part_name.toLowerCase().trim() === normalized)
          .reduce((sum, r) => sum + r.quantite_demandee, 0) || 0;
      
      const effectiveStock = part.quantite + pendingQty;
      const deficit = Math.max(0, totalNeed - effectiveStock);
      
      let urgency: "critical" | "warning" | "ok" = "ok";
      if (deficit > 0 && part.quantite === 0) {
        urgency = "critical";
      } else if (deficit > 0 || part.quantite <= (part.seuil_alerte || 5)) {
        urgency = "warning";
      }

      return {
        partName: part.nom,
        partReference: part.reference,
        category: part.categorie,
        currentStock: part.quantite,
        alertThreshold: part.seuil_alerte || 5,
        forecastedNeed: totalNeed,
        deficit,
        maintenanceCount: maintenanceNeeds[normalized]?.maintenance || 0,
        repairCount: repairNeeds[normalized]?.repair || 0,
        urgency,
      };
    });

    // Also add parts mentioned in maintenance/repairs but not in catalog
    const allPartNames = new Set(spareParts.map((p) => p.nom.toLowerCase().trim()));
    
    const allMentionedParts = new Set([
      ...Object.keys(maintenanceNeeds),
      ...Object.keys(repairNeeds),
    ]);
    
    allMentionedParts.forEach((partName) => {
      if (!allPartNames.has(partName)) {
        const maintNeed = maintenanceNeeds[partName]?.count || 0;
        const repairNeed = repairNeeds[partName]?.count || 0;
        const totalNeed = maintNeed + repairNeed;
        
        if (totalNeed > 0) {
          items.push({
            partName: partName.charAt(0).toUpperCase() + partName.slice(1),
            partReference: "NON_CATALOGUE",
            category: "Non catégorisé",
            currentStock: 0,
            alertThreshold: 5,
            forecastedNeed: totalNeed,
            deficit: totalNeed,
            maintenanceCount: maintenanceNeeds[partName]?.maintenance || 0,
            repairCount: repairNeeds[partName]?.repair || 0,
            urgency: "critical",
          });
        }
      }
    });

    // Sort by urgency and deficit
    return items
      .filter((i) => i.urgency !== "ok" || i.forecastedNeed > 0)
      .sort((a, b) => {
        const urgencyOrder = { critical: 0, warning: 1, ok: 2 };
        if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
          return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        }
        return b.deficit - a.deficit;
      });
  }, [spareParts, upcomingMaintenances, pendingRepairs, pendingRequests]);

  const criticalCount = forecast.filter((f) => f.urgency === "critical").length;
  const warningCount = forecast.filter((f) => f.urgency === "warning").length;

  const isLoading = partsLoading || maintLoading || repairsLoading;

  if (isLoading) {
    return (
      <Card className="glass border-amber-500/30">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </CardContent>
      </Card>
    );
  }

  if (forecast.length === 0) {
    return (
      <Card className="glass border-green-500/30">
        <CardContent className="flex items-center gap-3 py-4">
          <Package className="h-5 w-5 text-green-500" />
          <p className="text-green-500">
            Stock suffisant pour les {daysAhead} prochains jours
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-amber-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-amber-500">
            <TrendingDown className="h-5 w-5" />
            Prévisions Stock ({daysAhead} jours)
          </CardTitle>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <Badge className="bg-red-500/20 text-red-500 gap-1">
                <AlertTriangle className="h-3 w-3" />
                {criticalCount} critique{criticalCount > 1 ? "s" : ""}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-amber-500/20 text-amber-500 gap-1">
                {warningCount} alerte{warningCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {forecast.map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  item.urgency === "critical"
                    ? "border-red-500/50 bg-red-500/10"
                    : item.urgency === "warning"
                    ? "border-amber-500/50 bg-amber-500/10"
                    : "border-border/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{item.partName}</span>
                      {item.partReference !== "NON_CATALOGUE" && (
                        <span className="text-xs text-muted-foreground">
                          ({item.partReference})
                        </span>
                      )}
                      {item.partReference === "NON_CATALOGUE" && (
                        <Badge className="bg-purple-500/20 text-purple-500 text-xs">
                          Non catalogué
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Stock: <strong className={item.currentStock === 0 ? "text-red-500" : ""}>{item.currentStock}</strong>
                      </span>
                      <ArrowRight className="h-3 w-3" />
                      <span>
                        Besoin: <strong>{item.forecastedNeed}</strong>
                      </span>
                      {item.deficit > 0 && (
                        <Badge className="bg-red-500/20 text-red-500">
                          Déficit: {item.deficit}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {item.maintenanceCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {item.maintenanceCount} entretien{item.maintenanceCount > 1 ? "s" : ""}
                        </span>
                      )}
                      {item.repairCount > 0 && (
                        <span className="flex items-center gap-1">
                          🔧 {item.repairCount} réparation{item.repairCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  {onRequestPart && item.deficit > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRequestPart(item.partName, item.category)}
                      className="text-orange-500 border-orange-500/50"
                    >
                      Commander
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
