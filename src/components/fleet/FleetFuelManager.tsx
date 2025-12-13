import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Fuel, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FuelFormDialog } from "./FuelFormDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function FleetFuelManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: fuelLogs, isLoading } = useQuery({
    queryKey: ["vehicle-fuel-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_fuel_logs")
        .select(`
          *,
          vehicle:vehicles(immatriculation, marque, modele),
          conducteur:personnel(nom, prenom)
        `)
        .order("date_plein", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicle_fuel_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-fuel-logs"] });
      toast({ title: "Plein supprimé" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const filteredLogs = fuelLogs?.filter((f: any) =>
    f.vehicle?.immatriculation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.station?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Statistiques
  const totalLitres = fuelLogs?.reduce((sum, f) => sum + Number(f.litres), 0) || 0;
  const totalCout = fuelLogs?.reduce((sum, f) => sum + Number(f.cout_total), 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass border-green-500/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total pleins</p>
            <p className="text-2xl font-bold text-green-500">{fuelLogs?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="glass border-green-500/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Litres consommés</p>
            <p className="text-2xl font-bold text-green-500">{totalLitres.toLocaleString()} L</p>
          </CardContent>
        </Card>
        <Card className="glass border-green-500/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Coût total</p>
            <p className="text-2xl font-bold text-green-500">{totalCout.toLocaleString()} FDJ</p>
          </CardContent>
        </Card>
        <Card className="glass border-green-500/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Prix moyen/L</p>
            <p className="text-2xl font-bold text-green-500">
              {totalLitres > 0 ? Math.round(totalCout / totalLitres).toLocaleString() : 0} FDJ
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass border-green-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-green-500">
              <Fuel className="h-5 w-5" />
              Pleins de carburant ({fuelLogs?.length || 0})
            </CardTitle>
            <Button onClick={() => setShowDialog(true)} className="gap-2 bg-green-500 hover:bg-green-600">
              <Plus className="h-4 w-4" />
              Nouveau plein
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
        <CardContent>
          {filteredLogs && filteredLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Véhicule</TableHead>
                    <TableHead>Litres</TableHead>
                    <TableHead>Prix/L</TableHead>
                    <TableHead>Coût total</TableHead>
                    <TableHead>Kilométrage</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>Conducteur</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell>{format(new Date(f.date_plein), "dd/MM/yyyy HH:mm", { locale: fr })}</TableCell>
                      <TableCell className="font-mono">{f.vehicle?.immatriculation}</TableCell>
                      <TableCell>{Number(f.litres).toFixed(1)} L</TableCell>
                      <TableCell>{Number(f.prix_litre).toLocaleString()} FDJ</TableCell>
                      <TableCell className="font-medium">{Number(f.cout_total).toLocaleString()} FDJ</TableCell>
                      <TableCell>{f.kilometrage?.toLocaleString()} km</TableCell>
                      <TableCell>{f.station || "-"}</TableCell>
                      <TableCell>
                        {f.conducteur 
                          ? `${f.conducteur.prenom} ${f.conducteur.nom}`
                          : "-"
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(f.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Fuel className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun plein enregistré</p>
            </div>
          )}
        </CardContent>
      </Card>

      <FuelFormDialog open={showDialog} onOpenChange={setShowDialog} />
    </div>
  );
}
