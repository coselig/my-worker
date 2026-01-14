# Coselig 員工系統部署指南

## 目錄

- [專案架構](#專案架構)
- [快速開始](#快速開始)
- [部署步驟](#部署步驟)
- [版本管理](#版本管理)
- [配置說明](#配置說明)
- [常見問題](#常見問題)
- [版本更新日誌](#版本更新日誌)

## 專案架構

此專案採用 Cloudflare Workers 全棧架構，前後端整合部署：

| 組件 | 技術 | 說明 |
|------|------|------|
| **前端** | Flutter Web | 構建後的靜態文件存儲在 Cloudflare KV |
| **後端** | Node.js API | 運行在 Cloudflare Workers 上 |
| **資料庫** | Cloudflare D1 | SQLite 相容的雲端資料庫 |

**部署 URL**: <https://employeeservice.coseligtest.workers.dev>

### 架構優勢

- ✅ **統一域名**：前後端在同一域名下，避免跨域 Cookie 問題
- ✅ **全球分發**：Cloudflare 邊緣網路，低延遲高可用
- ✅ **無伺服器**：自動擴展，按需付費

## 快速開始

### 使用自動部署腳本

創建 `deploy.bat` 文件並執行，自動完成所有部署步驟：

```batch
@echo off
set VERSION=0.1.1
set BUILD_NUMBER=3

echo ======================================
echo Coselig 員工系統自動部署
echo 版本: %VERSION% (Build #%BUILD_NUMBER%)
echo ======================================

echo.
echo [1/4] 構建 Flutter 前端...
cd d:\workspace\coselig_staff_portal_frontend
call flutter build web --release --build-name=%VERSION% --build-number=%BUILD_NUMBER%
if errorlevel 1 (
    echo 構建失敗！
    pause
    exit /b 1
)

echo.
echo [2/4] 生成資產清單...
cd d:\workspace\coselig_staff_portal_backend
node upload.js
if errorlevel 1 (
    echo 生成資產清單失敗！
    pause
    exit /b 1
)

echo.
echo [3/4] 上傳靜態文件到 KV...
npx wrangler kv bulk put assets.json --namespace-id e7ff4caa1f96456aadc4c1c5bf71b584 --remote
if errorlevel 1 (
    echo 上傳失敗！
    pause
    exit /b 1
)

echo.
echo [4/4] 部署 Workers...
npx wrangler deploy
if errorlevel 1 (
    echo 部署失敗！
    pause
    exit /b 1
)

echo.
echo ======================================
echo 部署成功！版本: %VERSION% (Build #%BUILD_NUMBER%)
echo 訪問: https://employeeservice.coseligtest.workers.dev
echo ======================================
pause
```

**使用方式**：

1. 每次部署前更新 `VERSION` 和 `BUILD_NUMBER`
2. 雙擊執行 `deploy.bat`
3. 等待自動完成所有步驟

## 部署步驟

### 步驟 1：構建前端

```bash
cd d:\workspace\coselig_staff_portal_frontend
flutter build web --release --build-name=0.1.1 --build-number=3
```

**說明**：

- 生成優化後的生產版本前端文件到 `build/web/` 目錄
- 自動進行代碼壓縮、tree-shaking 和資源優化

**參數**：

- `--release`：生產模式構建
- `--build-name`：版本名稱（如 0.1.1）
- `--build-number`：構建編號（整數，建議每次部署遞增）

### 步驟 2：生成資產清單

```bash
cd d:\workspace\coselig_staff_portal_backend
node upload.js
```

**說明**：

- 掃描 `build/web/` 目錄
- 生成 `assets.json` 清單文件
- 包含所有需要上傳的靜態資源及其路徑

### 步驟 3：上傳靜態文件到 KV

```bash
npx wrangler kv bulk put assets.json --namespace-id e7ff4caa1f96456aadc4c1c5bf71b584 --remote
```

**說明**：

- 批量上傳所有前端靜態文件到 Cloudflare KV
- KV 作為全球分發的內容存儲
- `--remote` 參數指定上傳到生產環境

### 步驟 4：部署 Workers

```bash
npx wrangler deploy
```

**說明**：

- 部署後端 API 代碼到 Cloudflare Workers
- 自動綁定 D1 資料庫和 KV Namespace
- 部署到全球邊緣節點

## 版本管理

### 自動版本讀取機制

系統使用 `package_info_plus` 套件實現版本號自動管理：

```dart
// lib/constants/app_constants.dart
class AppConstants {
  static PackageInfo? _packageInfo;
  
  static Future<void> init() async {
    _packageInfo = await PackageInfo.fromPlatform();
  }
  
  static String get appVersion => _packageInfo?.version ?? '0.0.0';
  static String get buildNumber => _packageInfo?.buildNumber ?? '0';
  static String get fullVersion => 'v$appVersion (Build #$buildNumber)';
}
```

### 版本號顯示位置

- **AppBar 標題旁**：顯示格式為 `v0.1.1 (Build #3)`
- **控制台日誌**：啟動時輸出版本信息

### 版本管理規則

| 情況 | 操作 | 範例 |
|------|------|------|
| **主要更新** | 修改 `pubspec.yaml` 的 version | 0.1.0 → 0.2.0 |
| **小版本更新** | 修改第三位數字 | 0.1.0 → 0.1.1 |
| **每次部署** | 遞增 build-number | Build #1 → Build #2 |
| **使用參數覆蓋** | `--build-name` 參數 | 臨時測試版本 |

### 版本號命名規範

```
major.minor.patch
  │     │     └─── 錯誤修復、小改動
  │     └───────── 新功能、向後兼容
  └─────────────── 重大更新、破壞性變更
```

## 配置說明

### Wrangler 配置

**文件位置**：`wrangler.jsonc`

```jsonc
{
  "name": "employeeservice",
  "main": "src/index.js",
  "d1_databases": [
    {
      "binding": "DB",                    // 在代碼中使用 env.DB 訪問
      "database_name": "employees_db",
      "database_id": "5bd7f855-5174-4857-80e8-f88e435baa7c"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "STATIC_ASSETS",         // 在代碼中使用 env.STATIC_ASSETS 訪問
      "id": "e7ff4caa1f96456aadc4c1c5bf71b584"
    }
  ]
}
```

### Cookie 配置

**文件位置**：`src/utils.js`

```javascript
// Cookie 設置
Set-Cookie: session_id=xxx; 
  SameSite=None;  // 允許跨站請求
  Secure;         // 僅 HTTPS 傳輸
  HttpOnly;       // 防止 XSS 攻擊
  Max-Age=86400   // 24 小時有效期
```

### CORS 配置

**文件位置**：`src/utils.js`

```javascript
const allowedOrigins = [
  "https://staff.coselig.com",                              // 正式域名
  "https://staff-portal.coseligtest.workers.dev",          // 測試域名
  "https://9b3a7fe9.coselig-staff-portal-frontend.pages.dev", // Pages 預覽
];
```

**說明**：

- 只允許列表中的域名訪問 API
- 支援 Credentials（Cookie）傳遞
- 預檢請求（OPTIONS）自動處理

## 常見問題

### Q: 為什麼前端和後端要整合部署？

**A**: 為了解決跨域 Cookie 問題。

- **問題**：現代瀏覽器對跨域 Cookie 有嚴格限制
- **解決**：將前後端部署在同一域名下，Session 管理更可靠
- **優勢**：無需複雜的 CORS 配置，用戶體驗更好

### Q: 如何只更新前端代碼？

**A**: 執行完整部署流程（步驟 1-4）。

```bash
# 前端代碼修改後
cd d:\workspace\coselig_staff_portal_frontend
flutter build web --release --build-name=0.1.1 --build-number=4

cd d:\workspace\coselig_staff_portal_backend
node upload.js
npx wrangler kv bulk put assets.json --namespace-id e7ff4caa1f96456aadc4c1c5bf71b584 --remote
npx wrangler deploy
```

### Q: 如何只更新後端代碼？

**A**: 只需執行步驟 4。

```bash
# 後端代碼修改後
cd d:\workspace\coselig_staff_portal_backend
npx wrangler deploy
```

### Q: 如何獲取 KV Namespace ID？

**A**: 創建新的 KV Namespace。

```bash
# 創建 KV Namespace
npx wrangler kv namespace create STATIC_ASSETS

# 輸出範例
🌀 Creating namespace with title "employeeservice-STATIC_ASSETS"
✨ Success! Add the following to your configuration file:
kv_namespaces = [
  { binding = "STATIC_ASSETS", id = "e7ff4caa1f96456aadc4c1c5bf71b584" }
]
```

將 ID 複製到 `wrangler.jsonc` 的 `kv_namespaces` 配置中。

### Q: 部署失敗怎麼辦？

**A**: 依序檢查：

1. **檢查網路連接**：確保能訪問 Cloudflare
2. **驗證 Wrangler 登入**：執行 `npx wrangler whoami`
3. **查看錯誤日誌**：仔細閱讀終端輸出的錯誤信息
4. **檢查配置文件**：確認 `wrangler.jsonc` 格式正確
5. **清理重試**：執行 `flutter clean` 後重新構建

### Q: 如何回滾到舊版本？

**A**: Cloudflare Workers 支援版本管理。

```bash
# 查看部署歷史
npx wrangler deployments list

# 回滾到指定版本
npx wrangler rollback [VERSION_ID]
```

## 開發環境要求

| 工具 | 版本 | 說明 |
|------|------|------|
| Flutter SDK | 3.38.5+ | 前端框架 |
| Node.js | 18.0+ | 支援 ES6 模組 |
| Wrangler | 4.54.0+ | Cloudflare CLI 工具 |

## 版本更新日誌

### v0.1.1 (2026-01-14)

#### 新功能

- ✨ **自動版本管理**
  - 使用 `package_info_plus` 套件
  - AppBar 自動顯示版本號：`v0.1.1 (Build #3)`
  - 從構建參數讀取，無需手動修改代碼
  
- 🎨 **UI 主題適配**
  - 打卡完成狀態支援亮色/暗色主題切換
  - 使用 Material 3 主題色系
  - 提升暗色模式下的可讀性

#### Bug 修復

- 🌙 **跨日打卡修復**
  - 智能判斷凌晨 0-5 點的下班打卡
  - 自動記錄到前一天的上班記錄
  - 解決「上班未下班」和「下班未上班」分離問題
  - 正確計算跨日班次工作時數（避免負數）

#### 技術改進

- 📦 新增依賴：`package_info_plus: ^8.1.2`
- 🔧 版本顯示格式統一
- 📝 完善部署文檔和版本管理說明

---

### v0.1.0 (2026-01-13)

#### 初始版本

- ✅ 基礎打卡系統（上下班打卡）
- ✅ 員工管理功能（新增、編輯、刪除）
- ✅ 月曆視圖（打卡狀態顯示）
- ✅ Excel 匯出功能（考勤報表）
- ✅ 多時段支援（可自定義時段名稱）
- ✅ 亮色/暗色主題切換

## 相關資源

- 📖 [Cloudflare Workers 文檔](https://developers.cloudflare.com/workers/)
- 📖 [Cloudflare D1 文檔](https://developers.cloudflare.com/d1/)
- 📖 [Cloudflare KV 文檔](https://developers.cloudflare.com/kv/)
- 📖 [Flutter Web 文檔](https://docs.flutter.dev/platform-integration/web)
- 📖 [Wrangler CLI 文檔](https://developers.cloudflare.com/workers/wrangler/)

---

**最後更新**：2026-01-14  
**當前版本**：v0.1.1 (Build #3)
