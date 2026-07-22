import { useState } from 'react';

const COLORS = [
  '#0d9488',
  '#2563eb',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
  '#84cc16',
  '#ec4899',
];

export function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} L ${cx} ${cy} Z`;
}

function ChartTooltip({ tip }) {
  if (!tip) return null;
  return (
    <div
      className="chart-tooltip"
      style={{ left: tip.x, top: tip.y }}
      role="tooltip"
    >
      {tip.title ? <div className="chart-tooltip-title">{tip.title}</div> : null}
      {(tip.lines || []).map((line) => (
        <div key={line.label} className="chart-tooltip-row">
          {line.color ? <i style={{ background: line.color }} /> : null}
          <span>{line.label}</span>
          <strong>{line.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function PieChart({ data = [], size = 220, innerLabel = '' }) {
  const [tip, setTip] = useState(null);
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8;

  if (!total) {
    return (
      <div className="chart-empty">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={r} fill="#f1f5f9" stroke="#e2e8f0" />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#94a3b8" fontSize="13">
            No data
          </text>
        </svg>
      </div>
    );
  }

  let angle = 0;
  const slices = data.map((item, index) => {
    const value = Number(item.value) || 0;
    const sweep = (value / total) * 360;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    return {
      ...item,
      value,
      start,
      end: end >= 359.99 ? 359.99 : end,
      color: item.color || COLORS[index % COLORS.length],
      percent: (value / total) * 100,
    };
  });

  return (
    <div className="pie-chart-wrap chart-hover-root" onMouseLeave={() => setTip(null)}>
      <div className="chart-svg-box">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="pie-chart-svg">
          {slices.map((slice) =>
            slice.end - slice.start < 0.01 ? null : (
              <path
                key={slice.name || slice.slug}
                d={describeArc(cx, cy, r, slice.start, slice.end)}
                fill={slice.color}
                stroke="#fff"
                strokeWidth="2"
                style={{ cursor: 'pointer' }}
                onMouseMove={(e) => {
                  const box = e.currentTarget.ownerSVGElement?.parentElement?.getBoundingClientRect();
                  if (!box) return;
                  setTip({
                    x: e.clientX - box.left + 12,
                    y: e.clientY - box.top - 8,
                    title: slice.name,
                    lines: [
                      {
                        label: 'Value',
                        value: formatNumber(slice.value),
                        color: slice.color,
                      },
                      {
                        label: 'Share',
                        value: `${slice.percent.toFixed(1)}%`,
                      },
                    ],
                  });
                }}
              />
            )
          )}
          <circle cx={cx} cy={cy} r={r * 0.52} fill="#fff" />
          {innerLabel ? (
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#0f172a"
              fontSize="12"
              fontWeight="700"
            >
              {innerLabel}
            </text>
          ) : null}
        </svg>
        <ChartTooltip tip={tip} />
      </div>
      <ul className="chart-legend">
        {slices.map((slice) => (
          <li key={slice.name || slice.slug}>
            <span className="legend-dot" style={{ background: slice.color }} />
            <span className="legend-name">{slice.name}</span>
            <span className="legend-value">
              {formatNumber(slice.value)}
              <small>{slice.percent.toFixed(0)}%</small>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LineChart({
  data = [],
  series = [],
  height = 220,
  valuePrefix = '',
  formatValue = formatNumber,
}) {
  const [tip, setTip] = useState(null);
  const width = 640;
  const padding = { top: 16, right: 16, bottom: 36, left: 44 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxValue = Math.max(
    1,
    ...series.flatMap((s) => data.map((row) => Number(row[s.key]) || 0))
  );

  const xFor = (index) =>
    padding.left + (data.length <= 1 ? innerW / 2 : (index / (data.length - 1)) * innerW);
  const yFor = (value) => padding.top + innerH - (Number(value) / maxValue) * innerH;

  if (!data.length) {
    return <div className="chart-empty">No chart data</div>;
  }

  const showTipForIndex = (index, event) => {
    const svg = event.currentTarget.ownerSVGElement || event.currentTarget;
    const box = svg.parentElement?.getBoundingClientRect();
    if (!box) return;
    const row = data[index];
    setTip({
      x: Math.min(box.width - 8, Math.max(8, event.clientX - box.left + 12)),
      y: Math.max(8, event.clientY - box.top - 12),
      title: row.label || row.date,
      lines: series.map((s) => ({
        label: s.label,
        color: s.color,
        value: `${valuePrefix}${formatValue(row[s.key])}`,
      })),
    });
  };

  return (
    <div className="line-chart-wrap chart-hover-root" onMouseLeave={() => setTip(null)}>
      <div className="chart-svg-box">
        <svg viewBox={`0 0 ${width} ${height}`} className="line-chart-svg" role="img">
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = padding.top + innerH * (1 - tick);
            const val = maxValue * tick;
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray={tick === 0 ? undefined : '4 4'}
                />
                <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="10">
                  {valuePrefix}
                  {formatValue(val)}
                </text>
              </g>
            );
          })}

          {series.map((s) => {
            const points = data
              .map((row, index) => `${xFor(index)},${yFor(row[s.key])}`)
              .join(' ');
            const areaPoints = [
              `${xFor(0)},${padding.top + innerH}`,
              ...data.map((row, index) => `${xFor(index)},${yFor(row[s.key])}`),
              `${xFor(data.length - 1)},${padding.top + innerH}`,
            ].join(' ');
            return (
              <g key={s.key}>
                {s.area ? (
                  <polygon points={areaPoints} fill={s.color} opacity="0.12" />
                ) : null}
                <polyline
                  points={points}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {data.map((row, index) => (
            <g key={row.date || index}>
              <rect
                x={xFor(index) - (innerW / Math.max(data.length, 1)) / 2}
                y={padding.top}
                width={Math.max(innerW / Math.max(data.length, 1), 18)}
                height={innerH}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseMove={(e) => showTipForIndex(index, e)}
              />
              {series.map((s) => (
                <circle
                  key={`${s.key}-${row.date || index}`}
                  cx={xFor(index)}
                  cy={yFor(row[s.key])}
                  r={tip?.title === (row.label || row.date) ? 5.5 : 3.5}
                  fill="#fff"
                  stroke={s.color}
                  strokeWidth="2"
                  style={{ pointerEvents: 'none' }}
                />
              ))}
            </g>
          ))}

          {data.map((row, index) =>
            index % Math.ceil(data.length / 7) === 0 || index === data.length - 1 ? (
              <text
                key={`label-${row.date || index}`}
                x={xFor(index)}
                y={height - 12}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="10"
              >
                {row.label || row.date}
              </text>
            ) : null
          )}
        </svg>
        <ChartTooltip tip={tip} />
      </div>
      <div className="chart-series-legend">
        {series.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function BarChart({
  data = [],
  series = [],
  height = 220,
  valuePrefix = '',
  formatValue = formatNumber,
}) {
  const [tip, setTip] = useState(null);
  const width = 640;
  const padding = { top: 16, right: 16, bottom: 36, left: 44 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const groupCount = Math.max(data.length, 1);
  const groupWidth = innerW / groupCount;
  const barGap = 4;
  const barWidth = Math.max(6, (groupWidth - barGap * 2) / Math.max(series.length, 1) - 2);

  const maxValue = Math.max(
    1,
    ...series.flatMap((s) => data.map((row) => Number(row[s.key]) || 0))
  );

  if (!data.length) {
    return <div className="chart-empty">No chart data</div>;
  }

  return (
    <div className="line-chart-wrap chart-hover-root" onMouseLeave={() => setTip(null)}>
      <div className="chart-svg-box">
        <svg viewBox={`0 0 ${width} ${height}`} className="line-chart-svg" role="img">
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = padding.top + innerH * (1 - tick);
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray={tick === 0 ? undefined : '4 4'}
                />
                <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="10">
                  {valuePrefix}
                  {formatValue(maxValue * tick)}
                </text>
              </g>
            );
          })}

          {data.map((row, index) => {
            const groupX = padding.left + index * groupWidth;
            return (
              <g key={row.date || index}>
                {/* hit area for whole day group */}
                <rect
                  x={groupX}
                  y={padding.top}
                  width={groupWidth}
                  height={innerH}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseMove={(e) => {
                    const svg = e.currentTarget.ownerSVGElement;
                    const box = svg?.parentElement?.getBoundingClientRect();
                    if (!box) return;
                    setTip({
                      x: Math.min(box.width - 8, Math.max(8, e.clientX - box.left + 12)),
                      y: Math.max(8, e.clientY - box.top - 12),
                      title: row.label || row.date,
                      lines: series.map((s) => ({
                        label: s.label,
                        color: s.color,
                        value: `${valuePrefix}${formatValue(row[s.key])}`,
                      })),
                    });
                  }}
                />
                {series.map((s, sIndex) => {
                  const value = Number(row[s.key]) || 0;
                  const h = (value / maxValue) * innerH;
                  const x = groupX + barGap + sIndex * (barWidth + 2);
                  const y = padding.top + innerH - h;
                  return (
                    <rect
                      key={s.key}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(h, value > 0 ? 2 : 0)}
                      rx="3"
                      fill={s.color}
                      style={{ pointerEvents: 'none' }}
                    />
                  );
                })}
                {index % Math.ceil(data.length / 7) === 0 || index === data.length - 1 ? (
                  <text
                    x={groupX + groupWidth / 2}
                    y={height - 12}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="10"
                  >
                    {row.label || row.date}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
        <ChartTooltip tip={tip} />
      </div>
      <div className="chart-series-legend">
        {series.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
