import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, FileText, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentFormDialog } from "./DocumentFormDialog";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Database } from "@/integrations/supabase/types";

type DocumentType = Database["public"]["Enums"]["vehicle_document_type"];

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  ASSURANCE: "Assurance",
  CARTE_GRISE: "Carte grise",
  CONTROLE_TECHNIQUE: "Contrôle technique",
  VIGNETTE: "Vignette",
  AUTRE: "Autre",
};

export function FleetDocumentsManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ["vehicle-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_documents")
        .select(`
          *,
          vehicle:vehicles(immatriculation, marque, modele)
        `)
        .order("date_expiration", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicle_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-documents"] });
      toast({ title: "Document supprimé" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const filteredDocuments = documents?.filter((d: any) =>
    d.vehicle?.immatriculation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.numero_document?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Documents expirant bientôt (dans les 30 jours)
  const expiringDocs = documents?.filter((d: any) => {
    if (!d.date_expiration) return false;
    const days = differenceInDays(new Date(d.date_expiration), new Date());
    return days >= 0 && days <= 30;
  }) || [];

  // Documents expirés
  const expiredDocs = documents?.filter((d: any) => {
    if (!d.date_expiration) return false;
    return differenceInDays(new Date(d.date_expiration), new Date()) < 0;
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alertes */}
      {(expiringDocs.length > 0 || expiredDocs.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {expiredDocs.length > 0 && (
            <Card className="glass border-red-500/30 bg-red-500/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-500 mb-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-bold">Documents expirés ({expiredDocs.length})</span>
                </div>
                <ul className="text-sm space-y-1">
                  {expiredDocs.slice(0, 3).map((d: any) => (
                    <li key={d.id}>
                      {d.vehicle?.immatriculation} - {DOC_TYPE_LABELS[d.document_type as DocumentType]}
                    </li>
                  ))}
                  {expiredDocs.length > 3 && <li>...et {expiredDocs.length - 3} autres</li>}
                </ul>
              </CardContent>
            </Card>
          )}
          {expiringDocs.length > 0 && (
            <Card className="glass border-yellow-500/30 bg-yellow-500/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-yellow-500 mb-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-bold">Expirent sous 30 jours ({expiringDocs.length})</span>
                </div>
                <ul className="text-sm space-y-1">
                  {expiringDocs.slice(0, 3).map((d: any) => (
                    <li key={d.id}>
                      {d.vehicle?.immatriculation} - {DOC_TYPE_LABELS[d.document_type as DocumentType]} 
                      <span className="text-muted-foreground ml-1">
                        ({differenceInDays(new Date(d.date_expiration), new Date())}j)
                      </span>
                    </li>
                  ))}
                  {expiringDocs.length > 3 && <li>...et {expiringDocs.length - 3} autres</li>}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card className="glass border-purple-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-purple-500">
              <FileText className="h-5 w-5" />
              Documents ({documents?.length || 0})
            </CardTitle>
            <Button onClick={() => setShowDialog(true)} className="gap-2 bg-purple-500 hover:bg-purple-600">
              <Plus className="h-4 w-4" />
              Nouveau document
            </Button>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredDocuments && filteredDocuments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Véhicule</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Numéro</TableHead>
                    <TableHead>Émetteur</TableHead>
                    <TableHead>Date émission</TableHead>
                    <TableHead>Date expiration</TableHead>
                    <TableHead>Coût</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((d: any) => {
                    const daysUntilExpiry = d.date_expiration 
                      ? differenceInDays(new Date(d.date_expiration), new Date())
                      : null;
                    const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
                    const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;

                    return (
                      <TableRow key={d.id} className={isExpired ? "bg-red-500/10" : isExpiringSoon ? "bg-yellow-500/10" : ""}>
                        <TableCell className="font-mono">{d.vehicle?.immatriculation}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {DOC_TYPE_LABELS[d.document_type as DocumentType]}
                          </Badge>
                        </TableCell>
                        <TableCell>{d.numero_document || "-"}</TableCell>
                        <TableCell>{d.organisme_emetteur || "-"}</TableCell>
                        <TableCell>
                          {d.date_emission ? format(new Date(d.date_emission), "dd/MM/yyyy", { locale: fr }) : "-"}
                        </TableCell>
                        <TableCell>
                          {d.date_expiration ? (
                            <div className="flex items-center gap-2">
                              <span className={isExpired ? "text-red-500" : isExpiringSoon ? "text-yellow-500" : ""}>
                                {format(new Date(d.date_expiration), "dd/MM/yyyy", { locale: fr })}
                              </span>
                              {isExpired && <Badge className="bg-red-500/20 text-red-500">Expiré</Badge>}
                              {isExpiringSoon && <Badge className="bg-yellow-500/20 text-yellow-500">{daysUntilExpiry}j</Badge>}
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell>{d.cout ? `${Number(d.cout).toLocaleString()} FDJ` : "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(d.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun document enregistré</p>
            </div>
          )}
        </CardContent>
      </Card>

      <DocumentFormDialog open={showDialog} onOpenChange={setShowDialog} />
    </div>
  );
}
