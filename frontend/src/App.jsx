import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, BarChart3, Check, ChevronDown, CircleCheck, CloudUpload, Code2,
  CreditCard, FileText, Gauge, KeyRound, Languages, LayoutDashboard, LockKeyhole,
  Menu, ScanText, ShieldCheck, Sparkles, Users, Workflow, X, Zap
} from 'lucide-react'
import './App.css'

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

const tools = [
  [ScanText, 'OCR 智能识别', '识别扫描件、图片与复杂 PDF 中的文字和表格'],
  [Languages, '文档翻译', '支持中、英、越及多语言翻译，并尽量保留原始版式'],
  [Workflow, '格式转换', 'PDF、Word、Excel、PPT、CSV 与图片之间灵活转换'],
  [Sparkles, 'AI 数据整理', '自动清理错列、空行、重复内容并输出结构化结果'],
  [ShieldCheck, '人工质量复核', '关键项目由人工复核内容、数字、格式和交付质量'],
  [Code2, '企业 API', '通过 API 将文档处理能力接入企业现有工作流'],
]

const plans = [
  ['体验版', '$0', '适合首次体验', ['每月 20 页', '基础 OCR', 'PDF / Word 转换']],
  ['专业版', '$39', '适合个人与小团队', ['每月 2,000 页', 'AI 翻译与数据整理', '优先处理队列']],
  ['企业版', '定制', '适合批量与系统集成', ['独立工作区', '团队与 API Key', '专属支持与 SLA']],
]

