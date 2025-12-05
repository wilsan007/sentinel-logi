import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check, X, Edit2, Eye, Package, MapPin, Calendar, User, Filter, Search, CheckCheck, XCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Request {
  id: string;
  location_id: string;
  stock_item_id: string;
  quantite_demandee: number;
  statut: string;
  demande_par: string;
  date_demande: string;
  notes: string | null;
  location?: { nom: string; code: string } | null;
  stock_item?: { type: string; sous_type: string | null; categorie: string } | null;
}

interface RequestsManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestsUpdated: () => void;
}

export function RequestsManagementDialog({ open, onOpenChange, onRequestsUpdated }: RequestsManagementDialogProps) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingRequest, setEditingRequest] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>("");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadRequests();
    }
  }, [open]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("requests")
        .select(`
          *,
          location:locations(nom, code),
          stock_item:stock_items(type, sous_type, categorie)
        `)
        .order("date_demande", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error loading requests:", error);
      toast.error("Erreur lors du chargement des demandes");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("requests")
        .update({
          statut: "approuve",
          approuve_par: user?.id,
          date_traitement: new Date().toISOString()
        })
        .eq("id", requestId);

      if (error) throw error;
      toast.success("Demande approuvée");
      loadRequests();
      onRequestsUpdated();
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Erreur lors de l'approbation");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessing(requestId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("requests")
        .update({
          statut: "refuse",
          approuve_par: user?.id,
          date_traitement: new Date().toISOString()
        })
        .eq("id", requestId);

      if (error) throw error;
      toast.success("Demande refusée");
      loadRequests();
      onRequestsUpdated();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Erreur lors du refus");
    } finally {
      setProcessing(null);
    }
  };

  const handleEdit = (request: Request) => {
    setEditingRequest(request.id);
    setEditQuantity(request.quantite_demandee);
    setEditNotes(request.notes || "");
  };

  const handleSaveEdit = async (requestId: string) => {
    setProcessing(requestId);
    try {
      const { error } = await supabase
        .from("requests")
        .update({
          quantite_demandee: editQuantity,
          notes: editNotes || null
        })
        .eq("id", requestId);

      if (error) throw error;
      toast.success("Demande modifiée");
      setEditingRequest(null);
      loadRequests();
      onRequestsUpdated();
    } catch (error) {
      console.error("Error updating request:", error);
      toast.error("Erreur lors de la modification");
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkApprove = async () => {
    const pendingRequests = filteredRequests.filter(r => r.statut === "en_attente");
    if (pendingRequests.length === 0) {
      toast.info("Aucune demande en attente à approuver");
      return;
    }

    setProcessing("bulk");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("requests")
        .update({
          statut: "approuve",
          approuve_par: user?.id,
          date_traitement: new Date().toISOString()
        })
        .in("id", pendingRequests.map(r => r.id));

      if (error) throw error;
      toast.success(`${pendingRequests.length} demandes approuvées`);
      loadRequests();
      onRequestsUpdated();
    } catch (error) {
      console.error("Error bulk approving:", error);
      toast.error("Erreur lors de l'approbation en masse");
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkReject = async () => {
    const pendingRequests = filteredRequests.filter(r => r.statut === "en_attente");
    if (pendingRequests.length === 0) {
      toast.info("Aucune demande en attente à refuser");
      return;
    }

    setProcessing("bulk");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("requests")
        .update({
          statut: "refuse",
          approuve_par: user?.id,
          date_traitement: new Date().toISOString()
        })
        .in("id", pendingRequests.map(r => r.id));

      if (error) throw error;
      toast.success(`${pendingRequests.length} demandes refusées`);
      loadRequests();
      onRequestsUpdated();
    } catch (error) {
      console.error("Error bulk rejecting:", error);
      toast.error("Erreur lors du refus en masse");
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case "en_attente":
        return <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">En attente</Badge>;
      case "approuve":
        return <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Approuvé</Badge>;
      case "refuse":
        return <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">Refusé</Badge>;
      default:
        return <Badge variant="outline">{statut}</Badge>;
    }
  };

  const getCategoryBadge = (categorie: string) => {
    if (categorie === "GEAR") {
      return <Badge variant="outline" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Habillement</Badge>;
    }
    return <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">Alimentaire</Badge>;
  };

  const filteredRequests = requests.filter(request => {
    const matchesStatus = filterStatus === "all" || request.statut === filterStatus;
    const matchesCategory = filterCategory === "all" || request.stock_item?.categorie === filterCategory;
    const matchesSearch = searchTerm === "" || 
      request.stock_item?.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.location?.nom.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesCategory && matchesSearch;
  });

  const pendingCount = requests.filter(r => r.statut === "en_attente").length;
  const approvedCount = requests.filter(r => r.statut === "approuve").length;
  const rejectedCount = requests.filter(r => r.statut === "refuse").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="h-6 w-6 text-purple-500" />
            Gestion des Demandes des Camps
          </DialogTitle>
        </DialogHeader>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="glass border-amber-500/30">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </CardContent>
          </Card>
          <Card className="glass border-emerald-500/30">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-emerald-400">{approvedCount}</p>
              <p className="text-xs text-muted-foreground">Approuvées</p>
            </CardContent>
          </Card>
          <Card className="glass border-red-500/30">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-400">{rejectedCount}</p>
              <p className="text-xs text-muted-foreground">Refusées</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
              <SelectItem value="approuve">Approuvé</SelectItem>
              <SelectItem value="refuse">Refusé</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              <SelectItem value="GEAR">Habillement</SelectItem>
              <SelectItem value="FOOD">Alimentaire</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions */}
        {pendingCount > 0 && filterStatus !== "approuve" && filterStatus !== "refuse" && (
          <div className="flex gap-2 mb-4">
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20"
              onClick={handleBulkApprove}
              disabled={processing === "bulk"}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Approuver tout ({filteredRequests.filter(r => r.statut === "en_attente").length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-500/50 text-red-400 hover:bg-red-500/20"
              onClick={handleBulkReject}
              disabled={processing === "bulk"}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Refuser tout
            </Button>
          </div>
        )}

        {/* Requests List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Aucune demande trouvée</p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <Card key={request.id} className="glass border-border/50 hover:border-purple-500/30 transition-colors">
                <CardContent className="p-4">
                  {editingRequest === request.id ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{request.stock_item?.type} {request.stock_item?.sous_type && `- ${request.stock_item.sous_type}`}</span>
                        {getCategoryBadge(request.stock_item?.categorie || "")}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Quantité</label>
                          <Input
                            type="number"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
                            min={1}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Notes</label>
                          <Textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            rows={1}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setEditingRequest(null)}>
                          Annuler
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(request.id)}
                          disabled={processing === request.id}
                        >
                          Enregistrer
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{request.stock_item?.type}</span>
                          {request.stock_item?.sous_type && (
                            <span className="text-muted-foreground">- {request.stock_item.sous_type}</span>
                          )}
                          {getCategoryBadge(request.stock_item?.categorie || "")}
                          {getStatusBadge(request.statut)}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {request.location?.nom}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            Qté: <span className="text-foreground font-medium">{request.quantite_demandee}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(request.date_demande), "dd MMM yyyy", { locale: fr })}
                          </span>
                        </div>
                        {request.notes && (
                          <p className="text-sm text-muted-foreground italic">"{request.notes}"</p>
                        )}
                      </div>
                      
                      {/* Actions */}
                      {request.statut === "en_attente" && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEdit(request)}
                            title="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20"
                            onClick={() => handleApprove(request.id)}
                            disabled={processing === request.id}
                            title="Approuver"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                            onClick={() => handleReject(request.id)}
                            disabled={processing === request.id}
                            title="Refuser"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
