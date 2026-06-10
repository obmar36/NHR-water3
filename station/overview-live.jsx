// overview-live.jsx — real-time monitoring.
// Top: combined chart of all running pumps + 節能基準線. Below: one channel chart
// per pump (Brownian confidence channel), each with X/Y axes.

function useMiniW() {
  const ref = React.useRef(null);
  const [w, setW] = React.useState(280);
  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(es => setW(es[0].contentRect.width));
    ro.observe(ref.current); return () => ro.disconnect();
  }, []);
  return [ref, w];
}

const LIVE_METRICS = {
  power: { key: 'power_kw', unit: 'kW', band: 0.05, noise: 0.012, fmt: v => Math.round(v).toLocaleString(), label: '用電功率', baseline: true, baseLabel: '定速 60Hz' },
  flow: { key: 'flow_m3h', unit: 'm³/h', band: 0.045, noise: 0.011, fmt: v => Math.round(v).toLocaleString(), label: '出水量', baseline: false },
  sec: { key: 'sec_kwh_m3', unit: 'kWh/m³', band: 0.03, noise: 0.006, fmt: v => v.toFixed(3), label: '單位電耗', baseline: true, kind: 'sec', baseLabel: '改善前 0.444' },
};
const N_LIVE = 50, WIN_S = N_LIVE * 1.5;

// shared axis renderer
function Axes({ BP, w, H, padL, padR, padT, padB, yMin, yMax, fmt, yTicks = 3 }) {
  const iw = w - padL - padR, ih = H - padT - padB;
  const ys = Array.from({ length: yTicks + 1 }, (_, i) => i / yTicks);
  const xs = [0, 0.5, 1];
  const xlab = ['−' + Math.round(WIN_S) + 's', '−' + Math.round(WIN_S / 2) + 's', '即時'];
  return (
    <g fontFamily={BP.mono}>
      {ys.map((f, i) => {
        const y = padT + ih * (1 - f); const v = yMin + (yMax - yMin) * f;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke={BP.borderDim} strokeWidth="1" strokeDasharray={f === 0 ? '' : '2 5'} opacity={f === 0 ? .8 : .5} />
            <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill={BP.textDim}>{fmt(v)}</text>
          </g>
        );
      })}
      <line x1={padL} y1={padT} x2={padL} y2={padT + ih} stroke={BP.borderDim} strokeWidth="1" opacity=".8" />
      {xs.map((f, i) => (
        <text key={i} x={padL + iw * f} y={H - 5} textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'} fontSize="9" fill={BP.textDim}>{xlab[i]}</text>
      ))}
    </g>
  );
}

