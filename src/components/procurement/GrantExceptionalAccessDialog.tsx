import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  ShieldAlert, 
  Building2, 
  Calendar, 
  Clock, 
  X, 
  Loader2, 
  CheckCircle, 
  XCircle,
  MessageSquare,
  Bell
} from "lucide-react";
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

interface AccessRequest {
  id: string;
  location_id: string;
  reason: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  location?: { nom: string; code: string } | null;
}

interface GrantExceptionalAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GrantExceptionalAccessDialog({ open, onOpenChange }: GrantExceptionalAccessDialogProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeAccesses, setActiveAccesses] = useState<ExceptionalAccess[]>([]);
  const [pendingRequests, setPendingRequests] = useState<AccessRequest[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<string>("24h");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("requests");

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

      // Load pending access requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("exceptional_access_requests")
        .select(`
          *,
          location:locations(nom, code)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (requestsError) throw requestsError;
      setPendingRequests(requestsData || []);

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

  const handleApproveRequest = async (request: AccessRequest) => {
    setProcessingId(request.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Calculate valid_until (default 48h for approved requests)
      const validUntil = addHours(new Date(), 48);

      // Create the exceptional access
      const { error: accessError } = await supabase
        .from("exceptional_submission_access")
        .insert({
          location_id: request.location_id,
          granted_by: user?.id,
          reason: request.reason,
          valid_until: validUntil.toISOString(),
        });

      if (accessError) throw accessError;

      // Update the request status
      const { error: updateError } = await supabase
        .from("exceptional_access_requests")
        .update({
          status: "approved",
          admin_response: responseText[request.id] || "Demande approuvée",
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (updateError) throw updateError;

      toast.success(`Accès accordé à ${request.location?.nom}`);
      loadData();
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Erreur lors de l'approbation");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (request: AccessRequest) => {
    if (!responseText[request.id]?.trim()) {
      toast.error("Veuillez fournir une raison du refus");
      return;
    }

    setProcessingId(request.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("exceptional_access_requests")
        .update({
          status: "rejected",
          admin_response: responseText[request.id],
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (error) throw error;

      toast.success("Demande refusée");
      loadData();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Erreur lors du refus");
    } finally {
      setProcessingId(null);
    }
  };

  const handleGrantDirect = async () => {
    if (!selectedLocation || !reason.trim()) {
      toast.error("Veuillez sélectionner un camp et fournir une raison");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let validUntil: Date;
      switch (duration) {
        case "24h": validUntil = addHours(new Date(), 24); break;
        case "48h": validUntil = addHours(new Date(), 48); break;
        case "3d": validUntil = addDays(new Date(), 3); break;
        case "7d": validUntil = addDays(new Date(), 7); break;
        default: validUntil = addHours(new Date(), 24);
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
      
      setSelectedLocation("");
      setReason("");
      setDuration("24h");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Gestion des accès exceptionnels
            {pendingRequests.length > 0 && (
              <Badge className="bg-red-500/20 text-red-400 border-0 ml-2">
                {pendingRequests.length} en attente
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="requests" className="gap-2">
                <Bell className="h-4 w-4" />
                Demandes
                {pendingRequests.length > 0 && (
                  <Badge className="bg-red-500 text-white h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {pendingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="active" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Accès actifs ({activeAccesses.length})
              </TabsTrigger>
              <TabsTrigger value="grant" className="gap-2">
                <ShieldAlert className="h-4 w-4" />
                Accorder
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              {/* Pending Requests Tab */}
              <TabsContent value="requests" className="m-0 space-y-3">
                {pendingRequests.length === 0 ? (
                  <Card className="glass border-border/50">
                    <CardContent className="p-8 text-center">
                      <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">Aucune demande en attente</p>
                    </CardContent>
                  </Card>
                ) : (
                  pendingRequests.map((request) => (
                    <Card key={request.id} className="glass border-amber-500/30">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Building2 className="h-5 w-5 text-amber-500" />
                            <div>
                              <p className="font-medium">{request.location?.nom}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(request.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-amber-500/20 text-amber-400 border-0">
                            <Clock className="h-3 w-3 mr-1" />
                            En attente
                          </Badge>
                        </div>
                        
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="text-sm">{request.reason}</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Réponse (obligatoire pour refus)</Label>
                          <Textarea
                            value={responseText[request.id] || ""}
                            onChange={(e) => setResponseText(prev => ({ ...prev, [request.id]: e.target.value }))}
                            placeholder="Votre réponse..."
                            rows={2}
                            className="resize-none text-sm"
                          />
                        </div>

                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10"
                            onClick={() => handleRejectRequest(request)}
                            disabled={processingId === request.id}
                          >
                            {processingId === request.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            Refuser
                          </Button>
                          <Button
                            size="sm"
                            className="gap-1 bg-green-600 hover:bg-green-700"
                            onClick={() => handleApproveRequest(request)}
                            disabled={processingId === request.id}
                          >
                            {processingId === request.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                            Approuver (48h)
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Active Accesses Tab */}
              <TabsContent value="active" className="m-0 space-y-3">
                {activeAccesses.length === 0 ? (
                  <Card className="glass border-border/50">
                    <CardContent className="p-8 text-center">
                      <CheckCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">Aucun accès exceptionnel actif</p>
                    </CardContent>
                  </Card>
                ) : (
                  activeAccesses.map((access) => (
                    <Card key={access.id} className="glass border-green-500/30">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Building2 className="h-4 w-4 text-green-500" />
                          <div>
                            <p className="font-medium text-sm">{access.location?.nom}</p>
                            <p className="text-xs text-muted-foreground">{access.reason}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Expire {format(new Date(access.valid_until), "dd/MM HH:mm", { locale: fr })}
                          </Badge>
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
                  ))
                )}
              </TabsContent>

              {/* Grant Direct Tab */}
              <TabsContent value="grant" className="m-0 space-y-4">
                <Card className="glass border-border/50">
                  <CardContent className="p-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Accorder un accès exceptionnel directement à un camp sans demande préalable.
                    </p>
                    
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
                      <Label>Raison</Label>
                      <Textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Raison de l'accès exceptionnel..."
                        rows={3}
                      />
                    </div>

                    <Button 
                      onClick={handleGrantDirect}
                      disabled={submitting || !selectedLocation || !reason.trim()}
                      className="w-full bg-amber-600 hover:bg-amber-700"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 mr-2" />
                      )}
                      Accorder l'accès
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
