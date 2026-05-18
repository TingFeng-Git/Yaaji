-- 种子数据：测试分类
INSERT OR IGNORE INTO categories (id, name, color, created_at) VALUES (1, '技术', '#667eea', datetime('now'));
INSERT OR IGNORE INTO categories (id, name, color, created_at) VALUES (2, '新闻', '#f093fb', datetime('now'));
INSERT OR IGNORE INTO categories (id, name, color, created_at) VALUES (3, '设计', '#4facfe', datetime('now'));

-- 种子数据：测试书签
INSERT OR IGNORE INTO bookmarks (id, title, url, description, category_id, click_count, created_at, updated_at)
VALUES (1, 'GitHub', 'https://github.com', '代码托管平台', 1, 0, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO bookmarks (id, title, url, description, category_id, click_count, created_at, updated_at)
VALUES (2, 'Hacker News', 'https://news.ycombinator.com', '技术新闻聚合', 2, 3, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO bookmarks (id, title, url, description, category_id, click_count, created_at, updated_at)
VALUES (3, 'Dribbble', 'https://dribbble.com', '设计作品展示', 3, 1, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO bookmarks (id, title, url, description, category_id, click_count, created_at, updated_at)
VALUES (4, 'TypeScript 手册', 'https://www.typescriptlang.org/docs/', 'TypeScript 官方文档', 1, 5, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO bookmarks (id, title, url, description, category_id, click_count, created_at, updated_at)
VALUES (5, 'Vue.js', 'https://vuejs.org', '渐进式 JavaScript 框架', 1, 2, datetime('now'), datetime('now'));
