import { useEffect, useState } from "react";
import { ArrowRightIcon } from "./icons";

interface DemoRow {
  field: string;
  before: string;
  after: string;
}

const DEMO_ROWS: DemoRow[] = [
  { field: "Handle",      before: "blue-shirt-variant",  after: "blue-shirt" },
  { field: "Option1 Name", before: "Attribute 1 name",  after: "Size" },
  { field: "Option1 Value", before: "Attribute 1 value(s)", after: "M" },
  { field: "Variant Price", before: "19,99",             after: "19.99" },
];

type Phase = "before" | "transition" | "after";

export function BeforeAfterDemo() {
  const [phase, setPhase] = useState<Phase>("before");

  useEffect(() => {
    const tick = () => {
      setPhase("before");
      const t1 = setTimeout(() => setPhase("transition"), 2200);
      const t2 = setTimeout(() => setPhase("after"), 3000);
      const t3 = setTimeout(() => setPhase("before"), 6000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    };

    const cleanup = tick();
    const interval = setInterval(tick, 7000);
    return () => { cleanup?.(); clearInterval(interval); };
  }, []);

  return (
    <div className="border border-[#EAEAEA] rounded-lg bg-white overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#EAEAEA] flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-widest text-[#B2B0AA]">
          Live Repair Preview
        </p>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded transition-all duration-500 ${
            phase === "after"
              ? "bg-[#EDF3EC] text-[#346538]"
              : "bg-[#FDEBEC] text-[#9F2F2D]"
          }`}
        >
          {phase === "after" ? "Shopify-ready" : "WooCommerce export"}
        </span>
      </div>

      <div className="divide-y divide-[#EAEAEA]">
        {DEMO_ROWS.map((row, i) => {
          const showAfter = phase === "after";
          const inTransition = phase === "transition";

          return (
            <div
              key={row.field}
              className="flex items-center px-5 py-2.5 gap-3"
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <span className="text-[11px] text-[#B2B0AA] w-28 shrink-0 font-mono">
                {row.field}
              </span>
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded truncate transition-all duration-400 ${
                    showAfter
                      ? "opacity-0 scale-95 w-0 overflow-hidden p-0"
                      : inTransition
                      ? "opacity-30 text-[#9F2F2D] bg-[#FDEBEC]"
                      : "text-[#9F2F2D] bg-[#FDEBEC]"
                  }`}
                >
                  {row.before}
                </span>

                {!showAfter && (
                  <ArrowRightIcon
                    size={10}
                    className={`text-[#B2B0AA] shrink-0 transition-opacity duration-300 ${
                      inTransition ? "opacity-100" : "opacity-0"
                    }`}
                  />
                )}

                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded truncate transition-all duration-400 ${
                    showAfter
                      ? "text-[#346538] bg-[#EDF3EC] opacity-100 scale-100"
                      : "opacity-0 scale-95 w-0 overflow-hidden p-0"
                  }`}
                >
                  {row.after}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-5 py-3 border-t border-[#EAEAEA] bg-[#FBFBFA]">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 rounded transition-colors duration-500 ${
                phase === "after" && i <= 2
                  ? "bg-[#346538]"
                  : phase === "transition" && i <= 1
                  ? "bg-[#346538]"
                  : i === 0
                  ? "bg-[#B2B0AA]"
                  : "bg-[#EAEAEA]"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
