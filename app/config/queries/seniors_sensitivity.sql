-- Seniors cut off if each centre closed alone, at each time limit, for the "If the limit were 10 or 20 min" line.
SELECT closed_centre_id, limit_min, seniors_cut_off
FROM hawkerreach.gold.access_sensitivity;
