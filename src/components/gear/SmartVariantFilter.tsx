import { AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type SmartVariantFilterProps = {
  personnelSex?: string;
  itemConstraints?: {
    is_unisex?: boolean;
    female_only?: boolean;
    male_only?: boolean;
    requires_size?: boolean;
    requires_gender?: boolean;
  };
  itemType?: string;
  itemSubType?: string;
};

export function SmartVariantFilter({
  personnelSex,
  itemConstraints,
  itemType,
  itemSubType,
}: SmartVariantFilterProps) {
  const getFilterMessage = () => {
    if (!personnelSex) {
      return {
        type: "info" as const,
        message: "Sélectionnez un personnel pour activer le filtrage intelligent",
      };
    }

    // Accessoires - pas de taille/sexe requis
    if (itemConstraints?.requires_size === false && itemConstraints?.requires_gender === false) {
      return {
        type: "info" as const,
        message: "Cet accessoire est universel - aucune taille ou genre requis",
      };
    }

    // Unisexe - taille requise mais pas de genre
    if (itemConstraints?.is_unisex || itemConstraints?.requires_gender === false) {
      return {
        type: "info" as const,
        message: "Article unisexe - sélectionnez uniquement la taille appropriée",
      };
    }

    // Femme uniquement
    if (itemConstraints?.female_only) {
      if (personnelSex === "femme") {
        return {
          type: "success" as const,
          message: "Article réservé aux femmes - vous pouvez continuer",
        };
      } else {
        return {
          type: "warning" as const,
          message: "Cet article est réservé au personnel féminin",
        };
      }
    }

    // Homme uniquement
    if (itemConstraints?.male_only) {
      if (personnelSex === "homme") {
        return {
          type: "success" as const,
          message: "Article disponible pour le personnel masculin",
        };
      } else {
        return {
          type: "warning" as const,
          message: "Cet article est réservé au personnel masculin",
        };
      }
    }

    // Articles avec contraintes de genre standards
    if (personnelSex === "femme") {
      // Vérifier si c'est un article qui devrait être filtré pour les femmes
      const femaleRestrictedTypes = ["Jupe", "Talons", "Chaussures à talons"];
      if (femaleRestrictedTypes.some(type => 
        itemType?.toLowerCase().includes(type.toLowerCase()) || 
        itemSubType?.toLowerCase().includes(type.toLowerCase())
      )) {
        return {
          type: "success" as const,
          message: "Article disponible pour le personnel féminin",
        };
      }
    }

    return null;
  };

  const filterMessage = getFilterMessage();

  if (!filterMessage) return null;

  return (
    <Alert className={`glass mb-4 ${
      filterMessage.type === "warning" 
        ? "border-amber-500/50 bg-amber-500/10" 
        : filterMessage.type === "success"
        ? "border-emerald-500/50 bg-emerald-500/10"
        : "border-primary/50 bg-primary/10"
    }`}>
      {filterMessage.type === "warning" ? (
        <AlertCircle className="h-4 w-4 text-amber-500" />
      ) : (
        <Info className="h-4 w-4 text-primary" />
      )}
      <AlertDescription className="text-sm">
        {filterMessage.message}
      </AlertDescription>
    </Alert>
  );
}
