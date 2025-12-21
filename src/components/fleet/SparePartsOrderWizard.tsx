import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Package,
  Plus,
  Minus,
  Car,
  Wrench,
  Search,
  Check,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Truck,
  FileText,
  ShoppingCart,
  Calendar,
  AlertTriangle,
  Sparkles,
  Warehouse,
  ClipboardList,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SupplierSelector } from "@/components/procurement/SupplierSelector";
import type { Database } from "@/integrations/supabase/types";

type TransportMode = Database["public"]["Enums"]["transport_mode"];

const CATEGORIES = [
  "Filtres",
  "Huiles",
  "Freinage",
  "Électrique",
  "Allumage",
  "Courroies",
  "Suspension",
  "Pneumatiques",
  "Transmission",
  "Refroidissement",
  "Carrosserie",
  "Autre",
];

const STEPS = [
  { key: 1, label: "Véhicules", icon: Car },
  { key: 2, label: "Pièces", icon: Package },
  { key: 3, label: "Stock", icon: Warehouse },
  { key: 4, label: "Fournisseur", icon: Truck },
  { key: 5, label: "Détails", icon: FileText },
  { key: 6, label: "Validation", icon: CheckCircle },
];

interface SparePartsOrderWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preselectedRequests?: string[];
}

interface SelectedPart {
  id: string;
  spare_part_id?: string;
  part_name: string;
  part_reference?: string;
  categorie: string;
  quantity: number;
  unit_price: number;
  vehicle_id?: string;
  vehicle_info?: string;
  for_stock: boolean;
  diagnostic_id?: string;
  request_id?: string;
}

interface VehicleWithNeeds {
  id: string;
  immatriculation: string;
  marque: string;
  modele: string;
  needs: { partName: string; source: string; sourceId: string }[];
}

