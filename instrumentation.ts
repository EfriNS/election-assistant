import { registerOTel } from "@vercel/otel";
import { LangfuseSpanProcessor } from "@langfuse/otel";

// Serverless functions can be frozen/terminated right after the response is
// sent — "immediate" export mode sends each span as it ends instead of
// batching, so a route's explicit forceFlush() (see app/api/*/route.ts) has
// nothing left to wait for.
export const langfuseSpanProcessor = new LangfuseSpanProcessor({
  exportMode: "immediate",
});

export function register() {
  registerOTel({ spanProcessors: [langfuseSpanProcessor] });
}
