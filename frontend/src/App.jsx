import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight, CircleCheck, CloudUpload, Code2, Archive, BookOpen, BrainCircuit, BarChart3, Factory, Download, FileText, FolderOpen, Languages, LayoutDashboard, Menu, RefreshCw, ScanText, ShieldCheck, Sparkles, Workflow, X, Star, Search, Clock3, Tag, AlertTriangle, Edit3, Trash2, MoreHorizontal, RotateCcw, Grid3X3, Rows3, CheckSquare, Square, ArchiveRestore, Cpu, Bot, Eye, EyeOff, Bell, HelpCircle, Globe2, Camera, Building2, Coins, Activity, UserRound, CreditCard, LockKeyhole, SlidersHorizontal, Plug, Settings2, House, Pause, Play, Octagon, Copy } from 'lucide-react';
import './App.css';
import ProcessingJourney from './components/processing/ProcessingJourney';
import AIAnalysisPanel from './components/processing/AIAnalysisPanel';
import ProcessingPlanPanel from './components/processing/ProcessingPlanPanel';
import TaskStyleOptions from './components/processing/TaskStyleOptions';
import DefaultProcessingTemplates from './components/settings/DefaultProcessingTemplates';
import GeneralSettingsPanel from './components/settings/GeneralSettingsPanel';
import HoverSelect from './components/ui/HoverSelect';
import WorkspaceHeaderTools from './components/workspace/WorkspaceHeaderTools';
import './styles/v44-workspace-experience.css';
import './styles/v45-shared-controls.css';
// Local Vite development must use the same-origin /api path so requests go
// through vite.config.js -> http://127.0.0.1:8000. This prevents a stale
// production VITE_API_BASE value in a local .env from sending auth requests
// to the live site.
const isLocalFrontend = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
const resolveApiBase = () => {
  if (isLocalFrontend) return '';
  const configured = String(
    import.meta.env.VITE_API_BASE_URL
    || import.meta.env.VITE_API_BASE
    || ''
  ).trim().replace(/\/$/, '');
  // Ignore Vercel/example placeholders and recover safely on the official domain.
  if (configured && !/example\.com/i.test(configured)) return configured;
  if (/(^|\.)docai365\.com$/i.test(window.location.hostname)) return 'https://api.docai365.com';
  return '';
};
const API_BASE = resolveApiBase();
const VERSION = '45.0.0';
const authMessage = (detail, zh, status) => {
  const value = String(detail || '').trim();
  if (status === 401 || /incorrect email or password/i.test(value)) return zh ? '邮箱或密码错误，请重新输入。' : 'Incorrect email or password.';
  if (status === 403 || /not active/i.test(value)) return zh ? '该账户当前不可用，请联系管理员。' : 'This account is not active. Please contact an administrator.';
  if (status === 409 || /already exists/i.test(value)) return zh ? '该邮箱已经注册，请直接登录。' : 'This email is already registered. Please sign in.';
  if (status === 429) {
    const seconds = value.match(/(\d+)\s*秒/);
    const minutes = value.match(/(\d+)\s*分钟/);
    if (zh) return value || '验证码发送过于频繁，请稍后再试。';
    if (seconds) return `A code was already sent. Retry in ${seconds[1]} seconds.`;
    if (minutes) return `Send limit reached. Retry in ${minutes[1]} minutes.`;
    return 'Too many attempts. Please try again later.';
  }
  if (status === 503 || /email service|smtp|delivery unavailable|邮件发送|邮件服务|授权码|邮件服务器/i.test(value)) return zh ? value || '邮件服务尚未配置或暂时不可用，请联系管理员。' : 'Email delivery failed. Check the SMTP configuration and try again.';
  if (value && value !== 'Authentication failed' && value !== 'Request failed' && value !== 'Reset failed') return value;
  return zh ? '无法连接服务器，请检查后端是否正常运行后重试。' : 'Unable to reach the server. Check that the backend is running and try again.';
};
const readJson = async response => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};
const downloadAuthenticatedFile = async (url, authToken, fallbackName = 'download') => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  });
  if (!response.ok) {
    const body = await readJson(response);
    throw new Error(body.detail || `Download failed (HTTP ${response.status})`);
  }
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  const filename = decodeURIComponent((match?.[1] || fallbackName).replace(/"/g, ''));
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
};
const I18N = {
  zh: {
    lang: '中文',
    languageLabel: '界面语言',
    platformLabel: '平台',
    workflowLabel: '流程',
    pricingLabel: '价格',
    readyLabel: '准备开始自动化？',
    processingCenterLabel: 'AI 处理中心',
    liveOrderLabel: '订单实时处理',
    workspaceLabel: '企业工作台',
    team: '团队',
    billing: '账单',
    api: 'API',
    serviceOcr: 'OCR 智能识别',
    serviceTranslation: '文档翻译',
    serviceConversion: '格式转换',
    serviceCleanup: '智能数据整理',
    serviceAnalysis: '企业数据分析',
    toolOcrDesc: '识别扫描件、图片和 PDF 中的文字与表格',
    toolTranslationDesc: '多语言翻译并尽量保留原始版式',
    toolConversionDesc: '支持 PDF、Word、Excel、PPT、CSV 与图片转换',
    toolCleanupDesc: '清理、整理并标准化文档数据',
    toolQuality: '质量检查',
    toolQualityDesc: '基于规则检查处理结果与交付文件',
    toolApi: '企业 API',
    toolApiDesc: '把文档处理能力接入企业业务流程',
    stepUpload: '上传',
    stepUnderstand: '理解',
    stepProcess: '处理',
    stepValidate: '检查',
    stepDeliver: '交付',
    demoReady: '已就绪',
    demoDone: '完成',
    demoWaiting: '等待',
    demoProcessing: '处理中',
    demoBilingual: 'Excel + 双语 PDF',
    statusProcessing: '处理中',
    statusCompleted: '已完成',
    statusFailed: '失败',
    langZh: '中文',
    langEn: '英文',
    langVi: '越南语',
    langZhEn: '中英双语',
    langZhVi: '中越双语',
    langOther: '其他语言',
    fmtImages: '图片',
    fmtOriginal: '保持原始版式',
    platform: '平台能力',
    workflow: '处理流程',
    pricing: '价格方案',
    workspace: '企业工作台',
    processNow: '立即处理',
    heroTag: `AI Document Intelligence · Version ${VERSION}`,
    heroTitle1: '让企业文档，',
    heroTitle2: '自动完成。',
    heroDesc: '上传 PDF、Excel、Word、PPT 或图片。AI 自动完成 OCR、翻译、数据提取、格式转换与质量检查。',
    start: '开始处理文档',
    viewWorkspace: '查看企业工作台',
    noInstall: '无需安装',
    isolated: '文件隔离',
    triLang: '中英越支持',
    platformTitle: '一个平台，处理所有企业文档',
    platformDesc: '从文件上传到最终交付，所有能力统一在同一套工作流中。',
    workflowTitle: '从上传到交付，全流程可视化',
    workflowDesc: '不再依赖手工复制、格式调整和重复检查。',
    pricingTitle: '商业套餐与第三方结算中心',
    pricingDesc: '统一管理套餐、订单、AI 点数与第三方安全结算；优先支持 Paddle，并保留 PayPal、Stripe 插件。',
    ctaTitle: '把重复文档工作交给 AI',
    ctaDesc: '从一个文件开始体验，再逐步接入整个企业工作流。',
    freeStart: '免费开始',
    backHome: '返回工作台',
    center: '智能文档处理中心',
    centerDesc: '上传文件并选择目标，系统会自动创建处理任务。',
    drop: '拖拽文件到这里，或点击选择',
    support: '支持 PDF、Word、Excel、PPT、CSV、图片和 ZIP，单文件最大 100MB（大文件自动分片上传）',
    clear: '清空',
    settings: '处理设置',
    selected: '已选择',
    capabilities: '项处理能力',
    targetLang: '目标语言（可多选）',
    outputFormat: '输出格式（可多选）',
    name: '姓名',
    email: '邮箱',
    company: '公司',
    optional: '可选',
    requirements: '处理要求',
    create: '创建任务',
    creating: '正在创建任务，请稍候…',
    secure: '文件采用独立订单空间保存',
    fileRequired: '请先选择至少一个文件。',
    languageRequired: '请选择至少一种目标语言。',
    formatRequired: '请选择至少一种输出格式。',
    contactRequired: '请填写姓名和邮箱。',
    submitFailed: '订单提交失败',
    noOrder: '暂无订单信息',
    backCenter: '返回处理中心',
    processing: '项目正在自动处理',
    completed: '项目处理完成',
    failed: '项目处理失败',
    processingDesc: '页面会自动刷新进度，无需重复提交订单。',
    completedDesc: '系统已完成处理并生成交付文件，请进行项目验收和下载。',
    orderNo: '订单编号',
    currentStatus: '当前状态',
    fileCount: '文件数量',
    deliveryCount: '交付文件',
    items: '个',
    target: '目标语言',
    output: '输出格式',
    liveLog: '实时处理日志',
    delivery: '项目验收与交付',
    deliveryDesc: '请逐个下载并检查文件能否正常打开、内容和格式是否符合要求。',
    noOutput: '处理已完成，但尚未找到交付文件。',
    newProject: '新建处理项目',
    saveOrder: '请保存订单号：',
    dashboardTitle: '企业工作台',
    dashboardDesc: '仅显示真实订单。团队、API、账单和套餐功能将在正式商业化版本中开放。',
    recentOrders: '最近处理记录',
    noRealOrders: '暂无处理记录',
    comingSoon: '即将开放',
    refresh: '刷新',
    footer: '面向企业的 AI 文档识别、翻译、转换与数据自动化平台。',
    taskFlow: '任务处理流程',
    stepPending: '等待',
    stepRunning: '处理中',
    stepCompleted: '完成',
    stepFailed: '失败',
    retryTask: '重新处理',
    taskDuration: '耗时',
    taskMessage: '当前信息',
    analysisLabel: '文档分析器',
    analysisTitle: '文档分析结果',
    analysisComplexity: '复杂度',
    analysisCategory: '文档类别',
    analysisFormats: '文件格式',
    analysisLanguages: '识别语言',
    analysisFiles: '分析文件数',
    analysisWorkflow: '推荐处理流程',
    metric_pages: '页数',
    metric_extractable_text_chars_sample: '可提取文本字符样本',
    metric_likely_scanned: '疑似扫描件',
    metric_encrypted: '是否加密',
    yes: '是',
    no: '否',
    aiSettings: 'AI 翻译设置',
    provider: '翻译服务商',
    apiKey: 'API 密钥',
    model: '模型',
    adminPassword: '管理员密码（本地版可留空）',
    saveSettings: '保存设置',
    testConnection: '测试连接',
    settingsSaved: '翻译设置已保存',
    connectionOk: '连接测试成功',
    settingsFailed: '设置操作失败',
    downloadFile: '下载文件',
    downloadAll: '生成交付包并选择保存位置',
    openFolder: '打开所在文件夹',
    fileType: '文件类型',
    generatedAt: '生成时间',
    folderOpened: '已打开交付文件夹',
    folderFailed: '无法打开交付文件夹',
    autoOriginal: '未选择文件类型转换；系统将保持原文件类型，并尽量保留字体、颜色、边框、公式、合并单元格、图片与排版。',
    processingSummary: '处理摘要',
    successCount: '处理成功',
    failedCount: '处理失败',
    ocrCount: 'OCR 文件',
    totalDuration: '总耗时',
    averageDuration: '平均耗时',
    outputMode: '输出方式',
    originalMode: '保持原始文件类型与版式',
    metric_paragraph_count: '段落数',
    metric_non_empty_paragraph_count: '非空段落数',
    metric_table_count: '表格数',
    metric_image_count: '图片数',
    metric_section_count: '节数',
    metric_heading_count: '标题数',
    metric_sheet_count: '工作表数',
    metric_total_rows: '总行数',
    metric_max_columns: '最大列数',
    metric_sample_non_empty_cells: '非空单元格样本',
    metric_formula_count_sample: '公式样本数',
    metric_merged_range_count: '合并区域数',
    metric_chart_count: '图表数',
    metric_slide_count: '幻灯片数',
    metric_text_shape_count: '文本框数',
    metric_picture_count: '图片数',
    metric_group_shape_count: '组合图形数',
    metric_width: '宽度',
    metric_height: '高度',
    metric_mode: '颜色模式',
    metric_image_format: '图片格式',
    taskEngine: '任务引擎',
    smartEngine: '智能处理已启用',
    smartOcrOn: '已自动启用 OCR；翻译后保持原格式',
    smartOcrOff: '无需 OCR；翻译后保持原格式',
    smartZip: 'ZIP 将自动解压、分类处理并重新打包'
  },
  en: {
    lang: 'English',
    languageLabel: 'Interface language',
    platformLabel: 'Platform',
    workflowLabel: 'Workflow',
    pricingLabel: 'Pricing',
    readyLabel: 'READY TO AUTOMATE?',
    processingCenterLabel: 'AI PROCESSING CENTER',
    liveOrderLabel: 'LIVE ORDER PROCESSING',
    workspaceLabel: 'ENTERPRISE WORKSPACE',
    team: 'Team',
    billing: 'Billing',
    api: 'API',
    serviceOcr: 'OCR recognition',
    serviceTranslation: 'Document translation',
    serviceConversion: 'Format conversion',
    serviceCleanup: 'Smart data organization',
    serviceAnalysis: 'Enterprise data analysis',
    toolOcrDesc: 'Recognize text and tables in scans, images and PDFs',
    toolTranslationDesc: 'Multilingual translation with layout retention',
    toolConversionDesc: 'Convert PDF, Word, Excel, PPT, CSV and images',
    toolCleanupDesc: 'Clean, organize and standardize document data',
    toolQuality: 'Quality control',
    toolQualityDesc: 'Rule-based checks for results and delivery files',
    toolApi: 'Enterprise API',
    toolApiDesc: 'Connect document processing to business workflows',
    stepUpload: 'Upload',
    stepUnderstand: 'Understand',
    stepProcess: 'Process',
    stepValidate: 'Validate',
    stepDeliver: 'Deliver',
    demoReady: 'Ready',
    demoDone: 'Done',
    demoWaiting: 'Waiting',
    demoProcessing: 'Processing',
    demoBilingual: 'Excel + bilingual PDF',
    statusProcessing: 'Processing',
    statusCompleted: 'Completed',
    statusFailed: 'Failed',
    langZh: 'Chinese',
    langEn: 'English',
    langVi: 'Vietnamese',
    langZhEn: 'Chinese-English bilingual',
    langZhVi: 'Chinese-Vietnamese bilingual',
    langOther: 'Other language',
    fmtImages: 'Images',
    fmtOriginal: 'Preserve original layout',
    platform: 'Capabilities',
    workflow: 'Workflow',
    pricing: 'Pricing',
    workspace: 'Workspace',
    processNow: 'Process now',
    heroTag: `AI Document Intelligence · Version ${VERSION}`,
    heroTitle1: 'Enterprise documents,',
    heroTitle2: 'completed automatically.',
    heroDesc: 'Upload PDF, Excel, Word, PowerPoint or images. AI performs OCR, translation, extraction, conversion and quality checks.',
    start: 'Process documents',
    viewWorkspace: 'View workspace',
    noInstall: 'No installation',
    isolated: 'File isolation',
    triLang: 'Chinese, English & Vietnamese',
    platformTitle: 'One platform for every enterprise document',
    platformDesc: 'From upload to final delivery, every capability stays in one workflow.',
    workflowTitle: 'A visible workflow from upload to delivery',
    workflowDesc: 'Reduce copying, formatting and repetitive checks.',
    pricingTitle: 'Commercial plans and payment hub',
    pricingDesc: 'Manage plans, orders, AI credits and secure third-party checkout in one place, with Paddle first and PayPal/Stripe plugins available.',
    ctaTitle: 'Give repetitive document work to AI',
    ctaDesc: 'Start with one file, then connect the full enterprise workflow.',
    freeStart: 'Start free',
    backHome: 'Back home',
    center: 'Intelligent Document Processing Center',
    centerDesc: 'Upload files and choose your goals. The system will create a processing order.',
    drop: 'Drop files here, or click to select',
    support: 'PDF, Word, Excel, PPT, CSV, images and ZIP. Maximum 100 MB per file; large files upload in resumable chunks.',
    clear: 'Clear',
    settings: 'Processing settings',
    selected: 'Selected',
    capabilities: 'capabilities',
    targetLang: 'Target languages (multiple)',
    outputFormat: 'Output formats (multiple)',
    name: 'Name',
    email: 'Email',
    company: 'Company',
    optional: 'Optional',
    requirements: 'Requirements',
    create: 'Create processing order',
    creating: 'Uploading and creating order…',
    secure: 'Files are stored in an isolated order workspace',
    fileRequired: 'Select at least one file.',
    languageRequired: 'Select at least one target language.',
    formatRequired: 'Select at least one output format.',
    contactRequired: 'Enter your name and email.',
    submitFailed: 'Order submission failed',
    noOrder: 'No order information',
    backCenter: 'Back to processing center',
    processing: 'Project is processing',
    completed: 'Project completed',
    failed: 'Project failed',
    processingDesc: 'Progress refreshes automatically. Do not submit the order again.',
    completedDesc: 'Processing is complete and delivery files are ready for acceptance and download.',
    orderNo: 'Order number',
    currentStatus: 'Current status',
    fileCount: 'Files',
    deliveryCount: 'Delivery files',
    items: '',
    target: 'Target languages',
    output: 'Output formats',
    liveLog: 'Live processing log',
    delivery: 'Project acceptance and delivery',
    deliveryDesc: 'Download each file and verify that it opens and meets content and formatting requirements.',
    noOutput: 'Processing completed, but no delivery file was found.',
    newProject: 'New project',
    saveOrder: 'Save this order number: ',
    dashboardTitle: 'Enterprise Workspace',
    dashboardDesc: 'Only real orders are shown. Team, API, billing and plan features will open in the commercial release.',
    recentOrders: 'Recent processing records',
    noRealOrders: 'No processing records yet',
    comingSoon: 'Coming soon',
    refresh: 'Refresh',
    footer: 'Enterprise AI platform for document recognition, translation, conversion and data automation.',
    taskFlow: 'Task workflow',
    stepPending: 'Pending',
    stepRunning: 'Running',
    stepCompleted: 'Completed',
    stepFailed: 'Failed',
    retryTask: 'Retry task',
    taskDuration: 'Duration',
    taskMessage: 'Current message',
    analysisLabel: 'DOCUMENT ANALYZER',
    analysisTitle: 'Document Analysis Result',
    analysisComplexity: 'Complexity',
    analysisCategory: 'Category',
    analysisFormats: 'Formats',
    analysisLanguages: 'Languages',
    analysisFiles: 'Files Analyzed',
    analysisWorkflow: 'Recommended Workflow',
    metric_pages: 'Pages',
    metric_extractable_text_chars_sample: 'Extractable Text Sample',
    metric_likely_scanned: 'Likely Scanned',
    metric_encrypted: 'Encrypted',
    yes: 'Yes',
    no: 'No',
    aiSettings: 'AI Translation Settings',
    provider: 'Provider',
    apiKey: 'API Key',
    model: 'Model',
    adminPassword: 'Admin password (optional locally)',
    saveSettings: 'Save settings',
    testConnection: 'Test connection',
    settingsSaved: 'Translation settings saved',
    connectionOk: 'Connection test succeeded',
    settingsFailed: 'Settings operation failed',
    downloadFile: 'Download',
    downloadAll: 'Save delivery ZIP as…',
    openFolder: 'Open folder',
    fileType: 'File type',
    generatedAt: 'Generated',
    folderOpened: 'Delivery folder opened',
    folderFailed: 'Could not open the delivery folder',
    smartEngine: 'Smart processing enabled',
    smartOcrOn: 'OCR enabled automatically; original format will be retained',
    smartOcrOff: 'OCR not required; original format will be retained',
    smartZip: 'ZIP files will be extracted, classified, processed and repackaged'
  },
  vi: {
    lang: 'Tiếng Việt',
    languageLabel: 'Ngôn ngữ giao diện',
    platformLabel: 'NỀN TẢNG',
    workflowLabel: 'QUY TRÌNH',
    pricingLabel: 'BẢNG GIÁ',
    readyLabel: 'SẴN SÀNG TỰ ĐỘNG HÓA?',
    processingCenterLabel: 'TRUNG TÂM XỬ LÝ AI',
    liveOrderLabel: 'XỬ LÝ ĐƠN HÀNG TRỰC TIẾP',
    workspaceLabel: 'KHÔNG GIAN DOANH NGHIỆP',
    team: 'Nhóm',
    billing: 'Thanh toán',
    api: 'API',
    serviceOcr: 'Nhận dạng OCR',
    serviceTranslation: 'Dịch tài liệu',
    serviceConversion: 'Chuyển đổi định dạng',
    serviceCleanup: 'Sắp xếp dữ liệu thông minh',
    serviceAnalysis: 'Phân tích dữ liệu doanh nghiệp',
    toolOcrDesc: 'Nhận dạng chữ và bảng trong bản quét, ảnh và PDF',
    toolTranslationDesc: 'Dịch đa ngôn ngữ và giữ bố cục',
    toolConversionDesc: 'Chuyển đổi PDF, Word, Excel, PPT, CSV và hình ảnh',
    toolCleanupDesc: 'Làm sạch, sắp xếp và chuẩn hóa dữ liệu tài liệu',
    toolQuality: 'Kiểm soát chất lượng',
    toolQualityDesc: 'Kiểm tra kết quả và tệp bàn giao theo quy tắc',
    toolApi: 'API doanh nghiệp',
    toolApiDesc: 'Kết nối xử lý tài liệu với quy trình doanh nghiệp',
    stepUpload: 'Tải lên',
    stepUnderstand: 'Hiểu nội dung',
    stepProcess: 'Xử lý',
    stepValidate: 'Kiểm tra',
    stepDeliver: 'Bàn giao',
    demoReady: 'Sẵn sàng',
    demoDone: 'Hoàn tất',
    demoWaiting: 'Đang chờ',
    demoProcessing: 'Đang xử lý',
    demoBilingual: 'Excel + PDF song ngữ',
    statusProcessing: 'Đang xử lý',
    statusCompleted: 'Hoàn tất',
    statusFailed: 'Thất bại',
    langZh: 'Tiếng Trung',
    langEn: 'Tiếng Anh',
    langVi: 'Tiếng Việt',
    langZhEn: 'Song ngữ Trung-Anh',
    langZhVi: 'Song ngữ Trung-Việt',
    langOther: 'Ngôn ngữ khác',
    fmtImages: 'Hình ảnh',
    fmtOriginal: 'Giữ bố cục gốc',
    platform: 'Năng lực',
    workflow: 'Quy trình',
    pricing: 'Bảng giá',
    workspace: 'Không gian doanh nghiệp',
    processNow: 'Xử lý ngay',
    heroTag: `AI Document Intelligence · Phiên bản ${VERSION}`,
    heroTitle1: 'Tài liệu doanh nghiệp,',
    heroTitle2: 'được hoàn thành tự động.',
    heroDesc: 'Tải lên PDF, Excel, Word, PowerPoint hoặc hình ảnh. AI thực hiện OCR, dịch, trích xuất, chuyển đổi và kiểm tra chất lượng.',
    start: 'Xử lý tài liệu',
    viewWorkspace: 'Xem không gian làm việc',
    noInstall: 'Không cần cài đặt',
    isolated: 'Tệp được cách ly',
    triLang: 'Hỗ trợ Trung–Anh–Việt',
    platformTitle: 'Một nền tảng cho mọi tài liệu doanh nghiệp',
    platformDesc: 'Từ tải lên đến bàn giao, mọi năng lực nằm trong cùng một quy trình.',
    workflowTitle: 'Hiển thị toàn bộ quy trình từ tải lên đến bàn giao',
    workflowDesc: 'Giảm sao chép thủ công, chỉnh định dạng và kiểm tra lặp lại.',
    pricingTitle: 'Gói thương mại sắp ra mắt',
    pricingDesc: 'Phiên bản này dùng để nghiệm thu sản phẩm. Gói, hạn mức và thanh toán sẽ được kết nối ở bản thương mại.',
    ctaTitle: 'Giao công việc tài liệu lặp lại cho AI',
    ctaDesc: 'Bắt đầu với một tệp rồi kết nối toàn bộ quy trình doanh nghiệp.',
    freeStart: 'Bắt đầu miễn phí',
    backHome: 'Về trang chủ',
    center: 'Trung tâm xử lý tài liệu thông minh',
    centerDesc: 'Tải tệp lên và chọn mục tiêu. Hệ thống sẽ tự tạo đơn xử lý.',
    drop: 'Kéo tệp vào đây hoặc nhấp để chọn',
    support: 'Hỗ trợ PDF, Word, Excel, PPT, CSV, hình ảnh và ZIP; tối đa 100 MB mỗi tệp; tệp lớn được tải lên theo từng phần.',
    clear: 'Xóa hết',
    settings: 'Cài đặt xử lý',
    selected: 'Đã chọn',
    capabilities: 'năng lực',
    targetLang: 'Ngôn ngữ đích (chọn nhiều)',
    outputFormat: 'Định dạng đầu ra (chọn nhiều)',
    name: 'Họ tên',
    email: 'Email',
    company: 'Công ty',
    optional: 'Không bắt buộc',
    requirements: 'Yêu cầu xử lý',
    create: 'Tạo đơn xử lý',
    creating: 'Đang tải lên và tạo đơn…',
    secure: 'Tệp được lưu trong không gian riêng của từng đơn',
    fileRequired: 'Vui lòng chọn ít nhất một tệp.',
    languageRequired: 'Vui lòng chọn ít nhất một ngôn ngữ đích.',
    formatRequired: 'Vui lòng chọn ít nhất một định dạng đầu ra.',
    contactRequired: 'Vui lòng nhập họ tên và email.',
    submitFailed: 'Gửi đơn thất bại',
    noOrder: 'Chưa có thông tin đơn',
    backCenter: 'Quay lại trung tâm xử lý',
    processing: 'Dự án đang được xử lý',
    completed: 'Dự án đã hoàn thành',
    failed: 'Dự án thất bại',
    processingDesc: 'Tiến độ tự động cập nhật, không cần gửi lại đơn.',
    completedDesc: 'Hệ thống đã xử lý xong và tạo tệp bàn giao để nghiệm thu và tải xuống.',
    orderNo: 'Mã đơn',
    currentStatus: 'Trạng thái hiện tại',
    fileCount: 'Số tệp',
    deliveryCount: 'Tệp bàn giao',
    items: ' tệp',
    target: 'Ngôn ngữ đích',
    output: 'Định dạng đầu ra',
    liveLog: 'Nhật ký xử lý trực tiếp',
    delivery: 'Nghiệm thu và bàn giao',
    deliveryDesc: 'Tải từng tệp và kiểm tra khả năng mở, nội dung và định dạng.',
    noOutput: 'Đã xử lý xong nhưng chưa tìm thấy tệp bàn giao.',
    newProject: 'Dự án mới',
    saveOrder: 'Hãy lưu mã đơn: ',
    dashboardTitle: 'Không gian doanh nghiệp',
    dashboardDesc: 'Chỉ hiển thị đơn thực tế. Nhóm, API, hóa đơn và gói dịch vụ sẽ mở ở phiên bản thương mại.',
    recentOrders: 'Đơn thực tế gần đây',
    noRealOrders: 'Chưa có đơn thực tế',
    comingSoon: 'Sắp ra mắt',
    refresh: 'Làm mới',
    footer: 'Nền tảng AI doanh nghiệp cho nhận dạng, dịch, chuyển đổi và tự động hóa dữ liệu tài liệu.',
    taskFlow: 'Quy trình tác vụ',
    stepPending: 'Đang chờ',
    stepRunning: 'Đang xử lý',
    stepCompleted: 'Hoàn tất',
    stepFailed: 'Thất bại',
    retryTask: 'Xử lý lại',
    taskDuration: 'Thời gian',
    taskMessage: 'Thông tin hiện tại',
    analysisLabel: 'BỘ PHÂN TÍCH TÀI LIỆU',
    analysisTitle: 'Kết quả phân tích tài liệu',
    analysisComplexity: 'Độ phức tạp',
    analysisCategory: 'Loại tài liệu',
    analysisFormats: 'Định dạng',
    analysisLanguages: 'Ngôn ngữ',
    analysisFiles: 'Số tệp đã phân tích',
    analysisWorkflow: 'Quy trình đề xuất',
    metric_pages: 'Số trang',
    metric_extractable_text_chars_sample: 'Mẫu ký tự có thể trích xuất',
    metric_likely_scanned: 'Có thể là bản quét',
    metric_encrypted: 'Được mã hóa',
    yes: 'Có',
    no: 'Không',
    aiSettings: 'Cài đặt dịch AI',
    provider: 'Nhà cung cấp',
    apiKey: 'Khóa API',
    model: 'Mô hình',
    adminPassword: 'Mật khẩu quản trị (có thể để trống khi chạy cục bộ)',
    saveSettings: 'Lưu cài đặt',
    testConnection: 'Kiểm tra kết nối',
    settingsSaved: 'Đã lưu cài đặt dịch',
    connectionOk: 'Kết nối thành công',
    settingsFailed: 'Thao tác cài đặt thất bại',
    downloadFile: 'Tải tệp',
    downloadAll: 'Lưu gói bàn giao vào…',
    openFolder: 'Mở thư mục',
    fileType: 'Loại tệp',
    generatedAt: 'Thời gian tạo',
    folderOpened: 'Đã mở thư mục bàn giao',
    folderFailed: 'Không thể mở thư mục bàn giao',
    smartEngine: 'Đã bật xử lý thông minh',
    smartOcrOn: 'OCR được bật tự động; giữ nguyên định dạng',
    smartOcrOff: 'Không cần OCR; giữ nguyên định dạng',
    smartZip: 'ZIP sẽ được giải nén, phân loại, xử lý và đóng gói lại'
  }
};
const LANGUAGE_OPTIONS = [
  ['zh', '🇨🇳', '简体中文', 'zh-CN'],
  ['zh-TW', '🇭🇰', '繁體中文', 'zh-TW'],
  ['en', '🇺🇸', 'English', 'en-US'],
  ['vi', '🇻🇳', 'Tiếng Việt', 'vi-VN'],
  ['ja', '🇯🇵', '日本語', 'ja-JP'],
  ['ko', '🇰🇷', '한국어', 'ko-KR'],
  ['es', '🇪🇸', 'Español', 'es-ES'],
  ['fr', '🇫🇷', 'Français', 'fr-FR'],
  ['de', '🇩🇪', 'Deutsch', 'de-DE'],
  ['pt', '🇵🇹', 'Português', 'pt-PT'],
];
const EXTRA_LOCALES = {
  'zh-TW': {
    lang: '繁體中文',
    languageLabel: '介面語言',
    platform: '平台能力',
    workflow: '處理流程',
    pricing: '價格方案',
    workspace: '企業工作台',
    processNow: '立即處理',
    heroTag: `AI 文件智慧 · 版本 ${VERSION}`,
    heroTitle1: '讓企業文件，',
    heroTitle2: '自動完成。',
    heroDesc: '上傳 PDF、Excel、Word、PPT 或圖片。AI 自動完成 OCR、翻譯、資料擷取、格式轉換與品質檢查。',
    start: '開始處理文件',
    viewWorkspace: '查看企業工作台',
    platformTitle: '一個平台，處理所有企業文件',
    workflowTitle: '從上傳到交付，全流程視覺化',
    pricingTitle: '商業方案即將開放',
    ctaTitle: '把重複文件工作交給 AI',
    freeStart: '免費開始',
    center: '智慧文件處理中心',
    settings: '處理設定',
    create: '建立處理訂單',
    dashboardTitle: '企業工作台',
    backHome: '返回首頁',
    newProject: '新增處理專案',
    comingSoon: '即將開放',
    refresh: '重新整理',
    footer: '面向企業的 AI 文件辨識、翻譯、轉換與資料自動化平台。',
    brandSubtitle: '企業文件智慧平台',
    seoTitle: 'Document Automation AI｜企業 AI 文件處理平台'
  },
  ja: {
    lang: '日本語',
    languageLabel: '表示言語',
    platform: '機能',
    workflow: 'ワークフロー',
    pricing: '料金',
    workspace: '企業ワークスペース',
    processNow: '今すぐ処理',
    heroTag: `AI ドキュメントインテリジェンス · バージョン ${VERSION}`,
    heroTitle1: '企業文書を、',
    heroTitle2: '自動で完成。',
    heroDesc: 'PDF、Excel、Word、PowerPoint、画像をアップロード。AI が OCR、翻訳、抽出、変換、品質確認を自動化します。',
    start: '文書を処理',
    viewWorkspace: 'ワークスペースを見る',
    platformTitle: 'あらゆる企業文書を一つのプラットフォームで',
    workflowTitle: 'アップロードから納品までを可視化',
    pricingTitle: '商用プランは近日公開',
    ctaTitle: '反復的な文書作業を AI に',
    freeStart: '無料で開始',
    center: 'インテリジェント文書処理センター',
    settings: '処理設定',
    create: '処理注文を作成',
    dashboardTitle: '企業ワークスペース',
    backHome: 'ホームに戻る',
    newProject: '新しいプロジェクト',
    comingSoon: '近日公開',
    refresh: '更新',
    footer: '文書認識、翻訳、変換、データ自動化のための企業向け AI プラットフォーム。',
    brandSubtitle: '企業文書インテリジェンス',
    seoTitle: 'Document Automation AI | 企業向け文書処理プラットフォーム'
  },
  ko: {
    lang: '한국어',
    languageLabel: '인터페이스 언어',
    platform: '기능',
    workflow: '워크플로',
    pricing: '요금',
    workspace: '기업 작업공간',
    processNow: '지금 처리',
    heroTag: `AI 문서 인텔리전스 · 버전 ${VERSION}`,
    heroTitle1: '기업 문서를,',
    heroTitle2: '자동으로 완성하세요.',
    heroDesc: 'PDF, Excel, Word, PowerPoint 또는 이미지를 업로드하세요. AI가 OCR, 번역, 추출, 변환 및 품질 검사를 자동화합니다.',
    start: '문서 처리',
    viewWorkspace: '작업공간 보기',
    platformTitle: '모든 기업 문서를 위한 하나의 플랫폼',
    workflowTitle: '업로드부터 납품까지 보이는 워크플로',
    pricingTitle: '상용 요금제 출시 예정',
    ctaTitle: '반복 문서 업무를 AI에게',
    freeStart: '무료 시작',
    center: '지능형 문서 처리 센터',
    settings: '처리 설정',
    create: '처리 주문 만들기',
    dashboardTitle: '기업 작업공간',
    backHome: '홈으로',
    newProject: '새 프로젝트',
    comingSoon: '출시 예정',
    refresh: '새로고침',
    footer: '문서 인식, 번역, 변환 및 데이터 자동화를 위한 기업용 AI 플랫폼.',
    brandSubtitle: '기업 문서 인텔리전스',
    seoTitle: 'Document Automation AI | 기업 문서 처리 플랫폼'
  },
  es: {
    lang: 'Español',
    languageLabel: 'Idioma de la interfaz',
    platform: 'Capacidades',
    workflow: 'Flujo de trabajo',
    pricing: 'Precios',
    workspace: 'Espacio empresarial',
    processNow: 'Procesar ahora',
    heroTag: `Inteligencia documental con IA · Versión ${VERSION}`,
    heroTitle1: 'Documentos empresariales,',
    heroTitle2: 'completados automáticamente.',
    heroDesc: 'Sube PDF, Excel, Word, PowerPoint o imágenes. La IA automatiza OCR, traducción, extracción, conversión y control de calidad.',
    start: 'Procesar documentos',
    viewWorkspace: 'Ver espacio de trabajo',
    platformTitle: 'Una plataforma para todos los documentos empresariales',
    workflowTitle: 'Flujo visible desde la carga hasta la entrega',
    pricingTitle: 'Planes comerciales próximamente',
    ctaTitle: 'Deja el trabajo repetitivo a la IA',
    freeStart: 'Comenzar gratis',
    center: 'Centro inteligente de procesamiento documental',
    settings: 'Configuración de procesamiento',
    create: 'Crear orden de procesamiento',
    dashboardTitle: 'Espacio empresarial',
    backHome: 'Volver al inicio',
    newProject: 'Nuevo proyecto',
    comingSoon: 'Próximamente',
    refresh: 'Actualizar',
    footer: 'Plataforma de IA empresarial para reconocimiento, traducción, conversión y automatización documental.',
    brandSubtitle: 'Inteligencia documental empresarial',
    seoTitle: 'Document Automation AI | Plataforma empresarial de documentos'
  },
  fr: {
    lang: 'Français',
    languageLabel: "Langue de l’interface",
    platform: 'Fonctionnalités',
    workflow: 'Flux de travail',
    pricing: 'Tarifs',
    workspace: 'Espace entreprise',
    processNow: 'Traiter maintenant',
    heroTag: `Intelligence documentaire IA · Version ${VERSION}`,
    heroTitle1: 'Les documents d’entreprise,',
    heroTitle2: 'finalisés automatiquement.',
    heroDesc: 'Importez PDF, Excel, Word, PowerPoint ou images. L’IA automatise OCR, traduction, extraction, conversion et contrôle qualité.',
    start: 'Traiter les documents',
    viewWorkspace: 'Voir l’espace de travail',
    platformTitle: 'Une plateforme pour tous les documents d’entreprise',
    workflowTitle: 'Un flux visible du dépôt à la livraison',
    pricingTitle: 'Offres commerciales bientôt disponibles',
    ctaTitle: 'Confiez les tâches répétitives à l’IA',
    freeStart: 'Commencer gratuitement',
    center: 'Centre intelligent de traitement documentaire',
    settings: 'Paramètres de traitement',
    create: 'Créer une commande',
    dashboardTitle: 'Espace entreprise',
    backHome: 'Retour à l’accueil',
    newProject: 'Nouveau projet',
    comingSoon: 'Bientôt disponible',
    refresh: 'Actualiser',
    footer: 'Plateforme IA d’entreprise pour la reconnaissance, la traduction, la conversion et l’automatisation documentaire.',
    brandSubtitle: 'Intelligence documentaire d’entreprise',
    seoTitle: 'Document Automation AI | Plateforme documentaire d’entreprise'
  },
  de: {
    lang: 'Deutsch',
    languageLabel: 'Oberflächensprache',
    platform: 'Funktionen',
    workflow: 'Workflow',
    pricing: 'Preise',
    workspace: 'Unternehmensbereich',
    processNow: 'Jetzt verarbeiten',
    heroTag: `KI-Dokumentenintelligenz · Version ${VERSION}`,
    heroTitle1: 'Unternehmensdokumente,',
    heroTitle2: 'automatisch erledigt.',
    heroDesc: 'PDF, Excel, Word, PowerPoint oder Bilder hochladen. KI automatisiert OCR, Übersetzung, Extraktion, Konvertierung und Qualitätsprüfung.',
    start: 'Dokumente verarbeiten',
    viewWorkspace: 'Arbeitsbereich öffnen',
    platformTitle: 'Eine Plattform für alle Unternehmensdokumente',
    workflowTitle: 'Transparenter Ablauf vom Upload bis zur Lieferung',
    pricingTitle: 'Kommerzielle Tarife folgen',
    ctaTitle: 'Wiederkehrende Dokumentarbeit an KI übergeben',
    freeStart: 'Kostenlos starten',
    center: 'Intelligentes Dokumentverarbeitungszentrum',
    settings: 'Verarbeitungseinstellungen',
    create: 'Verarbeitungsauftrag erstellen',
    dashboardTitle: 'Unternehmensbereich',
    backHome: 'Zur Startseite',
    newProject: 'Neues Projekt',
    comingSoon: 'Demnächst',
    refresh: 'Aktualisieren',
    footer: 'Enterprise-KI für Dokumentenerkennung, Übersetzung, Konvertierung und Datenautomatisierung.',
    brandSubtitle: 'Enterprise Document Intelligence',
    seoTitle: 'Document Automation AI | Enterprise-Dokumentenplattform'
  },
  pt: {
    lang: 'Português',
    languageLabel: 'Idioma da interface',
    platform: 'Recursos',
    workflow: 'Fluxo de trabalho',
    pricing: 'Preços',
    workspace: 'Área empresarial',
    processNow: 'Processar agora',
    heroTag: `Inteligência documental com IA · Versão ${VERSION}`,
    heroTitle1: 'Documentos empresariais,',
    heroTitle2: 'concluídos automaticamente.',
    heroDesc: 'Envie PDF, Excel, Word, PowerPoint ou imagens. A IA automatiza OCR, tradução, extração, conversão e controle de qualidade.',
    start: 'Processar documentos',
    viewWorkspace: 'Ver área de trabalho',
    platformTitle: 'Uma plataforma para todos os documentos empresariais',
    workflowTitle: 'Fluxo visível do envio à entrega',
    pricingTitle: 'Planos comerciais em breve',
    ctaTitle: 'Entregue o trabalho repetitivo à IA',
    freeStart: 'Começar grátis',
    center: 'Centro inteligente de processamento de documentos',
    settings: 'Configurações de processamento',
    create: 'Criar ordem de processamento',
    dashboardTitle: 'Área empresarial',
    backHome: 'Voltar ao início',
    newProject: 'Novo projeto',
    comingSoon: 'Em breve',
    refresh: 'Atualizar',
    footer: 'Plataforma de IA empresarial para reconhecimento, tradução, conversão e automação documental.',
    brandSubtitle: 'Inteligência documental empresarial',
    seoTitle: 'Document Automation AI | Plataforma empresarial de documentos'
  }
};
Object.entries(EXTRA_LOCALES).forEach(([key, value]) => {
  I18N[key] = {
    ...I18N.en,
    ...value
  };
});
I18N.zh.brandSubtitle = '企业文档智能平台';
I18N.en.brandSubtitle = 'Enterprise Document Intelligence';
I18N.vi.brandSubtitle = 'Nền tảng AI tài liệu doanh nghiệp';
I18N.zh.seoTitle = 'Document Automation AI｜企业AI文档处理平台';
I18N.en.seoTitle = 'Document Automation AI | Enterprise Document Intelligence';
I18N.vi.seoTitle = 'Document Automation AI | Nền tảng xử lý tài liệu AI';
const serviceIcons = {
  ocr: ScanText,
  translation: Languages,
  conversion: Workflow,
  data_cleanup: Sparkles,
  enterprise_analysis: Code2,
  image_recognition: Camera,
  pdf_rebuild: FileText,
  proofreading: Bot,
  table_recovery: Grid3X3,
  scan_enhancement: ScanText,
  layout_recovery: LayoutDashboard,
  document_organization: FolderOpen,
  markdown: FileText,
  html: Code2,
  json: Code2,
  csv: Grid3X3,
  xml: Code2,
  office: FolderOpen
};
const serviceKeys = {
  ocr: 'serviceOcr',
  translation: 'serviceTranslation',
  conversion: 'serviceConversion',
  data_cleanup: 'serviceCleanup',
  enterprise_analysis: 'serviceAnalysis'
};
const languageKeys = {
  zh: 'langZh',
  en: 'langEn',
  vi: 'langVi',
  'zh-en': 'langZhEn',
  'zh-vi': 'langZhVi',
  other: 'langOther'
};
const formatKeys = {
  original: 'fmtOriginal',
  xlsx: 'Excel',
  docx: 'Word',
  pdf: 'PDF',
  pptx: 'PPT',
  csv: 'CSV',
  md: 'Markdown',
  html: 'HTML',
  txt: 'TXT',
  json: 'JSON',
  xml: 'XML',
  images: 'fmtImages'
};
const serviceFormatCapabilities = {
  markdown: ['md'], html: ['html'], json: ['json'], csv: ['csv'], xml: ['xml'],
  office: ['docx', 'xlsx', 'pptx']
};
const EVENT_ZH = {
  validate: '检查',
  analyze: '理解',
  processing: '处理',
  translation: '文档翻译',
  ocr: 'OCR识别',
  cleanup: '智能数据整理',
  conversion: '格式转换',
  analysis_report: '企业数据分析',
  quality: '质量检查',
  export: '交付',
  completed: '完成',
  configuration: '配置'
};
function localizeEventText(text = '', locale = 'zh') {
  if (locale !== 'zh') return text;
  return text.replace(/^Validated (\d+) source file\(s\)$/, '已校验 $1 个源文件').replace('Document structure analysis completed', '文档结构分析完成').replace('AI translation provider connected', 'AI 翻译引擎连接成功').replace(/^Processing file (\d+)\/(\d+): /, '正在处理文件 $1/$2：').replace(/^Completed file (\d+)\/(\d+): /, '已完成文件 $1/$2：').replace(/^Parallel batch started: (\d+) files, (\d+) workers$/, '并行批处理已启动：$1 个文件，$2 个工作线程').replace('Quality checks completed for generated files', '交付文件质量检查完成').replace(/^Generated (\d+) delivery file\(s\)$/, '已生成 $1 个交付文件').replace('Automatic processing completed', '自动处理完成').replace('Choose and configure an AI translation provider.', '平台 AI 翻译服务暂不可用，任务尚未开始且不会扣除 Credits，请联系管理员').replace('Processing job queued', '处理任务已创建，正在检查运行条件').replace('处理任务已创建，正在检查运行条件', '处理任务已创建，正在检查运行条件');
}
function fileTypeClass(name = '') {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
  if (['ppt', 'pptx'].includes(ext)) return 'ppt';
  if (['png', 'jpg', 'jpeg', 'bmp', 'tif', 'tiff'].includes(ext)) return 'image';
  return 'file';
}
function smartPlanForFiles(files = []) {
  const names = files.map(f => (f.name || '').toLowerCase());
  const exts = names.map(name => (name.split('.').pop() || '').toLowerCase());
  const hasExcel = exts.some(x => ['xls', 'xlsx', 'csv'].includes(x));
  const hasImage = exts.some(x => ['png', 'jpg', 'jpeg', 'bmp', 'tif', 'tiff'].includes(x));
  const hasExplicitScan = names.some(name => name.endsWith('.pdf') && /(scan|scanned|扫描|影印|photo)/i.test(name));
  const hasPdf = exts.includes('pdf'),
    hasZip = exts.includes('zip');
  if (hasExcel) return {
    profile: 'spreadsheet',
    services: ['translation', 'conversion'],
    ocrAuto: false,
    ocrSuggested: false,
    output: 'original',
    hasZip,
    bilingualLayout: 'auto'
  };
  if (hasImage || hasExplicitScan) return {
    profile: 'scan',
    services: ['ocr', 'translation', 'conversion'],
    ocrAuto: true,
    ocrSuggested: true,
    output: 'original',
    hasZip,
    bilingualLayout: 'auto'
  };
  return {
    profile: hasPdf ? 'pdf' : 'document',
    services: [],
    ocrAuto: false,
    ocrSuggested: hasPdf || hasZip,
    output: 'original',
    hasZip,
    bilingualLayout: 'auto'
  };
}
function App() {
  const [locale, setLocale] = useState(() => {
    const saved = localStorage.getItem('da_locale');
    if (saved && LANGUAGE_OPTIONS.some(([id]) => id === saved)) return saved;
    const browser = navigator.language || 'en';
    if (browser.startsWith('zh-TW') || browser.startsWith('zh-HK')) return 'zh';
    return LANGUAGE_OPTIONS.find(([id,,, tag]) => browser.startsWith(tag.split('-')[0]))?.[0] || 'en';
  });
  const [page, setPage] = useState('home'),
    [mobile, setMobile] = useState(false),
    [languageOpen, setLanguageOpen] = useState(false),
    [accountOpen, setAccountOpen] = useState(false);
  const accountCloseTimer = useRef(null),
    languageCloseTimer = useRef(null);
  const cancelAccountClose = () => {
    if (accountCloseTimer.current) {
      clearTimeout(accountCloseTimer.current);
      accountCloseTimer.current = null;
    }
  };
  const scheduleAccountClose = () => {
    cancelAccountClose();
    accountCloseTimer.current = setTimeout(() => setAccountOpen(false), 260);
  };
  const cancelLanguageClose = () => {
    if (languageCloseTimer.current) {
      clearTimeout(languageCloseTimer.current);
      languageCloseTimer.current = null;
    }
  };
  const scheduleLanguageClose = () => {
    cancelLanguageClose();
    languageCloseTimer.current = setTimeout(() => setLanguageOpen(false), 260);
  };
  const workspacePages = ['dashboard', 'order', 'status', 'projects', 'processing', 'knowledge', 'aiProviders', 'templates', 'team', 'billing', 'settings', 'account', 'admin'];
  const isWorkspacePage = workspacePages.includes(page);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('da_auth_token') || ''),
    [currentUser, setCurrentUser] = useState(null);
  const [files, setFiles] = useState([]),
    [archiveManifests, setArchiveManifests] = useState({}),
    [archiveInspecting, setArchiveInspecting] = useState(false),
    [services, setServices] = useState([]);
  const [translationTargets, setTranslationTargets] = useState([]),
    [outputFormats, setOutputFormats] = useState([]);
  const [outputOptions, setOutputOptions] = useState({
    profile: 'auto',
    language_mode: 'single',
    output_strategy: 'preserve',
    primary_format: 'original',
    additional_formats: [],
    layout_profile: 'auto',
    preserve_layout: true,
    preserve_formulas: true,
    preserve_images: true,
    preserve_comments: false,
    preserve_links: true,
    auto_width: true,
    auto_row_height: true,
    freeze_header: false,
    preserve_cell_coordinates: true,
    preserve_merged_cells: true,
    protect_plc_codes: false,
    bilingual_layout: 'auto',
    columns_style: 'address-with-text',
    address_mode: 'keep',
    inline_style: 'dash',
    vertical_order: 'source-first'
  });
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    requirements: ''
  });
  const [submitting, setSubmitting] = useState(false),
    [error, setError] = useState(''),
    [orderStatus, setOrderStatus] = useState(null);
  const [aiInsight, setAiInsight] = useState(null),
    [aiAnalyzing, setAiAnalyzing] = useState(false),
    [aiInsightError, setAiInsightError] = useState('');
  const [preferences, setPreferences] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('da_user_preferences') || '{}');
    } catch {
      return {};
    }
  });
  const t = I18N[locale] || I18N.en;
  const uiL = (zh, en, vi) => locale === 'vi' ? vi : locale.startsWith('zh') ? zh : en;
  useEffect(() => {
    localStorage.setItem('da_locale', locale);
    const option = LANGUAGE_OPTIONS.find(([id]) => id === locale);
    document.documentElement.lang = option?.[3] || 'en-US';
    document.title = t.seoTitle || `Document Automation AI · ${t.lang}`;
    document.querySelector('meta[name=description]')?.setAttribute('content', t.heroDesc);
  }, [locale, t.lang, t.seoTitle, t.heroDesc]);
  useEffect(() => {
    if (!authToken) {
      setCurrentUser(null);
      return;
    }
    let cancelled = false;
    fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    }).then(async r => {
      const j = await readJson(r);
      if (r.status === 401 || r.status === 403) {
        localStorage.removeItem('da_auth_token');
        if (!cancelled) {
          setAuthToken('');
          setCurrentUser(null);
        }
        ;
        return;
      }
      if (!r.ok) throw new Error(j.detail || 'Session check failed');
      if (!cancelled) setCurrentUser(j.user);
    }).catch(() => {/* Temporary network/backend errors must not destroy a valid local session. */});
    return () => {
      cancelled = true;
    };
  }, [authToken]);
  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem('da_current_user', JSON.stringify(currentUser));
    window.dispatchEvent(new CustomEvent('da-current-user', {
      detail: currentUser
    }));
    setForm(v => ({
      ...v,
      name: currentUser.name || v.name || '',
      email: currentUser.email || v.email || '',
      company: ''
    }));
  }, [currentUser]);
  useEffect(() => {
    const close = e => {
      if (!e.target.closest('.language-menu')) setLanguageOpen(false);
      if (!e.target.closest('.account-menu')) setAccountOpen(false);
    };
    const esc = e => {
      if (e.key === 'Escape') {
        setLanguageOpen(false);
        setAccountOpen(false);
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
      cancelAccountClose();
      cancelLanguageClose();
    };
  }, []);
  useEffect(() => {
    const sync = e => setPreferences(e?.detail || (() => {
      try {
        return JSON.parse(localStorage.getItem('da_user_preferences') || '{}');
      } catch {
        return {};
      }
    })());
    window.addEventListener('da-preferences-updated', sync);
    return () => window.removeEventListener('da-preferences-updated', sync);
  }, []);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (['paypal-return', 'demo', 'cancelled'].includes(q.get('payment'))) setPage('billing');
  }, []);
  useEffect(() => {
    if (page !== 'order') return;
    const p = preferences || {};
    if (p.targetLanguage && p.targetLanguage !== 'auto') setTranslationTargets([p.targetLanguage]);
    if (p.defaultCapability && p.defaultCapability !== 'auto') {
      const capability = p.defaultCapability === 'cleanup' ? 'data_cleanup' : p.defaultCapability;
      setServices(current => [...new Set([...current, capability])]);
    }
    if (p.outputFormat && p.outputFormat !== 'original') {
      setServices(v => [...new Set([...v, 'conversion'])]);
      setOutputFormats([p.outputFormat]);
    }
    const bilingual = p.bilingualLayout !== 'target-only';
    setOutputOptions(v => ({
      ...v,
      preserve_layout: true,
      bilingual_layout: p.bilingualLayout || 'auto',
      ocr_mode: p.ocrMode || 'standard',
      translation_style: 'auto',
      knowledge_base: p.knowledgeBase || 'none',
      page_size: p.pageSize || 'A4',
      quality_mode: p.qualityMode || 'balanced',
      auto_quality: p.autoQuality !== false,
      auto_correct: p.autoCorrect !== false,
      bilingual
    }));
  }, [page, preferences]);
  const totalSize = useMemo(() => files.reduce((s, f) => s + f.size, 0), [files]);
  const fileKey = f => `${f.name}-${f.size}-${f.lastModified || 0}`;
  const addFiles = async list => {
    if (!authToken) {
      setError(document.documentElement.lang.startsWith('zh') ? '请先登录后再上传文件。' : 'Please sign in before uploading files.');
      setPage('login');
      return;
    }
    const incoming = [...list];
    if (!incoming.length) return;
    setError('');
    setFiles(prev => {
      const seen = new Set(prev.map(fileKey));
      return [...prev, ...incoming.filter(f => !seen.has(fileKey(f)))];
    });
    const archives = incoming.filter(f => /\.(zip|rar|7z|tar|gz|tgz)$/i.test(f.name) || /\.tar\.gz$/i.test(f.name));
    if (!archives.length) return;
    setArchiveInspecting(true);
    try {
      for (const archive of archives) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 120000);
        try {
          const data = new FormData();
          data.append('file', archive);
          let response = await fetch(`${API_BASE}/api/uploads/inspect-archive`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${authToken}`
            },
            body: data,
            signal: controller.signal
          });
          if (response.status === 404) {
            response = await fetch(`${API_BASE}/api/uploads/inspect-zip`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${authToken}`
              },
              body: data,
              signal: controller.signal
            });
          }
          const result = await readJson(response);
          if (!response.ok) throw new Error(result.detail || 'Archive inspection failed');
          setArchiveManifests(prev => ({
            ...prev,
            [fileKey(archive)]: result
          }));
        } catch (err) {
          const message = err?.name === 'AbortError' ? document.documentElement.lang.startsWith('zh') ? '解压识别超时，请检查后端是否正常运行。' : 'Archive inspection timed out. Check the backend.' : err.message || 'Archive inspection failed';
          setArchiveManifests(prev => ({
            ...prev,
            [fileKey(archive)]: {
              error: message,
              entries: []
            }
          }));
          setError(document.documentElement.lang.startsWith('zh') ? `压缩包识别失败：${message}` : `Archive inspection failed: ${message}`);
        } finally {
          clearTimeout(timer);
        }
      }
    } finally {
      setArchiveInspecting(false);
    }
  };
  const workspaceFiles = useMemo(() => files.flatMap(file => {
    const manifest = archiveManifests[fileKey(file)];
    return manifest?.entries?.length ? manifest.entries.map((entry, index) => ({
      ...entry,
      size: entry.size_bytes,
      archiveName: file.name,
      archiveIndex: index,
      virtual: true,
      parentKey: fileKey(file)
    })) : [file];
  }), [files, archiveManifests]);
  const workspaceTotalSize = useMemo(() => workspaceFiles.reduce((sum, file) => sum + Number(file.size || file.size_bytes || 0), 0), [workspaceFiles]);
  const hasArchiveErrors = useMemo(() => Object.values(archiveManifests).some(manifest => manifest?.error), [archiveManifests]);
  const smartPlan = useMemo(() => smartPlanForFiles(workspaceFiles), [workspaceFiles]);
  useEffect(() => {
    if (!files.length || !authToken) {
      setAiInsight(null);
      setAiInsightError('');
      setAiAnalyzing(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setAiAnalyzing(true);
      setAiInsightError('');
      try {
        const body = new FormData();
        files.forEach(file => body.append('files', file));
        const response = await fetch(`${API_BASE}/api/workspace/analyze`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`
          },
          body,
          signal: controller.signal
        });
        const result = await readJson(response);
        if (!response.ok) throw new Error(result.detail || 'Document analysis failed');
        setAiInsight(result);
        const recommendation = result.recommendation || {};
        if (Array.isArray(recommendation.recommended_services) && recommendation.recommended_services.length) {
          setServices(recommendation.recommended_services);
        }
        if (recommendation.recommended_target_language) {
          setTranslationTargets([recommendation.recommended_target_language]);
        }
        setOutputOptions(current => ({
          ...current,
          profile: recommendation.profile || current.profile
        }));
      } catch (err) {
        if (err?.name !== 'AbortError') {
          setAiInsight(null);
          setAiInsightError(err.message || 'Document analysis failed');
        }
      } finally {
        if (!controller.signal.aborted) setAiAnalyzing(false);
      }
    }, 450);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [files, authToken]);
  useEffect(() => {
    if (!files.length) {
      setServices([]);
      setTranslationTargets([]);
      setOutputFormats([]);
      setOutputOptions({
        profile: 'auto',
        language_mode: 'single',
        output_strategy: 'preserve',
        primary_format: 'original',
        additional_formats: [],
        layout_profile: 'auto',
        preserve_layout: true,
        preserve_formulas: true,
        preserve_images: true,
        preserve_comments: false,
        preserve_links: true,
        auto_width: true,
        auto_row_height: true,
        freeze_header: false,
        preserve_cell_coordinates: true,
        preserve_merged_cells: true,
        protect_plc_codes: false,
        bilingual_layout: 'auto',
        columns_style: 'address-with-text',
        address_mode: 'keep',
        inline_style: 'dash',
        vertical_order: 'source-first'
      });
      return;
    }
    if (smartPlan.profile === 'spreadsheet') {
      setServices(current => [...new Set([...current.filter(id => !['ocr', 'data_cleanup', 'enterprise_analysis'].includes(id)), 'translation', 'conversion'])]);
      setOutputFormats(current => current.length ? current : ['original']);
      setOutputOptions(current => ({
        ...current,
        preserve_layout: true,
        preserve_formulas: true,
        preserve_images: true,
        preserve_comments: false,
        preserve_links: true,
        auto_width: true,
        profile: 'spreadsheet',
        auto_row_height: true,
        freeze_header: false,
        preserve_cell_coordinates: true,
        preserve_merged_cells: true,
        protect_plc_codes: false,
        bilingual_layout: current.bilingual_layout || 'auto',
        columns_style: current.columns_style || 'text-only',
        address_mode: current.address_mode || 'keep'
      }));
    } else if (smartPlan.ocrAuto) {
      setServices(current => [...new Set(['ocr', 'translation', 'conversion', ...current])]);
      setOutputFormats(current => current.length ? current : ['original']);
    }
  }, [files.length, smartPlan.profile, smartPlan.ocrAuto]);
  async function submitOrder(e) {
    e.preventDefault();
    if (!files.length) return setError(t.fileRequired);
    if (hasArchiveErrors) return setError(document.documentElement.lang.startsWith('zh') ? '存在未成功解压的压缩包，请移除或重新上传后再创建订单。' : 'An archive could not be extracted. Remove it or upload it again before creating the order.');
    const translationEnabled = services.includes('translation');
    const languageMode = translationEnabled ? (outputOptions.language_mode || (translationTargets.length > 1 ? 'multiple' : 'single')) : 'none';
    const normalizedTargets = languageMode === 'multiple' ? translationTargets : translationTargets.slice(0, 1);
    if (translationEnabled && !normalizedTargets.length) return setError(t.languageRequired);
    if (translationEnabled && languageMode !== 'multiple' && translationTargets.length > 1) return setError(document.documentElement.lang.startsWith('zh') ? '单语言和双语输出只能选择一个目标语言。' : 'Single and bilingual output allow only one target language.');
    if (!currentUser) {
      setError(document.documentElement.lang.startsWith('zh') ? '请先登录，登录后系统会自动读取姓名和邮箱。' : 'Please sign in. Your name and email will be read from your account automatically.');
      setPage('login');
      return;
    }
    const orderForm = {
      ...form,
      name: currentUser.name || form.name || currentUser.email?.split('@')[0] || 'User',
      email: currentUser.email || form.email,
      company: ''
    };
    if (!orderForm.email) return setError(t.contactRequired);
    const outputStrategy = outputOptions.output_strategy || 'preserve';
    const primaryFormat = outputOptions.primary_format || outputFormats.find(format => format !== 'original') || 'original';
    const additionalFormats = Array.isArray(outputOptions.additional_formats) ? outputOptions.additional_formats : outputFormats.filter(format => format !== 'original');
    const resolvedFormats = outputStrategy === 'convert'
      ? [primaryFormat]
      : outputStrategy === 'preserve_and_additional'
        ? ['original', ...additionalFormats]
        : ['original'];
    const translation = translationEnabled ? {
      enabled: true,
      source_language: 'auto',
      target_language: normalizedTargets[0] || '',
      targets: normalizedTargets,
      language_mode: languageMode,
      bilingual_layout: languageMode === 'bilingual' ? (outputOptions.bilingual_layout || 'auto') : 'target-only',
      layout_profile: outputOptions.layout_profile || 'auto'
    } : {
      enabled: false,
      source_language: 'auto',
      target_language: '',
      targets: [],
      language_mode: 'none',
      bilingual_layout: 'none',
      layout_profile: 'auto'
    };
    const conversion = {
      formats: [...new Set(resolvedFormats)],
      output_strategy: outputStrategy,
      primary_format: outputStrategy === 'convert' ? primaryFormat : 'original',
      additional_formats: outputStrategy === 'preserve_and_additional' ? additionalFormats : [],
      options: { ...outputOptions, language_mode: translation.language_mode, bilingual_layout: translation.bilingual_layout },
      user_instructions: orderForm.requirements || ''
    };
    setSubmitting(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 900000);
    try {
      let r;
      if (files.some(f => f.size > 3 * 1024 * 1024) || totalSize > 3 * 1024 * 1024) {
        const uploadIds = [];
        const chunkSize = 2 * 1024 * 1024;
        for (const file of files) {
          let init = await fetch(`${API_BASE}/api/uploads/init`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`
            },
            body: JSON.stringify({
              filename: file.name,
              size_bytes: file.size,
              content_type: file.type || 'application/octet-stream'
            }),
            signal: controller.signal
          });
          let meta = await init.json();
          if (!init.ok) throw new Error(meta.detail || t.submitFailed);
          for (let offset = 0, index = 0; offset < file.size; offset += chunkSize, index++) {
            const part = file.slice(offset, Math.min(file.size, offset + chunkSize));
            const cr = await fetch(`${API_BASE}/api/uploads/${meta.upload_id}/chunks/${index}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/octet-stream',
                Authorization: `Bearer ${authToken}`
              },
              body: part,
              signal: controller.signal
            });
            const cj = await cr.json();
            if (!cr.ok) throw new Error(cj.detail || t.submitFailed);
          }
          const done = await fetch(`${API_BASE}/api/uploads/${meta.upload_id}/complete`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${authToken}`
            },
            signal: controller.signal
          });
          const dj = await done.json();
          if (!done.ok) throw new Error(dj.detail || t.submitFailed);
          uploadIds.push(meta.upload_id);
        }
        r = await fetch(`${API_BASE}/api/orders/from-uploads`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({
            upload_ids: uploadIds,
            ...orderForm,
            services: services.length ? services : ['standard'],
            translation,
            conversion
          }),
          signal: controller.signal
        });
      } else {
        const data = new FormData();
        files.forEach(f => data.append('files', f));
        Object.entries(orderForm).forEach(([k, v]) => data.append(k, v));
        data.append('services', JSON.stringify(services.length ? services : ['standard']));
        data.append('translation_json', JSON.stringify(translation));
        data.append('conversion_json', JSON.stringify(conversion));
        r = await fetch(`${API_BASE}/api/orders`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`
          },
          body: data,
          signal: controller.signal
        });
      }
      const raw = await r.text();
      let j = {};
      try {
        j = raw ? JSON.parse(raw) : {};
      } catch {
        j = {
          detail: raw
        };
      }
      if (!r.ok) throw new Error(j.detail || t.submitFailed);
      setOrderStatus({
        ...j,
        email: orderForm.email,
        services: services.length ? services : ['standard'],
        translation_targets: translation.targets,
        output_formats: conversion.formats
      });
      setPage('status');
    } catch (err) {
      setError(err.name === 'AbortError' ? document.documentElement.lang.startsWith('zh') ? '云端处理超过15分钟未完成，请检查文件规模、AI 配置或后端日志后重试。' : 'Cloud processing timed out after 15 minutes. Check file size, AI settings, or backend logs and retry.' : err.message || t.submitFailed);
    } finally {
      clearTimeout(timeout);
      setSubmitting(false);
    }
  }
  return <div className="app-shell">
    {!isWorkspacePage && <header className="topbar"><button className="brand" onClick={() => setPage('home')}><span className="brand-mark">DA</span><span><b>Document Automation AI</b><small>{t.brandSubtitle}</small></span></button>
      <nav className={mobile ? 'nav open' : 'nav'}><a href="#platform" onClick={() => {
          setPage('home');
          setMobile(false);
        }}>{uiL('产品能力', 'Product', 'Sản phẩm')}</a><a href="#workflow" onClick={() => {
          setPage('home');
          setMobile(false);
        }}>{uiL('解决方案', 'Solutions', 'Giải pháp')}</a><a href="#pricing" onClick={() => {
          setPage('home');
          setMobile(false);
        }}>{t.pricing}</a><button className="nav-link-button" onClick={() => {
          setPage('knowledge');
          setMobile(false);
        }}>{uiL('资源', 'Resources', 'Tài nguyên')}</button></nav><div className="auth-nav">{currentUser ? <div className="account-menu" onMouseEnter={cancelAccountClose} onMouseLeave={scheduleAccountClose}><button className="account-trigger" onClick={() => {
            cancelAccountClose();
            setLanguageOpen(false);
            setAccountOpen(v => !v);
          }}><span>{(currentUser.name || currentUser.email || 'U').slice(0, 1).toUpperCase()}</span><b>{currentUser.name || currentUser.email}</b><ChevronDown size={15} /></button>{accountOpen && <div className="account-popover account-popover-v3383"><header className="account-popover-profile-link" role="button" tabIndex={0} onClick={() => {
              setPage('account');
              setAccountOpen(false);
            }} onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setPage('account');
                setAccountOpen(false);
              }
            }}><span>{(currentUser.name || currentUser.email || 'U').slice(0, 1).toUpperCase()}</span><div><b>{currentUser.name || currentUser.email}</b><small>{currentUser.role === 'owner' ? uiL('所有者', 'Owner', 'Chủ sở hữu') : currentUser.role === 'admin' ? uiL('管理员', 'Administrator', 'Quản trị viên') : uiL('成员', 'Member', 'Thành viên')}</small><em>{currentUser.email || ''}</em></div><ChevronRight className="account-profile-arrow" /></header><section><small>{uiL('工作', 'WORK', 'CÔNG VIỆC')}</small><button className={page === 'dashboard' ? 'active' : ''} onClick={() => {
                setPage('home');
                setAccountOpen(false);
              }}><LayoutDashboard />{uiL('工作台', 'Workspace', 'Không gian làm việc')}</button>{['owner', 'admin'].includes(currentUser?.role) && <button className={page === 'admin' ? 'active' : ''} onClick={() => {
                setPage('admin');
                setAccountOpen(false);
              }}><ShieldCheck />{uiL('管理后台', 'Admin Console', 'Bảng quản trị')}</button>}<button className={page === 'projects' ? 'active' : ''} onClick={() => {
                setPage('projects');
                setAccountOpen(false);
              }}><FolderOpen />{uiL('项目中心', 'Project center', 'Trung tâm dự án')}</button><button className={page === 'processing' ? 'active' : ''} onClick={() => {
                setPage('processing');
                setAccountOpen(false);
              }}><Activity />{uiL('真实处理中心', 'Processing center', 'Trung tâm xử lý')}</button></section><section><small>{uiL('账户', 'ACCOUNT', 'TÀI KHOẢN')}</small><button className={page === 'account' ? 'active' : ''} onClick={() => {
                setPage('account');
                setAccountOpen(false);
              }}><UserRound />{uiL('我的账户', 'My account', 'Tài khoản của tôi')}</button><button className={page === 'billing' ? 'active' : ''} onClick={() => {
                setPage('billing');
                setAccountOpen(false);
              }}><CreditCard />{uiL('账单与套餐', 'Billing & plans', 'Thanh toán & gói')}</button></section><button className="danger" onClick={() => {
              fetch(`${API_BASE}/api/auth/logout`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${authToken}`
                }
              });
              localStorage.removeItem('da_auth_token');
              setAuthToken('');
              setCurrentUser(null);
              setAccountOpen(false);
              setPage('login');
            }}><ArrowLeft />{uiL('退出登录', 'Sign out', 'Đăng xuất')}</button></div>}</div> : <><button className="sign-in-link" onClick={() => setPage('login')}>{uiL('登录', 'Sign in', 'Đăng nhập')}</button><button className="nav-primary auth-register" onClick={() => setPage('register')}>{uiL('注册', 'Register', 'Đăng ký')}</button></>}</div>
      <div className="language-menu" onMouseEnter={cancelLanguageClose} onMouseLeave={scheduleLanguageClose}><button type="button" className="language-switch" aria-label={t.languageLabel} aria-haspopup="menu" aria-expanded={languageOpen} onClick={e => {
          e.stopPropagation();
          cancelLanguageClose();
          setAccountOpen(false);
          setLanguageOpen(v => !v);
        }}><Languages size={17} /><span>{t.lang}</span><ChevronDown size={14} className={languageOpen ? 'rotated' : ''} /></button>{languageOpen && <div className="language-popover" role="menu">{LANGUAGE_OPTIONS.map(([id, flag, label]) => <button type="button" role="menuitemradio" aria-checked={locale === id} className={locale === id ? 'active' : ''} key={id} onClick={() => {
            setLocale(id);
            setLanguageOpen(false);
          }}><span><i className="language-flag">{flag}</i>{label}</span>{locale === id && <Check size={16} />}</button>)}</div>}</div>
      <button className="menu" onClick={() => setMobile(!mobile)}>{mobile ? <X /> : <Menu />}</button></header>}
    {page === 'order' && <TaskStyleOptions isZh={locale.startsWith('zh')} outputOptions={outputOptions} setOutputOptions={setOutputOptions} />}
    {page === 'home' && <Home t={t} setPage={setPage} locale={locale} authToken={authToken} currentUser={currentUser} />} {page === 'order' && <PageErrorBoundary locale={locale} onBack={() => setPage('home')}><OrderCenter {...{
        t,
        files,
        addFiles,
        setFiles,
        totalSize,
        services,
        setServices,
        translationTargets,
        setTranslationTargets,
        outputFormats,
        setOutputFormats,
        outputOptions,
        setOutputOptions,
        form,
        setForm,
        submitOrder,
        submitting,
        error,
        setError,
        setPage,
        smartPlan,
        preferences,
        currentUser,
        archiveManifests,
        setArchiveManifests,
        archiveInspecting,
        workspaceFiles,
        workspaceTotalSize,
        fileKey,
        hasArchiveErrors,
        aiInsight,
        aiAnalyzing,
        aiInsightError
      }} /></PageErrorBoundary>} {page === 'status' && <OrderStatus t={t} data={orderStatus} setPage={setPage} />} {page === 'projects' && <ProjectCenter locale={locale} setPage={setPage} authToken={authToken} />} {page === 'dashboard' && <PageErrorBoundary locale={locale} onBack={() => setPage('home')}><Dashboard t={t} setPage={setPage} authToken={authToken} currentUser={currentUser} setAuthToken={setAuthToken} setCurrentUser={setCurrentUser} /></PageErrorBoundary>} {page === 'admin' && (['owner', 'admin'].includes(currentUser?.role) ? <PageErrorBoundary locale={locale} onBack={() => setPage('dashboard')}><AdminConsole setPage={setPage} authToken={authToken} currentUser={currentUser} /></PageErrorBoundary> : <PageErrorBoundary locale={locale} onBack={() => setPage('home')}><Dashboard t={t} setPage={setPage} authToken={authToken} currentUser={currentUser} setAuthToken={setAuthToken} setCurrentUser={setCurrentUser} /></PageErrorBoundary>)} {page === 'processing' && <ProcessingCenter t={t} setPage={setPage} authToken={authToken} />} {page === 'knowledge' && <KnowledgeCenter t={t} setPage={setPage} />} {page === 'templates' && <TemplateCenter setPage={setPage} />} {page === 'team' && <TeamPermissionsCenter setPage={setPage} currentUser={currentUser} />} {page === 'billing' && <PaymentCenter setPage={setPage} locale={locale} authToken={authToken} currentUser={currentUser} />} {page === 'acceptance' && <AcceptanceCenter setPage={setPage} />} {page === 'login' && <AuthPage mode="login" locale={locale} setPage={setPage} setAuthToken={setAuthToken} setCurrentUser={setCurrentUser} />} {page === 'register' && <AuthPage mode="register" locale={locale} setPage={setPage} setAuthToken={setAuthToken} setCurrentUser={setCurrentUser} />} {page === 'account' && <AccountPage locale={locale} user={currentUser} authToken={authToken} setPage={setPage} />} {page === 'aiProviders' && <SettingsPage locale={locale} setLocale={setLocale} user={currentUser} authToken={authToken} setAuthToken={setAuthToken} setCurrentUser={setCurrentUser} setPage={setPage} providerOnly />} {page === 'settings' && <SettingsPage locale={locale} setLocale={setLocale} user={currentUser} authToken={authToken} setAuthToken={setAuthToken} setCurrentUser={setCurrentUser} setPage={setPage} />}  
    {!isWorkspacePage && <footer className="enterprise-footer footer-v3034"><div className="footer-main"><div className="footer-brand-block"><div className="brand footer-brand"><span className="brand-mark">DA</span><span><b>Document Automation AI</b><small>{document.documentElement.lang.startsWith('zh') ? '企业 AI 文档平台' : 'Enterprise AI Document Platform'}</small></span></div><p>{t.footer}</p><div className="footer-trust"><span><ShieldCheck />{document.documentElement.lang.startsWith('zh') ? '安全' : 'Secure'}</span><span><Sparkles />{document.documentElement.lang.startsWith('zh') ? '高效' : 'Fast'}</span><span><Workflow />{document.documentElement.lang.startsWith('zh') ? '可扩展' : 'Scalable'}</span></div></div><div className="footer-links footer-links-six"><div><b>{document.documentElement.lang.startsWith('zh') ? '产品' : 'Products'}</b><span>OCR</span><span>{document.documentElement.lang.startsWith('zh') ? '文档翻译' : 'Translation'}</span><span>{document.documentElement.lang.startsWith('zh') ? '格式转换' : 'Conversion'}</span><span>{document.documentElement.lang.startsWith('zh') ? '智能自动化' : 'Automation'}</span></div><div><b>{uiL('解决方案', 'Solutions', 'Giải pháp')}</b><span>{document.documentElement.lang.startsWith('zh') ? '制造业' : 'Manufacturing'}</span><span>{document.documentElement.lang.startsWith('zh') ? '自动化' : 'Automation'}</span><span>{document.documentElement.lang.startsWith('zh') ? '财务与法律' : 'Finance & Legal'}</span></div><div><b>{uiL('资源', 'Resources', 'Tài nguyên')}</b><span>{document.documentElement.lang.startsWith('zh') ? '帮助中心' : 'Help Center'}</span><span>{document.documentElement.lang.startsWith('zh') ? '版本说明' : 'Release Notes'}</span><span>{document.documentElement.lang.startsWith('zh') ? '路线图' : 'Roadmap'}</span></div><div><b>{document.documentElement.lang.startsWith('zh') ? '公司' : 'Company'}</b><span>{document.documentElement.lang.startsWith('zh') ? '关于我们' : 'About'}</span><span>{document.documentElement.lang.startsWith('zh') ? '合作伙伴' : 'Partners'}</span><span>{document.documentElement.lang.startsWith('zh') ? '联系我们' : 'Contact'}</span></div><div><b>{document.documentElement.lang.startsWith('zh') ? '支持' : 'Support'}</b><span>{document.documentElement.lang.startsWith('zh') ? '服务状态' : 'System Status'}</span><span>API</span><span>{document.documentElement.lang.startsWith('zh') ? 'AI 知识库' : 'AI Knowledge Base'}</span></div><div><b>{document.documentElement.lang.startsWith('zh') ? '法律' : 'Legal'}</b><span>Privacy</span><span>Terms</span><span>Cookies</span><span>Security</span></div></div></div><div className="footer-bottom"><span>© 2026 Document Automation AI</span><div className="footer-languages"><span>English</span><span>中文</span><span>Tiếng Việt</span><span>日本語</span><span>한국어</span></div><small>Build {VERSION}</small></div></footer>}
  </div>;
}
class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }
  componentDidCatch(error, info) {
    console.error('Page render error:', error, info);
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    const zh = String(this.props.locale || '').startsWith('zh');
    return <main className="page-wrap"><section className="processing-auth"><AlertTriangle /><h1>{zh ? '页面加载失败' : 'Page failed to load'}</h1><p>{zh ? '页面发生异常，但系统没有整页白屏。请返回工作台后重试。' : 'An unexpected error occurred. Return home and try again.'}</p><button onClick={() => {
          this.setState({
            hasError: false,
            error: null
          });
          this.props.onBack?.();
        }}>{zh ? '返回工作台' : 'Back to workspace'}</button></section></main>;
  }
}
function Home({
  t,
  setPage,
  locale,
  authToken,
  currentUser
}) {
  const zh = String(locale).startsWith('zh');
  const vi = locale === 'vi';
  const [billing, setBilling] = useState('monthly');
  const [faqOpen, setFaqOpen] = useState(0);
  const plans = [{
    id: 'free',
    name: 'Free',
    icon: ShieldCheck,
    tag: zh ? '体验核心能力' : 'Explore core capabilities',
    monthly: '$0',
    yearly: '$0',
    equivalent: zh ? '永久免费' : 'Forever free',
    cta: zh ? '免费开始' : 'Start free'
  }, {
    id: 'starter',
    name: 'Starter',
    icon: Sparkles,
    tag: zh ? '个人与轻量工作' : 'Individuals and light work',
    monthly: '$19',
    yearly: '$190',
    equivalent: zh ? '约 $15.8 / 月' : 'About $15.8 / mo',
    cta: zh ? '选择 Starter' : 'Choose Starter'
  }, {
    id: 'professional',
    name: 'Professional',
    icon: Star,
    tag: zh ? '专业团队的首选' : 'Best for professional teams',
    monthly: '$59',
    yearly: '$590',
    equivalent: zh ? '约 $49.2 / 月' : 'About $49.2 / mo',
    cta: zh ? '当前选择' : 'Choose Professional',
    popular: true
  }, {
    id: 'business',
    name: 'Business',
    icon: LayoutDashboard,
    tag: zh ? '企业级业务处理' : 'Enterprise-scale operations',
    monthly: '$149',
    yearly: '$1,490',
    equivalent: zh ? '约 $124.2 / 月' : 'About $124.2 / mo',
    cta: zh ? '选择 Business' : 'Choose Business',
    business: true
  }, {
    id: 'enterprise',
    name: 'Enterprise',
    icon: ShieldCheck,
    tag: zh ? '安全、合规与部署' : 'Security, compliance and deployment',
    monthly: zh ? '定制' : 'Custom',
    yearly: zh ? '定制' : 'Custom',
    equivalent: zh ? '联系销售获取报价' : 'Contact sales for pricing',
    cta: zh ? '联系销售' : 'Contact sales'
  }];
  const compare = [{
    name: zh ? 'DA AI 点数' : 'DA AI credits',
    desc: zh ? '可用于所有 AI 处理任务' : 'For all AI processing tasks',
    icon: Sparkles,
    values: ['500', '2,000', '8,000', '30,000', zh ? '合约定制' : 'Contract']
  }, {
    name: zh ? 'OCR 能力' : 'OCR capability',
    desc: zh ? '扫描件识别与文本提取' : 'Scans and text extraction',
    icon: ScanText,
    values: [zh ? '基础 OCR' : 'Basic OCR', zh ? '增强 OCR' : 'Enhanced OCR', 'AI OCR', zh ? '企业 OCR' : 'Enterprise OCR', zh ? '定制 OCR' : 'Custom OCR']
  }, {
    name: zh ? 'AI 文档翻译' : 'AI document translation',
    desc: zh ? '多语言翻译与本地化' : 'Multilingual translation and localization',
    icon: Languages,
    values: ['—', zh ? 'Starter+' : 'Starter+', zh ? '已包含' : 'Included', zh ? '已包含' : 'Included', zh ? '已包含' : 'Included']
  }, {
    name: zh ? '单次任务上传数量' : 'Files per task',
    desc: zh ? '每次可上传的文件数量' : 'Maximum files in one task',
    icon: CloudUpload,
    values: ['1', '20', '100', zh ? '不限量' : 'Unlimited', zh ? '按需定制' : 'Custom']
  }, {
    name: zh ? '单文件最大大小' : 'Maximum file size',
    desc: zh ? '单个文件大小限制' : 'Per-file size limit',
    icon: FileText,
    values: ['10 MB', '50 MB', '200 MB', '500 MB', zh ? '按需定制' : 'Custom']
  }, {
    name: zh ? '输出方式' : 'Output capabilities',
    desc: zh ? '文档处理后的输出能力' : 'Delivery and output options',
    icon: Download,
    values: [zh ? '基础转换' : 'Basic conversion', zh ? '智能整理' : 'Smart cleanup', zh ? 'AI 优化 / 模板输出' : 'AI optimization / templates', zh ? '企业级重构' : 'Enterprise reconstruction', zh ? '完全定制' : 'Fully custom']
  }, {
    name: zh ? '团队成员' : 'Team members',
    desc: zh ? '可共享使用的成员数量' : 'Shared workspace members',
    icon: LayoutDashboard,
    values: ['1', '1', '3', '10', zh ? '不限量' : 'Unlimited']
  }, {
    name: zh ? '企业知识库' : 'Enterprise knowledge base',
    desc: zh ? '术语库与知识管理' : 'Glossary and knowledge management',
    icon: BookOpen,
    values: ['—', zh ? 'Professional+' : 'Professional+', zh ? '已包含' : 'Included', zh ? '已包含' : 'Included', zh ? '已包含' : 'Included']
  }, {
    name: zh ? 'API 接口' : 'API access',
    desc: zh ? '系统集成与自动化对接' : 'Automation and system integration',
    icon: Code2,
    values: ['—', zh ? 'Business+' : 'Business+', zh ? 'Business+' : 'Business+', zh ? '已包含' : 'Included', zh ? '已包含' : 'Included']
  }, {
    name: zh ? '私有部署' : 'Private deployment',
    desc: zh ? '本地化部署与数据隔离' : 'On-premise deployment and data isolation',
    icon: ShieldCheck,
    values: ['—', '—', zh ? 'Enterprise' : 'Enterprise', zh ? 'Enterprise' : 'Enterprise', zh ? '已包含' : 'Included']
  }];
  const faqs = zh ? [['AI 点数如何计算？', 'AI 点数用于 OCR、翻译、格式转换和智能整理，实际消耗取决于文件大小、页数和处理复杂度。'], ['支持哪些文件格式？', '支持 PDF、Word、Excel、PowerPoint、CSV、TXT、图片和 ZIP 批量文件。'], ['文档数据安全吗？', '文件按订单隔离处理。企业版可提供本地私有部署、权限控制与专属安全方案。'], ['可以立即购买套餐吗？', '当前测试环境仅开放套餐、额度和钱包数据验收，真实支付尚未启用。']] : [['How are AI credits calculated?', 'AI credits cover OCR, translation, conversion and smart organization. Actual usage depends on file size, page count and processing complexity.'], ['Which file formats are supported?', 'PDF, Word, Excel, PowerPoint, CSV, TXT, images and ZIP batches are supported.'], ['Is document data secure?', 'Files are isolated by order. Enterprise plans support on-premise deployment and advanced access controls.'], ['Can I purchase a plan now?', 'The test environment currently supports read-only validation of plans, credits and wallet data. Real payments are not enabled.']];
  const value = v => {
    const text = String(v);
    const included = text === '已包含' || text === 'Included';
    const upgrade = /Starter\+|Professional\+|Business\+|Enterprise/.test(text);
    return <span className={`capability-tag ${included ? 'included' : upgrade ? 'upgrade' : 'level'}`}>{text}</span>;
  };
  return <>
  <main className="hero v29-hero hero-v304"><div className="hero-copy"><div className="eyebrow"><Sparkles size={15} />{zh ? '企业文档智能平台' : 'Enterprise Document Intelligence'}</div><h1>{t.heroTitle1}<br /><em>{t.heroTitle2}</em></h1><p>{t.heroDesc}</p><div className="hero-actions"><button className="primary-xl" onClick={() => setPage('order')}>{t.start}<ArrowRight /></button><button className="secondary-xl" onClick={() => setPage('dashboard')}><LayoutDashboard />{t.viewWorkspace}</button></div><div className="format-strip"><span>PDF</span><span>WORD</span><span>EXCEL</span><span>PPT</span><span>IMAGE</span></div><div className="trust-line"><CircleCheck />{zh ? '无需安装' : 'No installation'}<CircleCheck />{zh ? '订单隔离' : 'Isolated processing'}<CircleCheck />{zh ? '多语言交付' : 'Multilingual delivery'}</div></div><div className="hero-stage"><div className="glow" /><LiveHeroTask {...{
          zh,
          vi,
          setPage
        }} /></div></main>
  <section className="logo-cloud-v304"><p>{zh ? '适用于全球文档密集型团队' : 'Built for document-intensive teams worldwide'}</p><div><span>MANUFACTURING</span><span>AUTOMATION</span><span>ENGINEERING</span><span>FINANCE</span><span>LEGAL</span><span>OPERATIONS</span></div></section>
  <section id="platform" className="section platform-v304 homepage-section"><div className="section-head"><h2>{t.platformTitle}</h2><p>{t.platformDesc}</p></div><div className="tool-grid">{[[ScanText, t.serviceOcr, t.toolOcrDesc], [Languages, t.serviceTranslation, t.toolTranslationDesc], [Workflow, t.serviceConversion, t.toolConversionDesc], [Sparkles, t.serviceCleanup, t.toolCleanupDesc], [ShieldCheck, t.toolQuality, t.toolQualityDesc], [Code2, t.toolApi, t.toolApiDesc]].map(([Icon, title, desc]) => <article key={title}><Icon /><h3>{title}</h3><p>{desc}</p></article>)}</div></section>
  <section id="workflow" className="workflow-section workflow-v304 homepage-section"><div className="section-head light"><h2>{t.workflowTitle}</h2><p>{t.workflowDesc}</p></div><div className="steps">{[[CloudUpload, '01', t.stepUpload, zh ? '上传 PDF、Word、Excel、PPT、图片或批量压缩包' : 'Upload PDF, Word, Excel, PPT, images or ZIP batches'], [ScanText, '02', t.stepUnderstand, zh ? '自动识别内容结构、表格、语言与版式' : 'Detect structure, tables, language and layout'], [Sparkles, '03', t.stepProcess, zh ? '按订单执行 OCR、翻译、转换和智能整理' : 'Run OCR, translation, conversion and smart cleanup'], [ShieldCheck, '04', t.stepValidate, zh ? '检查术语一致性、排版完整性与交付质量' : 'Validate terminology, layout integrity and delivery quality'], [Download, '05', t.stepDeliver, zh ? '生成可下载、可追踪的企业交付文件' : 'Generate traceable enterprise-ready deliverables']].map(([Icon, n, x, d]) => <article key={n}><div className="step-icon"><Icon /></div><b>{n}</b><h3>{x}</h3><p>{d}</p></article>)}</div></section>
  <section id="pricing" className="pricing-v305">
   <div className="pricing-v305-head"><div><h2>{zh ? '清楚了解每个套餐包含的功能与限制' : 'Compare every plan, capability and limit'}</h2><p>{zh ? '选择最适合当前阶段的方案，并可随业务增长灵活升级。' : 'Choose the right plan now and upgrade as your workflow grows.'}</p></div><div className="billing-switch-v305"><button className={billing === 'monthly' ? 'active' : ''} onClick={() => setBilling('monthly')}><span>{billing === 'monthly' && <CircleCheck />}<b>{zh ? '月付' : 'Monthly'}</b></span><small>{zh ? '按月灵活付费' : 'Flexible monthly billing'}</small></button><button className={billing === 'yearly' ? 'active' : ''} onClick={() => setBilling('yearly')}><span>{billing === 'yearly' && <CircleCheck />}<b>{zh ? '年付' : 'Yearly'}</b><em>{zh ? '节省 17%' : 'Save 17%'}</em></span><small>{zh ? '年度付款更优惠' : 'Best annual value'}</small></button></div></div>
   <div className="plan-strip-v305">{plans.map(plan => {
          const Icon = plan.icon;
          const displayPrice = billing === 'yearly' ? plan.yearly : plan.monthly;
          const current = plan.id === 'professional';
          return <article className={`plan-tile-v305 ${plan.popular ? 'popular' : ''} ${current ? 'current-plan-v305' : ''}`} tabIndex={current ? -1 : 0} aria-current={current ? 'true' : undefined} key={plan.id}>{plan.popular && <span className="most-popular-v305">{zh ? '最受欢迎' : 'MOST POPULAR'}</span>}<div className="plan-name-v305"><Icon /><h3>{plan.name}</h3></div><p>{plan.tag}</p>{plan.business && <small className="business-tag-v305">{zh ? '企业推荐' : 'BUSINESS PICK'}</small>}<div className="plan-price-v305"><b>{displayPrice}</b>{!['free', 'enterprise'].includes(plan.id) && <span>/{billing === 'yearly' ? zh ? '年' : 'yr' : zh ? '月' : 'mo'}</span>}</div><small className="equivalent-v305">{plan.equivalent}</small><button className={current ? 'primary current-plan-button-v305' : ''} onClick={() => setPage(plan.id === 'free' ? 'register' : 'billing')}>{current ? zh ? '选择 Professional' : 'Choose Professional' : plan.cta}</button></article>;
        })}</div>
   <div className="comparison-table-v305"><div className="compare-grid-v305 compare-head-v305"><div><b>{zh ? '功能能力' : 'CAPABILITY'}</b><small>{zh ? '比较不同套餐包含的能力' : 'Compare what every plan includes'}</small></div>{plans.map(plan => <div className={`${plan.popular ? 'recommended-col-v305' : ''} compare-plan-title-v305`} key={plan.id}><b>{plan.name}</b>{plan.business && <span className="compare-plan-badge-v305">{zh ? '企业推荐' : 'Recommended'}</span>}{plan.id === 'enterprise' && <span className="compare-plan-badge-v305 sales">{zh ? '联系销售' : 'Contact sales'}</span>}</div>)}</div>{compare.map((row, i) => {
          const Icon = row.icon;
          return <div className="compare-grid-v305" key={row.name}><div className="capability-name-v305"><Icon /><span><b>{row.name}</b><small>{row.desc}</small></span></div>{row.values.map((v, j) => {
              const text = String(v);
              const included = text === '已包含' || text === 'Included';
              const locked = /Starter\+|Professional\+|Business\+|Enterprise/.test(text);
              const custom = /定制|Custom|Contract/.test(text);
              return <div className={j === 2 ? 'recommended-col-v305' : ''} key={`${i}-${j}`}><span className={`value-pill-v305 ${included ? 'included' : locked ? 'locked' : custom ? 'custom' : ''}`}>{included && <CircleCheck />}{locked && <ShieldCheck />}{v}</span></div>;
            })}</div>;
        })}</div>
   <div className="comparison-legend-v305"><span><CircleCheck />{zh ? '已包含：当前套餐已包含该功能' : 'Included in this plan'}</span><span><ShieldCheck />{zh ? '需升级套餐：升级后可获得' : 'Available after upgrade'}</span><span><Star />{zh ? '企业专属：仅企业级套餐可用' : 'Enterprise-only capability'}</span><span>{zh ? '如何选择？' : 'Need help choosing?'} <b>{zh ? '查看选型指南 →' : 'View plan guide →'}</b></span></div>
  </section>
  <section className="faq-v29 homepage-section"><div className="section-head"><h2>{zh ? '购买前常见问题' : 'Questions before you choose'}</h2></div><div className="faq-list">{faqs.map(([q, a], i) => {
          const open = faqOpen === i;
          return <article className={open ? 'open' : ''} key={q}><button aria-expanded={open} onClick={() => setFaqOpen(open ? -1 : i)}><b>{q}</b><span><ChevronDown /></span></button><div className="faq-answer"><p>{a}</p></div></article>;
        })}</div></section>
  <section className="security-strip">{[[ShieldCheck, zh ? '安全传输' : 'Secure transfer'], [CircleCheck, zh ? '即时开通' : 'Instant activation'], [Languages, zh ? '全球语言' : 'Global languages'], [Sparkles, zh ? '企业级支持' : 'Enterprise support']].map(([Icon, x]) => <div key={x}><Icon /><b>{x}</b></div>)}</section>
  <section className="cta v29-cta homepage-cta"><div><h2>{t.ctaTitle}</h2><p>{t.ctaDesc}</p></div><button onClick={() => setPage('order')}>{t.freeStart}<ArrowRight /></button></section>
 </>;
}
function LiveHeroTask({
  zh,
  vi,
  setPage
}) {
  const tr = (z, e, v) => zh ? z : vi ? v : e;
  const [active, setActive] = useState(0);
  const stages = [[tr('文件解析', 'Document analysis', 'Phân tích tài liệu'), ScanText], [tr('AI 翻译', 'AI translation', 'Dịch AI'), Languages], [tr('版式重建', 'Layout reconstruction', 'Dựng lại bố cục'), Workflow], [tr('质量检查', 'Quality validation', 'Kiểm tra chất lượng'), ShieldCheck], [tr('生成交付文件', 'Generate delivery', 'Tạo tệp bàn giao'), Download]];
  useEffect(() => {
    const id = setInterval(() => setActive(v => (v + 1) % stages.length), 1350);
    return () => clearInterval(id);
  }, []);
  return <div className="v29-demo preview-demo live-hero-demo"><div className="v29-demo-head"><span>{tr('实时 AI 工作流', 'LIVE AI WORKFLOW', 'QUY TRÌNH AI TRỰC TIẾP')}</span><b><i className="live-dot" />{tr('系统运行中', 'System active', 'Hệ thống đang chạy')}</b></div><div className="preview-steps">{stages.map(([name, Icon], i) => {
        const done = i < active,
          running = i === active;
        const percent = done ? 100 : running ? 68 : 0;
        return <div className={`preview-step ${done ? 'done' : ''} ${running ? 'running' : ''}`} key={name}><span className="preview-icon">{done ? <CircleCheck /> : <Icon />}</span><div><b>{name}</b><small>{done ? tr('已完成', 'Completed', 'Hoàn tất') : running ? tr('AI 正在处理', 'AI processing', 'AI đang xử lý') : tr('等待中', 'Waiting', 'Đang chờ')}</small></div><i><em style={{
              width: `${percent}%`
            }} /></i><strong>{percent}%</strong></div>;
      })}</div><div className="v29-output preview-note"><Sparkles /><div><b>{tr('这是首页流程预览', 'This is a workflow preview', 'Đây là bản xem trước quy trình')}</b><small>{tr('真实任务请进入工作台的实时处理中心', 'Open the live processing center for real jobs', 'Mở trung tâm xử lý thời gian thực để xem tác vụ thật')}</small></div></div><button className="hero-live-link" onClick={() => setPage('processing')}>{tr('打开实时处理中心', 'Open live processing center', 'Mở trung tâm xử lý thời gian thực')}</button></div>;
}
function SettingsPage({
  locale,
  setLocale,
  user,
  authToken,
  setAuthToken,
  setCurrentUser,
  setPage,
  providerOnly = false
}) {
  const zh = String(locale).startsWith('zh'),
    vi = locale === 'vi';
  const L = (z, e, v) => zh ? z : vi ? v : e;
  const defaults = {
    processingTemplate: 'ai-auto',
    targetLanguage: 'auto',
    outputFormat: 'original',
    defaultCapability: 'auto',
    defaultIndustry: 'auto',
    defaultTemplate: 'enterprise',
    qualityMode: 'balanced',
    bilingualLayout: 'vertical',
    ocrMode: 'standard',
    ocrEngine: 'auto',
    knowledgeBase: 'general',
    pageSize: 'A4',
    autoQuality: true,
    autoCorrect: true,
    creditsThreshold: 1000,
    aiProvider: 'auto',
    aiModel: 'auto',
    aiConcurrency: 2,
    aiTimeout: 90,
    emailNotifications: true,
    inAppNotifications: true,
    browserNotifications: false,
    notifyCompleted: true,
    notifyFailed: true,
    notifyCredits: true,
    notifyBilling: true,
    twoFactorEnabled: false,
    loginAlerts: true,
    deviceProtection: true
  };
  const [prefs, setPrefs] = useState(() => {
    try {
      return {
        ...defaults,
        ...JSON.parse(localStorage.getItem('da_user_preferences') || '{}')
      };
    } catch {
      return defaults;
    }
  });
  const [activeSection, setActiveSection] = useState(() => {
      if (providerOnly) return 'integrations';
      const requested = localStorage.getItem('da_settings_section');
      if (requested) {
        localStorage.removeItem('da_settings_section');
        return requested;
      }
      return 'profile';
    }),
    [saved, setSaved] = useState(false),
    avatarInputRef = useRef(null),
    [securityMessage, setSecurityMessage] = useState(''),
    [headerMenu, setHeaderMenu] = useState('');
  const [profile, setProfile] = useState(() => {
    try {
      return {
        phone: '',
        department: '',
        timezone: 'Asia/Shanghai',
        theme: 'system',
        language: locale,
        ...(user || {}),
        ...JSON.parse(localStorage.getItem('da_user_profile') || '{}')
      };
    } catch {
      return user || {};
    }
  }),
    [backendConnection, setBackendConnection] = useState({
      state: authToken ? 'loading' : 'disconnected',
      detail: ''
    });
  useEffect(() => {
    const openSection = event => {
      if (!providerOnly && event?.detail) setActiveSection(event.detail);
    };
    window.addEventListener('da-settings-section', openSection);
    return () => window.removeEventListener('da-settings-section', openSection);
  }, [providerOnly]);
  const emptyApi = {
    provider: 'openai',
    profiles: {},
    providers: [],
    timeout_seconds: 90,
    max_retries: 2,
    api_status: '未连接',
    api_last_test: '—'
  };
  const [apiConfig, setApiConfig] = useState(emptyApi),
    [apiBaseline, setApiBaseline] = useState(JSON.stringify(emptyApi)),
    [apiLoading, setApiLoading] = useState(false),
    [apiBusy, setApiBusy] = useState(false),
    [settingsLoading, setSettingsLoading] = useState(Boolean(authToken)),
    [apiMessage, setApiMessage] = useState(''),
    [showKeys, setShowKeys] = useState({});
  const [baseline, setBaseline] = useState(() => JSON.stringify({
    prefs,
    profile
  }));
  useEffect(() => {
    if (!authToken) {
      setSettingsLoading(false);
      return undefined;
    }
    let cancelled = false;
    setSettingsLoading(true);
    setBackendConnection({
      state: 'loading',
      detail: ''
    });
    fetch(`${API_BASE}/api/user/settings`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    }).then(async response => {
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.detail || L('无法读取设置', 'Unable to load settings', 'Không thể tải cài đặt'));
      return data;
    }).then(data => {
      if (cancelled) return;
      setBackendConnection({
        state: 'connected',
        detail: API_BASE ? new URL(API_BASE, window.location.origin).host : window.location.host
      });
      const remotePrefs = {
        ...defaults,
        ...(data.preferences || {})
      };
      const remoteProfile = {
        phone: '',
        department: '',
        timezone: 'Asia/Shanghai',
        theme: 'system',
        language: locale,
        ...(user || {}),
        ...(data.profile || {})
      };
      setPrefs(remotePrefs);
      setProfile(remoteProfile);
      localStorage.setItem('da_user_preferences', JSON.stringify(remotePrefs));
      localStorage.setItem('da_user_profile', JSON.stringify(remoteProfile));
      setBaseline(JSON.stringify({
        prefs: remotePrefs,
        profile: remoteProfile
      }));
      if (['zh', 'en', 'vi'].includes(remoteProfile.language)) setLocale(remoteProfile.language);
      setCurrentUser?.(current => current ? {
        ...current,
        name: remoteProfile.name || current.name,
        avatar: remoteProfile.avatar || current.avatar
      } : current);
    }).catch(error => {
      if (!cancelled) {
        setApiMessage(error.message);
        setBackendConnection({
          state: 'error',
          detail: error.message
        });
      }
    }).finally(() => {
      if (!cancelled) setSettingsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [authToken]);
  const dirty = useMemo(() => JSON.stringify({
    prefs,
    profile
  }) !== baseline || JSON.stringify(apiConfig) !== apiBaseline, [prefs, profile, baseline, apiConfig, apiBaseline]);
  const adminHeaders = () => {
    const h = {
      'Content-Type': 'application/json'
    };
    if (authToken) h.Authorization = `Bearer ${authToken}`;
    return h;
  };
  const update = (k, v) => {
    setPrefs(p => ({
      ...p,
      [k]: v
    }));
    setSaved(false);
  };
  const changeProfile = (k, v) => {
    setProfile(p => ({
      ...p,
      [k]: v
    }));
    setSaved(false);
  };
  const togglePref = k => update(k, !prefs[k]);
  const handleAvatar = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type) || file.size > 2 * 1024 * 1024) {
      setApiMessage(L('头像仅支持 PNG/JPG，且不能超过 2MB。', 'Avatar must be PNG/JPG and under 2 MB.', 'Ảnh phải là PNG/JPG và dưới 2 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => changeProfile('avatar', reader.result);
    reader.readAsDataURL(file);
  };
  const updatePassword = () => {
    const next = window.prompt(L('请输入新密码（至少 8 位）', 'Enter a new password (at least 8 characters)', 'Nhập mật khẩu mới (ít nhất 8 ký tự)'));
    if (next === null) return;
    if (next.length < 8) {
      setSecurityMessage(L('密码至少需要 8 位。', 'Password must be at least 8 characters.', 'Mật khẩu phải có ít nhất 8 ký tự.'));
      return;
    }
    const confirm = window.prompt(L('请再次输入新密码', 'Enter the new password again', 'Nhập lại mật khẩu mới'));
    if (confirm !== next) {
      setSecurityMessage(L('两次输入的密码不一致。', 'Passwords do not match.', 'Mật khẩu không khớp.'));
      return;
    }
    localStorage.setItem('da_password_changed_at', new Date().toISOString());
    setSecurityMessage(L('密码已更新。正式部署时将通过账户安全接口同步。', 'Password updated. Production deployments will sync through the security API.', 'Đã cập nhật mật khẩu.'));
    setTimeout(() => setSecurityMessage(''), 3200);
  };
  const logoutOtherDevices = () => {
    if (!window.confirm(L('确定退出所有其他设备吗？当前设备会保留登录。', 'Sign out all other devices? This device will remain signed in.', 'Đăng xuất tất cả thiết bị khác?'))) return;
    localStorage.setItem('da_other_devices_signed_out_at', new Date().toISOString());
    setSecurityMessage(L('其他设备已退出。', 'Other devices have been signed out.', 'Đã đăng xuất thiết bị khác.'));
    setTimeout(() => setSecurityMessage(''), 3200);
  };
  const signOut = async () => {
    try {
      if (authToken) await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
    } catch {} finally {
      localStorage.removeItem('da_auth_token');
      localStorage.removeItem('da_user_profile');
      setAuthToken?.('');
      setCurrentUser?.(null);
      setPage('login');
    }
  };
  useEffect(() => {
    document.documentElement.dataset.theme = profile.theme || 'system';
  }, [profile.theme]);
  const providerMeta = useMemo(() => Object.fromEntries((apiConfig.providers || []).map(x => [x.id, x])), [apiConfig.providers]);
  const configuredProviders = useMemo(() => (apiConfig.providers || []).filter(item => {
    const profile = apiConfig.profiles?.[item.id] || {};
    return Boolean(profile.configured || profile.api_key || profile.api_key_masked);
  }), [apiConfig.providers, apiConfig.profiles]);
  const selectedProvider = apiConfig.provider || 'openai';
  const selectedProfile = apiConfig.profiles?.[selectedProvider] || {};
  const updateApi = (field, value) => {
    setApiConfig(current => ({
      ...current,
      profiles: {
        ...(current.profiles || {}),
        [current.provider || 'openai']: {
          ...(current.profiles?.[current.provider || 'openai'] || {}),
          [field]: value
        }
      }
    }));
    setSaved(false);
    setApiMessage('');
  };
  const chooseProvider = id => {
    setApiConfig(current => ({
      ...current,
      provider: id
    }));
    setSaved(false);
    setApiMessage('');
  };
  const copyApiKey = async () => {
    const value = selectedProfile.api_key || '';
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setApiMessage(L('API Key 已复制。', 'API key copied.', 'Đã sao chép API Key.'));
    } catch {
      setApiMessage(L('复制失败，请手动复制。', 'Copy failed. Please copy manually.', 'Sao chép thất bại.'));
    }
  };
  const loadApi = async () => {
    setApiLoading(true);
    setApiMessage('');
    try {
      const r = await fetch(`${API_BASE}/api/admin/translation-settings`, {
        headers: adminHeaders()
      });
      const j = await readJson(r);
      if (!r.ok) throw new Error(j.detail || L('无法读取 API 配置', 'Unable to load API settings', 'Không thể tải cấu hình API'));
      const value = {
        ...emptyApi,
        ...j,
        api_status: j.capability?.configured ? L('已连接', 'Connected', 'Đã kết nối') : L('未连接', 'Not connected', 'Chưa kết nối'),
        api_last_test: '—'
      };
      setApiConfig(value);
      setApiBaseline(JSON.stringify(value));
    } catch (e) {
      setApiMessage(e.message);
    } finally {
      setApiLoading(false);
    }
  };
  useEffect(() => {
    if (['integrations', 'ai'].includes(activeSection) && !(apiConfig.providers || []).length) loadApi();
  }, [activeSection]);
  const save = async () => {
    if (!dirty) {
      setSaved(true);
      setApiMessage(L('当前没有需要保存的更改。', 'There are no changes to save.', 'Không có thay đổi cần lưu.'));
      setTimeout(() => setSaved(false), 2200);
      return;
    }
    setApiBusy(true);
    setApiMessage('');
    try {
      if (!authToken) throw new Error(L('请先登录后保存设置。', 'Sign in before saving settings.', 'Hãy đăng nhập trước khi lưu cài đặt.'));
      const settingsResponse = await fetch(`${API_BASE}/api/user/settings`, {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({
          preferences: prefs,
          profile
        })
      });
      const settingsResult = await readJson(settingsResponse);
      if (!settingsResponse.ok) throw new Error(settingsResult.detail || L('设置保存失败', 'Failed to save settings', 'Lưu cài đặt thất bại'));
      const persistedPrefs = {
        ...defaults,
        ...(settingsResult.preferences || prefs)
      };
      const persistedProfile = {
        ...profile,
        ...(settingsResult.profile || {})
      };
      if (JSON.stringify(apiConfig) !== apiBaseline) {
        const p = apiConfig.profiles?.[selectedProvider] || {};
        const payload = {
          provider: selectedProvider,
          model: p.model || providerMeta[selectedProvider]?.model || '',
          base_url: p.base_url || providerMeta[selectedProvider]?.base_url || '',
          timeout_seconds: Number(apiConfig.timeout_seconds || 90),
          max_retries: Number(apiConfig.max_retries || 2)
        };
        if (p.api_key) payload.api_key = p.api_key;
        if (p.clear_api_key) payload.clear_api_key = true;
        const r = await fetch(`${API_BASE}/api/admin/translation-settings`, {
          method: 'PUT',
          headers: adminHeaders(),
          body: JSON.stringify(payload)
        });
        const j = await readJson(r);
        if (!r.ok) throw new Error(j.detail || L('API 配置保存失败', 'Failed to save API settings', 'Lưu cấu hình API thất bại'));
        const value = {
          ...apiConfig,
          ...j.settings,
          api_status: j.settings?.capability?.configured ? L('已连接', 'Connected', 'Đã kết nối') : L('未连接', 'Not connected', 'Chưa kết nối')
        };
        setApiConfig(value);
        setApiBaseline(JSON.stringify(value));
      }
      setPrefs(persistedPrefs);
      setProfile(persistedProfile);
      localStorage.setItem('da_user_preferences', JSON.stringify(persistedPrefs));
      localStorage.setItem('da_user_profile', JSON.stringify(persistedProfile));
      setCurrentUser?.(u => ({
        ...u,
        ...persistedProfile
      }));
      window.dispatchEvent(new CustomEvent('da-preferences-updated', {
        detail: persistedPrefs
      }));
      setBaseline(JSON.stringify({
        prefs: persistedPrefs,
        profile: persistedProfile
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2600);
    } catch (e) {
      setApiMessage(e.message);
    } finally {
      setApiBusy(false);
    }
  };
  const cancel = () => {
    try {
      const snapshot = JSON.parse(baseline);
      setPrefs(snapshot.prefs);
      setProfile(snapshot.profile);
      setApiConfig(JSON.parse(apiBaseline));
    } catch {}
    setSaved(false);
    setApiMessage('');
  };
  const testApi = async () => {
    if (!selectedProfile.configured && !selectedProfile.api_key) {
      setApiMessage(L('请先填写并保存当前服务商的 API Key。', 'Add and save the API key first.', 'Hãy thêm và lưu API Key trước.'));
      return;
    }
    setApiBusy(true);
    setApiMessage('');
    try {
      if (JSON.stringify(apiConfig) !== apiBaseline) await save();
      const started = performance.now();
      const r = await fetch(`${API_BASE}/api/admin/translation-settings/test`, {
        method: 'POST',
        headers: adminHeaders()
      });
      const j = await readJson(r);
      if (!r.ok) throw new Error(j.detail || L('连接测试失败', 'Connection test failed', 'Kiểm tra kết nối thất bại'));
      const testedAt = new Date().toLocaleString();
      setApiConfig(x => ({
        ...x,
        api_status: L('已连接', 'Connected', 'Đã kết nối'),
        api_last_test: testedAt
      }));
      setApiMessage(`${L('连接成功', 'Connected successfully', 'Kết nối thành công')} · ${j.model || ''} · ${Math.round(j.elapsed_ms || performance.now() - started)} ms`);
    } catch (e) {
      setApiConfig(x => ({
        ...x,
        api_status: L('连接失败', 'Connection failed', 'Kết nối thất bại')
      }));
      setApiMessage(e.message);
    } finally {
      setApiBusy(false);
    }
  };
  const groups = providerOnly ? [[L('AI 服务', 'AI', 'AI'), [['integrations', L('服务商与扩展', 'Providers & extensions', 'Nhà cung cấp & mở rộng'), Cpu]]]] : [[L('个人', 'PERSONAL', 'CÁ NHÂN'), [['general', L('通用设置', 'General', 'Cài đặt chung'), Globe2], ['profile', L('个人资料', 'Profile', 'Hồ sơ'), UserRound], ['security', L('账户安全', 'Security', 'Bảo mật'), LockKeyhole], ['notifications', L('通知', 'Notifications', 'Thông báo'), Bell]]], [L('AI', 'AI', 'AI'), [['processing', L('默认处理模板', 'Default processing template', 'Mẫu xử lý mặc định'), SlidersHorizontal], ['ai', L('AI 与 OCR', 'AI & OCR', 'AI & OCR'), Bot], ['output', L('输出与质量', 'Output & quality', 'Đầu ra & chất lượng'), FileText], ['integrations', L('服务商与扩展', 'Providers & extensions', 'Nhà cung cấp & mở rộng'), Cpu]]], [L('团队', 'TEAM', 'NHÓM'), [['team', L('成员与权限', 'Members & permissions', 'Thành viên & quyền'), ShieldCheck]]], [L('账单', 'BILLING', 'THANH TOÁN'), [['billing', L('套餐与用量', 'Plans & usage', 'Gói & mức sử dụng'), CreditCard]]], [L('高级', 'ADVANCED', 'NÂNG CAO'), [['advanced', L('高级设置', 'Advanced settings', 'Cài đặt nâng cao'), Settings2]]]];
  const sections = groups.flatMap(x => x[1]);
  const nav = [['home', L('返回首页', 'Back to home', 'Về trang chủ'), House], ['dashboard', L('企业工作台', 'Enterprise Workspace', 'Không gian doanh nghiệp'), LayoutDashboard], ['processing', L('实时任务', 'Live Tasks', 'Tác vụ trực tiếp'), Clock3], ['projects', L('文档中心', 'Document Center', 'Trung tâm tài liệu'), FolderOpen], ['knowledge', L('企业知识库', 'Enterprise Knowledge', 'Kho kiến thức doanh nghiệp'), BookOpen], ['templates', L('模板中心', 'Template Center', 'Trung tâm mẫu'), Grid3X3], ['team', L('团队与权限', 'Team & Permissions', 'Nhóm & quyền'), ShieldCheck], ['billing', L('套餐与用量', 'Plans & usage', 'Gói & mức sử dụng'), Sparkles], ['settings', L('系统设置', 'System Settings', 'Cài đặt hệ thống'), Workflow]];
  const initial = (profile.name || profile.email || 'U').slice(0, 1).toUpperCase();
  const plan = profile.plan_name || L('专业版', 'Professional Plan', 'Gói chuyên nghiệp');
  const credits = profile.credits ?? '—';
  const memberSince = profile.created_at ? String(profile.created_at).slice(0, 10) : '—';
  const lastSignIn = profile.last_login_at ? String(profile.last_login_at).replace('T', ' ').slice(0, 16) : '—';
  const field = (label, key, type = 'text', placeholder = '') => <label><span>{label}</span><input type={type} value={profile[key] || ''} placeholder={placeholder} onChange={e => changeProfile(key, e.target.value)} /></label>;
  const planExpiry = profile.plan_expires_at ? String(profile.plan_expires_at).slice(0, 10) : '—';
  const monthlyUsage = profile.monthly_credit_usage ?? '—';
  return <main className={`settings-enterprise-v333 settings-final-v341 ${providerOnly ? 'provider-only-v52' : ''}`}>
  <EnterpriseSidebar setPage={setPage} active="settings" />
  <DefaultProcessingTemplates active={!providerOnly && activeSection === 'processing'} prefs={prefs} update={update} L={L} />
  <GeneralSettingsPanel active={!providerOnly && activeSection === 'general'} locale={locale} setLocale={setLocale} changeProfile={changeProfile} L={L} />
  <WorkspaceHeaderTools targetSelector=".settings-v333-top .settings-header-actions-v381" locale={locale} setPage={setPage} user={profile} authToken={authToken} setAuthToken={setAuthToken} setCurrentUser={setCurrentUser} />
  <section className="settings-v333-content"><header className="settings-v333-top"><div><h1>{providerOnly ? L('AI 服务商', 'AI Providers', 'Nhà cung cấp AI') : L('设置中心', 'Settings Center', 'Trung tâm cài đặt')}</h1><p>{providerOnly ? L('集中管理模型服务、API 密钥、连接状态与默认路由', 'Manage model services, API keys, connection health and default routing', 'Quản lý dịch vụ mô hình, API Key và định tuyến') : L('管理您的账户、工作区和 AI 偏好设置', 'Manage your account, workspace and AI preferences', 'Quản lý tài khoản, không gian làm việc và AI')}</p></div><div className="settings-header-actions-v381"><button className="settings-icon-btn" onClick={() => setHeaderMenu(headerMenu === 'help' ? '' : 'help')}><HelpCircle />{L('帮助', 'Help', 'Trợ giúp')}</button><button className="settings-icon-only" onClick={() => setHeaderMenu(headerMenu === 'notifications' ? '' : 'notifications')}><Bell /></button><button className="settings-user-menu-v341" onClick={() => setHeaderMenu(headerMenu === 'user' ? '' : 'user')}><span>{initial}</span><ChevronDown /></button>{headerMenu && <div className="settings-header-popover-v381">{headerMenu === 'help' && <><b>{L('设置中心帮助', 'Settings help', 'Trợ giúp cài đặt')}</b><p>{L('修改设置后点击“保存更改”。需要配置 API 时，请进入 AI 服务商中心。', 'Change a setting and click Save changes. Configure API providers in the AI Provider Center.', 'Thay đổi cài đặt rồi nhấn Lưu thay đổi.')}</p><button onClick={() => {
                setHeaderMenu('');
                setPage('aiProviders');
              }}>{L('打开 AI 服务商中心', 'Open AI Provider Center', 'Mở trung tâm AI')}</button></>}{headerMenu === 'notifications' && <><b>{L('通知中心', 'Notifications', 'Thông báo')}</b><p>{L('暂无新的系统通知。任务完成、失败和额度提醒将显示在这里。', 'No new system notifications. Task and credit alerts will appear here.', 'Chưa có thông báo mới.')}</p><button onClick={() => {
                setActiveSection('notifications');
                setHeaderMenu('');
              }}>{L('管理通知设置', 'Manage notifications', 'Quản lý thông báo')}</button></>}{headerMenu === 'user' && <><b>{profile.name || profile.email || 'User'}</b><small>{profile.email || ''}</small><button onClick={() => {
                setActiveSection('profile');
                setHeaderMenu('');
              }}>{L('个人资料', 'Profile', 'Hồ sơ')}</button><button onClick={() => {
                setHeaderMenu('');
                setPage('account');
              }}>{L('我的账户', 'My account', 'Tài khoản')}</button></>}</div>}</div></header>
  <section className="settings-top-cards-v343">
   <article className="settings-top-card-v343 identity"><div className="settings-top-icon-v343 user"><UserRound /></div><div><small>{L('用户身份', 'User identity', 'Danh tính người dùng')}</small><h3>{profile.name || profile.email || L('用户', 'User', 'Người dùng')} <em>{L('管理员', 'Admin', 'Quản trị')}</em></h3><p>{profile.email || '—'}</p></div></article>
   <article className="settings-top-card-v343 workspace"><div className="settings-top-icon-v343 workspace"><Building2 /></div><div><small>{L('企业工作区', 'Workspace', 'Không gian làm việc')}</small><h3>{profile.company || 'Document Automation AI'}</h3><p>{profile.workspace_id || L('团队版', 'Team workspace', 'Không gian nhóm')}</p></div></article>
   <article className="settings-top-card-v343 api"><div className="settings-top-icon-v343 api"><Activity /></div><div><small>{L('测试后端', 'Backend connection', 'Kết nối backend')}</small><h3 className={backendConnection.state === 'connected' ? 'connection-ok' : backendConnection.state === 'error' ? 'connection-error' : ''}>{backendConnection.state === 'connected' ? L('已连接', 'Connected', 'Đã kết nối') : backendConnection.state === 'loading' ? L('正在连接', 'Connecting', 'Đang kết nối') : L('连接失败', 'Connection failed', 'Kết nối thất bại')}</h3><p>{backendConnection.detail || L('等待账户接口', 'Awaiting account API', 'Đang chờ API')}</p><button type="button" onClick={() => providerOnly ? setActiveSection('integrations') : setPage('aiProviders')}>{L('查看 AI 服务', 'View AI services', 'Xem dịch vụ AI')}</button></div></article>
  </section>
  <div className="settings-v333-shell"><aside className="settings-sidebar settings-sidebar-v333 settings-sidebar-v334 settings-sidebar-v341 settings-sidebar-v337">{groups.map(([title, items]) => <section key={title}><b>{title}</b>{items.map(([id, label, Icon]) => <button key={id} className={activeSection === id ? 'active' : ''} onClick={() => id === 'team' ? setPage('team') : setActiveSection(id)}><i /><Icon />{label}<ChevronDown /></button>)}</section>)}</aside><section className="settings-content settings-content-v333">
  {activeSection === 'profile' && <article className="settings-panel-card settings-profile-card settings-v336-card settings-profile-enterprise-v337"><header><div><h2>{L('个人资料', 'Profile', 'Hồ sơ cá nhân')}</h2><p>{L('管理个人信息、企业身份、语言与界面偏好', 'Manage identity, organization, language and appearance', 'Quản lý hồ sơ, doanh nghiệp và giao diện')}</p></div><div className="settings-avatar-actions-v334"><div className="settings-avatar-preview-v336">{profile.avatar ? <img src={profile.avatar} alt="avatar" /> : <span>{initial}</span>}</div><input ref={avatarInputRef} hidden type="file" accept="image/png,image/jpeg" onChange={handleAvatar} /><button type="button" className="settings-avatar-button" onClick={() => avatarInputRef.current?.click()}><Camera />{L('更换头像', 'Change photo', 'Đổi ảnh')}</button><small>{L('支持 PNG、JPG，最大 2MB', 'PNG or JPG, up to 2 MB', 'PNG/JPG tối đa 2MB')}</small></div></header><div className="settings-form-grid settings-profile-form-v337">{field(L('姓名', 'Name', 'Họ tên'), 'name')}{field(L('公司', 'Company', 'Công ty'), 'company', 'text', L('请输入公司名称', 'Enter company name', 'Nhập tên công ty'))}{field(L('邮箱', 'Email', 'Email'), 'email', 'email')}{field(L('电话', 'Phone', 'Điện thoại'), 'phone', 'tel', L('请输入手机号', 'Enter phone number', 'Nhập số điện thoại'))}{field(L('职位', 'Job title', 'Chức vụ'), 'job_title', 'text', L('请输入您的职位', 'Enter your role', 'Nhập chức vụ'))}{field(L('部门', 'Department', 'Bộ phận'), 'department', 'text', L('请输入所属部门', 'Enter department', 'Nhập bộ phận'))}<label className="settings-select-compact"><span>{L('国家/地区', 'Country / region', 'Quốc gia / khu vực')}</span><HoverSelect value={profile.country || ''} onChange={e => {
                  const country = e.target.value;
                  changeProfile('country', country);
                  if (country === 'Vietnam') changeProfile('timezone', 'Asia/Ho_Chi_Minh');
                  if (country === 'China') changeProfile('timezone', 'Asia/Shanghai');
                }}><option value="">—</option><option value="China">中国 / China</option><option value="Vietnam">越南 / Vietnam</option><option value="Singapore">新加坡 / Singapore</option><option value="United States">美国 / United States</option></HoverSelect></label><label className="settings-select-compact"><span>{L('时区', 'Time zone', 'Múi giờ')}</span><HoverSelect value={profile.timezone || 'Asia/Shanghai'} onChange={e => changeProfile('timezone', e.target.value)}><option value="Asia/Shanghai">(GMT+08:00) China Standard Time</option><option value="Asia/Ho_Chi_Minh">(GMT+07:00) Vietnam Time</option><option value="Asia/Singapore">(GMT+08:00) Singapore Time</option><option value="America/New_York">(GMT-05:00) Eastern Time</option></HoverSelect></label><label className="settings-select-compact"><span>{L('界面主题', 'Interface theme', 'Giao diện')}</span><HoverSelect value={profile.theme || 'system'} onChange={e => changeProfile('theme', e.target.value)}><option value="system">{L('跟随系统', 'Follow system', 'Theo hệ thống')}</option><option value="light">{L('浅色', 'Light', 'Sáng')}</option><option value="dark">{L('深色', 'Dark', 'Tối')}</option></HoverSelect></label></div><section className="settings-enterprise-meta-v334 settings-enterprise-meta-v337"><div><small>{L('企业 ID', 'Enterprise ID', 'ID doanh nghiệp')}</small><b>{profile.enterprise_id || 'DA-ENT-LOCAL'}</b></div><div><small>{L('工作区', 'Workspace', 'Không gian')}</small><b>{profile.workspace_id || 'Document Automation AI'}</b></div><div><small>License</small><b>{profile.license_id || plan}</b></div><div><small>{L('创建时间', 'Created', 'Ngày tạo')}</small><b>{memberSince}</b></div></section></article>}
  {activeSection === 'ai' && <article className="settings-panel-card settings-v336-card settings-ai-enterprise-v337"><header className="settings-module-head-v342"><div><h2>{L('AI 与 OCR', 'AI & OCR', 'AI & OCR')}</h2><p>{L('配置任务默认使用的 AI 服务、模型与 OCR 引擎。', 'Configure the default AI service, model and OCR engine.', 'Cấu hình AI, mô hình và OCR mặc định.')}</p></div><Bot /></header><section className="settings-ai-status-v337"><article><div className="settings-ai-status-icon-v337"><Cpu /></div><div><small>{L('默认 AI 服务', 'Default AI service', 'Dịch vụ AI mặc định')}</small><b>{prefs.aiProvider === 'auto' ? L('自动路由', 'Automatic routing', 'Định tuyến tự động') : prefs.aiProvider}</b><span>{prefs.aiModel === 'auto' ? L('跟随服务商推荐模型', 'Provider-recommended model', 'Theo mô hình đề xuất') : prefs.aiModel}</span></div><em className={apiConfig.capability?.configured ? 'ok' : 'warn'}>{apiConfig.capability?.configured ? L('已连接', 'Connected', 'Đã kết nối') : L('平台服务未就绪', 'Platform service unavailable', 'Dịch vụ chưa sẵn sàng')}</em></article><article><div className="settings-ai-status-icon-v337 ocr"><ScanText /></div><div><small>{L('OCR 服务', 'OCR service', 'Dịch vụ OCR')}</small><b>{prefs.ocrEngine === 'auto' ? L('智能自动选择', 'Smart automatic', 'Tự động thông minh') : prefs.ocrEngine}</b><span>{prefs.ocrMode === 'accurate' ? L('高精度模式', 'High accuracy', 'Độ chính xác cao') : prefs.ocrMode}</span></div><em className="ok">Ready</em></article></section><div className="settings-form-grid settings-v336-grid settings-ai-form-v337"><label><span>{L('默认 AI 服务商', 'Default AI provider', 'Nhà cung cấp AI')}</span><HoverSelect value={prefs.aiProvider} onChange={e => update('aiProvider', e.target.value)}><option value="auto">{L('自动选择', 'Automatic', 'Tự động')}</option>{configuredProviders.map(item => <option value={item.id} key={item.id}>{item.label || item.id}</option>)}</HoverSelect><small>{L('自动模式会根据任务类型、质量和成本选择服务商。', 'Automatic mode routes by task, quality and cost.', 'Tự động chọn theo tác vụ, chất lượng và chi phí.')}</small></label><label><span>{L('默认模型', 'Default model', 'Mô hình mặc định')}</span><HoverSelect value={prefs.aiModel} onChange={e => update('aiModel', e.target.value)}><option value="auto">{L('跟随服务商推荐', 'Provider recommended', 'Theo đề xuất')}</option><option value="deepseek-chat">deepseek-chat</option><option value="deepseek-reasoner">deepseek-reasoner</option><option value="gpt-4.1-mini">gpt-4.1-mini</option><option value="gemini-2.5-flash">gemini-2.5-flash</option></HoverSelect><small>{L('仅设置新任务默认模型，不会覆盖服务商中心配置。', 'Sets the default for new tasks only.', 'Chỉ đặt mặc định cho tác vụ mới.')}</small></label><label><span>{L('OCR 引擎', 'OCR engine', 'Công cụ OCR')}</span><HoverSelect value={prefs.ocrEngine} onChange={e => update('ocrEngine', e.target.value)}><option value="auto">{L('自动选择', 'Automatic', 'Tự động')}</option><option value="builtin">{L('内置 OCR', 'Built-in OCR', 'OCR tích hợp')}</option><option value="tesseract">Tesseract</option><option value="cloud">{L('云端高精度 OCR', 'Cloud high accuracy', 'OCR đám mây')}</option></HoverSelect><small>{L('扫描件和图片会根据质量自动选择最佳引擎。', 'Scans and images use the best available engine.', 'Tự động chọn OCR phù hợp.')}</small></label><label><span>{L('OCR 精度', 'OCR mode', 'Chế độ OCR')}</span><HoverSelect value={prefs.ocrMode} onChange={e => update('ocrMode', e.target.value)}><option value="fast">Fast</option><option value="standard">Standard</option><option value="accurate">High accuracy</option></HoverSelect></label><label><span>{L('并发任务数', 'Concurrent jobs', 'Tác vụ đồng thời')}</span><input type="number" min="1" max="10" value={prefs.aiConcurrency} onChange={e => update('aiConcurrency', Number(e.target.value || 1))} /></label><label><span>{L('API 超时（秒）', 'API timeout (seconds)', 'Timeout API')}</span><input type="number" min="15" max="600" value={prefs.aiTimeout} onChange={e => update('aiTimeout', Number(e.target.value || 90))} /></label></div><section className="settings-module-note-v342 settings-ai-help-v337"><ShieldCheck /><div><b>{L('服务商连接由 AI 服务商中心管理', 'Provider connections are managed in AI Provider Center', 'Kết nối được quản lý ở trung tâm AI')}</b><p>{L('这里保存任务默认值，不会覆盖各服务商的 API Key。', 'These defaults do not overwrite provider API keys.', 'Mặc định không ghi đè API Key.')}</p></div><button type="button" onClick={() => setPage('aiProviders')}>{L('打开服务商中心', 'Open provider center', 'Mở trung tâm AI')}<ArrowRight /></button></section></article>}
  {activeSection === 'output' && <article className="settings-panel-card settings-output-v338"><header className="settings-module-head-v342"><div><h2>{L('输出与质量', 'Output & quality', 'Đầu ra & chất lượng')}</h2><p>{L('统一设置交付格式、版式保留与质量检查规则。', 'Configure delivery formats, layout retention and quality rules.', 'Cấu hình định dạng và chất lượng đầu ra.')}</p></div><FileText /></header><section className="settings-output-grid-v338"><label><span>{L('页面尺寸', 'Page size', 'Khổ trang')}</span><HoverSelect value={prefs.pageSize || 'A4'} onChange={e => update('pageSize', e.target.value)}><option>A4</option><option>Letter</option><option>A3</option></HoverSelect></label><label><span>{L('默认输出格式', 'Default output format', 'Định dạng mặc định')}</span><HoverSelect value={prefs.defaultOutputFormat || 'original'} onChange={e => update('defaultOutputFormat', e.target.value)}><option value="original">{L('保持原格式', 'Preserve original', 'Giữ định dạng gốc')}</option><option value="pdf">PDF</option><option value="docx">DOCX</option><option value="xlsx">XLSX</option><option value="pptx">PPTX</option></HoverSelect></label><label><span>{L('图片质量', 'Image quality', 'Chất lượng ảnh')}</span><HoverSelect value={prefs.imageQuality || 'high'} onChange={e => update('imageQuality', e.target.value)}><option value="standard">{L('标准', 'Standard', 'Tiêu chuẩn')}</option><option value="high">{L('高质量', 'High', 'Cao')}</option><option value="original">{L('原始质量', 'Original', 'Gốc')}</option></HoverSelect></label><label><span>{L('自动分页', 'Automatic pagination', 'Tự động phân trang')}</span><HoverSelect value={prefs.paginationMode || 'smart'} onChange={e => update('paginationMode', e.target.value)}><option value="smart">{L('智能分页', 'Smart pagination', 'Phân trang thông minh')}</option><option value="source">{L('跟随原文', 'Follow source', 'Theo bản gốc')}</option><option value="none">{L('不强制分页', 'No forced pagination', 'Không bắt buộc')}</option></HoverSelect></label></section><section className="settings-output-toggles-v338">{[[L('自动质量检查', 'Automatic quality validation', 'Tự động kiểm tra'), 'autoQuality'], [L('保留批注', 'Preserve comments', 'Giữ chú thích'), 'preserveComments'], [L('保留修订记录', 'Preserve tracked changes', 'Giữ lịch sử sửa đổi'), 'preserveRevisions'], [L('OCR 后自动校验', 'Validate after OCR', 'Kiểm tra sau OCR'), 'validateAfterOcr'], [L('翻译一致性检查', 'Translation consistency check', 'Kiểm tra tính nhất quán'), 'translationConsistency'], [L('应用企业交付标准', 'Apply enterprise delivery standard', 'Áp dụng tiêu chuẩn doanh nghiệp'), 'enterpriseDeliveryStandard']].map(([label, key]) => <article key={key}><span>{label}</span><button type="button" className={`settings-switch-v336 ${prefs[key] !== false ? 'on' : ''}`} onClick={() => update(key, prefs[key] === false)}><i /></button></article>)}</section></article>}
    {activeSection === 'billing' && <article className="settings-panel-card settings-billing-v341 settings-billing-v338"><header><div><h2>{L('账单与套餐', 'Billing & plans', 'Thanh toán & gói')}</h2><p>{L('查看套餐、Credits、账单、发票与续费状态', 'Review plan, credits, invoices and renewal status', 'Xem gói, tín dụng và hóa đơn')}</p></div><button onClick={() => setPage('billing')}>{L('管理钱包', 'Manage wallet', 'Quản lý ví')}<ArrowRight /></button></header><div className="settings-billing-metrics-v341"><article><small>{L('当前套餐', 'Current plan', 'Gói hiện tại')}</small><b>{plan}</b><em>{planExpiry === '—' ? L('等待套餐接口', 'Awaiting plan API', 'Đang chờ API') : planExpiry}</em></article><article><small>{L('剩余 Credits', 'Remaining credits', 'Tín dụng còn lại')}</small><b>{credits}</b><em>{L('账户实时余额', 'Live account balance', 'Số dư trực tiếp')}</em></article><article><small>{L('本月使用量', 'Monthly usage', 'Dùng tháng này')}</small><b>{monthlyUsage}</b><em>{L('等待用量接口', 'Awaiting usage API', 'Đang chờ API')}</em></article><article><small>{L('续费日期', 'Renewal date', 'Ngày gia hạn')}</small><b>{planExpiry}</b><em>{L('按当前套餐计算', 'Based on current plan', 'Theo gói hiện tại')}</em></article></div><section className="settings-billing-actions-v338"><article><div><b>{L('自动续费', 'Auto-renew', 'Tự động gia hạn')}</b><small>{L('到期前自动续订当前套餐', 'Renew the current plan automatically', 'Tự động gia hạn gói hiện tại')}</small></div><button type="button" className={`settings-switch-v336 ${prefs.autoRenew ? 'on' : ''}`} onClick={() => togglePref('autoRenew')}><i /></button></article><button type="button" onClick={() => setPage('billing')}>{L('查看账单', 'View billing', 'Xem hóa đơn')}</button><button type="button" onClick={() => setPage('billing')}>{L('下载发票', 'Download invoice', 'Tải hóa đơn')}</button><button type="button" onClick={() => setPage('billing')}>{L('消费记录', 'Usage history', 'Lịch sử sử dụng')}</button></section><section className="settings-payment-history-v341"><div><h3>{L('付款记录', 'Payment history', 'Lịch sử thanh toán')}</h3><p>{L('真实付款记录将在支付接口连接后显示。', 'Real payment records will appear after the payment API is connected.', 'Lịch sử thật sẽ hiển thị khi API kết nối.')}</p></div><button onClick={() => setPage('billing')}>{L('升级套餐', 'Upgrade plan', 'Nâng cấp')}</button><button className="secondary" onClick={() => setPage('billing')}>{L('充值 Credits', 'Recharge credits', 'Nạp tín dụng')}</button></section></article>}
    {activeSection === 'security' && <article className="settings-panel-card settings-v336-card settings-security-enterprise-v337"><header className="settings-module-head-v342"><div><h2>{L('账户安全', 'Account security', 'Bảo mật')}</h2><p>{L('管理密码、两步验证、登录提醒与设备保护。', 'Manage password, 2FA, login alerts and device protection.', 'Quản lý mật khẩu, 2FA và thiết bị.')}</p></div><LockKeyhole /></header><section className="settings-security-overview-v337"><div><ShieldCheck /><span><small>{L('安全状态', 'Security status', 'Trạng thái bảo mật')}</small><b>{prefs.twoFactorEnabled ? L('高级保护已启用', 'Advanced protection enabled', 'Đã bật bảo vệ nâng cao') : L('基础保护已启用', 'Basic protection enabled', 'Đã bật bảo vệ cơ bản')}</b></span></div><em>{prefs.loginAlerts && prefs.deviceProtection ? L('运行正常', 'Healthy', 'Ổn định') : L('建议检查', 'Review', 'Nên kiểm tra')}</em></section><section className="settings-security-list-v336"><article><div><ShieldCheck /><span><b>{L('修改密码', 'Change password', 'Đổi mật khẩu')}</b><small>{L('建议每 90 天更新一次密码', 'Recommended every 90 days', 'Khuyến nghị mỗi 90 ngày')}</small></span></div><button type="button" onClick={updatePassword}>{L('修改', 'Change', 'Đổi')}</button></article><article><div><Globe2 /><span><b>{L('邮箱验证', 'Email verification', 'Xác minh email')}</b><small>{profile.email || L('尚未绑定邮箱', 'No email linked', 'Chưa có email')}</small></span></div><em className="settings-status-ok-v336">{profile.email ? L('已绑定', 'Linked', 'Đã liên kết') : L('待绑定', 'Pending', 'Đang chờ')}</em></article><article><div><ShieldCheck /><span><b>{L('两步验证（2FA）', 'Two-factor authentication', 'Xác thực hai bước')}</b><small>{L('使用验证码保护登录', 'Protect login with a verification code', 'Bảo vệ đăng nhập')}</small></span></div><button type="button" className={`settings-switch-v336 ${prefs.twoFactorEnabled ? 'on' : ''}`} onClick={() => togglePref('twoFactorEnabled')}><i /></button></article><article><div><Activity /><span><b>{L('异常登录提醒', 'Unusual login alerts', 'Cảnh báo đăng nhập')}</b><small>{L('新设备或异常地区登录时提醒', 'Alert for new devices or locations', 'Cảnh báo thiết bị mới')}</small></span></div><button type="button" className={`settings-switch-v336 ${prefs.loginAlerts ? 'on' : ''}`} onClick={() => togglePref('loginAlerts')}><i /></button></article><article><div><Cpu /><span><b>{L('登录设备保护', 'Device protection', 'Bảo vệ thiết bị')}</b><small>{L('当前浏览器会话受到保护', 'Current browser session is protected', 'Phiên hiện tại được bảo vệ')}</small></span></div><button type="button" className={`settings-switch-v336 ${prefs.deviceProtection ? 'on' : ''}`} onClick={() => togglePref('deviceProtection')}><i /></button></article></section><section className="settings-login-devices-v337"><div className="settings-subhead-v337"><div><b>{L('最近登录设备', 'Recent sign-ins', 'Thiết bị đăng nhập gần đây')}</b><small>{L('查看并管理最近访问此账户的设备。', 'Review devices that recently accessed this account.', 'Xem thiết bị truy cập gần đây.')}</small></div><button type="button" onClick={logoutOtherDevices}>{L('退出所有其他设备', 'Sign out other devices', 'Đăng xuất thiết bị khác')}</button></div>{[[L('当前设备', 'Current device', 'Thiết bị hiện tại'), 'Edge · Windows 11', L('现在', 'Now', 'Bây giờ'), true], ['Chrome · Windows', 'Bac Ninh, Vietnam', L('今天 09:18', 'Today 09:18', 'Hôm nay 09:18'), false], ['Android', 'Bac Ninh, Vietnam', L('5 天前', '5 days ago', '5 ngày trước'), false]].map(([name, detail, time, current]) => <article key={name}><div className="settings-device-icon-v337"><Cpu /></div><div><b>{name}</b><small>{detail}</small></div><time>{time}</time>{current && <em>{L('当前', 'Current', 'Hiện tại')}</em>}</article>)}</section>{securityMessage && <div className="settings-inline-message-v336"><CircleCheck />{securityMessage}</div>}</article>}
  {activeSection === 'notifications' && <article className="settings-panel-card settings-v336-card settings-notifications-enterprise-v337"><header className="settings-module-head-v342"><div><h2>{L('通知设置', 'Notifications', 'Thông báo')}</h2><p>{L('管理通知渠道、任务提醒、额度与账单提醒。', 'Manage channels, task alerts, credits and billing reminders.', 'Quản lý kênh và cảnh báo.')}</p></div><Bell /></header><div className="settings-notification-section-title-v337"><b>{L('通知渠道', 'Notification channels', 'Kênh thông báo')}</b><small>{L('选择接收系统消息的方式。', 'Choose how system messages reach you.', 'Chọn cách nhận thông báo.')}</small></div><section className="settings-notification-grid-v336">{[[L('站内通知', 'In-app notifications', 'Thông báo trong ứng dụng'), 'inAppNotifications', L('在工作台接收所有重要消息', 'Receive important workspace messages', 'Nhận thông báo quan trọng')], [L('邮件通知', 'Email notifications', 'Thông báo email'), 'emailNotifications', L('发送到当前账户邮箱', 'Send to the account email', 'Gửi đến email tài khoản')], [L('浏览器通知', 'Browser notifications', 'Thông báo trình duyệt'), 'browserNotifications', L('允许浏览器桌面提醒', 'Allow desktop browser alerts', 'Cho phép cảnh báo trình duyệt')]].map(([title, key, desc]) => <article key={key}><div><b>{title}</b><small>{desc}</small></div><button type="button" className={`settings-switch-v336 ${prefs[key] ? 'on' : ''}`} onClick={() => togglePref(key)}><i /></button></article>)}</section><div className="settings-notification-section-title-v337"><b>{L('业务提醒', 'Business alerts', 'Cảnh báo nghiệp vụ')}</b><small>{L('任务、额度和账单相关的重要事件。', 'Important task, credits and billing events.', 'Sự kiện tác vụ, tín dụng và hóa đơn.')}</small></div><section className="settings-notification-grid-v336">{[[L('处理完成提醒', 'Processing completed', 'Hoàn tất xử lý'), 'notifyCompleted', L('任务完成后立即提醒', 'Alert when a task completes', 'Cảnh báo khi hoàn tất')], [L('处理失败提醒', 'Processing failed', 'Xử lý thất bại'), 'notifyFailed', L('失败、超时与重试提醒', 'Failure, timeout and retry alerts', 'Lỗi, timeout và thử lại')], [L('Credits 不足提醒', 'Low credits alert', 'Cảnh báo tín dụng'), 'notifyCredits', L('余额低于阈值时提醒', 'Alert below the threshold', 'Cảnh báo khi số dư thấp')], [L('账单与续费提醒', 'Billing & renewal', 'Hóa đơn và gia hạn'), 'notifyBilling', L('付款、发票和续费提醒', 'Payment, invoice and renewal alerts', 'Thanh toán và gia hạn')]].map(([title, key, desc]) => <article key={key}><div><b>{title}</b><small>{desc}</small></div><button type="button" className={`settings-switch-v336 ${prefs[key] ? 'on' : ''}`} onClick={() => togglePref(key)}><i /></button></article>)}</section><label className="settings-threshold-v336 settings-threshold-select-v337"><span><b>{L('Credits 提醒阈值', 'Credits alert threshold', 'Ngưỡng cảnh báo tín dụng')}</b><small>{L('当余额低于该值时发送提醒。', 'Send an alert when the balance drops below this value.', 'Cảnh báo khi số dư thấp hơn mức này.')}</small></span><HoverSelect value={prefs.creditsThreshold} onChange={e => update('creditsThreshold', Number(e.target.value))}><option value={500}>500 Credits</option><option value={1000}>1,000 Credits</option><option value={3000}>3,000 Credits</option><option value={5000}>5,000 Credits</option></HoverSelect></label></article>}
  {activeSection === 'integrations' && <article className="settings-panel-card settings-integrations-v343"><header className="settings-integrations-head-v343"><div><h2>{L('AI 服务商中心', 'AI Provider Center', 'Trung tâm nhà cung cấp AI')}</h2><p>{L('统一管理 AI 服务提供商、模型、API Key 与连接测试', 'Manage AI providers and API integrations', 'Quản lý nhà cung cấp AI và tích hợp API')}</p></div><button type="button" className="settings-help-v343"><BookOpen />{L('使用帮助', 'Help', 'Trợ giúp')}</button></header>{apiLoading ? <div className="settings-api-loading-v347"><RefreshCw />{L('正在读取 API 配置…', 'Loading API settings…', 'Đang tải cấu hình API…')}</div> : <><section className="settings-provider-section-v343"><div className="settings-section-title-v343"><b>1. {L('AI 服务提供商', 'AI providers', 'Nhà cung cấp AI')}</b><small>{L('选择默认服务商，各服务商配置独立保存', 'Choose a default provider; each configuration is stored separately', 'Chọn nhà cung cấp mặc định')}</small></div><div className="settings-provider-grid-v343">{(apiConfig.providers || []).filter(x => ['openai', 'gemini', 'claude', 'deepseek', 'azure'].includes(x.id)).sort((a, b) => ['openai', 'claude', 'gemini', 'deepseek', 'azure'].indexOf(a.id) - ['openai', 'claude', 'gemini', 'deepseek', 'azure'].indexOf(b.id)).map(item => {
                    const selected = selectedProvider === item.id;
                    const profile = apiConfig.profiles?.[item.id] || {};
                    const connected = !!profile.configured;
                    const marks = {
                      openai: 'OA',
                      gemini: 'G',
                      claude: 'C',
                      deepseek: 'DS',
                      azure: 'AZ'
                    };
                    return <button type="button" key={item.id} className={selected ? 'selected' : ''} onClick={() => chooseProvider(item.id)}><span className={`provider-mark-v343 ${item.id}`}>{marks[item.id]}</span><b>{item.label}</b><small className={`provider-health-v52 ${connected ? 'connected' : ''}`}><span />{connected ? L('已配置', 'Configured', 'Đã cấu hình') : L('未配置', 'Not configured', 'Chưa cấu hình')}</small>{item.id === 'openai' && <em>{L('推荐', 'Recommended', 'Đề xuất')}</em>}<i>{selected ? <CircleCheck /> : null}</i></button>;
                  })}</div></section><section className="settings-integration-columns-v343 settings-integration-ratio-v347"><article className="provider-config-v347"><div className="settings-section-title-v343"><b>2. {L('服务商配置', 'Provider configuration', 'Cấu hình nhà cung cấp')}</b></div><label><span>{L('默认服务商', 'Default provider', 'Nhà cung cấp mặc định')}</span><HoverSelect value={selectedProvider} onChange={e => chooseProvider(e.target.value)}>{(apiConfig.providers || []).filter(x => ['openai', 'gemini', 'claude', 'deepseek', 'azure'].includes(x.id)).map(x => <option value={x.id} key={x.id}>{x.label}</option>)}</HoverSelect></label><label><span>{L('当前模型', 'Current model', 'Mô hình hiện tại')}</span><HoverSelect value={selectedProfile.model || providerMeta[selectedProvider]?.model || ''} onChange={e => updateApi('model', e.target.value)}>{(providerMeta[selectedProvider]?.models || [selectedProfile.model]).filter(Boolean).map(x => <option key={x}>{x}</option>)}</HoverSelect></label><dl><dt>{L('连接状态', 'Connection status', 'Trạng thái kết nối')}</dt><dd><span className={`status-dot-v343 ${apiConfig.api_status === L('已连接', 'Connected', 'Đã kết nối') ? 'connected' : ''}`} />{apiConfig.api_status || L('未连接', 'Not connected', 'Chưa kết nối')}</dd><dt>{L('最后测试时间', 'Last tested', 'Kiểm tra cuối')}</dt><dd>{apiConfig.api_last_test || '—'}</dd></dl></article><article className="api-key-card-v347"><div className="settings-section-title-v343"><b>3. {L('API Key 管理', 'API key management', 'Quản lý API Key')}</b><small>{L('密钥仅保存在本机服务端配置中', 'Keys are stored only in the local backend configuration', 'Khóa chỉ lưu trong cấu hình backend')}</small></div><div className="api-key-editor-v347"><label><span>{providerMeta[selectedProvider]?.label || selectedProvider} API Key</span><div className="api-key-input-row-v52"><input type={showKeys[selectedProvider] ? 'text' : 'password'} value={selectedProfile.api_key || ''} placeholder={selectedProfile.configured ? L('已安全保存；留空保持不变', 'Saved securely; leave blank to keep it', 'Đã lưu an toàn; để trống để giữ nguyên') : L('请输入 API Key', 'Enter API key', 'Nhập API Key')} onChange={e => updateApi('api_key', e.target.value)} /><button type="button" onClick={() => setShowKeys(x => ({
                          ...x,
                          [selectedProvider]: !x[selectedProvider]
                        }))} title={showKeys[selectedProvider] ? L('隐藏密钥', 'Hide key', 'Ẩn khóa') : L('显示密钥', 'Show key', 'Hiện khóa')}>{showKeys[selectedProvider] ? <EyeOff /> : <Eye />}</button><button type="button" onClick={copyApiKey} disabled={!selectedProfile.api_key && !selectedProfile.api_key_masked} title={L('复制密钥', 'Copy key', 'Sao chép khóa')}><Copy /></button></div></label><label><span>{selectedProvider === 'azure' ? L('Azure Endpoint', 'Azure endpoint', 'Azure endpoint') : L('接口地址', 'Base URL', 'Địa chỉ API')}</span><input value={selectedProfile.base_url || providerMeta[selectedProvider]?.base_url || ''} onChange={e => updateApi('base_url', e.target.value)} /></label><div className="api-key-actions-v347"><span>{selectedProfile.configured ? L('已配置', 'Configured', 'Đã cấu hình') : L('未配置', 'Not configured', 'Chưa cấu hình')}</span>{selectedProfile.configured && <button type="button" className="danger-link-v347" onClick={() => {
                        updateApi('api_key', '');
                        updateApi('clear_api_key', true);
                      }}><Trash2 />{L('删除密钥', 'Remove key', 'Xóa khóa')}</button>}</div></div></article><article className="connection-test-v347"><div className="settings-section-title-v343"><b>4. {L('连接测试', 'Connection test', 'Kiểm tra kết nối')}</b><small>{L('测试当前服务商的真实连接状态', 'Test the selected provider with a real request', 'Kiểm tra kết nối thực')}</small></div><div className="settings-test-note-v343"><HelpCircle /><p>{apiMessage || L('保存 API Key 后，点击测试连接获取状态、模型和响应速度。', 'Save the API key, then test status, model and latency.', 'Lưu API Key rồi kiểm tra trạng thái và độ trễ.')}</p></div><div className="connection-result-grid-v52"><span><small>{L('服务商', 'Provider', 'Nhà cung cấp')}</small><b>{providerMeta[selectedProvider]?.label || selectedProvider}</b></span><span><small>{L('模型', 'Model', 'Mô hình')}</small><b>{selectedProfile.model || providerMeta[selectedProvider]?.model || '—'}</b></span><span><small>{L('状态', 'Status', 'Trạng thái')}</small><b className={apiConfig.api_status === L('已连接', 'Connected', 'Đã kết nối') ? 'ok' : ''}>{apiConfig.api_status || '—'}</b></span><span><small>{L('最后测试', 'Last tested', 'Kiểm tra cuối')}</small><b>{apiConfig.api_last_test || '—'}</b></span></div><button type="button" className="settings-test-button-v343" disabled={apiBusy || !selectedProfile.configured && !selectedProfile.api_key} onClick={testApi}>{apiBusy ? <RefreshCw className="spin-v347" /> : <ArrowRight />}{apiBusy ? L('测试中…', 'Testing…', 'Đang kiểm tra…') : L('测试连接', 'Test connection', 'Kiểm tra kết nối')}</button></article></section></>}</article>}
  {activeSection === 'advanced' && <article className="settings-panel-card settings-advanced-v338"><header className="settings-module-head-v342"><div><h2>{L('高级设置', 'Advanced', 'Nâng cao')}</h2><p>{L('配置数据保留、日志、缓存与运行参数。', 'Configure retention, logs, cache and runtime parameters.', 'Cấu hình lưu giữ, nhật ký và bộ nhớ đệm.')}</p></div><Settings2 /></header><section className="settings-advanced-grid-v338"><label><span>{L('数据保留天数', 'Data retention days', 'Số ngày lưu dữ liệu')}</span><HoverSelect value={prefs.retentionDays || 30} onChange={e => update('retentionDays', Number(e.target.value))}><option value={7}>7</option><option value={30}>30</option><option value={90}>90</option><option value={365}>365</option></HoverSelect></label><label><span>{L('Worker 数量', 'Worker count', 'Số Worker')}</span><input type="number" min="1" max="16" value={prefs.workerCount || 2} onChange={e => update('workerCount', Number(e.target.value))} /></label><label><span>{L('本地缓存上限（GB）', 'Local cache limit (GB)', 'Giới hạn bộ nhớ đệm (GB)')}</span><input type="number" min="1" max="100" value={prefs.cacheLimitGb || 10} onChange={e => update('cacheLimitGb', Number(e.target.value))} /></label><label><span>{L('日志级别', 'Log level', 'Mức nhật ký')}</span><HoverSelect value={prefs.logLevel || 'info'} onChange={e => update('logLevel', e.target.value)}><option value="error">Error</option><option value="warning">Warning</option><option value="info">Info</option><option value="debug">Debug</option></HoverSelect></label></section><section className="settings-output-toggles-v338">{[[L('自动清理日志', 'Automatically clean logs', 'Tự động dọn nhật ký'), 'autoCleanLogs'], [L('启用 GPU 加速', 'Enable GPU acceleration', 'Bật tăng tốc GPU'), 'gpuEnabled'], [L('记录 API 调用日志', 'Record API logs', 'Ghi nhật ký API'), 'apiLogging'], [L('调试模式', 'Debug mode', 'Chế độ gỡ lỗi'), 'debugMode']].map(([label, key]) => <article key={key}><span>{label}</span><button type="button" className={`settings-switch-v336 ${prefs[key] ? 'on' : ''}`} onClick={() => togglePref(key)}><i /></button></article>)}</section><section className="settings-admin-actions-v338"><button type="button" onClick={() => setApiMessage(L('系统日志导出任务已创建。', 'System log export prepared.', 'Đã chuẩn bị xuất nhật ký.'))}>{L('导出系统日志', 'Export system logs', 'Xuất nhật ký')}</button><button type="button" onClick={() => {
                localStorage.removeItem('da_runtime_cache');
                setApiMessage(L('缓存已清理。', 'Cache cleared.', 'Đã xóa bộ nhớ đệm.'));
              }}>{L('清理缓存', 'Clear cache', 'Xóa bộ nhớ đệm')}</button><button type="button" onClick={() => setApiMessage(L('索引重建任务已提交。', 'Index rebuild requested.', 'Đã yêu cầu xây dựng lại chỉ mục.'))}>{L('重建索引', 'Rebuild index', 'Xây dựng lại chỉ mục')}</button><button type="button" className="danger" onClick={() => {
                if (window.confirm(L('确定恢复高级设置默认值吗？', 'Restore advanced defaults?', 'Khôi phục mặc định?'))) {
                  ['retentionDays', 'workerCount', 'cacheLimitGb', 'logLevel', 'autoCleanLogs', 'gpuEnabled', 'apiLogging', 'debugMode'].forEach(k => update(k, undefined));
                }
              }}>{L('恢复默认设置', 'Restore defaults', 'Khôi phục mặc định')}</button></section>{apiMessage && <div className="settings-inline-message-v336"><CircleCheck />{apiMessage}</div>}</article>}
    <div className="settings-save settings-save-v333"><button className={saved ? 'saved' : ''} disabled={apiBusy || settingsLoading || !dirty && !saved} onClick={save}>{settingsLoading ? L('正在读取…', 'Loading…', 'Đang tải…') : apiBusy ? L('保存中…', 'Saving…', 'Đang lưu…') : saved ? L('✓ 已保存', '✓ Saved', '✓ Đã lưu') : L('保存更改', 'Save changes', 'Lưu thay đổi')}</button>{saved && <span><CircleCheck />{L('设置已保存并生效', 'Preferences saved and active', 'Đã lưu')}</span>}</div></section></div></section></main>;
}
function OrderCenter({
  t,
  files,
  addFiles,
  setFiles,
  totalSize,
  services,
  setServices,
  translationTargets,
  setTranslationTargets,
  outputFormats,
  setOutputFormats,
  outputOptions,
  setOutputOptions,
  form,
  setForm,
  submitOrder,
  submitting,
  error,
  setError,
  setPage,
  smartPlan,
  preferences,
  currentUser = null,
  archiveManifests,
  setArchiveManifests,
  archiveInspecting,
  workspaceFiles,
  workspaceTotalSize,
  fileKey,
  hasArchiveErrors,
  aiInsight,
  aiAnalyzing,
  aiInsightError
}) {
  const toggle = (v, l, s) => s(l.includes(v) ? l.filter(x => x !== v) : [...l, v]);
  const toggleServiceCapability = id => {
    const active = services.includes(id);
    let next = active ? services.filter(item => item !== id) : [...services, id];
    if (!active && (serviceFormatCapabilities[id] || id === 'pdf_rebuild') && !next.includes('conversion')) next = [...next, 'conversion'];
    setServices([...new Set(next)]);
    if (!active && serviceFormatCapabilities[id]) setOutputFormats(current => [...new Set([...current, ...serviceFormatCapabilities[id]])]);
  };
  const isZh = document.documentElement.lang.startsWith('zh');
  const [advanced, setAdvanced] = useState(false);
  const [advancedSections, setAdvancedSections] = useState({
    format: true,
    spreadsheet: false,
    document: false
  });
  const [dragging, setDragging] = useState(false);
  const [expandedCapabilities, setExpandedCapabilities] = useState({
    document: true,
    content: true
  });
  const [showMoreCapabilities, setShowMoreCapabilities] = useState(false);
  const [planConfirmed, setPlanConfirmed] = useState(false);
  const [recommendationApplied, setRecommendationApplied] = useState(false);
  const profiles = [['auto', isZh ? 'AI 自动推荐' : 'AI recommended'], ['excel_automation', isZh ? 'Excel（自动化）' : 'Excel (Automation)'], ['word_contract', isZh ? 'Word（合同）' : 'Word (Contract)'], ['word_manual', isZh ? 'Word（说明书）' : 'Word (Manual)'], ['pdf_scan', isZh ? 'PDF（扫描件）' : 'PDF (Scanned)'], ['ppt_training', isZh ? 'PPT（培训资料）' : 'PPT (Training)'], ['finance', isZh ? '财务报表' : 'Financial report'], ['legal', isZh ? '法律文档' : 'Legal document'], ['medical', isZh ? '医疗文档' : 'Medical document'], ['custom', isZh ? '自定义' : 'Custom']];
  const applyProfile = id => {
    const excel = id === 'excel_automation';
    const scan = id === 'pdf_scan';
    setOutputOptions(v => ({
      ...v,
      profile: id,
      preserve_layout: true,
      preserve_formulas: excel,
      preserve_images: true,
      preserve_comments: false,
      preserve_links: true,
      preserve_cell_coordinates: excel,
      preserve_merged_cells: excel,
      protect_plc_codes: excel,
      auto_width: excel,
      auto_row_height: excel,
      freeze_header: false,
      bilingual_layout: excel ? 'columns' : 'auto',
      columns_style: excel ? 'address-with-text' : 'text-only',
      address_mode: 'keep'
    }));
    setServices(scan ? ['ocr', 'translation', 'conversion'] : ['translation', 'conversion']);
    setOutputFormats(['original']);
    if (excel && !translationTargets.length) setTranslationTargets(['vi']);
    if (id !== 'custom') {
      const prompt = excel ? isZh ? '保持 PLC 地址、寄存器地址、变量名、型号、品牌、公式和特殊符号完全不变；仅翻译中文描述；使用自动化、机械、电气和制造业专业术语；按“标签+原文｜标签+译文”左右分列输出；保持工作表、单元格、合并区域、颜色、边框、图片和超链接。' : 'Keep PLC/register addresses, variables, models, brands, formulas and symbols unchanged; translate descriptions only; use professional automation terminology; output side-by-side bilingual columns with the address repeated on both sides; preserve workbook structure and formatting.' : isZh ? '保持原文件结构和版式，使用所选行业的专业术语，品牌、型号、编号和公式不翻译。' : 'Preserve structure and layout, use professional domain terminology, and keep brands, models, codes and formulas unchanged.';
      setForm(v => ({
        ...v,
        requirements: prompt
      }));
    }
  };
  const bilingualTemplateLabel = isZh ? translationTargets.includes('zh-vi') || translationTargets.includes('vi') ? '中越双语' : translationTargets.includes('zh-en') || translationTargets.includes('en') ? '中英双语' : '双语输出' : 'Bilingual';
  const instructionTemplates = isZh ? [['保持原格式', '请保持原始版式、图片、表格、分页和字体层级。'], [bilingualTemplateLabel, '请按当前目标语言输出双语内容，并保持原文与译文清晰对应。'], ['品牌不翻译', '品牌名、产品型号、料号和专有名词不要翻译。'], ['自动化行业', '请使用自动化、机械、电气和制造业专业术语。']] : [['Keep layout', 'Preserve layout, images, tables, pagination and typography hierarchy.'], ['Bilingual', 'Create a bilingual output with clearly aligned source and target text.'], ['Keep brands', 'Do not translate brand names, model numbers, part numbers or proper nouns.'], ['Automation terms', 'Use professional automation, mechanical, electrical and manufacturing terminology.']];
  const restoreRecommended = () => applyProfile(files.some(f => /\.(xlsx?|csv)$/i.test(f.name)) ? 'excel_automation' : 'auto');
  const addInstruction = text => setForm(v => ({
    ...v,
    requirements: [v.requirements.trim(), text].filter(Boolean).join('\n')
  }));
  const removeFile = i => {
    const target = files[i];
    setFiles(files.filter((_, n) => n !== i));
    if (target) setArchiveManifests(prev => {
      const next = {
        ...prev
      };
      delete next[fileKey(target)];
      return next;
    });
  };
  const previewFile = f => {
    try {
      const url = URL.createObjectURL(f);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {}
  };
  const replaceFile = (index, list) => {
    const next = Array.from(list || []);
    if (!next.length) return;
    setFiles(files.map((f, i) => i === index ? next[0] : f));
  };
  const toggleAdvancedSection = id => setAdvancedSections(v => ({
    ...v,
    [id]: !v[id]
  }));
  const uploaded = files.length > 0;
  const fileTypes = Array.from(new Set(workspaceFiles.map(f => (f.name.split('.').pop() || 'FILE').toUpperCase())));
  const hasSpreadsheetFiles = workspaceFiles.some(f => /\.(xlsx?|csv)$/i.test(f.name || ''));
  const workspaceCount = workspaceFiles.length;
  const realAnalysis = aiInsight?.analysis || null;
  const recommendation = aiInsight?.recommendation || null;
  const fallbackSeconds = Math.max(20, Math.round(workspaceCount * 14 + workspaceTotalSize / 1024 / 1024 * 4));
  const estimatedSeconds = Number(recommendation?.estimated_seconds || fallbackSeconds);
  const estimatedCredits = Number(recommendation?.estimated_credits || Math.max(1, Math.ceil(workspaceCount * 2 + workspaceTotalSize / 1024 / 1024)));
  const estimatedQuality = Number(recommendation?.quality_score || (services.includes('translation') ? 96 : 98));
  const analysisReady = !!recommendation || !!aiInsightError;
  const hasPdfFiles = workspaceFiles.some(f => /\.pdf$/i.test(f.name || ''));
  const hasPresentationFiles = workspaceFiles.some(f => /\.(pptx?|odp)$/i.test(f.name || ''));
  const hasImageFiles = workspaceFiles.some(f => /\.(png|jpe?g|bmp|tiff?|webp)$/i.test(f.name || ''));
  const naturalFormats = hasSpreadsheetFiles
    ? ['original', 'xlsx', 'csv', 'pdf']
    : hasPresentationFiles
      ? ['original', 'pptx', 'pdf']
      : hasPdfFiles
        ? ['original', 'pdf', 'docx']
        : hasImageFiles
          ? ['original', 'pdf', 'docx', 'images']
          : ['original', 'docx', 'pdf'];
  const fallbackFormats = Array.from(new Set(naturalFormats));
  const compatibleFormats = (recommendation?.compatible_outputs || fallbackFormats).filter(id => Object.prototype.hasOwnProperty.call(formatKeys, id));
  useEffect(() => {
    setPlanConfirmed(false);
  }, [files.length, services.join('|'), translationTargets.join('|'), outputFormats.join('|'), recommendation?.profile]);
  useEffect(() => {
    setRecommendationApplied(false);
  }, [files.length, recommendation?.profile]);
  useEffect(() => {
    if (!recommendation || !(recommendation.recommended_services || []).includes('conversion') || !compatibleFormats.length) return;
    setOutputFormats(current => {
      const supported = current.filter(format => compatibleFormats.includes(format));
      return supported.length ? supported : [recommendation.primary_output || compatibleFormats[0]];
    });
  }, [recommendation?.profile, compatibleFormats.join('|')]);
  const applyRealRecommendation = () => {
    if (recommendation) {
      const automaticServices = recommendation.auto_apply_services
        || (recommendation.recommended_services || []).filter(service => service !== 'translation');
      const primaryOutput = recommendation.primary_output || 'original';
      setServices(automaticServices.filter(service => service !== 'translation'));
      setTranslationTargets([]);
      setOutputFormats([primaryOutput]);
      setOutputOptions(current => ({
        ...current,
        profile: recommendation.profile || current.profile,
        language_mode: 'none',
        bilingual_layout: 'none',
        layout_profile: recommendation.layout_profile || 'auto',
        output_strategy: recommendation.output_strategy || 'preserve',
        primary_format: primaryOutput,
        additional_formats: [],
        preserve_layout: true,
        preserve_images: true,
        preserve_links: true
      }));
    } else {
      const fallbackServices = smartPlan.ocrAuto ? ['ocr', 'conversion', 'data_cleanup'] : ['conversion', 'data_cleanup'];
      setServices(fallbackServices);
      setTranslationTargets([]);
      setOutputFormats(['original']);
      setOutputOptions(current => ({
        ...current,
        profile: 'auto',
        language_mode: 'none',
        bilingual_layout: 'none',
        layout_profile: 'auto',
        output_strategy: 'preserve',
        primary_format: 'original',
        additional_formats: [],
        preserve_layout: true,
        preserve_images: true,
        preserve_links: true
      }));
    }
    setPlanConfirmed(false);
    setRecommendationApplied(true);
    setError('');
    window.setTimeout(() => document.getElementById('processing-plan-confirmation')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };
  const returnToAnalysis = () => {
    setPlanConfirmed(false);
    setRecommendationApplied(false);
    window.setTimeout(() => document.querySelector('.ai-analysis-panel-v44')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };
  return <main className={`page-wrap order-center-v3014 ${uploaded ? 'workspace-ready' : 'workspace-empty'}`}><div className="page-title"><span>{t.processingCenterLabel}</span><h1>{t.center}</h1><p>{t.centerDesc}</p></div><ProcessingJourney isZh={isZh} uploaded={uploaded} analyzing={aiAnalyzing} analysisReady={analysisReady} recommendationApplied={recommendationApplied} confirmed={planConfirmed} /><form className="order-layout" onSubmit={submitOrder}><section className="upload-panel">{uploaded && <div className="workspace-upload-summary"><div><CircleCheck /><span><b>{isZh ? `已识别 ${workspaceCount} 个文件` : `${workspaceCount} files detected`}</b><small>{(workspaceTotalSize / 1024 / 1024).toFixed(2)} MB · {archiveInspecting ? isZh ? '正在解压识别…' : 'Inspecting archive…' : hasArchiveErrors ? isZh ? '部分压缩包解压失败，请检查提示' : 'Some archives could not be extracted' : isZh ? '已自动解压并进入 AI 工作台' : 'Automatically extracted · AI workspace ready'}</small></span></div><label className="continue-upload"><input type="file" multiple accept=".pdf,.xlsx,.xls,.docx,.doc,.csv,.txt,.md,.markdown,.html,.json,.xml,.pptx,.ppt,.png,.jpg,.jpeg,.bmp,.tif,.tiff,.webp,.zip,.rar,.7z,.tar,.gz,.tgz,.tar.gz" onChange={e => addFiles(e.target.files)} /><CloudUpload />{isZh ? '继续上传' : 'Add files'}</label></div>}<label className={`dropzone ${dragging ? 'dragging' : ''} ${uploaded ? 'compact' : ''}`} onDragEnter={() => setDragging(true)} onDragLeave={() => setDragging(false)} onDragOver={e => e.preventDefault()} onDrop={e => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}><input type="file" multiple accept=".pdf,.xlsx,.xls,.docx,.doc,.csv,.txt,.md,.markdown,.html,.json,.xml,.pptx,.ppt,.png,.jpg,.jpeg,.bmp,.tif,.tiff,.webp,.zip,.rar,.7z,.tar,.gz,.tgz,.tar.gz" onChange={e => addFiles(e.target.files)} /><CloudUpload /><h3>{dragging ? isZh ? '松开即可添加文件' : 'Drop to add files' : uploaded ? isZh ? '拖拽更多文件到这里' : 'Drop more files here' : t.drop}</h3><p>{uploaded ? isZh ? '支持继续批量添加，现有文件不会被覆盖。' : 'Add more files without replacing the current queue.' : t.support}</p>{!uploaded && <span className="dropzone-action">{isZh ? '选择文件' : 'Choose files'} <ArrowRight /></span>}</label>{uploaded ? <div className="queue workspace-file-list"><div className="queue-head"><div><b>{isZh ? '文件工作区' : 'File workspace'} · {workspaceCount}</b><small>{(workspaceTotalSize / 1024 / 1024).toFixed(2)} MB</small></div><button type="button" onClick={() => {
              setFiles([]);
              setArchiveManifests({});
            }}>{t.clear}</button></div><div className="workspace-file-scroll">{files.map((f, i) => {
              const manifest = archiveManifests[fileKey(f)];
              if (manifest?.error) return <div className="queue-file workspace-file-row archive-error-row-v45" key={fileKey(f)}><AlertTriangle /><span><b>{f.name}</b><small>{isZh ? `解压失败：${manifest.error}` : `Extraction failed: ${manifest.error}`}</small></span><i>{isZh ? '需要处理' : 'Action required'}</i><div className="file-row-actions"><button type="button" className="delete-file" title={isZh ? '移除后重新上传' : 'Remove and upload again'} onClick={() => removeFile(i)}><Trash2 /></button></div></div>;
              if (manifest?.entries?.length) return <div className="archive-workspace-group" key={fileKey(f)}><div className="queue-file workspace-file-row archive-source-row"><Archive /><span><b>{f.name}</b><small>{isZh ? `已自动解压 · ${manifest.file_count} 个可处理文件` : `Automatically extracted · ${manifest.file_count} supported files`}</small></span><i>{isZh ? '已解压' : 'Extracted'}</i><div className="file-row-actions"><button type="button" className="delete-file" title={isZh ? '移除整个压缩包' : 'Remove archive'} onClick={() => removeFile(i)}><Trash2 /></button></div></div>{manifest.entries.map((entry, index) => <div className="queue-file workspace-file-row archive-entry-row" key={`${fileKey(f)}-${index}`}><FileText /><span><b>{entry.name}</b><small>{(entry.size_bytes / 1024 / 1024).toFixed(2)} MB · {isZh ? `来自 ${f.name}` : `From ${f.name}`}</small></span><i>{isZh ? '待处理' : 'Ready'}</i></div>)}</div>;
              return <div className="queue-file workspace-file-row" key={`${f.name}-${i}`}><FileText /><span><b>{f.name}</b><small>{(f.size / 1024 / 1024).toFixed(2)} MB · {isZh ? '已上传，等待处理' : 'Uploaded · ready'}</small></span><i>{isZh ? '待处理' : 'Ready'}</i><div className="file-row-actions"><button type="button" title={isZh ? '查看文件' : 'Preview file'} onClick={() => previewFile(f)}><Eye /></button><label title={isZh ? '替换文件' : 'Replace file'}><input type="file" onChange={e => replaceFile(i, e.target.files)} /><RotateCcw /></label><button type="button" className="delete-file" title={isZh ? '删除文件' : 'Delete file'} onClick={() => removeFile(i)}><Trash2 /></button></div></div>;
            })}</div>{workspaceCount > 8 && <div className="workspace-file-count-note">{isZh ? `列表内滚动查看全部 ${workspaceCount} 个文件` : `Scroll inside the list to view all ${workspaceCount} files`}</div>}</div> : <div className="empty-file-state"><div className="empty-file-icon"><FileText /></div><b>{isZh ? '暂无上传文件' : 'No files uploaded'}</b><p>{isZh ? '请选择或拖拽文件。上传成功后，这里会切换为可查看、替换和删除的文件工作区。' : 'Choose or drop files. After upload, this area becomes a file workspace with preview, replace and delete actions.'}</p></div>}{uploaded && <div className="workspace-insight-v312"><div><b>{workspaceCount}</b><small>{isZh ? '文件数量' : 'Files'}</small></div><div><b>{fileTypes.slice(0, 3).join(' / ') || '-'}</b><small>{isZh ? '文件类型' : 'Types'}</small></div><div><b>{(workspaceTotalSize / 1024 / 1024).toFixed(2)} MB</b><small>{isZh ? '解压后大小' : 'Extracted size'}</small></div><div><b>≈ {estimatedSeconds}s</b><small>{isZh ? '预计处理' : 'Estimate'}</small></div></div>}</section><aside className="order-card"><div className="order-card-title"><div><h2>{t.settings}</h2><p>{isZh ? '选择常用能力，高级参数可按需展开。' : 'Choose common capabilities; expand advanced options only when needed.'}</p></div><button type="button" className="preferences-link" onClick={() => setPage('settings')}>{isZh ? '偏好中心' : 'Preferences'}<ArrowRight /></button></div>{currentUser && <div className="signed-account"><span>{(currentUser.name || currentUser.email || 'U').slice(0, 1).toUpperCase()}</span><div><b>{currentUser.name || currentUser.email}</b><small>{currentUser.email} · {isZh ? '当前登录账户' : 'Signed-in account'}</small></div></div>}
<AIAnalysisPanel isZh={isZh} analysis={realAnalysis} recommendation={recommendation} analyzing={aiAnalyzing} error={aiInsightError} fileCount={workspaceCount} applied={recommendationApplied} onApply={applyRealRecommendation} />
{analysisReady && recommendationApplied && <ProcessingPlanPanel isZh={isZh} t={t} files={files} services={services} setServices={setServices} translationTargets={translationTargets} setTranslationTargets={setTranslationTargets} outputFormats={outputFormats} setOutputFormats={setOutputFormats} compatibleFormats={compatibleFormats} outputOptions={outputOptions} setOutputOptions={setOutputOptions} form={form} setForm={setForm} recommendation={recommendation} analysis={realAnalysis} uploadedFileCount={files.length} actualFileCount={workspaceCount} analysisReady={analysisReady} aiAnalyzing={aiAnalyzing} hasArchiveErrors={hasArchiveErrors} planConfirmed={planConfirmed} setPlanConfirmed={setPlanConfirmed} estimatedSeconds={estimatedSeconds} estimatedCredits={estimatedCredits} estimatedQuality={estimatedQuality} submitting={submitting} error={error} onBack={returnToAnalysis} />}
</aside></form></main>;
}
function OrderStatus({
  t,
  data,
  setPage
}) {
  const [tracking, setTracking] = useState(data),
    [trackError, setTrackError] = useState(''),
    [deliveryMessage, setDeliveryMessage] = useState(''),
    [downloadInfo, setDownloadInfo] = useState(null),
    [downloading, setDownloading] = useState(false),
    [analysisOpen, setAnalysisOpen] = useState(false),
    [deliveryPage, setDeliveryPage] = useState(1),
    [deliveryQuery, setDeliveryQuery] = useState(''),
    [deliveryFilter, setDeliveryFilter] = useState('success');
  const downloadAll = async () => {
    setDownloading(true);
    setDeliveryMessage('');
    try {
      const url = `${API_BASE}/api/track/delivery/download-all?order_number=${encodeURIComponent(tracking.order_number)}&email=${encodeURIComponent(tracking.email)}`;
      const response = await fetch(url);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || '下载失败');
      }
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const match = disposition.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i);
      const filename = decodeURIComponent((match?.[1] || `${tracking.order_number}_delivery.zip`).replace(/\"/g, ''));
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'ZIP archive',
            accept: {
              'application/zip': ['.zip']
            }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        setDownloadInfo({
          filename,
          folder: document.documentElement.lang.startsWith('zh') ? '你刚刚选择的保存位置' : 'The location you selected'
        });
      } else {
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
        setDownloadInfo({
          filename,
          folder: document.documentElement.lang.startsWith('zh') ? '请在浏览器设置中开启“下载前询问保存位置”' : 'Enable “Ask where to save each file” in browser settings'
        });
      }
    } catch (error) {
      if (error?.name !== 'AbortError') setDeliveryMessage(error.message || '下载失败');
    } finally {
      setDownloading(false);
    }
  };
  const openOutputFolder = async (target = 'project', fileId = null) => {
    setDeliveryMessage('');
    try {
      const params = new URLSearchParams({
        order_number: tracking.order_number,
        email: tracking.email,
        target
      });
      if (fileId !== null) params.set('file_id', String(fileId));
      const r = await fetch(`${API_BASE}/api/track/delivery/open-folder?${params.toString()}`, {
        method: 'POST'
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || t.folderFailed);
      setDeliveryMessage(document.documentElement.lang.startsWith('zh') ? target === 'package' ? '已打开交付包所在位置' : target === 'file' ? '已定位交付文件' : '已打开项目输出目录' : t.folderOpened);
    } catch (e) {
      setDeliveryMessage(e.message || t.folderFailed);
    }
  };
  useEffect(() => {
    if (!data?.order_number || !data?.email) return;
    let stop = false;
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/track?order_number=${encodeURIComponent(data.order_number)}&email=${encodeURIComponent(data.email)}`);
        const j = await r.json();
        if (!r.ok) throw new Error(j.detail || t.submitFailed);
        if (!stop) {
          setTracking({
            ...data,
            ...j
          });
          setTrackError('');
        }
      } catch (e) {
        if (!stop) setTrackError(e.message);
      }
    };
    load();
    const timer = setInterval(load, 1500);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [data, t.submitFailed]);
  if (!tracking) return <main className="status-page"><div className="status-card"><h1>{t.noOrder}</h1><button onClick={() => setPage('order')}>{t.backCenter}</button></div></main>;
  const job = tracking.processing_job || {},
    result = job.result || {},
    analysis = tracking.ai_analysis || data?.ai_analysis || {},
    state = job.state || tracking.status || 'processing',
    completed = state === 'completed' || state === 'quality_review',
    partial = state === 'partial_completed' || Boolean(result.partial_success),
    failed = state === 'failed',
    waitingConfig = state === 'waiting_configuration' || job.current_step === 'configuration',
    terminal = completed || partial || failed || waitingConfig,
    progress = Number(job.progress || (terminal && !waitingConfig ? 100 : 0)),
    outputs = tracking.output_files || [];
  const durations = (job.steps || []).map(x => Number(x.duration_ms || 0)).filter(Boolean),
    stepTotalMs = durations.reduce((a, b) => a + b, 0),
    wallMs = job.created_at && job.updated_at ? Math.max(0, new Date(job.updated_at) - new Date(job.created_at)) : 0,
    totalMs = Math.max(stepTotalMs, wallMs),
    fileTotal = tracking.files?.length || 0,
    ocrFiles = (analysis.files || []).filter(f => f.format === '图片' || f.details?.likely_scanned).length;
  const failures = result.failures || [],
    successfulOutputs = outputs.filter(file => !String(file.original_name || '').toLowerCase().includes('error_report')),
    successfulCount = Number(result.successful_output_count ?? successfulOutputs.length),
    failureCount = Number(result.failure_count ?? failures.length),
    filteredOutputs = successfulOutputs.filter(file => (file.original_name || '').toLowerCase().includes(deliveryQuery.toLowerCase())),
    pageSize = 100,
    totalDeliveryPages = Math.max(1, Math.ceil(filteredOutputs.length / pageSize)),
    visibleOutputs = filteredOutputs.slice((deliveryPage - 1) * pageSize, deliveryPage * pageSize),
    sourceNames = (tracking.files || []).map(file => file.original_name || file.name).filter(Boolean);
  return <main className="status-page"><section className="status-card wide-status"><div className={`status-icon ${failed ? 'failed' : partial ? 'partial' : ''}`}>{failed ? <X /> : terminal ? <CircleCheck /> : <Workflow />}</div><span className="status-kicker">{t.liveOrderLabel}</span><h1>{waitingConfig ? document.documentElement.lang.startsWith('zh') ? '平台 AI 服务暂不可用' : 'Platform AI service unavailable' : failed ? t.failed : partial ? document.documentElement.lang.startsWith('zh') ? '项目部分完成' : 'Project partially completed' : completed ? t.completed : t.processing}</h1><p>{waitingConfig ? document.documentElement.lang.startsWith('zh') ? '文件检查和结构分析已完成。平台 AI 服务暂时不可用，任务已安全暂停且不会扣除 Credits。管理员恢复服务后可重试任务。' : 'Validation and analysis are complete. The platform AI service is temporarily unavailable. The task is paused without charging credits and can be retried after service recovery.' : failed ? document.documentElement.lang.startsWith('zh') ? '没有生成可交付文件，请查看失败原因后重新处理。' : 'No deliverable files were generated. Review the failures and retry.' : partial ? document.documentElement.lang.startsWith('zh') ? `成功 ${successfulCount} 个，失败 ${failureCount} 个；仅成功文件可以交付。` : `${successfulCount} succeeded and ${failureCount} failed; only successful files are deliverable.` : completed ? t.completedDesc : t.processingDesc}</p><div className="order-number"><small>{t.orderNo}</small><b>{tracking.order_number}</b></div><div className="live-progress"><div><b>{document.documentElement.lang.startsWith('zh') ? EVENT_ZH[job.current_step] || job.current_step || t.statusProcessing : job.current_step || t.statusProcessing}</b><span>{progress}%</span></div><i><em style={{
            width: `${progress}%`
          }} /></i></div>{job.steps?.length > 0 && <section className="task-engine"><div className="task-engine-head"><div><span>{t.taskEngine || 'TASK ENGINE'}</span><h2>{t.taskFlow}</h2></div><b>{progress}%</b></div><div className="task-steps">{job.steps.map((step, index) => {
            const state = step.status || 'pending';
            const label = {
              validate: t.stepValidate,
              analyze: t.stepUnderstand,
              ocr: t.serviceOcr,
              translation: t.serviceTranslation,
              cleanup: t.serviceCleanup,
              conversion: document.documentElement.lang.startsWith('zh') ? '格式转换' : 'Format conversion',
              layout: t.stepProcess,
              quality: t.toolQuality,
              export: t.stepDeliver,
              review: t.stepValidate
            }[step.step_key] || step.label;
            const stateText = state === 'completed' ? t.stepCompleted : state === 'running' ? t.stepRunning : state === 'failed' ? t.stepFailed : t.stepPending;
            return <article className={`task-step ${state}`} key={step.step_key}><i>{state === 'completed' ? <Check /> : state === 'failed' ? <X /> : index + 1}</i><div><b>{label}</b><small>{stateText}{step.duration_ms ? ` · ${step.duration_ms < 100 ? '<0.1' : (step.duration_ms / 1000).toFixed(1)}s` : ''}</small>{step.message && <p>{localizeEventText(step.message, document.documentElement.lang.startsWith('zh') ? 'zh' : 'en')}</p>}</div></article>;
          })}</div></section>}<div className="status-grid summary-grid"><div><small>{t.currentStatus}</small><b>{waitingConfig ? document.documentElement.lang.startsWith('zh') ? '等待配置' : 'Configuration required' : (job.state || tracking.status) === 'completed' ? t.statusCompleted : (job.state || tracking.status) === 'failed' ? t.statusFailed : t.statusProcessing}</b></div><div><small>{t.successCount || t.fileCount}</small><b>{successfulCount}{t.items}</b></div><div><small>{t.failedCount || t.statusFailed}</small><b>{failureCount}{t.items}</b></div><div><small>{t.deliveryCount}</small><b>{successfulOutputs.length}{t.items}</b></div><div><small>{t.ocrCount || t.serviceOcr}</small><b>{ocrFiles}{t.items}</b></div><div><small>{t.totalDuration || t.taskDuration}</small><b>{totalMs ? (totalMs / 1000).toFixed(1) + 's' : '—'}</b></div></div><section className="source-summary"><div><b>{document.documentElement.lang.startsWith('zh') ? '本次上传文件' : 'Uploaded files'}</b><span>{fileTotal || analysis.file_count || 0}</span></div><p>{sourceNames.slice(0, 6).join('、')}{sourceNames.length > 6 ? document.documentElement.lang.startsWith('zh') ? ` 等 ${sourceNames.length} 个文件` : ` and ${sourceNames.length - 6} more` : ''}</p></section>{analysis?.files?.length > 0 && <section className="analysis-panel"><div className="analysis-head"><div><span>{t.analysisLabel || 'DOCUMENT ANALYZER'}</span><h2>{t.analysisTitle || 'Document analysis result'}</h2><p>{analysis.summary}</p></div><b className={`complexity complexity-${analysis.complexity}`}>{t.analysisComplexity || 'Complexity'}: {analysis.complexity}</b></div><div className="analysis-summary-grid"><div><small>{t.analysisCategory || 'Category'}</small><b>{analysis.document_category || '—'}</b></div><div><small>{t.analysisFormats || 'Formats'}</small><b>{(analysis.input_formats || []).join(', ') || '—'}</b></div><div><small>{t.analysisLanguages || 'Languages'}</small><b>{(analysis.detected_languages || []).join(', ') || '—'}</b></div><div><small>{t.analysisFiles || 'Files analyzed'}</small><b>{analysis.file_count || 0}</b></div></div><div className="analysis-compact-head"><b>{document.documentElement.lang.startsWith('zh') ? `本次分析 ${analysis.files.length} 个文件` : `${analysis.files.length} files analyzed`}</b><button type="button" onClick={() => setAnalysisOpen(v => !v)}>{analysisOpen ? document.documentElement.lang.startsWith('zh') ? '收起文件明细' : 'Collapse' : document.documentElement.lang.startsWith('zh') ? '展开文件明细' : 'Show details'}</button></div>{analysisOpen && <div className="analysis-files compact">{analysis.files.slice(0, 50).map((file, index) => <article key={`${file.name}-${index}`}><div className="analysis-file-title"><FileText /><span><b>{file.name}</b><small>{file.format} · {(file.size_bytes / 1024 / 1024).toFixed(2)} MB</small></span></div><div className="analysis-metrics">{Object.entries(file.details || {}).filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v)).slice(0, 6).map(([k, v]) => <span key={k}><small>{t[`metric_${k}`] || k.replaceAll('_', ' ')}</small><b>{typeof v === 'boolean' ? v ? t.yes : t.no : String(v)}</b></span>)}</div>{file.warnings?.length > 0 && <div className="analysis-warning">{file.warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}</div>}</article>)}</div>}{!terminal && <div className="recommended-workflow"><b>{t.analysisWorkflow || 'Recommended workflow'}</b><div>{(analysis.recommended_workflow || []).map((step, i) => <span key={i}><i>{i + 1}</i>{step}</span>)}</div></div>}</section>}{partial && <div className="alert warning">{document.documentElement.lang.startsWith('zh') ? `部分完成：成功交付 ${result.successful_output_count || Math.max(0, outputs.length - 1)} 个文件，${result.failure_count || 0} 项失败。请在失败项目中查看具体原因。` : `Partially completed: ${result.successful_output_count || Math.max(0, outputs.length - 1)} files delivered, ${result.failure_count || 0} failures. Review the failed items for details.`}</div>}{waitingConfig && <div className="alert warning">{document.documentElement.lang.startsWith('zh') ? '平台 AI 翻译服务暂时不可用。任务尚未执行且不会扣除 Credits，请稍后重试或联系管理员。' : 'The platform AI translation service is temporarily unavailable. The task has not run and will not be charged; retry later or contact an administrator.'}</div>}{trackError && <div className="alert error">{trackError}</div>}{job.events?.length > 0 && <div className="event-log"><b>{t.liveLog}</b>{job.events.slice(-6).reverse().map((e, i) => <div key={i}><span>{(document.documentElement.lang.startsWith('zh') ? EVENT_ZH[e.step] : null) || e.step}</span><p>{localizeEventText(e.message, document.documentElement.lang.startsWith('zh') ? 'zh' : 'en')}</p></div>)}</div>}{(completed || partial) && <div className="delivery-panel"><div className="delivery-heading"><div><h2>{t.delivery}</h2><p>{t.deliveryDesc}</p></div>{successfulOutputs.length > 0 && <button type="button" className="delivery-main-button" onClick={downloadAll} disabled={downloading}><Archive />{downloading ? document.documentElement.lang.startsWith('zh') ? '正在打包下载…' : 'Preparing download…' : t.downloadAll}</button>}</div>{successfulOutputs.length || failures.length ? <><div className="delivery-toolbar"><div className="delivery-tabs"><button type="button" className={deliveryFilter === 'success' ? 'active' : ''} onClick={() => setDeliveryFilter('success')}>{document.documentElement.lang.startsWith('zh') ? `成功文件（${successfulOutputs.length}）` : `Successful (${successfulOutputs.length})`}</button><button type="button" className={deliveryFilter === 'failed' ? 'active' : ''} onClick={() => setDeliveryFilter('failed')}>{document.documentElement.lang.startsWith('zh') ? `失败项目（${failures.length}）` : `Failed (${failures.length})`}</button></div>{deliveryFilter === 'success' && <input value={deliveryQuery} onChange={e => {
              setDeliveryQuery(e.target.value);
              setDeliveryPage(1);
            }} placeholder={document.documentElement.lang.startsWith('zh') ? '搜索文件名…' : 'Search files…'} />}</div>{deliveryFilter === 'success' ? <><div className="delivery-files compact">{visibleOutputs.map(file => {
                const downloadUrl = `${API_BASE}/api/track/output-files/${file.id}/download?order_number=${encodeURIComponent(tracking.order_number)}&email=${encodeURIComponent(tracking.email)}`;
                const ext = (file.original_name.split('.').pop() || 'FILE').toUpperCase();
                const created = file.created_at ? new Date(file.created_at).toLocaleString() : '';
                return <article key={file.id} className="delivery-file-card"><div className={`delivery-file-icon ${fileTypeClass(file.original_name)}`}><FileText /></div><div className="delivery-file-info"><b>{file.original_name}</b><div><span>{t.fileType}: {ext}</span><span>{(file.size_bytes / 1024).toFixed(1)} KB</span>{created && <span>{t.generatedAt}: {created}</span>}</div></div><div className="delivery-file-actions"><a href={downloadUrl}><Download />{t.downloadFile}</a><button type="button" onClick={() => openOutputFolder('file', file.id)}><FolderOpen />{t.openFolder}</button></div></article>;
              })}</div>{totalDeliveryPages > 1 && <div className="pagination"><button type="button" disabled={deliveryPage === 1} onClick={() => setDeliveryPage(p => Math.max(1, p - 1))}>‹</button><span>{deliveryPage} / {totalDeliveryPages}</span><button type="button" disabled={deliveryPage === totalDeliveryPages} onClick={() => setDeliveryPage(p => Math.min(totalDeliveryPages, p + 1))}>›</button></div>}</> : <div className="failure-list">{failures.length ? failures.map((item, index) => <article key={index}><X /><div><b>{item.source_name || '-'}</b><small>{item.format || 'processing'}</small><p>{item.error || 'Unknown error'}</p></div></article>) : <p>{document.documentElement.lang.startsWith('zh') ? '没有失败项目。' : 'No failed items.'}</p>}</div>}</> : <div className="alert error">{t.noOutput}</div>}{successfulOutputs.length === 1 && <div className="delivery-footer-actions"><button type="button" className="delivery-main-button" onClick={downloadAll} disabled={downloading}><Archive />{downloading ? document.documentElement.lang.startsWith('zh') ? '正在打包下载…' : 'Preparing download…' : t.downloadAll}</button></div>}{deliveryMessage && <p className="delivery-message">{deliveryMessage}</p>}</div>}{downloadInfo && <div className="download-modal-backdrop"><div className="download-modal"><CircleCheck /><h2>{document.documentElement.lang.startsWith('zh') ? '交付包保存完成' : 'Delivery package saved'}</h2><p>{document.documentElement.lang.startsWith('zh') ? '交付包已经保存。' : 'The delivery package has been saved.'}</p><div><small>{document.documentElement.lang.startsWith('zh') ? '文件名' : 'File name'}</small><b>{downloadInfo.filename}</b></div><div><small>{document.documentElement.lang.startsWith('zh') ? '查找位置' : 'Find it in'}</small><b>{downloadInfo.folder}</b></div><div className="download-modal-actions"><button type="button" onClick={downloadAll}><Download />{document.documentElement.lang.startsWith('zh') ? '重新选择位置保存' : 'Choose another location'}</button><button type="button" onClick={() => setDownloadInfo(null)}>{document.documentElement.lang.startsWith('zh') ? '关闭' : 'Close'}</button></div><small className="download-browser-note">{document.documentElement.lang.startsWith('zh') ? '交付 ZIP 只保存在你刚刚通过 Windows“另存为”选择的位置，软件不会再在 C 盘 outputs 目录生成副本。' : 'The ZIP is saved only to the location selected in the system Save As dialog; no project-output copy is created.'}</small></div></div>}<div className="status-actions"><button className="secondary-xl" onClick={() => setPage('home')}><ArrowLeft />{t.backHome}</button><button className="primary-xl" onClick={() => setPage('order')}>{t.newProject}</button><button className="secondary-xl" onClick={() => setPage('dashboard')}>{t.workspace}</button></div><small className="track-note">{t.saveOrder}{tracking.order_number}</small></section></main>;
}
function BillingLive({
  setPage,
  locale,
  authToken
}) {
  const zh = String(locale || '').startsWith('zh'),
    vi = locale === 'vi',
    L = (z, e, v) => zh ? z : vi ? v : e;
  const [tab, setTab] = useState('plans'),
    [billing, setBilling] = useState('monthly'),
    [config, setConfig] = useState({
      plans: [],
      test_mode: false
    }),
    [wallet, setWallet] = useState(null),
    [loading, setLoading] = useState(true),
    [message, setMessage] = useState('');
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/payments/config`).then(async response => {
        const body = await readJson(response);
        if (!response.ok) throw new Error(body.detail || 'Unable to load plans');
        return body;
      }),
      authToken ? fetch(`${API_BASE}/api/wallet`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }).then(async response => {
        const body = await readJson(response);
        if (!response.ok) throw new Error(body.detail || 'Unable to load wallet');
        return body;
      }) : Promise.resolve(null)
    ]).then(([plansConfig, walletData]) => {
      if (cancelled) return;
      setConfig(plansConfig);
      setWallet(walletData);
      setMessage('');
    }).catch(error => {
      if (!cancelled) setMessage(error.message);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [authToken]);
  const subscriptionSkus = config.plans.filter(plan => plan.kind === 'subscription' || plan.kind === 'contact');
  const creditPacks = config.plans.filter(plan => plan.kind === 'credit_pack');
  const planNames = [...new Set(subscriptionSkus.map(plan => plan.name))];
  const visiblePlans = planNames.map(name => {
    const options = subscriptionSkus.filter(plan => plan.name === name);
    return options.find(plan => plan.billing === billing) || options[0];
  }).filter(Boolean);
  const money = plan => plan.kind === 'contact' ? L('联系销售', 'Contact sales', 'Liên hệ bán hàng') : `$${(Number(plan.amount_cents || 0) / 100).toFixed(0)}`;
  return <main className="billing-preview-v44"><EnterpriseSidebar setPage={setPage} active="billing" /><section className="billing-preview-content-v44 billing-live-v45">
    <header><div><span>{L('套餐与额度', 'PLANS & CREDITS', 'GÓI & TÍN DỤNG')}</span><h1>{L('套餐与用量', 'Plans & usage', 'Gói & mức sử dụng')}</h1><p>{L('套餐、额度和钱包数据来自测试后端。本轮仅用于查看和验收，不启用真实支付。', 'Plans, credits and wallet data are loaded from the test backend. Real payments remain disabled in this round.', 'Dữ liệu gói, tín dụng và ví đến từ backend thử nghiệm. Thanh toán thật chưa được bật.')}</p></div><button onClick={() => setPage('settings')}><ArrowLeft />{L('返回设置', 'Back to settings', 'Về cài đặt')}</button></header>
    <div className="billing-live-summary"><span>{loading ? L('正在同步后端数据', 'Syncing backend data', 'Đang đồng bộ dữ liệu') : L(`已同步 ${subscriptionSkus.length} 个套餐 SKU 和 ${creditPacks.length} 个额度包`, `${subscriptionSkus.length} plan SKUs and ${creditPacks.length} credit packs synced`, `Đã đồng bộ ${subscriptionSkus.length} SKU và ${creditPacks.length} gói tín dụng`)}</span><em>{config.test_mode ? L('测试环境', 'TEST ENVIRONMENT', 'MÔI TRƯỜNG THỬ NGHIỆM') : L('只读展示', 'READ ONLY', 'CHỈ ĐỌC')}</em></div>
    {message && <div className="alert error">{message}</div>}
    <nav>{[['plans', L('会员套餐', 'Plans', 'Gói')], ['credits', L('AI 点数', 'AI Credits', 'Điểm AI')], ['wallet', L('钱包与记录', 'Wallet & history', 'Ví & lịch sử')]].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</nav>
    {tab === 'plans' && <><div className="billing-cycle-preview"><button className={billing === 'monthly' ? 'active' : ''} onClick={() => setBilling('monthly')}>{L('月付', 'Monthly', 'Hàng tháng')}</button><button className={billing === 'yearly' ? 'active' : ''} onClick={() => setBilling('yearly')}>{L('年付', 'Yearly', 'Hàng năm')}</button></div><section className="billing-preview-plans-v44">{visiblePlans.map(plan => <article className={plan.name === 'Professional' ? 'featured' : ''} key={plan.id}><span>{plan.name === 'Professional' ? L('推荐', 'RECOMMENDED', 'ĐỀ XUẤT') : L('套餐', 'PLAN', 'GÓI')}</span><h2>{plan.name}</h2><strong>{money(plan)}{plan.billing === 'monthly' && plan.amount_cents > 0 ? <small>/mo</small> : plan.billing === 'yearly' ? <small>/yr</small> : null}</strong><p>{plan.kind === 'contact' ? L('按企业规模和部署要求定制', 'Customized for enterprise deployment and scale', 'Tùy chỉnh theo quy mô doanh nghiệp') : L(`包含 ${Number(plan.credits || 0).toLocaleString()} DA Credits`, `Includes ${Number(plan.credits || 0).toLocaleString()} DA Credits`, `Bao gồm ${Number(plan.credits || 0).toLocaleString()} DA Credits`)}</p><ul><li><Check />{plan.file_limit_mb ? L(`单文件最大 ${plan.file_limit_mb} MB`, `Up to ${plan.file_limit_mb} MB per file`, `Tối đa ${plan.file_limit_mb} MB mỗi tệp`) : L('企业定制限制', 'Custom enterprise limits', 'Giới hạn tùy chỉnh')}</li><li><Check />{plan.team_members > 0 ? L(`${plan.team_members} 个团队席位`, `${plan.team_members} team seat${plan.team_members > 1 ? 's' : ''}`, `${plan.team_members} thành viên`) : L('团队规模按需配置', 'Team size configured by contract', 'Quy mô nhóm theo hợp đồng')}</li><li><Check />{(plan.features || []).slice(0, 3).join(' · ') || L('定制能力', 'Custom capabilities', 'Khả năng tùy chỉnh')}</li></ul><button disabled>{L('仅供测试查看', 'View only in test', 'Chỉ xem trong thử nghiệm')}</button></article>)}</section></>}
    {tab === 'credits' && <section className="billing-credit-grid">{creditPacks.map(pack => <article key={pack.id}><Coins /><h2>{Number(pack.credits || 0).toLocaleString()} DA Credits</h2><strong>${(Number(pack.amount_cents || 0) / 100).toFixed(0)}</strong><p>{L(`有效期 ${pack.valid_days} 天`, `Valid for ${pack.valid_days} days`, `Có hiệu lực ${pack.valid_days} ngày`)}</p><button disabled>{L('本轮不启用购买', 'Purchasing disabled this round', 'Chưa bật mua trong vòng này')}</button></article>)}</section>}
    {tab === 'wallet' && <section className="billing-wallet-live"><CreditCard /><h2>{L('我的钱包', 'My wallet', 'Ví của tôi')}</h2>{wallet ? <><strong>{Number(wallet.total_credits || 0).toLocaleString()} DA Credits</strong><p>{L('当前套餐', 'Current plan', 'Gói hiện tại')}: {wallet.plan_id || 'free'} · {wallet.plan_status || 'active'}</p><div><span>{L('套餐额度', 'Subscription', 'Gói')}: {Number(wallet.subscription_credits || 0).toLocaleString()}</span><span>{L('购买额度', 'Purchased', 'Đã mua')}: {Number(wallet.purchased_credits || 0).toLocaleString()}</span><span>{L('奖励额度', 'Bonus', 'Thưởng')}: {Number(wallet.bonus_credits || 0).toLocaleString()}</span></div></> : <p>{authToken ? L('正在读取钱包数据', 'Loading wallet data', 'Đang tải ví') : L('登录后查看钱包', 'Sign in to view your wallet', 'Đăng nhập để xem ví')}</p>}</section>}
  </section></main>;
}

function BillingPreview({
  setPage,
  locale
}) {
  const zh = String(locale || '').startsWith('zh'),
    vi = locale === 'vi';
  const L = (z, e, v) => zh ? z : vi ? v : e;
  const [tab, setTab] = useState('plans');
  const plans = [[L('免费版', 'Free', 'Miễn phí'), '$0', L('体验核心文档工作流', 'Explore the core document workflow', 'Trải nghiệm quy trình cốt lõi')], [L('入门版', 'Starter', 'Khởi đầu'), '$19', L('适合个人与轻量任务', 'For individuals and light workloads', 'Cho cá nhân và tác vụ nhẹ')], [L('专业版', 'Professional', 'Chuyên nghiệp'), '$59', L('适合专业文档处理', 'For professional document operations', 'Cho xử lý tài liệu chuyên nghiệp')], [L('商业版', 'Business', 'Doanh nghiệp'), '$149', L('适合团队与批量工作', 'For teams and batch workflows', 'Cho nhóm và xử lý hàng loạt')], [L('企业版', 'Enterprise', 'Doanh nghiệp lớn'), L('联系销售', 'Contact sales', 'Liên hệ'), L('按企业需求配置', 'Configured for enterprise needs', 'Cấu hình theo doanh nghiệp')]];
  return <main className="billing-preview-v44"><EnterpriseSidebar setPage={setPage} active="billing" /><section className="billing-preview-content-v44">
  <header><div><span>{L('V45 商业系统预览', 'V45 COMMERCE PREVIEW', 'BẢN XEM TRƯỚC V45')}</span><h1>{L('套餐与用量', 'Plans & usage', 'Gói & mức sử dụng')}</h1><p>{L('V44 保留完整页面结构；支付、钱包、AI 点数、退款和发票将在 V45 统一接入。', 'V44 preserves the complete information structure. Checkout, wallet, AI credits, refunds and invoices will be connected in V45.', 'V44 giữ cấu trúc trang; thanh toán và tín dụng sẽ được kết nối ở V45.')}</p></div><button onClick={() => setPage('settings')}><ArrowLeft />{L('返回设置', 'Back to settings', 'Về cài đặt')}</button></header>
  <nav>{[['plans', L('会员套餐', 'Plans', 'Gói')], ['credits', L('AI 点数', 'AI Credits', 'Điểm AI')], ['wallet', L('钱包与记录', 'Wallet & history', 'Ví & lịch sử')]].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</nav>
  {tab === 'plans' && <section className="billing-preview-plans-v44">{plans.map(([name, price, desc], index) => <article className={index === 2 ? 'featured' : ''} key={name}><span>{index === 2 ? L('推荐', 'RECOMMENDED', 'ĐỀ XUẤT') : L('套餐', 'PLAN', 'GÓI')}</span><h2>{name}</h2><strong>{price}{price.startsWith('$') && price !== '$0' ? <small>/mo</small> : null}</strong><p>{desc}</p><ul><li><Check />{L('AI 文档工作流', 'AI document workflow', 'Quy trình tài liệu AI')}</li><li><Check />{L('多语言与质量检查', 'Multilingual quality checks', 'Đa ngôn ngữ & kiểm tra')}</li><li><Check />{L('具体额度将在 V45 公布', 'Final limits arrive in V45', 'Hạn mức công bố ở V45')}</li></ul><button disabled>{L('V45 开放', 'Available in V45', 'Mở ở V45')}</button></article>)}</section>}
  {tab === 'credits' && <section className="billing-preview-placeholder-v44"><Coins /><h2>{L('AI 点数将在 V45 启用', 'AI Credits arrive in V45', 'Điểm AI sẽ có ở V45')}</h2><p>{L('本轮不连接购买、扣费、退款和余额接口，避免未完成的支付流程影响客户端体验。', 'Purchasing, charging, refunds and balances remain disconnected in V44.', 'Mua, trừ điểm và hoàn tiền chưa kết nối trong V44.')}</p><div><span>1,000</span><span>5,000</span><span>20,000</span></div></section>}
  {tab === 'wallet' && <section className="billing-preview-placeholder-v44"><CreditCard /><h2>{L('钱包与交易记录结构已保留', 'Wallet structure is ready', 'Cấu trúc ví đã sẵn sàng')}</h2><p>{L('V45 接入正式支付后，这里将显示余额、用量、订单、退款和发票。', 'Balances, usage, orders, refunds and invoices will appear after the V45 commerce integration.', 'Số dư, đơn hàng và hóa đơn sẽ hiển thị sau V45.')}</p></section>}
 </section></main>;
}
function PaymentCenter({
  setPage,
  locale,
  authToken,
  currentUser
}) {
  const lang = (locale || document.documentElement.lang || 'en').toLowerCase(),
    isZh = lang.startsWith('zh'),
    isVi = lang.startsWith('vi');
  const [config, setConfig] = useState({
      plans: [],
      configured: false
    }),
    [billing, setBilling] = useState('monthly'),
    [tab, setTab] = useState('plans'),
    [form, setForm] = useState({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      company: '',
      phone: '',
      requirements: '',
      plan_id: 'professional_monthly'
    }),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [wallet, setWallet] = useState(null),
    [salesOpen, setSalesOpen] = useState(false),
    [creditsHelpOpen, setCreditsHelpOpen] = useState(false),
    [paymentSuccess, setPaymentSuccess] = useState(null);
  const L = (zh, en, vi) => isZh ? zh : isVi ? vi : en;
  const names = {
    Free: L('免费版', 'Free', 'Miễn phí'),
    Starter: L('入门版', 'Starter', 'Khởi đầu'),
    Professional: L('专业版', 'Professional', 'Chuyên nghiệp'),
    Business: L('商业版', 'Business', 'Doanh nghiệp'),
    Enterprise: L('企业版', 'Enterprise', 'Doanh nghiệp lớn')
  };
  useEffect(() => {
    if (currentUser) setForm(v => ({
      ...v,
      name: currentUser.name || '',
      email: currentUser.email || ''
    }));
    fetch(`${API_BASE}/api/payments/config`).then(r => r.json()).then(setConfig).catch(() => setMessage(L('商业服务暂时不可用。', 'Commercial service unavailable.', 'Dịch vụ thương mại chưa khả dụng.')));
  }, []);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('payment') !== 'demo') return;
    const paymentNumber = q.get('payment_number'),
      email = q.get('email');
    if (!paymentNumber || !email) return;
    setForm(v => ({
      ...v,
      email
    }));
    setBusy(true);
    setMessage(L('正在完成 Demo 支付验收，请稍候…', 'Completing Demo checkout acceptance…', 'Đang hoàn tất thanh toán Demo…'));
    fetch(`${API_BASE}/api/payments/demo-confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        payment_number: paymentNumber,
        customer_email: email
      })
    }).then(async r => {
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || 'Demo checkout failed');
      setMessage(L('Demo 付款成功：订单、点数和 License 已完成。未产生真实扣款。', 'Demo payment succeeded: order, credits and license are complete. No real charge was made.', 'Thanh toán Demo thành công: đơn hàng, điểm và License đã hoàn tất. Không có khoản trừ tiền thật.'));
      setTab('wallet');
      return fetch(`${API_BASE}/api/wallet?customer_email=${encodeURIComponent(email)}`);
    }).then(r => r && r.json()).then(j => j && setWallet(j)).catch(e => setMessage(e.message)).finally(() => {
      setBusy(false);
      window.history.replaceState({}, '', `${window.location.pathname}#pricing`);
    });
  }, []);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('payment') !== 'paypal-return') return;
    const orderId = q.get('token');
    if (!orderId) return;
    setBusy(true);
    setMessage(L('正在确认 PayPal 付款，请稍候…', 'Confirming your PayPal payment…', 'Đang xác nhận thanh toán PayPal…'));
    fetch(`${API_BASE}/api/payments/paypal/capture?order_id=${encodeURIComponent(orderId)}`, {
      method: 'POST'
    }).then(async r => {
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || 'PayPal capture failed');
      const email = j.customer_email || currentUser?.email || '';
      if (email) setForm(v => ({
        ...v,
        email
      }));
      setPaymentSuccess(j);
      setMessage(L('付款成功，套餐或 DA AI 点数已经到账。', 'Payment successful. Your plan or DA Credits are now active.', 'Thanh toán thành công. Gói hoặc DA Credits đã được kích hoạt.'));
      setTab('wallet');
      if (!email) return null;
      return fetch(`${API_BASE}/api/wallet`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
    }).then(r => r && r.json()).then(j => j && setWallet(j)).catch(e => setMessage(e.message)).finally(() => {
      setBusy(false);
      window.history.replaceState({}, '', `${window.location.pathname}#payment-success`);
    });
  }, [authToken, currentUser?.email]);
  const plans = config.plans.filter(p => p.kind === 'subscription' && (p.billing === billing || p.id === 'free')).concat(config.plans.filter(p => p.kind === 'contact'));
  const packs = config.plans.filter(p => p.kind === 'credit_pack');
  const choose = p => {
    setForm(v => ({
      ...v,
      plan_id: p.id
    }));
    setMessage('');
  };
  const chooseForCheckout = p => {
    choose(p);
    window.setTimeout(() => document.querySelector('.commercial-checkout')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    }), 80);
  };
  const validEmail = () => form.email.includes('@');
  const activateFree = async () => {
    if (!authToken || !currentUser) {
      setMessage(L('请先注册或登录后再开通免费版。', 'Please register or sign in before activating the free plan.', 'Vui lòng đăng ký hoặc đăng nhập trước khi kích hoạt gói miễn phí.'));
      setPage('register');
      return;
    }
    if (!validEmail()) return setMessage(L('请先在下方填写有效邮箱。', 'Enter a valid email below first.', 'Vui lòng nhập email hợp lệ bên dưới.'));
    setBusy(true);
    setMessage('');
    try {
      const r = await fetch(`${API_BASE}/api/plans/free-activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          customer_name: currentUser?.name || form.name,
          customer_email: currentUser?.email || form.email,
          locale
        })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || 'Activation failed');
      setWallet(j.wallet);
      setTab('wallet');
      setMessage(L('免费版已开通，500 DA AI 点数已到账。', 'Free plan activated with 500 DA Credits.', 'Đã kích hoạt gói miễn phí và cộng 500 DA Credits.'));
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };
  const checkout = async (planId = form.plan_id) => {
    if (!authToken || !currentUser) {
      setMessage(L('请先注册或登录后再购买。', 'Please register or sign in before purchasing.', 'Vui lòng đăng ký hoặc đăng nhập trước khi mua.'));
      setPage('register');
      return;
    }
    const p = config.plans.find(x => x.id === planId);
    if (!p) return;
    if (p.id === 'free') return activateFree();
    if (p.kind === 'contact') {
      setSalesOpen(true);
      return;
    }
    choose(p);
    if (!currentUser?.email) return setMessage(L('当前账户缺少邮箱，请前往设置 → 个人资料补充。', 'Your account has no email. Add it in Settings → Profile.', 'Tài khoản chưa có email. Hãy thêm trong Cài đặt → Hồ sơ.'));
    if (!config.checkout_available) return setMessage(L('当前没有可用的支付插件。请在服务器配置 Paddle、PayPal 或 Stripe；本地验收可启用 Demo 支付模式。', 'No payment plugin is available. Configure Paddle, PayPal or Stripe on the server, or enable Demo payment mode for local acceptance.', 'Chưa có plugin thanh toán. Hãy cấu hình Paddle, PayPal hoặc Stripe, hoặc bật chế độ Demo để nghiệm thu.'));
    setBusy(true);
    setMessage('');
    try {
      const r = await fetch(`${API_BASE}/api/payments/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          plan_id: p.id,
          customer_name: currentUser?.name || form.name,
          customer_email: currentUser?.email || form.email,
          locale
        })
      });
      const raw = await r.text();
      let j = {};
      try {
        j = raw ? JSON.parse(raw) : {};
      } catch {
        j = {
          detail: raw || `Checkout failed (HTTP ${r.status})`
        };
      }
      if (!r.ok) throw new Error(j.detail || `Checkout failed (HTTP ${r.status})`);
      if (!j.checkout_url) throw new Error('Checkout URL was not returned by the server.');
      window.location.href = j.checkout_url;
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };
  const submitSales = async () => {
    if (!form.name.trim() || !validEmail()) return setMessage(L('请填写姓名和有效邮箱。', 'Enter your name and a valid email.', 'Nhập họ tên và email hợp lệ.'));
    setBusy(true);
    setMessage('');
    try {
      const r = await fetch(`${API_BASE}/api/sales/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_name: currentUser?.name || form.name,
          customer_email: currentUser?.email || form.email,
          company: form.company,
          phone: form.phone,
          requirements: form.requirements,
          locale
        })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || 'Submit failed');
      setSalesOpen(false);
      setMessage(L('销售咨询已提交，我们会通过邮箱与你联系。', 'Sales request submitted. We will contact you by email.', 'Đã gửi yêu cầu tư vấn. Chúng tôi sẽ liên hệ qua email.'));
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };
  const loadWallet = () => {
    if (!validEmail()) return setMessage(L('先输入邮箱。', 'Enter your email first.', 'Nhập email trước.'));
    fetch(`${API_BASE}/api/wallet`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    }).then(async r => {
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || 'Wallet unavailable');
      return j;
    }).then(setWallet).catch(e => setMessage(e.message));
  };
  useEffect(() => {
    if (tab === 'wallet' && authToken && !wallet) loadWallet();
  }, [tab, authToken]);
  const features = p => [p.kind === 'contact' ? L('AI 点数按合同配置', 'AI processing credits configured by contract', 'Điểm xử lý AI theo hợp đồng') : p.billing === 'yearly' ? L(`全年包含 ${p.credits.toLocaleString()} DA AI 点数`, `Includes ${p.credits.toLocaleString()} DA Credits per year`, `Bao gồm ${p.credits.toLocaleString()} DA Credits mỗi năm`) : L(`每月赠送 ${p.credits.toLocaleString()} DA AI 点数`, `Includes ${p.credits.toLocaleString()} DA Credits monthly`, `Tặng ${p.credits.toLocaleString()} DA Credits mỗi tháng`), p.file_limit_mb ? L(`单个文件最大 ${p.file_limit_mb} MB`, `Up to ${p.file_limit_mb} MB per file`, `Tối đa ${p.file_limit_mb} MB mỗi tệp`) : L('文件限制按需求定制', 'Custom file limits', 'Giới hạn tệp tùy chỉnh'), p.team_members === 1 ? L('个人账户', 'Single-user account', 'Tài khoản cá nhân') : p.team_members > 1 ? L(`最多 ${p.team_members} 名团队成员`, `Up to ${p.team_members} team members`, `Tối đa ${p.team_members} thành viên`) : L('不限团队成员', 'Unlimited team members', 'Không giới hạn thành viên')];
  const estimate = p => {
    const c = Number(p.credits || 0);
    return {
      translation: `${Math.max(1, Math.round(c / 20)).toLocaleString()}–${Math.max(1, Math.round(c / 10)).toLocaleString()}`,
      ocr: `${Math.max(1, Math.round(c / 8)).toLocaleString()}–${Math.max(1, Math.round(c / 4)).toLocaleString()}`,
      office: `${Math.max(1, Math.round(c / 25)).toLocaleString()}–${Math.max(1, Math.round(c / 12)).toLocaleString()}`
    };
  };
  const selectedPlan = config.plans.find(p => p.id === form.plan_id) || null;
  const selectedPlanName = selectedPlan ? names[selectedPlan.name] || selectedPlan.name : '';
  const selectedAmount = selectedPlan && selectedPlan.kind !== 'contact' ? `$${(selectedPlan.amount_cents / 100).toFixed(0)}` : '';
  const selectedCycle = selectedPlan?.billing === 'monthly' ? L('/月', '/month', '/tháng') : selectedPlan?.billing === 'yearly' ? L('/年', '/year', '/năm') : '';
  return <main className="page-wrap payment-page">{paymentSuccess && <div className="payment-success-backdrop"><section className="payment-success-card"><CircleCheck /><span>PAYMENT COMPLETED</span><h2>{L('支付成功', 'Payment successful', 'Thanh toán thành công')}</h2><p>{L('套餐或 DA AI 点数已到账，并已生成支付订单记录。', 'Your plan or DA Credits are active and the payment order has been recorded.', 'Gói hoặc DA Credits đã được kích hoạt và đơn thanh toán đã được ghi nhận.')}</p><div><small>{L('支付订单号', 'Payment number', 'Mã thanh toán')}</small><b>{paymentSuccess.payment_number}</b></div><div><small>{L('当前套餐', 'Active plan', 'Gói hiện tại')}</small><b>{paymentSuccess.plan_name || paymentSuccess.plan_id || '-'}</b></div><div><small>{L('到账点数', 'Credits added', 'Điểm đã cộng')}</small><b>{Number(paymentSuccess.credits || 0).toLocaleString()} DA Credits</b></div><button onClick={() => setPaymentSuccess(null)}>{L('查看我的钱包', 'View my wallet', 'Xem ví của tôi')}</button></section></div>}<button className="back-link" onClick={() => setPage('dashboard')}><ArrowLeft />{L('返回工作台', 'Back to workspace', 'Về không gian làm việc')}</button><div className="page-title"><span>SECURE COMMERCE HUB</span><h1>{L('套餐与 AI 处理额度', 'Plans & AI Processing Credits', 'Gói & Điểm xử lý AI')}</h1><p>{L('选择会员套餐，或在每月额度用完后单独购买更多 AI 处理额度。', 'Choose a subscription plan or buy extra AI processing credits when your monthly balance runs out.', 'Chọn gói thành viên hoặc mua thêm điểm xử lý AI khi hết hạn mức hàng tháng.')}</p></div>{selectedPlan && tab === 'plans' && selectedPlan.kind !== 'contact' && <section className="selected-plan-banner"><div><CircleCheck /><span>{L('已选择套餐', 'PLAN SELECTED', 'ĐÃ CHỌN GÓI')}</span><b>{selectedPlanName}</b></div><strong>{selectedAmount}<small>{selectedCycle}</small></strong><p>{L('请在下方确认账户信息，然后继续完成付款。', 'Confirm your account details below, then continue to payment.', 'Xác nhận thông tin tài khoản bên dưới rồi tiếp tục thanh toán.')}</p></section>}{config.provider === 'demo' && <div className="payment-test-note"><ShieldCheck />{L('当前为 Demo 验收模式：可完整测试创建订单、模拟付款、点数到账和 License 生成，不会产生真实扣款。', 'Demo acceptance mode is active: order creation, simulated payment, crediting and license issuance can be tested without a real charge.', 'Đang ở chế độ Demo: có thể kiểm tra đơn hàng, thanh toán mô phỏng, cộng điểm và cấp License mà không bị trừ tiền thật.')}</div>}<div className="billing-tabs"><button className={tab === 'plans' ? 'active' : ''} onClick={() => setTab('plans')}>{L('会员套餐', 'Plans', 'Gói')}</button><button className={tab === 'credits' ? 'active' : ''} onClick={() => setTab('credits')}>{L('AI 处理额度', 'AI Processing Credits', 'Điểm xử lý AI')}</button><button className={tab === 'wallet' ? 'active' : ''} onClick={() => {
        setTab('wallet');
        setMessage('');
      }}>{L('我的钱包', 'My wallet', 'Ví của tôi')}</button></div>{tab === 'plans' && <><div className="billing-cycle billing-cycle-v3036"><button className={billing === 'monthly' ? 'active' : ''} onClick={() => setBilling('monthly')}><span>{billing === 'monthly' && <CircleCheck />}{L('月付', 'Monthly', 'Hàng tháng')}</span><small>{billing === 'monthly' ? L('当前选择', 'Selected', 'Đã chọn') : L('按月灵活付款', 'Flexible monthly', 'Thanh toán theo tháng')}</small></button><button className={billing === 'yearly' ? 'active' : ''} onClick={() => setBilling('yearly')}><span>{billing === 'yearly' && <CircleCheck />}{L('年付', 'Yearly', 'Hàng năm')}</span><small>{billing === 'yearly' ? L('当前选择 · 省约 17%', 'Selected · Save about 17%', 'Đã chọn · Tiết kiệm khoảng 17%') : L('省约 17%', 'Save about 17%', 'Tiết kiệm khoảng 17%')}</small></button></div><section className="commercial-plan-grid">{plans.map(p => <article key={p.id} className={`commercial-plan ${p.name === 'Professional' ? 'featured' : ''} ${form.plan_id === p.id ? 'selected' : ''}`} onClick={() => choose(p)}>{form.plan_id === p.id && <span className="selected-plan-badge"><CircleCheck />{L('当前选择', 'SELECTED', 'ĐÃ CHỌN')}</span>}{p.name === 'Professional' && <em>{L('最受欢迎', 'MOST POPULAR', 'PHỔ BIẾN NHẤT')}</em>}<h3>{names[p.name] || p.name}</h3><strong>{p.kind === 'contact' ? L('联系销售', 'Contact sales', 'Liên hệ') : `$${(p.amount_cents / 100).toFixed(0)}`}<small>{p.billing === 'monthly' ? L('/月', '/mo', '/tháng') : p.billing === 'yearly' ? L('/年', '/yr', '/năm') : ''}</small></strong><ul>{features(p).map(x => <li key={x}><Check />{x}</li>)}</ul><button type="button" className={form.plan_id === p.id ? 'selected-plan-action' : ''} onClick={e => {
            e.stopPropagation();
            p.id === 'free' ? activateFree() : p.kind === 'contact' ? setSalesOpen(true) : chooseForCheckout(p);
          }} disabled={busy}>{p.id === 'free' ? L('免费开始', 'Start free', 'Bắt đầu miễn phí') : p.kind === 'contact' ? L('联系销售', 'Contact sales', 'Liên hệ') : form.plan_id === p.id ? L(`✓ 已选择${names[p.name] || p.name}`, `✓ ${names[p.name] || p.name} selected`, `✓ Đã chọn ${names[p.name] || p.name}`) : L(`选择${names[p.name] || p.name}`, `Choose ${names[p.name] || p.name}`, `Chọn ${names[p.name] || p.name}`)}</button></article>)}</section><div className="credits-explainer"><b>{L('DA AI 点数 = AI 处理额度', 'DA Credits = AI Processing Credits', 'DA Credits = Điểm xử lý AI')}</b><span>{L('用于文档翻译、OCR、格式转换和智能整理；每次任务会按文件大小、页数和复杂度消耗点数。', 'Used for translation, OCR, document conversion and smart organization. Each task uses credits based on file size, page count and complexity.', 'Dùng cho dịch tài liệu, OCR, chuyển đổi và xử lý thông minh. Mỗi tác vụ tiêu hao điểm theo kích thước, số trang và độ phức tạp.')}</span><button type="button" onClick={() => setCreditsHelpOpen(true)}>{L('详细说明', 'Learn more', 'Xem chi tiết')}</button></div></>}{tab === 'credits' && <><section className="credits-intro"><div><span>{L('一次性购买，不会自动续费', 'One-time purchase · No auto-renewal', 'Mua một lần · Không tự động gia hạn')}</span><h2>{L('购买更多 AI 处理额度', 'Buy more AI Processing Credits', 'Mua thêm điểm xử lý AI')}</h2><p>{L('会员套餐每月已包含额度。只有余额不足时才需要购买额外点数。', 'Your subscription already includes monthly credits. Buy extra only when your balance is running low.', 'Gói thành viên đã bao gồm điểm hàng tháng. Chỉ mua thêm khi số dư sắp hết.')}</p></div><button type="button" onClick={() => setCreditsHelpOpen(true)}>❓ {L('什么是 DA AI 点数？', 'What are DA Credits?', 'DA Credits là gì?')}</button></section><section className="commercial-plan-grid credit-packs">{packs.map((p, index) => {
          const e = estimate(p);
          return <article key={p.id} className={`commercial-plan ${index === 1 ? 'featured' : ''} ${form.plan_id === p.id ? 'selected' : ''}`} onClick={() => choose(p)}>{index === 1 && <em>{L('最划算', 'BEST VALUE', 'GIÁ TRỊ TỐT NHẤT')}</em>}<h3>{Number(p.credits || 0).toLocaleString()} <small>{L('DA AI 点数', 'DA Credits', 'DA Credits')}</small></h3><strong>${(p.amount_cents / 100).toFixed(0)}</strong><p>{L(`有效期 ${p.valid_days} 天`, `Valid for ${p.valid_days} days`, `Có hiệu lực ${p.valid_days} ngày`)}</p><div className="credit-estimates"><b>{L('预计可处理', 'Estimated usage', 'Ước tính xử lý')}</b><span>{L(`翻译约 ${e.translation} 页`, `Translate about ${e.translation} pages`, `Dịch khoảng ${e.translation} trang`)}</span><span>{L(`OCR 约 ${e.ocr} 页`, `OCR about ${e.ocr} pages`, `OCR khoảng ${e.ocr} trang`)}</span><span>{L(`Office 文件约 ${e.office} 份`, `About ${e.office} Office files`, `Khoảng ${e.office} tệp Office`)}</span></div><button type="button" onClick={ev => {
              ev.stopPropagation();
              checkout(p.id);
            }} disabled={busy}>{config.checkout_available ? L(config.provider === 'demo' ? '模拟购买' : '立即购买', config.provider === 'demo' ? 'Demo purchase' : 'Buy now', config.provider === 'demo' ? 'Mua Demo' : 'Mua ngay') : L('选择额度包', 'Choose credit pack', 'Chọn gói điểm')}</button></article>;
        })}</section><p className="estimate-note">{L('以上数量仅为便于理解的估算，实际消耗取决于文件页数、大小、语言、版式和处理复杂度。', 'Usage figures are estimates for guidance only. Actual credit use depends on pages, file size, language, layout and processing complexity.', 'Số lượng trên chỉ là ước tính tham khảo. Điểm thực tế phụ thuộc vào số trang, kích thước, ngôn ngữ, bố cục và độ phức tạp.')}</p></>}{tab === 'wallet' && <section className="wallet-panel wallet-v282 wallet-center"><div className="wallet-center-head"><div><span>WALLET CENTER</span><h2>{L('我的钱包', 'My wallet', 'Ví của tôi')}</h2><p>{L('统一查看额度余额、消费流水、支付记录与发票。', 'View balances, usage, payments and invoices in one place.', 'Xem số dư, giao dịch, thanh toán và hóa đơn.')}</p></div><div><button type="button" onClick={() => setTab('credits')}>{L('充值 Credits', 'Buy Credits', 'Mua Credits')}</button><button type="button" onClick={() => setTab('plans')}>{L('管理套餐', 'Manage plan', 'Quản lý gói')}</button></div></div>{wallet ? <><div className="wallet-hero-card"><div className="wallet-total"><small>{L('可用 AI 处理额度', 'Available AI processing balance', 'Số dư điểm xử lý AI')}</small><b>{wallet.total_credits.toLocaleString()} DA Credits</b><span>{names[(config.plans.find(p => p.id === wallet.plan_id) || {}).name] || wallet.plan_id}</span></div><div className="wallet-usage"><span>{L('当前套餐使用情况', 'Current plan usage', 'Mức sử dụng gói hiện tại')}</span><div><i style={{
                width: `${Math.min(100, Math.round((wallet.subscription_credits - wallet.total_credits) / Math.max(1, wallet.subscription_credits) * 100))}%`
              }} /></div><small>{L('余额和流水由支付与任务系统实时同步', 'Balance and activity sync with payment and processing systems', 'Số dư và giao dịch được đồng bộ theo thời gian thực')}</small></div></div><div className="wallet-buckets"><div><b>{wallet.subscription_credits.toLocaleString()}</b><small>{L('套餐赠送额度', 'Subscription credits', 'Điểm từ gói')}</small></div><div><b>{wallet.purchased_credits.toLocaleString()}</b><small>{L('单独购买额度', 'Purchased credits', 'Điểm đã mua')}</small></div><div><b>{wallet.bonus_credits.toLocaleString()}</b><small>{L('奖励额度', 'Bonus credits', 'Điểm thưởng')}</small></div><div><b>{wallet.ledger?.length || 0}</b><small>{L('交易记录', 'Transactions', 'Giao dịch')}</small></div></div><div className="wallet-record-grid"><div className="wallet-ledger"><h3>{L('最近流水', 'Recent activity', 'Giao dịch gần đây')}</h3>{wallet.ledger?.length > 0 ? wallet.ledger.slice(0, 10).map(x => <div key={x.id}><span>{x.note || x.transaction_type}</span><b>{x.credits > 0 ? '+' : ''}{x.credits}</b></div>) : <p>{L('暂无消费或充值记录。', 'No credit activity yet.', 'Chưa có giao dịch điểm.')}</p>}</div><div className="wallet-ledger"><h3>{L('支付与发票', 'Payments & invoices', 'Thanh toán & hóa đơn')}</h3><p>{L('支付成功后，订单和发票记录将在此显示。', 'Completed payments and invoices will appear here.', 'Thanh toán và hóa đơn sẽ hiển thị tại đây.')}</p><button type="button" onClick={() => setMessage(L('暂无可下载发票。', 'No invoice is available yet.', 'Chưa có hóa đơn.'))}>{L('查看发票', 'View invoices', 'Xem hóa đơn')}</button></div></div></> : <div className="wallet-loading-card"><b>{L('正在读取钱包数据', 'Loading wallet', 'Đang tải ví')}</b><p>{L('请稍候，系统正在同步余额与交易记录。', 'Please wait while balances and activity are synchronized.', 'Vui lòng chờ đồng bộ số dư và giao dịch.')}</p><button className="submit-order" onClick={loadWallet}>{L('重新查询', 'Retry', 'Thử lại')}</button></div>}</section>}{tab !== 'wallet' && <aside className="payment-form commercial-checkout"><div className="checkout-step-head"><span>02</span><div><small>{L('账户与结算', 'ACCOUNT & CHECKOUT', 'TÀI KHOẢN & THANH TOÁN')}</small><h2>{L('确认账户与订单', 'Confirm account and order', 'Xác nhận tài khoản và đơn hàng')}</h2></div></div>{selectedPlan && <div className="checkout-order-summary"><div><small>{L('当前套餐', 'Selected plan', 'Gói đã chọn')}</small><b>{selectedPlanName}</b></div><div><small>{L('价格', 'Price', 'Giá')}</small><b>{selectedAmount || L('定制报价', 'Custom quote', 'Báo giá tùy chỉnh')}{selectedCycle && <em>{selectedCycle}</em>}</b></div><div><small>{L('付款方式', 'Payment method', 'Phương thức')}</small><b>{config.provider_label || 'PayPal'}</b></div></div>}<div className="checkout-account-readonly"><div><small>{L('付款账户', 'Billing account', 'Tài khoản thanh toán')}</small><b>{currentUser?.name || L('未填写姓名', 'Name not set', 'Chưa có tên')}</b><span>{currentUser?.email || L('未填写邮箱', 'Email not set', 'Chưa có email')}</span></div><button type="button" onClick={() => setPage('settings')}>{L('前往设置修改', 'Edit in settings', 'Sửa trong cài đặt')}</button></div>{message && <div className="alert">{message}</div>}<button className="submit-order checkout-primary" onClick={() => checkout()} disabled={busy || !selectedPlan}><ShieldCheck />{busy ? '...' : !selectedPlan ? L('请先选择套餐', 'Choose a plan first', 'Vui lòng chọn gói') : form.plan_id === 'free' ? L('开通免费版', 'Activate free', 'Kích hoạt miễn phí') : selectedPlan?.kind === 'contact' ? L('联系企业销售', 'Contact enterprise sales', 'Liên hệ bán hàng') : config.checkout_available ? L(`继续支付 ${selectedAmount}`, `Continue · Pay ${selectedAmount}`, `Tiếp tục thanh toán ${selectedAmount}`) : L('确认所选套餐', 'Confirm selection', 'Xác nhận gói')}</button><small className="secure-note"><ShieldCheck />{config.provider_label || 'Commerce Hub'} Checkout · HTTPS · Verified Webhooks · Idempotent crediting</small></aside>}{creditsHelpOpen && <div className="modal-backdrop" onClick={() => setCreditsHelpOpen(false)}><section className="sales-modal credits-help-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setCreditsHelpOpen(false)}><X /></button><span className="help-kicker">DA CREDITS</span><h2>{L('什么是 DA AI 点数？', 'What are DA Credits?', 'DA Credits là gì?')}</h2><p>{L('DA AI 点数是平台的 AI 处理额度，不是现金，也不是会员等级。', 'DA Credits are the platform’s AI processing units. They are not cash and they are not a membership tier.', 'DA Credits là đơn vị xử lý AI của nền tảng, không phải tiền mặt và không phải cấp thành viên.')}</p><div className="credits-help-grid"><div><b>{L('可以做什么', 'What they are used for', 'Dùng để làm gì')}</b><span>{L('文档翻译、OCR、PDF/Word/Excel/PPT 转换、数据提取和智能整理。', 'Translation, OCR, PDF/Word/Excel/PPT conversion, data extraction and smart organization.', 'Dịch tài liệu, OCR, chuyển đổi PDF/Word/Excel/PPT, trích xuất dữ liệu và xử lý thông minh.')}</span></div><div><b>{L('如何获得', 'How you get them', 'Cách nhận điểm')}</b><span>{L('会员套餐每月自动赠送；余额不足时也可以一次性购买。', 'Monthly credits come with your subscription; extra credits can be purchased once when needed.', 'Gói thành viên tặng điểm hàng tháng; có thể mua thêm một lần khi cần.')}</span></div><div><b>{L('如何消耗', 'How they are used', 'Cách tiêu hao')}</b><span>{L('实际消耗由文件大小、页数、语言、功能和版式复杂度决定。', 'Actual use depends on file size, pages, language, selected feature and layout complexity.', 'Mức tiêu hao phụ thuộc vào kích thước, số trang, ngôn ngữ, tính năng và độ phức tạp bố cục.')}</span></div><div><b>{L('是否自动续费', 'Auto-renewal', 'Tự động gia hạn')}</b><span>{L('单独购买的点数包不会自动续费；会员套餐是否续费以结算页面说明为准。', 'Credit packs do not auto-renew. Subscription renewal is shown clearly during checkout.', 'Gói điểm mua riêng không tự động gia hạn; việc gia hạn gói thành viên được hiển thị rõ khi thanh toán.')}</span></div></div><p className="estimate-note">{L('系统会在正式计费前显示预计消耗；处理完成后可在钱包中查看实际扣除记录。', 'The system will show an estimated cost before billing and the actual deduction in your wallet after processing.', 'Hệ thống sẽ hiển thị mức tiêu hao dự kiến trước khi tính phí và khoản trừ thực tế trong ví sau khi xử lý.')}</p></section></div>}{salesOpen && <div className="modal-backdrop" onClick={() => setSalesOpen(false)}><section className="sales-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setSalesOpen(false)}><X /></button><h2>{L('联系企业销售', 'Contact Enterprise Sales', 'Liên hệ bán hàng doanh nghiệp')}</h2><p>{L('提交后我们会通过邮箱与你联系并提供定制报价。', 'We will contact you by email with a custom quote.', 'Chúng tôi sẽ liên hệ qua email và gửi báo giá tùy chỉnh.')}</p><label>{L('姓名', 'Name', 'Họ tên')}<input value={form.name} onChange={e => setForm({
            ...form,
            name: e.target.value
          })} /></label><label>{L('邮箱', 'Email', 'Email')}<input type="email" value={form.email} onChange={e => setForm({
            ...form,
            email: e.target.value
          })} /></label><label>{L('公司', 'Company', 'Công ty')}<input value={form.company} onChange={e => setForm({
            ...form,
            company: e.target.value
          })} /></label><label>{L('电话 / WhatsApp', 'Phone / WhatsApp', 'Điện thoại / WhatsApp')}<input value={form.phone} onChange={e => setForm({
            ...form,
            phone: e.target.value
          })} /></label><label>{L('需求说明', 'Requirements', 'Yêu cầu')}<textarea rows="4" value={form.requirements} onChange={e => setForm({
            ...form,
            requirements: e.target.value
          })} /></label><button className="submit-order" onClick={submitSales} disabled={busy}>{busy ? '...' : L('提交咨询', 'Submit request', 'Gửi yêu cầu')}</button></section></div>}</main>;
}
async function deviceFingerprint() {
  const raw = [navigator.userAgent, navigator.language, screen.width, screen.height, screen.colorDepth, Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.hardwareConcurrency || 0].join('|');
  try {
    const data = new TextEncoder().encode(raw);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return btoa(unescape(encodeURIComponent(raw))).slice(0, 180);
  }
}
function AuthPage({
  mode,
  locale,
  setPage,
  setAuthToken,
  setCurrentUser
}) {
  const zh = (locale || '').startsWith('zh');
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [flow, setFlow] = useState(mode);
  const [reset, setReset] = useState({
    email: '',
    code: '',
    password: '',
    confirm: ''
  });
  const [verify, setVerify] = useState({
    email: '',
    code: ''
  });
  const [notice, setNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [resetDone, setResetDone] = useState(false);
  const [authConfig, setAuthConfig] = useState({
    google_enabled: false,
    google_client_id: '',
    google_configuration: 'loading'
  });
  const [googleStatus, setGoogleStatus] = useState('');
  const googleButtonRef = useRef(null);
  const isLocalDev = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  useEffect(() => {
    setFlow(mode);
    setError('');
    setNotice('');
    setResetDone(false);
  }, [mode]);
  useEffect(() => {
    fetch(`${API_BASE}/api/auth/config`, {
      cache: 'no-store'
    }).then(async r => {
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || 'Configuration request failed');
      setAuthConfig({
        google_enabled: Boolean(j.google_enabled ?? j.googleEnabled),
        google_client_id: String(j.google_client_id ?? j.googleClientId ?? '').trim(),
        google_configuration: String(j.google_configuration ?? j.googleConfiguration ?? 'unknown')
      });
    }).catch(error => {
      console.error('Unable to load auth configuration', { API_BASE, error });
      setAuthConfig({
        google_enabled: false,
        google_client_id: '',
        google_configuration: 'unavailable'
      });
    });
  }, []);
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(() => setCountdown(v => v > 1 ? v - 1 : 0), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);
  useEffect(() => {
    if (!resetDone) return;
    const timer = window.setTimeout(() => {
      setFlow('login');
      setResetDone(false);
      setNotice('');
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [resetDone]);
  const submit = async e => {
    e.preventDefault();
    if (busy) return;
    const registering = flow === 'register';
    if (registering && form.password !== form.confirmPassword) {
      setError(zh ? '两次输入的密码不一致。' : 'Passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const email = form.email.trim().toLowerCase();
      const payload = {
        email,
        password: form.password,
        device_fingerprint: await deviceFingerprint()
      };
      if (registering) payload.name = email.split('@')[0] || 'User';
      const r = await fetch(`${API_BASE}/api/auth/${registering ? 'register' : 'login'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const j = await readJson(r);
      if (!r.ok) {
        const err = new Error(j.detail || 'Authentication failed');
        err.status = r.status;
        throw err;
      }
      if (registering && j.verification_required) {
        setVerify({
          email: j.email || email,
          code: j.delivery === 'local' && j.development_code ? j.development_code : ''
        });
        setCountdown(Number(j.cooldown_seconds || 60));
        setFlow('verify');
        setNotice(j.delivery === 'local' && j.development_code
          ? zh ? '当前启用了仅限本机开发的一次性验证码，已自动填入；生产环境必须关闭此模式。' : 'A local-development one-time code was filled in automatically. Disable this mode in production.'
          : zh ? '验证码已发送到您的邮箱，请完成验证后激活账户。' : 'A verification code was sent. Verify your email to activate the account.');
        return;
      }
      if (!j.token || !j.user) throw new Error('Authentication failed');
      finishAuth(j);
    } catch (e) {
      setError(authMessage(e.message, zh, e.status));
    } finally {
      setBusy(false);
    }
  };
  const requestReset = async e => {
    e?.preventDefault?.();
    if (countdown > 0 || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const r = await fetch(`${API_BASE}/api/auth/password-reset/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: reset.email.trim().toLowerCase()
        })
      });
      const j = await readJson(r);
      if (!r.ok) {
        const err = new Error(j.detail || 'Request failed');
        err.status = r.status;
        throw err;
      }
      if (j.delivery === 'local' && j.development_code) {
        setReset(v => ({
          ...v,
          code: j.development_code
        }));
        setNotice(zh ? '当前启用了开发调试验证码。正式使用前必须关闭该功能。' : 'A development reset code is enabled. Disable it before production use.');
      } else if (j.delivery === 'email') setNotice(zh ? '验证码已发送到您的邮箱，请检查收件箱和垃圾邮件。' : 'A reset code was sent. Check your inbox and spam folder.');else setNotice(zh ? '如果该账户存在，系统将发送重置验证码。' : 'If the account exists, a reset code will be sent.');
      setCountdown(Number(j.cooldown_seconds || 60));
      setFlow('reset');
    } catch (e) {
      setError(authMessage(e.message, zh, e.status));
    } finally {
      setBusy(false);
    }
  };
  const finishAuth = j => {
    if (!j.token || !j.user) throw new Error('Authentication failed');
    localStorage.setItem('da_auth_token', j.token);
    localStorage.setItem('da_user_profile', JSON.stringify(j.user));
    setAuthToken(j.token);
    setCurrentUser(j.user);
    // Return authenticated users to the public home page first. The workspace
    // remains available from the main navigation instead of becoming a trap.
    setPage('home');
  };
  useEffect(() => {
    if (!authConfig.google_enabled || !authConfig.google_client_id || !googleButtonRef.current || !['login', 'register'].includes(flow)) return;
    let active = true;
    const render = () => {
      if (!active || !window.google?.accounts?.id) return;
      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: authConfig.google_client_id,
        ux_mode: 'popup',
        auto_select: false,
        cancel_on_tap_outside: false,
        itp_support: true,
        callback: async response => {
          if (!active) return;
          setBusy(true);
          setError('');
          setGoogleStatus(zh ? '正在验证 Google 账户并进入工作台…' : 'Verifying your Google account…');
          try {
            if (!response?.credential) throw new Error('Google did not return an identity credential. Please try again.');
            const r = await fetch(`${API_BASE}/api/auth/google`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                credential: response.credential,
                device_fingerprint: await deviceFingerprint()
              })
            });
            const j = await readJson(r);
            if (!r.ok) {
              const err = new Error(j.detail || 'Google sign-in failed');
              err.status = r.status;
              throw err;
            }
            finishAuth(j);
          } catch (e) {
            setGoogleStatus('');
            setError(authMessage(e.message, zh, e.status));
          } finally {
            setBusy(false);
          }
        }
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        width: 360,
        text: 'continue_with',
        logo_alignment: 'left'
      });
    };
    let script = document.querySelector('script[data-da-google]');
    if (window.google?.accounts?.id) {
      render();
      return () => {
        active = false;
      };
    }
    if (!script) {
      script = document.createElement('script');
      script.src = `https://accounts.google.com/gsi/client?hl=${zh ? 'zh-CN' : 'en'}`;
      script.async = true;
      script.defer = true;
      script.dataset.daGoogle = '1';
      document.head.appendChild(script);
    }
    script.addEventListener('load', render);
    return () => {
      active = false;
      script?.removeEventListener('load', render);
    };
  }, [authConfig.google_enabled, authConfig.google_client_id, flow, zh]);
  const confirmRegistration = async e => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const r = await fetch(`${API_BASE}/api/auth/email-verification/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: verify.email,
          code: verify.code,
          device_fingerprint: await deviceFingerprint()
        })
      });
      const j = await readJson(r);
      if (!r.ok) {
        const err = new Error(j.detail || 'Verification failed');
        err.status = r.status;
        throw err;
      }
      finishAuth(j);
    } catch (e) {
      setError(authMessage(e.message, zh, e.status));
    } finally {
      setBusy(false);
    }
  };
  const resendRegistration = async () => {
    if (busy || countdown > 0) return;
    setBusy(true);
    setError('');
    try {
      const r = await fetch(`${API_BASE}/api/auth/email-verification/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: verify.email
        })
      });
      const j = await readJson(r);
      if (!r.ok) {
        const err = new Error(j.detail || 'Resend failed');
        err.status = r.status;
        throw err;
      }
      setCountdown(Number(j.cooldown_seconds || 60));
      if (j.delivery === 'local' && j.development_code) {
        setVerify(v => ({ ...v, code: j.development_code }));
        setNotice(zh ? '新的本机开发验证码已自动填入。生产环境必须关闭此模式。' : 'A new local-development code was filled in automatically. Disable this mode in production.');
      } else {
        setNotice(zh ? '新的验证码已发送，请检查收件箱和垃圾邮件。' : 'A new code was sent. Check your inbox and spam folder.');
      }
    } catch (e) {
      setError(authMessage(e.message, zh, e.status));
    } finally {
      setBusy(false);
    }
  };
  const passwordChecks = {
    length: reset.password.length >= 8,
    number: /\d/.test(reset.password),
    upper: /[A-Z]/.test(reset.password),
    lower: /[a-z]/.test(reset.password),
    special: /[^A-Za-z0-9]/.test(reset.password)
  };
  const passwordScore = Object.values(passwordChecks).filter(Boolean).length;
  const passwordStrong = passwordChecks.length && passwordChecks.number && passwordChecks.upper && passwordChecks.lower && passwordChecks.special;
  const resetValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reset.email) && reset.code.length >= 6 && passwordStrong && reset.password === reset.confirm;
  const passwordSuggestions = [!passwordChecks.length && (zh ? '增加到至少 8 位' : 'Use at least 8 characters'), !(passwordChecks.upper && passwordChecks.lower) && (zh ? '同时加入大写和小写字母' : 'Add both uppercase and lowercase letters'), !passwordChecks.number && (zh ? '加入至少一个数字' : 'Add at least one number'), !passwordChecks.special && (zh ? '加入至少一个特殊字符' : 'Add at least one special character')].filter(Boolean);
  const confirmReset = async e => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (reset.password !== reset.confirm) {
      setError(zh ? '两次输入的密码不一致。' : 'Passwords do not match.');
      return;
    }
    if (!passwordStrong) {
      setError(zh ? '新密码必须至少8位，并包含大小写字母、数字和特殊字符。' : 'Use 8+ characters with uppercase, lowercase, a number and a special character.');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`${API_BASE}/api/auth/password-reset/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: reset.email,
          code: reset.code,
          new_password: reset.password
        })
      });
      const j = await readJson(r);
      if (!r.ok) {
        const err = new Error(j.detail || 'Reset failed');
        err.status = r.status;
        throw err;
      }
      setForm(v => ({
        ...v,
        email: reset.email,
        password: ''
      }));
      setNotice(zh ? '密码修改成功，3 秒后自动返回登录。' : 'Password changed successfully. Returning to sign in in 3 seconds.');
      setResetDone(true);
    } catch (e) {
      setError(authMessage(e.message, zh, e.status));
    } finally {
      setBusy(false);
    }
  };
  const title = flow === 'register' ? zh ? '创建账户' : 'Create your account' : flow === 'verify' ? zh ? '验证邮箱' : 'Verify your email' : flow === 'forgot' ? zh ? '找回密码' : 'Forgot password' : flow === 'reset' ? zh ? '设置新密码' : 'Set a new password' : zh ? '登录账户' : 'Sign in';
  const kicker = zh ? '安全账户' : 'SECURE ACCOUNT';
  return <main className="auth-page"><section className="auth-card"><button className="back-link" onClick={() => setPage('home')}><ArrowLeft />{zh ? '返回工作台' : 'Back to workspace'}</button><span>{kicker}</span><h1>{title}</h1><p>{flow === 'verify' ? zh ? '输入发送到注册邮箱的验证码，验证成功后账户才会激活。' : 'Enter the code sent to your email to activate your account.' : flow === 'forgot' || flow === 'reset' ? zh ? '通过注册邮箱验证身份并重置密码。' : 'Verify your registered email and reset your password.' : zh ? '注册或登录后即可处理文档、购买套餐并管理订单。' : 'Sign in to process documents, purchase plans, and manage orders.'}</p>
 {['login', 'register'].includes(flow) && <><section className="identity-provider-panel"><div className="identity-provider-head"><b>{zh ? '使用第三方账户继续' : 'Continue with an account'}</b><small>{zh ? '安全、快速，并为后续登录方式预留扩展空间' : 'Secure sign-in with room for more providers'}</small></div><div className="google-auth-wrap">{authConfig.google_enabled ? <div ref={googleButtonRef} /> : <button type="button" className="google-auth-placeholder" onClick={() => setError(zh ? 'Google 登录当前不可用。请检查本地身份认证配置并重新启动服务。' : 'Google sign-in is currently unavailable. Check the local identity configuration and restart the service.')}><span className="google-g-mark">G</span><b>{flow === 'register' ? zh ? '使用 Google 注册' : 'Continue with Google' : zh ? '使用 Google 登录' : 'Sign in with Google'}</b><small>{isLocalDev ? zh ? '本地配置待检查' : 'Check local configuration' : ''}</small></button>}</div>{googleStatus && <p className="google-auth-status">{googleStatus}</p>}<div className="future-provider-grid"><button type="button" disabled><span>M</span><b>Microsoft</b><small>{zh ? '即将支持' : 'Coming soon'}</small></button><button type="button" disabled><span>●</span><b>Apple</b><small>{zh ? '即将支持' : 'Coming soon'}</small></button><button type="button" disabled><span>GH</span><b>GitHub</b><small>{zh ? '即将支持' : 'Coming soon'}</small></button></div></section><div className="auth-divider"><span>{zh ? '或使用邮箱' : 'or continue with email'}</span></div></>}
 {['login', 'register'].includes(flow) && !authConfig.google_enabled && <div className="alert"><AlertTriangle /><div><b>{zh ? 'Google 登录未配置' : 'Google sign-in is not configured'}</b><span>{zh ? '填写 GOOGLE_CLIENT_ID 并重启后端后才会启用。' : 'Set GOOGLE_CLIENT_ID and restart the backend to enable it.'}</span></div></div>}
 {notice && <div className="alert success"><CircleCheck /><div><b>{resetDone ? zh ? '密码修改成功' : 'Password updated' : zh ? '验证码状态' : 'Verification code'}</b><span>{notice}</span></div></div>}
 {(flow === 'login' || flow === 'register') && <form className="email-auth-form" onSubmit={submit}><label>{zh ? '邮箱地址' : 'Email address'}<input type="email" placeholder="you@example.com" autoComplete="email" required value={form.email} onChange={e => setForm({
            ...form,
            email: e.target.value
          })} /><small className="email-support-note">{zh ? '支持所有有效邮箱：Gmail、Outlook、Hotmail、Yahoo、iCloud、QQ、163、126、Foxmail、企业邮箱及自定义域名邮箱。' : 'All valid email addresses are supported, including Gmail, Outlook, Hotmail, Yahoo, iCloud, QQ, 163, 126, business and custom-domain email.'}</small></label><label>{zh ? '密码（至少8位）' : 'Password (8+ characters)'}<span className="auth-password-field"><input type={showPassword ? 'text' : 'password'} placeholder={flow === 'register' ? zh ? '请输入至少 8 位密码' : 'Enter at least 8 characters' : zh ? '请输入密码' : 'Enter your password'} autoComplete={flow === 'register' ? 'new-password' : 'current-password'} minLength={8} required value={form.password} onChange={e => setForm({
              ...form,
              password: e.target.value
            })} /><button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? zh ? '隐藏密码' : 'Hide password' : zh ? '显示密码' : 'Show password'}>{showPassword ? <EyeOff /> : <Eye />}</button></span>{flow === 'register' && <small className="password-support-note">{zh ? '至少 8 位；建议同时包含大小写字母、数字和特殊字符。' : 'Use 8+ characters; uppercase, lowercase, numbers and symbols are recommended.'}</small>}</label>{flow === 'register' && <label>{zh ? '确认密码' : 'Confirm password'}<span className="auth-password-field"><input type={showConfirmPassword ? 'text' : 'password'} placeholder={zh ? '再次输入密码' : 'Enter the password again'} autoComplete="new-password" minLength={8} required value={form.confirmPassword} onChange={e => setForm({
              ...form,
              confirmPassword: e.target.value
            })} /><button type="button" onClick={() => setShowConfirmPassword(v => !v)} aria-label={showConfirmPassword ? zh ? '隐藏密码' : 'Hide password' : zh ? '显示密码' : 'Show password'}>{showConfirmPassword ? <EyeOff /> : <Eye />}</button></span>{form.confirmPassword && form.password !== form.confirmPassword && <small className="field-error">{zh ? '两次密码不一致' : 'Passwords do not match'}</small>}</label>}{error && <div className="alert error">{error}</div>}<button className="submit-order" disabled={busy || flow === 'register' && form.password !== form.confirmPassword}>{busy ? zh ? '处理中…' : 'Working…' : flow === 'register' ? zh ? '注册并继续' : 'Register and continue' : zh ? '登录' : 'Sign in'}</button>{flow === 'register' && <p className="auth-legal-note">{zh ? '注册即表示您同意' : 'By registering, you agree to our'} <a href="#terms">{zh ? '《服务条款》' : 'Terms of Service'}</a> {zh ? '和' : 'and'} <a href="#privacy">{zh ? '《隐私政策》' : 'Privacy Policy'}</a>。</p>}</form>}
 {flow === 'verify' && <form onSubmit={confirmRegistration}><label>{zh ? '注册邮箱' : 'Registration email'}<input className="auth-readonly-input" type="email" readOnly value={verify.email} /></label><label>{zh ? '邮箱验证码' : 'Email verification code'}<div className="auth-code-row"><input inputMode="numeric" minLength="6" maxLength="12" required value={verify.code} onChange={e => setVerify({
              ...verify,
              code: e.target.value.replace(/\D/g, '')
            })} /><button type="button" onClick={resendRegistration} disabled={busy || countdown > 0}>{countdown > 0 ? zh ? `${countdown} 秒后重发` : `Resend in ${countdown}s` : zh ? '重新发送' : 'Resend'}</button></div></label>{error && <div className="alert error">{error}</div>}<button className="submit-order" disabled={busy || verify.code.length < 6}>{busy ? zh ? '正在验证…' : 'Verifying…' : zh ? '验证并进入平台' : 'Verify and continue'}</button></form>}
 {flow === 'forgot' && <form onSubmit={requestReset}><label>{zh ? '注册邮箱' : 'Registered email'}<input type="email" required value={reset.email} onChange={e => setReset({
            ...reset,
            email: e.target.value
          })} /></label>{error && <div className="alert error">{error}</div>}<button className="submit-order" disabled={busy || countdown > 0}>{busy ? zh ? '正在发送…' : 'Sending…' : zh ? '发送重置验证码' : 'Send reset code'}</button></form>}
 {flow === 'reset' && (resetDone ? <section className="reset-success-panel" role="status"><span className="reset-success-icon"><CircleCheck /></span><h2>{zh ? '密码修改成功' : 'Password updated'}</h2><p>{zh ? '所有已登录设备均已退出，3 秒后自动返回登录页面。' : 'All signed-in devices have been signed out. Returning to sign in in 3 seconds.'}</p><div className="reset-success-progress"><i /></div><button type="button" className="auth-switch" onClick={() => {
          setFlow('login');
          setResetDone(false);
          setNotice('');
        }}>{zh ? '立即返回登录' : 'Return to sign in now'}</button></section> : <form onSubmit={confirmReset}><label>{zh ? '邮箱' : 'Email'}<input className="auth-readonly-input" type="email" required readOnly aria-readonly="true" value={reset.email} /><small className="field-hint">{zh ? '验证码已发送至此注册邮箱，当前步骤不可修改。' : 'The code was sent to this registered email and cannot be changed here.'}</small></label><label>{zh ? '验证码' : 'Reset code'}<div className="auth-code-row"><input inputMode="numeric" minLength="6" maxLength="12" required value={reset.code} onChange={e => setReset({
              ...reset,
              code: e.target.value.replace(/\D/g, '')
            })} /><button type="button" onClick={requestReset} disabled={busy || countdown > 0}>{countdown > 0 ? zh ? `${countdown} 秒后重发` : `Resend in ${countdown}s` : zh ? '重新发送' : 'Resend'}</button></div></label><label>{zh ? '新密码' : 'New password'}<span className="auth-password-field"><input type={showResetPassword ? 'text' : 'password'} minLength="8" required value={reset.password} onChange={e => setReset({
              ...reset,
              password: e.target.value
            })} /><button type="button" onClick={() => setShowResetPassword(v => !v)} aria-label={showResetPassword ? zh ? '隐藏密码' : 'Hide password' : zh ? '显示密码' : 'Show password'}>{showResetPassword ? <EyeOff /> : <Eye />}</button></span></label><div className="password-strength"><div className={`strength-bars score-${passwordScore}`}>{[1, 2, 3, 4, 5].map(i => <i key={i} />)}</div><b>{passwordScore <= 2 ? zh ? '密码强度：弱' : 'Strength: weak' : passwordScore <= 4 ? zh ? '密码强度：中' : 'Strength: medium' : zh ? '密码强度：强' : 'Strength: strong'}</b><ul><li className={passwordChecks.length ? 'ok' : ''}><Check />{zh ? '至少 8 位' : 'At least 8 characters'}</li><li className={passwordChecks.upper && passwordChecks.lower ? 'ok' : ''}><Check />{zh ? '包含大小写字母' : 'Uppercase and lowercase'}</li><li className={passwordChecks.number ? 'ok' : ''}><Check />{zh ? '包含数字' : 'Contains a number'}</li><li className={passwordChecks.special ? 'ok' : ''}><Check />{zh ? '包含特殊字符' : 'Contains a special character'}</li></ul>{passwordSuggestions.length > 0 && <div className="password-suggestions"><b>{zh ? '建议改进：' : 'Suggestions:'}</b>{passwordSuggestions.map(item => <span key={item}>• {item}</span>)}</div>}</div><label>{zh ? '再次输入新密码' : 'Confirm new password'}<span className="auth-password-field"><input type={showResetConfirm ? 'text' : 'password'} minLength="8" required value={reset.confirm} onChange={e => setReset({
              ...reset,
              confirm: e.target.value
            })} /><button type="button" onClick={() => setShowResetConfirm(v => !v)} aria-label={showResetConfirm ? zh ? '隐藏密码' : 'Hide password' : zh ? '显示密码' : 'Show password'}>{showResetConfirm ? <EyeOff /> : <Eye />}</button></span>{reset.confirm && reset.password !== reset.confirm && <small className="field-error">{zh ? '两次密码不一致' : 'Passwords do not match'}</small>}</label><div className="security-session-notice">{zh ? '安全提示：修改密码后，所有已登录设备将自动退出。' : 'Security notice: Changing your password will sign out all currently logged-in devices.'}</div>{error && <div className="alert error">{error}</div>}<button className="submit-order reset-submit" disabled={busy || !resetValid}>{busy ? zh ? '正在重置…' : 'Resetting…' : zh ? '确认重置密码' : 'Reset password'}</button></form>)}
 {flow === 'login' && <button className="auth-forgot" onClick={() => {
        setReset(v => ({
          ...v,
          email: form.email
        }));
        setFlow('forgot');
        setError('');
        setNotice('');
      }}>{zh ? '忘记密码？' : 'Forgot password?'}</button>}
 <button className="auth-switch" onClick={() => {
        if (flow === 'register') {
          setPage('login');
          setFlow('login');
        } else if (flow === 'login') {
          setPage('register');
          setFlow('register');
        } else {
          setFlow('login');
        }
        setError('');
        setNotice('');
        setResetDone(false);
      }}>{flow === 'register' ? zh ? '已有账户？登录' : 'Already have an account? Sign in' : flow === 'login' ? zh ? '没有账户？注册' : 'New here? Register' : flow === 'verify' ? zh ? '返回登录' : 'Back to sign in' : zh ? '返回登录' : 'Back to sign in'}</button></section></main>;
}
function AccountPage({
  locale,
  user,
  authToken,
  setPage
}) {
  const zh = (locale || '').startsWith('zh'),
    [wallet, setWallet] = useState(null),
    [licenses, setLicenses] = useState([]);
  useEffect(() => {
    if (!authToken) return;
    const h = {
      Authorization: `Bearer ${authToken}`
    };
    fetch(`${API_BASE}/api/wallet`, {
      headers: h
    }).then(r => r.json()).then(setWallet);
    fetch(`${API_BASE}/api/licenses`, {
      headers: h
    }).then(r => r.json()).then(j => setLicenses(j.licenses || []));
  }, [authToken]);
  if (!user) return <main className="auth-page"><section className="auth-card"><h1>{zh ? '请先登录' : 'Please sign in'}</h1><button className="submit-order" onClick={() => setPage('login')}>{zh ? '登录' : 'Sign in'}</button></section></main>;
  return <main className="account-page"><button className="back-link" onClick={() => setPage('home')}><ArrowLeft />{zh ? '返回工作台' : 'Back to workspace'}</button><section className="account-hero"><div><span>{zh ? '我的账户' : 'MY ACCOUNT'}</span><h1>{user.name}</h1><p>{user.email}</p></div><button onClick={() => setPage('billing')}>{zh ? '管理套餐与付款' : 'Manage billing'}</button></section><section className="account-grid"><article><small>{zh ? '当前套餐' : 'Current plan'}</small><b>{wallet?.plan_id || 'free'}</b></article><article><small>{zh ? '可用点数' : 'Available credits'}</small><b>{wallet?.total_credits?.toLocaleString() || 0}</b></article><article><small>License</small><b>{licenses.length}</b></article></section></main>;
}
function AcceptanceCenter({
  setPage
}) {
  const [report, setReport] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await fetch(`${API_BASE}/api/acceptance/run`, {
        method: 'POST'
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || 'Acceptance test failed');
      setReport(j);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    run();
  }, []);
  return <main className="page-wrap acceptance-page"><button className="back-link" onClick={() => setPage('home')}><ArrowLeft />返回首页</button><div className="page-title"><span>V28 ENTERPRISE ACCEPTANCE</span><h1>企业验收中心</h1><p>自动检查版本、数据库、支付订单、钱包、Webhook 幂等、License 和关键接口。</p></div><section className="acceptance-summary"><div><b>{report?.passed || 0}</b><small>PASS</small></div><div><b>{report?.failed || 0}</b><small>FAILED</small></div><div><b>{report?.total || 0}</b><small>TOTAL</small></div><button onClick={run} disabled={busy}>{busy ? '正在检测…' : '重新运行验收'}</button></section>{error && <div className="alert">{error}</div>}<section className="acceptance-grid">{report?.checks?.map(x => <article className={x.status === 'PASS' ? 'pass' : 'fail'} key={x.id}><span>{x.id}</span><div><b>{x.name}</b><small>{x.detail}</small></div><strong>{x.status}</strong></article>)}</section>{report && <div className="acceptance-footer"><ShieldCheck />Document Automation AI Enterprise V{report.version} · {report.result}</div>}</main>;
}
function EnterpriseSidebar({
  setPage,
  active
}) {
  const locale = (localStorage.getItem('da_locale') || 'zh').toLowerCase();
  const isVi = locale.startsWith('vi'),
    isZh = locale.startsWith('zh');
  const L = (zh, en, vi) => isVi ? vi : isZh ? zh : en;
  const [sidebarUser, setSidebarUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('da_current_user') || 'null');
    } catch {
      return null;
    }
  });
  useEffect(() => {
    const sync = e => setSidebarUser(e?.detail || (() => {
      try {
        return JSON.parse(localStorage.getItem('da_current_user') || 'null');
      } catch {
        return null;
      }
    })());
    window.addEventListener('da-current-user', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('da-current-user', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const groups = [{
    label: L('工作区', 'WORKSPACE', 'KHÔNG GIAN'),
    items: [['dashboard', L('工作台', 'Workspace', 'Không gian làm việc'), LayoutDashboard], ['projects', L('项目', 'Projects', 'Dự án'), FolderOpen], ['processing', L('任务队列', 'Task queue', 'Hàng đợi tác vụ'), Clock3]]
  }, {
    label: L('智能资源', 'INTELLIGENCE', 'TÀI NGUYÊN AI'),
    items: [['knowledge', L('知识库', 'Knowledge', 'Tri thức'), BookOpen], ['templates', L('模板', 'Templates', 'Mẫu'), Grid3X3]]
  }, {
    label: L('管理', 'MANAGE', 'QUẢN LÝ'),
    items: [['team', L('团队', 'Team', 'Nhóm'), ShieldCheck], ['settings', L('设置', 'Settings', 'Cài đặt'), Workflow], ['billing', L('套餐与用量', 'Plans & usage', 'Gói & mức sử dụng'), Sparkles]]
  }];
  const name = sidebarUser?.name || sidebarUser?.email?.split('@')[0] || L('当前用户', 'Current user', 'Người dùng');
  const email = sidebarUser?.email || '';
  const logout = () => {
    const token = localStorage.getItem('da_auth_token') || '';
    if (token) fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).catch(() => {});
    localStorage.removeItem('da_auth_token');
    localStorage.removeItem('da_current_user');
    window.dispatchEvent(new CustomEvent('da-current-user', {
      detail: null
    }));
    setPage('login');
  };
  return <aside className="ew-sidebar unified-enterprise-sidebar v44-sidebar"><button className="ew-brand ew-brand-button" onClick={() => setPage('home')}><span>DA</span><div><b>Document Automation AI</b><small>{L('AI 文档工作空间', 'AI Document Workspace', 'Không gian tài liệu AI')}</small></div></button><nav>{groups.map(group => <section key={group.label}><small>{group.label}</small>{group.items.map(([id, label, Icon]) => <button key={id} className={id === active ? 'active' : ''} onClick={() => setPage(id)}><Icon /><span>{label}</span></button>)}</section>)}</nav><section className="unified-sidebar-account"><div><span>{name.slice(0, 1).toUpperCase()}</span><p><b>{name}</b>{email && <small>{email}</small>}</p></div><footer><button type="button" className="sidebar-signout-only" onClick={logout}><ArrowLeft />{L('退出登录', 'Sign out', 'Đăng xuất')}</button></footer></section></aside>;
}
function TemplateCenter({
  setPage
}) {
  const isZh = document.documentElement.lang.startsWith('zh');
  const [query, setQuery] = useState(''),
    [category, setCategory] = useState('all'),
    [selected, setSelected] = useState(null);
  const templates = [{
    name: isZh ? '双语翻译交付' : 'Bilingual delivery',
    desc: isZh ? '原文与译文清晰对应，适合正式交付。' : 'Aligned source and translation for client-ready delivery.',
    type: 'translation',
    format: 'DOCX · PDF',
    sample: 'bilingual'
  }, {
    name: 'PLC / HMI',
    desc: isZh ? '保护变量、地址、报警代码与表格结构。' : 'Protect variables, addresses, alarm codes and table structure.',
    type: 'automation',
    format: 'XLSX · DOCX',
    sample: 'spreadsheet'
  }, {
    name: isZh ? '企业合同审阅' : 'Contract review',
    desc: isZh ? '条款提取、双语翻译和重点标记。' : 'Clause extraction, translation and review highlights.',
    type: 'legal',
    format: 'DOCX · PDF',
    sample: 'contract'
  }, {
    name: isZh ? '财务报表整理' : 'Financial report',
    desc: isZh ? '保留公式，清理数据并生成摘要。' : 'Preserve formulas, clean data and create a summary.',
    type: 'data',
    format: 'XLSX',
    sample: 'spreadsheet'
  }, {
    name: isZh ? '扫描件重建' : 'Scanned document rebuild',
    desc: isZh ? '识别扫描件并恢复段落、表格和图片。' : 'Recognize scans and rebuild paragraphs, tables and images.',
    type: 'ocr',
    format: 'PDF · DOCX',
    sample: 'document'
  }, {
    name: isZh ? '标准交付包' : 'Standard delivery package',
    desc: isZh ? '统一文件名、质量报告和 ZIP 结构。' : 'Standardized names, quality report and ZIP structure.',
    type: 'delivery',
    format: 'ZIP',
    sample: 'delivery'
  }];
  const visible = templates.filter(item => {
    const matchesCategory = category === 'all' || item.type === category || category === 'data' && item.type === 'automation';
    const haystack = `${item.name} ${item.desc} ${item.format}`.toLowerCase();
    return matchesCategory && haystack.includes(query.trim().toLowerCase());
  });
  return <main className="template-center-v3349 template-center-v44">
    <EnterpriseSidebar setPage={setPage} active="templates" />
    <section className="template-content">
      <header><div><span>{isZh ? '官方工作流模板' : 'OFFICIAL WORKFLOW TEMPLATES'}</span><h1>{isZh ? '从结果开始，而不是从设置开始' : 'Start from an outcome, not a settings form'}</h1><p>{isZh ? '每个模板都包含官方示例输出。预览结果后，一键进入处理中心。' : 'Every template includes an official sample output. Preview it, then start in one click.'}</p></div><button onClick={() => setPage('order')}><Sparkles />{isZh ? '创建空白任务' : 'Create blank task'}</button></header>
      <div className="template-toolbar"><label><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={isZh ? '搜索模板或输出格式…' : 'Search templates or formats…'} /></label>{[['all', isZh ? '全部' : 'All'], ['translation', isZh ? '翻译' : 'Translation'], ['ocr', 'OCR'], ['data', isZh ? '数据' : 'Data'], ['delivery', isZh ? '交付' : 'Delivery']].map(([id, label]) => <button key={id} className={category === id ? 'active' : ''} onClick={() => setCategory(id)}>{label}</button>)}</div>
      <section className="template-grid">{visible.map((item, index) => <article key={item.name}>
        <button className={`template-official-preview-v44 ${item.sample}`} onClick={() => setSelected(item)} aria-label={`${isZh ? '预览' : 'Preview'} ${item.name}`}><span>{isZh ? '官方示例' : 'OFFICIAL SAMPLE'}</span><i /><i /><i /><em>{isZh ? '查看最终输出' : 'Preview output'}<Eye /></em></button>
        <div className="template-tags"><span>{item.format}</span>{index < 3 && <em>{isZh ? '推荐' : 'Recommended'}</em>}</div>
        <h2>{item.name}</h2><p>{item.desc}</p>
        <footer><button onClick={() => setPage('order')}>{isZh ? '使用模板' : 'Use template'}<ArrowRight /></button><button onClick={() => setSelected(item)} title={isZh ? '预览' : 'Preview'}><Eye /></button></footer>
      </article>)}</section>
      {!visible.length && <div className="processing-empty"><Search /><h2>{isZh ? '没有匹配的模板' : 'No matching templates'}</h2></div>}
    </section>
    {selected && <div className="template-preview-modal-v44" onClick={() => setSelected(null)}><section onClick={event => event.stopPropagation()}><header><div><span>{isZh ? '官方示例输出' : 'OFFICIAL SAMPLE OUTPUT'}</span><h2>{selected.name}</h2><p>{selected.desc}</p></div><button onClick={() => setSelected(null)}><X /></button></header><div className={`template-large-sample-v44 ${selected.sample}`}><i /><i /><i /><i /><div><b>Document Automation AI</b><span>{selected.format}</span></div></div><footer><small>{isZh ? '第一版采用官方示例，不代表用户文件的真实处理结果。' : 'This first release uses an official sample, not a generated result from your file.'}</small><button onClick={() => setPage('order')}>{isZh ? '使用此模板' : 'Use this template'}<ArrowRight /></button></footer></section></div>}
  </main>;
}
function KnowledgeCenter({
  setPage
}) {
  const isZh = document.documentElement.lang.startsWith('zh');
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(''),
    [lastSync, setLastSync] = useState(null),
    [syncToast, setSyncToast] = useState(false);
  const syncToastTimer = useRef(null);
  const load = () => {
    setLoading(true);
    setError('');
    fetch(`${API_BASE}/api/knowledge-center/overview`).then(async r => {
      const j = await readJson(r);
      if (!r.ok) throw new Error(j.detail || 'Load failed');
      return j;
    }).then(j => {
      setData(j);
      setLastSync(new Date());
      setSyncToast(true);
      window.clearTimeout(syncToastTimer.current);
      syncToastTimer.current = window.setTimeout(() => setSyncToast(false), 3000);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    return () => window.clearTimeout(syncToastTimer.current);
  }, []);
  const summary = data?.summary || {},
    modules = data?.modules || {};
  const safeRows = key => (Array.isArray(modules[key]) ? modules[key] : []).filter(x => x && typeof x === 'object');
  const displayName = item => {
    const zh = item?.name_zh || item?.label_zh || '';
    const en = item?.name || item?.label || item?.id || '';
    return {
      primary: isZh ? zh || en : en || zh,
      secondary: isZh ? en && en !== zh ? en : '' : zh && zh !== en ? zh : ''
    };
  };
  const countryFlag = id => ({
    china: '🇨🇳',
    vietnam: '🇻🇳',
    france: '🇫🇷',
    germany: '🇩🇪',
    indonesia: '🇮🇩',
    japan: '🇯🇵',
    korea: '🇰🇷',
    usa: '🇺🇸',
    uk: '🇬🇧',
    singapore: '🇸🇬'
  })[String(id || '').toLowerCase()] || '🌐';
  const moduleDefs = [['industry', isZh ? '行业知识' : 'Industry knowledge', isZh ? '行业标准、技术知识与最佳实践' : 'Standards, technical knowledge and best practices', BrainCircuit, summary.industries], ['country', isZh ? '国家与语言' : 'Countries & languages', isZh ? '国家、地区、语言和本地表达资源' : 'Country, region, language and local expression resources', Languages, summary.countries], ['enterprise', isZh ? '企业术语' : 'Enterprise terminology', isZh ? '企业专属术语、品牌和表达管理' : 'Company terminology, brands and preferred expressions', Tag, summary.enterprise_profiles]];
  const allItems = moduleDefs.flatMap(([key, title]) => safeRows(key).map(item => ({
    ...item,
    _key: key,
    _title: title
  })));
  const q = query.trim().toLowerCase();
  const results = q ? allItems.filter(item => JSON.stringify(item).toLowerCase().includes(q)).slice(0, 12) : [];
  const activeModules = moduleDefs.filter(([,,,, count]) => Number(count || 0) > 0).length;
  const copy = isZh ? {
    title: '企业知识中心',
      sub: '只保留完成文档工作所需的行业、国家与企业术语上下文。',
    search: '搜索知识、术语或短语…',
    back: '返回企业工作台',
    refresh: '刷新',
    categories: '知识分类',
    coverage: '知识覆盖概览',
    industry: '行业知识',
    country: '国家与地区',
    terms: '术语条目',
    phrases: '专业表达',
    modules: '已启用模块',
    assets: '知识配置',
    active: '已启用',
    view: '查看内容',
    no: '暂无可用知识配置',
    recent: '知识内容预览',
    results: '搜索结果',
    engine: 'Knowledge Engine 2.0',
    healthy: '运行正常',
    score: '模块覆盖率',
    loaded: '已加载',
    error: '知识中心暂时无法加载',
    retry: '重试',
    updated: '最近更新',
    today: '今天',
    sync: '知识已同步',
    syncSub: '当前页面已加载最新的真实知识配置。'
  } : {
    title: 'Enterprise Knowledge Center',
      sub: 'The industry, country and enterprise context needed to complete document work.',
    search: 'Search knowledge, terms or phrases…',
    back: 'Back to workspace',
    refresh: 'Refresh',
    categories: 'Knowledge categories',
    coverage: 'Knowledge coverage overview',
    industry: 'Industry knowledge',
    country: 'Countries & regions',
    terms: 'Terminology terms',
    phrases: 'Professional phrases',
    modules: 'Active modules',
    assets: 'Knowledge configurations',
    active: 'Active',
    view: 'View content',
    no: 'No knowledge configurations available',
    recent: 'Knowledge content preview',
    results: 'Search results',
    engine: 'Knowledge Engine 2.0',
    healthy: 'Operational',
    score: 'Module coverage',
    loaded: 'loaded',
    error: 'Knowledge Center is temporarily unavailable',
    retry: 'Retry',
    updated: 'Last updated',
    today: 'Today',
    sync: 'Knowledge synchronized successfully',
    syncSub: 'The latest real knowledge configurations are loaded.'
  };
  return <main className="knowledge-hub-v331"><EnterpriseSidebar setPage={setPage} active="knowledge" />
  <section className="kh-content">
   <header className="kh-top"><div><h1>{copy.title}</h1><p>{copy.sub}</p></div><div className="kh-search"><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={copy.search} />{query && <button onClick={() => setQuery('')}><X /></button>}</div><button className="kh-refresh" onClick={load} disabled={loading}><RefreshCw />{copy.refresh}</button></header>
   {error && <div className="kh-error"><AlertTriangle /><div><b>{copy.error}</b><small>{error}</small></div><button onClick={load}>{copy.retry}</button></div>}
   {loading ? <section className="kh-loading">{Array.from({
          length: 8
        }).map((_, i) => <i key={i} />)}</section> : <>
    <section className="kh-metrics kh-metrics-v44">{[[copy.industry, summary.industries || 0, BookOpen, 'blue'], [copy.country, summary.countries || 0, Languages, 'green'], [copy.terms, summary.term_count || 0, Tag, 'purple']].map(([label, value, Icon, color]) => <article key={label}><span className={color}><Icon /></span><div><small>{label}</small><b>{Number(value).toLocaleString()}</b><em>{copy.loaded}</em></div></article>)}</section>
    {q && <section className="kh-search-results"><header><h2>{copy.results}</h2><span>{results.length}</span></header>{results.length ? <div>{results.map((item, i) => <article key={`${item._key}-${item.id || i}`}><span><BookOpen /></span><div><b>{item.name_zh || item.name || item.id || item._title}</b><small>{item._title}</small></div><ChevronDown /></article>)}</div> : <p>{copy.no}</p>}</section>}
    <section className="kh-main-grid">
     <article className="kh-card kh-categories"><header><h2>{copy.categories}</h2><span>{activeModules}/{moduleDefs.length} {copy.active}</span></header><div>{moduleDefs.map(([key, title, desc, Icon, count]) => <button key={key}><span className={`kh-cat-icon ${key}`}><Icon /></span><div><b>{title}</b><small>{desc}</small><em>{Number(count || 0).toLocaleString()} {copy.assets}</em><u>{copy.updated}: {copy.today}</u></div><ArrowRight /></button>)}</div></article>
     <article className="kh-card kh-coverage"><header><h2>{copy.coverage}</h2><span>{copy.healthy}</span></header><div className="kh-ring" style={{
              '--coverage': `${activeModules / moduleDefs.length * 360}deg`
            }}><span><b>{Math.round(activeModules / moduleDefs.length * 100)}%</b><small>{copy.score}</small></span></div><ul>{moduleDefs.map(([key, title,,, count]) => <li key={key}><i className={key} /><span>{title}</span><b>{Number(count || 0).toLocaleString()}</b></li>)}</ul><p><ShieldCheck /><span><b>{summary.standard || 'Enterprise Delivery Standard'}</b><small>{isZh ? '知识会在任务分析时自动参与推荐。' : 'Knowledge is applied automatically during task analysis.'}</small></span></p></article>
    </section>
    <section className="kh-preview-grid">
     {moduleDefs.slice(0, 3).map(([key, title,,, count]) => {
            const rows = safeRows(key).slice(0, 6);
            return <article className="kh-card" key={key}><header><h2>{title}</h2><span>{Number(count || 0).toLocaleString()}</span></header><div className="kh-preview-list">{rows.length ? rows.map((item, i) => {
                  const name = displayName(item);
                  return <div key={item.id || i}><span className={key === 'country' ? 'kh-country-flag' : ''}>{key === 'country' ? countryFlag(item.id || item.name) : <BookOpen />}</span><p><b>{name.primary || `${title} ${i + 1}`}</b><small>{name.secondary || item.description_zh || item.description || item.category || item.id || copy.active}</small></p><i>{copy.active}</i></div>;
                }) : <p className="kh-no-data">{copy.no}</p>}</div></article>;
          })}
    </section>
    {syncToast && <aside className="knowledge-sync-toast-v44"><CircleCheck /><div><b>{copy.sync}</b><small>{copy.syncSub}{lastSync ? ` ${lastSync.toLocaleTimeString(isZh ? 'zh-CN' : 'en-US')}` : ''}</small></div></aside>}
   </>}
  </section>
 </main>;
}
function TeamPermissionsCenter({
  setPage,
  currentUser
}) {
  const isZh = document.documentElement.lang.startsWith('zh');
  const [members, setMembers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('da_team_members') || '[]');
    } catch {
      return [];
    }
  });
  const [email, setEmail] = useState(''),
    [message, setMessage] = useState('');
  const owner = {
    name: currentUser?.name || currentUser?.email || 'Owner',
    email: currentUser?.email || '',
    role: isZh ? '管理员' : 'Administrator',
    status: isZh ? '已启用' : 'Active'
  };
  const invite = () => {
    const v = email.trim();
    if (!v) return;
    const next = [...members, {
      id: Date.now(),
      name: v.split('@')[0],
      email: v,
      role: isZh ? '成员' : 'Member',
      status: isZh ? '待接受' : 'Pending'
    }];
    setMembers(next);
    localStorage.setItem('da_team_members', JSON.stringify(next));
    setEmail('');
    setMessage(isZh ? '邀请已保存。' : 'Invitation saved.');
  };
  const remove = id => {
    const next = members.filter(x => x.id !== id);
    setMembers(next);
    localStorage.setItem('da_team_members', JSON.stringify(next));
  };
  return <main className="team-center-v335"><EnterpriseSidebar setPage={setPage} active="team" /><section className="team-center-content"><header><div><span>{isZh ? '企业协作中心' : 'ENTERPRISE COLLABORATION'}</span><h1>{isZh ? '团队与权限' : 'Team & Permissions'}</h1><p>{isZh ? '管理成员、角色和工作区访问权限。' : 'Manage members, roles and workspace access.'}</p></div></header><section className="team-metrics"><article><small>{isZh ? '成员总数' : 'Members'}</small><b>{members.length + 1}</b></article><article><small>{isZh ? '管理员' : 'Administrators'}</small><b>1</b></article><article><small>{isZh ? '待接受邀请' : 'Pending invites'}</small><b>{members.filter(x => String(x.status).includes(isZh ? '待' : 'Pending')).length}</b></article></section><section className="team-card"><header><h2>{isZh ? '邀请成员' : 'Invite member'}</h2><div><input value={email} onChange={e => setEmail(e.target.value)} placeholder={isZh ? '输入成员邮箱' : 'Member email'} /><button onClick={invite}>{isZh ? '发送邀请' : 'Send invite'}</button></div></header>{message && <p className="team-message">{message}</p>}<div className="team-table"><div className="team-row team-head"><span>{isZh ? '成员' : 'Member'}</span><span>{isZh ? '角色' : 'Role'}</span><span>{isZh ? '状态' : 'Status'}</span><span>{isZh ? '操作' : 'Action'}</span></div>{[owner, ...members].map((m, i) => <div className="team-row" key={m.id || 'owner'}><span><b>{m.name}</b><small>{m.email}</small></span><span>{m.role}</span><span>{m.status}</span><span>{i === 0 ? '—' : <button onClick={() => remove(m.id)}>{isZh ? '移除' : 'Remove'}</button>}</span></div>)}</div></section></section></main>;
}
function TranslationSettings({
  t,
  authToken
}) {
  const isZh = document.documentElement.lang.startsWith('zh');
  const fallbackProviders = [{
    id: 'deepseek',
    label: 'DeepSeek',
    models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v4-flash', 'deepseek-v4-pro'],
    model: 'deepseek-chat',
    base_url: 'https://api.deepseek.com/v1'
  }, {
    id: 'openai',
    label: 'OpenAI',
    models: ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini'],
    model: 'gpt-4.1-mini',
    base_url: 'https://api.openai.com/v1'
  }, {
    id: 'gemini',
    label: 'Google Gemini',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    model: 'gemini-2.5-flash',
    base_url: 'https://generativelanguage.googleapis.com/v1beta'
  }, {
    id: 'claude',
    label: 'Anthropic Claude',
    models: ['claude-3-5-haiku-latest', 'claude-sonnet-4-20250514'],
    model: 'claude-3-5-haiku-latest',
    base_url: 'https://api.anthropic.com/v1'
  }, {
    id: 'openrouter',
    label: 'OpenRouter',
    models: ['openai/gpt-4.1-mini', 'deepseek/deepseek-chat-v3-0324', 'google/gemini-2.5-flash', 'anthropic/claude-3.5-haiku'],
    model: 'openai/gpt-4.1-mini',
    base_url: 'https://openrouter.ai/api/v1'
  }];
  const [form, setForm] = useState({
      provider: 'deepseek',
      api_key: '',
      model: 'deepseek-chat',
      base_url: 'https://api.deepseek.com/v1'
    }),
    [providers, setProviders] = useState(fallbackProviders),
    [profiles, setProfiles] = useState({}),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [showKey, setShowKey] = useState(false),
    [tests, setTests] = useState({});
  const call = async (path, method = 'GET', body) => {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const r = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    const raw = await r.text();
    let j = {};
    try {
      j = raw ? JSON.parse(raw) : {};
    } catch {
      j = {
        detail: raw
      };
    }
    if (!r.ok) throw new Error(j.detail || t.settingsFailed);
    return j;
  };
  const load = () => call('/api/admin/translation-settings').then(j => {
    const list = Array.isArray(j.providers) && j.providers.length ? j.providers : fallbackProviders;
    const safeProfiles = j.profiles && typeof j.profiles === 'object' && !Array.isArray(j.profiles) ? j.profiles : {};
    setProviders(list);
    setProfiles(safeProfiles);
    const p = j.provider && j.provider !== 'none' ? j.provider : 'deepseek',
      meta = list.find(x => x.id === p) || list[0] || fallbackProviders[0],
      profile = safeProfiles?.[p] || {};
    setForm(v => ({
      ...v,
      provider: p,
      api_key: '',
      model: profile.model || j.model || meta?.model || '',
      base_url: profile.base_url || j.base_url || meta?.base_url || ''
    }));
  }).catch(e => setMessage(e.message));
  useEffect(() => {
    load();
  }, [authToken]);
  const chooseProvider = p => {
    const meta = providers.find(x => x.id === p) || fallbackProviders.find(x => x.id === p),
      profile = profiles[p] || {};
    setMessage('');
    setShowKey(false);
    setForm(v => ({
      ...v,
      provider: p,
      api_key: '',
      model: profile.model || meta?.model || '',
      base_url: profile.base_url || meta?.base_url || ''
    }));
  };
  const save = async () => {
    setBusy(true);
    setMessage('');
    try {
      const j = await call('/api/admin/translation-settings', 'PUT', {
        provider: form.provider,
        api_key: form.api_key,
        model: form.model,
        base_url: form.base_url
      });
      setProfiles(j.settings?.profiles || profiles);
      setForm(v => ({
        ...v,
        api_key: ''
      }));
      setMessage(isZh ? '已保存，并设为默认 Provider。' : 'Saved and set as default provider.');
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };
  const test = async () => {
    setBusy(true);
    setMessage('');
    const testedAt = new Date();
    try {
      const saved = await call('/api/admin/translation-settings', 'PUT', {
        provider: form.provider,
        api_key: form.api_key,
        model: form.model,
        base_url: form.base_url
      });
      setProfiles(saved.settings?.profiles || profiles);
      const j = await call('/api/admin/translation-settings/test', 'POST');
      setTests(v => ({
        ...v,
        [form.provider]: {
          ok: true,
          elapsed_ms: j.elapsed_ms,
          model: j.model,
          tested_at: testedAt.toISOString(),
          detail: j.translated_text || ''
        }
      }));
      setForm(v => ({
        ...v,
        api_key: ''
      }));
      setMessage(isZh ? `连接成功：${j.provider} / ${j.model}，延迟 ${j.elapsed_ms} ms，测试译文：${j.translated_text}` : `Connected: ${j.provider} / ${j.model}, ${j.elapsed_ms} ms. Result: ${j.translated_text}`);
    } catch (e) {
      setTests(v => ({
        ...v,
        [form.provider]: {
          ok: false,
          tested_at: testedAt.toISOString(),
          detail: e.message
        }
      }));
      setMessage(isZh ? `连接失败：${e.message}` : `Connection failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };
  const current = providers.find(x => x.id === form.provider) || fallbackProviders[0],
    configured = Boolean(profiles?.[form.provider]?.configured),
    testInfo = tests[form.provider];
  return <article className="translation-settings provider-center"><div className="provider-center-head"><div><span>AI PROVIDER CENTER</span><h2>{isZh ? 'AI 服务商中心' : 'AI Provider Center'}</h2><p>{isZh ? '统一管理 AI 服务商、模型、连接状态和默认调用配置。' : 'Manage providers, models, connection status and the default AI service.'}</p></div><div className={`provider-overall ${configured ? 'connected' : 'disconnected'}`}><i />{configured ? isZh ? '已配置' : 'Configured' : isZh ? '未配置' : 'Not configured'}</div></div><div className="provider-tabs">{providers.map(p => {
        const selected = form.provider === p.id,
          ready = Boolean(profiles?.[p.id]?.configured);
        return <button type="button" key={p.id} className={selected ? 'active' : ''} onClick={() => chooseProvider(p.id)}><span>{p.label}{selected && <em>{isZh ? '默认' : 'Default'}</em>}</span><small className={ready ? 'connected' : 'disconnected'}>{ready ? isZh ? '已连接' : 'Connected' : isZh ? '未连接' : 'Not connected'}</small></button>;
      })}</div><section className="provider-status-grid"><article><span>{isZh ? '当前 Provider' : 'Current provider'}</span><b>{current?.label}</b></article><article><span>{isZh ? '当前模型' : 'Current model'}</span><b>{form.model || '—'}</b></article><article><span>{isZh ? '连接状态' : 'Connection'}</span><b>{configured ? isZh ? '已连接' : 'Connected' : isZh ? '未连接' : 'Not connected'}</b></article><article><span>{isZh ? '最近延迟' : 'Latency'}</span><b>{testInfo?.elapsed_ms != null ? `${testInfo.elapsed_ms} ms` : '—'}</b></article><article><span>{isZh ? '最后测试时间' : 'Last tested'}</span><b>{testInfo?.tested_at ? new Date(testInfo.tested_at).toLocaleString() : isZh ? '尚未测试' : 'Not tested'}</b></article></section><div className="settings-grid provider-settings-grid"><label>{t.apiKey}<span className="secret-input"><input type={showKey ? 'text' : 'password'} value={form.api_key} onChange={e => setForm({
            ...form,
            api_key: e.target.value
          })} placeholder={configured ? isZh ? '已保存；留空保持不变' : 'Saved; leave blank to keep' : ''} /><button type="button" onClick={() => setShowKey(v => !v)} title={showKey ? isZh ? '隐藏' : 'Hide' : isZh ? '显示' : 'Show'}>{showKey ? <EyeOff /> : <Eye />}</button></span></label><label>{t.model}<HoverSelect value={form.model} onChange={e => setForm({
          ...form,
          model: e.target.value
        })}>{(current?.models || [current?.model]).filter(Boolean).map(m => <option value={m} key={m}>{m}</option>)}</HoverSelect></label></div><div className="settings-actions"><button onClick={save} disabled={busy}>{isZh ? '保存并设为默认' : 'Save as default'}</button><button className="secondary-provider-action" onClick={test} disabled={busy}>{busy ? isZh ? '测试中…' : 'Testing…' : t.testConnection}</button></div>{message && <p className={`settings-message ${testInfo && !testInfo.ok ? 'error' : ''}`}>{message}</p>}<div className="v302-provider-roadmap"><b>{isZh ? 'V30.2 企业路由已启用' : 'V30.2 enterprise routing enabled'}</b><span>{isZh ? '支持主/备用 Provider、自动故障切换、按处理阶段分配 Provider、调用统计与团队权限接口。' : 'Primary/backup providers, automatic failover, stage routing, usage statistics and team permission APIs are available.'}</span></div></article>;
}
function ProjectCenter({
  locale,
  setPage,
  authToken
}) {
  const isZh = locale === 'zh',
    headers = {
      Authorization: `Bearer ${authToken}`
    };
  const [data, setData] = useState({
      summary: {},
      projects: []
    }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const [query, setQuery] = useState(''),
    [status, setStatus] = useState('all'),
    [priority, setPriority] = useState('all'),
    [sort, setSort] = useState('updated_desc'),
    [selected, setSelected] = useState(null),
    [activity, setActivity] = useState([]),
    [edit, setEdit] = useState(null);
  const [archived, setArchived] = useState(false),
    [view, setView] = useState('grid'),
    [density, setDensity] = useState('comfortable'),
    [checked, setChecked] = useState([]),
    [menu, setMenu] = useState(null),
    [confirm, setConfirm] = useState(null);
  const load = async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const p = new URLSearchParams({
        q: query,
        status,
        archived: String(archived)
      });
      const r = await fetch(`${API_BASE}/api/projects?${p}`, {
        headers
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || 'Failed');
      setData(j);
      setChecked(v => v.filter(id => j.projects.some(p => p.id === id)));
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const id = setTimeout(load, 180);
    return () => clearTimeout(id);
  }, [query, status, archived, authToken]);
  const openProject = async p => {
    try {
      const r = await fetch(`${API_BASE}/api/projects/${p.id}`, {
        headers
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || 'Failed');
      setSelected(j.project);
      setActivity(j.activity || []);
    } catch (e) {
      setError(e.message);
    }
  };
  const save = async (patch, target = selected || edit) => {
    if (!target) return;
    const r = await fetch(`${API_BASE}/api/projects/${target.id}`, {
      method: 'PATCH',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(patch)
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.detail || 'Save failed');
    if (selected?.id === target.id) setSelected(j.project);
    setEdit(null);
    await load();
  };
  const action = async (ids, operation) => {
    const r = await fetch(`${API_BASE}/api/projects/batch-action`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ids,
        operation
      })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.detail || 'Action failed');
    setChecked([]);
    setMenu(null);
    setConfirm(null);
    if (selected && ids.includes(selected.id)) setSelected(null);
    await load();
  };
  const statusLabel = p => ({
    processing: isZh ? '处理中' : 'Processing',
    completed: isZh ? '已完成' : 'Completed',
    failed: isZh ? '失败' : 'Failed',
    pending: isZh ? '等待中' : 'Pending'
  })[p.status_kind] || p.status;
  const priorityLabel = p => ({
    normal: isZh ? '普通' : 'Normal',
    high: isZh ? '高' : 'High',
    urgent: isZh ? '紧急' : 'Urgent'
  })[p] || p;
  const visible = useMemo(() => data.projects.filter(p => priority === 'all' || p.priority === priority).sort((a, b) => {
    if (sort === 'created_desc') return new Date(b.created_at) - new Date(a.created_at);
    if (sort === 'name') return a.title.localeCompare(b.title);
    if (sort === 'priority') return ({
      urgent: 0,
      high: 1,
      normal: 2
    }[a.priority] ?? 3) - ({
      urgent: 0,
      high: 1,
      normal: 2
    }[b.priority] ?? 3);
    return new Date(b.updated_at) - new Date(a.updated_at);
  }), [data.projects, priority, sort]);
  const stepLabel = key => ({
    validate: isZh ? '源文件校验' : 'Validation',
    analyze: isZh ? '结构分析' : 'Analysis',
    ocr: 'OCR',
    translation: isZh ? 'AI 翻译' : 'AI translation',
    conversion: isZh ? '格式转换' : 'Conversion',
    layout: isZh ? '版式重建' : 'Layout',
    quality: isZh ? '质量检查' : 'Quality check',
    export: isZh ? '生成交付文件' : 'Delivery',
    completed: isZh ? '已完成' : 'Completed'
  })[key] || key || '-';
  const toggle = id => setChecked(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id]);
  const sortedJobs = [...(data.jobs || [])].filter(x => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [x.order_number, x.files?.[0]?.original_name, x.id, x.processor_name].filter(Boolean).some(v => String(v).toLowerCase().includes(q));
  }).sort((a, b) => {
    const av = new Date(a.updated_at || a.created_at || 0).getTime(),
      bv = new Date(b.updated_at || b.created_at || 0).getTime();
    if (sort === 'oldest') return av - bv;
    if (sort === 'status') return String(a.status || '').localeCompare(String(b.status || ''));
    return bv - av;
  });
  const completedIds = (data.jobs || []).filter(x => ['completed', 'partial_completed'].includes(x.status) || ['completed', 'partial_completed'].includes(x.job?.state)).map(x => x.id);
  if (!authToken) return <main className="project-page"><section className="processing-auth"><FolderOpen /><h1>{isZh ? '请先登录' : 'Sign in required'}</h1><button onClick={() => setPage('login')}>{isZh ? '前往登录' : 'Sign in'}</button></section></main>;
  if (selected) return <div className="enterprise-page-layout document-center-layout"><EnterpriseSidebar setPage={setPage} active="projects" /><main className="project-page enterprise-page-content"><section className="project-shell"><button className="back-link" onClick={() => setSelected(null)}><ArrowLeft />{isZh ? '返回项目列表' : 'Back to projects'}</button><div className="project-detail-head"><div><span>{selected.project_number}</span><h1>{selected.title}</h1><p>{selected.order_number} · {selected.owner}</p></div><div className="project-head-actions"><button onClick={() => setEdit(selected)}><Edit3 />{isZh ? '编辑' : 'Edit'}</button><button onClick={() => save({
              favorite: !selected.favorite
            })}><Star />{selected.favorite ? isZh ? '取消收藏' : 'Unfavorite' : isZh ? '收藏' : 'Favorite'}</button><button onClick={() => action([selected.id], selected.archived ? 'restore' : 'archive')}>{selected.archived ? <ArchiveRestore /> : <Archive />}{selected.archived ? isZh ? '恢复' : 'Restore' : isZh ? '归档' : 'Archive'}</button><button className="danger-outline" onClick={() => setConfirm({
              ids: [selected.id],
              operation: 'delete',
              title: selected.title
            })}><Trash2 />{isZh ? '删除' : 'Delete'}</button></div></div><section className="project-detail-grid"><div className="project-primary"><div className={`project-progress-card ${selected.status_kind}`}><div><b>{statusLabel(selected)}</b><strong>{selected.status_kind === 'completed' ? '✓' : `${selected.progress}%`}</strong></div>{selected.status_kind === 'completed' ? <div className="project-complete-note"><CircleCheck />{isZh ? '项目已完成，可下载交付文件。' : 'Project completed. Deliverables are ready.'}</div> : <><i><em style={{
                    width: `${selected.progress}%`
                  }} /></i><small>{isZh ? '当前阶段：' : 'Current stage: '}{stepLabel(selected.current_step)}</small></>}</div><article className="project-files"><h2>{isZh ? '项目文件' : 'Project files'} <small>({selected.files.length})</small></h2>{selected.files.map((f, i) => <div className="project-file-row" key={f.id || i}><FileText /><div><b>{f.original_name}</b><small>{Math.max(1, Math.round((f.size_bytes || 0) / 1024))} KB · {stepLabel(selected.current_step)}</small></div><span className={`project-status ${selected.status_kind}`}>{statusLabel(selected)}</span></div>)}</article><article className="project-timeline"><h2>{isZh ? '处理时间轴与活动日志' : 'Timeline & activity log'}</h2>{[...(selected.events || []), ...activity].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 30).map((e, i) => <div key={i}><Clock3 /><span>{new Date(e.created_at).toLocaleString()}</span><b>{stepLabel(e.step || e.action)}</b><p>{e.message}</p></div>)}</article></div><aside className="project-sidebar"><article><h3>{isZh ? '项目统计' : 'Project statistics'}</h3><p><span>{isZh ? '文件' : 'Files'}</span><b>{selected.file_count}</b></p><p><span>{isZh ? 'AI 点数' : 'AI credits'}</span><b>{selected.credits_used}</b></p><p><span>{isZh ? '优先级' : 'Priority'}</span><b>{priorityLabel(selected.priority)}</b></p><p><span>{isZh ? '负责人' : 'Owner'}</span><b>{selected.owner}</b></p></article><article><h3>{isZh ? '交付文件' : 'Delivery files'}</h3>{selected.outputs?.length ? selected.outputs.map(f => <button type="button" key={f.id} onClick={() => downloadAuthenticatedFile(`${API_BASE}${f.download_url}`, authToken, f.original_name).catch(error => setError(error.message))}><Download />{f.original_name}</button>) : <small>{isZh ? '尚未生成交付文件' : 'No delivery files yet'}</small>}</article></aside></section>{edit && <div className="project-modal"><form onSubmit={e => {
            e.preventDefault();
            save({
              title: edit.title,
              owner: edit.owner,
              priority: edit.priority,
              notes: edit.notes
            }, edit);
          }}><h2>{isZh ? '编辑项目' : 'Edit project'}</h2><label>{isZh ? '项目名称' : 'Project name'}<input value={edit.title} onChange={e => setEdit({
                ...edit,
                title: e.target.value
              })} /></label><label>{isZh ? '负责人' : 'Owner'}<input value={edit.owner} onChange={e => setEdit({
                ...edit,
                owner: e.target.value
              })} /></label><label>{isZh ? '优先级' : 'Priority'}<HoverSelect value={edit.priority} onChange={e => setEdit({
                ...edit,
                priority: e.target.value
              })}><option value="normal">{isZh ? '普通' : 'Normal'}</option><option value="high">{isZh ? '高' : 'High'}</option><option value="urgent">{isZh ? '紧急' : 'Urgent'}</option></HoverSelect></label><label>{isZh ? '备注' : 'Notes'}<textarea value={edit.notes} onChange={e => setEdit({
                ...edit,
                notes: e.target.value
              })} /></label><div><button type="button" onClick={() => setEdit(null)}>{isZh ? '取消' : 'Cancel'}</button><button>{isZh ? '保存' : 'Save'}</button></div></form></div>}{confirm && <ConfirmDialog {...{
          confirm,
          setConfirm,
          action,
          isZh
        }} />}</section></main></div>;
  return <div className="enterprise-page-layout document-center-layout"><EnterpriseSidebar setPage={setPage} active="projects" /><main className="project-page enterprise-page-content"><section className="project-shell"><div className="project-title"><div><span>V{VERSION} · ENTERPRISE PROJECT CENTER</span><h1>{isZh ? '企业项目中心' : 'Enterprise Project Center'}</h1><p>{isZh ? '搜索、筛选、归档和批量管理所有企业项目。' : 'Search, filter, archive and manage enterprise projects in bulk.'}</p></div><button className="new-project-btn" onClick={() => setPage('order')}><Sparkles />{isZh ? '新建项目' : 'New project'}</button></div><section className="project-metrics"><article><span>{isZh ? '项目总数' : 'Projects'}</span><b>{data.summary.total || 0}</b></article><article><span>{isZh ? '处理中' : 'Processing'}</span><b>{data.summary.processing || 0}</b></article><article><span>{isZh ? '已完成' : 'Completed'}</span><b>{data.summary.completed || 0}</b></article><article><span>{isZh ? '失败' : 'Failed'}</span><b>{data.summary.failed || 0}</b></article><article><span>{isZh ? '文件总数' : 'Files'}</span><b>{data.summary.files || 0}</b></article></section><div className="project-search-row"><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={isZh ? '搜索项目名称、编号、订单号或标签' : 'Search name, project ID, order or tag'} /><span>{visible.length} {isZh ? '个项目' : 'projects'}</span></div><div className="project-filter-row"><div className="status-tabs">{[['all', isZh ? '全部' : 'All'], ['processing', isZh ? '处理中' : 'Processing'], ['completed', isZh ? '已完成' : 'Completed'], ['failed', isZh ? '失败' : 'Failed']].map(([v, l]) => <button className={!archived && status === v ? 'active' : ''} onClick={() => {
              setArchived(false);
              setStatus(v);
            }} key={v}>{l}</button>)}<button className={archived ? 'active' : ''} onClick={() => setArchived(true)}>{isZh ? '归档' : 'Archived'}</button></div><HoverSelect value={priority} onChange={e => setPriority(e.target.value)}><option value="all">{isZh ? '全部优先级' : 'All priorities'}</option><option value="urgent">{isZh ? '紧急' : 'Urgent'}</option><option value="high">{isZh ? '高' : 'High'}</option><option value="normal">{isZh ? '普通' : 'Normal'}</option></HoverSelect><HoverSelect value={sort} onChange={e => setSort(e.target.value)}><option value="updated_desc">{isZh ? '最近更新' : 'Recently updated'}</option><option value="created_desc">{isZh ? '最近创建' : 'Recently created'}</option><option value="priority">{isZh ? '按优先级' : 'Priority'}</option><option value="name">{isZh ? '按名称' : 'Name'}</option></HoverSelect><button className="icon-text-btn" onClick={load}><RefreshCw />{isZh ? '刷新' : 'Refresh'}</button></div>{checked.length > 0 && <div className="bulk-bar"><b>{isZh ? `已选择 ${checked.length} 项` : `${checked.length} selected`}</b><button onClick={() => action(checked, archived ? 'restore' : 'archive')}>{archived ? <ArchiveRestore /> : <Archive />}{archived ? isZh ? '恢复' : 'Restore' : isZh ? '归档' : 'Archive'}</button><button className="danger-outline" onClick={() => setConfirm({
            ids: checked,
            operation: 'delete',
            title: isZh ? `${checked.length} 个项目` : `${checked.length} projects`
          })}><Trash2 />{isZh ? '删除' : 'Delete'}</button><button onClick={() => setChecked([])}>{isZh ? '取消选择' : 'Clear'}</button></div>}{error && <div className="processing-error">{error}</div>}{loading ? <div className="processing-empty">{isZh ? '正在加载项目…' : 'Loading projects…'}</div> : <section className="project-list grid comfortable">{visible.map(p => <article className={`project-card ${p.status_kind}`} key={p.id}><button className="select-project" onClick={e => {
              e.stopPropagation();
              toggle(p.id);
            }}>{checked.includes(p.id) ? <CheckSquare /> : <Square />}</button><button className="project-card-main" onClick={() => openProject(p)}><div className="project-card-head"><div><small>{p.project_number}</small><h3>{p.title}</h3><p>{p.order_number} · {p.owner}</p></div><span className={`project-status ${p.status_kind}`}>{statusLabel(p)}</span></div><div className="project-card-meta"><span>{p.file_count} {isZh ? '个文件' : 'files'}</span><span>{priorityLabel(p.priority)}</span><span>{stepLabel(p.current_step)}</span><span>{p.credits_used} {isZh ? '点' : 'credits'}</span></div>{p.status_kind === 'completed' ? <div className="project-delivered"><CircleCheck />{isZh ? '交付已就绪' : 'Delivery ready'}</div> : <div className="project-card-progress"><i><em style={{
                    width: `${p.progress}%`
                  }} /></i><b>{p.progress}%</b></div>}</button><div className="project-menu-wrap"><button onClick={() => setMenu(menu === p.id ? null : p.id)}><MoreHorizontal /></button>{menu === p.id && <div className="project-action-menu"><button onClick={() => openProject(p)}>{isZh ? '查看详情' : 'View details'}</button><button onClick={() => save({
                  favorite: !p.favorite
                }, p)}><Star />{p.favorite ? isZh ? '取消收藏' : 'Unfavorite' : isZh ? '收藏' : 'Favorite'}</button><button onClick={() => action([p.id], p.archived ? 'restore' : 'archive')}>{p.archived ? <ArchiveRestore /> : <Archive />}{p.archived ? isZh ? '恢复' : 'Restore' : isZh ? '归档' : 'Archive'}</button>{p.status_kind === 'failed' && <button onClick={() => action([p.id], 'retry')}><RotateCcw />{isZh ? '重新处理' : 'Retry'}</button>}<button className="danger" onClick={() => setConfirm({
                  ids: [p.id],
                  operation: 'delete',
                  title: p.title
                })}><Trash2 />{isZh ? '删除' : 'Delete'}</button></div>}</div></article>)}</section>}{!loading && !visible.length && <div className="processing-empty"><FolderOpen /><h2>{archived ? isZh ? '暂无归档项目' : 'No archived projects' : isZh ? '没有匹配的项目' : 'No matching projects'}</h2></div>}{confirm && <ConfirmDialog {...{
          confirm,
          setConfirm,
          action,
          isZh
        }} />}</section></main></div>;
}
function ConfirmDialog({
  confirm,
  setConfirm,
  action,
  isZh
}) {
  const retry = confirm.operation === 'retry';
  return <div className="project-modal confirm-modal"><div className="confirm-card"><AlertTriangle /><h2>{retry ? isZh ? '确认重新处理？' : 'Confirm reprocessing?' : isZh ? '确认删除？' : 'Confirm deletion?'}</h2><p>{confirm.title}</p><small>{retry ? isZh ? '确认后将创建一个新的处理任务并进入队列；原处理记录、日志和交付文件全部保留。' : 'A new processing job will be queued. The original processing record, logs and delivery files will be retained.' : confirm.permanent ? isZh ? '将永久删除处理记录、日志和交付文件，此操作不可恢复。' : 'Processing records, logs and delivery files will be permanently deleted. This cannot be undone.' : isZh ? '项目将进入回收站，处理记录、交付文件和日志不会立即永久删除。' : 'The project will move to the recycle bin. Records and files are not permanently removed immediately.'}</small><div><button onClick={() => setConfirm(null)}>{isZh ? '取消' : 'Cancel'}</button><button className={retry ? 'confirm-retry-button' : 'danger-button'} onClick={() => action(confirm.ids, confirm.operation)}>{retry ? isZh ? '确认重新处理' : 'Confirm reprocessing' : confirm.permanent ? isZh ? '永久删除' : 'Delete permanently' : isZh ? '移到回收站' : 'Move to recycle bin'}</button></div></div></div>;
}
function ProcessingCenter({
  t,
  setPage,
  authToken
}) {
  const isZh = document.documentElement.lang.startsWith('zh'),
    headers = {
      Authorization: `Bearer ${authToken}`
    };
  const [data, setData] = useState({
      summary: {},
      jobs: []
    }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [expanded, setExpanded] = useState(() => {
      const value = Number(localStorage.getItem('da_open_processing_order') || 0);
      localStorage.removeItem('da_open_processing_order');
      return value || null;
    }),
    [filter, setFilter] = useState('active'),
    [checked, setChecked] = useState([]),
    [confirm, setConfirm] = useState(null),
    [sort, setSort] = useState('newest'),
    [query, setQuery] = useState('');
  const load = async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/processing-center/jobs?view=all`, {
        headers
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || 'Failed');
      setData(j);
      setChecked(v => v.filter(id => j.jobs.some(x => x.id === id)));
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (filter === 'active') load();
    }, 5000);
    return () => clearInterval(timer);
  }, [authToken, filter]);
  const controlJob = async (jobId, operation) => {
    try {
      const r = await fetch(`${API_BASE}/api/processing-center/jobs/${jobId}/${operation}`, {
        method: 'POST',
        headers
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || 'Operation failed');
      await load();
    } catch (e) {
      setError(e.message);
    }
  };
  const taskAction = async (ids, operation) => {
    try {
      if (operation === 'retry') {
        for (const id of ids) {
          const r = await fetch(`${API_BASE}/api/processing-center/orders/${id}/retry`, {
            method: 'POST',
            headers
          });
          const j = await r.json();
          if (!r.ok) throw new Error(j.detail || 'Retry failed');
        }
      } else {
        const apiOperation = operation === 'delete' ? 'purge' : operation;
        const r = await fetch(`${API_BASE}/api/projects/batch-action`, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ids,
            operation: apiOperation
          })
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.detail || 'Action failed');
      }
      setChecked([]);
      setConfirm(null);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };
  const statusText = s => ({
    queued: isZh ? '排队中' : 'Queued',
    waiting_configuration: isZh ? '等待确认方案' : 'Awaiting plan confirmation',
    processing: isZh ? '处理中' : 'Processing',
    paused: isZh ? '已暂停' : 'Paused',
    cancelling: isZh ? '正在停止' : 'Stopping',
    cancelled: isZh ? '已停止' : 'Stopped',
    quality_review: isZh ? '质量复核' : 'Quality review',
    partial_completed: isZh ? '部分完成' : 'Partially completed',
    completed: isZh ? '已完成' : 'Completed',
    failed: isZh ? '失败' : 'Failed'
  })[s] || s || '-';
  const stepText = k => ({
    validate: isZh ? '源文件校验' : 'Validate files',
    analyze: isZh ? '文档结构分析' : 'Analyze structure',
    configuration: isZh ? '确认处理方案' : 'Confirm processing plan',
    ocr: 'OCR',
    translation: isZh ? 'AI 翻译' : 'AI translation',
    conversion: isZh ? '格式转换' : 'Format conversion',
    layout: isZh ? '版式重建' : 'Layout reconstruction',
    quality: isZh ? '质量检查' : 'Quality check',
    export: isZh ? '生成交付文件' : 'Generate delivery',
    completed: isZh ? '已完成' : 'Completed'
  })[k] || k;
  const liveState = x => String(x.job?.state || x.status || '').toLowerCase();
  const stateGroup = x => {
    const state = liveState(x);
    if (['completed', 'partial_completed', 'quality_review'].includes(state)) return 'completed';
    if (['failed', 'cancelled'].includes(state)) return 'failed';
    return 'active';
  };
  const liveSummary = useMemo(() => {
    const jobs = data.jobs || [];
    return {
      total: jobs.length,
      active: jobs.filter(x => stateGroup(x) === 'active').length,
      completed: jobs.filter(x => stateGroup(x) === 'completed').length,
      failed: jobs.filter(x => stateGroup(x) === 'failed').length,
      files: jobs.reduce((sum, x) => sum + (x.files?.length || 0), 0)
    };
  }, [data.jobs]);
  const sortedJobs = [...(data.jobs || [])].filter(x => filter === 'all' || stateGroup(x) === filter).filter(x => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [x.order_number, x.files?.[0]?.original_name, x.id, x.processor_name].filter(Boolean).some(v => String(v).toLowerCase().includes(q));
  }).sort((a, b) => {
    const av = new Date(a.updated_at || a.created_at || 0).getTime(),
      bv = new Date(b.updated_at || b.created_at || 0).getTime();
    if (sort === 'oldest') return av - bv;
    if (sort === 'status') return String(a.status || '').localeCompare(String(b.status || ''));
    return bv - av;
  });
  const completedIds = (data.jobs || []).filter(x => ['completed', 'partial_completed'].includes(x.status) || ['completed', 'partial_completed'].includes(x.job?.state)).map(x => x.id);
  if (!authToken) return <main className="processing-page"><section className="processing-auth"><Workflow /><h1>{isZh ? '请先登录' : 'Sign in required'}</h1><button onClick={() => setPage('login')}>{isZh ? '前往登录' : 'Sign in'}</button></section></main>;
  return <div className="enterprise-page-layout live-tasks-layout"><EnterpriseSidebar setPage={setPage} active="processing" /><main className="processing-page enterprise-page-content"><section className="processing-shell"><div className="processing-title"><div><span>{isZh ? '工作区 / 任务队列' : 'Workspace / Task queue'}</span><h1>{isZh ? '任务队列' : 'Task queue'}</h1><p>{isZh ? '实时查看分析、OCR、翻译、质量检查和导出状态。页面每 5 秒自动更新。' : 'Follow analysis, OCR, translation, quality checks and export in real time. This view refreshes every 5 seconds.'}</p></div><button className="refresh-live" onClick={load}><RefreshCw />{isZh ? '立即刷新' : 'Refresh now'}</button></div>
<section className="processing-metrics processing-metrics-v44"><article><span>{isZh ? '正在处理' : 'Active'}</span><b>{liveSummary.active}</b></article><article><span>{isZh ? '已完成' : 'Completed'}</span><b>{liveSummary.completed}</b></article><article><span>{isZh ? '需要关注' : 'Needs attention'}</span><b>{liveSummary.failed}</b></article></section>
<div className="processing-toolbar"><div className="processing-tabs">{[['active', isZh ? '处理中' : 'Active'], ['completed', isZh ? '已完成' : 'Completed'], ['failed', isZh ? '失败' : 'Failed'], ['all', isZh ? '全部' : 'All']].map(([v, l]) => <button className={filter === v ? 'active' : ''} onClick={() => setFilter(v)} key={v}>{l}</button>)}</div><div className="processing-toolbar-actions"><label className="processing-search-v348"><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={isZh ? '搜索文件名、订单号或任务 ID' : 'Search file, order or task ID'} /></label><HoverSelect value={sort} onChange={e => setSort(e.target.value)}><option value="newest">{isZh ? '最新优先' : 'Newest'}</option><option value="oldest">{isZh ? '最旧优先' : 'Oldest'}</option><option value="status">{isZh ? '按状态' : 'Status'}</option></HoverSelect><button onClick={() => setChecked(checked.length === sortedJobs.length ? [] : sortedJobs.map(x => x.id))}><CheckSquare />{checked.length === sortedJobs.length && sortedJobs.length ? isZh ? '取消全选' : 'Clear' : isZh ? '全选' : 'Select all'}</button>{completedIds.length > 0 && <button className="danger-outline" onClick={() => setConfirm({
              ids: completedIds,
              operation: 'delete',
              permanent: true,
              title: isZh ? `${completedIds.length} 个已完成任务` : `${completedIds.length} completed jobs`
            })}><Trash2 />{isZh ? '清空已完成' : 'Clear completed'}</button>}</div></div>{checked.length > 0 && <div className="bulk-bar"><b>{checked.length} {isZh ? '项已选择' : 'selected'}</b><button className="danger-outline" onClick={() => setConfirm({
            ids: checked,
            operation: 'delete',
            permanent: true,
            title: isZh ? `${checked.length} 个任务` : `${checked.length} jobs`
          })}><Trash2 />{isZh ? '删除' : 'Delete'}</button></div>}{error && <div className="processing-error">{error}</div>}<section className="live-job-list">{sortedJobs.map(item => {
            const job = item.job || {},
              complete = ['completed', 'partial_completed'].includes(item.status) || ['completed', 'partial_completed'].includes(job.state),
              failed = item.status === 'failed' || job.state === 'failed',
              cancelled = item.status === 'cancelled' || job.state === 'cancelled',
              paused = job.state === 'paused',
              open = expanded === item.id;
            return <article className={`live-job-card ${complete ? 'complete' : ''} ${failed ? 'failed' : ''}`} key={item.id}><header><button className="job-check" onClick={() => setChecked(v => v.includes(item.id) ? v.filter(x => x !== item.id) : [...v, item.id])}>{checked.includes(item.id) ? <CheckSquare /> : <Square />}</button><button className="job-main" onClick={() => setExpanded(open ? null : item.id)}><div className="job-file-summary"><FileText /><div><b>{item.files?.[0]?.original_name || item.order_number}</b><small>{item.order_number} · {item.files?.length || 0} {isZh ? '个文件' : 'files'}</small></div></div>{complete ? <div className="completed-summary"><CircleCheck /><div><b>{isZh ? '处理完成' : 'Completed'}</b><small>{item.completed_at ? `${isZh ? '完成于' : 'Completed'} ${new Date(item.completed_at).toLocaleString()}` : isZh ? '交付文件已生成' : 'Delivery is ready'}</small></div></div> : <div className="job-live-progress"><div><i><em style={{
                          width: `${failed ? Math.min(Number(job.progress || 0), 95) : Number(job.progress || 0)}%`
                        }} /></i><b>{failed ? '—' : `${job.progress || 0}%`}</b></div><span className={`live-state ${failed ? 'failed' : 'active'}`}>{statusText(job.state || item.status)}</span></div>}</button><div className="job-actions">{!complete && !failed && !cancelled && job.id && <>{paused ? <button title={isZh ? '继续处理' : 'Resume'} onClick={() => controlJob(job.id, 'resume')}><Play /></button> : <button title={isZh ? '暂停处理' : 'Pause'} onClick={() => controlJob(job.id, 'pause')}><Pause /></button>}<button className="stop-job-button" title={isZh ? '停止处理' : 'Stop'} onClick={() => {
                      if (window.confirm(isZh ? '确定停止当前任务？当前 AI 请求完成后将安全停止。' : 'Stop this job after the current AI request finishes?')) controlJob(job.id, 'stop');
                    }}><Octagon /></button></>}{(complete || failed || cancelled) && <button title={isZh ? '重新处理' : 'Retry'} onClick={() => setConfirm({
                    ids: [item.id],
                    operation: 'retry',
                    title: item.files?.[0]?.original_name || item.order_number
                  })}><RotateCcw /></button>}<button title={isZh ? '永久删除' : 'Delete permanently'} onClick={() => setConfirm({
                    ids: [item.id],
                    operation: 'delete',
                    permanent: true,
                    title: item.files?.[0]?.original_name || item.order_number
                  })}><Trash2 /></button></div></header>{!complete && <div className="current-stage"><span>{cancelled ? isZh ? '停止状态' : 'Stop status' : failed ? isZh ? '失败原因' : 'Failure reason' : isZh ? '当前阶段' : 'Current stage'}</span><b>{cancelled ? isZh ? '任务已安全停止，可重新处理' : 'Job stopped safely; it can be retried' : failed ? job.error_message || item.error_message || job.message || (isZh ? '任务被中断，请展开查看详情或重新处理' : 'The task was interrupted; open details or retry') : stepText(job.current_step)}</b>{job.estimated_remaining_seconds > 0 && <small>{isZh ? `预计剩余 ${job.estimated_remaining_seconds} 秒` : `ETA ${job.estimated_remaining_seconds}s`}</small>}</div>}{open && <div className="job-detail"><div className="job-facts"><span><Clock3 /><b>{isZh ? '开始时间' : 'Started'}</b><small>{item.started_at ? new Date(item.started_at).toLocaleString() : isZh ? '尚未开始' : 'Not started'}</small></span><span><CircleCheck /><b>{isZh ? '完成时间' : 'Completed'}</b><small>{item.completed_at ? new Date(item.completed_at).toLocaleString() : complete ? isZh ? '完成时间未记录' : 'Completion time unavailable' : isZh ? '尚未完成' : 'Not completed'}</small></span><span><Clock3 /><b>{isZh ? '总耗时' : 'Duration'}</b><small>{item.duration_seconds != null ? `${Math.floor(item.duration_seconds / 60)}m ${item.duration_seconds % 60}s` : isZh ? '处理中' : 'In progress'}</small></span><span><Sparkles /><b>{isZh ? 'AI 点数' : 'AI credits'}</b><small>{Number(item.credits_used || 0).toLocaleString()}</small></span><span><ShieldCheck /><b>{isZh ? '处理人' : 'Processor'}</b><small>{item.processor_name || (isZh ? '系统自动处理' : 'System automation')}</small></span><span><Cpu /><b>{isZh ? 'AI 服务' : 'AI provider'}</b><small>{item.ai_provider || (isZh ? '未使用 AI 翻译' : 'No AI translation')}</small></span><span><Bot /><b>{isZh ? '模型' : 'Model'}</b><small>{item.ai_model || (isZh ? '未配置' : 'Not configured')}</small></span></div><div className="pipeline-steps">{(job.steps || []).map(step => <div className={`pipeline-step ${step.status}`} key={step.step_key}><span>{step.status === 'completed' ? <CircleCheck /> : step.status === 'failed' ? <X /> : <i />}</span><div><b>{stepText(step.step_key)}</b><small>{step.message || statusText(step.status)}</small></div><em>{step.status === 'running' ? `${step.progress || 0}%` : step.status === 'completed' ? '✓' : '—'}</em></div>)}</div>{item.output_files?.length > 0 && <div className="delivery-actions">{item.output_files.map(f => {
                    const ext = (f.original_name.split('.').pop() || 'FILE').toUpperCase();
                    return <button type="button" key={f.id} title={f.original_name} onClick={() => downloadAuthenticatedFile(`${API_BASE}${f.download_url}`, authToken, f.original_name).catch(error => setError(error.message))}><Download /><span>{isZh ? '下载' : 'Download'} {ext}</span><small>{f.original_name}</small></button>;
                  })}</div>}{(failed || cancelled) && <button className="retry-job" onClick={() => setConfirm({
                  ids: [item.id],
                  operation: 'retry',
                  title: item.files?.[0]?.original_name || item.order_number
                })}><RotateCcw />{isZh ? '重新处理' : 'Retry'}</button>}</div>}</article>;
          })}</section>{!loading && !sortedJobs.length && <div className="processing-empty"><FileText /><h2>{isZh ? '当前分类暂无任务' : 'No jobs in this view'}</h2></div>}{confirm && <ConfirmDialog {...{
          confirm,
          setConfirm,
          action: taskAction,
          isZh
        }} />}</section></main></div>;
}
function AdminConsole({
  setPage,
  authToken,
  currentUser,
  initialTab = 'overview'
}) {
  const isZh = document.documentElement.lang.startsWith('zh'),
    L = (zh, en) => isZh ? zh : en;
  const [tab, setTab] = useState(initialTab),
    [loading, setLoading] = useState(true),
    [message, setMessage] = useState(''),
    [stats, setStats] = useState({}),
    [users, setUsers] = useState([]),
    [tenants, setTenants] = useState([]),
    [tenantSummary, setTenantSummary] = useState({}),
    [orders, setOrders] = useState([]),
    [payments, setPayments] = useState([]),
    [audit, setAudit] = useState([]),
    [query, setQuery] = useState(''),
    [status, setStatus] = useState('all'),
    [drawer, setDrawer] = useState(null),
    [draft, setDraft] = useState({}),
    [tenantDrawer, setTenantDrawer] = useState(null),
    [tenantDraft, setTenantDraft] = useState({}),
    [tenantTab, setTenantTab] = useState('info'),
    [confirming, setConfirming] = useState(false),
    [accountOpen, setAccountOpen] = useState(false);
  const headers = {
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
  const read = async r => {
    const text = await r.text();
    let body = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = {
        detail: text
      };
    }
    if (!r.ok) throw new Error(body.detail || `${r.status}`);
    return body;
  };
  const fetchAdmin = async (url, options = {}, attempts = 1) => {
    let lastError;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...headers,
            ...(options.headers || {})
          }
        });
        return await read(response);
      } catch (error) {
        lastError = error;
        if (attempt < attempts - 1) await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
    throw lastError;
  };
  const friendlyError = error => {
    const text = String(error?.message || error || '');
    if (/failed to fetch|networkerror|load failed/i.test(text)) return L('无法连接后端服务，请确认后端窗口正在运行，然后点击“刷新数据”。', 'Unable to connect to the backend. Make sure the backend is running, then refresh.');
    if (text === '401' || text === '403') return L('登录状态已失效或当前账号没有管理权限。', 'Your session expired or this account has no admin permission.');
    return text || L('数据加载失败，请稍后重试。', 'Unable to load data. Please try again.');
  };
  const money = cents => new Intl.NumberFormat(isZh ? 'zh-CN' : 'en-US', {
    style: 'currency',
    currency: 'CNY'
  }).format(Number(cents || 0) / 100);
  const load = async () => {
    setLoading(true);
    setMessage('');
    try {
      if (tab === 'overview') {
        const [m, c, p, o] = await Promise.all([fetch(`${API_BASE}/api/admin/monitoring`, {
          headers
        }).then(read), fetch(`${API_BASE}/api/admin/commercial-summary`, {
          headers
        }).then(read), fetch(`${API_BASE}/api/admin/payments?limit=8`, {
          headers
        }).then(read), fetch(`${API_BASE}/api/orders`, {
          headers
        }).then(read)]);
        setStats({
          ...m,
          ...c
        });
        setPayments(p.payments || []);
        setOrders(Array.isArray(o) ? o : o.orders || []);
      } else if (tab === 'users') {
        const j = await fetch(`${API_BASE}/api/admin/users?limit=1000`, {
          headers
        }).then(read);
        setUsers(j.users || []);
      } else if (tab === 'tenants') {
        const j = await fetchAdmin(`${API_BASE}/api/admin/tenants?limit=1000`);
        setTenants(j.tenants || []);
        setTenantSummary(j.summary || {});
      } else if (tab === 'orders' || tab === 'documents') {
        const j = await fetch(`${API_BASE}/api/orders`, {
          headers
        }).then(read);
        setOrders(Array.isArray(j) ? j : j.orders || []);
      } else if (tab === 'payments') {
        const j = await fetch(`${API_BASE}/api/admin/payments?limit=200`, {
          headers
        }).then(read);
        setPayments(j.payments || []);
      } else if (tab === 'audit') {
        const j = await fetch(`${API_BASE}/api/admin/audit-logs?limit=200`, {
          headers
        }).then(read);
        setAudit(j.logs || []);
      }
    } catch (e) {
      setMessage(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (tab !== 'providers') load();else setLoading(false);
  }, [tab, authToken]);
  const openUser = u => {
    setDrawer(u);
    setDraft({
      plan: u.plan || 'free',
      credits: Number(u.credits || 0),
      status: u.status || 'active',
      reason: ''
    });
  };
  const saveUser = async () => {
    if (!drawer || !draft.reason.trim()) {
      setMessage(L('请填写修改原因。', 'Please enter a reason for this change.'));
      return;
    }
    setConfirming(true);
    setMessage('');
    try {
      const j = await fetch(`${API_BASE}/api/admin/users/${drawer.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          plan: draft.plan,
          credits: Number(draft.credits),
          status: draft.status,
          reason: draft.reason
        })
      }).then(read);
      setUsers(v => v.map(u => String(u.id) === String(drawer.id) ? j.user : u));
      setDrawer(null);
      setMessage(L('用户资料已更新并记录审计日志。', 'User updated and audit logged.'));
    } catch (e) {
      setMessage(e.message);
    } finally {
      setConfirming(false);
    }
  };
  const filtered = users.filter(u => {
    const text = `${u.name || ''} ${u.email || ''} ${u.id || ''}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (status === 'all' || String(u.status || 'active') === status);
  });
  const filteredTenants = tenants.filter(t => {
    const text = `${t.company_name || ''} ${t.tenant_key || ''} ${t.owner_email || ''}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (status === 'all' || String(t.status || 'active') === status);
  });
  const openTenant = t => {
    setTenantDrawer(t);
    setTenantTab('info');
    setTenantDraft({
      company_name: t.company_name || '',
      industry: t.industry || '',
      country: t.country || '',
      contact_name: t.contact_name || '',
      contact_phone: t.contact_phone || '',
      plan: t.plan || 'free',
      credits: Number(t.credits || 0),
      status: t.status || 'active',
      reason: ''
    });
  };
  const saveTenant = async () => {
    if (!tenantDrawer || !tenantDraft.reason.trim()) {
      setMessage(L('请填写修改原因。', 'Please enter a reason for this change.'));
      return;
    }
    setConfirming(true);
    setMessage('');
    try {
      const j = await fetch(`${API_BASE}/api/admin/tenants/${tenantDrawer.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          ...tenantDraft,
          credits: Number(tenantDraft.credits)
        })
      }).then(read);
      setTenants(v => v.map(t => String(t.id) === String(tenantDrawer.id) ? j.tenant : t));
      setTenantDrawer(j.tenant);
      setTenantDraft(v => ({
        ...v,
        reason: ''
      }));
      setMessage(L('租户资料已更新并记录审计日志。', 'Tenant updated and audit logged.'));
    } catch (e) {
      setMessage(e.message);
    } finally {
      setConfirming(false);
    }
  };
  const nav = [{
    group: L('运营中心', 'OPERATIONS'),
    items: [['overview', LayoutDashboard, L('运营总览', 'Dashboard')], ['users', UserRound, L('用户管理', 'Users')], ['tenants', Building2, L('租户管理', 'Tenants')]]
  }, {
    group: L('交易中心', 'COMMERCE'),
    items: [['orders', FileText, L('订单管理', 'Orders')], ['payments', CreditCard, L('支付管理', 'Payments')], ['plans', Sparkles, L('套餐管理', 'Plans')], ['credits', Coins, L('Credits 流水', 'Credits ledger')]]
  }, {
    group: L('文档运营', 'DOCUMENTS'),
    items: [['documents', Workflow, L('文档任务', 'Document jobs')], ['failed', AlertTriangle, L('失败任务', 'Failed jobs')], ['files', FolderOpen, L('文件记录', 'Files')]]
  }, {
    group: L('系统管理', 'SYSTEM'),
    items: [['providers', Cpu, L('AI 服务商', 'AI Providers')], ['settings', Settings2, L('系统设置', 'System settings')], ['audit', ShieldCheck, L('审计日志', 'Audit logs')]]
  }];
  const titleMap = {
    overview: L('运营总览', 'Dashboard'),
    users: L('用户管理', 'User management'),
    tenants: L('租户管理', 'Tenant management'),
    orders: L('订单管理', 'Order management'),
    payments: L('支付管理', 'Payment management'),
    plans: L('套餐管理', 'Plan management'),
    credits: L('Credits 流水', 'Credits ledger'),
    documents: L('文档任务', 'Document jobs'),
    failed: L('失败任务', 'Failed jobs'),
    files: L('文件记录', 'File records'),
    providers: L('AI 服务商', 'AI Providers'),
    settings: L('系统设置', 'System settings'),
    audit: L('审计日志', 'Audit logs')
  };
  const Empty = ({
    icon: Icon = FileText,
    title,
    desc
  }) => <div className="admin-empty-v2"><Icon /><b>{title}</b><p>{desc}</p></div>;
  const statusBadge = s => <i className={`admin-badge-v2 ${String(s || '').toLowerCase()}`}>{s || '—'}</i>;
  return <main className="admin-console-v2">
  <aside className="admin-side-v2"><button className="admin-brand-v2" onClick={() => setTab('overview')}><span>DA</span><div><b>Document Automation AI</b><small>{L('平台管理后台', 'Platform Admin Console')}</small></div></button><div className="admin-nav-scroll-v2">{nav.map(g => <section key={g.group}><small>{g.group}</small>{g.items.map(([key, Icon, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}><Icon /><span>{label}</span></button>)}</section>)}</div><div className="admin-account-v2"><button onClick={() => setAccountOpen(v => !v)}><span>{(currentUser?.name || currentUser?.email || 'A').slice(0, 1).toUpperCase()}</span><div><b>{currentUser?.name || L('管理员', 'Administrator')}</b><small>{currentUser?.role || 'admin'}</small></div><ChevronDown /></button>{accountOpen && <div><button onClick={() => setPage('dashboard')}><ArrowLeft />{L('返回工作台', 'Back to workspace')}</button><button onClick={() => setPage('account')}><LockKeyhole />{L('修改登录密码', 'Change password')}</button></div>}</div></aside>
  <section className="admin-main-v2"><header className="admin-head-v2"><div><small>{L('平台运营与系统管理', 'PLATFORM OPERATIONS')}</small><h1>{titleMap[tab]}</h1><p>{L('统一管理平台业务、交易、文档处理与系统配置。', 'Manage platform operations, commerce, document processing and system configuration.')}</p></div>{tab !== 'providers' && <button onClick={load}><RefreshCw />{L('刷新数据', 'Refresh')}</button>}</header>{message && <div className="admin-message-v2"><AlertTriangle /><span>{message}</span></div>}
  {tab === 'overview' && <><section className="admin-metrics-v2">{[[L('今日收入', 'Revenue today'), money(stats.revenue_today_cents || 0), CreditCard], [L('本月收入', 'Revenue this month'), money(stats.revenue_cents || 0), Coins], [L('今日订单', 'Orders today'), stats.orders_today ?? 0, FileText], [L('支付成功率', 'Payment success'), stats.paid_orders ? `${Math.round(100 * stats.paid_orders / Math.max(1, stats.paid_orders + (stats.pending_orders || 0)))}%` : '—', BarChart3], [L('总用户', 'Total users'), stats.users_total ?? 0, UserRound], [L('今日新增', 'New today'), stats.users_today ?? 0, Activity], [L('处理中', 'Running jobs'), stats.queued_jobs ?? 0, RefreshCw], [L('失败任务', 'Failed jobs'), stats.failed_jobs ?? 0, AlertTriangle]].map(([label, value, Icon]) => <article key={label}><span><Icon /></span><div><small>{label}</small><b>{loading ? '—' : value}</b></div></article>)}</section><section className="admin-grid-v2"><article className="admin-card-v2"><header><h2>{L('最近订单', 'Recent orders')}</h2><button onClick={() => setTab('orders')}>{L('查看全部', 'View all')}</button></header>{orders.length ? <div className="admin-list-v2">{orders.slice(0, 6).map(o => <p key={o.id}><span><b>{o.order_number || `#${o.id}`}</b><small>{o.email || o.customer_email || '—'}</small></span>{statusBadge(o.status)}<em>{o.created_at ? new Date(o.created_at).toLocaleString() : '—'}</em></p>)}</div> : <Empty title={L('暂无订单', 'No orders')} desc={L('产生真实订单后会显示在这里。', 'Real orders will appear here.')} />}</article><article className="admin-card-v2"><header><h2>{L('系统健康', 'System health')}</h2><i className="healthy">{L('运行中', 'Operational')}</i></header><div className="admin-health-v2"><p><span>{L('API 服务', 'API service')}</span><b>{stats.api_status || 'healthy'}</b></p><p><span>{L('数据库', 'Database')}</span><b>{stats.database_status || 'healthy'}</b></p><p><span>{L('在线用户', 'Online users')}</span><b>{stats.online_users ?? 0}</b></p><p><span>{L('AI 服务', 'AI service')}</span><b>{L('已配置', 'Configured')}</b></p></div></article></section></>}
  {tab === 'users' && <section className="admin-card-v2 admin-table-card-v2"><header className="admin-toolbar-v2"><label><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={L('搜索邮箱、姓名或用户 ID', 'Search users')} /></label><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">{L('全部状态', 'All statuses')}</option><option value="active">{L('正常', 'Active')}</option><option value="disabled">{L('已禁用', 'Disabled')}</option><option value="pending_verification">{L('待验证', 'Pending')}</option></select><b>{filtered.length} {L('位用户', 'users')}</b></header><div className="admin-table-v2 users"><div className="th"><span>{L('用户', 'User')}</span><span>{L('角色', 'Role')}</span><span>{L('套餐', 'Plan')}</span><span>Credits</span><span>{L('文档数', 'Documents')}</span><span>{L('最后登录', 'Last login')}</span><span>{L('状态', 'Status')}</span><span>{L('操作', 'Action')}</span></div>{filtered.map(u => <div className="tr" key={u.id}><span className="user"><i>{(u.name || u.email || 'U').slice(0, 1).toUpperCase()}</i><em><b>{u.name || L('未设置姓名', 'No name')}</b><small>{u.email}</small></em></span><span>{u.role || 'user'}</span><span>{u.plan || 'free'}</span><span>{u.credits ?? 0}</span><span>{u.documents_count ?? 0}</span><span>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '—'}</span><span>{statusBadge(u.status)}</span><span><button onClick={() => openUser(u)}><Edit3 />{L('管理', 'Manage')}</button></span></div>)}</div></section>}
  {tab === 'tenants' && <><section className="tenant-metrics-v1">{[[L('总租户', 'Total tenants'), tenantSummary.total ?? tenants.length, Building2], [L('免费版', 'Free'), tenantSummary.free ?? 0, UserRound], [L('专业版', 'Professional'), tenantSummary.professional ?? 0, Sparkles], [L('企业版', 'Enterprise'), tenantSummary.enterprise ?? 0, ShieldCheck]].map(([label, value, Icon]) => <article key={label}><span><Icon /></span><div><small>{label}</small><b>{loading ? '—' : value}</b></div></article>)}</section><section className="admin-card-v2 admin-table-card-v2 tenant-card-v1"><header className="admin-toolbar-v2 tenant-toolbar-v1"><label><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={L('搜索企业名称、Tenant ID 或 Owner 邮箱', 'Search company, tenant ID or owner')} /></label><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">{L('全部状态', 'All statuses')}</option><option value="active">{L('正常', 'Active')}</option><option value="trial">{L('试用', 'Trial')}</option><option value="suspended">{L('暂停', 'Suspended')}</option><option value="expired">{L('已到期', 'Expired')}</option></select><b>{filteredTenants.length} {L('个租户', 'tenants')}</b></header><div className="admin-table-v2 tenants"><div className="th"><span>{L('企业名称', 'Company')}</span><span>Tenant ID</span><span>Owner</span><span>{L('成员', 'Members')}</span><span>{L('套餐', 'Plan')}</span><span>Credits</span><span>{L('文档', 'Documents')}</span><span>{L('最近活跃', 'Last active')}</span><span>{L('状态', 'Status')}</span><span>{L('操作', 'Action')}</span></div>{filteredTenants.map(t => <div className="tr" key={t.id}><span className="tenant-company-v1"><i>{(t.company_name || 'T').slice(0, 1).toUpperCase()}</i><em><b>{t.company_name}</b><small>{t.industry || L('行业未设置', 'Industry not set')}</small></em></span><span><code>{t.tenant_key}</code></span><span title={t.owner_email}>{t.owner_email}</span><span><button className="tenant-member-link-v1" onClick={() => {
                  openTenant(t);
                  setTenantTab('team');
                }}>{t.member_count ?? 1} {L('成员', 'members')}</button></span><span><i className={`tenant-plan-v1 ${String(t.plan || 'free').split('_')[0]}`}>{String(t.plan || 'free').replace(/_/g, ' ')}</i></span><span>{Number(t.credits || 0).toLocaleString()}</span><span>{t.documents_count ?? 0}</span><span>{t.last_login_at ? new Date(t.last_login_at).toLocaleString() : '—'}</span><span>{statusBadge(t.status)}</span><span><button className="tenant-more-v1" onClick={() => openTenant(t)} title={L('管理租户', 'Manage tenant')}>···</button></span></div>)}</div>{!filteredTenants.length && <Empty icon={Building2} title={L('暂无租户', 'No tenants')} desc={L('企业租户将在这里独立管理。', 'Enterprise tenants are managed independently here.')} />}</section></>}
  {tab === 'providers' && <section className="admin-provider-panel-v2"><TranslationSettings authToken={authToken} t={{
          apiKey: L('API 密钥', 'API Key'),
          model: L('模型', 'Model'),
          testConnection: L('测试连接', 'Test connection'),
          settingsFailed: L('设置操作失败', 'Settings operation failed')
        }} /></section>}
  {(tab === 'orders' || tab === 'documents' || tab === 'failed') && <section className="admin-card-v2 admin-table-card-v2"><div className="admin-table-v2 orders"><div className="th"><span>{L('订单/任务', 'Order / job')}</span><span>{L('用户', 'User')}</span><span>{L('文件', 'Files')}</span><span>{L('金额', 'Amount')}</span><span>{L('状态', 'Status')}</span><span>{L('创建时间', 'Created')}</span></div>{orders.filter(o => tab !== 'failed' || String(o.status).toLowerCase().includes('fail')).map(o => <div className="tr" key={o.id}><span><b>{o.order_number || `#${o.id}`}</b></span><span>{o.email || o.customer_email || '—'}</span><span>{o.files?.length ?? o.file_count ?? '—'}</span><span>{o.quote_amount ? `${o.quote_currency || 'CNY'} ${o.quote_amount}` : '—'}</span><span>{statusBadge(o.status)}</span><span>{o.created_at ? new Date(o.created_at).toLocaleString() : '—'}</span></div>)}</div>{!orders.length && <Empty title={L('暂无数据', 'No data')} desc={L('真实订单和任务会显示在这里。', 'Real orders and jobs will appear here.')} />}</section>}
  {tab === 'payments' && <section className="admin-card-v2 admin-table-card-v2"><div className="admin-table-v2 payments"><div className="th"><span>{L('支付单号', 'Payment')}</span><span>{L('用户', 'Customer')}</span><span>{L('渠道', 'Provider')}</span><span>{L('金额', 'Amount')}</span><span>{L('状态', 'Status')}</span><span>{L('时间', 'Created')}</span></div>{payments.map(p => <div className="tr" key={p.id}><span>{p.provider_order_id || p.order_number || `#${p.id}`}</span><span>{p.customer_email || '—'}</span><span>{p.provider || 'PayPal'}</span><span>{money(p.amount_cents)}</span><span>{statusBadge(p.status)}</span><span>{p.created_at ? new Date(p.created_at).toLocaleString() : '—'}</span></div>)}</div>{!payments.length && <Empty icon={CreditCard} title={L('暂无支付记录', 'No payments')} desc={L('真实支付记录会显示在这里。', 'Real payment records will appear here.')} />}</section>}
  {tab === 'audit' && <section className="admin-card-v2 admin-table-card-v2"><div className="admin-table-v2 audit"><div className="th"><span>{L('操作者', 'Actor')}</span><span>{L('操作', 'Action')}</span><span>{L('对象', 'Target')}</span><span>{L('原因', 'Reason')}</span><span>{L('时间', 'Time')}</span></div>{audit.map(x => <div className="tr" key={x.id}><span>{x.actor_email || x.actor_role || '—'}</span><span>{x.action}</span><span>{x.target_type} #{x.target_id || '—'}</span><span title={x.reason || ''}>{x.reason || '—'}</span><span>{new Date(x.created_at).toLocaleString()}</span></div>)}</div>{!audit.length && <Empty icon={ShieldCheck} title={L('暂无审计记录', 'No audit logs')} desc={L('后台敏感操作会自动记录。', 'Sensitive admin actions will be logged automatically.')} />}</section>}
  {['plans', 'credits', 'files', 'settings'].includes(tab) && <section className="admin-card-v2"><Empty icon={tab === 'settings' ? Settings2 : tab === 'credits' ? Coins : FolderOpen} title={titleMap[tab]} desc={L('页面框架已建立，后续接入真实业务接口时无需再调整管理后台布局。', 'The page framework is ready; business APIs can be connected without changing the admin layout.')} /></section>}
  </section>
  {tenantDrawer && <div className="admin-drawer-mask-v2" onClick={() => setTenantDrawer(null)}><aside className="admin-drawer-v2 tenant-drawer-v1" onClick={e => e.stopPropagation()}><header><div><small>TENANT MANAGEMENT</small><h2>{tenantDrawer.company_name}</h2><p>{tenantDrawer.tenant_key} · {tenantDrawer.owner_email}</p></div><button onClick={() => setTenantDrawer(null)}><X /></button></header><nav className="tenant-tabs-v1">{[['info', L('企业信息', 'Company')], ['plan', L('套餐与额度', 'Plan & credits')], ['team', L('团队成员', 'Team')], ['usage', L('使用情况', 'Usage')]].map(([k, l]) => <button className={tenantTab === k ? 'active' : ''} onClick={() => setTenantTab(k)} key={k}>{l}</button>)}</nav><section>{tenantTab === 'info' && <div className="tenant-form-v1"><label>{L('企业名称', 'Company name')}<input value={tenantDraft.company_name} onChange={e => setTenantDraft(v => ({
                ...v,
                company_name: e.target.value
              }))} /></label><label>{L('行业', 'Industry')}<input value={tenantDraft.industry} onChange={e => setTenantDraft(v => ({
                ...v,
                industry: e.target.value
              }))} placeholder={L('例如：制造业', 'e.g. Manufacturing')} /></label><label>{L('国家/地区', 'Country / region')}<input value={tenantDraft.country} onChange={e => setTenantDraft(v => ({
                ...v,
                country: e.target.value
              }))} /></label><label>{L('联系人', 'Contact')}<input value={tenantDraft.contact_name} onChange={e => setTenantDraft(v => ({
                ...v,
                contact_name: e.target.value
              }))} /></label><label>{L('联系电话', 'Phone')}<input value={tenantDraft.contact_phone} onChange={e => setTenantDraft(v => ({
                ...v,
                contact_phone: e.target.value
              }))} /></label><div className="tenant-readonly-v1"><span><small>Tenant ID</small><b>{tenantDrawer.tenant_key}</b></span><span><small>Owner</small><b>{tenantDrawer.owner_email}</b></span><span><small>{L('创建时间', 'Created')}</small><b>{tenantDrawer.created_at ? new Date(tenantDrawer.created_at).toLocaleString() : '—'}</b></span></div></div>}{tenantTab === 'plan' && <div className="tenant-form-v1"><label>{L('当前套餐', 'Current plan')}<select value={tenantDraft.plan} onChange={e => setTenantDraft(v => ({
                ...v,
                plan: e.target.value
              }))}><option value="free">Free</option><option value="starter">Starter</option><option value="professional">Professional</option><option value="business">Business</option><option value="enterprise">Enterprise</option></select></label><label>Credits<input type="number" min="0" value={tenantDraft.credits} onChange={e => setTenantDraft(v => ({
                ...v,
                credits: e.target.value
              }))} /></label><label>{L('租户状态', 'Tenant status')}<select value={tenantDraft.status} onChange={e => setTenantDraft(v => ({
                ...v,
                status: e.target.value
              }))}><option value="active">{L('正常', 'Active')}</option><option value="trial">{L('试用', 'Trial')}</option><option value="suspended">{L('暂停', 'Suspended')}</option><option value="expired">{L('已到期', 'Expired')}</option></select></label></div>}{tenantTab === 'team' && <div className="tenant-panel-v1"><div className="tenant-team-list-v1">{(tenantDrawer.members && tenantDrawer.members.length ? tenantDrawer.members : [{
                name: tenantDrawer.owner_name,
                email: tenantDrawer.owner_email,
                role: 'owner',
                status: 'active',
                last_login_at: tenantDrawer.last_login_at
              }]).map((m, index) => <div className="tenant-team-row-v1" key={m.id || m.email || index}><span>{(m.name || m.email || 'M').slice(0, 1).toUpperCase()}</span><div><b>{m.name || L('未设置姓名', 'Name not set')}</b><small>{m.email}</small><small>{L('最近登录', 'Last login')}：{m.last_login_at ? new Date(m.last_login_at).toLocaleString() : '—'}</small></div><i>{m.role || 'member'}</i><em className={`tenant-member-status-v1 ${m.status || 'active'}`}>{m.status || 'active'}</em></div>)}</div><p>{L(`当前共 ${tenantDrawer.member_count || 1} 位成员。`, `There are ${tenantDrawer.member_count || 1} members.`)}</p></div>}{tenantTab === 'usage' && <div className="tenant-usage-v1">{[[L('累计处理文档', 'Documents processed'), tenantDrawer.documents_count ?? 0], [L('成员数量', 'Members'), tenantDrawer.member_count ?? 1], [L('当前 Credits', 'Current credits'), Number(tenantDrawer.credits || 0).toLocaleString()], [L('最近活跃', 'Last active'), tenantDrawer.last_login_at ? new Date(tenantDrawer.last_login_at).toLocaleString() : '—']].map(([a, b]) => <span key={a}><small>{a}</small><b>{b}</b></span>)}</div>}<label>{L('修改原因（必填）', 'Reason (required)')}<textarea value={tenantDraft.reason} onChange={e => setTenantDraft(v => ({
              ...v,
              reason: e.target.value
            }))} placeholder={L('例如：企业升级套餐、调整额度或更新企业资料。', 'For example: plan upgrade, credits adjustment or company profile update.')} /></label></section><footer><button onClick={() => setTenantDrawer(null)}>{L('取消', 'Cancel')}</button><button className="primary" disabled={confirming} onClick={saveTenant}>{confirming ? L('保存中…', 'Saving…') : L('确认并保存', 'Confirm and save')}</button></footer></aside></div>}
  {drawer && <div className="admin-drawer-mask-v2" onClick={() => setDrawer(null)}><aside className="admin-drawer-v2" onClick={e => e.stopPropagation()}><header><div><small>{L('用户管理', 'USER MANAGEMENT')}</small><h2>{drawer.name || drawer.email}</h2><p>{drawer.email}</p></div><button onClick={() => setDrawer(null)}><X /></button></header><section><label>{L('套餐', 'Plan')}<select value={draft.plan} onChange={e => setDraft(v => ({
              ...v,
              plan: e.target.value
            }))}><option value="free">Free</option><option value="starter">Starter</option><option value="professional">Professional</option><option value="business">Business</option><option value="enterprise">Enterprise</option></select></label><label>Credits<input type="number" min="0" value={draft.credits} onChange={e => setDraft(v => ({
              ...v,
              credits: e.target.value
            }))} /></label><label>{L('账号状态', 'Account status')}<select disabled={drawer.role === 'owner'} value={draft.status} onChange={e => setDraft(v => ({
              ...v,
              status: e.target.value
            }))}><option value="active">{L('正常', 'Active')}</option><option value="disabled">{L('禁用', 'Disabled')}</option></select></label><label>{L('修改原因（必填）', 'Reason (required)')}<textarea value={draft.reason} onChange={e => setDraft(v => ({
              ...v,
              reason: e.target.value
            }))} placeholder={L('用于审计日志，例如：客户升级套餐。', 'Used in the audit log, e.g. customer plan upgrade.')} /></label>{drawer.role === 'owner' && <div className="admin-owner-note-v2"><ShieldCheck />{L('Owner 账号不能被禁用、删除或降低权限。', 'The Owner account cannot be disabled, deleted or demoted.')}</div>}</section><footer><button onClick={() => setDrawer(null)}>{L('取消', 'Cancel')}</button><button className="primary" disabled={confirming} onClick={saveUser}>{confirming ? L('保存中…', 'Saving…') : L('确认并保存', 'Confirm and save')}</button></footer></aside></div>}
 </main>;
}
function Dashboard({
  t,
  setPage,
  authToken,
  currentUser,
  setAuthToken,
  setCurrentUser
}) {
  const [orders, setOrders] = useState([]),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const isZh = document.documentElement.lang.startsWith('zh');
  const copy = isZh ? {
    greeting: `早上好，${currentUser?.name || currentUser?.email || '用户'} 👋`,
    sub: '欢迎回到 Document Automation AI 企业工作台',
    newTask: '新建任务',
    all: '全部任务',
    processing: '正在处理',
    completed: '今日完成',
    quality: '质量评分',
    recent: '最近任务',
    live: '实时处理中心',
    quick: '快捷操作',
    viewAll: '查看全部任务',
    noData: '暂无真实数据',
    retry: '重试',
    failed: '加载失败',
    progress: '进度',
    updated: '更新时间',
    action: '操作',
    waiting: '等待中',
    active: '处理中',
    done: '已完成',
    failedState: '失败',
    plan: '当前套餐',
    members: '成员数量',
    expires: '到期时间',
    signout: '退出登录',
    newOrder: '查看失败任务',
    batch: '批量上传',
    template: '使用模板',
    reports: '查看交付文件',
    nav: ['返回首页', '企业工作台', '任务中心', '项目中心', '企业知识库', '模板中心', '团队与权限', '套餐与用量', '系统设置']
  } : {
    greeting: `Good morning, ${currentUser?.name || currentUser?.email || 'User'} 👋`,
    sub: 'Welcome back to the Document Automation AI Enterprise Workspace',
    newTask: 'New task',
    all: 'Total tasks',
    processing: 'Processing',
    completed: 'Completed today',
    quality: 'Quality score',
    recent: 'Recent tasks',
    live: 'Live processing center',
    quick: 'Quick actions',
    viewAll: 'View all tasks',
    noData: 'No real data yet',
    retry: 'Retry',
    failed: 'Unable to load',
    progress: 'Progress',
    updated: 'Updated',
    action: 'Action',
    waiting: 'Waiting',
    active: 'Processing',
    done: 'Completed',
    failedState: 'Failed',
    plan: 'Current plan',
    members: 'Members',
    expires: 'Expires',
    signout: 'Sign out',
    newOrder: 'View failed tasks',
    batch: 'Batch upload',
    template: 'Use template',
    reports: 'Open delivery files',
    nav: ['Back to home', 'Enterprise Workspace', 'Live Tasks', 'Document Center', 'Enterprise Knowledge', 'Template Center', 'Team & Permissions', 'Plans & usage', 'System Settings']
  };
  const normalize = value => (Array.isArray(value) ? value : []).filter(x => x && typeof x === 'object').map((x, i) => ({
    id: x.id || x.order_number || i,
    order_number: String(x.order_number || `ORDER-${i + 1}`),
    file_name: String(x.file_name || x.files?.[0]?.original_name || x.order_number || `Document ${i + 1}`),
    services: Array.isArray(x.services) ? x.services : [],
    status: String(x.status || x.job?.state || 'processing').toLowerCase(),
    progress: Math.min(100, Math.max(0, Number(x.progress || x.job?.overall_progress || 0))),
    created_at: x.updated_at || x.created_at || null,
    output_files: Array.isArray(x.output_files) ? x.output_files : []
  }));
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`${API_BASE}/api/dashboard/recent-orders`, {
        headers: authToken ? {
          Authorization: `Bearer ${authToken}`
        } : {}
      });
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      const rows = normalize(d?.orders);
      setOrders(rows);
      setTotal(Number.isFinite(Number(d?.total)) ? Number(d.total) : rows.length);
    } catch (e) {
      console.error(e);
      setOrders([]);
      setTotal(0);
      setError(copy.failed);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [authToken]);
  const kind = o => o.status.includes('fail') ? 'failed' : o.status.includes('complete') ? 'done' : o.status.includes('queue') || o.status.includes('wait') ? 'waiting' : 'processing';
  const completed = orders.filter(o => kind(o) === 'done'),
    active = orders.filter(o => kind(o) === 'processing' || kind(o) === 'waiting'),
    failed = orders.filter(o => kind(o) === 'failed'),
    live = active[0] ? {
      ...active[0],
      progress: Math.min(99, active[0].progress)
    } : null;
  const today = new Date().toDateString(),
    completedToday = completed.filter(o => o.created_at && new Date(o.created_at).toDateString() === today).length;
  const qualityLabel = completed.length >= 5 ? '—' : isZh ? '样本不足' : 'Not enough data';
  const statusText = k => ({
    done: copy.done,
    processing: copy.active,
    waiting: copy.waiting,
    failed: copy.failedState
  })[k] || copy.active;
  const serviceText = services => {
    const map = isZh ? {
      ocr: 'OCR',
      translation: '翻译',
      conversion: '格式转换',
      data_cleanup: '数据整理',
      enterprise_analysis: '企业分析',
      standard: '标准处理'
    } : {
      ocr: 'OCR',
      translation: 'Translation',
      conversion: 'Conversion',
      data_cleanup: 'Data cleanup',
      enterprise_analysis: 'Enterprise analysis',
      standard: 'Standard processing'
    };
    return services.length ? services.map(x => map[x] || x).join(' + ') : '—';
  };
  const steps = isZh ? ['文档解析', 'OCR 识别', 'AI 翻译', '版式重建', '质量校验', '导出交付'] : ['Document parsing', 'OCR recognition', 'AI translation', 'Layout reconstruction', 'Quality validation', 'Export delivery'];
  const signOut = async () => {
    try {
      if (authToken) await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
    } catch {} finally {
      localStorage.removeItem('da_auth_token');
      localStorage.removeItem('da_user_profile');
      setAuthToken?.('');
      setCurrentUser?.(null);
      setPage('login');
    }
  };
  const navActions = [() => setPage('home'), () => {}, () => setPage('processing'), () => setPage('projects'), () => setPage('knowledge'), () => setPage('templates'), () => setPage('team'), () => setPage('billing'), () => setPage('settings')];
  const openProcessingTask = id => {
    if (id) localStorage.setItem('da_open_processing_order', String(id));
    setPage('processing');
  };
  const metricData = [[copy.processing, active.length, failed.length ? `${failed.length} ${isZh ? '项需要处理' : 'need attention'}` : isZh ? '当前运行状态' : 'Currently active', RefreshCw, 'green'], [copy.completed, completedToday, isZh ? '今天完成的任务' : 'Finished today', CircleCheck, 'purple'], [isZh ? '需要关注' : 'Needs attention', failed.length, failed.length ? isZh ? '打开任务队列处理' : 'Open the task queue' : isZh ? '当前没有失败任务' : 'No failed tasks', AlertTriangle, 'orange']];
  return <main className="enterprise-workspace-v33 ew-dashboard-v50">
  <EnterpriseSidebar setPage={setPage} active="dashboard" />
  <WorkspaceHeaderTools targetSelector=".ew-top-v51 .ew-top-actions" locale={document.documentElement.lang} setPage={setPage} user={currentUser} authToken={authToken} setAuthToken={setAuthToken} setCurrentUser={setCurrentUser} primaryAction={{
    label: isZh ? '新建任务' : 'New task',
    onClick: () => setPage('order')
  }} />
  <section className="ew-content"><header className="ew-top ew-top-v51"><div><h1>{copy.greeting}</h1><p>{copy.sub}</p></div><div className="ew-top-actions"><button className="ew-primary" onClick={() => setPage('order')}><Sparkles />{copy.newTask}</button><button className="ew-icon ew-header-tool" title={isZh ? '帮助' : 'Help'}><HelpCircle /></button><button className="ew-icon ew-header-tool ew-language-tool" title={isZh ? '语言' : 'Language'}><Globe2 /><small>{isZh ? 'ZH' : 'EN'}</small></button><button className="ew-icon ew-header-tool" title={isZh ? '通知' : 'Notifications'}><Bell /></button><button className="ew-avatar">{(currentUser?.name || currentUser?.email || 'U').slice(0, 1).toUpperCase()}</button></div></header>
  {error && <div className="ew-error"><AlertTriangle /><span>{error}</span><button onClick={load}>{copy.retry}</button></div>}
  <section className="ew-metrics">{metricData.map(([label, value, note, Icon, color]) => <article key={label}><span className={color}><Icon /></span><div><small>{label}</small><b>{value}</b><em>{note}</em></div></article>)}</section>
  <section className="ew-grid ew-main-grid"><article className="ew-card ew-recent"><header><div><h2>{copy.recent}</h2><p>{isZh ? '优先展示需要关注的真实处理记录' : 'Real processing records that need attention first'}</p></div><button onClick={() => setPage('processing')}>{copy.viewAll}</button></header>{loading ? <div className="ew-skeleton">Loading…</div> : orders.length ? <div className="ew-table"><div className="ew-tr ew-th"><span>{isZh ? '文件名称' : 'File'}</span><span>{isZh ? '处理能力' : 'Capability'}</span><span>{copy.progress}</span><span>{isZh ? '状态' : 'Status'}</span><span>{copy.updated}</span><span>{copy.action}</span></div>{orders.slice(0, 6).map(o => {
              const k = kind(o);
              return <div className="ew-tr" key={o.id}><span className="ew-file"><FileText /><b title={o.file_name}>{o.file_name}</b></span><span>{serviceText(o.services)}</span><span className="ew-progress"><i><em style={{
                      width: `${o.progress}%`
                    }} /></i><b>{o.progress}%</b></span><span><i className={`ew-status ${k}`}>{statusText(k)}</i></span><span>{o.created_at ? new Date(o.created_at).toLocaleString() : '—'}</span><span><button title={isZh ? '查看任务' : 'Open task'} onClick={() => openProcessingTask(o.id)}><Eye /></button>{k === 'done' && <button title={isZh ? '下载' : 'Download'}><Download /></button>}</span></div>;
            })}</div> : <div className="ew-empty"><FileText /><b>{copy.noData}</b><button onClick={() => setPage('order')}>{copy.newTask}</button></div>}</article>
  <article className={`ew-card ew-live ${live ? 'clickable-live-task-v45' : ''}`} role={live ? 'button' : undefined} tabIndex={live ? 0 : undefined} onClick={() => live && openProcessingTask(live.id)} onKeyDown={event => { if (live && ['Enter', ' '].includes(event.key)) openProcessingTask(live.id); }}><header><div><h2>{isZh ? '当前工作流' : 'Active workflow'}</h2><p>{isZh ? '从分析到交付的真实处理阶段' : 'Real processing stages from analysis to delivery'}</p></div><button onClick={event => { event.stopPropagation(); setPage('processing'); }}>{copy.viewAll}</button></header>{live ? <><div className="ew-live-file"><FileText /><div><b>{live.file_name}</b><small>{live.order_number}</small></div><strong>{live.progress}%</strong></div><div className="ew-live-bar"><i style={{
                width: `${live.progress}%`
              }} /></div><ol>{steps.map((s, i) => {
                const threshold = (i + 1) * 16.7;
                const done = live.progress >= threshold,
                  run = !done && live.progress >= i * 16.7;
                return <li className={done ? 'done' : run ? 'run' : ''} key={s}><span>{done ? <Check /> : i + 1}</span><b>{s}</b><small>{done ? copy.done : run ? copy.active : copy.waiting}</small></li>;
              })}</ol></> : <div className="ew-empty compact"><Workflow /><b>{isZh ? '当前没有正在处理的任务' : 'No active processing task'}</b><button onClick={() => setPage('order')}>{copy.newTask}</button></div>}</article></section>
  <section className="ew-grid ew-quick-grid"><article className="ew-card ew-quick"><header><div><h2><Sparkles />{copy.quick}</h2><p>{isZh ? '常用入口集中在一个位置' : 'Common actions in one place'}</p></div></header><div className="ew-quick-actions"><button onClick={() => setPage('processing')}><AlertTriangle /><span><b>{copy.newOrder}</b><small>{isZh ? '集中处理失败和中断任务' : 'Review failed and interrupted tasks'}</small></span></button><button onClick={() => setPage('order')}><CloudUpload /><span><b>{copy.batch}</b><small>{isZh ? '一次上传多个文件' : 'Upload multiple files'}</small></span></button><button onClick={() => setPage('templates')}><Grid3X3 /><span><b>{copy.template}</b><small>{isZh ? '从已有模板开始' : 'Start from a template'}</small></span></button><button onClick={() => setPage('projects')}><FolderOpen /><span><b>{copy.reports}</b><small>{isZh ? '查看已完成项目和交付结果' : 'Review completed projects and deliveries'}</small></span></button></div></article></section>
  </section></main>;
}
export default App;
