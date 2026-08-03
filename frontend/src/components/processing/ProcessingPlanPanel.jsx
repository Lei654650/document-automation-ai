import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  CircleCheck,
  Database,
  FileOutput,
  Gauge,
  Globe2,
  Image as ImageIcon,
  Languages,
  ScanText,
  Scissors,
  Settings2,
  ShieldCheck,
  Sparkles,
  Table2,
} from 'lucide-react';

const LANGUAGE_GROUPS = [
  {
    id: 'asia', zh: '亚洲', en: 'Asia', items: [
      ['zh', '中文（简体）'], ['zh-TW', '中文（繁体）'], ['en', 'English'], ['vi', 'Tiếng Việt'],
      ['th', 'ไทย'], ['id', 'Bahasa Indonesia'], ['ms', 'Bahasa Melayu'], ['ja', '日本語'], ['ko', '한국어'],
    ],
  },
  {
    id: 'europe', zh: '欧洲', en: 'Europe', items: [
      ['de', 'Deutsch'], ['fr', 'Français'], ['es', 'Español'], ['it', 'Italiano'],
      ['pt', 'Português'], ['nl', 'Nederlands'], ['pl', 'Polski'],
    ],
  },
];

const LANGUAGE_LABELS = Object.fromEntries(LANGUAGE_GROUPS.flatMap(group => group.items));

const OUTPUT_META = {
  original: { zh: '保留源文件格式', en: 'Preserve source format' },
  docx: { zh: 'Word', en: 'Word' },
  xlsx: { zh: 'Excel', en: 'Excel' },
  pptx: { zh: 'PowerPoint', en: 'PowerPoint' },
  pdf: { zh: 'PDF', en: 'PDF' },
  csv: { zh: 'CSV', en: 'CSV' },
  md: { zh: 'Markdown', en: 'Markdown' },
  html: { zh: 'HTML', en: 'HTML' },
  txt: { zh: 'TXT', en: 'TXT' },
  json: { zh: 'JSON', en: 'JSON' },
  xml: { zh: 'XML', en: 'XML' },
  images: { zh: '图片', en: 'Images' },
};

const SERVICES = [
  ['ocr', ScanText, 'OCR', 'OCR'],
  ['image_recognition', ImageIcon, '图片识别', 'Image recognition'],
  ['conversion', FileOutput, '格式转换', 'Format conversion'],
  ['pdf_rebuild', FileOutput, 'PDF 重建', 'PDF reconstruction'],
  ['data_cleanup', Sparkles, '数据整理', 'Data cleanup'],
  ['proofreading', Bot, 'AI 校对', 'AI proofreading'],
  ['table_recovery', Table2, '表格恢复', 'Table recovery'],
  ['scan_enhancement', ScanText, '扫描增强', 'Scan enhancement'],
  ['layout_recovery', FileOutput, '版式恢复', 'Layout recovery'],
  ['document_organization', Sparkles, '文档整理', 'Document organization'],
  ['enterprise_analysis', Database, '企业级文档分析', 'Enterprise document analysis'],
];

const BILINGUAL_LAYOUTS = [
  ['auto', 'AI 自动推荐', 'AI recommended', '根据文件结构与行业自动选择', 'Choose from document structure and industry'],
  ['vertical-source-first', '原文在上，译文在下', 'Source above target', '适合合同、报告和段落逐段核对', 'Best for contracts, reports and paragraph review'],
  ['vertical-target-first', '译文在上，原文在下', 'Target above source', '先阅读译文，同时保留原文依据', 'Read the translation first while retaining the source'],
  ['columns-source-first', '原文在左，译文在右', 'Source left, target right', '适合表格、标签和工业资料逐列核对', 'Best for tables, labels and industrial review'],
  ['columns-target-first', '译文在左，原文在右', 'Target left, source right', '目标语言优先的左右分列布局', 'Side-by-side layout with the target first'],
  ['inline-source-first', '原文在前，译文同行', 'Source then target inline', '适合短标签、按钮和简短字段', 'Best for short labels, buttons and fields'],
  ['inline-target-first', '译文在前，原文同行', 'Target then source inline', '目标语言优先的同行对照', 'Inline comparison with the target first'],
];

const LAYOUT_PROFILES = [
  ['auto', '自动适配', 'Auto adapt', '按文件类型与版式自动优化', 'Optimize for the document type and layout'],
  ['industrial', '工业表格与标签', 'Industrial tables & labels', '保护 PLC、型号、变量和技术编号', 'Protect PLC terms, models, variables and identifiers'],
  ['spreadsheet', 'Excel 数据表', 'Excel data tables', '优先保持工作表、公式、合并单元格和列关系', 'Preserve sheets, formulas, merged cells and column relationships'],
  ['contracts', '合同与报告', 'Contracts & reports', '保持段落顺序、条款编号和逐段对应', 'Preserve paragraph order, clause numbering and pairing'],
  ['publishing', '报告与出版物', 'Reports & publishing', '优化标题、分页、脚注和阅读顺序', 'Optimize headings, pagination, notes and reading order'],
  ['presentation', '演示文稿', 'Presentations', '保护文本框、图表、图片和幻灯片层级', 'Preserve text boxes, charts, images and slide hierarchy'],
  ['source-first', '原版式优先', 'Source layout first', '尽量不改变原文件结构和位置', 'Preserve the source structure and positioning'],
  ['custom', '自定义布局', 'Custom layout', '由客户自行决定排列、顺序和同行分隔符', 'Choose arrangement, order and inline separator'],
];

const OUTPUT_CATEGORIES = [
  ['源文件', 'Source', ['original']],
  ['Office', 'Office', ['docx', 'xlsx', 'pptx']],
  ['PDF', 'PDF', ['pdf']],
  ['结构化数据', 'Structured data', ['csv', 'json', 'xml']],
  ['文本与网页', 'Text & web', ['md', 'html', 'txt']],
  ['图片', 'Images', ['images']],
];

