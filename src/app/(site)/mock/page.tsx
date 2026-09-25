import type { Metadata } from "next";
import { PageColumn } from "@/components/layout/PageColumn";
import { VERDICT_HEADLINE } from "@/lib/scan/copy";
import type { Verdict } from "@/lib/scan/types";
import { demoId, type DemoSource } from "@/mocks/demo";

export const metadata: Metadata = { title: "Mock review", robots: { index: false } };

/*
 * MOCK review page. Links to every requested state and every fixture so the
 * interface can be reviewed without Reality Defender. Not part of the
 * product; remove when the real service is integrated.
 */

type Link = { label: string; href: string };

const STATES: { title: string; note: string; links: Link[] }[] = [
  { title: "Empty / ready", note: "The universal input.", links: [{ label: "Open", href: "/" }] },
  { title: "Dragging a file over the scanner", note: "Shown while a file is dragged anywhere on the page.", links: [{ label: "Open", href: "/?preview=dragging" }] },
  { title: "File selected", note: "The file waits for “Check it”. Also where Cancel returns.", links: [{ label: "Voice note", href: "/mock/run?select=voice" }, { label: "Photo", href: "/mock/run?select=photo" }] },
  { title: "Uploading", note: "Held at 63%.", links: [{ label: "Open", href: "/mock/run?sample=video&hold=uploading" }] },
  { title: "Retrieving social media", note: "Held while grabbing the post.", links: [{ label: "Open", href: "/mock/run?link=tiktok&hold=retrieving" }] },
  {
    title: "Analyzing",
    note: "Held at 62%. The video shows “Partly done”.",
    links: [
      { label: "Voice", href: "/mock/run?sample=voice&hold=analysing" },
      { label: "Photo", href: "/mock/run?sample=photo&hold=analysing" },
      { label: "Video", href: "/mock/run?sample=video&hold=analysing" },
      { label: "Text", href: "/mock/run?text=1&hold=analysing" },
    ],
  },
  { title: "Likely authentic", note: "RD concept AUTHENTIC.", links: [{ label: "Run a photo", href: "/mock/run?sample=photo&outcome=AUTHENTIC" }] },
  { title: "Suspicious", note: "RD concept SUSPICIOUS.", links: [{ label: "Run a voice note", href: "/mock/run?sample=voice&outcome=SUSPICIOUS" }] },
  { title: "Likely AI-generated or manipulated", note: "RD concept FAKE.", links: [{ label: "Run a video", href: "/mock/run?sample=video&outcome=FAKE" }] },
  { title: "Not applicable", note: "RD concept NOT_APPLICABLE.", links: [{ label: "Run a voice note", href: "/mock/run?sample=voice&outcome=NOT_APPLICABLE" }] },
  { title: "Unable to evaluate", note: "RD concept UNABLE_TO_EVALUATE. After two retries the buttons swap.", links: [{ label: "Run a voice note", href: "/mock/run?sample=voice&outcome=UNABLE_TO_EVALUATE" }] },
  {
    title: "Network / API failure",
    note: "Fails during upload; “Try again” then succeeds.",
    links: [
      { label: "Service unreachable", href: "/mock/run?sample=photo&outcome=NETWORK_ERROR" },
      { label: "Offline", href: "/mock/run?sample=photo&outcome=OFFLINE" },
    ],
  },
];

const OTHER_STATES: { title: string; href: string }[] = [
  { title: "Link can't be opened", href: "/mock/run?link=unsupported" },
  { title: "Link with a photo post", href: "/mock/run?link=instagram" },
  { title: "Pasted text", href: "/mock/run?text=1" },
  { title: "File too big", href: "/?preview=too-large" },
  { title: "Video too long", href: "/?preview=too-long" },
  { title: "Unsupported file", href: "/?preview=unsupported" },
  { title: "Plus gate", href: "/?preview=plus-gate" },
];

