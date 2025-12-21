import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Car, User, Gauge, Calendar, FileText, CheckCircle, 
  Wrench, DollarSign, Printer, Save, Loader2, Package,
  AlertTriangle, Clock
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { VehicleSketchEditor } from "./vehicle-sketches/VehicleSketchEditor";
import { DamageMarker, VehicleSketchType } from "./vehicle-sketches";
import { DigitalSignaturePad } from "@/components/shared/DigitalSignaturePad";

interface ExitReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intakeId: string;
}

const ETAT_OPTIONS = [
  { value: "EXCELLENT", label: "Excellent", color: "text-green-500" },
  { value: "BON", label: "Bon", color: "text-blue-500" },
  { value: "ACCEPTABLE", label: "Acceptable", color: "text-yellow-500" },
  { value: "MEDIOCRE", label: "Médiocre", color: "text-orange-500" },
  { value: "MAUVAIS", label: "Mauvais", color: "text-red-500" },
];

export function ExitReportSheet({ open, onOpenChange, intakeId }: ExitReportSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [kilometrageSortie, setKilometrageSortie] = useState("");
  const [travauxEffectues, setTravauxEffectues] = useState("");
  const [piecesRemplacees, setPiecesRemplacees] = useState<string[]>([]);
  const [newPiece, setNewPiece] = useState("");
  const [coutPieces, setCoutPieces] = useState("");
  const [coutMainOeuvre, setCoutMainOeuvre] = useState("");
  const [etatGeneral, setEtatGeneral] = useState("");
  const [observationsSortie, setObservationsSortie] = useState("");
  const [conducteurSignature, setConducteurSignature] = useState<string | null>(null);
  const [responsableSignature, setResponsableSignature] = useState<string | null>(null);
  const [showConducteurSignature, setShowConducteurSignature] = useState(false);
  const [showResponsableSignature, setShowResponsableSignature] = useState(false);
  const [conducteurId, setConducteurId] = useState<string | null>(null);
  const [damageMarkers, setDamageMarkers] = useState<DamageMarker[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch intake data
  const { data: intake, isLoading } = useQuery({
    queryKey: ["exit-report-intake", intakeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_garage_intakes")
        .select(`
          *,
          vehicle:vehicles(id, immatriculation, marque, modele, vehicle_type, kilometrage_actuel, couleur, conducteur_principal_id),
          conducteur:personnel(id, nom, prenom, grade)
        `)
        .eq("id", intakeId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!intakeId && open,
  });

  // Fetch existing exit record
  const { data: existingExit } = useQuery({
    queryKey: ["vehicle-exit", intakeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_exits")
        .select("*")
        .eq("intake_id", intakeId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!intakeId && open,
  });

  // Fetch personnel for driver selection
  const { data: personnel } = useQuery({
    queryKey: ["personnel-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personnel")
        .select("id, nom, prenom, grade")
        .eq("actif", true)
        .order("nom");
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch diagnostic and repairs for this intake
  const { data: diagnostic } = useQuery({
    queryKey: ["intake-diagnostic", intakeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_diagnostics")
        .select(`
          *,
          items:vehicle_diagnostic_items(*, option:diagnostic_options(nom, category:diagnostic_categories(nom)))
        `)
        .eq("intake_id", intakeId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!intakeId && open,
  });

  // Fetch repairs for this vehicle
  const { data: repairs } = useQuery({
    queryKey: ["intake-repairs", diagnostic?.id],
    queryFn: async () => {
      if (!diagnostic?.id) return [];
      const { data, error } = await supabase
        .from("vehicle_repairs")
        .select("*")
        .eq("diagnostic_id", diagnostic.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!diagnostic?.id,
  });

  // Fetch current damages
  const { data: currentDamages } = useQuery({
    queryKey: ["vehicle-damages-exit", intake?.vehicle?.id],
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

  // Load existing data
  useEffect(() => {
    if (existingExit) {
      setKilometrageSortie(existingExit.kilometrage_sortie?.toString() || "");
      setTravauxEffectues(existingExit.travaux_effectues || "");
      setPiecesRemplacees(existingExit.pieces_remplacees || []);
      setCoutPieces(existingExit.cout_pieces?.toString() || "");
      setCoutMainOeuvre(existingExit.cout_main_oeuvre?.toString() || "");
      setEtatGeneral(existingExit.etat_general || "");
      setObservationsSortie(existingExit.observations_sortie || "");
      setConducteurSignature(existingExit.signature_conducteur);
      setResponsableSignature(existingExit.signature_responsable);
      setConducteurId(existingExit.conducteur_id);
    } else if (intake) {
      setKilometrageSortie(intake.kilometrage_arrivee?.toString() || "");
      setConducteurId(intake.conducteur_id);
    }
  }, [existingExit, intake]);

  useEffect(() => {
    if (currentDamages) {
      const markers: DamageMarker[] = currentDamages.map((d: any) => ({
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
  }, [currentDamages]);

  const getVehicleType = (): VehicleSketchType => {
    const type = intake?.vehicle?.vehicle_type;
    if (type === 'VOITURE') return 'BERLINE';
    if (type === 'UTILITAIRE') return 'PICKUP';
    if (type === 'CAMION') return 'CAMION';
    if (type === 'BUS') return 'BUS';
    if (type === 'MOTO') return 'BERLINE';
    if (type === 'ENGIN_SPECIAL') return 'CAMION';
    return 'BERLINE';
  };

  const handleAddPiece = () => {
    if (newPiece.trim()) {
      setPiecesRemplacees(prev => [...prev, newPiece.trim()]);
      setNewPiece("");
    }
  };

  const handleRemovePiece = (index: number) => {
    setPiecesRemplacees(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    const pieces = parseFloat(coutPieces) || 0;
    const mainOeuvre = parseFloat(coutMainOeuvre) || 0;
    return pieces + mainOeuvre;
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!intake?.vehicle?.id) throw new Error("Véhicule non trouvé");
      if (!kilometrageSortie) throw new Error("Le kilométrage de sortie est requis");

      const exitData = {
        intake_id: intakeId,
        vehicle_id: intake.vehicle.id,
        conducteur_id: conducteurId,
        date_sortie: new Date().toISOString(),
        kilometrage_sortie: parseInt(kilometrageSortie),
        travaux_effectues: travauxEffectues || null,
        pieces_remplacees: piecesRemplacees.length > 0 ? piecesRemplacees : null,
        cout_pieces: coutPieces ? parseFloat(coutPieces) : null,
        cout_main_oeuvre: coutMainOeuvre ? parseFloat(coutMainOeuvre) : null,
        cout_total: calculateTotal() > 0 ? calculateTotal() : null,
        etat_general: etatGeneral || null,
        observations_sortie: observationsSortie || null,
        signature_conducteur: conducteurSignature,
        signature_responsable: responsableSignature,
      };

      if (existingExit) {
        const { error } = await supabase
          .from("vehicle_exits")
          .update(exitData)
          .eq("id", existingExit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("vehicle_exits")
          .insert(exitData);
        if (error) throw error;
      }

      // Update intake status
      const { error: intakeError } = await supabase
        .from("vehicle_garage_intakes")
        .update({
          statut: "TERMINE",
          date_sortie: new Date().toISOString(),
        })
        .eq("id", intakeId);
      if (intakeError) throw intakeError;

      // Update vehicle status and mileage
      const { error: vehicleError } = await supabase
        .from("vehicles")
        .update({
          status: "OPERATIONNEL",
          kilometrage_actuel: parseInt(kilometrageSortie),
        })
        .eq("id", intake.vehicle.id);
      if (vehicleError) throw vehicleError;

      // Mark repaired damages
      if (damageMarkers.some(m => m.id && !m.id.startsWith('temp-'))) {
        const repairedIds = damageMarkers
          .filter(m => m.id && !m.id.startsWith('temp-'))
          .map(m => m.id);
        
        // Note: We keep the markers as-is; the user can mark specific ones as repaired
        // This is just updating the current state
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["garage-intakes"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-exit", intakeId] });
      toast({ title: "Fiche enregistrée", description: "Le véhicule a été restitué avec succès." });
      onOpenChange(false);
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

  // Calculate duration in garage
  const getDuration = () => {
    if (!intake?.date_arrivee) return "-";
    const start = new Date(intake.date_arrivee);
    const end = new Date();
    const hours = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    if (days > 0) {
      return `${days}j ${remainingHours}h`;
    }
    return `${hours}h`;
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
          <SheetTitle className="flex items-center gap-2 text-green-500">
            <CheckCircle className="h-5 w-5" />
            Fiche de Sortie Véhicule
          </SheetTitle>
        </SheetHeader>

        <div ref={printRef} className="space-y-6 mt-4 print:mt-0">
          {/* Header */}
          <div className="text-center border-b pb-4 print:border-black">
            <h1 className="text-2xl font-bold">FICHE DE SORTIE VÉHICULE</h1>
            <p className="text-muted-foreground">Restitution après intervention</p>
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
                  <span className="text-muted-foreground">Durée au garage</span>
                  <p className="font-medium flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {getDuration()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Entry/Exit Info */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-500" />
                Entrée / Sortie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date d'entrée</span>
                  <p className="font-medium">
                    {intake?.date_arrivee && format(new Date(intake.date_arrivee), "dd/MM/yyyy HH:mm", { locale: fr })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Km entrée</span>
                  <p className="font-medium">{intake?.kilometrage_arrivee?.toLocaleString()} km</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date de sortie</span>
                  <p className="font-medium">{format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Km sortie *</Label>
                  <Input
                    type="number"
                    value={kilometrageSortie}
                    onChange={(e) => setKilometrageSortie(e.target.value)}
                    placeholder="Kilométrage"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Work Summary */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4 text-amber-500" />
                Travaux Effectués
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show diagnostic summary if available */}
              {diagnostic && (
                <div className="bg-muted/50 p-3 rounded-lg text-sm">
                  <h4 className="font-medium mb-2">Résumé du diagnostic:</h4>
                  <p>{diagnostic.diagnostic_resume || "Aucun résumé disponible"}</p>
                  {diagnostic.items && diagnostic.items.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {diagnostic.items.map((item: any) => (
                        <Badge key={item.id} variant="outline" className="text-xs">
                          {item.option?.nom}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label>Description des travaux</Label>
                <Textarea
                  value={travauxEffectues}
                  onChange={(e) => setTravauxEffectues(e.target.value)}
                  placeholder="Décrire les travaux effectués..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              {/* Replaced parts */}
              <div>
                <Label>Pièces remplacées</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={newPiece}
                    onChange={(e) => setNewPiece(e.target.value)}
                    placeholder="Nom de la pièce"
                    onKeyDown={(e) => e.key === "Enter" && handleAddPiece()}
                  />
                  <Button onClick={handleAddPiece} variant="outline">
                    <Package className="h-4 w-4" />
                  </Button>
                </div>
                {piecesRemplacees.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {piecesRemplacees.map((piece, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive/20"
                        onClick={() => handleRemovePiece(index)}
                      >
                        {piece} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Costs */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-amber-500" />
                Coûts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Coût pièces (DJF)</Label>
                  <Input
                    type="number"
                    value={coutPieces}
                    onChange={(e) => setCoutPieces(e.target.value)}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Main d'œuvre (DJF)</Label>
                  <Input
                    type="number"
                    value={coutMainOeuvre}
                    onChange={(e) => setCoutMainOeuvre(e.target.value)}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Total (DJF)</Label>
                  <div className="mt-1 p-2 bg-amber-500/10 border border-amber-500/30 rounded-md font-bold text-amber-500 text-center">
                    {calculateTotal().toLocaleString()} DJF
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Final State */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                État Final
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>État général du véhicule</Label>
                  <Select value={etatGeneral} onValueChange={setEtatGeneral}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner l'état" />
                    </SelectTrigger>
                    <SelectContent>
                      {ETAT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className={option.color}>{option.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Conducteur récupérant le véhicule</Label>
                  <Select value={conducteurId || ""} onValueChange={setConducteurId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner le conducteur" />
                    </SelectTrigger>
                    <SelectContent>
                      {personnel?.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.grade} {p.prenom} {p.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Observations de sortie</Label>
                <Textarea
                  value={observationsSortie}
                  onChange={(e) => setObservationsSortie(e.target.value)}
                  placeholder="Observations, recommandations..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Sketch - Current State */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="h-4 w-4 text-amber-500" />
                État de la Carrosserie (Sortie)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VehicleSketchEditor
                vehicleType={getVehicleType()}
                damages={damageMarkers}
                onDamagesChange={setDamageMarkers}
                readOnly={true}
              />
              <p className="text-xs text-muted-foreground mt-2">
                * Les dommages réparés peuvent être marqués dans la fiche de réception
              </p>
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
                  <h4 className="font-medium mb-2">Signature du Responsable Garage</h4>
                  {responsableSignature ? (
                    <div className="border rounded p-2 bg-white">
                      <img src={responsableSignature} alt="Signature responsable" className="max-h-24" />
                      <Button variant="ghost" size="sm" onClick={() => setResponsableSignature(null)} className="mt-2">
                        Modifier
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => setShowResponsableSignature(true)}>
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
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !kilometrageSortie} 
              className="gap-2 bg-green-500 hover:bg-green-600"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Valider la Sortie
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
        {showResponsableSignature && (
          <DigitalSignaturePad
            onSave={(sig) => { setResponsableSignature(sig); setShowResponsableSignature(false); }}
            onCancel={() => setShowResponsableSignature(false)}
            title="Signature du Responsable Garage"
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
