import { useRef, useState } from "react";
import { UploadIcon } from "./icons";

interface Props {
  onUpload: (file: File) => void;
  loading: boolean;
  compact?: boolean;
}

export function CsvUpload({ onUpload, loading, compact = false }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      alert("Please upload a .csv file.");
      return;
    }
    onUpload(file);
  };

  return (
    <div className="relative">
      {/* Free badge */}
      {!compact && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-[#EDF3EC] text-[#346538] text-[10px] font-medium uppercase tracking-widest px-2.5 py-1 rounded-full border border-[#346538]/20">
            Free Diagnosis
          </span>
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        aria-label="Upload CSV file"
        className={`border-2 rounded-lg text-center cursor-pointer select-none transition-all duration-150 ${
          compact ? "p-6" : "p-12"
        } ${
          dragging
            ? "border-[#111111] bg-[#F5F5F4]"
            : "border-dashed border-[#B2B0AA] bg-white hover:border-[#111111] hover:bg-[#F9F9F8]"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {loading ? (
          <div className="space-y-3">
            <div className="w-6 h-6 border border-[#EAEAEA] border-t-[#787774] rounded-full animate-spin mx-auto" />
            <p className="text-sm text-[#787774]">Reading file…</p>
          </div>
        ) : (
          <div className={compact ? "space-y-2" : "space-y-3"}>
            <UploadIcon size={compact ? 24 : 36} className="mx-auto text-[#787774]" />
            <div>
              <p className={`font-medium text-[#111111] ${compact ? "text-sm" : "text-base"}`}>
                {compact ? "Drop CSV here or click to browse" : "Upload your broken Shopify file"}
              </p>
              {!compact && (
                <p className="text-sm text-[#787774] mt-1">or click to browse</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
