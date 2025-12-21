import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Car, User, Gauge, Calendar, FileText, CheckCircle, XCircle,
  AlertTriangle, Printer, Save, Loader2, ClipboardList
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { VehicleSketchEditor } from "./vehicle-sketches/VehicleSketchEditor";
import { DamageMarker, VehicleSketchType } from "./vehicle-sketches";
import { DigitalSignaturePad } from "@/components/shared/DigitalSignaturePad";

interface IntakeReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intakeId: string;
}

// Inspection categories and items
const INSPECTION_CATEGORIES = [
  {
    name: "Extérieur",
    items: [
      "État de la carrosserie",
      "Pare-brise et vitres",
      "Rétroviseurs",
      "Phares et feux",
      "Essuie-glaces",
      "Antenne",
      "Enjoliveurs/Jantes"
    ]
  },
  {
    name: "Pneus",
    items: [
      "Pneu avant gauche",
      "Pneu avant droit",
      "Pneu arrière gauche",
      "Pneu arrière droit",
      "Roue de secours",
      "Pression pneus"
    ]
  },
  {
    name: "Intérieur",
    items: [
      "Sièges et sellerie",
      "Tableau de bord",
      "Volant",
      "Ceintures de sécurité",
      "Climatisation",
      "Autoradio",
      "Tapis de sol"
    ]
  },
  {
    name: "Équipements",
    items: [
      "Triangle de signalisation",
      "Gilet réfléchissant",
      "Trousse de secours",
      "Extincteur",
      "Cric et manivelle",
      "Clé en croix",
      "Manuel du véhicule"
    ]
  },
  {
    name: "Niveaux",
    items: [
      "Huile moteur",
      "Liquide de refroidissement",
      "Liquide de frein",
      "Lave-glace",
      "Niveau carburant"
    ]
  }
];

type InspectionStatus = "ok" | "defaut" | "manquant" | "non_verifie";

const STATUS_COLORS: Record<InspectionStatus, string> = {
  ok: "bg-green-500",
  defaut: "bg-orange-500",
  manquant: "bg-red-500",
  non_verifie: "bg-gray-400"
};

const STATUS_LABELS: Record<InspectionStatus, string> = {
  ok: "OK",
  defaut: "Défaut",
  manquant: "Manquant",
  non_verifie: "N/V"
};

