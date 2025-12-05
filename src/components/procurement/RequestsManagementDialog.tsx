import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { 
  Check, X, Edit2, Package, MapPin, Calendar, Filter, Search, 
  CheckCheck, XCircle, ChevronDown, ChevronRight, Building2,
  Shirt, UtensilsCrossed
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

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

interface GroupedRequests {
  [locationId: string]: {
    locationName: string;
    locationCode: string;
    categories: {
      GEAR: Request[];
      FOOD: Request[];
    };
    totalPending: number;
  };
}

interface RequestsManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestsUpdated: () => void;
}

export function RequestsManagementDialog({ open, onOpenChange, onRequestsUpdated }: RequestsManagementDialogProps) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("en_attente");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingRequest, setEditingRequest] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [expandedCamps, setExpandedCamps] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      loadRequests();
      // Auto-expand all camps on open
      setExpandedCamps(new Set());
      setExpandedCategories(new Set());
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
      
      // Auto-expand all camps with pending requests
      const campsWithPending = new Set<string>();
      data?.forEach(r => {
        if (r.statut === "en_attente") {
          campsWithPending.add(r.location_id);
        }
      });
      setExpandedCamps(campsWithPending);
    } catch (error) {
      console.error("Error loading requests:", error);
      toast.error("Erreur lors du chargement des demandes");
    } finally {
      setLoading(false);
    }
  };

  // Group requests by camp then by category
  const groupedRequests = useMemo(() => {
    const filtered = requests.filter(request => {
      const matchesStatus = filterStatus === "all" || request.statut === filterStatus;
      const matchesSearch = searchTerm === "" || 
        request.stock_item?.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.location?.nom.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });

    const grouped: GroupedRequests = {};

    filtered.forEach(request => {
      const locId = request.location_id;
      if (!grouped[locId]) {
        grouped[locId] = {
          locationName: request.location?.nom || "Camp inconnu",
          locationCode: request.location?.code || "",
          categories: { GEAR: [], FOOD: [] },
          totalPending: 0,
        };
      }

      const category = request.stock_item?.categorie as "GEAR" | "FOOD";
      if (category) {
        grouped[locId].categories[category].push(request);
      }

      if (request.statut === "en_attente") {
        grouped[locId].totalPending++;
      }
    });

    return grouped;
  }, [requests, filterStatus, searchTerm]);

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

  const handleBulkApproveCamp = async (locationId: string, category?: "GEAR" | "FOOD") => {
    const camp = groupedRequests[locationId];
    if (!camp) return;

    let pendingRequests: Request[] = [];
    if (category) {
      pendingRequests = camp.categories[category].filter(r => r.statut === "en_attente");
    } else {
      pendingRequests = [...camp.categories.GEAR, ...camp.categories.FOOD].filter(r => r.statut === "en_attente");
    }

    if (pendingRequests.length === 0) {
      toast.info("Aucune demande en attente");
      return;
    }

    setProcessing(`bulk-${locationId}`);
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
      toast.success(`${pendingRequests.length} demandes approuvées pour ${camp.locationName}`);
      loadRequests();
      onRequestsUpdated();
    } catch (error) {
      console.error("Error bulk approving:", error);
      toast.error("Erreur lors de l'approbation en masse");
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkRejectCamp = async (locationId: string, category?: "GEAR" | "FOOD") => {
    const camp = groupedRequests[locationId];
    if (!camp) return;

    let pendingRequests: Request[] = [];
    if (category) {
      pendingRequests = camp.categories[category].filter(r => r.statut === "en_attente");
    } else {
      pendingRequests = [...camp.categories.GEAR, ...camp.categories.FOOD].filter(r => r.statut === "en_attente");
    }

    if (pendingRequests.length === 0) {
      toast.info("Aucune demande en attente");
      return;
    }

    setProcessing(`bulk-${locationId}`);
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
      toast.success(`${pendingRequests.length} demandes refusées pour ${camp.locationName}`);
      loadRequests();
      onRequestsUpdated();
    } catch (error) {
      console.error("Error bulk rejecting:", error);
      toast.error("Erreur lors du refus en masse");
    } finally {
      setProcessing(null);
    }
  };

  const toggleCamp = (locationId: string) => {
    const newExpanded = new Set(expandedCamps);
    if (newExpanded.has(locationId)) {
      newExpanded.delete(locationId);
    } else {
      newExpanded.add(locationId);
    }
    setExpandedCamps(newExpanded);
  };

  const toggleCategory = (key: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedCategories(newExpanded);
  };

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case "en_attente":
        return <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">En attente</Badge>;
      case "approuve":
        return <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Approuvé</Badge>;
      case "refuse":
        return <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Refusé</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{statut}</Badge>;
    }
  };

  const pendingCount = requests.filter(r => r.statut === "en_attente").length;
  const approvedCount = requests.filter(r => r.statut === "approuve").length;
  const rejectedCount = requests.filter(r => r.statut === "refuse").length;
  const campsCount = Object.keys(groupedRequests).length;

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
        <div className="grid grid-cols-4 gap-3 mb-4">
          <Card className="glass border-purple-500/30">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-purple-400">{campsCount}</p>
              <p className="text-xs text-muted-foreground">Camps</p>
            </CardContent>
          </Card>
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
              placeholder="Rechercher camp ou article..."
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
        </div>

        {/* Grouped Requests List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : Object.keys(groupedRequests).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Aucune demande trouvée</p>
            </div>
          ) : (
            Object.entries(groupedRequests).map(([locationId, camp]) => {
              const isCampExpanded = expandedCamps.has(locationId);
              const gearPending = camp.categories.GEAR.filter(r => r.statut === "en_attente").length;
              const foodPending = camp.categories.FOOD.filter(r => r.statut === "en_attente").length;

              return (
                <Card key={locationId} className="glass border-border/50 overflow-hidden">
                  {/* Camp Header */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => toggleCamp(locationId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isCampExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <Building2 className="h-5 w-5 text-purple-500" />
                        <div>
                          <h3 className="font-semibold">{camp.locationName}</h3>
                          <p className="text-xs text-muted-foreground">{camp.locationCode}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {camp.totalPending > 0 && (
                          <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                            {camp.totalPending} en attente
                          </Badge>
                        )}
                        {filterStatus === "en_attente" && camp.totalPending > 0 && (
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-emerald-400 hover:bg-emerald-500/20"
                              onClick={() => handleBulkApproveCamp(locationId)}
                              disabled={processing === `bulk-${locationId}`}
                            >
                              <CheckCheck className="h-3 w-3 mr-1" />
                              Tout approuver
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-red-400 hover:bg-red-500/20"
                              onClick={() => handleBulkRejectCamp(locationId)}
                              disabled={processing === `bulk-${locationId}`}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Tout refuser
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Camp Content */}
                  <AnimatePresence>
                    {isCampExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-border/30"
                      >
                        <div className="p-4 space-y-4">
                          {/* GEAR Category */}
                          {camp.categories.GEAR.length > 0 && (
                            <CategorySection
                              category="GEAR"
                              categoryKey={`${locationId}-GEAR`}
                              requests={camp.categories.GEAR}
                              pendingCount={gearPending}
                              isExpanded={expandedCategories.has(`${locationId}-GEAR`)}
                              onToggle={() => toggleCategory(`${locationId}-GEAR`)}
                              onApprove={handleApprove}
                              onReject={handleReject}
                              onEdit={handleEdit}
                              onSaveEdit={handleSaveEdit}
                              onBulkApprove={() => handleBulkApproveCamp(locationId, "GEAR")}
                              onBulkReject={() => handleBulkRejectCamp(locationId, "GEAR")}
                              editingRequest={editingRequest}
                              editQuantity={editQuantity}
                              editNotes={editNotes}
                              setEditQuantity={setEditQuantity}
                              setEditNotes={setEditNotes}
                              setEditingRequest={setEditingRequest}
                              processing={processing}
                              getStatusBadge={getStatusBadge}
                              filterStatus={filterStatus}
                            />
                          )}

                          {/* FOOD Category */}
                          {camp.categories.FOOD.length > 0 && (
                            <CategorySection
                              category="FOOD"
                              categoryKey={`${locationId}-FOOD`}
                              requests={camp.categories.FOOD}
                              pendingCount={foodPending}
                              isExpanded={expandedCategories.has(`${locationId}-FOOD`)}
                              onToggle={() => toggleCategory(`${locationId}-FOOD`)}
                              onApprove={handleApprove}
                              onReject={handleReject}
                              onEdit={handleEdit}
                              onSaveEdit={handleSaveEdit}
                              onBulkApprove={() => handleBulkApproveCamp(locationId, "FOOD")}
                              onBulkReject={() => handleBulkRejectCamp(locationId, "FOOD")}
                              editingRequest={editingRequest}
                              editQuantity={editQuantity}
                              editNotes={editNotes}
                              setEditQuantity={setEditQuantity}
                              setEditNotes={setEditNotes}
                              setEditingRequest={setEditingRequest}
                              processing={processing}
                              getStatusBadge={getStatusBadge}
                              filterStatus={filterStatus}
                            />
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Category Section Component
interface CategorySectionProps {
  category: "GEAR" | "FOOD";
  categoryKey: string;
  requests: Request[];
  pendingCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (request: Request) => void;
  onSaveEdit: (id: string) => void;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  editingRequest: string | null;
  editQuantity: number;
  editNotes: string;
  setEditQuantity: (v: number) => void;
  setEditNotes: (v: string) => void;
  setEditingRequest: (v: string | null) => void;
  processing: string | null;
  getStatusBadge: (statut: string) => JSX.Element;
  filterStatus: string;
}

function CategorySection({
  category,
  categoryKey,
  requests,
  pendingCount,
  isExpanded,
  onToggle,
  onApprove,
  onReject,
  onEdit,
  onSaveEdit,
  onBulkApprove,
  onBulkReject,
  editingRequest,
  editQuantity,
  editNotes,
  setEditQuantity,
  setEditNotes,
  setEditingRequest,
  processing,
  getStatusBadge,
  filterStatus,
}: CategorySectionProps) {
  const isGear = category === "GEAR";
  const Icon = isGear ? Shirt : UtensilsCrossed;
  const colorClass = isGear ? "cyan" : "amber";

  return (
    <div className={`border rounded-lg border-${colorClass}-500/30 overflow-hidden`}>
      <div 
        className={`p-3 cursor-pointer hover:bg-${colorClass}-500/10 transition-colors flex items-center justify-between`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className={`h-4 w-4 text-${colorClass}-500`} />
          ) : (
            <ChevronRight className={`h-4 w-4 text-${colorClass}-500`} />
          )}
          <Icon className={`h-4 w-4 text-${colorClass}-500`} />
          <span className="font-medium">{isGear ? "Habillement" : "Alimentaire"}</span>
          <Badge variant="outline" className="text-xs">
            {requests.length} article{requests.length > 1 ? "s" : ""}
          </Badge>
        </div>
        {filterStatus === "en_attente" && pendingCount > 0 && (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs text-emerald-400 hover:bg-emerald-500/20"
              onClick={onBulkApprove}
            >
              <Check className="h-3 w-3 mr-1" />
              Approuver ({pendingCount})
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/30"
          >
            <div className="p-3 space-y-2">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  {editingRequest === request.id ? (
                    // Edit Mode
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{request.stock_item?.type}</span>
                        {request.stock_item?.sous_type && (
                          <span className="text-xs text-muted-foreground">- {request.stock_item.sous_type}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Quantité</label>
                          <Input
                            type="number"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
                            min={1}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Notes</label>
                          <Input
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="h-8"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditingRequest(null)}>
                          Annuler
                        </Button>
                        <Button
                          size="sm"
                          className="h-7"
                          onClick={() => onSaveEdit(request.id)}
                          disabled={processing === request.id}
                        >
                          Enregistrer
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{request.stock_item?.type}</span>
                          {request.stock_item?.sous_type && (
                            <span className="text-xs text-muted-foreground">- {request.stock_item.sous_type}</span>
                          )}
                          {getStatusBadge(request.statut)}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>Qté: <strong className="text-foreground">{request.quantite_demandee}</strong></span>
                          <span>{format(new Date(request.date_demande), "dd MMM yyyy", { locale: fr })}</span>
                          {request.notes && <span className="italic">"{request.notes}"</span>}
                        </div>
                      </div>
                      
                      {request.statut === "en_attente" && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => onEdit(request)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-emerald-400 hover:bg-emerald-500/20"
                            onClick={() => onApprove(request.id)}
                            disabled={processing === request.id}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-400 hover:bg-red-500/20"
                            onClick={() => onReject(request.id)}
                            disabled={processing === request.id}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
