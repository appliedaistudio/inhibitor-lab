import {
  getAllBenchmarkDefinitions,
  getDefaultBenchmarkCacheRoot,
  getDefaultHfToken,
  syncBenchmarkCache
} from "../src/lib/companion/harness";

function parseArgs(argv: string[]): { benchmarkIds?: string[]; force: boolean } {
  const benchmarkIds: string[] = [];
  let force = false;

  for (const arg of argv) {
    if (arg === "--force") {
      force = true;
      continue;
    }

    benchmarkIds.push(arg);
  }

  return {
    benchmarkIds: benchmarkIds.length > 0 ? benchmarkIds : undefined,
    force
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const definitions = getAllBenchmarkDefinitions();
  const knownIds = new Set(definitions.map((definition) => definition.id));

  for (const benchmarkId of args.benchmarkIds ?? []) {
    if (!knownIds.has(benchmarkId as (typeof definitions)[number]["id"])) {
      throw new Error(`Unknown benchmark id: ${benchmarkId}`);
    }
  }

  const manifest = await syncBenchmarkCache({
    benchmarkIds: args.benchmarkIds as (typeof definitions)[number]["id"][] | undefined,
    hfToken: getDefaultHfToken(),
    force: args.force
  });

  console.log(`Benchmark cache root: ${getDefaultBenchmarkCacheRoot()}`);
  console.log(JSON.stringify(manifest, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
