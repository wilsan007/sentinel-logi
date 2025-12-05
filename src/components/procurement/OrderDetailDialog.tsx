import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, Truck, FileText, DollarSign, Building2, Calendar, MapPin, Hash, PackageCheck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { SupplierSelector } from "./SupplierSelector";
import { OrderItemsManager } from "./OrderItemsManager";
import { ProcurementWorkflowStepper } from "./ProcurementWorkflowStepper";
import { ReceiveOrderDialog } from "./ReceiveOrderDialog";
import type { Database } from "@/integrations/supabase/types";
import { motion, AnimatePresence } from "framer-motion";

type ProcurementStage = Database["public"]["Enums"]["procurement_stage"];
type TransportMode = Database["public"]["Enums"]["transport_mode"];

interface OrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  onSuccess: () => void;
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
  DRAFT: "bg-gray-500/20 text-gray-400",
  SUPPLIER_SELECTION: "bg-blue-500/20 text-blue-500",
  ORDER_PLACED: "bg-cyan-500/20 text-cyan-500",
  PAYMENT_VERIFIED: "bg-emerald-500/20 text-emerald-500",
  IN_TRANSIT: "bg-amber-500/20 text-amber-500",
  CUSTOMS_ENTRY: "bg-orange-500/20 text-orange-500",
  RECEIVED: "bg-green-500/20 text-green-500",
  CANCELLED: "bg-red-500/20 text-red-500"
};

const TRANSPORT_LABELS: Record<string, string> = {
  AIR: "Aérien",
  SEA: "Maritime",
  LAND: "Terrestre",
  MULTIMODAL: "Multimodal"
};

