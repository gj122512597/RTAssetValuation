import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Tag,
  Button,
  Space,
  Result,
  Statistic,
  Row,
  Col,
  Alert,
  Progress,
  message,
  Tabs,
  Empty,
  Input,
  Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  CameraOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useAssetStore } from '@/stores/assetStore';
import { getTemplateForType } from '@/mocks/due_diligence_templates';
import { generateAiFeatures } from '@/utils/aiFeaturesMock';
import type {
  Asset,
  CheckResult,
  DueDiligenceCheck,
  IntakeAsset,
  IntakeStatus,
} from '@/types';
import { RingProgress } from '@/components/common/RingProgress';

const STATUS_LABELS: Record<IntakeStatus, { label: string; color: string }> = {
  todo: { label: '待办', color: 'blue' },
  in_progress: { label: '进行中', color: 'orange' },
  completed: { label: '已完成', color: 'green' },
  rejected: { label: '已拒收', color: 'red' },
};

const RESULT_OPTIONS: { value: CheckResult; label: string; color: string }[] = [
  { value: 'pass', label: '通过', color: '#22c55e' },
  { value: 'warn', label: '警告', color: '#f59e0b' },
  { value: 'fail', label: '不通过', color: '#ef4444' },
  { value: 'na', label: '不适用', color: '#94a3b8' },
  { value: 'pending', label: '待检', color: '#cbd5e1' },
];

const STATUS_ORDER: CheckResult[] = ['fail', 'warn', 'pending', 'na', 'pass'];

/**
 * 尽调流程页 v2（review 后重构）
 *  主要改动：
 *   1. 顶部右侧大圆环（整体进度 + 总分）—— 一眼看到完成度
 *   2. 4 个状态分 tab：失败 → 警告 → 待检 → 不适用 → 通过
 *      （按优先级排序，focus 在"未做"和"有问题"的项）
 *   3. 必检未填项明确标红感叹号
 *   4. 拍照按钮带计数（"📷 已拍 2 张"）
 *   5. 关键操作（拒收 / 完成）按状态联动：必检全过才允许完成；有 fail 提示拒收
 */
