import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface OrderItemsManagerProps {
  orderId: string;
  onTotalChange?: (total: number) => void;
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

export const OrderItemsManager = ({ orderId, onTotalChange }: OrderItemsManagerProps) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add new item form */}
      <Card className="glass border-emerald-500/20">
        <CardContent className="p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Article</label>
              <Select
                value={newItem.stock_item_id}
                onValueChange={(value) => setNewItem({ ...newItem, stock_item_id: value })}
              >
                <SelectTrigger className="glass border-border/50">
                  <SelectValue placeholder="Sélectionner un article..." />
                </SelectTrigger>
                <SelectContent>
                  {stockItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.type} {item.sous_type ? `- ${item.sous_type}` : ""} ({item.categorie})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-32 space-y-2">
              <label className="text-sm font-medium">Quantité</label>
              <Input
                type="number"
                min={1}
                value={newItem.quantity_ordered}
                onChange={(e) => setNewItem({ ...newItem, quantity_ordered: parseInt(e.target.value) || 1 })}
                className="glass border-border/50"
              />
            </div>
            <div className="w-40 space-y-2">
              <label className="text-sm font-medium">Prix unitaire</label>
              <Input
                type="number"
                min={0}
                value={newItem.unit_price}
                onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                className="glass border-border/50"
              />
            </div>
            <Button
              onClick={handleAddItem}
              disabled={saving}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 border border-emerald-500/30"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Items list */}
      <div className="space-y-2">
        <AnimatePresence>
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="glass border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <Package className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {item.stock_items?.type}
                        {item.stock_items?.sous_type && ` - ${item.stock_items.sous_type}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.stock_items?.categorie}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24">
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity_ordered}
                          onChange={(e) => handleUpdateItem(item.id, "quantity_ordered", parseInt(e.target.value) || 1)}
                          className="glass border-border/50 text-center"
                        />
                        <p className="text-xs text-muted-foreground text-center mt-1">Quantité</p>
                      </div>
                      <div className="w-32">
                        <Input
                          type="number"
                          min={0}
                          value={item.unit_price || 0}
                          onChange={(e) => handleUpdateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                          className="glass border-border/50 text-right"
                        />
                        <p className="text-xs text-muted-foreground text-center mt-1">Prix unitaire</p>
                      </div>
                      <div className="w-32 text-right">
                        <p className="font-semibold text-emerald-500">
                          {(item.total_price || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Aucun article dans cette commande</p>
          <p className="text-sm">Ajoutez des articles ci-dessus</p>
        </div>
      )}

      {/* Total */}
      {items.length > 0 && (
        <Card className="glass border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">Total de la commande</span>
              <span className="text-2xl font-bold text-emerald-500">
                {totalAmount.toLocaleString()} XAF
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
