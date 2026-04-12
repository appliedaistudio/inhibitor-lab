import { useState } from "react";

import {
  alertStream,
  decisionTraces,
  healthSummary,
  interventionLog,
  liveRuns,
  navigation,
  policyViolations,
  type AlertTone,
  type DecisionTrace,
  type HealthTone,
  type PolicySeverity,
  type RunState,
} from "./data";
import { Icon } from "./icons";

const surface =
  "rounded-[24px] border border-white/10 bg-[rgba(10,15,22,0.84)] shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl";

const runStateStyles: Record<RunState, string> = {
  allowed: "border-emerald-300/15 bg-emerald-300/10 text-emerald-100",
  flagged: "border-amber-300/15 bg-amber-300/10 text-amber-100",
  blocked: "border-rose-300/15 bg-rose-300/10 text-rose-100",
  escalated: "border-orange-300/15 bg-orange-300/10 text-orange-100",
  "human-reviewed": "border-sky-300/15 bg-sky-300/10 text-sky-100",
};

const healthToneStyles: Record<HealthTone, string> = {
  stable: "text-emerald-200",
  watching: "text-amber-100",
  action: "text-orange-100",
};

const severityStyles: Record<PolicySeverity, string> = {
  low: "text-slate-300",
  medium: "text-amber-100",
  high: "text-orange-100",
  critical: "text-rose-100",
};

const alertToneStyles: Record<AlertTone, string> = {
  info: "border-slate-300/12 bg-slate-300/8",
  warning: "border-amber-300/14 bg-amber-300/8",
  critical: "border-rose-300/14 bg-rose-300/8",
};

function getAdaptiveTextClass(
  value: string,
  defaultClass: string,
  compactClass: string,
  denseClass: string,
) {
  const length = value.trim().length;

  if (length > 72) {
    return denseClass;
  }

  if (length > 38) {
    return compactClass;
  }

  return defaultClass;
}

