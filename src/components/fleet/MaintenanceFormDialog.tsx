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

const maintenanceSchema = z.object({
  vehicle_id: z.string().min(1, "Véhicule requis"),
  date_entretien: z.string().min(1, "Date requise"),
  type_entretien: z.string().min(1, "Type requis"),
  description: z.string().optional(),
  kilometrage: z.coerce.number().min(0, "Kilométrage invalide"),
  cout: z.coerce.number().optional(),
  prestataire: z.string().optional(),
  prochain_entretien_km: z.coerce.number().optional(),
  prochain_entretien_date: z.string().optional(),
});

type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;

interface MaintenanceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ENTRETIEN_TYPES = [
  "Vidange huile moteur",
  "Changement filtres",
  "Changement pneus",
  "Révision freins",
  "Climatisation",
  "Batterie",
  "Courroie distribution",
  "Révision générale",
  "Autre",
];

export function MaintenanceFormDialog({ open, onOpenChange }: MaintenanceFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      date_entretien: new Date().toISOString().split("T")[0],
      kilometrage: 0,
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

  const mutation = useMutation({
    mutationFn: async (values: MaintenanceFormValues) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const payload = {
        vehicle_id: values.vehicle_id,
        date_entretien: values.date_entretien,
        type_entretien: values.type_entretien,
        description: values.description || null,
        kilometrage: values.kilometrage,
        cout: values.cout || null,
        prestataire: values.prestataire || null,
        prochain_entretien_km: values.prochain_entretien_km || null,
        prochain_entretien_date: values.prochain_entretien_date || null,
        effectue_par: userData.user?.id,
      };

      const { error } = await supabase.from("vehicle_maintenances").insert([payload]);
      if (error) throw error;

      // Mettre à jour le kilométrage du véhicule si supérieur
      const vehicle = vehicles?.find(v => v.id === values.vehicle_id);
      if (vehicle && values.kilometrage > (vehicle.kilometrage_actuel || 0)) {
        await supabase.from("vehicles").update({ kilometrage_actuel: values.kilometrage }).eq("id", values.vehicle_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-maintenances"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast({ title: "Entretien enregistré" });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const selectedVehicle = vehicles?.find(v => v.id === form.watch("vehicle_id"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvel entretien</DialogTitle>
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date_entretien"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type_entretien"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Type d'entretien" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ENTRETIEN_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="kilometrage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kilométrage * {selectedVehicle && <span className="text-muted-foreground">(actuel: {selectedVehicle.kilometrage_actuel?.toLocaleString()} km)</span>}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cout"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coût (FDJ)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="prestataire"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prestataire</FormLabel>
                  <FormControl>
                    <Input placeholder="Nom du garage ou prestataire" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Détails de l'entretien..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="prochain_entretien_km"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prochain entretien (km)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ex: 60000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prochain_entretien_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prochain entretien (date)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="bg-blue-500 hover:bg-blue-600">
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
