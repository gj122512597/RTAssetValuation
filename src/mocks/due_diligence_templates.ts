/**
 * 标准化尽调模板（6 类资产 × 不同检查项）
 *
 * 设计原则：
 *  - 模拟 20 年行业经验，把"客户经理现场必看"的事项结构化
 *  - 每类资产有 5 个 category：基础 / 物理 / 周边 / 法律 / 政策
 *  - 必检项（required）必填，否则阻断报告生成
 *  - 总项数：写字楼 50 / 商铺 30 / 酒店 35 / 公寓 25 / 仓库 25 / 厂房 28
 */
import type { DueDiligenceTemplate } from '@/types';

/* ============ 写字楼 50 项 ============ */
const OFFICE_TEMPLATE: DueDiligenceTemplate = {
  id: 'dd-office',
  applies_to: ['office'],
  categories: [
    {
      name: '基础信息（必检）',
      description: '权属与合规证件',
      items: [
        { id: 'o-1', label: '不动产权证扫描件', required: true },
        { id: 'o-2', label: '国土证 / 用地许可证', required: true },
        { id: 'o-3', label: '消防验收合格证', required: true },
        { id: 'o-4', label: '竣工验收报告', required: true },
        { id: 'o-5', label: '建筑结构（框架/砖混/混合）', required: true },
        { id: 'o-6', label: '竣工年份', required: true },
        { id: 'o-7', label: '5A 智能化等级', required: false },
        { id: 'o-8', label: '电梯年检合格证', required: true },
        { id: 'o-9', label: '物业管理公司资质', required: false },
        { id: 'o-10', label: '能耗评级（绿建/LEED）', required: false },
      ],
    },
    {
      name: '物理状态（评分 1-10）',
      description: '现场打分',
      items: [
        { id: 'o-11', label: '外立面', required: true },
        { id: 'o-12', label: '大堂', required: true },
        { id: 'o-13', label: '电梯（运行噪声/平层精度）', required: true },
        { id: 'o-14', label: '强弱电（配电柜容量）', required: true },
        { id: 'o-15', label: '消防系统（烟感/喷淋）', required: true },
        { id: 'o-16', label: '空调系统（VAV/中央）', required: true },
        { id: 'o-17', label: '网络/光纤入户', required: true },
        { id: 'o-18', label: '公区精装修', required: false },
        { id: 'o-19', label: '卫生间（清洁度/水压）', required: true },
        { id: 'o-20', label: '地下停车场（车位配比）', required: true },
      ],
    },
    {
      name: '周边配套（拍照）',
      description: '现场记录',
      items: [
        { id: 'o-21', label: '最近地铁站（步行 ≤ 8 分钟？）', required: true },
        { id: 'o-22', label: '最近公交站', required: false },
        { id: 'o-23', label: '最近商务中心', required: false },
        { id: 'o-24', label: '餐饮配套（食堂/外卖可达）', required: true },
        { id: 'o-25', label: '银行 / ATM', required: false },
        { id: 'o-26', label: '1km 内写字楼数', required: true },
        { id: 'o-27', label: '周边竞品写字楼数量', required: true },
        { id: 'o-28', label: '通勤客群（地铁口流量）', required: false },
        { id: 'o-29', label: '商务会议配套（酒店/会展）', required: false },
        { id: 'o-30', label: '人才市场/培训机构', required: false },
      ],
    },
    {
      name: '法律合规',
      description: '必须严格',
      items: [
        { id: 'o-31', label: '无未决诉讼', required: true },
        { id: 'o-32', label: '无产权纠纷', required: true },
        { id: 'o-33', label: '无历史违约', required: true },
        { id: 'o-34', label: '无重大债务', required: true },
        { id: 'o-35', label: '土地证载用途为商用（40/50年）', required: true },
        { id: 'o-36', label: '抵押状态（无押/二押）', required: true },
        { id: 'o-37', label: '环境评估报告（环评）', required: false },
        { id: 'o-38', label: '消防备案号', required: true },
        { id: 'o-39', label: '物业管理规约', required: false },
        { id: 'o-40', label: '业主大会决议（如有）', required: false },
      ],
    },
    {
      name: '政策环境',
      description: '5/10 年规划',
      items: [
        { id: 'o-41', label: '城市更新计划（5 年内）', required: false },
        { id: 'o-42', label: '拆迁/改造计划', required: true },
        { id: 'o-43', label: '限售/限购政策', required: true },
        { id: 'o-44', label: '商办专项补贴', required: false },
        { id: 'o-45', label: '地铁规划（已批/规划中）', required: false },
        { id: 'o-46', label: '产业园区战略', required: false },
        { id: 'o-47', label: '写字楼空置率（区域）', required: true },
        { id: 'o-48', label: '写字楼平均租金（区域）', required: true },
        { id: 'o-49', label: '地区 GDP 增速', required: false },
        { id: 'o-50', label: '租赁市场未来 3 年预测', required: false },
      ],
    },
  ],
};

