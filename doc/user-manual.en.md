# MWPA — User Manual

<p align="center">
  <img src="public/whale-ico.png" width="100" alt="MWPA" />
</p>

This guide walks you through the MWPA web frontend page by page.
For the data model, field semantics and scientific use of the dataset
see [Data collection & scientific use](data-collection.en.md).

> Languages: **English** · [Deutsch](user-manual.de.md) · [Español](user-manual.es.md)

## Contents

1. [Login](#1-login)
2. [Navigation](#2-navigation)
3. [Sighting list](#3-sighting-list)
4. [Tours](#4-tours)
5. [Tours External](#5-tours-external)
6. [Ocean & Fishing map](#6-ocean--fishing-map)
7. [Live AIS map](#7-live-ais-map)
8. [Earthquakes & impact analysis](#8-earthquakes--impact-analysis)
9. [Admin → Users](#9-admin--users)
10. [Admin → User Groups](#10-admin--user-groups)
11. [Admin → Roles](#11-admin--roles)
12. [Admin → Organization](#12-admin--organization)
13. [Admin → Species](#13-admin--species)
14. [Admin → Vehicle](#14-admin--vehicle)
15. [Admin → Encounters](#15-admin--encounters)
16. [Admin → Devices](#16-admin--devices)
17. [Tours → Orphan tracks](#17-tours--orphan-tracks)
18. [Admin → External Tour Sources](#18-admin--external-tour-sources)
19. [Admin → Services](#19-admin--services)

---

## 1. Login

Open the web app in your browser (default `https://localhost:3000/`) and
sign in with your e-mail address and password. The default administrator
account that ships with a fresh installation is:

| Field    | Value                |
|----------|----------------------|
| E-mail   | `admin@mwpa.org`     |
| Password | `changeMyPassword`   |

> **Change this password immediately after the first login.**

<p align="center">
  <img src="screenshots/manual/00-login.png" width="640" alt="Login screen" />
</p>

After successful sign-in you land on the **Sighting** list.

---

## 2. Navigation

The interface follows the AdminLTE layout:

- **Left sidebar** — main navigation tree. Top-level groups (e.g. *Tours*, *Admin*) expand on click.
- **Top bar (right)** — language switcher (EN / DE / ES), fullscreen toggle, logout.
- **User panel** in the sidebar — current user; click the name to open the profile.
- **Footer** — version number and link to the GitHub project.

The sidebar toggle button (≡) next to the page title collapses the sidebar
to icons-only mode for more screen space on small displays.

---

## 3. Sighting list

The default landing page. Every observation event recorded on a tour appears as one row.

<p align="center">
  <img src="screenshots/manual/01-sighting.png" width="900" alt="Sighting list" />
</p>

Columns include tour id, date, vehicle/organisation, species, group size,
duration, location, behaviour and reaction. Tabs above the table switch
between:

- **List** — tabular view (shown above), sortable per column, with in-header search.
- **Map** — sighting markers on the map plus the derived movement tracks.
- **Analytics** — crossfilter dashboard (date, species, vehicle, driver, …).
- **Year comparison** — distribution charts year-over-year.
- **Export** — Excel export with column picker and coordinate-format selector.

The **+ Add tour** button at the top creates a new tour (sightings are
normally entered from the mobile app, but a tour wrapper can be added here).

The row-end action menu (☰) opens the **Edit sighting** modal with the
full field list, photo gallery and the derived bathymetry / weather data.

---

## 4. Tours

Each row is one trip on one boat on one day — see the [data model](data-collection.en.md#domain-model).

<p align="center">
  <img src="screenshots/manual/02-tours.png" width="900" alt="Tours list" />
</p>

Visible columns: tour id, date, vehicle + driver, time begin/end, sighting
count, GPS tracking-point count, persons on board, source device and the
creator. Use **+ Add tour** for a manual entry; the action menu lets you
edit, delete or export the tour.

---

## 5. Tours External

A sub-section of *Tours* that lists trips imported from external
providers (e.g. FareHarbor). The table looks like the regular Tours
list but with the additional **External source** and **External id**
columns. These rows are read-only with respect to the source; you can
attach a local vehicle / driver to enrich the record.

<p align="center">
  <img src="screenshots/manual/03-tours-external.png" width="900" alt="Tours External" />
</p>

---

## 6. Ocean & Fishing map

Shows every sighting on a sea-bathymetry basemap, with sea-surface salinity,
chlorophyll-a, sea-level anomaly and surface-current layers from ERDDAP, plus
the GFW fishing-effort overlay.

<p align="center">
  <img src="screenshots/manual/04-ocean-fishing-map.png" width="900" alt="Ocean & Fishing map" />
</p>

The **Data sources** panel on the right lets you toggle the base maps
and overlays. The bottom strip shows distribution / fishing-effort /
monthly-mean charts for the visible sightings.

---

## 7. Live AIS map

Real-time vessel positions from AISStream.io overlaid on the same
basemap. Click a vessel marker to open its recent trail.

<p align="center">
  <img src="screenshots/manual/05-ais-live-map.png" width="900" alt="Live AIS map" />
</p>

---

## 8. Earthquakes & impact analysis

*Admin-only.* Imports earthquakes hourly from the FDSNWS catalogues of
**USGS** (global coverage) and **EMSC** (dense regional reporting for
the Canaries / Mediterranean, down to ~M 1.0) and correlates them with
every sighting within ±14 days and 200 km.

**Filter card:**
- Period from / to + min. magnitude — populates the earthquake table
  and renders them as circles on the map (radius by magnitude, hue by
  depth: shallow = red, deep = ochre).
- **± window** — dropdown with five options:
  - *Do not show sightings* (default — earthquake list only)
  - **±24 h** — acute stress response (strandings, P/S-wave effects)
  - **±3 days** — short-term behavioural shift
  - **±7 days** — medium-term displacement / migration
  - **±14 days** — broad — catches delayed effects, noisy

As soon as a window other than "none" is selected the page loads the
impact analysis across **all** earthquakes in the current table:

- The affected sightings are rendered as markers on the map (tooltip
  with species, Δ km, Δ h)
- Per sighting the computed movement track is overlaid as a polyline
- An **analysis** card below the map area shows four bar charts:
  sightings by species, by behavioural state, by encounter category,
  and a time-offset histogram (signed hours — positive = quake before
  sighting)

**No manual import button:** the hourly cron pulls new events
automatically. On cold-start of a new provider the backfill begins at
the oldest sighting date minus 30 days.

**Recorrelate** (button on the right of the filter bar): walks the
entire `earthquake` table once and rewrites the `sighting_seismic`
correlations — only needed after a change to `CORRELATION_RADIUS_KM`
or `CORRELATION_WINDOW_DAYS` in the code.

---

## 9. Admin → Users

Manage operator accounts.

<p align="center">
  <img src="screenshots/manual/06-admin-users.png" width="900" alt="Users admin" />
</p>

Each user has an id, username, full name, e-mail, main group, admin flag
and *active / disabled* status. **+ Add User** opens the edit modal where
you can also assign secondary groups and reset the password.

---

## 10. Admin → User Groups

Groups bind a *role* (admin / importer / driver / guide …) to an
*organisation*. A user can belong to multiple groups but always has
exactly one *main group*.

<p align="center">
  <img src="screenshots/manual/07-admin-user-groups.png" width="900" alt="User Groups" />
</p>

---

## 11. Admin → Roles

Roles define the set of rights (RBAC) available in the system. New
rights have to be added in [`schemas/schemas.json`](../schemas/schemas.json)
via the vtseditor — they are not free text.

<p align="center">
  <img src="screenshots/manual/08-admin-roles.png" width="900" alt="Roles" />
</p>

---

## 12. Admin → Organization

The owning entity for vehicles, drivers, tours and sightings.
A single MWPA instance can serve multiple organisations.

<p align="center">
  <img src="screenshots/manual/09-admin-organization.png" width="900" alt="Organization" />
</p>

---

## 13. Admin → Species

Master list of cetaceans (and other animals) that observers can select
from. Each species belongs to a **species group** (Odontoceti / Mysticeti /
…) and may carry an external **OTT id** for taxonomy linkage.

<p align="center">
  <img src="screenshots/manual/10-admin-species.png" width="900" alt="Species" />
</p>

---

## 14. Admin → Vehicle

Boats in the fleet. Only entries with **In use** = true are offered when
a new tour is started.

<p align="center">
  <img src="screenshots/manual/11-admin-vehicle.png" width="900" alt="Vehicle" />
</p>

---

## 15. Admin → Encounters

Encounter categories used in the **Reaction** field of a sighting —
*Interaction*, *No Response*, *Avoidance*, *Proximity*, *Unknown* etc.

<p align="center">
  <img src="screenshots/manual/12-admin-encounters.png" width="900" alt="Encounters" />
</p>

---

## 16. Admin → Devices

Mobile devices that have synced with the backend (one row per
install). Used to trace which physical phone / tablet uploaded a tour.

<p align="center">
  <img src="screenshots/manual/13-admin-devices.png" width="900" alt="Devices" />
</p>

---

## 17. Tours → Orphan tracks

*Admin-only.* Available in the **Tours** sub-menu. Lists pending
tracking buckets (`sighting_tour_tracking_pending`) that could not be
attached to a `SightingTour` — typical when crew or boat are corrected
in the portal after the trip and the GPS points stay anchored to the
old `tour_fid`.

<p align="center">
  <img src="screenshots/manual/16-admin-orphan-tracks.png" width="900" alt="Orphan tracks" />
</p>

**Assign modal:** clicking a row opens a dialog with four pickers
(vehicle, driver, date, tour start) and a match list of fitting tours.
Below that a small **map preview** of the bucket contents (polyline
through all decoded positions + start / end markers + time-span line)
so you can tell at a glance whether the data belongs to a real tour
or is just GPS noise.

- **Assign** moves the pending rows into `sighting_tour_tracking` of
  the chosen target and triggers a `SightingMovement` recompute.
- **Delete bucket** drops the pending rows entirely — useful for test
  rides, harbour drift or obviously broken GPS traces.

---

## 18. Admin → External Tour Sources

Configures third-party tour providers (e.g. FareHarbor) that feed the
[Tours External](#5-tours-external) list. Each row stores the provider
type, credentials and a polling interval.

<p align="center">
  <img src="screenshots/manual/14-admin-external-tour.png" width="900" alt="External Tour Sources" />
</p>

---

## 19. Admin → Services

Status dashboard for the backend service-manager. Runners (e.g.
`mariadb`, `httpserver`) keep the platform up; schedulers (`depth`,
`weather`, `ocean`, `fishing-effort`, `external-tour`, `live-ais`) refresh
derived data on a cron expression.

<p align="center">
  <img src="screenshots/manual/15-admin-services.png" width="900" alt="Services" />
</p>

Use the action menu on a row to trigger a manual run or to inspect the
last execution log.

---

## Further reading

- [Data collection & scientific use](data-collection.en.md) — what each field means and how to use the exports for research.
- [Project wiki](https://github.com/M-E-E-R-e-V/mwpa/wiki) — installation, deployment, AROC workflow.
- [REST API reference](https://swe.stoplight.io/docs/mwpa/) — full endpoint documentation.