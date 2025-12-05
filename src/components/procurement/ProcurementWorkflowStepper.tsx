import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  FileEdit, 
  Users, 
  ShoppingCart, 
  CreditCard, 
  Truck, 
  Building2, 
  CheckCircle,
  XCircle,
  ChevronRight,
  AlertTriangle,
  FileText,
  Receipt,
  PackageCheck,
  ClipboardCheck,
  Banknote,
  Landmark,
  BadgeDollarSign,
  Globe,
  MapPin
} from "lucide-react";
import { motion } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";

type ProcurementStage = Database["public"]["Enums"]["procurement_stage"];

interface ProcurementWorkflowStepperProps {
  currentStage: ProcurementStage;
  onStageChange?: (stage: ProcurementStage) => void;
  isNationalSupplier?: boolean;
  onStageClick?: (stage: ProcurementStage) => void;
}

// Stages for INTERNATIONAL supplier workflow
const INTERNATIONAL_STAGES: { key: ProcurementStage; label: string; shortLabel: string; icon: typeof FileEdit; color: string }[] = [
  { key: "DRAFT", label: "Brouillon", shortLabel: "Brouillon", icon: FileEdit, color: "gray" },
  { key: "SUPPLIER_SELECTION", label: "Sélection fournisseur", shortLabel: "Fournisseur", icon: Users, color: "blue" },
  { key: "ORDER_PLACED", label: "Commande passée", shortLabel: "Commandé", icon: ShoppingCart, color: "cyan" },
  { key: "PAYMENT_VERIFIED", label: "Paiement vérifié", shortLabel: "Payé", icon: CreditCard, color: "emerald" },
  { key: "IN_TRANSIT", label: "En transit", shortLabel: "Transit", icon: Truck, color: "amber" },
  { key: "CUSTOMS_ENTRY", label: "En douane", shortLabel: "Douane", icon: Building2, color: "orange" },
  { key: "VERIFICATION", label: "Vérification", shortLabel: "Contrôle", icon: ClipboardCheck, color: "purple" },
  { key: "RECEIVED", label: "Reçu", shortLabel: "Reçu", icon: CheckCircle, color: "green" },
];

// Stages for NATIONAL/LOCAL supplier workflow (Djibouti)
const NATIONAL_STAGES: { key: ProcurementStage; label: string; shortLabel: string; icon: typeof FileEdit; color: string }[] = [
  { key: "DRAFT", label: "Brouillon", shortLabel: "Brouillon", icon: FileEdit, color: "gray" },
  { key: "QUOTE_REQUEST", label: "Demande de devis", shortLabel: "Devis", icon: FileText, color: "blue" },
  { key: "QUOTE_SELECTION", label: "Sélection devis", shortLabel: "Sélection", icon: Users, color: "cyan" },
  { key: "INVOICE_RECEIVED", label: "Facture reçue", shortLabel: "Facture", icon: Receipt, color: "teal" },
  { key: "DELIVERY_PENDING", label: "En attente livraison", shortLabel: "Livraison", icon: Truck, color: "amber" },
  { key: "VERIFICATION", label: "Vérification", shortLabel: "Contrôle", icon: ClipboardCheck, color: "purple" },
  { key: "PAYMENT_ORDER", label: "Bon de commande", shortLabel: "BC", icon: Banknote, color: "orange" },
  { key: "PAYMENT_TRACKING", label: "Bordereau paiement", shortLabel: "Bordereau", icon: Landmark, color: "emerald" },
  { key: "PAID", label: "Payé", shortLabel: "Payé", icon: BadgeDollarSign, color: "green" },
];

const getStageIndex = (stage: ProcurementStage, stages: typeof INTERNATIONAL_STAGES): number => {
  if (stage === "CANCELLED") return -1;
  return stages.findIndex((s) => s.key === stage);
};

