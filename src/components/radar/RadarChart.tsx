import { RADAR_CONFIG } from "@/lib/constants";
import { Ring } from "./Ring";
import { SectorLine } from "./SectorLine";
import { SectorLabel } from "./SectorLabel";
import { RingLabel } from "./RingLabel";
import { Blip } from "./Blip";
import { BOOKS } from "@/data/books";

const { size, centerX, centerY, maxRadius } = RADAR_CONFIG;

export function RadarChart() {
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[680px] aspect-square mx-auto"
      role="img"
      aria-label="AI-Native 读书雷达"
    >
      {/* 圈层 */}
      <Ring cx={centerX} cy={centerY} maxRadius={maxRadius} />

      {/* 扇区分隔线 */}
      <SectorLine cx={centerX} cy={centerY} maxRadius={maxRadius} />

      {/* 扇区标签（领域名） */}
      <SectorLabel cx={centerX} cy={centerY} maxRadius={maxRadius} />

      {/* 圈层标签（难度） */}
      <RingLabel cx={centerX} cy={centerY} maxRadius={maxRadius} />

      {/* 书籍 blip 点 */}
      {BOOKS.map((book) => (
        <Blip key={book.id} book={book} cx={centerX} cy={centerY} maxRadius={maxRadius} />
      ))}
    </svg>
  );
}
