import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, Package, Users, LogOut, ShoppingCart, Clock, ClipboardList, FileDown, Car } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardWidgets } from "@/components/dashboard/DashboardWidgets";

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [locationId, setLocationId] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Vérifier la session au chargement
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        // Charger le location_id et le rôle de l'utilisateur
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("location_id, role")
          .eq("user_id", session.user.id)
          .single();
        
        if (roleData?.location_id) {
          setLocationId(roleData.location_id);
        }
        setIsAdmin(roleData?.role === "admin_central");
      }
      setLoading(false);
    });

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt !",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fond animé */}
      <div className="absolute inset-0 bg-background">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-glow-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] animate-glow-pulse" style={{ animationDelay: "1s" }}></div>
      </div>

      {/* Contenu */}
      <div className="relative z-10">
        {/* Header */}
        <header className="glass border-b border-border/50 sticky top-0 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold neon-text-primary">
                  Sentinel Logistics
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {user?.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="glass border-border/50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnexion
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Contenu principal */}
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">
                Bienvenue sur <span className="neon-text-primary">Sentinel</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Votre plateforme de gestion logistique militaire nouvelle génération
              </p>
            </div>

            {/* Widgets Dashboard */}
            <div className="mb-12">
              <DashboardWidgets locationId={locationId} isAdmin={isAdmin} />
            </div>

            {/* Cartes des modules */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Module Habillement */}
              <div 
                onClick={() => navigate("/habillement")}
                className="glass-hover rounded-2xl p-8 neon-border-primary group cursor-pointer"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-4 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold neon-text-primary">
                      Habillement
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Module GEAR
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground mb-6">
                  Gérez les dotations d'équipement avec le sélecteur en cascade :
                  Catégorie → Article → Sous-type → Couleur → Taille
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs">
                    Uniformes
                  </span>
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs">
                    Équipement
                  </span>
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs">
                    Historique
                  </span>
                </div>
              </div>

              {/* Module Alimentaire */}
              <div 
                onClick={() => navigate("/alimentaire")}
                className="glass-hover rounded-2xl p-8 neon-border-secondary group cursor-pointer"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-4 rounded-xl bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
                    <Package className="h-8 w-8 text-secondary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold neon-text-secondary">
                      Alimentaire
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Module FOOD
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground mb-6">
                  Gérez les provisions alimentaires avec deux modes :
                  Ajout de stock et Traitement des demandes
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs">
                    Stock
                  </span>
                  <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs">
                    Demandes
                  </span>
                  <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs">
                    Livraisons
                  </span>
                </div>
              </div>

              {/* Module Personnel */}
              <div 
                onClick={() => navigate("/personnel")}
                className="glass-hover rounded-2xl p-8 border border-border/50 group cursor-pointer"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-4 rounded-xl bg-accent/10 group-hover:bg-accent/20 transition-colors">
                    <Users className="h-8 w-8 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-accent">
                      Personnel
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Gestion des effectifs
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground mb-6">
                  Gérez le personnel militaire : grades, matricules, affectations aux camps.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs">
                    Effectifs
                  </span>
                  <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs">
                    Grades
                  </span>
                </div>
              </div>

              {/* Module Procurement (Admin) / Demandes (Chef de Camp) */}
              {isAdmin ? (
                <div 
                  onClick={() => navigate("/procurement")}
                  className="glass-hover rounded-2xl p-8 border border-emerald-500/30 group cursor-pointer"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-4 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                      <ShoppingCart className="h-8 w-8 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-emerald-500">
                        Procurement
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Stock Central uniquement
                      </p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Commandez auprès des fournisseurs et redistribuez aux camps selon leurs demandes.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs">
                      Commandes
                    </span>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs">
                      Fournisseurs
                    </span>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs">
                      Redistribution
                    </span>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => navigate("/demandes")}
                  className="glass-hover rounded-2xl p-8 border border-purple-500/30 group cursor-pointer"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-4 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                      <ClipboardList className="h-8 w-8 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-purple-500">
                        Demandes
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Besoins au Stock Central
                      </p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Exprimez vos besoins en équipement et provisions au Stock Central pour approvisionnement.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-500 text-xs">
                      Demandes
                    </span>
                    <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-500 text-xs">
                      Suivi
                    </span>
                    <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-500 text-xs">
                      Historique
                    </span>
                  </div>
                </div>
              )}

              {/* Module Loans */}
              <div 
                onClick={() => navigate("/loans")}
                className="glass-hover rounded-2xl p-8 border border-violet-500/30 group cursor-pointer"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-4 rounded-xl bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
                    <Clock className="h-8 w-8 text-violet-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-violet-500">
                      Prêts
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Gestion des équipements temporaires
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground mb-6">
                  Suivez les prêts d'équipements avec dates de retour et alertes automatiques.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-violet-500/10 text-violet-500 text-xs">
                    Prêts actifs
                  </span>
                  <span className="px-3 py-1 rounded-full bg-violet-500/10 text-violet-500 text-xs">
                    Retours
                  </span>
                  <span className="px-3 py-1 rounded-full bg-violet-500/10 text-violet-500 text-xs">
                    Alertes
                  </span>
                </div>
              </div>

              {/* Module Parc Automobile - Admin uniquement */}
              {isAdmin && (
                <div 
                  onClick={() => navigate("/fleet")}
                  className="glass-hover rounded-2xl p-8 border border-amber-500/30 group cursor-pointer"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-4 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                      <Car className="h-8 w-8 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-amber-500">
                        Parc Automobile
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Gestion de la flotte
                      </p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Gérez les véhicules, entretiens, réparations, carburant, sinistres et documents.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs">
                      Véhicules
                    </span>
                    <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs">
                      Carburant
                    </span>
                    <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs">
                      Sinistres
                    </span>
                  </div>
                </div>
              )}

              {/* Module Export - Admin uniquement */}
              {isAdmin && (
                <div 
                  onClick={() => navigate("/export")}
                  className="glass-hover rounded-2xl p-8 border border-rose-500/30 group cursor-pointer"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-4 rounded-xl bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors">
                      <FileDown className="h-8 w-8 text-rose-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-rose-500">
                        Export Données
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Téléchargement CSV/JSON
                      </p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Exportez toutes les données de la base pour analyse ou sauvegarde.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 text-xs">
                      CSV
                    </span>
                    <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 text-xs">
                      JSON
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
