import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Star, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  Search,
  Trophy,
  AlertTriangle,
  Package,
  Globe,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";

type SupplierRating = Database["public"]["Enums"]["supplier_rating"];

interface SupplierSelectorProps {
  selectedSupplierId: string;
  onSupplierSelect: (supplierId: string) => void;
}

interface Supplier {
  id: string;
  code: string;
  name: string;
  country: string | null;
  rating: SupplierRating | null;
  on_time_delivery_rate: number | null;
  avg_delivery_days: number | null;
  total_orders_completed: number | null;
  is_active: boolean | null;
}

const RATING_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof Star }> = {
  EXCELLENT: { label: "Excellent", color: "text-green-500", bgColor: "bg-green-500/20", icon: Trophy },
  GOOD: { label: "Bon", color: "text-blue-500", bgColor: "bg-blue-500/20", icon: Star },
  AVERAGE: { label: "Moyen", color: "text-amber-500", bgColor: "bg-amber-500/20", icon: Star },
  POOR: { label: "Faible", color: "text-orange-500", bgColor: "bg-orange-500/20", icon: AlertTriangle },
  BLACKLISTED: { label: "Blacklisté", color: "text-red-500", bgColor: "bg-red-500/20", icon: AlertTriangle },
};

// Calculate supplier score for ranking
const calculateScore = (supplier: Supplier): number => {
  let score = 0;
  
  // Rating weight (40%)
  const ratingScores: Record<string, number> = {
    EXCELLENT: 100,
    GOOD: 80,
    AVERAGE: 60,
    POOR: 30,
    BLACKLISTED: 0,
  };
  score += (ratingScores[supplier.rating || "AVERAGE"] || 60) * 0.4;
  
  // On-time delivery rate (30%)
  score += (supplier.on_time_delivery_rate || 0) * 0.3;
  
  // Delivery speed (20%) - faster is better, cap at 30 days
  const deliveryScore = Math.max(0, 100 - ((supplier.avg_delivery_days || 30) * 3));
  score += deliveryScore * 0.2;
  
  // Experience (10%) - more orders = more reliable
  const experienceScore = Math.min(100, (supplier.total_orders_completed || 0) * 5);
  score += experienceScore * 0.1;
  
  return Math.round(score);
};

export const SupplierSelector = ({ selectedSupplierId, onSupplierSelect }: SupplierSelectorProps) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (data) {
      // Sort by calculated score
      const sortedSuppliers = data.sort((a, b) => calculateScore(b) - calculateScore(a));
      setSuppliers(sortedSuppliers);
    }
    setLoading(false);
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.country && s.country.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const bestSupplier = filteredSuppliers[0];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-muted-foreground">Chargement des fournisseurs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher par nom, code ou pays..."
          className="pl-10 glass border-border/50 focus:border-emerald-500/50"
        />
      </div>

      {/* Best Supplier Recommendation */}
      {bestSupplier && !searchTerm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20">
              <Trophy className="h-4 w-4 text-emerald-500" />
            </div>
            <span className="font-semibold text-emerald-500">Meilleur Fournisseur Recommandé</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Basé sur les performances passées, délais de livraison et fiabilité
          </p>
        </motion.div>
      )}

      {/* Suppliers Grid */}
      <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2">
        <AnimatePresence mode="popLayout">
          {filteredSuppliers.map((supplier, index) => {
            const score = calculateScore(supplier);
            const isSelected = supplier.id === selectedSupplierId;
            const isBest = index === 0 && !searchTerm;
            const ratingConfig = RATING_CONFIG[supplier.rating || "AVERAGE"];
            const RatingIcon = ratingConfig.icon;

            return (
              <motion.div
                key={supplier.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.03 }}
                layout
              >
                <Card
                  className={`glass cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30"
                      : isBest
                      ? "border-emerald-500/50 hover:border-emerald-500"
                      : "border-border/50 hover:border-border"
                  }`}
                  onClick={() => onSupplierSelect(supplier.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{supplier.name}</span>
                          <Badge variant="outline" className="text-xs font-mono">
                            {supplier.code}
                          </Badge>
                          {isBest && (
                            <Badge className="bg-emerald-500/20 text-emerald-500 border-0 text-xs">
                              <Trophy className="h-3 w-3 mr-1" />
                              Recommandé
                            </Badge>
                          )}
                        </div>
                        {supplier.country && (
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {supplier.country}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="p-1 rounded-full bg-emerald-500"
                          >
                            <CheckCircle className="h-4 w-4 text-white" />
                          </motion.div>
                        )}
                        <div className="text-right">
                          <div className="text-2xl font-bold text-emerald-500">{score}</div>
                          <div className="text-xs text-muted-foreground">Score</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${ratingConfig.bgColor}`}>
                          <RatingIcon className={`h-3.5 w-3.5 ${ratingConfig.color}`} />
                        </div>
                        <div>
                          <Badge className={`${ratingConfig.bgColor} ${ratingConfig.color} border-0 text-xs`}>
                            {ratingConfig.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-muted">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{supplier.avg_delivery_days || "N/A"} j</p>
                          <p className="text-xs text-muted-foreground">Délai moy.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-muted">
                          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{supplier.on_time_delivery_rate || 0}%</p>
                          <p className="text-xs text-muted-foreground">À temps</p>
                        </div>
                      </div>
                    </div>

                    {supplier.total_orders_completed && supplier.total_orders_completed > 0 && (
                      <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                        <Package className="h-3 w-3" />
                        <span>{supplier.total_orders_completed} commandes complétées</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredSuppliers.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
            <Search className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="font-medium mb-1">Aucun fournisseur trouvé</h3>
          <p className="text-sm text-muted-foreground">
            Essayez de modifier vos critères de recherche
          </p>
        </motion.div>
      )}
    </div>
  );
};
