-- Share aged 65+ and the vulnerability multiplier per subzone. Small subzones have null pct_65p and multiplier.
SELECT subzone_id, subzone_name, pln_area_n, hdb_residents, pct_65p, multiplier, is_super_aged
FROM hawkerreach.gold.subzone_seniors;
