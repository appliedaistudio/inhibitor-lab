import { readFile } from "node:fs/promises";
import path from "node:path";

import type { BenchmarkCampaignDelta, BenchmarkCampaignGraphPoint, BenchmarkCampaignResult, BenchmarkCampaignRun } from "./campaign";
import type { BenchmarkId } from "./benchmarks";
import { getBenchmarkDefinition } from "./benchmarks";
import type { MaterializedBenchmarkCaseResult } from "./case-runner";
import { getDefaultMaterializedBenchmarkRoot, loadMaterializedBenchmarkCases } from "./materialized";

const DEFAULT_ARTIFACTS_ROOT = path.join(process.cwd(), "data", "benchmarks", "results", "cases");

export interface BenchmarkCampaignRunRow extends BenchmarkCampaignRun {
  generated_at: string;
}

export interface BenchmarkCampaignDeltaRow extends BenchmarkCampaignDelta {
  generated_at: string;
}

export interface BenchmarkCampaignGraphRow extends BenchmarkCampaignGraphPoint {
  generated_at: string;
}

export interface BenchmarkCampaignCaseRow {
  generated_at: string;
  benchmark_id: BenchmarkId;
  variant_id: string;
  case_id: string;
  is_holdout: boolean;
  mode: string;
  track: string;
  judge_family: string;
  score: number;
  passed: boolean;
  fidelity: string;
  latency_ms: number;
  execution_error: number;
  answer_excerpt: string;
  rationale: string;
  metrics_json: string;
}

export interface BenchmarkCampaignExports {
  run_rows: BenchmarkCampaignRunRow[];
  delta_rows: BenchmarkCampaignDeltaRow[];
  graph_rows: BenchmarkCampaignGraphRow[];
  case_rows: BenchmarkCampaignCaseRow[];
  runs_csv: string;
  deltas_csv: string;
  graph_csv: string;
  cases_csv: string;
}

export interface BuildBenchmarkCampaignExportsOptions {
  materializedRoot?: string;
  artifactsRoot?: string;
}

function escapeCsvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function rowsToCsv<T extends object>(rows: T[], columns: string[]): string {
  const lines = [columns.join(",")];
  for (const row of rows) {
    const record = row as Record<string, unknown>;
    lines.push(columns.map((column) => escapeCsvCell(record[column])).join(","));
  }
  return lines.join("\n") + "\n";
}