function App() {
  const [selectedRunId, setSelectedRunId] = useState(liveRuns[0]?.id ?? "");
  const [selectedAlertId, setSelectedAlertId] = useState(alertStream[0]?.id ?? "");

  const selectedRun = liveRuns.find((run) => run.id === selectedRunId) ?? liveRuns[0];
  const selectedTrace =
    decisionTraces.find((trace) => trace.runId === selectedRun?.id) ?? decisionTraces[0];
  const selectedAlert =
    alertStream.find((alert) => alert.id === selectedAlertId) ?? alertStream[0];

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-slate-50">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="bg-grid absolute inset-0 opacity-50" />
        <div className="absolute left-[-8rem] top-[-4rem] h-72 w-72 rounded-full bg-cyan-300/8 blur-3xl" />
        <div className="absolute right-[-5rem] top-32 h-80 w-80 rounded-full bg-indigo-300/10 blur-3xl" />
        <div className="absolute bottom-[-7rem] left-1/3 h-72 w-72 rounded-full bg-emerald-300/6 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen">
        <aside className="hidden w-[296px] shrink-0 flex-col border-r border-white/8 bg-[rgba(7,12,18,0.86)] px-5 py-6 backdrop-blur-xl lg:flex">
            <div className="flex min-w-0 items-center gap-3 px-1">
              <LogoMark />
              <div className="min-w-0">
                <p className="break-anywhere text-sm font-medium tracking-[0.03em] text-slate-100">
                  Applied AI Inhibitor
                </p>
                <p className="text-xs text-slate-500">Runtime safety control center</p>
              </div>
            </div>

          <nav className="mt-8 space-y-1.5">
            {navigation.map((item, index) => (
              <button
                key={item.id}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                  index === 0
                    ? "border-white/10 bg-white/[0.05] text-white"
                    : "border-transparent text-slate-300 hover:border-white/8 hover:bg-white/[0.03]"
                }`}
                type="button"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/8 bg-white/[0.03] text-slate-100">
                  <Icon name={item.icon} />
                </span>
                <span className="min-w-0">
                  <span className="break-anywhere block text-sm font-medium">{item.label}</span>
                  <span className="break-anywhere block text-xs text-slate-500">{item.helper}</span>
                </span>
              </button>
            ))}
          </nav>

          <div className="mt-auto space-y-4">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Oversight posture
              </p>
              <p className="mt-3 text-lg font-medium text-white">
                Trust operators with clear causal evidence, not just risk scores.
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Inhibitor sits between model intent and execution, preserving a readable
                decision trail when systems need review under pressure.
              </p>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(103,232,249,0.08),rgba(15,23,42,0.08))] p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Environment</p>
                <StatusBadge label="Protected" state="human-reviewed" />
              </div>
              <p className="mt-3 text-sm text-slate-200">Production / us-east-1</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Guardrails deployed with human escalation required on critical outbound actions.
              </p>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/8 bg-[rgba(7,11,16,0.78)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between xl:px-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <button className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-slate-100">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_0_6px_rgba(110,231,183,0.08)]" />
                  Production
                </button>

                <label className="flex min-w-0 items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-slate-400 sm:min-w-[20rem]">
                  <Icon className="h-4 w-4 shrink-0" name="search" />
                  <input
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                    placeholder="Search runs, policies, traces"
                    type="text"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  3 systems healthy
                </div>
                <button className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/[0.06]">
                  Review queue
                </button>
                <button className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-slate-100">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-cyan-300 to-indigo-300 text-xs font-semibold text-slate-950">
                    AR
                  </span>
                  A. Rivera
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 pb-8 pt-5 sm:px-6 xl:px-8">
            <section className={`${surface} p-6`}>
              <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-3xl">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                    Control Layer
                  </p>
                  <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">
                    Safe, reviewable agent operations in real time.
                  </h1>
                  <p className="mt-4 max-w-2xl text-pretty text-sm leading-7 text-slate-300/85 sm:text-base">
                    Monitor autonomous runs, inspect the exact step where risk surfaced,
                    and understand why a policy allowed, flagged, blocked, or escalated
                    the system before an action left the boundary.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 xl:w-[540px]">
                  {healthSummary.map((metric) => (
                    <HealthCard
                      key={metric.label}
                      detail={metric.detail}
                      label={metric.label}
                      tone={metric.tone}
                      value={metric.value}
                    />
                  ))}
                </div>
              </div>
            </section>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="space-y-4">
                <section className={`${surface} p-5`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                        Live agent runs
                      </p>
                      <h2 className="mt-2 text-xl font-medium text-white">
                        Active decisions and intervention posture
                      </h2>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <MiniStat label="Flagged" value="04" />
                      <MiniStat label="Blocked" value="02" />
                      <MiniStat label="Escalated" value="01" />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {liveRuns.map((run) => (
                      <button
                        key={run.id}
                        className={`grid gap-4 rounded-[20px] border p-4 text-left transition md:grid-cols-[minmax(0,1.2fr)_160px_148px] ${
                          selectedRun.id === run.id
                            ? "border-white/14 bg-white/[0.06]"
                            : "border-white/8 bg-white/[0.025] hover:border-white/10 hover:bg-white/[0.04]"
                        }`}
                        onClick={() => setSelectedRunId(run.id)}
                        type="button"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className={`${getAdaptiveTextClass(
                                run.agent,
                                "text-sm font-medium text-white",
                                "text-[13px] font-medium leading-5 text-white",
                                "text-xs font-medium leading-5 text-white",
                              )} break-anywhere text-pretty`}
                            >
                              {run.agent}
                            </p>
                            <StatusBadge label={run.state} state={run.state} />
                          </div>
                          <p className="mt-2 break-anywhere text-pretty text-sm leading-6 text-slate-400">
                            {run.summary}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                            <span className="break-anywhere">{run.id}</span>
                            <span className="break-anywhere">{run.model}</span>
                            <span className="break-anywhere">{run.environment}</span>
                          </div>
                        </div>

                        <div className="rounded-[18px] border border-white/8 bg-[rgba(7,11,16,0.62)] px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            Risk score
                          </p>
                          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                            {run.risk}
                          </p>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/6">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-amber-300"
                              style={{ width: `${run.risk}%` }}
                            />
                          </div>
                        </div>

                        <div className="rounded-[18px] border border-white/8 bg-[rgba(7,11,16,0.62)] px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            Last event
                          </p>
                          <p
                            className={`${getAdaptiveTextClass(
                              run.policy,
                              "mt-3 text-sm font-medium text-slate-200",
                              "mt-3 text-[13px] font-medium leading-5 text-slate-200",
                              "mt-3 text-xs font-medium leading-5 text-slate-200",
                            )} break-anywhere`}
                          >
                            {run.policy}
                          </p>
                          <p className="mt-2 text-sm text-slate-500">{run.updatedAt}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_360px]">
                  <section className={`${surface} p-5`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                          Policy pressure
                        </p>
                        <h2 className="mt-2 text-xl font-medium text-white">
                          Recent policy triggers
                        </h2>
                      </div>
                      <button className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200">
                        Manage guardrails
                      </button>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {policyViolations.map((policy) => (
                        <div
                          key={policy.id}
                          className="rounded-[20px] border border-white/8 bg-white/[0.025] p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="break-anywhere text-xs uppercase tracking-[0.18em] text-slate-500">
                                {policy.environment}
                              </p>
                              <p
                                className={`${getAdaptiveTextClass(
                                  policy.policy,
                                  "mt-2 text-base font-medium text-white",
                                  "mt-2 text-[15px] font-medium leading-6 text-white",
                                  "mt-2 text-sm font-medium leading-6 text-white",
                                )} break-anywhere text-pretty`}
                              >
                                {policy.policy}
                              </p>
                            </div>
                            <p
                              className={`text-xs uppercase tracking-[0.18em] ${
                                severityStyles[policy.severity]
                              }`}
                            >
                              {policy.severity}
                            </p>
                          </div>
                          <p className="mt-3 break-anywhere text-pretty text-sm leading-6 text-slate-400">
                            {policy.description}
                          </p>
                          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                            <span className="break-anywhere pr-3">{policy.target}</span>
                            <span className="shrink-0">{policy.triggeredAt}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className={`${surface} p-5`}>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      Alerts stream
                    </p>
                    <h2 className="mt-2 text-xl font-medium text-white">
                      Attention queue
                    </h2>
                    <div className="mt-5 space-y-3">
                      {alertStream.map((alert) => (
                        <button
                          key={alert.id}
                          className={`w-full rounded-[18px] border p-4 text-left transition ${
                            selectedAlert.id === alert.id
                              ? `${alertToneStyles[alert.tone]} border-white/12`
                              : `${alertToneStyles[alert.tone]} hover:border-white/12`
                          }`}
                          onClick={() => setSelectedAlertId(alert.id)}
                          type="button"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p
                              className={`${getAdaptiveTextClass(
                                alert.title,
                                "text-sm font-medium text-white",
                                "text-[13px] font-medium leading-5 text-white",
                                "text-xs font-medium leading-5 text-white",
                              )} min-w-0 break-anywhere text-pretty`}
                            >
                              {alert.title}
                            </p>
                            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                              {alert.timestamp}
                            </span>
                          </div>
                          <p className="mt-2 break-anywhere text-pretty text-sm leading-6 text-slate-400">
                            {alert.detail}
                          </p>
                        </button>
                      ))}
                    </div>
                  </section>
                </div>

                <section className={`${surface} overflow-hidden`}>
                  <div className="flex items-center justify-between gap-3 border-b border-white/8 px-5 py-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                        Intervention log
                      </p>
                      <h2 className="mt-2 text-xl font-medium text-white">
                        Reviewable operator actions
                      </h2>
                    </div>
                    <button className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200">
                      Export audit CSV
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-left">
                      <thead className="bg-white/[0.03]">
                        <tr className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          <th className="px-5 py-3 font-medium">Timestamp</th>
                          <th className="px-5 py-3 font-medium">Run</th>
                          <th className="px-5 py-3 font-medium">Operator</th>
                          <th className="px-5 py-3 font-medium">Action</th>
                          <th className="px-5 py-3 font-medium">Rationale</th>
                          <th className="px-5 py-3 font-medium">State</th>
                        </tr>
                      </thead>
                      <tbody>
                        {interventionLog.map((entry) => (
                          <tr
                            key={entry.id}
                            className="border-t border-white/6 bg-[rgba(8,12,18,0.38)] hover:bg-white/[0.04]"
                          >
                            <td className="px-5 py-4 text-sm text-slate-400">
                              {entry.timestamp}
                            </td>
                            <td className="break-anywhere px-5 py-4 font-mono text-sm text-slate-200">
                              {entry.runId}
                            </td>
                            <td className="break-anywhere px-5 py-4 text-sm text-slate-200">
                              {entry.operator}
                            </td>
                            <td className="break-anywhere px-5 py-4 text-sm text-white">
                              {entry.action}
                            </td>
                            <td className="break-anywhere px-5 py-4 text-sm text-slate-400">
                              {entry.reason}
                            </td>
                            <td className="px-5 py-4">
                              <StatusBadge label={entry.state} state={entry.state} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                <TracePanel trace={selectedTrace} />

                <section className={`${surface} p-5`}>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                    Active alert details
                  </p>
                  <h2
                    className={`${getAdaptiveTextClass(
                      selectedAlert.title,
                      "mt-2 text-xl font-medium text-white",
                      "mt-2 text-lg font-medium leading-7 text-white",
                      "mt-2 text-base font-medium leading-7 text-white",
                    )} break-anywhere text-pretty`}
                  >
                    {selectedAlert.title}
                  </h2>
                  <p className="mt-3 break-anywhere text-pretty text-sm leading-7 text-slate-400">
                    {selectedAlert.detail}
                  </p>
                  <div className="mt-5 space-y-3">
                    <InspectorRow label="Priority" value={selectedAlert.priority} />
                    <InspectorRow label="Suggested owner" value={selectedAlert.owner} />
                    <InspectorRow label="Next action" value={selectedAlert.nextAction} />
                  </div>
                </section>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function LogoMark() {
  return (
    <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="relative h-7 w-7">
        <span className="absolute left-0 top-0 h-2.5 w-2.5 rounded-full bg-cyan-300" />
        <span className="absolute right-0 top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-300" />
        <span className="absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-emerald-300" />
        <span className="absolute left-[0.3rem] top-[0.55rem] h-px w-[1.6rem] rotate-[18deg] bg-white/45" />
        <span className="absolute left-[0.65rem] top-[0.85rem] h-px w-[1.2rem] -rotate-[28deg] bg-white/45" />
      </div>
    </div>
  );
}

function HealthCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: HealthTone;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p
        className={`${getAdaptiveTextClass(
          value,
          "mt-3 text-2xl font-semibold tracking-[-0.04em] text-white",
          "mt-3 text-xl font-semibold tracking-[-0.03em] text-white",
          "mt-3 text-lg font-semibold tracking-[-0.02em] text-white",
        )} break-anywhere`}
      >
        {value}
      </p>
      <p className={`${healthToneStyles[tone]} mt-2 break-anywhere text-pretty text-sm`}>
        {detail}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/8 bg-[rgba(7,11,16,0.62)] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p
        className={`${getAdaptiveTextClass(
          value,
          "mt-2 text-xl font-medium text-white",
          "mt-2 text-lg font-medium text-white",
          "mt-2 text-base font-medium text-white",
        )} break-anywhere`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ label, state }: { label: string; state: RunState }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] ${runStateStyles[state]}`}
    >
      <span className="break-anywhere">{label}</span>
    </span>
  );
}

