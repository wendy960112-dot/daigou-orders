# 代購單

日本代購的訂單小本本。溫蒂（管理員）和在日本的小幫手共用。

溫蒂派採購任務給在日本的小幫手。小幫手接下後，用手機回報金額、訂單截圖，以及轉寄或面交時的物流和運費收據。溫蒂勾三個狀態：**已匯款**、**已收到貨**、**運費已報銷**。日圓和新台幣分開加總，網站不會自動換匯，也不會真的幫你匯款。

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
   - **溫蒂**：管理員，發任務、看全部任務、彙總、核准小幫手。
   - **小美、阿健**：小幫手，只看得到派給自己的任務。小美有一張還沒接下的示範任務。
   - **小林**：還沒核准，只看得到等待畫面。

第一次開啟會自動放進幾筆示範訂單。資料在 `data` 資料夾。想重來就關掉網站，刪掉 `data` 資料夾，再執行 `npm run dev`。

試用登入**只在開發模式出現**。正式網站（`NODE_ENV=production`）會強制關閉，就算把 `DEV_LOGIN_ENABLED` 設成 `true` 也不會開。

## 每天怎麼用

**溫蒂**

1. 按「發任務」。選商品名稱、寫下單內容、貼商品連結、選派發日期和交貨形式，再指定一位已核准的小幫手。
   - 交貨形式是「到貨後寄到指定地址」時，要填那個地址。面交和寄到倉庫地址不用填。
   - 商品名稱是下拉選單。一開始有「丸久小山園」。要加名稱、改名或停用，在發任務頁按「管理商品名稱」。至少留一個可以使用的名稱。停用不會改掉舊訂單上的名稱。
2. 任務列表看進度：待接單、已接單、已下單、已寄出。也可以用小幫手、匯款狀態、月份篩選。
3. 小幫手用 LINE 傳資料、沒有自己填系統時，打開那張任務按「編輯」。可以改商品名稱、下單內容、商品連結、派發日期、交貨形式，也可以改派小幫手。同一頁可以代填金額、訂單截圖、追蹤單號和運費，並替換匯款截圖、運費報銷截圖。代填的欄位會標「由管理員代填」，被指派的小幫手打開自己的訂單就看得到。代填並標成已下單時，一樣要有訂單截圖。已刪除的任務要先還原才能編輯。
4. 打開一筆任務，勾選狀態後按「儲存狀態」。
   - 已匯款：小幫手回報金額之後才能勾。可以填匯款日期、金額、幣別，並上傳匯款截圖。用新台幣匯一筆日圓訂單時，兩個數字會各自留著，不會幫你換算。
   - 已收到貨：你收到包裹後再勾。
   - 運費已報銷：要先有運費金額。照收據的數字還錢後再勾，也可以上傳報銷轉帳截圖。
   - 這兩種截圖只有被指派的小幫手看得到，其他小幫手看不到，也不能刪。
5. 不想要的任務按「刪除」。會先問一次。如果已經勾了已匯款或運費已報銷，警告會寫得更清楚。刪除後不會出現在列表、彙總和小幫手的畫面，截圖先留著。任務列表右上角「已刪除」可以打開並還原。
6. 「彙總」頁看每位小幫手、每個月還沒匯的商品款，以及還沒報銷的運費。還沒回報金額的任務不會算進去。已刪除的也不算。
7. 「幫手」頁核准新的 LINE 或電子郵件帳號。每個人會標出登入方式。沒核准的人不能接任務，也看不到別人的任務。
8. 對方忘了密碼、而且網站沒有設定寄信時：在「幫手」頁按「產生重設連結」，把畫面上的網址或代碼用 LINE 傳給對方。連結一個小時內有效，用過就失效。
9. 「進貨」記自己先買進的貨。這一版只記買入，不算出貨、也不扣庫存。小幫手的選單沒有這一頁，網址和伺服器動作也進不去。
   - 先有商品主檔。第一次開啟、商品表還是空的時候，會自動匯入專案裡的 `data/rakuten-products.csv`。每個規格是一筆商品。已下架的 MP004（丸久小山園 和光 40g）不會建立；要用的是沒有編號的「丸久小山園 和光」，規格是「40g 罐」和「100g 袋」。
   - 商品頁可以搜尋、新增、修改、封存，也可以按「重新匯入內建商品表」或上傳新的 CSV。有編號的用「編號加規格」更新；編號空白的用「名稱加規格」。你後來補上的編號，重新匯入不會清掉。已封存的不會因為匯入又打開。
   - 新增進貨時填日期、供應商（可選丸久小山園官網、小幫手、樂天，也可以自己打）、幣別、品項、運費和其他費用。單價照收據填，不會拿目錄售價自動填。可以附訂單截圖，也可以選填相關任務和確認信的主旨、Gmail 訊息編號。同一封信只建一張還沒刪除的進貨單。
   - 「累計買入」依商品加總數量和金額。日圓和新台幣分開，不會混在一起。可以下載 CSV。
   - 刪除是軟刪除，截圖留著。列表右上角「已刪除」可以還原。刪除的進貨不算進列表和累計買入。
   - 終端機也可以重匯：`npm run db:import-skus`。要換檔案就在後面加上 CSV 路徑。

