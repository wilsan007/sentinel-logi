import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, Fuel, Calendar, MapPin } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const fuelSchema = z.object({
  type_ravitaillement: z.enum(["KILOMETRIQUE", "MENSUEL", "EXCEPTIONNEL"]),
  vehicle_id: z.string().min(1, "Véhicule requis"),
  date_plein: z.string().min(1, "Date requise"),
  litres: z.coerce.number().min(0.1, "Litres requis"),
  prix_litre: z.coerce.number().min(1, "Prix requis"),
  kilometrage: z.coerce.number().min(0, "Kilométrage requis"),
  location_id: z.string().optional(),
  conducteur_id: z.string().optional(),
  plein_complet: z.boolean().default(true),
  justification: z.string().optional(),
  mission_description: z.string().optional(),
}).refine((data) => {
  // Pour les demandes exceptionnelles, la justification est obligatoire
  if (data.type_ravitaillement === "EXCEPTIONNEL" && (!data.justification || data.justification.length < 10)) {
    return false;
  }
  return true;
}, {
  message: "Une justification détaillée est requise pour les demandes exceptionnelles (min. 10 caractères)",
  path: ["justification"],
});

type FuelFormValues = z.infer<typeof fuelSchema>;

interface FuelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SEUIL_KM_ALERTE = 50; // Alerte si moins de 50 km parcourus

