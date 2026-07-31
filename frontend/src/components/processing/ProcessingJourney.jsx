import { Check, CircleCheck, FileSearch, ScrollText, Settings2, Sparkles, UploadCloud } from 'lucide-react';

export default function ProcessingJourney({
  isZh,
  uploaded,
  analyzing,
  analysisReady,
  confirmed,
}) {
  const activeStep = !uploaded ? 0 : analyzing || !analysisReady ? 1 : confirmed ? 5 : 3;
  const steps = isZh
    ? [
        ['上传文件', '添加、预览并确认文件', UploadCloud],
        ['AI 分析', '识别内容、语言与结构', FileSearch],
        ['分析报告', '查看真实文件分析结果', ScrollText],
        ['推荐方案', 'AI 自动配置处理能力', Sparkles],
        ['用户确认', '按需调整并确认方案', Settings2],
        ['创建任务', '确认后进入处理队列', CircleCheck],
      ]
    : [
        ['Upload', 'Add, preview and review files', UploadCloud],
        ['AI analysis', 'Detect content, language and structure', FileSearch],
        ['Analysis report', 'Review actual file intelligence', ScrollText],
        ['Recommended plan', 'AI configures the workflow', Sparkles],
        ['User confirmation', 'Adjust only when needed', Settings2],
        ['Create task', 'Send the confirmed plan to the queue', CircleCheck],
      ];

  return (
    <section className="processing-journey-v44" aria-label={isZh ? '任务创建流程' : 'Task creation workflow'}>
      {steps.map(([title, description, Icon], index) => {
        const complete = index < activeStep || (index === 5 && confirmed);
        const active = index === activeStep;
        return (
          <div className={`${active ? 'active' : ''} ${complete ? 'complete' : ''}`} key={title}>
            <span>{complete ? <Check /> : <Icon />}</span>
            <p>
              <b>{title}</b>
              <small>{description}</small>
            </p>
            {index < steps.length - 1 && <i />}
          </div>
        );
      })}
    </section>
  );
}
