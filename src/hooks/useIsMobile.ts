import { useEffect, useState } from 'react';

/**
 * 是否移动端（视口宽度 < 768px）。
 * 使用 window.matchMedia 而非 antd Grid.useBreakpoint，避免首屏测量不稳定
 * 导致 isMobile 在 mobile/PC 间抖动、引发布局反复重挂载与卡顿。
 */
export function useIsMobile(): boolean {
  const get = () =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
  const [isMobile, setIsMobile] = useState<boolean>(get);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
