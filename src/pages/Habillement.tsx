import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { GearSelector } from "@/components/gear/GearSelector";
import { BulkAllocationDialog } from "@/components/gear/BulkAllocationDialog";

export default function Habillement() {
  const [user, setUser] = useState<any>(null);
  const [locationId, setLocationId] = useState<string>("");
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        
        // Charger le location_id de l'utilisateur
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("location_id")
          .eq("user_id", session.user.id)
          .single();
        
        if (roleData?.location_id) {
          setLocationId(roleData.location_id);
        }
      }
    };
    
    loadUserData();
  }, [navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fond animé avec accents cyan/bleu */}
      <div className="absolute inset-0 bg-background">
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[150px] animate-glow-pulse"></div>
        <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-primary-glow/10 rounded-full blur-[120px] animate-glow-pulse" style={{ animationDelay: "1.5s" }}></div>
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
                  <Shield className="h-8 w-8 text-primary" />
                  <div>
                    <h1 className="text-2xl font-bold neon-text-primary">
                      Module Habillement
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      Gestion des dotations GEAR
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => setBulkDialogOpen(true)}
                  className="gap-2"
                  disabled={!locationId}
                >
                  <Users className="h-4 w-4" />
                  Dotation en Masse
                </Button>
                <span className="text-sm text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Contenu principal */}
        <main className="container mx-auto px-4 py-8">
          <GearSelector />
        </main>
      </div>

      <BulkAllocationDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        locationId={locationId}
        onSuccess={() => {
          toast({
            title: "Dotation réussie",
            description: "Les allocations ont été enregistrées avec succès.",
          });
        }}
      />
    </div>
  );
}
