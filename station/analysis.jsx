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

// ---- crossover EFF comparison (P1/P2 or P3/P4) -----------------------------
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

// ---- daily SEC trend (real, 112 days) --------------------------------------
function DailySECChart({ height = 200 }) {
  const BP = BPx();
  const ACC = window.__SIM__ ? '#c084fc' : BP.accent;   // 模擬模式 → 此趨勢圖用紫色（標示為模擬資料）
  const [ref, w] = useW();
  const d = window.dailySEC();
  const padL = 40, padR = 12, padT = 14, padB = 26;
  const innerW = Math.max(10, w - padL - padR), innerH = height - padT - padB;
  const vals = d.map(p => p.sec);
  const lo = Math.min(...vals) * 0.97, hi = Math.max(...vals) * 1.03;
  const X = i => padL + (i / (d.length - 1)) * innerW;
  const Y = v => padT + innerH - ((v - lo) / (hi - lo)) * innerH;
  const line = d.map((p, i) => `${i ? 'L' : 'M'} ${X(i).toFixed(1)} ${Y(p.sec).toFixed(1)}`).join(' ');
  const ci = d.findIndex(p => p.d === '2025-05-05');
  const thr = (v, c, lab) => <g><line x1={padL} y1={Y(v)} x2={w - padR} y2={Y(v)} stroke={c} strokeWidth="1" strokeDasharray="5 4" opacity=".7" /><text x={w - padR} y={Y(v) - 3} textAnchor="end" fontSize="8.5" fill={c}>{lab}</text></g>;
  return (
    <div ref={ref} style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} style={{ display: 'block', fontFamily: BP.mono }}>
        {[0, .5, 1].map((f, i) => { const y = padT + innerH * (1 - f); const v = lo + (hi - lo) * f; return <g key={i}><line x1={padL} y1={y} x2={w - padR} y2={y} stroke={BP.borderDim} strokeDasharray={f === 0 ? '' : '2 4'} /><text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill={BP.text}>{v.toFixed(2)}</text></g>; })}
        {/* health thresholds */}
        {0.42 > lo && 0.42 < hi && thr(0.42, '#F59E0B', '0.42 退化提醒')}
        {/* improvement marker */}
        {ci > 0 && <g><line x1={X(ci)} y1={padT} x2={X(ci)} y2={padT + innerH} stroke="#22C55E" strokeWidth="1.2" strokeDasharray="4 3" /><text x={X(ci)} y={padT + 9} textAnchor="middle" fontSize="8.5" fill="#22C55E">5/5 優化上線</text></g>}
        <path d={line} fill="none" stroke={ACC} strokeWidth="1.8" style={{ filter: `drop-shadow(0 0 2px ${ACC}88)` }} />
        {[0, Math.floor(d.length / 2), d.length - 1].map((i, k) => <text key={k} x={X(i)} y={height - 8} textAnchor={k === 0 ? 'start' : k === 2 ? 'end' : 'middle'} fontSize="9" fill={BP.textDim}>{String(d[i].d).slice(0,7).replace('-','/')}</text>)}
        <text x={padL - 6} y={9} textAnchor="end" fontSize="8.5" fill={ACC}>kWh/m³</text>
        <text x={w - padR} y={height - 1} textAnchor="end" fontSize="8.5" fill={BP.label}>日期 →</text>
      </svg>
      <div style={{ display: 'flex', gap: 14, padding: '2px 6px 0', fontSize: 10, color: BP.text, fontFamily: BP.mono }}>
        <Leg c={ACC} t="每日單位電耗（站內監控錶口徑）" />
        <span style={{ color: BP.textDim }}>※ 一次性實測曲線推估；剔除 04/01 抓表假影</span>
      </div>
    </div>
  );
}