**小幫手**

1. 用 LINE 或電子郵件登入（本機練習就用試用登入）。沒有帳號可以在登入頁按「註冊新帳號」。
2. 有新任務時，下方「接收新單」會出現數字。打開後按「接下這張單」。只能看到派給自己的任務。
3. 接下後填商品名稱（已先選好任務上的名稱）、訂購日期、金額、幣別，並上傳訂單截圖。沒有訂單截圖不能送出。商品連結、下單內容和交貨形式是溫蒂填的，只能看。
4. 物流公司固定是 EMS。追蹤單號可以留空。貨寄出或面交後，補寄出日期或追蹤單號，再補運費和收據照片。只有填了追蹤單號或寄出日期，進度才會變成「已寄出」。只回報 EMS 仍是「已下單」。
5. 溫蒂匯款或報銷運費後，訂單頁可以看匯款截圖和運費報銷截圖，確認錢有進來。不能改、也不能刪。
6. 溫蒂代填的欄位旁邊會寫「由管理員代填」。你之後自己改過的欄位，這個標記會拿掉。
7. 進貨、商品主檔和累計買入只有溫蒂看得到。小幫手的畫面不會出現。

每一筆派發、接單、回報、代填、刪除、還原和狀態變更都會留下誰、做了什麼、什麼時候。訂單頁最下面就是這份紀錄。進貨的建立、修改、刪除、還原也有自己的紀錄；由確認信自動建立的會標成 API。

以前小幫手自己建立的訂單會留著。金額、連結、數量這些舊欄位不會被清掉；新派出去、還沒回報的任務可以先沒有金額。

## 環境變數

正式環境要設定這些。本機試用可以都先不設，直接 `npm run dev`。

