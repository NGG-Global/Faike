"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CardPage } from "@/components/layout/CardPage";
import { runMock } from "@/mocks/run";

/* MOCK: sets up the state named in the query string, then moves on. */

// One run per link visit, even when effects run twice in development.
let inFlight: { search: string; promise: Promise<string> } | null = null;

function runOnce(search: string): Promise<string> {
  if (inFlight?.search !== search) {
    const promise = runMock(new URLSearchParams(search)).catch(() => "/mock");
    inFlight = { search, promise };
    promise.then(() => {
      if (inFlight?.promise === promise) inFlight = null;
    });
  }
  return inFlight.promise;
}

export default function MockRunPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    runOnce(window.location.search).then((destination) => {
      if (active) router.replace(destination);
    });
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <CardPage>
      <p role="status" className="text-center text-body text-muted">
        Setting up the mock…
      </p>
    </CardPage>
  );
}