// ---- A. 月度單位電耗趨勢 (24個月; 模擬模式紫色) -------------------------------
function MonthlyTrendChart({ height = 200 }) {
  const BP = BPx();
  const ACC = window.__SIM__ ? '#c084fc' : BP.accent;
  const [ref, w] = useW();
  const m = (window.DATA.monthly || []);
  if (!m.length) return null;
  const padL = 42, padR = 14, padT = 16, padB = 34;
  const innerW = Math.max(10, w - padL - padR), innerH = height - padT - padB;
  const tp = m.map(x => x.se_tp).filter(v => v != null);
  const tw = m.map(x => x.se_tw).filter(v => v != null);
  const allv = tp.concat(tw);
  const lo = Math.min(...allv) * 0.92, hi = Math.max(...allv) * 1.08;
  const N = m.length;
  const X = i => padL + (N <= 1 ? innerW / 2 : (i / (N - 1)) * innerW);
  const Y = v => padT + innerH - ((v - lo) / (hi - lo)) * innerH;
  const pathOf = key => {
    const pts = m.map((x, i) => ({ i, v: x[key] })).filter(p => p.v != null);
    return pts.map((p, k) => `${k ? 'L' : 'M'} ${X(p.i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ');
  };
  const lineTp = pathOf('se_tp'), lineTw = pathOf('se_tw');
  const ci = m.findIndex(x => x.phase === '改善後');
  const step = N > 12 ? Math.ceil(N / 12) : 1;
  const lab = ym => String(ym || '').replace('-', '/');
  return (
    <div ref={ref} style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} style={{ display: 'block', fontFamily: BP.mono }}>
        {[0, .5, 1].map((f, i) => { const y = padT + innerH * (1 - f); const v = lo + (hi - lo) * f; return <g key={i}><line x1={padL} y1={y} x2={w - padR} y2={y} stroke={BP.borderDim} strokeDasharray={f === 0 ? '' : '2 4'} /><text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill={BP.text}>{v.toFixed(2)}</text></g>; })}
        {ci > 0 && <g><line x1={X(ci)} y1={padT} x2={X(ci)} y2={padT + innerH} stroke="#22C55E" strokeWidth="1.2" strokeDasharray="4 3" /><text x={X(ci)} y={padT + 9} textAnchor="middle" fontSize="8.5" fill="#22C55E">5/5 優化上線</text></g>}
        {lineTw && <path d={lineTw} fill="none" stroke="#F59E0B" strokeWidth="1.5" opacity=".8" strokeDasharray="4 3" />}
        {lineTp && <path d={lineTp} fill="none" stroke={ACC} strokeWidth="2.2" style={{ filter: `drop-shadow(0 0 2px ${ACC}88)` }} />}
        {m.map((x, i) => x.se_tp == null ? null : <circle key={i} cx={X(i)} cy={Y(x.se_tp)} r="2.6" fill={ACC} />)}
        {m.map((x, i) => (i % step === 0 || i === N - 1) ? <text key={'t' + i} x={X(i)} y={height - 9} textAnchor="middle" fontSize="8" fill={BP.textDim}>{lab(x.ym || x.m)}</text> : null)}
        <text x={padL - 6} y={10} textAnchor="end" fontSize="8.5" fill={ACC}>kWh/m³</text>
      </svg>
      <div style={{ display: 'flex', gap: 14, padding: '2px 6px 0', fontSize: 10, color: BP.text, fontFamily: BP.mono, flexWrap: 'wrap' }}>
        <Leg c={ACC} t="月度單位電耗（台電帳單口徑）" />
        <Leg c="#F59E0B" t="站內監控錶口徑" dash sw={1.5} />
        <span style={{ color: BP.textDim }}>{N} 個月{window.__SIM__ ? '・模擬' : ''}</span>
      </div>
    </div>
  );
}

// ---- C. 年度同月對比 (year-over-year; 模擬模式紫色系) -------------------------
function YoYChart({ height = 200 }) {
  const BP = BPx();
  const [ref, w] = useW();
  const m = (window.DATA.monthly || []);
  if (!m.length) return null;
  const byYear = {};
  m.forEach(x => {
    const parts = String(x.ym || '').split('-');
    if (parts.length < 2) return;
    const y = parts[0], mo = parseInt(parts[1], 10) - 1;
    (byYear[y] = byYear[y] || Array(12).fill(null))[mo] = x.se_tp;
  });
  const years = Object.keys(byYear).sort();
  if (!years.length) return null;
  const allv = [].concat(...years.map(y => byYear[y])).filter(v => v != null);
  if (!allv.length) return null;
  const lo = Math.min(...allv) * 0.92, hi = Math.max(...allv) * 1.08;
  const padL = 42, padR = 14, padT = 16, padB = 34;
  const innerW = Math.max(10, w - padL - padR), innerH = height - padT - padB;
  const X = mo => padL + (mo / 11) * innerW;
  const Y = v => padT + innerH - ((v - lo) / (hi - lo)) * innerH;
  const pal = window.__SIM__ ? ['#c084fc', '#7c3aed', '#e9d5ff', '#a855f7', '#9333ea'] : [BP.accent, '#F59E0B', '#22C55E', '#a78bfa'];
  const MO = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  return (
    <div ref={ref} style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} style={{ display: 'block', fontFamily: BP.mono }}>
        {[0, .5, 1].map((f, i) => { const y = padT + innerH * (1 - f); const v = lo + (hi - lo) * f; return <g key={i}><line x1={padL} y1={y} x2={w - padR} y2={y} stroke={BP.borderDim} strokeDasharray={f === 0 ? '' : '2 4'} /><text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill={BP.text}>{v.toFixed(2)}</text></g>; })}
        {MO.map((mo, i) => <text key={'mo' + i} x={X(i)} y={height - 9} textAnchor="middle" fontSize="8" fill={BP.textDim}>{mo}月</text>)}
        {years.map((y, yi) => {
          const pts = byYear[y].map((v, mo) => ({ mo, v })).filter(p => p.v != null);
          if (!pts.length) return null;
          const line = pts.map((p, k) => `${k ? 'L' : 'M'} ${X(p.mo).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ');
          const col = pal[yi % pal.length];
          return <g key={y}><path d={line} fill="none" stroke={col} strokeWidth="2" />{pts.map((p, k) => <circle key={k} cx={X(p.mo)} cy={Y(p.v)} r="2.4" fill={col} />)}</g>;
        })}
        <text x={padL - 6} y={10} textAnchor="end" fontSize="8.5" fill={BP.label}>kWh/m³</text>
      </svg>
      <div style={{ display: 'flex', gap: 12, padding: '2px 6px 0', fontSize: 10, color: BP.text, fontFamily: BP.mono, flexWrap: 'wrap' }}>
        {years.map((y, yi) => <Leg key={y} c={pal[yi % pal.length]} t={y + ' 年'} />)}
        <span style={{ color: BP.textDim }}>同月對比（台電口徑）</span>
      </div>
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
          <div style={{ fontSize: 11.5, fontWeight: 600, color: BP.label, marginBottom: 5 }}>台電計費時段</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {TOU.map((t, i) => <button key={i} onClick={() => { setTouIdx(i); if (TIERMAP[t.k]) setDemand(TIERMAP[t.k]); }} style={{ all: 'unset', cursor: 'pointer', fontFamily: BP.mono, fontSize: 11.5, padding: '6px 12px', borderRadius: 7, color: touIdx === i ? '#06223f' : BP.text, background: touIdx === i ? BP.accent : 'rgba(8,21,44,.6)', border: `1px solid ${BP.borderDim}` }}>{t.k}</button>)}
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: BP.label, margin: '14px 0 4px' }}>需求水量</div>
          <div style={{ fontFamily: BP.mono, fontSize: 34, fontWeight: 700, color: BP.accent, lineHeight: 1 }}>{demand.toLocaleString()}<span style={{ fontSize: 12, color: BP.textDim }}> CMD/日</span></div>
          <input type="range" min="0" max="14000" step="100" value={demand} onChange={e => setDemand(+e.target.value)} style={{ width: '100%', marginTop: 12, accentColor: BP.accent }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: BP.mono, fontSize: 10, color: BP.textDim }}><span>0</span><span>7,000</span><span>14,000</span></div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            {[['離峰', 5000], ['半尖峰', 10000], ['尖峰', 13300]].map(p => <button key={p[0]} onClick={() => setDemand(p[1])} style={{ all: 'unset', cursor: 'pointer', fontFamily: BP.mono, fontSize: 10.5, padding: '5px 10px', borderRadius: 6, color: BP.text, background: 'rgba(8,21,44,.6)', border: `1px solid ${BP.borderDim}` }}>{p[0]} {p[1].toLocaleString()}</button>)}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 11.5, color: BP.text, cursor: 'pointer' }}>
            <span onClick={() => setAllowP1(!allowP1)} style={{ width: 36, height: 20, borderRadius: 20, background: allowP1 ? '#0e7c8a' : BP.borderDim, position: 'relative', transition: '.2s', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 2, left: allowP1 ? 18 : 2, width: 16, height: 16, borderRadius: 999, background: '#fff', transition: '.2s' }} /></span>
            允許啟用 150HP P1（備用·已衰退）
          </label>
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
          {/* per-pump bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
            {window.DATA.order.map(k => {
              const hz = r.sel[k]; const e = hz ? window.expectAt(k, hz) : null; const q = e ? e.Q : 0;
              return <div key={k} style={{ display: 'grid', gridTemplateColumns: '54px 1fr 92px', alignItems: 'center', gap: 9, opacity: hz ? 1 : .45 }}>
                <span style={{ fontFamily: BP.mono, fontSize: 11.5, color: BP.text }}>{window.DATA.meta[k].label.split(' ')[1]}</span>
                <span style={{ height: 16, background: '#06182f', border: `1px solid ${BP.borderDim}`, borderRadius: 5, overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: Math.min(100, q / 6000 * 100) + '%', background: hz ? 'linear-gradient(90deg,#0e7c8a,#7cd4ff)' : BP.borderDim, transition: 'width .35s' }} /></span>
                <span style={{ fontFamily: BP.mono, fontSize: 10.5, color: BP.textDim, textAlign: 'right' }}>{hz ? hz + 'Hz·' + Math.round(q).toLocaleString() : '停機'}</span>
              </div>;
            })}
          </div>
          {r.over && <div style={{ marginTop: 9, fontSize: 11, color: '#F59E0B', background: 'rgba(245,158,11,.08)', border: '1px solid #F59E0B', borderRadius: 8, padding: '8px 11px' }}>⚠ 需求超過機組 60Hz 總供水能力，已顯示全機上限；實務需評估增設機組。</div>}
          {r.sel.P1_150HP && <div style={{ marginTop: 9, fontSize: 11, color: '#F59E0B', background: 'rgba(245,158,11,.08)', border: '1px solid #F59E0B', borderRadius: 8, padding: '8px 11px' }}>⚠ 此解動用備用且衰退的 P1，建議改以 P2＋100HP 滿足需求。</div>}
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
            <div style={{ fontSize: 12, fontWeight: 700, color: BP.label, marginBottom: 6 }}>150HP · P1 vs P2 現場效率</div>
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

      {/* row 3.5: 月度趨勢 + 年度對比（使用兩年資料） */}
      <window.BPCard title="月度趨勢與年度對比" en="Monthly Trend & Year-over-Year" glow>
        <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? '1fr' : '1fr 1fr', gap: 14, padding: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: BP.label, marginBottom: 6 }}>月度單位電耗趨勢{window.__SIM__ ? '（兩年模擬）' : ''}</div>
            <MonthlyTrendChart />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: BP.label, marginBottom: 6 }}>年度同月對比{window.__SIM__ ? '（模擬）' : ''}</div>
            <YoYChart />
          </div>
        </div>
      </window.BPCard>

      {/* per-pump diagnostics */}
      <SinglePumpDiag motors={motors} mode={mode} />

      {/* row 4: solver */}
      <SolverPanel onAdjust={onAdjust} motors={motors} />
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

Object.assign(window, { FieldCurveChart, CrossoverChart, DailySECChart, SinglePumpDiag, SolverPanel, PageAnalysis });