export const OrderDetailDialog = ({
  open,
  onOpenChange,
  orderId,
  onSuccess,
}: OrderDetailDialogProps) => {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    order_number: "",
    supplier_id: "",
    transport_mode: "" as TransportMode | "",
    expected_delivery_date: "",
    tracking_number: "",
    port_of_entry: "",
    payment_reference: "",
    notes: "",
    currency: "XAF",
  });

  useEffect(() => {
    if (open && orderId) {
      loadOrder();
      setActiveTab("general");
    }
  }, [open, orderId]);

  const loadOrder = async () => {
    if (!orderId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("procurement_orders")
      .select(`
        *,
        suppliers (id, name, code, country, rating, on_time_delivery_rate, avg_delivery_days)
      `)
      .eq("id", orderId)
      .single();

    if (data) {
      setOrder(data);
      setFormData({
        order_number: data.order_number || "",
        supplier_id: data.supplier_id || "",
        transport_mode: data.transport_mode || "",
        expected_delivery_date: data.expected_delivery_date || "",
        tracking_number: data.tracking_number || "",
        port_of_entry: data.port_of_entry || "",
        payment_reference: data.payment_reference || "",
        notes: data.notes || "",
        currency: data.currency || "XAF",
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData: any = {
        order_number: formData.order_number,
        supplier_id: formData.supplier_id || null,
        transport_mode: formData.transport_mode || null,
        expected_delivery_date: formData.expected_delivery_date || null,
        tracking_number: formData.tracking_number || null,
        port_of_entry: formData.port_of_entry || null,
        payment_reference: formData.payment_reference || null,
        notes: formData.notes || null,
        currency: formData.currency,
      };

      const { error } = await supabase
        .from("procurement_orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Commande mise à jour",
        description: "Les modifications ont été enregistrées",
      });
      
      onSuccess();
      loadOrder();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStageChange = async (newStage: ProcurementStage) => {
    try {
      const updateData: any = { stage: newStage };
      
      // Auto-fill dates based on stage
      if (newStage === "PAYMENT_VERIFIED") {
        updateData.payment_date = new Date().toISOString().split('T')[0];
      } else if (newStage === "CUSTOMS_ENTRY") {
        updateData.customs_entry_date = new Date().toISOString().split('T')[0];
      } else if (newStage === "RECEIVED") {
        updateData.actual_delivery_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from("procurement_orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Statut mis à jour",
        description: `Commande passée à: ${STAGE_LABELS[newStage]}`,
      });
      
      onSuccess();
      loadOrder();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass border border-emerald-500/20 max-w-4xl">
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
            <p className="text-muted-foreground">Chargement de la commande...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border border-emerald-500/20 max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Package className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-emerald-500">#{order?.order_number}</span>
                  <Badge className={`${STAGE_COLORS[order?.stage]} border-0`}>
                    {STAGE_LABELS[order?.stage]}
                  </Badge>
                </div>
                {order?.suppliers && (
                  <p className="text-sm text-muted-foreground font-normal">
                    {order.suppliers.name} ({order.suppliers.code})
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-500">
                {order?.total_amount?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-muted-foreground">{formData.currency}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Workflow Stepper */}
        <div className="py-4">
          <ProcurementWorkflowStepper 
            currentStage={order?.stage} 
            onStageChange={handleStageChange}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="glass border border-border/50 w-full justify-start">
              <TabsTrigger value="general" className="gap-2 data-[state=active]:text-emerald-500">
                <FileText className="h-4 w-4" />
                Général
              </TabsTrigger>
              <TabsTrigger value="supplier" className="gap-2 data-[state=active]:text-emerald-500">
                <Building2 className="h-4 w-4" />
                Fournisseur
              </TabsTrigger>
              <TabsTrigger value="items" className="gap-2 data-[state=active]:text-emerald-500">
                <Package className="h-4 w-4" />
                Articles
              </TabsTrigger>
              <TabsTrigger value="payment" className="gap-2 data-[state=active]:text-emerald-500">
                <DollarSign className="h-4 w-4" />
                Paiement
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <TabsContent value="general" className="space-y-4 mt-4">
                  {/* Quick Info Cards */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <Card className="glass border-border/50">
                      <CardContent className="p-3 flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Créée le</p>
                          <p className="text-sm font-medium">
                            {order?.created_at ? format(new Date(order.created_at), "dd MMM yyyy", { locale: fr }) : "—"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="glass border-border/50">
                      <CardContent className="p-3 flex items-center gap-3">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Transport</p>
                          <p className="text-sm font-medium">
                            {formData.transport_mode ? TRANSPORT_LABELS[formData.transport_mode] : "Non défini"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="glass border-border/50">
                      <CardContent className="p-3 flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Port d'entrée</p>
                          <p className="text-sm font-medium">{formData.port_of_entry || "Non défini"}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="glass border-border/50">
                      <CardContent className="p-3 flex items-center gap-3">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Tracking</p>
                          <p className="text-sm font-medium">{formData.tracking_number || "—"}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Numéro de commande</Label>
                      <Input
                        value={formData.order_number}
                        onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                        className="glass border-border/50 focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mode de transport</Label>
                      <Select
                        value={formData.transport_mode}
                        onValueChange={(value) => setFormData({ ...formData, transport_mode: value as TransportMode })}
                      >
                        <SelectTrigger className="glass border-border/50">
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AIR">🛫 Aérien</SelectItem>
                          <SelectItem value="SEA">🚢 Maritime</SelectItem>
                          <SelectItem value="LAND">🚛 Terrestre</SelectItem>
                          <SelectItem value="MULTIMODAL">🔄 Multimodal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date de livraison prévue</Label>
                      <Input
                        type="date"
                        value={formData.expected_delivery_date}
                        onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                        className="glass border-border/50 focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Numéro de suivi</Label>
                      <Input
                        value={formData.tracking_number}
                        onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                        placeholder="Tracking number..."
                        className="glass border-border/50 focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Port d'entrée</Label>
                      <Input
                        value={formData.port_of_entry}
                        onChange={(e) => setFormData({ ...formData, port_of_entry: e.target.value })}
                        placeholder="Ex: Douala, Kribi..."
                        className="glass border-border/50 focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Devise</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => setFormData({ ...formData, currency: value })}
                      >
                        <SelectTrigger className="glass border-border/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="XAF">XAF (FCFA)</SelectItem>
                          <SelectItem value="EUR">EUR (Euro)</SelectItem>
                          <SelectItem value="USD">USD (Dollar)</SelectItem>
                          <SelectItem value="DJF">DJF (Franc Djibouti)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Notes additionnelles, instructions spéciales..."
                      className="glass border-border/50 min-h-[100px] focus:border-emerald-500/50"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="supplier" className="mt-4">
                  <SupplierSelector
                    selectedSupplierId={formData.supplier_id}
                    onSupplierSelect={(id) => setFormData({ ...formData, supplier_id: id })}
                  />
                </TabsContent>

                <TabsContent value="items" className="mt-4">
                  <OrderItemsManager 
                    orderId={orderId!} 
                    currency={formData.currency}
                    onTotalChange={(total) => {
                      setOrder((prev: any) => prev ? { ...prev, total_amount: total } : prev);
                    }}
                  />
                </TabsContent>

                <TabsContent value="payment" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Référence de paiement</Label>
                      <Input
                        value={formData.payment_reference}
                        onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                        placeholder="Numéro de virement, chèque..."
                        className="glass border-border/50 focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date de paiement</Label>
                      <Input
                        type="date"
                        value={order?.payment_date || ""}
                        disabled
                        className="glass border-border/50 opacity-50"
                      />
                      <p className="text-xs text-muted-foreground">Renseignée automatiquement à la validation du paiement</p>
                    </div>
                  </div>
                  
                  <Card className="glass border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-lg font-medium">Montant Total à Payer</p>
                          <p className="text-sm text-muted-foreground">TVA incluse</p>
                        </div>
                        <div className="text-right">
                          <p className="text-4xl font-bold text-emerald-500">
                            {order?.total_amount?.toLocaleString() || 0}
                          </p>
                          <p className="text-sm text-muted-foreground">{formData.currency}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Timeline */}
                  <Card className="glass border-border/50">
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-3">Historique de paiement</h4>
                      <div className="space-y-3">
                        {order?.payment_date ? (
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-muted-foreground">Paiement vérifié le</span>
                            <span className="font-medium">{format(new Date(order.payment_date), "dd MMMM yyyy", { locale: fr })}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                            <span className="text-muted-foreground">Paiement en attente</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="glass border-border/50"
          >
            Fermer
          </Button>
          
          {/* Receive button - only show for IN_TRANSIT or CUSTOMS_ENTRY */}
          {(order?.stage === "IN_TRANSIT" || order?.stage === "CUSTOMS_ENTRY") && (
            <Button
              onClick={() => setReceiveDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              <PackageCheck className="h-4 w-4" />
              Réceptionner la commande
            </Button>
          )}
          
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer les modifications"
            )}
          </Button>
        </div>

        {/* Receive Order Dialog */}
        {orderId && (
          <ReceiveOrderDialog
            open={receiveDialogOpen}
            onOpenChange={setReceiveDialogOpen}
            orderId={orderId}
            onSuccess={() => {
              setReceiveDialogOpen(false);
              loadOrder();
              onSuccess();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
