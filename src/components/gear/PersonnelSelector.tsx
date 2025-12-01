import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, User } from "lucide-react";

type Personnel = {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  grade: string;
  photo_url: string | null;
  sexe?: string;
};

type PersonnelSelectorProps = {
  onSelect: (personnel: Personnel) => void;
};

export function PersonnelSelector({ onSelect }: PersonnelSelectorProps) {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPersonnel();
  }, []);

  const loadPersonnel = async () => {
    setLoading(true);
    
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("location_id, role")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .single();

    let query = supabase
      .from("personnel")
      .select("*")
      .eq("actif", true)
      .order("nom");

    // Si chef de camp, filtrer par location
    if (userRoles?.role === "chef_camp" && userRoles?.location_id) {
      query = query.eq("location_id", userRoles.location_id);
    }

    const { data, error } = await query;

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
    return (
      <Card className="glass p-8">
        <div className="text-center text-muted-foreground">Chargement...</div>
      </Card>
    );
  }

  return (
    <Card className="glass p-8">
      <h2 className="text-2xl font-bold mb-6 neon-text-primary">
        Sélectionnez le personnel
      </h2>

      {/* Barre de recherche */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, prénom, matricule ou grade..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 glass border-border/50"
        />
      </div>

      {/* Liste du personnel */}
      {filteredPersonnel.length === 0 ? (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchTerm
              ? "Aucun personnel trouvé"
              : "Aucun personnel actif disponible"}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto scrollbar-thin pr-2">
          {filteredPersonnel.map((person) => (
            <button
              key={person.id}
              onClick={() => onSelect(person)}
              className="glass-hover p-4 rounded-xl border border-border/50 text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  {person.photo_url ? (
                    <img
                      src={person.photo_url}
                      alt={`${person.prenom} ${person.nom}`}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">
                    {person.prenom} {person.nom}
                  </h3>
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span className="text-muted-foreground font-mono">
                      {person.matricule}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent text-xs">
                      {person.grade}
                    </span>
                    {person.sexe && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs capitalize">
                          {person.sexe}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
