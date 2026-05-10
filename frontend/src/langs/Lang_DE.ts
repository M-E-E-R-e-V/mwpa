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
            'Karte, Auswertung und Jahresvergleich auf einem druckbaren Datenblatt zusammen. Über den Druck-Dialog des Browsers — dort „Als PDF speichern" wählen.'
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