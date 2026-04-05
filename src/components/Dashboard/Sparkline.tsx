interface Props {
  data: Array<[number, number]>; // [year, value]
  width?: number;
  height?: number;
  color?: string;
}

/**
 * Tiny inline SVG sparkline. No axes, no labels — just the trend shape with
 * a filled area under the curve and the last point highlighted. Renders
 * nothing when the series is empty or has fewer than two points.
 */
export default function Sparkline({
  data,
  width = 90,
  height = 22,
  color = '#60a5fa',
}: Props) {
  if (!data || data.length < 2) return null;
  const xs = data.map((p) => p[0]);
  const ys = data.map((p) => p[1]);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 1;
  const pad = 2;

  const toX = (x: number) => pad + ((x - xMin) / xSpan) * (width - pad * 2);
  const toY = (y: number) => height - pad - ((y - yMin) / ySpan) * (height - pad * 2);

  const pts = data.map((p) => `${toX(p[0]).toFixed(1)},${toY(p[1]).toFixed(1)}`).join(' ');
  const areaPath =
    `M${toX(xs[0]).toFixed(1)},${(height - pad).toFixed(1)} ` +
    data.map((p) => `L${toX(p[0]).toFixed(1)},${toY(p[1]).toFixed(1)}`).join(' ') +
    ` L${toX(xs[xs.length - 1]).toFixed(1)},${(height - pad).toFixed(1)} Z`;

  const lastX = toX(xs[xs.length - 1]);
  const lastY = toY(ys[ys.length - 1]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}
      aria-hidden
    >
      <path d={areaPath} fill={color} opacity="0.18" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="2" fill={color} />
    </svg>
  );
}
