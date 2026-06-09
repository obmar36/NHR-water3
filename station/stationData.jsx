// stationData.jsx — 示範加壓站 資料層 + 節能模型核心（已去識別化）
// 資料來源：加壓站結構化資料與節能模型 v1.0 正式版（區管理處，窗口 2025/03/21–07/10）。
// 模型方法：4 泵 × 40–60Hz 現場實測效能曲線「查表 / 線性內插」，非親和定律理論值（本站高靜揚程，理論法會高估節能）。
// 公式：電力kW = BHP×0.746 / 馬達滿載效率；單位電耗 SEC = 24×kW / 出水量(CMD)；並聯 = 各台相加。
// 兩條鐵則：(1) 實際模式只呈現真實資料格式內有的數據；(2) 無單泵電表/流量計，單泵性能標「模型推估」，軸溫/振動標「需取得」；模擬模式才以模擬值完整呈現。

// ---- 資料來源：開機時向後端 api.php?action=bundle 抓取（MySQL→PHP）；抓不到則用下方內建備援 ----
// 依網址 ?dataset=demo 切換到示範庫(兩年)；否則用真實庫。對應前端「實際/模擬」鈕。
var __DS__ = (new URLSearchParams(window.location.search).get('dataset') === 'demo') ? 'demo' : 'real';
window.__INIT_MODE__ = (__DS__ === 'demo') ? 'sim' : 'actual';
window.__SIM__ = (__DS__ === 'demo');   // 全域旗標：模擬模式 → 時序/即時圖用紫色標示
// 同步抓取單一來源，成功且結構正確才回傳，否則回 null（讓外層往下一層退）
function _fetchBundle(url){
  try{
    var x = new XMLHttpRequest();
    x.open('GET', url, false);                 // 同源同站，相對路徑
    x.send();
    if(x.status === 200){
      var j = JSON.parse(x.responseText);
      if(j && j.field && j.meta && j.order) return j;
    }
  }catch(e){ /* 此來源不可用，往下一層退 */ }
  return null;
}
// 三層保險：
//   1) 後端 PHP API   → 本機 XAMPP（PHP→MySQL）有，用「即時資料庫」
//   2) 靜態 JSON 快照 → 純靜態主機（如 Vercel）走這條，「實際/模擬」兩年資料切換靠它
//   3) 內建備援資料   → 前述都拿不到時的最後保險（真實 4 個月）
function loadBundleSync(){
  var j = _fetchBundle('../php/api.php?action=bundle&dataset=' + __DS__);
  if(j){ window.__DATA_SRC__ = '後端API (MySQL→PHP)'; return j; }
  j = _fetchBundle('./data/bundle-' + __DS__ + '.json');
  if(j){ window.__DATA_SRC__ = '靜態JSON快照 (' + __DS__ + ')'; return j; }
  console.warn('[NHR] 後端 API 與靜態 JSON 皆無法讀取，改用內建備援資料（真實 4 個月）。');
  window.__DATA_SRC__ = '內建備援資料';
  return null;
}
const __FALLBACK__ = {"field": {"P1_150HP": [{"Hz": 40, "H": 79.0, "Q": 434.4, "BHP": 35.43, "EFF": 14.76, "kW": 31.35, "SE": 1.7322}, {"Hz": 41, "H": 79.0, "Q": 855.6, "BHP": 38.1, "EFF": 27.99, "kW": 33.72, "SE": 0.9458}, {"Hz": 42, "H": 79.2, "Q": 1149.6, "BHP": 41.21, "EFF": 33.68, "kW": 36.47, "SE": 0.7613}, {"Hz": 43, "H": 80.2, "Q": 1327.2, "BHP": 43.75, "EFF": 37.09, "kW": 38.72, "SE": 0.7001}, {"Hz": 44, "H": 80.5, "Q": 1545.6, "BHP": 47.14, "EFF": 40.24, "kW": 41.72, "SE": 0.6478}, {"Hz": 45, "H": 80.9, "Q": 1843.2, "BHP": 50.81, "EFF": 44.74, "kW": 44.96, "SE": 0.5855}, {"Hz": 46, "H": 81.1, "Q": 2107.2, "BHP": 54.76, "EFF": 47.57, "kW": 48.46, "SE": 0.5519}, {"Hz": 47, "H": 81.2, "Q": 2330.4, "BHP": 58.15, "EFF": 49.6, "kW": 51.46, "SE": 0.53}, {"Hz": 48, "H": 81.3, "Q": 2553.6, "BHP": 62.11, "EFF": 50.95, "kW": 54.96, "SE": 0.5166}, {"Hz": 49, "H": 81.3, "Q": 2726.4, "BHP": 65.78, "EFF": 51.37, "kW": 58.21, "SE": 0.5124}, {"Hz": 50, "H": 81.2, "Q": 2932.8, "BHP": 69.17, "EFF": 52.48, "kW": 61.21, "SE": 0.5009}, {"Hz": 51, "H": 81.3, "Q": 3144.0, "BHP": 72.81, "EFF": 53.52, "kW": 64.43, "SE": 0.4918}, {"Hz": 52, "H": 81.5, "Q": 3295.2, "BHP": 76.76, "EFF": 53.33, "kW": 67.93, "SE": 0.4947}, {"Hz": 53, "H": 81.8, "Q": 3463.2, "BHP": 81.28, "EFF": 53.13, "kW": 71.93, "SE": 0.4985}, {"Hz": 54, "H": 81.6, "Q": 3626.4, "BHP": 85.24, "EFF": 53.57, "kW": 75.43, "SE": 0.4992}, {"Hz": 55, "H": 83.1, "Q": 3796.8, "BHP": 89.19, "EFF": 53.93, "kW": 78.93, "SE": 0.4989}, {"Hz": 56, "H": 83.2, "Q": 3921.6, "BHP": 93.71, "EFF": 53.08, "kW": 82.93, "SE": 0.5075}, {"Hz": 57, "H": 83.5, "Q": 4072.8, "BHP": 97.67, "EFF": 53.08, "kW": 86.43, "SE": 0.5093}, {"Hz": 58, "H": 83.6, "Q": 4221.6, "BHP": 101.62, "EFF": 52.94, "kW": 89.93, "SE": 0.5112}, {"Hz": 59, "H": 83.7, "Q": 4382.4, "BHP": 106.14, "EFF": 52.68, "kW": 93.93, "SE": 0.5144}, {"Hz": 60, "H": 83.8, "Q": 4430.4, "BHP": 107.84, "EFF": 52.48, "kW": 95.43, "SE": 0.517}], "P2_150HP": [{"Hz": 40, "H": 78.9, "Q": 280.8, "BHP": 35.9, "EFF": 9.41, "kW": 31.77, "SE": 2.7153}, {"Hz": 41, "H": 78.9, "Q": 288.0, "BHP": 38.47, "EFF": 9.0, "kW": 34.04, "SE": 2.837}, {"Hz": 42, "H": 78.9, "Q": 276.0, "BHP": 40.73, "EFF": 8.15, "kW": 36.04, "SE": 3.1342}, {"Hz": 43, "H": 78.9, "Q": 316.8, "BHP": 43.27, "EFF": 8.81, "kW": 38.29, "SE": 2.9008}, {"Hz": 44, "H": 77.5, "Q": 403.2, "BHP": 44.97, "EFF": 10.59, "kW": 39.8, "SE": 2.3688}, {"Hz": 45, "H": 79.5, "Q": 849.6, "BHP": 46.38, "EFF": 22.2, "kW": 41.04, "SE": 1.1594}, {"Hz": 46, "H": 79.2, "Q": 1320.0, "BHP": 49.49, "EFF": 32.2, "kW": 43.8, "SE": 0.7963}, {"Hz": 47, "H": 79.0, "Q": 1922.4, "BHP": 54.57, "EFF": 42.42, "kW": 48.29, "SE": 0.6029}, {"Hz": 48, "H": 77.3, "Q": 2395.2, "BHP": 59.94, "EFF": 47.09, "kW": 53.04, "SE": 0.5315}, {"Hz": 49, "H": 82.0, "Q": 2719.2, "BHP": 64.46, "EFF": 52.73, "kW": 57.04, "SE": 0.5035}, {"Hz": 50, "H": 82.0, "Q": 3048.0, "BHP": 69.54, "EFF": 54.79, "kW": 61.54, "SE": 0.4846}, {"Hz": 51, "H": 82.6, "Q": 3292.8, "BHP": 72.99, "EFF": 56.81, "kW": 64.59, "SE": 0.4708}, {"Hz": 52, "H": 83.6, "Q": 3566.4, "BHP": 78.64, "EFF": 57.8, "kW": 69.59, "SE": 0.4683}, {"Hz": 53, "H": 83.8, "Q": 3878.4, "BHP": 82.59, "EFF": 59.909, "kW": 73.09, "SE": 0.4523}, {"Hz": 54, "H": 83.9, "Q": 4185.6, "BHP": 87.11, "EFF": 61.45, "kW": 77.09, "SE": 0.442}, {"Hz": 55, "H": 84.0, "Q": 4447.2, "BHP": 91.63, "EFF": 62.15, "kW": 81.09, "SE": 0.4376}, {"Hz": 56, "H": 84.1, "Q": 4749.6, "BHP": 96.71, "EFF": 62.96, "kW": 85.58, "SE": 0.4325}, {"Hz": 57, "H": 83.8, "Q": 5023.2, "BHP": 102.36, "EFF": 62.69, "kW": 90.58, "SE": 0.4328}, {"Hz": 58, "H": 84.0, "Q": 5268.0, "BHP": 108.01, "EFF": 62.45, "kW": 95.58, "SE": 0.4355}, {"Hz": 59, "H": 84.2, "Q": 5534.4, "BHP": 113.66, "EFF": 62.5, "kW": 100.58, "SE": 0.4362}, {"Hz": 60, "H": 84.2, "Q": 5791.2, "BHP": 119.31, "EFF": 62.3, "kW": 105.58, "SE": 0.4376}], "P3_100HP": [{"Hz": 40, "H": 78.9, "Q": 336.0, "BHP": 28.01, "EFF": 14.43, "kW": 24.85, "SE": 1.7747}, {"Hz": 41, "H": 79.1, "Q": 391.2, "BHP": 29.79, "EFF": 15.83, "kW": 26.42, "SE": 1.6212}, {"Hz": 42, "H": 79.3, "Q": 734.4, "BHP": 32.07, "EFF": 27.68, "kW": 28.45, "SE": 0.9297}, {"Hz": 43, "H": 79.7, "Q": 1053.6, "BHP": 34.44, "EFF": 37.17, "kW": 30.55, "SE": 0.6959}, {"Hz": 44, "H": 80.1, "Q": 1401.6, "BHP": 37.32, "EFF": 45.85, "kW": 33.1, "SE": 0.5669}, {"Hz": 45, "H": 80.3, "Q": 1694.4, "BHP": 40.14, "EFF": 51.67, "kW": 35.61, "SE": 0.5043}, {"Hz": 46, "H": 80.4, "Q": 1941.6, "BHP": 42.88, "EFF": 55.5, "kW": 38.04, "SE": 0.4702}, {"Hz": 47, "H": 80.7, "Q": 2222.4, "BHP": 46.26, "EFF": 59.1, "kW": 41.03, "SE": 0.4431}, {"Hz": 48, "H": 80.8, "Q": 2431.2, "BHP": 49.22, "EFF": 60.83, "kW": 43.66, "SE": 0.431}, {"Hz": 49, "H": 81.2, "Q": 2721.6, "BHP": 52.94, "EFF": 63.63, "kW": 46.96, "SE": 0.4141}, {"Hz": 50, "H": 81.9, "Q": 3016.8, "BHP": 57.16, "EFF": 65.89, "kW": 50.7, "SE": 0.4034}, {"Hz": 51, "H": 82.2, "Q": 3297.6, "BHP": 60.59, "EFF": 68.2, "kW": 53.75, "SE": 0.3912}, {"Hz": 52, "H": 82.6, "Q": 3573.6, "BHP": 64.45, "EFF": 69.81, "kW": 57.17, "SE": 0.3839}, {"Hz": 53, "H": 83.5, "Q": 3744.0, "BHP": 68.17, "EFF": 69.91, "kW": 60.47, "SE": 0.3876}, {"Hz": 54, "H": 83.8, "Q": 3952.8, "BHP": 71.96, "EFF": 70.17, "kW": 63.83, "SE": 0.3876}, {"Hz": 55, "H": 83.7, "Q": 4156.8, "BHP": 75.71, "EFF": 70.06, "kW": 67.16, "SE": 0.3877}, {"Hz": 56, "H": 83.8, "Q": 4344.0, "BHP": 79.13, "EFF": 70.12, "kW": 70.19, "SE": 0.3878}, {"Hz": 57, "H": 83.8, "Q": 4555.2, "BHP": 82.91, "EFF": 70.18, "kW": 73.54, "SE": 0.3875}, {"Hz": 58, "H": 83.9, "Q": 4735.2, "BHP": 86.81, "EFF": 69.77, "kW": 77.0, "SE": 0.3903}, {"Hz": 59, "H": 84.0, "Q": 4896.0, "BHP": 91.12, "EFF": 68.8, "kW": 80.83, "SE": 0.3962}, {"Hz": 60, "H": 83.9, "Q": 4946.4, "BHP": 92.48, "EFF": 68.41, "kW": 82.03, "SE": 0.398}], "P4_100HP": [{"Hz": 40, "H": 78.8, "Q": 1171.2, "BHP": 28.54, "EFF": 49.93, "kW": 25.32, "SE": 0.5188}, {"Hz": 41, "H": 80.0, "Q": 1411.2, "BHP": 31.45, "EFF": 54.72, "kW": 27.9, "SE": 0.4744}, {"Hz": 42, "H": 80.2, "Q": 1629.6, "BHP": 34.2, "EFF": 58.25, "kW": 30.34, "SE": 0.4468}, {"Hz": 43, "H": 80.3, "Q": 1850.4, "BHP": 36.81, "EFF": 61.53, "kW": 32.65, "SE": 0.4235}, {"Hz": 44, "H": 80.4, "Q": 2112.0, "BHP": 39.91, "EFF": 64.86, "kW": 35.4, "SE": 0.4023}, {"Hz": 45, "H": 80.7, "Q": 2352.0, "BHP": 43.14, "EFF": 67.06, "kW": 38.27, "SE": 0.3905}, {"Hz": 46, "H": 81.0, "Q": 2594.4, "BHP": 46.47, "EFF": 68.93, "kW": 41.22, "SE": 0.3813}, {"Hz": 47, "H": 81.2, "Q": 2796.0, "BHP": 49.63, "EFF": 69.73, "kW": 44.02, "SE": 0.3779}, {"Hz": 48, "H": 81.6, "Q": 2971.2, "BHP": 52.57, "EFF": 70.3, "kW": 46.63, "SE": 0.3767}, {"Hz": 49, "H": 82.0, "Q": 3117.6, "BHP": 55.44, "EFF": 70.3, "kW": 49.18, "SE": 0.3786}, {"Hz": 50, "H": 82.3, "Q": 3266.4, "BHP": 58.69, "EFF": 69.82, "kW": 52.06, "SE": 0.3825}, {"Hz": 51, "H": 82.7, "Q": 3434.4, "BHP": 62.27, "EFF": 69.54, "kW": 55.24, "SE": 0.386}, {"Hz": 52, "H": 82.8, "Q": 3597.6, "BHP": 65.29, "EFF": 69.54, "kW": 57.91, "SE": 0.3864}, {"Hz": 53, "H": 83.3, "Q": 3794.4, "BHP": 68.91, "EFF": 69.92, "kW": 61.13, "SE": 0.3866}, {"Hz": 54, "H": 82.1, "Q": 3914.4, "BHP": 72.26, "EFF": 67.8, "kW": 64.1, "SE": 0.393}, {"Hz": 55, "H": 83.9, "Q": 4027.2, "BHP": 75.61, "EFF": 68.12, "kW": 67.07, "SE": 0.3997}, {"Hz": 56, "H": 83.9, "Q": 4176.0, "BHP": 79.63, "EFF": 67.07, "kW": 70.63, "SE": 0.4059}, {"Hz": 57, "H": 84.0, "Q": 4327.2, "BHP": 83.25, "EFF": 66.56, "kW": 73.85, "SE": 0.4096}, {"Hz": 58, "H": 83.8, "Q": 4452.0, "BHP": 87.12, "EFF": 65.28, "kW": 77.28, "SE": 0.4166}, {"Hz": 59, "H": 83.9, "Q": 4581.6, "BHP": 90.77, "EFF": 64.56, "kW": 80.52, "SE": 0.4218}, {"Hz": 60, "H": 83.7, "Q": 4636.8, "BHP": 92.25, "EFF": 64.13, "kW": 81.83, "SE": 0.4235}]}, "factory": {"150HP": [{"H": 201.5, "Q": 0, "BHP": 130.89, "EFF": 0.0}, {"H": 182.45, "Q": 1912.3, "BHP": 131.22, "EFF": 40.53}, {"H": 143.14, "Q": 4068.52, "BHP": 139.59, "EFF": 63.6}, {"H": 100.23, "Q": 6520.93, "BHP": 135.63, "EFF": 73.46}, {"H": 82.39, "Q": 6969.16, "BHP": 131.68, "EFF": 66.47}, {"H": 63.2, "Q": 7146.74, "BHP": 125.8, "EFF": 54.73}], "100HP": [{"H": 159.3, "Q": 0, "BHP": 82.75, "EFF": 0.0}, {"H": 140.93, "Q": 1998.95, "BHP": 86.98, "EFF": 49.37}, {"H": 110.4, "Q": 3581.65, "BHP": 87.15, "EFF": 69.16}, {"H": 80.52, "Q": 4818.03, "BHP": 85.33, "EFF": 69.31}, {"H": 61.08, "Q": 5338.21, "BHP": 80.07, "EFF": 62.08}, {"H": 21.17, "Q": 6045.46, "BHP": 64.87, "EFF": 30.07}]}, "meta": {"P1_150HP": {"label": "150HP P1", "hp": 150, "eff": 0.843, "pipe": "400mm", "role": "備用", "roleHz": null, "status": "現場衰退 −2539 CMD", "statusType": "bad", "factory": "150HP"}, "P2_150HP": {"label": "150HP P2", "hp": 150, "eff": 0.843, "pipe": "400mm", "role": "日間保底", "roleHz": 55, "status": "現場衰退 −1178 CMD", "statusType": "warn", "factory": "150HP"}, "P3_100HP": {"label": "100HP P3", "hp": 100, "eff": 0.841, "pipe": "300mm", "role": "夜間主要 / 全天", "roleHz": 57, "status": "正常 +128 CMD", "statusType": "ok", "factory": "100HP"}, "P4_100HP": {"label": "100HP P4", "hp": 100, "eff": 0.841, "pipe": "300mm", "role": "夜間輔助", "roleHz": 51, "status": "正常 +181 CMD", "statusType": "ok", "factory": "100HP"}}, "order": ["P1_150HP", "P2_150HP", "P3_100HP", "P4_100HP"], "crossover": {"150HP": 2600, "100HP": 3400}, "tiers": [{"name": "離峰", "q": 5000, "pumps": 1, "q300": 3300, "q400": 1200}, {"name": "半尖峰", "q": 10000, "pumps": 2, "q300": 8000, "q400": 1500}, {"name": "尖峰", "q": 13300, "pumps": 3, "q300": 11600, "q400": 2100}], "monthly": [{"m": "3月", "flow": 258932, "kwh_tp": 99040, "kwh_tw": null, "se_tp": 0.382, "se_tw": null, "phase": "改善前", "ym": "2025-03"}, {"m": "4月", "flow": 254456, "kwh_tp": 97360, "kwh_tw": 122509, "se_tp": 0.383, "se_tw": 0.481, "phase": "改善前", "ym": "2025-04"}, {"m": "5月", "flow": 266230, "kwh_tp": 91280, "kwh_tw": 112610, "se_tp": 0.343, "se_tw": 0.423, "phase": "改善後", "ym": "2025-05"}], "validation": [{"sc": "改善前", "cfg": "P1@60 + P3@60 + P4@60", "kw": 259.3, "q": 14014, "se": 0.444, "ref": "台電 3/4月 0.382–0.383"}, {"sc": "改善後·日間", "cfg": "P2@55 + P3@57 + P4@51", "kw": 209.9, "q": 12437, "se": 0.405, "ref": "—"}, {"sc": "改善後·夜間", "cfg": "P3@60 + P4@51", "kw": 137.3, "q": 8381, "se": 0.393, "ref": "—"}, {"sc": "改善後·加權", "cfg": "日 62% / 夜 38%", "kw": null, "q": null, "se": 0.4, "ref": "台電 5月 0.343"}], "daily": [["2025-03-21", 6161, 1393, 7554, null], ["2025-03-22", 6793, 1513, 8306, null], ["2025-03-23", 7032, 1555, 8587, null], ["2025-03-24", 8112, 1620, 9732, null], ["2025-03-25", 6911, 1454, 8365, null], ["2025-03-26", 8400, 1624, 10024, null], ["2025-03-27", 8301, 1625, 9926, null], ["2025-03-28", 8339, 1609, 9948, null], ["2025-03-29", 7858, 1575, 9433, null], ["2025-03-30", 7242, 1533, 8775, 3883.5], ["2025-03-31", 6162, 1372, 7534, 3883.5], ["2025-04-01", 2978, 714, 3692, 3883.5], ["2025-04-02", 6826, 1493, 8319, 3959], ["2025-04-03", 6683, 1510, 8193, 3868], ["2025-04-04", 7020, 1543, 8563, 4037], ["2025-04-05", 6485, 1443, 7928, 3779], ["2025-04-06", 6882, 1469, 8351, 3931], ["2025-04-07", 5863, 1360, 7223, 3466], ["2025-04-08", 6518, 1439, 7957, 3755], ["2025-04-09", 5719, 1247, 6966, 3245], ["2025-04-10", 6823, 1424, 8247, 3919], ["2025-04-11", 7267, 1531, 8798, 4178], ["2025-04-12", 6878, 1499, 8377, 3969], ["2025-04-13", 6691, 1417, 8108, 3802], ["2025-04-14", 6213, 1385, 7598, 3618], ["2025-04-15", 6326, 1425, 7751, 3702], ["2025-04-16", 7315, 1484, 8799, 4116], ["2025-04-17", 7311, 1514, 8825, 4197], ["2025-04-18", 7723, 1554, 9277, 4394], ["2025-04-19", 8122, 1590, 9712, 4579], ["2025-04-20", 7862, 1606, 9468, 4490], ["2025-04-21", 7611, 1586, 9197, 4347], ["2025-04-22", 8124, 1603, 9727, 4556], ["2025-04-23", 7823, 1553, 9376, 4395], ["2025-04-24", 7308, 1499, 8807, 4140], ["2025-04-25", 7140, 1510, 8650, 4105], ["2025-04-26", 8382, 1641, 10023, 4707], ["2025-04-27", 8016, 1628, 9644, 4551], ["2025-04-28", 7046, 1479, 8525, 4015], ["2025-04-29", 7630, 1560, 9190, 4317], ["2025-04-30", 7603, 1562, 9165, 4315], ["2025-05-01", 7990, 1600, 9590, 4514], ["2025-05-02", 8200, 1643, 9843, 4644], ["2025-05-03", 8586, 1721, 10307, 4834], ["2025-05-04", 8264, 1701, 9965, 4708], ["2025-05-05", 7685, 1538, 9223, 4184], ["2025-05-06", 7415, 1546, 8961, 3845], ["2025-05-07", 6568, 1442, 8010, 3374], ["2025-05-08", 6439, 1442, 7881, 3336], ["2025-05-09", 6573, 1475, 8048, 3406], ["2025-05-10", 6390, 1439, 7829, 3284], ["2025-05-11", 6001, 1371, 7372, 3062], ["2025-05-12", 6293, 1421, 7714, 3195], ["2025-05-13", 6326, 1446, 7772, 3187], ["2025-05-14", 6592, 1461, 8053, 3297], ["2025-05-15", 6943, 1517, 8460, 3477], ["2025-05-16", 7503, 1585, 9088, 3752], ["2025-05-17", 7475, 1611, 9086, 3751], ["2025-05-18", 7259, 1577, 8836, 3656], ["2025-05-19", 7433, 1567, 9000, 3713], ["2025-05-20", 7868, 1616, 9484, 3937], ["2025-05-21", 7995, 1620, 9615, 3971], ["2025-05-22", 7970, 1616, 9586, 3955], ["2025-05-23", 7832, 1613, 9445, 3866], ["2025-05-24", 7298, 1568, 8866, 3620], ["2025-05-25", 6606, 1468, 8074, 3268], ["2025-05-26", 6414, 1447, 7861, 3166], ["2025-05-27", 6242, 1416, 7658, 3088], ["2025-05-28", 5959, 1317, 7276, 2960], ["2025-05-29", 6037, 1370, 7407, 2978], ["2025-05-30", 6297, 1467, 7764, 3150], ["2025-05-31", 6574, 1519, 8093, 3304], ["2025-06-01", 7307, 1614, 8921, 3167], ["2025-06-02", 6495, 1497, 7992, 3167], ["2025-06-03", 5807, 1345, 7152, 3167], ["2025-06-04", 5853, 1363, 7216, 3158], ["2025-06-05", 5840, 1338, 7178, 2909], ["2025-06-06", 5818, 1371, 7189, 2916], ["2025-06-07", 6264, 1425, 7689, 3137], ["2025-06-08", 6083, 1433, 7516, 3057], ["2025-06-09", 5947, 1407, 7354, 2991], ["2025-06-10", 6042, 1362, 7404, 3036], ["2025-06-11", 6675, 1478, 8153, 3321], ["2025-06-12", 6401, 1429, 7830, 3184], ["2025-06-13", 5707, 1344, 7051, 2863], ["2025-06-14", 6274, 1428, 7702, 3156], ["2025-06-15", 6200, 1433, 7633, 3124], ["2025-06-16", 5849, 1359, 7208, 2931], ["2025-06-17", 6254, 1375, 7629, 3104], ["2025-06-18", 4512, 1189, 5701, 2327], ["2025-06-19", 5890, 1341, 7231, 2936], ["2025-06-20", 5263, 1255, 6518, 2654], ["2025-06-21", 5408, 1276, 6684, 2906], ["2025-06-22", 5959, 1342, 7301, 2810], ["2025-06-23", 5914, 1359, 7273, 2965], ["2025-06-24", 6339, 1372, 7711, 3161], ["2025-06-25", 6072, 1367, 7439, 3027], ["2025-06-26", 5667, 1275, 6942, 2842], ["2025-06-27", 5859, 1375, 7234, 2939], ["2025-06-28", 6322, 1357, 7679, 3151], ["2025-06-29", 6440, 1356, 7796, 3193], ["2025-06-30", 6646, 1392, 8038, 3299], ["2025-07-01", 7269, 1497, 8766, 3593], ["2025-07-02", 7378, 1549, 8927, 3648], ["2025-07-03", 7408, 1437, 8845, 3673], ["2025-07-04", 7200, 1470, 8670, 3552], ["2025-07-05", 5946, 1398, 7344, 2905], ["2025-07-06", 5481, 1182, 6663, 2776], ["2025-07-07", 5623, 1290, 6913, 2819], ["2025-07-08", 5489, 1297, 6786, 2748], ["2025-07-09", 5277, 1184, 6461, 2628], ["2025-07-10", 5292, 1190, 6482, 2635]], "tariff": {"peak": 9.39, "halfpeak": 5.85, "offpeak": 2.53, "basic": 223.6, "co2": 0.467, "note": "夏月(5/16–10/15)；尖峰16-22、半尖峰09-16&22-24、離峰00-09；單位 元/度，基本電費 元/瓩。"}, "best": [{"p": "150HP P1", "q60": 4430, "se60": 0.517, "minSE": "51Hz / 0.492", "peakEff": "55Hz / 53.9%"}, {"p": "150HP P2", "q60": 5791, "se60": 0.438, "minSE": "56Hz / 0.432", "peakEff": "56Hz / 63.0%"}, {"p": "100HP P3", "q60": 4946, "se60": 0.398, "minSE": "52Hz / 0.384", "peakEff": "57Hz / 70.2%"}, {"p": "100HP P4", "q60": 4637, "se60": 0.423, "minSE": "48Hz / 0.377", "peakEff": "48Hz / 70.3%"}], "nightP3Hz": 57, "nightNote": "夜間 100HP 主底頻率本平台暫定 57Hz（與報告控制邏輯、P3 峰值效率 57Hz 一致，且較省電）；惟尖離峰時段配置圖另出現 60Hz 保底版本，此 57/60Hz 差異尚待向廠商／現場確認，確認前請以此暫定值試算。", "tou": [{"k": "離峰", "time": "00:00–09:00", "rateKey": "offpeak"}, {"k": "半尖峰", "time": "09:00–16:00, 22:00–24:00", "rateKey": "halfpeak"}, {"k": "尖峰", "time": "16:00–22:00", "rateKey": "peak"}], "opRules": [{"t": "同馬力擇優（150HP）", "d": "需求跨過 2,600 CMD 時，150HP 優先選 P2 不選 P1（P2 高流量效率較佳；P1 已衰退、列備用）。"}, {"t": "同馬力擇優（100HP）", "d": "需求跨過 3,400 CMD 時，100HP 優先選 P3 不選 P4；低於此值 P4 較佳（P4 低流量峰效率約 70%）。"}, {"t": "最有價值的確定性法則", "d": "相近出水量下，用 P2@55Hz 取代 P1@60Hz：兩者約 4,430–4,450 CMD 幾乎等流量，但 P2@55Hz 少約 15% 輸入功率。"}, {"t": "日間主底", "d": "日間高流量以 P2@55Hz 保底，再依需求疊加 100HP；避免動用 P1。"}, {"t": "夜間主力", "d": "夜間以 100HP 組承接：P3 為主（暫定 57Hz）、P4 為輔（51Hz）；100HP 在現場狀況下健康、效率高。"}, {"t": "避開低頻死區", "d": "150HP P2 在 45Hz 以下效率極低（約 8–22%），勿當低流量調速主機；該段列為低可信度區。"}, {"t": "水位觸發", "d": "依名一／名二水池水位帶啟停泵；水位低於啟動帶啟泵、高於停止帶停泵。"}, {"t": "站級健康指標", "d": "每日單位電耗 7 日中位數：≤0.40 為良好；爬回 0.42 以上＝效能退化提醒；回到 0.47＝視為退回改善前。"}, {"t": "計費端再優化", "d": "本站排程『尖峰』(早 0730–1400＋晚 1700–2230) 係作業習慣定義；台電計費尖峰僅 16–22，將日間用電移至計費半尖峰可再降費。"}], "caveats": [{"lv": "warn", "t": "夜間 100HP 頻率 57/60Hz 版本差異", "d": "報告文字寫 57Hz、時段配置圖像 60Hz；平台暫定 57Hz，待廠商確認後定版。"}, {"lv": "bad", "t": "無單泵獨立計量", "d": "僅站級台電帳單＋台水監控錶＋管線流量；單泵電力為由現場曲線推估，無法做單機劣化診斷。"}, {"lv": "warn", "t": "兩錶讀值不一致", "d": "台水監控錶高於台電帳單（4月 122,509 vs 97,360；5月 112,610 vs 91,280），單位電耗基準差約 0.09，原因待釐清。"}, {"lv": "warn", "t": "100HP 出廠基準設備對應", "d": "100HP 出廠基準文件勞務名稱為『新街淨水場2號機』，需確認與本站為同型／移裝，否則僅作參考曲線。"}, {"lv": "info", "t": "資料版本", "d": "3–5月流量原始檔僅完整至 5/12，後段由統計檔補齊；現場曲線為一次性實測非連續監測。"}]};
const DATA = loadBundleSync() || __FALLBACK__;
console.log('[NHR] 資料來源：' + (window.__DATA_SRC__ || '內建備援資料'));

