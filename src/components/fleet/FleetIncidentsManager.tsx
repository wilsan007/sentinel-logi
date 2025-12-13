import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, AlertTriangle, Loader2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { IncidentFormDialog } from "./IncidentFormDialog";
import { IncidentDetailDialog } from "./IncidentDetailDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Database } from "@/integrations/supabase/types";

type IncidentStatus = Database["public"]["Enums"]["incident_status"];

const STATUS_LABELS: Record<IncidentStatus, { label: string; color: string }> = {
  DECLARE: { label: "Déclaré", color: "bg-yellow-500/20 text-yellow-500" },
  EN_EXPERTISE: { label: "En expertise", color: "bg-blue-500/20 text-blue-500" },
  EN_REPARATION: { label: "En réparation", color: "bg-orange-500/20 text-orange-500" },
  CLOTURE: { label: "Clôturé", color: "bg-green-500/20 text-green-500" },
};

export function FleetIncidentsManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: incidents, isLoading } = useQuery({
    queryKey: ["vehicle-incidents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_incidents")
        .select(`
          *,
          vehicle:vehicles(immatriculation, marque, modele),
          conducteur_responsable:personnel(nom, prenom)
        `)
        .order("date_incident", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const filteredIncidents = incidents?.filter((i: any) =>
    i.vehicle?.immatriculation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.lieu?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <Card className="glass border-orange-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-orange-500">
            <AlertTriangle className="h-5 w-5" />
            Sinistres ({incidents?.length || 0})
          </CardTitle>
          <Button onClick={() => setShowDialog(true)} className="gap-2 bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4" />
            Déclarer un sinistre
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
        {filteredIncidents && filteredIncidents.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Véhicule</TableHead>
                  <TableHead>Lieu</TableHead>
                  <TableHead>Conducteur responsable</TableHead>
                  <TableHead>Responsabilité</TableHead>
                  <TableHead>Coût estimé</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.map((i: any) => (
                  <TableRow key={i.id}>
                    <TableCell>{format(new Date(i.date_incident), "dd/MM/yyyy HH:mm", { locale: fr })}</TableCell>
                    <TableCell className="font-mono">{i.vehicle?.immatriculation}</TableCell>
                    <TableCell>{i.lieu || "-"}</TableCell>
                    <TableCell>
                      {i.conducteur_responsable 
                        ? `${i.conducteur_responsable.prenom} ${i.conducteur_responsable.nom}`
                        : "-"
                      }
                    </TableCell>
                    <TableCell>
                      {i.degre_responsabilite && (
                        <Badge className={
                          i.degre_responsabilite === "Totale" ? "bg-red-500/20 text-red-500" :
                          i.degre_responsabilite === "Partielle" ? "bg-yellow-500/20 text-yellow-500" :
                          "bg-green-500/20 text-green-500"
                        }>
                          {i.degre_responsabilite}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{i.cout_estimation ? `${Number(i.cout_estimation).toLocaleString()} FDJ` : "-"}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_LABELS[i.status as IncidentStatus].color}>
                        {STATUS_LABELS[i.status as IncidentStatus].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedIncident(i)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun sinistre enregistré</p>
          </div>
        )}
      </CardContent>

      <IncidentFormDialog open={showDialog} onOpenChange={setShowDialog} />
      <IncidentDetailDialog 
        incident={selectedIncident} 
        onClose={() => setSelectedIncident(null)} 
      />
    </Card>
  );
}
