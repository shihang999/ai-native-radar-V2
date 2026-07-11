import { DOMAINS } from "@/lib/constants";

interface SectorLabelProps {
  cx: number;
  cy: number;
  maxRadius: number;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function SectorLabel({ cx, cy, maxRadius }: SectorLabelProps) {
  return (
    <g>
      {DOMAINS.map((domain) => {
        const midAngle = (domain.angleStart + domain.angleEnd) / 2;
        const rad = degToRad(midAngle);
        const labelRadius = maxRadius + 28;
        const x = cx + labelRadius * Math.cos(rad);
        const y = cy + labelRadius * Math.sin(rad);

        return (
          <text
            key={domain.id}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={domain.color}
            fontSize={14}
            fontWeight={600}
            fontFamily="Inter, -apple-system, system-ui, sans-serif"
          >
            {domain.name}
          </text>
        );
      })}
    </g>
  );
}