/* ============ 商铺 30 项 ============ */
const RETAIL_TEMPLATE: DueDiligenceTemplate = {
  id: 'dd-retail',
  applies_to: ['retail'],
  categories: [
    {
      name: '基础信息（必检）',
      description: '权属',
      items: [
        { id: 'r-1', label: '不动产权证', required: true },
        { id: 'r-2', label: '商业用途土地证', required: true },
        { id: 'r-3', label: '消防验收合格证（商业）', required: true },
        { id: 'r-4', label: '竣工验收报告', required: true },
        { id: 'r-5', label: '建筑结构 + 竣工年份', required: true },
        { id: 'r-6', label: '物业管理公司资质', required: true },
      ],
    },
    {
      name: '物理状态（评分 1-10）',
      description: '现场打分',
      items: [
        { id: 'r-7', label: '外立面（展示面）', required: true },
        { id: 'r-8', label: '店招位置（可见度）', required: true },
        { id: 'r-9', label: '临街深度（≥ 8m？）', required: true },
        { id: 'r-10', label: '客流动线（主入口位置）', required: true },
        { id: 'r-11', label: '卫生条件', required: true },
        { id: 'r-12', label: '强电容量（餐饮 ≥ 30kW）', required: true },
      ],
    },
    {
      name: '周边配套（拍照）',
      description: '位置决定一切',
      items: [
        { id: 'r-13', label: '客流量测算（工作日/周末）', required: true },
        { id: 'r-14', label: '最近地铁/公交站', required: true },
        { id: 'r-15', label: '周边餐饮/零售业态', required: true },
        { id: 'r-16', label: '周边竞品商铺数量', required: true },
        { id: 'r-17', label: '写字楼/学校/医院（客流源）', required: true },
        { id: 'r-18', label: '周边小区（居住人口）', required: false },
      ],
    },
    {
      name: '法律合规',
      description: '商业特别条款',
      items: [
        { id: 'r-19', label: '无未决诉讼', required: true },
        { id: 'r-20', label: '无产权纠纷', required: true },
        { id: 'r-21', label: '餐饮禁入限制', required: true },
        { id: 'r-22', label: '特殊行业限制（医教等）', required: true },
        { id: 'r-23', label: '经营业态限制', required: true },
        { id: 'r-24', label: '抵押状态', required: true },
      ],
    },
    {
      name: '政策环境',
      description: '5/10 年',
      items: [
        { id: 'r-25', label: '商业规划（步行街/商圈）', required: false },
        { id: 'r-26', label: '拆迁/改造计划', required: true },
        { id: 'r-27', label: '限售政策', required: true },
        { id: 'r-28', label: '商办专项补贴', required: false },
        { id: 'r-29', label: '本商圈平均租金', required: true },
        { id: 'r-30', label: '周边商铺空置率', required: true },
      ],
    },
  ],
};

