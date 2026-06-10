# Vercel 部署說明

本資料夾為純靜態網站，可直接部署到 Vercel。

## 方法一：拖曳上傳（最簡單）
1. 登入 https://vercel.com → **Add New… → Project**
2. 把**整個 `dist` 資料夾**拖進去（或先壓成 zip 再上傳）
3. Framework Preset 選 **Other**；Root Directory 留空或指向 dist
4. 點 **Deploy**，完成後給你一個網址

## 方法二：Vercel CLI
```bash
npm i -g vercel
cd dist
vercel        # 依提示登入、命名專案
vercel --prod # 正式部署
```

## 方法三：Git
把 `dist` 內容推到 GitHub repo → Vercel 連接該 repo → 自動部署。

## 注意
- `index.html` 為入口。
- 前端透過 CDN（unpkg）載入 React / Babel，部署後第一次載入需連外網。
  若要完全離線/內網，需把 `react`、`react-dom`、`@babel/standalone` 三支下載到本地並改 `index.html` 的 `<script src>`。
- `.jsx` 以瀏覽器端 Babel 即時轉譯；`vercel.json` 已設定正確的 MIME type。
- 資料為去識別化示範值（示範加壓站 PS-01），存於 `station/stationData*.jsx`，接真實後端時替換即可。
