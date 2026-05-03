import { ArrowRightIcon, CheckIcon } from "./icons";

interface Props {
  onCta: () => void;
}

export function LandingIntro({ onCta }: Props) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <h1
        className="font-serif text-[2.6rem] leading-[1.1] text-[#111111] mb-5"
        style={{ letterSpacing: "-0.02em" }}
      >
        Fix your Shopify CSV import
        <br />
        <span className="text-[#787774]">(especially variants)</span>
      </h1>

      <p className="text-[0.9375rem] text-[#787774] leading-relaxed mb-10 max-w-sm mx-auto">
        Upload your supplier file and get a Shopify-ready CSV that actually
        works.
      </p>

      <ul className="inline-flex flex-col gap-3 text-sm text-[#111111] text-left mb-10">
        {[
          "Automatically maps columns",
          "Detects variants (S/M/L, etc.)",
          "Fixes European price formats (19,99 → 19.99)",
        ].map((item) => (
          <li key={item} className="flex items-center gap-2.5">
            <CheckIcon size={13} className="text-[#346538] shrink-0" />
            {item}
          </li>
        ))}
      </ul>

      <button
        onClick={onCta}
        className="inline-block px-6 py-3 text-sm font-medium text-white bg-[#111111] rounded transition-all duration-150 hover:bg-[#333333] active:scale-[0.98] mb-12"
        style={{ willChange: "transform" }}
      >
        Upload your CSV
      </button>

      <div className="border border-[#EAEAEA] rounded-lg px-6 py-5 text-left max-w-xs mx-auto">
        <p className="text-[10px] font-medium uppercase tracking-widest text-[#B2B0AA] mb-4">
          Example
        </p>
        <div className="flex items-start gap-4">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-[#B2B0AA] mb-2">
              Before
            </p>
            <p className="text-sm text-[#787774]">Blue T-Shirt (S)</p>
            <p className="text-sm text-[#787774]">Blue T-Shirt (M)</p>
          </div>
          <ArrowRightIcon size={12} className="text-[#B2B0AA] mt-7 shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#B2B0AA] mb-2">
              After
            </p>
            <p className="text-sm text-[#111111] font-medium">
              1 product with variants (S, M)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
