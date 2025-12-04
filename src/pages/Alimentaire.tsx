import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Package, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { FoodSelector } from "@/components/food/FoodSelector";

type ViewMode = "stock" | "distribute";

export default function Alimentaire() {
  const [user, setUser] = useState<any>(null);
  const [locationId, setLocationId] = useState<string>("");
  const [mode, setMode] = useState<ViewMode>("stock");
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("location_id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (roleData?.location_id) setLocationId(roleData.location_id);
      }
    };
    loadUserData();
  }, [navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-background">
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[150px] animate-glow-pulse"></div>
        <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-secondary-glow/10 rounded-full blur-[120px] animate-glow-pulse" style={{ animationDelay: "1.5s" }}></div>
      </div>

      <div className="relative z-10">
        <header className="glass border-b border-border/50 sticky top-0 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </Button>
                <div className="flex items-center gap-3">
                  <Package className="h-8 w-8 text-secondary" />
                  <div>
                    <h1 className="text-2xl font-bold neon-text-secondary">Module Alimentaire</h1>
                    <p className="text-xs text-muted-foreground">Gestion des provisions FOOD</p>
                  </div>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">{user?.email}</span>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6">
          <div className="flex gap-3 p-1 glass rounded-xl w-fit mb-6">
            <Button onClick={() => setMode("stock")} className={mode === "stock" ? "bg-secondary text-secondary-foreground" : "bg-transparent text-muted-foreground hover:text-foreground"}>
              Ajouter Stock
            </Button>
            <Button onClick={() => setMode("distribute")} className={mode === "distribute" ? "bg-secondary text-secondary-foreground" : "bg-transparent text-muted-foreground hover:text-foreground"}>
              Distribuer
            </Button>
          </div>

          <motion.div key={mode} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
            {locationId && <FoodSelector locationId={locationId} mode={mode} />}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
