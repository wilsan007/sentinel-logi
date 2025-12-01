import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OverdueLoansWidgetProps {
  locationId: string;
}

export const OverdueLoansWidget = ({ locationId }: OverdueLoansWidgetProps) => {
  const [overdueLoans, setOverdueLoans] = useState<any[]>([]);

  useEffect(() => {
    if (locationId) {
      loadOverdueLoans();
    }
  }, [locationId]);

  const loadOverdueLoans = async () => {
    const { data } = await supabase.rpc('get_overdue_loans', {
      p_location_id: locationId
    });

    if (data) {
      setOverdueLoans(data);
    }
  };

  if (overdueLoans.length === 0) {
    return null;
  }

  return (
    <Card className="glass border-destructive/30 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Prêts en Retard ({overdueLoans.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {overdueLoans.slice(0, 5).map((loan) => (
            <div
              key={loan.allocation_id}
              className="flex items-center justify-between p-3 glass rounded-lg border border-destructive/20"
            >
              <div>
                <p className="font-medium">
                  {loan.personnel_prenom} {loan.personnel_nom}
                </p>
                <p className="text-sm text-muted-foreground">
                  {loan.item_type} {loan.item_subtype && `- ${loan.item_subtype}`}
                </p>
              </div>
              <Badge variant="destructive">
                {loan.days_overdue} jour{loan.days_overdue > 1 ? 's' : ''} de retard
              </Badge>
            </div>
          ))}
          {overdueLoans.length > 5 && (
            <p className="text-sm text-muted-foreground text-center">
              Et {overdueLoans.length - 5} autre{overdueLoans.length - 5 > 1 ? 's' : ''}...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
