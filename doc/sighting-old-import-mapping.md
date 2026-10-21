# SightingOld — Import-Mapping-Report

Quelle: ein Legacy-Tabellenblatt-Export (Sheet **`data_fusion`**), abgelegt unter dem gitignorierten `data/`-Verzeichnis und per `--excel` an das Import-Script übergeben — die Datei selbst liegt NICHT im Repo.
Stand der Analyse: 2026-10-21 (gegen echte DB auf `127.0.0.1:3308`, 1969 App-Sichtungen, App-Start **2022-09-28**).

## 1. Überblick
- **14.524 Datenzeilen** (14.435 mit Datum), Spanne **1995-09-01 → 2025-03-27**.
- 64 genutzte Spalten (A–BL); der Rest der „206" ist leer.
- `header_explanation`-Sheet liefert nur die Spaltenbuchstaben, keine Extra-Semantik.
- Ziel: neue Tabelle **`sighting_old`**, Shape wie `Sighting`, `sighting` bleibt unangetastet, Verknüpfung/Markierung über eigenes `is_old`-Flag in der Liste.

## 2. Konflikt-Gate (Phase 1, PFLICHT vor Import)
Der Import läuft zweiphasig. **Phase 1 prüft Konflikte; bei ≥1 Konflikt → Abbruch, Liste der Konfliktzeilen, KEIN Import.** Nur bei 0 Konflikten läuft Phase 2 (Import).

**Konflikt-Definition:** eine Excel-Zeile kollidiert, wenn in `sighting` (nicht gelöscht) eine Sichtung existiert mit
**gleichem Datum UND gleichem Tier (aufgelöste species_id) UND Uhrzeit innerhalb ±30 min.**
(Reine Datum+Tier-Treffer mit weit entfernter Uhrzeit = andere Fahrt am selben Tag → **kein** Konflikt.)

**Aktueller Vorab-Befund:** nur **23** Excel-Zeilen liegen ≥ App-Start; davon **0** echte Konflikte (Datum+Uhrzeit±30+Tier). Import A (alles) daher unkritisch — Stand wird beim echten Lauf erneut geprüft.

## 3. Spalten-Mapping (data_fusion → sighting_old)

Fill% = Anteil befüllter Zeilen (Stichprobe 2000).

| Sp. | Excel-Name | Fill | → sighting_old-Feld | Transform / Notiz |
|---|---|---|---|---|
| A | SIGHTING | 100% | `source_row` | laufende Alt-Nr. (Dedup-Key mit source_file) |
| B | DATE | 100% | `date` | Excel-Date → `YYYY-MM-DD` |
| L | TIME | 100% | `duration_from` | Excel-Zeit-Serial → `HH:mm` (Sichtungszeit) |
| C | beginning trip | 0% | `tour_start` | fast leer → meist '' |
| D | end trip | 0% | `tour_end` | fast leer → meist '' |
| M | Duration | 0% | `duration_until` | fast leer → meist '' |
| E | Boat | 74% | `boat_name` (Text) | kein vehicle_id (Altboote); optional Best-Effort-Resolve |
| F | Skipper | 8% | `skipper_name` (Text) | kein driver_id |
| G | SEASTATE | 33% | `beaufort_wind` | Zahl; leer → 0/-1 |
| H | Swell | 31% | `note` (Anhang) oder eigenes Feld | kein Sighting-Pendant → in note mergen |
| I | SPECIES | 100% | `species_id` + `species_name_raw` | **Synonym-Tabelle §4**; unauflösbar → id 0 + raw |
| J | GROUP_SIZE | 92% | `species_count` | Zahl |
| K | Subgroups | 0% | `subgroups` | leer → 0 |
| N/O | POSITION_N / _W | 29% | (nur Quelle für P/Q) | roh Grad/Min; wir nehmen die DD-Spalten |
| P | GdM_Latitude_DD | 29% | `location_begin.latitude` | **nur 29% haben Koordinaten** |
| Q | GdM_Longitude_DD | 29% | `location_begin.longitude` | JSON `{latitude,longitude}` wie Sighting |
| R–U | Position2 / GdM…2_DD | 3% | `location_end` | analog, selten |
| V | Distance_to_Coast | 95% | `distance_coast` | Zahl (nm) |
| W | DEPTH | 91% | `depth_m` (neues Alt-Feld) | Alt-Daten bringen eigene Tiefe mit |
| X | Juveniles present | 26% | `juveniles` | YES/NO → 1/0 (Präsenz; echte Zahl in AX) |
| Y | Calves present | 23% | `calves` | YES/NO → 1/0 |
| Z | Newborns present | 12% | `newborns` | YES/NO → 1/0 |
| AA | Behaviour | 0% | `behaviours` | leer |
| AB | Travel_Direction | 17% | `note`/`behaviours` (Anhang) | Text |
| AG | Encounter_Category | 15% | `note` (Anhang) | Text |
| AH | EVENTS | 7% | `note` (Anhang) | Text |
| AI | INTERACTION | 14% | `note` (Anhang) | Text |
| AO | OTHER_SP | 18% | `other_species` | Text |
| AP | names of other boats | 0% | `other_vehicle` | leer |
| AQ | total No_of_boats | 8% | `note` (Anhang) | Zahl |
| AR | Notes | 14% | `note` (Haupt) | Freitext |
| BL | data source | 100% | `source_file` | Provenienz |
| AX–AZ | Juveniles/Calves/Newborns (Zahl) | 12–18% | (optional) echte Zahlen → juveniles/calves/newborns statt X/Y/Z-Präsenz | **Entscheidung:** Präsenz (X/Y/Z) oder echte Zahl (AX–AZ)? Vorschlag: Zahl wenn vorhanden, sonst Präsenz→1 |