const SOURCES: { id: DemoSource; label: string }[] = [
  { id: "photo", label: "Photo" },
  { id: "voice", label: "Voice note" },
  { id: "video", label: "Video" },
  { id: "text", label: "Text" },
  { id: "link", label: "Social link (video)" },
];

const VERDICTS: Verdict[] = ["authentic", "suspicious", "artificial", "not_applicable", "unable"];
const hasDetails = (v: Verdict) => v === "authentic" || v === "suspicious" || v === "artificial";

// Review links load fresh pages so each state starts from its URL.
const linkClass = "inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:text-verdict-authentic-fg";
const pillClass =
  "inline-flex h-11 items-center rounded-pill border-[1.5px] border-ink px-5 text-ui font-semibold hover:text-verdict-authentic-fg";

export default function MockReviewPage() {
  return (
    <PageColumn width="result" className="pt-4 pb-16">
      <p className="text-micro font-bold tracking-[0.06em] text-muted uppercase">Mock data only</p>
      <h1 className="mt-2 font-display text-h1-detail-mobile sm:text-h1-detail">Mock review</h1>
      <p className="mt-3 max-w-[70ch] text-body leading-[1.6] text-ink-soft">
        Every link on this page runs on bundled samples and fixtures, and nothing is uploaded. Checks you start yourself
        on the home page, including the examples, are real Reality Defender checks and use its quota.
      </p>

      <section aria-labelledby="states" className="mt-10">
        <h2 id="states" className="font-display text-h2-mobile font-bold sm:text-h2">The twelve states</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STATES.map((state, index) => (
            <li key={state.title} className="flex flex-col rounded-lg bg-surface p-5">
              <p className="font-display text-small font-bold text-muted">{index + 1}</p>
              <h3 className="mt-1 text-body-lg font-bold">{state.title}</h3>
              <p className="mt-1 text-small text-muted">{state.note}</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-3">
                {state.links.map((link) => (
                  <a key={link.href} href={link.href} className={pillClass}>
                    {link.label}
                  </a>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="other" className="mt-10">
        <h2 id="other" className="font-display text-h2-mobile font-bold sm:text-h2">Other states from the handoff</h2>
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
          {OTHER_STATES.map((state) => (
            <li key={state.href}>
              <a href={state.href} className={linkClass}>
                {state.title}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="fixtures" className="mt-10">
        <h2 id="fixtures" className="font-display text-h2-mobile font-bold sm:text-h2">Every verdict for every media type</h2>
        <p className="mt-2 text-small text-muted">Opens the finished result directly, as a direct link would.</p>
        <div className="mt-4 flex flex-col gap-3">
          {SOURCES.map((source) => (
            <section key={source.id} className="rounded-lg bg-surface p-5">
              <h3 className="text-body-lg font-bold">{source.label}</h3>
              <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                {VERDICTS.map((verdict) => (
                  <li key={verdict} className="flex flex-wrap items-baseline gap-x-3">
                    <a href={`/check/${demoId(source.id, verdict)}`} className={linkClass}>
                      {VERDICT_HEADLINE[verdict]}
                    </a>
                    {hasDetails(verdict) ? (
                      <a href={`/check/${demoId(source.id, verdict)}/details`} className="inline-flex min-h-11 items-center text-small text-muted underline underline-offset-4">
                        details
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      <section aria-labelledby="settings" className="mt-10">
        <h2 id="settings" className="font-display text-h2-mobile font-bold sm:text-h2">Settings</h2>
        <div className="mt-3 flex flex-col gap-3 text-ui sm:flex-row sm:gap-10">
          <p>
            Plan:{" "}
            <a href="/mock/run?plan=plus" className={linkClass}>Plus</a> ·{" "}
            <a href="/mock/run?plan=free" className={linkClass}>Free (Plus badges and gate)</a>
          </p>
          <p>
            Progress:{" "}
            <a href="/mock/run?progress=determinate" className={linkClass}>percentages</a> ·{" "}
            <a href="/mock/run?progress=indeterminate" className={linkClass}>status only</a>
          </p>
        </div>
      </section>
    </PageColumn>
  );
}