function SwitchRow({ checked, label, onChange }) {
  return (
    <button
      type="button"
      className={`plan-switch-row-v44 ${checked ? 'active' : ''}`}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
    >
      <span><i />{label}</span>
    </button>
  );
}

export default function ProcessingPlanPanel({
  isZh,
  t,
  files,
  services,
  setServices,
  translationTargets,
  setTranslationTargets,
  outputFormats,
  setOutputFormats,
  compatibleFormats,
  outputOptions,
  setOutputOptions,
  form,
  setForm,
  recommendation,
  analysis,
  uploadedFileCount,
  actualFileCount,
  analysisReady,
  aiAnalyzing,
  hasArchiveErrors,
  planConfirmed,
  setPlanConfirmed,
  estimatedSeconds,
  estimatedCredits,
  estimatedQuality,
  submitting,
  error,
  onBack,
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedSection, setAdvancedSection] = useState('document');

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  const syncTranslationForm = (enabled, targets = translationTargets, mode = outputOptions.language_mode || 'single') => {
    const normalizedTargets = enabled ? targets.filter(Boolean) : [];
    setForm(current => ({
      ...current,
      translation_enabled: enabled,
      target_language: normalizedTargets[0] || '',
      translation: {
        ...(current.translation || {}),
        enabled,
        translation_enabled: enabled,
        target_language: normalizedTargets[0] || '',
        targets: normalizedTargets,
        language_mode: enabled ? mode : 'none',
      },
    }));
  };

  const markChanged = () => setPlanConfirmed(false);
  const setOption = (key, value) => {
    setOutputOptions(current => ({ ...current, [key]: value }));
    markChanged();
  };
  const toggleCapability = id => {
    if (id === 'conversion' && outputOptions.pdf_split?.enabled) return;
    setServices(current => current.includes(id) ? current.filter(item => item !== id) : [...new Set([...current, id])]);
    markChanged();
  };
  const applyInstruction = text => {
    setForm(current => ({
      ...current,
      requirements: [current.requirements.trim(), text].filter(Boolean).join('\n'),
    }));
    markChanged();
  };

  const translationEnabled = services.includes('translation');
  const sourceLanguages = recommendation?.detected_languages || analysis?.detected_languages || [];
  const suggestedTargets = recommendation?.suggested_target_languages || [];
  const translationAvailable = recommendation?.translation_available !== false;
  const languageMode = outputOptions.language_mode || (translationTargets.length > 1 ? 'multiple' : 'single');
  const outputStrategy = outputOptions.output_strategy || recommendation?.output_strategy || 'preserve';
  const pdfSplit = {
    enabled: !!outputOptions.pdf_split?.enabled,
    mode: outputOptions.pdf_split?.mode === 'ranges' ? 'ranges' : 'each_page',
    ranges: String(outputOptions.pdf_split?.ranges || ''),
    keep_original: !!outputOptions.pdf_split?.keep_original,
  };
  const analysisFiles = Array.isArray(analysis?.files) ? analysis.files : [];
  const pdfAnalysisFiles = analysisFiles.filter(item => item?.format === 'PDF' || /\.pdf$/i.test(item?.name || ''));
  const hasPdfInput = pdfAnalysisFiles.length > 0 || files.some(file => /\.pdf$/i.test(file?.name || ''));
  const pdfFileCount = pdfAnalysisFiles.length || files.filter(file => /\.pdf$/i.test(file?.name || '')).length;
  const pdfPageCount = pdfAnalysisFiles.reduce((total, item) => total + Number(item?.details?.pages || 0), 0);
  const knownPdfPageCounts = pdfAnalysisFiles.map(item => Number(item?.details?.pages || 0)).filter(value => value > 0);
  const smallestPdfPageCount = knownPdfPageCounts.length ? Math.min(...knownPdfPageCounts) : 0;
  const normalizedRangeText = pdfSplit.ranges
    .replaceAll('，', ',')
    .replaceAll('；', ',')
    .replaceAll(';', ',')
    .replaceAll('—', '-')
    .replaceAll('–', '-')
    .replaceAll('－', '-');
  const splitRangeTokens = normalizedRangeText.split(',').map(item => item.trim()).filter(Boolean);
  const parsedSplitRanges = splitRangeTokens.map(token => {
    const match = token.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) return null;
    return { start: Number(match[1]), end: Number(match[2] || match[1]) };
  });
  const orderedValidSplitRanges = parsedSplitRanges
    .filter(Boolean)
    .slice()
    .sort((left, right) => left.start - right.start || left.end - right.end);
  const splitRangesOverlap = orderedValidSplitRanges.some((item, index) => (
    index > 0 && item.start <= orderedValidSplitRanges[index - 1].end
  ));
  const invalidSplitRange = pdfSplit.enabled && pdfSplit.mode === 'ranges' && (
    normalizedRangeText.length > 5000
    || splitRangeTokens.length > 500
    || splitRangeTokens.length === 0
    || parsedSplitRanges.some(item => !item || item.start < 1 || item.end < item.start)
    || splitRangesOverlap
    || (smallestPdfPageCount > 0 && parsedSplitRanges.some(item => item && item.end > smallestPdfPageCount))
  );
  const compatible = [...new Set((compatibleFormats || []).filter(format => OUTPUT_META[format]))];
  const nonOriginalFormats = compatible.filter(format => format !== 'original');
  const primaryFormat = outputOptions.primary_format || recommendation?.primary_output || nonOriginalFormats[0] || 'pdf';
  const additionalFormats = Array.isArray(outputOptions.additional_formats)
    ? outputOptions.additional_formats.filter(format => nonOriginalFormats.includes(format))
    : outputFormats.filter(format => format !== 'original' && nonOriginalFormats.includes(format));
  const recommendedFormats = new Set((recommendation?.recommended_outputs || [recommendation?.primary_output || 'original']).filter(Boolean));
  const conditionalFormats = new Set(recommendation?.conditional_outputs || []);
  const formatGroups = OUTPUT_CATEGORIES
    .map(([zh, en, formats]) => ({ zh, en, formats: formats.filter(format => compatible.includes(format) && format !== 'original') }))
    .filter(group => group.formats.length > 0);
  const currentLayout = outputOptions.bilingual_layout || 'auto';
  const selectedLayoutId = BILINGUAL_LAYOUTS.some(item => item[0] === currentLayout)
    ? currentLayout
    : currentLayout === 'vertical'
      ? `vertical-${outputOptions.vertical_order === 'target-first' ? 'target-first' : 'source-first'}`
      : currentLayout === 'columns'
        ? `columns-${outputOptions.column_order === 'target-first' ? 'target-first' : 'source-first'}`
        : currentLayout === 'inline'
          ? `inline-${outputOptions.inline_order === 'target-first' ? 'target-first' : 'source-first'}`
          : 'auto';

  const chooseBilingualLayout = id => {
    const [mode, order] = id === 'auto' ? ['auto', 'source-first'] : id.split(/-(?=source-first|target-first$)/);
    setOutputOptions(current => ({
      ...current,
      bilingual_layout: id,
      ...(mode === 'vertical' ? { vertical_order: order } : {}),
      ...(mode === 'columns' ? { column_order: order } : {}),
      ...(mode === 'inline' ? { inline_order: order } : {}),
    }));
    markChanged();
  };

  const renderFormatGroups = (selected, onSelect, multiple = false) => (
    <div className="output-format-groups-v45">
      {formatGroups.map(group => (
        <section key={group.zh}>
          <small>{isZh ? group.zh : group.en}</small>
          <div>
            {group.formats.filter(format => format !== 'original').map(format => {
              const active = multiple ? selected.includes(format) : selected === format;
              return (
                <button type="button" key={format} className={`${active ? 'active' : ''} ${conditionalFormats.has(format) ? 'conditional' : ''}`} onClick={() => onSelect(format)}>
                  {active && <Check />}
                  <span>{OUTPUT_META[format]?.[isZh ? 'zh' : 'en'] || format}</span>
                  {recommendedFormats.has(format) && <em>{isZh ? 'AI 推荐' : 'AI pick'}</em>}
                  {!recommendedFormats.has(format) && conditionalFormats.has(format) && <em>{isZh ? '兼容转换' : 'Compatible'}</em>}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );

  const setTranslationDecision = enabled => {
    setServices(current => {
      const next = current.filter(item => item !== 'translation');
      return enabled ? [...next, 'translation'] : next;
    });
    if (!enabled) {
      setTranslationTargets([]);
      setOutputOptions(current => ({
        ...current,
        language_mode: 'none',
        bilingual_layout: 'none',
        layout_profile: 'auto',
      }));
    } else {
      setOutputOptions(current => ({
        ...current,
        language_mode: current.language_mode && current.language_mode !== 'none' ? current.language_mode : 'single',
        bilingual_layout: current.bilingual_layout && current.bilingual_layout !== 'none' ? current.bilingual_layout : 'target-only',
      }));
    }
    syncTranslationForm(enabled, enabled ? translationTargets : [], enabled ? (outputOptions.language_mode || 'single') : 'none');
    markChanged();
  };

  const setLanguageMode = mode => {
    setOutputOptions(current => ({
      ...current,
      language_mode: mode,
      bilingual_layout: mode === 'bilingual'
        ? (BILINGUAL_LAYOUTS.some(item => item[0] === current.bilingual_layout) || ['vertical', 'columns', 'inline'].includes(current.bilingual_layout) ? current.bilingual_layout : 'auto')
        : 'target-only',
      vertical_order: current.vertical_order || 'source-first',
      column_order: current.column_order || 'source-first',
      inline_order: current.inline_order || 'source-first',
    }));
    if (mode !== 'multiple') {
      const next = translationTargets.slice(0, 1);
      setTranslationTargets(next);
      syncTranslationForm(true, next, mode);
    } else {
      syncTranslationForm(true, translationTargets, mode);
    }
    markChanged();
  };

  const selectTarget = id => {
    if (languageMode === 'multiple') {
      const next = translationTargets.includes(id) ? translationTargets.filter(item => item !== id) : [...translationTargets, id];
      setTranslationTargets(next);
      syncTranslationForm(true, next, languageMode);
    } else {
      setTranslationTargets([id]);
      syncTranslationForm(true, [id], languageMode);
    }
    markChanged();
  };

  const setOutputStrategy = strategy => {
    if (strategy === 'preserve') {
      setOutputFormats(['original']);
      setServices(current => pdfSplit.enabled ? [...new Set([...current, 'conversion'])] : current.filter(item => item !== 'conversion'));
      setOutputOptions(current => ({ ...current, output_strategy: 'preserve', primary_format: 'original', additional_formats: [] }));
    } else if (strategy === 'convert') {
      const nextPrimary = primaryFormat === 'original' ? nonOriginalFormats[0] || 'pdf' : primaryFormat;
      setOutputFormats([nextPrimary]);
      setServices(current => [...new Set([...current, 'conversion'])]);
      setOutputOptions(current => ({ ...current, output_strategy: 'convert', primary_format: nextPrimary, additional_formats: [] }));
    } else {
      const nextAdditional = additionalFormats.length ? additionalFormats : nonOriginalFormats.slice(0, 1);
      setOutputFormats(['original', ...nextAdditional]);
      setServices(current => [...new Set([...current, 'conversion'])]);
      setOutputOptions(current => ({ ...current, output_strategy: 'preserve_and_additional', primary_format: 'original', additional_formats: nextAdditional }));
    }
    markChanged();
  };

  const setPrimaryFormat = format => {
    setOutputFormats([format]);
    setOutputOptions(current => ({ ...current, output_strategy: 'convert', primary_format: format, additional_formats: [] }));
    markChanged();
  };

  const toggleAdditionalFormat = format => {
    const next = additionalFormats.includes(format)
      ? additionalFormats.filter(item => item !== format)
      : [...additionalFormats, format];
    setOutputFormats(['original', ...next]);
    setOutputOptions(current => ({ ...current, output_strategy: 'preserve_and_additional', primary_format: 'original', additional_formats: next }));
    markChanged();
  };

  const updatePdfSplit = patch => {
    const nextEnabled = Object.prototype.hasOwnProperty.call(patch, 'enabled')
      ? Boolean(patch.enabled)
      : pdfSplit.enabled;
    setOutputOptions(current => {
      const currentSplit = {
        enabled: !!current.pdf_split?.enabled,
        mode: current.pdf_split?.mode === 'ranges' ? 'ranges' : 'each_page',
        ranges: String(current.pdf_split?.ranges || ''),
        keep_original: !!current.pdf_split?.keep_original,
      };
      const next = { ...currentSplit, ...patch, enabled: nextEnabled };
      return {
        ...current,
        ...(next.enabled ? { output_strategy: 'preserve', primary_format: 'original', additional_formats: [] } : {}),
        pdf_split: next,
      };
    });
    if (nextEnabled) {
      setServices(current => [...new Set([...current, 'conversion'])]);
      setOutputFormats(['original']);
    }
    markChanged();
  };

  const missingTranslationTarget = translationEnabled && translationTargets.length === 0;
  const invalidTargetCount = translationEnabled && languageMode !== 'multiple' && translationTargets.length > 1;
  const missingOutput = outputStrategy === 'convert' && !primaryFormat;
  const missingAdditional = outputStrategy === 'preserve_and_additional' && additionalFormats.length === 0;
  const providerUnavailable = translationEnabled && !translationAvailable;
  const canConfirm = files.length > 0
    && analysisReady
    && !aiAnalyzing
    && !hasArchiveErrors
    && !missingTranslationTarget
    && !invalidTargetCount
    && !missingOutput
    && !missingAdditional
    && !invalidSplitRange
    && !providerUnavailable;

  const selectedCapabilityLabels = useMemo(() => {
    const map = Object.fromEntries(SERVICES.map(([id,, zh, en]) => [id, isZh ? zh : en]));
    map.translation = isZh ? '文档翻译' : 'Document translation';
    return services.map(id => map[id]).filter(Boolean);
  }, [services, isZh]);

  const uploadedCount = Number(analysis?.uploaded_file_count || uploadedFileCount || files.length || 0);
  const actualCount = Number(analysis?.expanded_file_count || analysis?.actual_file_count || analysis?.file_count || actualFileCount || files.length || 0);
  const pageCount = Number(analysis?.total_pages || 0);
  const sheetCount = (analysis?.files || []).reduce((total, item) => total + Number(item?.details?.sheet_count || 0), 0);
  const languageText = translationEnabled
    ? `${languageMode === 'bilingual' ? (isZh ? '双语输出：' : 'Bilingual: ') : languageMode === 'multiple' ? (isZh ? '多语言：' : 'Multiple: ') : (isZh ? '目标语言：' : 'Target: ')}${translationTargets.map(code => LANGUAGE_LABELS[code] || code).join(' / ') || (isZh ? '待选择' : 'Not selected')}`
    : (isZh ? '不执行翻译' : 'No translation');
  const outputText = outputStrategy === 'preserve'
    ? (isZh ? '每个文件保持原格式' : 'Preserve each source format')
    : outputStrategy === 'convert'
      ? `${isZh ? '转换为' : 'Convert to'} ${OUTPUT_META[primaryFormat]?.[isZh ? 'zh' : 'en'] || primaryFormat}`
      : `${isZh ? '保留原格式，并附加' : 'Preserve source plus'} ${additionalFormats.map(id => OUTPUT_META[id]?.[isZh ? 'zh' : 'en'] || id).join(' / ')}`;
  const splitBaseText = pdfSplit.mode === 'each_page'
    ? (isZh ? '每页生成一个 PDF' : 'One PDF per page')
    : `${isZh ? '按范围拆分' : 'Split by ranges'}：${pdfSplit.ranges || '—'}`;
  const splitText = !pdfSplit.enabled
    ? (isZh ? '不拆分' : 'No splitting')
    : `${splitBaseText}${pdfSplit.keep_original ? (isZh ? '；同时保留完整 PDF' : '; keep complete PDF') : ''}`;

  const instructionTemplates = isZh
    ? [
        ['保持原版式', '保持原始版式、图片、表格、分页和字体层级。'],
        ['术语一致', '使用 AI 识别行业的专业术语，并保持全文术语一致。'],
        ['保护标识', '品牌、型号、编号、公式、变量和专有名词不要翻译。'],
        ['隐私保护', '处理日志和质量报告中不得显示证件号码、联系方式和完整原文。'],
      ]
    : [
        ['Preserve layout', 'Preserve layout, images, tables, pagination and typography hierarchy.'],
        ['Consistent terms', 'Use terminology from the detected industry consistently throughout the document.'],
        ['Protect identifiers', 'Do not translate brands, models, codes, formulas, variables or proper nouns.'],
        ['Protect privacy', 'Do not expose identifiers, contact details or complete source content in logs or reports.'],
      ];

  return (
    <section className="processing-plan-v44" id="processing-plan-confirmation">
      <header className="processing-plan-head-v44">
        <div>
          <span><Settings2 /></span>
          <div>
            <small>{isZh ? '第 5 步 · 用户确认' : 'STEP 5 · USER CONFIRMATION'}</small>
            <b>{isZh ? '确认本次真实执行方案' : 'Confirm the actual execution plan'}</b>
            <p>{isZh ? 'AI 负责分析和推荐；是否翻译、目标语言、输出策略和布局由您最终决定。' : 'AI analyzes and recommends. You make the final translation, language, output and layout decisions.'}</p>
          </div>
        </div>
        <em><Sparkles />{recommendation ? (isZh ? '真实分析方案' : 'Analyzed plan') : (isZh ? '安全默认方案' : 'Safe fallback')}</em>
      </header>

      {(recommendation?.contains_sensitive_data || analysis?.contains_sensitive_data) && (
        <div className="plan-privacy-notice-v45">
          <ShieldCheck />
          <span><b>{isZh ? '敏感资料任务' : 'Sensitive-content task'}</b><small>{recommendation?.privacy_notice || (isZh ? '请确认您有权处理该文件；平台日志不应显示证件号码、健康信息或完整原文。' : 'Confirm authorization to process this file. Logs must not expose identifiers, health data or full source content.')}</small></span>
        </div>
      )}

      <section className="translation-decision-v45">
        <header><Languages /><div><b>{isZh ? '这个任务是否需要翻译？' : 'Does this task require translation?'}</b><small>{isZh ? `已识别语言：${sourceLanguages.join(' / ') || '自动识别'}。AI 只提供建议，不替用户决定。` : `Detected: ${sourceLanguages.join(' / ') || 'automatic'}. AI recommends but does not decide for you.`}</small></div></header>
        <div>
          <button type="button" className={translationEnabled ? 'active' : ''} onClick={() => setTranslationDecision(true)}>
            {translationEnabled && <Check />}
            <span><b>{isZh ? '需要翻译' : 'Translation required'}</b><small>{isZh ? '显示目标语言、翻译模式、布局与质量设置' : 'Show language, mode, layout and quality settings'}</small></span>
          </button>
          <button type="button" className={!translationEnabled ? 'active' : ''} onClick={() => setTranslationDecision(false)}>
            {!translationEnabled && <Check />}
            <span><b>{isZh ? '无需翻译' : 'No translation'}</b><small>{isZh ? '清除所有翻译参数，仅执行 OCR、整理、分析或格式处理' : 'Clear translation parameters and run OCR, cleanup, analysis or format processing only'}</small></span>
          </button>
        </div>
        {translationEnabled && suggestedTargets.length > 0 && (
          <p className="translation-suggestion-v45"><Sparkles />{isZh ? `AI 建议考虑：${suggestedTargets.map(code => LANGUAGE_LABELS[code] || code).join(' / ')}，仍需由您点击确认。` : `AI suggests: ${suggestedTargets.map(code => LANGUAGE_LABELS[code] || code).join(' / ')}. You still need to select it.`}</p>
        )}
        {providerUnavailable && <p className="plan-inline-warning-v45"><AlertTriangle />{isZh ? '平台 AI 翻译服务暂时不可用。任务不会创建，也不会扣除 Credits，请联系管理员。' : 'Platform AI translation is unavailable. The task will not be created or charged; contact an administrator.'}</p>}
      </section>

      <div className="processing-plan-grid-v44">
        <section className="plan-block-v44 capabilities">
          <header><div><b>{isZh ? '处理能力' : 'Processing capabilities'}</b><small>{isZh ? '只选择本任务真正需要的能力' : 'Select only what this job needs'}</small></div><strong>{services.length}</strong></header>
          <div className="plan-capability-grid-v44">
            {SERVICES.map(([id, Icon, zh, en]) => {
              const active = services.includes(id);
              return (
                <button type="button" className={active ? 'active' : ''} key={id} onClick={() => toggleCapability(id)}>
                  <Icon /><span>{isZh ? zh : en}</span>{active && <Check />}
                </button>
              );
            })}
          </div>
        </section>

        {translationEnabled && (
          <section className="plan-block-v44 languages">
            <header><div><b>{isZh ? '目标语言与输出模式' : 'Target language and output mode'}</b><small>{languageMode === 'multiple' ? (isZh ? '可多选目标语言' : 'Multiple target languages allowed') : (isZh ? '请选择 1 个目标语言' : 'Select exactly one target language')}</small></div><Globe2 /></header>
            <div className="language-mode-v45">
              {[
                ['single', isZh ? '单语言' : 'Single language', isZh ? '只交付一种目标语言' : 'Deliver one target language'],
                ['multiple', isZh ? '多语言' : 'Multiple languages', isZh ? '每种语言生成独立交付文件' : 'Create a separate deliverable per language'],
                ['bilingual', isZh ? '双语输出' : 'Bilingual output', isZh ? '原文 + 1 个目标语言' : 'Source + one target language'],
              ].map(([id, label, desc]) => <button type="button" key={id} className={languageMode === id ? 'active' : ''} onClick={() => setLanguageMode(id)}>{languageMode === id && <Check />}<span><b>{label}</b><small>{desc}</small></span></button>)}
            </div>
            <div className="language-regions-v44">
              {LANGUAGE_GROUPS.map(group => (
                <div key={group.id}>
                  <span>{isZh ? group.zh : group.en}</span>
                  <div>
                    {group.items.map(([id, label]) => (
                      <button type="button" className={translationTargets.includes(id) ? 'active' : ''} key={id} onClick={() => selectTarget(id)}>
                        {translationTargets.includes(id) && <Check />}{label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {missingTranslationTarget && <p className="plan-inline-warning-v45"><AlertTriangle />{isZh ? '请选择至少一个目标语言。' : 'Select at least one target language.'}</p>}
            {invalidTargetCount && <p className="plan-inline-warning-v45"><AlertTriangle />{isZh ? '单语言和双语输出只能选择一个目标语言。' : 'Single and bilingual output allow only one target language.'}</p>}
          </section>
        )}

        {translationEnabled && (
          <section className="plan-block-v44 layout">
            <header><div><b>{isZh ? '翻译输出布局' : 'Translation output layout'}</b><small>{isZh ? '基础布局与场景优化分开设置' : 'Choose base layout and scenario profile separately'}</small></div><Languages /></header>
            {languageMode === 'bilingual' ? (
              <>
                <small className="plan-subheading-v45">{isZh ? '基础双语布局（单选）' : 'Base bilingual layout (single choice)'}</small>
                <div className="layout-options-v44">
                  {BILINGUAL_LAYOUTS.map(([id, zh, en, zhDescription, enDescription]) => (
                    <button type="button" className={selectedLayoutId === id ? 'active' : ''} key={id} onClick={() => chooseBilingualLayout(id)}>
                      <i>{selectedLayoutId === id && <Check />}</i>
                      <span><b>{isZh ? zh : en}</b><small>{isZh ? zhDescription : enDescription}</small></span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="layout-target-only-v45"><CircleCheck /><span><b>{isZh ? '仅输出目标语言' : 'Target language only'}</b><small>{isZh ? '单语言或多语言模式不混入原文；多语言会分别生成文件。' : 'Single or multiple mode excludes source text; multiple languages create separate files.'}</small></span></div>
            )}
            <small className="plan-subheading-v45">{isZh ? '行业与场景优化（单选）' : 'Industry and scenario optimization (single choice)'}</small>
            <div className="layout-profile-grid-v45">
              {LAYOUT_PROFILES.map(([id, zh, en, zhDesc, enDesc]) => <button type="button" key={id} className={(outputOptions.layout_profile || recommendation?.layout_profile || 'auto') === id ? 'active' : ''} onClick={() => setOption('layout_profile', id)}>{(outputOptions.layout_profile || recommendation?.layout_profile || 'auto') === id && <Check />}<span><b>{isZh ? zh : en}</b><small>{isZh ? zhDesc : enDesc}</small></span></button>)}
            </div>
            {(outputOptions.layout_profile || recommendation?.layout_profile) === 'custom' && languageMode === 'bilingual' && (
              <div className="custom-layout-controls-v45">
                <label><span>{isZh ? '同行分隔符' : 'Inline separator'}</span><select value={outputOptions.inline_style || 'dash'} onChange={event => setOption('inline_style', event.target.value)}><option value="dash">—</option><option value="slash">/</option><option value="pipe">|</option><option value="parentheses">（ ）</option></select></label>
                <p>{isZh ? '排列方式与原文/译文顺序由上方基础布局决定；这里可继续定制同行分隔符。' : 'Arrangement and source/target order come from the base layout above; customize the inline separator here.'}</p>
              </div>
            )}
            {recommendation?.layout_reason && <p className="layout-reason-v45"><Sparkles />{recommendation.layout_reason}</p>}
          </section>
        )}

        <section className="plan-block-v44 outputs">
          <header><div><b>{isZh ? '最终输出' : 'Final output'}</b><small>{isZh ? '先选输出策略，再选择主格式或附加格式' : 'Choose a strategy before selecting primary or additional formats'}</small></div><FileOutput /></header>
          <div className="output-strategy-v45">
            {[
              ['preserve', isZh ? '保持源文件格式（推荐）' : 'Preserve source formats', isZh ? 'Excel→Excel、Word→Word、PDF→PDF；混合任务分别保持原格式' : 'Excel→Excel, Word→Word, PDF→PDF; mixed jobs preserve each type'],
              ['convert', isZh ? '转换为指定格式' : 'Convert to one format', isZh ? '主输出格式只能单选，并可能改变版式' : 'One primary output; layout may change'],
              ['preserve_and_additional', isZh ? '保留源格式并生成附加版本' : 'Preserve source plus additional versions', isZh ? '主文件保持原格式，可额外生成 PDF、Word 等兼容版本' : 'Keep source and add compatible PDF, Word or other versions'],
            ].map(([id, label, desc]) => <button type="button" key={id} className={outputStrategy === id ? 'active' : ''} onClick={() => setOutputStrategy(id)}>{outputStrategy === id && <Check />}<span><b>{label}</b><small>{desc}</small></span></button>)}
          </div>

          <div className="output-recommendation-v45">
            <Sparkles /><span><b>{isZh ? 'AI 推荐，不限制客户选择' : 'AI recommendation, not a restriction'}</b><small>{recommendation?.output_reason || (isZh ? '优先保持源格式；其他格式均为系统真实支持的兼容输出。' : 'Preserve the source first; all other listed formats are engine-backed compatible outputs.')}</small></span>
          </div>

          {outputStrategy === 'convert' && (
            <div className="output-format-choice-v45">
              <b>{isZh ? '主输出格式（单选）' : 'Primary output format (single choice)'}</b>
              {renderFormatGroups(primaryFormat, setPrimaryFormat)}
              {recommendation?.output_warnings?.[primaryFormat] && <p><AlertTriangle />{recommendation.output_warnings[primaryFormat]}</p>}
            </div>
          )}

          {outputStrategy === 'preserve_and_additional' && (
            <div className="output-format-choice-v45">
              <b>{isZh ? '附加输出格式（可多选）' : 'Additional output formats (multiple allowed)'}</b>
              {renderFormatGroups(additionalFormats, toggleAdditionalFormat, true)}
              {additionalFormats.map(format => recommendation?.output_warnings?.[format] ? <p key={format}><AlertTriangle />{recommendation.output_warnings[format]}</p> : null)}
            </div>
          )}
          {missingOutput && <p className="plan-inline-warning-v45"><AlertTriangle />{isZh ? '请选择一个主输出格式。' : 'Select one primary output format.'}</p>}
          {missingAdditional && <p className="plan-inline-warning-v45"><AlertTriangle />{isZh ? '请选择至少一个附加输出格式。' : 'Select at least one additional output format.'}</p>}
        </section>
      </div>

      {hasPdfInput && (
        <section className={`pdf-split-card-v45 ${pdfSplit.enabled ? 'active' : ''}`}>
          <header>
            <span><Scissors /></span>
            <div>
              <b>{isZh ? 'PDF 文件拆分' : 'PDF splitting'}</b>
              <small>{isZh ? `已识别 ${pdfFileCount} 个 PDF${pdfPageCount ? `，共 ${pdfPageCount} 页` : ''}。拆分后会生成多个独立 PDF，并支持统一 ZIP 下载。` : `${pdfFileCount} PDF file(s) detected${pdfPageCount ? `, ${pdfPageCount} pages total` : ''}. Split files remain individually downloadable and available in one ZIP.`}</small>
            </div>
            <button type="button" className={pdfSplit.enabled ? 'enabled' : ''} onClick={() => updatePdfSplit({ enabled: !pdfSplit.enabled })}>
              {pdfSplit.enabled ? <CircleCheck /> : <Scissors />}
              {pdfSplit.enabled ? (isZh ? '已启用拆分' : 'Splitting enabled') : (isZh ? '启用拆分' : 'Enable splitting')}
            </button>
          </header>

          {pdfSplit.enabled && (
            <div className="pdf-split-settings-v45">
              <div className="pdf-split-modes-v45">
                <button type="button" className={pdfSplit.mode === 'each_page' ? 'active' : ''} onClick={() => updatePdfSplit({ mode: 'each_page' })}>
                  {pdfSplit.mode === 'each_page' && <Check />}
                  <span><b>{isZh ? '按单页拆分' : 'Split every page'}</b><small>{isZh ? '第 1 页、第 2 页……分别生成独立 PDF' : 'Create a separate PDF for page 1, page 2, and so on'}</small></span>
                </button>
                <button type="button" className={pdfSplit.mode === 'ranges' ? 'active' : ''} onClick={() => updatePdfSplit({ mode: 'ranges' })}>
                  {pdfSplit.mode === 'ranges' && <Check />}
                  <span><b>{isZh ? '按指定页码范围拆分' : 'Split by page ranges'}</b><small>{isZh ? '每个范围生成一个独立 PDF，并保持输入顺序' : 'Create one PDF per range and preserve the entered order'}</small></span>
                </button>
              </div>
              {pdfSplit.mode === 'ranges' && (
                <label className={`pdf-split-range-v45 ${invalidSplitRange ? 'invalid' : ''}`}>
                  <span>{isZh ? '页码范围' : 'Page ranges'}</span>
                  <input
                    type="text"
                    value={pdfSplit.ranges}
                    onChange={event => updatePdfSplit({ ranges: event.target.value })}
                    placeholder="1-3,4,5-7"
                    maxLength={5000}
                  />
                  <small>{invalidSplitRange ? (isZh ? `页码设置无效：请使用 1-3,4,5-7；页码不能重复${smallestPdfPageCount ? `，且不能超过最短 PDF 的 ${smallestPdfPageCount} 页` : ''}。` : `Invalid ranges. Use 1-3,4,5-7; pages cannot repeat${smallestPdfPageCount ? ` or exceed the shortest PDF (${smallestPdfPageCount} pages)` : ''}.`) : (isZh ? `将生成 ${parsedSplitRanges.length || 0} 个拆分文件/每个 PDF；失败时不会保留部分输出，也不会删除原文件。` : `${parsedSplitRanges.length || 0} split file(s) per PDF. Failures keep no partial output and never delete the source.`)}</small>
                </label>
              )}
              <SwitchRow checked={pdfSplit.keep_original} label={isZh ? '同时保留完整 PDF' : 'Also keep the complete PDF'} onChange={value => updatePdfSplit({ keep_original: value })} />
              <p className="pdf-split-naming-v45"><FileOutput />{isZh ? '文件名示例：合同_page_001.pdf、合同_pages_004-006.pdf；交付页按页码与输入顺序排列。' : 'Naming example: contract_page_001.pdf and contract_pages_004-006.pdf. Delivery order follows page and range order.'}</p>
            </div>
          )}
        </section>
      )}

      <section className="plan-final-summary-v45">
        <header><CircleCheck /><div><b>{isZh ? '本次任务将这样执行' : 'This task will run as follows'}</b><small>{isZh ? '创建前最后确认，使用客户可理解的名称，不显示内部代码。' : 'Final review with customer-facing names rather than internal codes.'}</small></div></header>
        <div>
          <span><small>{isZh ? '上传 / 实际处理' : 'Uploaded / actual'}</small><b>{uploadedCount} / {actualCount} {isZh ? '个文件' : 'files'}</b></span>
          <span><small>{isZh ? '页数 / 工作表' : 'Pages / sheets'}</small><b>{pageCount || '—'} / {sheetCount || '—'}</b></span>
          <span><small>{isZh ? '处理能力' : 'Capabilities'}</small><b>{selectedCapabilityLabels.join(' + ') || (isZh ? '标准处理' : 'Standard processing')}</b></span>
          <span><small>{isZh ? '语言' : 'Languages'}</small><b>{languageText}</b></span>
          <span><small>{isZh ? '输出' : 'Output'}</small><b>{outputText}</b></span>
          {hasPdfInput && <span><small>{isZh ? 'PDF 拆分' : 'PDF splitting'}</small><b>{splitText}</b></span>}
          {translationEnabled && languageMode === 'bilingual' && <span><small>{isZh ? '双语布局' : 'Bilingual layout'}</small><b>{BILINGUAL_LAYOUTS.find(item => item[0] === selectedLayoutId)?.[isZh ? 1 : 2]}</b></span>}
        </div>
      </section>

      <button type="button" className={`plan-advanced-toggle-v44 ${advancedOpen ? 'open' : ''}`} onClick={() => setAdvancedOpen(value => !value)}>
        <span><Settings2 />{isZh ? '高级设置' : 'Advanced settings'}<small>{isZh ? '普通用户无需打开' : 'Most users do not need this'}</small></span>
        <ChevronDown />
      </button>

      {advancedOpen && (
        <section className="plan-advanced-v44">
          <nav>
            {[
              ['document', FileOutput, '文档与 PDF', 'Documents & PDF'],
              ['ocr', ImageIcon, 'OCR 与图片', 'OCR & images'],
              ['table', Table2, '表格与 Excel', 'Tables & Excel'],
              ['engine', Database, 'AI、性能与缓存', 'AI, performance & cache'],
            ].map(([id, Icon, zh, en]) => (
              <button type="button" className={advancedSection === id ? 'active' : ''} key={id} onClick={() => setAdvancedSection(id)}><Icon />{isZh ? zh : en}</button>
            ))}
          </nav>
          <div className="plan-advanced-content-v44">
            {advancedSection === 'document' && <><SwitchRow checked={outputOptions.preserve_layout !== false} label={isZh ? '保持原始版式' : 'Preserve original layout'} onChange={value => setOption('preserve_layout', value)} /><SwitchRow checked={outputOptions.preserve_links !== false} label={isZh ? '保留超链接' : 'Preserve hyperlinks'} onChange={value => setOption('preserve_links', value)} /><SwitchRow checked={!!outputOptions.preserve_comments} label={isZh ? '保留批注' : 'Preserve comments'} onChange={value => setOption('preserve_comments', value)} /></>}
            {advancedSection === 'ocr' && <><SwitchRow checked={outputOptions.preserve_images !== false} label={isZh ? '保留原始图片' : 'Preserve source images'} onChange={value => setOption('preserve_images', value)} /><div className="engine-managed-v44"><ScanText /><span><b>{isZh ? 'OCR 语言' : 'OCR language'}</b><small>{(recommendation?.ocr_languages || analysis?.ocr_languages || []).join(' / ') || (isZh ? '由真实文件分析自动选择' : 'Selected from file analysis')}</small></span><em>{recommendation?.ocr_available === false ? (isZh ? '暂不可用' : 'Unavailable') : (isZh ? '平台自动' : 'Automatic')}</em></div></>}
            {advancedSection === 'table' && <><SwitchRow checked={outputOptions.preserve_formulas !== false} label={isZh ? '保留公式' : 'Preserve formulas'} onChange={value => setOption('preserve_formulas', value)} /><SwitchRow checked={outputOptions.preserve_merged_cells !== false} label={isZh ? '保持合并单元格' : 'Preserve merged cells'} onChange={value => setOption('preserve_merged_cells', value)} /><SwitchRow checked={outputOptions.preserve_cell_coordinates !== false} label={isZh ? '保持单元格坐标' : 'Preserve cell coordinates'} onChange={value => setOption('preserve_cell_coordinates', value)} /><SwitchRow checked={outputOptions.protect_plc_codes !== false} label={isZh ? '保护技术编号、变量名和型号' : 'Protect technical identifiers, variables and models'} onChange={value => setOption('protect_plc_codes', value)} /></>}
            {advancedSection === 'engine' && <div className="engine-managed-grid-v44">{[[Bot, 'AI Provider', recommendation?.primary_provider ? `${recommendation.primary_provider}${recommendation.backup_provider ? ` → ${recommendation.backup_provider}` : ''}` : (isZh ? '平台自动路由' : 'Platform auto routing')], [Gauge, isZh ? '性能与并发' : 'Performance & concurrency', isZh ? '由任务规模自动决定' : 'Adapted to job size'], [Database, isZh ? '缓存策略' : 'Cache policy', isZh ? '由处理引擎自动管理' : 'Managed by the processing engine'], [ShieldCheck, isZh ? '质量守护' : 'Quality guard', isZh ? '始终启用' : 'Always enabled']].map(([Icon, title, value]) => <div key={title}><Icon /><span><b>{title}</b><small>{value}</small></span></div>)}</div>}
          </div>
        </section>
      )}

      <section className="plan-instructions-v44">
        <header><Bot /><div><b>{isZh ? '业务要求（可选）' : 'Business instructions (optional)'}</b><small>{isZh ? '只填写 AI 无法自动判断的特殊要求' : 'Add only requirements AI cannot infer'}</small></div></header>
        <div>{instructionTemplates.map(([label, text]) => <button type="button" key={label} onClick={() => applyInstruction(text)}>{label}</button>)}</div>
        <textarea value={form.requirements} onChange={event => { setForm(current => ({ ...current, requirements: event.target.value })); markChanged(); }} placeholder={isZh ? '例如：品牌名称保持英文；法律条款使用公司术语库；日志中隐藏证件号码。' : 'Example: Keep brand names in English; use the company legal glossary; hide identifiers in logs.'} />
        <p><ShieldCheck />{isZh ? '企业质量守护自动检查漏译、公式、文件结构和术语一致性。' : 'Enterprise Quality Guard checks missing translations, formulas, file structure and terminology.'}</p>
      </section>

      {error && <div className="plan-error-v44"><AlertTriangle />{error}</div>}

      <section className="plan-confirm-v44">
        <div className="plan-confirm-actions-v45">
          <button type="button" className="plan-back-button-v45" onClick={() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); onBack(); }}><ArrowLeft />{isZh ? '返回分析报告' : 'Back to analysis'}</button>
          <button type="button" className={planConfirmed ? 'confirmed' : ''} disabled={!canConfirm} onClick={() => setPlanConfirmed(value => !value)}>
            {planConfirmed ? <CircleCheck /> : <Check />}
            {planConfirmed ? (isZh ? '方案已确认，可以创建任务' : 'Plan confirmed — ready to create') : (isZh ? '确认以上方案' : 'Confirm this plan')}
          </button>
        </div>
        <small>{isZh ? '确认后才会开放创建任务；此时仍未开始处理文件，也不会扣除 Credits。' : 'The task button is enabled only after confirmation. Processing and charging have not started.'}</small>
      </section>

      <footer className="plan-submit-v44">
        <div>
          <span><b>≈ {estimatedSeconds}s</b><small>{isZh ? '预计耗时' : 'Estimated time'}</small></span>
          <span><b>{estimatedQuality}%</b><small>{isZh ? '预计质量' : 'Quality target'}</small></span>
          <span><b>{estimatedCredits}</b><small>{isZh ? 'Credits 预估' : 'Credits estimate'}</small></span>
        </div>
        <button type="submit" disabled={submitting || !canConfirm || !planConfirmed}>
          {submitting ? t.creating : (isZh ? '创建任务并进入队列' : 'Create task and open queue')}<ArrowRight />
        </button>
        <small><ShieldCheck />{isZh ? '平台会在任务创建前再次检查 AI/OCR 服务；不可用时不会创建任务或扣除 Credits。' : 'The platform rechecks AI/OCR before creation; unavailable services do not create or charge a task.'}</small>
      </footer>
    </section>
  );
}
