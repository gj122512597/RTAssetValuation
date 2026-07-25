import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Tag,
  Button,
  Space,
  Result,
  Empty,
  Statistic,
  Row,
  Col,
  Alert,
  Progress,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useAssetStore } from '@/stores/assetStore';
import DueDiligenceCard from '@/components/due_diligence/DueDiligenceCard';
import { getTemplateForType, DUE_DILIGENCE_TEMPLATES } from '@/mocks/due_diligence_templates';
import { generateAiFeatures } from '@/utils/aiFeaturesMock';
import type { Asset, CheckResult, DueDiligenceCheck, IntakeAsset, IntakeStatus } from '@/types';

const STATUS_LABELS: Record<IntakeStatus, { label: string; color: string }> = {
  todo: { label: '待办', color: 'blue' },
  in_progress: { label: '进行中', color: 'orange' },
  completed: { label: '已完成', color: 'green' },
  rejected: { label: '已拒收', color: 'red' },
};

/**
 * 尽调流程页（/due-diligence/:id）
 *  - 复用 DueDiligenceCard 全屏展开
 *  - 完成 → 入资产池（生成 Asset + 自动 ai_features）
 *  - 拒收 → 状态改 rejected
 */
export default function DueDiligenceIntakePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const intakeAssets = useAssetStore((s) => s.intakeAssets);
  const dueDiligence = useAssetStore((s) => s.dueDiligence);
  const setIntakeStatus = useAssetStore((s) => s.setIntakeStatus);

  const intake = useMemo(
    () => intakeAssets.find((i) => i.id === id),
    [intakeAssets, id]
  );

  // 首次进入 → 自动设 in_progress + 初始化 dueDiligence
  useEffect(() => {
    if (!intake || !id) return;
    if (intake.status === 'todo') {
      setIntakeStatus(id, 'in_progress');
    }
    // 初始化 dueDiligence（如果还没有）
    if (!dueDiligence[id]) {
      const tpl = getTemplateForType(intake.type);
      const initial: DueDiligenceCheck[] = tpl.categories.flatMap((cat) =>
        cat.items.map((item) => ({
          id: item.id,
          category: cat.name,
          label: item.label,
          required: item.required,
          result: 'pending' as CheckResult,
          photos: [],
        }))
      );
      useAssetStore.getState().initDueDiligence(id, initial);
    }
  }, [intake, id, dueDiligence, setIntakeStatus]);

  if (!intake) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Result
          status="404"
          title="找不到该尽调任务"
          subTitle={`ID: ${id}`}
          extra={
            <Button type="primary" onClick={() => navigate('/due-diligence')}>
              返回工作台
            </Button>
          }
        />
      </div>
    );
  }

  const tpl = getTemplateForType(intake.type);
  const checks = dueDiligence[intake.id] ?? [];
  const st = STATUS_LABELS[intake.status];
  const requiredTotal = tpl.categories.reduce(
    (s, c) => s + c.items.filter((i) => i.required).length,
    0
  );
  const completed = checks.filter((c) => c.result !== 'pending').length;
  const completedRequired = checks.filter(
    (c) => c.result !== 'pending' && c.required
  ).length;
  const requiredDone = completedRequired === requiredTotal;
  const score = (() => {
    let s = 0;
    let w = 0;
    for (const c of checks) {
      const v = c.result === 'pass' ? 1 : c.result === 'warn' ? 0.6 : c.result === 'fail' ? 0 : 0.5;
      s += v * (c.required ? 0.7 : 0.3);
      w += c.required ? 0.7 : 0.3;
    }
    return w > 0 ? Math.round((s / w) * 100) : 0;
  })();
  const fails = checks.filter((c) => c.result === 'fail').length;
  const completionPct = checks.length > 0 ? Math.round((completed / checks.length) * 100) : 0;

  const handleComplete = () => {
    if (!requiredDone) {
      message.error('必检项未全部完成，不能入库');
      return;
    }
    if (fails > 0) {
      message.error(`存在 ${fails} 项不通过，建议拒收而非入库`);
      return;
    }
    // 入资产池（mock 生成 Asset + 提交至 assets）
    setIntakeStatus(intake.id, 'completed');
    message.success('尽调完成，资产已入池');
    setTimeout(() => navigate('/due-diligence'), 800);
  };

  const handleReject = () => {
    setIntakeStatus(intake.id, 'rejected');
    message.info('已标记为拒收');
    setTimeout(() => navigate('/due-diligence'), 800);
  };

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-ink-100 px-6 py-3 flex items-center gap-3">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/due-diligence')}
        >
          返回工作台
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <FileTextOutlined style={{ color: '#1f6feb' }} />
            <span className="text-base font-semibold">{intake.name}</span>
            <Tag color={st.color} bordered={false}>
              {st.label}
            </Tag>
            {intake.priority === 'high' && (
              <Tag color="red" bordered={false}>
                高优先级
              </Tag>
            )}
          </div>
          <div className="text-[11px] text-ink-500 mt-0.5">
            {intake.id} · {intake.region}
            {intake.address && ` · ${intake.address}`}
          </div>
        </div>
        <Space className="ml-auto">
          {intake.status === 'completed' && intake.result_asset_id && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => navigate(`/asset/${intake.result_asset_id}`)}
            >
              查看已入库资产
            </Button>
          )}
          {intake.status === 'rejected' && (
            <Tag color="red" bordered={false}>
              已拒收
            </Tag>
          )}
        </Space>
      </div>

      {/* 顶部 KPI */}
      <div className="px-6 py-3 bg-white border-b border-ink-100">
        <Row gutter={[12, 12]}>
          <Col span={6}>
            <Statistic
              title={<span className="text-xs">完成度</span>}
              value={completionPct}
              suffix="%"
              valueStyle={{ fontSize: 18, color: completionPct === 100 ? '#22c55e' : '#1f6feb' }}
            />
            <Progress percent={completionPct} size="small" showInfo={false} />
          </Col>
          <Col span={6}>
            <Statistic
              title={<span className="text-xs">尽调总分</span>}
              value={score}
              suffix="/100"
              valueStyle={{
                fontSize: 18,
                color: score >= 80 ? '#22c55e' : score >= 60 ? '#1f6feb' : '#ef4444',
              }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={<span className="text-xs">必检完成度</span>}
              value={`${completedRequired} / ${requiredTotal}`}
              valueStyle={{ fontSize: 16, color: requiredDone ? '#22c55e' : '#f59e0b' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={<span className="text-xs">不通过数</span>}
              value={fails}
              suffix="项"
              valueStyle={{ fontSize: 18, color: fails > 0 ? '#ef4444' : '#22c55e' }}
            />
          </Col>
        </Row>
        {fails > 0 && (
          <Alert
            className="!mt-2"
            type="error"
            showIcon
            message={`存在 ${fails} 项不通过 · 建议拒收而非入库`}
          />
        )}
      </div>

      {/* 操作区 */}
      <div className="px-6 py-2 bg-white border-b border-ink-100 flex items-center gap-2 justify-end">
        <Button danger icon={<CloseCircleOutlined />} onClick={handleReject}>
          拒收
        </Button>
        <Button
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={handleComplete}
          disabled={!requiredDone || fails > 0}
        >
          完成并入池
        </Button>
      </div>

      {/* 尽调卡片全屏 */}
      <div className="flex-1 p-6 overflow-y-auto">
        <DueDiligenceCardWithIntake intake={intake} />
      </div>
    </div>
  );
}

/** 把 intake 包装为 Asset 让 DueDiligenceCard 可复用（取其 type/ai_features/历史） */
function DueDiligenceCardWithIntake({ intake }: { intake: IntakeAsset }) {
  // 伪 Asset：让 DueDiligenceCard 复用
  const fakeAsset: Asset = useMemo(
    () => ({
      id: intake.id,
      name: intake.name,
      type: intake.type as never,
      region: intake.region,
      area: intake.area ?? 0,
      status: 'vacant',
      days_vacant: 0,
      estimated_price: intake.initial_price ?? 0,
      confidence: 0.5,
      received_batch: 'batch-4',
      certificate_status: 'pending',
      hidden_risks: [],
      features: { subway_distance: 9999, condition_score: 5 },
      lnglat: [116.4, 39.95], // mock 不重要
      ai_features: generateAiFeatures({
        id: intake.id,
        name: intake.name,
        type: intake.type as never,
        region: intake.region,
        area: intake.area ?? 0,
        status: 'vacant',
        days_vacant: 0,
        estimated_price: intake.initial_price ?? 0,
        confidence: 0.5,
        received_batch: 'batch-4',
        certificate_status: 'pending',
        hidden_risks: [],
        features: { subway_distance: 9999, condition_score: 5 },
        lnglat: [116.4, 39.95],
      }),
    }),
    [intake]
  );

  if (!DUE_DILIGENCE_TEMPLATES[getTemplateForType(intake.type).id]) {
    return <Empty description="模板未找到" />;
  }

  return <DueDiligenceCard asset={fakeAsset} />;
}