// ---- combined: total of all running pumps + baseline ------------------------
function CombinedLive({ motors, cfg, metric }) {
  const BP = window.BP;
  const running = motors.filter(m => m.status !== 'standby');
  const aggSec = () => { const P = running.reduce((s, m) => s + (m.power_kw || 0), 0); const Q = running.reduce((s, m) => s + (m.flow_cmd || 0), 0) || 0.001; return 24 * P / Q; };
  const targetTotal = (cfg.kind === 'sec' ? aggSec() : running.reduce((s, m) => s + (m[cfg.key] || 0), 0)) || 0.001;
  const baseTotal = cfg.kind === 'sec' ? (window.DATA.validation[0].se)
    : (cfg.baseline ? running.reduce((s, m) => s + (m.baseline_kw || 0), 0) : null);
  const tRef = React.useRef(targetTotal); tRef.current = targetTotal;
  const [buf, setBuf] = React.useState(() => Array.from({ length: N_LIVE }, (_, i) => targetTotal * (1 + Math.sin(i / 8) * 0.02)));
  React.useEffect(() => {
    const id = setInterval(() => {
      setBuf(prev => {
        const a = prev.slice(1); const last = prev[prev.length - 1]; const mean = tRef.current || 0.001;
        const wob = mean * (1 + Math.sin(Date.now() / 8000) * 0.02);
        a.push(last + (wob - last) * 0.1 + (Math.random() - 0.5) * mean * 0.01); return a;
      });
    }, 1500); return () => clearInterval(id);
  }, []);
  const [ref, w] = useMiniW();
  const H = 188, padL = 46, padR = 12, padT = 14, padB = 20;
  const iw = Math.max(10, w - padL - padR), ih = H - padT - padB;
  const baseLine = baseTotal != null ? buf.map((_, i) => baseTotal * (1 + Math.sin(i / 9 + 1) * 0.012)) : null;
  const allV = buf.concat(baseLine || []);
  const dMin = Math.min(...allV), dMax = Math.max(...allV); const sp = (dMax - dMin) || 1;
  const yMin = dMin - sp * 0.18, yMax = dMax + sp * 0.18;
  const X = i => padL + (i / (N_LIVE - 1)) * iw, Y = v => padT + ih - ((v - yMin) / (yMax - yMin)) * ih;
  const lp = arr => arr.map((v, i) => `${i ? 'L' : 'M'} ${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
  const cur = buf[buf.length - 1];
  const savePct = baseTotal ? ((baseTotal - cur) / baseTotal) * 100 : null;
  return (
    <div style={{ background: 'rgba(8,21,44,.5)', border: `1px solid ${BP.borderDim}`, borderRadius: 9, padding: '10px 12px 7px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: '#22C55E', boxShadow: '0 0 6px #22C55E' }} className="md-pulse" />
        <span style={{ fontFamily: BP.mono, fontSize: 12.5, fontWeight: 700, color: BP.label }}>{cfg.kind === 'sec' ? '全站 · ' + cfg.label : '全機組合計 · ' + cfg.label}</span>
        <span style={{ fontSize: 10.5, color: BP.textDim }}>{running.length} 台運轉中</span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontFamily: BP.mono, fontSize: 19, fontWeight: 700, color: '#22C55E' }}>{cfg.fmt(cur)}</span>
          <span style={{ fontSize: 10, color: BP.text }}>{cfg.unit}</span>
        </span>
        {savePct != null && <span style={{ fontFamily: BP.mono, fontSize: 11.5, fontWeight: 700, color: '#22C55E', background: 'rgba(34,197,94,.14)', padding: '2px 8px', borderRadius: 4 }}>↓ 較{cfg.baseLabel} 省 {savePct.toFixed(1)}%</span>}
      </div>
      <div ref={ref} style={{ marginTop: 4 }}>
        <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H} style={{ display: 'block', fontFamily: BP.mono }}>
          <defs><linearGradient id="cl-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22C55E" stopOpacity=".26" /><stop offset="1" stopColor="#22C55E" stopOpacity=".08" /></linearGradient></defs>
          <Axes BP={BP} w={w} H={H} padL={padL} padR={padR} padT={padT} padB={padB} yMin={yMin} yMax={yMax} fmt={cfg.fmt} yTicks={4} />
          {baseLine && <path d={`${lp(baseLine)} ${buf.slice().reverse().map((v, i) => `L ${X(N_LIVE - 1 - i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ')} Z`} fill="url(#cl-fill)" stroke="none" />}
          {baseLine && <text x={X(Math.round(N_LIVE * 0.3))} y={(Y(baseLine[Math.round(N_LIVE * 0.3)]) + Y(buf[Math.round(N_LIVE * 0.3)])) / 2 + 3} fontSize="9.5" fontWeight="700" fill="#22C55E">↓ 節省 {savePct != null ? savePct.toFixed(1) : '0'}%</text>}
          {baseLine && (<>
            <path d={lp(baseLine)} fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeDasharray="6 4" />
            <text x={X(N_LIVE - 1)} y={Y(baseLine[baseLine.length - 1]) - 5} textAnchor="end" fontSize="9" fill="#F59E0B">{cfg.baseLabel} {cfg.kind === 'sec' ? '' : cfg.fmt(baseTotal)}</text>
          </>)}
          <path d={lp(buf)} fill="none" stroke="#22C55E" strokeWidth="2.4" style={{ filter: 'drop-shadow(0 0 3px rgba(34,197,94,.6))' }} />
          <circle cx={X(N_LIVE - 1)} cy={Y(cur)} r="4" fill="#22C55E" className="md-pulse" />
        </svg>
      </div>
    </div>
  );
}

