import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Search, 
  Plus, 
  ShoppingCart, 
  Eye, 
  Filter,
  ChevronDown,
  Wand2,
  Truck,
  FileText,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateOrderDialog } from "./CreateOrderDialog";
import { SmartPurchaseWizard } from "./SmartPurchaseWizard";
import { OrderDetailDialog } from "./OrderDetailDialog";

interface ProcurementManagerProps {
  locationId: string;
}

const STAGE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: "Brouillon", color: "bg-gray-500/20 text-gray-400", icon: FileText },
  SUPPLIER_SELECTION: { label: "Sélection fournisseur", color: "bg-blue-500/20 text-blue-500", icon: Search },
  ORDER_PLACED: { label: "Commande passée", color: "bg-cyan-500/20 text-cyan-500", icon: ShoppingCart },
  PAYMENT_VERIFIED: { label: "Paiement vérifié", color: "bg-emerald-500/20 text-emerald-500", icon: CheckCircle },
  IN_TRANSIT: { label: "En transit", color: "bg-amber-500/20 text-amber-500", icon: Truck },
  CUSTOMS_ENTRY: { label: "En douane", color: "bg-orange-500/20 text-orange-500", icon: FileText },
  RECEIVED: { label: "Reçu", color: "bg-green-500/20 text-green-500", icon: CheckCircle },
  CANCELLED: { label: "Annulé", color: "bg-red-500/20 text-red-500", icon: XCircle }
};

type Order = {
  id: string;
  order_number: string;
  stage: string;
  total_amount: number | null;
  currency: string;
  created_at: string;
  expected_delivery_date: string | null;
  suppliers: { name: string; code: string } | null;
  procurement_order_items: Array<{
    quantity_ordered: number;
    stock_items: { type: string };
  }>;
};

export function ProcurementManager({ locationId }: ProcurementManagerProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [smartWizardOpen, setSmartWizardOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (locationId) {
      loadOrders();
    }
  }, [locationId]);

  const loadOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("procurement_orders")
      .select(`
        *,
        suppliers (name, code),
        procurement_order_items (
          quantity_ordered,
          stock_items (type)
        )
      `)
      .eq("location_id", locationId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger les commandes", variant: "destructive" });
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.suppliers?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStage = filterStage === "all" || order.stage === filterStage;

    return matchesSearch && matchesStage;
  });

  const stats = {
    total: orders.length,
    inProgress: orders.filter(o => !["RECEIVED", "CANCELLED"].includes(o.stage || "")).length,
    completed: orders.filter(o => o.stage === "RECEIVED").length
  };

  const handleOpenDetail = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass p-6 neon-border-emerald">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <ShoppingCart className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total commandes</p>
                <p className="text-3xl font-bold text-emerald-500">{stats.total}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En cours</p>
                <p className="text-3xl font-bold text-amber-500">{stats.inProgress}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reçues</p>
                <p className="text-3xl font-bold text-primary">{stats.completed}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Search, Filters, and Actions */}
      <Card className="glass p-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center flex-1">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par n° commande ou fournisseur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 glass">
                  <Filter className="h-4 w-4" />
                  Étape: {filterStage === "all" ? "Toutes" : STAGE_CONFIG[filterStage]?.label || filterStage}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilterStage("all")}>Toutes les étapes</DropdownMenuItem>
                {Object.entries(STAGE_CONFIG).map(([key, config]) => (
                  <DropdownMenuItem key={key} onClick={() => setFilterStage(key)}>
                    {config.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setSmartWizardOpen(true)}
              className="gap-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-500 border border-emerald-500/30"
            >
              <Wand2 className="h-4 w-4" />
              Smart Purchase
            </Button>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              variant="outline"
              className="gap-2 glass"
            >
              <Plus className="h-4 w-4" />
              Commande manuelle
            </Button>
          </div>
        </div>
      </Card>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card className="glass p-12 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            {searchTerm || filterStage !== "all" 
              ? "Aucune commande trouvée avec ces critères"
              : "Aucune commande fournisseur"}
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => setSmartWizardOpen(true)} className="gap-2">
              <Wand2 className="h-4 w-4" />
              Créer avec Smart Purchase
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {filteredOrders.map((order, index) => {
              const stageConfig = STAGE_CONFIG[order.stage || "DRAFT"];
              const StageIcon = stageConfig?.icon || FileText;
              const totalItems = order.procurement_order_items?.reduce((sum, item) => sum + item.quantity_ordered, 0) || 0;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="glass p-6 hover:bg-muted/10 transition-colors cursor-pointer"
                    onClick={() => handleOpenDetail(order.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className={`p-3 rounded-xl ${stageConfig?.color.split(" ")[0]}`}>
                          <StageIcon className={`h-6 w-6 ${stageConfig?.color.split(" ")[1]}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-emerald-500">#{order.order_number}</h3>
                            <Badge className={stageConfig?.color}>
                              {stageConfig?.label}
                            </Badge>
                          </div>
                          
                          {order.suppliers && (
                            <p className="text-sm text-muted-foreground">
                              {order.suppliers.name} ({order.suppliers.code})
                            </p>
                          )}

                          <div className="flex items-center gap-4 mt-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Articles: </span>
                              <span className="font-medium">{order.procurement_order_items?.length || 0}</span>
                              <span className="text-muted-foreground"> ({totalItems} unités)</span>
                            </div>
                            {order.total_amount && (
                              <div>
                                <span className="text-muted-foreground">Montant: </span>
                                <span className="font-bold text-emerald-500">
                                  {order.total_amount.toLocaleString()} {order.currency}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>
                              Créée: {format(new Date(order.created_at), "dd MMM yyyy", { locale: fr })}
                            </span>
                            {order.expected_delivery_date && (
                              <span>
                                Livraison prévue: {format(new Date(order.expected_delivery_date), "dd MMM yyyy", { locale: fr })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(order.id);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Dialogs */}
      <CreateOrderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        locationId={locationId}
        onSuccess={() => {
          loadOrders();
          setCreateDialogOpen(false);
          toast({ title: "Commande créée", description: "La commande a été enregistrée avec succès" });
        }}
      />

      <SmartPurchaseWizard
        open={smartWizardOpen}
        onOpenChange={setSmartWizardOpen}
        locationId={locationId}
        onSuccess={() => {
          loadOrders();
          setSmartWizardOpen(false);
        }}
      />

      <OrderDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        orderId={selectedOrderId}
        onSuccess={() => {
          loadOrders();
        }}
      />
    </div>
  );
}
