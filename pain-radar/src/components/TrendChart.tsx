// 最近 7 天趋势柱状图（纯 SVG，服务端渲染，CSS 悬停提示）
// 单一系列：无需图例，标题即系列名；悬停显示当日数值

interface Day {
  label: string; // MM/DD
  count: number;
}

export function TrendChart({ days }: { days: Day[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const W = 560;
  const H = 150;
  const PAD_BOTTOM = 22;
  const PAD_TOP = 18;
  const plotH = H - PAD_BOTTOM - PAD_TOP;
  const slot = W / days.length;
  const barW = Math.min(36, slot * 0.5);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label={`最近 7 天每日新增痛点评论数，${days.map((d) => `${d.label} ${d.count} 条`).join("，")}`}
    >
      {/* 基线 */}
      <line x1={0} y1={H - PAD_BOTTOM} x2={W} y2={H - PAD_BOTTOM} stroke="var(--border)" strokeWidth={1} />
      {days.map((d, i) => {
        const h = Math.max(2, (d.count / max) * plotH);
        const x = i * slot + (slot - barW) / 2;
        const y = H - PAD_BOTTOM - h;
        return (
          <g key={d.label} className="group">
            {/* 命中区域比柱子大，便于悬停 */}
            <rect x={i * slot} y={PAD_TOP - 14} width={slot} height={H - PAD_TOP} fill="transparent" />
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={4}
              fill="var(--series-1)"
              className="transition-opacity opacity-90 group-hover:opacity-100"
            />
            {/* 挡住底部圆角，让柱子贴基线 */}
            <rect x={x} y={H - PAD_BOTTOM - 3} width={barW} height={3} fill="var(--series-1)" className="opacity-90 group-hover:opacity-100" />
            <text
              x={i * slot + slot / 2}
              y={H - 6}
              textAnchor="middle"
              fontSize={11}
              fill="var(--text-muted)"
            >
              {d.label}
            </text>
            <text
              x={i * slot + slot / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize={12}
              fontWeight={600}
              fill="var(--text-secondary)"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {d.count}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
