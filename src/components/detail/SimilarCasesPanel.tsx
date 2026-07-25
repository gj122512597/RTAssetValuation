import { Card, Tag, Alert, Slider, Statistic, Row, Col, Space, Button, Tooltip } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import type { Asset } from '@/types';
import {
  judgeNonStandard,
  pickSimilarCases,
  refRangeFromSimilarCases,
} from '@/utils/similarCases';
import { useAssetStore } from '@/stores/assetStore';
import { useNavigate } from 'react-router-dom';

interface Props {
  asset: Asset;
}

/**
 * 非标资产"破冰"工具（M4 P5-1）
 *   - 自动判定非标
 *   - 检索最相似的 N 个资产（按业态/区域/面积/成新/价位）
 *   - 残值/运输系数人工可调
 *   - 给出参考区间
 */
export default function SimilarCasesPanel({ asset }: Props) {
  const allAssets = useAssetStore((s) => s.assets);
  const navigate = useNavigate();

  // 初始：默认系数
  const verdict = useMemo(() => judgeNonStandard(asset), [asset]);
  const cases = useMemo(() => pickSimilarCases(asset, allAssets, 4), [asset, allAssets]);

  // 允许人工覆盖系数
  const [salvage, setSalvage] = useState<number>(0);
  const [transport, setTransport] = useState<number>(0);

  // 用相似度均值得出默认系数（如果未手动调整）
  const defaults = useMemo(() => {
    if (cases.length === 0) return { salvage: 0.6, transport: 1.0 };
    const sg = cases.reduce((s, c) => s + c.salvage_coef, 0) / cases.length;
    const tr = cases.reduce((s, c) => s + c.transport_coef, 0) / cases.length;
    return { salvage: sg, transport: tr };
  }, [cases]);

  const effSalvage = salvage > 0 ? salvage : defaults.salvage;
  const effTransport = transport > 0 ? transport : defaults.transport;

  const adjustedCases = cases.map((c) => ({
    ...c,
    salvage_coef: effSalvage,
    transport_coef: effTransport,
  }));

  const ref = useMemo(() => refRangeFromSimilarCases(asset, adjustedCases), [asset, adjustedCases]);

  return (
    <Card
      title={
        <Space>
          <span>非标破冰</span>
          {verdict.isNonStandard ? (
            <Tag color="red" bordered={false}>极端非标 {verdict.score.toFixed(2)}</Tag>
          ) : (
            <Tag color="orange" bordered={false}>非标预警 {verdict.score.toFixed(2)}</Tag>
          )}
        </Space>
      }
     
      className="!shadow-card"
    >
      {verdict.isNonStandard ? (
        <Alert
          className="!mb-2"
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
         
          message="AI 放弃精确输出，已切换到'相似案例 + 残值/运输系数'模式"
          description={
            <div>
              触发因素：
              <div className="mt-1 flex flex-wrap gap-1">
                {verdict.triggers.map((t) => (
                  <Tag key={t} bordered={false} color="red">{t}</Tag>
                ))}
              </div>
            </div>
          }
        />
      ) : (
        <Alert
          className="!mb-2"
          type="warning"
          showIcon
         
          message={`检测到 ${verdict.triggers.length} 项非标特征，提示人工复核`}
        />
      )}

      {/* 参考区间 */}
      <Row gutter={12} className="bg-blue-50/40 rounded p-3 !mt-2">
        <Col span={8}>
          <Statistic
            title={<span className="text-xs">参考下限</span>}
            value={ref.low}
            prefix="¥"
            precision={2}
            valueStyle={{ fontSize: 16, color: '#ef4444' }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title={<span className="text-xs">参考中值</span>}
            value={ref.base}
            prefix="¥"
            precision={2}
            valueStyle={{ fontSize: 18, color: '#1f6feb', fontWeight: 'bold' }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title={<span className="text-xs">参考上限</span>}
            value={ref.high}
            prefix="¥"
            precision={2}
            valueStyle={{ fontSize: 16, color: '#22c55e' }}
          />
        </Col>
      </Row>

      {/* 残值 / 运输系数人工调整 */}
      <div className="mt-3">
        <Row gutter={12}>
          <Col span={12}>
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              残值系数 <Tooltip title="残值系数越低表示资产越陈旧，参考价越低"><span>ⓘ</span></Tooltip>
            </div>
            <Slider
              min={0.4}
              max={1}
              step={0.05}
              value={effSalvage}
              onChange={(v) => setSalvage(v)}
            />
            <div className="text-xs text-center text-gray-500">{effSalvage.toFixed(2)}</div>
          </Col>
          <Col span={12}>
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              运输成本系数 <Tooltip title="远郊资产需考虑改造成本/运输"><span>ⓘ</span></Tooltip>
            </div>
            <Slider
              min={1}
              max={1.5}
              step={0.05}
              value={effTransport}
              onChange={(v) => setTransport(v)}
            />
            <div className="text-xs text-center text-gray-500">{effTransport.toFixed(2)}</div>
          </Col>
        </Row>
      </div>

      {/* 相似案例 */}
      <div className="mt-3">
        <div className="text-xs text-gray-500 mb-1.5">
          最相似的 {cases.length} 条资产（点击查看）
        </div>
        <div className="space-y-2">
          {cases.length === 0 ? (
            <div className="text-xs text-gray-400">未找到相似资产</div>
          ) : (
            cases.map((c) => (
              <div
                key={c.asset.id}
                className="bg-white border rounded p-2.5 hover:border-brand transition-colors flex items-center gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="font-medium truncate text-sm cursor-pointer hover:text-brand"
                      onClick={() => navigate(`/asset/${c.asset.id}`)}
                    >
                      {c.asset.name}
                    </span>
                    <Tag color="default" bordered={false}>{c.asset.region}</Tag>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    相似度 {(c.similarity * 100).toFixed(0)}% · {c.reasons.join('、')} · ¥{c.asset.estimated_price}/㎡·天
                  </div>
                </div>
                <Button
                 
                  type="link"
                  onClick={() => navigate(`/asset/${c.asset.id}`)}
                >
                  查看 ›
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
