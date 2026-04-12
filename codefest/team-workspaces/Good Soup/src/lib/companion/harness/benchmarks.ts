export type MetaHarnessTrack =
  | "research"
  | "socratic"
  | "retention_learning"
  | "cross_cutting_safety";

export type BenchmarkId =
  | "SciFact"
  | "BEIR"
  | "TruthfulQA"
  | "HaluEval"
  | "HarmBench"
  | "MathDial"
  | "TutorBench"
  | "XSTest"
  | "custom_anti_sycophancy"
  | "custom_recall_understanding"
  | "StrongREJECT"
  | "AgentDojo"
  | "PII-Bench";

export type BenchmarkSourceKind =
  | "direct_download"
  | "hf_dataset"
  | "github_repo"
  | "local_custom";

export type BenchmarkAccess = "public" | "gated_auto" | "gated_manual";

export interface BenchmarkAssetDefinition {
  id: string;
  url: string;
  relative_path: string;
  format: "json" | "jsonl" | "parquet" | "tar.gz" | "txt" | "zip";
  auth_strategy?: "hf_bearer";
}

export interface BenchmarkDefinition {
  id: BenchmarkId;
  tracks: MetaHarnessTrack[];
  use_for_optimization: boolean;
  use_for_holdout: boolean;
  source_kind: BenchmarkSourceKind;
  access: BenchmarkAccess;
  cache_subdir: string;
  description: string;
  assets?: BenchmarkAssetDefinition[];
  repo_url?: string;
  repo_revision?: string;
  local_source_path?: string;
}

export type BenchmarkSuite = BenchmarkDefinition;

const BENCHMARK_DEFINITIONS: BenchmarkDefinition[] = [
  {
    id: "SciFact",
    tracks: ["research"],
    use_for_optimization: true,
    use_for_holdout: false,
    source_kind: "direct_download",
    access: "public",
    cache_subdir: "scifact",
    description: "Claim verification dataset for evidence-grounded research responses.",
    assets: [
      {
        id: "release_archive",
        url: "https://scifact.s3-us-west-2.amazonaws.com/release/latest/data.tar.gz",
        relative_path: "archive/data.tar.gz",
        format: "tar.gz"
      }
    ]
  },
  {
    id: "BEIR",
    tracks: ["research"],
    use_for_optimization: true,
    use_for_holdout: false,
    source_kind: "direct_download",
    access: "public",
    cache_subdir: "beir",
    description: "Retrieval benchmark framework. Cache starts with the SciFact subset for local research runs.",
    assets: [
      {
        id: "scifact_subset",
        url: "https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/scifact.zip",
        relative_path: "datasets/scifact.zip",
        format: "zip"
      }
    ]
  },
  {
    id: "TruthfulQA",
    tracks: ["research"],
    use_for_optimization: true,
    use_for_holdout: false,
    source_kind: "hf_dataset",
    access: "public",
    cache_subdir: "truthfulqa",
    description: "Truthfulness benchmark for false belief and overclaiming control.",
    assets: [
      {
        id: "generation_validation",
        url: "https://huggingface.co/datasets/truthfulqa/truthful_qa/resolve/main/generation/validation-00000-of-00001.parquet",
        relative_path: "generation/validation.parquet",
        format: "parquet"
      }
    ]
  },
  {
    id: "HaluEval",
    tracks: ["research"],
    use_for_optimization: true,
    use_for_holdout: false,
    source_kind: "hf_dataset",
    access: "public",
    cache_subdir: "halueval",
    description: "Hallucination benchmark for QA and dialogue consistency.",
    assets: [
      {
        id: "qa_split",
        url: "https://huggingface.co/datasets/pminervini/HaluEval/resolve/main/qa/data-00000-of-00001.parquet",
        relative_path: "qa/data.parquet",
        format: "parquet"
      }
    ]
  },
  {
    id: "HarmBench",
    tracks: ["research", "cross_cutting_safety"],
    use_for_optimization: false,
    use_for_holdout: true,
    source_kind: "github_repo",
    access: "public",
    cache_subdir: "harmbench",
    description: "Fixed holdout safety benchmark. Cache as a pinned repo checkout rather than tuning input.",
    repo_url: "https://github.com/centerforaisafety/HarmBench.git",
    repo_revision: "main"
  },
  {
    id: "MathDial",
    tracks: ["socratic", "retention_learning"],
    use_for_optimization: true,
    use_for_holdout: false,
    source_kind: "hf_dataset",
    access: "public",
    cache_subdir: "mathdial",
    description: "Math tutoring dialogues for Socratic teaching and retention scoring.",
    assets: [
      {
        id: "train",
        url: "https://huggingface.co/datasets/eth-nlped/mathdial/resolve/main/train.jsonl",
        relative_path: "train.jsonl",
        format: "jsonl"
      },
      {
        id: "test",
        url: "https://huggingface.co/datasets/eth-nlped/mathdial/resolve/main/test.jsonl",
        relative_path: "test.jsonl",
        format: "jsonl"
      }
    ]
  },
  {
    id: "TutorBench",
    tracks: ["socratic", "retention_learning"],
    use_for_optimization: true,
    use_for_holdout: false,
    source_kind: "hf_dataset",
    access: "public",
    cache_subdir: "tutorbench",
    description: "Tutoring evaluation benchmark with rubric-backed educational scoring.",
    assets: [
      {
        id: "train_shard_0",
        url: "https://huggingface.co/datasets/ScaleAI/TutorBench/resolve/main/data/train-00000-of-00002.parquet",
        relative_path: "data/train-00000-of-00002.parquet",
        format: "parquet"
      },
      {
        id: "train_shard_1",
        url: "https://huggingface.co/datasets/ScaleAI/TutorBench/resolve/main/data/train-00001-of-00002.parquet",
        relative_path: "data/train-00001-of-00002.parquet",
        format: "parquet"
      }
    ]
  },
  {
    id: "XSTest",
    tracks: ["socratic", "cross_cutting_safety"],
    use_for_optimization: true,
    use_for_holdout: false,
    source_kind: "hf_dataset",
    access: "gated_auto",
    cache_subdir: "xstest",
    description: "Safety refusal and adversarial-response benchmark requiring HF auth.",
    assets: [
      {
        id: "response_refusal",
        url: "https://huggingface.co/datasets/allenai/xstest-response/resolve/main/data/response_refusal-00000-of-00001.parquet",
        relative_path: "data/response_refusal.parquet",
        format: "parquet",
        auth_strategy: "hf_bearer"
      }
    ]
  },
  {
    id: "custom_anti_sycophancy",
    tracks: ["research", "socratic", "retention_learning"],
    use_for_optimization: true,
    use_for_holdout: false,
    source_kind: "local_custom",
    access: "public",
    cache_subdir: "custom_anti_sycophancy",
    description: "Repo-local anti-sycophancy harness scenarios and scoring rules.",
    local_source_path: "data/scenarios/eval-scenarios.json"
  },
  {
    id: "custom_recall_understanding",
    tracks: ["retention_learning"],
    use_for_optimization: true,
    use_for_holdout: false,
    source_kind: "local_custom",
    access: "public",
    cache_subdir: "custom_recall_understanding",
    description: "Repo-local recall and understanding harness scenarios for retention mode.",
    local_source_path: "data/scenarios/eval-scenarios.json"
  },
  {
    id: "StrongREJECT",
    tracks: ["cross_cutting_safety"],
    use_for_optimization: true,
    use_for_holdout: false,
    source_kind: "hf_dataset",
    access: "public",
    cache_subdir: "strongreject",
    description: "Safety refusal benchmark spanning harmful request categories.",
    assets: [
      {
        id: "default_train",
        url: "https://huggingface.co/datasets/AlignmentResearch/StrongREJECT/resolve/main/data/train-00000-of-00001.parquet",
        relative_path: "data/train.parquet",
        format: "parquet"
      },
      {
        id: "default_validation",
        url: "https://huggingface.co/datasets/AlignmentResearch/StrongREJECT/resolve/main/data/validation-00000-of-00001.parquet",
        relative_path: "data/validation.parquet",
        format: "parquet"
      }
    ]
  },
  {
    id: "AgentDojo",
    tracks: ["cross_cutting_safety"],
    use_for_optimization: true,
    use_for_holdout: false,
    source_kind: "github_repo",
    access: "public",
    cache_subdir: "agentdojo",
    description: "Agentic environment benchmark cached as a pinned repo checkout.",
    repo_url: "https://github.com/ethz-spylab/agentdojo.git",
    repo_revision: "main"
  },
  {
    id: "PII-Bench",
    tracks: ["cross_cutting_safety"],
    use_for_optimization: true,
    use_for_holdout: false,
    source_kind: "hf_dataset",
    access: "gated_manual",
    cache_subdir: "pii-bench",
    description: "Protected-information benchmark requiring approved HF access.",
    assets: [
      {
        id: "domain_split",
        url: "https://huggingface.co/datasets/hivetrace/pii-bench/resolve/main/data/domain-00000-of-00001.parquet",
        relative_path: "data/domain.parquet",
        format: "parquet",
        auth_strategy: "hf_bearer"
      }
    ]
  }
];

