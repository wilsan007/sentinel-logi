import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, Car, Loader2, CheckCircle, Clock, AlertTriangle, Stethoscope, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { GarageIntakeWizard } from "./GarageIntakeWizard";
import { DiagnosticDialog } from "./DiagnosticDialog";
import { DiagnosticValidationDialog } from "./DiagnosticValidationDialog";

const MOTIF_LABELS: Record<string, { label: string; color: string }> = {
  REVISION: { label: "Révision", color: "bg-blue-500/20 text-blue-500" },
  PANNE: { label: "Panne", color: "bg-red-500/20 text-red-500" },
  ACCIDENT_INTERNE: { label: "Accident interne", color: "bg-red-500/20 text-red-500" },
  ACCIDENT_EXTERNE: { label: "Accident externe", color: "bg-red-500/20 text-red-500" },
  CONTROLE_TECHNIQUE: { label: "Contrôle technique", color: "bg-purple-500/20 text-purple-500" },
  REPARATION: { label: "Réparation", color: "bg-orange-500/20 text-orange-500" },
  RAVITAILLEMENT: { label: "Ravitaillement", color: "bg-green-500/20 text-green-500" },
  AUTRE: { label: "Autre", color: "bg-gray-500/20 text-gray-500" },
};

const STATUT_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  EN_COURS: { label: "En cours", icon: <Clock className="h-3 w-3" />, color: "bg-amber-500/20 text-amber-500" },
  TERMINE: { label: "Terminé", icon: <CheckCircle className="h-3 w-3" />, color: "bg-green-500/20 text-green-500" },
  EN_ATTENTE: { label: "En attente", icon: <AlertTriangle className="h-3 w-3" />, color: "bg-orange-500/20 text-orange-500" },
};

const SERVICE_LABELS: Record<string, string> = {
  MAINTENANCE: "Maintenance",
  REPARATION_LEGERE: "Réparation légère",
  REPARATION_LOURDE: "Réparation lourde",
  CARBURANT: "Carburant",
  INCIDENT: "Incident",
  EXPERTISE: "Expertise",
};

export function GarageIntakesList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [selectedIntake, setSelectedIntake] = useState<any>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<any>(null);
  const { data: intakes, isLoading } = useQuery({
    queryKey: ["garage-intakes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_garage_intakes")
        .select(`
          *,
          vehicle:vehicles(id, immatriculation, marque, modele),
          conducteur:personnel(nom, prenom)
        `)
        .order("date_arrivee", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch diagnostics for validation button
  const { data: diagnostics } = useQuery({
    queryKey: ["diagnostics-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_diagnostics")
        .select(`
          *,
          intake:vehicle_garage_intakes(id, vehicle_id, kilometrage_arrivee),
          items:vehicle_diagnostic_items(id, option_id, severite, option:diagnostic_options(nom))
        `)
        .eq("statut", "TERMINE")
        .eq("validation_status", "EN_ATTENTE_VALIDATION");
      if (error) throw error;
      return data;
    },
  });

  const filteredIntakes = intakes?.filter((intake: any) =>
    intake.vehicle?.immatriculation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    intake.motif?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <Card className="glass border-amber-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-amber-500">
            <Car className="h-5 w-5" />
            Réceptions garage ({intakes?.length || 0})
          </CardTitle>
          <Button onClick={() => setShowWizard(true)} className="gap-2 bg-amber-500 hover:bg-amber-600">
            <Plus className="h-4 w-4" />
            Nouvelle réception
          </Button>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par immatriculation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredIntakes && filteredIntakes.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Véhicule</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Kilométrage</TableHead>
                  <TableHead>Conducteur</TableHead>
                  <TableHead>Service</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredIntakes.map((intake: any) => (
                  <TableRow key={intake.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(intake.date_arrivee), "dd/MM/yyyy HH:mm", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <div className="font-mono font-bold text-amber-500">
                        {intake.vehicle?.immatriculation}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {intake.vehicle?.marque} {intake.vehicle?.modele}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={MOTIF_LABELS[intake.motif]?.color || ""}>
                        {MOTIF_LABELS[intake.motif]?.label || intake.motif}
                      </Badge>
                      {intake.motif_precision && (
                        <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                          {intake.motif_precision}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {intake.kilometrage_arrivee?.toLocaleString()} km
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {intake.conducteur 
                          ? `${intake.conducteur.prenom} ${intake.conducteur.nom}`
                          : "-"
                        }
                        {intake.is_authorized_driver ? (
                          <Badge variant="outline" className="text-green-500 border-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Autorisé
                          </Badge>
                        ) : intake.conducteur && (
                          <Badge variant="outline" className="text-orange-500 border-orange-500">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Non autorisé
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {SERVICE_LABELS[intake.service_oriente] || intake.service_oriente}
                    </TableCell>
                    <TableCell>
                      <Badge className={`flex items-center gap-1 w-fit ${STATUT_LABELS[intake.statut]?.color || ""}`}>
                        {STATUT_LABELS[intake.statut]?.icon}
                        {STATUT_LABELS[intake.statut]?.label || intake.statut}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedIntake(intake);
                            setShowDiagnostic(true);
                          }}
                          className="gap-1"
                        >
                          <Stethoscope className="h-3 w-3" />
                          Diagnostic
                        </Button>
                        {diagnostics?.find((d: any) => d.intake_id === intake.id) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const diag = diagnostics.find((d: any) => d.intake_id === intake.id);
                              setSelectedDiagnostic(diag);
                              setShowValidation(true);
                            }}
                            className="gap-1 border-green-500 text-green-500"
                          >
                            <ClipboardCheck className="h-3 w-3" />
                            Valider
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune réception enregistrée</p>
          </div>
        )}
      </CardContent>

      <GarageIntakeWizard open={showWizard} onOpenChange={setShowWizard} />
      
      {selectedIntake && (
        <DiagnosticDialog
          open={showDiagnostic}
          onOpenChange={setShowDiagnostic}
          intake={selectedIntake}
        />
      )}

      {selectedDiagnostic && (
        <DiagnosticValidationDialog
          open={showValidation}
          onOpenChange={setShowValidation}
          diagnostic={selectedDiagnostic}
        />
      )}
    </Card>
  );
}
