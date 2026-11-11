-- Season phases follow classic periodization:
-- off-season, general preparation, specific preparation, pre-competition, competition.
-- Old pre-season loading is now pre-competition, old in-season is now competition.
ALTER TYPE "SeasonPhase" RENAME VALUE 'PRE_SEASON' TO 'PRE_COMPETITION';
ALTER TYPE "SeasonPhase" RENAME VALUE 'IN_SEASON' TO 'COMPETITION';
ALTER TYPE "SeasonPhase" ADD VALUE 'GENERAL_PREP' BEFORE 'PRE_COMPETITION';
ALTER TYPE "SeasonPhase" ADD VALUE 'SPECIFIC_PREP' BEFORE 'PRE_COMPETITION';
