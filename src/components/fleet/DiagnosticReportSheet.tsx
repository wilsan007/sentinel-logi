import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Printer,
  Car,
  User,
  Calendar,
  Wrench,
  CheckCircle,
  AlertTriangle,
  FileText,
  Clock,
  Package,
  DollarSign,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DiagnosticReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagnosticId: string;
}

export function DiagnosticReportSheet({
  open,
  onOpenChange,
  diagnosticId,
}: DiagnosticReportSheetProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch complete diagnostic data
  const { data: diagnostic, isLoading } = useQuery({
    queryKey: ["diagnostic-report", diagnosticId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_diagnostics")
        .select(`
          *,
          mecanicien:personnel!vehicle_diagnostics_mecanicien_id_fkey(id, nom, prenom, grade),
          intake:vehicle_garage_intakes(
            id, 
            motif, 
            motif_precision, 
            impressions_conducteur, 
            date_arrivee, 
            kilometrage_arrivee,
            vehicle:vehicles(
              id, 
              immatriculation, 
              marque, 
              modele, 
              vin,
              annee,
              couleur
            ),
            conducteur:personnel(id, nom, prenom, grade)
          ),
          items:vehicle_diagnostic_items(
            id, 
            severite, 
            notes,
            option:diagnostic_options(nom, category:diagnostic_categories(nom))
          )
        `)
        .eq("id", diagnosticId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && !!diagnosticId,
  });

  // Fetch required parts
  const { data: requiredParts } = useQuery({
    queryKey: ["diagnostic-parts-report", diagnosticId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_repair_parts")
        .select("*, spare_part:spare_parts(nom, reference, categorie)")
        .eq("diagnostic_id", diagnosticId);
      if (error) throw error;
      return data;
    },
    enabled: open && !!diagnosticId,
  });

  // Fetch validator profile
  const { data: validatorProfile } = useQuery({
    queryKey: ["validator-profile", diagnostic?.validated_by],
    queryFn: async () => {
      if (!diagnostic?.validated_by) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", diagnostic.validated_by)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open && !!diagnostic?.validated_by,
  });

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fiche Diagnostic - ${diagnostic?.intake?.vehicle?.immatriculation || "Véhicule"}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 20px;
              color: #1a1a1a;
              font-size: 12px;
              line-height: 1.5;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #1a1a1a;
            }
            .header h1 {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .header p {
              color: #666;
              font-size: 11px;
            }
            .section {
              margin-bottom: 15px;
              padding: 12px;
              border: 1px solid #ddd;
              border-radius: 4px;
            }
            .section-title {
              font-size: 13px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #333;
              display: flex;
              align-items: center;
              gap: 8px;
              padding-bottom: 5px;
              border-bottom: 1px solid #eee;
            }
            .grid-2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }
            .grid-3 {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 12px;
            }
            .field {
              margin-bottom: 8px;
            }
            .field-label {
              font-size: 10px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .field-value {
              font-size: 12px;
              font-weight: 500;
              color: #1a1a1a;
            }
            .comparison-box {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-top: 10px;
            }
            .problem-box {
              padding: 10px;
              border-radius: 4px;
            }
            .reported {
              background: #fff7ed;
              border: 1px solid #fed7aa;
            }
            .diagnosed {
              background: #f0fdf4;
              border: 1px solid #bbf7d0;
            }
            .badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 10px;
              font-size: 10px;
              font-weight: 600;
            }
            .badge-red { background: #fee2e2; color: #dc2626; }
            .badge-orange { background: #ffedd5; color: #ea580c; }
            .badge-yellow { background: #fef9c3; color: #ca8a04; }
            .badge-green { background: #dcfce7; color: #16a34a; }
            .parts-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            .parts-table th, .parts-table td {
              border: 1px solid #ddd;
              padding: 6px 8px;
              text-align: left;
              font-size: 11px;
            }
            .parts-table th {
              background: #f5f5f5;
              font-weight: 600;
            }
            .total-row {
              background: #f0f9ff;
              font-weight: bold;
            }
            .signature-section {
              margin-top: 30px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
            }
            .signature-box {
              border: 1px dashed #999;
              padding: 40px 15px 15px;
              text-align: center;
              min-height: 100px;
            }
            .signature-label {
              font-size: 11px;
              color: #666;
            }
            .footer {
              margin-top: 20px;
              padding-top: 10px;
              border-top: 1px solid #ddd;
              font-size: 10px;
              color: #666;
              text-align: center;
            }
            .match-indicator {
              margin-top: 10px;
              padding: 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 500;
            }
            .match-yes { background: #dcfce7; color: #166534; }
            .match-no { background: #fef3c7; color: #92400e; }
            @media print {
              body { padding: 15px; }
              .section { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!diagnostic) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Diagnostic non trouvé</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const vehicle = diagnostic.intake?.vehicle;
  const intake = diagnostic.intake;
  const conducteur = intake?.conducteur;
  const mecanicien = diagnostic.mecanicien;

  const totalPartsCost = requiredParts?.reduce(
    (sum, p) => sum + (p.prix_estime || 0) * p.quantity_needed,
    0
  ) || 0;

  const severityColors: Record<string, string> = {
    CRITIQUE: "badge-red",
    GRAVE: "badge-orange",
    MOYEN: "badge-yellow",
    FAIBLE: "badge-green",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-amber-500">
            <FileText className="h-5 w-5" />
            Fiche Diagnostic Détaillée
          </DialogTitle>
          <Button onClick={handlePrint} className="gap-2 bg-amber-500 hover:bg-amber-600">
            <Printer className="h-4 w-4" />
            Imprimer
          </Button>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div ref={printRef} className="space-y-4 p-4">
            {/* Header */}
            <div className="header text-center pb-4 border-b-2 border-foreground">
              <h1 className="text-xl font-bold">FICHE DE DIAGNOSTIC VÉHICULE</h1>
              <p className="text-sm text-muted-foreground">
                Référence: DIAG-{diagnostic.id.substring(0, 8).toUpperCase()} | 
                Date d'édition: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })}
              </p>
            </div>

            {/* Section Véhicule */}
            <div className="section glass rounded-lg p-4">
              <div className="section-title flex items-center gap-2 text-amber-500 font-semibold mb-3">
                <Car className="h-4 w-4" />
                Identification du véhicule
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="field">
                  <div className="field-label text-xs text-muted-foreground uppercase">Immatriculation</div>
                  <div className="field-value font-mono font-bold text-lg text-amber-500">
                    {vehicle?.immatriculation || "-"}
                  </div>
                </div>
                <div className="field">
                  <div className="field-label text-xs text-muted-foreground uppercase">Marque / Modèle</div>
                  <div className="field-value font-medium">
                    {vehicle?.marque} {vehicle?.modele}
                  </div>
                </div>
                <div className="field">
                  <div className="field-label text-xs text-muted-foreground uppercase">N° Châssis (VIN)</div>
                  <div className="field-value font-mono text-sm">{vehicle?.vin || "Non renseigné"}</div>
                </div>
                <div className="field">
                  <div className="field-label text-xs text-muted-foreground uppercase">Année / Couleur</div>
                  <div className="field-value">
                    {vehicle?.annee || "-"} {vehicle?.couleur && `/ ${vehicle.couleur}`}
                  </div>
                </div>
              </div>
            </div>

            {/* Section Conducteur et Réception */}
            <div className="section glass rounded-lg p-4">
              <div className="section-title flex items-center gap-2 text-blue-500 font-semibold mb-3">
                <User className="h-4 w-4" />
                Conducteur et Réception
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="field">
                  <div className="field-label text-xs text-muted-foreground uppercase">Conducteur</div>
                  <div className="field-value">
                    {conducteur ? `${conducteur.grade} ${conducteur.prenom} ${conducteur.nom}` : "Non spécifié"}
                  </div>
                </div>
                <div className="field">
                  <div className="field-label text-xs text-muted-foreground uppercase">Date de réception</div>
                  <div className="field-value">
                    {intake?.date_arrivee ? format(new Date(intake.date_arrivee), "dd/MM/yyyy à HH:mm", { locale: fr }) : "-"}
                  </div>
                </div>
                <div className="field">
                  <div className="field-label text-xs text-muted-foreground uppercase">Kilométrage à l'entrée</div>
                  <div className="field-value font-mono">
                    {intake?.kilometrage_arrivee?.toLocaleString()} km
                  </div>
                </div>
                <div className="field">
                  <div className="field-label text-xs text-muted-foreground uppercase">Date du diagnostic</div>
                  <div className="field-value">
                    {diagnostic.diagnostic_date 
                      ? format(new Date(diagnostic.diagnostic_date), "dd/MM/yyyy à HH:mm", { locale: fr })
                      : "-"
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Section Mécanicien et Responsable */}
            <div className="section glass rounded-lg p-4">
              <div className="section-title flex items-center gap-2 text-purple-500 font-semibold mb-3">
                <Wrench className="h-4 w-4" />
                Équipe Diagnostic
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="field">
                  <div className="field-label text-xs text-muted-foreground uppercase">Mécanicien ayant établi le diagnostic</div>
                  <div className="field-value">
                    {mecanicien ? `${mecanicien.grade} ${mecanicien.prenom} ${mecanicien.nom}` : "Non assigné"}
                  </div>
                </div>
                <div className="field">
                  <div className="field-label text-xs text-muted-foreground uppercase">Responsable garage (Validateur)</div>
                  <div className="field-value">
                    {validatorProfile?.nom_complet || (diagnostic.validated_by ? "ID: " + diagnostic.validated_by : "En attente de validation")}
                    {diagnostic.validated_at && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({format(new Date(diagnostic.validated_at), "dd/MM/yyyy", { locale: fr })})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section Comparaison Problème */}
            <div className="section glass rounded-lg p-4">
              <div className="section-title flex items-center gap-2 text-orange-500 font-semibold mb-3">
                <AlertTriangle className="h-4 w-4" />
                Analyse du problème
              </div>
              
              <div className="field mb-3">
                <div className="field-label text-xs text-muted-foreground uppercase">Raison principale d'entrée au garage</div>
                <div className="field-value text-lg">{intake?.motif || "-"}</div>
                {intake?.motif_precision && (
                  <div className="text-sm text-muted-foreground mt-1">Précision: {intake.motif_precision}</div>
                )}
              </div>

              <div className="comparison-box grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="problem-box reported p-3 rounded-lg border border-orange-500/30 bg-orange-500/10">
                  <div className="text-xs font-semibold uppercase mb-2 text-orange-600">
                    Problème signalé par le conducteur
                  </div>
                  <div className="text-sm">
                    {intake?.impressions_conducteur || intake?.motif_precision || intake?.motif || "Aucune description fournie"}
                  </div>
                </div>
                <div className="problem-box diagnosed p-3 rounded-lg border border-green-500/30 bg-green-500/10">
                  <div className="text-xs font-semibold uppercase mb-2 text-green-600">
                    Problème diagnostiqué (réel)
                  </div>
                  <div className="text-sm">
                    {diagnostic.diagnostic_resume || "Non spécifié"}
                  </div>
                </div>
              </div>

              <div className={`match-indicator mt-3 p-3 rounded-lg flex items-center gap-2 ${
                diagnostic.impressions_conducteur_validees 
                  ? "bg-green-500/10 text-green-600 border border-green-500/30" 
                  : "bg-orange-500/10 text-orange-600 border border-orange-500/30"
              }`}>
                {diagnostic.impressions_conducteur_validees ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Le diagnostic confirme le problème signalé par le conducteur</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Écart constaté entre le signalement et le diagnostic réel</span>
                  </>
                )}
              </div>
            </div>

            {/* Problèmes identifiés */}
            {diagnostic.items && diagnostic.items.length > 0 && (
              <div className="section glass rounded-lg p-4">
                <div className="section-title flex items-center gap-2 text-red-500 font-semibold mb-3">
                  <ClipboardCheck className="h-4 w-4" />
                  Problèmes identifiés ({diagnostic.items.length})
                </div>
                <div className="space-y-2">
                  {diagnostic.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-muted/30 border">
                      <div>
                        <span className="font-medium">{item.option?.nom || "Problème"}</span>
                        {item.option?.category?.nom && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({item.option.category.nom})
                          </span>
                        )}
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                        )}
                      </div>
                      <Badge className={`${severityColors[item.severite] || "bg-gray-500/20 text-gray-500"}`}>
                        {item.severite}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action requise et temps */}
            <div className="section glass rounded-lg p-4">
              <div className="section-title flex items-center gap-2 text-green-500 font-semibold mb-3">
                <Wrench className="h-4 w-4" />
                Action requise
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="field">
                  <div className="field-label text-xs text-muted-foreground uppercase">Type de travail</div>
                  <div className="field-value">
                    <Badge className={
                      diagnostic.work_type === "REPARATION" 
                        ? "bg-red-500/20 text-red-500" 
                        : diagnostic.work_type === "ENTRETIEN"
                        ? "bg-blue-500/20 text-blue-500"
                        : "bg-gray-500/20 text-gray-500"
                    }>
                      {diagnostic.work_type || "Non défini"}
                    </Badge>
                  </div>
                </div>
                <div className="field">
                  <div className="field-label text-xs text-muted-foreground uppercase flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Temps estimé
                  </div>
                  <div className="field-value">{diagnostic.estimated_hours || 0} heures</div>
                </div>
                <div className="field">
                  <div className="field-label text-xs text-muted-foreground uppercase">Date fin prévue</div>
                  <div className="field-value">
                    {diagnostic.estimated_completion_date 
                      ? format(new Date(diagnostic.estimated_completion_date), "dd/MM/yyyy", { locale: fr })
                      : "Non définie"
                    }
                  </div>
                </div>
                <div className="field">
                  <div className="field-label text-xs text-muted-foreground uppercase">Statut validation</div>
                  <div className="field-value">
                    <Badge className={
                      diagnostic.validation_status === "VALIDE"
                        ? "bg-green-500/20 text-green-500"
                        : diagnostic.validation_status === "REJETE"
                        ? "bg-red-500/20 text-red-500"
                        : "bg-amber-500/20 text-amber-500"
                    }>
                      {diagnostic.validation_status || "EN_ATTENTE"}
                    </Badge>
                  </div>
                </div>
              </div>
              {diagnostic.validation_notes && (
                <div className="mt-3 p-3 bg-muted/30 rounded-md">
                  <div className="text-xs text-muted-foreground uppercase mb-1">Notes de validation</div>
                  <div className="text-sm">{diagnostic.validation_notes}</div>
                </div>
              )}
            </div>

            {/* Pièces nécessaires */}
            {requiredParts && requiredParts.length > 0 && (
              <div className="section glass rounded-lg p-4">
                <div className="section-title flex items-center gap-2 text-cyan-500 font-semibold mb-3">
                  <Package className="h-4 w-4" />
                  Pièces nécessaires ({requiredParts.length})
                </div>
                <table className="parts-table w-full border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border p-2 text-left text-xs font-semibold">Désignation</th>
                      <th className="border p-2 text-left text-xs font-semibold">Référence</th>
                      <th className="border p-2 text-left text-xs font-semibold">Catégorie</th>
                      <th className="border p-2 text-center text-xs font-semibold">Quantité</th>
                      <th className="border p-2 text-right text-xs font-semibold">Prix unitaire</th>
                      <th className="border p-2 text-right text-xs font-semibold">Total</th>
                      <th className="border p-2 text-center text-xs font-semibold">Disponible</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requiredParts.map((part: any, idx: number) => (
                      <tr key={idx}>
                        <td className="border p-2 text-sm">{part.part_name}</td>
                        <td className="border p-2 text-sm font-mono">{part.spare_part?.reference || "-"}</td>
                        <td className="border p-2 text-sm">{part.spare_part?.categorie || "-"}</td>
                        <td className="border p-2 text-sm text-center">{part.quantity_needed}</td>
                        <td className="border p-2 text-sm text-right">{(part.prix_estime || 0).toLocaleString()} FDJ</td>
                        <td className="border p-2 text-sm text-right font-medium">
                          {((part.prix_estime || 0) * part.quantity_needed).toLocaleString()} FDJ
                        </td>
                        <td className="border p-2 text-center">
                          <Badge className={part.is_available ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}>
                            {part.is_available ? "Oui" : "Non"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    <tr className="total-row bg-amber-500/10">
                      <td colSpan={5} className="border p-2 text-sm font-bold text-right">
                        Coût total estimé des pièces:
                      </td>
                      <td className="border p-2 text-sm font-bold text-right text-amber-600">
                        {totalPartsCost.toLocaleString()} FDJ
                      </td>
                      <td className="border p-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Coût estimatif global */}
            <div className="section glass rounded-lg p-4">
              <div className="section-title flex items-center gap-2 text-amber-500 font-semibold mb-3">
                <DollarSign className="h-4 w-4" />
                Estimation des coûts
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="text-xs text-muted-foreground uppercase">Coût pièces</div>
                  <div className="text-xl font-bold text-cyan-500">{totalPartsCost.toLocaleString()} FDJ</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="text-xs text-muted-foreground uppercase">Main d'œuvre ({diagnostic.estimated_hours || 0}h)</div>
                  <div className="text-xl font-bold text-purple-500">À définir</div>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="text-xs text-muted-foreground uppercase">Total estimé</div>
                  <div className="text-xl font-bold text-amber-500">{totalPartsCost.toLocaleString()} FDJ+</div>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Zone de signatures */}
            <div className="signature-section grid grid-cols-2 gap-8 mt-8">
              <div className="signature-box border-2 border-dashed border-border rounded-lg p-4 min-h-[120px] flex flex-col justify-between">
                <div className="text-xs text-muted-foreground uppercase text-center">
                  Mécanicien
                </div>
                <div className="flex-1"></div>
                <div className="text-center">
                  <div className="text-sm font-medium">
                    {mecanicien ? `${mecanicien.grade} ${mecanicien.prenom} ${mecanicien.nom}` : "________________"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Signature et date</div>
                </div>
              </div>
              <div className="signature-box border-2 border-dashed border-border rounded-lg p-4 min-h-[120px] flex flex-col justify-between">
                <div className="text-xs text-muted-foreground uppercase text-center">
                  Responsable Garage
                </div>
                <div className="flex-1"></div>
                <div className="text-center">
                  <div className="text-sm font-medium">
                    {validatorProfile?.nom_complet || "________________"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Signature et date</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="footer text-center pt-4 border-t mt-6 text-xs text-muted-foreground">
              Document généré le {format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })} | 
              Système de Gestion de Flotte | Référence: DIAG-{diagnostic.id.substring(0, 8).toUpperCase()}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
