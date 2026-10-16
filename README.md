# 代購單

日本代購的訂單小本本。溫蒂（管理員）和在日本的小幫手共用。

小幫手用手機記下商品連結、金額、訂單截圖，以及轉寄時的物流和運費收據。溫蒂勾三個狀態：**已匯款**、**已收到貨**、**運費已報銷**。日圓和新台幣分開加總，網站不會自動換匯，也不會真的幫你匯款。

## 你需要準備

- 一台可以上網的電腦，用來安裝與試用
- 溫蒂的 LINE 帳號（上線後用來登入）
- 一個放網站的地方。這個版本把訂單和照片存在同一個資料夾，所以主機要有**不會被清掉的磁碟**。建議用 [Render](https://render.com) 的付費 Web Service 加永久磁碟（大約一個便當的月費）。Vercel 每次會把檔案清掉，這版先不要放上去。

本機練習不需要 LINE，也不需要信用卡。

## 在自己電腦上試用

1. 安裝 [Node.js 22](https://nodejs.org/)（網站寫著 LTS 的那個）。
2. 打開終端機，進入這個專案的資料夾。
3. 輸入：

```bash
npm install
npm run dev
```

4. 瀏覽器打開 [http://localhost:3000](http://localhost:3000)。
5. 在「試用登入」選一個身份：
   - **溫蒂**：管理員，看得到全部訂單、彙總、核准小幫手。
   - **小美、阿健**：小幫手，只看得到自己的訂單。
   - **小林**：還沒核准，只看得到等待畫面。

第一次開啟會自動放進幾筆示範訂單。資料在 `data` 資料夾。想重來就關掉網站，刪掉 `data` 資料夾，再執行 `npm run dev`。

試用登入**只在開發模式出現**。正式網站（`NODE_ENV=production`）會強制關閉，就算把 `DEV_LOGIN_ENABLED` 設成 `true` 也不會開。

## 每天怎麼用

**小幫手**

1. 用 LINE 登入（本機練習就用試用登入）。
2. 按「新增」，填商品名稱、連結、數量、金額、幣別、訂購日期。
3. 上傳訂單截圖。可以稍後補。
4. 貨寄出後，補物流公司、追蹤單號、寄出日期、運費和收據照片。

**溫蒂**

1. 訂單列表可以用小幫手、狀態、月份篩選。
2. 打開一筆訂單，勾選狀態後按「儲存狀態」。
   - 已匯款：可以填匯款日期、金額、幣別。用新台幣匯一筆日圓訂單時，兩個數字會各自留著，不會幫你換算。
   - 已收到貨：你收到小幫手轉寄的包裹後再勾。
   - 運費已報銷：要先有運費金額。照收據的數字還錢後再勾。
3. 「彙總」頁看每位小幫手、每個月還沒匯的商品款，以及還沒報銷的運費。
4. 「幫手」頁核准新的 LINE 帳號。沒核准的人不能建訂單，也看不到別人的訂單。

每一筆狀態變更都會留下誰、做了什麼、什麼時候。訂單頁最下面就是這份紀錄。

## 環境變數

正式環境要設定這些。本機試用可以都先不設，直接 `npm run dev`。

| 名稱 | 什麼時候要 | 說明 |
| --- | --- | --- |
| `SESSION_SECRET` | 正式環境必填 | 一長串隨機文字，至少 16 個字。用來保護登入，不要給別人看。 |
| `NEXT_PUBLIC_APP_URL` | 正式環境必填 | 網站網址，例如 `https://daigou.onrender.com`，結尾不要斜線。 |
| `LINE_CHANNEL_ID` | 用 LINE 登入時必填 | LINE 頻道的 Channel ID。 |
| `LINE_CHANNEL_SECRET` | 用 LINE 登入時必填 | LINE 頻道的 Channel secret。不要貼到聊天室以外的地方。 |
| `LINE_CALLBACK_URL` | 用 LINE 登入時必填 | 必須是 `網址/api/auth/line/callback`，和 LINE 後台填的要一字不差。 |
| `ADMIN_LINE_USER_IDS` | 選填 | 溫蒂的 LINE user id。很多人用逗號分開。留空的話，**第一個**用 LINE 登入的人會變成管理員。 |
| `DATABASE_PATH` | 選填 | 資料庫檔。預設 `data/daigou.db`。正式環境請指到永久磁碟，例如 `/var/data/daigou.db`。 |
| `UPLOAD_DIR` | 選填 | 截圖和收據。預設 `data/uploads`。正式環境請放在同一塊永久磁碟，例如 `/var/data/uploads`。 |
| `DEV_LOGIN_ENABLED` | 只有自己的電腦 | 設成 `true` 才會出現試用登入，而且只有開發模式有效。正式環境請不要設，或設成 `false`。 |
| `NODE_ENV` | 正式環境 | 設成 `production`。`npm start` 通常會自己設好。 |

範例在 `.env.example`。

## 建立 LINE Login

這一段給溫蒂（或幫忙設定的人）照著做。做完之前，網站仍可以用試用登入在自己電腦上練習。

1. 用溫蒂的 LINE，打開 [LINE Developers](https://developers.line.biz/console/) 並登入。
2. 如果還沒有 Provider，按 Create，名稱可以叫「溫蒂代購」。
3. 按 Create a new channel，種類選 **LINE Login**。
4. 填寫：
   - Channel name：`代購單`
   - Channel description：`日本代購訂單`
   - App types：勾 **Web app**
   - Email：溫蒂收得到信的信箱
5. 建立後打開 **Basic settings**：
   - Channel ID 複製到 `LINE_CHANNEL_ID`
   - Channel secret 複製到 `LINE_CHANNEL_SECRET`
6. 打開 **LINE Login** 分頁，在 Callback URL 加入正式網址，例如：
   `https://你的網址/api/auth/line/callback`
   如果也要在自己電腦用 LINE 登入，再加一條：
   `http://localhost:3000/api/auth/line/callback`
7. 把頻道從 Developing 改成 **Published**。
   還在 Developing 時，只有被加進渠道的測試帳號能登入，小幫手通常會失敗。這個網站自己會把新帳號停在「待核准」，所以頻道可以公開，核准仍由溫蒂在「幫手」頁決定。
8. 把上面的環境變數填到主機，重新部署。

登入時網站會跟 LINE 要名字和大頭貼（`profile` 和 `openid`）。不需要電子郵件。

## 放到網路上，讓手機打得開

小幫手的手機連不到你電腦裡的 `localhost`，所以要有一個公開網址。

1. 把這個專案放到 GitHub。
2. 到 [Render](https://render.com) 用 GitHub 登入。
3. New → Web Service，選這個專案。
4. 設定：
   - Environment：Node
   - Build Command：`npm install && npm run build`
   - Start Command：`npm start`

   環境變數可以照常設 `NODE_ENV=production`。這樣 `npm install` 不會裝 devDependencies，但建置要用的 TypeScript、Tailwind、ESLint 已經放在 dependencies，所以這行指令可以直接用。不要改成 `npm install --include=dev`。
5. 選一個**可以加磁碟**的方案。免費方案的檔案會被清掉，訂單和收據會不見。
6. 加一顆 Persistent Disk，掛載路徑填 `/var/data`。
7. 在 Environment 加上：
   - `NODE_ENV` = `production`
   - `SESSION_SECRET` = 一長串隨機文字
   - `DATABASE_PATH` = `/var/data/daigou.db`
   - `UPLOAD_DIR` = `/var/data/uploads`
   - `NEXT_PUBLIC_APP_URL` = Render 給你的網址
   - `LINE_CHANNEL_ID`、`LINE_CHANNEL_SECRET`、`LINE_CALLBACK_URL`
   - 不要設定 `DEV_LOGIN_ENABLED`
8. 部署完成後，用手機打開網址，按「使用 LINE 登入」。

**請溫蒂第一個登入。** 資料庫還是空的、而且沒有填 `ADMIN_LINE_USER_IDS` 時，第一個 LINE 帳號會變成管理員。之後的人都是待核准。

如果小幫手不小心先登入、變成了管理員：請溫蒂把自己的 LINE user id 填進 `ADMIN_LINE_USER_IDS` 後重新登入，再到「幫手」頁把那個人改成小幫手或待核准。每個人的 LINE user id 會顯示在「幫手」頁。

## 新增一位小幫手

1. 把網站網址傳給他，請他用自己的 LINE 按「使用 LINE 登入」。
2. 他會看到「等溫蒂核准」。
3. 溫蒂打開「幫手」，按「核准為小幫手」。
4. 請他重新整理。之後他只能看到自己建立的訂單。

不想讓某人繼續用，按「改回待核准」即可。舊訂單還在，只是他暫時進不去。

## 備份

訂單、匯款紀錄和收據都在資料庫檔與 `UPLOAD_DIR` 裡。請幫忙的人偶爾把整塊永久磁碟，或 `data` 資料夾，下載一份存起來。只複製 `daigou.db` 而沒有上傳資料夾的話，照片會對不上。

## 給幫忙安裝的人

- Next.js（App Router）+ SQLite（`better-sqlite3`）+ Drizzle 查詢。
- 結構在 `drizzle/0001_init.sql`，網站啟動時會自己補上還沒跑過的遷移。
- 登入是 LINE Login（OAuth 2.0 / OpenID Connect）。Session 是簽過名的 cookie。
- 試用登入的判斷在 `src/lib/auth-policy.ts`：必須同時是 `NODE_ENV=development` 和 `DEV_LOGIN_ENABLED=true`。
- 金額是整數。彙總邏輯在 `src/lib/summary.ts`，已匯款用實付金額和實付幣別，未匯款用訂單金額和訂單幣別。
- 上傳檔只接受 JPG、PNG、WEBP、PDF，每個 5MB，存在磁碟，不進資料庫。
- `typescript`、`@types/*`、`tailwindcss`、`@tailwindcss/postcss`、`eslint`、`eslint-config-next` 放在 dependencies。Render 在 `NODE_ENV=production` 下執行 `npm install` 時會略過 devDependencies，而 `next build` 要讀 `next.config.ts`、編譯 CSS，並做型別檢查與 lint。`vitest` 和 `tsx` 只給測試與 `db:seed`，留在 devDependencies。測試檔與 `vitest.config.ts` 不納入 Next 的型別檢查，所以正式環境不必安裝 Vitest。

```bash
npm test
npm run lint
npm run build
```

`npm run db:seed` 只在資料庫是空的、而且不是正式環境時寫入示範資料。正式環境執行會直接停下來。

## 常見問題

**小幫手說 LINE 登入失敗。**  
Callback URL 要和 `LINE_CALLBACK_URL` 完全一樣，包含 `https`。頻道如果還在 Developing，請改成 Published。

**試用登入在正式網站看不到。**  
這是對的。正式網站只走 LINE。

**彙總的已匯和未匯對不起來。**  
用不同幣別付款時，未匯的那邊會消失，已匯的那邊用你填的幣別。例如訂單 ¥6,480、實付 NT$1,450，彙總只會出現 NT$1,450 的已匯，不會再留著 ¥6,480，也不會把兩邊換算成同一種錢。

**重新部署後訂單不見了。**  
磁碟沒有掛到 `DATABASE_PATH` 和 `UPLOAD_DIR`，或是用了會清空檔案的免費方案。把這兩個路徑指到永久磁碟後再部署。

**建置失敗，說找不到 typescript。**  
Build Command 用 `npm install && npm run build` 即可。`NODE_ENV=production` 可以留著。不要加 `--include=dev`。如果還是舊的程式，請先部署這個修正再重試。
