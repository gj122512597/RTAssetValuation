import { Tag } from 'antd';
import type { AssetStatus } from '@/types';

interface RiskTagProps {
  status: AssetStatus;
  /** 风险标签 0~1，越大越确定 */
  confidence?: number;
}

const STATUS_MAP: Record<AssetStatus, { text: string; color: string }> = {
  vacant: { text: '空置', color: 'red' },
  leased: { text: '在租', color: 'green' },
  renovating: { text: '装修中', color: 'orange' },
};

/**
 * 风险标签：根据资产状态 + 置信度生成带颜色与等级的标签。
 * 同时反映"风险等级"：高置信度空置 = 高风险。
 */
export default function RiskTag({ status, confidence = 1 }: RiskTagProps) {
  const { text, color } = STATUS_MAP[status];

  // 空置且置信度<0.6 视为评估不确定性高
  const isHighRisk = status === 'vacant' && confidence < 0.6;
  const suffix = isHighRisk ? ' · 估值不确定' : '';

  return (
    <Tag color={color} bordered={false} style={{ margin: 0 }}>
      {text}
      {suffix}
    </Tag>
  );
}