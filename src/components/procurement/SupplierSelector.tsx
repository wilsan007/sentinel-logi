import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Star, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  Search,
  Trophy,
  AlertTriangle
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

const RATING_CONFIG: Record<string, { label: string; color: string; icon: typeof Star }> = {
  EXCELLENT: { label: "Excellent", color: "text-green-500 bg-green-500/20", icon: Trophy },
  GOOD: { label: "Bon", color: "text-blue-500 bg-blue-500/20", icon: Star },
  AVERAGE: { label: "Moyen", color: "text-amber-500 bg-amber-500/20", icon: Star },
  POOR: { label: "Faible", color: "text-orange-500 bg-orange-500/20", icon: AlertTriangle },
  BLACKLISTED: { label: "Blacklisté", color: "text-red-500 bg-red-500/20", icon: AlertTriangle },
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
    return <div className="text-center py-8">Chargement des fournisseurs...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher un fournisseur..."
          className="pl-10 glass border-border/50"
        />
      </div>

      {/* Best Supplier Recommendation */}
      {bestSupplier && !searchTerm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30"
        >
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-5 w-5 text-emerald-500" />
            <span className="font-semibold text-emerald-500">Meilleur Fournisseur Recommandé</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Basé sur les performances passées, délais de livraison et fiabilité
          </p>
        </motion.div>
      )}

      {/* Suppliers Grid */}
      <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2">
        <AnimatePresence>
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
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={`glass cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10"
                      : isBest
                      ? "border-emerald-500/50 hover:border-emerald-500"
                      : "border-border/50 hover:border-border"
                  }`}
                  onClick={() => onSupplierSelect(supplier.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{supplier.name}</span>
                          <span className="text-xs text-muted-foreground">({supplier.code})</span>
                          {isBest && (
                            <Badge className="bg-emerald-500/20 text-emerald-500 text-xs">
                              <Trophy className="h-3 w-3 mr-1" />
                              Recommandé
                            </Badge>
                          )}
                        </div>
                        {supplier.country && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {supplier.country}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                        )}
                        <div className="text-right">
                          <div className="text-2xl font-bold text-emerald-500">{score}</div>
                          <div className="text-xs text-muted-foreground">Score</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <RatingIcon className={`h-4 w-4 ${ratingConfig.color.split(' ')[0]}`} />
                        <div>
                          <Badge className={`${ratingConfig.color} text-xs`}>
                            {ratingConfig.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{supplier.avg_delivery_days || "N/A"} jours</p>
                          <p className="text-xs text-muted-foreground">Délai moyen</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{supplier.on_time_delivery_rate || 0}%</p>
                          <p className="text-xs text-muted-foreground">À temps</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Aucun fournisseur trouvé
        </div>
      )}
    </div>
  );
};
