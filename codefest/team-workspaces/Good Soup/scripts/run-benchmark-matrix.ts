import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  runLocalCustomBenchmarkMatrix,
  type RunLocalCustomBenchmarkMatrixOptions
} from "../src/lib/companion/harness";

function parseArgs(argv: string[]): RunLocalCustomBenchmarkMatrixOptions {
  const benchmarkIds: Array<"custom_anti_sycophancy" | "custom_recall_understanding"> = [];
  let track: RunLocalCustomBenchmarkMatrixOptions["track"] = "socratic";

  for (const arg of argv) {
    if (arg.startsWith("--track=")) {
      track = arg.replace("--track=", "") as RunLocalCustomBenchmarkMatrixOptions["track"];
      continue;
    }

    if (arg === "custom_anti_sycophancy" || arg === "custom_recall_understanding") {
      benchmarkIds.push(arg);
    }
  }

  return {
    track,
    benchmarkIds: benchmarkIds.length > 0 ? benchmarkIds : undefined
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const result = await runLocalCustomBenchmarkMatrix(options);

  const resultsDir = path.join(process.cwd(), "data", "benchmarks", "results");
  await mkdir(resultsDir, { recursive: true });

  const outputPath = path.join(resultsDir, `local-custom-${options.track}.json`);
  await writeFile(outputPath, JSON.stringify(result, null, 2) + "\n", "utf8");

  console.log(`Wrote benchmark matrix to ${outputPath}`);
  console.log(JSON.stringify(result.summary, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