/* ============ 酒店 35 项 ============ */
const HOTEL_TEMPLATE: DueDiligenceTemplate = {
  id: 'dd-hotel',
  applies_to: ['hotel'],
  categories: [
    {
      name: '基础信息',
      description: '酒店特种许可',
      items: [
        { id: 'h-1', label: '不动产权证', required: true },
        { id: 'h-2', label: '特种行业许可证（旅业）', required: true },
        { id: 'h-3', label: '消防安全合格证', required: true },
        { id: 'h-4', label: '卫生许可证', required: true },
        { id: 'h-5', label: '营业执照（住宿业）', required: true },
        { id: 'h-6', label: '竣工年份 + 上次装修', required: true },
        { id: 'h-7', label: '房间数 / 床位数', required: true },
      ],
    },
    {
      name: '物理状态',
      description: '评分',
      items: [
        { id: 'h-8', label: '外立面', required: true },
        { id: 'h-9', label: '大堂', required: true },
        { id: 'h-10', label: '电梯', required: true },
        { id: 'h-11', label: '客房（精装状态）', required: true },
        { id: 'h-12', label: '餐厅/酒吧（餐饮区）', required: true },
        { id: 'h-13', label: '健身房/泳池（如有）', required: false },
        { id: 'h-14', label: '会议室/宴会厅', required: false },
      ],
    },
    {
      name: '运营评估',
      description: '酒店特有',
      items: [
        { id: 'h-15', label: '当前入住率', required: true },
        { id: 'h-16', label: 'ADR（平均日房价）', required: true },
        { id: 'h-17', label: 'RevPAR（每房收益）', required: true },
        { id: 'h-18', label: '客户评价（携程/美团）', required: false },
        { id: 'h-19', label: '会员体系（华住/万豪等）', required: false },
        { id: 'h-20', label: '运营成本（人力/能耗）', required: true },
        { id: 'h-21', label: '运营方（自营/加盟）', required: true },
      ],
    },
    {
      name: '法律合规',
      description: '',
      items: [
        { id: 'h-22', label: '无未决诉讼', required: true },
        { id: 'h-23', label: '无产权纠纷', required: true },
        { id: 'h-24', label: '消防/卫生无重大违规', required: true },
        { id: 'h-25', label: '品牌加盟协议（如有）', required: true },
        { id: 'h-26', label: '运营方劳动合同', required: false },
        { id: 'h-27', label: '客人投诉处理记录', required: false },
        { id: 'h-28', label: 'OTA 平台协议', required: false },
      ],
    },
    {
      name: '政策环境',
      description: '',
      items: [
        { id: 'h-29', label: '旅游政策（限价/星级）', required: true },
        { id: 'h-30', label: '拆迁/改造计划', required: true },
        { id: 'h-31', label: '本区酒店平均入住率', required: true },
        { id: 'h-32', label: '周边会展/景区', required: false },
        { id: 'h-33', label: '商旅需求', required: true },
        { id: 'h-34', label: '区域酒店平均房价', required: true },
        { id: 'h-35', label: '未来 3 年市场预测', required: false },
      ],
    },
  ],
};

