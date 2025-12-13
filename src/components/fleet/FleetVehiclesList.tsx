import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Car, Loader2, Edit, Trash2, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VehicleFormDialog } from "./VehicleFormDialog";
import { VehicleHistoryDialog } from "./VehicleHistoryDialog";
import { Database } from "@/integrations/supabase/types";
import { differenceInMonths, differenceInYears, format } from "date-fns";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];
type VehicleType = Database["public"]["Enums"]["vehicle_type"];

const STATUS_LABELS: Record<VehicleStatus, { label: string; color: string }> = {
  OPERATIONNEL: { label: "Opérationnel", color: "bg-green-500/20 text-green-500" },
  EN_MAINTENANCE: { label: "En maintenance", color: "bg-blue-500/20 text-blue-500" },
  EN_REPARATION: { label: "En réparation", color: "bg-orange-500/20 text-orange-500" },
  HORS_SERVICE: { label: "Hors service", color: "bg-red-500/20 text-red-500" },
  EN_MISSION: { label: "En mission", color: "bg-purple-500/20 text-purple-500" },
};

const TYPE_LABELS: Record<VehicleType, string> = {
  VOITURE: "Voiture",
  CAMION: "Camion",
  MOTO: "Moto",
  BUS: "Bus",
  UTILITAIRE: "Utilitaire",
  ENGIN_SPECIAL: "Engin spécial",
};

export function FleetVehiclesList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [historyVehicle, setHistoryVehicle] = useState<Vehicle | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const calculateAge = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const years = differenceInYears(new Date(), date);
    const months = differenceInMonths(new Date(), date) % 12;
    if (years > 0) {
      return `${years} an${years > 1 ? "s" : ""}${months > 0 ? ` ${months} mois` : ""}`;
    }
    return `${months} mois`;
  };

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select(`
          *,
          location:locations(nom),
          conducteur:personnel(nom, prenom)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast({ title: "Véhicule supprimé" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const filteredVehicles = vehicles?.filter((v) =>
    v.immatriculation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.marque.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.modele.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingVehicle(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <Card className="glass border-amber-500/30">
      <CardHeader className="px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-amber-500">
            <Car className="h-5 w-5" />
            <span className="text-base sm:text-lg">Véhicules ({vehicles?.length || 0})</span>
          </CardTitle>
          <Button onClick={() => setShowDialog(true)} className="gap-2 bg-amber-500 hover:bg-amber-600 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Nouveau véhicule
          </Button>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {filteredVehicles && filteredVehicles.length > 0 ? (
          <>
            {/* Vue mobile - Cards */}
            <div className="block md:hidden space-y-3">
              {filteredVehicles.map((vehicle: any) => (
                <div key={vehicle.id} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-amber-500">{vehicle.immatriculation}</span>
                    <Badge className={STATUS_LABELS[vehicle.status as VehicleStatus].color}>
                      {STATUS_LABELS[vehicle.status as VehicleStatus].label}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {vehicle.marque} {vehicle.modele} {vehicle.annee && `(${vehicle.annee})`}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">{TYPE_LABELS[vehicle.vehicle_type as VehicleType]}</Badge>
                    {vehicle.date_mise_en_service && (
                      <Badge variant="outline">{calculateAge(vehicle.date_mise_en_service)}</Badge>
                    )}
                  </div>
                  {vehicle.conducteur && (
                    <p className="text-xs text-muted-foreground">
                      Conducteur: {vehicle.conducteur.prenom} {vehicle.conducteur.nom}
                    </p>
                  )}
                  <div className="flex justify-end gap-1 pt-2 border-t border-border/30">
                    <Button variant="ghost" size="sm" onClick={() => setHistoryVehicle(vehicle)}>
                      <History className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(vehicle)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(vehicle.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {/* Vue desktop - Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Immatriculation</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Marque / Modèle</TableHead>
                    <TableHead>Mise en service</TableHead>
                    <TableHead>Département</TableHead>
                    <TableHead>Conducteur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.map((vehicle: any) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-mono font-bold text-amber-500">
                        {vehicle.immatriculation}
                      </TableCell>
                      <TableCell>{TYPE_LABELS[vehicle.vehicle_type as VehicleType]}</TableCell>
                      <TableCell>
                        {vehicle.marque} {vehicle.modele}
                        {vehicle.annee && <span className="text-muted-foreground ml-1">({vehicle.annee})</span>}
                      </TableCell>
                      <TableCell>
                        {vehicle.date_mise_en_service ? (
                          <div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(vehicle.date_mise_en_service), "dd/MM/yyyy")}
                            </span>
                            <br />
                            <Badge variant="outline" className="text-xs">
                              {calculateAge(vehicle.date_mise_en_service)}
                            </Badge>
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>{vehicle.location?.nom || "-"}</TableCell>
                      <TableCell>
                        {vehicle.conducteur 
                          ? `${vehicle.conducteur.prenom} ${vehicle.conducteur.nom}`
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_LABELS[vehicle.status as VehicleStatus].color}>
                          {STATUS_LABELS[vehicle.status as VehicleStatus].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setHistoryVehicle(vehicle)} title="Historique">
                            <History className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(vehicle)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(vehicle.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun véhicule trouvé</p>
          </div>
        )}
      </CardContent>

      <VehicleFormDialog
        open={showDialog}
        onOpenChange={handleCloseDialog}
        vehicle={editingVehicle}
      />

      <VehicleHistoryDialog
        open={!!historyVehicle}
        onOpenChange={(open) => !open && setHistoryVehicle(null)}
        vehicle={historyVehicle}
      />
    </Card>
  );
}