**Ignoriert** (k_*-Flags, Feld152/167, SET_No, Film, Water_Observation, Minimum_Distance, DIVE_TIME, Adult_M/F, Subadults, IA_*, Recognized_Individuals): keine Sighting-Entsprechung bzw. zu dünn/analytisch; nicht importiert (bei Bedarf später als Zusatzspalten).

## 4. Species-Synonym-Tabelle (41 Excel-Namen → App-species.id)
Normalisierung: lowercase, Apostroph-Varianten (´ ' ') entfernen, Whitespace/Plural glätten.

| Excel (Anzahl) | → App-Art (id) |
|---|---|
| Short-finned Pilot Whale (4241) | Pilot Whale / Globicephala macrorhynchus (3) |
| Bottlenose Dolphin (4135 + Varianten) | Bottlenose Dolphin (2) |
| Atlantic Spotted Dolphin (2794+8) | Atlantic Spotted Dolphin (1) |
| **Spotted Dolphin (73+1)** | → Atlantic Spotted Dolphin (1) *(Annahme: einzige „Spotted" auf Kanaren — bestätigen)* |
| Rough-toothed Dolphin (921+1) | Rough-Toothed Dolphin (16) |
| Bryde´s/Bryde's Whale (620+5) | Bryde´s Whale (33) |
| Common Dolphin (+ "Commons/Dolphins"-Tippfehler, 564+3) | Common Dolphin (6) |
| Striped Dolphin (251) | Striped Dolphin (5) |
| Baleen Whale (151) | Baleen Whale (18) |
| Dense Beaked Whale (119) | Dense Beaked Whale (9) |
| Beaked Whale (105+2) | Beaked Whale (15) |
| Cuvier's/Cuvier Beaked Whale (100+1) | Cuvier´s Beaked Whale (36) |
| Sei Whale (90) | Sei Whale (24) |
| Sperm Whale (61+1) | Sperm Whale (11) |
| Risso's dolphin (20) | Risso´s Dolphin (17) |
| Fin Whale (20) | Fin Whale (23) |
| Blue Whale (5) | Blue Whale (25) |
| Humpback Whale (5) | Humpback whale (40) |
| Orca (4) | Orca (31) |
| Fraser's Dolphin (3) | Fraser´s dolphin (34) |
| False Killer Whale (2) | False Killer Whale (35) |
| Gervais Beaked Whale (2) | Gervais Beaked Whale (37) |
| Pygmy Sperm Whale (1) | Pygmy Sperm Whale (39) |
| North Atlantic Right Whale (1) | North Atlantic right whale (41) |
| Minke whale (1) | Minke whale (42) |
| **Unidentified Whale/Cetaceen/Cetacean/Dolphin (42+42+1+33)** | → Unknown (27) |
| **Spotted Dolphin / Common Dolphin (1)** | gemischt → species_id 0 + raw |
| **Bottlenose Dolphin / Short-finned Pilot Whale (1)** | gemischt → species_id 0 + raw |

→ ~99,9% der Zeilen auflösbar; nur 2 Misch-Einträge bleiben id 0 (raw erhalten).

## 5. Sighting-Felder ohne Quelle (→ Default)
`unid` = uuidv4 · `creater_id/device_id/vehicle_id/vehicle_driver_id/tour_id` = 0 · `tour_fid` = '' · `organization_id` = 0 · `sighting_type` = 0 · `deleted` = false · `hash`/`source_import_file` wie bei Import · `group_structure_id/reaction_id` = 0 · `photo_taken` = aus Film/k_Photo ableitbar (optional).

## 6. Caveats
- **Nur ~29% der Altzeilen haben Koordinaten** → der Rest erscheint in der Liste (Datum/Art/…), aber **nicht auf der Karte**.
- `tour_start/end`, `Duration`, `Behaviour` sind praktisch leer.
- Altzeilen **read-only** (kein Mobile-Sync, keine Hashes), kein Tour-Track → **aus effort-korrigierten Analytics ausgeschlossen**, nur Rohzählung.
- Umwelt-Enrichment für Altdaten = Phase 2 (nicht jetzt).

## 7. Offene Bestätigungen vor dem Bau
1. **Juvenile/Calf/Newborn**: echte Zahl (AX–AZ) bevorzugen, sonst Präsenz (X/Y/Z)→1? *(Vorschlag: ja)*
2. **„Spotted Dolphin"** = Atlantic Spotted Dolphin? *(Vorschlag: ja)*
3. **Boot/Skipper** nur als Text (schnell) — ok?
4. **Konflikt-Toleranz** ±30 min — ok?
