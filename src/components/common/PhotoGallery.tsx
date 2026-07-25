import { useState } from 'react';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

interface PhotoGalleryProps {
  /** 占位 photo-X 的列表；我们用色块而不是真图（避免外链） */
  photos: string[];
  assetName: string;
}

/**
 * 简易照片轮播（PRD §2 P2-1 "实景照片：支持左右滑动查看"）
 *
 * 这里没有真实图片，用 HSL 色块占位（每张照片一种颜色，根据 id 生成）。
 */
const COLOR_FOR = (id: string) => {
  const hue =
    id
      .split('')
      .reduce((s, ch) => s + ch.charCodeAt(0), 0) % 360;
  return `hsl(${hue}, 55%, 70%)`;
};

export default function PhotoGallery({ photos, assetName }: PhotoGalleryProps) {
  const [idx, setIdx] = useState(0);
  if (!photos || photos.length === 0) {
    return (
      <div className="h-32 bg-gray-100 rounded-md flex items-center justify-center text-xs text-gray-400">
        暂无实景照片
      </div>
    );
  }

  const go = (delta: number) => {
    setIdx((i) => (i + delta + photos.length) % photos.length);
  };

  const current = photos[idx];

  return (
    <div className="relative w-full h-32 rounded-md overflow-hidden shadow-sm">
      <div
        className="absolute inset-0 flex items-center justify-center text-white text-xs font-semibold"
        style={{ background: COLOR_FOR(current) }}
      >
        {assetName} · 照片 {idx + 1} / {photos.length}
      </div>
      {/* 左右切换按钮 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          go(-1);
        }}
        className="absolute top-1/2 left-2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 hover:bg-white text-gray-700 flex items-center justify-center transition-colors"
        aria-label="上一张"
      >
        <LeftOutlined />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          go(1);
        }}
        className="absolute top-1/2 right-2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 hover:bg-white text-gray-700 flex items-center justify-center transition-colors"
        aria-label="下一张"
      >
        <RightOutlined />
      </button>
      {/* dots */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
        {photos.map((_, i) => (
          <span
            key={i}
            className={
              'block w-1.5 h-1.5 rounded-full transition-all ' +
              (i === idx ? 'bg-white scale-125' : 'bg-white/50')
            }
          />
        ))}
      </div>
    </div>
  );
}
