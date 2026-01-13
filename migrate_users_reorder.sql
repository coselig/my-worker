-- 重新排列 users 表欄位順序，使其與 schema.sql 一致

-- 1. 暫時禁用外鍵約束
PRAGMA foreign_keys = OFF;

-- 2. 創建新表，欄位按正確順序排列
CREATE TABLE users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  chinese_name TEXT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  job_title TEXT,
  phone TEXT,
  address TEXT,
  bank_account TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. 複製資料從舊表到新表
INSERT INTO users_new (id, name, chinese_name, email, password, role, job_title, phone, address, bank_account, is_active, created_at)
SELECT id, name, chinese_name, email, password, role, job_title, phone, address, bank_account, is_active, created_at
FROM users;

-- 4. 刪除舊表
DROP TABLE users;

-- 5. 重命名新表
ALTER TABLE users_new RENAME TO users;

-- 6. 重新啟用外鍵約束
PRAGMA foreign_keys = ON;
