# 📘 GitHub Pages 團隊分享部署教學

## 📋 準備工作

### 需要準備：
- ✅ GitHub 帳號（免費）
- ✅ 您的專案檔案（E:\claude\EN）
- ✅ 10-15 分鐘時間

---

## 🚀 步驟一：建立 GitHub 帳號

1. 前往 [https://github.com](https://github.com)
2. 點擊右上角「Sign up」
3. 填寫資料：
   - Username（用戶名）：建議用英文，如 `john-smith`
   - Email（電子郵件）
   - Password（密碼）
4. 驗證電子郵件

---

## 📁 步驟二：建立專案儲存庫

### 方法 A：網頁介面上傳（推薦新手）

1. **登入 GitHub 後，點擊右上角「+」→「New repository」**

2. **填寫儲存庫資訊：**
   - Repository name: `toeic-words`
   - Description: `TOEIC 多益單字學習系統`
   - 選擇：**Public**（公開，免費使用 GitHub Pages）
   - ✅ 勾選「Add a README file」
   - 點擊「Create repository」

3. **上傳檔案：**
   - 點擊「uploading an existing file」或「Add file」→「Upload files」
   - 將以下檔案/資料夾拖曳到網頁：
     ```
     ✅ css/
     ✅ js/
     ✅ data/
     ✅ admin.html
     ✅ learn.html
     ✅ index.html
     ✅ index-mobile.html
     ✅ manifest.json
     ✅ sw.js
     ✅ README.md
     ```
   - 在下方「Commit changes」輸入：`Initial upload`
   - 點擊「Commit changes」

### 方法 B：使用 Git 命令（進階）

```bash
# 1. 在專案資料夾開啟命令提示字元
cd E:\claude\EN

# 2. 初始化 Git
git init

# 3. 加入所有檔案
git add .

# 4. 提交變更
git commit -m "Initial commit"

# 5. 連接到 GitHub
git remote add origin https://github.com/你的帳號/toeic-words.git

# 6. 推送到 GitHub
git push -u origin main
```

---

## ⚙️ 步驟三：啟用 GitHub Pages

1. **進入專案頁面**
   - 網址：`https://github.com/你的帳號/toeic-words`

2. **點擊「Settings」（設定）**
   - 在上方選單列最右邊

3. **找到「Pages」選項**
   - 在左側選單往下捲動
   - 在「Code and automation」區塊下

4. **設定 GitHub Pages**
   - Source: 選擇「Deploy from a branch」
   - Branch: 選擇「main」
   - Folder: 選擇「/ (root)」
   - 點擊「Save」

5. **等待部署（約 2-5 分鐘）**
   - 重新整理頁面
   - 看到綠色勾勾 ✅ 表示成功
   - 您的網站網址會顯示在上方：
     ```
     🌐 Your site is live at https://你的帳號.github.io/toeic-words/
     ```

---

## 🎉 步驟四：訪問您的網站

### 您的網站網址：
```
https://你的帳號.github.io/toeic-words/
```

### 各頁面直接連結：
- 首頁：`https://你的帳號.github.io/toeic-words/`
- 學習頁：`https://你的帳號.github.io/toeic-words/learn.html`
- 管理頁：`https://你的帳號.github.io/toeic-words/admin.html`
- 手機版：`https://你的帳號.github.io/toeic-words/index-mobile.html`

---

## 👥 步驟五：分享給團隊

### 1. 分享網址
直接分享網址給團隊成員：
```
大家好！

我建立了一個多益單字學習系統，歡迎使用：
🌐 https://你的帳號.github.io/toeic-words/

功能特色：
✅ 3000+ 多益單字
🔊 語音朗讀功能
📱 手機也能用（可安裝為 APP）
💾 離線使用

首次使用請先到管理頁面上傳單字檔案：
https://你的帳號.github.io/toeic-words/admin.html

有問題請隨時聯繫我！
```

### 2. 建立使用說明文件
在專案中已包含 `README.md`，團隊成員可查看使用說明。

### 3. 讓團隊成員貢獻（選擇性）
如果要讓團隊成員一起維護：
1. Settings → Manage access
2. Add people → 輸入他們的 GitHub 帳號
3. 選擇權限等級（建議 Write）

---

## 📱 手機安裝教學（分享給團隊）

### Android 手機：
1. 用 Chrome 開啟網站
2. 點選右上角 ⋮ 
3. 選擇「加到主畫面」
4. 點擊「新增」

### iPhone：
1. 用 Safari 開啟網站
2. 點選下方分享按鈕 ↗
3. 選擇「加入主畫面」
4. 點擊「新增」

---

## 🔄 更新內容

### 如何更新檔案：
1. 在 GitHub 網頁點擊要修改的檔案
2. 點擊右上角鉛筆圖示 ✏️
3. 修改內容
4. 在下方填寫更新說明
5. 點擊「Commit changes」
6. 等待 2-3 分鐘自動更新

### 批量更新：
1. Add file → Upload files
2. 拖曳新檔案（會自動覆蓋舊檔案）
3. Commit changes

---

## ❓ 常見問題

### Q: 網站打不開？
A: 
1. 確認 GitHub Pages 已啟用（Settings → Pages）
2. 等待 5 分鐘讓部署完成
3. 檢查網址是否正確

### Q: 如何修改網站內容？
A: 
1. 直接在 GitHub 網頁編輯
2. 或下載檔案修改後重新上傳

### Q: 團隊成員的資料會互相影響嗎？
A: 
不會！每個人的學習進度都儲存在自己瀏覽器中，完全獨立。

### Q: 如何備份單字資料？
A: 
1. 在 admin.html 點擊「匯出 JSON」
2. 分享 JSON 檔案給團隊
3. 團隊成員匯入即可同步

### Q: 可以設為私有嗎？
A: 
GitHub Pages 免費版需要公開儲存庫。如需私有，可考慮：
- GitHub Pro（付費）
- 使用 Netlify 或 Vercel

---

## 🎯 快速檢查清單

- [ ] GitHub 帳號已建立
- [ ] Repository 已建立（名稱：toeic-words）
- [ ] 檔案已上傳
- [ ] GitHub Pages 已啟用
- [ ] 網站可以訪問
- [ ] 已分享給團隊成員

---

## 📞 需要協助？

如遇到問題，請檢查：
1. 儲存庫是否設為 Public
2. GitHub Pages 是否正確設定
3. 檔案路徑是否正確（注意大小寫）

---

## 🚀 進階功能

### 自訂網域（選擇性）
1. Settings → Pages → Custom domain
2. 輸入您的網域（如：toeic.example.com）
3. 在網域 DNS 設定 CNAME 指向 `你的帳號.github.io`

### 自動部署（已設定）
每次更新檔案都會自動部署，無需手動操作。

---

恭喜！您的多益單字學習系統已成功上線！ 🎉

團隊成員現在可以隨時隨地學習了！