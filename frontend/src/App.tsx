import { useEffect, useMemo, useState } from "react";
import { previewCsv, transformCsv, validateCsv } from "./api/client";
import { FadeIn } from "./components/FadeIn";
import { LandingIntro } from "./components/LandingIntro";
import { CsvPreview } from "./components/CsvPreview";
import { CsvUpload } from "./components/CsvUpload";
import { MappingTable } from "./components/MappingTable";
import { OutputPreview } from "./components/OutputPreview";
import { TransformationSummary } from "./components/TransformationSummary";
import { PreFlightReport } from "./components/PreFlightReport";
import { ArrowRightIcon } from "./components/icons";
import {
  applyDiagnosticSuggestions,
  buildAutoMapping,
  buildRepairDefaults,
} from "./types";
import { buildOutputPreview } from "./utils/preview";
import { track } from "./lib/posthog";
import type {
  DiagnosticReport,
  Mapping,
  PreviewResponse,
  RepairOptions,
  ShopifyField,
} from "./types";

type Step = "upload" | "preflight" | "mapping";

const EMPTY_META = {
  hasDuplicateTitles: false,
  variantsWithSizeDetected: false,
  variantsWithoutSize: false,
  variantGroupsCount: 0,
  variantRowsCount: 0,
};

export default function App() {
  const [step, setStep] = useState<Step>("upload");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticReport | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [repairOptions, setRepairOptions] = useState<RepairOptions>({
    sanitizeEncoding: false,
    syncHandles: false,
    scrubPlaceholders: false,
    partitionFile: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadFilename, setDownloadFilename] = useState("shopify_ready.csv");

  const { rows: outputRows, meta: previewMeta } = useMemo(
    () =>
      preview
        ? buildOutputPreview(preview.columns, preview.rows, mapping)
        : { rows: [], meta: EMPTY_META },
    [preview, mapping]
  );

  const handleUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    track("upload_started");
    try {
      const [previewData, diagnosticData] = await Promise.all([
        previewCsv(file),
        validateCsv(file),
      ]);
      setUploadedFile(file);
      setPreview(previewData);
      setDiagnostic(diagnosticData);

      // Build mapping: auto-map + apply diagnostic suggestions
      const base = buildAutoMapping(previewData.columns);
      const enriched = applyDiagnosticSuggestions(base, diagnosticData.nonStandardHeaders);
      setMapping(enriched);
      setRepairOptions(buildRepairDefaults(diagnosticData));
      setDownloadSuccess(false);
      setStep("preflight");
      track("upload_parsed", {
        number_of_columns: previewData.columns.length,
        preview_rows: previewData.rows.length,
        errors_found: diagnosticData.summary.errorsCount,
        warnings_found: diagnosticData.summary.warningsCount,
      });
    } catch {
      setError("Could not parse this file. Make sure it is a valid CSV and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (field: ShopifyField, value: string) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
  };

  const handleAutoMap = () => {
    if (preview) {
      const base = buildAutoMapping(preview.columns);
      const enriched = diagnostic
        ? applyDiagnosticSuggestions(base, diagnostic.nonStandardHeaders)
        : base;
      setMapping(enriched);
    }
  };

  const handleResetMapping = () => setMapping({});

  const handleGenerate = async () => {
    if (!uploadedFile) return;
    setLoading(true);
    setError(null);
    setDownloadSuccess(false);
    const mappedCount = Object.values(mapping).filter(Boolean).length;
    track("generate_clicked", {
      mapped_fields_count: mappedCount,
      has_title_mapping: !!mapping["Title"],
      has_sku_mapping: !!mapping["Variant SKU"],
      has_price_mapping: !!mapping["Variant Price"],
      repairs_enabled: Object.entries(repairOptions)
        .filter(([, v]) => v)
        .map(([k]) => k),
    });
    try {
      const { blob, filename } = await transformCsv(uploadedFile, mapping, repairOptions);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadFilename(filename);
      setDownloadSuccess(true);
      track("download_completed", {
        has_variants: previewMeta.hasDuplicateTitles,
        mapped_fields_count: Object.values(mapping).filter(Boolean).length,
        partitioned: filename.endsWith(".zip"),
      });
    } catch {
      setError("Could not generate the CSV. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetToUpload = () => {
    setStep("upload");
    setPreview(null);
    setDiagnostic(null);
    setUploadedFile(null);
    setMapping({});
    setError(null);
    setDownloadSuccess(false);
  };

  useEffect(() => {
    if (!previewMeta.hasDuplicateTitles) return;
    track("variants_detected", {
      variant_groups_count: previewMeta.variantGroupsCount,
      variant_rows_count: previewMeta.variantRowsCount,
      detection_method: previewMeta.variantsWithSizeDetected
        ? "sku_size_suffix"
        : "duplicate_titles",
    });
  }, [previewMeta.hasDuplicateTitles]);

  const isTitleMapped = !!mapping["Title"];

  return (
    <div className="min-h-screen bg-[#FBFBFA] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-[#EAEAEA]">
        <div className="max-w-4xl mx-auto px-8 h-12 flex items-center justify-between">
          <span className="font-mono text-[11px] text-[#787774] uppercase tracking-widest">
            Shopify Import Fixer
          </span>
          {step !== "upload" && (
            <div className="flex items-center gap-4">
              {step === "mapping" && (
                <button
                  className="text-xs text-[#B2B0AA] hover:text-[#787774] transition-colors"
                  onClick={() => setStep("preflight")}
                >
                  ← Back to diagnostic
                </button>
              )}
              <button
                className="text-xs text-[#B2B0AA] hover:text-[#787774] transition-colors"
                onClick={resetToUpload}
              >
                Start over
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8">
        {/* Error */}
        {error && (
          <div className="mt-6 border border-[#F5C5C8] bg-[#FDEBEC] rounded-lg px-4 py-3 text-sm text-[#9F2F2D]">
            {error}
          </div>
        )}

        {/* Step: Upload */}
        {step === "upload" && (
          <section
            className="py-20 text-center"
            style={{
              background:
                "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(0,0,0,0.018) 0%, transparent 100%)",
            }}
          >
            <FadeIn>
              <LandingIntro />
            </FadeIn>
            <FadeIn delay={120}>
              <div className="max-w-md mx-auto mt-12">
                <CsvUpload onUpload={handleUpload} loading={loading} />
              </div>
            </FadeIn>
          </section>
        )}

        {/* Step: Pre-flight diagnostic */}
        {step === "preflight" && diagnostic && (
          <div className="py-10 space-y-5">
            <FadeIn>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h2 className="text-base font-medium text-[#111111]">
                    {uploadedFile?.name ?? "Source file"}
                  </h2>
                  <p className="text-xs text-[#787774] mt-0.5">
                    {diagnostic.summary.totalRows} rows scanned
                  </p>
                </div>
                <button
                  className="text-xs text-[#B2B0AA] hover:text-[#787774] transition-colors"
                  onClick={resetToUpload}
                >
                  Change file
                </button>
              </div>
            </FadeIn>
            <FadeIn delay={60}>
              <PreFlightReport
                report={diagnostic}
                repairOptions={repairOptions}
                onRepairOptionsChange={setRepairOptions}
                onContinue={() => setStep("mapping")}
              />
            </FadeIn>
            <div className="h-16" />
          </div>
        )}

        {/* Step: Mapping + repair */}
        {step === "mapping" && preview && (
          <div className="py-10 space-y-5">
            {/* Diagnostic badge */}
            {diagnostic && (diagnostic.summary.errorsCount > 0 || diagnostic.summary.warningsCount > 0) && (
              <FadeIn>
                <div className="flex items-center gap-3 px-4 py-2.5 border border-[#EAEAEA] rounded-lg bg-white">
                  {diagnostic.summary.errorsCount > 0 ? (
                    <>
                      <span className="text-xs font-medium text-[#9F2F2D] bg-[#FDEBEC] px-2 py-0.5 rounded">
                        {diagnostic.summary.errorsCount} {diagnostic.summary.errorsCount === 1 ? "error" : "errors"} queued for repair
                      </span>
                    </>
                  ) : (
                    <span className="text-xs font-medium text-[#956400] bg-[#FBF3DB] px-2 py-0.5 rounded">
                      {diagnostic.summary.warningsCount} {diagnostic.summary.warningsCount === 1 ? "warning" : "warnings"} detected
                    </span>
                  )}
                  <span className="text-xs text-[#787774]">
                    Repairs will apply automatically when you download.
                  </span>
                </div>
              </FadeIn>
            )}

            {/* Source file */}
            <FadeIn>
              <div className="border border-[#EAEAEA] rounded-lg bg-white overflow-hidden">
                <div className="px-6 py-4 border-b border-[#EAEAEA] flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#111111]">
                      {uploadedFile?.name ?? "Source file"}
                    </p>
                    <p className="text-xs text-[#787774] mt-0.5">
                      {preview.rows.length} rows previewed
                    </p>
                  </div>
                  <button
                    className="text-xs text-[#B2B0AA] hover:text-[#787774] transition-colors"
                    onClick={resetToUpload}
                  >
                    Change file
                  </button>
                </div>
                <div className="p-6">
                  <CsvPreview columns={preview.columns} rows={preview.rows} />
                </div>
              </div>
            </FadeIn>

            {/* Mapping */}
            <FadeIn delay={80}>
              <div className="border border-[#EAEAEA] rounded-lg bg-white p-6">
                <MappingTable
                  columns={preview.columns}
                  mapping={mapping}
                  onChange={handleMappingChange}
                  onAutoMap={handleAutoMap}
                  onReset={handleResetMapping}
                />
              </div>
            </FadeIn>

            {/* Shopify output preview */}
            {isTitleMapped && (
              <FadeIn delay={160}>
                <div className="border border-[#EAEAEA] rounded-lg bg-white overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#EAEAEA]">
                    <p className="text-sm font-medium text-[#111111]">
                      Shopify output preview
                    </p>
                    <p className="text-xs text-[#787774] mt-0.5">
                      Based on first {preview.rows.length} rows
                    </p>
                  </div>
                  <div className="p-6">
                    <OutputPreview rows={outputRows} />
                  </div>
                </div>
              </FadeIn>
            )}

            {/* What we fixed */}
            {isTitleMapped && (
              <FadeIn delay={240}>
                <TransformationSummary mapping={mapping} meta={previewMeta} />
              </FadeIn>
            )}

            {/* CTA */}
            <FadeIn delay={isTitleMapped ? 320 : 160}>
              <div className="border border-[#EAEAEA] rounded-lg bg-white p-6 space-y-4">
                <button
                  className="w-full py-3.5 text-sm font-medium text-white bg-[#111111] rounded transition-colors duration-150 hover:bg-[#333333] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={!isTitleMapped || loading}
                  onClick={handleGenerate}
                >
                  {loading ? "Repairing…" : "Repair & Download"}
                </button>

                {!isTitleMapped && (
                  <p className="text-center text-xs text-[#787774]">
                    Map the{" "}
                    <span className="font-medium text-[#111111]">Title</span> field
                    above to continue
                  </p>
                )}

                {downloadSuccess && (
                  <div className="text-center space-y-2 pt-1">
                    <p className="text-sm font-medium text-[#346538]">
                      {downloadFilename} saved
                    </p>
                    {downloadFilename.endsWith(".zip") ? (
                      <p className="text-xs text-[#787774]">
                        Import each part separately — Products → Import in Shopify.
                      </p>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 text-xs text-[#787774] flex-wrap">
                        <span>In Shopify, go to</span>
                        <span className="font-medium text-[#111111]">Products</span>
                        <ArrowRightIcon size={10} className="text-[#B2B0AA]" />
                        <span className="font-medium text-[#111111]">Import</span>
                        <span>and upload this file</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </FadeIn>

            <div className="h-16" />
          </div>
        )}
      </main>
    </div>
  );
}
