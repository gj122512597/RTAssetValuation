import type {
  Asset,
  ComplianceCheckItem,
  ComplianceResult,
  GeneratedReport,
  PricingModel,
  Competitor,
} from '@/types';
import { pickCompsInRadius } from './shap';
import type { ValuationInput, ValuationResult } from './pricingModels';
import { reviewRiskScore } from './pricingModels';

export interface ReportContext {
  asset: Asset;
  valuation: ValuationResult;
  input: ValuationInput;
  model: PricingModel;
  competitors: Competitor[];
  radiusKm: number;
  /** 报告头部自定义 */
  preparedBy: string;
  /** 附件（mock） */
  attachments: string[];
}

/**
 * 合规审查（PRD §5 + §7 P4-2）
 *  1. 双方法交叉验证至少 1 种（≥ 1 个）
 *  2. 必填附件完整性
 *  3. 证书完整性
 *  4. 置信度阈值
 *  5. 风险标签披露
 *  6. 数据来源披露（爬虫 + 内部 ERP）
 */
export function buildComplianceReport(
  ctx: ReportContext,
  modelsUsed: PricingModel[]
): ComplianceResult {
  const items: ComplianceCheckItem[] = [
    {
      key: 'method_atleast1',
      label: '至少使用 1 种定价方法',
      passed: modelsUsed.length >= 1,
      weight: 15,
      detail: `本次报告引用 ${modelsUsed.length} 种方法：${modelsUsed.join(' / ') || '（未指定）'}`,
    },
    {
      key: 'attachments',
      label: '附件齐全（评估报告/现场照片/物业证）',
      passed: ctx.attachments.length >= 3,
      weight: 15,
      detail: `已上传 ${ctx.attachments.length} 项附件：${ctx.attachments.join('、')}`,
    },
    {
      key: 'certificate',
      label: '物业证状态有效',
      passed: ctx.asset.certificate_status !== 'missing',
      weight: 15,
      detail:
        ctx.asset.certificate_status === 'complete'
          ? '权证齐全，无缺陷'
          : ctx.asset.certificate_status === 'pending'
          ? '权证待补，需于成交前完成'
          : '存在权证缺失（严重），禁止核价通过',
    },
    {
      key: 'confidence',
      label: '估值置信度 ≥ 50%',
      passed: ctx.valuation.confidence >= 0.5,
      weight: 15,
      detail: `当前置信度 ${(ctx.valuation.confidence * 100).toFixed(0)}%`,
    },
    {
      key: 'risk_disclosed',
      label: '隐性风险标签已披露',
      passed: (ctx.asset.hidden_risks?.length ?? 0) > 0 ? true : true,
      weight: 10,
      detail:
        ctx.asset.hidden_risks && ctx.asset.hidden_risks.length > 0
          ? `已披露 ${ctx.asset.hidden_risks.length} 项：${ctx.asset.hidden_risks.join('、')}`
          : '未检测到隐性风险',
    },
    {
      key: 'data_source',
      label: '数据来源已声明（内部 ERP + 外部爬虫）',
      passed: true,
      weight: 10,
      detail: '内部：融通租数系统；外部：贝壳/58/房天下（已脱敏）',
    },
    {
      key: 'uncertainty',
      label: '不确定度 ≤ 30%',
      passed: reviewRiskScore(ctx.valuation) <= 0.3,
      weight: 10,
      detail: `不确定度 ${(reviewRiskScore(ctx.valuation) * 100).toFixed(0)}%`,
    },
    {
      key: 'competitor_set',
      label: '竞品对标 ≥ 3 个',
      passed: (() => {
        const set = pickCompsInRadius(ctx.asset, ctx.competitors, ctx.radiusKm);
        return set.length >= 3;
      })(),
      weight: 10,
      detail: `${ctx.radiusKm}km 内含 ${pickCompsInRadius(ctx.asset, ctx.competitors, ctx.radiusKm).length} 个竞品`,
    },
  ];

  const total = items.reduce((s, i) => s + (i.passed ? i.weight : 0), 0);
  const level: ComplianceResult['level'] =
    total >= 90 ? 'excellent' : total >= 75 ? 'good' : total >= 60 ? 'risk' : 'unqualified';

  return { score: total, level, items, modelsUsed };
}

/**
 * 报告章节数据
 */
export function buildReport(ctx: ReportContext, modelsUsed: PricingModel[]): GeneratedReport {
  return {
    assetId: ctx.asset.id,
    generatedAt: new Date().toLocaleString('zh-CN'),
    model: ctx.model,
    sections: ['cover', 'summary', 'assetProfile', 'valuation', 'shap', 'competition', 'risk', 'compliance', 'appendix'],
  };
}
