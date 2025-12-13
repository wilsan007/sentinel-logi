import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Package, AlertTriangle } from "lucide-react";

const CATEGORIES = [
  "Filtres",
  "Huiles",
  "Freinage",
  "Électrique",
  "Allumage",
  "Courroies",
  "Suspension",
  "Pneumatiques",
  "Transmission",
  "Refroidissement",
  "Carrosserie",
  "Autre",
];

interface SparePartsRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId?: string;
  diagnosticId?: string;
  onSuccess?: () => void;
}

export function SparePartsRequestDialog({
  open,
  onOpenChange,
  vehicleId,
  diagnosticId,
  onSuccess,
}: SparePartsRequestDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    spare_part_id: "",
    part_name: "",
    part_reference: "",
    categorie: "",
    quantite_demandee: 1,
    urgence: "NORMALE",
    motif: "",
    notes: "",
  });

  // Load existing spare parts for selection
  const { data: spareParts } = useQuery({
    queryKey: ["spare-parts-for-request"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spare_parts")
        .select("id, nom, reference, categorie, quantite")
        .order("categorie, nom");
      if (error) throw error;
      return data;
    },
  });

  // Load vehicle info if provided
  const { data: vehicle } = useQuery({
    queryKey: ["vehicle-for-request", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return null;
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, immatriculation, marque, modele")
        .eq("id", vehicleId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!vehicleId,
  });

  const createRequestMutation = useMutation({
    mutationFn: async () => {
      const user = await supabase.auth.getUser();
      
      const { error } = await supabase.from("spare_parts_requests").insert({
        spare_part_id: formData.spare_part_id || null,
        part_name: formData.part_name,
        part_reference: formData.part_reference || null,
        categorie: formData.categorie,
        quantite_demandee: formData.quantite_demandee,
        urgence: formData.urgence,
        motif: formData.motif || null,
        vehicle_id: vehicleId || null,
        diagnostic_id: diagnosticId || null,
        notes: formData.notes || null,
        demande_par: user.data.user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spare-parts-requests"] });
      toast.success("Demande de pièce créée");
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      spare_part_id: "",
      part_name: "",
      part_reference: "",
      categorie: "",
      quantite_demandee: 1,
      urgence: "NORMALE",
      motif: "",
      notes: "",
    });
  };

  const handleSparePartSelect = (partId: string) => {
    const part = spareParts?.find((p) => p.id === partId);
    if (part) {
      setFormData({
        ...formData,
        spare_part_id: partId,
        part_name: part.nom,
        part_reference: part.reference,
        categorie: part.categorie,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.part_name.trim() || !formData.categorie) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    createRequestMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border border-orange-500/20 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-500">
            <Package className="h-5 w-5" />
            Demande de Pièce Détachée
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {vehicle && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-sm text-muted-foreground">Véhicule concerné</p>
              <p className="font-medium">
                {vehicle.immatriculation} - {vehicle.marque} {vehicle.modele}
              </p>
            </div>
          )}

          {/* Select existing part or create new */}
          <div className="space-y-2">
            <Label>Pièce existante (optionnel)</Label>
            <Select
              value={formData.spare_part_id}
              onValueChange={handleSparePartSelect}
            >
              <SelectTrigger className="glass border-border/50">
                <SelectValue placeholder="Sélectionner une pièce du catalogue..." />
              </SelectTrigger>
              <SelectContent>
                {spareParts?.map((part) => (
                  <SelectItem key={part.id} value={part.id}>
                    {part.nom} ({part.reference}) - Stock: {part.quantite}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Ou remplissez manuellement les champs ci-dessous pour une nouvelle pièce
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom de la pièce *</Label>
              <Input
                value={formData.part_name}
                onChange={(e) =>
                  setFormData({ ...formData, part_name: e.target.value })
                }
                placeholder="Ex: Filtre à huile"
                className="glass border-border/50"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Référence</Label>
              <Input
                value={formData.part_reference}
                onChange={(e) =>
                  setFormData({ ...formData, part_reference: e.target.value })
                }
                placeholder="Ex: FLT-OIL-001"
                className="glass border-border/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Catégorie *</Label>
              <Select
                value={formData.categorie}
                onValueChange={(value) =>
                  setFormData({ ...formData, categorie: value })
                }
                required
              >
                <SelectTrigger className="glass border-border/50">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantité *</Label>
              <Input
                type="number"
                min={1}
                value={formData.quantite_demandee}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantite_demandee: parseInt(e.target.value) || 1,
                  })
                }
                className="glass border-border/50"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Urgence</Label>
            <Select
              value={formData.urgence}
              onValueChange={(value) =>
                setFormData({ ...formData, urgence: value })
              }
            >
              <SelectTrigger className="glass border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BASSE">Basse</SelectItem>
                <SelectItem value="NORMALE">Normale</SelectItem>
                <SelectItem value="HAUTE">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Haute
                  </span>
                </SelectItem>
                <SelectItem value="CRITIQUE">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Critique
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Motif de la demande</Label>
            <Textarea
              value={formData.motif}
              onChange={(e) =>
                setFormData({ ...formData, motif: e.target.value })
              }
              placeholder="Pourquoi cette pièce est nécessaire..."
              className="glass border-border/50 min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Notes additionnelles</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Informations complémentaires..."
              className="glass border-border/50 min-h-[60px]"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="glass border-border/50"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={createRequestMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {createRequestMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                "Créer la demande"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
