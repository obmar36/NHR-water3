// reports.jsx — 報表中心: 日/週/月 report export + AI analysis summary.

const PERIOD_META = {
  '日': { label: '日報表', en: 'Daily Report', hours: 24, span: '2026-06-05（單日）', short: '今日' },
  '週': { label: '週報表', en: 'Weekly Report', hours: 168, span: '2026 第 23 週（05/30–06/05）', short: '本週' },
  '月': { label: '月報總結', en: 'Monthly Summary', hours: 720, span: '2026 年 6 月', short: '本月' },
};

function reportData(motors, summary, period) {
  const h = PERIOD_META[period].hours;
  const running = motors.filter(m => m.status !== 'standby');
  const totalKwh = Math.round(summary.total_power * h);
  const baseKwh = running.reduce((s, m) => s + m.baseline_kw, 0) * h;
  const savedKwh = Math.round(baseKwh - totalKwh);
  const waterM3 = Math.round(summary.total_flow * h);
  const cost = Math.round(savedKwh * (summary.tariff_blended || 5.0));
  const co2 = +((savedKwh * (summary.co2 || 0.467)) / 1000).toFixed(1);
  const rows = running.map(m => ({
    id: m.id, name: m.name, kwh: Math.round(m.power_kw * h),
    share: summary.total_power ? (m.power_kw / summary.total_power * 100) : 0,
    eff: m.eff_pct, sec: m.sec_kwh_m3, status: m.status,
  })).sort((a, b) => b.kwh - a.kwh);
  return { h, totalKwh, baseKwh: Math.round(baseKwh), savedKwh, waterM3, cost, co2, rows };
}

function downloadCSV(name, matrix) {
  const csv = matrix.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1200);
}

function DlIcon({ s = 12, c = 'currentColor' }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: '-2px' }}><path d="M12 3v11M7 10l5 5 5-5M5 21h14" /></svg>;
}

