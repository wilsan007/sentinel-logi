import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = {
  id: number;
  name: string;
  description: string;
  completed: boolean;
  current: boolean;
};

type ProgressStepperProps = {
  steps: Step[];
};

export function ProgressStepper({ steps }: ProgressStepperProps) {
  return (
    <nav aria-label="Progression" className="glass rounded-xl p-6 mb-6">
      <ol className="flex items-center justify-between">
        {steps.map((step, stepIdx) => (
          <li
            key={step.id}
            className={cn(
              "relative flex items-center",
              stepIdx !== steps.length - 1 ? "flex-1" : ""
            )}
          >
            <div className="flex flex-col items-center w-full">
              {/* Ligne de connexion */}
              {stepIdx !== 0 && (
                <div
                  className={cn(
                    "absolute right-1/2 top-5 h-0.5 w-full transition-all duration-500",
                    step.completed || step.current
                      ? "bg-primary"
                      : "bg-border"
                  )}
                  aria-hidden="true"
                />
              )}

              {/* Cercle d'étape */}
              <div className="relative flex items-center justify-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                    step.completed
                      ? "border-primary bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                      : step.current
                      ? "border-primary bg-primary/20 text-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-110"
                      : "border-border bg-card text-muted-foreground"
                  )}
                >
                  {step.completed ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{step.id}</span>
                  )}
                </div>
              </div>

              {/* Label */}
              <div className="mt-3 text-center min-w-[120px]">
                <span
                  className={cn(
                    "text-sm font-medium transition-colors",
                    step.current
                      ? "neon-text-primary"
                      : step.completed
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {step.name}
                </span>
                <p
                  className={cn(
                    "text-xs mt-1 transition-colors",
                    step.current
                      ? "text-foreground/80"
                      : "text-muted-foreground/60"
                  )}
                >
                  {step.description}
                </p>
              </div>
            </div>

            {/* Ligne de connexion suivante */}
            {stepIdx !== steps.length - 1 && (
              <div
                className={cn(
                  "absolute left-1/2 top-5 h-0.5 w-full transition-all duration-500",
                  step.completed ? "bg-primary" : "bg-border"
                )}
                aria-hidden="true"
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
