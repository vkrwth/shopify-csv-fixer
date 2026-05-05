import { useParams, Navigate } from "react-router-dom";
import { CheckIcon, WarningIcon } from "../components/icons";
import { CsvUpload } from "../components/CsvUpload";

interface ErrorSpec {
  code: string;
  headline: string;
  shopifyMessage: string;
  cause: string;
  fix: string;
  bullets: string[];
  faqQ: string;
  faqA: string;
}

const ERROR_SPECS: Record<string, ErrorSpec> = {
  "validation-failed-variant-exists": {
    code: "ERR_DEFAULT_TITLE_CLASH",
    headline: "Fix: Shopify \"Validation failed — variant already exists\"",
    shopifyMessage: "Validation failed for: Variant already exists",
    cause:
      "Your CSV contains a row with Option1 Value set to \"Default Title\" alongside real variant rows for the same product. Shopify treats \"Default Title\" as a placeholder for single-variant products — it clashes with real variants.",
    fix: "Shopify CSV Doctor detects every \"Default Title\" placeholder row inside multi-variant products and removes it automatically before import.",
    bullets: [
      "Finds all products with mixed Default Title + real variant rows",
      "Removes placeholder rows while preserving real variant data",
      "Outputs a clean file Shopify accepts with zero errors",
    ],
    faqQ: "How do I fix 'Validation failed — Variant already exists' in Shopify?",
    faqA:
      "This error means a product has a 'Default Title' placeholder row alongside real variant rows. Remove any row where Option1 Name is 'Title' and Option1 Value is 'Default Title' for products that have more than one row. Shopify CSV Doctor does this automatically.",
  },
  "ignored-line-handle-exists": {
    code: "ERR_INCONSISTENT_HANDLE",
    headline: "Fix: Shopify \"Ignored line N — Handle already exists\"",
    shopifyMessage: "Ignored line 45 because handle 'my-product' already exists",
    cause:
      "Shopify silently skips rows when variant rows for the same product have different Handle values. This is common in WooCommerce exports where parent and child rows get different slugs.",
    fix: "Shopify CSV Doctor groups rows by Title, detects every Handle inconsistency, and rewrites all variant rows to share the correct Handle from the first row of each product group.",
    bullets: [
      "Groups all rows by product Title",
      "Detects Handle mismatches within each group",
      "Overwrites inconsistent Handles with the canonical value",
    ],
    faqQ: "How do I fix 'Ignored line because handle already exists' in Shopify?",
    faqA:
      "This error means multiple rows claim to be the same product but have different Handle values. All variant rows of one product must share exactly one Handle. Upload your CSV to Shopify CSV Doctor to auto-fix all Handle inconsistencies.",
  },
  "illegal-quoting-on-line": {
    code: "ERR_ILLEGAL_CHARACTERS",
    headline: "Fix: Shopify \"Illegal quoting on line N\"",
    shopifyMessage: "Illegal quoting on line 12",
    cause:
      "Microsoft Excel and some editors replace standard straight quotes (\") with curly/smart quotes (“”). Shopify's CSV parser treats curly quotes as syntax errors and refuses to import the file.",
    fix: "Shopify CSV Doctor scans the entire file byte-by-byte before import and replaces all curly quote characters with standard straight quotes, then re-encodes the file as UTF-8.",
    bullets: [
      "Detects all 6 variants of smart/curly quotes",
      "Replaces them globally in a single pass",
      "Re-encodes output as UTF-8 with BOM (Shopify's preferred format)",
    ],
    faqQ: "How do I fix 'Illegal quoting on line N' in Shopify CSV imports?",
    faqA:
      "Open the CSV in a plain-text editor (not Excel) and replace all curly quotes with straight quotes. Or upload the file to Shopify CSV Doctor — it detects and fixes all encoding issues automatically.",
  },
  "daily-variant-limit-reached": {
    code: "WARN_VARIANT_LIMIT_EXCEEDED",
    headline: "Fix: Shopify \"Daily variant limit reached\"",
    shopifyMessage: "Daily variant limit reached for product 'Big Bundle'",
    cause:
      "Shopify enforces a hard limit of 100 variants per product. If a single Handle has more than 100 rows in your CSV, the import will fail or truncate silently.",
    fix: "Shopify CSV Doctor detects every product that exceeds 100 variant rows and flags them before you import. You can then split the product or reduce the variant count before uploading to Shopify.",
    bullets: [
      "Counts variant rows per Handle across the entire file",
      "Flags every product over the 100-variant limit",
      "Provides exact row numbers so you can edit before importing",
    ],
    faqQ: "How do I fix 'Daily variant limit reached' in Shopify?",
    faqA:
      "Shopify allows a maximum of 100 variants per product (combinations of up to 3 option types with up to 100 total rows). If you exceed this, you need to split the product into multiple listings or remove some variant combinations. Use Shopify CSV Doctor to identify which products exceed the limit.",
  },
};

