# 馬達節能監控平台 — Vercel 部署包（純前端）

NHR｜配水加壓站 馬達節能監控平台（Style A 藍圖風格）。
這是**純靜態前端**，可直接上傳 Vercel 上線。資料為**示範模擬值**，待接後端 API／實測資料替換。

---

## 一、上傳 Vercel（三種方式擇一）

### A. 拖拉上傳（最快）
1. 登入 [vercel.com](https://vercel.com) → **Add New… → Project**。
2. 把**整個 `vercel/` 資料夾內容**（不是外層資料夾，是裡面的 `index.html`、`app/`、`schematic/`、`station/`、`vercel.json`）拖進去。
3. Framework Preset 選 **Other**，Build Command 留空，Output Directory 留空（根目錄即輸出）。
4. **Deploy**，完成後即得 `https://你的專案.vercel.app`。

### B. Vercel CLI
```bash
npm i -g vercel
cd vercel        # 進到本資料夾
vercel           # 首次會問設定，全部用預設即可
vercel --prod    # 正式上線
```

### C. Git 連動
把本資料夾內容 push 到 GitHub repo → Vercel **Import Git Repository** → 同 A 的設定 → Deploy。日後 push 自動更新。

---

## 二、目錄結構

```
vercel/
├── index.html              ← 入口（Vercel 自動服務）
├── vercel.json             ← 靜態設定 + 字型快取
├── app/
│   ├── colors_and_type.css ← 設計系統 token + @font-face
│   ├── assets/NHR_Logo.png
│   └── fonts/              ← Poppins / Noto Sans TC
├── schematic/MotorDiagram.jsx
└── station/                ← 平台所有模組
    ├── stationData.jsx      ← ★ 主資料 + 泵浦模型
    ├── stationData2.jsx     ← ★ 告警/問答/權限/異動標註
    ├── BlueprintBoard.jsx · blueprint-ui.jsx · overview-live.jsx
    ├── analysis.jsx · modules.jsx · data-page.jsx · reports.jsx
```

---

## 三、注意事項

- **必須透過 HTTP(S)**（Vercel 即是），不能 `file://` 雙擊——多支 `.jsx` 以瀏覽器端 fetch 載入。
- 需可連到 `unpkg.com` 載入 React 18 與 Babel（CDN）。公司內網若封鎖外網，請改為自建打包（見下）。
- 右上角時鐘會嘗試連 `worldtimeapi.org` 校時；連不到時自動退回裝置時間（顯示「離線」）。
- 目前為**瀏覽器端 Babel 即時轉譯**，方便 demo、免建置。首屏約 1–2 秒。

### 正式上線優化（建議）
改用 **Vite 預編譯**可大幅加速並移除執行階段 Babel：把 `station/*.jsx`、`schematic/*.jsx` 納入 Vite 專案編譯、CDN 函式庫改 npm 安裝。需要我幫你轉成 Vite 專案再說。

### 接真實資料
所有數值集中在 `station/stationData.jsx`、`station/stationData2.jsx`，改為由後端 API 取得即可，畫面元件不需改動。完整後端（MySQL + PHP）見另一份「production 全包」交付。

---

© NHR — 馬達節能監控平台. 設計系統：NHR CC01-A AIoT Design System.
