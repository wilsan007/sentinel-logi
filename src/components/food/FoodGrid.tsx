import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus } from "lucide-react";
import { motion } from "framer-motion";

type FoodItem = {
  id: string;
  type: string;
  description: string;
};

type FoodGridProps = {
  mode: "stock" | "requests";
};

export function FoodGrid({ mode }: FoodGridProps) {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
      toast({
        title: "Erreur",
        description: "Impossible de charger les articles alimentaires",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setFoodItems(data || []);
    setLoading(false);
  };

  const handleAddStock = (item: FoodItem) => {
    toast({
      title: "Ajouter du stock",
      description: `Fonctionnalité à implémenter pour ${item.type}`,
    });
  };

  const handleFulfillRequest = (item: FoodItem) => {
    toast({
      title: "Traiter la demande",
      description: `Fonctionnalité à implémenter pour ${item.type}`,
    });
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Chargement...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 neon-text-secondary">
        {mode === "stock" ? "Ajouter du stock" : "Demandes en attente"}
      </h2>

      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
        {foodItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card className="glass-hover p-6 neon-border-secondary group cursor-pointer">
              <div className="flex flex-col items-center text-center">
                <div className="p-4 rounded-xl bg-secondary/10 group-hover:bg-secondary/20 transition-colors mb-4">
                  <Package className="h-12 w-12 text-secondary" />
                </div>
                <h3 className="font-bold text-lg mb-2">{item.type}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {item.description}
                </p>
                {mode === "stock" ? (
                  <Button
                    onClick={() => handleAddStock(item)}
                    className="w-full bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/30"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleFulfillRequest(item)}
                    className="w-full bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/30"
                  >
                    Traiter
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
