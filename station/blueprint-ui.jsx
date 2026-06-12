// blueprint-ui.jsx — blueprint-styled HTML chrome + live data panels for Style A.

const BP = {
  page: '#08152c',
  card: 'linear-gradient(180deg, rgba(14,34,68,.55), rgba(8,21,44,.5))',
  cardSolid: 'rgba(10,26,52,.6)',
  border: '#1f5b9c',
  borderDim: 'rgba(31,91,156,.5)',
  line: '#41a6ff',
  accent: '#7cd4ff',
  label: '#cfe6ff',
  text: '#6fa8dc',
  textDim: '#43689a',
  mono: 'var(--font-mono)',
};
const SCOL = () => window.STATUS_COLOR;
const statusZh = (s) => s === 'warn' ? '警告' : s === 'standby' ? '備援' : s === 'fault' ? '故障' : '運轉';

function BPCard({ title, en, right, children, style, glow }) {
  return (
    <div style={{
      background: BP.card, border: `1px solid ${BP.borderDim}`, borderRadius: 10,
      boxShadow: glow ? '0 0 0 1px rgba(65,166,255,.12), inset 0 1px 0 rgba(124,212,255,.08)' : 'inset 0 1px 0 rgba(124,212,255,.06)',
      display: 'flex', flexDirection: 'column', minHeight: 0, ...style,
    }}>
      {(title || right) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 13px', borderBottom: `1px solid ${BP.borderDim}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
            {title && <span style={{ fontSize: 12.5, fontWeight: 700, color: BP.label, letterSpacing: .5, fontFamily: BP.mono, whiteSpace: 'nowrap' }}>{title}</span>}
            {en && <span style={{ fontSize: 9.5, color: BP.textDim, letterSpacing: 1, textTransform: 'uppercase' }}>{en}</span>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

// leader-dot row: label .... value
function BPRow({ label, value, vColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
      <span style={{ fontSize: 11, color: BP.text, whiteSpace: 'nowrap', fontFamily: BP.mono }}>{label}</span>
      <span style={{ flex: 1, borderBottom: `1px dashed ${BP.borderDim}`, marginBottom: 3 }} />
      <span style={{ fontSize: 11.5, color: vColor || BP.label, fontWeight: 700, fontFamily: BP.mono, whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

function BPStat({ label, value, unit, tone }) {
  return (
    <div style={{ background: 'rgba(8,21,44,.5)', border: `1px solid ${BP.borderDim}`, borderRadius: 7, padding: '8px 9px' }}>
      <div style={{ fontSize: 9.5, color: BP.textDim, letterSpacing: .3 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 3 }}>
        <span style={{ fontFamily: BP.mono, fontSize: 17, fontWeight: 700, color: tone || BP.label, lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: 9.5, color: BP.text }}>{unit}</span>}
      </div>
    </div>
  );
}

// ---- responsive viewport hook ---------------------------------------------
function useVP() {
  const read = () => (typeof window !== 'undefined' ? window.innerWidth : 1280);
  const [w, setW] = React.useState(read);
  React.useEffect(() => {
    const on = () => setW(read());
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => { window.removeEventListener('resize', on); window.removeEventListener('orientationchange', on); };
  }, []);
  return { width: w, isMobile: w < 760, isTablet: w >= 760 && w < 1140 };
}
window.useVP = useVP;

function BPIco({ name, s = 14 }) {
  const P = {
    overview: <><circle cx="12" cy="12" r="8.5" /><path d="M12 12l4-3M12 5v1.6" /></>,
    analysis: <><path d="M3 17l5-5 4 3 7-8" /><path d="M16 7h5v5" /></>,
    data: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.6 3.6 3 8 3s8-1.4 8-3V5M4 11v6c0 1.6 3.6 3 8 3s8-1.4 8-3v-6" /></>,
    reports: <><path d="M7 2h7l4 4v16H7z" /><path d="M14 2v5h5" /><path d="M10 12h5M10 16h5" /></>,
    ai: <><path d="M4 5h16v11H9l-4 4V5z" /><path d="M8 10h8M8 13h5" /></>,
    alerts: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" /><path d="M10 21a2 2 0 0 0 4 0" /></>,
    access: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></>,
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>{P[name]}</svg>;
}

// ---- header ----------------------------------------------------------------
function BPHeader({ clock, clockOnline, clockSyncedAt, summary, tab, setTab, mode, setMode }) {
  const vp = window.useVP ? window.useVP() : { isMobile: false, isTablet: false };
  const dot = (c) => <span style={{ width: 6, height: 6, borderRadius: 999, background: c, boxShadow: `0 0 6px ${c}`, display: 'inline-block' }} />;
  const modeToggle = (
    <div title="切換展示模式：實際＝僅真實資料、缺口標紅；模擬＝缺口以模擬值完整呈現" style={{ display: 'inline-flex', gap: 2, background: 'rgba(8,21,44,.7)', border: `1px solid ${mode === 'sim' ? '#c084fc' : BP.borderDim}`, borderRadius: 8, padding: 2, flexShrink: 0 }}>
      {[['actual', '實際'], ['sim', '模擬']].map(([k, lbl]) => (
        <button key={k} onClick={() => setMode && setMode(k)} style={{
          all: 'unset', cursor: 'pointer', padding: vp.isMobile ? '7px 13px' : '5px 12px', borderRadius: 6, fontSize: vp.isMobile ? 12 : 11.5, fontWeight: 700, fontFamily: BP.mono,
          color: mode === k ? '#06223f' : BP.text, background: mode === k ? (k === 'sim' ? '#c084fc' : BP.accent) : 'transparent', whiteSpace: 'nowrap',
        }}>{lbl}</button>
      ))}
    </div>
  );
  const tabs = [['overview', '監控總覽'], ['analysis', '節能分析'], ['data', '資料整合'], ['reports', '報表'], ['ai', 'AI 助理'], ['alerts', 'AI 操作建議'], ['access', '權限設定']];
  const tabsRef = React.useRef(null);
  React.useEffect(() => {
    const c = tabsRef.current; if (!c) return;
    const el = c.querySelector('[data-tab="' + tab + '"]');
    if (el) { const target = el.offsetLeft - c.clientWidth / 2 + el.clientWidth / 2; c.scrollTo({ left: Math.max(0, target), behavior: 'smooth' }); }
  }, [tab]);
  const tabStrip = (
    <div ref={tabsRef} className="bp-tabs" style={{ display: 'flex', gap: 3, background: 'rgba(8,21,44,.6)', border: `1px solid ${BP.borderDim}`, borderRadius: 8, padding: 3, overflowX: 'auto', minWidth: 0 }}>
      {tabs.map(([k, lbl]) => (
        <button key={k} data-tab={k} onClick={() => setTab(k)} style={{
          all: 'unset', cursor: 'pointer', padding: vp.isMobile ? '8px 13px' : '6px 11px', borderRadius: 6, fontSize: vp.isMobile ? 12.5 : 11.5, fontWeight: 600,
          color: tab === k ? '#06223f' : BP.text, background: tab === k ? BP.accent : 'transparent', fontFamily: BP.mono, whiteSpace: 'nowrap', flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}><BPIco name={k} s={vp.isMobile ? 15 : 14} />{lbl}</button>
      ))}
    </div>
  );
  if (vp.isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '9px 12px', background: 'rgba(8,18,38,.94)', borderBottom: `1px solid ${BP.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="app/assets/NHR_Logo.png" alt="NHR" style={{ height: 18 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: BP.label, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{window.STATION.name} <span style={{ fontFamily: BP.mono, fontSize: 10, color: BP.accent }}>{window.STATION.code}</span></div>
            <div style={{ fontSize: 9.5, color: BP.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{window.STATION.section}</div>
          </div>
          <span title={clockOnline ? ('已與網路校時' + (clockSyncedAt ? '（' + clockSyncedAt + '）' : '')) : ('離線·使用裝置時間' + (clockSyncedAt ? '，最後校時 ' + clockSyncedAt : ''))} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: BP.mono, fontSize: 9.5, color: clockOnline ? '#22C55E' : '#F59E0B', whiteSpace: 'nowrap' }}>{dot(clockOnline ? '#22C55E' : '#F59E0B')} {clockOnline ? '已校時' : '離線'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{modeToggle}<div style={{ flex: 1, position: 'relative', minWidth: 0 }}>{tabStrip}<div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 26, borderRadius: '0 8px 8px 0', background: 'linear-gradient(90deg, rgba(8,18,38,0), rgba(8,18,38,.96))', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 3, color: BP.accent, fontSize: 13 }}>›</div></div></div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', height: 54, background: 'rgba(8,18,38,.85)', borderBottom: `1px solid ${BP.border}`, flexShrink: 0, overflow: 'hidden' }}>
      <img src="app/assets/NHR_Logo.png" alt="NHR" style={{ height: 22, flexShrink: 0 }} />
      <div style={{ width: 1, height: 26, background: BP.borderDim, flexShrink: 0 }} />
      <div style={{ minWidth: 0, flexShrink: 0, maxWidth: vp.width < 1200 ? 150 : 240 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: BP.label, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{window.STATION.name}
          <span style={{ fontFamily: BP.mono, fontSize: 11, color: BP.accent, marginLeft: 8 }}>{window.STATION.code}</span>
        </div>
        <div style={{ display: vp.width < 1340 ? 'none' : 'block', fontSize: 10.5, color: BP.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{window.STATION.district} · <span style={{ color: BP.accent }}>{window.STATION.section}</span></div>
      </div>
      <div style={{ marginLeft: 2, minWidth: 0, flex: 1 }}>{tabStrip}</div>
      {modeToggle}
      <div title={clockOnline ? ('已與網路校時' + (clockSyncedAt ? '（' + clockSyncedAt + '）' : '')) : ('離線·使用裝置時間' + (clockSyncedAt ? '，最後校時 ' + clockSyncedAt : ''))} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: BP.mono, fontSize: 9.5, color: clockOnline ? '#22C55E' : '#F59E0B' }}>{dot(clockOnline ? '#22C55E' : '#F59E0B')}{clockOnline ? '已校時' : '離線'}</span>
        {vp.width >= 1160 && <span style={{ fontFamily: BP.mono, fontSize: 12, color: BP.label, whiteSpace: 'nowrap' }}>{vp.width < 1380 ? clock.split('|')[1] : clock}</span>}
      </div>
    </div>
  );
}

// ---- data-tier badge -------------------------------------------------------
function Tier({ k }) {
  const map = {
    live: ['即時SCADA', '#22D3EE', 'rgba(34,211,238,.14)'],
    model: ['模型推估', '#a78bfa', 'rgba(167,139,250,.16)'],
    gap: ['需取得', '#EF4444', 'rgba(239,68,68,.12)'],
    bill: ['台電帳單', '#7cd4ff', 'rgba(124,212,255,.14)'],
    spec: ['出廠規格', '#6fa8dc', 'rgba(31,91,156,.18)'],
    sim: ['模擬值', '#c084fc', 'rgba(192,132,252,.18)'],
    plan: ['規劃導入', '#F59E0B', 'rgba(245,158,11,.16)'],
  };
  const [t, c, bg] = map[k] || map.model;
  return <span style={{ fontFamily: BP.mono, fontSize: 8.5, fontWeight: 700, color: c, background: bg, padding: '1px 5px', borderRadius: 4, letterSpacing: .3, whiteSpace: 'nowrap', border: k === 'gap' ? `1px dashed ${c}` : 'none' }}>{t}</span>;
}

// ---- KPI card with hover tooltip ------------------------------------------
function KpiCard({ label, value, unit, color, foot, foot2, tier, tip, pill }) {
  const [hov, setHov] = React.useState(false);
  return (
    <BPCard style={{ padding: '10px 13px', position: 'relative', overflow: 'visible' }}>
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        onClick={() => setHov(h => !h)} style={{ cursor: 'help' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11.5, color: BP.label, fontWeight: 600 }}>{label}</span>
          <span style={{ width: 13, height: 13, borderRadius: 999, border: `1px solid ${BP.borderDim}`, color: BP.textDim, fontSize: 9, fontFamily: BP.mono, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>ⓘ</span>
          {tier && <span style={{ marginLeft: 'auto' }}><Tier k={tier} /></span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
          <span style={{ fontFamily: BP.mono, fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
          <span style={{ fontSize: 11, color: BP.text }}>{unit}</span>
          {pill && <span style={{ marginLeft: 'auto', fontFamily: BP.mono, fontSize: 10.5, fontWeight: 700, color: '#22C55E', background: 'rgba(34,197,94,.14)', borderRadius: 5, padding: '2px 7px', whiteSpace: 'nowrap' }}>{pill}</span>}
        </div>
        <div style={{ fontSize: 9.5, color: BP.textDim, marginTop: 5 }}>{foot}</div>
        {foot2 && <div style={{ fontSize: 9.5, color: BP.textDim, marginTop: 2 }}>{foot2}</div>}
      </div>
      {hov && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 40,
          background: 'rgba(6,16,34,.98)', border: `1px solid ${BP.border}`, borderRadius: 9,
          boxShadow: '0 14px 34px rgba(0,0,0,.55)', padding: '10px 12px', fontSize: 11, color: BP.label, lineHeight: 1.6 }}>
          <span style={{ fontFamily: BP.mono, fontSize: 9.5, color: BP.accent, letterSpacing: .5 }}>{label} · 說明</span>
          <div style={{ marginTop: 4, color: BP.text }}>{tip}</div>
        </div>
      )}
    </BPCard>
  );
}

// ---- KPI strip (real station numbers, honestly tiered) ---------------------
function BPKpiStrip({ summary }) {
  const vp = window.useVP ? window.useVP() : { isMobile: false, isTablet: false };
  const w = (n) => '$' + (n / 10000).toFixed(1) + '萬';
  const cards = [
    { label: '單位電耗 · 台電', value: summary.se_tp_now.toFixed(3), unit: 'kWh/m³', color: '#22C55E', foot: '4月 0.383 → 5月 0.343', tier: 'bill',
      tip: '每生產 1 m³ 水所耗的電（度）。此為台電帳單口徑：當月總用電 ÷ 總出水量。5月 0.343＝改善後實測，數字越低越省電。' },
    { label: '模型 · 改善後', value: summary.se_model_after.toFixed(3), unit: 'kWh/m³', color: BP.accent, foot: `vs 基準 ${summary.se_base}（−${summary.saving_pct}%）`, tier: 'model',
      tip: '節能模型預測「改善後」運轉策略的單位電耗。由 4 台泵的現場效能曲線，推算各時段最省的開機組合與頻率，再以日／夜水量加權得出 0.400 kWh/m³。' },
    { label: '即時總用電', value: summary.total_power.toLocaleString(), unit: 'kW', color: BP.label, foot: `${summary.running} 台運轉 · 現場曲線推估`, tier: 'model',
      tip: '目前運轉中各泵的用電功率合計（kW）。單泵功率由「即時頻率＋現場效能曲線」推估——本站尚無單泵電表，故為模型推估值，非單泵實測。' },
    { label: '節能率 vs 基準', value: summary.saving_pct.toFixed(1), unit: '%', color: '#22C55E', foot: '改善前 → 改善後 · 加權', tier: 'model',
      tip: '改善後相對「改善前」的省電百分比。基準（改善前）＝固定 60Hz 的舊運轉策略，單位電耗 0.444；改善後加權 0.400，省 9.9%。與台電帳單 5 月實際降幅約 10% 方向一致。' },
    { label: '電費節省 · 估算', value: w(summary.month_bill_save), unit: '/月', color: '#7cd4ff', pill: `↓${summary.month_bill_pct}% 較上月`, foot: `上月 ${w(summary.month_cost_prev)} → 本月 ${w(summary.month_cost_now)}`, foot2: `年估省 ${w(summary.annual_cost_saved)} · ${summary.annual_co2_saved} 噸 CO₂`, tier: null,
      tip: `電費＝用電度數 × 混合電價（約 ${summary.tariff_blended} 元/度，估算）。月省＝本月電費較上月減少額（5月用電 ${summary.month_kwh_tp.toLocaleString()} 度 vs 4月 ${summary.month_kwh_prev.toLocaleString()} 度，用水量還增加）。年估＝單位電耗降幅 × 年出水量推估。確切金額以台電帳單時段電價與契約容量為準。` },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? 'repeat(2,1fr)' : vp.isTablet ? 'repeat(3,1fr)' : 'repeat(5,1fr)', gap: vp.isMobile ? 8 : 10 }}>
      {cards.map((c, i) => <KpiCard key={i} {...c} />)}
    </div>
  );
}

// ---- motor list ------------------------------------------------------------
function BPMotorList({ motors, selectedId, onSelect }) {
  return (
    <BPCard title="機組清單" en="Pump Units" right={<span style={{ fontFamily: BP.mono, fontSize: 11, color: BP.text }}>{motors.filter(m => m.status !== 'standby').length}/{motors.length} 運轉</span>}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {motors.map((m) => {
          const sel = m.id === selectedId; const col = SCOL()[m.status];
          return (
            <button key={m.id} onClick={() => onSelect(m.id)} style={{
              all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 13px',
              borderBottom: `1px solid ${BP.borderDim}`, background: sel ? 'rgba(65,166,255,.12)' : 'transparent',
              borderLeft: `2px solid ${sel ? BP.accent : 'transparent'}`,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: col, boxShadow: `0 0 6px ${col}` }} />
              <span style={{ fontFamily: BP.mono, fontSize: 12.5, fontWeight: 700, color: BP.label, width: 52 }}>{m.id}</span>
              <span style={{ fontSize: 11.5, color: BP.text, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
              <span style={{ fontFamily: BP.mono, fontSize: 12, color: m.status === 'standby' ? BP.textDim : BP.accent }}>{m.status === 'standby' ? '—' : `${m.power_kw} kW`}</span>
              <span style={{ fontFamily: BP.mono, fontSize: 11, color: col, width: 32, textAlign: 'right' }}>{statusZh(m.status)}</span>
            </button>
          );
        })}
      </div>
    </BPCard>
  );
}

// ---- selected motor: model-estimated readouts + nameplate + data gaps ------
function BPMotorDetail({ motor, mode }) {
  if (!motor) return null;
  const sim = mode === 'sim';
  const col = SCOL()[motor.status];
  const running = motor.status !== 'standby';
  const np = motor.np || {};
  const sd = motor.sim || {};
  // [label, value, unit, color, tier]
  const stats = running ? [
    ['VFD 頻率', motor.freq, 'Hz', BP.accent, 'live'],
    ['用電功率', motor.power_kw.toLocaleString(), 'kW', BP.label, 'model'],
    ['出水量', motor.flow_cmd.toLocaleString(), 'CMD', BP.label, 'model'],
    ['軸馬力', motor.bhp, 'HP', BP.label, 'model'],
    ['出口揚程', motor.head_m, 'm', BP.label, 'model'],
    ['泵效率', motor.eff_pct, '%', motor.eff_pct >= 65 ? '#22C55E' : '#F59E0B', 'model'],
    ['噸水電耗', motor.sec_kwh_m3, 'kWh/m³', '#22C55E', 'model'],
    ['改善前基準', motor.baseline_kw, 'kW', '#F59E0B', 'model'],
  ] : [
    ['狀態', '備用待命', '', BP.text, null],
    ['角色', motor.role, '', BP.label, null],
    ['現場 vs 出廠', motor.fieldStatus, '', '#F59E0B', null],
  ];

  return (
    <BPCard title={`機組數據 · ${motor.id}`} en="Telemetry" glow
      right={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: BP.mono, color: col }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: col, boxShadow: `0 0 6px ${col}` }} />{statusZh(motor.status)} · {motor.hp}HP {motor.pipe}</span>}>
      <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: 'rgba(8,21,44,.5)', border: `1px solid ${BP.borderDim}`, borderRadius: 7, padding: '8px 9px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 9.5, color: BP.textDim, letterSpacing: .3 }}>{s[0]}</span>
              {s[4] && <span style={{ marginLeft: 'auto' }}><Tier k={s[4]} /></span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 3 }}>
              <span style={{ fontFamily: BP.mono, fontSize: s[2] ? 16 : 13, fontWeight: 700, color: s[3], lineHeight: 1.15 }}>{s[1]}</span>
              {s[2] && <span style={{ fontSize: 9.5, color: BP.text }}>{s[2]}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* single-pump sensors — IDENTICAL layout in both modes.
          sim: simulated value; actual: red "待串接新數據端口" placeholder. */}
      {(() => {
        const F = running ? [
          { l: '電表功率', v: sd.meter_kw, u: 'kW', port: '單泵電表' },
          { l: '實測流量', v: (sd.meter_flow || 0).toLocaleString(), u: 'CMD', port: '單泵流量計' },
          { l: '電表單位電耗', v: sd.meter_sec, u: '', port: '電表＋流量計' },
          { l: '電流', v: sd.current_a, u: 'A', port: '單泵電表' },
          { l: '驅動端軸溫', v: sd.bearing_drv, u: '°C', port: '軸溫感測器', warn: sd.bearing_drv >= 70 },
          { l: '非驅動端軸溫', v: sd.bearing_nondrv, u: '°C', port: '軸溫感測器', warn: sd.bearing_nondrv >= 70 },
          { l: '振動', v: sd.vib_mm_s, u: 'mm/s', port: '振動感測器', warn: sd.vib_mm_s >= 4 },
          { l: '繞組溫度', v: sd.winding_c, u: '°C', port: '繞組 RTD' },
          { l: '累計運轉', v: (sd.runtime_h || 0).toLocaleString(), u: 'h', port: 'VFD / SCADA' },
        ] : [
          { l: '驅動端軸溫', v: sd.bearing_drv, u: '°C', port: '軸溫感測器' },
          { l: '振動', v: sd.vib_mm_s, u: 'mm/s', port: '振動感測器' },
          { l: '累計運轉', v: (sd.runtime_h || 0).toLocaleString(), u: 'h', port: 'VFD / SCADA' },
        ];
        const bd = sim ? 'rgba(192,132,252,.45)' : 'rgba(239,68,68,.45)';
        const bg = sim ? 'rgba(192,132,252,.06)' : 'rgba(239,68,68,.05)';
        return (
          <div style={{ margin: '0 12px 10px', borderRadius: 8, border: `1px ${sim ? 'solid' : 'dashed'} ${bd}`, background: bg, padding: '9px 11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
              <span style={{ fontFamily: BP.mono, fontSize: 10, fontWeight: 700, color: sim ? '#c084fc' : '#EF4444', letterSpacing: .4 }}>{sim ? '單泵實測（裝錶後 · 模擬值）' : '🔌 單泵實測 · 待串接新數據端口'}</span>
              <span style={{ marginLeft: 'auto' }}><Tier k={sim ? 'sim' : 'gap'} /></span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7 }}>
              {F.map((r, i) => (
                <div key={i} style={{ background: 'rgba(8,21,44,.5)', border: `1px ${sim ? 'solid' : 'dashed'} ${sim ? 'rgba(192,132,252,.25)' : 'rgba(239,68,68,.35)'}`, borderRadius: 6, padding: '6px 8px' }}>
                  <div style={{ fontSize: 9, color: BP.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.l}</div>
                  {sim ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginTop: 2 }}>
                      <span style={{ fontFamily: BP.mono, fontSize: 13.5, fontWeight: 700, color: r.warn ? '#F59E0B' : BP.label }}>{r.v}</span>
                      {r.u && <span style={{ fontSize: 9, color: BP.text }}>{r.u}</span>}
                    </div>
                  ) : (
                    <div style={{ marginTop: 3 }}>
                      <span style={{ fontFamily: BP.mono, fontSize: 11, fontWeight: 700, color: '#EF4444' }}>待串接</span>
                      <div style={{ fontFamily: BP.mono, fontSize: 8.5, color: BP.textDim, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>← {r.port}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 9.5, color: BP.textDim, marginTop: 7, lineHeight: 1.4 }}>
              {sim
                ? '※ 模擬模式：以上為「裝設單泵電表＋流量計＋感測器後」之完整樣貌（模擬值），供展示。'
                : '※ 實際模式：欄位與模擬模式一致；標「待串接」者目前無數據來源，需串接對應端口（單泵電表／流量計／感測器）後自動帶值。'}
            </div>
          </div>
        );
      })()}

      {/* nameplate (factory spec, static reference) */}
      <div style={{ margin: '0 12px 12px', borderRadius: 8, border: `1px solid ${BP.borderDim}`, background: 'rgba(8,21,44,.4)', padding: '9px 11px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontFamily: BP.mono, fontSize: 10, fontWeight: 700, color: BP.text, letterSpacing: .4 }}>出廠銘牌 / 額定</span>
          <span style={{ marginLeft: 'auto' }}><Tier k="spec" /></span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 14px' }}>
          {[['滿載效率', np.fullEff + '%'], ['滿載電流', np.fullAmp + ' A'], ['功因', np.pf + '%'], ['電壓', np.volt + ' V'],
            ['額定揚程', np.ratedH + ' m'], ['額定出水', (np.ratedQ || 0).toLocaleString() + ' CMD']].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, padding: '2px 0' }}>
              <span style={{ color: BP.textDim }}>{r[0]}</span><span style={{ fontFamily: BP.mono, color: BP.label }}>{r[1]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* role rationale */}
      <div style={{ margin: '0 12px 12px', borderRadius: 9, border: `1px solid ${motor.statusType === 'ok' ? 'rgba(34,197,94,.4)' : 'rgba(245,158,11,.4)'}`, background: motor.statusType === 'ok' ? 'rgba(34,197,94,.07)' : 'rgba(245,158,11,.07)', padding: '11px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: motor.statusType === 'ok' ? '#22C55E' : '#F59E0B' }} />
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: .5, color: motor.statusType === 'ok' ? '#22C55E' : '#F59E0B', fontFamily: BP.mono }}>選泵角色 · {motor.role}</span>
        </div>
        <div style={{ fontSize: 12, color: BP.label, lineHeight: 1.55 }}>{roleRationale(motor)}</div>
      </div>
    </BPCard>
  );
}
function roleRationale(m) {
  if (m.fid === 'P1_150HP') return '現場較出廠衰退 −2,539 CMD，已列備用（P1）；日間高流量改以效率較佳的 P2@55Hz 取代，避免動用 P1。';
  if (m.fid === 'P2_150HP') return '150HP 兩台中效率較佳者（P2），作日間保底 55Hz。需求跨過 2,600 CMD 時 150HP 優先選 P2；45Hz 以下效率極低，勿作低流量調速主機。';
  if (m.fid === 'P3_100HP') return '100HP 現場健康（+128 CMD），峰值效率約 70.2% @57Hz，作夜間主底與全天主力（P3）。夜間 57/60Hz 待廠商確認後定版。';
  if (m.fid === 'P4_100HP') return '100HP 現場健康（+181 CMD），低流量區效率最佳（約 70.3% @48Hz），作夜間輔助 51Hz（P4）、依配水池水位投入。';
  return '依現場曲線與選泵法則配置運轉角色。';
}

// ---- shared: current "本時段最省調度建議" (live solver, single source) -----
window.liveDispatchRec = function (motors, clock) {
  if (!window.solve || !window.DATA || !window.TARIFF) return null;
  const mt = (clock || '').match(/(\d{2}):(\d{2}):/);
  const hour = mt ? +mt[1] : 14;
  const TOU = [
    { k: '離峰', rate: window.TARIFF.offpeak, demand: 5000, time: '00–09' },
    { k: '半尖峰', rate: window.TARIFF.halfpeak, demand: 10000, time: '09–16 / 22–24' },
    { k: '尖峰', rate: window.TARIFF.peak, demand: 13300, time: '16–22' },
  ];
  const pIdx = hour < 9 ? 0 : (hour >= 16 && hour < 22 ? 2 : 1);
  const per = TOU[pIdx];
  const rec = window.solve(per.demand, false);
  const running = motors.filter(x => x.status !== 'standby');
  const curKW = Math.round(running.reduce((s, x) => s + x.power_kw, 0));
  const curCfg = {}; running.forEach(x => curCfg[x.fid] = x.freq);
  const same = Object.keys(rec.sel).length === Object.keys(curCfg).length && Object.keys(rec.sel).every(k => curCfg[k] === rec.sel[k]);
  const recList = window.DATA.order.filter(k => rec.sel[k]).map(k => window.DATA.meta[k].label.split(' ')[1] + '@' + rec.sel[k] + 'Hz').join(' ＋ ');
  const saveKW = Math.max(0, curKW - rec.kW);
  const savePct = curKW ? +(saveKW / curKW * 100).toFixed(1) : 0;
  return {
    id: 'R-LIVE', level: 'info', dev: '本時段調度', t: per.k + '時段', status: same ? '已最佳' : '待處理', kind: 'dispatch', live: true, win: per.k + ' ' + per.time + ' 時', gen: '即時 · 隨時段更新',
    title: '本時段最省調度建議 · ' + per.k,
    detail: '目前為台電' + per.k + '（電價 ' + per.rate.toFixed(2) + ' 元/度，' + per.time + ' 時）。依現場曲線窮舉，最省組合為 ' + recList + '，約 ' + rec.kW.toLocaleString() + ' kW、SEC ' + rec.SE + '。' + (same ? '目前已是最佳調度，無需調整。' : '較目前運轉約可省 ' + saveKW.toLocaleString() + ' kW（約 ' + savePct + '%）。'),
    recList, kW: rec.kW, SE: rec.SE, same, period: per.k, rate: per.rate,
    cfg: same ? null : rec.sel, action: '—', save: savePct, savekw: saveKW,
    steps: same ? [] : ['將各泵調整為：' + recList, '調整後確認配水池水位與母管壓力維持正常', '完成後於下方勾選，並可回報實際結果供系統比對'],
  };
};

// ---- station action bar: status + TOU period + recommended dispatch -------
function StationActionBar({ motors, summary, clock, onAdjust }) {
  const vp = window.useVP ? window.useVP() : { isMobile: false };
  const mt = (clock || '').match(/(\d{2}):(\d{2}):/);
  const hour = mt ? +mt[1] : 14;
  const TOU = [
    { k: '離峰', rate: window.TARIFF.offpeak, demand: 5000, time: '00–09' },
    { k: '半尖峰', rate: window.TARIFF.halfpeak, demand: 10000, time: '09–16 / 22–24' },
    { k: '尖峰', rate: window.TARIFF.peak, demand: 13300, time: '16–22' },
  ];
  const pIdx = hour < 9 ? 0 : (hour >= 16 && hour < 22 ? 2 : 1);
  const per = TOU[pIdx];
  const rec = window.solve(per.demand, false);
  const running = motors.filter(x => x.status !== 'standby');
  const curKW = Math.round(running.reduce((s, x) => s + x.power_kw, 0));
  const curQ = running.reduce((s, x) => s + x.flow_cmd, 0);
  const curSEC = curQ ? +(24 * curKW / curQ).toFixed(3) : 0;
  const curCfg = {}; running.forEach(x => curCfg[x.fid] = x.freq);
  const same = Object.keys(rec.sel).length === Object.keys(curCfg).length && Object.keys(rec.sel).every(k => curCfg[k] === rec.sel[k]);
  const recList = window.DATA.order.filter(k => rec.sel[k]).map(k => window.DATA.meta[k].label.split(' ')[1] + '@' + rec.sel[k] + 'Hz').join(' ＋ ');
  const saveKW = Math.max(0, curKW - rec.kW);
  const good = summary.se_tp_now <= 0.42;
  const pc = pIdx === 2 ? '#EF4444' : pIdx === 1 ? '#F59E0B' : '#22C55E';
  const zone = (children, grow) => <div style={{ flex: grow ? '1 1 240px' : '0 0 auto', minWidth: 0, padding: vp.isMobile ? '10px 12px' : '11px 16px', borderRight: vp.isMobile ? 'none' : `1px solid ${BP.borderDim}`, borderBottom: vp.isMobile ? `1px solid ${BP.borderDim}` : 'none' }}>{children}</div>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', background: BP.card, border: `1px solid ${good ? 'rgba(34,197,94,.4)' : 'rgba(245,158,11,.45)'}`, borderRadius: 11, boxShadow: 'inset 0 1px 0 rgba(124,212,255,.06)', overflow: 'hidden' }}>
      {/* status */}
      {zone(<>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: good ? '#22C55E' : '#F59E0B', boxShadow: `0 0 8px ${good ? '#22C55E' : '#F59E0B'}` }} className="md-pulse" />
          <span style={{ fontSize: 14, fontWeight: 700, color: BP.label }}>{good ? '運轉正常 · 節能達標' : '效能需檢視'}</span>
        </div>
        <div style={{ fontSize: 11.5, color: BP.text, marginTop: 5, fontFamily: BP.mono }}>單位電耗 <b style={{ color: good ? '#22C55E' : '#F59E0B' }}>{curSEC}</b> · 較基準省 <b style={{ color: '#22C55E' }}>{summary.saving_pct}%</b> · 目標 ≤ 0.42</div>
      </>, true)}
      {/* TOU period */}
      {zone(<>
        <div style={{ fontSize: 10, color: BP.textDim, fontFamily: BP.mono, letterSpacing: .5 }}>目前台電時段</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: pc, fontFamily: BP.mono }}>{per.k}</span>
          <span style={{ fontFamily: BP.mono, fontSize: 13, fontWeight: 700, color: BP.label }}>{per.rate.toFixed(2)}<span style={{ fontSize: 10, color: BP.text }}> 元/度</span></span>
        </div>
        <div style={{ fontSize: 10, color: BP.textDim, marginTop: 3, fontFamily: BP.mono }}>{per.time} 時</div>
      </>)}
      {/* recommendation + adjustment checklist */}
      {zone(<div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 10, color: BP.textDim, fontFamily: BP.mono, letterSpacing: .5 }}>本時段最省調度建議</div>
          <span style={{ fontFamily: BP.mono, fontSize: 9, color: BP.accent, background: 'rgba(65,166,255,.12)', border: `1px solid ${BP.borderDim}`, borderRadius: 4, padding: '1px 6px' }}>同步至 AI 操作建議</span>
        </div>
        {same ? (
          <div style={{ fontSize: 13, color: '#22C55E', fontWeight: 700, marginTop: 4 }}>✓ 目前已是最佳調度</div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: BP.label, margin: '4px 0 7px', lineHeight: 1.4 }}><b style={{ fontFamily: BP.mono, color: BP.accent }}>{recList}</b><span style={{ fontFamily: BP.mono, color: BP.text, fontSize: 10.5 }}> · {rec.kW.toLocaleString()} kW · SEC {rec.SE}</span></div>
            <window.AdjustChecklist cfg={rec.sel} motors={motors} onDone={onAdjust} compact />
          </>
        )}
        <window.FeedbackBox rec={{ id: 'R-LIVE', title: '本時段最省調度建議 · ' + per.k, save: saveKW && curKW ? +(saveKW / curKW * 100).toFixed(1) : 0 }} />
      </div>, true)}
    </div>
  );
}

// ---- HERO: platform core value (supply → pre/post energy → savings) --------
function HeroCore() {
  const vp = window.useVP ? window.useVP() : { isMobile: false };
  const M = (window.DATA && window.DATA.monthly) || [];
  const sum = (a, f) => a.reduce((s, x) => s + (f(x) || 0), 0);
  const bef = M.filter(x => x.phase === '改善前'), aft = M.filter(x => x.phase === '改善後');
  const bVol = sum(bef, x => x.flow) || 1, bSec = sum(bef, x => x.kwh_tp) / bVol;
  const aVol = sum(aft, x => x.flow) || 1, aSec = sum(aft, x => x.kwh_tp) / aVol;
  const CO2 = (window.DATA && window.DATA.tariff && window.DATA.tariff.co2) || 0.467;
  const blended = (window.DATA && window.DATA.tariff) ? (window.DATA.tariff.peak * .25 + window.DATA.tariff.halfpeak * .35 + window.DATA.tariff.offpeak * .40) : 5.0;
  const SC = { '今日': { m: 1 / 30, lab: '今日預估供水', sav: '每日可省', cu: '/日' }, '週': { m: 12 / 52, lab: '週供水量', sav: '每週可省', cu: '/週' }, '月': { m: 1, lab: '月供水量', sav: '每月可省', cu: '/月' }, '年': { m: 12, lab: '年供水量', sav: '每年可省', cu: '/年' } };
  const [hscale, setHscale] = React.useState('年');
  const sc = SC[hscale];
  const Qy = Math.round(aVol * sc.m);                 // 供水量 @尺度
  const eB = Qy * bSec, eA = Qy * aSec, save = eB - eA, pct = eB ? save / eB * 100 : 0;
  const costY = Math.round(save * blended), co2Y = save * CO2 / 1000;
  const big = n => n >= 100000 ? [(n / 10000).toLocaleString('en-US', { maximumFractionDigits: 1 }), '萬 '] : [Math.round(n).toLocaleString(), ''];
  const k = n => (n / 10000).toLocaleString('en-US', { maximumFractionDigits: 1 });
  const Icon = ({ d, c, fill }) => <svg width="26" height="26" viewBox="0 0 24 24" fill={fill ? c : 'none'} stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
  const DROP = 'M12 2.7c0 0 6 6.4 6 10.3a6 6 0 0 1-12 0c0-3.9 6-10.3 6-10.3z';
  const BOLT = 'M13 2 4 14h7l-1 8 9-12h-7l1-8z';
  const LEAF = 'M11 20A7 7 0 0 1 4 13c0-5 6-9 14-9 0 8-4 14-9 14a4 4 0 0 1-4-4c5 0 8-3 8-8';
  const SAVE = 'M3 17l6-6 4 4 7-8M21 7v5M21 7h-5';

  const stage = (icon, ic, lab, val, unit, vc) => (
    <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 38, height: 38, borderRadius: 10, background: `${ic}1f`, border: `1px solid ${ic}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
        <span style={{ fontSize: 12, color: BP.text, fontWeight: 600 }}>{lab}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontFamily: BP.mono, fontSize: vp.isMobile ? 24 : 30, fontWeight: 800, color: vc, lineHeight: 1 }}>{val}</span>
        <span style={{ fontSize: 11, color: BP.text }}>{unit}</span>
      </div>
    </div>
  );
  const arrow = <div style={{ flex: '0 0 auto', alignSelf: 'center', color: BP.accent, fontSize: 22, opacity: .8 }}>→</div>;

  return (
    <div style={{ flexShrink: 0, position: 'relative', borderRadius: 14, overflow: 'hidden', border: `1px solid ${BP.border}`, background: 'linear-gradient(115deg, rgba(124,212,255,.10) 0%, rgba(8,21,44,.7) 42%, rgba(34,197,94,.10) 100%)', boxShadow: 'inset 0 1px 0 rgba(124,212,255,.12)' }}>
      <div style={{ display: 'flex', flexDirection: vp.isMobile ? 'column' : 'row', alignItems: vp.isMobile ? 'flex-start' : 'stretch', gap: vp.isMobile ? 14 : 22, padding: vp.isMobile ? '16px 16px' : '18px 22px' }}>
        {/* left: headline */}
        <div style={{ flex: '0 0 auto', maxWidth: vp.isMobile ? '100%' : 236, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: BP.mono, fontSize: 10.5, fontWeight: 700, color: BP.accent, letterSpacing: 1.2 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: '#22C55E', boxShadow: '0 0 7px #22C55E' }} className="md-pulse" />平台核心 · CORE VALUE
          </div>
          <div style={{ fontSize: vp.isMobile ? 21 : 25, fontWeight: 800, color: BP.label, lineHeight: 1.25, marginTop: 9 }}>同樣供水量，<span style={{ color: '#22C55E' }}>更省電</span></div>
          <div style={{ fontSize: 12, color: BP.text, marginTop: 7, lineHeight: 1.55 }}>結合泵浦效率曲線，找最節能運轉點，以實際帳單驗證省電。</div>
          <div style={{ display: 'inline-flex', gap: 2, marginTop: 11, background: 'rgba(8,21,44,.6)', borderRadius: 7, padding: 2, border: `1px solid ${BP.borderDim}`, alignSelf: 'flex-start' }}>
            {['今日', '週', '月', '年'].map(s => <button key={s} onClick={() => setHscale(s)} style={{ all: 'unset', cursor: 'pointer', padding: '4px 11px', borderRadius: 5, fontFamily: BP.mono, fontSize: 11.5, fontWeight: 700, color: hscale === s ? '#06223f' : BP.text, background: hscale === s ? BP.accent : 'transparent' }}>{s}</button>)}
          </div>
        </div>

        {/* right: flow drop → pre → post → save */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'stretch', gap: vp.isMobile ? 10 : 14, background: 'rgba(6,18,38,.5)', border: `1px solid ${BP.borderDim}`, borderRadius: 12, padding: vp.isMobile ? '12px 13px' : '14px 18px', flexWrap: vp.isMobile ? 'wrap' : 'nowrap' }}>
          {stage(<Icon d={DROP} c={BP.accent} />, BP.accent, sc.lab, big(Qy)[0], big(Qy)[1] + 'm³', BP.label)}
          {arrow}
          {stage(<Icon d={BOLT} c="#ef6461" />, '#ef6461', '優化前用電', big(eB)[0], big(eB)[1] + 'kWh', '#ef6461')}
          {arrow}
          {stage(<Icon d={LEAF} c="#22C55E" />, '#22C55E', '優化後用電', big(eA)[0], big(eA)[1] + 'kWh', '#22C55E')}
          {/* equals → savings highlight */}
          <div style={{ flex: '0 0 auto', alignSelf: 'center', color: BP.textDim, fontSize: 20, fontWeight: 700 }}>=</div>
          <div style={{ flex: '1 1 0', minWidth: vp.isMobile ? '100%' : 150, alignSelf: 'stretch', borderRadius: 11, background: 'rgba(34,197,94,.13)', border: '1px solid rgba(34,197,94,.45)', padding: '10px 13px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icon d={SAVE} c="#22C55E" /><span style={{ fontSize: 11.5, color: '#9ff0c2', fontWeight: 700 }}>{sc.sav}</span></div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: BP.mono, fontSize: vp.isMobile ? 26 : 32, fontWeight: 800, color: '#22C55E', lineHeight: 1 }}>{pct.toFixed(1)}%</span>
              <span style={{ fontFamily: BP.mono, fontSize: 13, fontWeight: 700, color: '#22C55E' }}>≈ {big(save)[0]} {big(save)[1]}kWh</span>
            </div>
            <div style={{ fontFamily: BP.mono, fontSize: 11, color: BP.text, marginTop: 4 }}>省 ${big(costY)[0]} {big(costY)[1]}元{sc.cu} · 減碳 {co2Y.toFixed(co2Y < 10 ? 1 : 0)} 噸</div>
          </div>
        </div>
      </div>
      <div style={{ padding: vp.isMobile ? '0 16px 11px' : '0 22px 11px', fontSize: 10, color: BP.textDim, fontFamily: BP.mono }}>※ 以台電帳單口徑：單位電耗 {bSec.toFixed(3)} → {aSec.toFixed(3)} kWh/m³（−{pct.toFixed(1)}%）；年供水以改善後月均 ×12 估算。</div>
    </div>
  );
}


Object.assign(window, { BP, BPCard, BPRow, BPStat, BPHeader, BPKpiStrip, BPMotorList, BPMotorDetail, statusZh, Tier, roleRationale, StationActionBar, HeroCore });
