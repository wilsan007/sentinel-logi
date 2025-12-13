import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Wrench,
  Settings,
  Calendar,
  Package,
  Plus,
  Trash2,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";

interface DiagnosticValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagnostic: any;
}

type RequiredPart = {
  spare_part_id?: string;
  part_name: string;
  quantity_needed: number;
  prix_estime?: number;
};

export function DiagnosticValidationDialog({
  open,
  onOpenChange,
  diagnostic,
}: DiagnosticValidationDialogProps) {
  const queryClient = useQueryClient();
  const [validationNotes, setValidationNotes] = useState("");
  const [workType, setWorkType] = useState<string>("");
  const [estimatedHours, setEstimatedHours] = useState<number>(0);
  const [estimatedDays, setEstimatedDays] = useState<number>(1);
  const [requiredParts, setRequiredParts] = useState<RequiredPart[]>([]);

  // Fetch spare parts inventory
  const { data: spareParts } = useQuery({
    queryKey: ["spare-parts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spare_parts")
        .select("*")
        .order("categorie, nom");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch existing required parts
  const { data: existingParts } = useQuery({
    queryKey: ["diagnostic-parts", diagnostic?.id],
    queryFn: async () => {
      if (!diagnostic?.id) return [];
      const { data, error } = await supabase
        .from("vehicle_repair_parts")
        .select("*, spare_part:spare_parts(nom, quantite)")
        .eq("diagnostic_id", diagnostic.id);
      if (error) throw error;
      return data;
    },
    enabled: open && !!diagnostic?.id,
  });

  useEffect(() => {
    if (diagnostic) {
      setValidationNotes(diagnostic.validation_notes || "");
      setWorkType(diagnostic.work_type || "");
      setEstimatedHours(diagnostic.estimated_hours || 0);
      const days = diagnostic.estimated_completion_date
        ? Math.ceil(
            (new Date(diagnostic.estimated_completion_date).getTime() -
              Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        : 1;
      setEstimatedDays(days > 0 ? days : 1);
    }
  }, [diagnostic]);

  useEffect(() => {
    if (existingParts && existingParts.length > 0) {
      setRequiredParts(
        existingParts.map((p: any) => ({
          spare_part_id: p.spare_part_id,
          part_name: p.part_name,
          quantity_needed: p.quantity_needed,
          prix_estime: p.prix_estime,
        }))
      );
    }
  }, [existingParts]);

  const addPart = () => {
    setRequiredParts([
      ...requiredParts,
      { part_name: "", quantity_needed: 1, prix_estime: 0 },
    ]);
  };

  const removePart = (index: number) => {
    setRequiredParts(requiredParts.filter((_, i) => i !== index));
  };

  const updatePart = (index: number, updates: Partial<RequiredPart>) => {
    const newParts = [...requiredParts];
    newParts[index] = { ...newParts[index], ...updates };
    
    // If selecting from spare parts, auto-fill name and price
    if (updates.spare_part_id && spareParts) {
      const selected = spareParts.find((sp) => sp.id === updates.spare_part_id);
      if (selected) {
        newParts[index].part_name = selected.nom;
        newParts[index].prix_estime = selected.prix_unitaire || 0;
      }
    }
    
    setRequiredParts(newParts);
  };

  const validateMutation = useMutation({
    mutationFn: async (action: "VALIDE" | "REJETE" | "REVISION_DEMANDEE") => {
      const user = (await supabase.auth.getUser()).data.user;
      const completionDate = addDays(new Date(), estimatedDays);

      // Update diagnostic with validation
      const { error } = await supabase
        .from("vehicle_diagnostics")
        .update({
          validation_status: action,
          validated_by: user?.id,
          validated_at: new Date().toISOString(),
          validation_notes: validationNotes,
          work_type: workType,
          estimated_hours: estimatedHours,
          estimated_completion_date: completionDate.toISOString().split("T")[0],
        })
        .eq("id", diagnostic.id);

      if (error) throw error;

      // If validated with work type REPARATION, save required parts and create repair
      if (action === "VALIDE" && workType === "REPARATION") {
        // Delete existing parts
        await supabase
          .from("vehicle_repair_parts")
          .delete()
          .eq("diagnostic_id", diagnostic.id);

        // Insert new parts with availability check
        if (requiredParts.length > 0) {
          const partsWithAvailability = requiredParts.map((part) => {
            const sparePart = spareParts?.find(
              (sp) => sp.id === part.spare_part_id
            );
            return {
              diagnostic_id: diagnostic.id,
              spare_part_id: part.spare_part_id || null,
              part_name: part.part_name,
              quantity_needed: part.quantity_needed,
              quantity_available: sparePart?.quantite || 0,
              is_available: sparePart
                ? sparePart.quantite >= part.quantity_needed
                : false,
              prix_estime: part.prix_estime,
            };
          });

          await supabase.from("vehicle_repair_parts").insert(partsWithAvailability);
        }

        // Check if all parts are available
        const allPartsAvailable = requiredParts.every((part) => {
          const sparePart = spareParts?.find((sp) => sp.id === part.spare_part_id);
          return sparePart && sparePart.quantite >= part.quantity_needed;
        });

        // Create repair record
        const intake = diagnostic.intake;
        const totalPartsCost = requiredParts.reduce(
          (sum, p) => sum + (p.prix_estime || 0) * p.quantity_needed,
          0
        );

        await supabase.from("vehicle_repairs").insert({
          vehicle_id: intake?.vehicle_id,
          diagnostic_id: diagnostic.id,
          repair_type: "LEGERE",
          description: diagnostic.diagnostic_resume || "Réparation suite diagnostic",
          date_debut: new Date().toISOString().split("T")[0],
          kilometrage: intake?.kilometrage_arrivee,
          estimated_hours: estimatedHours,
          cout_pieces: totalPartsCost,
          pieces_changees: requiredParts.map((p) => p.part_name),
          statut: allPartsAvailable ? "EN_COURS" : "PIECES_EN_ATTENTE",
        });

        // Update vehicle status
        await supabase
          .from("vehicles")
          .update({ status: "EN_REPARATION" })
          .eq("id", intake?.vehicle_id);
      }

      // If validated with work type ENTRETIEN, create maintenance
      if (action === "VALIDE" && workType === "ENTRETIEN") {
        const intake = diagnostic.intake;
        
        await supabase.from("vehicle_maintenances").insert({
          vehicle_id: intake?.vehicle_id,
          type_entretien: "Entretien suite diagnostic",
          date_entretien: new Date().toISOString().split("T")[0],
          kilometrage: intake?.kilometrage_arrivee,
          description: diagnostic.diagnostic_resume,
          estimated_hours: estimatedHours,
          statut: "EN_COURS",
        });

        await supabase
          .from("vehicles")
          .update({ status: "EN_MAINTENANCE" })
          .eq("id", intake?.vehicle_id);
      }
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ["garage-intakes"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-diagnostic"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      queryClient.invalidateQueries({ queryKey: ["maintenances"] });
      
      const messages = {
        VALIDE: "Diagnostic validé - Travaux lancés",
        REJETE: "Diagnostic rejeté",
        REVISION_DEMANDEE: "Révision demandée au mécanicien",
      };
      toast.success(messages[action]);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const totalPartsCost = requiredParts.reduce(
    (sum, p) => sum + (p.prix_estime || 0) * p.quantity_needed,
    0
  );

  const partsCategories = spareParts?.reduce((acc, part) => {
    if (!acc[part.categorie]) acc[part.categorie] = [];
    acc[part.categorie].push(part);
    return acc;
  }, {} as Record<string, typeof spareParts>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-500">
            <CheckCircle className="h-5 w-5" />
            Validation du diagnostic
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Résumé du diagnostic */}
            <div className="glass rounded-lg p-4">
              <Label className="text-sm font-medium mb-2 block">Résumé du diagnostic</Label>
              <p className="text-sm">{diagnostic?.diagnostic_resume || "Aucun résumé"}</p>
              
              {diagnostic?.items?.length > 0 && (
                <div className="mt-3">
                  <Label className="text-sm font-medium mb-2 block">
                    Problèmes identifiés ({diagnostic.items.length})
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {diagnostic.items.map((item: any, idx: number) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className={
                          item.severite === "CRITIQUE"
                            ? "border-red-500 text-red-500"
                            : item.severite === "GRAVE"
                            ? "border-orange-500 text-orange-500"
                            : "border-amber-500 text-amber-500"
                        }
                      >
                        {item.option?.nom || "Item"} - {item.severite}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Type de travail */}
            <div className="glass rounded-lg p-4">
              <Label className="flex items-center gap-2 mb-2">
                <Wrench className="h-4 w-4" />
                Type de travail à effectuer
              </Label>
              <Select value={workType} onValueChange={setWorkType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type de travail" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REPARATION">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-red-500" />
                      Réparation
                    </div>
                  </SelectItem>
                  <SelectItem value="ENTRETIEN">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-blue-500" />
                      Entretien
                    </div>
                  </SelectItem>
                  <SelectItem value="INSPECTION">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Inspection uniquement
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estimations */}
            <div className="glass rounded-lg p-4">
              <Label className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4" />
                Estimations de durée
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Heures de travail estimées</Label>
                  <Input
                    type="number"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(Number(e.target.value))}
                    min={0}
                    step={0.5}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Jours avant disponibilité</Label>
                  <Input
                    type="number"
                    value={estimatedDays}
                    onChange={(e) => setEstimatedDays(Number(e.target.value))}
                    min={1}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Prévue le: {format(addDays(new Date(), estimatedDays), "dd/MM/yyyy", { locale: fr })}
                  </p>
                </div>
              </div>
            </div>

            {/* Pièces requises (for REPARATION) */}
            {workType === "REPARATION" && (
              <div className="glass rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <Label className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Pièces nécessaires
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPart}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter
                  </Button>
                </div>

                <div className="space-y-3">
                  {requiredParts.map((part, index) => {
                    const sparePart = spareParts?.find(
                      (sp) => sp.id === part.spare_part_id
                    );
                    const isAvailable =
                      sparePart && sparePart.quantite >= part.quantity_needed;

                    return (
                      <div
                        key={index}
                        className="grid grid-cols-12 gap-2 items-center p-2 rounded-md border"
                      >
                        <div className="col-span-5">
                          <Select
                            value={part.spare_part_id || ""}
                            onValueChange={(val) =>
                              updatePart(index, {
                                spare_part_id: val || undefined,
                              })
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Sélectionner une pièce" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(partsCategories || {}).map(
                                ([cat, parts]) => (
                                  <div key={cat}>
                                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                                      {cat}
                                    </div>
                                    {(parts as any[]).map((sp) => (
                                      <SelectItem key={sp.id} value={sp.id}>
                                        <div className="flex items-center gap-2">
                                          <span>{sp.nom}</span>
                                          <Badge
                                            variant="outline"
                                            className={
                                              sp.quantite > sp.seuil_alerte
                                                ? "text-green-500"
                                                : sp.quantite > 0
                                                ? "text-orange-500"
                                                : "text-red-500"
                                            }
                                          >
                                            {sp.quantite}
                                          </Badge>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </div>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            value={part.quantity_needed}
                            onChange={(e) =>
                              updatePart(index, {
                                quantity_needed: Number(e.target.value),
                              })
                            }
                            min={1}
                            className="h-9"
                            placeholder="Qté"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            value={part.prix_estime || 0}
                            onChange={(e) =>
                              updatePart(index, {
                                prix_estime: Number(e.target.value),
                              })
                            }
                            className="h-9"
                            placeholder="Prix"
                          />
                        </div>
                        <div className="col-span-2 flex items-center gap-1">
                          {sparePart && (
                            <Badge
                              className={
                                isAvailable
                                  ? "bg-green-500/20 text-green-500"
                                  : "bg-red-500/20 text-red-500"
                              }
                            >
                              {isAvailable ? (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              ) : (
                                <AlertTriangle className="h-3 w-3 mr-1" />
                              )}
                              {isAvailable ? "Dispo" : "Manque"}
                            </Badge>
                          )}
                        </div>
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePart(index)}
                            className="h-9 w-9 p-0 text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {requiredParts.length > 0 && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-md flex justify-between">
                    <span className="font-medium">Coût total pièces estimé:</span>
                    <span className="font-bold text-amber-500">
                      {totalPartsCost.toLocaleString()} FDJ
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Notes de validation */}
            <div className="glass rounded-lg p-4">
              <Label>Notes de validation</Label>
              <Textarea
                value={validationNotes}
                onChange={(e) => setValidationNotes(e.target.value)}
                placeholder="Instructions supplémentaires, remarques..."
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t mt-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => validateMutation.mutate("REVISION_DEMANDEE")}
              disabled={validateMutation.isPending}
              className="gap-1 text-orange-500 border-orange-500"
            >
              <AlertTriangle className="h-4 w-4" />
              Demander révision
            </Button>
            <Button
              variant="outline"
              onClick={() => validateMutation.mutate("REJETE")}
              disabled={validateMutation.isPending}
              className="gap-1 text-red-500 border-red-500"
            >
              <XCircle className="h-4 w-4" />
              Rejeter
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => validateMutation.mutate("VALIDE")}
              disabled={validateMutation.isPending || !workType}
              className="gap-1 bg-green-600 hover:bg-green-700"
            >
              {validateMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <CheckCircle className="h-4 w-4" />
              Valider et lancer les travaux
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
