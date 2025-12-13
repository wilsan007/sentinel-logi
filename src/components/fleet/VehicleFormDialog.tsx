import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];

const vehicleSchema = z.object({
  immatriculation: z.string().min(1, "Immatriculation requise"),
  marque: z.string().min(1, "Marque requise"),
  modele: z.string().min(1, "Modèle requis"),
  vehicle_type: z.enum(["VOITURE", "CAMION", "MOTO", "BUS", "UTILITAIRE", "ENGIN_SPECIAL"]),
  fuel_type: z.enum(["ESSENCE", "DIESEL", "GPL"]),
  status: z.enum(["OPERATIONNEL", "EN_MAINTENANCE", "EN_REPARATION", "HORS_SERVICE", "EN_MISSION"]),
  annee: z.coerce.number().optional(),
  couleur: z.string().optional(),
  vin: z.string().optional(),
  capacite_reservoir: z.coerce.number().optional(),
  consommation_moyenne: z.coerce.number().optional(),
  kilometrage_actuel: z.coerce.number().min(0),
  location_id: z.string().optional(),
  conducteur_principal_id: z.string().optional(),
  notes: z.string().optional(),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

interface VehicleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
}

export function VehicleFormDialog({ open, onOpenChange, vehicle }: VehicleFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      immatriculation: "",
      marque: "",
      modele: "",
      vehicle_type: "VOITURE",
      fuel_type: "DIESEL",
      status: "OPERATIONNEL",
      kilometrage_actuel: 0,
    },
  });

  useEffect(() => {
    if (vehicle) {
      form.reset({
        immatriculation: vehicle.immatriculation,
        marque: vehicle.marque,
        modele: vehicle.modele,
        vehicle_type: vehicle.vehicle_type,
        fuel_type: vehicle.fuel_type,
        status: vehicle.status,
        annee: vehicle.annee || undefined,
        couleur: vehicle.couleur || undefined,
        vin: vehicle.vin || undefined,
        capacite_reservoir: vehicle.capacite_reservoir || undefined,
        consommation_moyenne: vehicle.consommation_moyenne ? Number(vehicle.consommation_moyenne) : undefined,
        kilometrage_actuel: vehicle.kilometrage_actuel,
        location_id: vehicle.location_id || undefined,
        conducteur_principal_id: vehicle.conducteur_principal_id || undefined,
        notes: vehicle.notes || undefined,
      });
    } else {
      form.reset({
        immatriculation: "",
        marque: "",
        modele: "",
        vehicle_type: "VOITURE",
        fuel_type: "DIESEL",
        status: "OPERATIONNEL",
        kilometrage_actuel: 0,
      });
    }
  }, [vehicle, form]);

  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("id, nom").order("nom");
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

  const mutation = useMutation({
    mutationFn: async (values: VehicleFormValues) => {
      const payload = {
        immatriculation: values.immatriculation,
        marque: values.marque,
        modele: values.modele,
        vehicle_type: values.vehicle_type,
        fuel_type: values.fuel_type,
        status: values.status,
        annee: values.annee || null,
        couleur: values.couleur || null,
        vin: values.vin || null,
        capacite_reservoir: values.capacite_reservoir || null,
        consommation_moyenne: values.consommation_moyenne || null,
        kilometrage_actuel: values.kilometrage_actuel,
        location_id: values.location_id || null,
        conducteur_principal_id: values.conducteur_principal_id || null,
        notes: values.notes || null,
      };

      if (vehicle) {
        const { error } = await supabase.from("vehicles").update(payload).eq("id", vehicle.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vehicles").insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast({ title: vehicle ? "Véhicule mis à jour" : "Véhicule créé" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vehicle ? "Modifier le véhicule" : "Nouveau véhicule"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="immatriculation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Immatriculation *</FormLabel>
                    <FormControl>
                      <Input placeholder="DJ-1234-A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vehicle_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="VOITURE">Voiture</SelectItem>
                        <SelectItem value="CAMION">Camion</SelectItem>
                        <SelectItem value="MOTO">Moto</SelectItem>
                        <SelectItem value="BUS">Bus</SelectItem>
                        <SelectItem value="UTILITAIRE">Utilitaire</SelectItem>
                        <SelectItem value="ENGIN_SPECIAL">Engin spécial</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="marque"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marque *</FormLabel>
                    <FormControl>
                      <Input placeholder="Toyota" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="modele"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modèle *</FormLabel>
                    <FormControl>
                      <Input placeholder="Land Cruiser" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="annee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Année</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2020" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="couleur"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Couleur</FormLabel>
                    <FormControl>
                      <Input placeholder="Blanc" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fuel_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carburant *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DIESEL">Diesel</SelectItem>
                        <SelectItem value="ESSENCE">Essence</SelectItem>
                        <SelectItem value="GPL">GPL</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="OPERATIONNEL">Opérationnel</SelectItem>
                        <SelectItem value="EN_MAINTENANCE">En maintenance</SelectItem>
                        <SelectItem value="EN_REPARATION">En réparation</SelectItem>
                        <SelectItem value="HORS_SERVICE">Hors service</SelectItem>
                        <SelectItem value="EN_MISSION">En mission</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="kilometrage_actuel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kilométrage actuel *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="50000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro VIN</FormLabel>
                    <FormControl>
                      <Input placeholder="JTDBE32K..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacite_reservoir"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacité réservoir (L)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="80" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="consommation_moyenne"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consommation (L/100km)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="12.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Camp assigné</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un camp" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations?.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.nom}
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
                name="conducteur_principal_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conducteur principal</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un conducteur" />
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
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Remarques sur le véhicule..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="bg-amber-500 hover:bg-amber-600">
                {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {vehicle ? "Mettre à jour" : "Créer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
