export type RegimeType =
  | "NORMAL"
  | "COMPRESSION"
  | "ELEVATED_STRESS"
  | "CRITICAL"

export interface RegimeVisualTheme {
  base: string
  glow: string
  grid: string
  particles: string
  fog: string
}

export const REGIME_PALETTE: Record<RegimeType, RegimeVisualTheme> = {
  NORMAL: {
    base: "#00C2FF",
    glow: "#66E0FF",
    grid: "#0F2A3A",
    particles: "#9AE6FF",
    fog: "#04141C"
  },
  COMPRESSION: {
    base: "#7C3AED",
    glow: "#A78BFA",
    grid: "#1E1B3A",
    particles: "#C4B5FD",
    fog: "#0B0A1A"
  },
  ELEVATED_STRESS: {
    base: "#F59E0B",
    glow: "#FCD34D",
    grid: "#2A1A05",
    particles: "#FDE68A",
    fog: "#140C02"
  },
  CRITICAL: {
    base: "#B91C1C",
    glow: "#EF4444",
    grid: "#2A0A0A",
    particles: "#FCA5A5",
    fog: "#120303"
  }
}

export function getRegimeTheme(regime: RegimeType): RegimeVisualTheme {
  return REGIME_PALETTE[regime]
}
