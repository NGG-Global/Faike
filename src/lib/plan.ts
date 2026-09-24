/*
 * The viewer's plan. Accounts are out of scope, so the value comes from the
 * mock settings (src/mocks/settings.ts), which default to Plus so every input
 * type can be tried. Replace with the signed-in user's plan when accounts exist.
 */

export type Plan = "free" | "plus";

export { usePlan } from "@/mocks/settings";
