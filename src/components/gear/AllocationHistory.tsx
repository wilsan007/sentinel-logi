import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { History, AlertCircle, Package } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

type Allocation = {
  id: string;
  quantite: number;
  date_attribution: string;
  motif: string;
  notes: string | null;
  item_variants: {
    couleur: string;
    taille: string;
    stock_items: {
      type: string;
      sous_type: string;
    };
  };
};

type AllocationHistoryProps = {
  personnelId: string;
};

export function AllocationHistory({ personnelId }: AllocationHistoryProps) {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAllocations();
  }, [personnelId]);

  const loadAllocations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("allocations")
      .select(`
        *,
        item_variants (
          couleur,
          taille,
          stock_items (
            type,
            sous_type
          )
        )
      `)
      .eq("personnel_id", personnelId)
      .order("date_attribution", { ascending: false })
      .limit(10);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setAllocations(data || []);
    setLoading(false);
  };

  const checkRecentAllocation = (itemType: string, date: string) => {
    const allocationDate = new Date(date);
    const daysSince = Math.floor(
      (Date.now() - allocationDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSince < 30;
  };

  if (loading) {
    return (
      <Card className="glass p-6 sticky top-24">
        <div className="text-center text-muted-foreground">Chargement...</div>
      </Card>
    );
  }

  return (
    <Card className="glass p-6 sticky top-24">
      <div className="flex items-center gap-2 mb-6">
        <History className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-lg">Historique des dotations</h3>
      </div>

      {allocations.length === 0 ? (
        <div className="text-center py-8">
          <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Aucune dotation enregistrée
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin pr-2">
          {allocations.map((allocation) => {
            const isRecent = checkRecentAllocation(
              allocation.item_variants.stock_items.type,
              allocation.date_attribution
            );
            
            return (
              <div
                key={allocation.id}
                className={`p-4 rounded-lg border ${
                  isRecent
                    ? "border-destructive/50 bg-destructive/10"
                    : "border-border/50 bg-muted/20"
                }`}
              >
                {isRecent && (
                  <div className="flex items-center gap-2 text-destructive text-xs mb-2">
                    <AlertCircle className="h-3 w-3" />
                    <span>Dotation récente</span>
                  </div>
                )}
                
                <div className="font-semibold text-sm mb-1">
                  {allocation.item_variants.stock_items.sous_type ||
                    allocation.item_variants.stock_items.type}
                </div>
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <span>Taille: {allocation.item_variants.taille}</span>
                    <span>•</span>
                    <span>Qté: {allocation.quantite}</span>
                  </div>
                  <div>Motif: {allocation.motif}</div>
                  <div className="text-primary">
                    {formatDistanceToNow(new Date(allocation.date_attribution), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </div>
                </div>
                
                {allocation.notes && (
                  <div className="mt-2 text-xs text-muted-foreground italic">
                    Note: {allocation.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
