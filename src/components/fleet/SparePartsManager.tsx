import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  AlertTriangle,
  TrendingDown,
  ClipboardList,
} from "lucide-react";
import { StockForecastAlert } from "./StockForecastAlert";
import { SparePartsRequestDialog } from "./SparePartsRequestDialog";

const CATEGORIES = [
  "Filtres",
  "Huiles",
  "Freinage",
  "Électrique",
  "Allumage",
  "Courroies",
  "Suspension",
  "Pneumatiques",
  "Transmission",
  "Refroidissement",
  "Carrosserie",
  "Autre",
];

export function SparePartsManager() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showRecycleDialog, setShowRecycleDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [editingPart, setEditingPart] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"inventory" | "forecast">("inventory");
  const [formData, setFormData] = useState({
    reference: "",
    nom: "",
    categorie: "",
    quantite: 0,
    seuil_alerte: 5,
    prix_unitaire: 0,
    fournisseur: "",
    emplacement_stock: "",
    description: "",
    is_recycled: false,
    recovered_from_vehicle_id: "",
    condition_note: "",
  });

  const { data: spareParts, isLoading } = useQuery({
    queryKey: ["spare-parts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spare_parts")
        .select("*, recovered_vehicle:vehicles!spare_parts_recovered_from_vehicle_id_fkey(immatriculation)")
        .order("categorie, nom");
      if (error) throw error;
      return data;
    },
  });

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles-for-parts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, immatriculation, marque, modele")
        .order("immatriculation");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        reference: formData.reference,
        nom: formData.nom,
        categorie: formData.categorie,
        quantite: formData.quantite,
        seuil_alerte: formData.seuil_alerte,
        prix_unitaire: formData.prix_unitaire || null,
        fournisseur: formData.fournisseur || null,
        emplacement_stock: formData.emplacement_stock || null,
        description: formData.description || null,
        is_recycled: formData.is_recycled,
        recovered_from_vehicle_id: formData.recovered_from_vehicle_id || null,
        recovered_date: formData.is_recycled ? new Date().toISOString().split('T')[0] : null,
        condition_note: formData.condition_note || null,
      };
      
      if (editingPart) {
        const { error } = await supabase
          .from("spare_parts")
          .update(payload)
          .eq("id", editingPart.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("spare_parts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spare-parts"] });
      toast.success(editingPart ? "Pièce mise à jour" : "Pièce ajoutée");
      closeDialog();
      setShowRecycleDialog(false);
    },
    onError: (error: any) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("spare_parts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spare-parts"] });
      toast.success("Pièce supprimée");
    },
    onError: (error: any) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const adjustStockMutation = useMutation({
    mutationFn: async ({ id, delta }: { id: string; delta: number }) => {
      const part = spareParts?.find((p) => p.id === id);
      if (!part) throw new Error("Pièce non trouvée");

      const newQty = Math.max(0, part.quantite + delta);
      const { error } = await supabase
        .from("spare_parts")
        .update({ quantite: newQty })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spare-parts"] });
    },
    onError: (error: any) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const openDialog = (part?: any, isRecycle = false) => {
    if (part) {
      setEditingPart(part);
      setFormData({
        reference: part.reference,
        nom: part.nom,
        categorie: part.categorie,
        quantite: part.quantite,
        seuil_alerte: part.seuil_alerte || 5,
        prix_unitaire: part.prix_unitaire || 0,
        fournisseur: part.fournisseur || "",
        emplacement_stock: part.emplacement_stock || "",
        description: part.description || "",
        is_recycled: part.is_recycled || false,
        recovered_from_vehicle_id: part.recovered_from_vehicle_id || "",
        condition_note: part.condition_note || "",
      });
    } else {
      setEditingPart(null);
      setFormData({
        reference: "",
        nom: "",
        categorie: "",
        quantite: isRecycle ? 1 : 0,
        seuil_alerte: 5,
        prix_unitaire: 0,
        fournisseur: "",
        emplacement_stock: "",
        description: "",
        is_recycled: isRecycle,
        recovered_from_vehicle_id: "",
        condition_note: "",
      });
    }
    if (isRecycle) {
      setShowRecycleDialog(true);
    } else {
      setShowDialog(true);
    }
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingPart(null);
  };

  const filteredParts = spareParts?.filter(
    (part) =>
      part.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.categorie.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount =
    spareParts?.filter((p) => p.quantite <= (p.seuil_alerte || 5)).length || 0;
  
  const recycledCount = spareParts?.filter((p) => p.is_recycled).length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const handleRequestFromForecast = (partName: string, category: string) => {
    setShowRequestDialog(true);
  };

  return (
    <div className="space-y-4">
      <Card className="glass border-amber-500/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-amber-500">
              <Package className="h-5 w-5" />
              Pièces détachées ({spareParts?.length || 0})
              {lowStockCount > 0 && (
                <Badge className="bg-red-500/20 text-red-500 gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {lowStockCount} en alerte
                </Badge>
              )}
              {recycledCount > 0 && (
                <Badge className="bg-green-500/20 text-green-500 gap-1">
                  ♻️ {recycledCount} recyclées
                </Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowRequestDialog(true)}
                variant="outline"
                className="gap-2 border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
              >
                <ClipboardList className="h-4 w-4" />
                Demander pièce
              </Button>
              <Button
                onClick={() => openDialog(undefined, true)}
                variant="outline"
                className="gap-2 border-green-500/50 text-green-500 hover:bg-green-500/10"
              >
                ♻️ Récupérer pièce
              </Button>
              <Button
                onClick={() => openDialog()}
                className="gap-2 bg-amber-500 hover:bg-amber-600"
              >
                <Plus className="h-4 w-4" />
                Ajouter pièce
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="w-full justify-start mb-4">
              <TabsTrigger value="inventory" className="gap-2">
                <Package className="h-4 w-4" />
                Inventaire
              </TabsTrigger>
              <TabsTrigger value="forecast" className="gap-2">
                <TrendingDown className="h-4 w-4" />
                Prévisions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="inventory">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, référence ou catégorie..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {filteredParts && filteredParts.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Référence</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead className="text-center">Stock</TableHead>
                        <TableHead className="text-right">Prix unit.</TableHead>
                        <TableHead>Origine</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredParts.map((part: any) => (
                        <TableRow key={part.id} className={part.is_recycled ? "bg-green-500/5" : ""}>
                          <TableCell className="font-mono text-sm">{part.reference}</TableCell>
                          <TableCell className="font-medium">{part.nom}</TableCell>
                          <TableCell><Badge variant="outline">{part.categorie}</Badge></TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => adjustStockMutation.mutate({ id: part.id, delta: -1 })}>-</Button>
                              <Badge className={part.quantite <= 0 ? "bg-red-500/20 text-red-500" : part.quantite <= part.seuil_alerte ? "bg-orange-500/20 text-orange-500" : "bg-green-500/20 text-green-500"}>{part.quantite}</Badge>
                              <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => adjustStockMutation.mutate({ id: part.id, delta: 1 })}>+</Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{part.prix_unitaire ? `${part.prix_unitaire.toLocaleString()} FDJ` : "-"}</TableCell>
                          <TableCell className="text-sm">
                            {part.is_recycled ? (
                              <div className="flex items-center gap-1">
                                <Badge className="bg-green-500/20 text-green-500 text-xs">♻️ Recyclée</Badge>
                                {part.recovered_vehicle?.immatriculation && <span className="text-xs text-muted-foreground">de {part.recovered_vehicle.immatriculation}</span>}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">{part.emplacement_stock || "Neuve"}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openDialog(part)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteMutation.mutate(part.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune pièce trouvée</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="forecast">
              <StockForecastAlert daysAhead={30} onRequestPart={handleRequestFromForecast} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <SparePartsRequestDialog open={showRequestDialog} onOpenChange={setShowRequestDialog} />

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPart ? "Modifier la pièce" : "Ajouter une pièce"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Référence *</Label>
                <Input
                  value={formData.reference}
                  onChange={(e) =>
                    setFormData({ ...formData, reference: e.target.value })
                  }
                  placeholder="REF-001"
                />
              </div>
              <div>
                <Label>Catégorie *</Label>
                <Select
                  value={formData.categorie}
                  onValueChange={(val) =>
                    setFormData({ ...formData, categorie: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Nom *</Label>
              <Input
                value={formData.nom}
                onChange={(e) =>
                  setFormData({ ...formData, nom: e.target.value })
                }
                placeholder="Filtre à huile"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Quantité</Label>
                <Input
                  type="number"
                  value={formData.quantite}
                  onChange={(e) =>
                    setFormData({ ...formData, quantite: Number(e.target.value) })
                  }
                  min={0}
                />
              </div>
              <div>
                <Label>Seuil alerte</Label>
                <Input
                  type="number"
                  value={formData.seuil_alerte}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      seuil_alerte: Number(e.target.value),
                    })
                  }
                  min={0}
                />
              </div>
              <div>
                <Label>Prix unitaire (FDJ)</Label>
                <Input
                  type="number"
                  value={formData.prix_unitaire}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      prix_unitaire: Number(e.target.value),
                    })
                  }
                  min={0}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fournisseur</Label>
                <Input
                  value={formData.fournisseur}
                  onChange={(e) =>
                    setFormData({ ...formData, fournisseur: e.target.value })
                  }
                  placeholder="Nom du fournisseur"
                />
              </div>
              <div>
                <Label>Emplacement stock</Label>
                <Input
                  value={formData.emplacement_stock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emplacement_stock: e.target.value,
                    })
                  }
                  placeholder="Étagère A3"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeDialog}>
                Annuler
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={
                  saveMutation.isPending ||
                  !formData.reference ||
                  !formData.nom ||
                  !formData.categorie
                }
                className="bg-amber-500 hover:bg-amber-600"
              >
                {saveMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingPart ? "Mettre à jour" : "Ajouter"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Récupération de pièce */}
      <Dialog open={showRecycleDialog} onOpenChange={setShowRecycleDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              ♻️ Récupérer une pièce
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
              Enregistrez une pièce récupérée d'un véhicule pour réutilisation sur d'autres véhicules.
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Référence *</Label>
                <Input
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="REF-REC-001"
                />
              </div>
              <div>
                <Label>Catégorie *</Label>
                <Select
                  value={formData.categorie}
                  onValueChange={(val) => setFormData({ ...formData, categorie: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Nom de la pièce *</Label>
              <Input
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Alternateur"
              />
            </div>
            <div>
              <Label>Véhicule d'origine</Label>
              <Select
                value={formData.recovered_from_vehicle_id}
                onValueChange={(val) => setFormData({ ...formData, recovered_from_vehicle_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le véhicule" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles?.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.immatriculation} - {v.marque} {v.modele}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantité</Label>
                <Input
                  type="number"
                  value={formData.quantite}
                  onChange={(e) => setFormData({ ...formData, quantite: Number(e.target.value) })}
                  min={1}
                />
              </div>
              <div>
                <Label>Emplacement</Label>
                <Input
                  value={formData.emplacement_stock}
                  onChange={(e) => setFormData({ ...formData, emplacement_stock: e.target.value })}
                  placeholder="Étagère B2"
                />
              </div>
            </div>
            <div>
              <Label>État / Notes sur la condition</Label>
              <Input
                value={formData.condition_note}
                onChange={(e) => setFormData({ ...formData, condition_note: e.target.value })}
                placeholder="Bon état, testé fonctionnel"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRecycleDialog(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !formData.reference || !formData.nom || !formData.categorie}
                className="bg-green-500 hover:bg-green-600"
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                ♻️ Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
