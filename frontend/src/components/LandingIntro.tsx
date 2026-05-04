import { ArrowRightIcon, CheckIcon } from "./icons";

export function LandingIntro() {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <h1
        className="font-serif text-[2.6rem] leading-[1.1] text-[#111111] mb-3"
        style={{ letterSpacing: "-0.02em" }}
      >
        Fix broken Shopify variants
        <br />
        in seconds
      </h1>

      <p className="text-base font-medium text-[#111111] mb-4">
        Most CSV tools break variants. This one fixes them.
      </p>

      <p className="text-[0.9375rem] text-[#787774] leading-relaxed mb-10 max-w-sm mx-auto">
        Turn messy supplier CSVs into clean Shopify products with correct
        variants (S/M/L, colors, etc.)
      </p>

      <ul className="inline-flex flex-col gap-3 text-sm text-[#111111] text-left mb-10">
        {[
          "Groups duplicate rows into correct variants",
          "Detects sizes from SKUs (S, M, L, XL)",
          "Fixes broken variant imports (no more duplicate products)",
        ].map((item) => (
          <li key={item} className="flex items-center gap-2.5">
            <CheckIcon size={13} className="text-[#346538] shrink-0" />
            {item}
          </li>
        ))}
      </ul>

      <div className="border border-[#EAEAEA] rounded-lg px-6 py-5 text-left max-w-sm mx-auto">
        <p className="text-[10px] font-medium uppercase tracking-widest text-[#B2B0AA] mb-4">
          Example
        </p>
        <div className="flex items-start gap-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#B2B0AA] mb-2">
              Before
            </p>
            <p className="text-sm text-[#787774]">Blue T-Shirt (S)</p>
            <p className="text-sm text-[#787774]">Blue T-Shirt (M)</p>
            <p className="text-xs text-[#9F2F2D] mt-1.5">
              2 separate products
            </p>
          </div>
          <ArrowRightIcon size={12} className="text-[#B2B0AA] shrink-0 mt-6" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#B2B0AA] mb-2">
              After
            </p>
            <p className="text-sm text-[#111111] font-medium">
              1 product, 2 variants
            </p>
            <p className="text-xs text-[#346538] mt-1.5">
              correct Shopify format
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
