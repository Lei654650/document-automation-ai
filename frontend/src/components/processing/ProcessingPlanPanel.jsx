import { useMemo, useState } from 'react';
import {
  AlertTriangle,
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
  Settings2,
  ShieldCheck,
  Sparkles,
  Table2,
} from 'lucide-react';

const LANGUAGE_GROUPS = [
  {
    id: 'asia',
    zh: '亚洲',
    en: 'Asia',
    items: [
      ['zh', '中文（简体）'],
      ['zh-TW', '中文（繁体）'],
      ['en', 'English'],
      ['vi', 'Tiếng Việt'],
      ['th', 'ไทย'],
      ['id', 'Bahasa Indonesia'],
      ['ms', 'Bahasa Melayu'],
      ['ja', '日本語'],
      ['ko', '한국어'],
    ],
  },
  {
    id: 'europe',
    zh: '欧洲',
    en: 'Europe',
    items: [
      ['de', 'Deutsch'],
      ['fr', 'Français'],
      ['es', 'Español'],
      ['it', 'Italiano'],
      ['pt', 'Português'],
      ['nl', 'Nederlands'],
      ['pl', 'Polski'],
    ],
  },
];

const OUTPUT_META = {
  original: { zh: '保留原格式', en: 'Preserve source', group: 'source' },
  docx: { zh: 'Word', en: 'Word', group: 'office' },
  xlsx: { zh: 'Excel', en: 'Excel', group: 'office' },
  pptx: { zh: 'PowerPoint', en: 'PowerPoint', group: 'office' },
  pdf: { zh: 'PDF', en: 'PDF', group: 'pdf' },
  csv: { zh: 'CSV', en: 'CSV', group: 'data' },
  md: { zh: 'Markdown', en: 'Markdown', group: 'web' },
  html: { zh: 'HTML', en: 'HTML', group: 'web' },
  txt: { zh: 'TXT', en: 'TXT', group: 'web' },
  json: { zh: 'JSON', en: 'JSON', group: 'data' },
  xml: { zh: 'XML', en: 'XML', group: 'data' },
  images: { zh: '图片', en: 'Images', group: 'image' },
};

const OUTPUT_GROUPS = [
  ['source', '源文件', 'Source'],
  ['office', 'Office', 'Office'],
  ['pdf', 'PDF', 'PDF'],
  ['data', '结构化数据', 'Structured data'],
  ['web', '文本与网页', 'Text & web'],
  ['image', '图片', 'Images'],
];

const LAYOUTS = [
  ['auto', 'AI 自动推荐', 'AI recommended', '系统根据文件结构和行业自动选择'],
  ['target-only', '仅输出译文', 'Translation only', '只交付目标语言内容'],
  ['vertical', '双语上下', 'Bilingual stacked', '原文与译文上下对应'],
  ['columns', '双语左右', 'Bilingual side-by-side', '原文与译文左右分列'],
  ['inline', '双语同行', 'Bilingual inline', '原文与译文同行对照'],
  ['publishing', '出版布局', 'Publishing layout', '适合手册、报告和正式出版'],
  ['industrial', '工业布局', 'Industrial layout', '适合表格、标签和技术编号'],
];

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
  ['markdown', FileOutput, 'Markdown', 'Markdown'],
  ['html', FileOutput, 'HTML', 'HTML'],
  ['json', Database, 'JSON', 'JSON'],
  ['csv', Table2, 'CSV', 'CSV'],
  ['xml', Database, 'XML', 'XML'],
  ['office', FileOutput, 'Office', 'Office'],
];

const FORMAT_CAPABILITIES = {
  markdown: ['md'], html: ['html'], json: ['json'], csv: ['csv'], xml: ['xml'],
  office: ['docx', 'xlsx', 'pptx'],
};

