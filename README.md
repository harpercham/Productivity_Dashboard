# DSM Productivity Dashboard Static v14.23 - Match Key Column Lookup

Changes:
- Dashboard uses helper `Match Key` column directly when present in both allocation ST tabs and Daily Point Update.
- Match Key format: `ST|Point No`, e.g. `ST101|J-R10-56` or `101|J-R10-56`.
- Matching is still dictionary/set based with exact `Set.has()` lookup.
- If Match Key is missing, dashboard falls back to exact `ST + Point No` key generation.
- No VLOOKUP/MATCH/includes/partial point matching for completion scope.
