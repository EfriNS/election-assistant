"use client";

import { useEffect } from "react";
import { mpTrack } from "@/lib/mixpanel";

// Fire-once page-open event for static (server-component) pages like /about,
// which have no other client code to track from.
export default function PageViewTracker({ event }: { event: string }) {
  useEffect(() => {
    mpTrack(event, { page: window.location.pathname });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
