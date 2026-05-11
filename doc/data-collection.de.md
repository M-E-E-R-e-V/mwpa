# Datenerhebung & wissenschaftliche Nutzung — MWPA

Diese Anleitung beschreibt, **wie** Beobachtungsdaten in MWPA erhoben werden, **was** die einzelnen Felder bedeuten und **wie** sie sich wissenschaftlich auswerten lassen, ohne dass aus dem Datensatz mehr abgeleitet wird als er hergibt.

Das System wurde rund um den Arbeitsablauf von [M.E.E.R. e.V.](https://m-e-e-r.de/) aufgebaut — opportunistische Wal- und Delfin-Beobachtungen von Forschungstouren vor La Gomera (Kanaren). Das Datenmodell ist generisch; die Anleitung benutzt La Gomera als laufendes Beispiel.

> ⚠ Der Datensatz ist **opportunistisch** und nicht effort-kontrolliert. Vor jeder Aussage zu absoluten Bestandszahlen, Dichten oder Trends bitte den Abschnitt [Wissenschaftliche Nutzung → Einschränkungen](#einschränkungen) lesen.

## Inhalt

1. [Datenquellen](#datenquellen)
2. [Domänenmodell](#domänenmodell)
3. [Feld-Referenz](#feld-referenz)
4. [Koordinaten- & Zeit-Konventionen](#koordinaten---zeit-konventionen)
5. [Abgeleitete Daten — Bewegungs-Tracks](#abgeleitete-daten--bewegungs-tracks)
6. [Qualitäts-Flags](#qualitäts-flags)
7. [Wissenschaftliche Nutzung](#wissenschaftliche-nutzung)
8. [Export-Formate](#export-formate)
9. [Reproduzierbarkeits-Checkliste](#reproduzierbarkeits-checkliste)
10. [Datensatz zitieren](#datensatz-zitieren)

## Datenquellen

| Quelle | Verwendung | Hinweise |
|---|---|---|
| **Mobile App** (Flutter, separates Repo) | Live-Erfassung an Bord — Tour-Start/Ende, Sichtungs-Events, GPS-Track im Sekundenbereich, Fotos | Funktioniert offline; synct sich mit dem Backend sobald Netz verfügbar ist |
| **Web-Frontend** (`frontend/`) | Bearbeiten bestehender Datensätze, Import historischer Daten, Export | Admin / Reviewer-Workflow; Korrekturen nach der Tour |
| **IM2020-Importer** | Einmaliger Import vorhandener Spaltenfest-CSVs | Wird per `--import` beim Backend-Start aufgerufen |
| **Provider-Services** (`backend/src/Service/`) | Reichert jede Sichtung automatisch mit Seetiefe (EMODnet / NOAA-ETOPO) und Wetter (Open-Meteo) am Sichtungs-Ort/-Zeitpunkt an | Hintergrund-Cron, schreibt in `sighting_extended` |

## Domänenmodell

```
SightingTour                      eine Tour mit einem Boot an einem Tag
 ├── SightingTourTracking[]       rohe GPS-Punkte im Sekundenraster über die ganze Tour
 └── Sighting[]                   eine Zeile pro tatsächlicher Sichtung
      ├── SightingExtended        abgeleitete Bathymetrie + Wetter (1:1)
      └── SightingMovement        abgeleiteter Bewegungstrack pro Sichtung (1:1) — siehe §5
           └── SightingMovementTrack[]   berechnete Segmente
```

Eine **Tour** hält die Metadaten der gesamten Fahrt (Boot, Skipper, Datum, Seegang). Eine **Sichtung** ist eine einzelne Begegnung innerhalb dieser Tour. **Tracking-Punkte** sind die GPS-Hintergrund-Pings, die es dem System erlauben, den Bootspfad während jeder Sichtung zu rekonstruieren.

## Feld-Referenz

### Tour (`sighting_tour`)

| Spalte | Bedeutung |
|---|---|
| `date` | Kalenderdatum `YYYY-MM-DD` |
| `tour_start` / `tour_end` | Abfahrts- / Rückkehrzeit, `HH:MM` Atlantic/Canary local |
| `vehicle_id` | Eingesetztes Boot (`vehicle.in_use=true` = aktive Flotte) |
| `vehicle_driver_id` | Skipper |
| `creater_id` | Beobachter, der die Tour angelegt hat |
| `record_by_persons` | JSON-Liste weiterer Crew/Beobachter, die nicht User sind |
| `beaufort_wind` | Seegang (Beaufort) |
| `organization_id` | Eigentümer-Organisation |

### Sichtung (`sighting`)

| Spalte | Bedeutung |
|---|---|
| `tour_id` / `tour_fid` | Übergeordnete Tour (interne ID + Mobile-Fremdschlüssel) |
| `date` | Sichtungsdatum — sollte zum Tour-Datum passen |
| `tour_start` / `tour_end` | Kopie aus der Eltern-Tour (denormalisiert für schnelle Filter) |
| `duration_from` / `duration_until` | Start- / Endzeit der Sichtung, `HH:MM` local |
| `location_begin` / `location_end` | JSON `{latitude, longitude, timestamp, accuracy, heading, speed, …}` vom Handy am Sichtungs-Beginn/-Ende. `timestamp` ist `Date.now()` in UTC ms |
| `species_id` | Hauptspezies — Voraussetzung, damit der Eintrag als echte Sichtung zählt |
| `species_count` | Geschätzte Anzahl Tiere (Gruppengröße) |
| `juveniles` / `calves` / `newborns` | Anzahl Jungtiere / Kälber / Neugeborene |
| `behaviours` | JSON-Map mit `BehaviouralStates`-IDs |
| `group_structure_id` | 1 = weit verteilt, 2 = verteilt, 3 = locker, 4 = dicht |
| `subgroups` | Anzahl unterscheidbarer Untergruppen |
| `reaction_id` | `EncounterCategories` — Reaktion der Tiere (Interaktion / keine Reaktion / Ausweichen / Annäherung / unbekannt) |
| `freq_behaviour` | Häufige Einzeltier-Verhaltensweisen, JSON Freitext |
| `photo_taken` | Auswahl: ja / nein / unbekannt |
| `recognizable_animals` | Freitext — IDs fotografierbar identifizierter Individuen (z. B. Finnen-Kerben) |
| `other_species` | JSON-Map mit weiteren beobachteten Spezies |
| `other_vehicle` | Andere Boote vor Ort, Freitext. Optional führende Zahl für „max. Boote" |
| `note` | Freitext — alles Weitere Relevante |
| `sighting_type` | NORMAL / SHORT / NOTICE / FREE |
| `unid` / `hash` | Mobile-Unique-ID / Content-Hash (Dedupe bei Sync) |

### Sighting Extended (`sighting_extended`, automatisch befüllt)

Pro-Sichtung-Umweltdaten, von Hintergrund-Services aktualisiert:

- `depth_m`, `depth_provider`, `depth_status` — Bathymetrie am Sichtungsort
- `sst_c_day`, `sst_c_hour` — Meeresoberflächentemperatur (Tagesmittel + zur Sichtungs-Stunde)
- `air_temperature_c_day` / `_hour`, `uv_index_day` / `_hour`
- `wave_height_m_*`, `wave_period_s_*`, `wave_direction_deg_*`
- `weather_hour_used` — Lokal-Stunde aus der die *_hour-Werte stammen
- `provenance` — JSON: welcher Provider hat welche Spalte geliefert

## Koordinaten- & Zeit-Konventionen

- **Koordinaten** sind **WGS84 Dezimalgrad**. Längengrad ist signiert (westlich = negativ).
- **Tracking-Zeitstempel** (`sighting_tour_tracking.create_datetime`, `location_*.timestamp`) sind **absolute UTC** — Unix-Sekunden bzw. bei `location_*` Unix-Millisekunden im JSON-`timestamp`-Feld.
- **HH:MM-Strings** (`tour_start`, `duration_from`, …) sind **Atlantic/Canary local time** — vom Beobachter am Handy eingetragen. Sie tragen keine Zeitzone in der DB. Tools, die HH:MM mit UTC-Zeitstempeln verknüpfen, müssen explizit umrechnen.
- Die korrigierte Achsen-Zuordnung in `UtilPosition.LatDec/LonDec` ist seit 2026-05-08 aktiv. Ältere Excel-Exporte vor diesem Datum können vertauschte lat/lon-Werte enthalten; produktive In-App-Exporte sind korrekt.

## Abgeleitete Daten — Bewegungs-Tracks

Jede Sichtung mit gesetzter Spezies bekommt eine berechnete **Movement-Row** (`sighting_movement` + `sighting_movement_track`), die den Bootspfad während des Sichtungs-Zeitfensters beschreibt. Das ist **abgeleitete Information**, wird automatisch aus den Rohdaten neu gebaut — **niemals von Hand editieren**.

So wird gerechnet (`SightingMovementService`):

1. **Zeit-Fenster** wird pro Sichtung aufgelöst:
   - Bevorzugt aus den GPS-Fix-Zeitstempeln in `location_begin.timestamp` + `location_end.timestamp` (UTC ms — gleiche Uhrenquelle wie die Tracking-Punkte).
   - Fallback: `duration_from`/`duration_until` (HH:MM local), zusammen mit `sighting.date` geparst, wenn die Timestamps fehlen (z. B. CSV-Imports). Dieser Pfad ist zeitzonen-empfindlich.
   - Das Fenster wird um `default_lead_minutes` / `default_trail_minutes` (Default 5 + 5 min) erweitert.
2. **Tracking-Punkte** der Eltern-Tour, die ins Fenster fallen, werden geladen und nach Zeit sortiert.
3. **Segmente** werden aus aufeinanderfolgenden Paaren gebaut: Distanz (Haversine), Dauer, Geschwindigkeit, Heading (Anfangsbearing), Turning-Angle vs vorheriges Segment.
4. **Outlier** — Segmente, deren Geschwindigkeit `outlier_speed_kmh` (Default 50 km/h) überschreitet, werden als `quality='bad'` markiert; sie bleiben in der Tabelle, fließen aber nicht in die Aggregate ein.
5. **Aggregate** (Header-Zeile): Gesamtdistanz / -dauer, Durchschnitts- / Maximalgeschwindigkeit, zirkulärer Mean der Headings (dominantes Heading), Bounding-Box, Source-Tag.

Sichtungen ohne Tracking-Punkte fallen auf `source='manual_begin_end'` zurück: ein einzelnes Segment von `location_begin` → `location_end`.

## Qualitäts-Flags

- `vehicle.in_use=false` — Boot operativ ausgemustert (alte Sichtungen referenzieren es weiter)
- `sighting.deleted=true` — soft-gelöschte Beobachtung; wird von der Movement-Ableitung ignoriert
- `sighting_movement.source` — `tracking` (echter Pfad), `manual_begin_end` (2-Punkt-Fallback), `hybrid` (reserviert)
- `sighting_movement_track.quality` — `good` oder `bad` (GPS-Sprung verdächtig)
- `*_status`-Spalten (`depth_status`, `weather_status`) — `ok` / `land` / `invalid_location` / `no_data` / leer (= noch nie versucht)

## Wissenschaftliche Nutzung

### Empfohlene Auswertungen

- **Vorkommen einer Spezies**: Sichtungen nach `species_id` und Zeitraum filtern; Excel-Export für Weiterverarbeitung in R / Python / GIS.
- **Gruppengröße & Demografie**: `species_count`, `juveniles`, `calves`, `newborns`, `subgroups`, `group_structure_id`.
- **Räumliche Verteilung**: `location_begin` aller Sichtungen, gekoppelt mit `sighting_extended.depth_m` und SST für Habitat-Assoziations-Analysen.
- **Verhaltensmuster**: `behaviours` (JSON über `BehaviouralStates`), `reaction_id` (`EncounterCategories`).
- **Bewegung / Kinematik**: `sighting_movement_track`-Segmente — Geschwindigkeits-Verteilungen, Turning-Angle-Histogramme, Heading-Rose-Diagramme, Aufenthaltszeit-Proxies.
- **Jahresvergleich**: Eingebauter Year-Comparison-Tab arbeitet auf dem gleichen Datensatz wie die Karte.

### Einschränkungen

- **Effort wird nicht gemessen.** Sichtungsfrequenz hängt vom Tour-Verlauf, Wetter, Beobachter-Erfahrung und tatsächlicher Beobachtungszeit ab. Vor jeder Raten-Aussage durch Tour-Stunden oder Tour-Distanz normalisieren.
- **Detection-Bias.** Größere Spezies, oberflächenaktive Arten und solche, die näher an der Oberfläche bleiben, sind überrepräsentiert.
- **Positionsgenauigkeit.** Handy-GPS variiert (~3–10 m typisch, deutlich schlechter am Tour-Anfang oder in Steilküsten-Nähe). Das `accuracy`-Feld in `location_*` ist die Geräte-Eigeneinschätzung.
- **Zeitzonen-Vorbehalt.** HH:MM-Felder sind Atlantic/Canary local; beim Join mit UTC-Zeitstempeln immer umrechnen.
- **Individuen-Identifikation.** `recognizable_animals` ist Freitext; **keine** strukturierte Photo-ID-Datenbank. Als Verweis auf externe Photo-ID-Arbeit verstehen, nicht als primäre Individuen-Kennung.
- **Abgeleitete Movements** benötigen sowohl `location_begin.timestamp` als auch Tracking-Punkte; ohne Timestamps fällt das System auf eine 2-Punkt-Linie zurück — das ist kein echter Bewegungspfad.
- **GPS-Sprung-Segmente** (`quality='bad'`) werden gekennzeichnet, nicht entfernt. Für Geschwindigkeits- / Heading-Verteilungen immer auf `quality='good'` filtern.

## Export-Formate

- **Excel — Sichtungsliste** (`/json/sightings/list/excel`): vollständige Sichtungs-Tabelle mit Spalten-Picker + Koordinatenformat-Auswahl. Enthält ein **Info-Sheet** mit aktivem Filter, Erstellungs-Zeitstempel und Hinweis auf die lat/lon-Korrektur. **Primärer wissenschaftlicher Export.**
- **AROC-Behördenbericht** (`/json/officereport/create_export`): füllt die `PLANTILLA_AVISTAMIENTOS_AROC.xlsx`-Vorlage der Kanaren-Behörde. Eine Datei pro Boot pro Halbjahr, mit vorbefüllten Sheets `datos GENERALES` und `datos SALIDAS`. Pflicht-Abgabe an AROC.
- **Datenblatt (PDF)**: ein druckbares Blatt mit Karte + Auswertung + Jahresvergleich — Browser-Druckdialog ("Als PDF speichern").

## Reproduzierbarkeits-Checkliste

Beim Zitieren oder Teilen eines numerischen Ergebnisses aus MWPA:

1. **Export-Filter dokumentieren** (Zeitraum, Spezies, Organisation, Boot, Skipper, Suchterm). Das Info-Sheet im Excel hält das automatisch fest.
2. **Export-Zeitstempel dokumentieren** — Sichtungs-Daten können nachträglich korrigiert werden, ein erneuter Export greift diese Korrekturen auf.
3. **Zeilenzahl angeben** — steht im Info-Sheet.
4. **Angeben, ob `quality='bad'`-Segmente** in Movement-basierten Metriken enthalten waren.
5. **Zeitzonen-Interpretation** der HH:MM-Felder dokumentieren.
6. Die rohe Excel-Datei zusammen mit der Publikation aufbewahren — damit die Auswertung vom selben Ausgangspunkt nachvollziehbar ist.

## Datensatz zitieren

Bei Veröffentlichungen auf Basis von MWPA-Daten bitte:

1. **M.E.E.R. e.V. als Datenquelle nennen** — [m-e-e-r.de](https://m-e-e-r.de/).
2. Den **Erhebungszeitraum** zitieren (Start- / Enddatum der genutzten Sichtungen), nicht die Tool-Version.
3. Vor Publikation eine projektspezifische Daten-Nutzungs-Vereinbarung mit M.E.E.R. e.V. abstimmen.

---

Weiterführend: [Datenbank-Schema](https://dbdiagram.io/d/5dfa98f1edf08a25543f3bcc) · [REST-API-Doku](https://swe.stoplight.io/docs/mwpa/) · [Projekt-Wiki](https://github.com/M-E-E-R-e-V/mwpa/wiki)