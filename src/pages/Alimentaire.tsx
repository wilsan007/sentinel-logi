import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Package, ArrowLeft, Plus, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { FoodGrid } from "@/components/food/FoodGrid";

type ViewMode = "stock" | "requests";

export default function Alimentaire() {
  const [user, setUser] = useState<any>(null);
  const [mode, setMode] = useState<ViewMode>("stock");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fond animé avec accents ambre/orange */}
      <div className="absolute inset-0 bg-background">
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[150px] animate-glow-pulse"></div>
        <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-secondary-glow/10 rounded-full blur-[120px] animate-glow-pulse" style={{ animationDelay: "1.5s" }}></div>
      </div>

      {/* Contenu */}
      <div className="relative z-10">
        {/* Header */}
        <header className="glass border-b border-border/50 sticky top-0 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/")}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </Button>
                <div className="flex items-center gap-3">
                  <Package className="h-8 w-8 text-secondary" />
                  <div>
                    <h1 className="text-2xl font-bold neon-text-secondary">
                      Module Alimentaire
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      Gestion des provisions FOOD
                    </p>
                  </div>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">
                {user?.email}
              </span>
            </div>
          </div>
        </header>

        {/* Barre de modes */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex gap-3 p-1 glass rounded-xl w-fit">
            <Button
              onClick={() => setMode("stock")}
              className={`gap-2 ${
                mode === "stock"
                  ? "bg-secondary text-secondary-foreground shadow-secondary"
                  : "bg-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Plus className="h-4 w-4" />
              Ajouter Stock
            </Button>
            <Button
              onClick={() => setMode("requests")}
              className={`gap-2 ${
                mode === "requests"
                  ? "bg-secondary text-secondary-foreground shadow-secondary"
                  : "bg-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Send className="h-4 w-4" />
              Traiter Demandes
            </Button>
          </div>
        </div>

        {/* Contenu principal */}
        <main className="container mx-auto px-4 pb-8">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <FoodGrid mode={mode} />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
