import { describe, expect, it } from "vitest";
import { buildMessages, EMPTY_VOICE, fillNamePlaceholders, stripDashes, type Thread } from "../src";

const thread: Thread = {
  id: "thread-f:1",
  source: "test",
  subject: "Job alert",
  userEmail: "me@example.com",
  userName: "Bhuvan Rajanahally Jayakumar",
  userSignature: "Bhuvan Rajanahally Jayakumar\nMS CS, USC\n(213) 555-0100",
  messages: [],
};

describe("stripDashes", () => {
  it("replaces em dashes and double hyphens, keeps single hyphens", () => {
    expect(stripDashes("Thanks — see you then.")).toBe("Thanks, see you then.");
    expect(stripDashes("Thanks -- see you then.")).toBe("Thanks, see you then.");
    expect(stripDashes("Thanks—see you.")).toBe("Thanks, see you.");
    expect(stripDashes("Free Oct 1–3 – mornings only")).toBe("Free Oct 1-3, mornings only");
    expect(stripDashes("— first\n  -- second")).toBe("first\n  second");
    expect(stripDashes("Sounds good —.")).toBe("Sounds good.");
    expect(stripDashes("a well-known, follow-up plan - really")).toBe("a well-known, follow-up plan - really");
  });
});

describe("name and signature", () => {
  it("tells the model the name, first name and signature, and how to pick a sign-off", () => {
    const system = buildMessages({ thread, boxText: "decline", history: [], voice: EMPTY_VOICE, context: [] })[0].content;
    expect(system).toContain("The user's name: Bhuvan Rajanahally Jayakumar (first name: Bhuvan).");
    expect(system).toContain("---\nBhuvan Rajanahally Jayakumar\nMS CS, USC\n(213) 555-0100\n---");
    expect(system).toMatch(/just the first name for casual/);
    expect(system).toMatch(/full signature for first contact/);
    expect(system).toMatch(/Never write a placeholder like \[Your name\]/);
    expect(system).toMatch(/signature is unknown, sign with the first name only/);
    expect(system).toMatch(/notes say they sign off wins/);
  });

  it("leaves both out when unknown", () => {
    const system = buildMessages({ thread: { ...thread, userName: undefined, userSignature: undefined }, boxText: "x", history: [], voice: EMPTY_VOICE, context: [] })[0].content;
    expect(system).not.toContain("The user's name:");
    expect(system).not.toContain("full signature, between");
  });

  it("fills name placeholders the model still writes", () => {
    expect(fillNamePlaceholders("Thank you,\n[Your name]", "Bhuvan Rajanahally Jayakumar")).toBe("Thank you,\nBhuvan");
    expect(fillNamePlaceholders("Best,\n[Your Full Name]", "Bhuvan Rajanahally Jayakumar")).toBe("Best,\nBhuvan Rajanahally Jayakumar");
    expect(fillNamePlaceholders("Thanks,\n[Name]", "Bhuvan Rajanahally Jayakumar")).toBe("Thanks,\nBhuvan");
  });

  it("drops the placeholder line when the name is unknown", () => {
    expect(fillNamePlaceholders("Thank you,\n[Your name]\n")).toBe("Thank you,");
  });
});
