-- ==============================================================
--  MANYA COMPATIBILITY BRIDGE
--  Run this in your Supabase SQL Editor to make the new 
--  database work with your existing code!
-- ==============================================================

-- 1. MATH
CREATE OR REPLACE VIEW questions_math AS 
SELECT * FROM manya_vault WHERE subject = 'MATH';

-- 2. SCIENCE
CREATE OR REPLACE VIEW questions_science AS 
SELECT * FROM manya_vault WHERE subject = 'SCIENCE';

-- 3. SST
CREATE OR REPLACE VIEW questions_sst AS 
SELECT * FROM manya_vault WHERE subject = 'SST';

-- 4. ENGLISH (Optional, based on your previous skip)
CREATE OR REPLACE VIEW questions_english AS 
SELECT * FROM manya_vault WHERE subject = 'ENGLISH';

-- ==============================================================
-- DONE! Your app will now see these as regular tables.
-- ==============================================================