function App() {
  const [page, setPage] = useState('home')
  const [mobile, setMobile] = useState(false)
  const [files, setFiles] = useState([])
  const [service, setService] = useState('ocr')
  const [form, setForm] = useState({ name: '', email: '', company: '', requirements: '' })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const totalSize = useMemo(() => files.reduce((sum, f) => sum + f.size, 0), [files])

  function addFiles(list) {
    const incoming = [...list]
    setFiles(prev => {
      const seen = new Set(prev.map(f => `${f.name}-${f.size}`))
      return [...prev, ...incoming.filter(f => !seen.has(`${f.name}-${f.size}`))]
    })
  }

  async function submitOrder(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    if (!files.length) return setError('请先选择至少一个文件。')
    if (!form.name.trim() || !form.email.trim()) return setError('请填写姓名和邮箱。')
    const data = new FormData()
    files.forEach(file => data.append('files', file))
    data.append('name', form.name)
    data.append('email', form.email)
    data.append('company', form.company)
    data.append('requirements', form.requirements)
    data.append('services', JSON.stringify([service]))
    data.append('translation_json', JSON.stringify({ source: 'auto', target: service === 'translation' ? 'zh_cn' : '' }))
    setSubmitting(true)
    try {
      const response = await fetch(`${API_BASE}/api/orders`, { method: 'POST', body: data })
      const json = await response.json()
      if (!response.ok) throw new Error(json.detail || '订单提交失败')
      setResult(json)
    } catch (err) {
      setError(err.message || '订单提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setPage('home')}>
          <span className="brand-mark">DA</span>
          <span><b>Document Automation AI</b><small>Enterprise Document Intelligence</small></span>
        </button>
        <nav className={mobile ? 'nav open' : 'nav'}>
          <a href="#platform" onClick={() => setMobile(false)}>平台能力</a>
          <a href="#workflow" onClick={() => setMobile(false)}>处理流程</a>
          <a href="#pricing" onClick={() => setMobile(false)}>价格方案</a>
          <button className="nav-ghost" onClick={() => { setPage('dashboard'); setMobile(false) }}>企业工作台</button>
          <button className="nav-primary" onClick={() => { setPage('order'); setMobile(false) }}>立即处理 <ArrowRight size={16}/></button>
        </nav>
        <button className="menu" onClick={() => setMobile(!mobile)}>{mobile ? <X/> : <Menu/>}</button>
      </header>

      {page === 'home' && <Home setPage={setPage} />}
      {page === 'order' && <OrderCenter files={files} addFiles={addFiles} setFiles={setFiles} totalSize={totalSize} service={service} setService={setService} form={form} setForm={setForm} submitOrder={submitOrder} submitting={submitting} result={result} error={error} />}
      {page === 'dashboard' && <Dashboard />}

      <footer>
        <div className="brand footer-brand"><span className="brand-mark">DA</span><span><b>Document Automation AI</b><small>Version 10.5.0</small></span></div>
        <p>面向企业的 AI 文档识别、翻译、转换与数据自动化平台。</p>
        <span>© 2026 Document Automation AI</span>
      </footer>
    </div>
  )
}

function Home({ setPage }) {
  const [demoProgress, setDemoProgress] = useState(18)
  useEffect(() => {
    const timer = setInterval(() => setDemoProgress(v => v >= 96 ? 18 : v + 2), 700)
    return () => clearInterval(timer)
  }, [])
  const stage = demoProgress < 36 ? 'OCR 识别' : demoProgress < 72 ? 'AI 翻译' : '版式恢复'
  return <>
    <main className="hero">
      <div className="hero-copy">
        <div className="eyebrow"><Sparkles size={15}/> AI Document Intelligence · Version 10.5.0</div>
        <h1>让企业文档，<br/><em>自动完成。</em></h1>
        <p>上传 PDF、Excel、Word、PPT 或图片。AI 自动完成 OCR、翻译、数据提取、格式转换与质量检查。</p>
        <div className="hero-actions">
          <button className="primary-xl" onClick={() => setPage('order')}>开始处理文档 <ArrowRight/></button>
          <button className="secondary-xl" onClick={() => setPage('dashboard')}><LayoutDashboard/> 查看企业工作台</button>
        </div>
        <div className="trust-line"><CircleCheck/> 无需安装 <CircleCheck/> 文件隔离 <CircleCheck/> 中英越支持</div>
      </div>
      <div className="hero-stage">
        <div className="glow"/>
        <div className="demo-window">
          <div className="window-head"><span/><span/><span/><b>AI Processing Center</b></div>
          <div className="demo-file"><FileText/><div><b>Supplier_Report_Q3.pdf</b><small>42 pages · 18.6 MB</small></div><span>上传完成</span></div>
          <div className="pipeline">
            <div className="active"><CloudUpload/><b>上传</b><small>100%</small></div>
            <div className="active"><ScanText/><b>OCR</b><small>完成</small></div>
            <div className="running"><Languages/><b>{stage}</b><small>处理中 {demoProgress}%</small></div>
            <div><Sparkles/><b>整理</b><small>等待中</small></div>
          </div>
          <div className="progress"><i style={{width:`${demoProgress}%`}}/></div>
          <div className="demo-result"><CircleCheck/><div><b>预计 {Math.max(4, Math.ceil((100-demoProgress)/2))} 秒后完成</b><small>输出：Excel + 双语 PDF</small></div></div>
        </div>
        <div className="float-card card-a"><Zap/><span><b>96.8%</b><small>识别准确率</small></span></div>
        <div className="float-card card-b"><LockKeyhole/><span><b>安全隔离</b><small>独立文件空间</small></span></div>
      </div>
    </main>

    <section className="logo-strip"><span>服务于制造、贸易、财务与跨境团队</span><div><b>NOVA</b><b>ORBIT</b><b>APEX</b><b>VERTEX</b><b>QUANTUM</b></div></section>

    <section id="platform" className="section">
      <div className="section-head"><span>PLATFORM</span><h2>一个平台，处理所有企业文档</h2><p>从文件上传到最终交付，所有能力统一在同一套工作流中。</p></div>
      <div className="tool-grid">{tools.map(([Icon,title,desc]) => <article key={title}><Icon/><h3>{title}</h3><p>{desc}</p><a>了解更多 <ArrowRight size={15}/></a></article>)}</div>
    </section>

    <section id="workflow" className="workflow-section">
      <div className="section-head light"><span>WORKFLOW</span><h2>从上传到交付，全流程可视化</h2><p>不再依赖手工复制、格式调整和重复检查。</p></div>
      <div className="steps">{[['01','上传文件','支持多文件与批量任务'],['02','AI 理解','识别结构、语言与内容'],['03','自动处理','OCR、翻译、转换与整理'],['04','质量检查','规则校验与人工复核'],['05','安全交付','下载结果或通过 API 获取']].map(x=><article key={x[0]}><span>{x[0]}</span><h3>{x[1]}</h3><p>{x[2]}</p></article>)}</div>
    </section>

    <section className="metrics"><article><b>150K+</b><span>已处理页面</span></article><article><b>30+</b><span>支持文件格式</span></article><article><b>12</b><span>支持语言</span></article><article><b>99.9%</b><span>平台可用性目标</span></article></section>

    <section id="pricing" className="section pricing-section">
      <div className="section-head"><span>PRICING</span><h2>从体验到企业部署</h2><p>选择适合当前业务量的方案，后续可随时升级。</p></div>
      <div className="pricing-grid">{plans.map((p,i)=><article className={i===1?'featured':''} key={p[0]}>{i===1&&<label>最受欢迎</label>}<h3>{p[0]}</h3><b>{p[1]}<small>{i<2?' / 月':''}</small></b><p>{p[2]}</p><button onClick={() => setPage('order')}>{i===2?'联系企业顾问':'开始使用'}</button><ul>{p[3].map(x=><li key={x}><Check/>{x}</li>)}</ul></article>)}</div>
    </section>

    <section className="cta"><div><span>READY TO AUTOMATE?</span><h2>把重复文档工作交给 AI</h2><p>从一个文件开始体验，再逐步接入整个企业工作流。</p></div><button onClick={() => setPage('order')}>免费开始 <ArrowRight/></button></section>
  </>
}

function OrderCenter({ files, addFiles, setFiles, totalSize, service, setService, form, setForm, submitOrder, submitting, result, error }) {
  return <main className="page-wrap">
    <div className="page-title"><span>AI PROCESSING CENTER</span><h1>智能文档处理中心</h1><p>上传文件并选择目标，系统会自动创建处理订单。</p></div>
    <form className="order-layout" onSubmit={submitOrder}>
      <section className="upload-panel">
        <label className="dropzone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();addFiles(e.dataTransfer.files)}}>
          <input type="file" multiple onChange={e=>addFiles(e.target.files)}/><CloudUpload/><h3>拖拽文件到这里，或点击选择</h3><p>支持 PDF、Word、Excel、PPT、CSV、图片和 ZIP，单文件最大 100MB</p>
        </label>
        {files.length>0 && <div className="queue"><div className="queue-head"><b>{files.length} 个文件 · {(totalSize/1024/1024).toFixed(2)} MB</b><button type="button" onClick={()=>setFiles([])}>清空</button></div>{files.map((f,i)=><div className="queue-file" key={`${f.name}-${i}`}><FileText/><span><b>{f.name}</b><small>{(f.size/1024/1024).toFixed(2)} MB</small></span><button type="button" onClick={()=>setFiles(files.filter((_,n)=>n!==i))}><X/></button></div>)}</div>}
      </section>
      <aside className="order-card">
        <h2>处理设置</h2>
        <div className="service-select">{[['ocr','OCR 与表格识别',ScanText],['translation','文档翻译',Languages],['conversion','格式转换',Workflow],['data_cleanup','数据清理',Sparkles]].map(([id,label,Icon])=><button type="button" className={service===id?'active':''} onClick={()=>setService(id)} key={id}><Icon/>{label}</button>)}</div>
        <label>姓名<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="请输入联系人姓名"/></label>
        <label>邮箱<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="name@company.com"/></label>
        <label>公司<input value={form.company} onChange={e=>setForm({...form,company:e.target.value})} placeholder="可选"/></label>
        <label>处理要求<textarea value={form.requirements} onChange={e=>setForm({...form,requirements:e.target.value})} placeholder="例如：翻译成越南语，保留表格版式，并输出 Excel…"/></label>
        {error && <div className="alert error">{error}</div>}
        {result && <div className="alert success"><CircleCheck/><div><b>订单创建成功</b><span>{result.order_number}</span></div></div>}
        <button className="submit-order" disabled={submitting}>{submitting?'正在提交…':'创建处理订单'} <ArrowRight/></button>
        <small className="secure-note"><ShieldCheck/> 文件采用独立订单空间保存</small>
      </aside>
    </form>
  </main>
}

function Dashboard() {
  const [tab, setTab] = useState('overview')
  const [toast, setToast] = useState('')
  const metrics=[['本月处理量','1,284 页','+18%',Gauge],['进行中任务','12 个','3 个需关注',Workflow],['团队成员','8 人','2 位管理员',Users],['API 调用','24,890 次','99.96% 成功',Code2]]
  const navItems=[['overview','概览',LayoutDashboard],['tasks','处理任务',Workflow],['orders','文档与订单',FileText],['team','团队成员',Users],['api','API 密钥',KeyRound],['billing','订阅与账单',CreditCard]]
  const notify=(text)=>{setToast(text);setTimeout(()=>setToast(''),2200)}
  return <main className="dashboard-page">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">DA</span><span><b>Enterprise</b><small>Workspace</small></span></div><nav>{navItems.map(([id,label,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon/>{label}</button>)}</nav><div className="sidebar-foot"><ShieldCheck/> Enterprise Plan</div></aside>
    <section className="dashboard-main">
      <div className="dash-head"><div><span>V10.5 ENTERPRISE WORKSPACE</span><h1>{tab==='overview'?'早上好，欢迎回来':navItems.find(x=>x[0]===tab)?.[1]}</h1><p>企业文档自动化的实时运行与管理中心。</p></div><button onClick={()=>notify('新任务面板已准备')}><Sparkles/> 创建新任务 <ArrowRight/></button></div>
      {tab==='overview' && <>
        <div className="metric-grid">{metrics.map(([t,v,s,Icon])=><article key={t}><div><span>{t}</span><Icon/></div><b>{v}</b><small>{s}</small></article>)}</div>
        <div className="dash-grid"><article className="activity-card"><div className="card-head"><div><h2>处理活动</h2><p>最近 7 天处理页面数</p></div><select><option>最近 7 天</option></select></div><div className="chart"><i style={{height:'42%'}}/><i style={{height:'56%'}}/><i style={{height:'49%'}}/><i style={{height:'72%'}}/><i style={{height:'64%'}}/><i style={{height:'88%'}}/><i style={{height:'76%'}}/></div><div className="chart-days"><span>周一</span><span>周二</span><span>周三</span><span>周四</span><span>周五</span><span>周六</span><span>周日</span></div></article>
        <article className="usage-card"><div className="card-head"><div><h2>套餐用量</h2><p>Enterprise 月度额度</p></div><Gauge/></div><div className="usage-ring"><div><b>64%</b><span>已使用</span></div></div><div className="usage-row"><span>6,420 / 10,000 页</span><b>剩余 3,580</b></div></article></div>
        <RecentTasks />
      </>}
      {tab==='tasks' && <ProcessingCenter notify={notify}/>} 
      {tab==='orders' && <RecentTasks expanded/>}
      {tab==='team' && <TeamPanel notify={notify}/>} 
      {tab==='api' && <ApiPanel notify={notify}/>} 
      {tab==='billing' && <BillingPanel notify={notify}/>} 
      {toast && <div className="toast"><CircleCheck/>{toast}</div>}
    </section>
  </main>
}

function RecentTasks({expanded=false}) {
  const rows=[['Supplier Contract.pdf','翻译 + OCR','86%','处理中'],['Finance_Report_Q2.xlsx','数据清理','100%','已完成'],['Machine_Manual.docx','多语言翻译','42%','处理中'],['Invoice_Batch.zip','OCR 提取','100%','已完成'],['Quality_Log.csv','数据校验','68%','处理中']]
  return <article className="recent-card"><div className="card-head"><div><h2>{expanded?'全部文档与订单':'最近任务'}</h2><p>最新文档处理状态</p></div><button>导出记录</button></div><div className="task-row header"><span>任务</span><span>类型</span><span>进度</span><span>状态</span></div>{rows.map((x,i)=><div className="task-row" key={x[0]}><span><FileText/><b>{x[0]}</b></span><span>{x[1]}</span><span><i><em style={{width:x[2]}}/></i>{x[2]}</span><span className={x[3]==='已完成'?'done':'processing'}>{x[3]}</span></div>)}</article>
}

function ProcessingCenter({notify}) {
  const jobs=[['Supplier Contract.pdf','AI 翻译',86,'预计 18 秒'],['Machine_Manual.docx','OCR + 版式恢复',42,'预计 1 分 06 秒'],['Invoice_Batch.zip','表格提取',100,'已完成']]
  return <div className="panel-stack"><article className="recent-card"><div className="card-head"><div><h2>AI Processing Center</h2><p>多任务队列、实时状态和错误重试</p></div><button onClick={()=>notify('已刷新任务状态')}>刷新状态</button></div>{jobs.map(([name,type,p,time])=><div className="job-card" key={name}><div><FileText/><span><b>{name}</b><small>{type}</small></span></div><div className="job-progress"><i><em style={{width:`${p}%`}}/></i><span>{p}%</span></div><small>{time}</small><button onClick={()=>notify(p===100?'文件已准备下载':'任务已暂停')}>{p===100?'下载':'暂停'}</button></div>)}</article></div>
}

function TeamPanel({notify}) {return <article className="recent-card"><div className="card-head"><div><h2>团队成员</h2><p>管理成员与工作区权限</p></div><button onClick={()=>notify('邀请链接已创建')}>邀请成员</button></div>{[['Lan Nguyen','Owner','在线'],['Operations Team','Admin','在线'],['Finance Reviewer','Reviewer','2 小时前']].map(x=><div className="member-row" key={x[0]}><span className="avatar">{x[0][0]}</span><div><b>{x[0]}</b><small>{x[1]}</small></div><span>{x[2]}</span><button>管理</button></div>)}</article>}
function ApiPanel({notify}) {return <article className="recent-card"><div className="card-head"><div><h2>API 密钥</h2><p>将文档处理接入企业系统</p></div><button onClick={()=>notify('新 API Key 已创建并仅显示一次')}>创建密钥</button></div><div className="api-key"><Code2/><div><b>Production API</b><small>da_live_••••••••••••9F2A</small></div><span>最近使用：今天</span><button>撤销</button></div></article>}
function BillingPanel({notify}) {return <div className="billing-grid"><article className="recent-card"><h2>Enterprise Plan</h2><p>10,000 页/月 · 8 个席位 · API 访问</p><b className="bill-price">$299<small>/月</small></b><button onClick={()=>notify('套餐管理页面已打开')}>管理套餐</button></article><article className="recent-card"><h2>本月账单</h2><p>下次结算日期：2026-08-01</p><b className="bill-price">$299</b><button onClick={()=>notify('发票已生成')}>下载发票</button></article></div>}

export default App
