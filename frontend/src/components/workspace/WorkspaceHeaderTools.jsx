import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  BookOpen,
  CircleHelp,
  FileQuestion,
  Headphones,
  History,
  PlayCircle,
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
  primaryAction,
}) {
  const [target, setTarget] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
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
    localStorage.setItem('da_settings_section', 'notifications');
    window.dispatchEvent(new CustomEvent('da-settings-section', { detail: 'notifications' }));
    setPage('settings');
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
      <button type="button" className="workspace-header-icon-v45" title={L('通知', 'Notifications', 'Thông báo')} onClick={openNotifications}>
        <Bell />
      </button>
      <button type="button" className="workspace-header-account-v45" onClick={() => setPage('account')}>
        <i>{initials || <UserRound />}</i>
        <span>
          <b>{accountName}</b>
          <small>{user?.email || L('我的账户', 'My account', 'Tài khoản')}</small>
        </span>
      </button>
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
