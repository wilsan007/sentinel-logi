import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Plus, 
  User, 
  Edit, 
  Eye, 
  Filter,
  Users,
  UserCheck,
  UserX,
  ChevronDown
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PersonnelFormDialog } from "./PersonnelFormDialog";
import { PersonnelDetailDialog } from "./PersonnelDetailDialog";

type Personnel = {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  grade: string;
  sexe: string | null;
  actif: boolean;
  date_entree: string;
  taille_chemise: string | null;
  taille_pantalon: string | null;
  pointure_chaussures: string | null;
  taille_casquette: string | null;
  taille_beret: string | null;
  locations: { nom: string } | null;
};

interface PersonnelManagerProps {
  locationId?: string;
}

export function PersonnelManager({ locationId }: PersonnelManagerProps) {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [editMode, setEditMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPersonnel();
  }, [locationId]);

  const loadPersonnel = async () => {
    setLoading(true);
    let query = supabase
      .from("personnel")
      .select(`*, locations (nom)`)
      .order("nom");

    if (locationId) {
      query = query.eq("location_id", locationId);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger le personnel",
        variant: "destructive",
      });
    } else {
      setPersonnel(data || []);
    }
    setLoading(false);
  };

  const grades = [...new Set(personnel.map(p => p.grade))].sort();

  const filteredPersonnel = personnel.filter(p => {
    const matchesSearch = 
      p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.matricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.grade.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      filterStatus === "all" || 
      (filterStatus === "active" && p.actif) || 
      (filterStatus === "inactive" && !p.actif);
    
    const matchesGrade = filterGrade === "all" || p.grade === filterGrade;

    return matchesSearch && matchesStatus && matchesGrade;
  });

  const stats = {
    total: personnel.length,
    active: personnel.filter(p => p.actif).length,
    inactive: personnel.filter(p => !p.actif).length
  };

  const handleAddNew = () => {
    setSelectedPersonnel(null);
    setEditMode(false);
    setFormDialogOpen(true);
  };

  const handleEdit = (person: Personnel) => {
    setSelectedPersonnel(person);
    setEditMode(true);
    setFormDialogOpen(true);
  };

  const handleView = (person: Personnel) => {
    setSelectedPersonnel(person);
    setDetailDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass p-6 neon-border cursor-pointer hover:bg-muted/10 transition-colors"
                onClick={() => setFilterStatus("all")}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-3xl font-bold text-accent">{stats.total}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass p-6 cursor-pointer hover:bg-muted/10 transition-colors"
                onClick={() => setFilterStatus("active")}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <UserCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Actifs</p>
                <p className="text-3xl font-bold text-primary">{stats.active}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass p-6 cursor-pointer hover:bg-muted/10 transition-colors"
                onClick={() => setFilterStatus("inactive")}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-destructive/10">
                <UserX className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inactifs</p>
                <p className="text-3xl font-bold text-destructive">{stats.inactive}</p>
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
              placeholder="Rechercher par nom, prénom, matricule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 glass"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 glass">
                <Filter className="h-4 w-4" />
                Grade: {filterGrade === "all" ? "Tous" : filterGrade}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterGrade("all")}>Tous les grades</DropdownMenuItem>
              {grades.map(grade => (
                <DropdownMenuItem key={grade} onClick={() => setFilterGrade(grade)}>
                  {grade}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={handleAddNew} className="gap-2 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30">
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </Card>

      {/* Personnel Table */}
      <Card className="glass overflow-hidden">
        {filteredPersonnel.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm || filterStatus !== "all" || filterGrade !== "all"
                ? "Aucun personnel trouvé avec ces critères"
                : "Aucun personnel enregistré"}
            </p>
            {!searchTerm && filterStatus === "all" && filterGrade === "all" && (
              <Button onClick={handleAddNew} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Ajouter le premier membre
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-bold">Matricule</TableHead>
                  <TableHead className="font-bold">Nom</TableHead>
                  <TableHead className="font-bold">Prénom</TableHead>
                  <TableHead className="font-bold">Grade</TableHead>
                  <TableHead className="font-bold">Sexe</TableHead>
                  <TableHead className="font-bold">Camp</TableHead>
                  <TableHead className="font-bold">Statut</TableHead>
                  <TableHead className="font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredPersonnel.map((person, index) => (
                    <motion.tr
                      key={person.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-muted/20 cursor-pointer transition-colors"
                      onClick={() => handleView(person)}
                    >
                      <TableCell className="font-mono text-sm">{person.matricule}</TableCell>
                      <TableCell className="font-semibold">{person.nom}</TableCell>
                      <TableCell>{person.prenom}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                          {person.grade}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {person.sexe === "homme" ? "H" : person.sexe === "femme" ? "F" : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {person.locations?.nom || "Non assigné"}
                      </TableCell>
                      <TableCell>
                        <Badge className={person.actif 
                          ? "bg-primary/20 text-primary border-primary/30" 
                          : "bg-destructive/20 text-destructive border-destructive/30"}>
                          {person.actif ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={(e) => { e.stopPropagation(); handleView(person); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={(e) => { e.stopPropagation(); handleEdit(person); }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Dialogs */}
      <PersonnelFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        personnel={editMode ? selectedPersonnel : null}
        locationId={locationId}
        onSuccess={() => {
          loadPersonnel();
          setFormDialogOpen(false);
        }}
      />

      {selectedPersonnel && (
        <PersonnelDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          personnelId={selectedPersonnel.id}
          onEdit={() => {
            setDetailDialogOpen(false);
            handleEdit(selectedPersonnel);
          }}
        />
      )}
    </div>
  );
}