function ReportsPage({ motors, summary }) {
  const BP = window.BP;
  const vp = window.useVP ? window.useVP() : { isMobile: false, isTablet: false };
  const [period, setPeriod] = React.useState('月');
  const [stamp] = React.useState('2026-06-05 09:14');
  const meta = PERIOD_META[period];
  const d = reportData(motors, summary, period);
  const savePct = d.baseKwh ? (d.savedKwh / d.baseKwh * 100).toFixed(1) : '0';

  const aiSummary = `${meta.short}全站總用電約 ${(d.totalKwh / 1000).toFixed(1)} MWh（模型推估）、出水 ${(d.waterM3 / 10000).toFixed(1)} 萬噸，平均噸水電耗 ${summary.sec.toFixed(3)} kWh/m³。以台電帳單口徑驗證：單位電耗由 4 月 0.383 降至 5 月 0.343 kWh/m³、降幅約 10%，且 5 月出水量反增。模型預測改善幅度約 ${summary.saving_pct}%（基準 ${summary.se_base}→加權 ${summary.se_model_after}），與帳單方向一致。改善策略：日間以 150HP_P3@55Hz 保底、夜間改用 100HP 雙機；P4 因現場衰退列備用。⚠ 夜間 P1 頻率 57/60Hz 待廠商確認；單泵性能為現場曲線推估，非實測。`;
  const recos = [
    '夜間改用 100HP 雙機（P1@57＋P2@51）、停 150HP_P3：100HP 現場效率約 70% 遠高於衰退之 150HP（約 54%）。',
    '日間高流量一律以 P3@55Hz 取代 P4@60Hz：等流量下少約 15% 輸入功率。',
    '計費端再優化：將日間用電對齊台電半尖峰、避開 16–22 時尖峰電價（9.39 元/度）。',
    '裝設單泵電表＋流量計，可由站級驗證升級至單機劣化診斷（L3→L4）。',
  ];

  const doExport = (fmt) => {
    const matrix = [
      [`${meta.label} · 示範加壓站`, meta.span],
      [],
      ['關鍵指標', '數值', '單位'],
      ['總用電', d.totalKwh, 'kWh'],
      ['出水量', d.waterM3, 'm³'],
      ['噸水電耗', summary.sec, 'kWh/m³'],
      ['節能率', savePct, '%'],
      ['節省電量', d.savedKwh, 'kWh'],
      ['節省電費', d.cost, 'NT$'],
      ['減碳量', d.co2, 't CO2'],
      [],
      ['機組', '名稱', '用電(kWh)', '占比(%)', '泵效率(%)', '噸水電耗', '狀態'],
      ...d.rows.map(r => [r.id, r.name, r.kwh, r.share.toFixed(1), r.eff, r.sec, r.status === 'warn' ? '警告' : '運轉']),
    ];
    downloadCSV(`${meta.en.replace(/ /g, '_')}_PS-01.csv`, matrix);
  };

  const archiveDownload = (label, p) => {
    const dd = reportData(motors, summary, p);
    const sp = dd.baseKwh ? (dd.savedKwh / dd.baseKwh * 100).toFixed(1) : '0';
    const matrix = [
      [label, '示範加壓站 · PS-01'],
      [],
      ['關鍵指標', '數值', '單位'],
      ['總用電', dd.totalKwh, 'kWh'],
      ['出水量', dd.waterM3, 'm³'],
      ['噸水電耗', summary.sec, 'kWh/m³'],
      ['節能率', sp, '%'],
      ['節省電量', dd.savedKwh, 'kWh'],
      ['節省電費', dd.cost, 'NT$'],
      ['減碳量', dd.co2, 't CO2'],
      [],
      ['機組', '名稱', '用電(kWh)', '占比(%)', '泵效率(%)', '噸水電耗', '狀態'],
      ...dd.rows.map(r => [r.id, r.name, r.kwh, r.share.toFixed(1), r.eff, r.sec, r.status === 'warn' ? '警告' : '運轉']),
    ];
    downloadCSV(label.replace(/[ \/]/g, '_') + '_PS-01.csv', matrix);
  };

  const kpis = [
    ['總用電', (d.totalKwh / 1000).toFixed(1), 'MWh', BP.accent],
    ['出水量', (d.waterM3 / 10000).toFixed(1), '萬 m³', BP.label],
    ['噸水電耗', summary.sec.toFixed(3), 'kWh/m³', '#22C55E'],
    ['節能率', savePct, '%', '#22C55E'],
    ['節省電費', '$' + (d.cost / 10000).toFixed(1) + '萬', 'NT$', '#7cd4ff'],
    ['減碳量', d.co2, 't CO₂', '#22C55E'],
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? '1fr' : 'minmax(0,1fr) 300px', gap: 12, padding: vp.isMobile ? 10 : 14, height: '100%', minHeight: 0 }}>
      {/* report document */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <window.BPCard glow style={{ flex: 1, minHeight: 0 }}>
          {/* doc toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${BP.borderDim}`, flexShrink: 0, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', gap: 2, background: 'rgba(8,21,44,.6)', borderRadius: 7, padding: 2, border: `1px solid ${BP.borderDim}` }}>
              {['日', '週', '月'].map(p => <button key={p} onClick={() => setPeriod(p)} style={{ all: 'unset', cursor: 'pointer', padding: '5px 14px', borderRadius: 5, fontSize: 12, fontFamily: BP.mono, fontWeight: 600, color: period === p ? '#06223f' : BP.text, background: period === p ? BP.accent : 'transparent' }}>{PERIOD_META[p].label}</button>)}
            </span>
            <div style={{ flex: 1 }} />
            {['PDF', 'Excel', 'CSV'].map((f) => (
              <button key={f} onClick={() => f === 'PDF' ? window.print() : doExport(f)} style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: BP.mono, fontSize: 11.5, color: f === 'CSV' ? '#06223f' : BP.accent, background: f === 'CSV' ? BP.accent : 'transparent', border: `1px solid ${BP.border}`, borderRadius: 6, padding: '6px 12px' }}><DlIcon c={f === 'CSV' ? '#06223f' : BP.accent} /> 匯出 {f}</button>
            ))}
          </div>
          {/* doc body */}
          <div id="report-doc" style={{ flex: 1, overflow: 'auto', padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderBottom: `2px solid ${BP.border}`, paddingBottom: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: BP.label }}>{meta.label}</div>
                <div style={{ fontSize: 12, color: BP.text, marginTop: 3 }}>示範加壓站 · PS-01 · 清水池 → 配水池</div>
              </div>
              <div style={{ textAlign: 'right', fontFamily: BP.mono, fontSize: 11, color: BP.textDim }}>
                <div>期間 {meta.span}</div>
                <div>AI 彙整 {stamp}</div>
              </div>
            </div>

            {/* AI executive summary */}
            <div style={{ borderRadius: 10, border: '1px solid rgba(65,166,255,.4)', background: 'rgba(65,166,255,.07)', padding: '13px 15px', marginBottom: 16 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: BP.accent, boxShadow: `0 0 6px ${BP.accent}` }} className="md-pulse" />
                <span style={{ fontFamily: BP.mono, fontSize: 11, fontWeight: 700, color: BP.accent, letterSpacing: .5 }}>AI 執行摘要 · EXECUTIVE SUMMARY</span>
              </div>
              <div style={{ fontSize: 13, color: BP.label, lineHeight: 1.7 }}>{aiSummary}</div>
            </div>

            {/* KPIs */}
            <SectionTitle BP={BP} t="關鍵指標" e="Key Metrics" />
            <div style={{ display: 'grid', gridTemplateColumns: vp.isMobile ? 'repeat(2,1fr)' : vp.isTablet ? 'repeat(3,1fr)' : 'repeat(6,1fr)', gap: 8, marginBottom: 18 }}>
              {kpis.map((k, i) => (
                <div key={i} style={{ background: 'rgba(8,21,44,.5)', border: `1px solid ${BP.borderDim}`, borderRadius: 8, padding: '9px 10px' }}>
                  <div style={{ fontSize: 10, color: BP.textDim }}>{k[0]}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
                    <span style={{ fontFamily: BP.mono, fontSize: 16, fontWeight: 700, color: k[3] }}>{k[1]}</span>
                    <span style={{ fontSize: 8.5, color: BP.text }}>{k[2]}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* trend chart (period-scoped: 日=近14天 / 週=近8週 / 月=全期間) */}
            <SectionTitle BP={BP} t={period === '日' ? '單位電耗趨勢 · 近 14 天' : period === '週' ? '單位電耗趨勢 · 近 8 週' : '單位電耗趨勢 · 全期間'} e="Specific-Energy Trend" />
            <div style={{ marginBottom: 18 }}><ReportTrend BP={BP} period={period} /></div>

            {/* energy breakdown table */}
            <SectionTitle BP={BP} t="機組能耗明細" e="Energy by Unit" />
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18 }}>
              <thead><tr>{['機組', '名稱', '用電 (kWh)', '占比', '泵效率', '噸水電耗', '狀態'].map((hd, i) => <th key={i} style={{ textAlign: i >= 2 && i <= 5 ? 'right' : 'left', padding: '8px 10px', fontSize: 10.5, color: BP.textDim, fontFamily: BP.mono, borderBottom: `1px solid ${BP.borderDim}`, whiteSpace: 'nowrap' }}>{hd}</th>)}</tr></thead>
              <tbody>
                {d.rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px 10px', fontFamily: BP.mono, fontSize: 12, fontWeight: 700, color: BP.accent, borderBottom: `1px solid ${BP.borderDim}` }}>{r.id}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12, color: BP.label, borderBottom: `1px solid ${BP.borderDim}`, whiteSpace: 'nowrap' }}>{r.name}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: BP.mono, fontSize: 12, color: BP.label, fontWeight: 700, borderBottom: `1px solid ${BP.borderDim}` }}>{r.kwh.toLocaleString()}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: BP.mono, fontSize: 11.5, color: BP.text, borderBottom: `1px solid ${BP.borderDim}` }}>{r.share.toFixed(1)}%</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: BP.mono, fontSize: 11.5, color: r.eff >= 80 ? '#22C55E' : '#F59E0B', borderBottom: `1px solid ${BP.borderDim}` }}>{r.eff}%</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: BP.mono, fontSize: 11.5, color: BP.text, borderBottom: `1px solid ${BP.borderDim}` }}>{r.sec}</td>
                    <td style={{ padding: '8px 10px', borderBottom: `1px solid ${BP.borderDim}` }}><span style={{ fontFamily: BP.mono, fontSize: 10.5, fontWeight: 700, color: r.status === 'warn' ? '#F59E0B' : '#22C55E' }}>{r.status === 'warn' ? '警告' : '運轉'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* AI recommendations */}
            <SectionTitle BP={BP} t="AI 分析與建議事項" e="Findings & Actions" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recos.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 12px', borderRadius: 8, background: 'rgba(8,21,44,.5)', border: `1px solid ${BP.borderDim}` }}>
                  <span style={{ fontFamily: BP.mono, fontSize: 11, fontWeight: 700, color: '#06223f', background: BP.accent, width: 18, height: 18, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 12.5, color: BP.label, lineHeight: 1.55 }}>{r}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, fontSize: 10.5, color: BP.textDim, fontFamily: BP.mono }}>※ 機組能耗為現場曲線模型推估（非單泵實測）；月度節能以台電帳單口徑驗證。接 historian / 單泵電表後可自動產生並排程推送。自動產生並可排程推送。</div>
          </div>
        </window.BPCard>
      </div>

      {/* right rail */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflow: 'auto' }}>
        <window.BPCard title="匯出與排程" en="Export & Schedule" glow>
          <div style={{ padding: 13 }}>
            <window.BPRow label="報表格式" value="PDF / Excel / CSV" />
            <window.BPRow label="日報" value="每日 08:00 自動產生" />
            <window.BPRow label="週報" value="每週一 08:00" />
            <window.BPRow label="月報" value="每月 1 日 08:00" />
            <window.BPRow label="推送對象" value="管理者 · LINE 群組" />
            <button onClick={() => doExport('CSV')} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 11, fontFamily: BP.mono, fontSize: 12.5, fontWeight: 700, color: '#06223f', background: BP.accent, borderRadius: 7, padding: '10px 0' }}><DlIcon c="#06223f" /> 立即下載本期 CSV</button>
          </div>
        </window.BPCard>
        <window.BPCard title="歷史報表" en="Archive">
          <div>
            {[['2026-06 月報總結', '月', '06-01'], ['2026 第 22 週週報', '週', '05-26'], ['2026-06-04 日報', '日', '06-04'], ['2026-06-03 日報', '日', '06-03'], ['2026-05 月報總結', '月', '05-01']].map((r, i) => (
              <div key={i} onClick={() => archiveDownload(r[0], r[1])} title="下載範例資料 (CSV)" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 13px', borderBottom: `1px solid ${BP.borderDim}`, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(65,166,255,.08)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ width: 22, height: 22, borderRadius: 5, background: 'rgba(65,166,255,.12)', color: BP.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontFamily: BP.mono }}>{r[1]}</span>
                <span style={{ flex: 1, fontSize: 11.5, color: BP.label }}>{r[0]}</span>
                <span style={{ fontFamily: BP.mono, fontSize: 10, color: BP.textDim }}>{r[2]}</span>
                <span style={{ cursor: 'pointer', color: BP.accent, display: 'inline-flex' }}><DlIcon c={BP.accent} /></span>
              </div>
            ))}
          </div>
        </window.BPCard>
      </div>
    </div>
  );
}

