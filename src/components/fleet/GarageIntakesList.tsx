import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, Car, Loader2, CheckCircle, Clock, AlertTriangle, Stethoscope, ClipboardCheck, FileText } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { GarageIntakeWizard } from "./GarageIntakeWizard";
import { DiagnosticDialog } from "./DiagnosticDialog";
import { DiagnosticValidationDialog } from "./DiagnosticValidationDialog";
import { DiagnosticReportSheet } from "./DiagnosticReportSheet";

const MOTIF_LABELS: Record<string, { label: string; color: string }> = {
  REVISION: { label: "Révision", color: "bg-blue-500/20 text-blue-500" },
  PANNE: { label: "Panne", color: "bg-red-500/20 text-red-500" },
  ACCIDENT_INTERNE: { label: "Accident interne", color: "bg-red-500/20 text-red-500" },
  ACCIDENT_EXTERNE: { label: "Accident externe", color: "bg-red-500/20 text-red-500" },
  CONTROLE_TECHNIQUE: { label: "Contrôle technique", color: "bg-purple-500/20 text-purple-500" },
  REPARATION: { label: "Réparation", color: "bg-orange-500/20 text-orange-500" },
  AUTRE: { label: "Autre", color: "bg-gray-500/20 text-gray-500" },
};

const STATUT_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  EN_COURS: { label: "En cours", icon: <Clock className="h-3 w-3" />, color: "bg-amber-500/20 text-amber-500" },
  TERMINE: { label: "Terminé", icon: <CheckCircle className="h-3 w-3" />, color: "bg-green-500/20 text-green-500" },
  EN_ATTENTE: { label: "En attente", icon: <AlertTriangle className="h-3 w-3" />, color: "bg-orange-500/20 text-orange-500" },
};

const SERVICE_LABELS: Record<string, string> = {
  ENTRETIEN: "Service Entretien",
  REPARATION: "Service Réparation",
  // Legacy values for backward compatibility
  MAINTENANCE: "Service Entretien",
  REPARATION_LEGERE: "Service Réparation",
  REPARATION_LOURDE: "Service Réparation",
  EXPERTISE: "Expertise",
};

export function GarageIntakesList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [selectedIntake, setSelectedIntake] = useState<any>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<any>(null);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [selectedDiagnosticId, setSelectedDiagnosticId] = useState<string>("");
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

  // Fetch diagnostics for validation and report buttons
  const { data: diagnostics } = useQuery({
    queryKey: ["diagnostics-completed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_diagnostics")
        .select(`
          *,
          intake:vehicle_garage_intakes(id, vehicle_id, kilometrage_arrivee),
          items:vehicle_diagnostic_items(id, option_id, severite, option:diagnostic_options(nom))
        `)
        .eq("statut", "TERMINE");
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
      <CardHeader className="px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-amber-500">
            <Car className="h-5 w-5" />
            <span className="text-base sm:text-lg">Réceptions garage ({intakes?.length || 0})</span>
          </CardTitle>
          <Button onClick={() => setShowWizard(true)} className="gap-2 bg-amber-500 hover:bg-amber-600 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Nouvelle réception
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
        {filteredIntakes && filteredIntakes.length > 0 ? (
          <>
            {/* Vue mobile - Cards */}
            <div className="block lg:hidden space-y-3">
              {filteredIntakes.map((intake: any) => (
                <div key={intake.id} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-amber-500">{intake.vehicle?.immatriculation}</span>
                    <Badge className={`flex items-center gap-1 ${STATUT_LABELS[intake.statut]?.color || ""}`}>
                      {STATUT_LABELS[intake.statut]?.icon}
                      {STATUT_LABELS[intake.statut]?.label || intake.statut}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {intake.vehicle?.marque} {intake.vehicle?.modele}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={MOTIF_LABELS[intake.motif]?.color || ""}>
                      {MOTIF_LABELS[intake.motif]?.label || intake.motif}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{intake.kilometrage_arrivee?.toLocaleString()} km</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(intake.date_arrivee), "dd/MM/yyyy HH:mm", { locale: fr })}
                    {intake.conducteur && ` • ${intake.conducteur.prenom} ${intake.conducteur.nom}`}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedIntake(intake); setShowDiagnostic(true); }}
                      className="gap-1 flex-1"
                    >
                      <Stethoscope className="h-3 w-3" />
                      Diagnostic
                    </Button>
                    {diagnostics?.find((d: any) => d.intake_id === intake.id) && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const diag = diagnostics.find((d: any) => d.intake_id === intake.id);
                            setSelectedDiagnosticId(diag.id);
                            setShowReportSheet(true);
                          }}
                          className="gap-1 border-amber-500 text-amber-500 flex-1"
                        >
                          <FileText className="h-3 w-3" />
                          Fiche
                        </Button>
                        {diagnostics?.find((d: any) => d.intake_id === intake.id && d.validation_status === "EN_ATTENTE_VALIDATION") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const diag = diagnostics.find((d: any) => d.intake_id === intake.id);
                              setSelectedDiagnostic(diag);
                              setShowValidation(true);
                            }}
                            className="gap-1 border-green-500 text-green-500 flex-1"
                          >
                            <ClipboardCheck className="h-3 w-3" />
                            Valider
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Vue desktop - Table */}
            <div className="hidden lg:block overflow-x-auto">
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
                      </TableCell>
                      <TableCell>{intake.kilometrage_arrivee?.toLocaleString()} km</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {intake.conducteur ? `${intake.conducteur.prenom} ${intake.conducteur.nom}` : "-"}
                          {intake.is_authorized_driver ? (
                            <Badge variant="outline" className="text-green-500 border-green-500 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />OK
                            </Badge>
                          ) : intake.conducteur && (
                            <Badge variant="outline" className="text-orange-500 border-orange-500 text-xs">
                              <AlertTriangle className="h-3 w-3" />
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{SERVICE_LABELS[intake.service_oriente] || intake.service_oriente}</TableCell>
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
                            onClick={() => { setSelectedIntake(intake); setShowDiagnostic(true); }}
                            className="gap-1"
                          >
                            <Stethoscope className="h-3 w-3" />
                            <span className="hidden xl:inline">Diagnostic</span>
                          </Button>
                          {diagnostics?.find((d: any) => d.intake_id === intake.id) && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const diag = diagnostics.find((d: any) => d.intake_id === intake.id);
                                  setSelectedDiagnosticId(diag.id);
                                  setShowReportSheet(true);
                                }}
                                className="gap-1 border-amber-500 text-amber-500"
                              >
                                <FileText className="h-3 w-3" />
                                <span className="hidden xl:inline">Fiche</span>
                              </Button>
                              {diagnostics?.find((d: any) => d.intake_id === intake.id && d.validation_status === "EN_ATTENTE_VALIDATION") && (
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
                                  <span className="hidden xl:inline">Valider</span>
                                </Button>
                              )}
                            </>
                          )}
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

      <DiagnosticReportSheet
        open={showReportSheet}
        onOpenChange={setShowReportSheet}
        diagnosticId={selectedDiagnosticId}
      />
    </Card>
  );
}