// ---- per-pump channel chart with axes ---------------------------------------
function MiniLive({ motor, cfg }) {
  const BP = window.BP;
  const target = motor[cfg.key] || 0.001;
  const tRef = React.useRef(target); tRef.current = target;
  const [buf, setBuf] = React.useState(() => Array.from({ length: N_LIVE }, (_, i) => target * (1 + Math.sin(i / 7) * cfg.band * 0.5 + (Math.random() - 0.5) * cfg.band)));
  React.useEffect(() => {
    const id = setInterval(() => {
      setBuf(prev => {
        const a = prev.slice(1); const last = prev[prev.length - 1]; const mean = tRef.current || 0.001;
        const wob = mean * (1 + Math.sin(Date.now() / 7000) * cfg.band * 0.35);
        a.push(last + (wob - last) * 0.08 + (Math.random() - 0.5) * mean * cfg.noise * 2.4); return a;
      });
    }, 1500); return () => clearInterval(id);
  }, []);
  const [ref, w] = useMiniW();
  const H = 150, padL = 36, padR = 8, padT = 10, padB = 18;
  const iw = Math.max(10, w - padL - padR), ih = H - padT - padB;
  const mean = target, hi = mean * (1 + cfg.band), lo = mean * (1 - cfg.band);
  const dMin = Math.min(lo, ...buf), dMax = Math.max(hi, ...buf), sp = (dMax - dMin) || 1, pd = sp * 0.16;
  const yMin = dMin - pd, yMax = dMax + pd;
  const X = i => padL + (i / (N_LIVE - 1)) * iw, Y = v => padT + ih - ((v - yMin) / (yMax - yMin)) * ih;
  const line = buf.map((v, i) => `${i ? 'L' : 'M'} ${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
  const cur = buf[buf.length - 1], out = cur > hi || cur < lo;
  const baseCol = window.STATUS_COLOR[motor.status] || BP.accent;
  const col = out ? '#EF4444' : baseCol;
  const bandOp = motor.status === 'warn' ? 0.26 : 0.14;
  const gid = 'ml-' + motor.id + '-' + cfg.key;
  return (
    <div style={{ background: 'rgba(8,21,44,.5)', border: `1px solid ${out ? 'rgba(239,68,68,.5)' : BP.borderDim}`, borderRadius: 9, padding: '9px 11px 6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: baseCol, boxShadow: `0 0 6px ${baseCol}` }} className="md-pulse" />
        <span style={{ fontFamily: BP.mono, fontSize: 12, fontWeight: 700, color: BP.label }}>{motor.id}</span>
        <span style={{ fontFamily: BP.mono, fontSize: 9, fontWeight: 700, color: baseCol, background: `${baseCol}26`, padding: '1px 6px', borderRadius: 4 }}>{motor.status === 'warn' ? '警告' : '運轉'}</span>
        <span style={{ fontSize: 10.5, color: BP.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{motor.name}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span style={{ fontFamily: BP.mono, fontSize: 15, fontWeight: 700, color: col }}>{cfg.fmt(cur)}</span>
          <span style={{ fontSize: 9.5, color: BP.text }}>{cfg.unit}</span>
        </span>
      </div>
      <div ref={ref} style={{ marginTop: 3 }}>
        <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H} style={{ display: 'block', fontFamily: BP.mono }}>
          <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={baseCol} stopOpacity={bandOp} /><stop offset="1" stopColor={baseCol} stopOpacity={bandOp} /></linearGradient></defs>
          <Axes BP={BP} w={w} H={H} padL={padL} padR={padR} padT={padT} padB={padB} yMin={yMin} yMax={yMax} fmt={cfg.fmt} yTicks={3} />
          {/* Brownian confidence channel */}
          <rect x={padL} y={Y(hi)} width={iw} height={Math.max(0, Y(lo) - Y(hi))} fill={`url(#${gid})`} />
          <line x1={padL} y1={Y(hi)} x2={w - padR} y2={Y(hi)} stroke={baseCol} strokeWidth="1" strokeDasharray="3 3" opacity=".55" />
          <line x1={padL} y1={Y(lo)} x2={w - padR} y2={Y(lo)} stroke={baseCol} strokeWidth="1" strokeDasharray="3 3" opacity=".55" />
          <path d={line} fill="none" stroke={col} strokeWidth="1.8" style={{ filter: `drop-shadow(0 0 2px ${col}88)` }} />
          <circle cx={X(N_LIVE - 1)} cy={Y(cur)} r="3.4" fill={col} className="md-pulse" />
        </svg>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: BP.mono, fontSize: 9.5, color: BP.textDim }}>通道 {cfg.fmt(lo)}–{cfg.fmt(hi)} {cfg.unit}</span>
        <span style={{ marginLeft: 'auto', fontFamily: BP.mono, fontSize: 9.5, fontWeight: 700, color: out ? '#EF4444' : '#22C55E' }}>{out ? '⚠ 超出通道' : '● 通道內'}</span>
      </div>
    </div>
  );
}

