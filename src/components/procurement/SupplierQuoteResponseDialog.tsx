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
  FileText, 
  Building2, 
  Package,
  Loader2,
  Plus,
  ArrowRightLeft,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface OrderItem {
  id: string;
  stock_item_id: string;
  quantity_ordered: number;
  unit_price: number | null;
  stock_items?: {
    type: string;
    sous_type: string | null;
    categorie: string;
  };
}

interface QuoteItemResponse {
  order_item_id: string;
  original_item: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  equivalent_item: string;
  is_modified: boolean;
}

interface Supplier {
  id: string;
  name: string;
  code: string;
  country: string | null;
}

interface SupplierQuoteResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  items: OrderItem[];
  currency: string;
  onQuoteAdded: () => void;
}

export function SupplierQuoteResponseDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  items,
  currency,
  onQuoteAdded,
}: SupplierQuoteResponseDialogProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validityDate, setValidityDate] = useState("");
  const [notes, setNotes] = useState("");
  const [itemResponses, setItemResponses] = useState<QuoteItemResponse[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadSuppliers();
      initializeItemResponses();
      
      // Default validity: 30 days
      const validity = new Date();
      validity.setDate(validity.getDate() + 30);
      setValidityDate(validity.toISOString().split("T")[0]);
    }
  }, [open, items]);

  const loadSuppliers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("suppliers")
      .select("id, name, code, country")
      .eq("is_active", true)
      .eq("country", "Djibouti")
      .order("name");

    setSuppliers(data || []);
    setLoading(false);
  };

  const initializeItemResponses = () => {
    const responses = items.map((item) => ({
      order_item_id: item.id,
      original_item: `${item.stock_items?.type}${item.stock_items?.sous_type ? ` - ${item.stock_items.sous_type}` : ""}`,
      quantity: item.quantity_ordered,
      unit_price: 0,
      total_price: 0,
      equivalent_item: "",
      is_modified: false,
    }));
    setItemResponses(responses);
  };

  const updateItemResponse = (
    orderItemId: string,
    field: keyof QuoteItemResponse,
    value: any
  ) => {
    setItemResponses((prev) =>
      prev.map((item) => {
        if (item.order_item_id === orderItemId) {
          const updated = { ...item, [field]: value };
          
          // Recalculate total if price or quantity changes
          if (field === "unit_price" || field === "quantity") {
            updated.total_price = updated.quantity * updated.unit_price;
          }
          
          // Mark as modified if equivalent is provided
          if (field === "equivalent_item" && value) {
            updated.is_modified = true;
          }
          
          return updated;
        }
        return item;
      })
    );
  };

  const totalAmount = itemResponses.reduce((sum, item) => sum + item.total_price, 0);
  const modifiedItems = itemResponses.filter((item) => item.is_modified).length;

  const handleSaveQuote = async () => {
    if (!selectedSupplierId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fournisseur",
        variant: "destructive",
      });
      return;
    }

    if (totalAmount <= 0) {
      toast({
        title: "Erreur",
        description: "Le montant total doit être supérieur à 0",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Create the quote with item details in notes
      const itemDetails = itemResponses
        .map((item) => {
          let detail = `${item.original_item}: ${item.quantity} x ${item.unit_price.toLocaleString()} = ${item.total_price.toLocaleString()} ${currency}`;
          if (item.is_modified && item.equivalent_item) {
            detail += ` [ÉQUIVALENT: ${item.equivalent_item}]`;
          }
          return detail;
        })
        .join("\n");

      const fullNotes = notes
        ? `${notes}\n\n--- Détail des articles ---\n${itemDetails}`
        : `--- Détail des articles ---\n${itemDetails}`;

      const { error } = await supabase.from("procurement_quotes").insert({
        order_id: orderId,
        supplier_id: selectedSupplierId,
        amount: totalAmount,
        currency: currency,
        validity_date: validityDate || null,
        notes: fullNotes,
      });

      if (error) throw error;

      toast({
        title: "Devis enregistré",
        description: `Devis de ${totalAmount.toLocaleString()} ${currency} ajouté avec succès`,
      });

      onQuoteAdded();
      onOpenChange(false);
      
      // Reset form
      setSelectedSupplierId("");
      setNotes("");
      initializeItemResponses();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border border-emerald-500/20 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-500" />
            Saisir un devis fournisseur - {orderNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Supplier Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fournisseur *</Label>
              {loading ? (
                <div className="flex items-center gap-2 h-10">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Chargement...</span>
                </div>
              ) : (
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger className="glass border-border/50">
                    <SelectValue placeholder="Sélectionner un fournisseur..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {supplier.name} ({supplier.code})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Validité du devis</Label>
              <Input
                type="date"
                value={validityDate}
                onChange={(e) => setValidityDate(e.target.value)}
                className="glass border-border/50"
              />
            </div>
          </div>

          {/* Items Table */}
          <Card className="glass border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-500" />
                  Articles du devis
                </span>
                {modifiedItems > 0 && (
                  <Badge className="bg-amber-500/20 text-amber-500">
                    <ArrowRightLeft className="h-3 w-3 mr-1" />
                    {modifiedItems} équivalent(s) proposé(s)
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[250px]">Article demandé</TableHead>
                      <TableHead className="text-center w-[80px]">Qté</TableHead>
                      <TableHead className="text-right w-[120px]">Prix unit.</TableHead>
                      <TableHead className="text-right w-[120px]">Total</TableHead>
                      <TableHead className="w-[200px]">Équivalent proposé</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemResponses.map((item) => (
                      <TableRow key={item.order_item_id} className={item.is_modified ? "bg-amber-500/5" : ""}>
                        <TableCell>
                          <div className="font-medium">{item.original_item}</div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              updateItemResponse(
                                item.order_item_id,
                                "quantity",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="glass border-border/50 text-center h-8 w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={item.unit_price || ""}
                            onChange={(e) =>
                              updateItemResponse(
                                item.order_item_id,
                                "unit_price",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                            className="glass border-border/50 text-right h-8"
                          />
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-500">
                          {item.total_price.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.equivalent_item}
                            onChange={(e) =>
                              updateItemResponse(
                                item.order_item_id,
                                "equivalent_item",
                                e.target.value
                              )
                            }
                            placeholder="Si différent..."
                            className={`glass h-8 text-sm ${
                              item.is_modified
                                ? "border-amber-500/50 bg-amber-500/10"
                                : "border-border/50"
                            }`}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Total */}
              <div className="mt-4 p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-lg border border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-emerald-500" />
                    <span className="font-medium">Total du devis</span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-500">
                      {totalAmount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{currency}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes du fournisseur</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Conditions de paiement, délais, remarques..."
              className="glass border-border/50 min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-border/50 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSaveQuote}
            disabled={saving || !selectedSupplierId || totalAmount <= 0}
            className="gap-2 bg-emerald-500 hover:bg-emerald-600"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Enregistrer le devis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
