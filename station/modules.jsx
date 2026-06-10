// modules.jsx — AI Assistant, Operator Guidance, Access Control, Proactive Prompt.

// recompute a motor's model-estimated fields when frequency changes
function applyFreq(motor, freq) {
  const fresh = window.buildMotor(motor.fid, freq);
  return { ...fresh, id: motor.id, name: motor.name, role: motor.role, roleHz: motor.roleHz };
}
window.applyFreq = applyFreq;

// apply a full dispatch config {fid: hz}: listed pumps run at hz, others standby
function applyConfig(motors, cfg) {
  return motors.map(m => applyFreq(m, cfg[m.fid] != null ? cfg[m.fid] : 0));
}
window.applyConfig = applyConfig;

// derive a human adjustment checklist from a target cfg vs current motors
function buildAdjustments(cfg, motors) {
  const items = []; const byFid = {}; (motors || []).forEach(m => byFid[m.fid] = m);
  (window.DATA.order || []).forEach(fid => {
    const m = byFid[fid]; if (!m) return;
    const target = cfg[fid];                       // hz, or undefined = should be off
    const cur = m.status === 'standby' ? 0 : m.freq;
    if (target != null) { if (cur !== target) items.push({ fid, label: m.id, from: cur, to: target, kind: cur === 0 ? 'start' : 'freq' }); }
    else if (cur !== 0) items.push({ fid, label: m.id, from: cur, to: 0, kind: 'stop' });
  });
  return items;
}
window.buildAdjustments = buildAdjustments;