async function loadCaseResultArtifacts(
  benchmarkId: BenchmarkId,
  variantId: string,
  artifactsRoot: string
): Promise<MaterializedBenchmarkCaseResult[]> {
  const artifactPath = path.join(artifactsRoot, benchmarkId, `${variantId}.jsonl`);

  try {
    const raw = await readFile(artifactPath, "utf8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as MaterializedBenchmarkCaseResult);
  } catch {
    return [];
  }
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function benchmarkRowsHtml(runRows: BenchmarkCampaignRunRow[]): string {
  const grouped = new Map<string, Partial<Record<string, number>>>();

  for (const row of runRows.filter((item) => item.status === "scored")) {
    const record = grouped.get(row.benchmark_id) ?? {};
    record[row.variant_id] = row.score ?? 0;
    grouped.set(row.benchmark_id, record);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([benchmarkId, scores]) => {
      const baseline = scores.baseline ?? 0;
      const noHarness = scores.no_harness ?? 0;
      const fullHarness = scores.full_harness ?? 0;
      return `<tr><td>${escapeHtml(benchmarkId)}</td><td>${baseline.toFixed(3)}</td><td>${noHarness.toFixed(3)}</td><td>${fullHarness.toFixed(3)}</td></tr>`;
    })
    .join("\n");
}

function variantBarsSvg(graphRows: BenchmarkCampaignGraphRow[]): string {
  const scoredMeanRows = graphRows.filter((row) => row.series === "scored_mean");
  const barWidth = 180;
  const barGap = 32;
  const chartHeight = 220;
  const maxValue = Math.max(1, ...scoredMeanRows.map((row) => row.value));
  const width = scoredMeanRows.length * (barWidth + barGap) + 40;

  const bars = scoredMeanRows
    .map((row, index) => {
      const x = 20 + index * (barWidth + barGap);
      const height = Math.round((row.value / maxValue) * 160);
      const y = 180 - height;
      const fill =
        row.variant_id === "full_harness"
          ? "#1d4ed8"
          : row.variant_id === "no_harness"
            ? "#0f766e"
            : "#6b7280";
      return [
        `<rect x="${x}" y="${y}" width="${barWidth}" height="${height}" fill="${fill}" rx="8" />`,
        `<text x="${x + barWidth / 2}" y="198" text-anchor="middle" font-size="14" fill="#111827">${escapeHtml(row.variant_id)}</text>`,
        `<text x="${x + barWidth / 2}" y="${Math.max(20, y - 8)}" text-anchor="middle" font-size="14" fill="#111827">${row.value.toFixed(3)}</text>`
      ].join("\n");
    })
    .join("\n");

  return [
    `<svg viewBox="0 0 ${width} ${chartHeight}" role="img" aria-label="Variant mean scores">`,
    `<line x1="20" y1="180" x2="${width - 20}" y2="180" stroke="#cbd5e1" stroke-width="2" />`,
    bars,
    `</svg>`
  ].join("\n");
}

export function buildBenchmarkCampaignDashboardHtml(
  result: BenchmarkCampaignResult,
  exports: BenchmarkCampaignExports
): string {
  const deltaRows = exports.delta_rows
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.variant_id)}</td><td>${escapeHtml(
          row.vs_variant_id
        )}</td><td>${row.scored_mean_delta.toFixed(3)}</td></tr>`
    )
    .join("\n");

  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head>",
    "<meta charset=\"utf-8\" />",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
    `<title>Benchmark Dashboard</title>`,
    "<style>",
    "body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 24px; color: #111827; background: #f8fafc; }",
    "h1, h2 { margin: 0 0 12px; }",
    ".meta { margin: 0 0 24px; color: #475569; }",
    ".card { background: white; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 2px rgba(15,23,42,0.04); }",
    "table { width: 100%; border-collapse: collapse; }",
    "th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }",
    "th { font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; color: #475569; }",
    "code { background: #eff6ff; padding: 2px 6px; border-radius: 6px; }",
    "</style>",
    "</head>",
    "<body>",
    `<h1>Benchmark Dashboard</h1>`,
    `<p class="meta">Generated at ${escapeHtml(result.generated_at)}. Total runs: ${result.summary.total_runs}. Scored mean bars and per-benchmark comparisons are derived from the current campaign artifacts.</p>`,
    "<section class=\"card\">",
    "<h2>Variant Means</h2>",
    variantBarsSvg(exports.graph_rows),
    "</section>",
    "<section class=\"card\">",
    "<h2>Scored Mean Delta Vs Baseline</h2>",
    "<table><thead><tr><th>Variant</th><th>Vs</th><th>Delta</th></tr></thead><tbody>",
    deltaRows,
    "</tbody></table>",
    "</section>",
    "<section class=\"card\">",
    "<h2>Per-Benchmark Scores</h2>",
    "<table><thead><tr><th>Benchmark</th><th>Baseline</th><th>No Harness</th><th>Full Harness</th></tr></thead><tbody>",
    benchmarkRowsHtml(exports.run_rows),
    "</tbody></table>",
    "</section>",
    "</body>",
    "</html>\n"
  ].join("\n");
}

export async function buildBenchmarkCampaignExports(
  result: BenchmarkCampaignResult,
  options: BuildBenchmarkCampaignExportsOptions = {}
): Promise<BenchmarkCampaignExports> {
  const materializedRoot = options.materializedRoot ?? getDefaultMaterializedBenchmarkRoot();
  const artifactsRoot = options.artifactsRoot ?? DEFAULT_ARTIFACTS_ROOT;

  const runRows: BenchmarkCampaignRunRow[] = result.runs.map((run) => ({
    generated_at: result.generated_at,
    ...run
  }));
  const deltaRows: BenchmarkCampaignDeltaRow[] = result.deltas.map((delta) => ({
    generated_at: result.generated_at,
    ...delta
  }));
  const graphRows: BenchmarkCampaignGraphRow[] = result.graph_points.map((point) => ({
    generated_at: result.generated_at,
    ...point
  }));

  const scoredBenchmarkIds = [...new Set(
    result.runs.filter((run) => run.status === "scored").map((run) => run.benchmark_id)
  )];

  const caseMetadataByBenchmark = new Map<BenchmarkId, Map<string, Awaited<ReturnType<typeof loadMaterializedBenchmarkCases>>[number]>>();
  for (const benchmarkId of scoredBenchmarkIds) {
    const cases = await loadMaterializedBenchmarkCases(benchmarkId, {
      rootDir: materializedRoot
    }).catch(() => []);
    caseMetadataByBenchmark.set(
      benchmarkId,
      new Map(cases.map((benchmarkCase) => [benchmarkCase.case_id, benchmarkCase]))
    );
  }

  const caseRows: BenchmarkCampaignCaseRow[] = [];

  for (const run of result.runs.filter((item) => item.status === "scored")) {
    const definition = getBenchmarkDefinition(run.benchmark_id);
    const caseMetadata = caseMetadataByBenchmark.get(run.benchmark_id) ?? new Map();
    const caseResults = await loadCaseResultArtifacts(run.benchmark_id, run.variant_id, artifactsRoot);

    for (const caseResult of caseResults) {
      const benchmarkCase = caseMetadata.get(caseResult.case_id);
      caseRows.push({
        generated_at: result.generated_at,
        benchmark_id: run.benchmark_id,
        variant_id: run.variant_id,
        case_id: caseResult.case_id,
        is_holdout: definition.use_for_holdout,
        mode: benchmarkCase?.mode ?? "",
        track: benchmarkCase?.track ?? "",
        judge_family: benchmarkCase?.judge_family ?? "",
        score: caseResult.score,
        passed: caseResult.passed,
        fidelity: caseResult.fidelity,
        latency_ms: caseResult.latency_ms,
        execution_error:
          typeof caseResult.metrics.execution_error === "number"
            ? caseResult.metrics.execution_error
            : 0,
        answer_excerpt: caseResult.answer.slice(0, 240),
        rationale: caseResult.rationale ?? "",
        metrics_json: JSON.stringify(caseResult.metrics)
      });
    }
  }

  return {
    run_rows: runRows,
    delta_rows: deltaRows,
    graph_rows: graphRows,
    case_rows: caseRows,
    runs_csv: rowsToCsv(runRows, [
      "generated_at",
      "benchmark_id",
      "variant_id",
      "is_holdout",
      "source_kind",
      "status",
      "score",
      "latency_ms",
      "case_count",
      "pass_rate",
      "fidelity",
      "message"
    ]),
    deltas_csv: rowsToCsv(deltaRows, [
      "generated_at",
      "variant_id",
      "vs_variant_id",
      "scored_mean_delta"
    ]),
    graph_csv: rowsToCsv(graphRows, [
      "generated_at",
      "variant_id",
      "series",
      "value"
    ]),
    cases_csv: rowsToCsv(caseRows, [
      "generated_at",
      "benchmark_id",
      "variant_id",
      "case_id",
      "is_holdout",
      "mode",
      "track",
      "judge_family",
      "score",
      "passed",
      "fidelity",
      "latency_ms",
      "execution_error",
      "answer_excerpt",
      "rationale",
      "metrics_json"
    ])
  };
}
