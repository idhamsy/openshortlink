-- Force-password-change support (#11)
-- When set to 1, the user must set a new password before using the dashboard.
-- Optional per-user toggle set by an admin at create/edit time; cleared on change.
ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;