// ---- station identity (已去識別化) ----------------------------------------
const STATION = {
  name: '示範加壓站',
  code: 'PS-01',
  district: '自來水事業 · 區管理處（示範）',
  section: '清水池 → 配水池',
  window: '2025/03/21 – 07/10',
  strategyChange: '2025/05/05 15:30',
};

// ---- equipment nameplate (sheet 1_設備清單；靜態參考，非即時量測) -----------
const NAMEPLATE = {
  P1_150HP: { hp:150, pipe:'400mm', intake:'下進水/合併三通', poles:2, volt:440, fullEff:84.3, fullAmp:204.1, pf:85.4, startAmp:955.5, ratedH:100, ratedQ:6500, ratedEff:61 },
  P2_150HP: { hp:150, pipe:'400mm', intake:'下進水/合併三通', poles:2, volt:440, fullEff:84.3, fullAmp:204.1, pf:85.4, startAmp:955.5, ratedH:100, ratedQ:6500, ratedEff:61 },
  P3_100HP: { hp:100, pipe:'300mm', intake:'上進水/合併三通', poles:2, volt:440, fullEff:84.1, fullAmp:144, pf:80.8, startAmp:null, ratedH:110, ratedQ:3800, ratedEff:59 },
  P4_100HP: { hp:100, pipe:'300mm', intake:'上進水/合併三通', poles:2, volt:440, fullEff:84.1, fullAmp:144, pf:80.8, startAmp:null, ratedH:110, ratedQ:3800, ratedEff:59 },
};

