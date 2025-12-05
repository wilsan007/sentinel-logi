import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Package,
  Loader2,
  AlertTriangle,
  Send,
  Lock,
  ShieldAlert
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { CreateDemandeDialog } from "./CreateDemandeDialog";
import { SubmissionWindowBanner } from "./SubmissionWindowBanner";
import { RequestExceptionalAccessDialog } from "./RequestExceptionalAccessDialog";
import { useSubmissionWindow } from "@/hooks/useSubmissionWindow";

interface DemandesManagerProps {
  locationId: string;
}

interface Demande {
  id: string;
  stock_item_id: string;
  quantite_demandee: number;
  statut: string;
  date_demande: string;
  date_traitement: string | null;
  notes: string | null;
  stock_items?: {
    type: string;
    sous_type: string | null;
    categorie: string;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  en_attente: { label: "En attente", color: "bg-amber-500/20 text-amber-500", icon: Clock },
  approuve: { label: "Approuvé", color: "bg-blue-500/20 text-blue-500", icon: CheckCircle2 },
  traite: { label: "Traité", color: "bg-green-500/20 text-green-500", icon: CheckCircle2 },
  refuse: { label: "Refusé", color: "bg-red-500/20 text-red-500", icon: XCircle },
};

export function DemandesManager({ locationId }: DemandesManagerProps) {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("en_attente");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [accessRequestDialogOpen, setAccessRequestDialogOpen] = useState(false);
  const { toast } = useToast();
  const submissionWindow = useSubmissionWindow(locationId);

  useEffect(() => {
    loadDemandes();
  }, [locationId]);

  const loadDemandes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("requests")
        .select(`
          *,
          stock_items(type, sous_type, categorie)
        `)
        .eq("location_id", locationId)
        .order("date_demande", { ascending: false });

      if (error) throw error;
      setDemandes(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les demandes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredDemandes = demandes.filter((d) => {
    const matchesSearch = 
      d.stock_items?.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.stock_items?.sous_type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === "all" || d.statut === activeTab;
    return matchesSearch && matchesTab;
  });

  const stats = {
    en_attente: demandes.filter((d) => d.statut === "en_attente").length,
    approuve: demandes.filter((d) => d.statut === "approuve").length,
    traite: demandes.filter((d) => d.statut === "traite").length,
    refuse: demandes.filter((d) => d.statut === "refuse").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Submission Window Banner */}
      <SubmissionWindowBanner locationId={locationId} />

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="glass border-amber-500/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-500">{stats.en_attente}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-blue-500/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <CheckCircle2 className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-500">{stats.approuve}</p>
              <p className="text-xs text-muted-foreground">Approuvées</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-green-500/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/10">
              <Package className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">{stats.traite}</p>
              <p className="text-xs text-muted-foreground">Traitées</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-red-500/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/10">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{stats.refuse}</p>
              <p className="text-xs text-muted-foreground">Refusées</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un article..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 glass border-border/50"
          />
        </div>
        <Button 
          onClick={() => setCreateDialogOpen(true)}
          className={`gap-2 ${submissionWindow.isOpen ? 'bg-purple-600 hover:bg-purple-700' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
          disabled={!submissionWindow.isOpen}
          title={!submissionWindow.isOpen ? "Fenêtre de soumission fermée" : undefined}
        >
          {submissionWindow.isOpen ? (
            <>
              <Plus className="h-4 w-4" />
              Nouvelle demande
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Fenêtre fermée
            </>
          )}
        </Button>
        {!submissionWindow.isOpen && !submissionWindow.hasExceptionalAccess && (
          <Button 
            onClick={() => setAccessRequestDialogOpen(true)}
            variant="outline"
            className="gap-2 border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
          >
            <ShieldAlert className="h-4 w-4" />
            Accès urgence
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="glass border border-border/50">
          <TabsTrigger value="en_attente" className="gap-2 data-[state=active]:text-amber-500">
            <Clock className="h-4 w-4" />
            En attente ({stats.en_attente})
          </TabsTrigger>
          <TabsTrigger value="approuve" className="gap-2 data-[state=active]:text-blue-500">
            <CheckCircle2 className="h-4 w-4" />
            Approuvées ({stats.approuve})
          </TabsTrigger>
          <TabsTrigger value="traite" className="gap-2 data-[state=active]:text-green-500">
            <Package className="h-4 w-4" />
            Traitées ({stats.traite})
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            Toutes
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredDemandes.length === 0 ? (
            <Card className="glass border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Aucune demande trouvée</p>
                {activeTab === "en_attente" && submissionWindow.isOpen && (
                  <Button 
                    variant="outline" 
                    className="mt-4 gap-2"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Créer votre première demande
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredDemandes.map((demande, index) => {
                  const statusConfig = STATUS_CONFIG[demande.statut];
                  const StatusIcon = statusConfig?.icon || Clock;
                  
                  return (
                    <motion.div
                      key={demande.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="glass border-border/50 hover:border-purple-500/30 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-xl ${
                                demande.stock_items?.categorie === "GEAR" 
                                  ? "bg-cyan-500/10" 
                                  : "bg-amber-500/10"
                              }`}>
                                <Package className={`h-5 w-5 ${
                                  demande.stock_items?.categorie === "GEAR" 
                                    ? "text-cyan-500" 
                                    : "text-amber-500"
                                }`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{demande.stock_items?.type}</span>
                                  {demande.stock_items?.sous_type && (
                                    <span className="text-muted-foreground">
                                      - {demande.stock_items.sous_type}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                  <span>Quantité: <strong>{demande.quantite_demandee}</strong></span>
                                  <span>•</span>
                                  <span>
                                    {format(new Date(demande.date_demande), "dd MMM yyyy", { locale: fr })}
                                  </span>
                                </div>
                                {demande.notes && (
                                  <p className="text-sm text-muted-foreground mt-1 italic">
                                    "{demande.notes}"
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge className={`${statusConfig?.color} border-0 gap-1`}>
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig?.label}
                              </Badge>
                              {demande.date_traitement && (
                                <span className="text-xs text-muted-foreground">
                                  Traité le {format(new Date(demande.date_traitement), "dd/MM/yyyy", { locale: fr })}
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card className="glass border-purple-500/20">
        <CardContent className="p-4 flex items-start gap-4">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Send className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h4 className="font-medium text-purple-500">Comment ça marche ?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Vos demandes sont envoyées au Stock Central. L'administrateur central les examine 
              et les inclut dans ses commandes fournisseurs (Procurement). Une fois les articles reçus, 
              ils seront redistribués à votre camp.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreateDemandeDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        locationId={locationId}
        onSuccess={() => {
          loadDemandes();
          setCreateDialogOpen(false);
          toast({
            title: "Demande créée",
            description: "Votre demande a été envoyée au Stock Central",
          });
        }}
      />

      {/* Request Exceptional Access Dialog */}
      <RequestExceptionalAccessDialog
        open={accessRequestDialogOpen}
        onOpenChange={setAccessRequestDialogOpen}
        locationId={locationId}
      />
    </div>
  );
}
