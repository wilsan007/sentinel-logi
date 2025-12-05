import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldAlert, Clock, CheckCircle, XCircle, Loader2, Send, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AccessRequest {
  id: string;
  reason: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  processed_at: string | null;
}

interface RequestExceptionalAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
}

export function RequestExceptionalAccessDialog({ 
  open, 
  onOpenChange, 
  locationId 
}: RequestExceptionalAccessDialogProps) {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      loadRequests();
    }
  }, [open, locationId]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("exceptional_access_requests")
        .select("*")
        .eq("location_id", locationId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error loading requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Veuillez décrire la raison de l'urgence");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("exceptional_access_requests")
        .insert({
          location_id: locationId,
          requested_by: user?.id,
          reason: reason.trim(),
        });

      if (error) throw error;

      toast.success("Demande d'accès envoyée à l'administration centrale");
      setReason("");
      loadRequests();
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Erreur lors de l'envoi de la demande");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return { label: "En attente", icon: Clock, color: "text-amber-500", bgColor: "bg-amber-500/20" };
      case "approved":
        return { label: "Approuvée", icon: CheckCircle, color: "text-green-500", bgColor: "bg-green-500/20" };
      case "rejected":
        return { label: "Refusée", icon: XCircle, color: "text-red-500", bgColor: "bg-red-500/20" };
      default:
        return { label: status, icon: Clock, color: "text-muted-foreground", bgColor: "bg-muted" };
    }
  };

  const hasPendingRequest = requests.some(r => r.status === "pending");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Demande d'accès exceptionnel
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Info */}
            <Card className="glass border-amber-500/30">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-500">Accès d'urgence</p>
                  <p className="text-muted-foreground mt-1">
                    Cette demande permet de soumettre des demandes en dehors de la fenêtre mensuelle normale (13-15 du mois).
                    L'administration centrale examinera votre demande et vous notifiera de sa décision.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Request Form */}
            {hasPendingRequest ? (
              <Card className="glass border-amber-500/30">
                <CardContent className="p-4 text-center">
                  <Clock className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm text-amber-500 font-medium">
                    Vous avez déjà une demande en attente
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Veuillez attendre la réponse de l'administration
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Raison de l'urgence *</Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Décrivez la situation d'urgence justifiant cette demande d'accès exceptionnel..."
                    rows={4}
                    className="resize-none"
                  />
                </div>
                <Button 
                  onClick={handleSubmit}
                  disabled={submitting || !reason.trim()}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Envoyer la demande
                </Button>
              </div>
            )}

            {/* Previous Requests */}
            {requests.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Historique des demandes</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {requests.map((request) => {
                    const statusConfig = getStatusConfig(request.status);
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <Card key={request.id} className="glass border-border/50">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{request.reason}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(request.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                              </p>
                              {request.admin_response && (
                                <p className="text-xs mt-2 p-2 rounded bg-muted/50 italic">
                                  Réponse: {request.admin_response}
                                </p>
                              )}
                            </div>
                            <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0 gap-1 shrink-0`}>
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