export default function DueDiligenceIntakePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const intakeAssets = useAssetStore((s) => s.intakeAssets);
  const dueDiligence = useAssetStore((s) => s.dueDiligence);
  const setIntakeStatus = useAssetStore((s) => s.setIntakeStatus);
  const setCheckResult = useAssetStore((s) => s.setCheckResult);
  const [statusTab, setStatusTab] = useState<CheckResult>('fail');

  const intake = useMemo(
    () => intakeAssets.find((i) => i.id === id),
    [intakeAssets, id]
  );

  // 首次进入 → 自动 in_progress + 初始化 dueDiligence
  useEffect(() => {
    if (!intake || !id) return;
    if (intake.status === 'todo') {
      setIntakeStatus(id, 'in_progress');
    }
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

  const checks = useMemo(() => dueDiligence[id ?? ''] ?? [], [dueDiligence, id]);
  const tpl = intake ? getTemplateForType(intake.type) : null;

  // 进度统计
  const stats = useMemo(() => {
    const total = checks.length;
    const required = checks.filter((c) => c.required).length;
    const completed = checks.filter((c) => c.result !== 'pending').length;
    const completedRequired = checks.filter(
      (c) => c.result !== 'pending' && c.required
    ).length;
    const requiredDone = completedRequired === required;
    const fails = checks.filter((c) => c.result === 'fail').length;
    const warns = checks.filter((c) => c.result === 'warn').length;
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
    return {
      total,
      required,
      completed,
      completedRequired,
      requiredDone,
      fails,
      warns,
      score,
      completionPct: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [checks]);

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

  const st = STATUS_LABELS[intake.status];

  const handleComplete = () => {
    if (!stats.requiredDone) {
      message.error('必检项未全部完成，不能入库');
      return;
    }
    if (stats.fails > 0) {
      message.error(`存在 ${stats.fails} 项不通过，建议拒收而非入库`);
      return;
    }
    setIntakeStatus(intake.id, 'completed');
    message.success('尽调完成，资产已入池');
    setTimeout(() => navigate('/due-diligence'), 800);
  };

  const handleReject = () => {
    setIntakeStatus(intake.id, 'rejected');
    message.info('已标记为拒收');
    setTimeout(() => navigate('/due-diligence'), 800);
  };

  const setResult = (checkId: string, result: CheckResult) => {
    setCheckResult(intake.id, checkId, { result });
  };
  const setNote = (checkId: string, note: string) => {
    setCheckResult(intake.id, checkId, { note });
  };
  const setScore = (checkId: string, score: number) => {
    setCheckResult(intake.id, checkId, { score });
  };
  const takePhoto = (checkId: string) => {
    setCheckResult(intake.id, checkId, {
      photos: [`photo-${checkId}-${Date.now()}.jpg`],
    });
  };

  // 按状态分组
  const grouped = useMemo(() => {
    const map: Record<CheckResult, DueDiligenceCheck[]> = {
      fail: [],
      warn: [],
      pending: [],
      na: [],
      pass: [],
    };
    for (const c of checks) map[c.result].push(c);
    return map;
  }, [checks]);

  const tabCounts = {
    fail: grouped.fail.length,
    warn: grouped.warn.length,
    pending: grouped.pending.length,
    na: grouped.na.length,
    pass: grouped.pass.length,
  };

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-ink-100 px-6 py-3 flex items-center gap-3">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/due-diligence')}>
          返回工作台
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <FileTextOutlined style={{ color: '#1f6feb' }} />
            <span className="text-base font-semibold truncate">{intake.name}</span>
            <Tag color={st.color} bordered={false}>{st.label}</Tag>
            {intake.priority === 'high' && (
              <Tag color="red" bordered={false}>高优先级</Tag>
            )}
          </div>
          <div className="text-[11px] text-ink-500 mt-0.5 truncate">
            {intake.id} · {intake.region}
            {intake.address && ` · ${intake.address}`}
          </div>
        </div>
        <Space>
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
            <Tag color="red" bordered={false}>已拒收</Tag>
          )}
        </Space>
      </div>

      {/* 顶部进度区：左 4 个小 KPI + 右侧大圆环 */}
      <div className="px-6 py-4 bg-white border-b border-ink-100">
        <div className="flex items-center gap-6">
          {/* 左侧 4 KPI */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card size="small" className="!shadow-none !border-ink-100">
              <Statistic
                title={<span className="text-xs">完成度</span>}
                value={stats.completionPct}
                suffix="%"
                valueStyle={{
                  fontSize: 20,
                  color: stats.completionPct === 100 ? '#22c55e' : '#1f6feb',
                }}
              />
              <Progress
                percent={stats.completionPct}
                size="small"
                showInfo={false}
                strokeColor={stats.completionPct === 100 ? '#22c55e' : '#1f6feb'}
              />
            </Card>
            <Card size="small" className="!shadow-none !border-ink-100">
              <Statistic
                title={<span className="text-xs">必检</span>}
                value={`${stats.completedRequired} / ${stats.required}`}
                valueStyle={{
                  fontSize: 18,
                  color: stats.requiredDone ? '#22c55e' : '#f59e0b',
                }}
              />
            </Card>
            <Card size="small" className="!shadow-none !border-ink-100">
              <Statistic
                title={<span className="text-xs">警告 / 不通过</span>}
                value={`${stats.warns} / ${stats.fails}`}
                valueStyle={{
                  fontSize: 18,
                  color: stats.fails > 0 ? '#ef4444' : stats.warns > 0 ? '#f59e0b' : '#22c55e',
                }}
              />
            </Card>
            <Card size="small" className="!shadow-none !border-ink-100">
              <Statistic
                title={<span className="text-xs">总分</span>}
                value={stats.score}
                suffix="/100"
                valueStyle={{
                  fontSize: 20,
                  color: stats.score >= 80 ? '#22c55e' : stats.score >= 60 ? '#1f6feb' : '#ef4444',
                }}
              />
            </Card>
          </div>

          {/* 右侧大圆环 */}
          <RingProgress
            percent={stats.completionPct}
            color={stats.requiredDone ? '#22c55e' : stats.fails > 0 ? '#ef4444' : '#1f6feb'}
            label={stats.requiredDone ? '可入池' : '尽调中'}
          />
        </div>

        {stats.fails > 0 && (
          <Alert
            className="!mt-3 !text-xs"
            type="error"
            showIcon
            message={`存在 ${stats.fails} 项不通过 · 建议拒收而非入库`}
          />
        )}
      </div>

      {/* 操作区 */}
      <div className="px-6 py-2 bg-white border-b border-ink-100 flex items-center gap-2 justify-end">
        <Button danger icon={<CloseCircleOutlined />} onClick={handleReject}>
          拒收
        </Button>
        <Tooltip
          title={
            !stats.requiredDone
              ? '必检项未全部完成'
              : stats.fails > 0
              ? '存在不通过项，建议先拒收'
              : '可入池'
          }
        >
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleComplete}
            disabled={!stats.requiredDone || stats.fails > 0}
          >
            完成并入池
          </Button>
        </Tooltip>
      </div>

      {/* 50 项检查清单：按状态分组 */}
      <div className="flex-1 p-6 overflow-y-auto">
        <Card className="!shadow-card">
          <Tabs
            activeKey={statusTab}
            onChange={(k) => setStatusTab(k as CheckResult)}
            items={STATUS_ORDER.map((s) => ({
              key: s,
              label: (
                <span className="flex items-center gap-1">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: RESULT_OPTIONS.find((r) => r.value === s)?.color }}
                  />
                  {RESULT_OPTIONS.find((r) => r.value === s)?.label}
                  <span className="text-ink-500">({tabCounts[s]})</span>
                </span>
              ),
              children:
                grouped[s].length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={`无${RESULT_OPTIONS.find((r) => r.value === s)?.label}项`}
                  />
                ) : (
                  <div className="space-y-1.5">
                    {grouped[s].map((c) => (
                      <CheckRow
                        key={c.id}
                        check={c}
                        onSetResult={(r) => setResult(c.id, r)}
                        onSetNote={(n) => setNote(c.id, n)}
                        onSetScore={(s) => setScore(c.id, s)}
                        onTakePhoto={() => takePhoto(c.id)}
                      />
                    ))}
                  </div>
                ),
            }))}
          />
        </Card>
      </div>
    </div>
  );
}

