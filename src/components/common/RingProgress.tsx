/**
 * 圆环进度（SVG）
 *  - 整圈背景 + 已完成段彩色弧
 *  - 中央文字显示百分比
 *  - 颜色按值变化（绿/蓝/红）
 */
interface Props {
  percent: number;
  color?: string;
  label?: string;
  size?: number;
  stroke?: number;
}

export function RingProgress({ percent, color, label, size = 96, stroke = 8 }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  const finalColor =
    color ?? (percent >= 80 ? '#22c55e' : percent >= 40 ? '#1f6feb' : '#ef4444');

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} style={{ display: 'block' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={finalColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 400ms ease-out' }}
        />
        <text
          x={size / 2}
          y={size / 2 + 4}
          textAnchor="middle"
          fontSize={size / 4}
          fontWeight={700}
          fill={finalColor}
        >
          {percent}%
        </text>
      </svg>
      {label && (
        <span className="text-[11px] text-ink-500 mt-0.5" style={{ color: finalColor }}>
          {label}
        </span>
      )}
    </div>
  );
}