export function SparePartsOrderWizard({
  open,
  onOpenChange,
  onSuccess,
  preselectedRequests,
}: SparePartsOrderWizardProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Step 1: Vehicle selection
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [includeScheduledMaintenance, setIncludeScheduledMaintenance] = useState(true);

  // Step 2: Parts for vehicles
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Step 3: Stock parts
  const [stockParts, setStockParts] = useState<SelectedPart[]>([]);

  // Step 4: Supplier
  const [selectedSupplierId, setSelectedSupplierId] = useState("");

  // Step 5: Order details
  const [orderNumber, setOrderNumber] = useState("");
  const [transportMode, setTransportMode] = useState<TransportMode | "">("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [portOfEntry, setPortOfEntry] = useState("");
  const [currency, setCurrency] = useState("DJF");
  const [notes, setNotes] = useState("");

  // Load vehicles with pending repairs/maintenance
  const { data: vehiclesWithNeeds } = useQuery({
    queryKey: ["vehicles-with-needs-for-order"],
    queryFn: async () => {
      // Get vehicles in repair
      const { data: repairs } = await supabase
        .from("vehicle_repairs")
        .select(`
          id, description, pieces_changees, diagnostic_id, statut,
          vehicle:vehicles(id, immatriculation, marque, modele)
        `)
        .in("statut", ["EN_ATTENTE", "EN_COURS"]);

      // Get scheduled maintenances
      const { data: maintenances } = await supabase
        .from("maintenance_schedules")
        .select(`
          id, type_entretien, pieces_requises, date_prevue,
          vehicle:vehicles(id, immatriculation, marque, modele)
        `)
        .eq("statut", "PLANIFIE")
        .order("date_prevue");

      const vehicleMap = new Map<string, VehicleWithNeeds>();

      repairs?.forEach((repair: any) => {
        if (!repair.vehicle) return;
        const vId = repair.vehicle.id;
        if (!vehicleMap.has(vId)) {
          vehicleMap.set(vId, {
            id: vId,
            immatriculation: repair.vehicle.immatriculation,
            marque: repair.vehicle.marque,
            modele: repair.vehicle.modele,
            needs: [],
          });
        }
        const parts = repair.pieces_changees || [];
        parts.forEach((partName: string) => {
          vehicleMap.get(vId)!.needs.push({
            partName,
            source: "repair",
            sourceId: repair.id,
          });
        });
      });

      maintenances?.forEach((maint: any) => {
        if (!maint.vehicle) return;
        const vId = maint.vehicle.id;
        if (!vehicleMap.has(vId)) {
          vehicleMap.set(vId, {
            id: vId,
            immatriculation: maint.vehicle.immatriculation,
            marque: maint.vehicle.marque,
            modele: maint.vehicle.modele,
            needs: [],
          });
        }
        const parts = maint.pieces_requises || [];
        parts.forEach((partName: string) => {
          vehicleMap.get(vId)!.needs.push({
            partName,
            source: "maintenance",
            sourceId: maint.id,
          });
        });
      });

      return Array.from(vehicleMap.values());
    },
    enabled: open,
  });

  // Load spare parts catalog
  const { data: spareParts } = useQuery({
    queryKey: ["spare-parts-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spare_parts")
        .select("id, nom, reference, categorie, quantite, seuil_alerte, prix_unitaire")
        .order("categorie, nom");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Load pending requests
  const { data: pendingRequests } = useQuery({
    queryKey: ["spare-parts-requests-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spare_parts_requests")
        .select(`
          id, part_name, part_reference, categorie, quantite_demandee,
          vehicle_id, diagnostic_id, spare_part_id,
          vehicle:vehicles(immatriculation, marque, modele)
        `)
        .eq("statut", "approuve")
        .order("date_demande");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Low stock parts
  const lowStockParts = useMemo(() => {
    if (!spareParts) return [];
    return spareParts.filter((p) => p.quantite <= (p.seuil_alerte || 5));
  }, [spareParts]);

  // Filtered parts for search
  const filteredParts = useMemo(() => {
    if (!spareParts) return [];
    return spareParts.filter((part) => {
      const matchesSearch =
        !searchTerm ||
        part.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.reference.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || part.categorie === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [spareParts, searchTerm, selectedCategory]);

  useEffect(() => {
    if (open) {
      resetWizard();
      // Pre-select requests if provided
      if (preselectedRequests?.length) {
        // Load these requests and add to parts
      }
    }
  }, [open, preselectedRequests]);

  const resetWizard = () => {
    setStep(1);
    setSelectedVehicleIds([]);
    setSelectedParts([]);
    setStockParts([]);
    setSelectedSupplierId("");
    setTransportMode("");
    setExpectedDeliveryDate("");
    setPortOfEntry("");
    setNotes("");
    setSearchTerm("");
    setSelectedCategory("all");
    generateOrderNumber();
  };

  const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    setOrderNumber(`PDR-${year}${month}-${random}`);
  };

  const toggleVehicle = (vehicleId: string) => {
    setSelectedVehicleIds((prev) =>
      prev.includes(vehicleId)
        ? prev.filter((id) => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  const loadPartsForSelectedVehicles = () => {
    if (!vehiclesWithNeeds) return;
    
    const parts: SelectedPart[] = [];
    
    vehiclesWithNeeds
      .filter((v) => selectedVehicleIds.includes(v.id))
      .forEach((vehicle) => {
        vehicle.needs.forEach((need, idx) => {
          // Check if part exists in catalog
          const catalogPart = spareParts?.find(
            (p) => p.nom.toLowerCase() === need.partName.toLowerCase()
          );
          
          parts.push({
            id: `${vehicle.id}-${idx}-${Date.now()}`,
            spare_part_id: catalogPart?.id,
            part_name: need.partName,
            part_reference: catalogPart?.reference || "",
            categorie: catalogPart?.categorie || "Autre",
            quantity: 1,
            unit_price: catalogPart?.prix_unitaire || 0,
            vehicle_id: vehicle.id,
            vehicle_info: `${vehicle.immatriculation} - ${vehicle.marque} ${vehicle.modele}`,
            for_stock: false,
            diagnostic_id: need.source === "repair" ? need.sourceId : undefined,
          });
        });
      });
    
    setSelectedParts(parts);
    setStep(2);
  };

  const addPartToVehicle = (part: any, vehicleId?: string) => {
    const vehicle = vehiclesWithNeeds?.find((v) => v.id === vehicleId);
    
    setSelectedParts((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        spare_part_id: part.id,
        part_name: part.nom,
        part_reference: part.reference,
        categorie: part.categorie,
        quantity: 1,
        unit_price: part.prix_unitaire || 0,
        vehicle_id: vehicleId,
        vehicle_info: vehicle
          ? `${vehicle.immatriculation} - ${vehicle.marque} ${vehicle.modele}`
          : undefined,
        for_stock: false,
      },
    ]);
  };

  const addStockPart = (part: any, quantity: number = 10) => {
    const existing = stockParts.find((p) => p.spare_part_id === part.id);
    if (existing) {
      setStockParts((prev) =>
        prev.map((p) =>
          p.spare_part_id === part.id
            ? { ...p, quantity: p.quantity + quantity }
            : p
        )
      );
    } else {
      setStockParts((prev) => [
        ...prev,
        {
          id: `stock-${Date.now()}`,
          spare_part_id: part.id,
          part_name: part.nom,
          part_reference: part.reference,
          categorie: part.categorie,
          quantity,
          unit_price: part.prix_unitaire || 0,
          for_stock: true,
        },
      ]);
    }
  };

  const updatePartQuantity = (partId: string, quantity: number, forStock: boolean) => {
    if (forStock) {
      setStockParts((prev) =>
        prev.map((p) => (p.id === partId ? { ...p, quantity: Math.max(1, quantity) } : p))
      );
    } else {
      setSelectedParts((prev) =>
        prev.map((p) => (p.id === partId ? { ...p, quantity: Math.max(1, quantity) } : p))
      );
    }
  };

  const updatePartPrice = (partId: string, price: number, forStock: boolean) => {
    if (forStock) {
      setStockParts((prev) =>
        prev.map((p) => (p.id === partId ? { ...p, unit_price: price } : p))
      );
    } else {
      setSelectedParts((prev) =>
        prev.map((p) => (p.id === partId ? { ...p, unit_price: price } : p))
      );
    }
  };

  const removePart = (partId: string, forStock: boolean) => {
    if (forStock) {
      setStockParts((prev) => prev.filter((p) => p.id !== partId));
    } else {
      setSelectedParts((prev) => prev.filter((p) => p.id !== partId));
    }
  };

  const addFromPendingRequest = (request: any) => {
    setSelectedParts((prev) => [
      ...prev,
      {
        id: `req-${request.id}`,
        spare_part_id: request.spare_part_id,
        part_name: request.part_name,
        part_reference: request.part_reference || "",
        categorie: request.categorie,
        quantity: request.quantite_demandee,
        unit_price: 0,
        vehicle_id: request.vehicle_id,
        vehicle_info: request.vehicle
          ? `${request.vehicle.immatriculation} - ${request.vehicle.marque} ${request.vehicle.modele}`
          : undefined,
        for_stock: false,
        request_id: request.id,
      },
    ]);
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return selectedVehicleIds.length > 0 || includeScheduledMaintenance;
      case 2:
        return selectedParts.length > 0;
      case 3:
        return true; // Stock parts optional
      case 4:
        return true; // Supplier optional
      case 5:
        return orderNumber.trim() !== "";
      case 6:
        return true;
      default:
        return false;
    }
  };

  const handleCreateOrder = async () => {
    if (!orderNumber.trim()) {
      toast.error("Numéro de commande requis");
      return;
    }
    if (selectedParts.length === 0 && stockParts.length === 0) {
      toast.error("Ajoutez au moins une pièce");
      return;
    }

    setCreating(true);
    try {
      const user = await supabase.auth.getUser();
      
      // Get Stock Central location
      const { data: stockCentral } = await supabase
        .from("locations")
        .select("id")
        .eq("code", "SC-000")
        .single();

      const locationId = stockCentral?.id;
      if (!locationId) throw new Error("Stock Central non trouvé");

      const allParts = [...selectedParts, ...stockParts];
      const totalAmount = allParts.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0
      );

      // Create procurement order
      const { data: order, error: orderError } = await supabase
        .from("procurement_orders")
        .insert([
          {
            order_number: orderNumber,
            location_id: locationId,
            created_by: user.data.user?.id,
            supplier_id: selectedSupplierId || null,
            transport_mode: (transportMode || null) as TransportMode | null,
            expected_delivery_date: expectedDeliveryDate || null,
            port_of_entry: portOfEntry || null,
            notes: notes
              ? `[PIÈCES DÉTACHÉES] ${notes}\n\nPièces pour véhicules: ${selectedParts.length}\nPièces pour stock: ${stockParts.length}`
              : `[PIÈCES DÉTACHÉES] Pièces pour véhicules: ${selectedParts.length}, Pièces pour stock: ${stockParts.length}`,
            stage: selectedSupplierId ? "SUPPLIER_SELECTION" : "DRAFT",
            total_amount: totalAmount,
            currency: currency,
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create linked spare parts requests for vehicle parts (not stock parts)
      for (const part of selectedParts) {
        if (part.request_id) {
          // Update existing request to "commande"
          await supabase
            .from("spare_parts_requests")
            .update({
              statut: "commande",
              date_traitement: new Date().toISOString(),
            })
            .eq("id", part.request_id);
        } else {
          // Create new request linked to order
          await supabase.from("spare_parts_requests").insert({
            spare_part_id: part.spare_part_id || null,
            part_name: part.part_name,
            part_reference: part.part_reference || null,
            categorie: part.categorie,
            quantite_demandee: part.quantity,
            urgence: "NORMALE",
            vehicle_id: part.vehicle_id || null,
            diagnostic_id: part.diagnostic_id || null,
            statut: "commande",
            demande_par: user.data.user?.id,
            notes: `Commande: ${orderNumber}`,
          });
        }
      }

      toast.success(`Commande ${orderNumber} créée avec ${allParts.length} pièces`);
      queryClient.invalidateQueries({ queryKey: ["spare-parts-requests"] });
      queryClient.invalidateQueries({ queryKey: ["procurement-orders"] });
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setCreating(false);
    }
  };

  const allParts = [...selectedParts, ...stockParts];
  const totalAmount = allParts.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  const vehiclePartsCount = selectedParts.length;
  const stockPartsCount = stockParts.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border border-orange-500/20 max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            <span className="text-orange-500">Assistant Commande Pièces Détachées</span>
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-between px-2 py-3 bg-muted/30 rounded-lg overflow-x-auto">
          {STEPS.map((s, index) => {
            const Icon = s.icon;
            const isActive = step === s.key;
            const isComplete = step > s.key;

            return (
              <div key={s.key} className="flex items-center">
                <div className="flex flex-col items-center min-w-[60px]">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isComplete
                        ? "bg-orange-500 text-white"
                        : isActive
                        ? "bg-orange-500/20 text-orange-500 ring-2 ring-orange-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] mt-1 ${
                      isActive ? "text-orange-500 font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-1 rounded ${
                      isComplete ? "bg-orange-500" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <AnimatePresence mode="wait">
            {/* Step 1: Select Vehicles */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Sélectionner les véhicules
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Choisissez les véhicules en réparation ou entretien pour
                    lesquels commander des pièces
                  </p>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Checkbox
                    id="includeScheduled"
                    checked={includeScheduledMaintenance}
                    onCheckedChange={(v) => setIncludeScheduledMaintenance(!!v)}
                  />
                  <Label htmlFor="includeScheduled" className="cursor-pointer">
                    Inclure les entretiens planifiés (sans véhicule spécifique)
                  </Label>
                </div>

                <ScrollArea className="h-[400px] pr-4">
                  {vehiclesWithNeeds && vehiclesWithNeeds.length > 0 ? (
                    <div className="space-y-2">
                      {vehiclesWithNeeds.map((vehicle) => (
                        <Card
                          key={vehicle.id}
                          className={`cursor-pointer transition-all ${
                            selectedVehicleIds.includes(vehicle.id)
                              ? "border-orange-500 bg-orange-500/10"
                              : "border-border/50 hover:border-orange-500/50"
                          }`}
                          onClick={() => toggleVehicle(vehicle.id)}
                        >
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-orange-500/20">
                                <Car className="h-5 w-5 text-orange-500" />
                              </div>
                              <div>
                                <p className="font-medium">
                                  {vehicle.immatriculation}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {vehicle.marque} {vehicle.modele}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="bg-amber-500/10 text-amber-500 border-amber-500/30"
                              >
                                {vehicle.needs.length} pièce
                                {vehicle.needs.length > 1 ? "s" : ""} requise
                                {vehicle.needs.length > 1 ? "s" : ""}
                              </Badge>
                              {selectedVehicleIds.includes(vehicle.id) && (
                                <Check className="h-5 w-5 text-orange-500" />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Car className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Aucun véhicule en attente de pièces</p>
                    </div>
                  )}
                </ScrollArea>

                {/* Pending approved requests */}
                {pendingRequests && pendingRequests.length > 0 && (
                  <Card className="border-purple-500/30 bg-purple-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-purple-500">
                        <ClipboardList className="h-4 w-4" />
                        Demandes approuvées en attente ({pendingRequests.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[150px] overflow-y-auto">
                      {pendingRequests.slice(0, 5).map((req: any) => (
                        <div
                          key={req.id}
                          className="flex items-center justify-between p-2 rounded bg-background/50"
                        >
                          <div>
                            <p className="text-sm font-medium">{req.part_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {req.vehicle?.immatriculation || "Stock"} • Qté:{" "}
                              {req.quantite_demandee}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              addFromPendingRequest(req);
                            }}
                            className="text-purple-500"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}

            {/* Step 2: Parts for Vehicles */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Pièces pour véhicules
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Ces pièces seront utilisées directement et ne seront pas
                    ajoutées au stock
                  </p>
                </div>

                {/* Selected parts list */}
                {selectedParts.length > 0 && (
                  <Card className="border-orange-500/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-orange-500" />
                        Pièces sélectionnées ({selectedParts.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[250px] overflow-y-auto">
                      {selectedParts.map((part) => (
                        <div
                          key={part.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{part.part_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {part.vehicle_info || "Sans véhicule"} •{" "}
                              {part.categorie}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() =>
                                  updatePartQuantity(part.id, part.quantity - 1, false)
                                }
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                value={part.quantity}
                                onChange={(e) =>
                                  updatePartQuantity(
                                    part.id,
                                    parseInt(e.target.value) || 1,
                                    false
                                  )
                                }
                                className="w-14 h-7 text-center text-sm"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() =>
                                  updatePartQuantity(part.id, part.quantity + 1, false)
                                }
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <Input
                              type="number"
                              placeholder="Prix"
                              value={part.unit_price || ""}
                              onChange={(e) =>
                                updatePartPrice(
                                  part.id,
                                  parseFloat(e.target.value) || 0,
                                  false
                                )
                              }
                              className="w-24 h-7 text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500"
                              onClick={() => removePart(part.id, false)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Add more parts */}
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Ajouter des pièces du catalogue
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Rechercher..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes</SelectItem>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <ScrollArea className="h-[200px]">
                      <div className="grid grid-cols-2 gap-2">
                        {filteredParts.slice(0, 20).map((part) => (
                          <Card
                            key={part.id}
                            className="cursor-pointer border-border/50 hover:border-orange-500/50 transition-all"
                            onClick={() =>
                              addPartToVehicle(
                                part,
                                selectedVehicleIds[0] || undefined
                              )
                            }
                          >
                            <CardContent className="p-3">
                              <p className="font-medium text-sm truncate">
                                {part.nom}
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-muted-foreground">
                                  {part.categorie}
                                </p>
                                <Badge
                                  className={
                                    part.quantite <= 0
                                      ? "bg-red-500/20 text-red-500"
                                      : part.quantite <= 5
                                      ? "bg-amber-500/20 text-amber-500"
                                      : "bg-green-500/20 text-green-500"
                                  }
                                >
                                  {part.quantite}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 3: Stock Parts */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Pièces supplémentaires pour le stock
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Profitez de cette commande pour réapprovisionner le stock
                  </p>
                </div>

                {/* Low stock alert */}
                {lowStockParts.length > 0 && (
                  <Card className="border-amber-500/30 bg-amber-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-amber-500">
                        <AlertTriangle className="h-4 w-4" />
                        Stock faible ({lowStockParts.length} pièces)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[150px] overflow-y-auto">
                      {lowStockParts.map((part) => (
                        <div
                          key={part.id}
                          className="flex items-center justify-between p-2 rounded bg-background/50"
                        >
                          <div>
                            <p className="text-sm font-medium">{part.nom}</p>
                            <p className="text-xs text-muted-foreground">
                              Stock: {part.quantite} / Seuil:{" "}
                              {part.seuil_alerte || 5}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addStockPart(part, 10)}
                            className="text-amber-500 border-amber-500/30"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            +10
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Selected stock parts */}
                {stockParts.length > 0 && (
                  <Card className="border-green-500/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-green-500" />
                        Pièces pour stock ({stockParts.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[200px] overflow-y-auto">
                      {stockParts.map((part) => (
                        <div
                          key={part.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                        >
                          <div>
                            <p className="font-medium text-sm">{part.part_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {part.categorie}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() =>
                                  updatePartQuantity(part.id, part.quantity - 1, true)
                                }
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                value={part.quantity}
                                onChange={(e) =>
                                  updatePartQuantity(
                                    part.id,
                                    parseInt(e.target.value) || 1,
                                    true
                                  )
                                }
                                className="w-14 h-7 text-center text-sm"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() =>
                                  updatePartQuantity(part.id, part.quantity + 1, true)
                                }
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <Input
                              type="number"
                              placeholder="Prix"
                              value={part.unit_price || ""}
                              onChange={(e) =>
                                updatePartPrice(
                                  part.id,
                                  parseFloat(e.target.value) || 0,
                                  true
                                )
                              }
                              className="w-24 h-7 text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500"
                              onClick={() => removePart(part.id, true)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Add from catalog */}
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Ajouter au stock depuis le catalogue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      onValueChange={(value) => {
                        const part = spareParts?.find((p) => p.id === value);
                        if (part) addStockPart(part, 10);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une pièce..." />
                      </SelectTrigger>
                      <SelectContent>
                        {spareParts?.map((part) => (
                          <SelectItem key={part.id} value={part.id}>
                            {part.nom} - {part.categorie} (Stock: {part.quantite})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 4: Supplier */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Sélectionner un fournisseur
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Optionnel - vous pourrez le sélectionner plus tard
                  </p>
                </div>

                <SupplierSelector
                  selectedSupplierId={selectedSupplierId}
                  onSupplierSelect={setSelectedSupplierId}
                />
              </motion.div>
            )}

            {/* Step 5: Order Details */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-2">Détails de la commande</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Numéro de commande *</Label>
                    <Input
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="PDR-YYYYMM-XXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Devise</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DJF">DJF</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Mode de transport</Label>
                    <Select
                      value={transportMode}
                      onValueChange={(v) => setTransportMode(v as TransportMode)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AIR">Aérien</SelectItem>
                        <SelectItem value="SEA">Maritime</SelectItem>
                        <SelectItem value="ROAD">Routier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date de livraison prévue</Label>
                    <Input
                      type="date"
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Port d'entrée</Label>
                    <Input
                      value={portOfEntry}
                      onChange={(e) => setPortOfEntry(e.target.value)}
                      placeholder="Ex: Port de Djibouti"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notes supplémentaires..."
                      rows={3}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 6: Validation */}
            {step === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-2">Récapitulatif</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-orange-500/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-orange-500" />
                        Pièces pour véhicules
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-orange-500">
                        {vehiclePartsCount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Utilisées directement
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-green-500/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-green-500" />
                        Pièces pour stock
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-green-500">
                        {stockPartsCount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ajoutées au stock
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-border/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Numéro de commande
                      </span>
                      <span className="font-medium">{orderNumber}</span>
                    </div>
                    {selectedSupplierId && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fournisseur</span>
                        <span className="font-medium">Sélectionné</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total pièces</span>
                      <span className="font-medium">
                        {vehiclePartsCount + stockPartsCount}
                      </span>
                    </div>
                    <div className="border-t pt-3 flex justify-between">
                      <span className="font-medium">Montant total estimé</span>
                      <span className="text-xl font-bold text-orange-500">
                        {totalAmount.toLocaleString()} {currency}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <p className="text-sm text-blue-400">
                    <strong>Note:</strong> Cette commande sera créée dans le module
                    Procurement et suivra le workflow standard (Brouillon →
                    Fournisseur → Devis → Commande → Livraison).
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <Button
            variant="outline"
            onClick={() => (step > 1 ? setStep(step - 1) : onOpenChange(false))}
            disabled={creating}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step > 1 ? "Précédent" : "Annuler"}
          </Button>

          <div className="flex items-center gap-2">
            {allParts.length > 0 && (
              <Badge variant="outline" className="text-orange-500 border-orange-500/30">
                <ShoppingCart className="h-3 w-3 mr-1" />
                {allParts.length} pièce{allParts.length > 1 ? "s" : ""} •{" "}
                {totalAmount.toLocaleString()} {currency}
              </Badge>
            )}
          </div>

          {step < 6 ? (
            <Button
              onClick={() => {
                if (step === 1 && selectedVehicleIds.length > 0) {
                  loadPartsForSelectedVehicles();
                } else {
                  setStep(step + 1);
                }
              }}
              disabled={!canProceed()}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Suivant
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleCreateOrder}
              disabled={creating || (selectedParts.length === 0 && stockParts.length === 0)}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Créer la commande
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
