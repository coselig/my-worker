CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  user_id INTEGER NOT NULL,
  work_date TEXT NOT NULL,                 -- YYYY-MM-DD

  check_in_time TEXT,                      -- ISO8601 datetime
  check_out_time TEXT,                     -- ISO8601 datetime

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  -- 一個人一天只能一筆
  UNIQUE (user_id, work_date),

  -- Foreign Key
  FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
