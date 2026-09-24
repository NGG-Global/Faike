/*
 * Social platforms recognised in pasted links.
 *
 * PLACEHOLDER (HANDOFF §12.3): which platforms Reality Defender, or Faike's
 * own retrieval, supports is not confirmed. The list only labels links in the
 * interface; retrieval decides whether a link can actually be checked, and a
 * link from any other site fails at the retrieval step.
 */

export interface SocialPlatform {
  id: string;
  name: string;
  hosts: readonly string[];
}

export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = [
  { id: "tiktok", name: "TikTok", hosts: ["tiktok.com"] },
  { id: "instagram", name: "Instagram", hosts: ["instagram.com"] },
  { id: "x", name: "X", hosts: ["x.com", "twitter.com"] },
  { id: "youtube", name: "YouTube", hosts: ["youtube.com", "youtu.be"] },
  { id: "facebook", name: "Facebook", hosts: ["facebook.com", "fb.watch"] },
];
