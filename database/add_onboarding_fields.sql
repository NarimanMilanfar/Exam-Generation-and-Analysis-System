-- Add onboarding fields to User table
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "onboardingSkipped" BOOLEAN DEFAULT false;

-- Update existing users to have these fields set to false (default)
UPDATE "User" 
SET "onboardingCompleted" = false, "onboardingSkipped" = false 
WHERE "onboardingCompleted" IS NULL OR "onboardingSkipped" IS NULL; 