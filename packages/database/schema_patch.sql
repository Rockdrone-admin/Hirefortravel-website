-- Add internal fields to jobs table for private company targeting and competitor mapping in AI workflow
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS real_company_name TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS competitors TEXT[] DEFAULT '{}'::text[];
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS alternative_titles TEXT[] DEFAULT '{}'::text[];

-- Add helpful comments to the columns
COMMENT ON COLUMN jobs.real_company_name IS 'Mandatory field (For Internal Use Only) containing the actual hiring company name for AI query generation and candidate scoring.';
COMMENT ON COLUMN jobs.competitors IS 'Mandatory field (For Internal Use Only) containing the list of competitor companies to target for AI sourcing and suitability grading.';
COMMENT ON COLUMN jobs.alternative_titles IS 'Alternative job titles used by the AI sourcing workflow for search query generation.';

-- Add number of openings column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS number_of_openings INTEGER DEFAULT 1;
COMMENT ON COLUMN jobs.number_of_openings IS 'The number of available openings/positions for this job role.';

-- Add notes column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS notes TEXT[] DEFAULT '{}'::text[];
COMMENT ON COLUMN jobs.notes IS 'Optional field containing custom notes about the job role, displayed in bulleted form below the About the Role section.';