// checklist: operator ticks what they physically adjusted, then 已完成調整
function AdjustChecklist({ cfg, motors, onDone, compact }) {
  const BP = window.BP;
  const items = window.buildAdjustments(cfg, motors);
  const [checked, setChecked] = React.useState({});
  const [done, setDone] = React.useState(null);   // {items} applied, for undo
  React.useEffect(() => { setChecked({}); setDone(null); }, [JSON.stringify(cfg)]);
  const anyChecked = items.some((_, i) => checked[i]);
  const txt = (it) => it.kind === 'stop' ? `停機 ${it.label}（目前 ${it.from}Hz）` : it.kind === 'start' ? `啟動 ${it.label} 至 ${it.to}Hz` : `${it.label} 由 ${it.from}Hz 調整為 ${it.to}Hz`;
  const finish = () => {
    const picked = items.filter((_, i) => checked[i]);
    if (picked.length && onDone) onDone(picked.map(it => ({ fid: it.fid, hz: it.to })));
    setDone({ items: picked });
  };
  const undo = () => {
    if (done && done.items.length && onDone) onDone(done.items.map(it => ({ fid: it.fid, hz: it.from })));
    setDone(null); setChecked({});
  };
  if (done) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#22C55E', fontFamily: BP.mono }}>
        <span style={{ width: 20, height: 20, borderRadius: 999, background: 'rgba(34,197,94,.18)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
        已記錄 {done.items.length} 項調整 · 數據已依現場更新
      </span>
      <button onClick={undo} style={{ all: 'unset', cursor: 'pointer', fontFamily: BP.mono, fontSize: 11.5, fontWeight: 700, color: BP.accent, border: `1px solid ${BP.border}`, borderRadius: 7, padding: '5px 12px' }}>↶ 上一步（復原）</button>
    </div>
  );
  if (!items.length) return <div style={{ fontSize: 12, color: '#22C55E', fontWeight: 700, fontFamily: BP.mono }}>✓ 目前已符合建議，無需調整</div>;
  return (
    <div>
      {!compact && <div style={{ fontSize: 10.5, color: BP.textDim, fontFamily: BP.mono, marginBottom: 6 }}>請至現場調整下列項目，調整完成後勾選；未調整者免勾。誤勾可再點一次取消，或按「清除勾選」。</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 4 : 6 }}>
        {items.map((it, i) => (
          <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', padding: compact ? '4px 8px' : '7px 10px', borderRadius: 7, background: checked[i] ? 'rgba(34,197,94,.1)' : 'rgba(8,21,44,.5)', border: `1px solid ${checked[i] ? 'rgba(34,197,94,.45)' : BP.borderDim}` }}>
            <span onClick={() => setChecked(c => ({ ...c, [i]: !c[i] }))} style={{ width: 17, height: 17, borderRadius: 4, flexShrink: 0, border: `1.5px solid ${checked[i] ? '#22C55E' : BP.border}`, background: checked[i] ? '#22C55E' : 'transparent', color: '#06223f', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{checked[i] ? '✓' : ''}</span>
            <span style={{ fontFamily: BP.mono, fontSize: compact ? 11.5 : 12.5, color: checked[i] ? '#22C55E' : BP.label, fontWeight: 600 }}>{txt(it)}</span>
            <span style={{ marginLeft: 'auto', fontFamily: BP.mono, fontSize: 9.5, color: BP.textDim }}>{it.kind === 'stop' ? '停機' : it.kind === 'start' ? '啟動' : '變頻'}</span>
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 9, alignItems: 'center' }}>
        <button onClick={finish} disabled={!anyChecked} style={{ all: 'unset', cursor: anyChecked ? 'pointer' : 'not-allowed', display: 'inline-block', fontFamily: BP.mono, fontSize: 12.5, fontWeight: 700, color: anyChecked ? '#06223f' : BP.textDim, background: anyChecked ? '#22C55E' : 'rgba(34,197,94,.2)', borderRadius: 7, padding: '8px 16px' }}>已完成調整（{items.filter((_, i) => checked[i]).length}/{items.length}）</button>
        {anyChecked && <button onClick={() => setChecked({})} style={{ all: 'unset', cursor: 'pointer', fontFamily: BP.mono, fontSize: 11.5, color: BP.text, border: `1px solid ${BP.borderDim}`, borderRadius: 7, padding: '7px 12px' }}>清除勾選</button>}
      </div>
    </div>
  );
}
window.AdjustChecklist = AdjustChecklist;

// ============================================================================
// Proactive prompt — pops up bottom-right, tells the operator what to do.
// Controlled by App (open / idx / applied) so it survives tab navigation.
// ============================================================================
function ProactivePrompt({ items, idx, open, applied, onApply, onGoto, onClose }) {
  const BP = window.BP;
  if (!items || !items.length) return null;
  const g = items[idx % items.length];
  const lv = window.GUIDE_LEVELS[g.level];
  return (
    <div style={{
      position: 'fixed', right: 18, bottom: 18, width: 372, zIndex: 60,
      transform: open ? 'translateY(0)' : 'translateY(140%)', opacity: open ? 1 : 0,
      pointerEvents: open ? 'auto' : 'none',
      transition: 'all .4s cubic-bezier(.4,0,.2,1)',
      background: 'linear-gradient(180deg, rgba(14,34,68,.97), rgba(8,18,38,.97))',
      border: `1px solid ${lv.c}88`, borderRadius: 12, boxShadow: `0 18px 44px rgba(0,0,0,.5), 0 0 0 1px ${lv.c}33`,
      backdropFilter: 'blur(10px)', overflow: 'hidden',
    }}>
      <div style={{ height: 3, background: lv.c }} />
      <div style={{ padding: '13px 15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700, letterSpacing: .5, color: lv.c, fontFamily: BP.mono }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: lv.c, boxShadow: `0 0 7px ${lv.c}` }} className="md-pulse" />
            AI 主動提示 · {lv.zh}
          </span>
          <span style={{ marginLeft: 'auto', fontFamily: BP.mono, fontSize: 10.5, color: BP.text }}>{g.dev} · {g.id}</span>
          <button onClick={onClose} style={{ all: 'unset', cursor: 'pointer', color: BP.text, fontSize: 15, lineHeight: 1 }}>✕</button>
        </div>
        {!applied ? (
          <>
            <div style={{ fontSize: 14, fontWeight: 700, color: BP.label, marginBottom: 5 }}>{g.short || g.title}</div>
            <div style={{ fontSize: 12, color: BP.text, lineHeight: 1.5 }}>{g.brief || g.detail}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: '9px 12px', borderRadius: 8, background: `${lv.c}15`, border: `1px solid ${lv.c}44` }}>
              <span style={{ fontFamily: BP.mono, fontSize: 13, fontWeight: 700, color: BP.label }}>{g.action}</span>
              {g.save > 0 && <span style={{ marginLeft: 'auto', fontFamily: BP.mono, fontSize: 14, fontWeight: 700, color: '#22C55E' }}>省 {g.save}%</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
              <button onClick={() => onGoto && onGoto('alerts')} style={btn(BP, true)}>查看調整項目</button>
              <button onClick={onClose} style={{ ...btn(BP, false), flex: '0 0 auto', borderColor: 'transparent', color: BP.textDim }}>稍後</button>
            </div>
          </>
        ) : (
          <div style={{ padding: '6px 0 2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 30, height: 30, borderRadius: 999, background: 'rgba(34,197,94,.18)', color: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✓</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#22C55E' }}>已套用 · {g.dev} {g.action}</div>
                <div style={{ fontSize: 11.5, color: BP.text }}>預估節省 {g.save}% ≈ {g.savekw} kW，已記錄稽核</div>
              </div>
              <button onClick={onClose} style={{ ...btn(BP, false), marginLeft: 'auto' }}>完成</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function btn(BP, primary) {
  return {
    all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', fontFamily: BP.mono, fontSize: 12, fontWeight: 700,
    padding: '8px 0', borderRadius: 7, color: primary ? '#06223f' : BP.accent,
    background: primary ? BP.accent : 'transparent', border: `1px solid ${primary ? BP.accent : BP.border}`,
  };
}

// ============================================================================
// AI Assistant
// ============================================================================
function AIAssistant({ summary }) {
  const BP = window.BP;
  const vp = window.useVP ? window.useVP() : { isMobile: false };
  const [msgs, setMsgs] = React.useState([{ role: 'ai', text: '您好，我是示範加壓站的節能分析助理。我依本站真實資料回答：選泵與頻率（現場曲線）、月度節能驗證、電價/碳排試算、資料缺口與限制。我不會編造沒有來源的單泵實測數據。請問需要什麼協助？', src: [] }]);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const endRef = React.useRef(null);
  React.useEffect(() => { if (endRef.current) endRef.current.scrollTop = endRef.current.scrollHeight; }, [msgs, busy]);

  const send = async (q) => {
    const text = (q || input).trim(); if (!text || busy) return;
    setInput(''); setMsgs(m => [...m, { role: 'user', text }]); setBusy(true);
    let res = window.aiAnswer(text);
    try { if (window.claude && window.claude.complete && !window.aiAnswer.__hit) { /* canned preferred for demo */ } } catch (e) {}
    await new Promise(r => setTimeout(r, 520));
    setMsgs(m => [...m, { role: 'ai', text: res.a, src: res.src || [] }]); setBusy(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? '1fr' : 'minmax(0,1fr) 300px', gap: 12, padding: vp.isMobile ? 10 : 14, height: '100%', minHeight: 0 }}>
      <window.BPCard title="智慧問答助理" en="AI Assistant · RAG" glow
        right={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: BP.mono, fontSize: 10.5, color: '#F59E0B' }}><span style={{ width: 6, height: 6, borderRadius: 999, background: '#F59E0B' }} />DEMO 模式</span>}>
        <div ref={endRef} style={{ flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '76%', padding: '10px 13px', borderRadius: 12,
                background: m.role === 'user' ? 'rgba(65,166,255,.16)' : 'rgba(8,21,44,.6)',
                border: `1px solid ${m.role === 'user' ? 'rgba(65,166,255,.4)' : BP.borderDim}`,
                borderBottomRightRadius: m.role === 'user' ? 3 : 12, borderBottomLeftRadius: m.role === 'ai' ? 3 : 12 }}>
                <div style={{ fontSize: 13, color: BP.label, lineHeight: 1.6 }}>{m.text}</div>
                {m.src && m.src.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {m.src.map((s, k) => (
                      <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: BP.mono, fontSize: 9.5, color: BP.accent, background: 'rgba(65,166,255,.12)', border: `1px solid ${BP.borderDim}`, borderRadius: 4, padding: '2px 6px' }}>
                        ▣ {s.doc}{s.loc ? ` · ${s.loc}` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && <div style={{ display: 'flex', gap: 5, padding: '4px 6px' }}>{[0, 1, 2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: 999, background: BP.accent, opacity: .5, animation: `mdPulse 1s ${i * .2}s infinite` }} />)}</div>}
        </div>
        {/* suggestions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, padding: '0 14px 10px' }}>
          {window.CHAT_SUGGEST.map((s, i) => (
            <button key={i} onClick={() => send(s)} style={{ all: 'unset', cursor: 'pointer', fontFamily: BP.mono, fontSize: 11, color: BP.text, border: `1px solid ${BP.borderDim}`, borderRadius: 999, padding: '5px 11px', background: 'rgba(8,21,44,.4)' }}>{s}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 9, padding: '11px 14px', borderTop: `1px solid ${BP.borderDim}` }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }}
            placeholder="以中文提問，例如：夜間 P3 要用 57 還是 60Hz？" style={{
              flex: 1, all: 'unset', fontSize: 13, color: BP.label, fontFamily: 'inherit', background: 'rgba(8,21,44,.6)',
              border: `1px solid ${BP.borderDim}`, borderRadius: 8, padding: '9px 12px',
            }} />
          <button onClick={() => send()} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 42, borderRadius: 8, background: BP.accent, color: '#06223f' }}>➤</button>
        </div>
      </window.BPCard>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflow: 'auto' }}>
        <window.BPCard title="本日 AI 重點" en="Daily Brief" glow>
          <div style={{ padding: 13, fontSize: 12.5, color: BP.label, lineHeight: 1.6 }}>
            模型改善幅度 <b style={{ color: '#22C55E', fontFamily: BP.mono }}>{summary.saving_pct}%</b>（基準 {summary.se_base}→加權 {summary.se_model_after} kWh/m³），與台電帳單 5 月降幅約 10% 方向一致。夜間建議停 150HP、以 100HP 雙機承接。P1 夜間 57/60Hz <b style={{ color: '#F59E0B' }}>待廠商確認</b>。
          </div>
        </window.BPCard>
        <window.BPCard title="可查詢的資料來源" en="Knowledge Base">
          <div style={{ padding: '6px 13px 12px' }}>
            {[['現場效能曲線', 'P1–P4 · 40–60Hz'], ['出廠/修復曲線', '150HP / 100HP'], ['效率交叉與選泵', '2,600 / 3,400 CMD'], ['每日統計', '112 天 SEC 趨勢'], ['月度驗證', '台電/站內 雙基準'], ['電價/碳排', '台電 114/10/1 · 0.467']].map((r, i) => (
              <window.BPRow key={i} label={r[0]} value={r[1]} />
            ))}
          </div>
        </window.BPCard>
        <window.BPCard title="安全邊界" en="Guardrail">
          <div style={{ padding: 13, fontSize: 11.5, color: BP.text, lineHeight: 1.6 }}>
            AI 僅<b style={{ color: BP.label }}>提供建議與分析</b>，不會自動變更 PLC 或設備參數。實際調度需由具權限人員於「操作建議」確認執行。回答僅引用本站真實資料，缺口資料一律據實標示「需取得」。
          </div>
        </window.BPCard>
      </div>
    </div>
  );
}

// ============================================================================
// Operator Guidance (alerts + recommended actions)
// ============================================================================
function OperatorGuidance({ onAdjust, motors }) {
  const BP = window.BP;
  const vp = window.useVP ? window.useVP() : { isMobile: false };
  const [filter, setFilter] = React.useState('all');
  const [done, setDone] = React.useState({});
  const list = window.GUIDANCE.filter(g => filter === 'all' ? true : g.level === filter);
  const counts = { crit: 0, warn: 0, info: 0 };
  window.GUIDANCE.forEach(g => { if (g.status === '待處理' || g.status === '處理中') counts[g.level]++; });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? '1fr' : 'minmax(0,1fr) 300px', gap: 12, padding: vp.isMobile ? 10 : 14, height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, overflow: 'auto' }}>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {[['all', '全部'], ['crit', '嚴重'], ['warn', '警告'], ['info', '建議']].map(([k, lbl]) => (
            <button key={k} onClick={() => setFilter(k)} style={{ all: 'unset', cursor: 'pointer', fontFamily: BP.mono, fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 7, color: filter === k ? '#06223f' : BP.text, background: filter === k ? BP.accent : 'rgba(8,21,44,.5)', border: `1px solid ${BP.borderDim}` }}>{lbl}</button>
          ))}
        </div>
        {list.map(g => {
          const lv = window.GUIDE_LEVELS[g.level]; const isDone = done[g.id];
          return (
            <window.BPCard key={g.id} style={{ flexShrink: 0, borderColor: `${lv.c}55` }}>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ fontFamily: BP.mono, fontSize: 11, fontWeight: 700, color: lv.c, background: `${lv.c}22`, padding: '2px 8px', borderRadius: 4 }}>{lv.zh}</span>
                  <span style={{ fontFamily: BP.mono, fontSize: 12, fontWeight: 700, color: BP.label }}>{g.dev}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: BP.label }}>{g.title}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: BP.mono, fontSize: 10.5, color: BP.text }}>{g.t} · {isDone ? '已套用' : g.status}</span>
                </div>
                <div style={{ fontSize: 12, color: BP.text, lineHeight: 1.5, margin: '8px 0' }}>{g.detail}</div>
                {g.steps.length > 0 && (
                  <div style={{ background: 'rgba(8,21,44,.5)', border: `1px solid ${BP.borderDim}`, borderRadius: 8, padding: '9px 12px', margin: '8px 0' }}>
                    <div style={{ fontSize: 10.5, color: BP.textDim, marginBottom: 5, fontFamily: BP.mono }}>建議操作步驟</div>
                    {g.steps.map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: BP.label, lineHeight: 1.5, padding: '2px 0' }}>
                        <span style={{ fontFamily: BP.mono, color: lv.c }}>{i + 1}.</span><span>{s}</span>
                      </div>
                    ))}
                  </div>
                )}
                {g.cfg ? (
                  <div style={{ marginTop: 8, background: 'rgba(8,21,44,.4)', border: `1px solid ${BP.borderDim}`, borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10.5, color: BP.textDim, marginBottom: 7, fontFamily: BP.mono }}>需調整項目（現場調完勾選）</div>
                    <window.AdjustChecklist cfg={g.cfg} motors={motors} onDone={onAdjust} />
                  </div>
                ) : g.action !== '—' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                    <span style={{ fontFamily: BP.mono, fontSize: 13, fontWeight: 700, color: BP.label }}>{g.action}</span>
                    {!isDone && g.status !== '已解除' && g.status !== '已確認' && (
                      <button onClick={() => setDone(d => ({ ...d, [g.id]: true }))} style={{ ...btn(BP, false), flex: '0 0 auto', padding: '8px 14px', marginLeft: 'auto' }}>知道了</button>
                    )}
                    {isDone && <span style={{ marginLeft: 'auto', fontFamily: BP.mono, fontSize: 12, color: '#22C55E' }}>✓ 已確認</span>}
                  </div>
                )}
              </div>
            </window.BPCard>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflow: 'auto' }}>
        <window.BPCard title="待處理彙總" en="Open Items" glow>
          <div style={{ padding: 13, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[['嚴重', counts.crit, '#EF4444'], ['警告', counts.warn, '#F59E0B'], ['建議', counts.info, '#22D3EE']].map((c, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '10px 0', borderRadius: 8, background: `${c[2]}14`, border: `1px solid ${c[2]}44` }}>
                <div style={{ fontFamily: BP.mono, fontSize: 24, fontWeight: 700, color: c[2] }}>{c[1]}</div>
                <div style={{ fontSize: 11, color: BP.text }}>{c[0]}</div>
              </div>
            ))}
          </div>
        </window.BPCard>
        <window.BPCard title="處理流程" en="Workflow">
          <div style={{ padding: 13 }}>
            {[['偵測', 'AI 監測即時資料、比對黃金曲線'], ['提示', '主動推播建議與操作步驟'], ['確認', '操作員 / 工程師審核'], ['執行', '降頻或巡檢，留存稽核'], ['驗證', '回看節能對比是否改善']].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingBottom: 10 }}>
                <span style={{ fontFamily: BP.mono, fontSize: 11, fontWeight: 700, color: '#06223f', background: BP.accent, width: 18, height: 18, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                <div><div style={{ fontSize: 12.5, fontWeight: 700, color: BP.label }}>{s[0]}</div><div style={{ fontSize: 11, color: BP.text }}>{s[1]}</div></div>
              </div>
            ))}
          </div>
        </window.BPCard>
      </div>
    </div>
  );
}

// ============================================================================
// Access Control (RBAC)
// ============================================================================
function AccessControl() {
  const BP = window.BP;
  const vp = window.useVP ? window.useVP() : { isMobile: false };
  const [mfaUser, setMfaUser] = React.useState(null);
  const cell = (v) => {
    if (v === true) return <span style={{ color: '#22C55E', fontWeight: 700 }}>✓</span>;
    if (v === false) return <span style={{ color: BP.textDim }}>—</span>;
    if (v === 'mfa') return <span style={{ fontFamily: BP.mono, fontSize: 9.5, color: '#F59E0B', background: 'rgba(245,158,11,.16)', padding: '1px 5px', borderRadius: 3 }}>需 MFA</span>;
    if (v === 'approve') return <span style={{ fontFamily: BP.mono, fontSize: 9.5, color: '#22D3EE', background: 'rgba(34,211,238,.16)', padding: '1px 5px', borderRadius: 3 }}>需審核</span>;
  };
  const stTone = { '線上': '#22C55E', '值班中': '#22D3EE', '離線': '#5C6A82' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14, height: '100%', overflow: 'auto' }}>
      <window.BPCard title="角色權限矩陣" en="Role × Permission (RBAC)" glow style={{ flexShrink: 0 }}
        right={<span style={{ fontFamily: BP.mono, fontSize: 10.5, color: BP.text }}>關鍵操作採最小權限 + MFA</span>}>
        <div style={{ overflowX: 'auto', padding: '4px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: BP.mono }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: BP.textDim, borderBottom: `1px solid ${BP.borderDim}`, whiteSpace: 'nowrap' }}>權限項目</th>
                {window.ROLES.map(r => <th key={r.id} style={{ padding: '10px 8px', fontSize: 11.5, color: BP.label, borderBottom: `1px solid ${BP.borderDim}`, whiteSpace: 'nowrap' }}>{r.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {window.PERMISSIONS.map((p, pi) => (
                <tr key={pi}>
                  <td style={{ padding: '8px 14px', fontSize: 12, color: BP.label, borderBottom: `1px solid ${BP.borderDim}`, whiteSpace: 'nowrap', fontFamily: 'inherit' }}>{p}</td>
                  {window.ROLES.map(r => <td key={r.id} style={{ textAlign: 'center', padding: '8px', fontSize: 13, borderBottom: `1px solid ${BP.borderDim}` }}>{cell(r.perms[pi])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </window.BPCard>

      {/* MFA */}
      <window.BPCard title="多因素認證 (MFA)" en="Multi-Factor Authentication" glow style={{ flexShrink: 0 }}
        right={<span style={{ fontFamily: BP.mono, fontSize: 10.5, color: '#22C55E' }}>已啟用 {window.USERS.filter(u => u.mfa).length} / {window.USERS.length} 帳號</span>}>
        <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? '1fr' : 'repeat(3,1fr)', gap: 0 }}>
          <div style={{ padding: 14, borderRight: `1px solid ${BP.borderDim}` }}>
            <div style={{ fontSize: 10.5, color: BP.textDim, fontFamily: BP.mono, marginBottom: 8 }}>強制 MFA 之操作</div>
            {['操作 VFD 頻率', '套用 AI 節能建議', '設定使用者權限', '匯出敏感資料'].map((x, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0', fontSize: 12, color: BP.label }}>
                <span style={{ color: '#F59E0B' }}>⚿</span>{x}
              </div>
            ))}
          </div>
          <div style={{ padding: 14, borderRight: `1px solid ${BP.borderDim}` }}>
            <div style={{ fontSize: 10.5, color: BP.textDim, fontFamily: BP.mono, marginBottom: 8 }}>認證方式</div>
            <window.BPRow label="主要" value="TOTP 驗證器 App" />
            <window.BPRow label="備援" value="SMS 簡訊 / 備援碼" />
            <window.BPRow label="備援碼" value="每帳號 10 組" />
            <window.BPRow label="重驗週期" value="30 天 / 新裝置" />
          </div>
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 9 }}>
            <div style={{ fontSize: 12, color: BP.text, lineHeight: 1.5 }}>關鍵控制動作前需通過 MFA，降低誤操作與未授權風險。</div>
            <button onClick={() => setMfaUser(window.USERS[2])} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', fontFamily: BP.mono, fontSize: 12.5, fontWeight: 700, color: '#06223f', background: BP.accent, borderRadius: 7, padding: '9px 0' }}>設定 / 重新綁定 MFA</button>
          </div>
        </div>
      </window.BPCard>

      <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? '1fr' : 'minmax(0,1.3fr) minmax(0,1fr)', gap: 12, flexShrink: 0 }}>
        <window.BPCard title="使用者帳號" en="Users" right={<span style={{ fontFamily: BP.mono, fontSize: 10.5, color: BP.text }}>{window.USERS.length} 人</span>}>
          <div>
            {window.USERS.map((u, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 14px', borderBottom: `1px solid ${BP.borderDim}` }}>
                <span style={{ width: 30, height: 30, borderRadius: 999, background: 'rgba(8,21,44,.7)', border: `1px solid ${BP.borderDim}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: BP.accent, fontFamily: BP.mono }}>{u.name[0]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: BP.label }}>{u.name} <span style={{ fontSize: 10.5, color: BP.text, fontWeight: 400 }}>· {u.role}</span></div>
                  <div style={{ fontFamily: BP.mono, fontSize: 10, color: BP.textDim }}>最後活動 {u.last}</div>
                </div>
                <span style={{ fontFamily: BP.mono, fontSize: 9.5, color: u.mfa ? '#22C55E' : '#F59E0B', border: `1px solid ${(u.mfa ? '#22C55E' : '#F59E0B')}55`, borderRadius: 4, padding: '1px 6px' }}>{u.mfa ? 'MFA ✓' : 'MFA ✗'}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: BP.mono, fontSize: 10.5, color: stTone[u.status] }}><span style={{ width: 6, height: 6, borderRadius: 999, background: stTone[u.status] }} />{u.status}</span>
                <button onClick={() => setMfaUser(u)} style={{ all: 'unset', cursor: 'pointer', fontFamily: BP.mono, fontSize: 10.5, color: BP.accent, border: `1px solid ${BP.borderDim}`, borderRadius: 5, padding: '3px 9px' }}>設定</button>
              </div>
            ))}
          </div>
        </window.BPCard>

        <window.BPCard title="稽核紀錄" en="Audit Trail">
          <div style={{ padding: '6px 0' }}>
            {window.AUDIT.map((a, i) => {
              const c = { ok: '#22C55E', info: '#22D3EE', warn: '#F59E0B' }[a.tone];
              return (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 14px', borderBottom: `1px solid ${BP.borderDim}` }}>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: c, marginTop: 5, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, color: BP.label, lineHeight: 1.45 }}>{a.act}</div>
                    <div style={{ fontFamily: BP.mono, fontSize: 10, color: BP.textDim }}>{a.t} · {a.user}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </window.BPCard>
      </div>
      {mfaUser && <MfaModal user={mfaUser} onClose={() => setMfaUser(null)} />}
    </div>
  );
}

function MfaStep({ BP, n, t }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <span style={{ fontFamily: BP.mono, fontSize: 11, fontWeight: 700, color: '#06223f', background: BP.accent, width: 18, height: 18, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: BP.label }}>{t}</span>
    </div>
  );
}

function MfaModal({ user, onClose }) {
  const BP = window.BP;
  const [code, setCode] = React.useState(['', '', '', '', '', '']);
  const [done, setDone] = React.useState(false);
  const refs = React.useRef([]);
  const secret = 'JBSW Y3DP EHPK 3PXP';
  const backup = ['8F2K-9QX1', '4M7P-2RT8', '6C3V-1LZ9', '0B5N-7WD4', '9H1A-5KE2', '3T6Y-8MD0'];
  const setDigit = (i, v) => { if (!/^[0-9]?$/.test(v)) return; const c = code.slice(); c[i] = v; setCode(c); if (v && refs.current[i + 1]) refs.current[i + 1].focus(); };
  const filled = code.every(c => c !== '');
  const cells = [];
  for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++) { if ((i * 7 + j * 13 + i * j * 3) % 3 === 0) cells.push([i, j]); }
  const finder = (x, y) => [<rect key={'f' + x + y} x={x} y={y} width={9} height={9} fill="none" stroke="#08152c" strokeWidth="1.4" />, <rect key={'fi' + x + y} x={x + 3} y={y + 3} width={3} height={3} fill="#08152c" />];
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(3,8,18,.72)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 452, maxHeight: '92vh', overflow: 'auto', background: 'linear-gradient(180deg, rgba(14,34,68,.98), rgba(8,18,38,.99))', border: `1px solid ${BP.border}`, borderRadius: 14, boxShadow: '0 24px 64px rgba(0,0,0,.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 16px', borderBottom: `1px solid ${BP.borderDim}` }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(65,166,255,.14)', color: BP.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: BP.label }}>設定多因素認證 (MFA)</div>
            <div style={{ fontFamily: BP.mono, fontSize: 11, color: BP.text }}>{user.name} · {user.role}</div>
          </div>
          <button onClick={onClose} style={{ all: 'unset', cursor: 'pointer', color: BP.text, fontSize: 16 }}>✕</button>
        </div>
        {!done ? (
          <div style={{ padding: 16 }}>
            <MfaStep BP={BP} n={1} t="以驗證器 App 掃描 QR 碼" />
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', margin: '4px 0 16px' }}>
              <div style={{ width: 104, height: 104, background: '#fff', borderRadius: 8, padding: 7, flexShrink: 0 }}>
                <svg viewBox="0 0 39 39" width="90" height="90">{cells.map(([i, j], k) => <rect key={k} x={i * 3} y={j * 3} width={3} height={3} fill="#08152c" />)}{finder(0, 0)}{finder(0, 30)}{finder(30, 0)}</svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: BP.textDim }}>或手動輸入密鑰</div>
                <div style={{ fontFamily: BP.mono, fontSize: 15, fontWeight: 700, color: BP.accent, letterSpacing: 1, marginTop: 4 }}>{secret}</div>
                <div style={{ fontSize: 10.5, color: BP.textDim, marginTop: 6, lineHeight: 1.5 }}>支援 Google / Microsoft Authenticator 等 TOTP App。</div>
              </div>
            </div>
            <MfaStep BP={BP} n={2} t="輸入 App 顯示的 6 位驗證碼" />
            <div style={{ display: 'flex', gap: 8, margin: '6px 0 16px' }}>
              {code.map((c, i) => (
                <input key={i} ref={el => refs.current[i] = el} value={c} onChange={e => setDigit(i, e.target.value.slice(-1))} inputMode="numeric" maxLength={1}
                  style={{ width: 44, height: 50, textAlign: 'center', fontFamily: BP.mono, fontSize: 22, fontWeight: 700, color: BP.label, background: 'rgba(8,21,44,.7)', border: `1px solid ${c ? BP.accent : BP.borderDim}`, borderRadius: 8, outline: 'none' }} />
              ))}
            </div>
            <MfaStep BP={BP} n={3} t="保存備援碼（遺失裝置時使用）" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, margin: '6px 0 16px' }}>
              {backup.map((b, i) => <div key={i} style={{ fontFamily: BP.mono, fontSize: 12, color: BP.text, textAlign: 'center', padding: '6px 0', background: 'rgba(8,21,44,.6)', border: `1px solid ${BP.borderDim}`, borderRadius: 6 }}>{b}</div>)}
            </div>
            <div style={{ display: 'flex', gap: 9 }}>
              <button onClick={() => filled && setDone(true)} style={{ all: 'unset', cursor: filled ? 'pointer' : 'not-allowed', flex: 1, textAlign: 'center', fontFamily: BP.mono, fontSize: 13, fontWeight: 700, color: '#06223f', background: filled ? '#22C55E' : 'rgba(34,197,94,.3)', borderRadius: 8, padding: '11px 0' }}>啟用 MFA</button>
              <button onClick={onClose} style={{ all: 'unset', cursor: 'pointer', fontFamily: BP.mono, fontSize: 13, color: BP.text, border: `1px solid ${BP.borderDim}`, borderRadius: 8, padding: '11px 18px' }}>取消</button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '28px 20px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 999, background: 'rgba(34,197,94,.16)', color: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 12px' }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: BP.label }}>MFA 已啟用</div>
            <div style={{ fontSize: 12.5, color: BP.text, marginTop: 6, lineHeight: 1.6 }}>{user.name} 已綁定 TOTP 驗證器。往後執行降頻、套用建議等關鍵操作將要求二次驗證，並記錄稽核。</div>
            <button onClick={onClose} style={{ all: 'unset', cursor: 'pointer', marginTop: 16, fontFamily: BP.mono, fontSize: 13, fontWeight: 700, color: '#06223f', background: BP.accent, borderRadius: 8, padding: '10px 28px' }}>完成</button>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ProactivePrompt, AIAssistant, OperatorGuidance, AccessControl, MfaModal });
