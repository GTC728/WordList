# WordList

學術英文單字 PWA。第一門課是 Coxhead 的 Academic Word List（570 詞族、10 個 sublist）。

線上使用：https://gtc728.github.io/WordList/

手機用瀏覽器打開上面網址即可。iPhone 用 Safari → 分享 → 加入主畫面；Android 用 Chrome → 選單 → 加到主畫面。

跨裝置：到設定用 **Google** 或信箱登入，電腦和手機就會共用進度。以最新寫入為準。沒有帳號時仍可用同步碼。

本機仍可匯出 JSON，或在 Chrome／Edge 綁定備份檔。

```bash
npm install
npm run dev
```

雲端同步預設連到現有的 Supabase 專案（免費方案已達兩個進行中專案上限），資料在獨立的 `wordlist` schema。登入後走帳號 RPC；舊的八碼同步仍可用。若要改用自己的專案：

1. 在 SQL Editor 依序執行 `supabase/migrations/` 裡的檔案
2. 在 Authentication 打開 Email 登入，並把 `https://gtc728.github.io/WordList/` 與本機網址加進 Redirect URLs
3. 複製 `.env.example` 為 `.env.local`，填入 `VITE_SUPABASE_URL` 與 `VITE_SUPABASE_ANON_KEY`
4. 重新 `npm run dev` / `npm run build`

詞表來源：Averil Coxhead, Victoria University of Wellington。釋義與例句為本應用撰寫。
