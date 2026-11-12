export type DocStatus =
  | "implemented"
  | "partially_implemented"
  | "planned"
  | "unsupported";

export type DocLocale = "en" | "pt";

export type DocBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "callout"; tone: "info" | "warning" | "limit"; title: string; text: string }
  | { type: "code"; language: string; code: string; caption?: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "status"; label: string; status: DocStatus }
  | { type: "linkList"; items: { href: string; label: string; description?: string }[] };

export type DocSection = {
  id: string;
  title: string;
  blocks: DocBlock[];
};

export type DocPage = {
  slug: string;
  title: string;
  description: string;
  sections: DocSection[];
};

export type DocNavItem = {
  href: string;
  labelKey: string;
  children?: DocNavItem[];
};
