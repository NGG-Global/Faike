/*
 * Social platforms accepted as links.
 *
 * The platform list matches Reality Defender's Social Media URL Upload
 * documentation (checked 24 Sep 2026): Facebook, Instagram, Twitter/X,
 * YouTube, TikTok and Threads. The host names per platform are Faike's own
 * reading and should be checked against real links (short links, regional
 * domains). The browser uses the list to label a pasted link; the server
 * refuses links from any other host before contacting RD.
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
  { id: "threads", name: "Threads", hosts: ["threads.net", "threads.com"] },
];
