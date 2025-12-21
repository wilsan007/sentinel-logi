import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Package,
  Search,
  Loader2,
  MoreVertical,
  CheckCircle,
  XCircle,
  ShoppingCart,
  Clock,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { SparePartsRequestDialog } from "./SparePartsRequestDialog";
import { SparePartsOrderWizard } from "./SparePartsOrderWizard";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  en_attente: { label: "En attente", color: "bg-yellow-500/20 text-yellow-500", icon: Clock },
  approuve: { label: "Approuvé", color: "bg-blue-500/20 text-blue-500", icon: CheckCircle },
  commande: { label: "Commandé", color: "bg-purple-500/20 text-purple-500", icon: ShoppingCart },
  recu: { label: "Reçu", color: "bg-green-500/20 text-green-500", icon: CheckCircle },
  refuse: { label: "Refusé", color: "bg-red-500/20 text-red-500", icon: XCircle },
};

const URGENCE_CONFIG: Record<string, { label: string; color: string }> = {
  BASSE: { label: "Basse", color: "bg-slate-500/20 text-slate-400" },
  NORMALE: { label: "Normale", color: "bg-blue-500/20 text-blue-400" },
  HAUTE: { label: "Haute", color: "bg-amber-500/20 text-amber-500" },
  CRITIQUE: { label: "Critique", color: "bg-red-500/20 text-red-500" },
};

export function SparePartsRequestsList() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showOrderWizard, setShowOrderWizard] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["spare-parts-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spare_parts_requests")
        .select(`
          *,
          vehicle:vehicles(immatriculation, marque, modele),
          spare_part:spare_parts(nom, reference)
        `)
        .order("date_demande", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
      const user = await supabase.auth.getUser();
      const { error } = await supabase
        .from("spare_parts_requests")
        .update({
          statut,
          date_traitement: new Date().toISOString(),
          approuve_par: user.data.user?.id,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spare-parts-requests"] });
      toast.success("Statut mis à jour");
    },
    onError: (error: any) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const filteredRequests = requests?.filter((req) => {
    const matchesSearch =
      req.part_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.part_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.categorie.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.vehicle?.immatriculation?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || req.statut === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = requests?.filter((r) => r.statut === "en_attente").length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="glass border-orange-500/20">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Package className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <CardTitle className="text-orange-500">Demandes de Pièces</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {pendingCount} demande{pendingCount > 1 ? "s" : ""} en attente
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowOrderWizard(true)}
                variant="outline"
                className="border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Commander
              </Button>
              <Button
                onClick={() => setShowRequestDialog(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle demande
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, référence, véhicule..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 glass border-border/50"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className={statusFilter === "all" ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                Tous
              </Button>
              <Button
                variant={statusFilter === "en_attente" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("en_attente")}
                className={statusFilter === "en_attente" ? "bg-yellow-500 hover:bg-yellow-600" : ""}
              >
                En attente ({pendingCount})
              </Button>
              <Button
                variant={statusFilter === "approuve" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("approuve")}
                className={statusFilter === "approuve" ? "bg-blue-500 hover:bg-blue-600" : ""}
              >
                Approuvés
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glass border-border/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Pièce</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-center">Qté</TableHead>
                  <TableHead>Urgence</TableHead>
                  <TableHead>Véhicule</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests?.map((request) => {
                  const statusConfig = STATUS_CONFIG[request.statut];
                  const urgenceConfig = URGENCE_CONFIG[request.urgence || "NORMALE"];
                  const StatusIcon = statusConfig?.icon || Clock;

                  return (
                    <TableRow key={request.id} className="border-border/50">
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.part_name}</p>
                          {request.part_reference && (
                            <p className="text-xs text-muted-foreground">
                              Réf: {request.part_reference}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{request.categorie}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {request.quantite_demandee}
                      </TableCell>
                      <TableCell>
                        <Badge className={urgenceConfig?.color}>
                          {request.urgence === "CRITIQUE" || request.urgence === "HAUTE" ? (
                            <AlertTriangle className="h-3 w-3 mr-1" />
                          ) : null}
                          {urgenceConfig?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {request.vehicle ? (
                          <span className="text-sm">
                            {request.vehicle.immatriculation}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(request.date_demande), "dd MMM yyyy", {
                          locale: fr,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig?.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {request.statut === "en_attente" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      id: request.id,
                                      statut: "approuve",
                                    })
                                  }
                                  className="text-blue-500"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approuver
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      id: request.id,
                                      statut: "refuse",
                                    })
                                  }
                                  className="text-red-500"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Refuser
                                </DropdownMenuItem>
                              </>
                            )}
                            {request.statut === "approuve" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: request.id,
                                    statut: "commande",
                                  })
                                }
                                className="text-purple-500"
                              >
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Marquer comme commandé
                              </DropdownMenuItem>
                            )}
                            {request.statut === "commande" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: request.id,
                                    statut: "recu",
                                  })
                                }
                                className="text-green-500"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Marquer comme reçu
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredRequests?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">Aucune demande trouvée</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-3">
        {filteredRequests?.map((request) => {
          const statusConfig = STATUS_CONFIG[request.statut];
          const urgenceConfig = URGENCE_CONFIG[request.urgence || "NORMALE"];

          return (
            <Card key={request.id} className="glass border-border/50">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-medium">{request.part_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {request.categorie} • Qté: {request.quantite_demandee}
                    </p>
                  </div>
                  <Badge className={statusConfig?.color}>{statusConfig?.label}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <Badge className={urgenceConfig?.color}>{urgenceConfig?.label}</Badge>
                  <span className="text-muted-foreground">
                    {format(new Date(request.date_demande), "dd/MM/yyyy", { locale: fr })}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <SparePartsRequestDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
      />

      <SparePartsOrderWizard
        open={showOrderWizard}
        onOpenChange={setShowOrderWizard}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["spare-parts-requests"] })}
      />
    </div>
  );
}
