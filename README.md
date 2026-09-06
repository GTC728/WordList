# WordList

學術英文單字 PWA。第一門課是 Coxhead 的 Academic Word List（570 詞族、10 個 sublist）。

線上使用：https://gtc728.github.io/WordList/

手機用瀏覽器打開上面網址即可。iPhone 用 Safari → 分享 → 加入主畫面；Android 用 Chrome → 選單 → 加到主畫面。每台裝置的進度各自保存，換手機請先在設定匯出備份再還原。

```bash
npm install
npm run dev
```

詞表來源：Averil Coxhead, Victoria University of Wellington。釋義與例句為本應用撰寫。

重新產生課程 JSON：

```bash
npm run build:data
```
