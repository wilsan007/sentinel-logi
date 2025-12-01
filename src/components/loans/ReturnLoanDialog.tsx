import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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

const RETURN_REASONS = [
  { value: "END_OF_LOAN", label: "Fin de prêt" },
  { value: "DAMAGED_EXCHANGE", label: "Échange (endommagé)" },
  { value: "SIZE_EXCHANGE", label: "Échange (taille)" },
  { value: "RETIRED", label: "Retraité" },
  { value: "REVOKED", label: "Révoqué" },
  { value: "REFORMED", label: "Réformé" },
];

interface ReturnLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: any;
  onSuccess: () => void;
}

export const ReturnLoanDialog = ({
  open,
  onOpenChange,
  loan,
  onSuccess,
}: ReturnLoanDialogProps) => {
  const [returnReason, setReturnReason] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!returnReason) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une raison de retour",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const user = await supabase.auth.getUser();

      // Create return transaction
      const { error: returnError } = await supabase.from("allocations").insert([{
        personnel_id: loan.personnel_id,
        item_variant_id: loan.item_variant_id,
        quantite: loan.quantite,
        motif: "Retour de prêt",
        transaction_type: "RETURN" as const,
        return_reason: returnReason as any,
        notes: notes || null,
        attribue_par: user.data.user?.id || "",
        parent_allocation_id: loan.id,
      }]);

      if (returnError) throw returnError;

      // Mark original loan as inactive
      const { error: updateError } = await supabase
        .from("allocations")
        .update({
          is_active: false,
          actual_return_date: new Date().toISOString().split('T')[0],
        })
        .eq("id", loan.id);

      if (updateError) throw updateError;

      // Update stock quantity
      const { error: stockError } = await supabase
        .from("item_variants")
        .update({
          quantite: loan.item_variants.quantite + loan.quantite,
        })
        .eq("id", loan.item_variant_id);

      if (stockError) throw stockError;

      toast({
        title: "Retour enregistré",
        description: "Le retour a été traité avec succès",
      });

      onSuccess();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border border-violet-500/20">
        <DialogHeader>
          <DialogTitle className="text-violet-500">Retour de Prêt</DialogTitle>
          <DialogDescription>
            Enregistrer le retour de l'équipement prêté à{" "}
            {loan.personnel?.prenom} {loan.personnel?.nom}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="returnReason">Raison du retour *</Label>
            <Select value={returnReason} onValueChange={setReturnReason}>
              <SelectTrigger className="glass border-border/50">
                <SelectValue placeholder="Sélectionnez une raison" />
              </SelectTrigger>
              <SelectContent className="glass border border-border/50">
                {RETURN_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="État de l'équipement, observations..."
              className="glass border-border/50"
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
              className="bg-violet-500/20 hover:bg-violet-500/30 text-violet-500 border border-violet-500/30"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                "Confirmer le retour"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