interface Props {
  onUpload: (file: File) => void;
  loading: boolean;
}

export function ErrorFixPage({ onUpload, loading }: Props) {
  const { errorCode } = useParams<{ errorCode: string }>();
  const spec = errorCode ? ERROR_SPECS[errorCode] : undefined;

  if (!spec) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-[#FBFBFA] font-sans">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-[#EAEAEA]">
        <div className="max-w-4xl mx-auto px-8 h-12 flex items-center">
          <a href="/" className="font-mono text-[11px] text-[#787774] uppercase tracking-widest hover:text-[#111111] transition-colors">
            Shopify CSV Doctor
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-16">
        {/* Error badge */}
        <div className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-[#9F2F2D] bg-[#FDEBEC] px-2.5 py-1 rounded mb-6">
          <WarningIcon size={11} className="text-[#9F2F2D]" />
          Shopify Import Error
        </div>

        <h1 className="font-serif text-3xl leading-tight text-[#111111] mb-4" style={{ letterSpacing: "-0.02em" }}>
          {spec.headline}
        </h1>

        {/* Shopify error string */}
        <div className="bg-[#FBFBFA] border border-[#EAEAEA] rounded-lg px-4 py-3 mb-8 font-mono text-sm text-[#9F2F2D]">
          ✕ &nbsp;{spec.shopifyMessage}
        </div>

        <div className="space-y-8">
          {/* Cause */}
          <section>
            <h2 className="text-xs font-medium uppercase tracking-widest text-[#B2B0AA] mb-3">
              Why this happens
            </h2>
            <p className="text-[0.9375rem] text-[#111111] leading-relaxed">{spec.cause}</p>
          </section>

          {/* Fix */}
          <section>
            <h2 className="text-xs font-medium uppercase tracking-widest text-[#B2B0AA] mb-3">
              How it gets fixed
            </h2>
            <p className="text-[0.9375rem] text-[#111111] leading-relaxed mb-4">{spec.fix}</p>
            <ul className="space-y-2">
              {spec.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-[#111111]">
                  <CheckIcon size={13} className="text-[#346538] shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
          </section>

          {/* Upload widget */}
          <section className="border border-[#EAEAEA] rounded-lg bg-white p-6">
            <p className="text-sm font-medium text-[#111111] mb-1">Upload your CSV to fix this now</p>
            <p className="text-xs text-[#787774] mb-5">Free diagnosis — see all errors before downloading the fixed file.</p>
            <CsvUpload onUpload={onUpload} loading={loading} compact />
          </section>

          {/* FAQ hidden from visual UI but present in DOM for schema */}
          <section className="border-t border-[#EAEAEA] pt-8">
            <h2 className="text-xs font-medium uppercase tracking-widest text-[#B2B0AA] mb-4">
              Frequently asked
            </h2>
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer py-3 text-sm font-medium text-[#111111] list-none">
                {spec.faqQ}
                <span className="text-[#B2B0AA] group-open:rotate-45 transition-transform duration-150 text-lg leading-none">+</span>
              </summary>
              <p className="pb-4 text-sm text-[#787774] leading-relaxed">{spec.faqA}</p>
            </details>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#EAEAEA] mt-20">
        <div className="max-w-4xl mx-auto px-8 py-6 text-center text-xs text-[#B2B0AA]">
          Compatible with WooCommerce, Etsy, Magento, and BigCommerce exports.
        </div>
      </footer>
    </div>
  );
}
