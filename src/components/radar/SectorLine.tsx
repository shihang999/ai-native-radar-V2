import { DOMAINS } from "@/lib/constants";

interface SectorLineProps {
  cx: number;
  cy: number;
  maxRadius: number;
}

/** 角度转弧度 */
function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function SectorLine({ cx, cy, maxRadius }: SectorLineProps) {
  return (
    <g>
      {DOMAINS.map((domain) => {
        const rad = degToRad(domain.angleStart);
        const x2 = cx + maxRadius * Math.cos(rad);
        const y2 = cy + maxRadius * Math.sin(rad);
        return (
          <line
            key={domain.id}
            x1={cx}
            y1={cy}
            x2={x2}
            y2={y2}
            stroke="#E5E7EB"
            strokeWidth={1}
            opacity={0.4}
          />
        );
      })}
    </g>
  );
}
