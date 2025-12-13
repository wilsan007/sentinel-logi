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
import { Loader2 } from "lucide-react";

const fuelSchema = z.object({
  vehicle_id: z.string().min(1, "Véhicule requis"),
  date_plein: z.string().min(1, "Date requise"),
  litres: z.coerce.number().min(0.1, "Litres requis"),
  prix_litre: z.coerce.number().min(1, "Prix requis"),
  kilometrage: z.coerce.number().min(0, "Kilométrage requis"),
  station: z.string().optional(),
  conducteur_id: z.string().optional(),
  plein_complet: z.boolean().default(true),
});

type FuelFormValues = z.infer<typeof fuelSchema>;

interface FuelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FuelFormDialog({ open, onOpenChange }: FuelFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FuelFormValues>({
    resolver: zodResolver(fuelSchema),
    defaultValues: {
      date_plein: new Date().toISOString().slice(0, 16),
      plein_complet: true,
    },
  });

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

  const { data: personnel } = useQuery({
    queryKey: ["personnel-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("personnel").select("id, nom, prenom").eq("actif", true).order("nom");
      if (error) throw error;
      return data;
    },
  });

  const litres = form.watch("litres") || 0;
  const prixLitre = form.watch("prix_litre") || 0;
  const coutTotal = litres * prixLitre;

  const selectedVehicle = vehicles?.find(v => v.id === form.watch("vehicle_id"));

  const mutation = useMutation({
    mutationFn: async (values: FuelFormValues) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const payload = {
        vehicle_id: values.vehicle_id,
        date_plein: values.date_plein,
        litres: values.litres,
        prix_litre: values.prix_litre,
        cout_total: coutTotal,
        kilometrage: values.kilometrage,
        station: values.station || null,
        conducteur_id: values.conducteur_id || null,
        plein_complet: values.plein_complet,
        enregistre_par: userData.user?.id,
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
      toast({ title: "Plein enregistré" });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau plein de carburant</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="station"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Station</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom de la station" {...field} />
                    </FormControl>
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
            </div>

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

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="bg-green-500 hover:bg-green-600">
                {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
