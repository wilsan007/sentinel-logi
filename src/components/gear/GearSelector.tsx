import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ChevronRight } from "lucide-react";

type StockItem = {
  id: string;
  type: string;
  sous_type: string;
};

type Step = "category" | "item" | "subtype" | "color" | "size";

const COLORS = [
  { name: "Vert Olive", value: "vert_olive", hex: "#4A5D23" },
  { name: "Camouflage", value: "camouflage", hex: "#6B7F47" },
  { name: "Sable", value: "sable", hex: "#C2B280" },
  { name: "Noir", value: "noir", hex: "#1A1A1A" },
  { name: "Bleu Marine", value: "bleu_marine", hex: "#1F2937" },
];

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

export function GearSelector() {
  const [currentStep, setCurrentStep] = useState<Step>("category");
  const [categories, setCategories] = useState<string[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
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

  const handleItemSelect = (item: StockItem) => {
    setSelectedItem(item);
    if (item.sous_type) {
      setCurrentStep("subtype");
    } else {
      setCurrentStep("color");
    }
  };

  const handleSubtypeConfirm = () => {
    setCurrentStep("color");
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setCurrentStep("size");
  };

  const handleReset = () => {
    setCurrentStep("category");
    setSelectedCategory("");
    setSelectedItem(null);
    setSelectedColor("");
    setSelectedSize("");
  };

  const containerVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Fil d'Ariane */}
      <div className="glass rounded-xl p-4 mb-6 flex items-center gap-2 text-sm">
        <span className={currentStep === "category" ? "neon-text-primary font-semibold" : "text-muted-foreground"}>
          Catégorie
        </span>
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
            <span className={currentStep === "subtype" || currentStep === "color" ? "neon-text-primary font-semibold" : "text-muted-foreground"}>
              {selectedItem.sous_type || "Article"}
            </span>
          </>
        )}
        {selectedColor && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className={currentStep === "size" ? "neon-text-primary font-semibold" : "text-muted-foreground"}>
              Couleur
            </span>
          </>
        )}
      </div>

      {/* Contenu des étapes */}
      <AnimatePresence mode="wait">
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
              <h2 className="text-2xl font-bold mb-6 neon-text-primary">
                Sélectionnez une catégorie
              </h2>
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
                    <h3 className="font-bold text-lg mb-2">{item.sous_type || item.type}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.sous_type ? `Type: ${item.type}` : "Cliquez pour continuer"}
                    </p>
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {currentStep === "color" && (
          <motion.div
            key="color"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <Card className="glass p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold neon-text-primary">
                  Sélectionnez une couleur
                </h2>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Recommencer
                </Button>
              </div>
              <div className="grid md:grid-cols-5 gap-4">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => handleColorSelect(color.value)}
                    className="glass-hover p-6 rounded-xl neon-border-primary text-center group"
                  >
                    <div
                      className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-primary/30"
                      style={{ backgroundColor: color.hex }}
                    ></div>
                    <h3 className="font-semibold text-sm">{color.name}</h3>
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {currentStep === "size" && (
          <motion.div
            key="size"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <Card className="glass p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold neon-text-primary">
                  Sélectionnez une taille
                </h2>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Recommencer
                </Button>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                {SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setSelectedSize(size);
                      toast({
                        title: "Sélection confirmée",
                        description: `${selectedCategory} - ${selectedItem?.sous_type} - ${selectedColor} - ${size}`,
                      });
                    }}
                    className={`glass-hover px-8 py-4 rounded-xl neon-border-primary font-bold text-lg ${
                      selectedSize === size ? "bg-primary/20" : ""
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
