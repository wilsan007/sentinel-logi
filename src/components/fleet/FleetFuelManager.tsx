import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Fuel, Loader2, Trash2, AlertTriangle, Calendar, MapPin, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FuelFormDialog } from "./FuelFormDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function FleetFuelManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: fuelLogs, isLoading } = useQuery({
    queryKey: ["vehicle-fuel-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_fuel_logs")
        .select(`
          *,
          vehicle:vehicles(immatriculation, marque, modele),
          conducteur:personnel(nom, prenom),
          location:locations(nom, code)
        `)
        .order("date_plein", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicle_fuel_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-fuel-logs"] });
      toast({ title: "Plein supprimé" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const validateMutation = useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: "APPROUVE" | "REFUSE" }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("vehicle_fuel_logs")
        .update({ 
          statut_validation: statut,
          valide_par: userData.user?.id,
          date_validation: new Date().toISOString()
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-fuel-logs"] });
      toast({ 
        title: variables.statut === "APPROUVE" ? "Demande approuvée" : "Demande refusée" 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  // Filtrer par type/statut
  const getFilteredLogs = () => {
    let filtered = fuelLogs || [];
    
    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter((f: any) =>
        f.vehicle?.immatriculation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.location?.nom?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par onglet
    switch (activeTab) {
      case "alertes":
        return filtered.filter((f: any) => f.alerte_km === true);
      case "exceptionnels":
        return filtered.filter((f: any) => f.type_ravitaillement === "EXCEPTIONNEL");
      case "en_attente":
        return filtered.filter((f: any) => f.statut_validation === "EN_ATTENTE");
      default:
        return filtered;
    }
  };

  const filteredLogs = getFilteredLogs();

  // Statistiques
  const totalLitres = fuelLogs?.reduce((sum, f) => sum + Number(f.litres), 0) || 0;
  const totalCout = fuelLogs?.reduce((sum, f) => sum + Number(f.cout_total), 0) || 0;
  const alertesCount = fuelLogs?.filter((f: any) => f.alerte_km === true).length || 0;
  const enAttenteCount = fuelLogs?.filter((f: any) => f.statut_validation === "EN_ATTENTE").length || 0;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "KILOMETRIQUE":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">KM</Badge>;
      case "MENSUEL":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30"><Calendar className="h-3 w-3 mr-1" />Mensuel</Badge>;
      case "EXCEPTIONNEL":
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30"><MapPin className="h-3 w-3 mr-1" />Mission</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case "APPROUVE":
        return <Badge className="bg-green-500">Approuvé</Badge>;
      case "REFUSE":
        return <Badge variant="destructive">Refusé</Badge>;
      case "EN_ATTENTE":
        return <Badge variant="secondary">En attente</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="glass border-green-500/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total pleins</p>
            <p className="text-2xl font-bold text-green-500">{fuelLogs?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="glass border-green-500/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Litres consommés</p>
            <p className="text-2xl font-bold text-green-500">{totalLitres.toLocaleString()} L</p>
          </CardContent>
        </Card>
        <Card className="glass border-green-500/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Coût total</p>
            <p className="text-2xl font-bold text-green-500">{totalCout.toLocaleString()} FDJ</p>
          </CardContent>
        </Card>
        <Card className={`glass ${alertesCount > 0 ? "border-destructive/50" : "border-green-500/30"}`}>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Alertes KM</p>
            <p className={`text-2xl font-bold ${alertesCount > 0 ? "text-destructive" : "text-green-500"}`}>
              {alertesCount}
            </p>
          </CardContent>
        </Card>
        <Card className={`glass ${enAttenteCount > 0 ? "border-orange-500/50" : "border-green-500/30"}`}>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">En attente</p>
            <p className={`text-2xl font-bold ${enAttenteCount > 0 ? "text-orange-500" : "text-green-500"}`}>
              {enAttenteCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass border-green-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-green-500">
              <Fuel className="h-5 w-5" />
              Ravitaillements ({fuelLogs?.length || 0})
            </CardTitle>
            <Button onClick={() => setShowDialog(true)} className="gap-2 bg-green-500 hover:bg-green-600">
              <Plus className="h-4 w-4" />
              Nouveau ravitaillement
            </Button>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList>
              <TabsTrigger value="all">Tous</TabsTrigger>
              <TabsTrigger value="alertes" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Alertes {alertesCount > 0 && <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 justify-center">{alertesCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="exceptionnels">Exceptionnels</TabsTrigger>
              <TabsTrigger value="en_attente" className="gap-1">
                En attente {enAttenteCount > 0 && <Badge className="ml-1 h-5 w-5 p-0 justify-center bg-orange-500">{enAttenteCount}</Badge>}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs && filteredLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Véhicule</TableHead>
                    <TableHead>Litres</TableHead>
                    <TableHead>Coût</TableHead>
                    <TableHead>KM</TableHead>
                    <TableHead>Parcourus</TableHead>
                    <TableHead>Centre</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((f: any) => (
                    <TableRow key={f.id} className={f.alerte_km ? "bg-destructive/5" : ""}>
                      <TableCell>{getTypeBadge(f.type_ravitaillement || "KILOMETRIQUE")}</TableCell>
                      <TableCell>{format(new Date(f.date_plein), "dd/MM/yyyy HH:mm", { locale: fr })}</TableCell>
                      <TableCell className="font-mono">{f.vehicle?.immatriculation}</TableCell>
                      <TableCell>{Number(f.litres).toFixed(1)} L</TableCell>
                      <TableCell className="font-medium">{Number(f.cout_total).toLocaleString()} FDJ</TableCell>
                      <TableCell>{f.kilometrage?.toLocaleString()} km</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {f.alerte_km && <AlertTriangle className="h-4 w-4 text-destructive" />}
                          <span className={f.alerte_km ? "text-destructive font-medium" : ""}>
                            {f.km_parcourus ? `+${f.km_parcourus}` : "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{f.location?.nom || "-"}</TableCell>
                      <TableCell>
                        {f.type_ravitaillement === "EXCEPTIONNEL" 
                          ? getStatutBadge(f.statut_validation)
                          : null
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {f.statut_validation === "EN_ATTENTE" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => validateMutation.mutate({ id: f.id, statut: "APPROUVE" })}
                                className="text-green-500 hover:text-green-600"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => validateMutation.mutate({ id: f.id, statut: "REFUSE" })}
                                className="text-destructive hover:text-destructive/80"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(f.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Fuel className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun ravitaillement trouvé</p>
            </div>
          )}
        </CardContent>
      </Card>

      <FuelFormDialog open={showDialog} onOpenChange={setShowDialog} />
    </div>
  );
}
