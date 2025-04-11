-- Add canvas_category_id to courses table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS canvas_category_id TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_canvas_category BOOLEAN DEFAULT false; 