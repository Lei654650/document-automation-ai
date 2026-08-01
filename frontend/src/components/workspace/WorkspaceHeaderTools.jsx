import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  BookOpen,
  CircleHelp,
  FileQuestion,
  Headphones,
  History,
  House,
  LayoutDashboard,
  LogOut,
  PlayCircle,
  CreditCard,
  Settings2,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  UserRound,
  X,
} from 'lucide-react';
import './WorkspaceHeaderTools.css';

export default function WorkspaceHeaderTools({
  targetSelector,
  locale,
  setPage,
  user,
  authToken,
  setAuthToken,
  setCurrentUser,
  primaryAction,
}) {
  const [target, setTarget] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const accountTimer = useRef(null);
  const isZh = String(locale).startsWith('zh');
  const isVi = String(locale).startsWith('vi');
  const L = (zh, en, vi) => isZh ? zh : isVi ? vi : en;

  useEffect(() => {
    const element = document.querySelector(targetSelector);
    if (!element) return undefined;
    element.classList.add('v45-header-tools-mounted');
    setTarget(element);
    return () => element.classList.remove('v45-header-tools-mounted');
  }, [targetSelector]);

  const accountName = useMemo(() => {
    const raw = String(user?.name || user?.email?.split('@')[0] || L('账户', 'Account', 'Tài khoản')).trim();
    return raw || L('账户', 'Account', 'Tài khoản');
  }, [user?.name, user?.email, locale]);
  const initials = /^\d+$/.test(accountName)
    ? null
    : accountName.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();

  const openNotifications = () => {
    setAccountOpen(false);
    setNotificationsOpen(value => !value);
  };
  const openAccount = () => {
    if (accountTimer.current) window.clearTimeout(accountTimer.current);
    setAccountOpen(true);
  };
  const closeAccount = () => {
    if (accountTimer.current) window.clearTimeout(accountTimer.current);
    accountTimer.current = window.setTimeout(() => setAccountOpen(false), 180);
  };
  const go = page => {
    setAccountOpen(false);
    setPage(page);
  };
  const signOut = async () => {
    try {
      if (authToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
      }
    } catch {
      // Local state is still cleared if the network is unavailable.
    }
    localStorage.removeItem('da_auth_token');
    localStorage.removeItem('da_current_user');
    localStorage.removeItem('da_user_profile');
    setAuthToken?.('');
    setCurrentUser?.(null);
    window.dispatchEvent(new CustomEvent('da-current-user', { detail: null }));
    go('login');
  };

  const helpItems = [
    [BookOpen, L('使用文档', 'Documentation', 'Tài liệu'), L('产品指南、功能说明和操作步骤', 'Product guides and feature instructions', 'Hướng dẫn sản phẩm')],
    [PlayCircle, L('视频教程', 'Tutorials', 'Hướng dẫn video'), L('快速上手和典型工作流演示', 'Quick starts and workflow walkthroughs', 'Bắt đầu nhanh')],
    [FileQuestion, L('常见问题', 'FAQ', 'Câu hỏi thường gặp'), L('查找常见问题和解决方法', 'Find common questions and solutions', 'Tìm câu trả lời')],
    [Headphones, L('联系客服', 'Contact Support', 'Liên hệ hỗ trợ'), L('联系产品与技术支持团队', 'Contact product and technical support', 'Liên hệ đội hỗ trợ')],
    [TicketCheck, L('提交工单', 'Submit Ticket', 'Gửi yêu cầu'), L('记录问题并跟踪处理进度', 'Report an issue and track progress', 'Theo dõi yêu cầu')],
    [History, L('更新日志', 'Release Notes', 'Ghi chú phát hành'), L('查看版本更新与体验改进', 'Review product updates and improvements', 'Xem cập nhật')],
  ];

  if (!target) return null;

  return createPortal((
    <div className="workspace-header-tools-v45">
      <button type="button" className="workspace-header-home-v45" onClick={() => go('home')} title={L('返回首页', 'Back to home', 'Về trang chủ')}>
        <House />
        <span>{L('返回首页', 'Home', 'Trang chủ')}</span>
      </button>
      {primaryAction && (
        <button type="button" className="workspace-header-primary-v45" onClick={primaryAction.onClick}>
          <Sparkles />
          {primaryAction.label}
        </button>
      )}
      <button type="button" className="workspace-header-help-v45" onClick={() => setHelpOpen(true)}>
        <CircleHelp />
        <span>{L('帮助中心', 'Help center', 'Trung tâm trợ giúp')}</span>
      </button>
      <div className="workspace-notification-wrap-v45">
        <button type="button" className={`workspace-header-icon-v45 ${notificationsOpen ? 'active' : ''}`} title={L('通知', 'Notifications', 'Thông báo')} onClick={openNotifications} aria-expanded={notificationsOpen}>
          <Bell />
          <i className="workspace-notification-dot-v45" />
        </button>
        {notificationsOpen && <section className="workspace-notification-panel-v45">
          <header><div><b>{L('通知中心', 'Notifications', 'Thông báo')}</b><small>{L('任务和系统消息会显示在这里', 'Task and system updates appear here', 'Cập nhật tác vụ hiển thị tại đây')}</small></div><button type="button" onClick={() => setNotificationsOpen(false)}><X /></button></header>
          <div className="workspace-notification-empty-v45"><Bell /><b>{L('暂无新通知', 'No new notifications', 'Không có thông báo mới')}</b><p>{L('任务完成、失败和额度提醒将自动显示。', 'Completed, failed and credit alerts will appear automatically.', 'Thông báo tác vụ sẽ tự động xuất hiện.')}</p></div>
          <footer><button type="button" onClick={() => { setNotificationsOpen(false); go('processing'); }}>{L('查看任务队列', 'View task queue', 'Xem hàng đợi')}</button><button type="button" onClick={() => { setNotificationsOpen(false); localStorage.setItem('da_settings_section', 'notifications'); window.dispatchEvent(new CustomEvent('da-settings-section', { detail: 'notifications' })); go('settings'); }}>{L('通知设置', 'Notification settings', 'Cài đặt thông báo')}</button></footer>
        </section>}
      </div>
      <div className="workspace-account-hover-v45" onMouseEnter={openAccount} onMouseLeave={closeAccount}>
        <button type="button" className="workspace-header-account-v45" aria-haspopup="menu" aria-expanded={accountOpen} onFocus={openAccount}>
          <i>{initials || <UserRound />}</i>
          <span>
            <b>{accountName}</b>
            <small>{user?.email || L('我的账户', 'My account', 'Tài khoản')}</small>
          </span>
        </button>
        {accountOpen && <div className="workspace-account-menu-v45" role="menu" onMouseEnter={openAccount} onMouseLeave={closeAccount}>
          <button type="button" role="menuitem" onClick={() => go('dashboard')}><LayoutDashboard />{L('工作台', 'Workspace', 'Không gian làm việc')}</button>
          {['owner', 'admin'].includes(String(user?.role || '').toLowerCase()) && <button type="button" role="menuitem" onClick={() => go('admin')}><ShieldCheck />{L('管理后台', 'Admin console', 'Quản trị')}</button>}
          <button type="button" role="menuitem" onClick={() => go('settings')}><Settings2 />{L('设置', 'Settings', 'Cài đặt')}</button>
          <button type="button" role="menuitem" onClick={() => go('billing')}><CreditCard />{L('套餐', 'Plans', 'Gói')}</button>
          <button type="button" role="menuitem" className="danger" onClick={signOut}><LogOut />{L('退出登录', 'Sign out', 'Đăng xuất')}</button>
        </div>}
      </div>
      {helpOpen && createPortal(
        <div className="workspace-help-backdrop-v45" onClick={() => setHelpOpen(false)}>
          <section className="workspace-help-center-v45" onClick={event => event.stopPropagation()}>
            <header>
              <div>
                <span>DOCUMENT AUTOMATION AI</span>
                <h2>{L('帮助中心', 'Help center', 'Trung tâm trợ giúp')}</h2>
                <p>{L('获取使用指南、教程、支持与产品更新。', 'Find guides, tutorials, support and product updates.', 'Tìm hướng dẫn và hỗ trợ.')}</p>
              </div>
              <button type="button" onClick={() => setHelpOpen(false)}><X /></button>
            </header>
            <div className="workspace-help-grid-v45">
              {helpItems.map(([Icon, title, description]) => (
                <button type="button" key={title}>
                  <Icon />
                  <span><b>{title}</b><small>{description}</small></span>
                </button>
              ))}
            </div>
          </section>
        </div>,
        document.body,
      )}
    </div>
  ), target);
}