| 名稱 | 什麼時候要 | 說明 |
| --- | --- | --- |
| `SESSION_SECRET` | 正式環境必填 | 一長串隨機文字，至少 16 個字。用來保護登入，不要給別人看。 |
| `NEXT_PUBLIC_APP_URL` | 正式環境必填 | 網站網址，例如 `https://daigou.onrender.com`，結尾不要斜線。 |
| `LINE_CHANNEL_ID` | 用 LINE 登入時必填 | LINE 頻道的 Channel ID。 |
| `LINE_CHANNEL_SECRET` | 用 LINE 登入時必填 | LINE 頻道的 Channel secret。不要貼到聊天室以外的地方。 |
| `LINE_CALLBACK_URL` | 用 LINE 登入時必填 | 必須是 `網址/api/auth/line/callback`，和 LINE 後台填的要一字不差。 |
| `ADMIN_LINE_USER_IDS` | 選填 | 溫蒂的 LINE user id。很多人用逗號分開。留空的話，**第一個**帳號（LINE 或電子郵件，當時還沒有管理員）會變成管理員。 |
| `ADMIN_EMAILS` | 選填 | 要直接當管理員的信箱，逗號分開。對方用這個信箱註冊或登入時會變成管理員，不會自動降級。 |
| `SMTP_HOST` | 選填，預設關閉 | 寄重設信用的伺服器。沒填就不會寄信，請用「幫手」頁的重設連結。 |
| `SMTP_PORT` | 選填 | 預設 `587`。 |
| `SMTP_SECURE` | 選填 | 設成 `true` 代表一開始就用加密連線。Port `465` 也會自動加密。 |
| `SMTP_USER` / `SMTP_PASS` | 寄信需要帳號時 | 信箱密碼。不要提交到 Git。 |
| `SMTP_FROM` | 要寄信時必填 | 寄件人，例如 `代購單 <orders@example.com>`。沒填 `SMTP_HOST` 或 `SMTP_FROM` 就不會寄信。 |
| `DATABASE_PATH` | 選填 | 資料庫檔。預設 `data/daigou.db`。正式環境請指到永久磁碟，例如 `/var/data/daigou.db`。 |
| `UPLOAD_DIR` | 選填 | 截圖和收據。預設 `data/uploads`。正式環境請放在同一塊永久磁碟，例如 `/var/data/uploads`。 |
| `DEV_LOGIN_ENABLED` | 只有自己的電腦 | 設成 `true` 才會出現試用登入，而且只有開發模式有效。正式環境請不要設，或設成 `false`。 |
| `PURCHASING_API_TOKEN` | 要用確認信自動建進貨時 | 一長串隨機文字。助理機器人用它當 Bearer token。沒設定時，進貨 API 整個關閉，回 404。不要提交到 Git，也不要放進小幫手看得到的地方。 |
| `NODE_ENV` | 正式環境 | 設成 `production`。`npm start` 通常會自己設好。 |

範例在 `.env.example`。

## 進貨 API

給助理機器人用。溫蒂在確認信上點頭之後，機器人用這個 API 查商品、看這封信有沒有建過，再建立進貨單。登入 cookie 不能呼叫它。小幫手的登入狀態也沒用。沒有 `PURCHASING_API_TOKEN`，或 Bearer 不對、沒帶，一律回 **404**，不說明原因。

請在每個請求加上：

```http
Authorization: Bearer 你的PURCHASING_API_TOKEN
```

**搜尋商品** `GET /api/purchasing/skus?q=和光`

回傳最多 20 筆還沒封存的商品，含 `id`、編號、名稱、規格、分類、售價、成本。建立進貨時要用這個 `id`。

**看這封信建過沒有** `GET /api/purchasing/purchases?source_ref=gmail-message-id`

`source_ref` 必填，否則 400。已刪除的也會列出來，`deletedAt` 有值表示那筆已刪、可以再建一張。

**建立進貨** `POST /api/purchasing/purchases`

JSON 範例：

```json
{
  "purchasedOn": "2026-10-18",
  "supplier": "丸久小山園官網",
  "currency": "JPY",
  "shippingFee": 0,
  "otherFees": 0,
  "notes": "官網訂單",
  "sourceRef": "gmail-message-id",
  "sourceSubject": "ご注文ありがとうございます",
  "lines": [{ "skuId": "sku_...", "quantity": 2, "unitPrice": 1620 }],
  "screenshots": [{ "fileName": "order.png", "contentBase64": "...." }]
}
```

`currency` 是 `JPY` 或 `TWD`。金額都是整數，不換匯。`lines` 至少一項、最多 40 項。截圖可省略；有的話最多 8 個，JPG、PNG、WEBP 或 PDF，每個 5MB。`contentBase64` 可以帶 `data:image/png;base64,` 前綴。

也可以用 `multipart/form-data`：文字欄位同上，`lines` 是 JSON 字串，截圖放在欄位 `screenshots`（可多個檔案）。

成功回 **201**，內容是 `{ "id", "total", "currency" }`。同一封信（同一個還沒刪除的 `sourceRef`）再送一次回 **409**，並帶原本的 `purchaseId`。欄位不對回 **400**。紀錄裡的操作者是「API」。

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

**請溫蒂第一個登入。** 資料庫還是空的、而且沒有填 `ADMIN_LINE_USER_IDS` 或 `ADMIN_EMAILS` 時，第一個帳號（LINE 或電子郵件）會變成管理員。之後的人都是待核准。