// ---- current live schedule state (改善後策略，日間 09:14 情境) --------------
// 即時SCADA：各泵「頻率/狀態」為現場可得之即時資料；性能(Q/kW/SEC)為現場曲線模型推估。
const LIVE_FREQ = { P1_150HP: 0, P2_150HP: 55, P3_100HP: 57, P4_100HP: 51 };

// ---- 6 時段排程 (sheet 5_需求與排程) ---------------------------------------
const SCHEDULE = [
  { seg:'時段1',  time:'00:00–07:30', site:'離峰/夜間',  bill:'離峰',   cfg:{P4_100HP:51,P3_100HP:57}, band:'P4 1.8–3.1 / P3 2.0–3.3', note:'P4 依水位輔助' },
  { seg:'時段2',  time:'07:30–09:00', site:'日間高需求', bill:'離峰',   cfg:{P2_150HP:55},             band:'2.6–3.6', note:'現場作業高需求；台電仍為離峰' },
  { seg:'時段2b', time:'09:00–10:00', site:'日間高需求', bill:'半尖峰', cfg:{P2_150HP:55},             band:'2.6–3.6', note:'台電計費轉半尖峰' },
  { seg:'時段3',  time:'10:00–14:00', site:'日間高需求', bill:'半尖峰', cfg:{P2_150HP:55,P3_100HP:57}, band:'P3 2.0–3.3', note:'作業尖峰 ≠ 台電尖峰' },
  { seg:'時段4a', time:'14:00–16:00', site:'半尖峰',     bill:'半尖峰', cfg:{P2_150HP:55,P3_100HP:57,P4_100HP:51}, band:'日間 3 台並聯', note:'' },
  { seg:'時段4b', time:'16:00–17:00', site:'半尖峰',     bill:'尖峰',   cfg:{P2_150HP:55,P3_100HP:57,P4_100HP:51}, band:'日間 3 台並聯', note:'台電尖峰開始' },
  { seg:'時段5',  time:'17:00–22:00', site:'晚間尖峰',   bill:'尖峰',   cfg:{P2_150HP:55,P3_100HP:57,P4_100HP:51}, band:'三台並聯', note:'' },
  { seg:'時段5b', time:'22:00–22:30', site:'晚間尖峰',   bill:'半尖峰', cfg:{P2_150HP:55,P3_100HP:57,P4_100HP:51}, band:'三台並聯', note:'' },
  { seg:'時段6',  time:'22:30–24:00', site:'離峰/夜間',  bill:'半尖峰', cfg:{P4_100HP:51,P3_100HP:57}, band:'P4 1.8–3.1 / P3 2.0–3.3', note:'P4 依水位輔助' },
];

