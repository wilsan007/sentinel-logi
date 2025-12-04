import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ChevronRight, User, Package, RotateCcw } from "lucide-react";
import { PersonnelSelector } from "./PersonnelSelector";
import { AllocationHistory } from "./AllocationHistory";
import { AllocationDialog } from "./AllocationDialog";
import { ProgressStepper } from "./ProgressStepper";
import { SmartVariantFilter } from "./SmartVariantFilter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  sexe?: string;
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
  const [itemConstraints, setItemConstraints] = useState<any>(null);
  
  const [showAllocationDialog, setShowAllocationDialog] = useState(false);
  const { toast } = useToast();

  // États de progression pour le stepper
  const getProgressSteps = () => [
    {
      id: 1,
      name: "Personnel",
      description: "Sélectionner",
      completed: !!selectedPersonnel && currentStep !== "personnel",
      current: currentStep === "personnel",
    },
    {
      id: 2,
      name: "Catégorie",
      description: "Choisir le type",
      completed: !!selectedCategory && currentStep !== "personnel" && currentStep !== "category",
      current: currentStep === "category",
    },
    {
      id: 3,
      name: "Article",
      description: "Sélectionner l'item",
      completed: !!selectedItem && currentStep === "variant",
      current: currentStep === "item",
    },
    {
      id: 4,
      name: "Variante",
      description: "Taille & Couleur",
      completed: false,
      current: currentStep === "variant",
    },
  ];

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

    // Filtrer les articles selon le sexe du personnel
    let filteredItems = data || [];
    
    if (selectedPersonnel?.sexe) {
      // Articles réservés aux femmes (jupes, escarpins, etc.)
      const femaleOnlyKeywords = ['jupe', 'escarpin', 'culotte femme'];
      // Articles réservés aux hommes (caleçon, etc.)
      const maleOnlyKeywords = ['caleçon', 'calecon'];
      
      filteredItems = filteredItems.filter(item => {
        const itemName = `${item.type} ${item.sous_type || ''}`.toLowerCase();
        
        // Si personnel masculin, exclure les articles féminins
        if (selectedPersonnel.sexe === 'homme') {
          return !femaleOnlyKeywords.some(keyword => itemName.includes(keyword));
        }
        
        // Si personnel féminin, exclure les articles masculins
        if (selectedPersonnel.sexe === 'femme') {
          return !maleOnlyKeywords.some(keyword => itemName.includes(keyword));
        }
        
        return true;
      });
    }

    setItems(filteredItems);
    setCurrentStep("item");
  };

  const handleItemSelect = async (item: StockItem) => {
    setSelectedItem(item);
    
    // Charger les variantes disponibles avec les contraintes
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("location_id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .single();

    // Charger les variantes avec le stock_item pour avoir accès aux contraintes
    const { data: variantsData, error: variantsError } = await supabase
      .from("item_variants")
      .select("*")
      .eq("stock_item_id", item.id)
      .eq("location_id", userRoles?.location_id || "")
      .gt("quantite", 0);

    if (variantsError) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les variantes",
        variant: "destructive",
      });
      return;
    }

    if (!variantsData || variantsData.length === 0) {
      toast({
        title: "Stock épuisé",
        description: "Aucune variante disponible pour cet article",
        variant: "destructive",
      });
      return;
    }

    // Appliquer le filtrage intelligent basé sur le sexe du personnel
    let filteredVariants = variantsData;
    
    if (variantsData.length > 0 && selectedPersonnel?.sexe) {
      const firstVariant = variantsData[0];
      
      // Si l'article a des contraintes de genre
      if (firstVariant.female_only && selectedPersonnel.sexe !== "femme") {
        toast({
          title: "Article non compatible",
          description: "Cet article est réservé au personnel féminin",
          variant: "destructive",
        });
        return;
      }
      
      if (firstVariant.male_only && selectedPersonnel.sexe !== "homme") {
        toast({
          title: "Article non compatible",
          description: "Cet article est réservé au personnel masculin",
          variant: "destructive",
        });
        return;
      }

      // Stocker les contraintes pour l'affichage
      setItemConstraints({
        is_unisex: firstVariant.is_unisex,
        female_only: firstVariant.female_only,
        male_only: firstVariant.male_only,
        requires_size: firstVariant.requires_size,
        requires_gender: firstVariant.requires_gender,
      });
    }

    setVariants(filteredVariants);
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
    <TooltipProvider>
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Panneau principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Stepper */}
          <ProgressStepper steps={getProgressSteps()} />

          {/* Bouton de réinitialisation visible dès qu'un personnel est sélectionné */}
          {selectedPersonnel && (
            <div className="flex justify-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="glass border-border/50 hover:border-primary/50 gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Recommencer
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Réinitialiser la sélection et recommencer</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}

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
                <div className="mb-6">
                  <h2 className="text-2xl font-bold neon-text-primary mb-2">
                    Sélectionnez une catégorie
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Choisissez le type d'équipement à attribuer à{" "}
                    <span className="text-foreground font-medium">
                      {selectedPersonnel?.prenom} {selectedPersonnel?.nom}
                    </span>
                  </p>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {categories.map((category) => (
                    <Tooltip key={category}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleCategorySelect(category)}
                          className="glass-hover p-6 rounded-xl neon-border-primary text-left group transition-all hover:scale-105"
                        >
                          <Shield className="h-8 w-8 text-primary mb-3 group-hover:animate-pulse" />
                          <h3 className="font-bold text-lg mb-2">{category}</h3>
                          <p className="text-sm text-muted-foreground">
                            Cliquez pour voir les articles
                          </p>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Afficher tous les {category} disponibles</p>
                      </TooltipContent>
                    </Tooltip>
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
                <div className="mb-6">
                  <h2 className="text-2xl font-bold neon-text-primary mb-2">
                    Articles - {selectedCategory}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Sélectionnez l'article spécifique à attribuer
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {items.map((item) => (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleItemSelect(item)}
                          className="glass-hover p-6 rounded-xl border border-border/50 text-left group transition-all hover:scale-[1.02] hover:border-primary/30"
                        >
                          <Package className="h-6 w-6 text-primary mb-3 group-hover:animate-bounce" />
                          <h3 className="font-bold text-lg mb-2">
                            {item.sous_type || item.type}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{item.description || "Cliquer pour voir les variantes disponibles"}</p>
                      </TooltipContent>
                    </Tooltip>
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
                <div className="mb-6">
                  <h2 className="text-2xl font-bold neon-text-primary mb-2">
                    Variantes disponibles
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sélectionnez la taille et la couleur appropriées
                  </p>
                  
                  {/* Filtrage intelligent */}
                  <SmartVariantFilter
                    personnelSex={selectedPersonnel?.sexe}
                    itemConstraints={itemConstraints}
                    itemType={selectedItem?.type}
                    itemSubType={selectedItem?.sous_type}
                  />
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {variants.map((variant) => {
                    const isLowStock = variant.quantite <= variant.seuil_alerte;
                    return (
                      <Tooltip key={variant.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleVariantSelect(variant)}
                            className={`glass-hover p-6 rounded-xl neon-border-primary text-left transition-all hover:scale-[1.02] ${
                              isLowStock
                                ? "border-amber-500/50 hover:border-amber-500/70"
                                : "hover:border-primary/70"
                            }`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <span className="font-bold text-lg">{variant.taille || "Taille unique"}</span>
                                {variant.genre && (
                                  <span className="text-muted-foreground ml-2 text-sm">
                                    {variant.genre}
                                  </span>
                                )}
                              </div>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  isLowStock
                                    ? "bg-amber-500/20 text-amber-500 animate-pulse"
                                    : "bg-emerald-500/20 text-emerald-500"
                                }`}
                              >
                                {isLowStock ? "⚠️ " : "✓ "}Stock: {variant.quantite}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-full border-2 border-primary/30 shadow-md"
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
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {isLowStock 
                              ? "Stock faible - envisager un réapprovisionnement" 
                              : "Cliquer pour attribuer cet article"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
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
    </TooltipProvider>
  );
}
