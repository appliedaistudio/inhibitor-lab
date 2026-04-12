import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildBenchmarkCampaignDashboardHtml,
  buildBenchmarkCampaignExports,
  type BenchmarkCampaignCaseRow,
  mergeBenchmarkCampaignResults,
  type BenchmarkCampaignResult
} from "../src/lib/companion/harness";

function parseArgs(argv: string[]): {
  benchmarkIds?: string[];
  shardCount: number;
  outputName?: string;
} {
  const parsed: {
    benchmarkIds?: string[];
    shardCount?: number;
    outputName?: string;
  } = {};

  for (const arg of argv) {
    if (arg.startsWith("--benchmarks=")) {
      const benchmarkIds = arg
        .replace("--benchmarks=", "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      parsed.benchmarkIds = benchmarkIds.length > 0 ? benchmarkIds : undefined;
      continue;
    }

    if (arg.startsWith("--shard-count=")) {
      parsed.shardCount = Number(arg.replace("--shard-count=", ""));
      continue;
    }

    if (arg.startsWith("--output-name=")) {
      parsed.outputName = arg.replace("--output-name=", "").trim() || undefined;
    }
  }

  return {
    benchmarkIds: parsed.benchmarkIds,
    shardCount: parsed.shardCount ?? 0,
    outputName: parsed.outputName
  };
}

function buildMarkdownSummary(result: BenchmarkCampaignResult): string {
  const lines: string[] = [
    "# Benchmark Campaign Summary",
    "",
    `Generated at: ${result.generated_at}`,
    "",
    "## Status Counts",
    ""
  ];

  for (const [status, count] of Object.entries(result.summary.by_status)) {
    lines.push(`- ${status}: ${count}`);
  }

  lines.push("", "## Variant Deltas Vs Baseline", "");
  for (const delta of result.deltas) {
    lines.push(`- ${delta.variant_id}: ${delta.scored_mean_delta.toFixed(3)}`);
  }

  lines.push("", "## Scored Means", "");
  for (const point of result.graph_points) {
    lines.push(`- ${point.variant_id}: ${point.value.toFixed(3)}`);
  }

  return lines.join("\n") + "\n";
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

async function loadCampaignResult(jsonPath: string): Promise<BenchmarkCampaignResult> {
  const raw = await readFile(jsonPath, "utf8");
  return JSON.parse(raw) as BenchmarkCampaignResult;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.shardCount || args.shardCount < 1) {
    throw new Error("Missing required --shard-count=<n> argument.");
  }

  const baseSuffix = args.outputName ?? args.benchmarkIds?.join("__") ?? "all";
  const resultsDir = path.join(process.cwd(), "data", "benchmarks", "results");

  const shardResults: BenchmarkCampaignResult[] = [];
  const combinedCaseRows: BenchmarkCampaignCaseRow[] = [];

  for (let shardIndex = 0; shardIndex < args.shardCount; shardIndex += 1) {
    const shardSuffix = `${baseSuffix}-shard-${shardIndex}-of-${args.shardCount}`;
    const jsonPath = path.join(resultsDir, `campaign-${shardSuffix}.json`);
    const result = await loadCampaignResult(jsonPath);
    shardResults.push(result);

    const shardExports = await buildBenchmarkCampaignExports(result, {
      artifactsRoot: path.join(resultsDir, "campaign-artifacts", shardSuffix)
    });
    combinedCaseRows.push(
      ...shardExports.case_rows.map((row) => ({
        ...row,
        generated_at: result.generated_at
      }))
    );
  }

  const mergedResult = mergeBenchmarkCampaignResults(shardResults);
  const mergedExports = await buildBenchmarkCampaignExports(mergedResult, {
    artifactsRoot: path.join(resultsDir, "cases-unused")
  });
  const dashboardExports = {
    ...mergedExports,
    case_rows: combinedCaseRows
  };

  const mergedSuffix = `${baseSuffix}-merged`;
  const jsonPath = path.join(resultsDir, `campaign-${mergedSuffix}.json`);
  const markdownPath = path.join(resultsDir, `campaign-${mergedSuffix}.md`);
  const runsCsvPath = path.join(resultsDir, `campaign-${mergedSuffix}-runs.csv`);
  const deltasCsvPath = path.join(resultsDir, `campaign-${mergedSuffix}-deltas.csv`);
  const graphCsvPath = path.join(resultsDir, `campaign-${mergedSuffix}-graph.csv`);
  const casesCsvPath = path.join(resultsDir, `campaign-${mergedSuffix}-cases.csv`);
  const dashboardHtmlPath = path.join(resultsDir, `campaign-${mergedSuffix}-dashboard.html`);

  await mkdir(resultsDir, { recursive: true });
  await writeFile(jsonPath, JSON.stringify(mergedResult, null, 2) + "\n", "utf8");
  await writeFile(markdownPath, buildMarkdownSummary(mergedResult), "utf8");
  await writeFile(runsCsvPath, mergedExports.runs_csv, "utf8");
  await writeFile(deltasCsvPath, mergedExports.deltas_csv, "utf8");
  await writeFile(graphCsvPath, mergedExports.graph_csv, "utf8");
  await writeFile(
    casesCsvPath,
    rowsToCsv(combinedCaseRows, [
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
    ]),
    "utf8"
  );
  await writeFile(
    dashboardHtmlPath,
    buildBenchmarkCampaignDashboardHtml(mergedResult, dashboardExports),
    "utf8"
  );

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${markdownPath}`);
  console.log(`Wrote ${runsCsvPath}`);
  console.log(`Wrote ${deltasCsvPath}`);
  console.log(`Wrote ${graphCsvPath}`);
  console.log(`Wrote ${casesCsvPath}`);
  console.log(`Wrote ${dashboardHtmlPath}`);
  console.log(JSON.stringify(mergedResult.summary, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
