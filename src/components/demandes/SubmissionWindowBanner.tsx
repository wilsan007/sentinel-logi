import { useSubmissionWindow } from "@/hooks/useSubmissionWindow";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, CheckCircle2, Lock, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SubmissionWindowBannerProps {
  locationId?: string;
}

export function SubmissionWindowBanner({ locationId }: SubmissionWindowBannerProps) {
  const { 
    isOpen, windowStart, windowEnd, nextWindowStart, daysRemaining, loading, currentMonth,
    hasExceptionalAccess, exceptionalAccessReason, exceptionalAccessUntil 
  } = useSubmissionWindow(locationId);

  if (loading) {
    return (
      <Card className="glass border-border/50 mb-6">
        <CardContent className="p-4">
          <div className="animate-pulse flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-muted"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded w-1/3"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Exceptional access banner
  if (hasExceptionalAccess) {
    return (
      <Card className="glass border-amber-500/30 mb-6 bg-amber-500/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10">
                <ShieldAlert className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-amber-400">Accès exceptionnel accordé</h3>
                  <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                    Urgence
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {exceptionalAccessReason}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-amber-400">
                <Clock className="h-4 w-4" />
                <span className="text-sm">
                  Expire {exceptionalAccessUntil && format(exceptionalAccessUntil, "dd MMM à HH:mm", { locale: fr })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {daysRemaining} jour{daysRemaining > 1 ? "s" : ""} restant{daysRemaining > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isOpen) {
    return (
      <Card className="glass border-emerald-500/30 mb-6 bg-emerald-500/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-emerald-400">Fenêtre de demandes ouverte</h3>
                  <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    {currentMonth}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Vous pouvez soumettre vos demandes jusqu'au{" "}
                  <strong className="text-foreground">
                    {windowEnd && format(windowEnd, "EEEE d MMMM", { locale: fr })}
                  </strong>
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-emerald-400">
                <Clock className="h-4 w-4" />
                <span className="font-bold text-lg">{daysRemaining}</span>
                <span className="text-sm">jour{daysRemaining > 1 ? "s" : ""} restant{daysRemaining > 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-amber-500/30 mb-6 bg-amber-500/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10">
              <Lock className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-amber-400">Fenêtre de demandes fermée</h3>
                <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  Hors période
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Prochaine période de soumission:{" "}
                <strong className="text-foreground">
                  {nextWindowStart && format(nextWindowStart, "EEEE d MMMM yyyy", { locale: fr })}
                </strong>
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-amber-400">
              <CalendarDays className="h-4 w-4" />
              <span className="text-sm">3 jours ouvrables (13-15 du mois)</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Weekend Djibouti: Vendredi & Samedi
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
