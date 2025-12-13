import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { Database } from "@/integrations/supabase/types";

type IncidentStatus = Database["public"]["Enums"]["incident_status"];

const STATUS_LABELS: Record<IncidentStatus, { label: string; color: string }> = {
  DECLARE: { label: "Déclaré", color: "bg-yellow-500/20 text-yellow-500" },
  EN_EXPERTISE: { label: "En expertise", color: "bg-blue-500/20 text-blue-500" },
  EN_REPARATION: { label: "En réparation", color: "bg-orange-500/20 text-orange-500" },
  CLOTURE: { label: "Clôturé", color: "bg-green-500/20 text-green-500" },
};

const NEXT_STATUS: Record<IncidentStatus, IncidentStatus | null> = {
  DECLARE: "EN_EXPERTISE",
  EN_EXPERTISE: "EN_REPARATION",
  EN_REPARATION: "CLOTURE",
  CLOTURE: null,
};

interface IncidentDetailDialogProps {
  incident: any;
  onClose: () => void;
}

export function IncidentDetailDialog({ incident, onClose }: IncidentDetailDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expertiseRapport, setExpertiseRapport] = useState("");
  const [sanctions, setSanctions] = useState("");

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: IncidentStatus) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const updates: any = { status: newStatus };
      
      if (newStatus === "EN_EXPERTISE") {
        updates.expertise_date = new Date().toISOString().split("T")[0];
      }
      
      if (newStatus === "CLOTURE") {
        updates.cloture_date = new Date().toISOString().split("T")[0];
        updates.cloture_par = userData.user?.id;
        if (expertiseRapport) updates.expertise_rapport = expertiseRapport;
        if (sanctions) updates.sanctions = sanctions;
      }

      const { error } = await supabase
        .from("vehicle_incidents")
        .update(updates)
        .eq("id", incident.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-incidents"] });
      toast({ title: "Statut mis à jour" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  if (!incident) return null;

  const nextStatus = NEXT_STATUS[incident.status as IncidentStatus];

  return (
    <Dialog open={!!incident} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Sinistre - {incident.vehicle?.immatriculation}
            <Badge className={STATUS_LABELS[incident.status as IncidentStatus].color}>
              {STATUS_LABELS[incident.status as IncidentStatus].label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Date de l'incident</p>
              <p className="font-medium">
                {format(new Date(incident.date_incident), "dd MMMM yyyy à HH:mm", { locale: fr })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lieu</p>
              <p className="font-medium">{incident.lieu || "-"}</p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm text-muted-foreground mb-1">Description</p>
            <p className="text-sm">{incident.description}</p>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Conducteur responsable</p>
              <p className="font-medium">
                {incident.conducteur_responsable 
                  ? `${incident.conducteur_responsable.prenom} ${incident.conducteur_responsable.nom}`
                  : "-"
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Degré de responsabilité</p>
              {incident.degre_responsabilite ? (
                <Badge className={
                  incident.degre_responsabilite === "Totale" ? "bg-red-500/20 text-red-500" :
                  incident.degre_responsabilite === "Partielle" ? "bg-yellow-500/20 text-yellow-500" :
                  "bg-green-500/20 text-green-500"
                }>
                  {incident.degre_responsabilite}
                </Badge>
              ) : "-"}
            </div>
          </div>

          {incident.tiers_implique && incident.tiers_info && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Tiers impliqué</p>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-medium">{incident.tiers_info.nom || "Non renseigné"}</p>
                  <p className="text-sm text-muted-foreground">{incident.tiers_info.contact || "Pas de contact"}</p>
                </div>
              </div>
            </>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Coût estimé</p>
              <p className="font-medium">
                {incident.cout_estimation ? `${Number(incident.cout_estimation).toLocaleString()} FDJ` : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Coût réel</p>
              <p className="font-medium">
                {incident.cout_reel ? `${Number(incident.cout_reel).toLocaleString()} FDJ` : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Couvert par assurance</p>
              <p className="font-medium">{incident.couvert_assurance ? "Oui" : "Non"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">N° dossier assurance</p>
              <p className="font-medium">{incident.numero_dossier_assurance || "-"}</p>
            </div>
          </div>

          {incident.expertise_rapport && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Rapport d'expertise</p>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">{incident.expertise_rapport}</p>
              </div>
            </>
          )}

          {incident.sanctions && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Sanctions appliquées</p>
                <p className="text-sm bg-red-500/10 text-red-500 p-3 rounded-lg">{incident.sanctions}</p>
              </div>
            </>
          )}

          {/* Actions de workflow */}
          {nextStatus && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="font-medium">Faire avancer le dossier</p>
                
                {nextStatus === "CLOTURE" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-muted-foreground">Rapport d'expertise (optionnel)</label>
                      <Textarea 
                        value={expertiseRapport}
                        onChange={(e) => setExpertiseRapport(e.target.value)}
                        placeholder="Conclusions de l'expertise..."
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Sanctions (optionnel)</label>
                      <Textarea 
                        value={sanctions}
                        onChange={(e) => setSanctions(e.target.value)}
                        placeholder="Sanctions appliquées au conducteur responsable..."
                      />
                    </div>
                  </div>
                )}

                <Button 
                  onClick={() => updateStatusMutation.mutate(nextStatus)}
                  disabled={updateStatusMutation.isPending}
                  className="w-full"
                >
                  Passer à : {STATUS_LABELS[nextStatus].label}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
