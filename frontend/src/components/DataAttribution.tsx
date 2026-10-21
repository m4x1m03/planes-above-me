import type { CSSProperties } from "react";

const ADSB_URL = "https://adsb.lol";
const ODBL_URL = "https://opendatacommons.org/licenses/odbl/";

// For MapLibre's attribution control (rendered as HTML)
export const ADSB_ATTRIBUTION_HTML =
  `Flight data © <a href="${ADSB_URL}" target="_blank" rel="noopener">adsb.lol</a> ` +
  `(<a href="${ODBL_URL}" target="_blank" rel="noopener">ODbL</a>)`;

// For views without a map (radar, dome)
export function DataAttribution({ style }: { style?: CSSProperties }) {
  const link: CSSProperties = { color: "inherit" };
  return (
    <p style={{ margin: 0, fontSize: 11, color: "#6e7681", ...style }}>
      Flight data © <a href={ADSB_URL} target="_blank" rel="noopener" style={link}>adsb.lol</a>{" "}
      (<a href={ODBL_URL} target="_blank" rel="noopener" style={link}>ODbL</a>)
    </p>
  );
}