function LiveTrendPanel({ motors }) {
  const BP = window.BP;
  const vp = window.useVP ? window.useVP() : { isMobile: false };
  const [metric, setMetric] = React.useState('power');
  const running = motors.filter(m => m.status !== 'standby');
  const cfg = LIVE_METRICS[metric];
  return (
    <window.BPCard title="即時趨勢監控 · 全機組" en="Live Trend · All Running Units" glow
      right={
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-flex', gap: 2, background: 'rgba(8,21,44,.6)', borderRadius: 7, padding: 2, border: `1px solid ${BP.borderDim}` }}>
            {Object.keys(LIVE_METRICS).map(k => (
              <button key={k} onClick={() => setMetric(k)} style={{ all: 'unset', cursor: 'pointer', padding: '4px 11px', borderRadius: 5, fontSize: 11, fontFamily: BP.mono, fontWeight: 600, color: metric === k ? '#06223f' : BP.text, background: metric === k ? BP.accent : 'transparent' }}>{LIVE_METRICS[k].label}</button>
            ))}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: BP.mono, color: '#EF4444' }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: '#EF4444', boxShadow: '0 0 6px #EF4444' }} className="md-pulse" />REC
          </span>
        </span>
      }>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <CombinedLive key={'cmb-' + metric} motors={motors} cfg={cfg} metric={metric} />
        <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? '1fr' : `repeat(${Math.min(running.length, 3)}, minmax(0,1fr))`, gap: 10 }}>
          {running.map(m => <MiniLive key={m.id + metric} motor={m} cfg={cfg} />)}
        </div>
      </div>
      <div style={{ padding: '0 12px 11px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 10.5, color: BP.textDim, fontFamily: BP.mono }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 14, height: 0, borderTop: '2px dashed #F59E0B' }} />{metric === 'sec' ? '改善前基準 0.444' : metric === 'power' ? '同泵定速 60Hz 基準' : '對照基準'}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 13, height: 9, background: 'rgba(34,197,94,.3)' }} />綠色區間＝節能量</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#22C55E' }} />綠：通道內正常</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#F59E0B' }} />黃：警告機組</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#EF4444' }} />紅：超出通道</span>
        <span style={{ marginLeft: 'auto' }}>頻率即時SCADA · 功率/流量由現場曲線推估 · 色帶＝合理運轉通道（±{(cfg.band * 100).toFixed(0)}%）</span>
      </div>
    </window.BPCard>
  );
}

window.LiveTrendPanel = LiveTrendPanel;
