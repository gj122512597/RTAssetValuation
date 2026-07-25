import { Tag, Tooltip } from 'antd';
import type { HiddenRiskTag as HiddenRiskTagType } from '@/types';

const RISK_LABELS: Record<HiddenRiskTagType, { label: string; desc: string }> = {
  special_license: { label: '需办特行证', desc: '经营特种行业需办理行政许可（旅社/餐饮/危化品等）' },
  clear_eviction: { label: '存在清退风险', desc: '原租户存在纠纷或合约到期强制清退情形' },
  military_legacy: { label: '部队遗留问题', desc: '历史接收自部队资产，使用性质受限' },
  covenant_limit: { label: '业主业态限制', desc: '业主或物业协议对可经营业态有限制' },
  fire_safety: { label: '消防不达标', desc: '消防验收存在未通过或待整改项' },
  tax_issue: { label: '税费纠纷', desc: '存在房产税/土地使用税等未尽事项' },
  mortgage: { label: '抵押状态', desc: '资产已设抵押，处分受限' },
};

interface HiddenRiskTagProps {
  tag: HiddenRiskTagType;
  closable?: boolean;
  onClose?: () => void;
}

export default function HiddenRiskTag({ tag, closable, onClose }: HiddenRiskTagProps) {
  const meta = RISK_LABELS[tag];
  return (
    <Tooltip title={meta.desc}>
      <Tag color="volcano" closable={closable} onClose={onClose}>
        ⚠ {meta.label}
      </Tag>
    </Tooltip>
  );
}

export { RISK_LABELS };
