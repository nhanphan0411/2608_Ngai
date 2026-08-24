-- Freeform markdown pages (e.g. policies, FAQs) editable from
-- /admin/documents and served publicly at /{slug} — a top-level route,
-- not nested under /documents, so links stay short (ourwebsite.com/slug).
CREATE TABLE documents (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content_markdown TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);