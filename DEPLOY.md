# Coselig 員工系統部署指南

## 專案架構

此專案採用單一 Cloudflare Workers 架構，整合前端和後端：

- **前端**: Flutter Web 應用，構建後的靜態文件存儲在 Cloudflare KV 中
- **後端**: Node.js API，運行在 Cloudflare Workers 上
- **資料庫**: Cloudflare D1 (SQLite)

部署 URL: https://employeeservice.coseligtest.workers.dev

## 部署步驟

### 1. 構建前端

```bash
cd d:\workspace\coselig_staff_portal_frontend
flutter build web --release --build-name=0.1.1 --build-number=3
```

這會在 `build/web/` 目錄中生成生產版本的前端文件。

**版本參數說明**：

- `--build-name`: 版本名稱（如 0.1.1），對應並同步到 pubspec.yaml 中的 version
- `--build-number`: 構建編號（整數），每次部署遞增
- **版本號自動讀取**：App 會自動從這些參數讀取版本號顯示在 AppBar，無需手動修改代碼

**版本管理規則**：

- 只需在 pubspec.yaml 修改 version，或使用 --build-name 參數覆蓋
- App 啟動時會自動讀取版本信息並顯示
- 建議每次部署時遞增 build-number

### 2. 生成資產清單

```bash
cd d:\workspace\coselig_staff_portal_backend
node upload.js
```

這會掃描前端構建目錄，生成 `assets.json` 文件，包含所有需要上傳的文件。

### 3. 上傳靜態文件到 KV

```bash
npx wrangler kv bulk put assets.json --namespace-id e7ff4caa1f96456aadc4c1c5bf71b584 --remote
```

將所有前端靜態文件批量上傳到 Cloudflare KV Namespace。

### 4. 部署 Workers

```bash
npx wrangler deploy
```

部署更新後的 Workers 代碼到 Cloudflare。

## 快速部署腳本

可以創建一個批處理文件來自動執行所有步驟：

```batch
@echo off
set VERSION=0.1.1
set BUILD_NUMBER=1

echo Building frontend with version %VERSION%...
cd d:\workspace\coselig_staff_portal_frontend
call flutter build web --release --build-name=%VERSION% --build-number=%BUILD_NUMBER%

echo Generating assets...
cd d:\workspace\coselig_staff_portal_backend
node upload.js

echo Uploading to KV...
npx wrangler kv bulk put assets.json --namespace-id e7ff4caa1f96456aadc4c1c5bf71b584 --remote

echo Deploying Workers...
npx wrangler deploy

echo Deployment complete! Version: %VERSION%
pause
```

將上述內容保存為 `deploy.bat` 並執行。每次部署前記得更新 `VERSION` 和 `BUILD_NUMBER` 變數。

## 配置說明

### Wrangler 配置 (`wrangler.jsonc`)

```jsonc
{
  "name": "employeeservice",
  "main": "src/index.js",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "employees_db",
      "database_id": "5bd7f855-5174-4857-80e8-f88e435baa7c"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "STATIC_ASSETS",
      "id": "e7ff4caa1f96456aadc4c1c5bf71b584"
    }
  ]
}
```

### Cookie 配置

Cookie 設置使用 `SameSite=None; Secure` 以支援跨域請求，並確保 HTTPS 安全性。

### CORS 配置

允許的來源列表在 `src/utils.js` 中配置：

```javascript
const allowedOrigins = [
  "https://staff.coselig.com",
  "https://staff-portal.coseligtest.workers.dev",
  "https://9b3a7fe9.coselig-staff-portal-frontend.pages.dev",
];
```

## 常見問題

### Q: 為什麼需要將前端整合到 Workers？

A: 為了避免跨域 Cookie 問題，將前端和後端放在同一個域名下，確保 session 管理正常運作。

### Q: 如何更新前端代碼？

A: 修改 Flutter 代碼後，重新執行完整的部署流程（步驟 1-4）。

### Q: 如何更新後端代碼？

A: 修改 `src/` 目錄中的代碼後，只需執行步驟 4（`npx wrangler deploy`）。

### Q: KV Namespace ID 從哪裡來？

A: 使用 `npx wrangler kv namespace create STATIC_ASSETS` 創建，ID 會自動添加到 `wrangler.jsonc`。

## 開發環境

- Flutter SDK: 3.38.5
- Node.js: 支援 ES6 模組
- Wrangler: 4.54.0+

## 相關資源

- [Cloudflare Workers 文檔](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 文檔](https://developers.cloudflare.com/d1/)
- [Flutter Web 文檔](https://docs.flutter.dev/platform-integration/web)