// ---- 控制邏輯 改善前 vs 改善後 (sheet 6_控制邏輯, 水位帶 m) ------------------
const CONTROL = [
  { id:'P1_150HP', before:'全天保底 60Hz', beforeBand:'名1 2.1↑/3.6↓ (下限1.1)', after:'備用 60Hz',          afterBand:'名2 2.1↑/3.6↓' },
  { id:'P2_150HP', before:'停用 60Hz',     beforeBand:'1.55↑/3.5↓ (下限1.15)',   after:'日間保底 55Hz',      afterBand:'名2 2.1↑/3.6↓' },
  { id:'P3_100HP', before:'全天操作 60Hz', beforeBand:'1.6↑/3.2↓ (下限1.2)',     after:'全天/夜間主要 57Hz', afterBand:'1.6↑/3.1↓ (下限1.2)' },
  { id:'P4_100HP', before:'全天保底 60Hz', beforeBand:'1.85↑/3.1↓ (下限1.15)',   after:'夜間輔助 51Hz',      afterBand:'1.85↑/3.3↓' },
];


// ---- field-curve lookup + interpolation ------------------------------------
function fieldOf(id){ return DATA.field[id] || []; }
window.fieldOf = fieldOf;

// interpolate the real field curve at an arbitrary Hz -> {Q,kW,SE,H,BHP,EFF}
function expectAt(id, hz){
  const a = fieldOf(id); if(!a.length) return { Q:0, kW:0, SE:null, H:0, BHP:0, EFF:0 };
  if(hz <= a[0].Hz) return { ...a[0] };
  if(hz >= a[a.length-1].Hz) return { ...a[a.length-1] };
  for(let i=0;i<a.length-1;i++){
    if(a[i].Hz <= hz && hz <= a[i+1].Hz){
      const t = (hz - a[i].Hz) / (a[i+1].Hz - a[i].Hz);
      const lerp = (k)=> a[i][k] + t*(a[i+1][k]-a[i][k]);
      return { Hz:hz, Q:lerp('Q'), kW:lerp('kW'), H:lerp('H'), BHP:lerp('BHP'), EFF:lerp('EFF'), SE: lerp('Q')>0 ? 24*lerp('kW')/lerp('Q') : null };
    }
  }
  return { ...a[a.length-1] };
}
window.expectAt = expectAt;

