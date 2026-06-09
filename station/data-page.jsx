// data-page.jsx — 資料整合與治理：三層資料架構、真實來源/品質、資料缺口。
// 嚴格依「兩條鐵則」：只呈現真實資料格式內之數據；無單泵計量者標「需取得」，不顯示假值。

const LAYERS = [
  { lv: 'L0', name: '靜態參考', en: 'Static Reference', sc: '#6fa8dc', tier: 'spec', phase: '現況',
    items: '泵規格 · 現場曲線 · 出廠曲線 · 電價/碳排 · 排程 · 選泵規則', show: '直接顯示' },
  { lv: 'L1', name: '已收集歷史', en: 'Collected History', sc: '#7cd4ff', tier: 'bill', phase: '現況',
    items: '管線流量(日) · 總用電(日) · 月度台電/站內帳單', show: '水量計.xls / 帳單 批次匯出' },
  { lv: 'L2', name: 'SCADA 即時', en: 'Live SCADA', sc: '#F59E0B', tier: 'plan', phase: '規劃',
    items: '配水池水位 · 母管壓力 · 站級電氣 · 各泵頻率/狀態', show: '尚未串接；目前以批次資料替代' },
  { lv: 'L3', name: '資料缺口', en: 'Data Gaps', sc: '#EF4444', tier: 'gap', phase: '缺口',
    items: '單泵流量 · 單泵電表 · 軸承溫度 · 振動', show: '標「需取得」· 裝錶後點亮' },
];

const SOURCES = [
  ['300/400 流量 03/21–05/11', '示範加壓站 300/400MM 出水流量 3-5月.xls', 'raw_meter_export', 'actual', '原始檔有效僅到 05/11'],
  ['300/400 流量 05/12–05/31', '統計計算.xlsx（4+3日出水量統計）', 'filled', 'filled', '原始匯出未隨批提供，由統計檔補值'],
  ['300/400 流量 06/01–07/10', '本站 300/400 流量 6_7月.xls', 'raw_meter_export', 'actual', '與統計檔一致，品質乾淨'],
  ['300/400 流量 03/01–03/20', '3-5月原始檔', 'raw_meter_export', 'abnormal', '03/12–03/13 累積讀值斷點，排除'],
  ['每日用電量', '統計計算.xlsx + 台電帳單', 'meter', 'actual', '03/21–29 電表起始前無值；04/01 SEC 假影剔除'],
  ['月度用電（台電/站內）', '台電帳單、站內監控錶', 'meter', 'actual', '兩錶口徑不一致（差約 0.09），待釐清'],
  ['4 泵現場曲線 40–60Hz', '統計計算.xlsx（現場抓取）/ 報告 p4', 'field_test', 'actual', '一次性實測，非連續監測'],
  ['出廠效能曲線 150/100HP', '150HP/100HP 試車記錄 PDF', 'factory_test', 'reference', '100HP 標的設備對應待確認'],
  ['馬達效率/規格', '試車記錄 PDF 馬達特性表', 'factory_spec', 'actual', '150HP 84.3% / 100HP 84.1%'],
  ['電價 / 碳排參數', '台電官網 PDF、能源署公告', 'external_ref', 'actual', '114/10/1 電價；碳係數 0.467'],
  ['單泵流量 / 電力 / 軸溫 / 振動', '（無資料來源）', '—', 'missing', '需裝單泵流量計＋電表＋感測器'],
];

const GAPS = [
  ['單泵流量計', '每台實際出水量、單機水力效率'],
  ['單泵電表（功率）', '每台實際用電、單機單位電耗'],
  ['軸承溫度感測器', '機械劣化早期預警'],
  ['振動感測器', '不平衡 / 軸承 / 空蝕偵測'],
];

const DQ_COL = { actual: ['#22C55E', 'rgba(34,197,94,.14)'], filled: ['#F59E0B', 'rgba(245,158,11,.14)'], reference: ['#22D3EE', 'rgba(34,211,238,.14)'], missing: ['#EF4444', 'rgba(239,68,68,.14)'], abnormal: ['#EF4444', 'rgba(239,68,68,.14)'], sim: ['#c084fc', 'rgba(192,132,252,.16)'] };

