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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const incidentSchema = z.object({
  vehicle_id: z.string().min(1, "Véhicule requis"),
  date_incident: z.string().min(1, "Date requise"),
  lieu: z.string().optional(),
  description: z.string().min(1, "Description requise"),
  conducteur_responsable_id: z.string().optional(),
  degre_responsabilite: z.string().optional(),
  tiers_implique: z.boolean().default(false),
  tiers_nom: z.string().optional(),
  tiers_contact: z.string().optional(),
  cout_estimation: z.coerce.number().optional(),
  couvert_assurance: z.boolean().default(false),
});

type IncidentFormValues = z.infer<typeof incidentSchema>;

interface IncidentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IncidentFormDialog({ open, onOpenChange }: IncidentFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      date_incident: new Date().toISOString().slice(0, 16),
      tiers_implique: false,
      couvert_assurance: false,
    },
  });

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, immatriculation, marque, modele")
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

  const tiersImplique = form.watch("tiers_implique");

  const mutation = useMutation({
    mutationFn: async (values: IncidentFormValues) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const tiersInfo = values.tiers_implique ? {
        nom: values.tiers_nom || null,
        contact: values.tiers_contact || null,
      } : null;

      const payload = {
        vehicle_id: values.vehicle_id,
        date_incident: values.date_incident,
        lieu: values.lieu || null,
        description: values.description,
        conducteur_responsable_id: values.conducteur_responsable_id || null,
        degre_responsabilite: values.degre_responsabilite || null,
        tiers_implique: values.tiers_implique,
        tiers_info: tiersInfo,
        cout_estimation: values.cout_estimation || null,
        couvert_assurance: values.couvert_assurance,
        status: "DECLARE" as const,
        declare_par: userData.user?.id,
      };

      const { error } = await supabase.from("vehicle_incidents").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-incidents"] });
      toast({ title: "Sinistre déclaré" });
      form.reset();
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
          <DialogTitle>Déclarer un sinistre</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                name="date_incident"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date et heure de l'incident *</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="lieu"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lieu de l'incident</FormLabel>
                  <FormControl>
                    <Input placeholder="Adresse ou description du lieu" {...field} />
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
                  <FormLabel>Description de l'incident *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Décrivez les circonstances de l'incident, les dégâts constatés..." 
                      rows={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="conducteur_responsable_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conducteur au moment de l'incident</FormLabel>
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

              <FormField
                control={form.control}
                name="degre_responsabilite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Degré de responsabilité</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Totale">Totale</SelectItem>
                        <SelectItem value="Partielle">Partielle</SelectItem>
                        <SelectItem value="Aucune">Aucune</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tiers_implique"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Tiers impliqué dans l'incident
                  </FormLabel>
                </FormItem>
              )}
            />

            {tiersImplique && (
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                <FormField
                  control={form.control}
                  name="tiers_nom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du tiers</FormLabel>
                      <FormControl>
                        <Input placeholder="Nom et prénom" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tiers_contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact du tiers</FormLabel>
                      <FormControl>
                        <Input placeholder="Téléphone ou email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cout_estimation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coût estimé des dégâts (FDJ)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="couvert_assurance"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-8">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Couvert par l'assurance
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="bg-orange-500 hover:bg-orange-600">
                {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Déclarer
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
