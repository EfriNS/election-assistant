import mixpanel from "mixpanel-browser";

let initialized = false;

function getMixpanel() {
  if (typeof window === "undefined") return null;
  if (new URLSearchParams(window.location.search).get("notrack") === "1") return null;
  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (!token) return null;
  if (!initialized) {
    mixpanel.init(token, {
      debug: process.env.NODE_ENV !== "production",
      track_pageview: false,
      persistence: "localStorage",
      ip: false,
      api_host: "https://api-eu.mixpanel.com",
    });
    initialized = true;
  }
  return mixpanel;
}

export function mpIdentify(distinctId: string, superProps: Record<string, unknown>) {
  const mp = getMixpanel();
  if (!mp) return;
  mp.identify(distinctId);
  mp.register(superProps);
}

export function mpTrack(
  event: string,
  props: Record<string, unknown>,
  // e.g. { transport: "sendBeacon" } for pagehide/exit events — bypasses
  // request batching so the event survives the page being torn down.
  options?: { transport?: "sendBeacon" | "xhr" }
) {
  getMixpanel()?.track(event, props, options);
}
