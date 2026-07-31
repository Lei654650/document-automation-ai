import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Languages } from 'lucide-react';
import './TaskStyleOptions.css';

export default function TaskStyleOptions({ isZh, outputOptions, setOutputOptions }) {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    const syncTarget = () => setTarget(document.querySelector('.advanced-panel-v3052'));
    syncTarget();
    const observer = new MutationObserver(syncTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  if (!target) return null;

  return createPortal((
    <section className="task-style-options-v45">
      <div>
        <Languages />
        <span>
          <b>{isZh ? '本次任务的翻译风格' : 'Translation style for this task'}</b>
          <small>{isZh ? '只影响当前任务，不再作为系统全局设置。' : 'Applies only to this task, not the whole system.'}</small>
        </span>
      </div>
      <select
        value={outputOptions.translation_style || 'auto'}
        onChange={event => setOutputOptions(current => ({
          ...current,
          translation_style: event.target.value,
        }))}
      >
        <option value="auto">{isZh ? 'AI 根据行业和内容自动判断' : 'AI detects from industry and content'}</option>
        <option value="general">{isZh ? '通用清晰' : 'General & clear'}</option>
        <option value="technical">{isZh ? '技术专业' : 'Technical'}</option>
        <option value="legal">{isZh ? '法律严谨' : 'Legal'}</option>
        <option value="medical">{isZh ? '医疗专业' : 'Medical'}</option>
        <option value="academic">{isZh ? '学术正式' : 'Academic'}</option>
        <option value="marketing">{isZh ? '营销自然' : 'Marketing'}</option>
      </select>
    </section>
  ), target);
}
