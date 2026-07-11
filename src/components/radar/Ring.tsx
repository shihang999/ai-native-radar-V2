import { RINGS } from "@/lib/constants";

interface RingProps {
  cx: number;
  cy: number;
  maxRadius: number;
}

export function Ring({ cx, cy, maxRadius }: RingProps) {
  return (
    <g>
      {RINGS.map((ring) => {
        const radius = maxRadius * ring.radiusRatio;
        return (
          <circle
            key={ring.id}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={1}
            opacity={0.4}
          />
        );
      })}
    </g>
  );
}
