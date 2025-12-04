import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Package, RotateCcw, Shirt } from "lucide-react";
import { PersonnelSelector } from "./PersonnelSelector";
import { AllocationHistory } from "./AllocationHistory";
import { AllocationDialog } from "./AllocationDialog";
import { ProgressStepper } from "./ProgressStepper";
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
  type_activite: string;
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

type Step = "personnel" | "activity" | "type" | "subtype" | "color" | "size";

const COLORS = [
  { name: "Vert Olive", value: "vert_olive", hex: "#4A5D23" },
  { name: "Camouflage", value: "camouflage", hex: "#6B7F47" },
  { name: "Sable", value: "sable", hex: "#C2B280" },
  { name: "Noir", value: "noir", hex: "#1A1A1A" },
  { name: "Bleu Marine", value: "bleu_marine", hex: "#1F2937" },
  { name: "Blanc", value: "blanc", hex: "#FFFFFF" },
  { name: "Kaki", value: "kaki", hex: "#8B7355" },
];

const ACTIVITY_TYPES = [
  { label: "Cérémonie", value: "CEREMONIE", icon: "🎖️", description: "Tenue de cérémonie et événements officiels" },
  { label: "Travail", value: "TRAVAIL", icon: "💼", description: "Tenue de travail quotidien" },
  { label: "Sport", value: "SPORT", icon: "🏃", description: "Équipement sportif et entraînement" },
  { label: "Terrain", value: "TERRAIN", icon: "🏕️", description: "Opérations sur le terrain" },
  { label: "Intervention", value: "INTERVENTION", icon: "⚡", description: "Missions d'intervention rapide" },
  { label: "Universel", value: "UNIVERSEL", icon: "🌐", description: "Articles polyvalents" },
];

