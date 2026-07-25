import { Card, Descriptions, Tag } from 'antd';
import type { Asset } from '@/types';
import RiskTag from '@/components/common/RiskTag';
import HiddenRiskTag from '@/components/common/HiddenRiskTag';
import PhotoGallery from '@/components/common/PhotoGallery';
import { useAssetStore } from '@/stores/assetStore';
import { useMemo } from 'react';

const CERT_LABEL: Record<string, { text: string; color: string }> = {
  complete: { text: '齐全', color: 'green' },
  pending: { text: '待办', color: 'orange' },
  missing: { text: '缺失', color: 'red' },
};

const BATCH_LABEL: Record<string, string> = {
  'batch-1': '一批（首批）',
  'batch-2': '二批',
  'batch-3': '三批',
  'batch-4': '四批（最新）',
};

/**
 * 资产画像卡片（M2 P2-1）
 *  - 基础信息 / 接收批次 / 权证状态 / 实景照片 / 隐性风险标签
 *  - "人工"风险标签可在详情页手动勾选，存入 store.manualRisks
 */
export default function AssetPortraitCard({ asset }: { asset: Asset }) {
  const manualRisks = useAssetStore((s) => s.manualRisks[asset.id] ?? []);
  const allRisks = useMemo(
    () => Array.from(new Set([...(asset.hidden_risks ?? []), ...manualRisks])),
    [asset.hidden_risks, manualRisks]
  );
  const cert = CERT_LABEL[asset.certificate_status] ?? CERT_LABEL.missing;
  const batch = BATCH_LABEL[asset.received_batch] ?? asset.received_batch;

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <span>资产画像</span>
          <RiskTag status={asset.status} confidence={asset.confidence} />
        </div>
      }
      size="small"
      className="!shadow-card"
    >
      <div className="mb-3">
        <PhotoGallery
          photos={asset.images ?? []}
          assetName={asset.name}
        />
      </div>

      <Descriptions size="small" column={2} bordered>
        <Descriptions.Item label="资产编号">{asset.id}</Descriptions.Item>
        <Descriptions.Item label="接收批次">
          <Tag color="blue">{batch}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="地址" span={2}>
          {asset.address ?? '—'}
        </Descriptions.Item>
        <Descriptions.Item label="业态">
          <Tag color="geekblue">{asset.type}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="面积">{asset.area.toLocaleString()} ㎡</Descriptions.Item>
        <Descriptions.Item label="装修档位">
          {(asset.decoration_level ?? 'standard') === 'rough' && '毛坯'}
          {asset.decoration_level === 'simple' && '简装'}
          {asset.decoration_level === 'standard' && '标准'}
          {asset.decoration_level === 'fine' && '精装'}
          {!asset.decoration_level && '标准'}
        </Descriptions.Item>
        <Descriptions.Item label="上次装修">
          {asset.last_renovation ?? '—'}
        </Descriptions.Item>
        <Descriptions.Item label="权证状态" span={2}>
          <Tag color={cert.color} bordered={false}>{cert.text}</Tag>
          {asset.certificate_status !== 'complete' && (
            <span className="ml-2 text-xs text-gray-500">建议补办后再交易</span>
          )}
        </Descriptions.Item>
      </Descriptions>

      <div className="mt-3">
        <div className="text-xs text-gray-500 mb-1.5">
          隐性风险（{allRisks.length}）：
          <span className="ml-2 text-[11px] text-gray-400">
            自动 + 人工（可在下方勾选）
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allRisks.length === 0 ? (
            <Tag color="green" bordered={false}>未发现明显风险</Tag>
          ) : (
            allRisks.map((r) => <HiddenRiskTag key={r} tag={r} />)
          )}
        </div>
      </div>
    </Card>
  );
}
