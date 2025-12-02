import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowRight,
  ArrowLeft,
  Shirt,
  UtensilsCrossed,
  CheckCircle,
  FileText,
  Calendar,
  Truck,
  DollarSign,
  ClipboardList
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { SupplierSelector } from "./SupplierSelector";

type CategoryType = Database["public"]["Enums"]["category_type"];
type TransportMode = Database["public"]["Enums"]["transport_mode"];

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
  categorie: CategoryType;
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
  variant_specs?: {
    tailles?: string[];
    couleurs?: string[];
  };
}

const STEPS = [
  { key: 1, label: "Catégorie", icon: Package },
  { key: 2, label: "Articles", icon: ClipboardList },
  { key: 3, label: "Fournisseur", icon: Truck },
  { key: 4, label: "Détails", icon: FileText },
  { key: 5, label: "Validation", icon: CheckCircle },
];

export const SmartPurchaseWizard = ({
  open,
  onOpenChange,
  locationId,
  onSuccess,
}: SmartPurchaseWizardProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Step 1: Category selection
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);
  
  // Step 2: Items
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [allStockItems, setAllStockItems] = useState<StockItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  
  // Step 3: Supplier
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  
  // Step 4: Order details
  const [orderNumber, setOrderNumber] = useState("");
  const [transportMode, setTransportMode] = useState<TransportMode | "">("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [portOfEntry, setPortOfEntry] = useState("");
  const [currency, setCurrency] = useState("XAF");
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      resetWizard();
    }
  }, [open]);

  useEffect(() => {
    if (selectedCategory && locationId) {
      loadData();
    }
  }, [selectedCategory, locationId]);

  const resetWizard = () => {
    setStep(1);
    setSelectedCategory(null);
    setSelectedItems([]);
    setSelectedSupplierId("");
    setTransportMode("");
    setExpectedDeliveryDate("");
    setPortOfEntry("");
    setNotes("");
    setPaymentTerms("");
    generateOrderNumber();
  };

  const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    const prefix = selectedCategory === "GEAR" ? "HAB" : selectedCategory === "FOOD" ? "ALM" : "PO";
    setOrderNumber(`${prefix}-${year}${month}-${random}`);
  };

  const loadData = async () => {
    if (!selectedCategory) return;
    
    setLoading(true);

    // Load all stock items for selected category
    const { data: stockData } = await supabase
      .from("stock_items")
      .select("*")
      .eq("categorie", selectedCategory)
      .order("type");

    if (stockData) {
      setAllStockItems(stockData);
    }

    // Load item variants with low stock for this location and category
    const { data: variantsData } = await supabase
      .from("item_variants")
      .select(`
        stock_item_id,
        quantite,
        seuil_alerte,
        stock_items!inner (id, type, sous_type, categorie)
      `)
      .eq("location_id", locationId)
      .eq("stock_items.categorie", selectedCategory);

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

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return selectedCategory !== null;
      case 2: return selectedItems.length > 0;
      case 3: return true; // Supplier is optional but recommended
      case 4: return orderNumber.trim() !== "";
      case 5: return true;
      default: return false;
    }
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
          transport_mode: (transportMode || null) as TransportMode | null,
          expected_delivery_date: expectedDeliveryDate || null,
          port_of_entry: portOfEntry || null,
          notes: notes || null,
          stage: selectedSupplierId ? "SUPPLIER_SELECTION" as const : "DRAFT" as const,
          total_amount: totalAmount,
          currency: currency,
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
        variant_specs: item.variant_specs || null,
      }));

      const { error: itemsError } = await supabase
        .from("procurement_order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Commande créée avec succès",
        description: `Commande ${orderNumber} créée avec ${selectedItems.length} articles pour un total de ${totalAmount.toLocaleString()} ${currency}`,
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

  const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border border-emerald-500/20 max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            <span className="text-emerald-500">Assistant Smart Purchase</span>
            {selectedCategory && (
              <Badge className={selectedCategory === "GEAR" ? "bg-cyan-500/20 text-cyan-500" : "bg-amber-500/20 text-amber-500"}>
                {selectedCategory === "GEAR" ? "Habillement" : "Alimentaire"}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-lg">
          {STEPS.map((s, index) => {
            const Icon = s.icon;
            const isActive = step === s.key;
            const isComplete = step > s.key;
            
            return (
              <div key={s.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isComplete
                        ? "bg-emerald-500 text-white"
                        : isActive
                        ? "bg-emerald-500/20 text-emerald-500 ring-2 ring-emerald-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isComplete ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className={`text-xs mt-1 ${isActive ? "text-emerald-500 font-medium" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-16 h-1 mx-2 rounded ${isComplete ? "bg-emerald-500" : "bg-muted"}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {/* Step 1: Category Selection */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <h3 className="text-xl font-semibold mb-2">Sélectionnez le type de commande</h3>
                    <p className="text-muted-foreground">
                      Choisissez la catégorie d'articles à commander
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
                    <Card
                      className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                        selectedCategory === "GEAR"
                          ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500"
                          : "border-border/50 hover:border-cyan-500/50"
                      }`}
                      onClick={() => setSelectedCategory("GEAR")}
                    >
                      <CardContent className="p-8 text-center">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-cyan-500/20 flex items-center justify-center">
                          <Shirt className="h-10 w-10 text-cyan-500" />
                        </div>
                        <h4 className="text-lg font-semibold text-cyan-500">Habillement</h4>
                        <p className="text-sm text-muted-foreground mt-2">
                          Uniformes, équipements, accessoires vestimentaires
                        </p>
                      </CardContent>
                    </Card>

                    <Card
                      className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                        selectedCategory === "FOOD"
                          ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500"
                          : "border-border/50 hover:border-amber-500/50"
                      }`}
                      onClick={() => setSelectedCategory("FOOD")}
                    >
                      <CardContent className="p-8 text-center">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <UtensilsCrossed className="h-10 w-10 text-amber-500" />
                        </div>
                        <h4 className="text-lg font-semibold text-amber-500">Alimentaire</h4>
                        <p className="text-sm text-muted-foreground mt-2">
                          Provisions, denrées, produits alimentaires
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Select Items */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Sélection des articles</h3>
                    <p className="text-sm text-muted-foreground">
                      Sélectionnez les articles à commander et définissez les quantités
                    </p>
                  </div>

                  {/* Low stock alerts */}
                  {lowStockItems.length > 0 && (
                    <Card className={`border-amber-500/30 bg-amber-500/5`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-amber-500">
                          <AlertTriangle className="h-4 w-4" />
                          Articles à stock faible détectés ({lowStockItems.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 max-h-[200px] overflow-y-auto">
                        {lowStockItems.map((item) => {
                          const isSelected = selectedItems.some((s) => s.stock_item_id === item.id);
                          return (
                            <div
                              key={item.id}
                              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-emerald-500/20 border border-emerald-500/30"
                                  : "bg-background/50 hover:bg-background/80 border border-transparent"
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
                                    Stock: {item.current_quantity} / Seuil: {item.alert_threshold}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  Suggéré: {item.suggested_quantity}
                                </Badge>
                                {isSelected && (
                                  <CheckCircle className="h-4 w-4 text-emerald-500" />
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
                                {item.type} {item.sous_type && `- ${item.sous_type}`}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  {/* Selected items with quantities */}
                  {selectedItems.length > 0 && (
                    <Card className="border-emerald-500/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4 text-emerald-500" />
                          Articles sélectionnés ({selectedItems.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 max-h-[250px] overflow-y-auto">
                        {selectedItems.map((item) => (
                          <div
                            key={item.stock_item_id}
                            className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                          >
                            <span className="font-medium">
                              {item.type} {item.sous_type && `- ${item.sous_type}`}
                            </span>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => updateItemQuantity(item.stock_item_id, item.quantity - 10)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateItemQuantity(item.stock_item_id, parseInt(e.target.value) || 1)}
                                  className="w-20 text-center glass border-border/50"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => updateItemQuantity(item.stock_item_id, item.quantity + 10)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                                onClick={() => removeItem(item.stock_item_id)}
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              )}

              {/* Step 3: Select Supplier */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Sélection du fournisseur</h3>
                    <p className="text-sm text-muted-foreground">
                      Choisissez le meilleur fournisseur basé sur les performances passées
                    </p>
                  </div>

                  <SupplierSelector
                    selectedSupplierId={selectedSupplierId}
                    onSupplierSelect={setSelectedSupplierId}
                  />
                </motion.div>
              )}

              {/* Step 4: Order Details */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Détails de la commande</h3>
                    <p className="text-sm text-muted-foreground">
                      Complétez les informations de la commande
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Numéro de commande *</Label>
                      <Input
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        className="glass border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mode de transport</Label>
                      <Select value={transportMode} onValueChange={(v) => setTransportMode(v as TransportMode)}>
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
                      <Label>Date de livraison souhaitée</Label>
                      <Input
                        type="date"
                        value={expectedDeliveryDate}
                        onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                        className="glass border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Port d'entrée</Label>
                      <Input
                        value={portOfEntry}
                        onChange={(e) => setPortOfEntry(e.target.value)}
                        placeholder="Ex: Douala, Kribi..."
                        className="glass border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Devise</Label>
                      <Select value={currency} onValueChange={setCurrency}>
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
                    <div className="space-y-2">
                      <Label>Conditions de paiement</Label>
                      <Input
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(e.target.value)}
                        placeholder="Ex: 30 jours, à la livraison..."
                        className="glass border-border/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes / Instructions spéciales</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Instructions de livraison, spécifications particulières..."
                      className="glass border-border/50 min-h-[80px]"
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 5: Review & Confirm */}
              {step === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Validation et prix</h3>
                    <p className="text-sm text-muted-foreground">
                      Vérifiez les détails et ajoutez les prix unitaires
                    </p>
                  </div>

                  {/* Order Summary */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Récapitulatif de la commande</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">N° Commande</p>
                        <p className="font-medium">{orderNumber}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Catégorie</p>
                        <p className="font-medium">{selectedCategory === "GEAR" ? "Habillement" : "Alimentaire"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Transport</p>
                        <p className="font-medium">{transportMode || "Non spécifié"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Livraison prévue</p>
                        <p className="font-medium">{expectedDeliveryDate || "Non spécifié"}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Items with prices */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Articles et tarification
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[250px] overflow-y-auto">
                      {selectedItems.map((item) => (
                        <div
                          key={item.stock_item_id}
                          className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                        >
                          <div className="flex-1">
                            <span className="font-medium">
                              {item.type} {item.sous_type && `- ${item.sous_type}`}
                            </span>
                            <span className="text-muted-foreground ml-2">× {item.quantity}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={0}
                                value={item.unit_price}
                                onChange={(e) => updateItemPrice(item.stock_item_id, parseFloat(e.target.value) || 0)}
                                className="w-28 glass border-border/50 text-right"
                                placeholder="Prix unit."
                              />
                              <span className="text-xs text-muted-foreground">{currency}</span>
                            </div>
                            <div className="w-32 text-right">
                              <span className="font-semibold text-emerald-500">
                                {(item.quantity * item.unit_price).toLocaleString()} {currency}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Total */}
                  <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Total de la commande</p>
                          <p className="text-xs text-muted-foreground">{totalItems} articles</p>
                        </div>
                        <span className="text-3xl font-bold text-emerald-500">
                          {totalAmount.toLocaleString()} {currency}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between pt-4 border-t border-border/50">
          <Button
            variant="outline"
            onClick={() => (step > 1 ? setStep(step - 1) : onOpenChange(false))}
            className="glass border-border/50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {step > 1 ? "Précédent" : "Annuler"}
          </Button>
          
          {step < 5 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 border border-emerald-500/30"
            >
              Suivant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleCreateOrder}
              disabled={creating || totalAmount === 0}
              className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-500 border border-emerald-500/30"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création en cours...
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
      </DialogContent>
    </Dialog>
  );
};
