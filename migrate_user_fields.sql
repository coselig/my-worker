-- 添加新欄位到 users 表
ALTER TABLE users ADD COLUMN job_title TEXT;
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN address TEXT;
ALTER TABLE users ADD COLUMN bank_account TEXT;
ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1;
