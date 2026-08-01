import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, Clock3, Gauge, Globe2, Home, Save, Settings2 } from 'lucide-react';
import './GeneralSettingsPanel.css';

const INTERFACE_LANGUAGES = [
  ['zh', 'CN', '简体中文'],
  ['en', 'US', 'English'],
  ['vi', 'VN', 'Tiếng Việt'],
];

const DEFAULTS = {
  timezone: 'Asia/Ho_Chi_Minh',
  dateFormat: 'YYYY/MM/DD',
  defaultLanding: 'dashboard',
  density: 'comfortable',
  autoSave: true,
  taskNotifications: true,
};

export default function GeneralSettingsPanel({ active, locale, setLocale, changeProfile, L }) {
  const [target, setTarget] = useState(null);
  const [saved, setSaved] = useState(false);
  const [general, setGeneral] = useState(() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('da_general_settings') || '{}') }; }
    catch { return DEFAULTS; }
  });

  useEffect(() => { setTarget(document.querySelector('.settings-content')); }, [active]);
  const preview = useMemo(() => new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : locale === 'vi' ? 'vi-VN' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()), [locale]);
  if (!active || !target) return null;

  const changeLanguage = id => {
    localStorage.setItem('da_locale', id);
    changeProfile('language', id);
    setLocale(id);
    window.dispatchEvent(new CustomEvent('da-locale-updated', { detail: id }));
  };
  const update = (key, value) => { setGeneral(current => ({ ...current, [key]: value })); setSaved(false); };
  const save = () => {
    localStorage.setItem('da_general_settings', JSON.stringify(general));
    document.documentElement.dataset.density = general.density;
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  };

  return createPortal((
    <article className="settings-panel-card general-settings-v45">
      <header><div><span>GENERAL</span><h2>{L('通用设置', 'General settings', 'Cài đặt chung')}</h2><p>{L('管理语言、时区、显示密度、默认入口与系统提醒。', 'Manage language, timezone, density, default landing page and alerts.', 'Quản lý ngôn ngữ, múi giờ và hiển thị.')}</p></div><Settings2 /></header>

      <section className="general-settings-grid-v45">
        <article className="general-setting-section-v45 general-language-card-v45">
          <div className="general-language-title-v45"><Globe2 /><span><b>{L('界面语言', 'Interface language', 'Ngôn ngữ giao diện')}</b><small>{L('修改后立即应用到整个产品。', 'Changes apply immediately across the product.', 'Áp dụng ngay cho toàn bộ sản phẩm.')}</small></span></div>
          <div className="general-language-options-v45">{INTERFACE_LANGUAGES.map(([id, code, label]) => <button type="button" className={locale === id ? 'active' : ''} key={id} onClick={() => changeLanguage(id)}><span><i>{code}</i><b>{label}</b></span>{locale === id && <Check />}</button>)}</div>
        </article>

        <article className="general-setting-section-v45"><div className="general-section-head-v45"><Clock3 /><span><b>{L('地区与时间', 'Region & time', 'Khu vực & thời gian')}</b><small>{preview}</small></span></div><div className="general-fields-v45"><label><span>{L('时区', 'Timezone', 'Múi giờ')}</span><select value={general.timezone} onChange={e => update('timezone', e.target.value)}><option value="Asia/Ho_Chi_Minh">Asia/Ho Chi Minh (UTC+7)</option><option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option><option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option><option value="UTC">UTC</option></select></label><label><span>{L('日期格式', 'Date format', 'Định dạng ngày')}</span><select value={general.dateFormat} onChange={e => update('dateFormat', e.target.value)}><option>YYYY/MM/DD</option><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option></select></label></div></article>

        <article className="general-setting-section-v45"><div className="general-section-head-v45"><Home /><span><b>{L('默认入口', 'Default landing page', 'Trang mặc định')}</b><small>{L('登录后首先打开的页面。', 'The first page opened after sign-in.', 'Trang đầu tiên sau đăng nhập.')}</small></span></div><div className="general-segmented-v45">{[['dashboard',L('工作台','Workspace','Không gian')],['processing',L('任务队列','Task queue','Hàng đợi')],['projects',L('项目','Projects','Dự án')]].map(([id,label]) => <button type="button" key={id} className={general.defaultLanding === id ? 'active' : ''} onClick={() => update('defaultLanding', id)}>{label}</button>)}</div></article>

        <article className="general-setting-section-v45"><div className="general-section-head-v45"><Gauge /><span><b>{L('页面显示密度', 'Display density', 'Mật độ hiển thị')}</b><small>{L('控制卡片与列表的空间大小。', 'Controls spacing in cards and lists.', 'Điều chỉnh khoảng cách giao diện.')}</small></span></div><div className="general-segmented-v45">{[['compact',L('紧凑','Compact','Gọn')],['comfortable',L('舒适','Comfortable','Thoải mái')],['spacious',L('宽松','Spacious','Rộng')]].map(([id,label]) => <button type="button" key={id} className={general.density === id ? 'active' : ''} onClick={() => update('density', id)}>{label}</button>)}</div></article>

        <article className="general-setting-section-v45 general-toggle-list-v45"><div className="general-section-head-v45"><Bell /><span><b>{L('行为与提醒', 'Behavior & alerts', 'Hành vi & thông báo')}</b><small>{L('管理自动保存和任务完成提醒。', 'Manage autosave and task completion alerts.', 'Quản lý tự động lưu và thông báo.')}</small></span></div><label><span><b>{L('自动保存设置', 'Autosave settings', 'Tự động lưu')}</b><small>{L('修改表单时自动保留草稿。', 'Preserve drafts while editing.', 'Lưu bản nháp khi chỉnh sửa.')}</small></span><button type="button" className={`general-switch-v45 ${general.autoSave ? 'on' : ''}`} onClick={() => update('autoSave', !general.autoSave)}><i /></button></label><label><span><b>{L('任务完成提醒', 'Task completion alerts', 'Thông báo hoàn tất')}</b><small>{L('任务完成或失败时显示站内通知。', 'Show in-app alerts when tasks finish or fail.', 'Hiện thông báo khi tác vụ hoàn tất.')}</small></span><button type="button" className={`general-switch-v45 ${general.taskNotifications ? 'on' : ''}`} onClick={() => update('taskNotifications', !general.taskNotifications)}><i /></button></label></article>
      </section>
      <footer className="general-settings-actions-v45"><span className={saved ? 'visible' : ''}><Check />{L('设置已保存', 'Settings saved', 'Đã lưu cài đặt')}</span><button type="button" onClick={save}><Save />{L('保存通用设置', 'Save general settings', 'Lưu cài đặt chung')}</button></footer>
    </article>
  ), target);
}
