import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { OrderDetailDialog } from "./OrderDetailDialog";

interface ProcurementOrdersListProps {
  locationId: string;
  refreshKey: number;
  onRefresh: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  SUPPLIER_SELECTION: "Sélection fournisseur",
  ORDER_PLACED: "Commande passée",
  PAYMENT_VERIFIED: "Paiement vérifié",
  IN_TRANSIT: "En transit",
  CUSTOMS_ENTRY: "En douane",
  RECEIVED: "Reçu",
  CANCELLED: "Annulé"
};

const STAGE_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-500/20 text-gray-500",
  SUPPLIER_SELECTION: "bg-blue-500/20 text-blue-500",
  ORDER_PLACED: "bg-cyan-500/20 text-cyan-500",
  PAYMENT_VERIFIED: "bg-emerald-500/20 text-emerald-500",
  IN_TRANSIT: "bg-amber-500/20 text-amber-500",
  CUSTOMS_ENTRY: "bg-orange-500/20 text-orange-500",
  RECEIVED: "bg-green-500/20 text-green-500",
  CANCELLED: "bg-red-500/20 text-red-500"
};

export const ProcurementOrdersList = ({ locationId, refreshKey, onRefresh }: ProcurementOrdersListProps) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    if (locationId) {
      loadOrders();
    }
  }, [locationId, refreshKey]);

  const loadOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('procurement_orders')
      .select(`
        *,
        suppliers (name, code),
        procurement_order_items (
          quantity_ordered,
          stock_items (type, sous_type)
        )
      `)
      .eq('location_id', locationId)
      .order('created_at', { ascending: false });

    if (data) {
      setOrders(data);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  const filteredOrders = orders.filter(
    (order) =>
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.suppliers?.name && order.suppliers.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenDetail = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailDialogOpen(true);
  };

  if (orders.length === 0) {
    return (
      <Card className="glass border-border/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          Aucune commande trouvée. Créez votre première commande fournisseur.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Commandes Fournisseurs</h2>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher..."
            className="pl-10 glass border-border/50"
          />
        </div>
      </div>
      <div className="grid gap-4">
        {filteredOrders.map((order) => (
          <Card key={order.id} className="glass border-border/50 hover:border-emerald-500/30 transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-emerald-500">#{order.order_number}</span>
                    <Badge className={STAGE_COLORS[order.stage]}>
                      {STAGE_LABELS[order.stage]}
                    </Badge>
                  </CardTitle>
                  {order.suppliers && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Fournisseur: {order.suppliers.name} ({order.suppliers.code})
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleOpenDetail(order.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleOpenDetail(order.id)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Articles</p>
                  <p className="font-medium">{order.procurement_order_items?.length || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Montant total</p>
                  <p className="font-medium">{order.total_amount ? `${order.total_amount.toLocaleString()} ${order.currency}` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date création</p>
                  <p className="font-medium">
                    {format(new Date(order.created_at), 'dd MMM yyyy', { locale: fr })}
                  </p>
                </div>
                {order.expected_delivery_date && (
                  <div>
                    <p className="text-muted-foreground">Livraison prévue</p>
                    <p className="font-medium">
                      {format(new Date(order.expected_delivery_date), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <OrderDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        orderId={selectedOrderId}
        onSuccess={() => {
          onRefresh();
          loadOrders();
        }}
      />
    </div>
  );
};
