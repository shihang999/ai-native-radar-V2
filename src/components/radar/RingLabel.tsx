import { RINGS } from "@/lib/constants";

interface RingLabelProps {
  cx: number;
  cy: number;
  maxRadius: number;
}

export function RingLabel({ cx, cy, maxRadius }: RingLabelProps) {
  return (
    <g>
      {RINGS.map((ring) => {
        const radius = maxRadius * ring.radiusRatio;
        const x = cx;
        const y = cy - radius + 14;
        return (
          <text
            key={ring.id}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#6B7280"
            fontSize={12}
            fontWeight={400}
            fontFamily="Inter, -apple-system, system-ui, sans-serif"
          >
            {ring.name}
          </text>
        );
      })}
    </g>
  );
}
