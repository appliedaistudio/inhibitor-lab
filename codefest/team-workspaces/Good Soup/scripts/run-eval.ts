import { runEvaluationHarness } from "../src/lib/companion/eval/harness";

async function main() {
  const result = await runEvaluationHarness();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
