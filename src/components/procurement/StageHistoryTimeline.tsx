import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, User, ArrowRight, History } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";

type ProcurementStage = Database["public"]["Enums"]["procurement_stage"];

interface StageHistoryEntry {
  id: string;
  order_id: string;
  previous_stage: ProcurementStage | null;
  new_stage: ProcurementStage;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
  user_name?: string;
}

interface StageHistoryTimelineProps {
  orderId: string;
}

const STAGE_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  SUPPLIER_SELECTION: "Sélection fournisseur",
  ORDER_PLACED: "Commande passée",
  PAYMENT_VERIFIED: "Paiement vérifié",
  IN_TRANSIT: "En transit",
  CUSTOMS_ENTRY: "En douane",
  QUOTE_REQUEST: "Demande de devis",
  QUOTE_SELECTION: "Sélection devis",
  INVOICE_RECEIVED: "Facture reçue",
  DELIVERY_PENDING: "En attente livraison",
  VERIFICATION: "Vérification",
  PAYMENT_ORDER: "Bon de commande",
  PAYMENT_TRACKING: "Bordereau paiement",
  PAID: "Payé",
  RECEIVED: "Reçu",
  CANCELLED: "Annulé"
};

const STAGE_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  SUPPLIER_SELECTION: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ORDER_PLACED: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  PAYMENT_VERIFIED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  IN_TRANSIT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  CUSTOMS_ENTRY: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  QUOTE_REQUEST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  QUOTE_SELECTION: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  INVOICE_RECEIVED: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  DELIVERY_PENDING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  VERIFICATION: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  PAYMENT_ORDER: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  PAYMENT_TRACKING: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  PAID: "bg-green-500/20 text-green-400 border-green-500/30",
  RECEIVED: "bg-green-500/20 text-green-400 border-green-500/30",
  CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30"
};

export const StageHistoryTimeline = ({ orderId }: StageHistoryTimelineProps) => {
  const [history, setHistory] = useState<StageHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const loadHistory = async () => {
    setLoading(true);
    
    // First get the history
    const { data: historyData } = await supabase
      .from("procurement_stage_history")
      .select("*")
      .eq("order_id", orderId)
      .order("changed_at", { ascending: false });

    if (historyData && historyData.length > 0) {
      // Get unique user IDs
      const userIds = [...new Set(historyData.map(h => h.changed_by).filter(Boolean))] as string[];
      
      // Fetch profiles for those users
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, nom_complet")
        .in("id", userIds);

      // Map profiles to history entries
      const profilesMap = new Map(profilesData?.map(p => [p.id, p.nom_complet]) || []);
      
      const enrichedHistory = historyData.map(entry => ({
        ...entry,
        user_name: entry.changed_by ? profilesMap.get(entry.changed_by) || "Utilisateur inconnu" : undefined
      }));
      
      setHistory(enrichedHistory);
    } else {
      setHistory([]);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="glass border-border/50">
        <CardContent className="py-8 text-center">
          <History className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aucun historique de changement d'étape</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            L'historique sera enregistré automatiquement lors des prochains changements
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4 text-emerald-500" />
          Historique des étapes
          <Badge variant="outline" className="ml-auto">
            {history.length} changement{history.length > 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          {history.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative pl-10 pb-6 last:pb-0"
            >
              {/* Timeline dot */}
              <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 ${
                index === 0 
                  ? "bg-emerald-500 border-emerald-500" 
                  : "bg-background border-border"
              }`} />

              <div className="glass border border-border/50 rounded-lg p-3">
                {/* Stage transition */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {entry.previous_stage && (
                    <>
                      <Badge className={`${STAGE_COLORS[entry.previous_stage]} border text-xs`}>
                        {STAGE_LABELS[entry.previous_stage]}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </>
                  )}
                  <Badge className={`${STAGE_COLORS[entry.new_stage]} border text-xs`}>
                    {STAGE_LABELS[entry.new_stage]}
                  </Badge>
                </div>

                {/* Meta info */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {format(new Date(entry.changed_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                    </span>
                  </div>
                  {entry.user_name && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{entry.user_name}</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {entry.notes && (
                  <p className="text-sm text-muted-foreground mt-2 italic">
                    "{entry.notes}"
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
