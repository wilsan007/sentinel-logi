import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldAlert, Building2, Calendar, Clock, X, Loader2 } from "lucide-react";
import { format, addDays, addHours } from "date-fns";
import { fr } from "date-fns/locale";

interface Location {
  id: string;
  nom: string;
  code: string;
}

interface ExceptionalAccess {
  id: string;
  location_id: string;
  reason: string;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  location?: { nom: string; code: string } | null;
}

interface GrantExceptionalAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GrantExceptionalAccessDialog({ open, onOpenChange }: GrantExceptionalAccessDialogProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeAccesses, setActiveAccesses] = useState<ExceptionalAccess[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<string>("24h");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load locations (excluding Stock Central)
      const { data: locationsData, error: locationsError } = await supabase
        .from("locations")
        .select("id, nom, code")
        .neq("code", "STOCK-CENTRAL")
        .order("nom");

      if (locationsError) throw locationsError;
      setLocations(locationsData || []);

      // Load active exceptional accesses
      const { data: accessesData, error: accessesError } = await supabase
        .from("exceptional_submission_access")
        .select(`
          *,
          location:locations(nom, code)
        `)
        .eq("is_active", true)
        .gte("valid_until", new Date().toISOString())
        .order("valid_until", { ascending: true });

      if (accessesError) throw accessesError;
      setActiveAccesses(accessesData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleGrant = async () => {
    if (!selectedLocation || !reason.trim()) {
      toast.error("Veuillez sélectionner un camp et fournir une raison");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Calculate valid_until based on duration
      let validUntil: Date;
      switch (duration) {
        case "24h":
          validUntil = addHours(new Date(), 24);
          break;
        case "48h":
          validUntil = addHours(new Date(), 48);
          break;
        case "3d":
          validUntil = addDays(new Date(), 3);
          break;
        case "7d":
          validUntil = addDays(new Date(), 7);
          break;
        default:
          validUntil = addHours(new Date(), 24);
      }

      const { error } = await supabase
        .from("exceptional_submission_access")
        .insert({
          location_id: selectedLocation,
          granted_by: user?.id,
          reason: reason.trim(),
          valid_until: validUntil.toISOString(),
        });

      if (error) throw error;

      const locationName = locations.find(l => l.id === selectedLocation)?.nom;
      toast.success(`Accès exceptionnel accordé à ${locationName}`);
      
      // Reset form
      setSelectedLocation("");
      setReason("");
      setDuration("24h");
      
      // Reload data
      loadData();
    } catch (error) {
      console.error("Error granting access:", error);
      toast.error("Erreur lors de l'octroi de l'accès");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (accessId: string) => {
    try {
      const { error } = await supabase
        .from("exceptional_submission_access")
        .update({ is_active: false })
        .eq("id", accessId);

      if (error) throw error;
      toast.success("Accès révoqué");
      loadData();
    } catch (error) {
      console.error("Error revoking access:", error);
      toast.error("Erreur lors de la révocation");
    }
  };

  const getDurationLabel = (d: string) => {
    switch (d) {
      case "24h": return "24 heures";
      case "48h": return "48 heures";
      case "3d": return "3 jours";
      case "7d": return "7 jours";
      default: return d;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Accès Exceptionnel aux Demandes
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Accesses */}
            {activeAccesses.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Accès actifs</h4>
                <div className="space-y-2">
                  {activeAccesses.map((access) => (
                    <Card key={access.id} className="glass border-amber-500/30">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Building2 className="h-4 w-4 text-amber-500" />
                          <div>
                            <p className="font-medium text-sm">{access.location?.nom}</p>
                            <p className="text-xs text-muted-foreground">{access.reason}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Expire {format(new Date(access.valid_until), "dd/MM HH:mm", { locale: fr })}
                            </Badge>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-400 hover:bg-red-500/20"
                            onClick={() => handleRevoke(access.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Grant Form */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Accorder un nouvel accès</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Camp</Label>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un camp" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.nom} ({location.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Durée</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">24 heures</SelectItem>
                      <SelectItem value="48h">48 heures</SelectItem>
                      <SelectItem value="3d">3 jours</SelectItem>
                      <SelectItem value="7d">7 jours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Raison de l'urgence</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Décrivez la raison de cet accès exceptionnel..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button 
            onClick={handleGrant}
            disabled={submitting || !selectedLocation || !reason.trim()}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ShieldAlert className="h-4 w-4 mr-2" />
            )}
            Accorder l'accès
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