export function FuelFormDialog({ open, onOpenChange }: FuelFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [kmAlerte, setKmAlerte] = useState(false);
  const [kmParcourus, setKmParcourus] = useState<number | null>(null);
  const [lastFuelLog, setLastFuelLog] = useState<any>(null);

  const form = useForm<FuelFormValues>({
    resolver: zodResolver(fuelSchema),
    defaultValues: {
      type_ravitaillement: "KILOMETRIQUE",
      date_plein: new Date().toISOString().slice(0, 16),
      plein_complet: true,
    },
  });

  const typeRavitaillement = form.watch("type_ravitaillement");
  const vehicleId = form.watch("vehicle_id");
  const kilometrage = form.watch("kilometrage");

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, immatriculation, marque, modele, kilometrage_actuel")
        .order("immatriculation");
      if (error) throw error;
      return data;
    },
  });

  const { data: locations } = useQuery({
    queryKey: ["locations-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, nom, code")
        .order("nom");
      if (error) throw error;
      return data;
    },
  });

  const { data: personnel } = useQuery({
    queryKey: ["personnel-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("personnel").select("id, nom, prenom").eq("actif", true).order("nom");
      if (error) throw error;
      return data;
    },
  });

  // Récupérer le dernier plein du véhicule sélectionné
  useEffect(() => {
    if (!vehicleId) {
      setLastFuelLog(null);
      setKmParcourus(null);
      setKmAlerte(false);
      return;
    }

    const fetchLastFuelLog = async () => {
      const { data, error } = await supabase
        .from("vehicle_fuel_logs")
        .select("id, kilometrage, date_plein")
        .eq("vehicle_id", vehicleId)
        .order("date_plein", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setLastFuelLog(data);
      } else {
        setLastFuelLog(null);
      }
    };

    fetchLastFuelLog();
  }, [vehicleId]);

  // Calculer les km parcourus et déclencher l'alerte si nécessaire
  useEffect(() => {
    if (lastFuelLog && kilometrage && typeRavitaillement === "KILOMETRIQUE") {
      const km = kilometrage - lastFuelLog.kilometrage;
      setKmParcourus(km);
      setKmAlerte(km < SEUIL_KM_ALERTE && km >= 0);
    } else {
      setKmParcourus(null);
      setKmAlerte(false);
    }
  }, [kilometrage, lastFuelLog, typeRavitaillement]);

  const litres = form.watch("litres") || 0;
  const prixLitre = form.watch("prix_litre") || 0;
  const coutTotal = litres * prixLitre;

  const selectedVehicle = vehicles?.find(v => v.id === vehicleId);

  const mutation = useMutation({
    mutationFn: async (values: FuelFormValues) => {
      const { data: userData } = await supabase.auth.getUser();
      
      // Calculer les km parcourus pour enregistrement
      let calculatedKmParcourus = 0;
      if (lastFuelLog && values.kilometrage) {
        calculatedKmParcourus = values.kilometrage - lastFuelLog.kilometrage;
      }

      const payload = {
        vehicle_id: values.vehicle_id,
        date_plein: values.date_plein,
        litres: values.litres,
        prix_litre: values.prix_litre,
        cout_total: coutTotal,
        kilometrage: values.kilometrage,
        station: null, // Plus utilisé, remplacé par location_id
        conducteur_id: values.conducteur_id || null,
        plein_complet: values.plein_complet,
        enregistre_par: userData.user?.id,
        type_ravitaillement: values.type_ravitaillement,
        km_parcourus: calculatedKmParcourus,
        alerte_km: kmAlerte && values.type_ravitaillement === "KILOMETRIQUE",
        justification: values.justification || null,
        mission_description: values.mission_description || null,
        location_id: values.location_id || null,
        statut_validation: values.type_ravitaillement === "EXCEPTIONNEL" ? "EN_ATTENTE" : "APPROUVE",
      };

      const { error } = await supabase.from("vehicle_fuel_logs").insert(payload);
      if (error) throw error;

      // Mettre à jour le kilométrage du véhicule si supérieur
      if (selectedVehicle && values.kilometrage > (selectedVehicle.kilometrage_actuel || 0)) {
        await supabase.from("vehicles").update({ kilometrage_actuel: values.kilometrage }).eq("id", values.vehicle_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-fuel-logs"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      
      const message = typeRavitaillement === "EXCEPTIONNEL" 
        ? "Demande de ravitaillement exceptionnel soumise pour validation"
        : "Plein enregistré avec succès";
      
      toast({ title: message });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "KILOMETRIQUE": return "Kilométrique";
      case "MENSUEL": return "Mensuel fixe";
      case "EXCEPTIONNEL": return "Exceptionnel";
      default: return type;
    }
  };

  const getTypeDescription = (type: string) => {
    switch (type) {
      case "KILOMETRIQUE": return "Ravitaillement basé sur les km parcourus. Une alerte sera générée si moins de 50 km depuis le dernier plein.";
      case "MENSUEL": return "Allocation mensuelle fixe, indépendante du kilométrage parcouru.";
      case "EXCEPTIONNEL": return "Demande exceptionnelle pour mission spéciale. Nécessite une justification détaillée.";
      default: return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5 text-green-500" />
            Nouveau ravitaillement
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            {/* Type de ravitaillement */}
            <FormField
              control={form.control}
              name="type_ravitaillement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de ravitaillement *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="KILOMETRIQUE">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
                            KM
                          </Badge>
                          Kilométrique
                        </div>
                      </SelectItem>
                      <SelectItem value="MENSUEL">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">
                            <Calendar className="h-3 w-3 mr-1" />
                            Mois
                          </Badge>
                          Mensuel fixe
                        </div>
                      </SelectItem>
                      <SelectItem value="EXCEPTIONNEL">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
                            <MapPin className="h-3 w-3 mr-1" />
                            Mission
                          </Badge>
                          Exceptionnel
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    {getTypeDescription(field.value)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vehicle_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Véhicule *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un véhicule" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicles?.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.immatriculation} - {v.marque} {v.modele}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date_plein"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date et heure *</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="litres"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Litres *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="45.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prix_litre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix/L (FDJ) *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="250" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Coût total</FormLabel>
                <div className="h-10 flex items-center px-3 rounded-md border bg-muted/50 font-medium">
                  {coutTotal.toLocaleString()} FDJ
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="kilometrage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Kilométrage au compteur *
                    {selectedVehicle && (
                      <span className="text-muted-foreground ml-2">
                        (actuel: {selectedVehicle.kilometrage_actuel?.toLocaleString()} km)
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  {lastFuelLog && typeRavitaillement === "KILOMETRIQUE" && (
                    <FormDescription>
                      Dernier plein à {lastFuelLog.kilometrage?.toLocaleString()} km
                      {kmParcourus !== null && (
                        <span className={kmAlerte ? "text-destructive font-medium ml-2" : "ml-2"}>
                          ({kmParcourus >= 0 ? `+${kmParcourus}` : kmParcourus} km parcourus)
                        </span>
                      )}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Alerte kilométrage faible */}
            {kmAlerte && typeRavitaillement === "KILOMETRIQUE" && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Alerte kilométrage faible</AlertTitle>
                <AlertDescription>
                  Seulement {kmParcourus} km parcourus depuis le dernier plein. 
                  Cette demande sera signalée pour vérification. 
                  Vous pouvez continuer ou choisir un type de ravitaillement différent.
                </AlertDescription>
              </Alert>
            )}

            {/* Station (lieu/centre) */}
            <FormField
              control={form.control}
              name="location_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Centre de ravitaillement</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un centre" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations?.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.nom} ({l.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="conducteur_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conducteur</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {personnel?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.prenom} {p.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Champs spécifiques aux demandes exceptionnelles */}
            {typeRavitaillement === "EXCEPTIONNEL" && (
              <>
                <FormField
                  control={form.control}
                  name="mission_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description de la mission</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Ex: Mission d'intervention dans la région d'Ali Sabieh..."
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="justification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Justification *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Expliquez pourquoi un ravitaillement exceptionnel est nécessaire..."
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Cette demande sera soumise à validation avant traitement.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="plein_complet"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Plein complet (réservoir rempli au maximum)
                  </FormLabel>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending} 
                className={typeRavitaillement === "EXCEPTIONNEL" 
                  ? "bg-orange-500 hover:bg-orange-600" 
                  : "bg-green-500 hover:bg-green-600"
                }
              >
                {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {typeRavitaillement === "EXCEPTIONNEL" ? "Soumettre pour validation" : "Enregistrer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
