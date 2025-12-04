import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface PersonnelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnel: any | null;
  locationId?: string;
  onSuccess: () => void;
}

const GRADES = [
  "Soldat", "Caporal", "Caporal-Chef", "Sergent", "Sergent-Chef",
  "Adjudant", "Adjudant-Chef", "Major", "Aspirant", "Sous-Lieutenant",
  "Lieutenant", "Capitaine", "Commandant", "Lieutenant-Colonel", "Colonel"
];

export function PersonnelFormDialog({ 
  open, 
  onOpenChange, 
  personnel, 
  locationId,
  onSuccess 
}: PersonnelFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<{ id: string; nom: string }[]>([]);
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    matricule: "",
    grade: "Soldat",
    sexe: "homme",
    actif: true,
    location_id: locationId || "",
    taille_chemise: "",
    taille_pantalon: "",
    pointure_chaussures: "",
    taille_casquette: "",
    taille_beret: "",
    taille_chapeau: "",
    taille_chaussettes: "",
    notes_tailles: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadLocations();
      if (personnel) {
        setFormData({
          nom: personnel.nom || "",
          prenom: personnel.prenom || "",
          matricule: personnel.matricule || "",
          grade: personnel.grade || "Soldat",
          sexe: personnel.sexe || "homme",
          actif: personnel.actif ?? true,
          location_id: personnel.location_id || locationId || "",
          taille_chemise: personnel.taille_chemise || "",
          taille_pantalon: personnel.taille_pantalon || "",
          pointure_chaussures: personnel.pointure_chaussures || "",
          taille_casquette: personnel.taille_casquette || "",
          taille_beret: personnel.taille_beret || "",
          taille_chapeau: personnel.taille_chapeau || "",
          taille_chaussettes: personnel.taille_chaussettes || "",
          notes_tailles: personnel.notes_tailles || ""
        });
      } else {
        setFormData(prev => ({
          ...prev,
          nom: "",
          prenom: "",
          matricule: "",
          grade: "Soldat",
          sexe: "homme",
          actif: true,
          location_id: locationId || prev.location_id,
          taille_chemise: "",
          taille_pantalon: "",
          pointure_chaussures: "",
          taille_casquette: "",
          taille_beret: "",
          taille_chapeau: "",
          taille_chaussettes: "",
          notes_tailles: ""
        }));
      }
    }
  }, [open, personnel, locationId]);

  const loadLocations = async () => {
    const { data } = await supabase.from("locations").select("id, nom").order("nom");
    if (data) setLocations(data);
  };

  const handleSubmit = async () => {
    if (!formData.nom || !formData.prenom || !formData.matricule || !formData.location_id) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
      return;
    }

    setLoading(true);

    const dataToSave = {
      nom: formData.nom,
      prenom: formData.prenom,
      matricule: formData.matricule,
      grade: formData.grade,
      sexe: formData.sexe as "homme" | "femme",
      actif: formData.actif,
      location_id: formData.location_id,
      taille_chemise: formData.taille_chemise || null,
      taille_pantalon: formData.taille_pantalon || null,
      pointure_chaussures: formData.pointure_chaussures || null,
      taille_casquette: formData.taille_casquette || null,
      taille_beret: formData.taille_beret || null,
      taille_chapeau: formData.taille_chapeau || null,
      taille_chaussettes: formData.taille_chaussettes || null,
      notes_tailles: formData.notes_tailles || null
    };

    let error;
    if (personnel) {
      const result = await supabase
        .from("personnel")
        .update(dataToSave)
        .eq("id", personnel.id);
      error = result.error;
    } else {
      const result = await supabase
        .from("personnel")
        .insert(dataToSave);
      error = result.error;
    }

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Succès", description: personnel ? "Personnel mis à jour" : "Personnel ajouté" });
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{personnel ? "Modifier le personnel" : "Ajouter un personnel"}</DialogTitle>
          <DialogDescription>
            {personnel ? "Modifiez les informations du membre" : "Remplissez les informations du nouveau membre"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">Informations</TabsTrigger>
            <TabsTrigger value="sizes">Mensurations</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Nom de famille"
                />
              </div>
              <div className="space-y-2">
                <Label>Prénom *</Label>
                <Input
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  placeholder="Prénom"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Matricule *</Label>
                <Input
                  value={formData.matricule}
                  onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                  placeholder="Ex: DJ-2024-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Grade *</Label>
                <Select value={formData.grade} onValueChange={(v) => setFormData({ ...formData, grade: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map(grade => (
                      <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sexe *</Label>
                <Select value={formData.sexe} onValueChange={(v) => setFormData({ ...formData, sexe: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="homme">Homme</SelectItem>
                    <SelectItem value="femme">Femme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Camp *</Label>
                <Select value={formData.location_id} onValueChange={(v) => setFormData({ ...formData, location_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un camp" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 glass rounded-lg">
              <Switch
                checked={formData.actif}
                onCheckedChange={(checked) => setFormData({ ...formData, actif: checked })}
              />
              <div>
                <Label>Statut actif</Label>
                <p className="text-sm text-muted-foreground">
                  {formData.actif ? "Ce membre est en service actif" : "Ce membre n'est plus en service"}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sizes" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Taille chemise</Label>
                <Select 
                  value={formData.taille_chemise} 
                  onValueChange={(v) => setFormData({ ...formData, taille_chemise: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {["XS", "S", "M", "L", "XL", "XXL", "3XL"].map(size => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Taille pantalon</Label>
                <Select 
                  value={formData.taille_pantalon} 
                  onValueChange={(v) => setFormData({ ...formData, taille_pantalon: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {["36", "38", "40", "42", "44", "46", "48", "50", "52"].map(size => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pointure chaussures</Label>
                <Select 
                  value={formData.pointure_chaussures} 
                  onValueChange={(v) => setFormData({ ...formData, pointure_chaussures: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47"].map(size => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Taille chaussettes</Label>
                <Select 
                  value={formData.taille_chaussettes} 
                  onValueChange={(v) => setFormData({ ...formData, taille_chaussettes: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {["35-38", "39-42", "43-46"].map(size => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Taille casquette</Label>
                <Select 
                  value={formData.taille_casquette} 
                  onValueChange={(v) => setFormData({ ...formData, taille_casquette: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {["S", "M", "L", "XL"].map(size => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Taille béret</Label>
                <Select 
                  value={formData.taille_beret} 
                  onValueChange={(v) => setFormData({ ...formData, taille_beret: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {["54", "55", "56", "57", "58", "59", "60", "61"].map(size => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Taille chapeau</Label>
                <Select 
                  value={formData.taille_chapeau} 
                  onValueChange={(v) => setFormData({ ...formData, taille_chapeau: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {["S", "M", "L", "XL"].map(size => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes sur les tailles</Label>
              <Input
                value={formData.notes_tailles}
                onChange={(e) => setFormData({ ...formData, notes_tailles: e.target.value })}
                placeholder="Informations supplémentaires..."
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-accent hover:bg-accent/90">
            {loading ? "Enregistrement..." : (personnel ? "Mettre à jour" : "Ajouter")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