// 來源 × 回報頻率 × 接入方式（說明資料怎麼進來、為何要依頻率分類）
const CADENCE = [
  ['出廠曲線 / 馬達規格', '一次性（靜態）', '文件數位化', '#22C55E', '現況'],
  ['現場效能曲線', '一次性（實測）', '文件數位化', '#22C55E', '現況'],
  ['管線流量 300/400mm', '日', '批次匯出 .xls', '#22C55E', '現況'],
  ['站內監控錶用電', '日', '批次匯出', '#22C55E', '現況'],
  ['台電帳單', '月', '批次匯入', '#22C55E', '現況'],
  ['電價 / 碳排參數', '年度 / 公告', '外部參照', '#22C55E', '現況'],
  ['水位 / 壓力 / 各泵頻率', '即時（秒）', 'SCADA 串接', '#F59E0B', '規劃'],
  ['單泵流量 / 電表 / 軸溫 / 振動', '即時（秒）', '感測器 + 電表', '#EF4444', '缺口'],
];

function DataIntegration({ mode }) {
  const BP = window.BP;
  const sim = mode === 'sim';
  const vp = window.useVP ? window.useVP() : { isMobile: false };
  const [tab, setTab] = React.useState('daily');
  const daily = window.DATA.daily;
  const th = (c) => ({ textAlign: 'left', padding: '8px 12px', fontSize: 10.5, color: BP.textDim, fontFamily: BP.mono, borderBottom: `1px solid ${BP.borderDim}`, whiteSpace: 'nowrap', ...c });
  const td = (c) => ({ padding: '6px 12px', fontSize: 11.5, color: BP.text, fontFamily: BP.mono, borderBottom: `1px solid ${BP.borderDim}`, whiteSpace: 'nowrap', ...c });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, height: '100%', overflow: 'auto' }}>
      {/* honest current-state note */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.35)', borderRadius: 9, padding: '9px 13px' }}>
        <span style={{ fontFamily: BP.mono, fontSize: 10, fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,.16)', borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap', marginTop: 1 }}>資料現況</span>
        <span style={{ fontSize: 11.5, color: BP.text, lineHeight: 1.55 }}>目前所有資料皆來自<b style={{ color: BP.label }}>批次匯出檔</b>（水量計 .xls、站內監控錶、台電帳單、試車 PDF）整理而成的 Excel。<b style={{ color: '#F59E0B' }}>尚無即時 SCADA 串接</b>，故本身無法逐筆區分「即時 vs 批次」——下方結構是【資料製程成熟度】：L0/L1 為現況已具備，L2 SCADA 為規劃導入，L3 為需裝錶之缺口。</span>
      </div>

      {/* data layers (maturity, not realtime) */}
      <window.BPCard title="資料成熟度分層" en="Data Maturity · 現況 vs 規劃" glow style={{ flexShrink: 0 }}
        right={<span style={{ fontFamily: BP.mono, fontSize: 10.5, color: BP.text }}>導入後：MySQL → PHP(api) → 前端</span>}>
        <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 0 }}>
          {LAYERS.map((L, i) => (
            <div key={i} style={{ padding: 14, borderRight: i < 3 ? `1px solid ${BP.borderDim}` : 'none', borderLeft: `3px solid ${L.sc}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontFamily: BP.mono, fontSize: 13, fontWeight: 700, color: L.sc }}>{L.lv}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: BP.label }}>{L.name}</span>
                <span style={{ marginLeft: 'auto', fontFamily: BP.mono, fontSize: 8.5, fontWeight: 700, color: L.phase === '現況' ? '#22C55E' : L.phase === '規劃' ? '#F59E0B' : '#EF4444', background: L.phase === '現況' ? 'rgba(34,197,94,.14)' : L.phase === '規劃' ? 'rgba(245,158,11,.14)' : 'rgba(239,68,68,.12)', borderRadius: 4, padding: '1px 6px' }}>{L.phase}</span>
              </div>
              <div style={{ fontSize: 8.5, color: BP.textDim, letterSpacing: .5, textTransform: 'uppercase', marginTop: 2 }}>{L.en}</div>
              <div style={{ fontSize: 11, color: BP.text, lineHeight: 1.5, marginTop: 8, minHeight: 52 }}>{L.items}</div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}><window.Tier k={sim && L.lv === 'L3' ? 'sim' : L.tier} /><span style={{ fontSize: 10, color: BP.textDim }}>{sim && L.lv === 'L3' ? '模擬已填 · 完整呈現' : L.show}</span></div>
            </div>
          ))}
        </div>
      </window.BPCard>

      {/* connectors */}
      <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 10, flexShrink: 0 }}>
        {[['管線流量計', '300mm 主 / 400mm 輔', '#22C55E', 'actual', '水量計明細表（日）'],
          ['電力電錶', '集合式電錶 · 月帳單', '#22C55E', 'actual', '3/21 裝總集合錶'],
          ['SCADA / PLC', '水位 · 壓力 · 各泵頻率', '#F59E0B', 'plan', '尚未串接（規劃導入）'],
          (sim ? ['單泵計量', '流量 / 電表 / 感測器', '#c084fc', 'sim', '模擬值完整呈現'] : ['單泵計量', '流量 / 電表 / 感測器', '#EF4444', 'missing', '目前無 — 待裝錶'])].map((s, i) => (
          <div key={i} style={{ borderRadius: 10, padding: '12px 14px', background: BP.card, border: `1px solid ${s[3] === 'missing' ? 'rgba(239,68,68,.4)' : s[3] === 'sim' ? 'rgba(192,132,252,.4)' : BP.borderDim}`, borderStyle: s[3] === 'missing' ? 'dashed' : 'solid' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: BP.label }}>{s[0]}</span>
              <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: 999, background: s[2], boxShadow: `0 0 6px ${s[2]}` }} />
            </div>
            <div style={{ fontFamily: BP.mono, fontSize: 10.5, color: BP.text, marginTop: 6 }}>{s[1]}</div>
            <div style={{ fontSize: 10, color: BP.textDim, marginTop: 6 }}>{s[4]}</div>
          </div>
        ))}
      </div>

      {/* raw data browse: real daily / sources / gaps */}
      <window.BPCard title="原始資料瀏覽" en="Data Browser" glow style={{ flex: 1, minHeight: 360 }}
        right={
          <span style={{ display: 'flex', gap: 8 }}>
            <span style={{ display: 'inline-flex', gap: 2, background: 'rgba(8,21,44,.6)', borderRadius: 7, padding: 2, border: `1px solid ${BP.borderDim}` }}>
              {[['daily', `每日量測 (${daily.length})`], ['src', '資料來源/品質'], ['ingest', '資料接入'], ['gap', '資料缺口']].map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)} style={{ all: 'unset', cursor: 'pointer', padding: '4px 11px', borderRadius: 5, fontSize: 11, fontFamily: BP.mono, fontWeight: 600, color: tab === k ? '#06223f' : BP.text, background: tab === k ? BP.accent : 'transparent' }}>{l}</button>
              ))}
            </span>
          </span>
        }>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {tab === 'daily' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#0a1b34', zIndex: 1 }}>
                <tr>{['日期', '300mm m³', '400mm m³', '合計 m³', '站內監控錶 kWh', '單位電耗 kWh/m³', '軸溫最高 °C', '振動最高 mm/s', '單泵電耗σ', '單泵流量校核 %', '品質'].map((h, i) => <th key={i} style={th(i >= 1 && i <= 9 ? { textAlign: 'right' } : {})}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {daily.map((r, i) => {
                  const real = r[4];
                  const kwh = real != null ? real : (sim ? Math.round(r[3] * 0.46) : null);
                  const sec = kwh != null && r[3] ? (kwh / r[3]) : null;
                  const q = real == null ? (sim ? 'sim' : 'missing') : (r[0] === '04/01' ? 'abnormal' : (i >= 53 && i <= 71 ? 'filled' : 'actual'));
                  const dc = DQ_COL[q];
                  const gap = (v, suf) => sim
                    ? <td style={td({ textAlign: 'right', color: '#c084fc' })}>{v}{suf}</td>
                    : <td style={td({ textAlign: 'right' })}><span style={{ fontFamily: BP.mono, fontSize: 9, color: '#EF4444', border: '1px dashed rgba(239,68,68,.5)', borderRadius: 3, padding: '0 5px' }}>待串接</span></td>;
                  const s = (a, b, c) => +(a + b * Math.abs(Math.sin(i * c + b))).toFixed(b < 1 ? 3 : 1);
                  return (
                    <tr key={i}>
                      <td style={td({ color: BP.label })}>{r[0]}</td>
                      <td style={td({ textAlign: 'right' })}>{r[1].toLocaleString()}</td>
                      <td style={td({ textAlign: 'right' })}>{r[2].toLocaleString()}</td>
                      <td style={td({ textAlign: 'right', color: BP.label, fontWeight: 700 })}>{r[3].toLocaleString()}</td>
                      <td style={td({ textAlign: 'right', color: kwh == null ? BP.textDim : (q === 'sim' ? '#c084fc' : BP.accent) })}>{kwh == null ? '—' : kwh.toLocaleString()}</td>
                      <td style={td({ textAlign: 'right', color: sec == null ? BP.textDim : (q === 'abnormal' ? '#EF4444' : q === 'sim' ? '#c084fc' : '#22C55E') })}>{sec == null ? '—' : sec.toFixed(3)}</td>
                      {gap(s(54, 8, 0.7), '')}
                      {gap(s(2.1, 1.4, 1.1), '')}
                      {gap(s(0.02, 0.03, 0.9), '')}
                      {gap(s(0.4, 1.6, 0.5), '')}
                      <td style={td()}><span style={{ fontFamily: BP.mono, fontSize: 9.5, color: dc[0], background: dc[1], padding: '1px 6px', borderRadius: 4 }}>{q}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {tab === 'src' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#0a1b34', zIndex: 1 }}>
                <tr>{['資料段', '來源檔', '型態', '品質', '備註'].map((h, i) => <th key={i} style={th()}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {SOURCES.map((s, i) => { const dc = DQ_COL[s[3]] || ['#6fa8dc', 'rgba(31,91,156,.2)']; return (
                  <tr key={i}>
                    <td style={td({ color: BP.label, fontFamily: 'inherit', whiteSpace: 'normal' })}>{s[0]}</td>
                    <td style={td({ color: BP.text, whiteSpace: 'normal' })}>{s[1]}</td>
                    <td style={td({ color: BP.textDim })}>{s[2]}</td>
                    <td style={td()}><span style={{ fontFamily: BP.mono, fontSize: 9.5, color: dc[0], background: dc[1], padding: '1px 6px', borderRadius: 4 }}>{s[3]}</span></td>
                    <td style={td({ color: BP.text, whiteSpace: 'normal' })}>{s[4]}</td>
                  </tr>
                ); })}
              </tbody>
            </table>
          )}
          {tab === 'ingest' && (
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* pipeline */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: BP.label, marginBottom: 8 }}>資料接入路徑（來源不是直接進 MySQL，中間有解析／正規化）</div>
                <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, flexWrap: 'wrap' }}>
                  {[['多來源 · 多頻率', '.xls / 帳單 / PDF / (未來)SCADA 即時點位', '#7cd4ff'],
                    ['解析 · 正規化 (ingest)', '統一單位、打上 時間戳＋回報頻率＋品質標籤', '#a78bfa'],
                    ['MySQL 統一資料庫', '依頻率分表：靜態 / 日 / 月 / 即時', '#22C55E'],
                    ['模型 · 分析', '選泵、單位電耗、驗證、KPI', '#22D3EE'],
                    ['前端呈現', '本平台', '#cfe6ff']].map((s, i, arr) => (
                    <React.Fragment key={i}>
                      <div style={{ flex: '1 1 150px', background: 'rgba(8,21,44,.5)', border: `1px solid ${BP.borderDim}`, borderLeft: `3px solid ${s[2]}`, borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: BP.label }}>{s[0]}</div>
                        <div style={{ fontSize: 10, color: BP.text, marginTop: 5, lineHeight: 1.5 }}>{s[1]}</div>
                      </div>
                      {i < arr.length - 1 && <span style={{ alignSelf: 'center', color: BP.accent, fontSize: 16 }}>→</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* bulk import + streaming endpoints */}
              <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                {[['◳ 歷史批次匯入端口', '#7cd4ff', '過去歷史「一次大量匯入」（bulk import）：把既有 .xls／帳單／PDF 整批解析入庫。這正是目前資料的來源方式。', '建議保留'],
                  ['⇄ 持續接入端口', '#a78bfa', '入庫後依各來源頻率持續接：日資料每日批次、月資料每月、SCADA 即時則為串流（規劃）。與歷史匯入分開設計。', '規劃']].map((c, i) => (
                  <div key={i} style={{ background: 'rgba(8,21,44,.5)', border: `1px solid ${BP.borderDim}`, borderRadius: 9, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 13, fontWeight: 700, color: c[1] }}>{c[0]}</span><span style={{ marginLeft: 'auto', fontFamily: BP.mono, fontSize: 9.5, color: c[1] }}>{c[3]}</span></div>
                    <div style={{ fontSize: 11, color: BP.text, marginTop: 7, lineHeight: 1.6 }}>{c[2]}</div>
                  </div>
                ))}
              </div>

              {/* cadence table */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: BP.label, marginBottom: 8 }}>各來源回報頻率（入庫前需先分類，分析才不會把月資料當日資料用）</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['資料來源', '回報頻率', '接入方式', '階段'].map((h, i) => <th key={i} style={th()}>{h}</th>)}</tr></thead>
                  <tbody>
                    {CADENCE.map((c, i) => (
                      <tr key={i}>
                        <td style={td({ color: BP.label, fontFamily: 'inherit', whiteSpace: 'normal' })}>{c[0]}</td>
                        <td style={td({ color: c[3] })}>{c[1]}</td>
                        <td style={td({ color: BP.text })}>{c[2]}</td>
                        <td style={td()}><span style={{ fontFamily: BP.mono, fontSize: 9.5, color: c[3], background: c[3] + '22', borderRadius: 4, padding: '1px 6px' }}>{c[4]}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 10.5, color: BP.textDim, lineHeight: 1.6 }}>※ 重點：每筆資料入庫時都帶「時間戳＋回報頻率＋品質」標籤，混合頻率才能正確聚合（日→月、即時→日）。目前皆為批次匯入；SCADA 即時串流為規劃。</div>
            </div>
          )}
          {tab === 'gap' && (
            <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? '1fr' : 'repeat(2,1fr)', gap: 12, padding: 14 }}>
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 9, padding: '10px 13px' }}>
                <span style={{ fontFamily: BP.mono, fontSize: 10, fontWeight: 700, color: '#22C55E', background: 'rgba(34,197,94,.16)', borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap', marginTop: 1 }}>站級已具備</span>
                <span style={{ fontSize: 11.5, color: BP.text, lineHeight: 1.5 }}><b style={{ color: BP.label }}>站級用電（站內監控錶）與單位電耗已有資料</b>（3/30 起逐日）。下方缺口是「<b style={{ color: '#EF4444' }}>單泵分項</b>」——把站級總量拆到每一台泵，需逐台加裝計量／感測，並非站級沒有數據。</span>
              </div>
              {GAPS.map((g, i) => (
                <div key={i} style={{ background: sim ? 'rgba(192,132,252,.06)' : 'rgba(239,68,68,.05)', border: `1px ${sim ? 'solid rgba(192,132,252,.45)' : 'dashed #EF4444'}`, borderRadius: 10, padding: '13px 15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontFamily: BP.mono, fontSize: 13, fontWeight: 700, color: sim ? '#c084fc' : '#EF4444' }}>{sim ? '◉' : '🔒'} {g[0]}</span>
                    <span style={{ marginLeft: 'auto' }}><window.Tier k={sim ? 'sim' : 'gap'} /></span>
                  </div>
                  <div style={{ fontSize: 11.5, color: BP.text, marginTop: 7, lineHeight: 1.5 }}>{sim ? '已啟用（模擬）：' : '裝設後可啟用：'}{g[1]}</div>
                  <div style={{ fontFamily: BP.mono, fontSize: 10, color: sim ? '#c084fc' : '#EF4444', marginTop: 8 }}>狀態：{sim ? '模擬值完整呈現' : '需取得此數據'}</div>
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1', fontSize: 11, color: BP.textDim, lineHeight: 1.6, padding: '4px 2px' }}>
                資料成熟度路徑：L1 站級電表＋總流量（已具備，可驗證節能是否達標）→ L3 單泵電表（可判斷單泵功率偏差）→ L4 單泵流量＋壓力（可計算 η、SEC 與退化）→ L5 即時資料＋控制權限（半自動 / 自動調度）。
              </div>
            </div>
          )}
        </div>
      </window.BPCard>
    </div>
  );
}

window.DataIntegration = DataIntegration;
