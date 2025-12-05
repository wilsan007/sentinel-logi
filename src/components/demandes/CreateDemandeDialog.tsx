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
import { Loader2, Package, Search, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CreateDemandeDialogProps {
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

export function CreateDemandeDialog({
  open,
  onOpenChange,
  locationId,
  onSuccess,
}: CreateDemandeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadStockItems();
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setSelectedItem(null);
    setQuantity(1);
    setNotes("");
    setSearchTerm("");
    setSelectedCategory("all");
  };

  const loadStockItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("stock_items")
        .select("id, type, sous_type, categorie")
        .order("type");

      if (error) throw error;
      setStockItems(data || []);
    } catch (error) {
      console.error("Error loading stock items:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = stockItems.filter((item) => {
    const matchesSearch = 
      item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sous_type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.categorie === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSubmit = async () => {
    if (!selectedItem) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un article",
        variant: "destructive",
      });
      return;
    }

    if (quantity <= 0) {
      toast({
        title: "Erreur",
        description: "La quantité doit être supérieure à 0",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("requests").insert({
        location_id: locationId,
        stock_item_id: selectedItem.id,
        quantite_demandee: quantity,
        notes: notes || null,
        demande_par: user?.id,
        statut: "en_attente",
      });

      if (error) throw error;
      onSuccess();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border border-purple-500/20 max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Package className="h-5 w-5 text-purple-500" />
            </div>
            <span>Nouvelle demande au Stock Central</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Category Filter */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un article..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass border-border/50"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px] glass border-border/50">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                <SelectItem value="GEAR">🎽 Habillement</SelectItem>
                <SelectItem value="FOOD">🍲 Alimentaire</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Item Selection */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">
              Sélectionnez un article ({filteredItems.length} disponibles)
            </Label>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-1">
                <AnimatePresence>
                  {filteredItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <Card 
                        className={`cursor-pointer transition-all ${
                          selectedItem?.id === item.id
                            ? "border-purple-500 bg-purple-500/10"
                            : "glass border-border/50 hover:border-purple-500/30"
                        }`}
                        onClick={() => setSelectedItem(item)}
                      >
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={
                              item.categorie === "GEAR"
                                ? "text-cyan-500 border-cyan-500/30"
                                : "text-amber-500 border-amber-500/30"
                            }>
                              {item.categorie === "GEAR" ? "🎽" : "🍲"}
                            </Badge>
                            <div>
                              <p className="text-sm font-medium">{item.type}</p>
                              {item.sous_type && (
                                <p className="text-xs text-muted-foreground">{item.sous_type}</p>
                              )}
                            </div>
                          </div>
                          {selectedItem?.id === item.id && (
                            <Check className="h-4 w-4 text-purple-500" />
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Quantity and Notes */}
          {selectedItem && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Card className="glass border-purple-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Badge className={
                      selectedItem.categorie === "GEAR"
                        ? "bg-cyan-500/20 text-cyan-500 border-0"
                        : "bg-amber-500/20 text-amber-500 border-0"
                    }>
                      {selectedItem.categorie}
                    </Badge>
                    <span className="font-medium">{selectedItem.type}</span>
                    {selectedItem.sous_type && (
                      <span className="text-muted-foreground">- {selectedItem.sous_type}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantité demandée</Label>
                      <Input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                        min={1}
                        className="glass border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Justification (optionnel)</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Raison de la demande..."
                        className="glass border-border/50 min-h-[80px]"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        <DialogFooter className="border-t border-border/50 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !selectedItem}
            className="bg-purple-600 hover:bg-purple-700 gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Package className="h-4 w-4" />
            )}
            Soumettre la demande
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
