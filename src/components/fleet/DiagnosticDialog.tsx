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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Loader2,
  Wrench,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  Car,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DiagnosticDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intake: any;
}

type SelectedOption = {
  optionId: string;
  severite: string;
  notes: string;
};

const SEVERITE_OPTIONS = [
  { value: "FAIBLE", label: "Faible", color: "bg-green-500/20 text-green-500" },
  { value: "MOYEN", label: "Moyen", color: "bg-yellow-500/20 text-yellow-500" },
  { value: "GRAVE", label: "Grave", color: "bg-orange-500/20 text-orange-500" },
  { value: "CRITIQUE", label: "Critique", color: "bg-red-500/20 text-red-500" },
];

export function DiagnosticDialog({ open, onOpenChange, intake }: DiagnosticDialogProps) {
  const queryClient = useQueryClient();
  const [selectedMecanicien, setSelectedMecanicien] = useState<string>("");
  const [impressionsValidees, setImpressionsValidees] = useState(false);
  const [notesMecanicien, setNotesMecanicien] = useState("");
  const [diagnosticResume, setDiagnosticResume] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, SelectedOption>>({});

  // Fetch existing diagnostic if any
  const { data: existingDiagnostic, isLoading: loadingDiagnostic } = useQuery({
    queryKey: ["vehicle-diagnostic", intake?.id],
    queryFn: async () => {
      if (!intake?.id) return null;
      const { data, error } = await supabase
        .from("vehicle_diagnostics")
        .select(`
          *,
          mecanicien:personnel(id, nom, prenom),
          items:vehicle_diagnostic_items(
            id,
            option_id,
            severite,
            notes
          )
        `)
        .eq("intake_id", intake.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!intake?.id,
  });

  // Load existing data when diagnostic is fetched
  useEffect(() => {
    if (existingDiagnostic) {
      setSelectedMecanicien(existingDiagnostic.mecanicien_id || "");
      setImpressionsValidees(existingDiagnostic.impressions_conducteur_validees || false);
      setNotesMecanicien(existingDiagnostic.notes_mecanicien || "");
      setDiagnosticResume(existingDiagnostic.diagnostic_resume || "");
      
      // Load selected options
      const opts: Record<string, SelectedOption> = {};
      existingDiagnostic.items?.forEach((item: any) => {
        opts[item.option_id] = {
          optionId: item.option_id,
          severite: item.severite,
          notes: item.notes || "",
        };
      });
      setSelectedOptions(opts);
    }
  }, [existingDiagnostic]);

  // Fetch personnel (mechanics)
  const { data: personnel } = useQuery({
    queryKey: ["personnel-mechanics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personnel")
        .select("id, nom, prenom, grade")
        .eq("actif", true)
        .order("nom");
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch diagnostic categories with options
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ["diagnostic-categories"],
    queryFn: async () => {
      const { data: cats, error: catError } = await supabase
        .from("diagnostic_categories")
        .select("*")
        .eq("is_active", true)
        .order("ordre");
      
      if (catError) throw catError;

      const { data: opts, error: optError } = await supabase
        .from("diagnostic_options")
        .select("*")
        .eq("is_active", true)
        .order("ordre");
      
      if (optError) throw optError;

      // Group options by category
      return cats.map(cat => ({
        ...cat,
        options: opts.filter(opt => opt.category_id === cat.id),
      }));
    },
    enabled: open,
  });

  // Save diagnostic mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      
      // Create or update diagnostic
      const diagnosticData = {
        intake_id: intake.id,
        mecanicien_id: selectedMecanicien || null,
        assigned_by: user?.id,
        assigned_at: selectedMecanicien ? new Date().toISOString() : null,
        diagnostic_date: Object.keys(selectedOptions).length > 0 ? new Date().toISOString() : null,
        impressions_conducteur_validees: impressionsValidees,
        notes_mecanicien: notesMecanicien,
        diagnostic_resume: diagnosticResume,
        statut: Object.keys(selectedOptions).length > 0 ? "TERMINE" : selectedMecanicien ? "EN_COURS" : "EN_ATTENTE",
      };

      let diagnosticId: string;

      if (existingDiagnostic) {
        const { error } = await supabase
          .from("vehicle_diagnostics")
          .update(diagnosticData)
          .eq("id", existingDiagnostic.id);
        
        if (error) throw error;
        diagnosticId = existingDiagnostic.id;

        // Delete old items
        await supabase
          .from("vehicle_diagnostic_items")
          .delete()
          .eq("diagnostic_id", diagnosticId);
      } else {
        const { data, error } = await supabase
          .from("vehicle_diagnostics")
          .insert(diagnosticData)
          .select()
          .single();
        
        if (error) throw error;
        diagnosticId = data.id;
      }

      // Insert new items
      if (Object.keys(selectedOptions).length > 0) {
        const items = Object.values(selectedOptions).map(opt => ({
          diagnostic_id: diagnosticId,
          option_id: opt.optionId,
          severite: opt.severite,
          notes: opt.notes,
        }));

        const { error: itemsError } = await supabase
          .from("vehicle_diagnostic_items")
          .insert(items);
        
        if (itemsError) throw itemsError;
      }

      // Update intake status if diagnostic is complete
      if (Object.keys(selectedOptions).length > 0) {
        await supabase
          .from("vehicle_garage_intakes")
          .update({ statut: "TERMINE" })
          .eq("id", intake.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["garage-intakes"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-diagnostic", intake?.id] });
      toast.success("Diagnostic enregistré avec succès");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const handleOptionToggle = (optionId: string) => {
    setSelectedOptions(prev => {
      if (prev[optionId]) {
        const { [optionId]: removed, ...rest } = prev;
        return rest;
      } else {
        return {
          ...prev,
          [optionId]: { optionId, severite: "MOYEN", notes: "" },
        };
      }
    });
  };

  const handleSeveriteChange = (optionId: string, severite: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionId]: { ...prev[optionId], severite },
    }));
  };

  if (loadingCategories || loadingDiagnostic) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const selectedCount = Object.keys(selectedOptions).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-500">
            <Wrench className="h-5 w-5" />
            Diagnostic véhicule
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Info véhicule */}
          <div className="glass rounded-lg p-4 flex items-center gap-4">
            <Car className="h-10 w-10 text-amber-500" />
            <div>
              <div className="font-mono font-bold text-lg text-amber-500">
                {intake?.vehicle?.immatriculation}
              </div>
              <div className="text-sm text-muted-foreground">
                {intake?.vehicle?.marque} {intake?.vehicle?.modele}
              </div>
              <div className="text-xs text-muted-foreground">
                Arrivée le {format(new Date(intake?.date_arrivee), "dd/MM/yyyy à HH:mm", { locale: fr })}
              </div>
            </div>
          </div>

          {/* Motif et impressions conducteur */}
          <div className="glass rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <Label className="text-sm font-medium">Problème signalé par le conducteur</Label>
            </div>
            
            {/* Motif de l'arrivée */}
            <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-md">
              <div className="text-sm font-medium text-orange-500">
                Motif: {intake?.motif || "Non spécifié"}
              </div>
              {intake?.motif_precision && (
                <div className="text-sm text-muted-foreground mt-1">
                  Précision: {intake.motif_precision}
                </div>
              )}
            </div>
            
            {/* Impressions du conducteur */}
            {intake?.impressions_conducteur && (
              <div>
                <Label className="text-xs text-muted-foreground">Description du conducteur:</Label>
                <div className="p-3 bg-muted/50 rounded-md text-sm mt-1">
                  "{intake.impressions_conducteur}"
                </div>
              </div>
            )}
            
            {/* Validation des impressions */}
            <div className="flex items-center gap-3 p-3 rounded-md border border-dashed">
              <Checkbox
                id="validate-impressions"
                checked={impressionsValidees}
                onCheckedChange={(checked) => setImpressionsValidees(!!checked)}
              />
              <div>
                <Label htmlFor="validate-impressions" className="text-sm cursor-pointer font-medium">
                  Problème signalé confirmé par le diagnostic
                </Label>
                <p className="text-xs text-muted-foreground">
                  Cochez si le diagnostic confirme les observations du conducteur
                </p>
              </div>
            </div>
          </div>

          {/* Assignation mécanicien */}
          <div className="glass rounded-lg p-4">
            <Label className="flex items-center gap-2 mb-2">
              <UserCheck className="h-4 w-4" />
              Mécanicien assigné
            </Label>
            <Select value={selectedMecanicien} onValueChange={setSelectedMecanicien}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un mécanicien..." />
              </SelectTrigger>
              <SelectContent>
                {personnel?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.grade} {p.prenom} {p.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Catégories de diagnostic avec checkboxes */}
          <div className="flex-1 overflow-hidden">
            <Label className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4" />
              Diagnostic ({selectedCount} problème{selectedCount > 1 ? "s" : ""} identifié{selectedCount > 1 ? "s" : ""})
            </Label>
            <ScrollArea className="h-[300px] glass rounded-lg p-2">
              <Accordion type="multiple" className="space-y-1">
                {categories?.map((category) => {
                  const catSelectedCount = category.options.filter(
                    (opt: any) => selectedOptions[opt.id]
                  ).length;
                  
                  return (
                    <AccordionItem
                      key={category.id}
                      value={category.id}
                      className="border rounded-lg px-3"
                    >
                      <AccordionTrigger className="py-2 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <span>{category.nom}</span>
                          {catSelectedCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {catSelectedCount}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-3">
                        <div className="space-y-2">
                          {category.options.map((option: any) => {
                            const isSelected = !!selectedOptions[option.id];
                            return (
                              <div
                                key={option.id}
                                className={`p-2 rounded-md border transition-all ${
                                  isSelected
                                    ? "border-amber-500 bg-amber-500/10"
                                    : "border-border hover:border-muted-foreground"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={option.id}
                                      checked={isSelected}
                                      onCheckedChange={() => handleOptionToggle(option.id)}
                                    />
                                    <Label
                                      htmlFor={option.id}
                                      className="cursor-pointer text-sm"
                                    >
                                      {option.nom}
                                    </Label>
                                  </div>
                                  {isSelected && (
                                    <Select
                                      value={selectedOptions[option.id]?.severite || "MOYEN"}
                                      onValueChange={(val) => handleSeveriteChange(option.id, val)}
                                    >
                                      <SelectTrigger className="w-28 h-7 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {SEVERITE_OPTIONS.map((sev) => (
                                          <SelectItem key={sev.value} value={sev.value}>
                                            <Badge className={sev.color}>{sev.label}</Badge>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </ScrollArea>
          </div>

          {/* Analyse du mécanicien */}
          <div className="glass rounded-lg p-4 space-y-4">
            <Label className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-amber-500" />
              Analyse et conclusions
            </Label>
            
            {/* Diagnostic réel vs signalé */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Problème signalé
                </Label>
                <div className="p-2 bg-orange-500/10 border border-orange-500/30 rounded-md text-sm min-h-[60px]">
                  {intake?.motif || "Non spécifié"}
                  {intake?.motif_precision && ` - ${intake.motif_precision}`}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Problème réel identifié
                </Label>
                <Textarea
                  value={diagnosticResume}
                  onChange={(e) => setDiagnosticResume(e.target.value)}
                  placeholder="Décrivez le vrai problème identifié..."
                  className="min-h-[60px] text-sm"
                />
              </div>
            </div>

            {/* Notes du mécanicien */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Observations et recommandations du mécanicien
              </Label>
              <Textarea
                value={notesMecanicien}
                onChange={(e) => setNotesMecanicien(e.target.value)}
                placeholder="Détails techniques, causes probables, actions recommandées..."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer le diagnostic
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