export function IntakeReportSheet({ open, onOpenChange, intakeId }: IntakeReportSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [damageMarkers, setDamageMarkers] = useState<DamageMarker[]>([]);
  const [inspectionItems, setInspectionItems] = useState<Record<string, InspectionStatus>>({});
  const [inspectionNotes, setInspectionNotes] = useState<Record<string, string>>({});
  const [conducteurSignature, setConducteurSignature] = useState<string | null>(null);
  const [receptionnisteSignature, setReceptionnisteSignature] = useState<string | null>(null);
  const [showConducteurSignature, setShowConducteurSignature] = useState(false);
  const [showReceptionnisteSignature, setShowReceptionnisteSignature] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch intake data
  const { data: intake, isLoading } = useQuery({
    queryKey: ["intake-report", intakeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_garage_intakes")
        .select(`
          *,
          vehicle:vehicles(id, immatriculation, marque, modele, vehicle_type, kilometrage_actuel, couleur),
          conducteur:personnel(id, nom, prenom, grade)
        `)
        .eq("id", intakeId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!intakeId && open,
  });

  // Fetch existing damages
  const { data: existingDamages } = useQuery({
    queryKey: ["vehicle-damages", intake?.vehicle?.id],
    queryFn: async () => {
      if (!intake?.vehicle?.id) return [];
      const { data, error } = await supabase
        .from("vehicle_body_damages")
        .select("*")
        .eq("vehicle_id", intake.vehicle.id)
        .eq("is_repaired", false);
      
      if (error) throw error;
      return data;
    },
    enabled: !!intake?.vehicle?.id,
  });

  // Fetch existing inspection items
  const { data: existingInspection } = useQuery({
    queryKey: ["intake-inspection", intakeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_inspection_items")
        .select("*")
        .eq("intake_id", intakeId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!intakeId && open,
  });

  // Load existing data
  useEffect(() => {
    if (existingDamages) {
      const markers: DamageMarker[] = existingDamages.map((d: any) => ({
        id: d.id,
        type: d.damage_type,
        severity: d.severity,
        view: d.vehicle_view,
        positionX: parseFloat(d.position_x),
        positionY: parseFloat(d.position_y),
        notes: d.notes,
        isPreExisting: d.is_pre_existing,
      }));
      setDamageMarkers(markers);
    }
  }, [existingDamages]);

  useEffect(() => {
    if (existingInspection) {
      const items: Record<string, InspectionStatus> = {};
      const notes: Record<string, string> = {};
      existingInspection.forEach((item: any) => {
        const key = `${item.category}-${item.item_name}`;
        items[key] = item.status as InspectionStatus;
        if (item.notes) notes[key] = item.notes;
      });
      setInspectionItems(items);
      setInspectionNotes(notes);
    }
  }, [existingInspection]);

  useEffect(() => {
    if (intake) {
      if (intake.signature_conducteur) setConducteurSignature(intake.signature_conducteur);
      if (intake.signature_receptionniste) setReceptionnisteSignature(intake.signature_receptionniste);
    }
  }, [intake]);

  const getVehicleType = (): VehicleSketchType => {
    const type = intake?.vehicle?.vehicle_type;
    if (type === 'VOITURE') return 'BERLINE';
    if (type === 'UTILITAIRE') return 'PICKUP';
    if (type === 'CAMION') return 'CAMION';
    if (type === 'BUS') return 'BUS';
    if (type === 'MOTO') return 'BERLINE'; // Fallback for moto
    if (type === 'ENGIN_SPECIAL') return 'CAMION'; // Fallback for special
    return 'BERLINE';
  };

  const handleInspectionChange = (category: string, item: string, status: InspectionStatus) => {
    const key = `${category}-${item}`;
    setInspectionItems(prev => ({ ...prev, [key]: status }));
  };

  const getInspectionStatus = (category: string, item: string): InspectionStatus => {
    const key = `${category}-${item}`;
    return inspectionItems[key] || "non_verifie";
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!intake?.vehicle?.id) throw new Error("Véhicule non trouvé");

      // 1. Save/update damages
      // First, get existing damage IDs to know what to delete
      const { data: currentDamages } = await supabase
        .from("vehicle_body_damages")
        .select("id")
        .eq("intake_id", intakeId);
      
      const currentIds = new Set((currentDamages || []).map(d => d.id));
      const newMarkerIds = new Set(damageMarkers.filter(m => !m.id.startsWith('temp-')).map(m => m.id));

      // Delete removed damages
      const toDelete = [...currentIds].filter(id => !newMarkerIds.has(id));
      if (toDelete.length > 0) {
        await supabase.from("vehicle_body_damages").delete().in("id", toDelete);
      }

      // Upsert damages
      for (const marker of damageMarkers) {
        const damageData = {
          vehicle_id: intake.vehicle.id,
          intake_id: intakeId,
          damage_type: marker.type,
          severity: marker.severity,
          vehicle_view: marker.view,
          position_x: marker.positionX,
          position_y: marker.positionY,
          notes: marker.notes || null,
          is_pre_existing: marker.isPreExisting || false,
        };

        if (marker.id.startsWith('temp-')) {
          await supabase.from("vehicle_body_damages").insert(damageData);
        } else {
          await supabase.from("vehicle_body_damages").update(damageData).eq("id", marker.id);
        }
      }

      // 2. Save inspection items
      // Delete existing inspection items for this intake
      await supabase.from("vehicle_inspection_items").delete().eq("intake_id", intakeId);

      // Insert new inspection items
      const inspectionRecords = Object.entries(inspectionItems).map(([key, status]) => {
        const [category, ...itemParts] = key.split("-");
        const itemName = itemParts.join("-");
        return {
          intake_id: intakeId,
          vehicle_id: intake.vehicle.id,
          category,
          item_name: itemName,
          status,
          notes: inspectionNotes[key] || null,
        };
      });

      if (inspectionRecords.length > 0) {
        const { error: inspError } = await supabase
          .from("vehicle_inspection_items")
          .insert(inspectionRecords);
        if (inspError) throw inspError;
      }

      // 3. Update intake with signatures and inspection status
      const { error: intakeError } = await supabase
        .from("vehicle_garage_intakes")
        .update({
          signature_conducteur: conducteurSignature,
          signature_receptionniste: receptionnisteSignature,
          inspection_complete: Object.keys(inspectionItems).length > 0,
        })
        .eq("id", intakeId);

      if (intakeError) throw intakeError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["garage-intakes"] });
      queryClient.invalidateQueries({ queryKey: ["intake-report", intakeId] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-damages"] });
      toast({ title: "Fiche enregistrée", description: "La fiche de réception a été sauvegardée." });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    await saveMutation.mutateAsync();
    setIsSaving(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-5xl overflow-y-auto print:w-full print:max-w-none">
        <SheetHeader className="print:hidden">
          <SheetTitle className="flex items-center gap-2 text-amber-500">
            <FileText className="h-5 w-5" />
            Fiche de Réception Véhicule
          </SheetTitle>
        </SheetHeader>

        <div ref={printRef} className="space-y-6 mt-4 print:mt-0">
          {/* Header */}
          <div className="text-center border-b pb-4 print:border-black">
            <h1 className="text-2xl font-bold">FICHE DE RÉCEPTION VÉHICULE</h1>
            <p className="text-muted-foreground">Entrée au garage - {format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })}</p>
          </div>

          {/* Vehicle Info */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="h-4 w-4 text-amber-500" />
                Identification du Véhicule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Immatriculation</span>
                  <p className="font-mono font-bold text-amber-500 text-lg">{intake?.vehicle?.immatriculation}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Marque / Modèle</span>
                  <p className="font-medium">{intake?.vehicle?.marque} {intake?.vehicle?.modele}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Type</span>
                  <p className="font-medium">{intake?.vehicle?.vehicle_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Couleur</span>
                  <p className="font-medium">{intake?.vehicle?.couleur || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Arrival Info */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-500" />
                Informations d'Arrivée
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date d'arrivée</span>
                  <p className="font-medium">
                    {intake?.date_arrivee && format(new Date(intake.date_arrivee), "dd/MM/yyyy HH:mm", { locale: fr })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Kilométrage</span>
                  <p className="font-medium flex items-center gap-1">
                    <Gauge className="h-4 w-4" />
                    {intake?.kilometrage_arrivee?.toLocaleString()} km
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Motif</span>
                  <Badge variant="outline">{intake?.motif}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Service orienté</span>
                  <p className="font-medium">{intake?.service_oriente}</p>
                </div>
              </div>
              {intake?.motif_precision && (
                <div className="mt-3">
                  <span className="text-muted-foreground text-sm">Précisions:</span>
                  <p className="text-sm bg-muted p-2 rounded mt-1">{intake.motif_precision}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Driver Info */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-amber-500" />
                Conducteur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Nom complet</span>
                  <p className="font-medium">
                    {intake?.conducteur 
                      ? `${intake.conducteur.grade} ${intake.conducteur.prenom} ${intake.conducteur.nom}`
                      : "Non spécifié"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Statut</span>
                  <div className="flex items-center gap-2">
                    {intake?.is_authorized_driver ? (
                      <Badge className="bg-green-500/20 text-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Conducteur autorisé
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-500/20 text-orange-500">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Non autorisé
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {intake?.impressions_conducteur && (
                <div className="mt-3">
                  <span className="text-muted-foreground text-sm">Impressions du conducteur:</span>
                  <p className="text-sm bg-muted p-2 rounded mt-1">{intake.impressions_conducteur}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle Sketch with Damages */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="h-4 w-4 text-amber-500" />
                État de la Carrosserie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VehicleSketchEditor
                vehicleType={getVehicleType()}
                damages={damageMarkers}
                onDamagesChange={setDamageMarkers}
                readOnly={false}
              />
            </CardContent>
          </Card>

          {/* Inspection Checklist */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-amber-500" />
                Inspection Visuelle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Legend */}
              <div className="flex gap-4 text-xs flex-wrap">
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded ${STATUS_COLORS[key as InspectionStatus]}`} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {INSPECTION_CATEGORIES.map((category) => (
                  <div key={category.name} className="border rounded-lg p-3">
                    <h4 className="font-medium mb-2 text-amber-500">{category.name}</h4>
                    <div className="space-y-2">
                      {category.items.map((item) => {
                        const status = getInspectionStatus(category.name, item);
                        return (
                          <div key={item} className="flex items-center justify-between text-sm">
                            <span className="truncate pr-2">{item}</span>
                            <div className="flex gap-1">
                              {(["ok", "defaut", "manquant"] as InspectionStatus[]).map((s) => (
                                <button
                                  key={s}
                                  onClick={() => handleInspectionChange(category.name, item, s)}
                                  className={`w-6 h-6 rounded text-xs text-white flex items-center justify-center transition-all ${
                                    status === s 
                                      ? STATUS_COLORS[s] + " ring-2 ring-offset-1 ring-amber-500" 
                                      : "bg-muted hover:opacity-80"
                                  }`}
                                >
                                  {s === "ok" && "✓"}
                                  {s === "defaut" && "!"}
                                  {s === "manquant" && "✗"}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Signatures */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Signatures</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Signature du Conducteur</h4>
                  {conducteurSignature ? (
                    <div className="border rounded p-2 bg-white">
                      <img src={conducteurSignature} alt="Signature conducteur" className="max-h-24" />
                      <Button variant="ghost" size="sm" onClick={() => setConducteurSignature(null)} className="mt-2">
                        Modifier
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => setShowConducteurSignature(true)}>
                      Signer
                    </Button>
                  )}
                </div>
                <div>
                  <h4 className="font-medium mb-2">Signature du Réceptionniste</h4>
                  {receptionnisteSignature ? (
                    <div className="border rounded p-2 bg-white">
                      <img src={receptionnisteSignature} alt="Signature réceptionniste" className="max-h-24" />
                      <Button variant="ghost" size="sm" onClick={() => setReceptionnisteSignature(null)} className="mt-2">
                        Modifier
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => setShowReceptionnisteSignature(true)}>
                      Signer
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-end print:hidden sticky bottom-0 bg-background py-4 border-t">
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-amber-500 hover:bg-amber-600">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
        </div>

        {/* Signature Modals */}
        {showConducteurSignature && (
          <DigitalSignaturePad
            onSave={(sig) => { setConducteurSignature(sig); setShowConducteurSignature(false); }}
            onCancel={() => setShowConducteurSignature(false)}
            title="Signature du Conducteur"
          />
        )}
        {showReceptionnisteSignature && (
          <DigitalSignaturePad
            onSave={(sig) => { setReceptionnisteSignature(sig); setShowReceptionnisteSignature(false); }}
            onCancel={() => setShowReceptionnisteSignature(false)}
            title="Signature du Réceptionniste"
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
