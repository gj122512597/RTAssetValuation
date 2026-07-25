/**
 * 统一的 加载 / 空 /错误 三态组件
 *
 * - LoadingSkeleton：列表骨架屏，避免整页 Spin
 * - EmptyState：带操作建议的空状态，比 Antd Empty 友好
 * - ErrorState：明确的错误 + 重试按钮
 */
import { Spin, Button } from 'antd';
import { colors } from '@/styles/tokens';

/* ============== Loading Skeleton ============== */

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse" role="status" aria-label="加载中">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-ink-100 rounded-md p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="h-3.5 bg-ink-100 rounded w-1/3" />
            <div className="h-3.5 bg-ink-100 rounded-full w-12" />
          </div>
          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="h-2.5 bg-ink-100 rounded w-2/5" />
            <div className="h-2.5 bg-ink-100 rounded-full w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatBarSkeleton() {
  return (
    <div className="grid grid-cols-5 gap-3 animate-pulse" aria-label="统计加载中">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 bg-ink-100 rounded" />
      ))}
    </div>
  );
}

/* ============== Empty State ============== */

interface EmptyStateProps {
  /** 简短说明：当前为什么空 */
  description: string;
  /** 行动建议：让用户知道下一步能做什么 */
  hint?: string;
  /** 操作按钮文字 */
  actionText?: string;
  onAction?: () => void;
  /** 自定义图标 emoji 或字符 */
  icon?: string;
  /** 紧凑模式（用于表格 cell） */
  compact?: boolean;
}

export function EmptyState({
  description,
  hint,
  actionText,
  onAction,
  icon = '📭',
  compact = false,
}: EmptyStateProps) {
  if (compact) {
    return (
      <div className="text-center py-4">
        <div className="text-xl mb-1 opacity-40">{icon}</div>
        <div className="text-xs text-ink-500">{description}</div>
        {hint && <div className="text-[11px] text-ink-300 mt-1">{hint}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-5xl mb-3 opacity-50">{icon}</div>
      <div className="text-sm text-ink-700 mb-1">{description}</div>
      {hint && <div className="text-xs text-ink-500 mb-3 text-center max-w-xs">{hint}</div>}
      {actionText && onAction && (
        <Button type="primary" size="small" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}

/* ============== Error State ============== */

interface ErrorStateProps {
  message: string;
  description?: string;
  onRetry?: () => void;
  /** 错误级别（影响图标 + 颜色） */
  level?: 'warning' | 'danger';
}

export function ErrorState({ message, description, onRetry, level = 'warning' }: ErrorStateProps) {
  const color = level === 'danger' ? colors.danger : colors.warning;
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-3"
        style={{ background: `${color}15`, color }}
      >
        ⚠
      </div>
      <div className="text-sm font-medium text-ink-900 mb-1">{message}</div>
      {description && (
        <div className="text-xs text-ink-500 mb-3 text-center max-w-md">{description}</div>
      )}
      {onRetry && (
        <Button type="default" size="small" onClick={onRetry}>
          重试
        </Button>
      )}
    </div>
  );
}

/** 给页面初始加载做"旋转加载"包装 */
export function PageLoading({ tip = '加载中…' }: { tip?: string }) {
  return (
    <div className="h-full flex items-center justify-center">
      <Spin size="large" tip={tip} />
    </div>
  );
}