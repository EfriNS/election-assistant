"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    _uxa: unknown[];
  }
}

export default function ContentSquareTracker() {
  const pathname = usePathname();

  useEffect(() => {
    window._uxa = window._uxa || [];
    window._uxa.push(["trackPageview", pathname]);
  }, [pathname]);

  return null;
}
