import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  onSuccess: () => void;
}

export const CreateOrderDialog = ({
  open,
  onOpenChange,
  locationId,
  onSuccess,
}: CreateOrderDialogProps) => {
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderNumber.trim()) {
      toast({
        title: "Erreur",
        description: "Le numéro de commande est requis",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const user = await supabase.auth.getUser();

      const { error } = await supabase.from("procurement_orders").insert({
        order_number: orderNumber,
        location_id: locationId,
        created_by: user.data.user?.id,
        stage: "DRAFT",
      });

      if (error) throw error;

      toast({
        title: "Commande créée",
        description: "La commande a été créée avec succès",
      });

      onSuccess();
      onOpenChange(false);
      setOrderNumber("");
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
      <DialogContent className="glass border border-emerald-500/20">
        <DialogHeader>
          <DialogTitle className="text-emerald-500">Nouvelle Commande</DialogTitle>
          <DialogDescription>
            Créer une nouvelle commande fournisseur
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orderNumber">Numéro de commande</Label>
            <Input
              id="orderNumber"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Ex: PO-2024-001"
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
              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 border border-emerald-500/30"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                "Créer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
