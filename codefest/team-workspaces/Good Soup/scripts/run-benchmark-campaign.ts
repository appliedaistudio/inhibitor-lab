import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildBenchmarkCampaignExports,
  type BenchmarkId,
  getAllBenchmarkDefinitions,
  runBenchmarkCampaign
} from "../src/lib/companion/harness";

function parseArgs(argv: string[]): {
  benchmarkIds?: string[];
  maxCasesPerBenchmark?: number;
  caseConcurrency?: number;
  variantConcurrency?: number;
  benchmarkConcurrency?: number;
  shardCount?: number;
  shardIndex?: number;
  resumeFromArtifacts?: boolean;
} {
  const parsed: {
    benchmarkIds?: string[];
    maxCasesPerBenchmark?: number;
    caseConcurrency?: number;
    variantConcurrency?: number;
    benchmarkConcurrency?: number;
    shardCount?: number;
    shardIndex?: number;
    resumeFromArtifacts?: boolean;
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

    if (arg.startsWith("--max-cases=")) {
      parsed.maxCasesPerBenchmark = Number(arg.replace("--max-cases=", ""));
      continue;
    }

    if (arg.startsWith("--case-concurrency=")) {
      parsed.caseConcurrency = Number(arg.replace("--case-concurrency=", ""));
      continue;
    }

    if (arg.startsWith("--variant-concurrency=")) {
      parsed.variantConcurrency = Number(arg.replace("--variant-concurrency=", ""));
      continue;
    }

    if (arg.startsWith("--benchmark-concurrency=")) {
      parsed.benchmarkConcurrency = Number(arg.replace("--benchmark-concurrency=", ""));
      continue;
    }

    if (arg.startsWith("--shard-count=")) {
      parsed.shardCount = Number(arg.replace("--shard-count=", ""));
      continue;
    }

    if (arg.startsWith("--shard-index=")) {
      parsed.shardIndex = Number(arg.replace("--shard-index=", ""));
      continue;
    }

    if (arg === "--force") {
      parsed.resumeFromArtifacts = false;
    }
  }

  return parsed;
}

function buildMarkdownSummary(result: Awaited<ReturnType<typeof runBenchmarkCampaign>>): string {
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

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const knownIds = new Set(getAllBenchmarkDefinitions().map((definition) => definition.id));

  for (const benchmarkId of args.benchmarkIds ?? []) {
    if (!knownIds.has(benchmarkId as BenchmarkId)) {
      throw new Error(`Unknown benchmark id: ${benchmarkId}`);
    }
  }

  const shardSuffix =
    typeof args.shardCount === "number" && typeof args.shardIndex === "number"
      ? `-shard-${args.shardIndex}-of-${args.shardCount}`
      : "";
  const suffix = (args.benchmarkIds?.join("__") ?? "all") + shardSuffix;
  const resultsDir = path.join(process.cwd(), "data", "benchmarks", "results");
  const artifactsDir = path.join(resultsDir, "campaign-artifacts", suffix);

  const result = await runBenchmarkCampaign({
    benchmarkIds: args.benchmarkIds as BenchmarkId[] | undefined,
    maxCasesPerBenchmark: args.maxCasesPerBenchmark,
    caseConcurrency: args.caseConcurrency,
    variantConcurrency: args.variantConcurrency,
    benchmarkConcurrency: args.benchmarkConcurrency,
    shardCount: args.shardCount,
    shardIndex: args.shardIndex,
    resumeFromArtifacts: args.resumeFromArtifacts,
    artifactsRoot: artifactsDir
  });

  await mkdir(resultsDir, { recursive: true });
  const jsonPath = path.join(resultsDir, `campaign-${suffix}.json`);
  const markdownPath = path.join(resultsDir, `campaign-${suffix}.md`);
  const runsCsvPath = path.join(resultsDir, `campaign-${suffix}-runs.csv`);
  const deltasCsvPath = path.join(resultsDir, `campaign-${suffix}-deltas.csv`);
  const graphCsvPath = path.join(resultsDir, `campaign-${suffix}-graph.csv`);
  const casesCsvPath = path.join(resultsDir, `campaign-${suffix}-cases.csv`);
  const dashboardHtmlPath = path.join(resultsDir, `campaign-${suffix}-dashboard.html`);
  const exports = await buildBenchmarkCampaignExports(result, {
    artifactsRoot: artifactsDir
  });
  const { buildBenchmarkCampaignDashboardHtml } = await import("../src/lib/companion/harness/reporting");

  await writeFile(jsonPath, JSON.stringify(result, null, 2) + "\n", "utf8");
  await writeFile(markdownPath, buildMarkdownSummary(result), "utf8");
  await writeFile(runsCsvPath, exports.runs_csv, "utf8");
  await writeFile(deltasCsvPath, exports.deltas_csv, "utf8");
  await writeFile(graphCsvPath, exports.graph_csv, "utf8");
  await writeFile(casesCsvPath, exports.cases_csv, "utf8");
  await writeFile(dashboardHtmlPath, buildBenchmarkCampaignDashboardHtml(result, exports), "utf8");

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${markdownPath}`);
  console.log(`Wrote ${runsCsvPath}`);
  console.log(`Wrote ${deltasCsvPath}`);
  console.log(`Wrote ${graphCsvPath}`);
  console.log(`Wrote ${casesCsvPath}`);
  console.log(`Wrote ${dashboardHtmlPath}`);
  console.log(JSON.stringify(result.summary, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
