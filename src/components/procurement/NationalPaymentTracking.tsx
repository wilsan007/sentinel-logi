import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Banknote, 
  Landmark, 
  BadgeDollarSign,
  CheckCircle,
  Clock,
  Loader2,
  Save,
  FileText,
  Calendar
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface NationalPaymentTrackingProps {
  orderId: string;
  currentStage: string;
  paymentOrderNumber: string | null;
  paymentOrderDate: string | null;
  paymentSlipNumber: string | null;
  paymentSlipDate: string | null;
  treasuryPaymentDate: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  invoiceAmount: number | null;
  readOnly?: boolean;
  onUpdate?: () => void;
}

export function NationalPaymentTracking({
  orderId,
  currentStage,
  paymentOrderNumber,
  paymentOrderDate,
  paymentSlipNumber,
  paymentSlipDate,
  treasuryPaymentDate,
  invoiceNumber,
  invoiceDate,
  invoiceAmount,
  readOnly = false,
  onUpdate,
}: NationalPaymentTrackingProps) {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    invoice_number: invoiceNumber || "",
    invoice_date: invoiceDate || "",
    invoice_amount: invoiceAmount?.toString() || "",
    payment_order_number: paymentOrderNumber || "",
    payment_order_date: paymentOrderDate || "",
    payment_slip_number: paymentSlipNumber || "",
    payment_slip_date: paymentSlipDate || "",
    treasury_payment_date: treasuryPaymentDate || "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("procurement_orders")
        .update({
          invoice_number: formData.invoice_number || null,
          invoice_date: formData.invoice_date || null,
          invoice_amount: formData.invoice_amount ? parseFloat(formData.invoice_amount) : null,
          payment_order_number: formData.payment_order_number || null,
          payment_order_date: formData.payment_order_date || null,
          payment_slip_number: formData.payment_slip_number || null,
          payment_slip_date: formData.payment_slip_date || null,
          treasury_payment_date: formData.treasury_payment_date || null,
        })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Informations enregistrées",
        description: "Les données de paiement ont été mises à jour",
      });
      onUpdate?.();
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

  const steps = [
    {
      key: "invoice",
      label: "Facture fournisseur",
      icon: FileText,
      completed: !!invoiceNumber,
      current: currentStage === "INVOICE_RECEIVED",
      fields: ["invoice_number", "invoice_date", "invoice_amount"],
    },
    {
      key: "payment_order",
      label: "Bon de commande (Min. Budget)",
      icon: Banknote,
      completed: !!paymentOrderNumber,
      current: currentStage === "PAYMENT_ORDER",
      fields: ["payment_order_number", "payment_order_date"],
    },
    {
      key: "payment_slip",
      label: "Bordereau de paiement",
      icon: Landmark,
      completed: !!paymentSlipNumber,
      current: currentStage === "PAYMENT_TRACKING",
      fields: ["payment_slip_number", "payment_slip_date"],
    },
    {
      key: "treasury",
      label: "Décaissement Trésor",
      icon: BadgeDollarSign,
      completed: !!treasuryPaymentDate,
      current: currentStage === "PAID",
      fields: ["treasury_payment_date"],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Landmark className="h-5 w-5 text-emerald-500" />
          Suivi du paiement national
        </h3>
        <p className="text-sm text-muted-foreground">
          Processus de paiement via le Ministère du Budget et le Trésor National
        </p>
      </div>

      {/* Progress Timeline */}
      <div className="flex items-center justify-between px-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex flex-col items-center relative">
              {index > 0 && (
                <div className={`absolute right-full top-5 w-full h-0.5 mr-1 ${
                  steps[index - 1].completed ? "bg-emerald-500" : "bg-muted"
                }`} style={{ width: "calc(100% - 2rem)" }} />
              )}
              <motion.div
                initial={false}
                animate={{ scale: step.current ? 1.1 : 1 }}
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  step.completed
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : step.current
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                    : "bg-muted border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {step.completed ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </motion.div>
              <span className={`text-xs mt-2 text-center max-w-[80px] ${
                step.current ? "text-emerald-500 font-medium" : "text-muted-foreground"
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Form Sections */}
      <div className="grid gap-4">
        {/* Invoice Section */}
        <Card className={`glass transition-all ${
          currentStage === "INVOICE_RECEIVED" ? "border-emerald-500/50" : "border-border/50"
        }`}>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Facture fournisseur
              {invoiceNumber && (
                <Badge className="bg-emerald-500/20 text-emerald-500 border-0 ml-auto">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Reçue
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">N° Facture</Label>
                <Input
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  placeholder="FAC-2024-001"
                  className="h-9 text-sm glass border-border/50"
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date facture</Label>
                <Input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  className="h-9 text-sm glass border-border/50"
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Montant (DJF)</Label>
                <Input
                  type="number"
                  value={formData.invoice_amount}
                  onChange={(e) => setFormData({ ...formData, invoice_amount: e.target.value })}
                  placeholder="0"
                  className="h-9 text-sm glass border-border/50"
                  disabled={readOnly}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Order Section */}
        <Card className={`glass transition-all ${
          currentStage === "PAYMENT_ORDER" ? "border-emerald-500/50" : "border-border/50"
        }`}>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Bon de commande (Ministère du Budget)
              {paymentOrderNumber && (
                <Badge className="bg-emerald-500/20 text-emerald-500 border-0 ml-auto">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Émis
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">N° Bon de commande</Label>
                <Input
                  value={formData.payment_order_number}
                  onChange={(e) => setFormData({ ...formData, payment_order_number: e.target.value })}
                  placeholder="BC-2024-001"
                  className="h-9 text-sm glass border-border/50"
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date émission</Label>
                <Input
                  type="date"
                  value={formData.payment_order_date}
                  onChange={(e) => setFormData({ ...formData, payment_order_date: e.target.value })}
                  className="h-9 text-sm glass border-border/50"
                  disabled={readOnly}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Slip Section */}
        <Card className={`glass transition-all ${
          currentStage === "PAYMENT_TRACKING" ? "border-emerald-500/50" : "border-border/50"
        }`}>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              Bordereau de paiement
              {paymentSlipNumber && (
                <Badge className="bg-emerald-500/20 text-emerald-500 border-0 ml-auto">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Émis
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">N° Bordereau</Label>
                <Input
                  value={formData.payment_slip_number}
                  onChange={(e) => setFormData({ ...formData, payment_slip_number: e.target.value })}
                  placeholder="BP-2024-001"
                  className="h-9 text-sm glass border-border/50"
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date émission</Label>
                <Input
                  type="date"
                  value={formData.payment_slip_date}
                  onChange={(e) => setFormData({ ...formData, payment_slip_date: e.target.value })}
                  className="h-9 text-sm glass border-border/50"
                  disabled={readOnly}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Treasury Payment Section */}
        <Card className={`glass transition-all ${
          currentStage === "PAID" ? "border-green-500/50 bg-green-500/5" : "border-border/50"
        }`}>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BadgeDollarSign className="h-4 w-4" />
              Décaissement Trésor National
              {treasuryPaymentDate && (
                <Badge className="bg-green-500/20 text-green-500 border-0 ml-auto">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Payé
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              <Label className="text-xs">Date de décaissement</Label>
              <Input
                type="date"
                value={formData.treasury_payment_date}
                onChange={(e) => setFormData({ ...formData, treasury_payment_date: e.target.value })}
                className="h-9 text-sm glass border-border/50"
                disabled={readOnly}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Date à laquelle le fournisseur a reçu le paiement du Trésor National
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      {!readOnly && (
        <div className="flex justify-end pt-4 border-t border-border/50">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 bg-emerald-500 hover:bg-emerald-600"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer les modifications
          </Button>
        </div>
      )}
    </div>
  );
}
