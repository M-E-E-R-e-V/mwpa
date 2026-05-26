import {LangDefine} from 'bambooo';

/**
 * Lang_DE
 */
export class Lang_DE implements LangDefine {

    /**
     * lang content
     * @private
     */
    private _content: {[index: string]: string;} = {
        'title': 'MWPA',
        'login_title': '<b>MWPA</b>',
        'Sighting': 'Sichtung',
        'Tours': 'Touren',
        'Species': 'Spezies',
        'Add sighting': 'Sichtung hinzufügen',
        'Add new sighting': 'Neue Sichtung hinzufügen',
        'Date': 'Datum',
        'Vehicle': 'Fahrzeug',
        'Driver': 'Fahrer',
        'Group-Size': 'Gruppengröße',
        'Time begin': 'Zeit begin',
        'Time end': 'Zeit Ende',
        'Duration': 'Dauer',
        'Location': 'Ort',
        'Encounter': 'Begegnen',
        'Other species': 'Andere Spezies',
        'Add Specie': 'Spezie hinzufügen',
        'List': 'Liste',
        'Map': 'Karte',
        'Analytics': 'Auswertung',
        'Year comparison': 'Jahresvergleich',
        'Export': 'Export',
        'Excel Export': 'Excel-Export',
        'Excel Report': 'Excel-Bericht',
        'Data Page': 'Datenblatt',
        'Columns': 'Spalten',
        'Standard columns': 'Standard-Spalten',
        'Optional columns': 'Optionale Spalten',
        'Select all': 'Alle auswählen',
        'Deselect all': 'Alle abwählen',
        'Coordinate format': 'Koordinaten-Format',
        'Download Excel': 'Excel herunterladen',
        'AROC office report': 'AROC-Bericht',
        'Year': 'Jahr',
        'All years': 'Alle Jahre',
        'External receiver': 'Externer Empfänger',
        'No receivers configured': 'Kein Empfänger konfiguriert',
        'Download report': 'Bericht herunterladen',
        'Generating…': 'Wird erstellt…',
        'Download failed': 'Download fehlgeschlagen',
        'Loading…': 'Lade…',
        'Sighting metadata': 'Sichtungs-Metadaten',
        'Sea depth': 'Seetiefe',
        'Weather (day mean)': 'Wetter (Tagesmittel)',
        'Weather (at sighting hour)': 'Wetter (zur Sichtungs-Stunde)',
        'Id': 'ID',
        'Start of trip': 'Tour-Start',
        'End of trip': 'Tour-Ende',
        'Boat': 'Boot',
        'Skipper': 'Skipper',
        'Observer': 'Beobachter',
        'Wind/Seastate (Beaufort)': 'Wind/Seegang (Beaufort)',
        'Number of animals': 'Anzahl Tiere',
        'Duration from': 'Dauer von',
        'Duration until': 'Dauer bis',
        'Estimation without GPS': 'Schätzung ohne GPS',
        'Distance to nearst coast (nm)': 'Distanz zur Küste (sm)',
        'Juveniles': 'Juvenile',
        'Calves': 'Kälber',
        'Newborns': 'Neugeborene',
        'Behaviour': 'Verhalten',
        'Group structure': 'Gruppen-Struktur',
        'Subgroups': 'Untergruppen',
        'Reaction': 'Reaktion',
        'Frequent behaviours of individuals': 'Häufige Verhaltensweisen einzelner Tiere',
        'Photos taken': 'Fotos gemacht',
        'Recognizable animals': 'Erkennbare Tiere',
        'Other': 'Andere',
        'Other boats present': 'Andere Boote vor Ort',
        'Note': 'Notiz',
        'UUID': 'UUID',
        'Sighting type': 'Sichtungs-Typ',
        'Organization': 'Organisation',
        'Created at': 'Erstellt am',
        'Updated at': 'Aktualisiert am',
        'Tour FID': 'Tour-FID',
        'Sea depth (m)': 'Seetiefe (m)',
        'Depth provider': 'Tiefen-Provider',
        'Sea-surface temperature (Day mean, °C)': 'Wassertemperatur (Tagesmittel, °C)',
        'Air temperature (Day mean, °C)': 'Lufttemperatur (Tagesmittel, °C)',
        'UV index (Day max)': 'UV-Index (Tages-Max)',
        'Wave height (Day mean, m)': 'Wellenhöhe (Tagesmittel, m)',
        'Wave period (Day mean, s)': 'Wellenperiode (Tagesmittel, s)',
        'Wave direction (Day mean, °)': 'Wellenrichtung (Tagesmittel, °)',
        'Sea-surface temperature (At hour, °C)': 'Wassertemperatur (Zur Stunde, °C)',
        'Air temperature (At hour, °C)': 'Lufttemperatur (Zur Stunde, °C)',
        'UV index (At hour)': 'UV-Index (Zur Stunde)',
        'Wave height (At hour, m)': 'Wellenhöhe (Zur Stunde, m)',
        'Wave period (At hour, s)': 'Wellenperiode (Zur Stunde, s)',
        'Wave direction (At hour, °)': 'Wellenrichtung (Zur Stunde, °)',
        'Decimal degrees (e.g. 28.123, -16.456)': 'Dezimalgrad (z. B. 28.123, -16.456)',
        'DMS — Degrees Minutes Seconds (e.g. 28° 07′ 24″ N)': 'DMS — Grad Minuten Sekunden (z. B. 28° 07′ 24″ N)',
        'DM — Degrees Decimal Minutes (e.g. 28° 07.41′ N)': 'DM — Grad Dezimalminuten (z. B. 28° 07.41′ N)',
        'All formats (extra columns per position)': 'Alle Formate (zusätzliche Spalten pro Position)',
        'Species (Top 10)': 'Spezies (Top 10)',
        'Sightings per month': 'Sichtungen pro Monat',
        'Weekday × hour-of-day': 'Wochentag × Stunde',
        'Group size distribution': 'Gruppengrößen-Verteilung',
        'Cumulative sightings': 'Kumulierte Sichtungen',
        'Calendar': 'Kalender',
        'Cumulative trend': 'Kumulierter Verlauf',
        'No sightings under current filter.': 'Keine Sichtungen unter dem aktuellen Filter.',
        'No sightings available for year-on-year comparison.': 'Keine Sichtungen für den Jahresvergleich verfügbar.',
        'No dated sightings available.': 'Keine datierten Sichtungen verfügbar.',
        'sightings analysed.': 'Sichtungen ausgewertet.',
        'sightings across': 'Sichtungen über',
        'year': 'Jahr',
        'years': 'Jahre',
        'Day': 'Tag',
        'Name': 'Name',
        'Country': 'Land',
        'Lon': 'Längengrad',
        'Lat': 'Breitengrad',
        'Province': 'Provinz',
        'Island': 'Insel',
        'Port': 'Hafen',
        'E-Mail': 'E-Mail',
        'Website': 'Webseite',
        'AROC region': 'AROC-Region',
        'AROC number': 'AROC-Nummer',
        'AROC year': 'AROC-Jahr',
        'AROC reference': 'AROC-Referenz',
        'Authorized boats': 'Anzahl autorisierter Boote',
        'Close': 'Schließen',
        'Save changes': 'Änderungen speichern',
        'Semester': 'Halbjahr',
        'Full year': 'Ganzes Jahr',
        '1st semester (Jan–Jun)': '1. Halbjahr (Jan–Jun)',
        '2nd semester (Jul–Dec)': '2. Halbjahr (Jul–Dec)',
        'All boats': 'Alle Boote',
        'Add new Organization': 'Neue Organisation hinzufügen',
        'Edit Organization': 'Organisation bearbeiten',
        'Add Organization': 'Organisation hinzufügen',
        'Generate PDF': 'PDF erzeugen',
        'Combines map, analytics and year comparison on a printable sheet. Uses the browser\'s print dialog — pick "Save as PDF" there.':
            'Karte, Auswertung und Jahresvergleich auf einem druckbaren Datenblatt zusammen. Über den Druck-Dialog des Browsers — dort „Als PDF speichern" wählen.',
        'All organizations': 'Alle Organisationen',
        'Vehicles': 'Fahrzeuge',
        'Vehicle Name': 'Fahrzeug-Name',
        'Name of vehicle': 'Name des Fahrzeugs',
        'Add Vehicle': 'Fahrzeug hinzufügen',
        'Edit Vehicle': 'Fahrzeug bearbeiten',
        'Delete Vehicle': 'Fahrzeug löschen',
        'Are you sure you want to delete the vehicle? Historical sightings keep their reference, but the vehicle disappears from operational pickers.':
            'Soll das Fahrzeug wirklich gelöscht werden? Historische Sichtungen behalten ihre Referenz, aber das Fahrzeug verschwindet aus den Auswahlboxen.',
        'Vehicle save success.': 'Fahrzeug erfolgreich gespeichert.',
        'Vehicle delete success.': 'Fahrzeug erfolgreich gelöscht.',
        'Please select an organization.': 'Bitte eine Organisation auswählen.',
        'Please enter a vehicle name.': 'Bitte einen Fahrzeug-Namen eingeben.',
        'In use (shown in operational pickers)': 'Aktiv (sichtbar in Auswahlboxen)',
        'Deleted (hidden from admin list)': 'Gelöscht (aus Admin-Liste ausgeblendet)',
        'in use': 'aktiv',
        'not in use': 'nicht aktiv',
        'deleted': 'gelöscht',
        'Status': 'Status',
        'Action': 'Aktion',
        'Delete': 'Löschen',
        'search name / organization …': 'Name / Organisation suchen …',
        'Rebuild movements': 'Bewegungen neu berechnen',
        'Rebuild every sighting\'s movement track now? This may take a while.':
            'Bewegungs-Tracks aller Sichtungen jetzt neu berechnen? Das kann eine Weile dauern.',
        'Rebuilding movements…': 'Bewegungen werden neu berechnet…',
        'Rebuild done': 'Neuberechnung fertig',
        'Rebuild failed': 'Neuberechnung fehlgeschlagen',
        'Movement tracks': 'Bewegungs-Tracks',
        'Movement settings': 'Bewegungs-Einstellungen',
        'Lead buffer (minutes before sighting start)': 'Vorlauf-Puffer (Minuten vor Sichtungsbeginn)',
        'Trail buffer (minutes after sighting end)': 'Nachlauf-Puffer (Minuten nach Sichtungsende)',
        'Apply lead/trail around recorded duration (off = strict)':
            'Vor-/Nachlauf um aufgezeichnete Dauer anwenden (aus = strikt)',
        'Outlier speed threshold (km/h, segments above are bad)':
            'Ausreißer-Geschwindigkeit (km/h, höhere Segmente werden verworfen)',
        'Local timezone for legacy HH:MM (IANA, e.g. Atlantic/Canary)':
            'Lokale Zeitzone für Legacy-HH:MM (IANA, z. B. Atlantic/Canary)',
        'Settings saved': 'Einstellungen gespeichert',
        'Load failed': 'Laden fehlgeschlagen',
        'Save failed': 'Speichern fehlgeschlagen',

        // Species Profile — Titel & KPI
        'Profile': 'Profil',
        'Species Profile': 'Spezies-Profil',
        'Period': 'Zeitraum',
        'Sightings': 'Sichtungen',
        'Animals (sum)': 'Tiere (Summe)',
        'Median group': 'Median Gruppengröße',
        'p95 group': 'p95 Gruppengröße',

        // Species Profile — Karten-Titel
        'Sightings per hour-of-day': 'Sichtungen pro Tagesstunde',
        'Composition (sightings reporting …)': 'Zusammensetzung (Sichtungen mit …)',
        'Environment preference': 'Umwelt-Präferenz',
        'Distance to coast (m)': 'Küstenabstand (m)',
        'SST (°C)': 'Wassertemperatur (°C)',
        'Chl-a (mg/m³)': 'Chlorophyll-a (mg/m³)',
        'Behaviour mix': 'Verhaltens-Mix',
        'Reaction to boat': 'Reaktion auf das Boot',
        'Movement signature (derived from SightingMovement)': 'Bewegungs-Signatur (aus SightingMovement)',
        'Spatial distribution': 'Räumliche Verteilung',
        'Dominant heading rose': 'Dominanter Kurs (Windrose)',

        // Species Profile — Movement KPI
        'Sightings w/ movement': 'Sichtungen mit Bewegung',
        'Median avg speed': 'Median ⌀-Geschwindigkeit',
        'Median max speed': 'Median Max-Geschwindigkeit',
        'Median total distance': 'Median Gesamtstrecke',

        // Species Profile — leere Zustände
        'No data': 'Keine Daten',
        'No positions': 'Keine Positionen',
        'No heading data': 'Keine Kurs-Daten',
        'Show description': 'Beschreibung anzeigen',

        // Species Profile — Diagramm-Beschreibungen
        'desc.monthly': 'Anzahl Sichtungen dieser Spezies pro Kalendermonat, summiert über alle Jahre im gewählten Zeitraum. Hilft, saisonales Vorkommen zu erkennen.',
        'desc.hourly': 'Anzahl Sichtungen pro Tagesstunde (anhand der Tour-Start-Stunde). Zeigt tägliche Aktivitätsspitzen der Beobachtungstätigkeit. Hinweis: das ist die Beobachtungszeit, nicht zwingend die tatsächliche Aktivität der Tiere.',
        'desc.group_size': 'Verteilung der erfassten Gruppengrößen (species_count je Sichtung). Lesen als „wie oft wurden X Tiere zusammen angetroffen". Die letzten Buckets fangen einzelne Ausreißer ab.',
        'desc.group_ratios': 'Anteil der Sichtungen, bei denen Jungtiere, Kälber oder Neugeborene gemeldet wurden. Höhere Werte sprechen für Nutzung als Aufzuchts- oder Kinderstuben-Habitat.',
        'desc.env': 'Umweltbedingungen an den Sichtungs-Positionen. Charakterisiert die bevorzugte Habitat-Hülle der Spezies (Wassertiefe, Küstenabstand, Wassertemperatur, Chlorophyll-Konzentration).',
        'desc.behaviour': 'Während der Sichtungen erfasste Verhaltensweisen (aus BehaviouralStates). Eine Sichtung kann mehrere Labels beisteuern; die Top-8 werden gezeigt, der Rest läuft unter „other".',
        'desc.reaction': 'Reaktion der Tiere auf das Beobachtungsboot (aus EncounterCategories). Hilft bei der Bewertung von Beobachtungs-Impact und Habituierung.',
        'desc.movement': 'Bewegungs-Signatur abgeleitet aus SightingMovement — nur Sichtungen mit Track-Segment fließen ein. Geschwindigkeiten sind Mediane in Knoten; die Windrose zeigt die 8-Wege-Kompass-Verteilung des dominanten Kurses je Sichtung.',
        'desc.heatmap': 'Aggregierte Positionen aller Sichtungen im Filter. Jeder Punkt nutzt location_begin; die Heatmap-Intensität markiert Hotspots wiederholter Begegnungen. Es werden bis zu ~2000 Punkte angezeigt.',

        // Species Profile Phase 3 — SPUE, yearly, co-occurrence, pressure, env extra
        'Sightings per tour-hour (SPUE)': 'Sichtungen pro Tour-Stunde (SPUE)',
        'Sightings per year': 'Sichtungen pro Jahr',
        'Co-occurring species (same tour)': 'Mit-vorkommende Spezies (gleiche Tour)',
        'Pressure indicators': 'Druck-Indikatoren',
        'Extended environment (oceanographic)': 'Erweiterte Umwelt (ozeanographisch)',
        'Tour hours': 'Tour-Stunden',
        'tours': 'Touren',
        'Beaufort sea state': 'Beaufort-Seegang',
        'Fishing hours (25 km, day)': 'Fischerei-Stunden (25 km, Tag)',
        'Salinity (PSU)': 'Salzgehalt (PSU)',
        'SLA (cm)': 'SLA (cm)',
        'Current speed (m/s)': 'Strömungs-Geschwindigkeit (m/s)',
        'Wave height (m)': 'Wellenhöhe (m)',
        'UV index': 'UV-Index',

        'desc.spue': 'Aufwand-korrigierte Begegnungsrate: Anzahl Sichtungen pro Tour-Stunde im jeweiligen Monat. Balken = Sichtungen, durchgezogene Linie = Tour-Stunden (rechte Achse), gestrichelte Linie = SPUE. Macht Trends sichtbar, die von der Anzahl Touren verzerrt würden — Standard-Metrik in der Cetacean-Research.',
        'desc.yearly': 'Sichtungen pro Kalenderjahr — komplementär zum Monats-Chart und nützlich für Mehrjahres-Trends. Achtung: Ohne SPUE-Korrektur können Schwankungen reine Effort-Effekte sein.',
        'desc.cooccurrence': 'Top-Spezies, die auf denselben Touren (gleicher tour_fid) wie diese Spezies gesehen wurden. Zählt distinkte Touren — Tour-Doppelzählung pro Spezies ausgeschlossen. Limit 12 Spezies.',
        'desc.pressure': 'Indikatoren für Beobachtungs- und anthropogenen Druck: Beaufort-Seegang während der Sichtung, Anzahl anderer Boote vor Ort (aus „other_vehicle"), kommerzielle Fischerei-Stunden im 25-km-Umkreis am Sichtungstag (GFW).',
        'desc.env_extra': 'Zusätzliche ozeanographische Variablen aus SightingExtended: Salzgehalt (PSU), Meeresspiegel-Anomalie (cm), Strömungs-Geschwindigkeit (m/s), Wellenhöhe (m), UV-Index. Tägliche Mittelwerte.',

        // Cross-species analytics page (Phase 4)
        'Cross-species analytics': 'Spezies-übergreifende Auswertung',
        'Species comparison': 'Spezies-Vergleich',
        'Year × SPUE': 'Jahr × SPUE',
        'SST × group size': 'Wassertemperatur × Gruppengröße',
        'Chlorophyll-a × group size': 'Chlorophyll-a × Gruppengröße',
        'Tour effort × sightings': 'Tour-Aufwand × Sichtungen',
        'Pooled fit': 'Gepoolte Regression',
        '(all species)': '(alle Spezies)',
        'slope': 'Steigung',
        '< min_n (no fit)': '< min_n (kein Fit)',

        'desc.regression.page': 'Vier Streudiagramme über alle Spezies hinweg, jeweils mit einer Regressionslinie pro Spezies (farbig) und einer gepoolten Regression über alle Punkte (schwarz gestrichelt). Wenn die Vorzeichen oder die Steigung von gepoolt und farbig auseinanderlaufen, ist das Simpson-Paradoxon im Spiel — die gepoolte Sicht widerspricht den per-Spezies-Trends. Spezies mit < 10 Punkten werden weiterhin als Streupunkte gezeigt, bekommen aber keine eigene Linie.',
        'desc.reg.year_spue': 'Aufwand-korrigierte Begegnungsrate pro Jahr und Spezies. X = Kalenderjahr, Y = Sichtungen ÷ Tour-Stunden in dem Jahr. Bringt mehrjährige Trends ans Licht, die durch ungleichen Touren-Aufwand verzerrt würden.',
        'desc.reg.sst_groupsize': 'Wassertemperatur am Sichtungstag gegen Gruppengröße. Eine Sichtung = ein Punkt. Klassischer Simpson-Kandidat: Über alle Spezies wirkt SST oft schwach, pro Spezies aber stark — verschiedene Spezies bewohnen verschiedene Temperaturbereiche.',
        'desc.reg.chl_groupsize': 'Chlorophyll-a (Produktivitäts-Proxy) gegen Gruppengröße. Höhere Chl-a-Werte deuten auf produktive Gewässer — testet ob größere Pods produktivere Bereiche nutzen.',
        'desc.reg.effort': 'Monatliche Tour-Stunden gegen Sichtungen derselben Spezies in dem Monat. Eine Sättigungs-Kurve (sub-lineare Steigung) wäre ein Hinweis darauf, dass mehr Aufwand nicht proportional mehr Sichtungen bringt; eine perfekt lineare Beziehung spricht für Aufwand-limitiertes Sampling.',

        // Orphan tracks
        'Orphan track preview': 'Pending-Tracks Vorschau',
        'Delete bucket': 'Bucket löschen',
        'No decodable points in this bucket': 'Keine dekodierbaren Punkte in diesem Bucket',

        // Earthquake admin page (Phase 5)
        'Earthquakes': 'Erdbeben',
        'Events': 'Ereignisse',
        'Period from': 'Zeitraum von',
        'Period to': 'Zeitraum bis',
        'Min magnitude': 'Min. Magnitude',
        'Apply': 'Anwenden',
        'Reload': 'Neu laden',
        'When': 'Wann',
        'Mag': 'Mag.',
        'Depth (km)': 'Tiefe (km)',
        'Place': 'Ort',
        'Source': 'Quelle',
        'Recorrelate all': 'Alle neu korrelieren',
        'Recorrelate done': 'Neu-Korrelation fertig',
        'Recorrelate confirm': 'Alle Sichtungen erneut gegen alle gespeicherten Erdbeben korrelieren? Bei großem Bestand kann das eine Weile dauern — siehe Log.',
        'Impact window': '± Fenster',
        'Impact window hint': 'Welche Sichtungen sind „beeinflusst" — biologisch sinnvolle Zeitfenster pro Erdbeben. Auswahl ≠ „keine" lädt den Impact über alle aktuell gelisteten Erdbeben.',
        'Hide sightings': 'Keine Sichtungen anzeigen',
        '±3 days': '±3 Tage',
        '±7 days': '±7 Tage',
        '±14 days': '±14 Tage',
        'window.hint.off': 'Nur Erdbeben-Liste anzeigen, keine Sichtungs-Korrelationen rendern',
        'window.hint.24h': 'Akute Stressreaktion (Strandungen, P-/S-Wellen-Effekte)',
        'window.hint.3d': 'Kurzfristige Verhaltensänderung',
        'window.hint.7d': 'Mittelfristige Verdrängung / Migrationsverschiebung',
        'window.hint.14d': 'Breit, fängt verzögerte Effekte ein (rauschig)',
        'Impact analysis': 'Auswertung',
        'Impact load failed': 'Impact-Analyse fehlgeschlagen',
        'By species': 'Nach Spezies',
        'By behaviour': 'Nach Verhalten',
        'By encounter category': 'Nach Begegnungskategorie',
        'Hours offset (signed)': 'Zeit-Offset (h, signed)',
        'Window': 'Fenster',
        'days': 'Tage',
        'events': 'Ereignisse',
        'Affected sightings': 'Betroffene Sichtungen',
        'Correlations': 'Korrelationen',

        // Species Profile — seismic exposure
        'Seismic exposure': 'Seismische Exposition',
        'Sightings w/ event': 'Sichtungen mit Beben',
        'Sighting × event pairs': 'Sichtung × Beben (Paare)',
        'Max magnitude': 'Max Magnitude',
        'Median distance': 'Median Abstand',
        'Magnitude': 'Magnitude',
        'Distance to epicenter (km)': 'Abstand zum Epizentrum (km)',
        'Offset (h, +event before sighting)': 'Zeit-Offset (h, +Beben vor Sichtung)',
        'desc.seismic': 'Korrelationen aus der `sighting_seismic`-Tabelle: jede Sichtung dieser Spezies wurde mit Erdbeben im 200-km-Umkreis und ±14 Tagen gepaart. KPI links: Anzahl Sichtungen mit mindestens einem Beben in der Nähe, Gesamtzahl Sichtung × Beben-Paare, stärkste Magnitude, Median-Abstand. Histogramme rechts zeigen die Verteilung von Magnitude, Abstand und Zeit-Offset — positive Offsets = Beben vor Sichtung. Mit positiv schiefer Offset-Verteilung interessant für Verhaltens-Reaktionen.'
    };

    /**
     * getLangCode
     */
    public getLangCode(): string {
        return 'de';
    }

    /**
     * getLangTitle
     */
    public getLangTitle(): string {
        return 'Deutsch';
    }

    /**
     * getCountryCode
     */
    public getCountryCode(): string {
        return 'de';
    }

    /**
     * l
     * @param acontent
     */
    public l(acontent: string): string | null {
        if (this._content[acontent]) {
            return this._content[acontent];
        }

        return null;
    }

    /**
     * getClassName
     */
    public getClassName(): string {
        return 'Lang_DE';
    }

}