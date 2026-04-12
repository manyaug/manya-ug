-- Modernizing Manya Vault with explicit metadata columns
-- These will allow the app and adaptive engine to reference assets and engine types directly

ALTER TABLE manya_vault 
ADD COLUMN IF NOT EXISTS engine_type TEXT,
ADD COLUMN IF NOT EXISTS cdn_url TEXT,
ADD COLUMN IF NOT EXISTS assets JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'MCQ';

-- Add indexes for fast lookup (Preloading optimization)
CREATE INDEX IF NOT EXISTS idx_manya_vault_engine_type ON manya_vault(engine_type);
CREATE INDEX IF NOT EXISTS idx_manya_vault_item_type ON manya_vault(item_type);

-- Update existing items from Excel sync to be typed as MCQ
UPDATE manya_vault SET item_type = 'MCQ' WHERE item_type IS NULL;
