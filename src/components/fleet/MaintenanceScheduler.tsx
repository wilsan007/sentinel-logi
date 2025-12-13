import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Plus,
  Loader2,
  Car,
  CheckCircle,
  Clock,
  AlertTriangle,
  CalendarDays,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

const MAINTENANCE_TYPES = [
  "Vidange huile moteur",
  "Changement filtres",
  "Révision complète",
  "Contrôle freins",
  "Contrôle suspension",
  "Contrôle pneus",
  "Contrôle climatisation",
  "Contrôle batterie",
  "Rotation pneus",
  "Autre",
];

const PRIORITY_OPTIONS = [
  { value: "BASSE", label: "Basse", color: "bg-gray-500/20 text-gray-500" },
  { value: "NORMALE", label: "Normale", color: "bg-blue-500/20 text-blue-500" },
  { value: "HAUTE", label: "Haute", color: "bg-orange-500/20 text-orange-500" },
  { value: "URGENTE", label: "Urgente", color: "bg-red-500/20 text-red-500" },
];

const STATUS_OPTIONS = [
  { value: "PLANIFIE", label: "Planifié", icon: <Clock className="h-3 w-3" /> },
  { value: "CONFIRME", label: "Confirmé", icon: <CheckCircle className="h-3 w-3" /> },
  { value: "EN_COURS", label: "En cours", icon: <Calendar className="h-3 w-3" /> },
  { value: "TERMINE", label: "Terminé", icon: <CheckCircle className="h-3 w-3" /> },
  { value: "REPORTE", label: "Reporté", icon: <AlertTriangle className="h-3 w-3" /> },
  { value: "ANNULE", label: "Annulé", icon: <AlertTriangle className="h-3 w-3" /> },
];

