-- Phase A: Add undo/redo, save, key hold, right-click, and scroll depth signals
ALTER TABLE behavioral_snapshots ADD COLUMN undo_count          INTEGER NOT NULL DEFAULT 0;
ALTER TABLE behavioral_snapshots ADD COLUMN redo_count          INTEGER NOT NULL DEFAULT 0;
ALTER TABLE behavioral_snapshots ADD COLUMN save_count          INTEGER NOT NULL DEFAULT 0;
ALTER TABLE behavioral_snapshots ADD COLUMN avg_key_hold_ms     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE behavioral_snapshots ADD COLUMN right_click_count   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE behavioral_snapshots ADD COLUMN scroll_depth_y      INTEGER NOT NULL DEFAULT 0;
-- Phase B: Display brightness and night mode
ALTER TABLE behavioral_snapshots ADD COLUMN display_brightness  INTEGER NOT NULL DEFAULT -1;
ALTER TABLE behavioral_snapshots ADD COLUMN night_light_enabled INTEGER NOT NULL DEFAULT 0;