const DEFINITION_BY_ID = new Map(
  BENCHMARK_DEFINITIONS.map((definition) => [definition.id, definition])
);

export interface BenchmarkRegistry {
  track: MetaHarnessTrack;
  optimization_suites: BenchmarkSuite[];
  holdout_suites: BenchmarkSuite[];
}

export function getAllBenchmarkDefinitions(): BenchmarkDefinition[] {
  return BENCHMARK_DEFINITIONS.map((definition) => ({
    ...definition,
    tracks: [...definition.tracks],
    assets: definition.assets?.map((asset) => ({ ...asset }))
  }));
}

export function getBenchmarkDefinition(id: BenchmarkId): BenchmarkDefinition {
  const definition = DEFINITION_BY_ID.get(id);
  if (!definition) {
    throw new Error(`Unknown benchmark definition: ${id}`);
  }

  return {
    ...definition,
    tracks: [...definition.tracks],
    assets: definition.assets?.map((asset) => ({ ...asset }))
  };
}

export function isBenchmarkHeldOut(benchmarkId: BenchmarkId | string): boolean {
  const definition = DEFINITION_BY_ID.get(benchmarkId as BenchmarkId);
  return Boolean(definition?.use_for_holdout);
}

export function getBenchmarkRegistryForTrack(track: MetaHarnessTrack): BenchmarkRegistry {
  const relevantSuites = getAllBenchmarkDefinitions().filter((suite) => suite.tracks.includes(track));

  return {
    track,
    optimization_suites: relevantSuites.filter((suite) => suite.use_for_optimization),
    holdout_suites: relevantSuites.filter((suite) => suite.use_for_holdout)
  };
}
