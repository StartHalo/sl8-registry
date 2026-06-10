// The contract every style component depends on. The render skill writes a props.json
// shaped like NewsVideoProps; the structure skill writes the (richer) RawNewsDoc.
// `normalizeDoc` collapses the rich, provenance-tracked NewsDoc into the flat RenderDoc
// the style components actually draw — so styles never touch provenance fields.

export type StyleName =
  | "headline-highlight"
  | "breaking-news"
  | "kinetic-typography"
  | "minimal-editorial";

export type Orientation = "landscape" | "portrait" | "square";

export interface Brand {
  accent: string; // primary accent (hex)
  accentAlt?: string | null; // secondary accent
  label?: string | null; // short brand/source label for a bug/credit (e.g. "ACME")
}

// ---- Rich NewsDoc as written by bot-012-news-structure (loose: accepts string or object) ----
export interface TextField {
  text: string;
  source_span?: string;
  compressed?: boolean;
}
export interface RawDateline {
  location?: string | null;
  date?: string | null;
  date_display?: string | null;
}
export interface RawSource {
  name?: string | null;
  url?: string | null;
  byline?: string | null;
}
export interface RawBeat {
  text: string;
  role?: string;
  source_span?: string;
  w5h?: string[];
  compressed?: boolean;
}
export interface RawStat {
  value: string;
  label: string;
  source_span?: string;
}
export interface RawQuote {
  text: string;
  speaker?: string | null;
  speaker_title?: string | null;
  source_span?: string;
}
export interface RawNewsDoc {
  schema_version?: string;
  headline: string | TextField;
  dek?: string | TextField | null;
  dateline?: RawDateline | null;
  source?: RawSource | null;
  body_beats?: Array<string | RawBeat>;
  key_phrases?: string[];
  primary_stat?: RawStat | null;
  quote?: RawQuote | null;
  category?: string;
  tone?: string;
  recommended_style?: StyleName;
  meta?: Record<string, unknown>;
}

// ---- Canonical render-facing doc (what every style component consumes) ----
export interface RenderDoc {
  headline: string;
  dek: string | null;
  dateline: { location: string | null; dateDisplay: string | null };
  source: { name: string | null; byline: string | null };
  bodyBeats: string[];
  keyPhrases: string[];
  primaryStat: { value: string; label: string } | null;
  quote: { text: string; speaker: string | null; speakerTitle: string | null } | null;
  category: string;
  tone: string;
}

export interface StyleRootProps {
  doc: RenderDoc;
  brand: Required<Pick<Brand, "accent">> & Brand;
  seed: number;
}

// Props the registered <Composition> receives (and what props.json carries).
// Must be a `type` (not `interface`) so it satisfies Remotion's
// `Props extends Record<string, unknown>` constraint — interfaces lack the implicit
// index signature that assignability to Record<string, unknown> needs.
export type NewsVideoProps = {
  style: StyleName;
  doc: RawNewsDoc;
  brand: Brand;
  seed: number;
  durationSeconds: number;
};

const asText = (v: string | TextField | null | undefined): string | null =>
  v == null ? null : typeof v === "string" ? v : (v.text ?? null);

export function normalizeDoc(raw: RawNewsDoc): RenderDoc {
  const beats = (raw.body_beats ?? [])
    .map((b) => (typeof b === "string" ? b : b.text))
    .filter((s): s is string => Boolean(s && s.trim()));
  return {
    headline: asText(raw.headline) ?? "",
    dek: asText(raw.dek ?? null),
    dateline: {
      location: raw.dateline?.location ?? null,
      dateDisplay: raw.dateline?.date_display ?? raw.dateline?.date ?? null,
    },
    source: { name: raw.source?.name ?? null, byline: raw.source?.byline ?? null },
    bodyBeats: beats,
    keyPhrases: (raw.key_phrases ?? []).filter((s): s is string => Boolean(s && s.trim())),
    primaryStat: raw.primary_stat
      ? { value: raw.primary_stat.value, label: raw.primary_stat.label }
      : null,
    quote: raw.quote
      ? {
          text: raw.quote.text,
          speaker: raw.quote.speaker ?? null,
          speakerTitle: raw.quote.speaker_title ?? null,
        }
      : null,
    category: raw.category ?? "other",
    tone: raw.tone ?? "neutral",
  };
}

export const DEFAULT_BRAND: Brand = { accent: "#C8102E", accentAlt: "#0B1F3A", label: null };
