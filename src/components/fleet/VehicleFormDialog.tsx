import { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { ScrollArea } from "@/components/ui/scroll-area";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];

const vehicleSchema = z.object({
  immatriculation: z.string().min(1, "Immatriculation requise"),
  location_id: z.string().min(1, "Département requis"),
  vehicle_type: z.enum(["VOITURE", "CAMION", "MOTO", "BUS", "UTILITAIRE", "ENGIN_SPECIAL"]),
  marque: z.string().min(1, "Marque requise"),
  annee: z.coerce.number().optional(),
  modele: z.string().min(1, "Modèle requis"),
  vin: z.string().optional(),
  carte_grise_numero: z.string().optional(),
  assurance_dossier_numero: z.string().optional(),
  conducteur_principal_id: z.string().optional(),
  date_mise_en_service: z.string().optional(),
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
  const [authorizedDriverIds, setAuthorizedDriverIds] = useState<string[]>([]);

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      immatriculation: "",
      location_id: "",
      vehicle_type: "VOITURE",
      marque: "",
      modele: "",
    },
  });

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("id, nom").order("nom");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all active personnel
  const { data: personnel } = useQuery({
    queryKey: ["personnel-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personnel")
        .select("id, nom, prenom")
        .eq("actif", true)
        .order("nom");
      if (error) throw error;
      return data;
    },
  });

  // Fetch authorized drivers for existing vehicle
  const { data: existingAuthorizedDrivers } = useQuery({
    queryKey: ["vehicle-authorized-drivers", vehicle?.id],
    queryFn: async () => {
      if (!vehicle?.id) return [];
      const { data, error } = await supabase
        .from("vehicle_authorized_drivers")
        .select("personnel_id")
        .eq("vehicle_id", vehicle.id);
      if (error) throw error;
      return data.map((d) => d.personnel_id);
    },
    enabled: !!vehicle?.id,
  });

  useEffect(() => {
    if (vehicle) {
      form.reset({
        immatriculation: vehicle.immatriculation,
        location_id: vehicle.location_id || "",
        vehicle_type: vehicle.vehicle_type,
        marque: vehicle.marque,
        annee: vehicle.annee || undefined,
        modele: vehicle.modele,
        vin: vehicle.vin || undefined,
        carte_grise_numero: vehicle.carte_grise_numero || undefined,
        assurance_dossier_numero: vehicle.assurance_dossier_numero || undefined,
        conducteur_principal_id: vehicle.conducteur_principal_id || undefined,
        date_mise_en_service: vehicle.date_mise_en_service || undefined,
      });
    } else {
      form.reset({
        immatriculation: "",
        location_id: "",
        vehicle_type: "VOITURE",
        marque: "",
        modele: "",
        date_mise_en_service: undefined,
      });
      setAuthorizedDriverIds([]);
    }
  }, [vehicle, form]);

  useEffect(() => {
    if (existingAuthorizedDrivers) {
      setAuthorizedDriverIds(existingAuthorizedDrivers);
    }
  }, [existingAuthorizedDrivers]);

  const mutation = useMutation({
    mutationFn: async (values: VehicleFormValues) => {
      const payload = {
        immatriculation: values.immatriculation,
        location_id: values.location_id,
        vehicle_type: values.vehicle_type,
        marque: values.marque,
        annee: values.annee || null,
        modele: values.modele,
        vin: values.vin || null,
        carte_grise_numero: values.carte_grise_numero || null,
        assurance_dossier_numero: values.assurance_dossier_numero || null,
        conducteur_principal_id: values.conducteur_principal_id || null,
        date_mise_en_service: values.date_mise_en_service || null,
        // Keep existing fields with defaults
        fuel_type: "DIESEL" as const,
        status: "OPERATIONNEL" as const,
        kilometrage_actuel: vehicle?.kilometrage_actuel || 0,
      };

      let vehicleId: string;

      if (vehicle) {
        const { error } = await supabase.from("vehicles").update(payload).eq("id", vehicle.id);
        if (error) throw error;
        vehicleId = vehicle.id;
      } else {
        const { data, error } = await supabase.from("vehicles").insert([payload]).select("id").single();
        if (error) throw error;
        vehicleId = data.id;
      }

      // Update authorized drivers
      // First delete existing ones
      await supabase.from("vehicle_authorized_drivers").delete().eq("vehicle_id", vehicleId);
      
      // Then insert new ones
      if (authorizedDriverIds.length > 0) {
        const driversToInsert = authorizedDriverIds.map((personnelId) => ({
          vehicle_id: vehicleId,
          personnel_id: personnelId,
        }));
        const { error: driversError } = await supabase
          .from("vehicle_authorized_drivers")
          .insert(driversToInsert);
        if (driversError) throw driversError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-authorized-drivers"] });
      toast({ title: vehicle ? "Véhicule mis à jour" : "Véhicule créé" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const toggleAuthorizedDriver = (personnelId: string) => {
    setAuthorizedDriverIds((prev) =>
      prev.includes(personnelId)
        ? prev.filter((id) => id !== personnelId)
        : [...prev, personnelId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vehicle ? "Modifier le véhicule" : "Nouveau véhicule"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Immatriculation - Primary search field */}
              <FormField
                control={form.control}
                name="immatriculation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Immatriculation *</FormLabel>
                    <FormControl>
                      <Input placeholder="DJ-1234-A" {...field} className="font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Département / Location */}
              <FormField
                control={form.control}
                name="location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Département *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un département" />
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

              {/* Type */}
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

              {/* Marque */}
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

              {/* Année */}
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

              {/* Modèle */}
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

              {/* Numéro de châssis (VIN) */}
              <FormField
                control={form.control}
                name="vin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de châssis</FormLabel>
                    <FormControl>
                      <Input placeholder="JTDBE32K..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Numéro carte grise */}
              <FormField
                control={form.control}
                name="carte_grise_numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>N° Carte grise</FormLabel>
                    <FormControl>
                      <Input placeholder="CG-123456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Numéro dossier assurance */}
              <FormField
                control={form.control}
                name="assurance_dossier_numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>N° Dossier assurance</FormLabel>
                    <FormControl>
                      <Input placeholder="ASS-789012" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date de mise en service */}
              <FormField
                control={form.control}
                name="date_mise_en_service"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de mise en service</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Conducteur principal */}
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

            {/* Conducteurs autorisés */}
            <div className="space-y-2">
              <FormLabel className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Conducteurs autorisés ({authorizedDriverIds.length})
              </FormLabel>
              <ScrollArea className="h-40 rounded-md border p-3">
                <div className="space-y-2">
                  {personnel?.map((p) => (
                    <div key={p.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`driver-${p.id}`}
                        checked={authorizedDriverIds.includes(p.id)}
                        onCheckedChange={() => toggleAuthorizedDriver(p.id)}
                      />
                      <label
                        htmlFor={`driver-${p.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {p.prenom} {p.nom}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

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