/* ============ 公寓 25 项 ============ */
const APARTMENT_TEMPLATE: DueDiligenceTemplate = {
  id: 'dd-apartment',
  applies_to: ['apartment'],
  categories: [
    {
      name: '基础信息',
      description: '',
      items: [
        { id: 'a-1', label: '不动产权证', required: true },
        { id: 'a-2', label: '国土证（70 年住宅）', required: true },
        { id: 'a-3', label: '消防验收合格证', required: true },
        { id: 'a-4', label: '竣工验收报告', required: true },
        { id: 'a-5', label: '物业管理协议', required: true },
      ],
    },
    {
      name: '物理状态',
      description: '评分',
      items: [
        { id: 'a-6', label: '外立面', required: true },
        { id: 'a-7', label: '电梯', required: true },
        { id: 'a-8', label: '强弱电', required: true },
        { id: 'a-9', label: '消防系统', required: true },
        { id: 'a-10', label: '给排水', required: true },
        { id: 'a-11', label: '空调', required: true },
        { id: 'a-12', label: '智能化', required: false },
        { id: 'a-13', label: '公共区域精装', required: true },
        { id: 'a-14', label: '户型结构（标准间/一居/两居）', required: true },
      ],
    },
    {
      name: '周边配套',
      description: '居住关键',
      items: [
        { id: 'a-15', label: '最近地铁站', required: true },
        { id: 'a-16', label: '通勤便利（CBD 距离）', required: true },
        { id: 'a-17', label: '学校（小学/中学）', required: true },
        { id: 'a-18', label: '医院', required: true },
        { id: 'a-19', label: '商超（超市/便利店）', required: true },
        { id: 'a-20', label: '餐饮配套', required: false },
      ],
    },
    {
      name: '法律合规',
      description: '',
      items: [
        { id: 'a-21', label: '无未决诉讼', required: true },
        { id: 'a-22', label: '限售/限购', required: true },
        { id: 'a-23', label: '抵押状态', required: true },
        { id: 'a-24', label: '物业管理规约', required: true },
        { id: 'a-25', label: '租客管理规约', required: true },
      ],
    },
  ],
};

/* ============ 仓库 25 项 ============ */
const WAREHOUSE_TEMPLATE: DueDiligenceTemplate = {
  id: 'dd-warehouse',
  applies_to: ['warehouse'],
  categories: [
    {
      name: '基础信息',
      description: '',
      items: [
        { id: 'w-1', label: '不动产权证', required: true },
        { id: 'w-2', label: '国土证（50 年工业）', required: true },
        { id: 'w-3', label: '消防验收合格证', required: true },
        { id: 'w-4', label: '环保批文（仓库无危化品）', required: true },
        { id: 'w-5', label: '建筑面积 / 容积率', required: true },
      ],
    },
    {
      name: '物理状态',
      description: '评分',
      items: [
        { id: 'w-6', label: '结构（钢结构/混凝土）', required: true },
        { id: 'w-7', label: '屋面（防水/隔热）', required: true },
        { id: 'w-8', label: '消防系统（喷淋/烟感）', required: true },
        { id: 'w-9', label: '强电（380V 三相）', required: true },
        { id: 'w-10', label: '月台数量（卸货）', required: true },
        { id: 'w-11', label: '举架高度（≥ 6m）', required: true },
        { id: 'w-12', label: '地坪（环氧/金刚砂）', required: false },
        { id: 'w-13', label: '24h 安保', required: true },
      ],
    },
    {
      name: '周边配套',
      description: '物流关键',
      items: [
        { id: 'w-14', label: '高速公路入口', required: true },
        { id: 'w-15', label: '最近港口/机场', required: true },
        { id: 'w-16', label: '铁路货场', required: false },
        { id: 'w-17', label: '主干道（≥ 双向 4 车道）', required: true },
        { id: 'w-18', label: '货车停车位', required: true },
      ],
    },
    {
      name: '法律合规',
      description: '',
      items: [
        { id: 'w-19', label: '危化品存储许可（无）', required: true },
        { id: 'w-20', label: '环保验收', required: true },
        { id: 'w-21', label: '营业执照（仓储）', required: true },
        { id: 'w-22', label: '抵押状态', required: true },
        { id: 'w-23', label: '园区物业管理规约', required: true },
      ],
    },
    {
      name: '政策环境',
      description: '',
      items: [
        { id: 'w-24', label: '物流园区规划', required: false },
        { id: 'w-25', label: '本区仓储平均租金', required: true },
      ],
    },
  ],
};

