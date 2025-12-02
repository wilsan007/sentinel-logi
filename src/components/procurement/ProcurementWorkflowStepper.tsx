import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";

type ProcurementStage = Database["public"]["Enums"]["procurement_stage"];

interface ProcurementWorkflowStepperProps {
  currentStage: ProcurementStage;
  onStageChange: (stage: ProcurementStage) => void;
}

const STAGES: { key: ProcurementStage; label: string; icon: typeof FileEdit }[] = [
  { key: "DRAFT", label: "Brouillon", icon: FileEdit },
  { key: "SUPPLIER_SELECTION", label: "Fournisseur", icon: Users },
  { key: "ORDER_PLACED", label: "Commandé", icon: ShoppingCart },
  { key: "PAYMENT_VERIFIED", label: "Payé", icon: CreditCard },
  { key: "IN_TRANSIT", label: "En transit", icon: Truck },
  { key: "CUSTOMS_ENTRY", label: "Douane", icon: Building2 },
  { key: "RECEIVED", label: "Reçu", icon: CheckCircle },
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

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {STAGES.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = index === currentIndex;
            const isComplete = index < currentIndex;
            const isFuture = index > currentIndex;

            return (
              <div key={stage.key} className="flex items-center flex-1 last:flex-initial">
                <motion.div
                  className={`relative flex flex-col items-center ${
                    isCancelled ? "opacity-50" : ""
                  }`}
                  initial={false}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isComplete
                        ? "bg-emerald-500 text-white"
                        : isActive
                        ? "bg-emerald-500/20 text-emerald-500 ring-2 ring-emerald-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium whitespace-nowrap ${
                      isActive ? "text-emerald-500" : "text-muted-foreground"
                    }`}
                  >
                    {stage.label}
                  </span>
                </motion.div>
                
                {index < STAGES.length - 1 && (
                  <div className="flex-1 mx-2">
                    <div
                      className={`h-1 rounded-full transition-all duration-300 ${
                        isComplete ? "bg-emerald-500" : "bg-muted"
                      }`}
                    />
                  </div>
                )}
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
          className="flex items-center justify-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30"
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
          className="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30"
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
            className="text-red-500 border-red-500/30 hover:bg-red-500/10"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Annuler la commande
          </Button>
          
          <Button
            onClick={handleAdvance}
            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 border border-emerald-500/30"
          >
            Passer à l'étape suivante
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent className="glass border border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "cancel" 
                ? "Annuler la commande ?" 
                : "Confirmer le changement d'étape ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "cancel"
                ? "Cette action est irréversible. La commande sera marquée comme annulée."
                : `La commande passera à l'étape "${
                    STAGES.find((s) => s.key === confirmDialog.stage)?.label || ""
                  }".`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass border-border/50">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={
                confirmDialog.action === "cancel"
                  ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                  : "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30"
              }
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
