import { describe, it, expect } from "vitest";
import {
  metersToFeet,
  msToKnots,
  msToKmh,
  msToFpm,
  degreesToCompass,
  formatNumber,
  flightLevel,
  formatBearing,
  trendArrow,
  orDash,
} from "./units";

// formatNumber uses the runtime's default locale, so build expectations the same way
// instead of hard-coding "35,000" (which would fail on a French machine: "35 000").
const fmt = (n: number) => new Intl.NumberFormat().format(n);

describe("metersToFeet", () => {
  it("converts zero", () => expect(metersToFeet(0)).toBe(0));
  it("converts one metre", () => expect(metersToFeet(1)).toBeCloseTo(3.28084, 5));
  it("converts a typical cruise altitude", () => expect(metersToFeet(10_668)).toBeCloseTo(35_000, 0));
  it("keeps negative values negative", () => expect(metersToFeet(-10)).toBeCloseTo(-32.8084, 4));
});

describe("msToKnots", () => {
  it("converts zero", () => expect(msToKnots(0)).toBe(0));
  it("converts one m/s", () => expect(msToKnots(1)).toBeCloseTo(1.943844, 6));
  it("converts a typical cruise speed", () => expect(msToKnots(230)).toBeCloseTo(447.1, 1));
});

describe("msToKmh", () => {
  it("converts zero", () => expect(msToKmh(0)).toBe(0));
  it("converts 10 m/s to 36 km/h", () => expect(msToKmh(10)).toBeCloseTo(36));
  it("converts a typical cruise speed", () => expect(msToKmh(230)).toBeCloseTo(828));
});

describe("msToFpm", () => {
  it("converts zero", () => expect(msToFpm(0)).toBe(0));
  it("converts a climb", () => expect(msToFpm(5)).toBeCloseTo(984.25, 1));
  it("keeps descents negative", () => expect(msToFpm(-5)).toBeCloseTo(-984.25, 1));
  it("agrees with metersToFeet × 60", () => expect(msToFpm(1)).toBeCloseTo(metersToFeet(1) * 60, 2));
});

describe("degreesToCompass", () => {
  it.each([
    [0, "N"],
    [45, "NE"],
    [90, "E"],
    [135, "SE"],
    [180, "S"],
    [225, "SW"],
    [270, "W"],
    [315, "NW"],
  ])("maps %i° to %s", (deg, point) => expect(degreesToCompass(deg)).toBe(point));

  it("rounds to the nearest point", () => {
    expect(degreesToCompass(22.4)).toBe("N");
    expect(degreesToCompass(22.5)).toBe("NE");
  });

  it("wraps back to N just before 360", () => {
    expect(degreesToCompass(337.4)).toBe("NW");
    expect(degreesToCompass(337.5)).toBe("N");
    expect(degreesToCompass(359)).toBe("N");
  });

  it("treats 360 as N", () => expect(degreesToCompass(360)).toBe("N"));
  it("normalises negatives", () => expect(degreesToCompass(-90)).toBe("W"));
  it("normalises values above 360", () => expect(degreesToCompass(450)).toBe("E"));
});

describe("formatNumber", () => {
  it("rounds to integers by default", () => expect(formatNumber(1234.6)).toBe(fmt(1235)));
  it("adds locale separators", () => expect(formatNumber(35_000)).toBe(fmt(35_000)));
  it("rounds to a step", () => expect(formatNumber(34_987, 100)).toBe(fmt(35_000)));
  it("rounds to a larger step", () => expect(formatNumber(34_987, 1000)).toBe(fmt(35_000)));
  it("handles zero", () => expect(formatNumber(0)).toBe(fmt(0)));
  it("keeps negative values negative", () => expect(formatNumber(-984.25)).toBe(fmt(-984)));

  // Math.round(-0.4) is -0, and Intl formats -0 as "-0".
  // This fails until formatNumber turns -0 into 0 (see the note in the reply).
  it("never shows a negative zero", () => expect(formatNumber(-0.4)).toBe(fmt(0)));
});

describe("flightLevel", () => {
  it("rounds to hundreds of feet and pads", () => expect(flightLevel(2591)).toBe("FL085"));
  it("handles the ground", () => expect(flightLevel(0)).toBe("FL000"));
  it("clamps slightly negative baro altitudes", () => expect(flightLevel(-20)).toBe("FL000"));
  it("handles cruise altitude", () => expect(flightLevel(11_278)).toBe("FL370"));
  it("doesn't pad four-digit levels away", () => expect(flightLevel(30_480)).toBe("FL1000"));
});

describe("formatBearing", () => {
  it("pads and rounds", () => expect(formatBearing(40.4)).toBe("040°"));
  it("pads single digits", () => expect(formatBearing(5)).toBe("005°"));
  it("handles north", () => expect(formatBearing(0)).toBe("000°"));
  it("wraps 359.6 to 000", () => expect(formatBearing(359.6)).toBe("000°"));
  it("keeps 359.4 as 359", () => expect(formatBearing(359.4)).toBe("359°"));
  it("treats 360 as 000", () => expect(formatBearing(360)).toBe("000°"));
  it("normalises negatives", () => expect(formatBearing(-90)).toBe("270°"));
  it("normalises above 360", () => expect(formatBearing(450)).toBe("090°"));
});

describe("trendArrow", () => {
  it("is level inside the dead band", () => {
    expect(trendArrow(0)).toBe("→");
    expect(trendArrow(0.4)).toBe("→");
    expect(trendArrow(-0.4)).toBe("→");
  });
  it("is level exactly on the band edges", () => {
    expect(trendArrow(0.5)).toBe("→");
    expect(trendArrow(-0.5)).toBe("→");
  });
  it("climbs above it", () => expect(trendArrow(0.6)).toBe("↗"));
  it("descends below it", () => expect(trendArrow(-0.6)).toBe("↘"));
  it("handles strong climbs and descents", () => {
    expect(trendArrow(15)).toBe("↗");
    expect(trendArrow(-15)).toBe("↘");
  });
});

describe("orDash", () => {
  it("shows a dash for null", () => expect(orDash(null, flightLevel)).toBe("—"));
  it("shows a dash for undefined", () => expect(orDash(undefined, flightLevel)).toBe("—"));
  it("formats real values, including 0", () => expect(orDash(0, flightLevel)).toBe("FL000"));
  it("passes the value through to the formatter", () => {
    expect(orDash(40.4, formatBearing)).toBe("040°");
    expect(orDash(-0.6, trendArrow)).toBe("↘");
  });
  it("works with formatters that return numbers", () => {
    expect(orDash(10, msToKmh)).toBeCloseTo(36);
  });
  it("doesn't call the formatter for null", () => {
    let called = false;
    orDash(null, (v) => {
      called = true;
      return v;
    });
    expect(called).toBe(false);
  });
});