export function MaintenanceScheduler() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_id: "",
    type_entretien: "",
    date_prevue: "",
    kilometrage_prevu: 0,
    priorite: "NORMALE",
    notes: "",
    pieces_requises: [] as string[],
  });
  const [newPiece, setNewPiece] = useState("");

  // Fetch maintenance schedules
  const { data: schedules, isLoading } = useQuery({
    queryKey: ["maintenance-schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_schedules")
        .select(`
          *,
          vehicle:vehicles(immatriculation, marque, modele)
        `)
        .order("date_prevue");
      if (error) throw error;
      return data;
    },
  });

  // Fetch vehicles
  const { data: vehicles } = useQuery({
    queryKey: ["vehicles-for-schedule"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, immatriculation, marque, modele, kilometrage_actuel")
        .eq("status", "OPERATIONNEL")
        .order("immatriculation");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("maintenance_schedules").insert({
        vehicle_id: formData.vehicle_id,
        type_entretien: formData.type_entretien,
        date_prevue: formData.date_prevue,
        kilometrage_prevu: formData.kilometrage_prevu || null,
        priorite: formData.priorite,
        notes: formData.notes || null,
        pieces_requises: formData.pieces_requises.length > 0 ? formData.pieces_requises : null,
        statut: "PLANIFIE",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-schedules"] });
      toast.success("Entretien planifié");
      setShowDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
      const { error } = await supabase
        .from("maintenance_schedules")
        .update({ statut })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-schedules"] });
      toast.success("Statut mis à jour");
    },
    onError: (error: any) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      vehicle_id: "",
      type_entretien: "",
      date_prevue: "",
      kilometrage_prevu: 0,
      priorite: "NORMALE",
      notes: "",
      pieces_requises: [],
    });
    setNewPiece("");
  };

  const addPiece = () => {
    if (newPiece.trim()) {
      setFormData({
        ...formData,
        pieces_requises: [...formData.pieces_requises, newPiece.trim()],
      });
      setNewPiece("");
    }
  };

  const removePiece = (index: number) => {
    setFormData({
      ...formData,
      pieces_requises: formData.pieces_requises.filter((_, i) => i !== index),
    });
  };

  const upcomingSchedules = schedules?.filter(
    (s) => s.statut === "PLANIFIE" || s.statut === "CONFIRME"
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <Card className="glass border-blue-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-blue-500">
            <CalendarDays className="h-5 w-5" />
            Planification des entretiens
          </CardTitle>
          <Button
            onClick={() => setShowDialog(true)}
            className="gap-2 bg-blue-500 hover:bg-blue-600"
          >
            <Plus className="h-4 w-4" />
            Planifier entretien
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {schedules && schedules.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date prévue</TableHead>
                  <TableHead>Véhicule</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Kilométrage prévu</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => {
                  const daysUntil = differenceInDays(
                    new Date(schedule.date_prevue),
                    new Date()
                  );
                  const priority = PRIORITY_OPTIONS.find(
                    (p) => p.value === schedule.priorite
                  );
                  const status = STATUS_OPTIONS.find(
                    (s) => s.value === schedule.statut
                  );

                  return (
                    <TableRow key={schedule.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>
                            {format(new Date(schedule.date_prevue), "dd/MM/yyyy", {
                              locale: fr,
                            })}
                          </span>
                          {daysUntil <= 7 && daysUntil >= 0 && schedule.statut === "PLANIFIE" && (
                            <Badge className="bg-orange-500/20 text-orange-500">
                              {daysUntil === 0 ? "Aujourd'hui" : `J-${daysUntil}`}
                            </Badge>
                          )}
                          {daysUntil < 0 && schedule.statut === "PLANIFIE" && (
                            <Badge className="bg-red-500/20 text-red-500">
                              En retard
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-mono font-bold text-amber-500">
                              {schedule.vehicle?.immatriculation}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {schedule.vehicle?.marque} {schedule.vehicle?.modele}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{schedule.type_entretien}</TableCell>
                      <TableCell>
                        {schedule.kilometrage_prevu
                          ? `${schedule.kilometrage_prevu.toLocaleString()} km`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={priority?.color}>
                          {priority?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={schedule.statut}
                          onValueChange={(val) =>
                            updateStatusMutation.mutate({
                              id: schedule.id,
                              statut: val,
                            })
                          }
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <div className="flex items-center gap-2">
                                  {opt.icon}
                                  {opt.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        {schedule.pieces_requises &&
                          schedule.pieces_requises.length > 0 && (
                            <Badge variant="outline" className="gap-1">
                              {schedule.pieces_requises.length} pièces
                            </Badge>
                          )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun entretien planifié</p>
          </div>
        )}
      </CardContent>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Planifier un entretien</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Véhicule *</Label>
              <Select
                value={formData.vehicle_id}
                onValueChange={(val) =>
                  setFormData({ ...formData, vehicle_id: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un véhicule" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles?.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{v.immatriculation}</span>
                        <span className="text-muted-foreground">
                          {v.marque} {v.modele}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type d'entretien *</Label>
                <Select
                  value={formData.type_entretien}
                  onValueChange={(val) =>
                    setFormData({ ...formData, type_entretien: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {MAINTENANCE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date prévue *</Label>
                <Input
                  type="date"
                  value={formData.date_prevue}
                  onChange={(e) =>
                    setFormData({ ...formData, date_prevue: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kilométrage prévu</Label>
                <Input
                  type="number"
                  value={formData.kilometrage_prevu || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      kilometrage_prevu: Number(e.target.value),
                    })
                  }
                  placeholder="Optionnel"
                />
              </div>
              <div>
                <Label>Priorité</Label>
                <Select
                  value={formData.priorite}
                  onValueChange={(val) =>
                    setFormData({ ...formData, priorite: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <Badge className={opt.color}>{opt.label}</Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Pièces requises</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={newPiece}
                  onChange={(e) => setNewPiece(e.target.value)}
                  placeholder="Ajouter une pièce"
                  onKeyDown={(e) => e.key === "Enter" && addPiece()}
                />
                <Button type="button" onClick={addPiece} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.pieces_requises.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.pieces_requises.map((piece, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-destructive/10"
                      onClick={() => removePiece(index)}
                    >
                      {piece} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Instructions ou remarques..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={
                  saveMutation.isPending ||
                  !formData.vehicle_id ||
                  !formData.type_entretien ||
                  !formData.date_prevue
                }
                className="bg-blue-500 hover:bg-blue-600"
              >
                {saveMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Planifier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
