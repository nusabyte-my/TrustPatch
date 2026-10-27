import { z } from "zod";
import { planTargetInstruction, targetConsoleInputSchema, type TargetPlan } from "@trustpatch/core";

export function planConsole(input: unknown): TargetPlan {
  return planTargetInstruction(targetConsoleInputSchema.parse(input));
}
