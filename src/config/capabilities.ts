import type { MediaType } from "@/lib/scan/types";
import { MEDIA_TYPES } from "./media";

/*
 * Which kinds of check this deployment offers. Reality Defender plan access
 * varies (RD's free tier, for example, covers images and audio only), so a
 * kind the plan does not include is switched off here.
 *
 * A disabled kind is refused before anything is uploaded: the browser
 * explains that it is unavailable, and the server refuses it before calling
 * RD. It is dropped from the "what you can check" chips, the examples and
 * the paste prompt. This is not a subscription system; Faike Plus gating
 * (HANDOFF §9.3, `freeTier` in media.ts) is separate.
 */

export type Capability = MediaType | "social";

export type Capabilities = Readonly<Record<Capability, boolean>>;

export const CAPABILITIES: Capabilities = {
  image: true,
  audio: true,
  video: true,
  text: true,
  social: true,
};

export function enabledMediaTypes(capabilities: Capabilities = CAPABILITIES): MediaType[] {
  return MEDIA_TYPES.filter((type) => capabilities[type]);
}
