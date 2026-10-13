import { describe, expect, it } from "vitest";
import { checkTimeWindow } from "@/lib/rules";
import { addDays, dayBoundsUtc, localParts, zonedToUtc } from "@/lib/time";

const TZ = "Asia/Colombo"; // UTC+05:30, no DST
const NOW = new Date("2026-10-12T00:00:00Z");
const at = (date: string, time: string) => zonedToUtc(date, time, TZ);
const check = (s: Date, e: Date) => checkTimeWindow(s, e, NOW, TZ);

describe("time helpers", () => {
  it("converts local wall-clock time to UTC", () => {
    expect(at("2026-10-13", "09:00").toISOString()).toBe("2026-10-13T03:30:00.000Z");
  });

  it("handles a DST timezone", () => {
    expect(zonedToUtc("2026-07-01", "09:00", "America/New_York").toISOString()).toBe(
      "2026-07-01T13:00:00.000Z",
    );
    expect(zonedToUtc("2026-01-15", "09:00", "America/New_York").toISOString()).toBe(
      "2026-01-15T14:00:00.000Z",
    );
  });

  it("round-trips through localParts", () => {
    const d = at("2026-10-13", "21:15");
    expect(localParts(d, TZ)).toEqual({ date: "2026-10-13", time: "21:15", minutesOfDay: 1275 });
  });

  it("computes day bounds and date arithmetic", () => {
    const { start, end } = dayBoundsUtc("2026-10-13", TZ);
    expect(end.getTime() - start.getTime()).toBe(86_400_000);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("checkTimeWindow", () => {
  it("accepts a normal reservation", () => {
    expect(check(at("2026-10-13", "09:00"), at("2026-10-13", "10:30"))).toBeNull();
  });

  it("accepts the whole bookable day boundaries", () => {
    expect(check(at("2026-10-13", "07:00"), at("2026-10-13", "15:00"))).toBeNull();
    expect(check(at("2026-10-13", "13:00"), at("2026-10-13", "21:00"))).toBeNull();
  });

  it("rejects end <= start", () => {
    expect(check(at("2026-10-13", "10:00"), at("2026-10-13", "10:00"))).toMatch(/after the start/);
    expect(check(at("2026-10-13", "10:00"), at("2026-10-13", "09:00"))).toMatch(/after the start/);
  });

  it("rejects too short and too long", () => {
    expect(check(at("2026-10-13", "10:00"), at("2026-10-13", "10:10"))).toMatch(/at least/);
    expect(check(at("2026-10-13", "07:00"), at("2026-10-13", "15:15"))).toMatch(/at most 8 hours/);
  });

  it("rejects the past, and too far ahead", () => {
    expect(check(at("2026-10-11", "09:00"), at("2026-10-11", "10:00"))).toMatch(/past/);
    expect(check(at("2027-03-01", "09:00"), at("2027-03-01", "10:00"))).toMatch(/90 days/);
  });

  it("rejects reservations that cross midnight", () => {
    expect(check(at("2026-10-13", "20:00"), at("2026-10-14", "02:00"))).toMatch(/same day/);
  });

  it("rejects off-grid times", () => {
    expect(check(at("2026-10-13", "09:05"), at("2026-10-13", "10:00"))).toMatch(/15-minute/);
  });

  it("rejects times outside operating hours", () => {
    expect(check(at("2026-10-13", "06:45"), at("2026-10-13", "08:00"))).toMatch(/between 7:00 and 21:00/);
    expect(check(at("2026-10-13", "20:00"), at("2026-10-13", "21:15"))).toMatch(/between 7:00 and 21:00/);
  });

  it("rejects invalid dates", () => {
    expect(check(new Date("nope"), at("2026-10-13", "10:00"))).toMatch(/valid/);
  });
});
