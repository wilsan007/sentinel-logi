import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ChevronRight, User, Package } from "lucide-react";
import { PersonnelSelector } from "./PersonnelSelector";
import { AllocationHistory } from "./AllocationHistory";
import { AllocationDialog } from "./AllocationDialog";

type StockItem = {
  id: string;
  type: string;
  sous_type: string;
  description: string;
};

type ItemVariant = {
  id: string;
  couleur: string;
  taille: string;
  genre: string;
  quantite: number;
  seuil_alerte: number;
};

type Personnel = {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  grade: string;
};

type Step = "personnel" | "category" | "item" | "variant" | "confirm";

const COLORS = [
  { name: "Vert Olive", value: "vert_olive", hex: "#4A5D23" },
  { name: "Camouflage", value: "camouflage", hex: "#6B7F47" },
  { name: "Sable", value: "sable", hex: "#C2B280" },
  { name: "Noir", value: "noir", hex: "#1A1A1A" },
  { name: "Bleu Marine", value: "bleu_marine", hex: "#1F2937" },
];

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const GENDERS = [
  { label: "Homme", value: "homme" },
  { label: "Femme", value: "femme" },
  { label: "Unisexe", value: "unisexe" },
];

export function GearSelector() {
  const [currentStep, setCurrentStep] = useState<Step>("personnel");
  const [categories, setCategories] = useState<string[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [variants, setVariants] = useState<ItemVariant[]>([]);
  
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ItemVariant | null>(null);
  
  const [showAllocationDialog, setShowAllocationDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("stock_items")
      .select("type")
      .eq("categorie", "GEAR")
      .order("type");

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les catégories",
        variant: "destructive",
      });
      return;
    }

    const uniqueTypes = [...new Set(data.map((item) => item.type))];
    setCategories(uniqueTypes);
  };

  const handlePersonnelSelect = (person: Personnel) => {
    setSelectedPersonnel(person);
    setCurrentStep("category");
  };

  const handleCategorySelect = async (category: string) => {
    setSelectedCategory(category);
    
    const { data, error } = await supabase
      .from("stock_items")
      .select("*")
      .eq("categorie", "GEAR")
      .eq("type", category);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les articles",
        variant: "destructive",
      });
      return;
    }

    setItems(data || []);
    setCurrentStep("item");
  };

  const handleItemSelect = async (item: StockItem) => {
    setSelectedItem(item);
    
    // Charger les variantes disponibles
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("location_id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .single();

    const { data, error } = await supabase
      .from("item_variants")
      .select("*")
      .eq("stock_item_id", item.id)
      .eq("location_id", userRoles?.location_id || "")
      .gt("quantite", 0);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les variantes",
        variant: "destructive",
      });
      return;
    }

    if (!data || data.length === 0) {
      toast({
        title: "Stock épuisé",
        description: "Aucune variante disponible pour cet article",
        variant: "destructive",
      });
      return;
    }

    setVariants(data || []);
    setCurrentStep("variant");
  };

  const handleVariantSelect = (variant: ItemVariant) => {
    setSelectedVariant(variant);
    setShowAllocationDialog(true);
  };

  const handleAllocationSuccess = () => {
    setShowAllocationDialog(false);
    handleReset();
    toast({
      title: "Dotation enregistrée",
      description: `L'équipement a été attribué à ${selectedPersonnel?.prenom} ${selectedPersonnel?.nom}`,
    });
  };

  const handleReset = () => {
    setCurrentStep("personnel");
    setSelectedPersonnel(null);
    setSelectedCategory("");
    setSelectedItem(null);
    setSelectedVariant(null);
  };

  const containerVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Panneau principal */}
      <div className="lg:col-span-2 space-y-6">
        {/* Fil d'Ariane */}
        <div className="glass rounded-xl p-4 flex items-center gap-2 text-sm flex-wrap">
          <span className={currentStep === "personnel" ? "neon-text-primary font-semibold" : "text-muted-foreground"}>
            Personnel
          </span>
          {selectedPersonnel && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className={currentStep === "category" ? "neon-text-primary font-semibold" : "text-muted-foreground"}>
                Catégorie
              </span>
            </>
          )}
          {selectedCategory && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className={currentStep === "item" ? "neon-text-primary font-semibold" : "text-muted-foreground"}>
                {selectedCategory}
              </span>
            </>
          )}
          {selectedItem && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className={currentStep === "variant" ? "neon-text-primary font-semibold" : "text-muted-foreground"}>
                Variante
              </span>
            </>
          )}
        </div>

        {/* Contenu des étapes */}
        <AnimatePresence mode="wait">
          {currentStep === "personnel" && (
            <motion.div
              key="personnel"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <PersonnelSelector onSelect={handlePersonnelSelect} />
            </motion.div>
          )}

          {currentStep === "category" && (
            <motion.div
              key="category"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <Card className="glass p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold neon-text-primary">
                    Sélectionnez une catégorie
                  </h2>
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    Recommencer
                  </Button>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => handleCategorySelect(category)}
                      className="glass-hover p-6 rounded-xl neon-border-primary text-left group"
                    >
                      <Shield className="h-8 w-8 text-primary mb-3" />
                      <h3 className="font-bold text-lg mb-2">{category}</h3>
                      <p className="text-sm text-muted-foreground">
                        Cliquez pour voir les articles
                      </p>
                    </button>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {currentStep === "item" && (
            <motion.div
              key="item"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <Card className="glass p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold neon-text-primary">
                    Articles - {selectedCategory}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    Recommencer
                  </Button>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleItemSelect(item)}
                      className="glass-hover p-6 rounded-xl border border-border/50 text-left group"
                    >
                      <Package className="h-6 w-6 text-primary mb-3" />
                      <h3 className="font-bold text-lg mb-2">
                        {item.sous_type || item.type}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    </button>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {currentStep === "variant" && (
            <motion.div
              key="variant"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <Card className="glass p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold neon-text-primary">
                    Variantes disponibles
                  </h2>
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    Recommencer
                  </Button>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => handleVariantSelect(variant)}
                      className={`glass-hover p-6 rounded-xl neon-border-primary text-left ${
                        variant.quantite <= variant.seuil_alerte
                          ? "border-destructive/50"
                          : ""
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="font-bold text-lg">{variant.taille}</span>
                          <span className="text-muted-foreground ml-2">
                            {variant.genre}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            variant.quantite <= variant.seuil_alerte
                              ? "bg-destructive/20 text-destructive"
                              : "bg-primary/20 text-primary"
                          }`}
                        >
                          Stock: {variant.quantite}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full border-2 border-primary/30"
                          style={{
                            backgroundColor:
                              COLORS.find((c) => c.value === variant.couleur)?.hex ||
                              "#666",
                          }}
                        ></div>
                        <span className="text-sm text-muted-foreground">
                          {COLORS.find((c) => c.value === variant.couleur)?.name ||
                            variant.couleur}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Panneau latéral - Historique */}
      <div className="lg:col-span-1">
        {selectedPersonnel && (
          <AllocationHistory personnelId={selectedPersonnel.id} />
        )}
      </div>

      {/* Dialog d'allocation */}
      {selectedPersonnel && selectedVariant && (
        <AllocationDialog
          open={showAllocationDialog}
          onOpenChange={setShowAllocationDialog}
          personnel={selectedPersonnel}
          variant={selectedVariant}
          itemName={`${selectedItem?.sous_type || selectedItem?.type}`}
          onSuccess={handleAllocationSuccess}
        />
      )}
    </div>
  );
}
