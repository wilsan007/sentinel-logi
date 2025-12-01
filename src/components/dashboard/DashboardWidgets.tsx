import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, Package, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DashboardWidgetsProps {
  locationId?: string;
}

export const DashboardWidgets = ({ locationId }: DashboardWidgetsProps) => {
  const [overdueLoans, setOverdueLoans] = useState<any[]>([]);
  const [expiringBatches, setExpiringBatches] = useState<any[]>([]);
  const [suspiciousActivities, setSuspiciousActivities] = useState<any[]>([]);
  const [consumptionData, setConsumptionData] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [locationId]);

  const loadDashboardData = async () => {
    // Prêts en retard
    const { data: overdue } = await supabase.rpc('get_overdue_loans', {
      p_location_id: locationId || null
    });
    if (overdue) setOverdueLoans(overdue);

    // Lots expirant bientôt
    const { data: expiring } = await supabase.rpc('get_expiring_batches', {
      days_ahead: 30
    });
    if (expiring) setExpiringBatches(expiring);

    // Activités suspectes non revues
    const { data: suspicious } = await supabase
      .from('suspicious_activities')
      .select('*')
      .eq('reviewed', false)
      .order('detected_at', { ascending: false })
      .limit(5);
    if (suspicious) setSuspiciousActivities(suspicious);

    // Taux de consommation
    const { data: consumption } = await supabase.rpc('get_camp_consumption_rate', {
      p_location_id: locationId || null
    });
    if (consumption) setConsumptionData(consumption);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Prêts en retard */}
      <Card className="glass border-destructive/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Prêts en Retard</CardTitle>
          <Clock className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{overdueLoans.length}</div>
          <p className="text-xs text-muted-foreground">
            {overdueLoans.length > 0 ? 'Nécessite attention urgente' : 'Tout est à jour'}
          </p>
        </CardContent>
      </Card>

      {/* Lots expirants */}
      <Card className="glass border-amber-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Lots Expirants</CardTitle>
          <Package className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-500">{expiringBatches.length}</div>
          <p className="text-xs text-muted-foreground">
            Dans les 30 prochains jours
          </p>
        </CardContent>
      </Card>

      {/* Alertes sécurité */}
      <Card className="glass border-orange-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alertes Sécurité</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-500">{suspiciousActivities.length}</div>
          <p className="text-xs text-muted-foreground">
            Activités non revues
          </p>
        </CardContent>
      </Card>

      {/* Consommation */}
      <Card className="glass border-emerald-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taux Consommation</CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-500">{consumptionData.length}</div>
          <p className="text-xs text-muted-foreground">
            Articles alimentaires suivis
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
