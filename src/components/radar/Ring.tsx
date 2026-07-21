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
            stroke="#CBD5E1"
            strokeWidth={1.5}
            opacity={0.6}
          />
        );
      })}
    </g>
  );
}
