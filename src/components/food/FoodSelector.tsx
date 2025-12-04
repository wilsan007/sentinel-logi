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
  AlertTriangle,
  Apple,
  Coffee,
  Wheat,
  Droplet,
  Salad,
  Soup,
  ShoppingCart,
  X,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Supplier = {
  id: string;
  name: string;
  code: string;
};

type FoodStep = {
  id: number;
  name: string;
  description: string;
  completed: boolean;
  current: boolean;
};

type FoodCategory = {
  type: string;
  count: number;
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
  stock_item_id: string;
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

// Cart item for bulk operations
type CartItem = {
  item: FoodItem;
  variant: FoodVariant;
  quantity: number;
  supplier_name: string;
  unit_cost: number;
  expiry_date: string;
};

interface FoodSelectorProps {
  locationId: string;
  mode: "stock" | "distribute";
  isStockCentral?: boolean;
  onSuccess?: () => void;
}

type CampLocation = {
  id: string;
  nom: string;
  code: string;
};

const UNIT_LABELS: Record<string, string> = {
  kg: "Kilogrammes",
  litre: "Litres",
  boite: "Boîtes",
  unite: "Unités"
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Conserves": <Soup className="h-12 w-12" />,
  "Céréales & Féculents": <Wheat className="h-12 w-12" />,
  "Légumineuses": <Salad className="h-12 w-12" />,
  "Condiments & Épices": <Apple className="h-12 w-12" />,
  "Huiles & Matières Grasses": <Droplet className="h-12 w-12" />,
  "Boissons": <Coffee className="h-12 w-12" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  "Conserves": "text-orange-400",
  "Céréales & Féculents": "text-amber-400",
  "Légumineuses": "text-green-400",
  "Condiments & Épices": "text-red-400",
  "Huiles & Matières Grasses": "text-yellow-400",
  "Boissons": "text-cyan-400",
};

export function FoodSelector({ locationId, mode, isStockCentral = false, onSuccess }: FoodSelectorProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  
  // Camps for Stock Central distribution
  const [camps, setCamps] = useState<CampLocation[]>([]);
  const [selectedDestinationCamp, setSelectedDestinationCamp] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [itemStocks, setItemStocks] = useState<Record<string, number>>({});
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [variants, setVariants] = useState<FoodVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<FoodVariant | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Cart for multi-selection (stock mode)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [popoverData, setPopoverData] = useState({
    quantity: 1,
    supplier_id: "",
    supplier_name: "",
    unit_cost: 0,
    expiry_date: ""
  });

  // Suppliers list
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Distribution dialog
  const [distributeDialogOpen, setDistributeDialogOpen] = useState(false);
  const [distributeAmount, setDistributeAmount] = useState(1);
  
  // Confirmation dialog for bulk add
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  
  const { toast } = useToast();

  const steps: FoodStep[] = mode === "stock" ? [
    { id: 1, name: "Catégorie", description: "Choisir la catégorie", completed: currentStep > 0, current: currentStep === 0 },
    { id: 2, name: "Sélection", description: "Ajouter au panier", completed: cart.length > 0, current: currentStep === 1 },
    { id: 3, name: "Valider", description: "Confirmer l'ajout", completed: false, current: currentStep === 2 },
  ] : [
    { id: 1, name: "Catégorie", description: "Choisir la catégorie", completed: currentStep > 0, current: currentStep === 0 },
    { id: 2, name: "Produit", description: "Sélectionner le produit", completed: currentStep > 1, current: currentStep === 1 },
    { id: 3, name: "Lots", description: "Voir les lots FIFO", completed: currentStep > 2, current: currentStep === 2 },
    { id: 4, name: "Distribuer", description: "Quantité à distribuer", completed: false, current: currentStep === 3 },
  ];

  useEffect(() => {
    loadCategories();
    loadSuppliers();
    if (isStockCentral && mode === "distribute") {
      loadCamps();
    }
  }, [isStockCentral, mode]);

  const loadSuppliers = async () => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("id, name, code")
      .eq("is_active", true)
      .order("name");

    if (!error && data) {
      setSuppliers(data);
    }
  };

  const loadCamps = async () => {
    // Load all camps except Stock Central for distribution
    const { data, error } = await supabase
      .from("locations")
      .select("id, nom, code")
      .neq("code", "SC-000")
      .order("nom");

    if (!error && data) {
      setCamps(data);
    }
  };

  const loadCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("stock_items")
      .select("type")
      .eq("categorie", "FOOD");

    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger les catégories", variant: "destructive" });
    } else {
      const categoryMap = new Map<string, number>();
      data?.forEach(item => {
        categoryMap.set(item.type, (categoryMap.get(item.type) || 0) + 1);
      });
      const cats = Array.from(categoryMap.entries()).map(([type, count]) => ({ type, count }));
      setCategories(cats);
    }
    setLoading(false);
  };

  const handleCategorySelect = async (category: string) => {
    setSelectedCategory(category);
    setLoading(true);

    // Load all items with their variants for this category
    const { data: items, error } = await supabase
      .from("stock_items")
      .select("*")
      .eq("categorie", "FOOD")
      .eq("type", category)
      .order("sous_type");

    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger les produits", variant: "destructive" });
    } else {
      setFoodItems(items || []);
      
      // Fetch stock quantities for all items
      if (items && items.length > 0) {
        const { data: variants } = await supabase
          .from("item_variants")
          .select("stock_item_id, quantite")
          .eq("location_id", locationId)
          .in("stock_item_id", items.map(i => i.id));
        
        const stockMap: Record<string, number> = {};
        variants?.forEach(v => {
          stockMap[v.stock_item_id] = v.quantite;
        });
        setItemStocks(stockMap);
      }
    }
    setCurrentStep(1);
    setLoading(false);
  };

  // Get or create variant for an item
  const getOrCreateVariant = async (item: FoodItem): Promise<FoodVariant | null> => {
    // First try to find existing variant
    const { data: existingVariant } = await supabase
      .from("item_variants")
      .select("*")
      .eq("stock_item_id", item.id)
      .eq("location_id", locationId)
      .maybeSingle();

    if (existingVariant) {
      return existingVariant;
    }

    // Create new variant if none exists
    const defaultUnit = selectedCategory === "Huiles & Matières Grasses" ? "litre" 
      : selectedCategory === "Conserves" ? "boite" 
      : "kg";

    const { data: newVariant, error } = await supabase
      .from("item_variants")
      .insert({
        stock_item_id: item.id,
        location_id: locationId,
        quantite: 0,
        seuil_alerte: 10,
        type_unite: defaultUnit as any
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Erreur", description: "Impossible de créer la variante", variant: "destructive" });
      return null;
    }

    return newVariant;
  };

  // Handle popover open for stock mode
  const handleProductClick = async (item: FoodItem) => {
    if (mode === "stock") {
      // Reset popover data
      setPopoverData({
        quantity: 1,
        supplier_id: "",
        supplier_name: "",
        unit_cost: 0,
        expiry_date: ""
      });
      
      // Fetch current stock for this item
      const { data: variantData } = await supabase
        .from("item_variants")
        .select("quantite")
        .eq("stock_item_id", item.id)
        .eq("location_id", locationId)
        .maybeSingle();
      
      setCurrentStock(variantData?.quantite || 0);
      setActivePopover(item.id);
    } else {
      // Distribution mode - existing flow
      await handleItemSelectForDistribution(item);
    }
  };

  // Add item to cart
  const handleAddToCart = async (item: FoodItem) => {
    if (popoverData.quantity <= 0) {
      toast({ title: "Erreur", description: "La quantité doit être supérieure à 0", variant: "destructive" });
      return;
    }

    setLoading(true);
    const variant = await getOrCreateVariant(item);
    
    if (!variant) {
      setLoading(false);
      return;
    }

    // Check if item already in cart
    const existingIndex = cart.findIndex(c => c.item.id === item.id);
    
    if (existingIndex >= 0) {
      // Update existing cart item
      const newCart = [...cart];
      newCart[existingIndex] = {
        item,
        variant,
        quantity: popoverData.quantity,
        supplier_name: popoverData.supplier_name,
        unit_cost: popoverData.unit_cost,
        expiry_date: popoverData.expiry_date
      };
      setCart(newCart);
    } else {
      // Add new item to cart
      setCart([...cart, {
        item,
        variant,
        quantity: popoverData.quantity,
        supplier_name: popoverData.supplier_name,
        unit_cost: popoverData.unit_cost,
        expiry_date: popoverData.expiry_date
      }]);
    }

    setActivePopover(null);
    setLoading(false);
    toast({ 
      title: "Ajouté au panier", 
      description: `${item.sous_type || item.type} - ${popoverData.quantity} unités` 
    });
  };

  // Remove from cart
  const handleRemoveFromCart = (itemId: string) => {
    setCart(cart.filter(c => c.item.id !== itemId));
  };

  // Submit all cart items
  const handleSubmitCart = async () => {
    if (cart.length === 0) return;

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const cartItem of cart) {
      const batchNumber = `BATCH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

      const { error: batchError } = await supabase
        .from("inventory_batches")
        .insert({
          batch_number: batchNumber,
          item_variant_id: cartItem.variant.id,
          location_id: locationId,
          quantity: cartItem.quantity,
          original_quantity: cartItem.quantity,
          supplier_name: cartItem.supplier_name || null,
          unit_cost: cartItem.unit_cost || null,
          expiry_date: cartItem.expiry_date || null
        });

      if (batchError) {
        errorCount++;
        continue;
      }

      // Update variant total quantity
      await supabase
        .from("item_variants")
        .update({ quantite: cartItem.variant.quantite + cartItem.quantity })
        .eq("id", cartItem.variant.id);

      successCount++;
    }

    setLoading(false);
    setConfirmDialogOpen(false);

    if (errorCount > 0) {
      toast({ 
        title: "Ajout partiel", 
        description: `${successCount} produits ajoutés, ${errorCount} erreurs`,
        variant: "destructive"
      });
    } else {
      toast({ 
        title: "Stock ajouté", 
        description: `${successCount} produits ajoutés avec succès` 
      });
    }

    setCart([]);
    handleReset();
    onSuccess?.();
  };

  // Distribution mode handlers
  const handleItemSelectForDistribution = async (item: FoodItem) => {
    setSelectedItem(item);
    setLoading(true);

    const { data: variantData } = await supabase
      .from("item_variants")
      .select("*")
      .eq("stock_item_id", item.id)
      .eq("location_id", locationId)
      .maybeSingle();

    if (!variantData) {
      toast({ title: "Info", description: "Aucun stock disponible pour ce produit" });
      setLoading(false);
      return;
    }

    setSelectedVariant(variantData);

    // Load batches for distribution
    const { data: batchData, error } = await supabase
      .from("inventory_batches")
      .select("*")
      .eq("item_variant_id", variantData.id)
      .eq("location_id", locationId)
      .eq("is_depleted", false)
      .gt("quantity", 0)
      .order("arrival_date", { ascending: true });

    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger les lots", variant: "destructive" });
    } else {
      setBatches(batchData || []);
    }
    setCurrentStep(2);
    setLoading(false);
  };

  const handleDistribute = async () => {
    if (!selectedVariant || distributeAmount <= 0) return;
    
    // If Stock Central, we need a destination camp
    if (isStockCentral && !selectedDestinationCamp) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un camp destinataire", variant: "destructive" });
      return;
    }

    setLoading(true);

    // Deduct from Stock Central using FIFO
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

    // If Stock Central, add stock to destination camp
    if (isStockCentral && selectedDestinationCamp) {
      // Get or create variant in destination camp
      const { data: destVariant } = await supabase
        .from("item_variants")
        .select("*")
        .eq("stock_item_id", selectedItem?.id)
        .eq("location_id", selectedDestinationCamp)
        .maybeSingle();

      let destVariantId: string;
      let currentDestQty = 0;

      if (destVariant) {
        destVariantId = destVariant.id;
        currentDestQty = destVariant.quantite;
      } else {
        // Create new variant in destination camp
        if (!selectedItem?.id) {
          toast({ title: "Erreur", description: "Produit non sélectionné", variant: "destructive" });
          setLoading(false);
          return;
        }
        
        const { data: newVariant, error: createError } = await supabase
          .from("item_variants")
          .insert([{
            stock_item_id: selectedItem.id,
            location_id: selectedDestinationCamp,
            quantite: 0,
            seuil_alerte: selectedVariant.seuil_alerte,
            type_unite: selectedVariant.type_unite as "kg" | "litre" | "boite" | "unite" | null
          }])
          .select()
          .single();

        if (createError || !newVariant) {
          toast({ title: "Erreur", description: "Impossible de créer le stock au camp destinataire", variant: "destructive" });
          setLoading(false);
          return;
        }
        destVariantId = newVariant.id;
      }

      // Create batch in destination camp
      const batchNumber = `TRANSFER-${Date.now().toString(36).toUpperCase()}`;
      const { error: batchError } = await supabase
        .from("inventory_batches")
        .insert({
          batch_number: batchNumber,
          item_variant_id: destVariantId,
          location_id: selectedDestinationCamp,
          quantity: distributeAmount,
          original_quantity: distributeAmount,
          supplier_name: "Stock Central"
        });

      if (batchError) {
        toast({ title: "Avertissement", description: "Stock déduit mais erreur lors de l'ajout au camp", variant: "destructive" });
      }

      // Update destination variant quantity
      await supabase
        .from("item_variants")
        .update({ quantite: currentDestQty + distributeAmount })
        .eq("id", destVariantId);

      const campName = camps.find(c => c.id === selectedDestinationCamp)?.nom || "Camp";
      toast({
        title: "Redistribution effectuée",
        description: `${distributeAmount} ${UNIT_LABELS[selectedVariant?.type_unite || "unite"]} transférés vers ${campName}`
      });
    } else {
      toast({
        title: "Distribution effectuée",
        description: `${distributeAmount} ${UNIT_LABELS[selectedVariant?.type_unite || "unite"]} distribués (FIFO)`
      });
    }

    setDistributeDialogOpen(false);
    setSelectedDestinationCamp("");
    handleReset();
    onSuccess?.();
    setLoading(false);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setSelectedCategory(null);
    setSelectedItem(null);
    setSelectedVariant(null);
    setFoodItems([]);
    setVariants([]);
    setBatches([]);
    setDistributeAmount(1);
    setActivePopover(null);
    setSelectedDestinationCamp("");
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      if (currentStep === 1) {
        setSelectedCategory(null);
        setFoodItems([]);
      } else if (currentStep === 2) {
        setSelectedItem(null);
        setBatches([]);
      }
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredItems = foodItems.filter(item =>
    (item.sous_type && item.sous_type.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalBatchQuantity = batches.reduce((sum, b) => sum + b.quantity, 0);
  const cartItemIds = new Set(cart.map(c => c.item.id));

  return (
    <div className="space-y-6">
      <ProgressStepper steps={steps} />

      <div className="flex items-center justify-between">
        {currentStep > 0 && (
          <Button variant="ghost" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
        )}
        
        {/* Cart indicator for stock mode */}
        {mode === "stock" && cart.length > 0 && (
          <Button 
            onClick={() => setConfirmDialogOpen(true)}
            className="bg-secondary hover:bg-secondary/90 gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Panier ({cart.length})
            <Badge variant="secondary" className="ml-1 bg-background/20">
              {cart.reduce((sum, c) => sum + c.quantity, 0)} unités
            </Badge>
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 0: Select Category */}
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
                placeholder="Rechercher une catégorie..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass"
              />
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.map((cat, index) => (
                <motion.div
                  key={cat.type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="glass-hover p-6 neon-border-secondary cursor-pointer group"
                    onClick={() => handleCategorySelect(cat.type)}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className={`p-4 rounded-xl bg-secondary/10 group-hover:bg-secondary/20 transition-colors mb-4 ${CATEGORY_COLORS[cat.type] || "text-secondary"}`}>
                        {CATEGORY_ICONS[cat.type] || <Package className="h-12 w-12" />}
                      </div>
                      <h3 className="font-bold text-lg">{cat.type}</h3>
                      <p className="text-sm text-muted-foreground">{cat.count} produits</p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 1: Product Selection with Popovers (Stock Mode) */}
        {currentStep === 1 && mode === "stock" && (
          <motion.div
            key="step-1-stock"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="text-xl font-bold neon-text-secondary">
              {selectedCategory} - Cliquez pour ajouter au panier
            </h3>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass"
              />
            </div>

            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(searchTerm ? filteredItems : foodItems).map((item, index) => {
                const isInCart = cartItemIds.has(item.id);
                const cartItem = cart.find(c => c.item.id === item.id);
                
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Popover 
                      open={activePopover === item.id} 
                      onOpenChange={(open) => {
                        if (!open) setActivePopover(null);
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Card
                          className={`glass-hover p-4 cursor-pointer group relative transition-all ${
                            isInCart 
                              ? "border-secondary ring-2 ring-secondary/30" 
                              : "neon-border-secondary"
                          }`}
                          onClick={() => handleProductClick(item)}
                        >
                          {isInCart && (
                            <div className="absolute -top-2 -right-2 bg-secondary text-secondary-foreground rounded-full p-1">
                              <Check className="h-4 w-4" />
                            </div>
                          )}
                          <div className="flex flex-col items-center text-center">
                            <div className={`p-3 rounded-xl bg-secondary/10 group-hover:bg-secondary/20 transition-colors mb-2 ${CATEGORY_COLORS[selectedCategory || ""] || "text-secondary"}`}>
                              {CATEGORY_ICONS[selectedCategory || ""] || <Package className="h-8 w-8" />}
                            </div>
                            <h3 className="font-bold text-sm">{item.sous_type || item.type}</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              Stock: <span className="font-semibold text-secondary">{(itemStocks[item.id] || 0) + (cart.find(c => c.item.id === item.id)?.quantity || 0)}</span>
                            </p>
                            {isInCart && cartItem && (
                              <Badge className="mt-2 bg-secondary/20 text-secondary">
                                +{cartItem.quantity} au panier
                              </Badge>
                            )}
                          </div>
                        </Card>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 glass" side="right" align="start">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-secondary">{item.sous_type || item.type}</h4>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => setActivePopover(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Current stock display */}
                          <div className="p-2 rounded-lg bg-secondary/10 border border-secondary/20">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Stock actuel</span>
                              <Badge variant="outline" className="bg-secondary/20 text-secondary font-bold">
                                {currentStock + (cart.find(c => c.item.id === item.id)?.quantity || 0)} unités
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Quantité</Label>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setPopoverData(p => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  min={1}
                                  value={popoverData.quantity}
                                  onChange={(e) => setPopoverData(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                                  className="h-8 text-center"
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setPopoverData(p => ({ ...p, quantity: p.quantity + 1 }))}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Fournisseur</Label>
                              <Select
                                value={popoverData.supplier_id}
                                onValueChange={(value) => {
                                  const supplier = suppliers.find(s => s.id === value);
                                  setPopoverData(p => ({ 
                                    ...p, 
                                    supplier_id: value,
                                    supplier_name: supplier?.name || ""
                                  }));
                                }}
                              >
                                <SelectTrigger className="h-8 text-sm bg-background">
                                  <SelectValue placeholder="Sélectionner un fournisseur" />
                                </SelectTrigger>
                                <SelectContent className="bg-background border border-border z-50">
                                  {suppliers.map((supplier) => (
                                    <SelectItem key={supplier.id} value={supplier.id}>
                                      {supplier.name} ({supplier.code})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Coût unitaire (XAF)</Label>
                              <Input
                                type="number"
                                min={0}
                                value={popoverData.unit_cost}
                                onChange={(e) => setPopoverData(p => ({ ...p, unit_cost: parseFloat(e.target.value) || 0 }))}
                                className="h-8 text-sm"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Date d'expiration</Label>
                              <Input
                                type="date"
                                value={popoverData.expiry_date}
                                onChange={(e) => setPopoverData(p => ({ ...p, expiry_date: e.target.value }))}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {isInCart && (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="flex-1"
                                onClick={() => {
                                  handleRemoveFromCart(item.id);
                                  setActivePopover(null);
                                }}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Retirer
                              </Button>
                            )}
                            <Button
                              size="sm"
                              className="flex-1 bg-secondary hover:bg-secondary/90"
                              onClick={() => handleAddToCart(item)}
                              disabled={loading}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {isInCart ? "Modifier" : "Ajouter"}
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Step 1: Product Selection (Distribute Mode) */}
        {currentStep === 1 && mode === "distribute" && (
          <motion.div
            key="step-1-distribute"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="text-xl font-bold neon-text-secondary">
              {selectedCategory} - Sélectionner un produit
            </h3>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass"
              />
            </div>

            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(searchTerm ? filteredItems : foodItems).map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card
                    className="glass-hover p-4 neon-border-secondary cursor-pointer group"
                    onClick={() => handleProductClick(item)}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className={`p-3 rounded-xl bg-secondary/10 group-hover:bg-secondary/20 transition-colors mb-3 ${CATEGORY_COLORS[selectedCategory || ""] || "text-secondary"}`}>
                        {CATEGORY_ICONS[selectedCategory || ""] || <Package className="h-8 w-8" />}
                      </div>
                      <h3 className="font-bold text-sm">{item.sous_type || item.type}</h3>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
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
                {selectedItem?.sous_type || selectedItem?.type} - Lots disponibles (FIFO)
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

      {/* Cart Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="glass max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="neon-text-secondary flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Panier ({cart.length} produits)
            </DialogTitle>
            <DialogDescription>
              Vérifiez et confirmez l'ajout de stock
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {cart.map((cartItem) => (
              <Card key={cartItem.item.id} className="glass p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{cartItem.item.sous_type || cartItem.item.type}</p>
                    <p className="text-sm text-muted-foreground">
                      {cartItem.quantity} unités
                      {cartItem.supplier_name && ` • ${cartItem.supplier_name}`}
                    </p>
                    {cartItem.unit_cost > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {cartItem.unit_cost.toLocaleString()} XAF/unité
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveFromCart(cartItem.item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex justify-between text-sm mb-4">
              <span className="text-muted-foreground">Total unités:</span>
              <span className="font-bold">{cart.reduce((sum, c) => sum + c.quantity, 0)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDialogOpen(false)}>
              Continuer les achats
            </Button>
            <Button 
              onClick={handleSubmitCart} 
              disabled={loading || cart.length === 0}
              className="bg-secondary hover:bg-secondary/90"
            >
              <Check className="h-4 w-4 mr-2" />
              Confirmer l'ajout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Distribute Dialog */}
      <Dialog open={distributeDialogOpen} onOpenChange={setDistributeDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle className="neon-text-secondary">
              {isStockCentral ? "Redistribuer vers un camp" : "Distribuer"}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.sous_type || selectedItem?.type} - Stock disponible: {totalBatchQuantity} {UNIT_LABELS[selectedVariant?.type_unite || "unite"]}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Camp selector for Stock Central */}
            {isStockCentral && (
              <div className="space-y-2">
                <Label>Camp destinataire</Label>
                <Select
                  value={selectedDestinationCamp}
                  onValueChange={setSelectedDestinationCamp}
                >
                  <SelectTrigger className="glass">
                    <SelectValue placeholder="Sélectionner un camp" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    {camps.map((camp) => (
                      <SelectItem key={camp.id} value={camp.id}>
                        {camp.nom} ({camp.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Quantité à {isStockCentral ? "transférer" : "distribuer"} ({UNIT_LABELS[selectedVariant?.type_unite || "unite"]})</Label>
              <Input
                type="number"
                min={1}
                max={totalBatchQuantity}
                value={distributeAmount}
                onChange={(e) => setDistributeAmount(parseInt(e.target.value) || 0)}
                className="glass"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDistributeDialogOpen(false)}>Annuler</Button>
            <Button 
              onClick={handleDistribute} 
              disabled={loading || distributeAmount <= 0 || distributeAmount > totalBatchQuantity || (isStockCentral && !selectedDestinationCamp)}
              className="bg-secondary hover:bg-secondary/90"
            >
              <Minus className="h-4 w-4 mr-2" />
              {isStockCentral ? "Transférer" : "Distribuer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
