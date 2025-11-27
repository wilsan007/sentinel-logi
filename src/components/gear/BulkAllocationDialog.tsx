import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Package } from "lucide-react";
import { motion } from "framer-motion";

interface Personnel {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  grade: string;
  taille_chemise: string | null;
  taille_pantalon: string | null;
  pointure_chaussures: string | null;
  taille_casquette: string | null;
  taille_chapeau: string | null;
  taille_beret: string | null;
  taille_chaussettes: string | null;
}

interface ItemVariant {
  id: string;
  taille: string | null;
  couleur: string | null;
  quantite: number;
  stock_item: {
    type: string;
    sous_type: string | null;
  };
}

interface BulkAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  onSuccess: () => void;
}

const MOTIFS = [
  "Dotation initiale",
  "Remplacement",
  "Mission spéciale",
  "Article endommagé",
  "Article perdu",
  "Ajustement de taille",
  "Autre",
];

// Mapping des types d'articles aux colonnes de taille
const TAILLE_MAPPING: Record<string, keyof Personnel> = {
  "Chemise": "taille_chemise",
  "Pantalon": "taille_pantalon",
  "Chaussures": "pointure_chaussures",
  "Casquette": "taille_casquette",
  "Chapeau": "taille_chapeau",
  "Béret": "taille_beret",
  "Chaussettes": "taille_chaussettes",
};

export function BulkAllocationDialog({ open, onOpenChange, locationId, onSuccess }: BulkAllocationDialogProps) {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [variants, setVariants] = useState<ItemVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [selectedPersonnel, setSelectedPersonnel] = useState<Set<string>>(new Set());
  const [motif, setMotif] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, locationId]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      // Charger le personnel
      const { data: personnelData, error: personnelError } = await supabase
        .from("personnel")
        .select("*")
        .eq("location_id", locationId)
        .eq("actif", true);

      if (personnelError) throw personnelError;
      setPersonnel(personnelData || []);

      // Charger les variants disponibles
      const { data: variantsData, error: variantsError } = await supabase
        .from("item_variants")
        .select(`
          id,
          taille,
          couleur,
          quantite,
          stock_item:stock_items(type, sous_type)
        `)
        .eq("location_id", locationId)
        .gt("quantite", 0);

      if (variantsError) throw variantsError;
      setVariants(variantsData as any || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setLoadingData(false);
    }
  };

  const getPersonnelTaille = (person: Personnel, variantId: string): string | null => {
    const variant = variants.find(v => v.id === variantId);
    if (!variant) return null;

    const itemType = variant.stock_item.type;
    const tailleColumn = TAILLE_MAPPING[itemType];
    
    if (!tailleColumn) return null;
    return person[tailleColumn];
  };

  const togglePersonnel = (personnelId: string) => {
    const newSelected = new Set(selectedPersonnel);
    if (newSelected.has(personnelId)) {
      newSelected.delete(personnelId);
    } else {
      newSelected.add(personnelId);
    }
    setSelectedPersonnel(newSelected);
  };

  const selectAll = () => {
    if (!selectedVariant) return;
    
    const eligiblePersonnel = personnel.filter(p => {
      const taille = getPersonnelTaille(p, selectedVariant);
      const variant = variants.find(v => v.id === selectedVariant);
      return taille === variant?.taille;
    });
    
    setSelectedPersonnel(new Set(eligiblePersonnel.map(p => p.id)));
  };

  const deselectAll = () => {
    setSelectedPersonnel(new Set());
  };

  const handleSubmit = async () => {
    if (!selectedVariant || selectedPersonnel.size === 0 || !motif) {
      toast({
        variant: "destructive",
        title: "Champs requis",
        description: "Veuillez sélectionner un article, au moins un membre du personnel et un motif.",
      });
      return;
    }

    const variant = variants.find(v => v.id === selectedVariant);
    if (!variant) return;

    if (selectedPersonnel.size > variant.quantite) {
      toast({
        variant: "destructive",
        title: "Stock insuffisant",
        description: `Stock disponible: ${variant.quantite}, Sélectionnés: ${selectedPersonnel.size}`,
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Créer les allocations
      const allocations = Array.from(selectedPersonnel).map(personnelId => ({
        personnel_id: personnelId,
        item_variant_id: selectedVariant,
        quantite: 1,
        motif,
        notes,
        attribue_par: user.id,
      }));

      const { error: insertError } = await supabase
        .from("allocations")
        .insert(allocations);

      if (insertError) throw insertError;

      // Mettre à jour le stock
      const { error: updateError } = await supabase
        .from("item_variants")
        .update({ quantite: variant.quantite - selectedPersonnel.size })
        .eq("id", selectedVariant);

      if (updateError) throw updateError;

      toast({
        title: "Dotation réussie",
        description: `${selectedPersonnel.size} allocation(s) enregistrée(s)`,
      });

      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedVariant("");
    setSelectedPersonnel(new Set());
    setMotif("");
    setNotes("");
  };

  const selectedVariantData = variants.find(v => v.id === selectedVariant);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Dotation en Masse
          </DialogTitle>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Sélection de l'article */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Article à attribuer</label>
              <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un article..." />
                </SelectTrigger>
                <SelectContent>
                  {variants.map((variant) => (
                    <SelectItem key={variant.id} value={variant.id}>
                      {variant.stock_item.type}
                      {variant.stock_item.sous_type && ` - ${variant.stock_item.sous_type}`}
                      {variant.taille && ` - Taille: ${variant.taille}`}
                      {variant.couleur && ` - ${variant.couleur}`}
                      {` (Stock: ${variant.quantite})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Motif */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Motif *</label>
              <Select value={motif} onValueChange={setMotif}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un motif..." />
                </SelectTrigger>
                <SelectContent>
                  {MOTIFS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes additionnelles..."
                rows={2}
              />
            </div>

            {/* Liste du personnel */}
            {selectedVariant && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Personnel ({selectedPersonnel.size} sélectionné(s))
                  </label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      Tout sélectionner
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAll}>
                      Tout désélectionner
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-[300px] border rounded-lg">
                  <div className="p-4 space-y-2">
                    {personnel.map((person) => {
                      const taille = getPersonnelTaille(person, selectedVariant);
                      const isMatch = taille === selectedVariantData?.taille;
                      
                      return (
                        <motion.div
                          key={person.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            isMatch ? "border-primary/30 bg-primary/5" : "border-border"
                          }`}
                        >
                          <Checkbox
                            checked={selectedPersonnel.has(person.id)}
                            onCheckedChange={() => togglePersonnel(person.id)}
                            disabled={!isMatch}
                          />
                          <div className="flex-1">
                            <div className="font-medium">
                              {person.grade} {person.nom} {person.prenom}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {person.matricule}
                              {taille && ` • Taille: ${taille}`}
                            </div>
                          </div>
                          {!isMatch && taille && (
                            <div className="text-xs text-destructive">
                              Taille incompatible
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading || selectedPersonnel.size === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Attribution...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Attribuer à {selectedPersonnel.size} personne(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
