import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, Car, User, Gauge, AlertTriangle, Wrench, 
  Fuel, FileText, CheckCircle, ArrowRight, ArrowLeft,
  AlertCircle, Shield, Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface GarageIntakeWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type MotifType = 'REVISION' | 'PANNE' | 'ACCIDENT_INTERNE' | 'ACCIDENT_EXTERNE' | 'CONTROLE_TECHNIQUE' | 'REPARATION' | 'RAVITAILLEMENT' | 'AUTRE';
type ServiceType = 'MAINTENANCE' | 'REPARATION_LEGERE' | 'REPARATION_LOURDE' | 'CARBURANT' | 'INCIDENT' | 'EXPERTISE';

const MOTIF_OPTIONS: { value: MotifType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'REVISION', label: 'Révision', icon: <Wrench className="h-5 w-5" />, description: 'Entretien périodique planifié' },
  { value: 'PANNE', label: 'Panne', icon: <AlertTriangle className="h-5 w-5" />, description: 'Dysfonctionnement mécanique ou électrique' },
  { value: 'ACCIDENT_INTERNE', label: 'Accident interne', icon: <AlertCircle className="h-5 w-5" />, description: 'Accident survenu dans l\'enceinte' },
  { value: 'ACCIDENT_EXTERNE', label: 'Accident externe', icon: <AlertCircle className="h-5 w-5" />, description: 'Accident survenu à l\'extérieur' },
  { value: 'CONTROLE_TECHNIQUE', label: 'Contrôle technique', icon: <Shield className="h-5 w-5" />, description: 'Inspection réglementaire' },
  { value: 'REPARATION', label: 'Réparation', icon: <Wrench className="h-5 w-5" />, description: 'Réparation suite à un diagnostic' },
  { value: 'RAVITAILLEMENT', label: 'Ravitaillement', icon: <Fuel className="h-5 w-5" />, description: 'Plein de carburant' },
  { value: 'AUTRE', label: 'Autre', icon: <FileText className="h-5 w-5" />, description: 'Autre motif à préciser' },
];

const SERVICE_OPTIONS: { value: ServiceType; label: string; description: string }[] = [
  { value: 'MAINTENANCE', label: 'Service Maintenance', description: 'Entretiens et révisions' },
  { value: 'REPARATION_LEGERE', label: 'Réparation légère', description: 'Petites réparations rapides' },
  { value: 'REPARATION_LOURDE', label: 'Réparation lourde', description: 'Réparations importantes' },
  { value: 'CARBURANT', label: 'Station carburant', description: 'Ravitaillement en carburant' },
  { value: 'INCIDENT', label: 'Déclaration incident', description: 'Traitement des accidents' },
  { value: 'EXPERTISE', label: 'Expertise', description: 'Évaluation technique approfondie' },
];

