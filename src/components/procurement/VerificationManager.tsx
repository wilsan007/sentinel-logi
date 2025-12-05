import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  ClipboardCheck, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Package,
  Loader2,
  Save
} from "lucide-react";
import { motion } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";

type VerificationStatus = Database["public"]["Enums"]["verification_status"];

interface OrderItem {
  id: string;
  stock_item_id: string;
  quantity_ordered: number;
  quantity_received: number | null;
  quantity_accepted: number | null;
  quantity_rejected: number | null;
  rejection_reason: string | null;
  item_status: string | null;
  stock_items: {
    type: string;
    sous_type: string | null;
  };
}

interface ItemUpdate {
  quantity_accepted: number;
  quantity_rejected: number;
  rejection_reason: string;
  item_status: string;
}

interface VerificationManagerProps {
  orderId: string;
  verificationStatus: string;
  verificationNotes: string | null;
  readOnly?: boolean;
  onVerificationComplete?: (status: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  PENDING: { label: "En attente", color: "text-amber-500", bgColor: "bg-amber-500/20", icon: AlertTriangle },
  VALIDATED: { label: "Validé", color: "text-green-500", bgColor: "bg-green-500/20", icon: CheckCircle },
  ADJUSTED: { label: "Ajusté", color: "text-blue-500", bgColor: "bg-blue-500/20", icon: ClipboardCheck },
  PARTIAL_REJECT: { label: "Rejet partiel", color: "text-orange-500", bgColor: "bg-orange-500/20", icon: AlertTriangle },
  REJECTED: { label: "Rejeté", color: "text-red-500", bgColor: "bg-red-500/20", icon: XCircle },
};

const ITEM_STATUS_OPTIONS = [
  { value: "accepted", label: "Accepté", color: "text-green-500" },
  { value: "adjusted", label: "Quantité ajustée", color: "text-blue-500" },
  { value: "rejected", label: "Rejeté", color: "text-red-500" },
];

export function VerificationManager({
  orderId,
  verificationStatus,
  verificationNotes,
  readOnly = false,
  onVerificationComplete,
}: VerificationManagerProps) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(verificationNotes || "");
  const [itemUpdates, setItemUpdates] = useState<Record<string, ItemUpdate>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadItems();
  }, [orderId]);

  const loadItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("procurement_order_items")
      .select(`
        *,
        stock_items (type, sous_type)
      `)
      .eq("order_id", orderId);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger les articles", variant: "destructive" });
    } else {
      setItems(data || []);
      // Initialize item updates from existing data
      const updates: Record<string, ItemUpdate> = {};
      (data || []).forEach((item) => {
        updates[item.id] = {
          quantity_accepted: item.quantity_accepted ?? item.quantity_ordered,
          quantity_rejected: item.quantity_rejected ?? 0,
          rejection_reason: item.rejection_reason || "",
          item_status: item.item_status || "pending",
        };
      });
      setItemUpdates(updates);
    }
    setLoading(false);
  };

  const updateItem = (itemId: string, field: string, value: any) => {
    setItemUpdates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  const handleSaveVerification = async (finalStatus: VerificationStatus) => {
    setSaving(true);
    try {
      // Update each item
      for (const [itemId, updates] of Object.entries(itemUpdates)) {
        const { error: itemError } = await supabase
          .from("procurement_order_items")
          .update({
            quantity_accepted: updates.quantity_accepted,
            quantity_rejected: updates.quantity_rejected,
            rejection_reason: updates.rejection_reason || null,
            item_status: updates.item_status,
          })
          .eq("id", itemId);

        if (itemError) throw itemError;
      }

      // Update order verification status
      const { data: { user } } = await supabase.auth.getUser();
      const { error: orderError } = await supabase
        .from("procurement_orders")
        .update({
          verification_status: finalStatus,
          verification_notes: notes || null,
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (orderError) throw orderError;

      toast({
        title: "Vérification enregistrée",
        description: `Statut: ${STATUS_CONFIG[finalStatus]?.label || finalStatus}`,
      });

      onVerificationComplete?.(finalStatus);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  const currentStatusConfig = STATUS_CONFIG[verificationStatus] || STATUS_CONFIG.PENDING;
  const StatusIcon = currentStatusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-emerald-500" />
            Vérification de la réception
          </h3>
          <p className="text-sm text-muted-foreground">
            Contrôlez la conformité de la livraison
          </p>
        </div>
        <Badge className={`${currentStatusConfig.bgColor} ${currentStatusConfig.color} border-0 gap-1`}>
          <StatusIcon className="h-3 w-3" />
          {currentStatusConfig.label}
        </Badge>
      </div>

      {/* Items Verification Table */}
      <div className="space-y-3">
        {items.map((item, index) => {
          const defaultUpdate: ItemUpdate = {
            quantity_accepted: item.quantity_ordered,
            quantity_rejected: 0,
            rejection_reason: "",
            item_status: "pending",
          };
          const updates = itemUpdates[item.id] || defaultUpdate;
          
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="glass border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-muted">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{item.stock_items?.type}</p>
                        {item.stock_items?.sous_type && (
                          <p className="text-sm text-muted-foreground">{item.stock_items.sous_type}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Commandé: <span className="font-medium">{item.quantity_ordered}</span> unités
                        </p>
                      </div>
                    </div>

                    {readOnly ? (
                      <div className="text-right">
                        <p className="text-sm">
                          Accepté: <span className="font-medium text-green-500">{updates.quantity_accepted || 0}</span>
                        </p>
                        {updates.quantity_rejected > 0 && (
                          <p className="text-sm">
                            Rejeté: <span className="font-medium text-red-500">{updates.quantity_rejected}</span>
                          </p>
                        )}
                        {updates.rejection_reason && (
                          <p className="text-xs text-muted-foreground mt-1">{updates.rejection_reason}</p>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-3 flex-1 max-w-xl">
                        <div className="space-y-1">
                          <Label className="text-xs">Statut</Label>
                          <Select
                            value={updates.item_status || "pending"}
                            onValueChange={(value) => updateItem(item.id, "item_status", value)}
                          >
                            <SelectTrigger className="h-9 text-xs glass border-border/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">En attente</SelectItem>
                              {ITEM_STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Accepté</Label>
                          <Input
                            type="number"
                            min={0}
                            max={item.quantity_ordered}
                            value={updates.quantity_accepted || 0}
                            onChange={(e) => updateItem(item.id, "quantity_accepted", parseInt(e.target.value) || 0)}
                            className="h-9 text-xs glass border-border/50"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Rejeté</Label>
                          <Input
                            type="number"
                            min={0}
                            max={item.quantity_ordered}
                            value={updates.quantity_rejected || 0}
                            onChange={(e) => updateItem(item.id, "quantity_rejected", parseInt(e.target.value) || 0)}
                            className="h-9 text-xs glass border-border/50"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Motif rejet</Label>
                          <Input
                            value={updates.rejection_reason || ""}
                            onChange={(e) => updateItem(item.id, "rejection_reason", e.target.value)}
                            placeholder="Raison..."
                            className="h-9 text-xs glass border-border/50"
                            disabled={!updates.quantity_rejected}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes de vérification</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observations, anomalies constatées..."
          className="glass border-border/50"
          disabled={readOnly}
        />
      </div>

      {/* Action Buttons */}
      {!readOnly && (
        <div className="flex flex-wrap gap-3 pt-4 border-t border-border/50">
          <Button
            onClick={() => handleSaveVerification("VALIDATED")}
            disabled={saving}
            className="gap-2 bg-green-500 hover:bg-green-600 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Valider intégralement
          </Button>
          <Button
            onClick={() => handleSaveVerification("ADJUSTED")}
            disabled={saving}
            variant="outline"
            className="gap-2 text-blue-500 border-blue-500/30 hover:bg-blue-500/10"
          >
            <ClipboardCheck className="h-4 w-4" />
            Valider avec ajustements
          </Button>
          <Button
            onClick={() => handleSaveVerification("PARTIAL_REJECT")}
            disabled={saving}
            variant="outline"
            className="gap-2 text-orange-500 border-orange-500/30 hover:bg-orange-500/10"
          >
            <AlertTriangle className="h-4 w-4" />
            Rejet partiel
          </Button>
          <Button
            onClick={() => handleSaveVerification("REJECTED")}
            disabled={saving}
            variant="outline"
            className="gap-2 text-red-500 border-red-500/30 hover:bg-red-500/10"
          >
            <XCircle className="h-4 w-4" />
            Rejeter complètement
          </Button>
        </div>
      )}
    </div>
  );
}