/* ============ 厂房 28 项 ============ */
const PLANT_TEMPLATE: DueDiligenceTemplate = {
  id: 'dd-plant',
  applies_to: ['plant'],
  categories: [
    {
      name: '基础信息',
      description: '',
      items: [
        { id: 'p-1', label: '不动产权证', required: true },
        { id: 'p-2', label: '国土证（50 年工业）', required: true },
        { id: 'p-3', label: '工业用地准入', required: true },
        { id: 'p-4', label: '建筑结构 + 厂房高度', required: true },
        { id: 'p-5', label: '竣工年份 + 上次改造', required: true },
      ],
    },
    {
      name: '物理状态',
      description: '',
      items: [
        { id: 'p-6', label: '结构（钢结构/混凝土）', required: true },
        { id: 'p-7', label: '屋面（彩钢/混凝土）', required: true },
        { id: 'p-8', label: '强电（10kV 工业用电）', required: true },
        { id: 'p-9', label: '排水（工业废水）', required: true },
        { id: 'p-10', label: '行车（10T 起重）', required: false },
        { id: 'p-11', label: '消防系统', required: true },
        { id: 'p-12', label: '通风/换气', required: true },
        { id: 'p-13', label: '环保设施（污水/废气）', required: true },
      ],
    },
    {
      name: '生产合规',
      description: '工业特有',
      items: [
        { id: 'p-14', label: '环评批复', required: true },
        { id: 'p-15', label: '排污许可证', required: true },
        { id: 'p-16', label: '危险化学品经营许可', required: false },
        { id: 'p-17', label: '消防验收（工业）', required: true },
        { id: 'p-18', label: '安全标准化证书', required: false },
        { id: 'p-19', label: '生产噪音合规（≤ 65dB）', required: true },
        { id: 'p-20', label: '员工宿舍配套', required: false },
      ],
    },
    {
      name: '法律合规',
      description: '',
      items: [
        { id: 'p-21', label: '无未决诉讼', required: true },
        { id: 'p-22', label: '抵押状态', required: true },
        { id: 'p-23', label: '营业执照（制造业）', required: true },
        { id: 'p-24', label: '园区物业管理规约', required: true },
        { id: 'p-25', label: '员工劳动合同', required: false },
      ],
    },
    {
      name: '政策环境',
      description: '',
      items: [
        { id: 'p-26', label: '工业园区规划', required: false },
        { id: 'p-27', label: '产业政策补贴', required: false },
        { id: 'p-28', label: '本区厂房平均租金', required: true },
      ],
    },
  ],
};

/* ============ 全部模板字典 ============ */

export const DUE_DILIGENCE_TEMPLATES: Record<string, DueDiligenceTemplate> = {
  [OFFICE_TEMPLATE.id]: OFFICE_TEMPLATE,
  [RETAIL_TEMPLATE.id]: RETAIL_TEMPLATE,
  [HOTEL_TEMPLATE.id]: HOTEL_TEMPLATE,
  [APARTMENT_TEMPLATE.id]: APARTMENT_TEMPLATE,
  [WAREHOUSE_TEMPLATE.id]: WAREHOUSE_TEMPLATE,
  [PLANT_TEMPLATE.id]: PLANT_TEMPLATE,
};

/** 根据业态 type 选模板 */
export function getTemplateForType(type: string): DueDiligenceTemplate {
  switch (type) {
    case 'office':
      return OFFICE_TEMPLATE;
    case 'retail':
      return RETAIL_TEMPLATE;
    case 'hotel':
      return HOTEL_TEMPLATE;
    case 'apartment':
      return APARTMENT_TEMPLATE;
    case 'warehouse':
      return WAREHOUSE_TEMPLATE;
    case 'plant':
      return PLANT_TEMPLATE;
    default:
      return OFFICE_TEMPLATE; // fallback
  }
}

/** 全部模板的项数 + 必检项数 */
export const TEMPLATE_STATS: Record<string, { total: number; required: number }> =
  Object.fromEntries(
    Object.entries(DUE_DILIGENCE_TEMPLATES).map(([id, t]) => {
      let total = 0;
      let required = 0;
      for (const cat of t.categories) {
        for (const item of cat.items) {
          total++;
          if (item.required) required++;
        }
      }
      return [id, { total, required }];
    })
  );