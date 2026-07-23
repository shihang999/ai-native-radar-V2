import { DOMAINS } from "@/lib/constants";

interface SectorLabelProps {
  cx: number;
  cy: number;
  maxRadius: number;
  activeDomainId?: string | null;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function SectorLabel({ cx, cy, maxRadius, activeDomainId }: SectorLabelProps) {
  return (
    <g>
      {DOMAINS.map((domain) => {
        const midAngle = (domain.angleStart + domain.angleEnd) / 2;
        const rad = degToRad(midAngle);
        const labelRadius = maxRadius + 4;
        const x = cx + labelRadius * Math.cos(rad);
        const y = cy + labelRadius * Math.sin(rad);
        const isActive = activeDomainId ? domain.id === activeDomainId : false;
        const labelColor = activeDomainId ? (isActive ? domain.color : "#94A3B8") : domain.color;
        const fontWeight = activeDomainId ? (isActive ? 700 : 600) : 600;

        return (
          <text
            key={domain.id}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={labelColor}
            fontSize={14}
            fontWeight={fontWeight}
            fontFamily="Inter, -apple-system, system-ui, sans-serif"
          >
            {domain.name}
          </text>
        );
      })}
    </g>
  );
}