// compat wrapper used across UI: operatingPoint(refOrId, hz) -> rich op point
function operatingPoint(ref, hz){
  const id = typeof ref === 'string' ? ref : (ref && ref.id);
  if(!id || hz<=0) return { freq:0, id, Q:0, kW:0, P:0, H:0, eta:0, BHP:0, SE:null };
  const e = expectAt(id, hz);
  return { freq:hz, id, Q:Math.round(e.Q), kW:+e.kW.toFixed(1), P:+e.kW.toFixed(1), H:+e.H.toFixed(1),
           eta:+e.EFF.toFixed(1), BHP:+e.BHP.toFixed(1), SE: e.SE!=null ? +e.SE.toFixed(4) : null };
}
window.operatingPoint = operatingPoint;

// ---- sel-pump solver: enumerate 4 pumps × (off + 40..60Hz), min total kW ----
function solve(demand, allowP1){
  if(demand<=0) return { sel:{}, Q:0, kW:0, SE:null, empty:true };
  const ids = DATA.order.filter(id => allowP1 || id !== 'P1_150HP');
  const opts = ids.map(id => [null, ...fieldOf(id).map(p=>p.Hz)]);
  let best=null;
  (function rec(i,Q,kW,pick){
    if(i===ids.length){ if(Q>=demand){ if(!best||kW<best.kW-1e-6||(Math.abs(kW-best.kW)<1e-6&&Q<best.Q)) best={Q,kW,pick:pick.slice()}; } return; }
    for(const hz of opts[i]){ const o = hz==null ? {Q:0,kW:0} : expectAt(ids[i],hz); pick.push(hz); rec(i+1,Q+o.Q,kW+o.kW,pick); pick.pop(); }
  })(0,0,0,[]);
  let over=false;
  if(!best){ let Q=0,kW=0,pick=[]; ids.forEach(id=>{ const o=expectAt(id,60); Q+=o.Q; kW+=o.kW; pick.push(60); }); best={Q,kW,pick}; over=true; }
  const sel={}; ids.forEach((id,i)=>{ if(best.pick[i]!=null) sel[id]=best.pick[i]; });
  return { sel, Q:Math.round(best.Q), kW:+best.kW.toFixed(1), SE: best.Q>0 ? +(24*best.kW/best.Q).toFixed(4) : null, over };
}
window.solve = solve;

