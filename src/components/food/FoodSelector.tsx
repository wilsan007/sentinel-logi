import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, 
  ArrowLeft, 
  Plus, 
  Minus, 
  Search,
  Calendar,
  Truck,
  AlertTriangle,
  Check
} from "lucide-react";
import { ProgressStepper } from "@/components/gear/ProgressStepper";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FoodStep = {
  id: number;
  name: string;
  description: string;
  completed: boolean;
  current: boolean;
};

type FoodItem = {
  id: string;
  type: string;
  sous_type: string | null;
  description: string | null;
};

type FoodVariant = {
  id: string;
  quantite: number;
  type_unite: string | null;
  seuil_alerte: number | null;
};

type Batch = {
  id: string;
  batch_number: string;
  quantity: number;
  original_quantity: number;
  arrival_date: string;
  expiry_date: string | null;
  supplier_name: string | null;
  unit_cost: number | null;
};

interface FoodSelectorProps {
  locationId: string;
  mode: "stock" | "distribute";
  onSuccess?: () => void;
}

const UNIT_LABELS: Record<string, string> = {
  kg: "Kilogrammes",
  litre: "Litres",
  boite: "Boîtes",
  unite: "Unités"
};

export function FoodSelector({ locationId, mode, onSuccess }: FoodSelectorProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [variants, setVariants] = useState<FoodVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<FoodVariant | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Add stock dialog
  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false);
  const [newBatch, setNewBatch] = useState({
    quantity: 1,
    supplier_name: "",
    unit_cost: 0,
    expiry_date: "",
    customs_document_ref: ""
  });

  // Distribution dialog
  const [distributeDialogOpen, setDistributeDialogOpen] = useState(false);
  const [distributeAmount, setDistributeAmount] = useState(1);
  const [distributeMotif, setDistributeMotif] = useState("Distribution quotidienne");
  
  const { toast } = useToast();

  const steps: FoodStep[] = mode === "stock" ? [
    { id: 1, name: "Catégorie", description: "Choisir le produit", completed: currentStep > 0, current: currentStep === 0 },
    { id: 2, name: "Variante", description: "Sélectionner la variante", completed: currentStep > 1, current: currentStep === 1 },
    { id: 3, name: "Ajouter", description: "Quantité et fournisseur", completed: currentStep > 2, current: currentStep === 2 },
  ] : [
    { id: 1, name: "Catégorie", description: "Choisir le produit", completed: currentStep > 0, current: currentStep === 0 },
    { id: 2, name: "Variante", description: "Sélectionner la variante", completed: currentStep > 1, current: currentStep === 1 },
    { id: 3, name: "Lots", description: "Voir les lots FIFO", completed: currentStep > 2, current: currentStep === 2 },
    { id: 4, name: "Distribuer", description: "Quantité à distribuer", completed: currentStep > 3, current: currentStep === 3 },
  ];

  useEffect(() => {
    loadFoodItems();
  }, []);

  const loadFoodItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("stock_items")
      .select("*")
      .eq("categorie", "FOOD")
      .order("type");

    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger les articles", variant: "destructive" });
    } else {
      setFoodItems(data || []);
    }
    setLoading(false);
  };

  const handleItemSelect = async (item: FoodItem) => {
    setSelectedItem(item);
    setLoading(true);

    const { data, error } = await supabase
      .from("item_variants")
      .select("*")
      .eq("stock_item_id", item.id)
      .eq("location_id", locationId);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger les variantes", variant: "destructive" });
      setLoading(false);
      return;
    }

    setVariants(data || []);
    setCurrentStep(1);
    setLoading(false);
  };

  const handleVariantSelect = async (variant: FoodVariant) => {
    setSelectedVariant(variant);

    if (mode === "stock") {
      setCurrentStep(2);
      setAddStockDialogOpen(true);
    } else {
      // Load batches for distribution
      setLoading(true);
      const { data, error } = await supabase
        .from("inventory_batches")
        .select("*")
        .eq("item_variant_id", variant.id)
        .eq("location_id", locationId)
        .eq("is_depleted", false)
        .gt("quantity", 0)
        .order("arrival_date", { ascending: true }); // FIFO

      if (error) {
        toast({ title: "Erreur", description: "Impossible de charger les lots", variant: "destructive" });
      } else {
        setBatches(data || []);
      }
      setCurrentStep(2);
      setLoading(false);
    }
  };

  const handleAddStock = async () => {
    if (!selectedVariant || newBatch.quantity <= 0) return;

    setLoading(true);
    const batchNumber = `BATCH-${Date.now().toString(36).toUpperCase()}`;

    const { error: batchError } = await supabase
      .from("inventory_batches")
      .insert({
        batch_number: batchNumber,
        item_variant_id: selectedVariant.id,
        location_id: locationId,
        quantity: newBatch.quantity,
        original_quantity: newBatch.quantity,
        supplier_name: newBatch.supplier_name || null,
        unit_cost: newBatch.unit_cost || null,
        expiry_date: newBatch.expiry_date || null,
        customs_document_ref: newBatch.customs_document_ref || null
      });

    if (batchError) {
      toast({ title: "Erreur", description: "Impossible d'ajouter le lot", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Update variant total quantity
    const { error: updateError } = await supabase
      .from("item_variants")
      .update({ quantite: selectedVariant.quantite + newBatch.quantity })
      .eq("id", selectedVariant.id);

    if (updateError) {
      toast({ title: "Attention", description: "Stock ajouté mais total non mis à jour", variant: "destructive" });
    }

    toast({ 
      title: "Stock ajouté", 
      description: `${newBatch.quantity} ${UNIT_LABELS[selectedVariant.type_unite || "unite"]} ajoutés avec succès` 
    });

    setAddStockDialogOpen(false);
    handleReset();
    onSuccess?.();
    setLoading(false);
  };

  const handleDistribute = async () => {
    if (!selectedVariant || distributeAmount <= 0) return;

    setLoading(true);

    // Use the FIFO distribution function
    const { data, error } = await supabase.rpc('distribute_food_fifo', {
      p_item_variant_id: selectedVariant.id,
      p_location_id: locationId,
      p_amount_needed: distributeAmount
    });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({
      title: "Distribution effectuée",
      description: `${distributeAmount} ${UNIT_LABELS[selectedVariant.type_unite || "unite"]} distribués (FIFO)`
    });

    setDistributeDialogOpen(false);
    handleReset();
    onSuccess?.();
    setLoading(false);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setSelectedItem(null);
    setSelectedVariant(null);
    setVariants([]);
    setBatches([]);
    setNewBatch({ quantity: 1, supplier_name: "", unit_cost: 0, expiry_date: "", customs_document_ref: "" });
    setDistributeAmount(1);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      if (currentStep === 1) {
        setSelectedItem(null);
        setVariants([]);
      } else if (currentStep === 2) {
        setSelectedVariant(null);
        setBatches([]);
      }
    }
  };

  const filteredItems = foodItems.filter(item =>
    item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.sous_type && item.sous_type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalBatchQuantity = batches.reduce((sum, b) => sum + b.quantity, 0);

  return (
    <div className="space-y-6">
      <ProgressStepper steps={steps} />

      {currentStep > 0 && (
        <Button variant="ghost" onClick={handleBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
      )}

      <AnimatePresence mode="wait">
        {/* Step 0: Select Food Category */}
        {currentStep === 0 && (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit alimentaire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass"
              />
            </div>

            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="glass-hover p-6 neon-border-secondary cursor-pointer group"
                    onClick={() => handleItemSelect(item)}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="p-4 rounded-xl bg-secondary/10 group-hover:bg-secondary/20 transition-colors mb-4">
                        <Package className="h-12 w-12 text-secondary" />
                      </div>
                      <h3 className="font-bold text-lg">{item.type}</h3>
                      {item.sous_type && (
                        <p className="text-sm text-muted-foreground">{item.sous_type}</p>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 1: Select Variant */}
        {currentStep === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="text-xl font-bold neon-text-secondary">
              {selectedItem?.type} - Variantes disponibles
            </h3>

            {variants.length === 0 ? (
              <Card className="glass p-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Aucune variante trouvée pour ce produit</p>
                {mode === "stock" && (
                  <Button 
                    onClick={() => {
                      // Create a default variant
                      setSelectedVariant({ id: "new", quantite: 0, type_unite: "kg", seuil_alerte: 10 });
                      setCurrentStep(2);
                      setAddStockDialogOpen(true);
                    }}
                    className="bg-secondary/20 hover:bg-secondary/30 text-secondary"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une variante
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {variants.map((variant, index) => {
                  const isLowStock = variant.seuil_alerte && variant.quantite <= variant.seuil_alerte;
                  return (
                    <motion.div
                      key={variant.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card
                        className={`glass-hover p-6 cursor-pointer ${isLowStock ? "border-destructive/50" : "neon-border-secondary"}`}
                        onClick={() => handleVariantSelect(variant)}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-2xl font-bold text-secondary">
                            {variant.quantite}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {UNIT_LABELS[variant.type_unite || "unite"]}
                          </span>
                        </div>
                        {isLowStock && (
                          <div className="flex items-center gap-2 text-destructive text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            Stock bas
                          </div>
                        )}
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Step 2 for distribute: Show batches */}
        {currentStep === 2 && mode === "distribute" && (
          <motion.div
            key="step-2-distribute"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold neon-text-secondary">
                Lots disponibles (FIFO)
              </h3>
              <div className="text-sm text-muted-foreground">
                Total: <span className="font-bold text-secondary">{totalBatchQuantity}</span> {UNIT_LABELS[selectedVariant?.type_unite || "unite"]}
              </div>
            </div>

            {batches.length === 0 ? (
              <Card className="glass p-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun lot disponible</p>
              </Card>
            ) : (
              <>
                <div className="space-y-3">
                  {batches.map((batch, index) => {
                    const isExpiringSoon = batch.expiry_date && 
                      new Date(batch.expiry_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                    return (
                      <Card key={batch.id} className={`glass p-4 ${index === 0 ? "border-secondary/50" : ""}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {index === 0 && (
                              <span className="text-xs bg-secondary/20 text-secondary px-2 py-1 rounded">
                                Prochain
                              </span>
                            )}
                            <div>
                              <p className="font-medium">{batch.batch_number}</p>
                              <p className="text-sm text-muted-foreground">
                                Arrivé: {format(new Date(batch.arrival_date), "dd MMM yyyy", { locale: fr })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">{batch.quantity}</p>
                            {batch.expiry_date && (
                              <p className={`text-sm ${isExpiringSoon ? "text-destructive" : "text-muted-foreground"}`}>
                                Exp: {format(new Date(batch.expiry_date), "dd MMM yyyy", { locale: fr })}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                <Button 
                  onClick={() => {
                    setDistributeDialogOpen(true);
                    setCurrentStep(3);
                  }}
                  className="w-full bg-secondary hover:bg-secondary/90"
                  disabled={totalBatchQuantity === 0}
                >
                  <Minus className="h-4 w-4 mr-2" />
                  Distribuer
                </Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Stock Dialog */}
      <Dialog open={addStockDialogOpen} onOpenChange={setAddStockDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Ajouter du stock</DialogTitle>
            <DialogDescription>
              {selectedItem?.type} - Nouveau lot
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantité *</Label>
              <Input
                type="number"
                min={1}
                value={newBatch.quantity}
                onChange={(e) => setNewBatch({ ...newBatch, quantity: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Fournisseur</Label>
              <Input
                value={newBatch.supplier_name}
                onChange={(e) => setNewBatch({ ...newBatch, supplier_name: e.target.value })}
                placeholder="Nom du fournisseur"
              />
            </div>
            <div className="space-y-2">
              <Label>Coût unitaire</Label>
              <Input
                type="number"
                min={0}
                value={newBatch.unit_cost}
                onChange={(e) => setNewBatch({ ...newBatch, unit_cost: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Date d'expiration</Label>
              <Input
                type="date"
                value={newBatch.expiry_date}
                onChange={(e) => setNewBatch({ ...newBatch, expiry_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Réf. document douane</Label>
              <Input
                value={newBatch.customs_document_ref}
                onChange={(e) => setNewBatch({ ...newBatch, customs_document_ref: e.target.value })}
                placeholder="Optionnel"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStockDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleAddStock}
              disabled={loading || newBatch.quantity <= 0}
              className="bg-secondary hover:bg-secondary/90"
            >
              {loading ? "Ajout..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Distribute Dialog */}
      <Dialog open={distributeDialogOpen} onOpenChange={setDistributeDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Distribution FIFO</DialogTitle>
            <DialogDescription>
              {selectedItem?.type} - Stock disponible: {totalBatchQuantity} {UNIT_LABELS[selectedVariant?.type_unite || "unite"]}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantité à distribuer *</Label>
              <Input
                type="number"
                min={1}
                max={totalBatchQuantity}
                value={distributeAmount}
                onChange={(e) => setDistributeAmount(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Motif</Label>
              <Select value={distributeMotif} onValueChange={setDistributeMotif}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Distribution quotidienne">Distribution quotidienne</SelectItem>
                  <SelectItem value="Événement spécial">Événement spécial</SelectItem>
                  <SelectItem value="Urgence">Urgence</SelectItem>
                  <SelectItem value="Formation">Formation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDistributeDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleDistribute}
              disabled={loading || distributeAmount <= 0 || distributeAmount > totalBatchQuantity}
              className="bg-secondary hover:bg-secondary/90"
            >
              {loading ? "Distribution..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
