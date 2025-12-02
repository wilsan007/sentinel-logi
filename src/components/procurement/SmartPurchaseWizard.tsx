import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { 
  Wand2, 
  Package, 
  AlertTriangle, 
  TrendingUp,
  ShoppingCart,
  Plus,
  Minus,
  Loader2,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { SupplierSelector } from "./SupplierSelector";

interface SmartPurchaseWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  onSuccess: () => void;
}

interface StockItem {
  id: string;
  type: string;
  sous_type: string | null;
  categorie: string;
}

interface LowStockItem extends StockItem {
  current_quantity: number;
  alert_threshold: number;
  suggested_quantity: number;
}

interface SelectedItem {
  stock_item_id: string;
  type: string;
  sous_type: string | null;
  quantity: number;
  unit_price: number;
}

export const SmartPurchaseWizard = ({
  open,
  onOpenChange,
  locationId,
  onSuccess,
}: SmartPurchaseWizardProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [allStockItems, setAllStockItems] = useState<StockItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [transportMode, setTransportMode] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadData();
      generateOrderNumber();
      setStep(1);
      setSelectedItems([]);
      setSelectedSupplierId("");
    }
  }, [open, locationId]);

  const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    setOrderNumber(`PO-${year}${month}-${random}`);
  };

  const loadData = async () => {
    setLoading(true);

    // Load all stock items
    const { data: stockData } = await supabase
      .from("stock_items")
      .select("*")
      .order("type");

    if (stockData) {
      setAllStockItems(stockData);
    }

    // Load item variants with low stock for this location
    const { data: variantsData } = await supabase
      .from("item_variants")
      .select(`
        stock_item_id,
        quantite,
        seuil_alerte,
        stock_items (id, type, sous_type, categorie)
      `)
      .eq("location_id", locationId);

    if (variantsData) {
      // Group by stock_item and find low stock items
      const stockMap = new Map<string, { total: number; threshold: number; item: any }>();
      
      variantsData.forEach((v: any) => {
        const key = v.stock_item_id;
        const existing = stockMap.get(key);
        if (existing) {
          existing.total += v.quantite;
          existing.threshold = Math.max(existing.threshold, v.seuil_alerte || 10);
        } else {
          stockMap.set(key, {
            total: v.quantite,
            threshold: v.seuil_alerte || 10,
            item: v.stock_items,
          });
        }
      });

      const lowStock: LowStockItem[] = [];
      stockMap.forEach((data, key) => {
        if (data.total <= data.threshold * 1.5) {
          lowStock.push({
            id: data.item.id,
            type: data.item.type,
            sous_type: data.item.sous_type,
            categorie: data.item.categorie,
            current_quantity: data.total,
            alert_threshold: data.threshold,
            suggested_quantity: Math.max(data.threshold * 3 - data.total, data.threshold),
          });
        }
      });

      setLowStockItems(lowStock);
    }

    setLoading(false);
  };

  const toggleLowStockItem = (item: LowStockItem) => {
    const existing = selectedItems.find((s) => s.stock_item_id === item.id);
    if (existing) {
      setSelectedItems(selectedItems.filter((s) => s.stock_item_id !== item.id));
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          stock_item_id: item.id,
          type: item.type,
          sous_type: item.sous_type,
          quantity: item.suggested_quantity,
          unit_price: 0,
        },
      ]);
    }
  };

  const addCustomItem = (stockItem: StockItem) => {
    if (selectedItems.find((s) => s.stock_item_id === stockItem.id)) return;
    
    setSelectedItems([
      ...selectedItems,
      {
        stock_item_id: stockItem.id,
        type: stockItem.type,
        sous_type: stockItem.sous_type,
        quantity: 10,
        unit_price: 0,
      },
    ]);
  };

  const updateItemQuantity = (stockItemId: string, quantity: number) => {
    setSelectedItems(
      selectedItems.map((item) =>
        item.stock_item_id === stockItemId ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  };

  const updateItemPrice = (stockItemId: string, price: number) => {
    setSelectedItems(
      selectedItems.map((item) =>
        item.stock_item_id === stockItemId ? { ...item, unit_price: price } : item
      )
    );
  };

  const removeItem = (stockItemId: string) => {
    setSelectedItems(selectedItems.filter((s) => s.stock_item_id !== stockItemId));
  };

  const handleCreateOrder = async () => {
    if (!orderNumber.trim()) {
      toast({ title: "Erreur", description: "Numéro de commande requis", variant: "destructive" });
      return;
    }
    if (selectedItems.length === 0) {
      toast({ title: "Erreur", description: "Ajoutez au moins un article", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const user = await supabase.auth.getUser();
      
      // Calculate total
      const totalAmount = selectedItems.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0
      );

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("procurement_orders")
        .insert([{
          order_number: orderNumber,
          location_id: locationId,
          created_by: user.data.user?.id,
          supplier_id: selectedSupplierId || null,
          transport_mode: transportMode as Database["public"]["Enums"]["transport_mode"] || null,
          stage: selectedSupplierId ? "SUPPLIER_SELECTION" as const : "DRAFT" as const,
          total_amount: totalAmount,
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = selectedItems.map((item) => ({
        order_id: order.id,
        stock_item_id: item.stock_item_id,
        quantity_ordered: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
      }));

      const { error: itemsError } = await supabase
        .from("procurement_order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Commande créée",
        description: `Commande ${orderNumber} créée avec ${selectedItems.length} articles`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border border-emerald-500/20 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            <span className="text-emerald-500">Assistant Smart Purchase</span>
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= s
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-12 h-1 mx-1 ${
                    step > s ? "bg-emerald-500" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
            {/* Step 1: Select Items */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-2">Étape 1: Sélection des articles</h3>
                  <p className="text-sm text-muted-foreground">
                    Articles à stock faible détectés automatiquement
                  </p>
                </div>

                {/* Low stock alerts */}
                {lowStockItems.length > 0 && (
                  <Card className="border-amber-500/30 bg-amber-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-amber-500">
                        <AlertTriangle className="h-4 w-4" />
                        Stock faible détecté
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {lowStockItems.map((item) => {
                        const isSelected = selectedItems.some(
                          (s) => s.stock_item_id === item.id
                        );
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? "bg-emerald-500/20 border border-emerald-500/30"
                                : "bg-background/50 hover:bg-background/80"
                            }`}
                            onClick={() => toggleLowStockItem(item)}
                          >
                            <div className="flex items-center gap-3">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">
                                  {item.type} {item.sous_type && `- ${item.sous_type}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Stock actuel: {item.current_quantity} / Seuil: {item.alert_threshold}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Suggéré: {item.suggested_quantity}
                              </Badge>
                              {isSelected && (
                                <Badge className="bg-emerald-500/20 text-emerald-500">
                                  Sélectionné
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* Add custom items */}
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Ajouter d'autres articles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select onValueChange={(value) => {
                      const item = allStockItems.find((i) => i.id === value);
                      if (item) addCustomItem(item);
                    }}>
                      <SelectTrigger className="glass border-border/50">
                        <SelectValue placeholder="Sélectionner un article à ajouter..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allStockItems
                          .filter((i) => !selectedItems.some((s) => s.stock_item_id === i.id))
                          .map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.type} {item.sous_type && `- ${item.sous_type}`} ({item.categorie})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Selected items summary */}
                {selectedItems.length > 0 && (
                  <Card className="border-emerald-500/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-emerald-500" />
                        Articles sélectionnés ({selectedItems.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <AnimatePresence>
                        {selectedItems.map((item) => (
                          <motion.div
                            key={item.stock_item_id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center justify-between p-2 rounded bg-background/50"
                          >
                            <span className="text-sm">
                              {item.type} {item.sous_type && `- ${item.sous_type}`}
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => updateItemQuantity(item.stock_item_id, item.quantity - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-12 text-center">{item.quantity}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => updateItemQuantity(item.stock_item_id, item.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-red-500"
                                onClick={() => removeItem(item.stock_item_id)}
                              >
                                ×
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}

            {/* Step 2: Select Supplier */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-2">Étape 2: Sélection du fournisseur</h3>
                  <p className="text-sm text-muted-foreground">
                    Choisissez le meilleur fournisseur basé sur les performances
                  </p>
                </div>

                <SupplierSelector
                  selectedSupplierId={selectedSupplierId}
                  onSupplierSelect={setSelectedSupplierId}
                />
              </motion.div>
            )}

            {/* Step 3: Review & Create */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-2">Étape 3: Finalisation</h3>
                  <p className="text-sm text-muted-foreground">
                    Vérifiez les détails et créez la commande
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Numéro de commande</Label>
                    <Input
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      className="glass border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mode de transport</Label>
                    <Select value={transportMode} onValueChange={setTransportMode}>
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
                </div>

                {/* Items with prices */}
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Articles et prix</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedItems.map((item) => (
                      <div
                        key={item.stock_item_id}
                        className="flex items-center justify-between p-2 rounded bg-background/50"
                      >
                        <div className="flex-1">
                          <span className="text-sm font-medium">
                            {item.type} {item.sous_type && `- ${item.sous_type}`}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            × {item.quantity}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            value={item.unit_price}
                            onChange={(e) =>
                              updateItemPrice(item.stock_item_id, parseFloat(e.target.value) || 0)
                            }
                            className="w-32 glass border-border/50 text-right"
                            placeholder="Prix unit."
                          />
                          <span className="text-sm font-medium w-32 text-right">
                            {(item.quantity * item.unit_price).toLocaleString()} XAF
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Total */}
                <Card className="border-emerald-500/30 bg-emerald-500/5">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium">Total estimé</span>
                      <span className="text-2xl font-bold text-emerald-500">
                        {totalAmount.toLocaleString()} XAF
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between mt-6 pt-4 border-t border-border/50">
              <Button
                variant="outline"
                onClick={() => (step > 1 ? setStep(step - 1) : onOpenChange(false))}
                className="glass border-border/50"
              >
                {step > 1 ? "Précédent" : "Annuler"}
              </Button>
              
              {step < 3 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 && selectedItems.length === 0}
                  className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 border border-emerald-500/30"
                >
                  Suivant
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreateOrder}
                  disabled={creating}
                  className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 border border-emerald-500/30"
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Créer la commande
                    </>
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
