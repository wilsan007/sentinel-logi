import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn (classNames merger)", () => {
  it("fusionne plusieurs classes", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("ignore les valeurs falsy", () => {
    expect(cn("foo", false, null, undefined, "bar")).toBe("foo bar");
  });

  it("résout les conflits Tailwind (dernière classe gagne)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("supporte les objets conditionnels", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });
});
