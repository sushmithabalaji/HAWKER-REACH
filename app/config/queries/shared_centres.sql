-- Centres for CentreSearch and the map: every operating centre, interim ones included
-- (they take diners as open neighbours but can't be picked to close).
SELECT centre_id, name, lon, lat, is_interim, pln_area_n
FROM hawkerreach.gold.centres
ORDER BY name;
