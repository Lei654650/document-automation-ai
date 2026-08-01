import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Check,
  CircleCheck,
  Clock3,
  Coins,
  FileText,
  Files,
  Gauge,
  HardDrive,
  Image as ImageIcon,
  Languages,
  ScanText,
  ShieldCheck,
  Sparkles,
  Table2,
} from 'lucide-react';

const OUTPUT_LABELS = {
  original: 'Original',
  docx: 'Word',
  xlsx: 'Excel',
  pptx: 'PowerPoint',
  pdf: 'PDF',
  csv: 'CSV',
  images: 'Images',
};

const SERVICE_LABELS = {
  ocr: ['OCR 与图片识别', 'OCR & image recognition'],
  translation: ['文档翻译（待用户确认）', 'Document translation (confirm required)'],
  conversion: ['格式转换', 'Format conversion'],
  data_cleanup: ['智能整理与校对', 'Smart cleanup & proofing'],
  enterprise_analysis: ['企业数据分析', 'Enterprise analysis'],
};

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value) return '—';
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function displayCount(value, complete = true) {
  const count = Number(value || 0);
  if (!count) return complete ? '0' : '—';
  return complete ? String(count) : `≥ ${count}`;
}

export default function AIAnalysisPanel({
  isZh,
  analysis,
  recommendation,
  analyzing,
  error,
  fileCount,
  applied,
  onApply,
}) {
  const confidence = Math.round(Number(recommendation?.confidence || 0) * 100);
  const services = [...new Set([...(recommendation?.recommended_services || []), ...(recommendation?.enhancement_services || [])])];
  const formats = analysis?.input_formats || [];
  const languages = recommendation?.detected_languages || analysis?.detected_languages || [];
  const ocrLanguages = recommendation?.ocr_languages || analysis?.ocr_languages || [];

  if (analyzing) {
    return (
      <section className="ai-analysis-panel-v44 is-loading" aria-live="polite">
        <header>
          <span><Sparkles /></span>
          <div>
            <b>{isZh ? 'AI 正在分析真实文件' : 'AI is analyzing the actual files'}</b>
            <small>{isZh ? '正在读取文件结构、语言、行业、图片、表格和 OCR 需求；此时不会创建任务。' : 'Reading structure, language, industry, images, tables and OCR needs. No task is created yet.'}</small>
          </div>
        </header>
        <div className="ai-analysis-skeleton-v44"><i /><i /><i /><i /></div>
      </section>
    );
  }

  if (error && !recommendation) {
    return (
      <section className="ai-analysis-panel-v44 is-fallback" aria-live="polite">
        <header>
          <span><AlertTriangle /></span>
          <div>
            <b>{isZh ? '真实文件分析暂时不可用' : 'File analysis is temporarily unavailable'}</b>
            <small>{isZh ? '系统不会展示虚假的 AI 结论。可进入安全默认方案继续配置，或检查后端后重新上传。' : 'No fabricated AI result is shown. Continue with a safe fallback plan or retry after checking the backend.'}</small>
          </div>
        </header>
        <div className="analysis-fallback-note-v44"><ShieldCheck />{error}</div>
        <footer>
          <span><ShieldCheck />{isZh ? '处理尚未开始' : 'Processing has not started'}</span>
          <button type="button" onClick={onApply}>{isZh ? '进入安全方案确认' : 'Review safe fallback'}<ArrowRight /></button>
        </footer>
      </section>
    );
  }

  if (!recommendation || !analysis) {
    return (
      <section className="ai-analysis-panel-v44 is-idle">
        <header>
          <span><BrainCircuit /></span>
          <div>
            <b>{isZh ? '上传后自动生成 AI 分析报告' : 'AI Analysis Report is generated after upload'}</b>
            <small>{isZh ? 'AI 先理解文档，再推荐处理能力、输出格式和布局。' : 'AI understands the documents before recommending capabilities, formats and layout.'}</small>
          </div>
        </header>
      </section>
    );
  }

  const pageCount = displayCount(analysis.total_pages, analysis.page_count_complete !== false);
  const imageCount = displayCount(analysis.total_images, analysis.image_count_complete !== false);
  const tableCount = displayCount(analysis.total_tables, analysis.table_count_complete !== false);
  const ocrText = recommendation.ocr_required
    ? ocrLanguages.length ? ocrLanguages.join(' / ') : (isZh ? '处理时自动识别' : 'Detect during processing')
    : (isZh ? '无需 OCR' : 'OCR not required');
  const quality = Number(recommendation.quality_score || 0);
  const facts = [
    [isZh ? '文件数量' : 'Files', analysis.file_count || fileCount, Files],
    [isZh ? '文件大小' : 'File size', formatBytes(analysis.total_size_bytes), HardDrive],
    [isZh ? '页数 / 幻灯片' : 'Pages / slides', pageCount, FileText],
    [isZh ? '图片数量' : 'Images', imageCount, ImageIcon],
    [isZh ? '表格数量' : 'Tables', tableCount, Table2],
    [isZh ? 'OCR 判断' : 'OCR decision', ocrText, ScanText],
    [isZh ? '文档语言' : 'Document language', languages.join(' / ') || '—', Languages],
    [isZh ? '行业识别' : 'Industry', recommendation.industry || analysis.industry || (isZh ? '通用' : 'General'), BrainCircuit],
    [isZh ? '复杂度' : 'Complexity', recommendation.complexity || analysis.complexity || '—', Gauge],
    [isZh ? '预计质量' : 'Quality target', quality ? `${quality}%` : '—', ShieldCheck],
    [isZh ? '预计耗时' : 'Estimated time', recommendation.estimated_seconds ? `≈ ${recommendation.estimated_seconds}s` : '—', Clock3],
    [isZh ? 'Credits 预估' : 'Credits estimate', recommendation.estimated_credits ?? '—', Coins],
  ];

  const inputGroups = recommendation.input_groups || [];
  const outputGroups = recommendation.output_groups || [];
  const reasons = recommendation.reason_details?.length ? recommendation.reason_details : [recommendation.reason].filter(Boolean);

  return (
    <section className={`ai-analysis-panel-v44 is-ready ${applied ? 'is-applied' : ''}`} aria-live="polite">
      <header>
        <span>{applied ? <CircleCheck /> : <Sparkles />}</span>
        <div>
          <small>AI ANALYSIS REPORT</small>
          <b>{applied ? (isZh ? '推荐方案已应用，下一步请确认' : 'Recommendation applied — confirm the plan') : (isZh ? '真实文件分析完成' : 'Actual file analysis complete')}</b>
          <p>{isZh ? '分析结果来自已上传文件。是否翻译和目标语言必须由您确认，不会自动假定。' : 'Results come from the uploaded files. Translation and target languages require your confirmation.'}</p>
        </div>
        <em>{confidence}% {isZh ? '可信度' : 'confidence'}</em>
      </header>

      <div className="analysis-confidence-v44"><i style={{ width: `${confidence}%` }} /></div>

      <div className="analysis-facts-v44">
        {facts.map(([label, value, Icon]) => (
          <span key={label}><Icon /><small>{label}</small><b title={String(value)}>{value}</b></span>
        ))}
      </div>

      <div className="analysis-format-matrix-v44">
        <section>
          <header><b>{isZh ? '已识别输入' : 'Detected inputs'}</b><small>{formats.join(' / ') || '—'}</small></header>
          <div>
            {(inputGroups.length ? inputGroups : [{ category: isZh ? '文件' : 'Files', formats }]).map(group => (
              <span key={`${group.category}-${(group.formats || []).join('-')}`}>
                <small>{group.category}</small>
                <b>{(group.formats || []).join(' · ') || '—'}</b>
              </span>
            ))}
          </div>
        </section>
        <section>
          <header><b>{isZh ? '兼容输出' : 'Compatible outputs'}</b><small>{isZh ? '根据输入动态生成' : 'Generated dynamically from inputs'}</small></header>
          <div>
            {(outputGroups.length ? outputGroups : [{ category: isZh ? '输出' : 'Output', formats: recommendation.compatible_outputs || [] }]).map(group => (
              <span key={`${group.category}-${(group.formats || []).join('-')}`}>
                <small>{group.category}</small>
                <b>{(group.formats || []).map(format => OUTPUT_LABELS[format] || format).join(' · ') || '—'}</b>
              </span>
            ))}
          </div>
        </section>
      </div>

      <div className="analysis-reason-v44">
        <section>
          <b>{isZh ? '推荐原因' : 'Why this plan'}</b>
          {reasons.map(reason => <p key={reason}><Check />{reason}</p>)}
        </section>
        <section>
          <b>{isZh ? '可用能力' : 'Available capabilities'}</b>
          <div>{services.length
            ? services.map(service => <i key={service}><Check />{SERVICE_LABELS[service]?.[isZh ? 0 : 1] || service}</i>)
            : '—'}
          </div>
        </section>
      </div>

      {recommendation.warnings?.length > 0 && (
        <div className="analysis-warning-v44"><AlertTriangle />{recommendation.warnings[0]}</div>
      )}

      <footer>
        <span><ShieldCheck />{isZh ? `分析耗时 ${analysis.analysis_duration_ms || 0} ms · 处理尚未开始` : `Analyzed in ${analysis.analysis_duration_ms || 0} ms · processing has not started`}</span>
        <button type="button" className={applied ? 'applied' : ''} onClick={onApply}>
          {applied ? <CircleCheck /> : null}
          {applied ? (isZh ? '已应用，前往用户确认' : 'Applied — review confirmation') : (isZh ? '应用推荐方案并继续' : 'Apply recommendation and continue')}
          <ArrowRight />
        </button>
      </footer>
    </section>
  );
}
