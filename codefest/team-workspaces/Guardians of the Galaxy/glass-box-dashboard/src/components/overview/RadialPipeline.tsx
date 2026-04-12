import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { DashboardStats } from '@/lib/types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/humanize';
import type { EventCategory } from '@/lib/types';

interface Props {
  stats: DashboardStats;
}

const PIPELINE_STAGES: { key: EventCategory; events: string[] }[] = [
  { key: 'request', events: ['request_success'] },
  { key: 'rules', events: ['rules_inhibition_rule_start', 'rules_inhibition_rule_passed', 'rules_inhibition_rule_binding_missing', 'rules_extraction_value_missing', 'rules_inhibition_complete'] },
  { key: 'embedding', events: ['embedding_start', 'embedding_complete'] },
  { key: 'llm', events: ['llm_prompt_start', 'llm_prompt_complete'] },
  { key: 'observation', events: ['inhibition_observation_description_response'] },
  { key: 'prediction', events: ['inhibition_prediction_reason_response'] },
  { key: 'validation', events: ['inhibition_describe_result_validation', 'inhibition_final_validation'] },
];

export function RadialPipeline({ stats }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const [animProgress, setAnimProgress] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    const duration = 2000;
    function step(ts: number) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setAnimProgress(p);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 380;
    canvas.width = size * 2;
    canvas.height = size * 2;
    ctx.scale(2, 2); // Retina

    const cx = size / 2;
    const cy = size / 2;

    ctx.clearRect(0, 0, size, size);

    // Draw concentric rings for each stage
    const minR = 40;
    const maxR = 170;
    const ringWidth = (maxR - minR) / PIPELINE_STAGES.length;

    PIPELINE_STAGES.forEach((stage, i) => {
      const r = minR + (i + 0.5) * ringWidth;
      const count = stage.events.reduce((sum, e) => sum + (stats.eventTypeCounts[e] || 0), 0);
      const maxCount = Math.max(...PIPELINE_STAGES.map(s =>
        s.events.reduce((sum, e) => sum + (stats.eventTypeCounts[e] || 0), 0)
      ));
      const fraction = count / maxCount;
      const sweepAngle = fraction * Math.PI * 2 * animProgress;
      const color = CATEGORY_COLORS[stage.key];

      // Background ring
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `${color}15`;
      ctx.lineWidth = ringWidth - 4;
      ctx.stroke();

      // Filled arc
      if (sweepAngle > 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + sweepAngle);
        ctx.strokeStyle = `${color}90`;
        ctx.lineWidth = ringWidth - 4;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Glow
        ctx.beginPath();
        ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + sweepAngle);
        ctx.strokeStyle = `${color}25`;
        ctx.lineWidth = ringWidth + 4;
        ctx.stroke();
      }
    });

    // Center circle
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, minR);
    gradient.addColorStop(0, 'rgba(0, 212, 255, 0.12)');
    gradient.addColorStop(1, 'rgba(0, 212, 255, 0.02)');
    ctx.beginPath();
    ctx.arc(cx, cy, minR, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Center text
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${stats.totalRequests}`, cx, cy - 8);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText('REQUESTS', cx, cy + 10);

    ctx.lineCap = 'butt';
  }, [stats, animProgress]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, duration: 0.8, ease: 'easeOut' }}
      className="glass-card p-6"
    >
      <h3 className="text-sm font-semibold text-foreground mb-1">Inhibitor Pipeline Flow</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Concentric rings show event volume per processing stage
      </p>

      <div className="flex items-center gap-6">
        {/* Canvas */}
        <div className="relative flex-shrink-0">
          <canvas
            ref={canvasRef}
            style={{ width: 380, height: 380 }}
            className="block"
          />
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3">
          {PIPELINE_STAGES.map((stage) => {
            const count = stage.events.reduce((sum, e) => sum + (stats.eventTypeCounts[e] || 0), 0);
            const color = CATEGORY_COLORS[stage.key];
            const label = CATEGORY_LABELS[stage.key];
            return (
              <div
                key={stage.key}
                className="flex items-center justify-between p-2 rounded-lg transition-colors hover:bg-white/[0.03]"
                onMouseEnter={() => setHoveredStage(stage.key)}
                onMouseLeave={() => setHoveredStage(null)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: color,
                      boxShadow: hoveredStage === stage.key ? `0 0 12px ${color}` : 'none'
                    }}
                  />
                  <span className="text-sm text-foreground">{label}</span>
                </div>
                <span
                  className="text-sm font-mono font-bold"
                  style={{ color }}
                >
                  {count.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
