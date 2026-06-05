-- Migration patch to add progress tracking columns to sourcing_runs
ALTER TABLE sourcing_runs ADD COLUMN IF NOT EXISTS current_phase TEXT;
ALTER TABLE sourcing_runs ADD COLUMN IF NOT EXISTS progress_percent INTEGER;
ALTER TABLE sourcing_runs ADD COLUMN IF NOT EXISTS total_jobs INTEGER;
ALTER TABLE sourcing_runs ADD COLUMN IF NOT EXISTS jobs_completed INTEGER;
ALTER TABLE sourcing_runs ADD COLUMN IF NOT EXISTS total_expected_enrichments INTEGER;
