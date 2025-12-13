import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Package, Plus, Search, AlertTriangle } from "lucide-react";

interface SparePartsOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onSuccess?: () => void;
}

interface SparePart {
  id: string;
  nom: string;
  reference: string;
  categorie: string;
  quantite: number;
  seuil_alerte: number | null;
  prix_unitaire: number | null;
}

export function SparePartsOrderDialog({
  open,
  onOpenChange,
  orderId,
  onSuccess,
}: SparePartsOrderDialogProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParts, setSelectedParts] = useState<Map<string, { part: SparePart; quantity: number; unitPrice: number }>>(new Map());

  // Load spare parts
  const { data: spareParts, isLoading } = useQuery({
    queryKey: ["spare-parts-for-order"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spare_parts")
        .select("*")
        .order("categorie, nom");
      if (error) throw error;
      return data as SparePart[];
    },
  });

  // Load pending spare parts requests
  const { data: pendingRequests } = useQuery({
    queryKey: ["spare-parts-requests-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spare_parts_requests")
        .select("*")
        .in("statut", ["en_attente", "approuve"])
        .order("urgence", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addItemsMutation = useMutation({
    mutationFn: async () => {
      const items = Array.from(selectedParts.values());
      
      for (const item of items) {
        // First, ensure spare part exists as a stock_item
        let stockItemId: string;
        
        const { data: existingStockItem } = await supabase
          .from("stock_items")
          .select("id")
          .eq("type", item.part.nom)
          .eq("categorie", "SPARE_PARTS")
          .maybeSingle();

        if (existingStockItem) {
          stockItemId = existingStockItem.id;
        } else {
          // Create stock item for this spare part
          const { data: newStockItem, error: createError } = await supabase
            .from("stock_items")
            .insert({
              type: item.part.nom,
              sous_type: item.part.reference,
              categorie: "SPARE_PARTS",
              description: `Pièce détachée: ${item.part.categorie}`,
            })
            .select()
            .single();

          if (createError) throw createError;
          stockItemId = newStockItem.id;
        }

        // Add to order items
        const { error: itemError } = await supabase
          .from("procurement_order_items")
          .insert({
            order_id: orderId,
            stock_item_id: stockItemId,
            quantity_ordered: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.quantity * item.unitPrice,
            notes: `Réf: ${item.part.reference} - Catégorie: ${item.part.categorie}`,
          });

        if (itemError) throw itemError;

        // Update spare part with order reference
        await supabase
          .from("spare_parts")
          .update({
            procurement_order_id: orderId,
            last_order_date: new Date().toISOString().split("T")[0],
            last_order_quantity: item.quantity,
          })
          .eq("id", item.part.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurement-order-items"] });
      queryClient.invalidateQueries({ queryKey: ["spare-parts"] });
      toast.success(`${selectedParts.size} pièce(s) ajoutée(s) à la commande`);
      setSelectedParts(new Map());
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const togglePart = (part: SparePart) => {
    const newSelected = new Map(selectedParts);
    if (newSelected.has(part.id)) {
      newSelected.delete(part.id);
    } else {
      newSelected.set(part.id, {
        part,
        quantity: part.seuil_alerte ? Math.max(part.seuil_alerte - part.quantite, 1) : 5,
        unitPrice: part.prix_unitaire || 0,
      });
    }
    setSelectedParts(newSelected);
  };

  const updateQuantity = (partId: string, quantity: number) => {
    const newSelected = new Map(selectedParts);
    const item = newSelected.get(partId);
    if (item) {
      item.quantity = Math.max(1, quantity);
      setSelectedParts(newSelected);
    }
  };

  const updatePrice = (partId: string, price: number) => {
    const newSelected = new Map(selectedParts);
    const item = newSelected.get(partId);
    if (item) {
      item.unitPrice = Math.max(0, price);
      setSelectedParts(newSelected);
    }
  };

  const addFromRequests = () => {
    if (!pendingRequests || !spareParts) return;
    
    const newSelected = new Map(selectedParts);
    
    pendingRequests.forEach((req) => {
      if (req.spare_part_id) {
        const part = spareParts.find((p) => p.id === req.spare_part_id);
        if (part && !newSelected.has(part.id)) {
          newSelected.set(part.id, {
            part,
            quantity: req.quantite_demandee,
            unitPrice: part.prix_unitaire || 0,
          });
        }
      }
    });
    
    setSelectedParts(newSelected);
    toast.success(`${pendingRequests.length} demande(s) ajoutée(s)`);
  };

  const filteredParts = spareParts?.filter(
    (part) =>
      part.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.categorie.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group parts by category
  const groupedParts = filteredParts?.reduce((acc, part) => {
    if (!acc[part.categorie]) {
      acc[part.categorie] = [];
    }
    acc[part.categorie].push(part);
    return acc;
  }, {} as Record<string, SparePart[]>);

  const totalAmount = Array.from(selectedParts.values()).reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const lowStockParts = spareParts?.filter(
    (p) => p.seuil_alerte && p.quantite <= p.seuil_alerte
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border border-orange-500/20 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-500">
            <Package className="h-5 w-5" />
            Ajouter des Pièces Détachées
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une pièce..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 glass border-border/50"
            />
          </div>
          {pendingRequests && pendingRequests.length > 0 && (
            <Button
              variant="outline"
              onClick={addFromRequests}
              className="border-orange-500/30 text-orange-500 hover:bg-orange-500/10"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter {pendingRequests.length} demande(s)
            </Button>
          )}
        </div>

        {lowStockParts && lowStockParts.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
            <div className="flex items-center gap-2 text-amber-500 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium text-sm">{lowStockParts.length} pièce(s) en stock faible</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStockParts.slice(0, 5).map((part) => (
                <Badge
                  key={part.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-amber-500/20"
                  onClick={() => togglePart(part)}
                >
                  {part.nom} ({part.quantite}/{part.seuil_alerte})
                </Badge>
              ))}
              {lowStockParts.length > 5 && (
                <Badge variant="outline">+{lowStockParts.length - 5} autres</Badge>
              )}
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {groupedParts &&
                Object.entries(groupedParts).map(([category, parts]) => (
                  <div key={category}>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                      {category}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {parts.map((part) => {
                        const isSelected = selectedParts.has(part.id);
                        const selectedItem = selectedParts.get(part.id);
                        const isLowStock = part.seuil_alerte && part.quantite <= part.seuil_alerte;

                        return (
                          <Card
                            key={part.id}
                            className={`cursor-pointer transition-all ${
                              isSelected
                                ? "border-orange-500 bg-orange-500/10"
                                : "border-border/50 hover:border-orange-500/50"
                            }`}
                            onClick={() => !isSelected && togglePart(part)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => togglePart(part)}
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium truncate">{part.nom}</p>
                                    {isLowStock && (
                                      <Badge className="bg-red-500/20 text-red-500 text-xs shrink-0">
                                        Stock faible
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Réf: {part.reference} • Stock: {part.quantite}
                                  </p>
                                  
                                  {isSelected && selectedItem && (
                                    <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                                      <Input
                                        type="number"
                                        min={1}
                                        value={selectedItem.quantity}
                                        onChange={(e) =>
                                          updateQuantity(part.id, parseInt(e.target.value) || 1)
                                        }
                                        className="w-20 h-8 text-center text-sm"
                                        placeholder="Qté"
                                      />
                                      <span className="text-muted-foreground text-sm">×</span>
                                      <Input
                                        type="number"
                                        min={0}
                                        value={selectedItem.unitPrice}
                                        onChange={(e) =>
                                          updatePrice(part.id, parseFloat(e.target.value) || 0)
                                        }
                                        className="w-24 h-8 text-right text-sm"
                                        placeholder="Prix"
                                      />
                                      <span className="text-xs text-muted-foreground">FDJ</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </ScrollArea>

        {selectedParts.size > 0 && (
          <div className="pt-4 border-t border-border/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {selectedParts.size} pièce(s) sélectionnée(s)
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-orange-500">
                  {totalAmount.toLocaleString()} FDJ
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="glass border-border/50"
          >
            Annuler
          </Button>
          <Button
            onClick={() => addItemsMutation.mutate()}
            disabled={selectedParts.size === 0 || addItemsMutation.isPending}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {addItemsMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ajout...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter à la commande
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
