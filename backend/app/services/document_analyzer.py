from __future__ import annotations

import csv
import re
import zipfile
from pathlib import Path
from typing import Any

FORMAT_LABELS = {
    '.pdf': 'PDF', '.xlsx': 'Excel', '.xls': 'Excel', '.docx': 'Word', '.doc': 'Word',
    '.pptx': 'PowerPoint', '.ppt': 'PowerPoint', '.csv': 'CSV', '.png': '图片',
    '.jpg': '图片', '.jpeg': '图片', '.bmp': '图片', '.tif': '图片', '.tiff': '图片', '.zip': 'ZIP',
}


def _base(name: str, path: Path) -> dict[str, Any]:
    suffix = path.suffix.lower()
    return {
        'name': name,
        'format': FORMAT_LABELS.get(suffix, suffix.lstrip('.').upper() or '未知'),
        'extension': suffix,
        'size_bytes': path.stat().st_size,
        'details': {},
        'warnings': [],
        'capabilities': [],
        '_text_sample': '',
    }


def _detect_language(text: str) -> dict[str, Any]:
    sample = (text or '').strip()[:30000]
    if not sample:
        return {'code': 'unknown', 'name': '未知', 'confidence': 0.0}
    cjk = len(re.findall(r'[\u4e00-\u9fff]', sample))
    vietnamese = len(re.findall(r'[ăâđêôơưĂÂĐÊÔƠƯàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]', sample, re.I))
    latin_words = len(re.findall(r'\b[A-Za-z]{3,}\b', sample))
    total = max(1, cjk + vietnamese + latin_words)
    if cjk >= max(8, vietnamese * 2, latin_words // 2):
        return {'code': 'zh', 'name': '中文', 'confidence': round(min(0.99, cjk / total + 0.25), 2)}
    if vietnamese >= 3:
        return {'code': 'vi', 'name': '越南语', 'confidence': round(min(0.99, vietnamese / max(1, vietnamese + latin_words) + 0.45), 2)}
    if latin_words >= 5:
        return {'code': 'en', 'name': '英语', 'confidence': round(min(0.95, latin_words / total), 2)}
    return {'code': 'unknown', 'name': '未知', 'confidence': 0.2}


def _analyze_pdf(item: dict, path: Path) -> None:
    from pypdf import PdfReader
    reader = PdfReader(str(path))
    pages = len(reader.pages)
    chunks = [(page.extract_text() or '')[:4000] for page in reader.pages[:8]]
    sample = '\n'.join(chunks)
    avg = len(sample.strip()) / max(1, min(pages, 8))
    item['_text_sample'] = sample
    item['details'].update({
        'pages': pages,
        'extractable_text_chars_sample': len(sample),
        'likely_scanned': avg < 40,
        'encrypted': bool(reader.is_encrypted),
    })
    item['capabilities'] += ['文本提取', '页数识别']
    if avg < 40:
        item['warnings'].append('疑似扫描版 PDF，建议启用 OCR。')


def _analyze_xlsx(item: dict, path: Path) -> None:
    from openpyxl import load_workbook
    # Large or complex workbooks can take minutes and consume hundreds of MB when
    # loaded in normal mode. During order creation we only need a safe structural
    # preview, so files >= 8 MB are opened in read-only streaming mode.
    streaming = path.stat().st_size >= 8 * 1024 * 1024
    wb = load_workbook(path, read_only=streaming, data_only=False, keep_links=False)
    sheets, samples = [], []
    total_rows = total_cells = formula_count = merged_count = chart_count = image_count = 0
    max_columns = 0
    for ws in wb.worksheets:
        rows, cols = ws.max_row or 0, ws.max_column or 0
        total_rows += rows
        max_columns = max(max_columns, cols)
        merged_count += 0 if streaming else len(ws.merged_cells.ranges)
        chart_count += 0 if streaming else len(getattr(ws, '_charts', []))
        image_count += 0 if streaming else len(getattr(ws, '_images', []))
        non_empty = 0
        for row in ws.iter_rows(min_row=1, max_row=min(rows, 80), min_col=1, max_col=min(cols, 40)):
            for cell in row:
                value = cell.value
                if value not in (None, ''):
                    non_empty += 1
                    if isinstance(value, str):
                        samples.append(value)
                    if isinstance(value, str) and value.startswith('='):
                        formula_count += 1
        total_cells += non_empty
        sheets.append({'name': ws.title, 'rows': rows, 'columns': cols, 'sample_non_empty_cells': non_empty})
    item['_text_sample'] = '\n'.join(samples[:500])
    item['details'].update({
        'sheet_count': len(sheets), 'sheets': sheets[:30], 'total_rows': total_rows,
        'max_columns': max_columns, 'sample_non_empty_cells': total_cells,
        'formula_count_sample': formula_count, 'merged_range_count': merged_count,
        'chart_count': chart_count, 'image_count': image_count,
        'analysis_mode': 'streaming_preview' if streaming else 'full_structure',
    })
    item['capabilities'] += ['工作表识别', '公式识别', '合并单元格识别', '图表与图片统计']
    wb.close()


def _analyze_docx(item: dict, path: Path) -> None:
    from docx import Document
    doc = Document(path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    table_cells = [cell.text for table in doc.tables for row in table.rows for cell in row.cells if cell.text.strip()]
    sections = len(doc.sections)
    item['_text_sample'] = '\n'.join((paragraphs + table_cells)[:800])
    item['details'].update({
        'paragraph_count': len(doc.paragraphs), 'non_empty_paragraph_count': len(paragraphs),
        'table_count': len(doc.tables), 'image_count': len(doc.inline_shapes), 'section_count': sections,
        'heading_count': sum(1 for p in doc.paragraphs if p.style and p.style.name.lower().startswith('heading')),
    })
    item['capabilities'] += ['段落识别', '表格识别', '图片统计', '标题结构识别']


def _analyze_pptx(item: dict, path: Path) -> None:
    from pptx import Presentation
    from pptx.enum.shapes import MSO_SHAPE_TYPE

    prs = Presentation(str(path))
    slides = []
    all_text = []
    totals = {'text_shape_count': 0, 'table_count': 0, 'picture_count': 0, 'chart_count': 0, 'group_shape_count': 0}
    for index, slide in enumerate(prs.slides, start=1):
        info = {'slide': index, 'text_shapes': 0, 'tables': 0, 'pictures': 0, 'charts': 0, 'groups': 0, 'text_chars': 0}
        for shape in slide.shapes:
            if getattr(shape, 'has_text_frame', False):
                text = shape.text or ''
                if text.strip():
                    all_text.append(text)
                    info['text_shapes'] += 1
                    info['text_chars'] += len(text)
            if getattr(shape, 'has_table', False):
                info['tables'] += 1
                for row in shape.table.rows:
                    for cell in row.cells:
                        if cell.text.strip():
                            all_text.append(cell.text)
            if getattr(shape, 'has_chart', False):
                info['charts'] += 1
            if shape.shape_type == MSO_SHAPE_TYPE.PICTURE:
                info['pictures'] += 1
            if shape.shape_type == MSO_SHAPE_TYPE.GROUP:
                info['groups'] += 1
        for key, total_key in [('text_shapes','text_shape_count'),('tables','table_count'),('pictures','picture_count'),('charts','chart_count'),('groups','group_shape_count')]:
            totals[total_key] += info[key]
        slides.append(info)
    item['_text_sample'] = '\n'.join(all_text[:1200])
    item['details'].update({
        'slide_count': len(prs.slides),
        **totals,
        'slide_width_inches': round(prs.slide_width / 914400, 2),
        'slide_height_inches': round(prs.slide_height / 914400, 2),
        'slides': slides[:100],
        'extractable_text_chars': len(item['_text_sample']),
    })
    item['capabilities'] += ['幻灯片识别', '文本框提取', '表格提取', '图片统计', '图表统计', '分组图形统计']
    if totals['group_shape_count']:
        item['warnings'].append('检测到分组图形；复杂 SmartArt/组合对象在后续翻译导出时需要版式复核。')


def _analyze_csv(item: dict, path: Path) -> None:
    rows = 0; max_cols = 0; samples = []
    with path.open('r', encoding='utf-8-sig', errors='replace', newline='') as f:
        for row in csv.reader(f):
            rows += 1; max_cols = max(max_cols, len(row)); samples.extend(row[:20])
    item['_text_sample'] = '\n'.join(samples[:1000])
    item['details'].update({'rows': rows, 'columns': max_cols})
    item['capabilities'] += ['行列结构识别', '文本提取']


def _analyze_image(item: dict, path: Path) -> None:
    from PIL import Image
    with Image.open(path) as im:
        item['details'].update({'width': im.width, 'height': im.height, 'mode': im.mode, 'image_format': im.format})
    item['warnings'].append('图片文字处理通常需要 OCR。')
    item['capabilities'] += ['图像元数据识别', '可进入 OCR 流程']


def _analyze_zip(item: dict, path: Path) -> None:
    with zipfile.ZipFile(path) as z:
        names = [n for n in z.namelist() if not n.endswith('/')]
    extensions: dict[str, int] = {}
    for name in names:
        ext = Path(name).suffix.lower() or '(无扩展名)'
        extensions[ext] = extensions.get(ext, 0) + 1
    item['details'].update({'contained_file_count': len(names), 'extension_summary': extensions, 'sample_files': names[:50]})
    item['capabilities'] += ['压缩包目录识别', '内部格式统计']


def _category(files: list[dict], requirements: str) -> str:
    text = (' '.join(x['name'] for x in files) + ' ' + requirements + ' ' + ' '.join(x.get('_text_sample','')[:1500] for x in files)).lower()
    rules = [
        (['invoice','发票'], '发票'), (['quotation','quote','报价'], '报价单'), (['contract','合同'], '合同'),
        (['bom','物料清单'], 'BOM'), (['sop','作业指导'], 'SOP'), (['plc','i/o','io list'], 'PLC I/O'),
        (['manual','说明书'], '说明书'), (['assy line','工站','风险','对策'], '产线问题与风险报告'),
    ]
    for keys, label in rules:
        if any(k in text for k in keys): return label
    formats = {x['format'] for x in files}
    if 'PowerPoint' in formats: return '演示文稿'
    if formats <= {'Excel','CSV'}: return '结构化表格数据'
    if '图片' in formats: return '图片/扫描资料'
    return '通用文档'


def analyze_order_files(paths: list[tuple[str,str]], services: list[str], requirements: str, translation: dict) -> dict:
    files = []
    for name, raw in paths:
        path = Path(raw); item = _base(name, path)
        try:
            ext = path.suffix.lower()
            if ext == '.pdf': _analyze_pdf(item, path)
            elif ext == '.xlsx': _analyze_xlsx(item, path)
            elif ext == '.docx': _analyze_docx(item, path)
            elif ext == '.pptx': _analyze_pptx(item, path)
            elif ext == '.csv': _analyze_csv(item, path)
            elif ext in {'.png','.jpg','.jpeg','.bmp','.tif','.tiff'}: _analyze_image(item, path)
            elif ext == '.zip': _analyze_zip(item, path)
            elif ext in {'.xls','.doc','.ppt'}:
                item['warnings'].append('旧版 Office 二进制格式仅做基础识别；建议转换为 XLSX、DOCX 或 PPTX 后进行深度分析。')
        except Exception as exc:
            item['warnings'].append(f'深度分析未完成：{type(exc).__name__}: {str(exc)[:120]}')
        if 'ocr' in services and item['format'] == '图片':
            item['warnings'] = [w for w in item['warnings'] if '需要 OCR' not in w]
            item['details']['ocr_status'] = '已启用'
        language = _detect_language(item.get('_text_sample',''))
        item['details']['detected_language'] = language
        item.pop('_text_sample', None)
        files.append(item)

    workflow = ['接收并校验文件', '识别文件格式与内部结构', '检测文档主要语言']
    formats = {x['format'] for x in files}
    if 'PowerPoint' in formats: workflow.append('PowerPoint 对象解析（幻灯片、文字、表格、图片、图表）')
    if 'ocr' in services or any(x['details'].get('likely_scanned') or x['format']=='图片' for x in files): workflow.append('OCR 文字与表格识别')
    if 'data_cleanup' in services: workflow.append('数据清理与结构化')
    if 'translation' in services:
        target = translation.get('target_language','目标语言')
        workflow.append(f'文档翻译（目标：{target}）')
    if 'layout_preserve' in services: workflow.append('版式还原与排版优化')
    outputs = [x.replace('output_','') for x in services if x.startswith('output_')]
    if outputs: workflow.append('生成输出文件：' + ', '.join(outputs))
    if 'manual_review' in services: workflow.append('人工质量复核')
    workflow.append('交付文件')

    total = sum(x['size_bytes'] for x in files)
    warnings = [w for x in files for w in x['warnings']]
    complexity = '低'
    object_count = sum((x['details'].get('text_shape_count') or 0) + (x['details'].get('table_count') or 0) + (x['details'].get('picture_count') or 0) for x in files)
    if len(files)>3 or total>20*1024*1024 or object_count>100: complexity='中'
    if len(files)>10 or total>100*1024*1024 or object_count>500 or any((x['details'].get('pages') or x['details'].get('slide_count') or 0)>100 for x in files): complexity='高'
    category = _category(files, requirements)
    languages = sorted({x['details'].get('detected_language',{}).get('name','未知') for x in files})
    return {
        'engine_version': '11.2-document-analyzer', 'status': 'completed', 'file_count': len(files), 'total_size_bytes': total,
        'input_formats': sorted(formats), 'detected_languages': languages, 'document_category': category,
        'complexity': complexity, 'files': files, 'recommended_workflow': workflow,
        'warnings': warnings or ['未发现明显风险。'],
        'summary': f'已深度识别 {len(files)} 个文件；格式：{", ".join(sorted(formats))}；文档类别：“{category}”；语言：{", ".join(languages)}；复杂度：{complexity}。'
    }