export function GarageIntakeWizard({ open, onOpenChange }: GarageIntakeWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState(1);
  const [immatriculation, setImmatriculation] = useState("");
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [conducteurId, setConducteurId] = useState<string | null>(null);
  const [isAuthorizedDriver, setIsAuthorizedDriver] = useState(false);
  const [kilometrage, setKilometrage] = useState("");
  const [motif, setMotif] = useState<MotifType | null>(null);
  const [motifPrecision, setMotifPrecision] = useState("");
  const [impressions, setImpressions] = useState("");
  const [serviceOriente, setServiceOriente] = useState<ServiceType | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep(1);
      setImmatriculation("");
      setVehicleId(null);
      setConducteurId(null);
      setIsAuthorizedDriver(false);
      setKilometrage("");
      setMotif(null);
      setMotifPrecision("");
      setImpressions("");
      setServiceOriente(null);
    }
  }, [open]);

  // Search vehicle by immatriculation
  const { data: vehicleData, isLoading: searchingVehicle, refetch: searchVehicle } = useQuery({
    queryKey: ["vehicle-search", immatriculation],
    queryFn: async () => {
      if (!immatriculation.trim()) return null;
      const { data, error } = await supabase
        .from("vehicles")
        .select(`
          *,
          location:locations(nom),
          conducteur:personnel!vehicles_conducteur_principal_id_fkey(id, nom, prenom)
        `)
        .ilike("immatriculation", `%${immatriculation.trim()}%`)
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: false,
  });

  // Get authorized drivers for selected vehicle
  const { data: authorizedDrivers } = useQuery({
    queryKey: ["vehicle-authorized-drivers", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      const { data, error } = await supabase
        .from("vehicle_authorized_drivers")
        .select(`
          personnel_id,
          personnel:personnel(id, nom, prenom)
        `)
        .eq("vehicle_id", vehicleId);
      if (error) throw error;
      return data;
    },
    enabled: !!vehicleId,
  });

  // Build list of authorized drivers (principal + authorized)
  const authorizedDriversList = (() => {
    const drivers: { id: string; nom: string; prenom: string; isPrincipal?: boolean }[] = [];
    
    // Add principal driver if exists
    if (vehicleData?.conducteur_principal_id && (vehicleData as any).conducteur) {
      drivers.push({
        id: (vehicleData as any).conducteur.id,
        nom: (vehicleData as any).conducteur.nom,
        prenom: (vehicleData as any).conducteur.prenom,
        isPrincipal: true,
      });
    }
    
    // Add authorized drivers (excluding principal to avoid duplicates)
    if (authorizedDrivers) {
      authorizedDrivers.forEach((d: any) => {
        if (d.personnel && d.personnel_id !== vehicleData?.conducteur_principal_id) {
          drivers.push({
            id: d.personnel.id,
            nom: d.personnel.nom,
            prenom: d.personnel.prenom,
          });
        }
      });
    }
    
    return drivers;
  })();

  // Check if selected driver is authorized
  useEffect(() => {
    if (conducteurId && authorizedDrivers) {
      const isAuth = authorizedDrivers.some(d => d.personnel_id === conducteurId) ||
        vehicleData?.conducteur_principal_id === conducteurId;
      setIsAuthorizedDriver(isAuth);
    } else {
      setIsAuthorizedDriver(false);
    }
  }, [conducteurId, authorizedDrivers, vehicleData]);

  // Auto-suggest service based on motif
  useEffect(() => {
    if (motif) {
      switch (motif) {
        case 'REVISION':
        case 'CONTROLE_TECHNIQUE':
          setServiceOriente('MAINTENANCE');
          break;
        case 'PANNE':
          setServiceOriente('EXPERTISE');
          break;
        case 'ACCIDENT_INTERNE':
        case 'ACCIDENT_EXTERNE':
          setServiceOriente('INCIDENT');
          break;
        case 'REPARATION':
          setServiceOriente('REPARATION_LEGERE');
          break;
        case 'RAVITAILLEMENT':
          setServiceOriente('CARBURANT');
          break;
        default:
          setServiceOriente(null);
      }
    }
  }, [motif]);

  const handleSearchVehicle = () => {
    searchVehicle();
  };

  const handleVehicleFound = () => {
    if (vehicleData) {
      setVehicleId(vehicleData.id);
      setKilometrage(vehicleData.kilometrage_actuel?.toString() || "");
      setStep(2);
    }
  };

  // Submit intake
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!vehicleId || !motif || !serviceOriente) throw new Error("Données manquantes");

      // Create garage intake record
      const { error: intakeError } = await supabase
        .from("vehicle_garage_intakes")
        .insert({
          vehicle_id: vehicleId,
          conducteur_id: conducteurId,
          is_authorized_driver: isAuthorizedDriver,
          kilometrage_arrivee: parseInt(kilometrage),
          motif,
          motif_precision: motifPrecision || null,
          impressions_conducteur: impressions || null,
          service_oriente: serviceOriente,
        });
      
      if (intakeError) throw intakeError;

      // Update vehicle mileage
      const { error: vehicleError } = await supabase
        .from("vehicles")
        .update({ 
          kilometrage_actuel: parseInt(kilometrage),
          status: motif === 'RAVITAILLEMENT' ? 'OPERATIONNEL' : 
                  motif === 'ACCIDENT_INTERNE' || motif === 'ACCIDENT_EXTERNE' ? 'EN_REPARATION' :
                  'EN_MAINTENANCE'
        })
        .eq("id", vehicleId);
      
      if (vehicleError) throw vehicleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["garage-intakes"] });
      toast({ 
        title: "Véhicule enregistré", 
        description: `Orienté vers: ${SERVICE_OPTIONS.find(s => s.value === serviceOriente)?.label}` 
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const canProceedStep1 = vehicleData !== null;
  const canProceedStep2 = conducteurId !== null;
  const canProceedStep3 = kilometrage && parseInt(kilometrage) >= 0;
  const canProceedStep4 = motif !== null;
  const canSubmit = serviceOriente !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-amber-500" />
            Réception véhicule au garage
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step >= s ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {step > s ? <CheckCircle className="h-4 w-4" /> : s}
              </div>
              {s < 5 && <div className={`w-12 h-1 mx-1 ${step > s ? 'bg-amber-500' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Search Vehicle */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Rechercher par immatriculation
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="DJ-1234-A"
                    value={immatriculation}
                    onChange={(e) => setImmatriculation(e.target.value.toUpperCase())}
                    className="font-mono text-lg"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchVehicle()}
                  />
                  <Button onClick={handleSearchVehicle} disabled={searchingVehicle}>
                    {searchingVehicle ? <Clock className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {vehicleData && (
                <Card className="border-amber-500/50 bg-amber-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Car className="h-5 w-5 text-amber-500" />
                      Véhicule trouvé
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Immatriculation:</span>
                        <p className="font-mono font-bold text-amber-500">{vehicleData.immatriculation}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Marque / Modèle:</span>
                        <p className="font-medium">{vehicleData.marque} {vehicleData.modele}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Département:</span>
                        <p>{(vehicleData as any).location?.nom || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Kilométrage actuel:</span>
                        <p className="font-medium">{vehicleData.kilometrage_actuel?.toLocaleString()} km</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Conducteur principal:</span>
                        <p>
                          {(vehicleData as any).conducteur 
                            ? `${(vehicleData as any).conducteur.prenom} ${(vehicleData as any).conducteur.nom}`
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {immatriculation && !vehicleData && !searchingVehicle && (
                <div className="text-center py-4 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
                  <p>Aucun véhicule trouvé avec cette immatriculation</p>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleVehicleFound} disabled={!canProceedStep1} className="gap-2">
                  Continuer <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Driver Verification */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Conducteur qui a ramené le véhicule
                </Label>
                <Select value={conducteurId || ""} onValueChange={setConducteurId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le conducteur" />
                  </SelectTrigger>
                  <SelectContent>
                    {authorizedDriversList.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.prenom} {p.nom} {p.isPrincipal && <Badge variant="outline" className="ml-2 text-xs">Principal</Badge>}
                      </SelectItem>
                    ))}
                    {authorizedDriversList.length === 0 && (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Aucun conducteur autorisé
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {conducteurId && (
                <div className={`p-3 rounded-lg flex items-center gap-3 ${
                  isAuthorizedDriver ? 'bg-green-500/10 border border-green-500/30' : 'bg-orange-500/10 border border-orange-500/30'
                }`}>
                  {isAuthorizedDriver ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-500 font-medium">Conducteur autorisé</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <span className="text-orange-500 font-medium">Conducteur non autorisé pour ce véhicule</span>
                    </>
                  )}
                </div>
              )}

              {authorizedDrivers && authorizedDrivers.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Conducteurs autorisés:</p>
                  <div className="flex flex-wrap gap-1">
                    {authorizedDrivers.map((d: any) => (
                      <Badge key={d.personnel_id} variant="secondary">
                        {d.personnel?.prenom} {d.personnel?.nom}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button onClick={() => setStep(3)} disabled={!canProceedStep2} className="gap-2">
                  Continuer <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Mileage */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  Kilométrage à l'arrivée
                </Label>
                <Input
                  type="number"
                  value={kilometrage}
                  onChange={(e) => setKilometrage(e.target.value)}
                  placeholder="Kilométrage actuel"
                  className="text-lg"
                />
                {vehicleData && parseInt(kilometrage) < (vehicleData.kilometrage_actuel || 0) && (
                  <p className="text-sm text-orange-500">
                    ⚠️ Le kilométrage saisi est inférieur au dernier enregistré ({vehicleData.kilometrage_actuel?.toLocaleString()} km)
                  </p>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button onClick={() => setStep(4)} disabled={!canProceedStep3} className="gap-2">
                  Continuer <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Reason */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Label>Motif de l'arrivée au garage</Label>
              <div className="grid grid-cols-2 gap-2">
                {MOTIF_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMotif(option.value)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      motif === option.value
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-border hover:border-amber-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      {option.icon}
                      {option.label}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                  </button>
                ))}
              </div>

              {motif && (
                <div className="space-y-2">
                  <Label>Précisions (facultatif)</Label>
                  <Textarea
                    value={motifPrecision}
                    onChange={(e) => setMotifPrecision(e.target.value)}
                    placeholder="Détails supplémentaires sur le motif..."
                    rows={2}
                  />
                </div>
              )}

              {(motif === 'PANNE' || motif === 'ACCIDENT_INTERNE' || motif === 'ACCIDENT_EXTERNE' || motif === 'AUTRE') && (
                <div className="space-y-2">
                  <Label>Impressions du conducteur</Label>
                  <Textarea
                    value={impressions}
                    onChange={(e) => setImpressions(e.target.value)}
                    placeholder="Décrivez ce que le conducteur a constaté ou ressenti..."
                    rows={3}
                  />
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button onClick={() => setStep(5)} disabled={!canProceedStep4} className="gap-2">
                  Continuer <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Service Orientation */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Label>Orienter vers le service</Label>
              <div className="grid grid-cols-2 gap-2">
                {SERVICE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setServiceOriente(option.value)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      serviceOriente === option.value
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-border hover:border-amber-500/50'
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                  </button>
                ))}
              </div>

              {/* Summary */}
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Récapitulatif</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Véhicule:</span> <strong>{vehicleData?.immatriculation}</strong></p>
                  <p><span className="text-muted-foreground">Kilométrage:</span> {parseInt(kilometrage).toLocaleString()} km</p>
                  <p><span className="text-muted-foreground">Motif:</span> {MOTIF_OPTIONS.find(m => m.value === motif)?.label}</p>
                  <p>
                    <span className="text-muted-foreground">Conducteur autorisé:</span>{' '}
                    <Badge variant={isAuthorizedDriver ? "default" : "destructive"}>
                      {isAuthorizedDriver ? "Oui" : "Non"}
                    </Badge>
                  </p>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(4)} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button 
                  onClick={() => submitMutation.mutate()} 
                  disabled={!canSubmit || submitMutation.isPending}
                  className="gap-2 bg-amber-500 hover:bg-amber-600"
                >
                  {submitMutation.isPending ? (
                    <Clock className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Valider la réception
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
