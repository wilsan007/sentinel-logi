import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, CheckCircle2, Truck, Building2, ArrowRight, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface OrderItem {
  id: string;
  stock_item_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  total_price: number;
  variant_specs: any;
  stock_items?: {
    type: string;
    sous_type: string;
    categorie: string;
  };
}

interface PendingRequest {
  id: string;
  location_id: string;
  stock_item_id: string;
  quantite_demandee: number;
  statut: string;
  location?: {
    nom: string;
    code: string;
  };
  stock_items?: {
    type: string;
    sous_type: string;
  };
}

interface Location {
  id: string;
  nom: string;
  code: string;
}

interface ReceiveOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onSuccess: () => void;
}

interface RedistributionItem {
  itemId: string;
  locationId: string;
  quantity: number;
  requestId?: string;
}

export const ReceiveOrderDialog = ({
  open,
  onOpenChange,
  orderId,
  onSuccess,
}: ReceiveOrderDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
  const [redistributions, setRedistributions] = useState<RedistributionItem[]>([]);
  const [step, setStep] = useState<"receive" | "redistribute">("receive");
  const { toast } = useToast();

  useEffect(() => {
    if (open && orderId) {
      loadData();
      setStep("receive");
    }
  }, [open, orderId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load order
      const { data: orderData } = await supabase
        .from("procurement_orders")
        .select("*, suppliers(name, code)")
        .eq("id", orderId)
        .single();
      
      setOrder(orderData);

      // Load order items
      const { data: itemsData } = await supabase
        .from("procurement_order_items")
        .select(`
          *,
          stock_items(type, sous_type, categorie)
        `)
        .eq("order_id", orderId);
      
      if (itemsData) {
        setItems(itemsData);
        // Initialize received quantities
        const quantities: Record<string, number> = {};
        itemsData.forEach((item) => {
          quantities[item.id] = item.quantity_ordered;
        });
        setReceivedQuantities(quantities);
      }

      // Load pending requests from camps
      const { data: requestsData } = await supabase
        .from("requests")
        .select(`
          *,
          locations:location_id(nom, code),
          stock_items(type, sous_type)
        `)
        .eq("statut", "en_attente")
        .order("date_demande", { ascending: true });
      
      setPendingRequests(requestsData || []);

      // Load all locations for redistribution
      const { data: locationsData } = await supabase
        .from("locations")
        .select("id, nom, code")
        .order("nom");
      
      setLocations(locationsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setReceivedQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(0, quantity),
    }));
  };

  const addRedistribution = (itemId: string) => {
    setRedistributions((prev) => [
      ...prev,
      { itemId, locationId: "", quantity: 0 },
    ]);
  };

  const updateRedistribution = (index: number, field: keyof RedistributionItem, value: any) => {
    setRedistributions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeRedistribution = (index: number) => {
    setRedistributions((prev) => prev.filter((_, i) => i !== index));
  };

  const autoFillFromRequests = () => {
    // Auto-fill redistributions based on pending requests
    const newRedistributions: RedistributionItem[] = [];
    
    pendingRequests.forEach((request) => {
      // Find matching item in order
      const matchingItem = items.find(
        (item) => item.stock_item_id === request.stock_item_id
      );
      
      if (matchingItem) {
        const availableQty = receivedQuantities[matchingItem.id] || 0;
        const alreadyAllocated = newRedistributions
          .filter((r) => r.itemId === matchingItem.id)
          .reduce((sum, r) => sum + r.quantity, 0);
        
        const canAllocate = Math.min(
          request.quantite_demandee,
          availableQty - alreadyAllocated
        );
        
        if (canAllocate > 0) {
          newRedistributions.push({
            itemId: matchingItem.id,
            locationId: request.location_id,
            quantity: canAllocate,
            requestId: request.id,
          });
        }
      }
    });
    
    setRedistributions(newRedistributions);
    
    toast({
      title: "Redistribution automatique",
      description: `${newRedistributions.length} allocations créées à partir des demandes en attente`,
    });
  };

  const handleReceive = async () => {
    setSaving(true);
    try {
      // Get Stock Central location
      const stockCentral = locations.find((l) => l.code === "STOCK_CENTRAL");
      if (!stockCentral) {
        throw new Error("Stock Central non trouvé");
      }

      // Update order items with received quantities
      for (const item of items) {
        await supabase
          .from("procurement_order_items")
          .update({ quantity_received: receivedQuantities[item.id] || 0 })
          .eq("id", item.id);
      }

      // Create inventory batches for Stock Central
      const batchNumber = `REC-${order?.order_number}-${Date.now().toString(36).toUpperCase()}`;
      
      for (const item of items) {
        const receivedQty = receivedQuantities[item.id] || 0;
        if (receivedQty <= 0) continue;

        // Find or create item variant for Stock Central
        let { data: variant } = await supabase
          .from("item_variants")
          .select("id")
          .eq("stock_item_id", item.stock_item_id)
          .eq("location_id", stockCentral.id)
          .maybeSingle();

        if (!variant) {
          const { data: newVariant } = await supabase
            .from("item_variants")
            .insert({
              stock_item_id: item.stock_item_id,
              location_id: stockCentral.id,
              quantite: 0,
              seuil_alerte: 10,
            })
            .select("id")
            .single();
          variant = newVariant;
        }

        if (variant) {
          // Create inventory batch
          await supabase.from("inventory_batches").insert({
            batch_number: `${batchNumber}-${item.id.substring(0, 8)}`,
            item_variant_id: variant.id,
            location_id: stockCentral.id,
            quantity: receivedQty,
            original_quantity: receivedQty,
            arrival_date: new Date().toISOString().split("T")[0],
            supplier_id: order?.supplier_id,
            supplier_name: order?.suppliers?.name,
            unit_cost: item.unit_price,
            total_cost: item.unit_price * receivedQty,
          });

          // Update variant quantity
          const { data: currentVariant } = await supabase
            .from("item_variants")
            .select("quantite")
            .eq("id", variant.id)
            .single();
          
          await supabase
            .from("item_variants")
            .update({ quantite: (currentVariant?.quantite || 0) + receivedQty })
            .eq("id", variant.id);
        }
      }

      // Process redistributions
      for (const redistribution of redistributions) {
        if (redistribution.quantity <= 0 || !redistribution.locationId) continue;

        const item = items.find((i) => i.id === redistribution.itemId);
        if (!item) continue;

        // Find or create item variant for destination location
        let { data: destVariant } = await supabase
          .from("item_variants")
          .select("id, quantite")
          .eq("stock_item_id", item.stock_item_id)
          .eq("location_id", redistribution.locationId)
          .maybeSingle();

        if (!destVariant) {
          const { data: newVariant } = await supabase
            .from("item_variants")
            .insert({
              stock_item_id: item.stock_item_id,
              location_id: redistribution.locationId,
              quantite: 0,
              seuil_alerte: 10,
            })
            .select("id, quantite")
            .single();
          destVariant = newVariant;
        }

        if (destVariant) {
          // Create inventory batch for destination
          await supabase.from("inventory_batches").insert({
            batch_number: `REDIST-${batchNumber}-${redistribution.locationId.substring(0, 8)}`,
            item_variant_id: destVariant.id,
            location_id: redistribution.locationId,
            quantity: redistribution.quantity,
            original_quantity: redistribution.quantity,
            arrival_date: new Date().toISOString().split("T")[0],
            supplier_name: "Redistribution Stock Central",
          });

          // Update destination variant quantity
          await supabase
            .from("item_variants")
            .update({ quantite: (destVariant.quantite || 0) + redistribution.quantity })
            .eq("id", destVariant.id);

          // If linked to a request, update request status
          if (redistribution.requestId) {
            await supabase
              .from("requests")
              .update({ 
                statut: "traite",
                date_traitement: new Date().toISOString()
              })
              .eq("id", redistribution.requestId);
          }
        }
      }

      // Update order stage to RECEIVED
      await supabase
        .from("procurement_orders")
        .update({
          stage: "RECEIVED",
          actual_delivery_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", orderId);

      toast({
        title: "Réception enregistrée",
        description: "Les articles ont été ajoutés au stock et redistribués",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error receiving order:", error);
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass border border-emerald-500/20 max-w-4xl">
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border border-emerald-500/20 max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Package className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <span className="text-xl">Réception de commande</span>
              <p className="text-sm text-muted-foreground font-normal">
                #{order?.order_number} - {order?.suppliers?.name}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex items-center gap-4 py-4 border-b border-border/50">
          <button
            onClick={() => setStep("receive")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              step === "receive"
                ? "bg-emerald-500/20 text-emerald-500"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="h-5 w-5" />
            <span>1. Réception</span>
          </button>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <button
            onClick={() => setStep("redistribute")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              step === "redistribute"
                ? "bg-emerald-500/20 text-emerald-500"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Truck className="h-5 w-5" />
            <span>2. Redistribution</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <AnimatePresence mode="wait">
            {step === "receive" ? (
              <motion.div
                key="receive"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Articles à réceptionner</h3>
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                    {items.length} article(s)
                  </Badge>
                </div>

                <div className="space-y-3">
                  {items.map((item) => (
                    <Card key={item.id} className="glass border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={
                                item.stock_items?.categorie === "GEAR" 
                                  ? "text-cyan-500 border-cyan-500/30" 
                                  : "text-amber-500 border-amber-500/30"
                              }>
                                {item.stock_items?.categorie}
                              </Badge>
                              <span className="font-medium">{item.stock_items?.type}</span>
                              {item.stock_items?.sous_type && (
                                <span className="text-muted-foreground">
                                  - {item.stock_items.sous_type}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Commandé: {item.quantity_ordered} | 
                              Prix unitaire: {item.unit_price?.toLocaleString() || 0} XAF
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Label className="text-sm text-muted-foreground">Reçu:</Label>
                            <Input
                              type="number"
                              value={receivedQuantities[item.id] || 0}
                              onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                              className="w-24 glass border-border/50 text-center"
                              min={0}
                              max={item.quantity_ordered}
                            />
                          </div>
                        </div>
                        {receivedQuantities[item.id] < item.quantity_ordered && (
                          <div className="flex items-center gap-2 mt-2 p-2 rounded bg-amber-500/10 text-amber-500 text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            Quantité reçue inférieure à la commande
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="redistribute"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Redistribution aux camps</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={autoFillFromRequests}
                    className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Remplir depuis les demandes
                  </Button>
                </div>

                {/* Pending requests */}
                {pendingRequests.length > 0 && (
                  <Card className="glass border-amber-500/30">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2 text-amber-500">
                        <AlertTriangle className="h-4 w-4" />
                        Demandes en attente ({pendingRequests.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {pendingRequests.slice(0, 5).map((request) => (
                          <div key={request.id} className="flex items-center justify-between text-sm">
                            <span>
                              {request.location?.nom} - {request.stock_items?.type}
                            </span>
                            <Badge variant="outline">{request.quantite_demandee} unités</Badge>
                          </div>
                        ))}
                        {pendingRequests.length > 5 && (
                          <p className="text-xs text-muted-foreground">
                            +{pendingRequests.length - 5} autres demandes...
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Redistributions */}
                <div className="space-y-3">
                  {redistributions.map((redistribution, index) => {
                    const item = items.find((i) => i.id === redistribution.itemId);
                    return (
                      <Card key={index} className="glass border-border/50">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-4 gap-4 items-center">
                            <Select
                              value={redistribution.itemId}
                              onValueChange={(value) => updateRedistribution(index, "itemId", value)}
                            >
                              <SelectTrigger className="glass border-border/50">
                                <SelectValue placeholder="Article" />
                              </SelectTrigger>
                              <SelectContent>
                                {items.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.stock_items?.type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select
                              value={redistribution.locationId}
                              onValueChange={(value) => updateRedistribution(index, "locationId", value)}
                            >
                              <SelectTrigger className="glass border-border/50">
                                <SelectValue placeholder="Camp destination" />
                              </SelectTrigger>
                              <SelectContent>
                                {locations
                                  .filter((l) => l.code !== "STOCK_CENTRAL")
                                  .map((loc) => (
                                    <SelectItem key={loc.id} value={loc.id}>
                                      {loc.nom}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>

                            <Input
                              type="number"
                              placeholder="Quantité"
                              value={redistribution.quantity || ""}
                              onChange={(e) =>
                                updateRedistribution(index, "quantity", parseInt(e.target.value) || 0)
                              }
                              className="glass border-border/50"
                              min={0}
                            />

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRedistribution(index)}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              Supprimer
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  <Button
                    variant="outline"
                    onClick={() => addRedistribution(items[0]?.id || "")}
                    className="w-full border-dashed border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                  >
                    + Ajouter une redistribution
                  </Button>
                </div>

                {redistributions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Aucune redistribution planifiée</p>
                    <p className="text-sm">Les articles resteront dans le Stock Central</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="border-t border-border/50 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          {step === "receive" ? (
            <Button
              onClick={() => setStep("redistribute")}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Suivant: Redistribution
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("receive")}>
                Retour
              </Button>
              <Button
                onClick={handleReceive}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Confirmer la réception
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
