import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  User, 
  Edit, 
  Shirt, 
  History, 
  MapPin,
  Calendar,
  QrCode
} from "lucide-react";
import { QRCodeGenerator } from "@/components/shared/QRCodeGenerator";

interface PersonnelDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnelId: string;
  onEdit: () => void;
}

type AllocationHistory = {
  id: string;
  date_attribution: string;
  quantite: number;
  motif: string;
  transaction_type: string;
  item_variants: {
    taille: string | null;
    couleur: string | null;
    stock_items: {
      type: string;
      sous_type: string | null;
    };
  };
};

export function PersonnelDetailDialog({ 
  open, 
  onOpenChange, 
  personnelId,
  onEdit 
}: PersonnelDetailDialogProps) {
  const [personnel, setPersonnel] = useState<any>(null);
  const [allocations, setAllocations] = useState<AllocationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open && personnelId) {
      loadPersonnelData();
    }
  }, [open, personnelId]);

  const loadPersonnelData = async () => {
    setLoading(true);

    // Load personnel details
    const { data: personnelData, error: personnelError } = await supabase
      .from("personnel")
      .select(`*, locations (nom)`)
      .eq("id", personnelId)
      .single();

    if (personnelError) {
      toast({ title: "Erreur", description: "Impossible de charger les données", variant: "destructive" });
      setLoading(false);
      return;
    }

    setPersonnel(personnelData);

    // Load allocation history
    const { data: allocData } = await supabase
      .from("allocations")
      .select(`
        id,
        date_attribution,
        quantite,
        motif,
        transaction_type,
        item_variants (
          taille,
          couleur,
          stock_items (
            type,
            sous_type
          )
        )
      `)
      .eq("personnel_id", personnelId)
      .order("date_attribution", { ascending: false })
      .limit(20);

    setAllocations(allocData || []);
    setLoading(false);
  };

  if (loading || !personnel) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const sizes = [
    { label: "Chemise", value: personnel.taille_chemise },
    { label: "Pantalon", value: personnel.taille_pantalon },
    { label: "Pointure", value: personnel.pointure_chaussures },
    { label: "Casquette", value: personnel.taille_casquette },
    { label: "Béret", value: personnel.taille_beret },
    { label: "Chapeau", value: personnel.taille_chapeau },
    { label: "Chaussettes", value: personnel.taille_chaussettes },
  ].filter(s => s.value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-accent/10">
                <User className="h-6 w-6 text-accent" />
              </div>
              <div>
                <span className="text-accent">{personnel.prenom} {personnel.nom}</span>
                <p className="text-sm font-normal text-muted-foreground">{personnel.matricule}</p>
              </div>
            </DialogTitle>
            <Button onClick={onEdit} variant="outline" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              Modifier
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informations</TabsTrigger>
            <TabsTrigger value="sizes">Mensurations</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="glass p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Badge className="bg-accent/20 text-accent border-accent/30">
                    {personnel.grade}
                  </Badge>
                  <Badge className={personnel.actif 
                    ? "bg-primary/20 text-primary" 
                    : "bg-destructive/20 text-destructive"}>
                    {personnel.actif ? "Actif" : "Inactif"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Sexe: {personnel.sexe === "homme" ? "Homme" : "Femme"}
                </p>
              </Card>

              <Card className="glass p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">Camp</span>
                </div>
                <p className="font-medium">{personnel.locations?.nom || "Non assigné"}</p>
              </Card>

              <Card className="glass p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Date d'entrée</span>
                </div>
                <p className="font-medium">
                  {format(new Date(personnel.date_entree), "dd MMMM yyyy", { locale: fr })}
                </p>
              </Card>

              <Card className="glass p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <QrCode className="h-4 w-4" />
                  <span className="text-sm">Code QR</span>
                </div>
                {personnel.qr_code && (
                  <QRCodeGenerator 
                    value={personnel.qr_code} 
                    size={80}
                  />
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sizes" className="mt-4">
            {sizes.length === 0 ? (
              <Card className="glass p-8 text-center">
                <Shirt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucune mensuration enregistrée</p>
                <Button onClick={onEdit} className="mt-4" variant="outline" size="sm">
                  Ajouter des mensurations
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {sizes.map((size, index) => (
                  <Card key={index} className="glass p-4">
                    <p className="text-sm text-muted-foreground">{size.label}</p>
                    <p className="text-xl font-bold text-accent">{size.value}</p>
                  </Card>
                ))}
              </div>
            )}
            {personnel.notes_tailles && (
              <Card className="glass p-4 mt-4">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-sm">{personnel.notes_tailles}</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {allocations.length === 0 ? (
              <Card className="glass p-8 text-center">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucune allocation enregistrée</p>
              </Card>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {allocations.map((alloc) => (
                  <Card key={alloc.id} className="glass p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">
                          {alloc.item_variants?.stock_items?.type}
                          {alloc.item_variants?.stock_items?.sous_type && 
                            ` - ${alloc.item_variants.stock_items.sous_type}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {alloc.item_variants?.taille && `Taille: ${alloc.item_variants.taille}`}
                          {alloc.item_variants?.couleur && ` • ${alloc.item_variants.couleur}`}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Motif: {alloc.motif}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-1">
                          x{alloc.quantite}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(alloc.date_attribution), "dd/MM/yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
