// analysis.jsx — 節能分析：現場 vs 出廠效能曲線、效率交叉、月度驗證、選泵 solver。
// 全部以示範加壓站真實資料（DATA）驅動；曲線為一次性現場實測，非連續監測。

const BPx = () => window.BP;
function useW(init = 680) {
  const ref = React.useRef(null);
  const [w, setW] = React.useState(init);
  React.useEffect(() => { if (!ref.current) return; const ro = new ResizeObserver(es => setW(es[0].contentRect.width)); ro.observe(ref.current); return () => ro.disconnect(); }, []);
  return [ref, w];
}
function Leg({ c, t, dash, sw = 2 }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 16, height: 0, borderTop: `${sw}px ${dash ? 'dashed' : 'solid'} ${c}` }} />{t}</span>;
}

// ---- field vs factory performance curve ------------------------------------
function FieldCurveChart({ motor, height = 330 }) {
  const BP = BPx();
  const [ref, w] = useW();
  const fid = motor.fid;
  const field = window.fieldOf(fid);
  const fac = window.DATA.factory[motor.factory] || [];
  const padL = 46, padR = 50, padT = 16, padB = 36;
  const innerW = Math.max(10, w - padL - padR), innerH = height - padT - padB;
  const Qmax = Math.max(...fac.map(p => p.Q), ...field.map(p => p.Q)) * 1.04;
  const Hmax = Math.max(...fac.map(p => p.H), ...field.map(p => p.H)) * 1.05;
  const X = Q => padL + (Q / Qmax) * innerW;
  const Yh = H => padT + innerH - (H / Hmax) * innerH;
  const Ye = e => padT + innerH - (e / 100) * innerH;
  const path = (arr, xf, yf) => arr.map((p, i) => `${i ? 'L' : 'M'} ${xf(p).toFixed(1)} ${yf(p).toFixed(1)}`).join(' ');

  const curHz = motor.status === 'standby' ? null : motor.freq;
  const opNow = curHz ? window.expectAt(fid, curHz) : null;
  const roleHz = motor.roleHz;
  const best = (window.DATA.best.find(b => b.p === window.DATA.meta[fid].label)) || {};
  const minSEHz = best.minSE ? parseInt(best.minSE) : null;
  const opMin = minSEHz ? window.expectAt(fid, minSEHz) : null;

  return (
    <div ref={ref} style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} style={{ display: 'block', fontFamily: BP.mono }}>
        {[0, .25, .5, .75, 1].map((f, i) => {
          const y = padT + innerH * (1 - f);
          return <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke={BP.borderDim} strokeWidth="1" strokeDasharray={f === 0 ? '' : '2 4'} />
            <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9.5" fill={BP.text}>{Math.round(Hmax * f)}</text>
            <text x={w - padR + 6} y={y + 3} textAnchor="start" fontSize="9.5" fill="#22C55E">{Math.round(100 * f)}</text>
          </g>;
        })}
        {[0, .25, .5, .75, 1].map((f, i) => (
          <text key={i} x={padL + innerW * f} y={height - 9} textAnchor="middle" fontSize="9.5" fill={BP.text}>{Math.round(Qmax * f).toLocaleString()}</text>
        ))}
        <text x={padL - 6} y={11} textAnchor="end" fontSize="9.5" fill={BP.label}>揚程 m / BHP</text>
        <text x={w - padR + 6} y={11} textAnchor="start" fontSize="9.5" fill="#22C55E">效率 %</text>
        <text x={padL + innerW / 2} y={height - 9} textAnchor="middle" fontSize="9.5" fill={BP.label} dx="150">出水量 Q (CMD) →</text>

        {/* factory dashed */}
        {fac.length > 0 && <path d={path(fac, p => X(p.Q), p => Yh(p.H))} fill="none" stroke={BP.accent} strokeWidth="1.2" strokeDasharray="5 4" opacity=".6" />}
        {fac.length > 0 && <path d={path(fac.filter(p => p.EFF > 0), p => X(p.Q), p => Ye(p.EFF))} fill="none" stroke="#22C55E" strokeWidth="1.2" strokeDasharray="5 4" opacity=".5" />}
        {/* field solid */}
        <path d={path(field, p => X(p.Q), p => Yh(p.H))} fill="none" stroke={BP.line} strokeWidth="2.2" />
        <path d={path(field, p => X(p.Q), p => Yh(p.BHP))} fill="none" stroke="#F59E0B" strokeWidth="1.5" opacity=".85" />
        <path d={path(field, p => X(p.Q), p => Ye(p.EFF))} fill="none" stroke="#22C55E" strokeWidth="2" />

        {/* min-SE point */}
        {opMin && <g>
          <circle cx={X(opMin.Q)} cy={Ye(opMin.EFF)} r="4" fill="none" stroke="#22C55E" strokeWidth="1.4" />
          <text x={X(opMin.Q)} y={Ye(opMin.EFF) - 8} textAnchor="middle" fontSize="8.5" fill="#22C55E">最省 {minSEHz}Hz</text>
        </g>}
        {/* current op point */}
        {opNow && <g>
          <line x1={X(opNow.Q)} y1={Yh(opNow.H)} x2={X(opNow.Q)} y2={padT + innerH} stroke={BP.accent} strokeWidth="1" strokeDasharray="2 3" opacity=".6" />
          <circle cx={X(opNow.Q)} cy={Yh(opNow.H)} r="6" fill={BP.accent} stroke="#06223f" strokeWidth="1.5" className="md-pulse" />
          <text x={X(opNow.Q)} y={Yh(opNow.H) - 11} textAnchor="middle" fontSize="9.5" fill={BP.accent} fontWeight="700">目前 {curHz}Hz</text>
        </g>}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 13, padding: '4px 6px 0', fontSize: 10.5, color: BP.text, fontFamily: BP.mono }}>
        <Leg c={BP.line} t="現場揚程 H–Q" />
        <Leg c="#F59E0B" t="現場軸馬力 BHP" sw={1.5} />
        <Leg c="#22C55E" t="現場效率 EFF" />
        <Leg c={BP.accent} t="出廠曲線（虛線）" dash sw={1.2} />
      </div>
    </div>
  );
}

// ---- crossover EFF comparison (P3/P4 or P2/P1) -----------------------------
function CrossoverChart({ ids, cross, height = 200 }) {
  const BP = BPx();
  const [ref, w] = useW(360);
  const a = window.fieldOf(ids[0]), b = window.fieldOf(ids[1]);
  const padL = 38, padR = 10, padT = 12, padB = 26;
  const innerW = Math.max(10, w - padL - padR), innerH = height - padT - padB;
  const Qmax = Math.max(...a.map(p => p.Q), ...b.map(p => p.Q)) * 1.04;
  const X = Q => padL + (Q / Qmax) * innerW;
  const Y = e => padT + innerH - (e / 80) * innerH;
  const path = arr => arr.map((p, i) => `${i ? 'L' : 'M'} ${X(p.Q).toFixed(1)} ${Y(p.EFF).toFixed(1)}`).join(' ');
  const labs = ids.map(id => window.DATA.meta[id].label.split(' ')[1]);
  return (
    <div ref={ref} style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} style={{ display: 'block', fontFamily: BP.mono }}>
        {[0, .5, 1].map((f, i) => { const y = padT + innerH * (1 - f); return <g key={i}><line x1={padL} y1={y} x2={w - padR} y2={y} stroke={BP.borderDim} strokeDasharray={f === 0 ? '' : '2 4'} /><text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill={BP.text}>{Math.round(80 * f)}</text></g>; })}
        {/* crossover marker */}
        <line x1={X(cross)} y1={padT} x2={X(cross)} y2={padT + innerH} stroke="#a78bfa" strokeWidth="1.2" strokeDasharray="4 3" />
        <text x={X(cross)} y={padT + 9} textAnchor="middle" fontSize="8.5" fill="#a78bfa">交叉 {cross.toLocaleString()}</text>
        <path d={path(a)} fill="none" stroke={BP.accent} strokeWidth="2" />
        <path d={path(b)} fill="none" stroke="#F59E0B" strokeWidth="2" />
        {[0, .5, 1].map((f, i) => <text key={i} x={padL + innerW * f} y={height - 8} textAnchor="middle" fontSize="8.5" fill={BP.textDim}>{Math.round(Qmax * f).toLocaleString()}</text>)}
        <text x={padL - 6} y={9} textAnchor="end" fontSize="8.5" fill="#22C55E">效率%</text>
        <text x={w - padR} y={height - 1} textAnchor="end" fontSize="8.5" fill={BP.label}>出水量 Q (CMD) →</text>
      </svg>
      <div style={{ display: 'flex', gap: 14, padding: '2px 6px 0', fontSize: 10, color: BP.text, fontFamily: BP.mono }}>
        <Leg c={BP.accent} t={labs[0]} /><Leg c="#F59E0B" t={labs[1]} /><Leg c="#a78bfa" t="效率交叉點" dash sw={1.2} />
      </div>
    </div>
  );
}

