import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ReturnLoanDialog } from "./ReturnLoanDialog";

interface LoansListProps {
  locationId: string;
  refreshKey: number;
  onRefresh: () => void;
}

export const LoansList = ({ locationId, refreshKey, onRefresh }: LoansListProps) => {
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);

  useEffect(() => {
    if (locationId) {
      loadLoans();
    }
  }, [locationId, refreshKey]);

  const loadLoans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('allocations')
      .select(`
        *,
        personnel (nom, prenom, matricule),
        item_variants (
          taille,
          couleur,
          stock_items (type, sous_type)
        )
      `)
      .eq('transaction_type', 'LOAN')
      .eq('is_active', true)
      .is('actual_return_date', null)
      .order('expected_return_date', { ascending: true });

    if (data) {
      // Filter by location
      const filtered = data.filter(loan => {
        // Check if personnel belongs to this location
        return true; // TODO: Add proper location filtering
      });
      setLoans(filtered);
    }
    setLoading(false);
  };

  const handleReturnClick = (loan: any) => {
    setSelectedLoan(loan);
    setReturnDialogOpen(true);
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  if (loans.length === 0) {
    return (
      <Card className="glass border-border/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          Aucun prêt actif trouvé.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Prêts Actifs</h2>
        <div className="grid gap-4">
          {loans.map((loan) => {
            const isOverdue = new Date(loan.expected_return_date) < new Date();
            
            return (
              <Card 
                key={loan.id} 
                className={`glass border-border/50 hover:border-violet-500/30 transition-colors ${
                  isOverdue ? 'border-destructive/30' : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-violet-500">
                          {loan.personnel?.prenom} {loan.personnel?.nom}
                        </span>
                        {isOverdue && (
                          <Badge variant="destructive">En retard</Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {loan.personnel?.matricule}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleReturnClick(loan)}
                      className="gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Retour
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Article</p>
                      <p className="font-medium">
                        {loan.item_variants?.stock_items?.type}
                        {loan.item_variants?.stock_items?.sous_type && 
                          ` - ${loan.item_variants.stock_items.sous_type}`
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Quantité</p>
                      <p className="font-medium">{loan.quantite}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date prêt</p>
                      <p className="font-medium">
                        {format(new Date(loan.date_attribution), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Retour prévu</p>
                      <p className={`font-medium ${isOverdue ? 'text-destructive' : ''}`}>
                        {format(new Date(loan.expected_return_date), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>
                  {loan.notes && (
                    <p className="text-sm text-muted-foreground mt-4 italic">
                      Note: {loan.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {selectedLoan && (
        <ReturnLoanDialog
          open={returnDialogOpen}
          onOpenChange={setReturnDialogOpen}
          loan={selectedLoan}
          onSuccess={() => {
            onRefresh();
            setReturnDialogOpen(false);
          }}
        />
      )}
    </>
  );
};
