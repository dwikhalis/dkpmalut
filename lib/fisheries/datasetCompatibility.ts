import {
  getAnalysisRequirements,
  type FieldRequirement,
} from "./analysisRequirements.ts";
import type { FisheriesAnalysisType } from "./dashboardOrchestration.ts";

export type FisheriesFieldInventory = Record<
  string,
  { present: boolean; validCount: number; unit?: string; values?: string[] }
>;

export type AnalysisCompatibility = {
  compatible: boolean;
  missingRequired: FieldRequirement[];
  unavailableConditional: FieldRequirement[];
};

export function checkAnalysisCompatibility(
  type: FisheriesAnalysisType,
  inventory: FisheriesFieldInventory,
): AnalysisCompatibility {
  const requirements = getAnalysisRequirements(type);
  const available = (key: string) =>
    inventory[key]?.present === true && inventory[key].validCount > 0;
  const missingRequired = requirements.filter(
    (item) => item.requirement === "required" && !available(item.key),
  );
  const unavailableConditional = requirements.filter(
    (item) => item.requirement === "conditional" && !available(item.key),
  );
  return {
    compatible: missingRequired.length === 0,
    missingRequired,
    unavailableConditional,
  };
}

export function compatibleAnalyses(
  types: FisheriesAnalysisType[],
  inventory: FisheriesFieldInventory,
) {
  return Object.fromEntries(
    types.map((type) => [type, checkAnalysisCompatibility(type, inventory)]),
  ) as Record<FisheriesAnalysisType, AnalysisCompatibility>;
}