// ---- build a live motor object from id + current frequency ------------------
function buildMotor(id, freq){
  const m = DATA.meta[id]; const np = NAMEPLATE[id];
  const running = freq > 0;
  const e = running ? operatingPoint(id, freq) : null;
  const recF = m.roleHz; // role-optimised frequency (current schedule already optimised)
  const base60 = running ? operatingPoint(id, 60) : null;  // 改善前基準 (60Hz)
  const baseline_kw = running ? Math.round(base60.kW) : 0;
  const save = running && base60.kW>0 ? +(((base60.kW-e.kW)/base60.kW)*100).toFixed(1) : 0;
  // ---- 模擬模式：完整單泵感測資料（裝錶後樣貌；本站尚無，僅供 DEMO 完整呈現）----
  const seed = id.charCodeAt(1);                       // deterministic per pump
  const wob = (a) => a * (0.5 + ((seed * 7) % 100) / 100);
  const meter_kw = running ? +(e.kW * (1.02 + ((seed % 5) * 0.004))).toFixed(1) : 0;   // 電表口徑略高於模型
  const meter_flow = running ? Math.round(e.Q * (0.985 + ((seed % 4) * 0.005))) : 0;
  const current_a = running ? Math.round(e.kW * 1000 / (1.732 * np.volt * (np.pf / 100))) : 0;
  const bearingBase = m.statusType === 'bad' ? 63 : m.statusType === 'warn' ? 58 : 49;
  const sim = {
    meter_kw, meter_flow,
    meter_sec: running && meter_flow ? +(24 * meter_kw / meter_flow).toFixed(3) : 0,
    current_a, current_drv: current_a, current_nondrv: current_a,
    bearing_drv: running ? +(bearingBase + wob(6)).toFixed(1) : +(28 + wob(3)).toFixed(1),
    bearing_nondrv: running ? +(bearingBase + 2 + wob(7)).toFixed(1) : +(27 + wob(3)).toFixed(1),
    vib_mm_s: running ? +(1.8 + (m.statusType === 'bad' ? 1.6 : 0) + wob(1.1)).toFixed(1) : +(0.2 + wob(0.2)).toFixed(1),
    winding_c: running ? +(62 + wob(10)).toFixed(0) : +(30 + wob(4)).toFixed(0),
    runtime_h: 9000 + seed * 137 + (m.statusType === 'bad' ? 6800 : m.statusType === 'warn' ? 3200 : 0),
    starts: 1200 + seed * 23,
  };
  return {
    id: m.label.split(' ')[1], fid: id, name: m.label + ' · ' + m.pipe + (m.hp===150?' 大泵':' 主力泵'),
    hp: m.hp, pipe: m.pipe, role: m.role, roleHz: m.roleHz, statusType: m.statusType,
    fieldStatus: m.status, factory: m.factory, np,
    status: running ? (m.statusType==='bad' ? 'warn' : 'run') : 'standby',
    freq: running ? freq : 0,
    recFreq: recF || freq,
    baseline_kw, save,
    // model-estimated performance (現場曲線推估，非單泵實測)
    power_kw: running ? Math.round(e.kW) : 0,
    flow_cmd: running ? e.Q : 0,            // m³/day
    flow_m3h: running ? Math.round(e.Q/24) : 0,
    head_m: running ? e.H : 0,
    pressure_bar: running ? +(e.H/10.197).toFixed(2) : 0,
    eff_pct: running ? e.eta : 0,
    bhp: running ? e.BHP : 0,
    rpm: running ? Math.round(120 * freq / (np.poles || 2) * 0.985) : 0,   // 由 VFD 頻率推算 (即時)
    sec_kwh_m3: running && e.Q ? +e.SE.toFixed(3) : 0,
    // 實際模式：以下為需取得（無單泵計量）；模擬模式由 sim 提供
    current_a: null, bearing_c: null, vib_mm_s: null, runtime_h: null,
    sim,
    voltage_v: np.volt,
  };
}
window.buildMotor = buildMotor;

