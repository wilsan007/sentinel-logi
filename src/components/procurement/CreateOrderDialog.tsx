import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { Loader2, Shirt, UtensilsCrossed, ArrowRight, ArrowLeft } from "lucide-react";

type CategoryType = Database["public"]["Enums"]["category_type"];

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
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateOrderNumber = (category: CategoryType) => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    const prefix = category === "GEAR" ? "HAB" : "ALM";
    return `${prefix}-${year}${month}-${random}`;
  };

  const handleCategorySelect = (category: CategoryType) => {
    setSelectedCategory(category);
    setOrderNumber(generateOrderNumber(category));
  };

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

      const { error } = await supabase.from("procurement_orders").insert([{
        order_number: orderNumber,
        location_id: locationId,
        created_by: user.data.user?.id,
        stage: "DRAFT" as const,
      }]);

      if (error) throw error;

      toast({
        title: "Commande créée",
        description: "La commande a été créée avec succès",
      });

      onSuccess();
      onOpenChange(false);
      // Reset
      setStep(1);
      setSelectedCategory(null);
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

  const handleClose = () => {
    onOpenChange(false);
    setStep(1);
    setSelectedCategory(null);
    setOrderNumber("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass border border-emerald-500/20 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-emerald-500">Nouvelle Commande Manuelle</DialogTitle>
          <DialogDescription>
            Créer une nouvelle commande fournisseur
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Sélectionnez le type de commande
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Card
                className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                  selectedCategory === "GEAR"
                    ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500"
                    : "border-border/50 hover:border-cyan-500/50"
                }`}
                onClick={() => handleCategorySelect("GEAR")}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <Shirt className="h-6 w-6 text-cyan-500" />
                  </div>
                  <h4 className="font-semibold text-cyan-500">Habillement</h4>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                  selectedCategory === "FOOD"
                    ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500"
                    : "border-border/50 hover:border-amber-500/50"
                }`}
                onClick={() => handleCategorySelect("FOOD")}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <UtensilsCrossed className="h-6 w-6 text-amber-500" />
                  </div>
                  <h4 className="font-semibold text-amber-500">Alimentaire</h4>
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="glass border-border/50"
              >
                Annuler
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedCategory}
                className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 border border-emerald-500/30"
              >
                Suivant
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orderNumber">Numéro de commande</Label>
              <Input
                id="orderNumber"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Ex: HAB-202412-001"
                className="glass border-border/50"
              />
              <p className="text-xs text-muted-foreground">
                Préfixe automatique: {selectedCategory === "GEAR" ? "HAB" : "ALM"} pour {selectedCategory === "GEAR" ? "Habillement" : "Alimentaire"}
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="glass border-border/50"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
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
        )}
      </DialogContent>
    </Dialog>
  );
};
