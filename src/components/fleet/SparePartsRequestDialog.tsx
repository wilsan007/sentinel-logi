import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Package,
  AlertTriangle,
  Plus,
  Car,
  Wrench,
  Search,
  Check,
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

interface SparePartsRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId?: string;
  diagnosticId?: string;
  onSuccess?: () => void;
}

export function SparePartsRequestDialog({
  open,
  onOpenChange,
  vehicleId,
  diagnosticId,
  onSuccess,
}: SparePartsRequestDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"catalog" | "diagnostic" | "new">("catalog");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    spare_part_id: "",
    part_name: "",
    part_reference: "",
    categorie: "",
    quantite_demandee: 1,
    urgence: "NORMALE",
    motif: "",
    notes: "",
    compatible_brands: [] as string[],
    compatible_models: [] as string[],
  });

  // Load existing spare parts
  const { data: spareParts } = useQuery({
    queryKey: ["spare-parts-for-request"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spare_parts")
        .select("id, nom, reference, categorie, quantite, description")
        .order("categorie, nom");
      if (error) throw error;
      return data;
    },
  });

  // Load vehicles for brand/model selection
  const { data: vehicles } = useQuery({
    queryKey: ["vehicles-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, immatriculation, marque, modele")
        .order("marque, modele");
      if (error) throw error;
      return data;
    },
  });

  // Load vehicle info if provided
  const { data: vehicle } = useQuery({
    queryKey: ["vehicle-for-request", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return null;
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, immatriculation, marque, modele")
        .eq("id", vehicleId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!vehicleId,
  });

  // Load vehicles in repair/maintenance with pending parts needs
  const { data: vehiclesWithNeeds } = useQuery({
    queryKey: ["vehicles-with-parts-needs"],
    queryFn: async () => {
      // Get vehicles currently in repair or maintenance
      const { data: repairs, error: repairsError } = await supabase
        .from("vehicle_repairs")
        .select(`
          id,
          description,
          pieces_changees,
          diagnostic_id,
          statut,
          vehicle:vehicles(id, immatriculation, marque, modele),
          diagnostic:vehicle_diagnostics(id, diagnostic_resume, notes_mecanicien)
        `)
        .in("statut", ["EN_ATTENTE", "EN_COURS"]);
      
      if (repairsError) throw repairsError;
      
      // Get pending maintenance schedules
      const { data: maintenances, error: maintError } = await supabase
        .from("maintenance_schedules")
        .select(`
          id,
          type_entretien,
          description,
          pieces_requises,
          vehicle:vehicles(id, immatriculation, marque, modele)
        `)
        .eq("statut", "PLANIFIE")
        .order("date_prevue");
      
      if (maintError) throw maintError;

      // Get existing parts requests linked to diagnostics
      const { data: existingRequests, error: reqError } = await supabase
        .from("spare_parts_requests")
        .select("diagnostic_id, vehicle_id, part_name")
        .not("diagnostic_id", "is", null);
      
      if (reqError) throw reqError;

      return { repairs, maintenances, existingRequests };
    },
  });

  // Get unique brands and models
  const brands = useMemo(() => {
    if (!vehicles) return [];
    return [...new Set(vehicles.map((v) => v.marque))].filter(Boolean).sort();
  }, [vehicles]);

  const models = useMemo(() => {
    if (!vehicles) return [];
    let filtered = vehicles;
    if (selectedBrand && selectedBrand !== "all") {
      filtered = filtered.filter((v) => v.marque === selectedBrand);
    }
    return [...new Set(filtered.map((v) => v.modele))].filter(Boolean).sort();
  }, [vehicles, selectedBrand]);

  // Filter spare parts based on search and filters
  const filteredParts = useMemo(() => {
    if (!spareParts) return [];
    
    return spareParts.filter((part) => {
      const matchesSearch =
        !searchTerm ||
        part.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory =
        selectedCategory === "all" || part.categorie === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [spareParts, searchTerm, selectedCategory]);

  // Group parts by category
  const groupedParts = useMemo(() => {
    const groups: Record<string, typeof filteredParts> = {};
    filteredParts.forEach((part) => {
      if (!groups[part.categorie]) {
        groups[part.categorie] = [];
      }
      groups[part.categorie].push(part);
    });
    return groups;
  }, [filteredParts]);

  const createRequestMutation = useMutation({
    mutationFn: async () => {
      const user = await supabase.auth.getUser();
      
      const { error } = await supabase.from("spare_parts_requests").insert({
        spare_part_id: formData.spare_part_id || null,
        part_name: formData.part_name,
        part_reference: formData.part_reference || null,
        categorie: formData.categorie,
        quantite_demandee: formData.quantite_demandee,
        urgence: formData.urgence,
        motif: formData.motif || null,
        vehicle_id: vehicleId || null,
        diagnostic_id: diagnosticId || null,
        notes: formData.notes || null,
        demande_par: user.data.user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spare-parts-requests"] });
      toast.success("Demande de pièce créée");
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error("Erreur: " + error.message);
    },
  });

  // Mutation to add new part to catalog
  const addPartMutation = useMutation({
    mutationFn: async () => {
      const ref = formData.part_reference || `REF-${Date.now()}`;
      const { data, error } = await supabase
        .from("spare_parts")
        .insert({
          reference: ref,
          nom: formData.part_name,
          categorie: formData.categorie,
          quantite: 0,
          seuil_alerte: 5,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["spare-parts-for-request"] });
      queryClient.invalidateQueries({ queryKey: ["spare-parts"] });
      setFormData((prev) => ({
        ...prev,
        spare_part_id: data.id,
      }));
      toast.success("Pièce ajoutée au catalogue");
    },
    onError: (error: any) => {
      toast.error("Erreur ajout pièce: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      spare_part_id: "",
      part_name: "",
      part_reference: "",
      categorie: "",
      quantite_demandee: 1,
      urgence: "NORMALE",
      motif: "",
      notes: "",
      compatible_brands: [],
      compatible_models: [],
    });
    setSearchTerm("");
    setSelectedBrand("all");
    setSelectedModel("all");
    setSelectedCategory("all");
    setActiveTab("catalog");
  };

  const handleSparePartSelect = (part: any) => {
    setFormData({
      ...formData,
      spare_part_id: part.id,
      part_name: part.nom,
      part_reference: part.reference,
      categorie: part.categorie,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.part_name.trim() || !formData.categorie) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    createRequestMutation.mutate();
  };

  const handleAddAndRequest = () => {
    if (!formData.part_name.trim() || !formData.categorie) {
      toast.error("Veuillez remplir nom et catégorie");
      return;
    }
    addPartMutation.mutate();
  };

  const handleSelectFromDiagnostic = (repair: any, partName: string) => {
    setFormData({
      ...formData,
      part_name: partName,
      motif: `Réparation: ${repair.description || ""}`,
      notes: `Véhicule: ${repair.vehicle?.immatriculation} - ${repair.vehicle?.marque} ${repair.vehicle?.modele}`,
    });
    setActiveTab("new");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border border-orange-500/20 max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-500">
            <Package className="h-5 w-5" />
            Demande de Pièce Détachée
          </DialogTitle>
        </DialogHeader>

        {vehicle && (
          <div className="p-3 rounded-lg bg-muted/50 border border-border/50 flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Véhicule: <strong>{vehicle.immatriculation}</strong> - {vehicle.marque} {vehicle.modele}
            </span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="catalog" className="gap-2">
              <Package className="h-4 w-4" />
              Catalogue
            </TabsTrigger>
            <TabsTrigger value="diagnostic" className="gap-2">
              <Wrench className="h-4 w-4" />
              Besoins diagnostic
            </TabsTrigger>
            <TabsTrigger value="new" className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle pièce
            </TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="flex-1 overflow-hidden flex flex-col mt-4">
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="Marque véhicule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes marques</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Modèle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous modèles</SelectItem>
                  {models.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes catégories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="flex-1 pr-4">
              {Object.keys(groupedParts).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(groupedParts).map(([category, parts]) => (
                    <div key={category}>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">{category}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {parts.map((part) => (
                          <Card
                            key={part.id}
                            className={`cursor-pointer transition-all hover:border-orange-500/50 ${
                              formData.spare_part_id === part.id
                                ? "border-orange-500 bg-orange-500/10"
                                : "border-border/50"
                            }`}
                            onClick={() => handleSparePartSelect(part)}
                          >
                            <CardContent className="p-3 flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{part.nom}</p>
                                <p className="text-xs text-muted-foreground">
                                  Réf: {part.reference}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={
                                    part.quantite <= 0
                                      ? "bg-red-500/20 text-red-500"
                                      : part.quantite <= 5
                                      ? "bg-amber-500/20 text-amber-500"
                                      : "bg-green-500/20 text-green-500"
                                  }
                                >
                                  {part.quantite}
                                </Badge>
                                {formData.spare_part_id === part.id && (
                                  <Check className="h-4 w-4 text-orange-500" />
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune pièce trouvée</p>
                  <Button
                    variant="link"
                    className="text-orange-500"
                    onClick={() => setActiveTab("new")}
                  >
                    Ajouter une nouvelle pièce
                  </Button>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="diagnostic" className="flex-1 overflow-hidden flex flex-col mt-4">
            <ScrollArea className="flex-1 pr-4">
              {vehiclesWithNeeds?.repairs && vehiclesWithNeeds.repairs.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-amber-500 flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Véhicules en réparation
                  </h4>
                  {vehiclesWithNeeds.repairs.map((repair: any) => (
                    <Card key={repair.id} className="border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {repair.vehicle?.immatriculation}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {repair.vehicle?.marque} {repair.vehicle?.modele}
                            </span>
                          </div>
                          <Badge
                            className={
                              repair.statut === "EN_COURS"
                                ? "bg-blue-500/20 text-blue-500"
                                : "bg-amber-500/20 text-amber-500"
                            }
                          >
                            {repair.statut}
                          </Badge>
                        </div>
                        <p className="text-sm mb-3">{repair.description}</p>
                        
                        {repair.pieces_changees && repair.pieces_changees.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Pièces requises:</p>
                            <div className="flex flex-wrap gap-2">
                              {repair.pieces_changees.map((piece: string, idx: number) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="cursor-pointer hover:bg-orange-500/20"
                                  onClick={() => handleSelectFromDiagnostic(repair, piece)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  {piece}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {repair.diagnostic?.diagnostic_resume && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            Diagnostic: {repair.diagnostic.diagnostic_resume}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun véhicule en réparation avec besoins de pièces</p>
                </div>
              )}

              {vehiclesWithNeeds?.maintenances && vehiclesWithNeeds.maintenances.length > 0 && (
                <div className="space-y-4 mt-6">
                  <h4 className="text-sm font-medium text-blue-500 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Entretiens planifiés
                  </h4>
                  {vehiclesWithNeeds.maintenances.map((maint: any) => (
                    <Card key={maint.id} className="border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {maint.vehicle?.immatriculation}
                            </span>
                          </div>
                          <Badge variant="outline">{maint.type_entretien}</Badge>
                        </div>
                        {maint.pieces_requises && maint.pieces_requises.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {maint.pieces_requises.map((piece: string, idx: number) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="cursor-pointer hover:bg-blue-500/20"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    part_name: piece,
                                    motif: `Entretien: ${maint.type_entretien}`,
                                  })
                                }
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {piece}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="new" className="flex-1 overflow-auto mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom de la pièce *</Label>
                  <Input
                    value={formData.part_name}
                    onChange={(e) =>
                      setFormData({ ...formData, part_name: e.target.value })
                    }
                    placeholder="Ex: Filtre à huile"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Référence</Label>
                  <Input
                    value={formData.part_reference}
                    onChange={(e) =>
                      setFormData({ ...formData, part_reference: e.target.value })
                    }
                    placeholder="Ex: FLT-OIL-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Catégorie *</Label>
                  <Select
                    value={formData.categorie}
                    onValueChange={(value) =>
                      setFormData({ ...formData, categorie: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
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
                <div className="space-y-2">
                  <Label>Quantité *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.quantite_demandee}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantite_demandee: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Urgence</Label>
                <Select
                  value={formData.urgence}
                  onValueChange={(value) =>
                    setFormData({ ...formData, urgence: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BASSE">Basse</SelectItem>
                    <SelectItem value="NORMALE">Normale</SelectItem>
                    <SelectItem value="HAUTE">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Haute
                      </span>
                    </SelectItem>
                    <SelectItem value="CRITIQUE">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        Critique
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Motif de la demande</Label>
                <Textarea
                  value={formData.motif}
                  onChange={(e) =>
                    setFormData({ ...formData, motif: e.target.value })
                  }
                  placeholder="Pourquoi cette pièce est nécessaire..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes additionnelles</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Informations complémentaires..."
                  className="min-h-[60px]"
                />
              </div>

              {formData.part_name && formData.categorie && !formData.spare_part_id && (
                <Card className="border-amber-500/50 bg-amber-500/10">
                  <CardContent className="p-4">
                    <p className="text-sm text-amber-500 mb-3">
                      Cette pièce n'est pas dans le catalogue. Voulez-vous l'ajouter ?
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddAndRequest}
                      disabled={addPartMutation.isPending}
                      className="border-amber-500/50 text-amber-500"
                    >
                      {addPartMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Ajouter au catalogue
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Selected part summary */}
        {formData.spare_part_id && (
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-500">Pièce sélectionnée:</p>
              <p className="text-sm">
                {formData.part_name} ({formData.part_reference})
              </p>
            </div>
            <Badge variant="outline">{formData.categorie}</Badge>
          </div>
        )}

        <DialogFooter className="flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createRequestMutation.isPending || !formData.part_name || !formData.categorie}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {createRequestMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création...
              </>
            ) : (
              "Créer la demande"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
