import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Settings, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MaintenanceFormDialog } from "./MaintenanceFormDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function FleetMaintenanceManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: maintenances, isLoading } = useQuery({
    queryKey: ["vehicle-maintenances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_maintenances")
        .select(`
          *,
          vehicle:vehicles(immatriculation, marque, modele)
        `)
        .order("date_entretien", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicle_maintenances").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-maintenances"] });
      toast({ title: "Entretien supprimé" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const filteredMaintenances = maintenances?.filter((m: any) =>
    m.vehicle?.immatriculation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.type_entretien?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <Card className="glass border-blue-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-blue-500">
            <Settings className="h-5 w-5" />
            Entretiens ({maintenances?.length || 0})
          </CardTitle>
          <Button onClick={() => setShowDialog(true)} className="gap-2 bg-blue-500 hover:bg-blue-600">
            <Plus className="h-4 w-4" />
            Nouvel entretien
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
        {filteredMaintenances && filteredMaintenances.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Véhicule</TableHead>
                  <TableHead>Type d'entretien</TableHead>
                  <TableHead>Kilométrage</TableHead>
                  <TableHead>Coût</TableHead>
                  <TableHead>Prestataire</TableHead>
                  <TableHead>Prochain entretien</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaintenances.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell>{format(new Date(m.date_entretien), "dd/MM/yyyy", { locale: fr })}</TableCell>
                    <TableCell className="font-mono">
                      {m.vehicle?.immatriculation}
                      <span className="text-muted-foreground ml-2 text-xs">
                        {m.vehicle?.marque} {m.vehicle?.modele}
                      </span>
                    </TableCell>
                    <TableCell>{m.type_entretien}</TableCell>
                    <TableCell>{m.kilometrage?.toLocaleString()} km</TableCell>
                    <TableCell>{m.cout ? `${m.cout.toLocaleString()} FDJ` : "-"}</TableCell>
                    <TableCell>{m.prestataire || "-"}</TableCell>
                    <TableCell>
                      {m.prochain_entretien_km && <span>{m.prochain_entretien_km.toLocaleString()} km</span>}
                      {m.prochain_entretien_date && (
                        <span className="text-muted-foreground ml-2">
                          ({format(new Date(m.prochain_entretien_date), "dd/MM/yyyy", { locale: fr })})
                        </span>
                      )}
                      {!m.prochain_entretien_km && !m.prochain_entretien_date && "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(m.id)}
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
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun entretien enregistré</p>
          </div>
        )}
      </CardContent>

      <MaintenanceFormDialog open={showDialog} onOpenChange={setShowDialog} />
    </Card>
  );
}
