# Data collection & scientific use — MWPA

This guide describes **how** observational data is captured in MWPA, **what** each piece of data means, and **how to use it** for scientific analysis without overstating what the dataset can support.

The system was built around the workflow of [M.E.E.R. e.V.](https://m-e-e-r.de/) — opportunistic cetacean observations from research-tour vessels off La Gomera, Canary Islands. The data model is generic; the wording in this guide uses the La Gomera context as the running example.

> ⚠ This dataset is **opportunistic**, not survey-effort-controlled. See [Scientific use → Limitations](#limitations) before drawing inferences about absolute abundance, density or trends.

## Table of contents

1. [Data sources](#data-sources)
2. [Domain model](#domain-model)
3. [Field reference](#field-reference)
4. [Coordinate & time conventions](#coordinate--time-conventions)
5. [Derived data — movement tracks](#derived-data--movement-tracks)
6. [Quality flags](#quality-flags)
7. [Scientific use](#scientific-use)
8. [Export formats](#export-formats)
9. [Reproducibility checklist](#reproducibility-checklist)
10. [Citing the dataset](#citing-the-dataset)

## Data sources

| Source | Used for | Notes |
|---|---|---|
| **Mobile app** (Flutter, separate repo) | Live recording on the boat — tour start/end, sighting events, GPS track every few seconds, photos | Works offline; syncs back to the backend when network is available |
| **Web frontend** (`frontend/`) | Editing existing records, importing legacy data, exporting | Admin / reviewer use; corrections after the tour |
| **IM2020 importer** | One-time import of pre-existing fixed-column CSVs | Run via `--import` arg on backend start |
| **Provider services** (`backend/src/Service/`) | Auto-enriches each sighting with sea-depth (EMODnet / NOAA-ETOPO) and weather (Open-Meteo) at the sighting time / location | Background cron jobs, fields land in `sighting_extended` |

## Domain model

```
SightingTour                      one trip on one boat on one day
 ├── SightingTourTracking[]       raw GPS pings, ~every few seconds during the tour
 └── Sighting[]                   one entry per actual observation event
      ├── SightingExtended        derived bathymetry + weather (1:1)
      └── SightingMovement        derived per-sighting movement track (1:1) — see §5
           └── SightingMovementTrack[]   computed segments
```

A **tour** holds metadata that applies to the whole trip (boat, skipper, date, sea state). A **sighting** is one cetacean encounter inside that tour. **Tracking points** are background GPS pings that let the system reconstruct the boat's path during each sighting.

## Field reference

### Tour (`sighting_tour`)

| Column | Meaning |
|---|---|
| `date` | Calendar date `YYYY-MM-DD` |
| `tour_start` / `tour_end` | Departure / return time, `HH:MM` local Atlantic/Canary time |
| `vehicle_id` | Boat used (`vehicle.in_use=true` boats are the active fleet) |
| `vehicle_driver_id` | Skipper |
| `creater_id` | Observer who created the record |
| `record_by_persons` | JSON list of additional crew/observers not in the user table |
| `beaufort_wind` | Sea state (Beaufort scale) |
| `organization_id` | Owning organisation |

### Sighting (`sighting`)

| Column | Meaning |
|---|---|
| `tour_id` / `tour_fid` | Parent tour (internal id + mobile-side foreign id) |
| `date` | Sighting date — should match the tour |
| `tour_start` / `tour_end` | Copy of the parent tour's start/end (denormalised for fast filters) |
| `duration_from` / `duration_until` | Time the sighting started / ended, `HH:MM` local |
| `location_begin` / `location_end` | JSON `{latitude, longitude, timestamp, accuracy, heading, speed, ...}` captured by the mobile at sighting start / end. `timestamp` is `Date.now()` in UTC ms |
| `species_id` | Primary species — required for the record to count as a real sighting |
| `species_count` | Estimated number of animals (group size) |
| `juveniles` / `calves` / `newborns` | Counts of age classes |
| `behaviours` | JSON map of `BehaviouralStates` ids observed |
| `group_structure_id` | 1 = widely dispersed, 2 = dispersed, 3 = loose, 4 = tight |
| `subgroups` | Number of distinct subgroups within the group |
| `reaction_id` | `EncounterCategories` — how the animals reacted (interaction / no response / avoidance / proximity / unknown) |
| `freq_behaviour` | Frequent individual behaviours, free text JSON |
| `photo_taken` | Selector: yes / no / unknown |
| `recognizable_animals` | Free text — IDs of photo-recognisable individuals (e.g. dorsal fin notches) |
| `other_species` | JSON map of secondary species seen |
| `other_vehicle` | Other boats present, free text. Optionally a leading integer for "max boats" |
| `note` | Free text — anything else worth recording |
| `sighting_type` | NORMAL / SHORT / NOTICE / FREE |
| `unid` / `hash` | Mobile-side unique id / content hash (de-dupe on sync) |

### Sighting extended (`sighting_extended`, auto-filled)

Per-sighting environment lookup, refreshed by background services:

- `depth_m`, `depth_provider`, `depth_status` — bathymetry at the sighting location
- `sst_c_day`, `sst_c_hour` — sea-surface temperature (day mean + at the sighting hour)
- `air_temperature_c_day` / `_hour`, `uv_index_day` / `_hour`
- `wave_height_m_*`, `wave_period_s_*`, `wave_direction_deg_*`
- `weather_hour_used` — local-time hour the *_hour samples were taken from
- `provenance` — JSON: which provider produced which column

### Earthquakes & sighting × earthquake correlation

Earthquakes are imported hourly by `EarthquakeService` from two
FDSNWS-compatible catalogues:

- **USGS** — `earthquake.usgs.gov/fdsnws/event/1/query` (`format=geojson`), broad international coverage for M ≥ 4
- **EMSC** — `seismicportal.eu/fdsnws/event/1/query` (`format=json`), much denser regional reporting down to ~M 1.0 in the Canaries / Mediterranean

The same physical event can end up stored twice (once per provider, different `source_event_id`) — there is no stable cross-catalogue identifier, so the table keeps both rows with their own provenance.

`earthquake` table — one row per event per provider:

| Column | Meaning |
|---|---|
| `source` | `'usgs'` or `'emsc'` |
| `source_event_id` | Provider-stable event id |
| `event_time_ms` | Event origin time, ms-epoch UTC (BigInt; TypeORM returns it as a string) |
| `lat` / `lon` | Epicentre, WGS-84 decimal degrees |
| `depth_km` | Hypocentre depth, positive km (both providers' Z-conventions are normalised) |
| `magnitude` | Reported magnitude value |
| `magnitude_type` | Magnitude scale (e.g. `ml`, `mb`) |
| `place` | Free-text region name (e.g. `'CANARY ISLANDS, SPAIN REGION'`) |
| `url` | Event-detail page on the provider |

`sighting_seismic` correlation table — one row per (sighting × earthquake) pair within the configured window (currently **±200 km** and **±14 days** from each sighting's position + tour_start time):

| Column | Meaning |
|---|---|
| `sighting_id` | FK to `sighting.id` |
| `earthquake_id` | FK to `earthquake.id` |
| `distance_km` | Great-circle distance from sighting position to epicentre |
| `hours_offset` | Signed hours; **positive = earthquake before sighting** |
| `magnitude` | Denormalised snapshot of the earthquake's magnitude for fast filtering |

A unique index on `(sighting_id, earthquake_id)` deduplicates the pairs.

Notes:

- The import bbox for each org is the org's tracking-area centroid (or the org HQ if no tracking area is configured) expanded by **500 km** — wide enough to cover the Canaries archipelago + the Moroccan shelf from a single anchor point in the harbour.
- The minimum magnitude floor is **M 2.5** (USGS' "significant" feed threshold). Below that, USGS picks are mostly instrumental noise far away, but they ARE kept for the Canaries region thanks to EMSC's regional pickup.

## Coordinate & time conventions

- **Coordinates** are **WGS84 decimal degrees**. Longitude is signed (negative west).
- **Tracking timestamps** (`sighting_tour_tracking.create_datetime`, `location_*.timestamp`) are **absolute UTC** — Unix-seconds, or for `location_*` the JSON `timestamp` field is Unix-milliseconds.
- **HH:MM strings** (`tour_start`, `duration_from`, …) are **Atlantic/Canary local time** — written by the user on the mobile. They are not timezone-tagged in the database. Tools that need to align HH:MM with UTC timestamps must convert explicitly.
- The corrected `UtilPosition.LatDec/LonDec` axis mapping has been in effect since 2026-05-08 — older Excel exports may have lat/lon swapped on the coordinate columns; the in-product exports are correct.

## Derived data — movement tracks

Each sighting with a valid species gets a computed **movement** (`sighting_movement` + `sighting_movement_track`) describing the boat's path during the sighting window. This is **derived state**, rebuilt automatically from raw data — never edit the tables by hand.

How it is computed (`SightingMovementService`):

1. **Time window** is resolved per sighting:
   - Prefer the GPS-fix timestamps in `location_begin.timestamp` + `location_end.timestamp` (UTC ms — same clock as the tracking points).
   - Fall back to `duration_from`/`duration_until` (HH:MM local) parsed against `sighting.date` when those timestamps are missing (e.g. CSV-imported legacy rows). This path is timezone-sensitive.
   - The window is widened by `default_lead_minutes` / `default_trail_minutes` (defaults 5 + 5 min) for context.
2. **Tracking points** of the parent tour falling inside the window are loaded and ordered by time.
3. **Segments** are built from each consecutive pair: distance (Haversine), duration, speed, heading (initial bearing), turning angle vs the previous segment.
4. **Outliers** — segments whose speed exceeds `outlier_speed_kmh` (default 50 km/h) are flagged `quality='bad'`; kept in the data but excluded from aggregates.
5. **Aggregates** (header row): total distance / duration, avg / max speed, circular mean of headings (dominant heading), bbox, source tag.

Sightings without tracking points fall back to `source='manual_begin_end'`: a single segment from `location_begin` → `location_end`.

## Quality flags

- `vehicle.in_use=false` — vehicle retired from operational pickers (still referenced by historical sightings)
- `sighting.deleted=true` — soft-deleted observation; excluded from movement derivation
- `sighting_movement.source` — `tracking` (real path), `manual_begin_end` (two-point fallback), `hybrid` (reserved)
- `sighting_movement_track.quality` — `good` or `bad` (GPS jump suspect)
- `*_status` columns (`depth_status`, `weather_status`) — `ok` / `land` / `invalid_location` / `no_data` / empty (= never tried)

## Scientific use

### Recommended analyses

- **Species occurrence**: filter sightings by `species_id` over a period; export to Excel for further work in R / Python / GIS.
- **Group size & demography**: `species_count`, `juveniles`, `calves`, `newborns`, `subgroups`, `group_structure_id`.
- **Spatial distribution**: `location_begin` for all sightings, paired with `sighting_extended.depth_m` and SST for habitat-association analyses.
- **Behavioural patterns**: `behaviours` (JSON of `BehaviouralStates`), `reaction_id` (`EncounterCategories`).
- **Movement / kinematics**: `sighting_movement_track` segments — speed distributions, turning-angle histograms, heading rose diagrams, residency-time proxies.
- **Year-on-year comparison**: built-in Year-comparison tab uses the same `loadedEntries` as the rest of the page.
- **Behavioural response to seismic events** — pair sightings with nearby earthquakes (±14 d / ±200 km) and inspect the signed hours-offset distribution. Strongly positive skew suggests delayed-response patterns.

### Limitations

- **Effort is not measured.** Sighting frequency depends on tour route, weather, observer skill, and how long the boat actually spent observing. Always normalise by tour-hours or tour-distance before reporting rates.
- **Detection bias.** Larger species, surface-active species, and species nearer the surface are over-represented.
- **Position accuracy.** Phone GPS accuracy varies (~3–10 m typical, much worse at start of tour or near cliffs). The `accuracy` field in `location_*` JSON is the device's own estimate.
- **Time-zone caveat.** HH:MM fields are Atlantic/Canary local; if you join these against UTC timestamps, convert.
- **Identifying individuals.** `recognizable_animals` is free text; not a structured photo-ID database. Treat as a pointer to external photo-ID work, not a primary individual identifier.
- **Derived movements** require both `location_begin.timestamp` and tracking points; sightings imported without timestamps fall back to a 2-point straight line that is not a real path.
- **GPS-jump segments** (`quality='bad'`) are flagged, not removed. Always filter `quality='good'` for speed / heading distributions.

## Export formats

- **Excel — Sightings list** (`/json/sightings/list/excel`): full per-sighting table with column picker + coordinate-format selector. Includes an **Info sheet** documenting the active filter, generation timestamp, and the lat/lon-swap-fix note. Use this as the primary scientific export.
- **AROC office report** (`/json/officereport/create_export`): fills the Canary regional authority's `PLANTILLA_AVISTAMIENTOS_AROC.xlsx` template. One file per boat per half-year, with `datos GENERALES` and `datos SALIDAS` sheets pre-filled. Submitted to AROC as the regulatory deliverable.
- **Data Page (PDF)**: a single printable sheet with Map + Analytics + Year-comparison panels — uses the browser's "Save as PDF".

## Reproducibility checklist

When citing or sharing a numeric result derived from MWPA:

1. **Record the export filter** (period, species, organisation, vehicle, driver, search term). The Excel export's Info sheet captures these automatically.
2. **Record the export timestamp** — sighting data can be edited after the fact and re-exports will pick up corrections.
3. **State the row count** — Info sheet has it.
4. **State whether `quality='bad'` movement segments were included** for any movement-derived metric.
5. **State the timezone interpretation** used for any HH:MM field.
6. Keep the raw Excel file alongside the publication / report so the analysis is reproducible from the same starting point.

## Citing the dataset

If you publish work based on MWPA data, please:

1. **Acknowledge M.E.E.R. e.V.** as the data provider — [m-e-e-r.de](https://m-e-e-r.de/).
2. Cite the **collection period** (start date / end date of the included sightings) rather than the tool version.
3. Contact M.E.E.R. e.V. for a project-specific data-use agreement before publication.

---

Further reading: [Database schema](https://dbdiagram.io/d/5dfa98f1edf08a25543f3bcc) · [REST API documentation](https://swe.stoplight.io/docs/mwpa/) · [Project wiki](https://github.com/M-E-E-R-e-V/mwpa/wiki)