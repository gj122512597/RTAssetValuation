import { Grid } from 'antd';

/**
 * 是否移动端（视口宽度 < 768px，即 antd 的 md 断点以下）。
 * PC 端布局保持完全不变，仅移动端据此切换为响应式布局。
 */
export function useIsMobile(): boolean {
  const screens = Grid.useBreakpoint();
  return !screens.md;
}
