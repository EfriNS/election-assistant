import { describe, it, expect } from "vitest";
import { escapeSlackMrkdwn } from "@/lib/slack";

describe("escapeSlackMrkdwn", () => {
  it("escapes &, <, > in that order", () => {
    expect(escapeSlackMrkdwn("A & B < C > D")).toBe("A &amp; B &lt; C &gt; D");
  });

  it("neutralizes a Slack special-mention injection attempt", () => {
    expect(escapeSlackMrkdwn("<!channel> check this out")).toBe("&lt;!channel&gt; check this out");
  });

  it("neutralizes a disguised-link injection attempt", () => {
    expect(escapeSlackMrkdwn("<https://evil.example|click here>")).toBe(
      "&lt;https://evil.example|click here&gt;"
    );
  });

  it("leaves plain text unchanged", () => {
    expect(escapeSlackMrkdwn("regular feedback text")).toBe("regular feedback text");
  });

  it("does not double-escape when & appears before < or >", () => {
    expect(escapeSlackMrkdwn("R&D <tag>")).toBe("R&amp;D &lt;tag&gt;");
  });
});
