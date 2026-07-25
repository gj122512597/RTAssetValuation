/**
 * Design Tokens（设计系统单一源）
 *  - 颜色 / 字号 / 间距 / 圆角 / 阴影 集中定义
 *  - Tailwind config + Antd theme + 各组件 SVG 一致引用这里
 */
export const colors = {
  // 品牌
  brand: {
    50: '#eaf1ff',
    100: '#c8d8ff',
    200: '#9bb8ff',
    300: '#6694fb',
    400: '#3b75f3',
    500: '#1f6feb', // 主色
    600: '#0b4fcb',
    700: '#0a3da3',
    800: '#0a317f',
    900: '#0d285d',
  },

  // 单价 5 桶（marker 主色，PRD §1.3 "颜色深浅代表预估租金单价"）
  priceBucket: {
    ultraLow: '#94a3b8', // < 1 元/㎡·天
    low: '#7eb6f0',      // 1-3
    mid: '#6dd1b3',     // 3-6
    high: '#f0c674',    // 6-10
    ultraHigh: '#f08a8a', // ≥ 10
  },

  // 状态色（形状 = 状态，颜色 = 形态辅助色）
  status: {
    leased: '#22c55e',
    vacant: '#ef4444',
    renovating: '#f59e0b',
  },

  // 语义
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',

  // 中性
  ink: {
    900: '#0f172a', // 标题
    700: '#334155', // 正文
    500: '#64748b', // 次要文本
    300: '#cbd5e1', // 描边
    100: '#f1f5f9', // 卡片底色
    50: '#f8fafc',  // 页面底色
  },

  // 数据可视化（柔和饱和度）
  chart: {
    primary: '#1f6feb',
    secondary: '#7c3aed',
    tertiary: '#06b6d4',
    warn: '#f59e0b',
    danger: '#f87171',
  },

  // 区域聚合层（purple，竞品链路）
  comp: {
    primary: '#7c3aed',
    soft: '#a78bfa',
    line: '#7c3aed',
  },

  // 资产 marker 主色 = price bucket（同上）
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

export const shadows = {
  card: '0 4px 16px rgba(15, 23, 42, 0.06)',
  pop: '0 8px 24px rgba(15, 23, 42, 0.12)',
  inset: 'inset 0 1px 2px rgba(15, 23, 42, 0.06)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** 渐变预设（按使用频率） */
export const gradients = {
  cardBg: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
  hero: 'linear-gradient(135deg, #1f6feb 0%, #7c3aed 100%)',
} as const;

/** 动效 */
export const transitions = {
  fast: '120ms cubic-bezier(.4,0,.2,1)',
  normal: '200ms cubic-bezier(.4,0,.2,1)',
  slow: '320ms cubic-bezier(.4,0,.2,1)',
} as const;