function SwitchRow({ checked, label, onChange }) {
  return (
    <label className="plan-switch-row-v44">
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
      <span><i />{label}</span>
    </label>
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
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedSection, setAdvancedSection] = useState('document');

  const markChanged = () => setPlanConfirmed(false);
  const toggleList = (id, values, setter) => {
    setter(values.includes(id) ? values.filter(item => item !== id) : [...values, id]);
    markChanged();
  };
  const toggleCapability = id => {
    const active = services.includes(id);
    setServices(current => {
      const next = active ? current.filter(item => item !== id) : [...current, id];
      if (!active && FORMAT_CAPABILITIES[id] && !next.includes('conversion')) next.push('conversion');
      return [...new Set(next)];
    });
    if (!active && FORMAT_CAPABILITIES[id]) {
      setOutputFormats(current => [...new Set([...current, ...FORMAT_CAPABILITIES[id]])]);
    }
    markChanged();
  };
  const setOption = (key, value) => {
    setOutputOptions(current => ({ ...current, [key]: value }));
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
  const conversionEnabled = services.some(id => id === 'conversion' || id === 'pdf_rebuild' || Object.prototype.hasOwnProperty.call(FORMAT_CAPABILITIES, id));
  const sourceLanguages = recommendation?.detected_languages || [];
  const suggestedTargets = recommendation?.suggested_target_languages || [];

  const setTranslationDecision = enabled => {
    setServices(current => {
      const next = current.filter(item => item !== 'translation');
      return enabled ? [...next, 'translation'] : next;
    });
    if (!enabled) setTranslationTargets([]);
    setPlanConfirmed(false);
  };
  const languageMode = outputOptions.language_mode || (translationTargets.length > 1 ? 'multiple' : 'single');
  const setLanguageMode = mode => {
    setOutputOptions(current => ({
      ...current,
      language_mode: mode,
      bilingual_layout: mode === 'bilingual'
        ? (current.bilingual_layout === 'target-only' ? 'auto' : current.bilingual_layout || 'auto')
        : 'target-only',
    }));
    if (mode !== 'multiple') setTranslationTargets(current => current.slice(0, 1));
    markChanged();
  };

  const outputGroups = OUTPUT_GROUPS.map(([id, zh, en]) => ({
    id,
    label: isZh ? zh : en,
    formats: compatibleFormats.filter(format => OUTPUT_META[format]?.group === id),
  })).filter(group => group.formats.length);

  const missingTranslationTarget = translationEnabled && translationTargets.length === 0;
  const missingOutput = conversionEnabled && outputFormats.length === 0;
  const canConfirm = files.length > 0
    && analysisReady
    && !aiAnalyzing
    && !hasArchiveErrors
    && !missingTranslationTarget
    && !missingOutput;

  const selectedCapabilityLabels = useMemo(() => {
    const map = Object.fromEntries(SERVICES.map(([id,, zh, en]) => [id, isZh ? zh : en]));
    if (translationEnabled) map.translation = isZh ? '文档翻译' : 'Document translation';
    return services.map(id => map[id] || id);
  }, [services, translationEnabled, isZh]);

  const recommendationLabel = recommendation
    ? isZh ? '真实分析方案' : 'Analyzed recommendation'
    : isZh ? '安全默认方案' : 'Safe fallback plan';

  const instructionTemplates = isZh
    ? [
        ['保持原版式', '保持原始版式、图片、表格、分页和字体层级。'],
        ['术语一致', '使用 AI 识别行业的专业术语，并保持全文术语一致。'],
        ['保护标识', '品牌、型号、编号、公式、变量和专有名词不要翻译。'],
        ['双语交付', '原文与译文必须清晰对应，并使用当前选择的双语布局。'],
      ]
    : [
        ['Preserve layout', 'Preserve layout, images, tables, pagination and typography hierarchy.'],
        ['Consistent terms', 'Use terminology from the detected industry consistently throughout the document.'],
        ['Protect identifiers', 'Do not translate brands, models, codes, formulas, variables or proper nouns.'],
        ['Bilingual delivery', 'Keep source and translation clearly aligned using the selected bilingual layout.'],
      ];

  return (
    <section className="processing-plan-v44" id="processing-plan-confirmation">
      <header className="processing-plan-head-v44">
        <div>
          <span><Settings2 /></span>
          <div>
            <small>{isZh ? '第 5 步 · 用户确认' : 'Step 5 · User confirmation'}</small>
            <h2>{isZh ? '请确认翻译需求、处理能力与最终输出' : 'Confirm translation, capabilities and final outputs'}</h2>
            <p>{isZh ? 'AI 已完成文件分析，但不会替您决定目标语言。确认后才可创建任务。' : 'AI analyzed the files, but it will not choose a target language for you. Confirm before creating the task.'}</p>
          </div>
        </div>
        <em><Sparkles />{recommendationLabel}</em>
      </header>

      <section className="translation-decision-v45">
        <header>
          <div>
            <small>{isZh ? '第一步' : 'Step one'}</small>
            <b>{isZh ? '本次任务是否需要翻译？' : 'Does this task need translation?'}</b>
            <p>{isZh ? `已识别源语言：${sourceLanguages.join(' / ') || '待处理时确认'}。系统不会默认选择中文或英文。` : `Detected source language: ${sourceLanguages.join(' / ') || 'confirm during processing'}. No target language is assumed.`}</p>
          </div>
          <Languages />
        </header>
        <div>
          <button type="button" className={translationEnabled ? 'active' : ''} onClick={() => setTranslationDecision(true)}>
            {translationEnabled && <Check />}
            <span><b>{isZh ? '需要翻译' : 'Translation required'}</b><small>{isZh ? '下一步选择一个或多个目标语言' : 'Choose one or more target languages next'}</small></span>
          </button>
          <button type="button" className={!translationEnabled ? 'active' : ''} onClick={() => setTranslationDecision(false)}>
            {!translationEnabled && <Check />}
            <span><b>{isZh ? '无需翻译' : 'No translation'}</b><small>{isZh ? '仅执行格式、整理、分析或 OCR' : 'Run formatting, cleanup, analysis or OCR only'}</small></span>
          </button>
        </div>
        {translationEnabled && suggestedTargets.length > 0 && (
          <p className="translation-suggestion-v45"><Sparkles />{isZh ? `AI 建议优先考虑：${suggestedTargets.join(' / ')}，仍需由您点击确认。` : `AI suggests considering: ${suggestedTargets.join(' / ')}. You still need to select it.`}</p>
        )}
      </section>

      <div className="processing-plan-grid-v44">
        <section className="plan-block-v44 capabilities">
          <header><div><b>{isZh ? '处理能力' : 'Processing capabilities'}</b><small>{isZh ? '可按任务需要增减' : 'Adjust for this job'}</small></div><strong>{services.length}</strong></header>
          <div className="plan-capability-grid-v44">
            {SERVICES.map(([id, Icon, zh, en]) => {
              const active = services.includes(id);
              return (
                <button
                  type="button"
                  className={active ? 'active' : ''}
                  key={id}
                  onClick={() => toggleCapability(id)}
                >
                  <Icon /><span>{isZh ? zh : en}</span>{active && <Check />}
                </button>
              );
            })}
          </div>
        </section>

        {translationEnabled && (
          <section className="plan-block-v44 languages">
            <header><div><b>{isZh ? '目标语言' : 'Target languages'}</b><small>{isZh ? '必须由用户确认，可多选' : 'User confirmation required · multiple allowed'}</small></div><Globe2 /></header>
            <div className="language-mode-v45">
              {[
                ['single', isZh ? '单语言' : 'Single language'],
                ['multiple', isZh ? '多语言' : 'Multiple languages'],
                ['bilingual', isZh ? '双语输出' : 'Bilingual output'],
              ].map(([id, label]) => <button type="button" key={id} className={languageMode === id ? 'active' : ''} onClick={() => setLanguageMode(id)}>{languageMode === id && <Check />}{label}</button>)}
            </div>
            <div className="language-regions-v44">
              {LANGUAGE_GROUPS.map(group => (
                <div key={group.id}>
                  <span>{isZh ? group.zh : group.en}</span>
                  <div>
                    {group.items.map(([id, label]) => (
                      <button
                        type="button"
                        className={translationTargets.includes(id) ? 'active' : ''}
                        key={id}
                        onClick={() => languageMode === 'multiple' ? toggleList(id, translationTargets, setTranslationTargets) : (setTranslationTargets([id]), markChanged())}
                      >
                        {translationTargets.includes(id) && <Check />}{label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {missingTranslationTarget && <p className="plan-inline-warning-v45"><AlertTriangle />{isZh ? '请选择至少一个目标语言。' : 'Select at least one target language.'}</p>}
          </section>
        )}

        {conversionEnabled && (
          <section className="plan-block-v44 outputs">
            <header><div><b>{isZh ? '最终输出格式' : 'Final output formats'}</b><small>{isZh ? '支持多选，只显示真实兼容格式' : 'Multiple selection · compatible formats only'}</small></div><FileOutput /></header>
            <div className="output-groups-v44">
              {outputGroups.map(group => (
                <div key={group.id}>
                  <span>{group.label}</span>
                  <div>
                    {group.formats.map(format => (
                      <button
                        type="button"
                        className={outputFormats.includes(format) ? 'active' : ''}
                        key={format}
                        onClick={() => toggleList(format, outputFormats, setOutputFormats)}
                      >
                        {outputFormats.includes(format) && <Check />}
                        {isZh ? OUTPUT_META[format].zh : OUTPUT_META[format].en}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {missingOutput && <p className="plan-inline-warning-v45"><AlertTriangle />{isZh ? '请选择至少一个输出格式。' : 'Select at least one output format.'}</p>}
          </section>
        )}

        {translationEnabled && (
          <section className="plan-block-v44 layout">
            <header><div><b>{isZh ? '翻译输出布局' : 'Translation output layout'}</b><small>{isZh ? '仅在启用翻译时显示' : 'Shown only when translation is enabled'}</small></div><Languages /></header>
            <div className="layout-options-v44">
              {LAYOUTS.map(([id, zh, en, description]) => (
                <button
                  type="button"
                  className={(outputOptions.bilingual_layout || 'auto') === id ? 'active' : ''}
                  key={id}
                  onClick={() => setOption('bilingual_layout', id)}
                >
                  <i>{(outputOptions.bilingual_layout || 'auto') === id && <Check />}</i>
                  <span><b>{isZh ? zh : en}</b><small>{isZh ? description : ({
                    auto: 'Let AI choose from document structure',
                    'target-only': 'Deliver the target language only',
                    vertical: 'Source and translation stacked',
                    columns: 'Source and translation in columns',
                    inline: 'Source and translation on the same line',
                    publishing: 'For manuals, reports and publishing',
                    industrial: 'For tables, labels and technical identifiers',
                  })[id]}</small></span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <section className="plan-final-summary-v45">
        <header><CircleCheck /><div><b>{isZh ? '本次任务将这样执行' : 'This task will run as follows'}</b><small>{isZh ? '创建前最后确认，不再显示模糊的推荐结果。' : 'Final review before creation, with no ambiguous recommendation.'}</small></div></header>
        <div>
          <span><small>{isZh ? '输入' : 'Input'}</small><b>{files.length} {isZh ? '个文件' : 'files'}</b></span>
          <span><small>{isZh ? '能力' : 'Capabilities'}</small><b>{selectedCapabilityLabels.join(' + ') || (isZh ? '标准处理' : 'Standard processing')}</b></span>
          <span><small>{isZh ? '语言' : 'Languages'}</small><b>{translationEnabled ? translationTargets.join(' / ') || (isZh ? '待选择' : 'Not selected') : (isZh ? '不翻译' : 'No translation')}</b></span>
          <span><small>{isZh ? '输出' : 'Outputs'}</small><b>{conversionEnabled ? outputFormats.map(id => OUTPUT_META[id]?.[isZh ? 'zh' : 'en'] || id).join(' / ') || (isZh ? '待选择' : 'Not selected') : (isZh ? '保留原格式' : 'Preserve source')}</b></span>
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
              <button type="button" className={advancedSection === id ? 'active' : ''} key={id} onClick={() => setAdvancedSection(id)}>
                <Icon />{isZh ? zh : en}
              </button>
            ))}
          </nav>
          <div className="plan-advanced-content-v44">
            {advancedSection === 'document' && (
              <>
                <SwitchRow checked={outputOptions.preserve_layout !== false} label={isZh ? '保持原始版式' : 'Preserve original layout'} onChange={value => setOption('preserve_layout', value)} />
                <SwitchRow checked={outputOptions.preserve_links !== false} label={isZh ? '保留超链接' : 'Preserve hyperlinks'} onChange={value => setOption('preserve_links', value)} />
                <SwitchRow checked={!!outputOptions.preserve_comments} label={isZh ? '保留批注' : 'Preserve comments'} onChange={value => setOption('preserve_comments', value)} />
              </>
            )}
            {advancedSection === 'ocr' && (
              <>
                <SwitchRow checked={outputOptions.preserve_images !== false} label={isZh ? '保留原始图片' : 'Preserve source images'} onChange={value => setOption('preserve_images', value)} />
                <div className="engine-managed-v44"><ScanText /><span><b>{isZh ? 'OCR 语言' : 'OCR language'}</b><small>{isZh ? '由真实文件分析结果自动选择' : 'Selected from the actual file analysis'}</small></span><em>{isZh ? 'AI 自动' : 'Automatic'}</em></div>
              </>
            )}
            {advancedSection === 'table' && (
              <>
                <SwitchRow checked={outputOptions.preserve_formulas !== false} label={isZh ? '保留公式' : 'Preserve formulas'} onChange={value => setOption('preserve_formulas', value)} />
                <SwitchRow checked={outputOptions.preserve_merged_cells !== false} label={isZh ? '保持合并单元格' : 'Preserve merged cells'} onChange={value => setOption('preserve_merged_cells', value)} />
                <SwitchRow checked={outputOptions.preserve_cell_coordinates !== false} label={isZh ? '保持单元格坐标' : 'Preserve cell coordinates'} onChange={value => setOption('preserve_cell_coordinates', value)} />
                <SwitchRow checked={outputOptions.protect_plc_codes !== false} label={isZh ? '保护技术编号、变量名和型号' : 'Protect technical identifiers, variables and models'} onChange={value => setOption('protect_plc_codes', value)} />
              </>
            )}
            {advancedSection === 'engine' && (
              <div className="engine-managed-grid-v44">
                {[
                  [Bot, 'AI Provider', isZh ? '按可用性自动路由' : 'Routed by availability'],
                  [Gauge, isZh ? '性能与并发' : 'Performance & concurrency', isZh ? '由任务规模自动决定' : 'Adapted to job size'],
                  [Database, isZh ? '缓存策略' : 'Cache policy', isZh ? '由处理引擎自动管理' : 'Managed by the processing engine'],
                  [ShieldCheck, isZh ? '质量守护' : 'Quality guard', isZh ? '始终启用' : 'Always enabled'],
                ].map(([Icon, title, value]) => <div key={title}><Icon /><span><b>{title}</b><small>{value}</small></span></div>)}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="plan-instructions-v44">
        <header><Bot /><div><b>{isZh ? '业务要求（可选）' : 'Business instructions (optional)'}</b><small>{isZh ? '只填写 AI 无法自动判断的特殊要求' : 'Add only requirements AI cannot infer'}</small></div></header>
        <div>{instructionTemplates.map(([label, text]) => <button type="button" key={label} onClick={() => applyInstruction(text)}>{label}</button>)}</div>
        <textarea
          value={form.requirements}
          onChange={event => {
            setForm(current => ({ ...current, requirements: event.target.value }));
            markChanged();
          }}
          placeholder={isZh ? '例如：品牌名称保持英文；法律条款使用公司术语库；交付中英双语。' : 'Example: Keep brand names in English; use the company legal glossary; deliver bilingual output.'}
        />
        <p><ShieldCheck />{isZh ? '企业质量守护自动检查漏译、公式、文件结构和术语一致性。' : 'Enterprise Quality Guard checks missing translations, formulas, file structure and terminology.'}</p>
      </section>

      {error && <div className="plan-error-v44"><AlertTriangle />{error}</div>}

      <section className="plan-confirm-v44">
        <button type="button" className={planConfirmed ? 'confirmed' : ''} disabled={!canConfirm} onClick={() => setPlanConfirmed(value => !value)}>
          {planConfirmed ? <CircleCheck /> : <Check />}
          {planConfirmed
            ? isZh ? '方案已确认，可以创建任务' : 'Plan confirmed — ready to create'
            : isZh ? '确认以上方案' : 'Confirm this plan'}
        </button>
        <small>{isZh ? '确认后才会开放创建任务；此时仍未开始处理文件。' : 'The task button is enabled only after confirmation. Processing has not started yet.'}</small>
      </section>

      <footer className="plan-submit-v44">
        <div>
          <span><b>≈ {estimatedSeconds}s</b><small>{isZh ? '预计耗时' : 'Estimated time'}</small></span>
          <span><b>{estimatedQuality}%</b><small>{isZh ? '预计质量' : 'Quality target'}</small></span>
          <span><b>{estimatedCredits}</b><small>{isZh ? 'Credits 预估' : 'Credits estimate'}</small></span>
        </div>
        <button type="submit" disabled={submitting || !files.length || hasArchiveErrors || !planConfirmed}>
          {submitting ? t.creating : (isZh ? '创建任务并进入队列' : 'Create task and open queue')}<ArrowRight />
        </button>
        <small><ShieldCheck />{isZh ? '创建任务后会立即写入工作台和任务队列，并按实际任务规则结算 Credits。' : 'The task appears in the workspace and queue immediately, with credits settled by the actual job rules.'}</small>
      </footer>
    </section>
  );
}
