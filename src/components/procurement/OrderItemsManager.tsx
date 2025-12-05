import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Trash2, 
  Package,
  Loader2,
  ShoppingCart,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface OrderItemsManagerProps {
  orderId: string;
  currency?: string;
  onTotalChange?: (total: number) => void;
  readOnly?: boolean;
}

interface StockItem {
  id: string;
  type: string;
  sous_type: string | null;
  categorie: string;
}

interface OrderItem {
  id: string;
  stock_item_id: string;
  quantity_ordered: number;
  quantity_received: number | null;
  unit_price: number | null;
  total_price: number | null;
  variant_specs: any;
  notes: string | null;
  stock_items?: StockItem;
}

export const OrderItemsManager = ({ orderId, currency = "XAF", onTotalChange, readOnly }: OrderItemsManagerProps) => {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // New item form
  const [newItem, setNewItem] = useState({
    stock_item_id: "",
    quantity_ordered: 1,
    unit_price: 0,
  });

  useEffect(() => {
    loadData();
  }, [orderId]);

  const loadData = async () => {
    setLoading(true);
    
    // Load order items
    const { data: orderItems } = await supabase
      .from("procurement_order_items")
      .select(`
        *,
        stock_items (id, type, sous_type, categorie)
      `)
      .eq("order_id", orderId);

    if (orderItems) {
      setItems(orderItems);
      calculateTotal(orderItems);
    }

    // Load available stock items
    const { data: stockData } = await supabase
      .from("stock_items")
      .select("*")
      .order("type");

    if (stockData) {
      setStockItems(stockData);
    }

    setLoading(false);
  };

  const calculateTotal = (itemList: OrderItem[]) => {
    const total = itemList.reduce((sum, item) => sum + (item.total_price || 0), 0);
    
    // Update order total
    supabase
      .from("procurement_orders")
      .update({ total_amount: total })
      .eq("id", orderId)
      .then(() => {
        onTotalChange?.(total);
      });
  };

  const handleAddItem = async () => {
    if (!newItem.stock_item_id || newItem.quantity_ordered <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un article et une quantité valide",
        variant: "destructive",
      });
      return;
    }

    // Check if item already exists
    if (items.some(i => i.stock_item_id === newItem.stock_item_id)) {
      toast({
        title: "Article déjà ajouté",
        description: "Modifiez la quantité de l'article existant",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const totalPrice = newItem.quantity_ordered * newItem.unit_price;

      const { error } = await supabase
        .from("procurement_order_items")
        .insert({
          order_id: orderId,
          stock_item_id: newItem.stock_item_id,
          quantity_ordered: newItem.quantity_ordered,
          unit_price: newItem.unit_price,
          total_price: totalPrice,
        });

      if (error) throw error;

      toast({
        title: "Article ajouté",
        description: "L'article a été ajouté à la commande",
      });

      setNewItem({ stock_item_id: "", quantity_ordered: 1, unit_price: 0 });
      loadData();
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

  const handleUpdateItem = async (itemId: string, field: string, value: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const updatedItem = { ...item, [field]: value };
    
    if (field === "quantity_ordered" || field === "unit_price") {
      const qty = field === "quantity_ordered" ? value : item.quantity_ordered;
      const price = field === "unit_price" ? value : item.unit_price || 0;
      updatedItem.total_price = qty * price;
    }

    const { error } = await supabase
      .from("procurement_order_items")
      .update({
        [field]: value,
        total_price: updatedItem.total_price,
      })
      .eq("id", itemId);

    if (!error) {
      loadData();
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const { error } = await supabase
      .from("procurement_order_items")
      .delete()
      .eq("id", itemId);

    if (!error) {
      toast({
        title: "Article supprimé",
      });
      loadData();
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity_ordered, 0);

  // Group available stock items by category
  const groupedStockItems = stockItems.reduce((acc, item) => {
    if (!acc[item.categorie]) {
      acc[item.categorie] = [];
    }
    acc[item.categorie].push(item);
    return acc;
  }, {} as Record<string, StockItem[]>);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-muted-foreground">Chargement des articles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add new item form - hide in read-only mode */}
      {!readOnly && (
        <Card className="glass border-emerald-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-500" />
              Ajouter un article
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Article</label>
                <Select
                  value={newItem.stock_item_id}
                  onValueChange={(value) => setNewItem({ ...newItem, stock_item_id: value })}
                >
                  <SelectTrigger className="glass border-border/50">
                    <SelectValue placeholder="Sélectionner un article..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {Object.entries(groupedStockItems).map(([category, categoryItems]) => (
                      <div key={category}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                          {category === "GEAR" ? "🎽 Habillement" : "🍽️ Alimentaire"}
                        </div>
                        {categoryItems
                          .filter((i) => !items.some((existing) => existing.stock_item_id === i.id))
                          .map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.type} {item.sous_type ? `- ${item.sous_type}` : ""}
                            </SelectItem>
                          ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28 space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Quantité</label>
                <Input
                  type="number"
                  min={1}
                  value={newItem.quantity_ordered}
                  onChange={(e) => setNewItem({ ...newItem, quantity_ordered: parseInt(e.target.value) || 1 })}
                  className="glass border-border/50 text-center"
                />
              </div>
              <div className="w-36 space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Prix unitaire ({currency})</label>
                <Input
                  type="number"
                  min={0}
                  value={newItem.unit_price}
                  onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                  className="glass border-border/50 text-right"
                />
              </div>
              <Button
                onClick={handleAddItem}
                disabled={saving || !newItem.stock_item_id}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              layout
            >
              <Card className="glass border-border/50 hover:border-emerald-500/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10">
                      <Package className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {item.stock_items?.type}
                        {item.stock_items?.sous_type && ` - ${item.stock_items.sous_type}`}
                      </p>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {item.stock_items?.categorie === "GEAR" ? "Habillement" : "Alimentaire"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24">
                        {readOnly ? (
                          <p className="text-lg font-bold text-center">{item.quantity_ordered}</p>
                        ) : (
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity_ordered}
                            onChange={(e) => handleUpdateItem(item.id, "quantity_ordered", parseInt(e.target.value) || 1)}
                            className="glass border-border/50 text-center h-9"
                          />
                        )}
                        <p className="text-xs text-muted-foreground text-center mt-1">Qté</p>
                      </div>
                      <div className="text-muted-foreground">×</div>
                      <div className="w-32">
                        {readOnly ? (
                          <p className="text-lg font-bold text-right">{(item.unit_price || 0).toLocaleString()}</p>
                        ) : (
                          <Input
                            type="number"
                            min={0}
                            value={item.unit_price || 0}
                            onChange={(e) => handleUpdateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                            className="glass border-border/50 text-right h-9"
                          />
                        )}
                        <p className="text-xs text-muted-foreground text-center mt-1">Prix unit.</p>
                      </div>
                      <div className="text-muted-foreground">=</div>
                      <div className="w-36 text-right">
                        <p className="text-lg font-bold text-emerald-500">
                          {(item.total_price || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">{currency}</p>
                      </div>
                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-9 w-9 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
            <ShoppingCart className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="font-medium mb-1">Aucun article</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Ajoutez des articles à cette commande
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-amber-500">
            <AlertCircle className="h-4 w-4" />
            <span>Une commande doit avoir au moins un article</span>
          </div>
        </motion.div>
      )}

      {/* Total */}
      {items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
            <CardContent className="p-5">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Total de la commande</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {items.length} article{items.length > 1 ? "s" : ""} • {totalQuantity} unités
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-emerald-500">
                    {totalAmount.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">{currency}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};
