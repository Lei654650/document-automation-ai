import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Check,
  ChevronDown,
  Globe2,
  HelpCircle,
  House,
  Sparkles,
} from 'lucide-react';
import './WorkspaceTopbar.css';

const LANGUAGES = [
  ['zh', '🇨🇳', '简体中文', 'ZH'],
  ['zh-TW', '🇹🇼', '繁體中文', '繁'],
  ['en', '🇺🇸', 'English', 'EN'],
  ['vi', '🇻🇳', 'Tiếng Việt', 'VI'],
  ['ja', '🇯🇵', '日本語', 'JA'],
  ['ko', '🇰🇷', '한국어', 'KO'],
  ['es', '🇪🇸', 'Español', 'ES'],
  ['fr', '🇫🇷', 'Français', 'FR'],
  ['de', '🇩🇪', 'Deutsch', 'DE'],
  ['pt', '🇵🇹', 'Português', 'PT'],
];

const PAGE_NAMES = {
  dashboard: ['工作台', 'Workspace'],
  order: ['创建任务', 'Create task'],
  status: ['任务状态', 'Task status'],
  projects: ['项目', 'Projects'],
  processing: ['任务队列', 'Task queue'],
  knowledge: ['知识库', 'Knowledge'],
  aiProviders: ['AI 服务商', 'AI providers'],
  templates: ['模板', 'Templates'],
  team: ['团队', 'Team'],
  billing: ['套餐与用量', 'Plans & usage'],
  settings: ['设置', 'Settings'],
  account: ['我的账户', 'My account'],
  admin: ['管理后台', 'Admin console'],
};

export default function WorkspaceTopbar({
  locale,
  setLocale,
  page,
  setPage,
  currentUser,
}) {
  const [languageOpen, setLanguageOpen] = useState(false);
  const menuRef = useRef(null);
  const isZh = String(locale).startsWith('zh');
  const currentLanguage = LANGUAGES.find(([id]) => id === locale) || LANGUAGES[2];
  const pageName = PAGE_NAMES[page]?.[isZh ? 0 : 1] || (isZh ? '工作区' : 'Workspace');

  useEffect(() => {
    const close = event => {
      if (!menuRef.current?.contains(event.target)) setLanguageOpen(false);
    };
    const escape = event => {
      if (event.key === 'Escape') setLanguageOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  const openNotifications = () => {
    localStorage.setItem('da_settings_section', 'notifications');
    setPage('settings');
  };

  return (
    <header className="workspace-global-topbar" aria-label={isZh ? '工作区顶部导航' : 'Workspace navigation'}>
      <button className="workspace-global-brand" type="button" onClick={() => setPage('dashboard')}>
        <span>DA</span>
        <div>
          <b>Document Automation AI</b>
          <small>{pageName}</small>
        </div>
      </button>
      <div className="workspace-global-actions">
        <button type="button" className="workspace-global-text-action" onClick={() => setPage('home')}>
          <House />
          <span>{isZh ? '首页' : 'Home'}</span>
        </button>
        <button type="button" className="workspace-global-primary" onClick={() => setPage('order')}>
          <Sparkles />
          <span>{isZh ? '新建任务' : 'New task'}</span>
        </button>
        <button
          type="button"
          className="workspace-global-icon"
          title={isZh ? '帮助' : 'Help'}
          onClick={() => setPage('knowledge')}
        >
          <HelpCircle />
        </button>
        <div className="workspace-language-menu" ref={menuRef}>
          <button
            type="button"
            className="workspace-global-language"
            aria-haspopup="menu"
            aria-expanded={languageOpen}
            onClick={() => setLanguageOpen(value => !value)}
          >
            <Globe2 />
            <span>{currentLanguage[3]}</span>
            <ChevronDown className={languageOpen ? 'open' : ''} />
          </button>
          {languageOpen && (
            <div className="workspace-language-popover" role="menu">
              <header>
                <b>{isZh ? '界面语言' : 'Interface language'}</b>
                <small>{isZh ? '应用到整个 Workspace' : 'Applies across Workspace'}</small>
              </header>
              <div>
                {LANGUAGES.map(([id, flag, label]) => (
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={locale === id}
                    className={locale === id ? 'active' : ''}
                    key={id}
                    onClick={() => {
                      setLocale(id);
                      setLanguageOpen(false);
                    }}
                  >
                    <span><i>{flag}</i>{label}</span>
                    {locale === id && <Check />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          className="workspace-global-icon"
          title={isZh ? '通知' : 'Notifications'}
          onClick={openNotifications}
        >
          <Bell />
        </button>
        <button
          type="button"
          className="workspace-global-avatar"
          title={isZh ? '我的账户' : 'My account'}
          onClick={() => setPage('account')}
        >
          {(currentUser?.name || currentUser?.email || 'U').slice(0, 1).toUpperCase()}
        </button>
      </div>
    </header>
  );
}
