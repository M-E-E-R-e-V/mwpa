import {LangDefine} from 'bambooo';

/**
 * Lang_ES
 */
export class Lang_ES implements LangDefine {

    /**
     * lang content
     * @private
     */
    private _content: {[index: string]: string;} = {
        'title': 'MWPA',
        'login_title': '<b>MWPA</b>',
        'Sighting': 'Avistamiento',
        'Tours': 'Salidas',
        'Species': 'Especies',
        'Add sighting': 'Añadir avistamiento',
        'Add new sighting': 'Añadir nuevo avistamiento',
        'Date': 'Fecha',
        'Vehicle': 'Embarcación',
        'Driver': 'Patrón',
        'Group-Size': 'Tamaño del grupo',
        'Time begin': 'Hora de inicio',
        'Time end': 'Hora de fin',
        'Duration': 'Duración',
        'Location': 'Ubicación',
        'Encounter': 'Encuentro',
        'Other species': 'Otras especies',
        'Add Specie': 'Añadir especie',
        'List': 'Lista',
        'Map': 'Mapa',
        'Analytics': 'Análisis',
        'Year comparison': 'Comparación anual',
        'Export': 'Exportar',
        'Excel Export': 'Exportación Excel',
        'Excel Report': 'Informe Excel',
        'Data Page': 'Hoja de datos',
        'Columns': 'Columnas',
        'Standard columns': 'Columnas estándar',
        'Optional columns': 'Columnas opcionales',
        'Select all': 'Seleccionar todo',
        'Deselect all': 'Deseleccionar todo',
        'Coordinate format': 'Formato de coordenadas',
        'Download Excel': 'Descargar Excel',
        'Sighting metadata': 'Metadatos del avistamiento',
        'Sea depth': 'Profundidad',
        'Weather (day mean)': 'Tiempo (media diaria)',
        'Weather (at sighting hour)': 'Tiempo (hora del avistamiento)',
        'Id': 'ID',
        'Start of trip': 'Inicio de salida',
        'End of trip': 'Fin de salida',
        'Boat': 'Embarcación',
        'Skipper': 'Patrón',
        'Observer': 'Observador',
        'Wind/Seastate (Beaufort)': 'Viento/Estado del mar (Beaufort)',
        'Number of animals': 'Número de animales',
        'Duration from': 'Duración desde',
        'Duration until': 'Duración hasta',
        'Estimation without GPS': 'Estimación sin GPS',
        'Distance to nearst coast (nm)': 'Distancia a la costa (mn)',
        'Juveniles': 'Juveniles',
        'Calves': 'Crías',
        'Newborns': 'Recién nacidos',
        'Behaviour': 'Comportamiento',
        'Group structure': 'Estructura del grupo',
        'Subgroups': 'Subgrupos',
        'Reaction': 'Reacción',
        'Frequent behaviours of individuals': 'Comportamientos frecuentes individuales',
        'Photos taken': 'Fotos realizadas',
        'Recognizable animals': 'Animales reconocibles',
        'Other': 'Otros',
        'Other boats present': 'Otras embarcaciones presentes',
        'Note': 'Nota',
        'UUID': 'UUID',
        'Sighting type': 'Tipo de avistamiento',
        'Organization': 'Organización',
        'Created at': 'Creado el',
        'Updated at': 'Actualizado el',
        'Tour FID': 'Tour FID',
        'Sea depth (m)': 'Profundidad (m)',
        'Depth provider': 'Proveedor de profundidad',
        'Sea-surface temperature (Day mean, °C)': 'Temperatura del agua (Media diaria, °C)',
        'Air temperature (Day mean, °C)': 'Temperatura del aire (Media diaria, °C)',
        'UV index (Day max)': 'Índice UV (Máx. del día)',
        'Wave height (Day mean, m)': 'Altura de ola (Media diaria, m)',
        'Wave period (Day mean, s)': 'Periodo de ola (Media diaria, s)',
        'Wave direction (Day mean, °)': 'Dirección de ola (Media diaria, °)',
        'Sea-surface temperature (At hour, °C)': 'Temperatura del agua (A la hora, °C)',
        'Air temperature (At hour, °C)': 'Temperatura del aire (A la hora, °C)',
        'UV index (At hour)': 'Índice UV (A la hora)',
        'Wave height (At hour, m)': 'Altura de ola (A la hora, m)',
        'Wave period (At hour, s)': 'Periodo de ola (A la hora, s)',
        'Wave direction (At hour, °)': 'Dirección de ola (A la hora, °)',
        'Decimal degrees (e.g. 28.123, -16.456)': 'Grados decimales (p. ej. 28.123, -16.456)',
        'DMS — Degrees Minutes Seconds (e.g. 28° 07′ 24″ N)': 'DMS — Grados Minutos Segundos (p. ej. 28° 07′ 24″ N)',
        'DM — Degrees Decimal Minutes (e.g. 28° 07.41′ N)': 'DM — Grados Minutos Decimales (p. ej. 28° 07.41′ N)',
        'All formats (extra columns per position)': 'Todos los formatos (columnas adicionales por posición)',
        'Species (Top 10)': 'Especies (Top 10)',
        'Sightings per month': 'Avistamientos por mes',
        'Weekday × hour-of-day': 'Día de la semana × hora del día',
        'Group size distribution': 'Distribución del tamaño de grupo',
        'Cumulative sightings': 'Avistamientos acumulados',
        'Calendar': 'Calendario',
        'Cumulative trend': 'Tendencia acumulada',
        'No sightings under current filter.': 'Sin avistamientos con el filtro actual.',
        'No sightings available for year-on-year comparison.': 'No hay avistamientos para la comparación anual.',
        'No dated sightings available.': 'No hay avistamientos con fecha disponibles.',
        'sightings analysed.': 'avistamientos analizados.',
        'sightings across': 'avistamientos en',
        'year': 'año',
        'years': 'años',
        'Day': 'Día',
        'Name': 'Nombre',
        'Country': 'País',
        'Lon': 'Longitud',
        'Lat': 'Latitud',
        'Province': 'Provincia',
        'Island': 'Isla',
        'Port': 'Puerto',
        'E-Mail': 'Correo electrónico',
        'Website': 'Web',
        'AROC region': 'AROC Región',
        'AROC number': 'AROC Número',
        'AROC year': 'AROC Año',
        'AROC reference': 'AROC Referencia',
        'Authorized boats': 'Nº barcos autorizados',
        'Close': 'Cerrar',
        'Save changes': 'Guardar cambios',
        'AROC office report': 'Informe AROC',
        'Year': 'Año',
        'All years': 'Todos los años',
        'External receiver': 'Receptor externo',
        'No receivers configured': 'Ningún receptor configurado',
        'Download report': 'Descargar informe',
        'Generating…': 'Generando…',
        'Download failed': 'Descarga fallida',
        'Loading…': 'Cargando…',
        'Semester': 'Semestre',
        'Full year': 'Año completo',
        '1st semester (Jan–Jun)': '1er semestre (Ene–Jun)',
        '2nd semester (Jul–Dec)': '2do semestre (Jul–Dic)',
        'All boats': 'Todas las embarcaciones',
        'Add new Organization': 'Añadir nueva organización',
        'Edit Organization': 'Editar organización',
        'Add Organization': 'Añadir organización',
        'Generate PDF': 'Generar PDF',
        'Combines map, analytics and year comparison on a printable sheet. Uses the browser\'s print dialog — pick "Save as PDF" there.':
            'Combina mapa, análisis y comparación anual en una hoja imprimible. Usa el diálogo de impresión del navegador — seleccione "Guardar como PDF" allí.'
    };

    /**
     * getLangCode
     */
    public getLangCode(): string {
        return 'es';
    }

    /**
     * getLangTitle
     */
    public getLangTitle(): string {
        return 'Español';
    }

    /**
     * getCountryCode
     */
    public getCountryCode(): string {
        return 'es';
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
        return 'Lang_ES';
    }

}