import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Loader2, Package, Truck, FileText, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { SupplierSelector } from "./SupplierSelector";
import { OrderItemsManager } from "./OrderItemsManager";
import { ProcurementWorkflowStepper } from "./ProcurementWorkflowStepper";
import type { Database } from "@/integrations/supabase/types";

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
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border border-emerald-500/20 max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-emerald-500">Commande #{order?.order_number}</span>
            <Badge className={`${
              order?.stage === 'RECEIVED' ? 'bg-green-500/20 text-green-500' :
              order?.stage === 'CANCELLED' ? 'bg-red-500/20 text-red-500' :
              'bg-emerald-500/20 text-emerald-500'
            }`}>
              {STAGE_LABELS[order?.stage]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Workflow Stepper */}
        <ProcurementWorkflowStepper 
          currentStage={order?.stage} 
          onStageChange={handleStageChange}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="glass border border-border/50">
            <TabsTrigger value="general" className="gap-2">
              <FileText className="h-4 w-4" />
              Général
            </TabsTrigger>
            <TabsTrigger value="supplier" className="gap-2">
              <Truck className="h-4 w-4" />
              Fournisseur
            </TabsTrigger>
            <TabsTrigger value="items" className="gap-2">
              <Package className="h-4 w-4" />
              Articles
            </TabsTrigger>
            <TabsTrigger value="payment" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Paiement
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Numéro de commande</Label>
                <Input
                  value={formData.order_number}
                  onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                  className="glass border-border/50"
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
                    <SelectItem value="AIR">Aérien</SelectItem>
                    <SelectItem value="SEA">Maritime</SelectItem>
                    <SelectItem value="LAND">Terrestre</SelectItem>
                    <SelectItem value="MULTIMODAL">Multimodal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date de livraison prévue</Label>
                <Input
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                  className="glass border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Numéro de suivi</Label>
                <Input
                  value={formData.tracking_number}
                  onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                  placeholder="Tracking number..."
                  className="glass border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Port d'entrée</Label>
                <Input
                  value={formData.port_of_entry}
                  onChange={(e) => setFormData({ ...formData, port_of_entry: e.target.value })}
                  placeholder="Ex: Douala, Kribi..."
                  className="glass border-border/50"
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
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes additionnelles..."
                className="glass border-border/50 min-h-[100px]"
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
              onTotalChange={(total) => {
                // Update total in parent if needed
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
                  className="glass border-border/50"
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
              </div>
            </div>
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Montant Total</span>
                <span className="text-2xl font-bold text-emerald-500">
                  {order?.total_amount?.toLocaleString() || 0} {formData.currency}
                </span>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border/50">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="glass border-border/50"
          >
            Fermer
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 border border-emerald-500/30"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
