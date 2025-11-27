import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nomComplet, setNomComplet] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nom_complet: nomComplet,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        toast({
          title: "Compte créé avec succès !",
          description: "Vous pouvez maintenant vous connecter.",
        });
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Connexion réussie !",
          description: "Bienvenue sur Sentinel Logistics.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fond animé avec effets glassmorphism */}
      <div className="absolute inset-0 bg-background">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-glow-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] animate-glow-pulse" style={{ animationDelay: "1s" }}></div>
      </div>

      {/* Carte de connexion */}
      <div className="w-full max-w-md relative z-10">
        <div className="glass rounded-2xl p-8 shadow-elegant border border-border/50">
          {/* En-tête */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2 neon-text-primary">
              Sentinel Logistics
            </h1>
            <p className="text-muted-foreground">
              Système de gestion d'inventaire militaire
            </p>
          </div>

          {/* Onglets Mode */}
          <div className="flex gap-2 mb-6 p-1 glass rounded-lg">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 rounded-md transition-all duration-300 ${
                mode === "login"
                  ? "bg-primary text-primary-foreground shadow-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded-md transition-all duration-300 ${
                mode === "signup"
                  ? "bg-primary text-primary-foreground shadow-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Inscription
            </button>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="nomComplet">Nom complet</Label>
                <Input
                  id="nomComplet"
                  type="text"
                  placeholder="Jean Dupont"
                  value={nomComplet}
                  onChange={(e) => setNomComplet(e.target.value)}
                  required
                  className="glass border-border/50"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre.email@exemple.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="glass border-border/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="glass border-border/50"
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-6"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Chargement...
                </>
              ) : mode === "login" ? (
                "Se connecter"
              ) : (
                "Créer un compte"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
