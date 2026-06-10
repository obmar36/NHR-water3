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
  const [ref, w] = useW();
  const d = window.dailySEC();
  const padL = 40, padR = 12, padT = 14, padB = 26;
  const innerW = Math.max(10, w - padL - padR), innerH = height - padT - padB;
  const vals = d.map(p => p.sec);
  const lo = Math.min(...vals) * 0.97, hi = Math.max(...vals) * 1.03;
  const X = i => padL + (i / (d.length - 1)) * innerW;
  const Y = v => padT + innerH - ((v - lo) / (hi - lo)) * innerH;
  const line = d.map((p, i) => `${i ? 'L' : 'M'} ${X(i).toFixed(1)} ${Y(p.sec).toFixed(1)}`).join(' ');
  const ci = d.findIndex(p => p.d === '05/05');
  const thr = (v, c, lab) => <g><line x1={padL} y1={Y(v)} x2={w - padR} y2={Y(v)} stroke={c} strokeWidth="1" strokeDasharray="5 4" opacity=".7" /><text x={w - padR} y={Y(v) - 3} textAnchor="end" fontSize="8.5" fill={c}>{lab}</text></g>;
  return (
    <div ref={ref} style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} style={{ display: 'block', fontFamily: BP.mono }}>
        {[0, .5, 1].map((f, i) => { const y = padT + innerH * (1 - f); const v = lo + (hi - lo) * f; return <g key={i}><line x1={padL} y1={y} x2={w - padR} y2={y} stroke={BP.borderDim} strokeDasharray={f === 0 ? '' : '2 4'} /><text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill={BP.text}>{v.toFixed(2)}</text></g>; })}
        {/* health thresholds */}
        {0.42 > lo && 0.42 < hi && thr(0.42, '#F59E0B', '0.42 退化提醒')}
        {/* improvement marker */}
        {ci > 0 && <g><line x1={X(ci)} y1={padT} x2={X(ci)} y2={padT + innerH} stroke="#22C55E" strokeWidth="1.2" strokeDasharray="4 3" /><text x={X(ci)} y={padT + 9} textAnchor="middle" fontSize="8.5" fill="#22C55E">5/5 優化上線</text></g>}
        <path d={line} fill="none" stroke={BP.accent} strokeWidth="1.8" style={{ filter: 'drop-shadow(0 0 2px rgba(124,212,255,.5))' }} />
        {[0, Math.floor(d.length / 2), d.length - 1].map((i, k) => <text key={k} x={X(i)} y={height - 8} textAnchor={k === 0 ? 'start' : k === 2 ? 'end' : 'middle'} fontSize="9" fill={BP.textDim}>{d[i].d}</text>)}
        <text x={padL - 6} y={9} textAnchor="end" fontSize="8.5" fill={BP.accent}>kWh/m³</text>
        <text x={w - padR} y={height - 1} textAnchor="end" fontSize="8.5" fill={BP.label}>日期 →</text>
      </svg>
      <div style={{ display: 'flex', gap: 14, padding: '2px 6px 0', fontSize: 10, color: BP.text, fontFamily: BP.mono }}>
        <Leg c={BP.accent} t="每日單位電耗（站內監控錶口徑）" />
        <span style={{ color: BP.textDim }}>※ 一次性實測曲線推估；剔除 04/01 抓表假影</span>
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
            允許啟用 150HP P4（備用·已衰退）
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
            if (r.sel.P2_150HP && !r.sel.P1_150HP) reasons.push('需求高於 2,600 CMD，150HP 選效率較佳的 P3、不啟用已衰退的 P4。');
            if (r.sel.P3_100HP && r.sel.P4_100HP) reasons.push('100HP 雙機分流：P1 偏高流量、P2 偏低流量，各取較佳效率點。');
            else if (r.sel.P3_100HP) reasons.push('100HP 以 P1 為主（57Hz 附近接近峰值效率 ~70%）。');
            else if (r.sel.P4_100HP) reasons.push('低流量區由 P2 承擔（其低頻效率最佳）。');
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
          {r.sel.P1_150HP && <div style={{ marginTop: 9, fontSize: 11, color: '#F59E0B', background: 'rgba(245,158,11,.08)', border: '1px solid #F59E0B', borderRadius: 8, padding: '8px 11px' }}>⚠ 此解動用備用且衰退的 P4，建議改以 P3＋100HP 滿足需求。</div>}

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
            <div style={{ fontSize: 12, fontWeight: 700, color: BP.label, marginBottom: 6 }}>100HP · P1 vs P2 現場效率</div>
            <CrossoverChart ids={['P3_100HP', 'P4_100HP']} cross={window.DATA.crossover['100HP']} />
            <div style={{ fontSize: 10.5, color: BP.textDim, marginTop: 4 }}>＞3,400 CMD 選 P1；低於此值 P2 較佳</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: BP.label, marginBottom: 6 }}>150HP · P3 vs P4 現場效率</div>
            <CrossoverChart ids={['P2_150HP', 'P1_150HP']} cross={window.DATA.crossover['150HP']} />
            <div style={{ fontSize: 10.5, color: BP.textDim, marginTop: 4 }}>＞2,600 CMD 選 P3（P4 已衰退、列備用）</div>
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
  const [scale, setScale] = React.useState('月');
  const S = SCALES[scale];
  const [vol, setVol] = React.useState(S.def);
  React.useEffect(() => { setVol(SCALES[scale].def); }, [scale]);
  const eB = vol * bSec, eA = vol * aSec, save = eB - eA, pct = eB ? save / eB * 100 : 0, co2 = save * CO2 / 1000;

  // line-scan chart geometry
  const h = 230, padL = 52, padR = 16, padT = 16, padB = 30;
  const iw = Math.max(10, w - padL - padR), ih = h - padT - padB;
  const Emax = S.max * bSec * 1.04;
  const X = v => padL + ((v - S.min) / (S.max - S.min)) * iw;
  const Y = e => padT + ih - (e / Emax) * ih;
  const ptsB = `${X(S.min)},${Y(S.min * bSec)} ${X(S.max)},${Y(S.max * bSec)}`;
  const ptsA = `${X(S.min)},${Y(S.min * aSec)} ${X(S.max)},${Y(S.max * aSec)}`;
  const band = `${X(S.min)},${Y(S.min * bSec)} ${X(S.max)},${Y(S.max * bSec)} ${X(S.max)},${Y(S.max * aSec)} ${X(S.min)},${Y(S.min * aSec)}`;
  const fmt = n => Math.round(n).toLocaleString();
  const chip = (lab, val, unit, c) => (
    <div style={{ background: 'rgba(8,21,44,.5)', border: `1px solid ${BP.borderDim}`, borderRadius: 8, padding: '8px 11px', flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, color: BP.textDim, whiteSpace: 'nowrap' }}>{lab}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 3 }}>
        <span style={{ fontFamily: BP.mono, fontSize: 17, fontWeight: 700, color: c, lineHeight: 1 }}>{val}</span>
        <span style={{ fontSize: 9, color: BP.text }}>{unit}</span>
      </div>
    </div>
  );
  return (
    <window.BPCard title="供水量 → 優化前 / 優化後 用電" en="Supply → Energy (pre/post)" glow
      right={<span style={{ display: 'inline-flex', gap: 2, background: 'rgba(8,21,44,.6)', borderRadius: 7, padding: 2, border: `1px solid ${BP.borderDim}` }}>
        {['日', '月', '年'].map(s => <button key={s} onClick={() => setScale(s)} style={{ all: 'unset', cursor: 'pointer', padding: '4px 13px', borderRadius: 5, fontFamily: BP.mono, fontSize: 12, fontWeight: 700, color: scale === s ? '#06223f' : BP.text, background: scale === s ? BP.accent : 'transparent' }}>{s}</button>)}
      </span>}>
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
        <div style={{ fontSize: 11.5, color: BP.text, marginBottom: 10, lineHeight: 1.5 }}>拖動選定<b style={{ color: BP.label }}>供水量</b>，即看後方<b style={{ color: '#ef6461' }}>優化前</b>與<b style={{ color: '#22C55E' }}>優化後</b>用電與節電缺口（累計電耗 = 供水量 × 單位電耗，以台電帳單口徑 0.383→0.343 計）。</div>
        <div ref={ref} style={{ width: '100%' }}>
          <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block', fontFamily: BP.mono }}>
            {(() => {
              const ymax = S.max * bSec * 1.05;
              const BY = e => padT + ih - (e / ymax) * ih;
              const bw = Math.min(150, iw * 0.26);
              const cx1 = padL + iw * 0.30, cx2 = padL + iw * 0.70;
              const bars = [['優化前', eB, '#ef6461', cx1], ['優化後', eA, '#22C55E', cx2]];
              return <>
                {[0, .25, .5, .75, 1].map((f, i) => { const y = padT + ih * (1 - f); return <g key={i}><line x1={padL} y1={y} x2={w - padR} y2={y} stroke={BP.borderDim} strokeWidth="1" strokeDasharray={f === 0 ? '' : '2 4'} /><text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill={BP.text}>{fmt(ymax * f / 1000)}k</text></g>; })}
                {bars.map((b, i) => <g key={i}>
                  <rect x={b[3] - bw / 2} y={BY(b[1])} width={bw} height={Math.max(0, padT + ih - BY(b[1]))} rx={8} fill={b[2]} opacity=".85" />
                  <text x={b[3]} y={BY(b[1]) - 8} textAnchor="middle" fontSize="13" fontWeight="700" fill={b[2]}>{fmt(b[1])} {S.ku}</text>
                  <text x={b[3]} y={h - 8} textAnchor="middle" fontSize="12" fontWeight="700" fill={BP.label}>{b[0]}</text>
                </g>)}
                {/* savings bracket between bars */}
                <line x1={cx1} y1={BY(eA)} x2={cx2} y2={BY(eA)} stroke="#22C55E" strokeWidth="1" strokeDasharray="3 3" opacity=".6" />
                <rect x={cx1 + bw / 2 + 6} y={BY(eB)} width={Math.max(0, cx2 - cx1 - bw - 12)} height={Math.max(0, BY(eA) - BY(eB))} fill="rgba(34,197,94,.12)" />
                <text x={(cx1 + cx2) / 2} y={(BY(eB) + BY(eA)) / 2 + 3} textAnchor="middle" fontSize="10" fill="#22C55E" fontWeight="700">省 {fmt(save)}</text>
                <text x={padL + iw / 2} y={11} textAnchor="middle" fontSize="9.5" fill={BP.text}>相同供水量 {fmt(vol)} {S.u} 下的耗電量對比</text>
              </>;
            })()}
          </svg>
        </div>
        <input type="range" min={S.min} max={S.max} step={S.step} value={vol} onChange={e => setVol(+e.target.value)} style={{ width: '100%', marginTop: 10, accentColor: BP.accent }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {chip('供水量', fmt(vol), S.u, BP.accent)}
          {chip('優化前用電', fmt(eB), S.ku, '#ef6461')}
          {chip('優化後用電', fmt(eA), S.ku, '#22C55E')}
          {chip('節電', fmt(save), S.ku, '#22C55E')}
        </div>
        <div style={{ marginTop: 11, padding: '10px 13px', borderRadius: 9, background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.3)', display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: BP.mono, fontSize: 18, fontWeight: 700, color: '#22C55E' }}>省 {fmt(save)} {S.ku}</span>
          <span style={{ fontFamily: BP.mono, fontSize: 14, fontWeight: 700, color: '#22C55E' }}>−{pct.toFixed(1)}%</span>
          <span style={{ fontSize: 11.5, color: BP.text }}>減碳約 {co2.toFixed(co2 < 10 ? 1 : 0)} 噸 CO₂·供水 {fmt(vol)} {S.u}</span>
        </div>
        <div style={{ fontSize: 10, color: BP.textDim, marginTop: 8 }}>※ 台電帳單口徑·站級；換算以單位電耗差（改善前 {bSec.toFixed(4)} → 改善後 {aSec.toFixed(4)}）。日/月/年三尺降幅一致 −{pct.toFixed(1)}%。</div>
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
  const inp = (k, w = 78) => <input type="number" value={s[k]} onChange={e => set(k, e.target.value)} style={{ width: w, fontFamily: BP.mono, fontSize: 12.5, color: BP.label, background: 'rgba(8,21,44,.7)', border: `1px solid ${BP.borderDim}`, borderRadius: 6, padding: '5px 8px', textAlign: 'right' }} />;
  const ROWS = [['尖峰', 'peak', 'up', '#ef6461'], ['半尖峰', 'half', 'uh', '#F59E0B'], ['離峰', 'off', 'uo', '#22C55E']];
  const sub = { peak: cp, half: ch, off: co };
  return (
    <window.BPCard title="電價 · 碳排試算" en="Tariff & Carbon Calculator" glow
      right={<span style={{ fontFamily: BP.mono, fontSize: 10.5, color: BP.text }}>台電三段式 · 可調輸入</span>}>
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 11.5, color: BP.text, marginBottom: 11, lineHeight: 1.5 }}>輸入各時段<b style={{ color: BP.label }}>電價</b>與<b style={{ color: BP.label }}>用電度數</b>，即時算出電費與碳排（預設為 5 月台電帳單概估分配）。</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['時段', '電價 (元/度)', '用電 (度)', '電費 (NT$)'].map((h, i) => <th key={i} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '6px 8px', fontSize: 10, color: BP.textDim, fontFamily: BP.mono, borderBottom: `1px solid ${BP.borderDim}` }}>{h}</th>)}</tr></thead>
          <tbody>
            {ROWS.map(([lab, rk, uk, c]) => (
              <tr key={rk}>
                <td style={{ padding: '7px 8px', borderBottom: `1px solid ${BP.borderDim}` }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: BP.label }}><span style={{ width: 7, height: 7, borderRadius: 999, background: c }} />{lab}</span></td>
                <td style={{ padding: '7px 8px', textAlign: 'right', borderBottom: `1px solid ${BP.borderDim}` }}>{inp(rk, 64)}</td>
                <td style={{ padding: '7px 8px', textAlign: 'right', borderBottom: `1px solid ${BP.borderDim}` }}>{inp(uk)}</td>
                <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: BP.mono, fontSize: 13, fontWeight: 700, color: BP.label, borderBottom: `1px solid ${BP.borderDim}` }}>${fmt(sub[rk])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 8, marginTop: 12 }}>
          <window.BPStat label="總電費" value={'$' + fmt(tot)} unit="NT$/月" tone={BP.accent} />
          <window.BPStat label="總用電" value={fmt(kwh)} unit="度/月" tone={BP.label} />
          <window.BPStat label="平均電價" value={kwh ? (tot / kwh).toFixed(2) : '—'} unit="元/度" tone="#7cd4ff" />
          <window.BPStat label="碳排放" value={fmt(co2 / 1000)} unit="噸 CO₂/月" tone="#22C55E" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10.5, color: BP.textDim }}>碳排係數</span>{inp('co2', 60)}<span style={{ fontSize: 10.5, color: BP.textDim }}>kgCO₂e/度（能源署 114 年度 0.467）</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: BP.textDim }}>※ 確切電價別與契約容量請以台電帳單為準。</span>
        </div>
      </div>
    </window.BPCard>
  );
}

Object.assign(window, { FieldCurveChart, CrossoverChart, DailySECChart, SinglePumpDiag, SupplyEnergyCompare, TariffCalc, SolverPanel, PageAnalysis });