export const ProcurementWorkflowStepper = ({
  currentStage,
  onStageChange,
  isNationalSupplier = false,
  onStageClick,
}: ProcurementWorkflowStepperProps) => {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    stage: ProcurementStage | null;
    action: "advance" | "cancel";
  }>({ open: false, stage: null, action: "advance" });

  // Select workflow based on supplier type
  const STAGES = isNationalSupplier ? NATIONAL_STAGES : INTERNATIONAL_STAGES;
  const currentIndex = getStageIndex(currentStage, STAGES);
  const isCancelled = currentStage === "CANCELLED";
  const isCompleted = currentStage === "RECEIVED" || currentStage === "PAID";

  const handleAdvance = () => {
    if (currentIndex < STAGES.length - 1 && !isCancelled && !isCompleted && onStageChange) {
      const nextStage = STAGES[currentIndex + 1].key;
      setConfirmDialog({ open: true, stage: nextStage, action: "advance" });
    }
  };

  const handleCancel = () => {
    if (!isCancelled && !isCompleted && onStageChange) {
      setConfirmDialog({ open: true, stage: "CANCELLED", action: "cancel" });
    }
  };

  const confirmAction = () => {
    if (confirmDialog.stage && onStageChange) {
      onStageChange(confirmDialog.stage);
    }
    setConfirmDialog({ open: false, stage: null, action: "advance" });
  };

  const nextStage = currentIndex >= 0 && currentIndex < STAGES.length - 1 ? STAGES[currentIndex + 1] : null;

  // Handle case when stage doesn't exist in current workflow
  const isStageInWorkflow = currentIndex !== -1 || isCancelled || isCompleted;

  return (
    <div className="space-y-4">
      {/* Workflow Type Indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        {isNationalSupplier ? (
          <>
            <MapPin className="h-3 w-3 text-amber-500" />
            <span className="text-amber-500 font-medium">Workflow National (Djibouti)</span>
          </>
        ) : (
          <>
            <Globe className="h-3 w-3 text-blue-500" />
            <span className="text-blue-500 font-medium">Workflow International</span>
          </>
        )}
      </div>

      {/* Stepper */}
      <div className="relative px-2 overflow-x-auto pb-2">
        {/* Progress line background */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted mx-7" />
        
        {/* Progress line filled */}
        <motion.div 
          className="absolute top-5 left-0 h-0.5 bg-emerald-500 mx-7"
          initial={{ width: "0%" }}
          animate={{ width: currentIndex >= 0 ? `${(currentIndex / (STAGES.length - 1)) * 100}%` : "0%" }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />

        <div className="flex items-start justify-between relative min-w-max">
          {STAGES.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = index === currentIndex;
            const isComplete = index < currentIndex;
            const isClickable = (isComplete || isActive) && onStageClick;

            return (
              <div 
                key={stage.key} 
                className={`flex flex-col items-center relative z-10 px-1 ${isClickable ? "cursor-pointer group" : ""}`}
                onClick={() => isClickable && onStageClick(stage.key)}
                title={isClickable ? `Voir les détails: ${stage.label}` : undefined}
              >
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.15 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className={`relative ${isCancelled ? "opacity-40" : ""}`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                      isComplete
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                        : isActive
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                        : "bg-muted border-muted text-muted-foreground"
                    } ${isClickable ? "group-hover:ring-2 group-hover:ring-emerald-500/50 group-hover:ring-offset-2 group-hover:ring-offset-background" : ""}`}
                  >
                    {isComplete ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  
                  {/* Pulse animation for active step */}
                  {isActive && !isCancelled && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-emerald-500"
                      initial={{ scale: 1, opacity: 1 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                </motion.div>
                
                <span
                  className={`text-xs mt-2 font-medium whitespace-nowrap transition-colors ${
                    isActive ? "text-emerald-500" : isComplete ? "text-foreground" : "text-muted-foreground"
                  } ${isCancelled ? "opacity-40" : ""} ${isClickable ? "group-hover:text-emerald-400" : ""}`}
                >
                  {stage.shortLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status badge for cancelled */}
      {isCancelled && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30"
        >
          <XCircle className="h-5 w-5 text-red-500" />
          <span className="font-medium text-red-500">Commande annulée</span>
        </motion.div>
      )}

      {/* Completed badge */}
      {isCompleted && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/30"
        >
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="font-medium text-green-500">
            {currentStage === "PAID" ? "Commande payée et terminée" : "Commande reçue et terminée"}
          </span>
        </motion.div>
      )}

      {/* Action buttons - only show if onStageChange is provided */}
      {!isCancelled && !isCompleted && onStageChange && (
        <div className="flex justify-between items-center pt-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="text-red-500 border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Annuler la commande
          </Button>
          
          {nextStage && (
            <Button
              onClick={handleAdvance}
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
            >
              Passer à: {nextStage.label}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent className="glass border border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmDialog.action === "cancel" ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Annuler la commande ?
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  Confirmer le changement d'étape ?
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "cancel"
                ? "Cette action est irréversible. La commande sera définitivement marquée comme annulée et ne pourra plus être modifiée."
                : (
                  <div className="space-y-2">
                    <p>La commande passera à l'étape:</p>
                    <Badge className="bg-emerald-500/20 text-emerald-500 border-0">
                      {STAGES.find((s) => s.key === confirmDialog.stage)?.label || confirmDialog.stage}
                    </Badge>
                  </div>
                )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass border-border/50">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={
                confirmDialog.action === "cancel"
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-emerald-500 hover:bg-emerald-600 text-white"
              }
            >
              {confirmDialog.action === "cancel" ? "Confirmer l'annulation" : "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