const MOTORS = DATA.order.map(id => buildMotor(id, LIVE_FREQ[id]));

// add-motor template (spare 100HP)
let _extra = 0;
function newMotorTemplate(){
  _extra++; const id = 'P3_100HP';
  const mm = buildMotor(id, 0);
  return { ...mm, id: 'PX'+_extra, fid:id, name:'增設備用泵 (100HP 300mm)', role:'增設備用', status:'standby' };
}
window.newMotorTemplate = newMotorTemplate;

// ---- station-level summary (真實月度/驗證基準) -----------------------------
const TARIFF = DATA.tariff;            // {peak,halfpeak,offpeak,basic,co2,note}
const CO2 = DATA.tariff.co2;           // 0.467 kgCO2e/kWh (114年度)

function stationSummary(motors){
  const running = motors.filter(m => m.status !== 'standby');
  const total_power = Math.round(running.reduce((s,m)=>s+m.power_kw,0));
  const total_flow_cmd = running.reduce((s,m)=>s+m.flow_cmd,0);
  const total_flow = Math.round(total_flow_cmd/24);   // m³/h
  const sec = total_flow_cmd ? +(24*total_power/total_flow_cmd).toFixed(3) : 0;
  // 改善前基準（同需求下 P1@60+P3@60+P4@60，sheet 8 驗證）
  const baseSE = DATA.validation[0].se;               // 0.444
  const afterSE = DATA.validation[3].se;              // 0.400 加權
  const saving_pct = +(((baseSE-afterSE)/baseSE)*100).toFixed(1);   // ≈9.8
  // 月度（台電帳單口徑）：4月→5月
  const _M = DATA.monthly;
  const may = _M[_M.length-1], apr = _M[_M.length-2] || may;   // 自動抓最新兩個月(支援多年資料)
  const annFlow = (_M.reduce((a,b)=>a+b.flow,0)/_M.length)*12; // 年化用實際月數平均
  const seDrop = apr.se_tp - may.se_tp;               // 台電 0.383→0.343
  const kwhSavedYr = seDrop * annFlow;
  const blended = TARIFF.peak*0.25 + TARIFF.halfpeak*0.35 + TARIFF.offpeak*0.40;
  const costSavedYr = kwhSavedYr * blended;
  const co2SavedYr = kwhSavedYr * CO2 / 1000;
  // 月度（台電帳單）節省 — 兩種口徑
  const month_saved_kwh = Math.round((apr.se_tp - may.se_tp) * may.flow);   // 效率正規化(如5月以4月效率運轉會多耗的電)
  // 實際帳單 月對月（5月 vs 4月）
  const month_cost_now = Math.round(may.kwh_tp * blended);     // 5月電費(估算)
  const month_cost_prev = Math.round(apr.kwh_tp * blended);    // 4月電費(估算)
  const month_bill_save = month_cost_prev - month_cost_now;    // 較上月省(正=省)
  const month_bill_pct = +(((apr.kwh_tp - may.kwh_tp) / apr.kwh_tp) * 100).toFixed(1);
  return {
    total_power, total_flow, sec, saving_pct,
    running: running.length, total: motors.length,
    se_tp_now: may.se_tp, se_model_after: afterSE, se_base: baseSE,
    month_flow: may.flow, month_kwh_tp: may.kwh_tp, month_kwh_prev: apr.kwh_tp,
    month_saved_kwh,
    month_saved_cost: Math.round(month_saved_kwh * blended),
    month_saved_co2: +(month_saved_kwh * CO2 / 1000).toFixed(1),
    month_cost_now, month_cost_prev, month_bill_save, month_bill_pct,
    annual_kwh_saved: Math.round(kwhSavedYr),
    annual_cost_saved: Math.round(costSavedYr),
    annual_co2_saved: +co2SavedYr.toFixed(1),
    clearwell_pct: 82, clearwell_m: 3.1, header_bar: +(DATA.field.P3_100HP[17].H/10.197).toFixed(2),
    co2: CO2, tariff_blended: +blended.toFixed(3),
  };
}
window.stationSummary = stationSummary;

// ---- daily SEC series for trend charts (real, 站內監控錶口徑) ---------------
function dailySEC(){
  return DATA.daily.filter(r => r[4]!=null && r[0]!=='2025-04-01').map(r => ({ d:r[0], total:r[3], kwh:r[4], sec:+(r[4]/r[3]).toFixed(4) }));
}
window.dailySEC = dailySEC;

Object.assign(window, { DATA, STATION, NAMEPLATE, SCHEDULE, CONTROL, LIVE_FREQ, MOTORS, TARIFF, CO2 });
