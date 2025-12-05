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
  Clock,
  Package,
  ArrowUpRight,
  Calendar,
  DollarSign,
  Building2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CreateOrderDialog } from "./CreateOrderDialog";
import { SmartPurchaseWizard } from "./SmartPurchaseWizard";
import { OrderDetailDialog } from "./OrderDetailDialog";
import { Progress } from "@/components/ui/progress";

interface ProcurementManagerProps {
  locationId: string;
}

const STAGE_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any; progress: number }> = {
  DRAFT: { label: "Brouillon", color: "text-gray-400", bgColor: "bg-gray-500/20", icon: FileText, progress: 0 },
  SUPPLIER_SELECTION: { label: "Sélection fournisseur", color: "text-blue-500", bgColor: "bg-blue-500/20", icon: Search, progress: 15 },
  ORDER_PLACED: { label: "Commande passée", color: "text-cyan-500", bgColor: "bg-cyan-500/20", icon: ShoppingCart, progress: 30 },
  PAYMENT_VERIFIED: { label: "Paiement vérifié", color: "text-emerald-500", bgColor: "bg-emerald-500/20", icon: CheckCircle, progress: 50 },
  IN_TRANSIT: { label: "En transit", color: "text-amber-500", bgColor: "bg-amber-500/20", icon: Truck, progress: 70 },
  CUSTOMS_ENTRY: { label: "En douane", color: "text-orange-500", bgColor: "bg-orange-500/20", icon: Building2, progress: 85 },
  RECEIVED: { label: "Reçu", color: "text-green-500", bgColor: "bg-green-500/20", icon: CheckCircle, progress: 100 },
  CANCELLED: { label: "Annulé", color: "text-red-500", bgColor: "bg-red-500/20", icon: XCircle, progress: 0 }
};

type Order = {
  id: string;
  order_number: string;
  stage: string;
  total_amount: number | null;
  currency: string;
  created_at: string;
  expected_delivery_date: string | null;
  suppliers: { name: string; code: string; country: string | null } | null;
  procurement_order_items: Array<{
    quantity_ordered: number;
    stock_items: { type: string; sous_type: string | null };
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
        suppliers (name, code, country),
        procurement_order_items (
          quantity_ordered,
          stock_items (type, sous_type)
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
    completed: orders.filter(o => o.stage === "RECEIVED").length,
    totalValue: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
  };

  const handleOpenDetail = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          <p className="text-muted-foreground">Chargement des commandes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass p-5 neon-border-emerald hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <ShoppingCart className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total commandes</p>
                <p className="text-3xl font-bold text-emerald-500">{stats.total}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass p-5 hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">En cours</p>
                <p className="text-3xl font-bold text-amber-500">{stats.inProgress}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass p-5 hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Reçues</p>
                <p className="text-3xl font-bold text-green-500">{stats.completed}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass p-5 hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Valeur totale</p>
                <p className="text-2xl font-bold text-primary">{stats.totalValue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">XAF</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Search, Filters, and Actions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="glass p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par n° commande ou fournisseur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 glass border-border/50 focus:border-emerald-500/50"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 glass border-border/50">
                    <Filter className="h-4 w-4" />
                    {filterStage === "all" ? "Toutes les étapes" : STAGE_CONFIG[filterStage]?.label || filterStage}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={() => setFilterStage("all")}>
                    <Package className="h-4 w-4 mr-2" />
                    Toutes les étapes
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {Object.entries(STAGE_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <DropdownMenuItem key={key} onClick={() => setFilterStage(key)} className="gap-2">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        {config.label}
                      </DropdownMenuItem>
                    );
                  })}
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
                className="gap-2 glass border-border/50"
              >
                <Plus className="h-4 w-4" />
                Commande manuelle
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="glass p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <ShoppingCart className="h-10 w-10 text-emerald-500/50" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm || filterStage !== "all" 
                ? "Aucune commande trouvée"
                : "Aucune commande fournisseur"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchTerm || filterStage !== "all"
                ? "Essayez de modifier vos critères de recherche ou de filtrage."
                : "Créez votre première commande fournisseur avec l'assistant Smart Purchase pour une expérience guidée."}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setSmartWizardOpen(true)} className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white">
                <Wand2 className="h-4 w-4" />
                Créer avec Smart Purchase
              </Button>
              <Button onClick={() => setCreateDialogOpen(true)} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Commande manuelle
              </Button>
            </div>
          </Card>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order, index) => {
              const stageConfig = STAGE_CONFIG[order.stage || "DRAFT"];
              const StageIcon = stageConfig?.icon || FileText;
              const totalItems = order.procurement_order_items?.reduce((sum, item) => sum + item.quantity_ordered, 0) || 0;
              const uniqueProducts = order.procurement_order_items?.length || 0;
              const isActive = !["RECEIVED", "CANCELLED"].includes(order.stage || "");

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  <Card 
                    className={`glass p-0 overflow-hidden hover:bg-muted/10 transition-all duration-300 cursor-pointer group ${
                      isActive ? "border-l-2 border-l-emerald-500" : ""
                    }`}
                    onClick={() => handleOpenDetail(order.id)}
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Stage Icon */}
                        <div className={`p-3 rounded-xl ${stageConfig?.bgColor} transition-transform group-hover:scale-110`}>
                          <StageIcon className={`h-6 w-6 ${stageConfig?.color}`} />
                        </div>
                        
                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-lg text-emerald-500">#{order.order_number}</h3>
                                <Badge className={`${stageConfig?.bgColor} ${stageConfig?.color} border-0`}>
                                  {stageConfig?.label}
                                </Badge>
                              </div>
                              
                              {order.suppliers ? (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {order.suppliers.name} ({order.suppliers.code})
                                  {order.suppliers.country && <span>• {order.suppliers.country}</span>}
                                </p>
                              ) : (
                                <p className="text-sm text-muted-foreground italic">Aucun fournisseur sélectionné</p>
                              )}
                            </div>
                            
                            {/* Amount */}
                            {order.total_amount ? (
                              <div className="text-right">
                                <p className="text-2xl font-bold text-emerald-500">
                                  {order.total_amount.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">{order.currency}</p>
                              </div>
                            ) : null}
                          </div>

                          {/* Items Preview */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {order.procurement_order_items?.slice(0, 3).map((item, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs font-normal">
                                {item.stock_items?.type}
                                {item.stock_items?.sous_type && ` - ${item.stock_items.sous_type}`}
                                <span className="ml-1 opacity-60">×{item.quantity_ordered}</span>
                              </Badge>
                            ))}
                            {order.procurement_order_items && order.procurement_order_items.length > 3 && (
                              <Badge variant="outline" className="text-xs font-normal">
                                +{order.procurement_order_items.length - 3} autres
                              </Badge>
                            )}
                          </div>

                          {/* Footer Info */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                {uniqueProducts} produits ({totalItems} unités)
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(order.created_at), "dd MMM yyyy", { locale: fr })}
                              </span>
                              {order.expected_delivery_date && (
                                <span className="flex items-center gap-1 text-amber-500">
                                  <Truck className="h-3 w-3" />
                                  Livraison: {format(new Date(order.expected_delivery_date), "dd MMM", { locale: fr })}
                                </span>
                              )}
                            </div>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetail(order.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                            >
                              Voir détails
                              <ArrowUpRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress Bar for active orders */}
                      {isActive && (
                        <div className="mt-4 pt-3 border-t border-border/30">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>Progression</span>
                            <span>{stageConfig?.progress}%</span>
                          </div>
                          <Progress value={stageConfig?.progress} className="h-1.5" />
                        </div>
                      )}
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
