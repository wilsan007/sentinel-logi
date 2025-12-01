import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Clock, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoansList } from "@/components/loans/LoansList";
import { OverdueLoansWidget } from "@/components/loans/OverdueLoansWidget";

export default function Loans() {
  const [user, setUser] = useState<any>(null);
  const [locationId, setLocationId] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

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
      {/* Fond animé avec accents violets */}
      <div className="absolute inset-0 bg-background">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[150px] animate-glow-pulse"></div>
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px] animate-glow-pulse" style={{ animationDelay: "1.5s" }}></div>
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
                  <Clock className="h-8 w-8 text-violet-500" />
                  <div>
                    <h1 className="text-2xl font-bold text-violet-500">
                      Gestion des Prêts
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      Suivi et retours d'équipements temporaires
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Contenu principal */}
        <main className="container mx-auto px-4 py-8 space-y-6">
          <OverdueLoansWidget locationId={locationId} />
          <LoansList 
            locationId={locationId} 
            refreshKey={refreshKey}
            onRefresh={() => setRefreshKey(prev => prev + 1)}
          />
        </main>
      </div>
    </div>
  );
}