function ReportTrend({ BP, period }) {
  const all = (window.dailySEC ? window.dailySEC() : []);
  if (!all.length) return null;
  const N = period === '日' ? 14 : period === '週' ? 56 : all.length;
  const d = all.slice(-N);
  const w = 620, h = 130, padL = 36, padR = 12, padT = 12, padB = 22;
  const iw = w - padL - padR, ih = h - padT - padB;
  const vals = d.map(p => p.sec);
  const lo = Math.min(...vals) * 0.97, hi = Math.max(...vals) * 1.03;
  const X = i => padL + (d.length > 1 ? (i / (d.length - 1)) * iw : iw / 2);
  const Y = v => padT + ih - ((v - lo) / (hi - lo)) * ih;
  const line = d.map((p, i) => `${i ? 'L' : 'M'} ${X(i).toFixed(1)} ${Y(p.sec).toFixed(1)}`).join(' ');
  const ci = d.findIndex(p => p.d === '05/05' || /-05-05$/.test(p.d));
  const lbl = (s) => (s && s.length > 5 ? s.slice(5) : s);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', fontFamily: BP.mono, border: `1px solid ${BP.borderDim}`, borderRadius: 8, background: 'rgba(8,21,44,.4)' }}>
      {[0, .5, 1].map((f, i) => { const y = padT + ih * (1 - f); const v = lo + (hi - lo) * f; return <g key={i}><line x1={padL} y1={y} x2={w - padR} y2={y} stroke={BP.borderDim} strokeDasharray={f === 0 ? '' : '2 4'} /><text x={padL - 5} y={y + 3} textAnchor="end" fontSize="8.5" fill={BP.text}>{v.toFixed(2)}</text></g>; })}
      {0.42 > lo && 0.42 < hi && <g><line x1={padL} y1={Y(0.42)} x2={w - padR} y2={Y(0.42)} stroke="#F59E0B" strokeDasharray="5 4" opacity=".7" /><text x={w - padR} y={Y(0.42) - 3} textAnchor="end" fontSize="8" fill="#F59E0B">0.42 退化提醒</text></g>}
      {ci > 0 && <g><line x1={X(ci)} y1={padT} x2={X(ci)} y2={padT + ih} stroke="#22C55E" strokeDasharray="4 3" /><text x={X(ci)} y={padT + 8} textAnchor="middle" fontSize="8" fill="#22C55E">5/5 優化上線</text></g>}
      <path d={line} fill="none" stroke={BP.accent} strokeWidth="1.6" />
      {[0, Math.floor(d.length / 2), d.length - 1].map((i, k) => <text key={k} x={X(i)} y={h - 7} textAnchor={k === 0 ? 'start' : k === 2 ? 'end' : 'middle'} fontSize="8.5" fill={BP.textDim}>{lbl(d[i].d)}</text>)}
      <text x={padL - 5} y={9} textAnchor="end" fontSize="8" fill={BP.accent}>kWh/m³</text>
    </svg>
  );
}

function SectionTitle({ BP, t, e }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{ width: 3, height: 14, background: BP.accent, borderRadius: 2 }} />
      <span style={{ fontSize: 13.5, fontWeight: 700, color: BP.label }}>{t}</span>
      <span style={{ fontFamily: BP.mono, fontSize: 9.5, color: BP.textDim, letterSpacing: 1, textTransform: 'uppercase' }}>{e}</span>
    </div>
  );
}

window.ReportsPage = ReportsPage;