function TracePanel({ trace }: { trace: DecisionTrace }) {
  return (
    <section className={`${surface} p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Decision trace</p>
          <h2
            className={`${getAdaptiveTextClass(
              trace.runId,
              "mt-2 text-xl font-medium text-white",
              "mt-2 text-lg font-medium text-white",
              "mt-2 text-base font-medium text-white",
            )} break-anywhere`}
          >
            {trace.runId}
          </h2>
        </div>
        <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Risk score</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
            {trace.riskScore}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <InspectorRow label="Timestamp" value={trace.timestamp} />
        <InspectorRow label="Model" value={trace.model} />
        <InspectorRow label="Environment" value={trace.environment} />
        <InspectorRow label="Triggered policy" mono value={trace.policy.name} />
      </div>

      <div className="mt-6 space-y-4">
        {trace.steps.map((step, index) => (
          <div key={step.id} className="grid grid-cols-[22px_minmax(0,1fr)] gap-4">
            <div className="flex flex-col items-center">
              <span
                className={`mt-1 h-3.5 w-3.5 rounded-full border ${
                  step.id === trace.inhibitorStepId
                    ? "border-rose-200 bg-rose-300 shadow-[0_0_0_8px_rgba(253,164,175,0.08)]"
                    : "border-white/30 bg-white/18"
                }`}
              />
              {index < trace.steps.length - 1 ? (
                <span className="mt-2 h-full w-px bg-white/10" />
              ) : null}
            </div>

            <div
              className={`rounded-[20px] border p-4 ${
                step.id === trace.inhibitorStepId
                  ? "border-rose-300/18 bg-rose-300/[0.05]"
                  : "border-white/8 bg-white/[0.025]"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p
                    className={`${getAdaptiveTextClass(
                      step.title,
                      "text-sm font-medium text-white",
                      "text-[13px] font-medium leading-5 text-white",
                      "text-xs font-medium leading-5 text-white",
                    )} break-anywhere text-pretty`}
                  >
                    {step.title}
                  </p>
                  <p className="mt-1 break-anywhere text-xs uppercase tracking-[0.18em] text-slate-500">
                    {step.outcome}
                  </p>
                </div>
                <StatusBadge label={step.state} state={step.state} />
              </div>

              <p className="mt-3 break-anywhere text-pretty text-sm leading-6 text-slate-400">
                {step.input}
              </p>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-[16px] border border-white/8 bg-[rgba(7,11,16,0.62)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Model action</p>
                  <p className="mt-2 break-anywhere text-pretty text-slate-200">{step.action}</p>
                </div>
                <div className="rounded-[16px] border border-white/8 bg-[rgba(7,11,16,0.62)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Confidence</p>
                  <p className="mt-2 break-anywhere text-pretty text-slate-200">
                    {step.confidence}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[16px] border border-white/8 bg-[rgba(7,11,16,0.62)] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Policy checks</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {step.checks.map((check) => (
                    <span
                      key={check}
                      className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300"
                    >
                      {check}
                    </span>
                  ))}
                </div>
              </div>

              {step.snippet ? (
                <div className="mt-4 overflow-hidden rounded-[16px] border border-white/8 bg-[#06090d]">
                  <div className="border-b border-white/8 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    Evidence snippet
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words px-4 py-4 font-mono text-[12px] leading-6 text-slate-300">
                    {step.snippet}
                  </pre>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[20px] border border-white/8 bg-white/[0.025] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Policy rationale</p>
            <p
              className={`${getAdaptiveTextClass(
                trace.policy.name,
                "mt-2 text-base font-medium text-white",
                "mt-2 text-[15px] font-medium leading-6 text-white",
                "mt-2 text-sm font-medium leading-6 text-white",
              )} break-anywhere text-pretty`}
            >
              {trace.policy.name}
            </p>
          </div>
          <p className={`text-xs uppercase tracking-[0.18em] ${severityStyles[trace.policy.severity]}`}>
            {trace.policy.severity}
          </p>
        </div>
        <p className="mt-3 break-anywhere text-pretty text-sm leading-6 text-slate-400">
          {trace.policy.rationale}
        </p>
        <div className="mt-4 space-y-3">
          <InspectorRow label="Control logic" mono value={trace.policy.logic} />
          <InspectorRow label="Response" value={trace.policy.action} />
          <InspectorRow label="Owner" value={trace.policy.owner} />
        </div>
      </div>
    </section>
  );
}

function InspectorRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-[16px] border border-white/8 bg-white/[0.03] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p
        className={`${mono ? "font-mono" : ""} mt-2 break-anywhere text-pretty text-sm text-slate-200`}
      >
        {value}
      </p>
    </div>
  );
}

export default App;
