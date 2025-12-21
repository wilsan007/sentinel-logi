import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  Printer, 
  Send, 
  Mail, 
  MessageCircle, 
  Building2, 
  Package,
  Calendar,
  FileText,
  Loader2,
  Phone,
  Copy,
  CheckCircle,
  ExternalLink
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

interface Supplier {
  id: string;
  name: string;
  code: string;
  country: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

interface QuoteRequestSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  items: OrderItem[];
  currency: string;
}

export function QuoteRequestSheet({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  items,
  currency,
}: QuoteRequestSheetProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [responseDeadline, setResponseDeadline] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadSuppliers();
      // Set default deadline to 7 days from now
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 7);
      setResponseDeadline(deadline.toISOString().split("T")[0]);
    }
  }, [open]);

  const loadSuppliers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("suppliers")
      .select("id, name, code, country, contact_email, contact_phone")
      .eq("is_active", true)
      .order("name");

    setSuppliers(data || []);
    setLoading(false);
  };

  const toggleSupplier = (supplierId: string) => {
    setSelectedSuppliers((prev) =>
      prev.includes(supplierId)
        ? prev.filter((id) => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Demande de Devis - ${orderNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 40px; 
              color: #333;
              background: #fff;
            }
            .header { 
              text-align: center; 
              margin-bottom: 40px; 
              padding-bottom: 20px;
              border-bottom: 3px solid #10b981;
            }
            .header h1 { 
              font-size: 24px; 
              color: #10b981;
              margin-bottom: 8px;
            }
            .header p { 
              color: #666; 
              font-size: 14px; 
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .info-box {
              background: #f8fafc;
              padding: 15px;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
            }
            .info-box h3 {
              font-size: 12px;
              text-transform: uppercase;
              color: #64748b;
              margin-bottom: 8px;
            }
            .info-box p {
              font-size: 14px;
              font-weight: 500;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0; 
            }
            th { 
              background: #10b981; 
              color: white; 
              padding: 12px 15px; 
              text-align: left;
              font-size: 12px;
              text-transform: uppercase;
            }
            td { 
              padding: 12px 15px; 
              border-bottom: 1px solid #e2e8f0; 
            }
            tr:nth-child(even) { background: #f8fafc; }
            .price-input {
              border: 1px solid #10b981;
              border-radius: 4px;
              padding: 8px 12px;
              width: 120px;
              text-align: right;
            }
            .equivalent-input {
              border: 1px dashed #94a3b8;
              border-radius: 4px;
              padding: 6px 10px;
              width: 100%;
              font-size: 12px;
            }
            .notes-section {
              margin-top: 30px;
              padding: 20px;
              background: #fef3c7;
              border-radius: 8px;
              border: 1px solid #fcd34d;
            }
            .notes-section h3 {
              color: #92400e;
              margin-bottom: 10px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
            }
            .signature-box {
              padding: 20px;
              border: 1px dashed #94a3b8;
              border-radius: 8px;
              text-align: center;
            }
            .signature-box p {
              font-size: 12px;
              color: #64748b;
              margin-bottom: 60px;
            }
            .signature-line {
              border-top: 1px solid #333;
              padding-top: 8px;
              font-size: 12px;
            }
            .instructions {
              margin-top: 30px;
              padding: 20px;
              background: #ecfdf5;
              border-radius: 8px;
              border: 1px solid #10b981;
            }
            .instructions h3 {
              color: #059669;
              margin-bottom: 10px;
            }
            .instructions ol {
              padding-left: 20px;
              font-size: 13px;
            }
            .instructions li {
              margin-bottom: 8px;
            }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const generateQuoteMessage = (supplier: Supplier) => {
    const itemsList = items
      .map(
        (item, idx) =>
          `${idx + 1}. ${item.stock_items?.type}${item.stock_items?.sous_type ? ` - ${item.stock_items.sous_type}` : ""} (Qté: ${item.quantity_ordered})`
      )
      .join("\n");

    return `Bonjour ${supplier.name},

Nous souhaitons recevoir votre meilleur devis pour les articles suivants :

DEMANDE DE DEVIS N° ${orderNumber}
Date: ${format(new Date(), "dd MMMM yyyy", { locale: fr })}
Date limite de réponse: ${responseDeadline ? format(new Date(responseDeadline), "dd MMMM yyyy", { locale: fr }) : "À convenir"}

ARTICLES:
${itemsList}

${additionalNotes ? `NOTES: ${additionalNotes}\n` : ""}
Merci de nous indiquer vos prix unitaires et le montant total.
Si un article n'est pas disponible, veuillez proposer un équivalent.

Cordialement,
Service des Achats`;
  };

  const handleSendEmail = (supplier: Supplier) => {
    if (!supplier.contact_email) {
      toast({
        title: "Email non disponible",
        description: "Ce fournisseur n'a pas d'adresse email enregistrée",
        variant: "destructive",
      });
      return;
    }

    const subject = encodeURIComponent(`Demande de Devis N° ${orderNumber}`);
    const body = encodeURIComponent(generateQuoteMessage(supplier));
    window.open(`mailto:${supplier.contact_email}?subject=${subject}&body=${body}`);
    
    toast({
      title: "Email préparé",
      description: `Ouverture du client email pour ${supplier.name}`,
    });
  };

  const handleSendWhatsApp = (supplier: Supplier) => {
    if (!supplier.contact_phone) {
      toast({
        title: "Téléphone non disponible",
        description: "Ce fournisseur n'a pas de numéro WhatsApp enregistré",
        variant: "destructive",
      });
      return;
    }

    // Remove all non-numeric characters except +
    const phone = supplier.contact_phone.replace(/[^0-9+]/g, "");
    const message = encodeURIComponent(generateQuoteMessage(supplier));
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
    
    toast({
      title: "WhatsApp ouvert",
      description: `Message préparé pour ${supplier.name}`,
    });
  };

  const handleCopyLink = () => {
    // In a real app, this would be a unique link to a quote response form
    const quoteLink = `${window.location.origin}/quote-response/${orderId}`;
    navigator.clipboard.writeText(quoteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    
    toast({
      title: "Lien copié",
      description: "Le lien de réponse au devis a été copié dans le presse-papiers",
    });
  };

  const handleSendToSelected = () => {
    if (selectedSuppliers.length === 0) {
      toast({
        title: "Aucun fournisseur sélectionné",
        description: "Veuillez sélectionner au moins un fournisseur",
        variant: "destructive",
      });
      return;
    }

    // Open email for each selected supplier
    selectedSuppliers.forEach((supplierId) => {
      const supplier = suppliers.find((s) => s.id === supplierId);
      if (supplier?.contact_email) {
        handleSendEmail(supplier);
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-500" />
            Demande de Devis - {orderNumber}
          </SheetTitle>
          <SheetDescription>
            Générez et envoyez une demande de devis aux fournisseurs
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Suppliers Selection */}
          <Card className="glass border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-500" />
                Sélectionner les fournisseurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                </div>
              ) : (
                <div className="grid gap-2 max-h-48 overflow-y-auto">
                  {suppliers.map((supplier) => (
                    <div
                      key={supplier.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        selectedSuppliers.includes(supplier.id)
                          ? "border-emerald-500 bg-emerald-500/5"
                          : "border-border/50 hover:border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedSuppliers.includes(supplier.id)}
                          onCheckedChange={() => toggleSupplier(supplier.id)}
                        />
                        <div>
                          <p className="font-medium">{supplier.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {supplier.code} • {supplier.country || "Pays non spécifié"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {supplier.contact_email && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSendEmail(supplier)}
                            className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}
                        {supplier.contact_phone && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSendWhatsApp(supplier)}
                            className="h-8 w-8 p-0 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date limite de réponse</Label>
              <Input
                type="date"
                value={responseDeadline}
                onChange={(e) => setResponseDeadline(e.target.value)}
                className="glass border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes additionnelles</Label>
              <Textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Conditions particulières..."
                className="glass border-border/50 h-[38px] min-h-[38px]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={handlePrint} variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
            <Button
              onClick={handleSendToSelected}
              disabled={selectedSuppliers.length === 0}
              className="gap-2 bg-blue-500 hover:bg-blue-600"
            >
              <Mail className="h-4 w-4" />
              Email ({selectedSuppliers.length})
            </Button>
            <Button onClick={handleCopyLink} variant="outline" className="gap-2">
              {copiedLink ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copiedLink ? "Copié!" : "Copier lien"}
            </Button>
          </div>

          {/* Printable Preview */}
          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Aperçu du document</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                ref={printRef}
                className="bg-white text-gray-900 p-6 rounded-lg text-sm"
              >
                <div className="header text-center mb-6 pb-4 border-b-2 border-emerald-500">
                  <h1 className="text-xl font-bold text-emerald-600 mb-1">
                    DEMANDE DE DEVIS
                  </h1>
                  <p className="text-gray-500">
                    Document de consultation fournisseur
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 p-3 rounded border">
                    <p className="text-xs text-gray-500 uppercase mb-1">
                      Référence commande
                    </p>
                    <p className="font-bold text-emerald-600">{orderNumber}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border">
                    <p className="text-xs text-gray-500 uppercase mb-1">
                      Date d'émission
                    </p>
                    <p className="font-medium">
                      {format(new Date(), "dd MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border">
                    <p className="text-xs text-gray-500 uppercase mb-1">
                      Date limite de réponse
                    </p>
                    <p className="font-medium text-amber-600">
                      {responseDeadline
                        ? format(new Date(responseDeadline), "dd MMMM yyyy", { locale: fr })
                        : "À convenir"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border">
                    <p className="text-xs text-gray-500 uppercase mb-1">
                      Devise
                    </p>
                    <p className="font-medium">{currency}</p>
                  </div>
                </div>

                <table className="w-full border-collapse mb-6">
                  <thead>
                    <tr className="bg-emerald-500 text-white">
                      <th className="p-2 text-left text-xs">#</th>
                      <th className="p-2 text-left text-xs">ARTICLE</th>
                      <th className="p-2 text-center text-xs">QTÉ</th>
                      <th className="p-2 text-right text-xs">
                        PRIX UNIT. ({currency})
                      </th>
                      <th className="p-2 text-right text-xs">
                        TOTAL ({currency})
                      </th>
                      <th className="p-2 text-left text-xs">ÉQUIVALENT PROPOSÉ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                        <td className="p-2 border-b">{index + 1}</td>
                        <td className="p-2 border-b font-medium">
                          {item.stock_items?.type}
                          {item.stock_items?.sous_type && (
                            <span className="text-gray-500">
                              {" "}
                              - {item.stock_items.sous_type}
                            </span>
                          )}
                        </td>
                        <td className="p-2 border-b text-center font-bold">
                          {item.quantity_ordered}
                        </td>
                        <td className="p-2 border-b">
                          <div className="border border-emerald-500 rounded p-1 text-right">
                            ____________
                          </div>
                        </td>
                        <td className="p-2 border-b">
                          <div className="border border-emerald-500 rounded p-1 text-right">
                            ____________
                          </div>
                        </td>
                        <td className="p-2 border-b">
                          <div className="border border-dashed border-gray-400 rounded p-1 text-xs">
                            (si différent)
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-emerald-50">
                      <td colSpan={4} className="p-3 text-right border-t-2">
                        TOTAL GÉNÉRAL:
                      </td>
                      <td className="p-3 border-t-2">
                        <div className="border-2 border-emerald-500 rounded p-2 text-right">
                          ____________
                        </div>
                      </td>
                      <td className="border-t-2"></td>
                    </tr>
                  </tbody>
                </table>

                {additionalNotes && (
                  <div className="bg-amber-50 p-4 rounded border border-amber-300 mb-6">
                    <h3 className="font-bold text-amber-800 mb-2">
                      Notes importantes:
                    </h3>
                    <p className="text-sm">{additionalNotes}</p>
                  </div>
                )}

                <div className="bg-emerald-50 p-4 rounded border border-emerald-300 mb-6">
                  <h3 className="font-bold text-emerald-800 mb-2">
                    Instructions au fournisseur:
                  </h3>
                  <ol className="text-sm list-decimal pl-4 space-y-1">
                    <li>Remplissez les prix unitaires pour chaque article</li>
                    <li>Calculez le total par ligne (Qté × Prix unitaire)</li>
                    <li>
                      Si un article n'est pas disponible, proposez un équivalent
                      dans la dernière colonne
                    </li>
                    <li>Indiquez le total général de votre offre</li>
                    <li>
                      Retournez ce document signé avant la date limite indiquée
                    </li>
                  </ol>
                </div>

                <div className="grid grid-cols-2 gap-8 mt-8 pt-4 border-t">
                  <div className="border border-dashed border-gray-400 p-4 rounded text-center">
                    <p className="text-xs text-gray-500 mb-12">Cachet du fournisseur</p>
                    <div className="border-t border-gray-400 pt-2">
                      <p className="text-xs">Date: ____/____/________</p>
                    </div>
                  </div>
                  <div className="border border-dashed border-gray-400 p-4 rounded text-center">
                    <p className="text-xs text-gray-500 mb-12">
                      Signature du représentant
                    </p>
                    <div className="border-t border-gray-400 pt-2">
                      <p className="text-xs">Nom: _______________________</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
