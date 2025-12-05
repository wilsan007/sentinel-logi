import { useState } from "react";
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
  AlertTriangle
} from "lucide-react";
import { motion } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";

type ProcurementStage = Database["public"]["Enums"]["procurement_stage"];

interface ProcurementWorkflowStepperProps {
  currentStage: ProcurementStage;
  onStageChange: (stage: ProcurementStage) => void;
}

const STAGES: { key: ProcurementStage; label: string; shortLabel: string; icon: typeof FileEdit; color: string }[] = [
  { key: "DRAFT", label: "Brouillon", shortLabel: "Brouillon", icon: FileEdit, color: "gray" },
  { key: "SUPPLIER_SELECTION", label: "Sélection fournisseur", shortLabel: "Fournisseur", icon: Users, color: "blue" },
  { key: "ORDER_PLACED", label: "Commande passée", shortLabel: "Commandé", icon: ShoppingCart, color: "cyan" },
  { key: "PAYMENT_VERIFIED", label: "Paiement vérifié", shortLabel: "Payé", icon: CreditCard, color: "emerald" },
  { key: "IN_TRANSIT", label: "En transit", shortLabel: "Transit", icon: Truck, color: "amber" },
  { key: "CUSTOMS_ENTRY", label: "En douane", shortLabel: "Douane", icon: Building2, color: "orange" },
  { key: "RECEIVED", label: "Reçu", shortLabel: "Reçu", icon: CheckCircle, color: "green" },
];

const getStageIndex = (stage: ProcurementStage): number => {
  if (stage === "CANCELLED") return -1;
  return STAGES.findIndex((s) => s.key === stage);
};

export const ProcurementWorkflowStepper = ({
  currentStage,
  onStageChange,
}: ProcurementWorkflowStepperProps) => {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    stage: ProcurementStage | null;
    action: "advance" | "cancel";
  }>({ open: false, stage: null, action: "advance" });

  const currentIndex = getStageIndex(currentStage);
  const isCancelled = currentStage === "CANCELLED";
  const isCompleted = currentStage === "RECEIVED";

  const handleAdvance = () => {
    if (currentIndex < STAGES.length - 1 && !isCancelled && !isCompleted) {
      const nextStage = STAGES[currentIndex + 1].key;
      setConfirmDialog({ open: true, stage: nextStage, action: "advance" });
    }
  };

  const handleCancel = () => {
    if (!isCancelled && !isCompleted) {
      setConfirmDialog({ open: true, stage: "CANCELLED", action: "cancel" });
    }
  };

  const confirmAction = () => {
    if (confirmDialog.stage) {
      onStageChange(confirmDialog.stage);
    }
    setConfirmDialog({ open: false, stage: null, action: "advance" });
  };

  const nextStage = currentIndex < STAGES.length - 1 ? STAGES[currentIndex + 1] : null;

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <div className="relative px-2">
        {/* Progress line background */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted mx-7" />
        
        {/* Progress line filled */}
        <motion.div 
          className="absolute top-5 left-0 h-0.5 bg-emerald-500 mx-7"
          initial={{ width: "0%" }}
          animate={{ width: `${(currentIndex / (STAGES.length - 1)) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />

        <div className="flex items-start justify-between relative">
          {STAGES.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = index === currentIndex;
            const isComplete = index < currentIndex;
            const isFuture = index > currentIndex;

            return (
              <div key={stage.key} className="flex flex-col items-center relative z-10">
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
                    }`}
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
                  } ${isCancelled ? "opacity-40" : ""}`}
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
          <span className="font-medium text-green-500">Commande reçue et terminée</span>
        </motion.div>
      )}

      {/* Action buttons */}
      {!isCancelled && !isCompleted && (
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
                      {STAGES.find((s) => s.key === confirmDialog.stage)?.label || ""}
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
