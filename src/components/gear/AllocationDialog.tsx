import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type AllocationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnel: {
    id: string;
    nom: string;
    prenom: string;
    matricule: string;
  };
  variant: {
    id: string;
    quantite: number;
  };
  itemName: string;
  onSuccess: () => void;
};

const MOTIFS = [
  "Dotation initiale",
  "Remplacement",
  "Usure",
  "Perte",
  "Mission spéciale",
  "Promotion",
  "Autre",
];

export function AllocationDialog({
  open,
  onOpenChange,
  personnel,
  variant,
  itemName,
  onSuccess,
}: AllocationDialogProps) {
  const [quantite, setQuantite] = useState(1);
  const [motif, setMotif] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!motif) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un motif",
        variant: "destructive",
      });
      return;
    }

    if (quantite > variant.quantite) {
      toast({
        title: "Erreur",
        description: "Quantité demandée supérieure au stock disponible",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const user = await supabase.auth.getUser();
      
      // Créer l'allocation
      const { error: allocationError } = await supabase
        .from("allocations")
        .insert({
          personnel_id: personnel.id,
          item_variant_id: variant.id,
          quantite: quantite,
          motif: motif,
          notes: notes || null,
          attribue_par: user.data.user?.id,
        });

      if (allocationError) throw allocationError;

      // Mettre à jour le stock
      const { error: updateError } = await supabase
        .from("item_variants")
        .update({ quantite: variant.quantite - quantite })
        .eq("id", variant.id);

      if (updateError) throw updateError;

      toast({
        title: "Dotation enregistrée",
        description: `${quantite}x ${itemName} attribué(s) à ${personnel.prenom} ${personnel.nom}`,
      });

      onSuccess();
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setQuantite(1);
    setMotif("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border border-primary/20 max-w-md shadow-[0_0_30px_rgba(var(--primary),0.15)]">
        <DialogHeader>
          <DialogTitle className="neon-text-primary text-xl flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse"></span>
            Confirmer la dotation
          </DialogTitle>
          <DialogDescription className="text-base">
            Attribution de <span className="text-primary font-medium">{itemName}</span> à{" "}
            <span className="text-foreground font-medium">
              {personnel.prenom} {personnel.nom}
            </span>{" "}
            <span className="text-muted-foreground">({personnel.matricule})</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2 p-4 glass rounded-lg border border-primary/10">
            <Label htmlFor="quantite" className="text-sm font-medium flex items-center gap-2">
              Quantité
              <span className="text-xs text-muted-foreground">(obligatoire)</span>
            </Label>
            <Input
              id="quantite"
              type="number"
              min={1}
              max={variant.quantite}
              value={quantite}
              onChange={(e) => setQuantite(parseInt(e.target.value) || 1)}
              className="glass border-border/50 text-lg font-semibold"
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Stock disponible:</span>
              <span className={`font-medium ${
                variant.quantite <= 5 ? "text-amber-500" : "text-emerald-500"
              }`}>
                {variant.quantite} unité{variant.quantite > 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="space-y-2 p-4 glass rounded-lg border border-primary/10">
            <Label htmlFor="motif" className="text-sm font-medium flex items-center gap-2">
              Motif
              <span className="text-destructive">*</span>
            </Label>
            <Select value={motif} onValueChange={setMotif}>
              <SelectTrigger className="glass border-border/50 bg-card/80">
                <SelectValue placeholder="Sélectionnez un motif" />
              </SelectTrigger>
              <SelectContent className="glass border border-border/50 bg-card z-50">
                {MOTIFS.map((m) => (
                  <SelectItem key={m} value={m} className="hover:bg-primary/10">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Le motif est obligatoire pour la traçabilité
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium flex items-center gap-2">
              Notes
              <span className="text-xs text-muted-foreground">(optionnel)</span>
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Exemple: Taille ajustée, remplacement suite à dommage..."
              className="glass border-border/50 min-h-[80px]"
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
              disabled={loading}
              className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Confirmer la dotation"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
