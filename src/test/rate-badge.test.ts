import { describe, expect, it } from "vitest";
import { rateBadgeTone } from "@/lib/calc";

// 사용자 규칙: 목표 원가율 이하면 '좋음', 목표보다 10%p 이내로 높으면 '주의',
// 그보다 높으면 '점검 필요'.
describe("rateBadgeTone", () => {
  it("returns good at or below the target rate", () => {
    expect(rateBadgeTone(30, 30)).toBe("good");
    expect(rateBadgeTone(24.9, 30)).toBe("good");
  });

  it("returns warn within 10 percentage points above the target", () => {
    expect(rateBadgeTone(30.1, 30)).toBe("warn");
    expect(rateBadgeTone(40, 30)).toBe("warn");
  });

  it("returns bad more than 10 percentage points above the target", () => {
    expect(rateBadgeTone(40.1, 30)).toBe("bad");
    expect(rateBadgeTone(60, 30)).toBe("bad");
  });
});
