type DocumentPredicate =
  | { "and": DocumentPredicate[] }
  | { "or": DocumentPredicate[] }
  | { "not": DocumentPredicate }
  | { "href_matches": string }
  | { "selector_matches": string };

type Requirement = "anonymous-client-ip-when-cross-origin";

type SpeculationRule = {
  source?: "list" | "document";
  urls?: string[];
  where?: DocumentPredicate;
  requires?: Requirement[];
  target_hint?: string;
  referrer_policy?: ReferrerPolicy;
  relative_to?: string;
  eagerness?: "conservative" | "moderate" | "eager" | "immediate";
  expects_no_vary_search?: string;
};

export type SpeculationRules = {
  prefetch?: SpeculationRule[];
  prerender?: SpeculationRule[];
};

// TODO: CSP inline-speculation-rules;