如果小幫手不小心先登入、變成了管理員：請溫蒂把自己的 LINE user id 填進 `ADMIN_LINE_USER_IDS` 後重新登入，再到「幫手」頁把那個人改成小幫手或待核准。每個人的 LINE user id 會顯示在「幫手」頁。

## 新增一位小幫手

1. 把網站網址傳給他。他可以用自己的 LINE 按「使用 LINE 登入」，或在登入頁按「註冊新帳號」填名字、信箱和密碼。
2. 他會看到「等溫蒂核准」。
3. 溫蒂打開「幫手」，確認登入方式是 LINE 或電子郵件，按「核准為小幫手」。
4. 請他重新整理。之後他只能看到溫蒂派給他的任務。

忘了電子郵件密碼時：溫蒂在「幫手」頁按「產生重設連結」，把連結或代碼傳給他。他打開後設定新密碼。如果有設定 `SMTP_HOST` 和 `SMTP_FROM`，產生連結時也會寄信，登入頁的「忘記密碼」也會寄信。沒設定就不會寄，這是預設。

不想讓某人繼續用，按「改回待核准」即可。舊訂單還在，只是他暫時進不去。

## 備份

訂單、匯款紀錄和收據都在資料庫檔與 `UPLOAD_DIR` 裡。請幫忙的人偶爾把整塊永久磁碟，或 `data` 資料夾，下載一份存起來。只複製 `daigou.db` 而沒有上傳資料夾的話，照片會對不上。

## 給幫忙安裝的人

- Next.js（App Router）+ SQLite（`better-sqlite3`）+ Drizzle 查詢。
- 結構在 `drizzle/`，網站啟動時會自己補上還沒跑過的遷移，對象是 `DATABASE_PATH` 那份 SQLite。任務派發那次遷移會把舊訂單整筆複製過來，金額和日期改成可以空白，不刪舊欄位。已有訂單會標成已下單或已寄出，不會變成待接單。後來有一筆修復：沒有追蹤單號、也沒有寄出日期、卻被標成已寄出的，會改回已下單。已刪除的不動。
- 登入可以是 LINE Login（OAuth 2.0 / OpenID Connect），或電子郵件加密碼。密碼用 Node.js `scrypt` 雜湊後保存，重設代碼只存 SHA-256。同一個信箱 15 分鐘內密碼錯誤 8 次會暫停登入。Session 是簽過名的 cookie。
- 寄重設信要同時有 `SMTP_HOST` 和 `SMTP_FROM`，否則關閉。管理員仍可在「幫手」頁產生一次性連結。
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

`npm run db:import-skus` 會把 `data/rakuten-products.csv` 匯進 `DATABASE_PATH`。後面可以改帶另一個 CSV 路徑。MP004 會略過。第一次啟動、商品表是空的時也會自動匯入這份內建表，不會每次啟動都覆寫。

## 常見問題

**小幫手說 LINE 登入失敗。**  
Callback URL 要和 `LINE_CALLBACK_URL` 完全一樣，包含 `https`。頻道如果還在 Developing，請改成 Published。

**試用登入在正式網站看不到。**  
這是對的。正式網站用 LINE 或電子郵件登入，沒有那四個試用按鈕。

**彙總的已匯和未匯對不起來。**  
用不同幣別付款時，未匯的那邊會消失，已匯的那邊用你填的幣別。例如訂單 ¥6,480、實付 NT$1,450，彙總只會出現 NT$1,450 的已匯，不會再留著 ¥6,480，也不會把兩邊換算成同一種錢。

**重新部署後訂單不見了。**  
磁碟沒有掛到 `DATABASE_PATH` 和 `UPLOAD_DIR`，或是用了會清空檔案的免費方案。把這兩個路徑指到永久磁碟後再部署。

**建置失敗，說找不到 typescript。**  
Build Command 用 `npm install && npm run build` 即可。`NODE_ENV=production` 可以留著。不要加 `--include=dev`。如果還是舊的程式，請先部署這個修正再重試。
