import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  CheckCircle, 
  Building2,
  Star,
  AlertTriangle,
  ArrowRightLeft,
  Loader2,
  Crown,
  Trophy,
  Medal
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

interface Quote {
  id: string;
  supplier_id: string;
  amount: number;
  currency: string;
  validity_date: string | null;
  is_selected: boolean;
  notes: string | null;
  received_at: string;
  suppliers?: {
    name: string;
    code: string;
    country: string | null;
    rating: string | null;
    on_time_delivery_rate: number | null;
  };
}

interface QuoteComparisonPanelProps {
  orderId: string;
  onQuoteSelected?: (quote: Quote) => void;
  readOnly?: boolean;
}

export function QuoteComparisonPanel({
  orderId,
  onQuoteSelected,
  readOnly = false,
}: QuoteComparisonPanelProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadQuotes();
  }, [orderId]);

  const loadQuotes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("procurement_quotes")
      .select(`
        *,
        suppliers (name, code, country, rating, on_time_delivery_rate)
      `)
      .eq("order_id", orderId)
      .order("amount", { ascending: true });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les devis",
        variant: "destructive",
      });
    } else {
      setQuotes(data || []);
    }
    setLoading(false);
  };

  const handleSelectQuote = async (quote: Quote) => {
    // Deselect all quotes first
    await supabase
      .from("procurement_quotes")
      .update({ is_selected: false })
      .eq("order_id", orderId);

    // Select this one
    const { error } = await supabase
      .from("procurement_quotes")
      .update({ is_selected: true })
      .eq("id", quote.id);

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Update supplier on order
      await supabase
        .from("procurement_orders")
        .update({ 
          supplier_id: quote.supplier_id,
          total_amount: quote.amount,
          currency: quote.currency
        })
        .eq("id", orderId);

      toast({
        title: "Devis sélectionné",
        description: `Devis de ${quote.suppliers?.name} sélectionné`,
      });
      loadQuotes();
      onQuoteSelected?.(quote);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <Card className="glass border-dashed border-2 border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-2">Aucun devis à comparer</p>
          <p className="text-sm text-muted-foreground">
            Ajoutez au moins 2 devis pour afficher la comparaison
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate statistics
  const lowestPrice = Math.min(...quotes.map((q) => q.amount));
  const highestPrice = Math.max(...quotes.map((q) => q.amount));
  const averagePrice = quotes.reduce((sum, q) => sum + q.amount, 0) / quotes.length;
  const priceRange = highestPrice - lowestPrice;
  const selectedQuote = quotes.find((q) => q.is_selected);

  // Check for modified items in notes
  const hasModifiedItems = (notes: string | null) => {
    return notes?.includes("[ÉQUIVALENT:") || false;
  };

  // Parse rating
  const getRatingColor = (rating: string | null) => {
    switch (rating) {
      case "EXCELLENT":
        return "text-green-500";
      case "GOOD":
        return "text-blue-500";
      case "AVERAGE":
        return "text-amber-500";
      case "POOR":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="h-5 w-5 text-amber-500" />;
      case 1:
        return <Trophy className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Medal className="h-5 w-5 text-amber-700" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-muted-foreground">{index + 1}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="glass border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingDown className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Prix le plus bas</p>
                <p className="text-lg font-bold text-emerald-500">
                  {lowestPrice.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <TrendingUp className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Prix le plus haut</p>
                <p className="text-lg font-bold text-red-500">
                  {highestPrice.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Prix moyen</p>
                <p className="text-lg font-bold text-blue-500">
                  {Math.round(averagePrice).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Écart</p>
                <p className="text-lg font-bold text-amber-500">
                  {priceRange.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  ({((priceRange / lowestPrice) * 100).toFixed(1)}%)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card className="glass border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-500" />
            Comparaison des devis
            <Badge variant="secondary" className="ml-2">
              {quotes.length} devis
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[40px]">Rang</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead className="text-center">Évaluation</TableHead>
                  <TableHead className="text-center">Fiabilité</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-center">Écart vs min</TableHead>
                  <TableHead className="text-center">Équivalents</TableHead>
                  <TableHead className="text-center">Validité</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {quotes.map((quote, index) => {
                    const priceDiff = quote.amount - lowestPrice;
                    const priceDiffPercent = (priceDiff / lowestPrice) * 100;
                    const isBest = index === 0;
                    const hasEquivalents = hasModifiedItems(quote.notes);

                    return (
                      <motion.tr
                        key={quote.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`${
                          quote.is_selected
                            ? "bg-emerald-500/10 border-l-2 border-l-emerald-500"
                            : isBest
                            ? "bg-amber-500/5"
                            : ""
                        }`}
                      >
                        <TableCell>
                          <div className="flex items-center justify-center">
                            {getRankIcon(index)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{quote.suppliers?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {quote.suppliers?.code}
                              </p>
                            </div>
                            {quote.is_selected && (
                              <Badge className="bg-emerald-500/20 text-emerald-500 border-0 ml-2">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Sélectionné
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={getRatingColor(quote.suppliers?.rating || null)}
                          >
                            <Star className="h-3 w-3 mr-1" />
                            {quote.suppliers?.rating || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {quote.suppliers?.on_time_delivery_rate ? (
                            <div className="flex items-center gap-2">
                              <Progress
                                value={quote.suppliers.on_time_delivery_rate}
                                className="w-16 h-2"
                              />
                              <span className="text-xs">
                                {quote.suppliers.on_time_delivery_rate}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <p
                            className={`font-bold text-lg ${
                              isBest ? "text-emerald-500" : ""
                            }`}
                          >
                            {quote.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {quote.currency}
                          </p>
                        </TableCell>
                        <TableCell className="text-center">
                          {isBest ? (
                            <Badge className="bg-emerald-500/20 text-emerald-500 border-0">
                              Meilleur prix
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className={
                                priceDiffPercent > 20
                                  ? "text-red-500 border-red-500/30"
                                  : priceDiffPercent > 10
                                  ? "text-amber-500 border-amber-500/30"
                                  : "text-blue-500 border-blue-500/30"
                              }
                            >
                              +{priceDiffPercent.toFixed(1)}%
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {hasEquivalents ? (
                            <Badge className="bg-amber-500/20 text-amber-500 border-0">
                              <ArrowRightLeft className="h-3 w-3 mr-1" />
                              Oui
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {quote.validity_date ? (
                            <span
                              className={
                                new Date(quote.validity_date) < new Date()
                                  ? "text-red-500"
                                  : ""
                              }
                            >
                              {format(new Date(quote.validity_date), "dd/MM/yy")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {!readOnly && !quote.is_selected && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSelectQuote(quote)}
                              className="gap-1 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                            >
                              <CheckCircle className="h-3 w-3" />
                              Choisir
                            </Button>
                          )}
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>

          {/* Recommendation */}
          {quotes.length >= 2 && (
            <div className="mt-4 p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-lg border border-emerald-500/30">
              <div className="flex items-start gap-3">
                <Crown className="h-6 w-6 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-emerald-500">Recommandation</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Le devis de <strong>{quotes[0].suppliers?.name}</strong> est le
                    plus avantageux avec un montant de{" "}
                    <strong className="text-emerald-500">
                      {quotes[0].amount.toLocaleString()} {quotes[0].currency}
                    </strong>
                    {quotes.length > 1 && (
                      <>
                        , soit une économie de{" "}
                        <strong className="text-emerald-500">
                          {(highestPrice - lowestPrice).toLocaleString()} {quotes[0].currency}
                        </strong>{" "}
                        par rapport au devis le plus élevé.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
