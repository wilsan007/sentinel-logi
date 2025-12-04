import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Search, 
  Clock, 
  AlertTriangle, 
  RotateCcw, 
  Filter,
  ChevronDown,
  Calendar,
  User,
  Package
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReturnLoanDialog } from "./ReturnLoanDialog";

interface LoansManagerProps {
  locationId: string;
}

type Loan = {
  id: string;
  date_attribution: string;
  expected_return_date: string;
  actual_return_date: string | null;
  quantite: number;
  motif: string;
  notes: string | null;
  is_active: boolean;
  personnel: {
    nom: string;
    prenom: string;
    matricule: string;
  };
  item_variants: {
    taille: string | null;
    couleur: string | null;
    stock_items: {
      type: string;
      sous_type: string | null;
    };
  };
};

export function LoansManager({ locationId }: LoansManagerProps) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "overdue" | "returned">("all");
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (locationId) {
      loadLoans();
    }
  }, [locationId]);

  const loadLoans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("allocations")
      .select(`
        *,
        personnel (nom, prenom, matricule),
        item_variants (
          taille,
          couleur,
          stock_items (type, sous_type)
        )
      `)
      .eq("transaction_type", "LOAN")
      .order("expected_return_date", { ascending: true });

    if (error) {
      toast({ title: "Erreur", description: "Impossible de charger les prêts", variant: "destructive" });
    } else {
      setLoans(data || []);
    }
    setLoading(false);
  };

  const getStatus = (loan: Loan) => {
    if (loan.actual_return_date) return "returned";
    if (new Date(loan.expected_return_date) < new Date()) return "overdue";
    return "active";
  };

  const filteredLoans = loans.filter(loan => {
    const status = getStatus(loan);
    const matchesSearch = 
      loan.personnel?.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.personnel?.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.personnel?.matricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.item_variants?.stock_items?.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      filterStatus === "all" || status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: loans.filter(l => !l.actual_return_date).length,
    overdue: loans.filter(l => !l.actual_return_date && new Date(l.expected_return_date) < new Date()).length,
    returned: loans.filter(l => l.actual_return_date).length
  };

  const handleReturnClick = (loan: Loan) => {
    setSelectedLoan(loan);
    setReturnDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card 
            className={`glass p-6 cursor-pointer hover:bg-muted/10 transition-colors ${filterStatus === "active" ? "border-violet-500/50" : ""}`}
            onClick={() => setFilterStatus("active")}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-violet-500/10">
                <Clock className="h-6 w-6 text-violet-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prêts actifs</p>
                <p className="text-3xl font-bold text-violet-500">{stats.total}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card 
            className={`glass p-6 cursor-pointer hover:bg-muted/10 transition-colors ${filterStatus === "overdue" ? "border-destructive/50" : ""}`}
            onClick={() => setFilterStatus("overdue")}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En retard</p>
                <p className="text-3xl font-bold text-destructive">{stats.overdue}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card 
            className={`glass p-6 cursor-pointer hover:bg-muted/10 transition-colors ${filterStatus === "returned" ? "border-primary/50" : ""}`}
            onClick={() => setFilterStatus("returned")}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <RotateCcw className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Retournés</p>
                <p className="text-3xl font-bold text-primary">{stats.returned}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Search and Filters */}
      <Card className="glass p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, matricule, article..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 glass"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 glass">
                <Filter className="h-4 w-4" />
                Statut: {filterStatus === "all" ? "Tous" : filterStatus === "active" ? "Actifs" : filterStatus === "overdue" ? "En retard" : "Retournés"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterStatus("all")}>Tous</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("active")}>Actifs</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("overdue")}>En retard</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("returned")}>Retournés</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      {/* Loans List */}
      {filteredLoans.length === 0 ? (
        <Card className="glass p-12 text-center">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchTerm || filterStatus !== "all" 
              ? "Aucun prêt trouvé avec ces critères"
              : "Aucun prêt enregistré"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {filteredLoans.map((loan, index) => {
              const status = getStatus(loan);
              const daysOverdue = status === "overdue" 
                ? differenceInDays(new Date(), new Date(loan.expected_return_date))
                : 0;
              const daysRemaining = status === "active"
                ? differenceInDays(new Date(loan.expected_return_date), new Date())
                : 0;

              return (
                <motion.div
                  key={loan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`glass p-6 hover:bg-muted/10 transition-colors ${
                    status === "overdue" ? "border-destructive/30" : 
                    status === "returned" ? "border-primary/30" : "border-violet-500/30"
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className={`p-3 rounded-xl ${
                          status === "overdue" ? "bg-destructive/10" : 
                          status === "returned" ? "bg-primary/10" : "bg-violet-500/10"
                        }`}>
                          <User className={`h-6 w-6 ${
                            status === "overdue" ? "text-destructive" : 
                            status === "returned" ? "text-primary" : "text-violet-500"
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold">
                              {loan.personnel?.prenom} {loan.personnel?.nom}
                            </h3>
                            {status === "overdue" && (
                              <Badge variant="destructive">
                                {daysOverdue} jour{daysOverdue > 1 ? "s" : ""} de retard
                              </Badge>
                            )}
                            {status === "active" && daysRemaining <= 3 && (
                              <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">
                                {daysRemaining} jour{daysRemaining > 1 ? "s" : ""} restant{daysRemaining > 1 ? "s" : ""}
                              </Badge>
                            )}
                            {status === "returned" && (
                              <Badge className="bg-primary/20 text-primary border-primary/30">
                                Retourné
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{loan.personnel?.matricule}</p>
                          
                          <div className="flex items-center gap-2 mt-3 text-sm">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {loan.item_variants?.stock_items?.type}
                              {loan.item_variants?.stock_items?.sous_type && 
                                ` - ${loan.item_variants.stock_items.sous_type}`}
                            </span>
                            {loan.item_variants?.taille && (
                              <Badge variant="outline" className="text-xs">
                                {loan.item_variants.taille}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              x{loan.quantite}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Prêt: {format(new Date(loan.date_attribution), "dd MMM yyyy", { locale: fr })}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Retour prévu: {format(new Date(loan.expected_return_date), "dd MMM yyyy", { locale: fr })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {status !== "returned" && (
                        <Button
                          onClick={() => handleReturnClick(loan)}
                          className="gap-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-500 border border-violet-500/30"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Retour
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Return Dialog */}
      {selectedLoan && (
        <ReturnLoanDialog
          open={returnDialogOpen}
          onOpenChange={setReturnDialogOpen}
          loan={selectedLoan}
          onSuccess={() => {
            loadLoans();
            setReturnDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}
