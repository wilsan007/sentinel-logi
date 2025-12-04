import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, Package, TrendingUp, PackageX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DashboardWidgetsProps {
  locationId?: string;
}

type LowStockItem = {
  id: string;
  quantite: number;
  seuil_alerte: number;
  item_type: string;
  item_subtype: string;
};

export const DashboardWidgets = ({ locationId }: DashboardWidgetsProps) => {
  const [overdueLoans, setOverdueLoans] = useState<any[]>([]);
  const [expiringBatches, setExpiringBatches] = useState<any[]>([]);
  const [suspiciousActivities, setSuspiciousActivities] = useState<any[]>([]);
  const [consumptionData, setConsumptionData] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);

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

    // Stock faible - items en dessous du seuil d'alerte ou à zéro
    let query = supabase
      .from('item_variants')
      .select(`
        id,
        quantite,
        seuil_alerte,
        stock_items!inner(type, sous_type, categorie)
      `);

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data: allStock } = await query;
    
    if (allStock) {
      // Filter client-side: items where quantite = 0 OR quantite <= seuil_alerte
      const lowStockData = allStock.filter((item: any) => {
        const threshold = item.seuil_alerte || 10;
        return item.quantite === 0 || item.quantite <= threshold;
      });
      
      const formatted = lowStockData.map((item: any) => ({
        id: item.id,
        quantite: item.quantite,
        seuil_alerte: item.seuil_alerte || 10,
        item_type: item.stock_items.type,
        item_subtype: item.stock_items.sous_type
      }));
      setLowStockItems(formatted);
    }
  };

  const criticalStock = lowStockItems.filter(i => i.quantite === 0);
  const lowStock = lowStockItems.filter(i => i.quantite > 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Stock Critique */}
        <Card className="glass border-red-500/30 bg-red-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Critique</CardTitle>
            <PackageX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{criticalStock.length}</div>
            <p className="text-xs text-muted-foreground">
              {criticalStock.length > 0 ? 'Produits en rupture!' : 'Aucune rupture'}
            </p>
          </CardContent>
        </Card>

        {/* Stock Faible */}
        <Card className="glass border-amber-500/30 bg-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Faible</CardTitle>
            <Package className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{lowStock.length}</div>
            <p className="text-xs text-muted-foreground">
              Sous seuil d'alerte
            </p>
          </CardContent>
        </Card>

        {/* Prêts en retard */}
        <Card className="glass border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prêts en Retard</CardTitle>
            <Clock className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueLoans.length}</div>
            <p className="text-xs text-muted-foreground">
              {overdueLoans.length > 0 ? 'Nécessite attention' : 'Tout est à jour'}
            </p>
          </CardContent>
        </Card>

        {/* Lots expirants */}
        <Card className="glass border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lots Expirants</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{expiringBatches.length}</div>
            <p className="text-xs text-muted-foreground">
              Dans les 30 jours
            </p>
          </CardContent>
        </Card>

        {/* Consommation */}
        <Card className="glass border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consommation</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{consumptionData.length}</div>
            <p className="text-xs text-muted-foreground">
              Articles suivis
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Détail des alertes stock */}
      {lowStockItems.length > 0 && (
        <Card className="glass border-amber-500/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PackageX className="h-5 w-5 text-amber-500" />
              Alertes Stock - Détail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {lowStockItems.map((item) => (
                  <div 
                    key={item.id} 
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      item.quantite === 0 
                        ? 'bg-red-500/10 border border-red-500/30' 
                        : 'bg-amber-500/10 border border-amber-500/30'
                    }`}
                  >
                    <div>
                      <p className="font-medium">{item.item_subtype || item.item_type}</p>
                      <p className="text-xs text-muted-foreground">{item.item_type}</p>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={item.quantite === 0 ? "destructive" : "outline"}
                        className={item.quantite === 0 ? "" : "border-amber-500 text-amber-500"}
                      >
                        {item.quantite === 0 ? 'RUPTURE' : `${item.quantite} unités`}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Seuil: {item.seuil_alerte}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
