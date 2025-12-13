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

const repairSchema = z.object({
  vehicle_id: z.string().min(1, "Véhicule requis"),
  repair_type: z.enum(["LEGERE", "LOURDE"]),
  date_debut: z.string().min(1, "Date requise"),
  description: z.string().min(1, "Description requise"),
  pieces_changees: z.string().optional(),
  cout_pieces: z.coerce.number().optional(),
  cout_main_oeuvre: z.coerce.number().optional(),
  garage: z.string().optional(),
  kilometrage: z.coerce.number().optional(),
});

type RepairFormValues = z.infer<typeof repairSchema>;

interface RepairFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RepairFormDialog({ open, onOpenChange }: RepairFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<RepairFormValues>({
    resolver: zodResolver(repairSchema),
    defaultValues: {
      repair_type: "LEGERE",
      date_debut: new Date().toISOString().split("T")[0],
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

  const coutPieces = form.watch("cout_pieces") || 0;
  const coutMainOeuvre = form.watch("cout_main_oeuvre") || 0;
  const coutTotal = coutPieces + coutMainOeuvre;

  const mutation = useMutation({
    mutationFn: async (values: RepairFormValues) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const piecesArray = values.pieces_changees 
        ? values.pieces_changees.split(",").map(p => p.trim()).filter(Boolean)
        : null;

      const payload = {
        vehicle_id: values.vehicle_id,
        repair_type: values.repair_type,
        date_debut: values.date_debut,
        description: values.description,
        pieces_changees: piecesArray,
        cout_pieces: values.cout_pieces || null,
        cout_main_oeuvre: values.cout_main_oeuvre || null,
        cout_total: coutTotal || null,
        garage: values.garage || null,
        kilometrage: values.kilometrage || null,
        effectue_par: userData.user?.id,
        est_termine: false,
      };

      const { error } = await supabase.from("vehicle_repairs").insert(payload);
      if (error) throw error;

      // Mettre à jour le statut du véhicule
      await supabase.from("vehicles").update({ status: "EN_REPARATION" }).eq("id", values.vehicle_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast({ title: "Réparation enregistrée" });
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
          <DialogTitle>Nouvelle réparation</DialogTitle>
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
                name="repair_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de réparation *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LEGERE">Légère</SelectItem>
                        <SelectItem value="LOURDE">Lourde</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date_debut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de début *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description du problème *</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Décrivez le problème et les travaux nécessaires..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pieces_changees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pièces changées (séparées par des virgules)</FormLabel>
                  <FormControl>
                    <Input placeholder="Filtre à huile, courroie, ..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="cout_pieces"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coût pièces (FDJ)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cout_main_oeuvre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Main d'œuvre (FDJ)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Total</FormLabel>
                <div className="h-10 flex items-center px-3 rounded-md border bg-muted/50 font-medium">
                  {coutTotal.toLocaleString()} FDJ
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="garage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Garage</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom du garage" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="kilometrage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kilométrage</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Kilométrage actuel" {...field} />
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
              <Button type="submit" disabled={mutation.isPending} className="bg-red-500 hover:bg-red-600">
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
