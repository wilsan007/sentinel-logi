import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  FileText, 
  CheckCircle, 
  Trash2, 
  Star,
  Building2,
  Calendar,
  DollarSign,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  };
}

interface Supplier {
  id: string;
  name: string;
  code: string;
  country: string | null;
}

interface QuotesManagerProps {
  orderId: string;
  readOnly?: boolean;
  onQuoteSelected?: (quote: Quote) => void;
}

export function QuotesManager({ orderId, readOnly = false, onQuoteSelected }: QuotesManagerProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [newQuote, setNewQuote] = useState({
    supplier_id: "",
    amount: "",
    currency: "DJF",
    validity_date: "",
    notes: "",
  });

  useEffect(() => {
    loadQuotes();
    loadSuppliers();
  }, [orderId]);

  const loadQuotes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("procurement_quotes")
      .select(`
        *,
        suppliers (name, code, country)
      `)
      .eq("order_id", orderId)
      .order("amount", { ascending: true });

    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger les devis", variant: "destructive" });
    } else {
      setQuotes(data || []);
    }
    setLoading(false);
  };

  const loadSuppliers = async () => {
    const { data } = await supabase
      .from("suppliers")
      .select("id, name, code, country")
      .eq("is_active", true)
      .eq("country", "Djibouti")
      .order("name");
    
    setSuppliers(data || []);
  };

  const handleAddQuote = async () => {
    if (!newQuote.supplier_id || !newQuote.amount) {
      toast({ title: "Erreur", description: "Fournisseur et montant requis", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("procurement_quotes")
      .insert({
        order_id: orderId,
        supplier_id: newQuote.supplier_id,
        amount: parseFloat(newQuote.amount),
        currency: newQuote.currency,
        validity_date: newQuote.validity_date || null,
        notes: newQuote.notes || null,
      });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Devis ajouté" });
      setAddDialogOpen(false);
      setNewQuote({ supplier_id: "", amount: "", currency: "DJF", validity_date: "", notes: "" });
      loadQuotes();
    }
    setSaving(false);
  };

  const handleSelectQuote = async (quote: Quote) => {
    // Deselect all quotes first, then select this one
    const { error: deselectError } = await supabase
      .from("procurement_quotes")
      .update({ is_selected: false })
      .eq("order_id", orderId);

    if (deselectError) {
      toast({ title: "Erreur", description: deselectError.message, variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("procurement_quotes")
      .update({ is_selected: true })
      .eq("id", quote.id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Succès", description: `Devis de ${quote.suppliers?.name} sélectionné` });
      loadQuotes();
      onQuoteSelected?.(quote);
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    const { error } = await supabase
      .from("procurement_quotes")
      .delete()
      .eq("id", quoteId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Devis supprimé" });
      loadQuotes();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  const selectedQuote = quotes.find(q => q.is_selected);
  const lowestQuote = quotes.length > 0 ? quotes[0] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-500" />
            Devis fournisseurs
          </h3>
          <p className="text-sm text-muted-foreground">
            {quotes.length} devis reçu{quotes.length !== 1 ? "s" : ""}
          </p>
        </div>
        {!readOnly && (
          <Button onClick={() => setAddDialogOpen(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un devis
          </Button>
        )}
      </div>

      {quotes.length === 0 ? (
        <Card className="glass border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Aucun devis reçu</p>
            {!readOnly && (
              <Button onClick={() => setAddDialogOpen(true)} variant="link" className="mt-2">
                Ajouter le premier devis
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {quotes.map((quote, index) => (
              <motion.div
                key={quote.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`glass transition-all ${
                  quote.is_selected 
                    ? "border-emerald-500 bg-emerald-500/5" 
                    : quote === lowestQuote 
                    ? "border-amber-500/50 bg-amber-500/5" 
                    : "border-border/50"
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          quote.is_selected 
                            ? "bg-emerald-500/20" 
                            : "bg-muted"
                        }`}>
                          <Building2 className={`h-5 w-5 ${
                            quote.is_selected ? "text-emerald-500" : "text-muted-foreground"
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{quote.suppliers?.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {quote.suppliers?.code}
                            </Badge>
                            {quote.is_selected && (
                              <Badge className="bg-emerald-500/20 text-emerald-500 border-0 gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Sélectionné
                              </Badge>
                            )}
                            {quote === lowestQuote && !quote.is_selected && (
                              <Badge className="bg-amber-500/20 text-amber-500 border-0 gap-1">
                                <Star className="h-3 w-3" />
                                Moins cher
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(quote.received_at), "dd MMM yyyy", { locale: fr })}
                            </span>
                            {quote.validity_date && (
                              <span>Valide jusqu'au {format(new Date(quote.validity_date), "dd MMM yyyy", { locale: fr })}</span>
                            )}
                          </div>
                          {quote.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">{quote.notes}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`text-xl font-bold ${
                            quote.is_selected ? "text-emerald-500" : ""
                          }`}>
                            {quote.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">{quote.currency}</p>
                        </div>

                        {!readOnly && (
                          <div className="flex gap-2">
                            {!quote.is_selected && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSelectQuote(quote)}
                                className="gap-1 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Sélectionner
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteQuote(quote.id)}
                              className="text-red-500 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Quote Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="glass border border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-500" />
              Ajouter un devis
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Fournisseur national *</Label>
              <Select
                value={newQuote.supplier_id}
                onValueChange={(value) => setNewQuote({ ...newQuote, supplier_id: value })}
              >
                <SelectTrigger className="glass border-border/50">
                  <SelectValue placeholder="Sélectionner un fournisseur..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name} ({supplier.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Montant *</Label>
                <Input
                  type="number"
                  value={newQuote.amount}
                  onChange={(e) => setNewQuote({ ...newQuote, amount: e.target.value })}
                  placeholder="0"
                  className="glass border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Devise</Label>
                <Select
                  value={newQuote.currency}
                  onValueChange={(value) => setNewQuote({ ...newQuote, currency: value })}
                >
                  <SelectTrigger className="glass border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DJF">DJF (Franc Djibouti)</SelectItem>
                    <SelectItem value="USD">USD (Dollar)</SelectItem>
                    <SelectItem value="EUR">EUR (Euro)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date de validité</Label>
              <Input
                type="date"
                value={newQuote.validity_date}
                onChange={(e) => setNewQuote({ ...newQuote, validity_date: e.target.value })}
                className="glass border-border/50"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newQuote.notes}
                onChange={(e) => setNewQuote({ ...newQuote, notes: e.target.value })}
                placeholder="Conditions, remarques..."
                className="glass border-border/50"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddQuote} disabled={saving} className="gap-2 bg-emerald-500 hover:bg-emerald-600">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Ajouter le devis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
