import { useMemo, useState } from 'react';
import {
  Card,
  Tag,
  Progress,
  Statistic,
  Row,
  Col,
  Radio,
  Input,
  Button,
  Empty,
  Tooltip,
  Tag as AntTag,
  Alert,
  Space,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  CameraOutlined,
  ReloadOutlined,
  FileTextOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import type { Asset, CheckResult, DueDiligenceCheck, DueDiligenceTemplate } from '@/types';
import { useAssetStore } from '@/stores/assetStore';
import { getTemplateForType, DUE_DILIGENCE_TEMPLATES } from '@/mocks/due_diligence_templates';

interface Props {
  asset: Asset;
}

const RESULT_OPTIONS: { value: CheckResult; label: string; color: string; icon: React.ReactNode }[] = [
  { value: 'pass', label: '通过', color: '#22c55e', icon: <CheckCircleOutlined /> },
  { value: 'warn', label: '警告', color: '#f59e0b', icon: <ExclamationCircleOutlined /> },
  { value: 'fail', label: '不通过', color: '#ef4444', icon: <CloseCircleOutlined /> },
  { value: 'na', label: '不适用', color: '#94a3b8', icon: <MinusCircleOutlined /> },
  { value: 'pending', label: '待检', color: '#cbd5e1', icon: <FileTextOutlined /> },
];

/**
 * 标准化尽调卡（TOP 3 业务升级）
 *  - 6 类资产 × 不同模板（写字楼 50 / 商铺 30 / ...）
 *  - 客户经理现场勾选（pass/warn/fail/na）
 *  - 总分实时计算（必检项 70% / 选检项 30% 加权）
 *  - 完成度 → 完成度 Ring → 风险高亮
 */
export default function DueDiligenceCard({ asset }: Props) {
  const template = useMemo(() => getTemplateForType(asset.type), [asset.type]);
  const dueDiligence = useAssetStore((s) => s.dueDiligence);
  const setCheckResult = useAssetStore((s) => s.setCheckResult);
  const resetDueDiligence = useAssetStore((s) => s.resetDueDiligence);
  const [showAll, setShowAll] = useState(false);

  const checks = dueDiligence[asset.id] ?? [];

  const isEmpty = checks.length === 0;

  // 进度统计
  const stats = useMemo(() => {
    const totalItems = template.categories.reduce(
      (s, c) => s + c.items.length,
      0
    );
    const requiredItems = template.categories.reduce(
      (s, c) => s + c.items.filter((i) => i.required).length,
      0
    );
    const completed = checks.filter((c) => c.result !== 'pending').length;
    const completedRequired = checks.filter(
      (c) =>
        c.result !== 'pending' &&
        template.categories
          .flatMap((cat) => cat.items)
          .find((i) => i.id === c.id)?.required
    ).length;

    // 风险等级
    const fails = checks.filter((c) => c.result === 'fail').length;
    const warns = checks.filter((c) => c.result === 'warn').length;
    const risk: 'low' | 'mid' | 'high' =
      fails > 0 ? 'high' : warns > 2 ? 'mid' : 'low';

    // 总分（必检项 70% + 选检 30%）
    let weightedScore = 0;
    for (const c of checks) {
      const item = template.categories
        .flatMap((cat) => cat.items)
        .find((i) => i.id === c.id);
      if (!item) continue;
      const w = item.required ? 0.7 : 0.3;
      const s = c.result === 'pass' ? 1 : c.result === 'warn' ? 0.6 : c.result === 'fail' ? 0 : 0.5;
      weightedScore += s * w;
    }
    const maxScore = requiredItems * 0.7 + (totalItems - requiredItems) * 0.3;
    const totalScorePct = maxScore > 0 ? Math.round((weightedScore / maxScore) * 100) : 0;

    return {
      total: totalItems,
      required: requiredItems,
      completed,
      completedRequired,
      completionPct: totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0,
      requiredDone: completedRequired === requiredItems,
      risk,
      fails,
      warns,
      totalScorePct,
    };
  }, [checks, template]);

  // 初始化 / 重置
  const start = () => {
    const initialChecks: DueDiligenceCheck[] = template.categories.flatMap((cat) =>
      cat.items.map((item) => ({
        id: item.id,
        category: cat.name,
        label: item.label,
        required: item.required,
        result: 'pending' as CheckResult,
        note: undefined,
        score: undefined,
        photos: [],
      }))
    );
    useAssetStore.getState().initDueDiligence(asset.id, initialChecks);
    message.success(`已为「${template.id}」模板初始化 ${initialChecks.length} 项检查`);
  };

  const reset = () => {
    resetDueDiligence(asset.id);
    message.info('已重置尽调进度');
  };

  const setResult = (checkId: string, result: CheckResult) => {
    setCheckResult(asset.id, checkId, { result });
  };

  const setNote = (checkId: string, note: string) => {
    setCheckResult(asset.id, checkId, { note });
  };

  const setScore = (checkId: string, score: number) => {
    setCheckResult(asset.id, checkId, { score });
  };

  const setPhotos = (checkId: string) => {
    // 模拟拍照
    setCheckResult(asset.id, checkId, {
      photos: [`photo-${asset.id}-${checkId}-${Date.now()}.jpg`],
    });
    message.success('已模拟上传 1 张现场照片');
  };

  if (isEmpty) {
    return (
      <Card
        title={
          <div className="flex items-center gap-2">
            <FileTextOutlined />
            <span>标准化尽调</span>
            <Tag color="orange" bordered={false}>
              TOP 3 业务升级
            </Tag>
          </div>
        }
        size="small"
        className="!shadow-card"
      >
        <Empty
          imageStyle={{ height: 80 }}
          description={
            <div className="space-y-1">
              <div className="text-ink-700 font-medium">本资产尚未启动尽调</div>
              <div className="text-xs text-ink-500">
                「{template.id}」模板共 {stats.total} 项检查
                （必检 {stats.required} 项）
              </div>
            </div>
          }
        >
          <Button type="primary" onClick={start} icon={<CheckOutlined />}>
            启动尽调
          </Button>
        </Empty>
      </Card>
    );
  }

  const riskColor =
    stats.risk === 'high' ? '#ef4444' : stats.risk === 'mid' ? '#f59e0b' : '#22c55e';
  const riskLabel = stats.risk === 'high' ? '高' : stats.risk === 'mid' ? '中' : '低';

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <FileTextOutlined />
          <span>标准化尽调</span>
          <Tag color="orange" bordered={false}>
            TOP 3 业务升级
          </Tag>
          <Tag color={riskColor} bordered={false}>
            风险等级 {riskLabel}
          </Tag>
          {stats.requiredDone ? (
            <Tag color="green" bordered={false} icon={<CheckCircleOutlined />}>
              必检项全过
            </Tag>
          ) : (
            <Tag color="orange" bordered={false}>
              必检 {stats.completedRequired}/{stats.required}
            </Tag>
          )}
        </div>
      }
      size="small"
      className="!shadow-card"
      extra={
        <Space>
          <Button
            size="small"
            type="text"
            icon={<ReloadOutlined />}
            onClick={reset}
          >
            重置
          </Button>
        </Space>
      }
    >
      {/* 顶部统计 */}
      <Row gutter={[12, 12]} className="!mb-3">
        <Col span={6}>
          <Statistic
            title={<span className="text-xs">完成度</span>}
            value={stats.completionPct}
            suffix="%"
            valueStyle={{
              fontSize: 18,
              color: stats.completionPct === 100 ? '#22c55e' : stats.completionPct >= 60 ? '#1f6feb' : '#f59e0b',
            }}
          />
          <Progress
            percent={stats.completionPct}
            size="small"
            strokeColor={
              stats.completionPct === 100
                ? '#22c55e'
                : stats.completionPct >= 60
                ? '#1f6feb'
                : '#f59e0b'
            }
            showInfo={false}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title={<span className="text-xs">尽调总分</span>}
            value={stats.totalScorePct}
            suffix="%"
            valueStyle={{
              fontSize: 18,
              color: stats.totalScorePct >= 80 ? '#22c55e' : stats.totalScorePct >= 60 ? '#1f6feb' : '#f59e0b',
            }}
          />
          <Progress
            percent={stats.totalScorePct}
            size="small"
            strokeColor={
              stats.totalScorePct >= 80 ? '#22c55e' : stats.totalScorePct >= 60 ? '#1f6feb' : '#f59e0b'
            }
            showInfo={false}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title={<span className="text-xs">已检 / 总项</span>}
            value={`${stats.completed} / ${stats.total}`}
            valueStyle={{ fontSize: 16 }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title={<span className="text-xs">警告 / 不通过</span>}
            value={`${stats.warns} / ${stats.fails}`}
            valueStyle={{
              fontSize: 16,
              color: stats.fails > 0 ? '#ef4444' : stats.warns > 0 ? '#f59e0b' : '#22c55e',
            }}
          />
        </Col>
      </Row>

      {stats.fails > 0 && (
        <Alert
          className="!mb-3 !text-xs"
          type="error"
          showIcon
          message={`存在 ${stats.fails} 项不通过 · 建议重大风险资产暂不出租`}
        />
      )}

      {/* 类别分块 */}
      <div className="space-y-3">
        {template.categories.map((cat) => {
          const catChecks = checks.filter((c) => c.category === cat.name);
          const catCompleted = catChecks.filter((c) => c.result !== 'pending').length;
          const catTotal = cat.items.length;
          return (
            <div key={cat.name} className="border border-ink-100 rounded-md">
              <div className="flex items-center justify-between bg-ink-50 px-3 py-1.5 rounded-t-md">
                <div>
                  <span className="text-sm font-semibold text-ink-900">{cat.name}</span>
                  <span className="text-xs text-ink-500 ml-2">{cat.description}</span>
                </div>
                <span className="text-[11px] text-ink-500">
                  {catCompleted} / {catTotal}
                </span>
              </div>
              <div className="divide-y divide-ink-100">
                {cat.items.map((item) => {
                  const check = checks.find((c) => c.id === item.id);
                  if (!check) return null;
                  if (!showAll && check.result === 'pass') {
                    return null; // 默认折叠已通过的项
                  }
                  return (
                    <CheckRow
                      key={item.id}
                      check={check}
                      onSetResult={(r) => setResult(item.id, r)}
                      onSetNote={(n) => setNote(item.id, n)}
                      onSetScore={(s) => setScore(item.id, s)}
                      onSetPhoto={() => setPhotos(item.id)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-center">
        <Button size="small" type="link" onClick={() => setShowAll(!showAll)}>
          {showAll ? '收起已通过项' : '展开全部项'}
        </Button>
      </div>
    </Card>
  );
}

/** 单条检查项 */
function CheckRow({
  check,
  onSetResult,
  onSetNote,
  onSetScore,
  onSetPhoto,
}: {
  check: DueDiligenceCheck;
  onSetResult: (r: CheckResult) => void;
  onSetNote: (n: string) => void;
  onSetScore: (s: number) => void;
  onSetPhoto: () => void;
}) {
  const resultMeta = RESULT_OPTIONS.find((r) => r.value === check.result) ?? RESULT_OPTIONS[4];

  return (
    <div className="px-3 py-2.5 hover:bg-blue-50/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm text-ink-900">
              {check.label}
            </span>
            {check.required && (
              <Tag color="red" bordered={false} className="!m-0" style={{fontSize:10}}>
                必检
              </Tag>
            )}
            {check.photos && check.photos.length > 0 && (
              <Tag color="cyan" bordered={false} className="!m-0" style={{fontSize:10}}>
                📷 {check.photos.length}
              </Tag>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Radio.Group
              value={check.result}
              onChange={(e) => onSetResult(e.target.value)}
              size="small"
              optionType="button"
              buttonStyle="solid"
            >
              {RESULT_OPTIONS.map((r) => (
                <Radio.Button
                  key={r.value}
                  value={r.value}
                  style={{
                    color: check.result === r.value ? '#fff' : r.color,
                    background: check.result === r.value ? r.color : 'transparent',
                    borderColor: r.color,
                  }}
                >
                  <span className="text-xs">{r.label}</span>
                </Radio.Button>
              ))}
            </Radio.Group>
            {/* 物理状态评分项额外可调分数 */}
            {(check.category.includes('物理状态') || check.category.includes('评分')) && (
              <Tooltip title="物理评分项 1-10 分（自动进入 AI 评分）">
                <Input
                  type="number"
                  size="small"
                  min={1}
                  max={10}
                  step={0.5}
                  placeholder="分"
                  value={check.score ?? ''}
                  onChange={(e) => onSetScore(Number(e.target.value) || 0)}
                  style={{ width: 80 }}
                />
              </Tooltip>
            )}
            <Button
              size="small"
              icon={<CameraOutlined />}
              onClick={onSetPhoto}
              type={check.photos && check.photos.length > 0 ? 'primary' : 'default'}
            >
              拍照
            </Button>
          </div>
          <Input
            className="!mt-2"
            size="small"
            placeholder="备注（可选）"
            value={check.note ?? ''}
            onChange={(e) => onSetNote(e.target.value)}
            maxLength={200}
          />
        </div>
      </div>
    </div>
  );
}
