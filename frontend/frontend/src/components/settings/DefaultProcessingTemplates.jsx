import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, FileText, ScanText, Sparkles, Table2 } from 'lucide-react';
import './DefaultProcessingTemplates.css';

export default function DefaultProcessingTemplates({ active, prefs, update, L }) {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    const content = document.querySelector('.settings-content');
    setTarget(content);
    document.body.classList.toggle('v45-processing-template-active', Boolean(active));
    return () => document.body.classList.remove('v45-processing-template-active');
  }, [active]);

  const templates = [
    {
      id: 'ai-auto',
      icon: Sparkles,
      title: L('AI 自动处理', 'AI automatic', 'AI tự động'),
      description: L('AI 分析文件、行业和内容后自动推荐能力与输出。', 'AI analyses the files and recommends capabilities and output.', 'AI phân tích tệp và đề xuất xử lý.'),
      badge: L('推荐', 'Recommended', 'Đề xuất'),
      values: {
        defaultCapability: 'auto',
        targetLanguage: 'auto',
        outputFormat: 'original',
        defaultIndustry: 'auto',
        qualityMode: 'balanced',
        bilingualLayout: 'auto',
      },
    },
    {
      id: 'multilingual',
      icon: FileText,
      title: L('多语言文档', 'Multilingual document', 'Tài liệu đa ngôn ngữ'),
      description: L('适合合同、手册、报告和企业资料的高质量翻译。', 'High-quality translation for contracts, manuals and reports.', 'Dịch chất lượng cao cho hợp đồng và báo cáo.'),
      values: {
        defaultCapability: 'translation',
        targetLanguage: 'en',
        outputFormat: 'original',
        defaultIndustry: 'general',
        qualityMode: 'enterprise',
        bilingualLayout: 'vertical',
      },
    },
    {
      id: 'ocr-archive',
      icon: ScanText,
      title: L('扫描件与档案', 'Scans & archives', 'Bản quét & lưu trữ'),
      description: L('优先 OCR、版式保留和交付前质量检查。', 'Prioritizes OCR, layout retention and delivery validation.', 'Ưu tiên OCR và giữ bố cục.'),
      values: {
        defaultCapability: 'ocr',
        targetLanguage: 'auto',
        outputFormat: 'pdf',
        defaultIndustry: 'general',
        qualityMode: 'enterprise',
        bilingualLayout: 'target-only',
      },
    },
    {
      id: 'structured-data',
      icon: Table2,
      title: L('表格与结构化数据', 'Tables & structured data', 'Bảng & dữ liệu có cấu trúc'),
      description: L('适合 Excel、CSV、清洗、整理和结构化导出。', 'For Excel, CSV, cleanup and structured exports.', 'Cho Excel, CSV và dữ liệu có cấu trúc.'),
      values: {
        defaultCapability: 'data_cleanup',
        targetLanguage: 'auto',
        outputFormat: 'xlsx',
        defaultIndustry: 'general',
        qualityMode: 'balanced',
        bilingualLayout: 'auto',
      },
    },
  ];

  const selectTemplate = template => {
    update('processingTemplate', template.id);
    Object.entries(template.values).forEach(([key, value]) => update(key, value));
  };

  if (!active || !target) return null;

  return createPortal((
    <article className="settings-panel-card default-processing-templates-v45">
      <header>
        <div>
          <span>{L('默认处理模板', 'DEFAULT PROCESSING TEMPLATE', 'MẪU XỬ LÝ MẶC ĐỊNH')}</span>
          <h2>{L('让 AI 先判断，用户只在需要时覆盖', 'Let AI decide first; override only when needed', 'Để AI quyết định trước')}</h2>
          <p>{L('模板只决定新任务的初始方案，不会限制任务页面的调整。', 'Templates set the starting plan for new tasks without limiting task-level changes.', 'Mẫu chỉ đặt cấu hình ban đầu cho tác vụ mới.')}</p>
        </div>
        <Sparkles />
      </header>
      <section className="processing-template-grid-v45">
        {templates.map(template => {
          const Icon = template.icon;
          const active = (prefs.processingTemplate || 'ai-auto') === template.id;
          return (
            <button
              type="button"
              className={active ? 'active' : ''}
              key={template.id}
              onClick={() => selectTemplate(template)}
            >
              <span className="processing-template-icon-v45"><Icon /></span>
              <span>
                <b>{template.title}</b>
                <small>{template.description}</small>
              </span>
              {template.badge && <em>{template.badge}</em>}
              {active && <i><Check /></i>}
            </button>
          );
        })}
      </section>
      <section className="processing-template-details-v45">
        <div>
          <b>{L('模板默认值', 'Template defaults', 'Giá trị mặc định')}</b>
          <small>{L('这些值会带入“创建任务”，AI 自动模式会根据真实文件继续优化。', 'These values prefill Create task; AI automatic mode keeps adapting to the actual files.', 'Các giá trị được đưa vào tác vụ mới.')}</small>
        </div>
        <div className="processing-template-fields-v45">
          <label>
            <span>{L('处理能力', 'Capability', 'Năng lực')}</span>
            <select value={prefs.defaultCapability || 'auto'} onChange={event => update('defaultCapability', event.target.value)}>
              <option value="auto">{L('AI 自动推荐', 'AI recommended', 'AI đề xuất')}</option>
              <option value="translation">{L('文档翻译', 'Document translation', 'Dịch tài liệu')}</option>
              <option value="ocr">OCR</option>
              <option value="conversion">{L('格式转换', 'Format conversion', 'Chuyển đổi')}</option>
              <option value="data_cleanup">{L('数据整理', 'Data cleanup', 'Làm sạch dữ liệu')}</option>
            </select>
          </label>
          <label>
            <span>{L('目标语言', 'Target language', 'Ngôn ngữ đích')}</span>
            <select value={prefs.targetLanguage || 'auto'} onChange={event => update('targetLanguage', event.target.value)}>
              <option value="auto">{L('按文件自动推荐', 'Recommend from files', 'Đề xuất từ tệp')}</option>
              <option value="zh">中文（简体）</option>
              <option value="zh-TW">中文（繁體）</option>
              <option value="en">English</option>
              <option value="vi">Tiếng Việt</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="pt">Português</option>
            </select>
          </label>
          <label>
            <span>{L('行业', 'Industry', 'Ngành')}</span>
            <select value={prefs.defaultIndustry || 'auto'} onChange={event => update('defaultIndustry', event.target.value)}>
              <option value="auto">{L('AI 自动识别', 'AI detection', 'AI nhận diện')}</option>
              <option value="general">{L('通用', 'General', 'Chung')}</option>
              <option value="manufacturing">{L('制造业', 'Manufacturing', 'Sản xuất')}</option>
              <option value="automotive">{L('汽车', 'Automotive', 'Ô tô')}</option>
              <option value="medical">{L('医疗', 'Medical', 'Y tế')}</option>
              <option value="legal">{L('法律', 'Legal', 'Pháp lý')}</option>
              <option value="education">{L('教育', 'Education', 'Giáo dục')}</option>
              <option value="finance">{L('金融', 'Finance', 'Tài chính')}</option>
              <option value="it">IT</option>
              <option value="energy">{L('能源', 'Energy', 'Năng lượng')}</option>
              <option value="construction">{L('建筑', 'Construction', 'Xây dựng')}</option>
              <option value="logistics">{L('物流', 'Logistics', 'Hậu cần')}</option>
              <option value="electronics">{L('电子', 'Electronics', 'Điện tử')}</option>
            </select>
          </label>
          <label>
            <span>{L('输出布局', 'Output layout', 'Bố cục đầu ra')}</span>
            <select value={prefs.bilingualLayout || 'auto'} onChange={event => update('bilingualLayout', event.target.value)}>
              <option value="auto">{L('AI 自动推荐', 'AI recommended', 'AI đề xuất')}</option>
              <option value="target-only">{L('单语输出', 'Monolingual', 'Một ngôn ngữ')}</option>
              <option value="vertical">{L('双语上下', 'Bilingual vertical', 'Song ngữ dọc')}</option>
              <option value="columns">{L('双语左右', 'Bilingual side by side', 'Song ngữ hai cột')}</option>
              <option value="inline">{L('双语对照', 'Bilingual inline', 'Song ngữ đối chiếu')}</option>
              <option value="publishing">{L('出版布局', 'Publishing layout', 'Bố cục xuất bản')}</option>
              <option value="industrial">{L('工业布局', 'Industrial layout', 'Bố cục công nghiệp')}</option>
            </select>
          </label>
          <label>
            <span>{L('质量等级', 'Quality level', 'Mức chất lượng')}</span>
            <select value={prefs.qualityMode || 'balanced'} onChange={event => update('qualityMode', event.target.value)}>
              <option value="fast">{L('快速', 'Fast', 'Nhanh')}</option>
              <option value="balanced">{L('平衡', 'Balanced', 'Cân bằng')}</option>
              <option value="enterprise">{L('企业级', 'Enterprise', 'Doanh nghiệp')}</option>
            </select>
          </label>
        </div>
      </section>
    </article>
  ), target);
}
