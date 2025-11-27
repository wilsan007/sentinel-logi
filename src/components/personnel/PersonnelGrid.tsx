import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, User } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Personnel = {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  grade: string;
  actif: boolean;
  locations: {
    nom: string;
  } | null;
};

export function PersonnelGrid() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPersonnel();
  }, []);

  const loadPersonnel = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("personnel")
      .select(`
        *,
        locations (
          nom
        )
      `)
      .order("nom");

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger le personnel",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setPersonnel(data || []);
    setLoading(false);
  };

  const filteredPersonnel = personnel.filter(
    (p) =>
      p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.matricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.grade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Barre de recherche et actions */}
      <Card className="glass p-6">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, prénom, matricule ou grade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 glass"
            />
          </div>
          <Button className="gap-2 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30">
            <Plus className="h-4 w-4" />
            Ajouter Personnel
          </Button>
        </div>
      </Card>

      {/* Tableau */}
      <Card className="glass p-6">
        {filteredPersonnel.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm
                ? "Aucun personnel trouvé"
                : "Aucun personnel enregistré. Commencez par en ajouter un."}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-bold">Matricule</TableHead>
                  <TableHead className="font-bold">Nom</TableHead>
                  <TableHead className="font-bold">Prénom</TableHead>
                  <TableHead className="font-bold">Grade</TableHead>
                  <TableHead className="font-bold">Camp</TableHead>
                  <TableHead className="font-bold">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPersonnel.map((person) => (
                  <TableRow
                    key={person.id}
                    className="hover:bg-muted/20 cursor-pointer transition-colors"
                  >
                    <TableCell className="font-mono text-sm">
                      {person.matricule}
                    </TableCell>
                    <TableCell className="font-semibold">{person.nom}</TableCell>
                    <TableCell>{person.prenom}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full bg-accent/20 text-accent text-xs font-medium">
                        {person.grade}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {person.locations?.nom || "Non assigné"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          person.actif
                            ? "bg-primary/20 text-primary"
                            : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {person.actif ? "Actif" : "Inactif"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Statistiques */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="glass p-6">
          <h3 className="text-sm text-muted-foreground mb-2">Total Personnel</h3>
          <p className="text-3xl font-bold text-accent">{personnel.length}</p>
        </Card>
        <Card className="glass p-6">
          <h3 className="text-sm text-muted-foreground mb-2">Actifs</h3>
          <p className="text-3xl font-bold text-primary">
            {personnel.filter((p) => p.actif).length}
          </p>
        </Card>
        <Card className="glass p-6">
          <h3 className="text-sm text-muted-foreground mb-2">Inactifs</h3>
          <p className="text-3xl font-bold text-destructive">
            {personnel.filter((p) => !p.actif).length}
          </p>
        </Card>
      </div>
    </div>
  );
}
