import { useMemo, useState } from 'react';
import {
  Drawer,
  Form,
  Select,
  Input,
  Button,
  Alert,
  Tag,
  Space,
  Radio,
  Switch,
  TimePicker,
  Divider,
  message,
} from 'antd';
import type { CrawlerTask } from '@/types';
import { useAssetStore } from '@/stores/assetStore';
import dayjs from 'dayjs';

/**
 * 新建爬虫任务（用户反馈 #1）
 *  - 字段：数据源 / 区域 / cron / 启停状态 / 自动校准 / 备注
 *  - 提交后加入 store.crawlerTasks（持久化由 store 内存即可）
 */
interface Props {
  open: boolean;
  onClose: () => void;
}

const SOURCE_OPTIONS: { value: CrawlerTask['source']; label: string; desc: string }[] = [
  { value: 'beike', label: '贝壳找房', desc: '高品质公寓 / 写字楼挂牌' },
  { value: '58', label: '58 同城', desc: '商铺 / 仓库 / 厂房挂牌' },
  { value: 'fangtianxia', label: '房天下', desc: '商业地产频道' },
  { value: 'lianjia', label: '链家', desc: '住宅 + 商业' },
];

const REGIONS = ['朝阳区', '海淀区', '东城区', '西城区', '通州区', '大兴区', '丰台区', '昌平区', '顺义区', '房山区'];

const SCHEDULE_PRESETS = [
  { value: '0 6 * * *', label: '每天 06:00' },
  { value: '0 7 * * *', label: '每天 07:00' },
  { value: '0 8 * * *', label: '每天 08:00' },
  { value: '0 */12 * * *', label: '每 12 小时' },
  { value: '0 */6 * * *', label: '每 6 小时' },
];

export default function NewCrawlerTaskDrawer({ open, onClose }: Props) {
  const [form] = Form.useForm();
  const setCrawlerTask = useAssetStore((s) => s.crawlerTasks);
  const setTasks = (next: CrawlerTask[]) => {
    // 这里直接替换 store 中的 tasks
    useAssetStore.setState({ crawlerTasks: next });
  };

  const [autoCalibrate, setAutoCalibrate] = useState(true);
  const [source, setSource] = useState<CrawlerTask['source']>('beike');
  const [region, setRegion] = useState<string>('朝阳区');
  const [schedule, setSchedule] = useState<string>('0 6 * * *');

  const sourceDesc = useMemo(
    () => SOURCE_OPTIONS.find((s) => s.value === source)?.desc,
    [source]
  );

  const submit = () => {
    form
      .validateFields()
      .then((values) => {
        const task: CrawlerTask = {
          id: `task-${Date.now().toString().slice(-6)}`,
          source: values.source,
          region: values.region,
          schedule: values.schedule,
          last_run_at: '尚未运行',
          record_count: 0,
          status: 'running',
          manual_calibrated: 0,
        };
        setTasks([task, ...setCrawlerTask]);
        message.success(`任务已创建：${SOURCE_OPTIONS.find((s) => s.value === values.source)?.label} · ${values.region}`);
        form.resetFields();
        onClose();
      })
      .catch(() => {
        message.warning('请补齐必填项');
      });
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="新建爬虫任务"
      width={520}
      destroyOnClose
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={submit}>
            创建并启动
          </Button>
        </Space>
      }
    >
      <Alert
        className="!mb-3"
        type="info"
        showIcon
        message="数据合规说明"
        description="本系统爬取的数据均来自公开挂牌网站，入库前会自动脱敏经纪人电话、姓名等 PII 字段。"
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          source: 'beike',
          region: '朝阳区',
          schedule: '0 6 * * *',
        }}
      >
        <Form.Item
          label="数据源"
          name="source"
          rules={[{ required: true, message: '请选择数据源' }]}
        >
          <Radio.Group
            onChange={(e) => setSource(e.target.value)}
            className="!w-full"
          >
            <div className="grid grid-cols-2 gap-2">
              {SOURCE_OPTIONS.map((s) => (
                <Radio.Button key={s.value} value={s.value} className="!text-center">
                  {s.label}
                </Radio.Button>
              ))}
            </div>
          </Radio.Group>
          {sourceDesc && (
            <div className="mt-1 text-xs text-gray-400">{sourceDesc}</div>
          )}
        </Form.Item>

        <Form.Item
          label="采集区域"
          name="region"
          rules={[{ required: true, message: '请选择区域' }]}
        >
          <Select
            onChange={setRegion}
            options={REGIONS.map((r) => ({ value: r, label: r }))}
          />
        </Form.Item>

        <Form.Item
          label="调度规则（cron）"
          name="schedule"
          tooltip="标准 5 段 cron 表达式：分 时 日 月 周"
          rules={[{ required: true, message: '请选择调度规则' }]}
        >
          <Select
            onChange={setSchedule}
            options={SCHEDULE_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
          />
        </Form.Item>

        <Form.Item label="自定义 cron（可选）">
          <Input
            placeholder="例如 30 5 * * 1-5"
            allowClear
            addonAfter={
              <span className="text-[11px] text-gray-400">覆盖上面预设</span>
            }
          />
        </Form.Item>

        <Form.Item label="首次执行时间（可选）">
          <TimePicker
            className="!w-full"
            placeholder="立即 / 选择时间"
            format="HH:mm"
            defaultValue={dayjs('06:00', 'HH:mm')}
          />
        </Form.Item>

        <Divider className="!my-2" />

        <Form.Item label="自动脱敏">
          <Switch defaultChecked disabled />
          <span className="ml-2 text-xs text-gray-500">经纪人电话 / 姓名（强制）</span>
        </Form.Item>

        <Form.Item label="人工校准提示">
          <Switch checked={autoCalibrate} onChange={setAutoCalibrate} />
          <span className="ml-2 text-xs text-gray-500">
            抓取结果超阈值时自动弹出校准面板
          </span>
        </Form.Item>

        <Form.Item label="备注（选填）">
          <Input.TextArea rows={2} placeholder="采集意图说明，例如：四批资产周边的写字楼" />
        </Form.Item>
      </Form>

      <div className="bg-blue-50 rounded p-3 text-xs text-blue-700 leading-relaxed">
        <b>当前配置预览：</b>
        <div className="mt-1 flex flex-wrap gap-1">
          <Tag color="blue" bordered={false}>
            {SOURCE_OPTIONS.find((s) => s.value === source)?.label}
          </Tag>
          <Tag color="purple" bordered={false}>{region}</Tag>
          <Tag color="default" bordered={false}>{schedule}</Tag>
        </div>
        下次运行：预计 {schedule.split(' ').slice(1).join(':')} 后
      </div>
    </Drawer>
  );
}