/** 单条检查行：拍照带计数、必检未填标红、状态切换后立即反馈 */
function CheckRow({
  check,
  onSetResult,
  onSetNote,
  onSetScore,
  onTakePhoto,
}: {
  check: DueDiligenceCheck;
  onSetResult: (r: CheckResult) => void;
  onSetNote: (n: string) => void;
  onSetScore: (s: number) => void;
  onTakePhoto: () => void;
}) {
  const resultMeta = RESULT_OPTIONS.find((r) => r.value === check.result) ?? RESULT_OPTIONS[4];
  const isPending = check.result === 'pending';
  const photosCount = check.photos?.length ?? 0;

  return (
    <div
      className={
        'flex items-start gap-3 px-3 py-2.5 rounded-md border transition-colors ' +
        (isPending && check.required
          ? 'border-red-200 bg-red-50/30'
          : 'border-ink-100 hover:bg-blue-50/30')
      }
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {check.required && (
            <Tag color="red" bordered={false} className="!m-0" style={{ fontSize: 10 }}>
              {isPending ? '⚠ 必填' : '必检'}
            </Tag>
          )}
          <span className="text-sm text-ink-900">{check.label}</span>
          <Tag color="ink-500" bordered={false} className="!m-0 text-[10px]">
            {check.category}
          </Tag>
          {photosCount > 0 && (
            <Tag color="cyan" bordered={false} className="!m-0" style={{ fontSize: 10 }}>
              📷 {photosCount} 张
            </Tag>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1">
            {RESULT_OPTIONS.filter((r) => r.value !== 'pending').map((r) => {
              const active = check.result === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => onSetResult(r.value)}
                  className="text-xs px-2.5 py-0.5 rounded-full border transition-colors"
                  style={{
                    color: active ? '#fff' : r.color,
                    background: active ? r.color : 'transparent',
                    borderColor: r.color,
                  }}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
          {check.category.includes('物理') && (
            <Tooltip title="物理评分 1-10 分（自动进入 AI 评分）">
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
            onClick={onTakePhoto}
            type={photosCount > 0 ? 'primary' : 'default'}
          >
            {photosCount > 0 ? `已拍 ${photosCount} 张` : '拍照'}
          </Button>
        </div>
        <Input
          className="!mt-1.5"
          size="small"
          placeholder="备注（可选）"
          value={check.note ?? ''}
          onChange={(e) => onSetNote(e.target.value)}
          maxLength={200}
        />
      </div>
    </div>
  );
}
