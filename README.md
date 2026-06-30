# DSM Productivity Dashboard — Static Web Page

This static dashboard links to the `Daily Point Update` tab in the GH, TH, TKG and ET subcontractor Google Sheets.

## Features

- Dashboard cards for completed points, active rigs, active STs, working days, LG net, MG net, average points/day and average net volume/day.
- Productivity chart by rig with selectable metric.
- Productivity chart by ST with selectable metric.
- Daily completed-points, LG-net and MG-net trend.
- Filters by date, subcontractor, rig, ST and DSM type.
- Ranked productivity tables by rig and ST.
- Filtered CSV export.
- Google Sheet link buttons and locally saved link settings.
- CSV upload fallback when a Google Sheet is private.

## Google Sheet setup

The default source is:

- Tab: `Daily Point Update`
- Range: `A3:AE`

For direct loading, the Google Sheet must be readable through its public or link-viewable Google visualization CSV endpoint. When company policy does not allow public access, export the `Daily Point Update` tab as CSV and use the CSV fallback field.

## Hosting on GitHub Pages

Upload these files to the root of a repository:

- `index.html`
- `styles.css`
- `app.js`

Enable GitHub Pages from the repository’s `main` branch and `/(root)` folder.

The page uses Chart.js from a public HTTPS CDN, so internet access is required.

## Calculation rules

- A completed point requires a valid date and point reference.
- `INVALID...` and `CHECK MAPPING` design-zone rows are excluded.
- Points are de-duplicated by source + ST + point reference.
- Active days are distinct completion dates within the selected filters.
- Points/day = unique completed points ÷ active days.
- Net m³/day = (LG net + MG net) ÷ active days.
- LG net and MG net are summed from the daily net columns in each subcontractor sheet.
