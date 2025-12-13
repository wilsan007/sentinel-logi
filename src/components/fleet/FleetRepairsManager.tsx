import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Wrench, Loader2, Trash2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RepairFormDialog } from "./RepairFormDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function FleetRepairsManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: repairs, isLoading } = useQuery({
    queryKey: ["vehicle-repairs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_repairs")
        .select(`
          *,
          vehicle:vehicles(immatriculation, marque, modele)
        `)
        .order("date_debut", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicle_repairs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-repairs"] });
      toast({ title: "Réparation supprimée" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicle_repairs")
        .update({ est_termine: true, date_fin: new Date().toISOString().split("T")[0] })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-repairs"] });
      toast({ title: "Réparation terminée" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const filteredRepairs = repairs?.filter((r: any) =>
    r.vehicle?.immatriculation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <Card className="glass border-red-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-red-500">
            <Wrench className="h-5 w-5" />
            Réparations ({repairs?.length || 0})
          </CardTitle>
          <Button onClick={() => setShowDialog(true)} className="gap-2 bg-red-500 hover:bg-red-600">
            <Plus className="h-4 w-4" />
            Nouvelle réparation
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
        {filteredRepairs && filteredRepairs.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Véhicule</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date début</TableHead>
                  <TableHead>Date fin</TableHead>
                  <TableHead>Coût total</TableHead>
                  <TableHead>Garage</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRepairs.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">
                      {r.vehicle?.immatriculation}
                    </TableCell>
                    <TableCell>
                      <Badge className={r.repair_type === "LOURDE" ? "bg-red-500/20 text-red-500" : "bg-yellow-500/20 text-yellow-500"}>
                        {r.repair_type === "LOURDE" ? "Lourde" : "Légère"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{r.description}</TableCell>
                    <TableCell>{format(new Date(r.date_debut), "dd/MM/yyyy", { locale: fr })}</TableCell>
                    <TableCell>{r.date_fin ? format(new Date(r.date_fin), "dd/MM/yyyy", { locale: fr }) : "-"}</TableCell>
                    <TableCell>{r.cout_total ? `${Number(r.cout_total).toLocaleString()} FDJ` : "-"}</TableCell>
                    <TableCell>{r.garage || "-"}</TableCell>
                    <TableCell>
                      <Badge className={r.est_termine ? "bg-green-500/20 text-green-500" : "bg-orange-500/20 text-orange-500"}>
                        {r.est_termine ? "Terminé" : "En cours"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!r.est_termine && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => completeMutation.mutate(r.id)}
                            title="Marquer comme terminé"
                          >
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(r.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune réparation enregistrée</p>
          </div>
        )}
      </CardContent>

      <RepairFormDialog open={showDialog} onOpenChange={setShowDialog} />
    </Card>
  );
}
