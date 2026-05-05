import { CheckIcon } from "./icons";
import { BeforeAfterDemo } from "./BeforeAfterDemo";

export function LandingIntro() {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <h1
        className="font-serif text-[2.6rem] leading-[1.1] text-[#111111] mb-3"
        style={{ letterSpacing: "-0.02em" }}
      >
        Stop Shopify Import
        <br />
        Errors Instantly.
      </h1>

      <p className="text-base font-medium text-[#111111] mb-4">
        The only tool that diagnoses and fixes Shopify import errors automatically.
      </p>

      <p className="text-[0.9375rem] text-[#787774] leading-relaxed mb-8 max-w-md mx-auto">
        Handle mismatches, Default Title conflicts, broken WooCommerce and Etsy
        migrations — diagnosed in seconds, repaired in one click.
      </p>

      <ul className="inline-flex flex-col gap-3 text-sm text-[#111111] text-left mb-10">
        {[
          "Detects every \"Handle already exists\" error before import",
          "Fixes WooCommerce parent/child rows → Shopify variants",
          "Removes Default Title placeholders that break variant import",
          "Replaces smart quotes, strips bad encoding (Excel-safe)",
        ].map((item) => (
          <li key={item} className="flex items-start gap-2.5">
            <CheckIcon size={13} className="text-[#346538] shrink-0 mt-0.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {/* Animated Before/After */}
      <div className="max-w-sm mx-auto mb-10">
        <BeforeAfterDemo />
      </div>

      {/* Trust signals */}
      <p className="text-[11px] text-[#B2B0AA] uppercase tracking-widest">
        Compatible with &nbsp;WooCommerce · Etsy · Magento · BigCommerce exports
      </p>
    </div>
  );
}
