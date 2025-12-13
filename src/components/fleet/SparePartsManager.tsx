import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

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
  const [editingPart, setEditingPart] = useState<any>(null);
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
  });

  const { data: spareParts, isLoading } = useQuery({
    queryKey: ["spare-parts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spare_parts")
        .select("*")
        .order("categorie, nom");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingPart) {
        const { error } = await supabase
          .from("spare_parts")
          .update(formData)
          .eq("id", editingPart.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("spare_parts").insert(formData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spare-parts"] });
      toast.success(editingPart ? "Pièce mise à jour" : "Pièce ajoutée");
      closeDialog();
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

  const openDialog = (part?: any) => {
    if (part) {
      setEditingPart(part);
      setFormData({
        reference: part.reference,
        nom: part.nom,
        categorie: part.categorie,
        quantite: part.quantite,
        seuil_alerte: part.seuil_alerte,
        prix_unitaire: part.prix_unitaire || 0,
        fournisseur: part.fournisseur || "",
        emplacement_stock: part.emplacement_stock || "",
        description: part.description || "",
      });
    } else {
      setEditingPart(null);
      setFormData({
        reference: "",
        nom: "",
        categorie: "",
        quantite: 0,
        seuil_alerte: 5,
        prix_unitaire: 0,
        fournisseur: "",
        emplacement_stock: "",
        description: "",
      });
    }
    setShowDialog(true);
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
    spareParts?.filter((p) => p.quantite <= p.seuil_alerte).length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <Card className="glass border-amber-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-amber-500">
            <Package className="h-5 w-5" />
            Pièces détachées ({spareParts?.length || 0})
            {lowStockCount > 0 && (
              <Badge className="bg-red-500/20 text-red-500 gap-1">
                <AlertTriangle className="h-3 w-3" />
                {lowStockCount} en alerte
              </Badge>
            )}
          </CardTitle>
          <Button
            onClick={() => openDialog()}
            className="gap-2 bg-amber-500 hover:bg-amber-600"
          >
            <Plus className="h-4 w-4" />
            Ajouter pièce
          </Button>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, référence ou catégorie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
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
                  <TableHead>Emplacement</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParts.map((part) => (
                  <TableRow key={part.id}>
                    <TableCell className="font-mono text-sm">
                      {part.reference}
                    </TableCell>
                    <TableCell className="font-medium">{part.nom}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{part.categorie}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() =>
                            adjustStockMutation.mutate({ id: part.id, delta: -1 })
                          }
                        >
                          -
                        </Button>
                        <Badge
                          className={
                            part.quantite <= 0
                              ? "bg-red-500/20 text-red-500"
                              : part.quantite <= part.seuil_alerte
                              ? "bg-orange-500/20 text-orange-500"
                              : "bg-green-500/20 text-green-500"
                          }
                        >
                          {part.quantite}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() =>
                            adjustStockMutation.mutate({ id: part.id, delta: 1 })
                          }
                        >
                          +
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {part.prix_unitaire?.toLocaleString()} FDJ
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {part.emplacement_stock || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDialog(part)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500"
                          onClick={() => deleteMutation.mutate(part.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune pièce trouvée</p>
          </div>
        )}
      </CardContent>

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
    </Card>
  );
}
