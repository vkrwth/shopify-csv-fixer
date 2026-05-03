import { useRef, useState } from "react";
import { UploadIcon } from "./icons";

interface Props {
  onUpload: (file: File) => void;
  loading: boolean;
}

export function CsvUpload({ onUpload, loading }: Props) {
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
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload CSV file"
      className={`border-2 rounded-lg p-12 text-center cursor-pointer select-none transition-all duration-150 ${
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
        <div className="space-y-3">
          <UploadIcon size={36} className="mx-auto text-[#787774]" />
          <div>
            <p className="text-base font-medium text-[#111111]">
              Drop your CSV here
            </p>
            <p className="text-sm text-[#787774] mt-1">or click to browse</p>
          </div>
        </div>
      )}
    </div>
  );
}
