import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Globe2, Languages } from 'lucide-react';
import './GeneralSettingsPanel.css';

const INTERFACE_LANGUAGES = [
  ['zh', '🇨🇳', '简体中文'],
  ['en', '🇺🇸', 'English'],
  ['vi', '🇻🇳', 'Tiếng Việt'],
];

export default function GeneralSettingsPanel({
  active,
  locale,
  setLocale,
  changeProfile,
  L,
}) {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    setTarget(document.querySelector('.settings-content'));
  }, [active]);

  if (!active || !target) return null;

  const changeLanguage = id => {
    localStorage.setItem('da_locale', id);
    changeProfile('language', id);
    setLocale(id);
    window.dispatchEvent(new CustomEvent('da-locale-updated', { detail: id }));
  };

  return createPortal((
    <article className="settings-panel-card general-settings-v45">
      <header>
        <div>
          <span>GENERAL</span>
          <h2>{L('通用设置', 'General settings', 'Cài đặt chung')}</h2>
          <p>{L('统一管理整个产品的界面语言。', 'Manage the interface language used across the entire product.', 'Quản lý ngôn ngữ cho toàn bộ sản phẩm.')}</p>
        </div>
        <Globe2 />
      </header>
      <section className="general-language-card-v45">
        <div className="general-language-title-v45">
          <Languages />
          <span>
            <b>{L('界面语言', 'Interface language', 'Ngôn ngữ giao diện')}</b>
            <small>{L('修改后立即应用到首页、Workspace、项目、模板、弹窗和提示信息。', 'Changes apply immediately to Home, Workspace, Projects, Templates, dialogs and messages.', 'Áp dụng ngay cho toàn bộ giao diện.')}</small>
          </span>
        </div>
        <div className="general-language-options-v45">
          {INTERFACE_LANGUAGES.map(([id, flag, label]) => (
            <button
              type="button"
              className={locale === id ? 'active' : ''}
              key={id}
              onClick={() => changeLanguage(id)}
            >
              <span><i>{flag}</i><b>{label}</b></span>
              {locale === id && <Check />}
            </button>
          ))}
        </div>
        <div className="general-language-note-v45">
          <Globe2 />
          <p>{L('首页负责首次选择语言；登录后的所有页面自动继承。后续只需在这里修改一次。', 'Home handles the first language choice. All signed-in pages inherit it, and future changes are made here only.', 'Trang chủ chọn ngôn ngữ lần đầu; các trang sau đăng nhập tự động kế thừa.')}</p>
        </div>
      </section>
    </article>
  ), target);
}