// ---- daily SEC trend (real, 112 days) + change annotations -----------------
function DailySECChart({ height = 200 }) {
  const BP = BPx();
  const [ref, w] = useW();
  const d = window.dailySEC();
  const [events, setEvents] = React.useState(() => (window.loadChangeEvents ? window.loadChangeEvents() : []));
  const [hover, setHover] = React.useState(null);   // event id
  const [adding, setAdding] = React.useState(false);
  const [form, setForm] = React.useState({ kind: 'manual', label: '', detail: '' });
  React.useEffect(() => {
    const on = () => setEvents(window.loadChangeEvents());
    window.addEventListener('nhr-change-added', on);
    return () => window.removeEventListener('nhr-change-added', on);
  }, []);
  const KIND = window.CHANGE_KINDS || { milestone: { zh: '里程碑', c: '#22C55E' }, ai: { zh: 'AI 建議調整', c: '#22D3EE' }, manual: { zh: '人工調整', c: '#F59E0B' } };
  const padL = 40, padR = 12, padT = 16, padB = 26;
  const innerW = Math.max(10, w - padL - padR), innerH = height - padT - padB;
  const vals = d.map(p => p.sec);
  const lo = Math.min(...vals) * 0.97, hi = Math.max(...vals) * 1.03;
  const X = i => padL + (i / (d.length - 1)) * innerW;
  const Y = v => padT + innerH - ((v - lo) / (hi - lo)) * innerH;
  const line = d.map((p, i) => `${i ? 'L' : 'M'} ${X(i).toFixed(1)} ${Y(p.sec).toFixed(1)}`).join(' ');
  const toNum = s => { const m = (s || '').match(/(\d{1,2})\/(\d{1,2})/); return m ? +m[1] * 100 + +m[2] : 0; };
  const idxOf = (ev) => {
    let exact = d.findIndex(p => p.d === ev.d);
    if (exact >= 0) return exact;
    const t = toNum(ev.d); if (!t) return d.length - 1;
    let best = d.length - 1, bd = 1e9;
    d.forEach((p, i) => { const diff = Math.abs(toNum(p.d) - t); if (diff < bd) { bd = diff; best = i; } });
    return best;
  };
  const evs = events.map(ev => ({ ...ev, i: idxOf(ev) })).sort((a, b) => a.i - b.i);
  const thr = (v, c, lab) => <g><line x1={padL} y1={Y(v)} x2={w - padR} y2={Y(v)} stroke={c} strokeWidth="1" strokeDasharray="5 4" opacity=".7" /><text x={w - padR} y={Y(v) - 3} textAnchor="end" fontSize="8.5" fill={c}>{lab}</text></g>;
  const hv = hover ? evs.find(e => e.id === hover) : null;
  const lastD = d.length ? d[d.length - 1].d : '';
  const ParamChips = ({ params, c }) => (!params || !params.length) ? null : (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
      {params.map((p, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: BP.mono, fontSize: 10.5, color: BP.label, background: 'rgba(8,21,44,.7)', border: `1px solid ${c}55`, borderRadius: 5, padding: '2px 7px' }}>
          <b style={{ color: c }}>{p.dev}</b>
          <span style={{ color: BP.textDim }}>{p.from}</span>
          <span style={{ color: c }}>→</span>
          <b>{p.to}{p.unit ? ' ' + p.unit : ''}</b>
        </span>
      ))}
    </div>
  );
  const submit = () => {
    if (!form.label.trim()) return;
    const txt = form.label + ' ' + form.detail;
    const params = [];
    const re = /([A-Za-z]\d)\D{0,6}?(\d{2})\s*(?:Hz)?\s*[→\-–—>]+\s*(\d{2})\s*Hz?/g;
    let m; while ((m = re.exec(txt))) params.push({ dev: m[1], from: +m[2], to: +m[3], unit: 'Hz' });
    if (!params.length) { const m2 = txt.match(/([A-Za-z]\d)\D{0,4}?(\d{2})\s*Hz/); if (m2) params.push({ dev: m2[1], from: '—', to: m2[2] + 'Hz' }); }
    window.addChangeEvent({ kind: form.kind, label: form.label.trim(), detail: form.detail.trim(), params, who: '值班員' });
    setForm({ kind: 'manual', label: '', detail: '' }); setAdding(false);
  };
  return (
    <div ref={ref} style={{ width: '100%', position: 'relative' }}>
      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10.5, color: BP.textDim, fontFamily: BP.mono }}>圖上標記＝異動時點</span>
        {Object.keys(KIND).map(k => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: BP.mono, fontSize: 9.5, color: KIND[k].c }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: KIND[k].c }} />{KIND[k].zh}
          </span>
        ))}
        <button onClick={() => setAdding(a => !a)} style={{ all: 'unset', cursor: 'pointer', marginLeft: 'auto', fontFamily: BP.mono, fontSize: 11, fontWeight: 700, color: BP.accent, border: `1px solid ${BP.border}`, borderRadius: 6, padding: '4px 11px' }}>＋ 標註異動</button>
      </div>
      {adding && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 7, marginBottom: 8, padding: '9px 11px', background: 'rgba(8,21,44,.5)', border: `1px solid ${BP.border}`, borderRadius: 8 }}>
          <select value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value }))} style={{ fontSize: 11.5, fontFamily: BP.mono, color: BP.label, background: 'rgba(8,21,44,.7)', border: `1px solid ${BP.borderDim}`, borderRadius: 6, padding: '6px 8px' }}>
            <option value="manual">人工調整</option><option value="ai">AI 建議調整</option><option value="milestone">里程碑</option>
          </select>
          <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="異動標題（如 P2→55Hz）" style={{ flex: '1 1 150px', minWidth: 0, fontSize: 12, color: BP.label, fontFamily: 'inherit', background: 'rgba(8,21,44,.7)', border: `1px solid ${BP.borderDim}`, borderRadius: 6, padding: '6px 9px' }} />
          <input value={form.detail} onChange={e => setForm(f => ({ ...f, detail: e.target.value }))} placeholder="說明（選填）" style={{ flex: '2 1 220px', minWidth: 0, fontSize: 12, color: BP.label, fontFamily: 'inherit', background: 'rgba(8,21,44,.7)', border: `1px solid ${BP.borderDim}`, borderRadius: 6, padding: '6px 9px' }} />
          <span style={{ fontFamily: BP.mono, fontSize: 10, color: BP.textDim }}>標於 {lastD}</span>
          <button onClick={submit} style={{ all: 'unset', cursor: 'pointer', fontFamily: BP.mono, fontSize: 12, fontWeight: 700, color: '#06223f', background: BP.accent, borderRadius: 6, padding: '6px 14px' }}>新增標註</button>
        </div>
      )}
      <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} style={{ display: 'block', fontFamily: BP.mono }}>
        {[0, .5, 1].map((f, i) => { const y = padT + innerH * (1 - f); const v = lo + (hi - lo) * f; return <g key={i}><line x1={padL} y1={y} x2={w - padR} y2={y} stroke={BP.borderDim} strokeDasharray={f === 0 ? '' : '2 4'} /><text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill={BP.text}>{v.toFixed(2)}</text></g>; })}
        {0.42 > lo && 0.42 < hi && thr(0.42, '#F59E0B', '0.42 退化提醒')}
        <path d={line} fill="none" stroke={BP.accent} strokeWidth="1.8" style={{ filter: 'drop-shadow(0 0 2px rgba(124,212,255,.5))' }} />
        {/* change annotations */}
        {evs.map((ev, k) => {
          const c = (KIND[ev.kind] || KIND.manual).c; const x = X(ev.i); const yv = Y(d[ev.i].sec); const on = hover === ev.id;
          return (
            <g key={ev.id} style={{ cursor: 'pointer' }} onMouseEnter={() => setHover(ev.id)} onMouseLeave={() => setHover(h => h === ev.id ? null : h)} onClick={() => setHover(h => h === ev.id ? null : ev.id)}>
              <line x1={x} y1={padT + 2} x2={x} y2={padT + innerH} stroke={c} strokeWidth={on ? 1.6 : 1} strokeDasharray="4 3" opacity={on ? .95 : .6} />
              <circle cx={x} cy={yv} r={on ? 4.5 : 3.5} fill={c} stroke="#06223f" strokeWidth="1" />
              <circle cx={x} cy={padT - 4} r={7.5} fill={c} stroke="#06223f" strokeWidth="1" />
              <text x={x} y={padT - 1} textAnchor="middle" fontSize="9" fontWeight="700" fill="#06223f">{k + 1}</text>
            </g>
          );
        })}
        {[0, Math.floor(d.length / 2), d.length - 1].map((i, k) => <text key={k} x={X(i)} y={height - 8} textAnchor={k === 0 ? 'start' : k === 2 ? 'end' : 'middle'} fontSize="9" fill={BP.textDim}>{d[i].d}</text>)}
        <text x={padL - 6} y={9} textAnchor="end" fontSize="8.5" fill={BP.accent}>kWh/m³</text>
        <text x={w - padR} y={height - 1} textAnchor="end" fontSize="8.5" fill={BP.label}>日期 →</text>
      </svg>
      {/* hover tooltip */}
      {hv && (
        <div style={{ position: 'absolute', left: Math.min(Math.max(X(hv.i) - 96, 2), Math.max(2, w - 196)), top: padT + 16, width: 192, zIndex: 30, background: 'rgba(6,16,34,.98)', border: `1px solid ${(KIND[hv.kind] || KIND.manual).c}88`, borderRadius: 9, boxShadow: '0 12px 30px rgba(0,0,0,.55)', padding: '9px 11px', pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontFamily: BP.mono, fontSize: 9.5, fontWeight: 700, color: (KIND[hv.kind] || KIND.manual).c, background: `${(KIND[hv.kind] || KIND.manual).c}1e`, padding: '1px 6px', borderRadius: 4 }}>{(KIND[hv.kind] || KIND.manual).zh}</span>
            <span style={{ fontFamily: BP.mono, fontSize: 10, color: BP.text, marginLeft: 'auto' }}>{hv.d}</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: BP.label }}>{hv.label}</div>
          {hv.detail && <div style={{ fontSize: 11, color: BP.text, lineHeight: 1.45, marginTop: 3 }}>{hv.detail}</div>}
          <ParamChips params={hv.params} c={(KIND[hv.kind] || KIND.manual).c} />
          {hv.sec && <div style={{ fontFamily: BP.mono, fontSize: 10.5, color: BP.text, marginTop: 6 }}>SEC <span style={{ color: BP.textDim }}>{hv.sec.before}</span> → <b style={{ color: '#22C55E' }}>{hv.sec.after}</b> kWh/m³</div>}
          <div style={{ fontFamily: BP.mono, fontSize: 9.5, color: BP.textDim, marginTop: 4 }}>by {hv.who}</div>
        </div>
      )}
      {/* legend + annotation list */}
      <div style={{ display: 'flex', gap: 14, padding: '2px 6px 0', fontSize: 10, color: BP.text, fontFamily: BP.mono }}>
        <Leg c={BP.accent} t="每日單位電耗（站內監控錶口徑）" />
        <span style={{ color: BP.textDim }}>※ 一次性實測曲線推估；剔除 04/01 抓表假影</span>
      </div>
      {evs.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {evs.map((ev, k) => {
            const c = (KIND[ev.kind] || KIND.manual).c;
            return (
              <div key={ev.id} onMouseEnter={() => setHover(ev.id)} onMouseLeave={() => setHover(h => h === ev.id ? null : h)} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 9px', borderRadius: 7, background: hover === ev.id ? `${c}14` : 'rgba(8,21,44,.4)', border: `1px solid ${hover === ev.id ? `${c}55` : BP.borderDim}` }}>
                <span style={{ width: 16, height: 16, borderRadius: 999, background: c, color: '#06223f', fontFamily: BP.mono, fontSize: 9.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{k + 1}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: BP.mono, fontSize: 10.5, color: BP.text, flexShrink: 0 }}>{ev.d}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: BP.label }}>{ev.label}</span>
                    {ev.sec && <span style={{ fontFamily: BP.mono, fontSize: 10, color: '#22C55E' }}>SEC {ev.sec.before}→{ev.sec.after}</span>}
                    <span style={{ marginLeft: 'auto', fontFamily: BP.mono, fontSize: 9.5, color: c, flexShrink: 0 }}>{(KIND[ev.kind] || KIND.manual).zh}</span>
                  </div>
                  {ev.params && ev.params.length > 0
                    ? <ParamChips params={ev.params} c={c} />
                    : (ev.detail && <div style={{ fontSize: 11, color: BP.text, marginTop: 3 }}>{ev.detail}</div>)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- selection solver (情境 → 最省組合) -------------------------------------
function SolverPanel({ onAdjust, motors }) {
  const BP = BPx();
  const vp = window.useVP ? window.useVP() : { isMobile: false };
  const TOU = window.DATA.tou;
  const TIERMAP = { '離峰': 5000, '半尖峰': 10000, '尖峰': 13300 };
  const [touIdx, setTouIdx] = React.useState(1);
  const [demand, setDemand] = React.useState(10000);
  const [allowP1, setAllowP1] = React.useState(false);
  // 目前實際運轉（用於對照）：各泵頻率可選，初值取自即時機組
  const [curHz, setCurHz] = React.useState(() => {
    const o = {}; (window.MOTORS || []).forEach(m => { o[m.fid] = m.status === 'standby' ? 0 : m.freq; }); return o;
  });
  const HZOPTS = [0, 40, 45, 48, 50, 51, 53, 55, 57, 58, 60];
  const r = window.solve(demand, allowP1);
  const rate = window.TARIFF[TOU[touIdx].rateKey];
  const list = window.DATA.order.filter(k => r.sel[k]).map(k => window.DATA.meta[k].label.split(' ')[1] + '@' + r.sel[k] + 'Hz');
  const cfg = {}; Object.keys(r.sel).forEach(k => cfg[k] = r.sel[k]);
  const tierName = demand <= 5000 ? '離峰' : demand <= 10000 ? '半尖峰' : '尖峰';
  return (
    <window.BPCard title="情境 → 操作建議" en="Pump-Selection Solver" glow
      right={<span style={{ fontFamily: BP.mono, fontSize: 10.5, color: BP.text }}>4 泵×40–60Hz 窮舉最省組合</span>}>
      <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1.25fr)', gap: 16, padding: 14 }}>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: BP.label, marginBottom: 5 }}>台電計費時段<span style={{ fontFamily: BP.mono, fontSize: 9.5, color: BP.textDim, fontWeight: 400 }}>　選時段即帶入該時段代表需求</span></div>
          <div style={{ display: 'flex', gap: 6 }}>
            {TOU.map((t, i) => { const sel = touIdx === i; const tierDemand = TIERMAP[t.k]; return (
              <button key={i} onClick={() => { setTouIdx(i); if (tierDemand) setDemand(tierDemand); }} style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', fontFamily: BP.mono, padding: '8px 6px', borderRadius: 8, color: sel ? '#06223f' : BP.text, background: sel ? BP.accent : 'rgba(8,21,44,.6)', border: `1px solid ${sel ? BP.accent : BP.borderDim}` }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{t.k}</div>
                <div style={{ fontSize: 9.5, color: sel ? 'rgba(6,34,63,.8)' : BP.textDim, marginTop: 2 }}>{window.TARIFF[t.rateKey].toFixed(2)} 元/度</div>
              </button>
            ); })}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 13, padding: '11px 13px', borderRadius: 9, background: 'rgba(8,21,44,.5)', border: `1px solid ${BP.borderDim}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, color: BP.textDim }}>本時段代表需求水量</div>
              <div style={{ fontFamily: BP.mono, fontSize: 30, fontWeight: 700, color: BP.accent, lineHeight: 1.1 }}>{demand.toLocaleString()}<span style={{ fontSize: 11, color: BP.textDim }}> CMD/日</span></div>
            </div>
            <span style={{ fontFamily: BP.mono, fontSize: 10, fontWeight: 700, color: BP.accent, background: 'rgba(65,166,255,.14)', border: `1px solid ${BP.borderDim}`, borderRadius: 5, padding: '3px 9px' }}>{tierName} 層級</span>
          </div>
          <div style={{ fontSize: 9.5, color: BP.textDim, marginTop: 5, lineHeight: 1.5 }}>※ 依台電時段對應之代表配水需求；接 SCADA 後改以實際配水池流量自動帶入。</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 11.5, color: BP.text, cursor: 'pointer' }}>
            <span onClick={() => setAllowP1(!allowP1)} style={{ width: 36, height: 20, borderRadius: 20, background: allowP1 ? '#0e7c8a' : BP.borderDim, position: 'relative', transition: '.2s', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 2, left: allowP1 ? 18 : 2, width: 16, height: 16, borderRadius: 999, background: '#fff', transition: '.2s' }} /></span>
            允許啟用 150HP P1（備用·已衰退）
          </label>

          {/* 目前實際運轉（用於對照）— 各泵頻率可選 */}
          <div style={{ fontSize: 11.5, fontWeight: 600, color: BP.label, margin: '16px 0 6px' }}>目前實際運轉（用於對照）<span style={{ fontFamily: BP.mono, fontSize: 9.5, color: BP.textDim, fontWeight: 400 }}>　接 SCADA 後自動帶入</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? '1fr' : '1fr 1fr', gap: 7 }}>
            {window.DATA.order.map(k => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(8,21,44,.5)', border: `1px solid ${BP.borderDim}`, borderRadius: 8, padding: '7px 10px' }}>
                <span style={{ fontFamily: BP.mono, fontSize: 11.5, color: BP.text, flex: 1, minWidth: 0 }}>{window.DATA.meta[k].label}</span>
                <select value={curHz[k] || 0} onChange={e => setCurHz(o => ({ ...o, [k]: +e.target.value }))} style={{ fontFamily: BP.mono, fontSize: 11.5, color: curHz[k] ? BP.accent : BP.textDim, background: 'rgba(6,18,38,.9)', border: `1px solid ${BP.border}`, borderRadius: 6, padding: '4px 6px' }}>
                  {HZOPTS.map(hz => <option key={hz} value={hz}>{hz === 0 ? '停機' : hz + 'Hz'}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: BP.textDim, marginTop: 6, lineHeight: 1.5 }}>模型慣例：系統揚程在 40–60Hz 近定值（~79–84 m）；各頻率視為穩定操作點，並聯流量以現場曲線相加估算。</div>

          {/* 為什麼這樣建議 (置於左欄填補空間) */}
          {(() => {
            const reasons = [`需求約 ${demand.toLocaleString()} CMD（${tierName}層級），需 ${Object.keys(r.sel).length} 台滿足。`];
            if (r.sel.P2_150HP && !r.sel.P1_150HP) reasons.push('需求高於 2,600 CMD，150HP 選效率較佳的 P2、不啟用已衰退的 P1。');
            if (r.sel.P3_100HP && r.sel.P4_100HP) reasons.push('100HP 雙機分流：P3 偏高流量、P4 偏低流量，各取較佳效率點。');
            else if (r.sel.P3_100HP) reasons.push('100HP 以 P3 為主（57Hz 附近接近峰值效率 ~70%）。');
            else if (r.sel.P4_100HP) reasons.push('低流量區由 P4 承擔（其低頻效率最佳）。');
            reasons.push('各泵頻率取「滿足供水下總軸功率最低」之點，避免無效做功。');
            if (r.SE) reasons.push(`預估單位電耗 ${r.SE} kWh/m³，${r.SE < 0.40 ? '低於' : '接近'} 0.40 改善後目標。`);
            return demand > 0 ? (
              <div style={{ marginTop: 16, borderRadius: 9, border: `1px solid ${BP.borderDim}`, background: 'rgba(8,21,44,.4)', padding: '11px 13px' }}>
                <div style={{ fontFamily: BP.mono, fontSize: 10, color: BP.accent, letterSpacing: .12, textTransform: 'uppercase', marginBottom: 7 }}>為什麼這樣建議</div>
                <ul style={{ margin: 0, paddingLeft: 17 }}>{reasons.map((x, i) => <li key={i} style={{ fontSize: 11.5, color: BP.text, lineHeight: 1.55, margin: '4px 0' }}>{x}</li>)}</ul>
              </div>
            ) : null;
          })()}
        </div>
        <div>
          <div style={{ background: 'linear-gradient(150deg,rgba(124,212,255,.1),rgba(8,21,44,.6))', border: `1px solid ${BP.border}`, borderRadius: 10, padding: '13px 15px' }}>
            <div style={{ fontFamily: BP.mono, fontSize: 10, color: BP.accent, letterSpacing: .12, textTransform: 'uppercase' }}>建議操作指令</div>
            <div style={{ fontSize: 14, color: BP.label, fontWeight: 600, marginTop: 6, lineHeight: 1.55 }}>
              {demand <= 0 ? '請設定時段與需求水量。' : <>〔{TOU[touIdx].k}〕台電約 <b style={{ fontFamily: BP.mono, color: BP.accent }}>{rate.toFixed(2)}</b> 元/度。建議運轉 <b style={{ fontFamily: BP.mono, color: BP.accent }}>{list.join('＋') || '—'}</b>，預估 <b style={{ fontFamily: BP.mono, color: BP.accent }}>{r.kW.toLocaleString()}</b> kW、單位電耗 <b style={{ fontFamily: BP.mono, color: '#22C55E' }}>{r.SE ?? '—'}</b> kWh/m³。</>}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 10 }}>
            <window.BPStat label="建議供水" value={r.Q.toLocaleString()} unit="CMD" tone={BP.accent} />
            <window.BPStat label="總用電功率" value={r.kW.toLocaleString()} unit="kW" tone={BP.label} />
            <window.BPStat label="單位電耗" value={r.SE ?? '—'} unit="kWh/m³" tone="#22C55E" />
          </div>
          {/* prominent recommended VFD frequency cards */}
          <div style={{ marginTop: 12, padding: '12px 13px', borderRadius: 10, background: 'rgba(8,21,44,.5)', border: `1px solid ${BP.border}` }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
              <span style={{ fontFamily: BP.mono, fontSize: 11, fontWeight: 700, color: BP.accent, letterSpacing: .1, textTransform: 'uppercase' }}>建議變頻頻率</span>
              <span style={{ fontFamily: BP.mono, fontSize: 9.5, color: BP.textDim }}>RECOMMENDED VFD SETPOINT · Hz</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 8 }}>
              {window.DATA.order.map(k => {
                const hz = r.sel[k]; const on = !!hz; const e = on ? window.expectAt(k, hz) : null; const q = e ? e.Q : 0;
                const hp = window.DATA.meta[k].label.match(/\d+HP/) ? window.DATA.meta[k].label.match(/\d+HP/)[0] : '';
                const pid = window.DATA.meta[k].label.split(' ')[1] || k;
                return (
                  <div key={k} style={{ borderRadius: 9, padding: '9px 10px 8px', background: on ? 'linear-gradient(160deg,rgba(65,166,255,.16),rgba(8,21,44,.4))' : 'rgba(6,16,34,.5)', border: `1px solid ${on ? 'rgba(65,166,255,.5)' : BP.borderDim}`, opacity: on ? 1 : .6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontFamily: BP.mono, fontSize: 12, fontWeight: 700, color: on ? BP.label : BP.textDim }}>{pid}</span>
                      <span style={{ fontFamily: BP.mono, fontSize: 8.5, color: BP.textDim }}>{hp}</span>
                      {on && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: 999, background: '#22C55E', boxShadow: '0 0 5px #22C55E' }} />}
                    </div>
                    {on ? (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginTop: 3 }}>
                        <span style={{ fontFamily: BP.mono, fontSize: 26, fontWeight: 700, color: '#7cd4ff', lineHeight: 1 }}>{hz}</span>
                        <span style={{ fontFamily: BP.mono, fontSize: 12, fontWeight: 700, color: '#7cd4ff' }}>Hz</span>
                      </div>
                    ) : (
                      <div style={{ fontFamily: BP.mono, fontSize: 18, fontWeight: 700, color: BP.textDim, marginTop: 5, lineHeight: 1 }}>停機</div>
                    )}
                    <div style={{ height: 3, borderRadius: 2, marginTop: 7, background: '#06182f', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: on ? Math.min(100, (hz - 40) / 20 * 100) + '%' : '0%', background: 'linear-gradient(90deg,#0e7c8a,#7cd4ff)' }} /></div>
                    <div style={{ fontFamily: BP.mono, fontSize: 9, color: BP.textDim, marginTop: 4 }}>{on ? Math.round(q).toLocaleString() + ' CMD' : '—'}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontFamily: BP.mono, fontSize: 9, color: BP.textDim, marginTop: 8 }}>條棒比例＝40–60Hz 操作範圍內之相對轉速</div>
          </div>
          {r.over && <div style={{ marginTop: 9, fontSize: 11, color: '#F59E0B', background: 'rgba(245,158,11,.08)', border: '1px solid #F59E0B', borderRadius: 8, padding: '8px 11px' }}>⚠ 需求超過機組 60Hz 總供水能力，已顯示全機上限；實務需評估增設機組。</div>}
          {r.sel.P1_150HP && <div style={{ marginTop: 9, fontSize: 11, color: '#F59E0B', background: 'rgba(245,158,11,.08)', border: '1px solid #F59E0B', borderRadius: 8, padding: '8px 11px' }}>⚠ 此解動用備用且衰退的 P1，建議改以 P2＋100HP 滿足需求。</div>}

          {/* 目前操作 vs 建議操作 */}
          {(() => {
            const run = window.DATA.order.filter(k => curHz[k] > 0).map(k => ({ k, hz: curHz[k], e: window.expectAt(k, curHz[k]) }));
            const curKW = Math.round(run.reduce((s, x) => s + x.e.kW, 0));
            const curQ = run.reduce((s, x) => s + x.e.Q, 0);
            const curSE = curQ ? +(24 * curKW / curQ).toFixed(3) : null;
            const curList = run.map(x => window.DATA.meta[x.k].label.split(' ')[1] + '@' + x.hz + 'Hz').join(' + ') || '全停機';
            const recList2 = window.DATA.order.filter(k => r.sel[k]).map(k => window.DATA.meta[k].label.split(' ')[1] + '@' + r.sel[k] + 'Hz').join(' + ') || '—';
            const dKW = curKW - r.kW, dpct = curKW ? dKW / curKW * 100 : 0;
            const box = (lab, cfgTxt, m1, c) => (
              <div style={{ flex: 1, minWidth: 0, borderRadius: 9, border: `1px solid ${c || BP.borderDim}`, background: 'rgba(8,21,44,.5)', padding: '10px 12px' }}>
                <div style={{ fontFamily: BP.mono, fontSize: 10, color: BP.textDim }}>{lab}</div>
                <div style={{ fontFamily: BP.mono, fontSize: 12.5, color: BP.label, marginTop: 4, lineHeight: 1.4 }}>{cfgTxt}</div>
                <div style={{ fontFamily: BP.mono, fontSize: 11.5, color: BP.text, marginTop: 5 }}>{m1}</div>
              </div>
            );
            return (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'stretch', gap: 9 }}>
                  {box('目前操作', curList, run.length ? `${curKW.toLocaleString()} kW · ${Math.round(curQ).toLocaleString()} CMD${curSE ? ' · ' + curSE.toFixed(3) : ''}` : '—', null)}
                  <div style={{ alignSelf: 'center', color: BP.accent, fontSize: 17 }}>→</div>
                  {box('建議操作', recList2, `${r.kW.toLocaleString()} kW · ${r.Q.toLocaleString()} CMD${r.SE ? ' · ' + r.SE : ''}`, BP.border)}
                </div>
                <div style={{ marginTop: 9, textAlign: 'center', fontFamily: BP.mono, fontSize: 13, fontWeight: 700, padding: '9px', borderRadius: 9, background: dKW > 0.5 ? 'rgba(34,197,94,.1)' : 'rgba(8,21,44,.5)', color: dKW > 0.5 ? '#22C55E' : BP.textDim, border: `1px solid ${dKW > 0.5 ? 'rgba(34,197,94,.4)' : BP.borderDim}` }}>
                  {dKW > 0.5 ? `改採建議可省 ${dKW.toFixed(1)} kW（${dpct.toFixed(1)}%）· SEC ${curSE ? curSE.toFixed(3) : '—'} → ${r.SE ?? '—'}` : '目前操作已接近建議'}
                </div>
              </div>
            );
          })()}

          <div style={{ marginTop: 11 }}>
            <div style={{ fontSize: 11, color: BP.textDim, marginBottom: 6 }}>{tierName} 層級 · {Object.keys(r.sel).length} 台運轉 · 調整清單</div>
            <window.AdjustChecklist cfg={cfg} motors={motors} onDone={onAdjust} />
          </div>
        </div>
      </div>
    </window.BPCard>
  );
}

// ---- per-pump diagnostics (unlocked by single-pump metering) ---------------
function SinglePumpDiag({ motors, mode }) {
  const BP = BPx();
  const sim = mode === 'sim';
  const running = motors.filter(m => m.status !== 'standby');
  const rows = running.map(m => ({ id: m.id, sec: (m.sim && m.sim.meter_sec) || m.sec_kwh_m3, bearing: (m.sim && m.sim.bearing_drv) || 0, vib: (m.sim && m.sim.vib_mm_s) || 0, bad: m.statusType === 'bad' }));
  const worstSec = rows.reduce((a, b) => b.sec > a.sec ? b : a, rows[0] || {});
  const bar = (v, max, c) => <span style={{ display: 'block', height: 8, borderRadius: 4, background: '#06182f', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: Math.min(100, v / max * 100) + '%', background: c }} /></span>;
  const metricCols = [
    { k: 'sec', label: '單位電耗', unit: 'kWh/m³', max: 0.55, c: '#7cd4ff', warn: v => v > 0.45 },
    { k: 'bearing', label: '軸承溫度', unit: '°C', max: 80, c: '#F59E0B', warn: v => v >= 68 },
    { k: 'vib', label: '振動', unit: 'mm/s', max: 6, c: '#a78bfa', warn: v => v >= 4 },
  ];
  return (
    <window.BPCard title="單泵診斷分析" en="Per-Pump Diagnostics · for energy tracking" glow
      right={<window.Tier k={sim ? 'sim' : 'gap'} />}>
      {!sim ? (
        <div style={{ padding: 14 }}>
          <div style={{ fontSize: 12.5, color: BP.label, lineHeight: 1.6 }}>裝設<b style={{ color: BP.accent }}>單泵電表＋流量計＋軸溫/振動感測器</b>後，本區可解鎖以下對能耗追蹤有幫助的分析：</div>
          <div style={{ display: 'grid', gridTemplateColumns: (typeof window !== 'undefined' && window.innerWidth < 760) ? '1fr' : 'repeat(3,1fr)', gap: 10, marginTop: 12 }}>
            {[['單泵效率對比', '找出最耗能的那一台，優先調頻或檢修'], ['軸溫/振動 × 能耗關聯', '機械劣化會推升軸功率，提前發現'], ['單機劣化追蹤', '單泵 SEC 隨時間爬升 = 效能退化早期警訊']].map((x, i) => (
              <div key={i} style={{ background: 'rgba(239,68,68,.05)', border: '1px dashed rgba(239,68,68,.45)', borderRadius: 9, padding: '11px 13px' }}>
                <div style={{ fontFamily: BP.mono, fontSize: 12, fontWeight: 700, color: '#EF4444' }}>🔌 {x[0]}</div>
                <div style={{ fontSize: 11, color: BP.text, marginTop: 6, lineHeight: 1.5 }}>{x[1]}</div>
                <div style={{ fontFamily: BP.mono, fontSize: 9.5, color: '#EF4444', marginTop: 7 }}>待串接</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: BP.textDim, marginTop: 10 }}>※ 切換右上「模擬」可預覽裝錶後的單泵診斷樣貌。</div>
        </div>
      ) : (
        <div style={{ padding: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(3,1fr)', gap: '0 14px', alignItems: 'center' }}>
            <div />
            {metricCols.map(c => <div key={c.k} style={{ fontSize: 10.5, color: BP.textDim, fontFamily: BP.mono, paddingBottom: 6 }}>{c.label} <span style={{ fontSize: 8.5 }}>{c.unit}</span></div>)}
            {rows.map(r => (
              <React.Fragment key={r.id}>
                <div style={{ fontFamily: BP.mono, fontSize: 12.5, fontWeight: 700, color: r.id === worstSec.id ? '#F59E0B' : BP.label, padding: '7px 0' }}>{r.id}{r.id === worstSec.id ? ' ▲' : ''}</div>
                {metricCols.map(c => {
                  const v = r[c.k]; const warn = c.warn(v);
                  return <div key={c.k} style={{ padding: '7px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: BP.mono, fontSize: 11, marginBottom: 3 }}><span style={{ color: warn ? '#F59E0B' : BP.label, fontWeight: 700 }}>{v}</span></div>
                    {bar(v, c.max, warn ? '#F59E0B' : c.c)}
                  </div>;
                })}
              </React.Fragment>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 9, background: 'rgba(192,132,252,.07)', border: '1px solid rgba(192,132,252,.3)', fontSize: 11.5, color: BP.text, lineHeight: 1.6 }}>
            <b style={{ color: '#c084fc' }}>模擬診斷洞察：</b>{worstSec.id} 單位電耗最高（{worstSec.sec} kWh/m³），為全站最耗能機台，建議優先檢視運轉點或安排檢修；其餘機台軸溫/振動在正常範圍。裝錶後此分析以實測值即時更新，可量化「機械劣化 → 能耗上升」的金額。
          </div>
        </div>
      )}
    </window.BPCard>
  );
}

// ---- main analysis page -----------------------------------------------------
function PageAnalysis({ motor, summary, motors, onAdjust, mode }) {
  const BP = BPx();
  const vp = window.useVP ? window.useVP() : { isMobile: false };
  const fid = motor.fid;
  const best = (window.DATA.best.find(b => b.p === window.DATA.meta[fid].label)) || {};
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', fontSize: 11.5, color: BP.text, background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 9, padding: '9px 13px', lineHeight: 1.5 }}>
        <span style={{ fontFamily: BP.mono, fontSize: 10, fontWeight: 700, color: '#22C55E', background: 'rgba(34,197,94,.16)', borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap', marginTop: 1 }}>全為真實數據</span>
        <span style={{ flex: 1, minWidth: 200 }}>本頁皆為真實資料：<b style={{ color: BP.label }}>現場實測效能曲線</b>＋<b style={{ color: BP.label }}>每日站內監控錶趨勢</b>＋<b style={{ color: BP.label }}>台電帳單月度驗證</b>，不依賴單泵計量。{mode === 'sim' ? <span style={{ color: '#c084fc' }}>故切換「模擬」此頁無缺口可補、無差異。</span> : '故無「需取得」缺口標示。'}</span>
      </div>
      {/* row 1: field curve + best-point */}
      <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? '1fr' : 'minmax(0,1.55fr) minmax(0,1fr)', gap: 12 }}>
        <window.BPCard title={`現場 vs 出廠效能曲線 · ${motor.id}`} en="Field vs Factory Curve" glow
          right={<span style={{ fontFamily: BP.mono, fontSize: 11, color: BP.text }}>{window.DATA.meta[fid].label} · {motor.pipe}</span>}>
          <div style={{ padding: '12px 14px' }}><FieldCurveChart motor={motor} /></div>
        </window.BPCard>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <window.BPCard title="運轉角色與最佳點" en="Role & Best Points">
            <div style={{ padding: 13 }}>
              <div style={{ fontSize: 13, color: BP.label, lineHeight: 1.55 }}>{window.roleRationale ? window.roleRationale(motor) : motor.role}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                <FreqBox label="目前 / 角色頻率" v={motor.status === 'standby' ? '備用' : motor.freq + ' Hz'} sub={motor.role} tone={BP.accent} />
                <FreqBox label="最低單位電耗點" v={best.minSE || '—'} sub={'峰效率 ' + (best.peakEff || '—')} tone="#22C55E" />
              </div>
              <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 9, background: 'rgba(8,21,44,.5)', border: `1px solid ${BP.borderDim}`, fontSize: 11.5, color: BP.text, lineHeight: 1.55 }}>
                現場 vs 出廠：<b style={{ color: motor.statusType === 'ok' ? '#22C55E' : '#F59E0B', fontFamily: BP.mono }}>{motor.fieldStatus}</b>。60Hz 出水 <b style={{ fontFamily: BP.mono, color: BP.label }}>{(best.q60 || 0).toLocaleString()} CMD</b> · 單位電耗 <b style={{ fontFamily: BP.mono, color: BP.label }}>{best.se60}</b>。
              </div>
            </div>
          </window.BPCard>
          <window.BPCard title="效率交叉與選泵法則" en="Crossover Rules">
            <div style={{ padding: 13, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {window.DATA.opRules.slice(0, 4).map((r, i) => (
                <div key={i} style={{ fontSize: 11.5, color: BP.text, lineHeight: 1.45 }}><b style={{ color: BP.accent, fontFamily: BP.mono }}>· {r.t}</b><br />{r.d}</div>
              ))}
            </div>
          </window.BPCard>
        </div>
      </div>

      {/* row 2: crossover charts */}
      <window.BPCard title="同馬力效率對比與交叉點" en="Same-HP Efficiency Crossover" glow
        right={<span style={{ fontFamily: BP.mono, fontSize: 10.5, color: BP.text }}>150HP@2,600 · 100HP@3,400 CMD</span>}>
        <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? '1fr' : '1fr 1fr', gap: 12, padding: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: BP.label, marginBottom: 6 }}>100HP · P3 vs P4 現場效率</div>
            <CrossoverChart ids={['P3_100HP', 'P4_100HP']} cross={window.DATA.crossover['100HP']} />
            <div style={{ fontSize: 10.5, color: BP.textDim, marginTop: 4 }}>＞3,400 CMD 選 P3；低於此值 P4 較佳</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: BP.label, marginBottom: 6 }}>150HP · P2 vs P1 現場效率</div>
            <CrossoverChart ids={['P2_150HP', 'P1_150HP']} cross={window.DATA.crossover['150HP']} />
            <div style={{ fontSize: 10.5, color: BP.textDim, marginTop: 4 }}>＞2,600 CMD 選 P2（P1 已衰退、列備用）</div>
          </div>
        </div>
      </window.BPCard>

      {/* row 3: savings proof — daily SEC + monthly validation */}
      <window.BPCard title="實際 vs 基準 · 模型驗證" en="Verified Savings" glow>
        <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? '1fr' : 'minmax(0,1.6fr) minmax(0,1fr)', gap: 14, padding: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: BP.label, marginBottom: 6 }}>每日單位電耗趨勢（{window.STATION.window}）</div>
            <DailySECChart />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <window.BPStat label="台電 5月 SEC" value={summary.se_tp_now.toFixed(3)} unit="kWh/m³" tone="#22C55E" />
              <window.BPStat label="模型改善後" value={summary.se_model_after.toFixed(3)} unit="kWh/m³" tone={BP.accent} />
              <window.BPStat label="模型節能率" value={summary.saving_pct} unit="%" tone="#22C55E" />
              <window.BPStat label="估計年省" value={'$' + (summary.annual_cost_saved / 10000).toFixed(0) + '萬'} unit="NT$" tone="#7cd4ff" />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: BP.mono }}>
              <thead><tr>{['情境', '配置', 'kWh/m³'].map((h, i) => <th key={i} style={{ textAlign: i === 2 ? 'right' : 'left', padding: '6px 8px', fontSize: 9.5, color: BP.textDim, borderBottom: `1px solid ${BP.borderDim}` }}>{h}</th>)}</tr></thead>
              <tbody>{window.DATA.validation.map((v, i) => (
                <tr key={i}><td style={{ padding: '5px 8px', fontSize: 10.5, color: BP.label, borderBottom: `1px solid ${BP.borderDim}` }}>{v.sc}</td>
                  <td style={{ padding: '5px 8px', fontSize: 9.5, color: BP.text, borderBottom: `1px solid ${BP.borderDim}` }}>{v.cfg}</td>
                  <td style={{ padding: '5px 8px', fontSize: 11, fontWeight: 700, color: '#22C55E', textAlign: 'right', borderBottom: `1px solid ${BP.borderDim}` }}>{v.se}</td></tr>
              ))}</tbody>
            </table>
            <div style={{ fontSize: 10.5, color: BP.textDim, lineHeight: 1.5 }}>模型改善幅度約 {summary.saving_pct}%，與台電帳單 5 月降幅約 10% 方向一致。※ 模型值/台電帳單/站內監控錶屬不同量測口徑，絕對值不可直接混用。</div>
          </div>
        </div>
      </window.BPCard>

      {/* supply → pre/post energy */}
      <SupplyEnergyCompare />

      {/* per-pump diagnostics */}
      <SinglePumpDiag motors={motors} mode={mode} />

      {/* row 4: solver */}
      <SolverPanel onAdjust={onAdjust} motors={motors} />

      {/* tariff / carbon calculator */}
      <TariffCalc />
    </div>
  );
}

function FreqBox({ label, v, sub, tone }) {
  const BP = BPx();
  return <div style={{ padding: '9px 11px', borderRadius: 8, background: 'rgba(8,21,44,.5)', border: `1px solid ${BP.borderDim}` }}>
    <div style={{ fontSize: 10, color: BP.textDim }}>{label}</div>
    <div style={{ fontFamily: BP.mono, fontSize: 17, fontWeight: 700, color: tone, marginTop: 2 }}>{v}</div>
    <div style={{ fontFamily: BP.mono, fontSize: 10, color: BP.text }}>{sub}</div>
  </div>;
}

// ---- supply → pre/post-optimization energy line-scan (日/月/年) -------------
function SupplyEnergyCompare() {
  const BP = BPx();
  const vp = window.useVP ? window.useVP() : { isMobile: false };
  const [ref, w] = useW();
  const M = (window.DATA && window.DATA.monthly) || [];
  const sum = (a, f) => a.reduce((s, x) => s + (f(x) || 0), 0);
  const bef = M.filter(x => x.phase === '改善前'), aft = M.filter(x => x.phase === '改善後');
  const bVol = sum(bef, x => x.flow) || 1, bKwh = sum(bef, x => x.kwh_tp), bSec = bKwh / bVol;
  const aVol = sum(aft, x => x.flow) || 1, aKwh = sum(aft, x => x.kwh_tp), aSec = aKwh / aVol;
  const CO2 = (window.DATA && window.DATA.tariff && window.DATA.tariff.co2) || 0.467;
  const SCALES = {
    '日': { min: 3000, max: 12000, step: 100, def: Math.round(aVol / 31), u: 'm³/日', ku: 'kWh/日' },
    '月': { min: 200000, max: 320000, step: 1000, def: Math.round(aVol), u: 'm³/月', ku: 'kWh/月' },
    '年': { min: 2400000, max: 3800000, step: 10000, def: Math.round(aVol * 12), u: 'm³/年', ku: 'kWh/年' },
  };
  const scale = '月';
  const S = SCALES[scale];
  const vol = S.def;   // 同步上方儀表板實際供水量，不再可拖動
  const [projHover, setProjHover] = React.useState(null);
  const eB = vol * bSec, eA = vol * aSec, save = eB - eA, pct = eB ? save / eB * 100 : 0, co2 = save * CO2 / 1000;

  const fmt = n => Math.round(n).toLocaleString();
  // annualized projection (for freed space below the compact bars)
  const yrFactor = scale === '日' ? 365 : scale === '月' ? 12 : 1;
  const Tf = (window.DATA && window.DATA.tariff) || { peak: 9.39, halfpeak: 5.85, offpeak: 2.53 };
  const blended = Tf.peak * 0.1 + Tf.halfpeak * 0.42 + Tf.offpeak * 0.48;
  const yrSave = save * yrFactor, yrCost = yrSave * blended, yrCo2 = yrSave * CO2 / 1000, homes = yrSave / 3600;
  const yrLabel = yrFactor === 365 ? ' ×365 天' : yrFactor === 12 ? ' ×12 月' : '';
  const projNotes = [
    `年省電量 ＝ 供水量 ${fmt(vol)} ${S.u} ×（改善前 ${bSec.toFixed(4)} − 改善後 ${aSec.toFixed(4)} kWh/m³）${yrLabel}。依台電帳單實測單位電耗計算，有實測依據。`,
    `年省電費 ＝ 年省電量 × 平均電價 ${blended.toFixed(2)} 元/度。電價採台電三段式（尖峰/半尖峰/離峰概估 10%/42%/48% 分配），分配比例為估算、實際依帳單。`,
    `年減碳量 ＝ 年省電量 × 電力排碳係數 ${CO2} kgCO₂e/度。係數為台電／能源署公告之電力排放係數，屬官方依據。`,
    `相當戶數 ＝ 年省電量 ÷ 每戶年用電 3,600 度（約 300 度/月，台灣住宅平均概估）。此為易懂比喻，非精確統計。`,
  ];
  return (
    <window.BPCard title="供水量 → 優化前 / 優化後 用電" en="Supply → Energy (pre/post)" glow
      right={<span style={{ fontFamily: BP.mono, fontSize: 10.5, color: BP.text }}>以 5 月實測為基準 · 全年推估</span>}>
      <div style={{ padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 13 }}>
          {[{ ttl: '改善前', en: 'BEFORE', sub: '2025/03–04 實測（策略修改前）', vol: bVol, kwh: bKwh, sec: bSec, c: '#ef6461' },
            { ttl: '改善後', en: 'AFTER ▾', sub: '2025/05 實測（5/5 15:30 起）', vol: aVol, kwh: aKwh, sec: aSec, c: '#22C55E' }].map((p, i) => (
            <div key={i} style={{ borderRadius: 10, border: `1px solid ${p.c}55`, background: `${p.c}0d`, padding: '12px 15px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: p.c }}>{p.ttl}</span>
                <span style={{ fontFamily: BP.mono, fontSize: 9.5, color: BP.textDim, letterSpacing: 1 }}>{p.en}</span>
              </div>
              <div style={{ fontSize: 10.5, color: BP.textDim, marginTop: 2 }}>{p.sub}</div>
              {[['總供水量', p.vol.toLocaleString(), 'm³'], ['總用電量（台電）', p.kwh.toLocaleString(), 'kWh'], ['單位電耗', p.sec.toFixed(3), 'kWh/m³']].map((r, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 9, borderTop: j ? `1px solid ${BP.borderDim}` : 'none', paddingTop: j ? 8 : 0 }}>
                  <span style={{ fontSize: 11.5, color: BP.text }}>{r[0]}</span>
                  <span><b style={{ fontFamily: BP.mono, fontSize: 17, fontWeight: 700, color: j === 2 ? p.c : BP.label }}>{r[1]}</b> <span style={{ fontSize: 9.5, color: BP.textDim }}>{r[2]}</span></span>
                </div>
              ))}
            </div>
          ))}
        </div>
        {/* compact bars (left, half width) + annual projection (right) */}
        <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)', gap: 14, alignItems: 'stretch' }}>
          {/* left: short horizontal compare bars */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 10.5, color: BP.textDim, marginBottom: 9 }}>相同供水量 <b style={{ color: BP.label, fontFamily: BP.mono }}>{fmt(vol)}</b> {S.u} 下的用電對比</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[['優化前', eB, '#ef6461', false], ['優化後', eA, '#22C55E', true]].map(([lab, val, c, isAfter], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 44, flexShrink: 0, fontSize: 11, fontWeight: 700, color: c }}>{lab}</span>
                  <div style={{ flex: 1, position: 'relative', height: 30, borderRadius: 7, background: 'rgba(8,21,44,.55)', border: `1px solid ${BP.borderDim}`, overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${eB ? Math.max(2, val / eB * 100) : 0}%`, background: c, opacity: .82, transition: 'width .25s' }} />
                    {isAfter && eB > 0 && (
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${eA / eB * 100}%`, right: 0, background: 'repeating-linear-gradient(45deg, rgba(34,197,94,.20), rgba(34,197,94,.20) 5px, transparent 5px, transparent 11px)', borderLeft: '1px dashed rgba(34,197,94,.7)' }} />
                    )}
                    <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', fontFamily: BP.mono, fontSize: 12, fontWeight: 700, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,.6)' }}>{fmt(val)} <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,.72)' }}>{S.ku}</span></span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, paddingLeft: 53 }}>
              <span style={{ fontFamily: BP.mono, fontSize: 12, fontWeight: 700, color: '#22C55E' }}>↳ 省 {fmt(save)} {S.ku}（−{pct.toFixed(1)}%）</span>
              <span style={{ display: 'block', fontSize: 10, color: BP.textDim, marginTop: 2 }}>斜紋區＝省下的電 · 減碳約 {co2.toFixed(co2 < 10 ? 1 : 0)} 噸 CO₂</span>
            </div>
          </div>

          {/* right: annualized projection */}
          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(34,197,94,.07)', border: '1px solid rgba(34,197,94,.28)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#22C55E' }}>全年預估</span>
              <span style={{ fontFamily: BP.mono, fontSize: 9.5, color: BP.textDim }}>ANNUALIZED · 依目前節能幅度</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 9 }}>
              {[['年省電量', fmt(yrSave), 'kWh', BP.accent],
                ['年省電費', (yrCost >= 10000 ? fmt(yrCost / 10000) + ' 萬' : fmt(yrCost)), 'NT$', '#22C55E'],
                ['年減碳量', yrCo2.toFixed(yrCo2 < 100 ? 1 : 0), '噸 CO₂', '#84CC16'],
                ['相當於', homes.toFixed(homes < 10 ? 1 : 0), '戶家庭年用電', '#22D3EE']].map((m, i) => (
                <div key={i} onMouseEnter={() => setProjHover(i)} onMouseLeave={() => setProjHover(h => h === i ? null : h)}
                  style={{ background: projHover === i ? `${m[3]}14` : 'rgba(8,21,44,.5)', border: `1px solid ${projHover === i ? m[3] : BP.borderDim}`, borderRadius: 8, padding: '9px 11px', display: 'flex', flexDirection: 'column', justifyContent: 'center', cursor: 'help', transition: 'all .15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 9.5, color: BP.textDim, whiteSpace: 'nowrap' }}>{m[0]}</span>
                    <span style={{ fontFamily: BP.mono, fontSize: 8.5, color: projHover === i ? m[3] : BP.borderDim, border: `1px solid ${projHover === i ? m[3] : BP.borderDim}`, borderRadius: 999, width: 11, height: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>i</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 3 }}>
                    <span style={{ fontFamily: BP.mono, fontSize: 17, fontWeight: 700, color: m[3], lineHeight: 1 }}>{m[1]}</span>
                    <span style={{ fontSize: 8.5, color: BP.text }}>{m[2]}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 9, fontSize: 10.5, color: projHover != null ? BP.label : BP.textDim, lineHeight: 1.55, minHeight: 32 }}>
              {projHover != null ? projNotes[projHover] : '滑鼠移到上方項目，可看各自的計算依據與來源。'}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 10, color: BP.textDim, marginTop: 11, lineHeight: 1.5 }}>※ 供水量同步上方實際數據（{scale}）；少用的電＝供水量 ×（改善前 {bSec.toFixed(4)} − 改善後 {aSec.toFixed(4)} kWh/m³）。電費以混合電價 {blended.toFixed(2)} 元/度概估，家庭以年 3,600 度估算。</div>
      </div>
    </window.BPCard>
  );
}


// ---- TOU tariff / carbon calculator (ported from standalone) ----------------
function TariffCalc() {
  const BP = BPx();
  const vp = window.useVP ? window.useVP() : { isMobile: false };
  const T = (window.DATA && window.DATA.tariff) || { peak: 9.39, halfpeak: 5.85, offpeak: 2.53, co2: 0.467 };
  const M = (window.DATA && window.DATA.monthly) || [];
  const may = M[M.length - 1] || { kwh_tp: 91280 };
  const [s, setS] = React.useState({
    peak: T.peak, half: T.halfpeak, off: T.offpeak, co2: T.co2,
    up: Math.round(may.kwh_tp * 0.10), uh: Math.round(may.kwh_tp * 0.42), uo: Math.round(may.kwh_tp * 0.48),
  });
  const set = (k, v) => setS(o => ({ ...o, [k]: v === '' ? 0 : +v }));
  const cp = s.peak * s.up, ch = s.half * s.uh, co = s.off * s.uo, tot = cp + ch + co, kwh = s.up + s.uh + s.uo, co2 = kwh * s.co2;
  const fmt = n => Math.round(n).toLocaleString();
  const inp = (k, w = 92) => <input type="number" value={s[k]} onChange={e => set(k, e.target.value)} style={{ width: w, fontFamily: BP.mono, fontSize: 15, color: BP.label, background: 'rgba(8,21,44,.7)', border: `1px solid ${BP.borderDim}`, borderRadius: 6, padding: '7px 10px', textAlign: 'right' }} />;
  const ROWS = [['尖峰', 'peak', 'up', '#ef6461'], ['半尖峰', 'half', 'uh', '#F59E0B'], ['離峰', 'off', 'uo', '#22C55E']];
  const sub = { peak: cp, half: ch, off: co };
  const inpU = (k, unit, w = 88) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 0, background: 'rgba(8,21,44,.7)', border: `1px solid ${BP.borderDim}`, borderRadius: 7, overflow: 'hidden' }}>
      <input type="number" value={s[k]} onChange={e => set(k, e.target.value)} style={{ width: w, fontFamily: BP.mono, fontSize: 15, fontWeight: 600, color: BP.label, background: 'transparent', border: 'none', outline: 'none', padding: '7px 8px', textAlign: 'right' }} />
      <span style={{ fontFamily: BP.mono, fontSize: 10.5, color: BP.textDim, padding: '0 9px 0 2px' }}>{unit}</span>
    </span>
  );
  return (
    <window.BPCard title="電價 · 碳排試算" en="Tariff & Carbon Calculator" glow
      right={<span style={{ fontFamily: BP.mono, fontSize: 10.5, color: BP.text }}>台電三段式 · 可調輸入</span>}>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 13, color: BP.text, marginBottom: 14, lineHeight: 1.55 }}>輸入各時段<b style={{ color: BP.label }}>電價</b>與<b style={{ color: BP.label }}>用電度數</b>，即時算出電費與碳排（預設為 5 月台電帳單概估分配）。</div>

        {/* cost composition bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', border: `1px solid ${BP.borderDim}` }}>
            {ROWS.map(([lab, rk, uk, c]) => <span key={rk} title={lab} style={{ width: (tot ? sub[rk] / tot * 100 : 0) + '%', background: c, transition: 'width .3s' }} />)}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 7, flexWrap: 'wrap' }}>
            {ROWS.map(([lab, rk, uk, c]) => <span key={rk} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: BP.mono, fontSize: 11, color: BP.text }}><span style={{ width: 9, height: 9, borderRadius: 2, background: c }} />{lab} {tot ? Math.round(sub[rk] / tot * 100) : 0}%</span>)}
          </div>
        </div>

        {/* tariff rows as cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ display: vp.isMobile ? 'none' : 'grid', gridTemplateColumns: '150px 1fr 1fr 150px', gap: 12, padding: '0 14px', fontFamily: BP.mono, fontSize: 11, color: BP.textDim }}>
            <span>時段</span><span style={{ textAlign: 'right' }}>電價</span><span style={{ textAlign: 'right' }}>用電度數</span><span style={{ textAlign: 'right' }}>電費 NT$</span>
          </div>
          {ROWS.map(([lab, rk, uk, c]) => (
            <div key={rk} style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? '1fr 1fr' : '150px 1fr 1fr 150px', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, background: 'rgba(8,21,44,.5)', border: `1px solid ${BP.borderDim}`, borderLeft: `3px solid ${c}` }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: BP.label }}><span style={{ width: 9, height: 9, borderRadius: 999, background: c, boxShadow: `0 0 6px ${c}` }} />{lab}</span>
              <span style={{ textAlign: vp.isMobile ? 'left' : 'right' }}>{inpU(rk, '元/度', 72)}</span>
              <span style={{ textAlign: vp.isMobile ? 'left' : 'right' }}>{inpU(uk, '度', 88)}</span>
              <span style={{ gridColumn: vp.isMobile ? '1 / -1' : 'auto', textAlign: 'right', fontFamily: BP.mono, fontSize: 18, fontWeight: 700, color: BP.label }}>${fmt(sub[rk])}</span>
            </div>
          ))}
        </div>

        {/* summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 10, marginTop: 14 }}>
          {[['總電費', '$' + fmt(tot), 'NT$ / 月', BP.accent, true],
            ['總用電', fmt(kwh), '度 / 月', BP.label, false],
            ['平均電價', kwh ? (tot / kwh).toFixed(2) : '—', '元 / 度', '#7cd4ff', false],
            ['碳排放', fmt(co2 / 1000), '噸 CO₂ / 月', '#22C55E', false]].map((m, i) => (
            <div key={i} style={{ padding: '13px 15px', borderRadius: 10, background: m[4] ? `linear-gradient(150deg, ${m[3]}1f, rgba(8,21,44,.5))` : 'rgba(8,21,44,.5)', border: `1px solid ${m[4] ? m[3] + '66' : BP.borderDim}` }}>
              <div style={{ fontSize: 11.5, color: BP.textDim }}>{m[0]}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 5 }}>
                <span style={{ fontFamily: BP.mono, fontSize: m[4] ? 24 : 21, fontWeight: 700, color: m[3], lineHeight: 1 }}>{m[1]}</span>
              </div>
              <div style={{ fontFamily: BP.mono, fontSize: 10.5, color: BP.text, marginTop: 4 }}>{m[2]}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap', paddingTop: 13, borderTop: `1px solid ${BP.borderDim}` }}>
          <span style={{ fontSize: 12.5, color: BP.textDim }}>碳排係數</span>{inpU('co2', 'kgCO₂e/度', 64)}<span style={{ fontSize: 11.5, color: BP.textDim }}>能源署 114 年度公告 0.467</span>
          <span style={{ marginLeft: 'auto', fontSize: 11.5, color: BP.textDim }}>※ 確切電價別與契約容量請以台電帳單為準。</span>
        </div>
      </div>
    </window.BPCard>
  );
}

Object.assign(window, { FieldCurveChart, CrossoverChart, DailySECChart, SinglePumpDiag, SupplyEnergyCompare, TariffCalc, SolverPanel, PageAnalysis });
