-- Subzone outlines drawn under every map, so it still reads when basemap tiles fail.
-- geometry is a GeoJSON string, simplified to about 15 m in 04_gold_access.
SELECT subzone_id, name, planning_area, geometry
FROM hawkerreach.gold.subzone_shapes;