export function GearSelector() {
  const [currentStep, setCurrentStep] = useState<Step>("personnel");
  
  const [activityTypes, setActivityTypes] = useState<string[]>([]);
  const [articleTypes, setArticleTypes] = useState<string[]>([]);
  const [articleSubTypes, setArticleSubTypes] = useState<StockItem[]>([]);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [availableSizes, setAvailableSizes] = useState<ItemVariant[]>([]);
  
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedVariant, setSelectedVariant] = useState<ItemVariant | null>(null);
  
  const [showAllocationDialog, setShowAllocationDialog] = useState(false);
  const { toast } = useToast();

  const getProgressSteps = () => [
    { id: 1, name: "Personnel", description: "Sélectionner", completed: !!selectedPersonnel && currentStep !== "personnel", current: currentStep === "personnel" },
    { id: 2, name: "Activité", description: "Type d'activité", completed: !!selectedActivity && !["personnel", "activity"].includes(currentStep), current: currentStep === "activity" },
    { id: 3, name: "Type", description: "Catégorie", completed: !!selectedType && !["personnel", "activity", "type"].includes(currentStep), current: currentStep === "type" },
    { id: 4, name: "Article", description: "Sous-type", completed: !!selectedItem && !["personnel", "activity", "type", "subtype"].includes(currentStep), current: currentStep === "subtype" },
    { id: 5, name: "Couleur", description: "Choisir", completed: !!selectedColor && currentStep === "size", current: currentStep === "color" },
    { id: 6, name: "Taille", description: "Finaliser", completed: false, current: currentStep === "size" },
  ];

  const handlePersonnelSelect = async (person: Personnel) => {
    setSelectedPersonnel(person);
    
    const { data, error } = await supabase
      .from("stock_items")
      .select("type_activite")
      .eq("categorie", "GEAR")
      .not("type_activite", "is", null);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger les types d'activité", variant: "destructive" });
      return;
    }

    const uniqueActivities = [...new Set(data.map((item) => item.type_activite).filter(Boolean))];
    setActivityTypes(uniqueActivities);
    setCurrentStep("activity");
  };

  const handleActivitySelect = async (activity: string) => {
    setSelectedActivity(activity);
    
    const { data, error } = await supabase
      .from("stock_items")
      .select("type")
      .eq("categorie", "GEAR")
      .eq("type_activite", activity);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger les types d'articles", variant: "destructive" });
      return;
    }

    let types = [...new Set(data.map((item) => item.type))];
    
    if (selectedPersonnel?.sexe === "homme") {
      const femaleOnlyKeywords = ['jupe', 'escarpin', 'culotte femme'];
      types = types.filter(type => !femaleOnlyKeywords.some(keyword => type.toLowerCase().includes(keyword)));
    } else if (selectedPersonnel?.sexe === "femme") {
      const maleOnlyKeywords = ['caleçon', 'calecon'];
      types = types.filter(type => !maleOnlyKeywords.some(keyword => type.toLowerCase().includes(keyword)));
    }

    setArticleTypes(types);
    setCurrentStep("type");
  };

  const handleTypeSelect = async (type: string) => {
    setSelectedType(type);
    
    const { data, error } = await supabase
      .from("stock_items")
      .select("*")
      .eq("categorie", "GEAR")
      .eq("type_activite", selectedActivity)
      .eq("type", type);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger les articles", variant: "destructive" });
      return;
    }

    let filteredItems = data || [];
    if (selectedPersonnel?.sexe === "homme") {
      const femaleOnlyKeywords = ['jupe', 'escarpin', 'culotte femme'];
      filteredItems = filteredItems.filter(item => {
        const itemName = `${item.type} ${item.sous_type || ''}`.toLowerCase();
        return !femaleOnlyKeywords.some(keyword => itemName.includes(keyword));
      });
    } else if (selectedPersonnel?.sexe === "femme") {
      const maleOnlyKeywords = ['caleçon', 'calecon'];
      filteredItems = filteredItems.filter(item => {
        const itemName = `${item.type} ${item.sous_type || ''}`.toLowerCase();
        return !maleOnlyKeywords.some(keyword => itemName.includes(keyword));
      });
    }

    setArticleSubTypes(filteredItems);
    setCurrentStep("subtype");
  };

  const handleSubTypeSelect = async (item: StockItem) => {
    setSelectedItem(item);
    
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("location_id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .single();

    const { data, error } = await supabase
      .from("item_variants")
      .select("couleur")
      .eq("stock_item_id", item.id)
      .eq("location_id", userRoles?.location_id || "")
      .gt("quantite", 0);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger les couleurs", variant: "destructive" });
      return;
    }

    if (!data || data.length === 0) {
      toast({ title: "Stock épuisé", description: "Aucune variante disponible", variant: "destructive" });
      return;
    }

    const uniqueColors = [...new Set(data.map((v) => v.couleur).filter(Boolean))];
    setAvailableColors(uniqueColors);
    setCurrentStep("color");
  };

  const handleColorSelect = async (color: string) => {
    setSelectedColor(color);
    
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("location_id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .single();

    const { data, error } = await supabase
      .from("item_variants")
      .select("*")
      .eq("stock_item_id", selectedItem?.id || "")
      .eq("location_id", userRoles?.location_id || "")
      .eq("couleur", color)
      .gt("quantite", 0);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger les tailles", variant: "destructive" });
      return;
    }

    if (!data || data.length === 0) {
      toast({ title: "Stock épuisé", description: "Aucune taille disponible", variant: "destructive" });
      return;
    }

    setAvailableSizes(data);
    setCurrentStep("size");
  };

  const handleSizeSelect = (variant: ItemVariant) => {
    setSelectedVariant(variant);
    setShowAllocationDialog(true);
  };

  const handleAllocationSuccess = () => {
    setShowAllocationDialog(false);
    handleReset();
    toast({ title: "Dotation enregistrée", description: `L'équipement a été attribué à ${selectedPersonnel?.prenom} ${selectedPersonnel?.nom}` });
  };

  const handleReset = () => {
    setCurrentStep("personnel");
    setSelectedPersonnel(null);
    setSelectedActivity("");
    setSelectedType("");
    setSelectedItem(null);
    setSelectedColor("");
    setSelectedVariant(null);
    setActivityTypes([]);
    setArticleTypes([]);
    setArticleSubTypes([]);
    setAvailableColors([]);
    setAvailableSizes([]);
  };

  const containerVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  };

  return (
    <TooltipProvider>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ProgressStepper steps={getProgressSteps()} />

          {selectedPersonnel && (
            <div className="flex justify-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleReset} className="glass border-border/50 hover:border-primary/50 gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Recommencer
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Réinitialiser la sélection</p></TooltipContent>
              </Tooltip>
            </div>
          )}

          <AnimatePresence mode="wait">
            {currentStep === "personnel" && (
              <motion.div key="personnel" variants={containerVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }}>
                <PersonnelSelector onSelect={handlePersonnelSelect} />
              </motion.div>
            )}

            {currentStep === "activity" && (
              <motion.div key="activity" variants={containerVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }}>
                <Card className="glass p-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold neon-text-primary mb-2">Type d'activité</h2>
                    <p className="text-sm text-muted-foreground">
                      Pour <span className="text-foreground font-medium">{selectedPersonnel?.prenom} {selectedPersonnel?.nom}</span>
                    </p>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    {ACTIVITY_TYPES.filter(at => activityTypes.includes(at.value)).map((activity) => (
                      <Tooltip key={activity.value}>
                        <TooltipTrigger asChild>
                          <button onClick={() => handleActivitySelect(activity.value)} className="glass-hover p-6 rounded-xl neon-border-primary text-left group transition-all hover:scale-105">
                            <span className="text-3xl mb-3 block">{activity.icon}</span>
                            <h3 className="font-bold text-lg mb-2">{activity.label}</h3>
                            <p className="text-sm text-muted-foreground">{activity.description}</p>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent><p>{activity.description}</p></TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            {currentStep === "type" && (
              <motion.div key="type" variants={containerVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }}>
                <Card className="glass p-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold neon-text-primary mb-2">Type d'article - {selectedActivity}</h2>
                    <p className="text-sm text-muted-foreground">Choisissez la catégorie d'article</p>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    {articleTypes.map((type) => (
                      <Tooltip key={type}>
                        <TooltipTrigger asChild>
                          <button onClick={() => handleTypeSelect(type)} className="glass-hover p-6 rounded-xl neon-border-primary text-left group transition-all hover:scale-105">
                            <Shirt className="h-8 w-8 text-primary mb-3 group-hover:animate-pulse" />
                            <h3 className="font-bold text-lg mb-2">{type}</h3>
                            <p className="text-sm text-muted-foreground">Voir les articles</p>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent><p>Afficher les {type}</p></TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            {currentStep === "subtype" && (
              <motion.div key="subtype" variants={containerVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }}>
                <Card className="glass p-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold neon-text-primary mb-2">Articles - {selectedType}</h2>
                    <p className="text-sm text-muted-foreground">Sélectionnez l'article spécifique</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {articleSubTypes.map((item) => (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>
                          <button onClick={() => handleSubTypeSelect(item)} className="glass-hover p-6 rounded-xl border border-border/50 text-left group transition-all hover:scale-[1.02] hover:border-primary/30">
                            <Package className="h-6 w-6 text-primary mb-3 group-hover:animate-bounce" />
                            <h3 className="font-bold text-lg mb-2">{item.sous_type || item.type}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent><p className="max-w-xs">{item.description || "Sélectionner cet article"}</p></TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            {currentStep === "color" && (
              <motion.div key="color" variants={containerVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }}>
                <Card className="glass p-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold neon-text-primary mb-2">Couleur - {selectedItem?.sous_type || selectedItem?.type}</h2>
                    <p className="text-sm text-muted-foreground">Sélectionnez la couleur souhaitée</p>
                  </div>
                  <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
                    {availableColors.map((colorValue) => {
                      const colorInfo = COLORS.find((c) => c.value === colorValue);
                      return (
                        <Tooltip key={colorValue}>
                          <TooltipTrigger asChild>
                            <button onClick={() => handleColorSelect(colorValue)} className="glass-hover p-4 rounded-xl border border-border/50 text-center group transition-all hover:scale-110 hover:border-primary/50 flex flex-col items-center gap-2">
                              <div className="w-12 h-12 rounded-full border-4 border-primary/30 shadow-lg group-hover:shadow-primary/30" style={{ backgroundColor: colorInfo?.hex || "#666" }} />
                              <span className="text-xs font-medium">{colorInfo?.name || colorValue}</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent><p>{colorInfo?.name || colorValue}</p></TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </Card>
              </motion.div>
            )}

            {currentStep === "size" && (
              <motion.div key="size" variants={containerVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }}>
                <Card className="glass p-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold neon-text-primary mb-2">Taille disponible</h2>
                    <p className="text-sm text-muted-foreground">
                      Couleur: <span className="text-foreground font-medium">{COLORS.find((c) => c.value === selectedColor)?.name || selectedColor}</span>
                    </p>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    {availableSizes.map((variant) => {
                      const isLowStock = variant.quantite <= variant.seuil_alerte;
                      return (
                        <Tooltip key={variant.id}>
                          <TooltipTrigger asChild>
                            <button onClick={() => handleSizeSelect(variant)} className={`glass-hover p-6 rounded-xl neon-border-primary text-left transition-all hover:scale-[1.02] ${isLowStock ? "border-amber-500/50 hover:border-amber-500/70" : "hover:border-primary/70"}`}>
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <span className="font-bold text-2xl">{variant.taille || "Unique"}</span>
                                  {variant.genre && <span className="text-muted-foreground ml-2 text-sm">{variant.genre}</span>}
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${isLowStock ? "bg-amber-500/20 text-amber-500 animate-pulse" : "bg-emerald-500/20 text-emerald-500"}`}>
                                  {isLowStock ? "⚠️ " : "✓ "}Stock: {variant.quantite}
                                </span>
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent><p>{isLowStock ? "Stock faible" : "Cliquer pour attribuer"}</p></TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="lg:col-span-1">
          {selectedPersonnel && <AllocationHistory personnelId={selectedPersonnel.id} />}
        </div>

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