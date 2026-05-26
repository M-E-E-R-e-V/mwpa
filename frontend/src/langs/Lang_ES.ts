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
            'Combina mapa, análisis y comparación anual en una hoja imprimible. Usa el diálogo de impresión del navegador — seleccione "Guardar como PDF" allí.',
        'All organizations': 'Todas las organizaciones',
        'Vehicles': 'Embarcaciones',
        'Vehicle Name': 'Nombre de la embarcación',
        'Name of vehicle': 'Nombre de la embarcación',
        'Add Vehicle': 'Añadir embarcación',
        'Edit Vehicle': 'Editar embarcación',
        'Delete Vehicle': 'Eliminar embarcación',
        'Are you sure you want to delete the vehicle? Historical sightings keep their reference, but the vehicle disappears from operational pickers.':
            '¿Seguro que desea eliminar la embarcación? Los avistamientos históricos conservan la referencia, pero la embarcación desaparece de los selectores operativos.',
        'Vehicle save success.': 'Embarcación guardada correctamente.',
        'Vehicle delete success.': 'Embarcación eliminada correctamente.',
        'Please select an organization.': 'Seleccione una organización.',
        'Please enter a vehicle name.': 'Introduzca un nombre de embarcación.',
        'In use (shown in operational pickers)': 'En uso (visible en los selectores)',
        'Deleted (hidden from admin list)': 'Eliminada (oculta en la lista de administración)',
        'in use': 'en uso',
        'not in use': 'fuera de uso',
        'deleted': 'eliminada',
        'Status': 'Estado',
        'Action': 'Acción',
        'Delete': 'Eliminar',
        'search name / organization …': 'buscar nombre / organización …',
        'Rebuild movements': 'Recalcular movimientos',
        'Rebuild every sighting\'s movement track now? This may take a while.':
            '¿Recalcular ahora los trayectos de movimiento de todos los avistamientos? Puede llevar un rato.',
        'Rebuilding movements…': 'Recalculando movimientos…',
        'Rebuild done': 'Recálculo finalizado',
        'Rebuild failed': 'Recálculo fallido',
        'Movement tracks': 'Trayectos de movimiento',
        'Movement settings': 'Ajustes de movimiento',
        'Lead buffer (minutes before sighting start)': 'Margen anterior (minutos antes del inicio del avistamiento)',
        'Trail buffer (minutes after sighting end)': 'Margen posterior (minutos después del fin del avistamiento)',
        'Apply lead/trail around recorded duration (off = strict)':
            'Aplicar margen anterior/posterior a la duración registrada (off = estricto)',
        'Outlier speed threshold (km/h, segments above are bad)':
            'Umbral de velocidad anómala (km/h, los tramos por encima se descartan)',
        'Local timezone for legacy HH:MM (IANA, e.g. Atlantic/Canary)':
            'Zona horaria local para HH:MM antiguo (IANA, p. ej. Atlantic/Canary)',
        'Settings saved': 'Ajustes guardados',
        'Load failed': 'Carga fallida',
        'Save failed': 'Guardado fallido',

        // Species Profile — títulos y KPI
        'Profile': 'Perfil',
        'Species Profile': 'Perfil de especie',
        'Period': 'Periodo',
        'Sightings': 'Avistamientos',
        'Animals (sum)': 'Animales (suma)',
        'Median group': 'Mediana tamaño de grupo',
        'p95 group': 'p95 tamaño de grupo',
        'Sightings per hour-of-day': 'Avistamientos por hora del día',
        'Composition (sightings reporting …)': 'Composición (avistamientos con …)',
        'Environment preference': 'Preferencia ambiental',
        'Distance to coast (m)': 'Distancia a la costa (m)',
        'SST (°C)': 'Temperatura superficial (°C)',
        'Chl-a (mg/m³)': 'Clorofila-a (mg/m³)',
        'Behaviour mix': 'Mezcla de comportamientos',
        'Reaction to boat': 'Reacción al barco',
        'Movement signature (derived from SightingMovement)': 'Firma de movimiento (derivada de SightingMovement)',
        'Spatial distribution': 'Distribución espacial',
        'Dominant heading rose': 'Rosa de rumbos dominantes',
        'Sightings w/ movement': 'Avistamientos con movimiento',
        'Median avg speed': 'Mediana velocidad media',
        'Median max speed': 'Mediana velocidad máx.',
        'Median total distance': 'Mediana distancia total',
        'No data': 'Sin datos',
        'No positions': 'Sin posiciones',
        'No heading data': 'Sin datos de rumbo',
        'Show description': 'Mostrar descripción',

        // Species Profile — descripciones
        'desc.monthly': 'Número de avistamientos de esta especie por mes natural, sumado a lo largo de todos los años en el rango seleccionado. Útil para detectar presencia estacional.',
        'desc.hourly': 'Número de avistamientos por hora del día (según la hora de inicio de la salida). Muestra los picos de actividad de observación. Nota: refleja el esfuerzo de observación, no necesariamente la actividad real de los animales.',
        'desc.group_size': 'Distribución de tamaños de grupo registrados (species_count por avistamiento). Se lee como «con qué frecuencia se encontraron X animales juntos». Los últimos buckets recogen los valores atípicos.',
        'desc.group_ratios': 'Proporción de avistamientos que reportaron presencia de juveniles, crías o neonatos. Valores altos sugieren uso como hábitat de cría o crianza.',
        'desc.env': 'Condiciones ambientales en las posiciones de avistamiento. Caracteriza la envoltura de hábitat preferida (profundidad, distancia a la costa, temperatura del agua, concentración de clorofila).',
        'desc.behaviour': 'Estados de comportamiento registrados durante el avistamiento (de BehaviouralStates). Un avistamiento puede aportar varias etiquetas; se muestran los 8 primeros, el resto bajo «other».',
        'desc.reaction': 'Reacción de los animales hacia la embarcación de observación (de EncounterCategories). Útil para evaluar impacto y habituación.',
        'desc.movement': 'Firma de movimiento derivada de la tabla SightingMovement — sólo los avistamientos con segmento de track contribuyen. Las velocidades son medianas en nudos; la rosa muestra la distribución de 8 sectores del rumbo dominante por avistamiento.',
        'desc.heatmap': 'Posiciones agregadas de todos los avistamientos en el filtro. Cada punto usa location_begin; la intensidad del mapa de calor marca los puntos calientes de encuentros repetidos. Se muestran hasta ~2000 puntos.',

        // Species Profile Phase 3
        'Sightings per tour-hour (SPUE)': 'Avistamientos por hora de salida (SPUE)',
        'Sightings per year': 'Avistamientos por año',
        'Co-occurring species (same tour)': 'Especies co-ocurrentes (misma salida)',
        'Pressure indicators': 'Indicadores de presión',
        'Extended environment (oceanographic)': 'Entorno extendido (oceanográfico)',
        'Tour hours': 'Horas de salida',
        'tours': 'salidas',
        'Beaufort sea state': 'Estado del mar (Beaufort)',
        'Fishing hours (25 km, day)': 'Horas de pesca (25 km, día)',
        'Salinity (PSU)': 'Salinidad (PSU)',
        'SLA (cm)': 'SLA (cm)',
        'Current speed (m/s)': 'Velocidad de la corriente (m/s)',
        'Wave height (m)': 'Altura de ola (m)',
        'UV index': 'Índice UV',

        'desc.spue': 'Tasa de encuentro corregida por esfuerzo: número de avistamientos por hora de salida en el mes correspondiente. Barras = avistamientos, línea continua = horas de salida (eje derecho), línea discontinua = SPUE. Hace visibles tendencias que el conteo bruto enmascararía — métrica estándar en cetología.',
        'desc.yearly': 'Avistamientos por año natural — complementario al gráfico mensual, útil para tendencias multianuales. Atención: sin corrección SPUE, las fluctuaciones pueden ser puros efectos de esfuerzo.',
        'desc.cooccurrence': 'Especies más frecuentes vistas en las mismas salidas (mismo tour_fid) que esta especie. Cuenta salidas distintas; se excluye doble conteo por salida. Límite 12 especies.',
        'desc.pressure': 'Indicadores de presión: estado del mar (Beaufort) durante el avistamiento, número de otros barcos presentes (de «other_vehicle»), horas de pesca comercial en un radio de 25 km el día del avistamiento (GFW).',
        'desc.env_extra': 'Variables oceanográficas adicionales de SightingExtended: salinidad (PSU), anomalía del nivel del mar (cm), velocidad de la corriente (m/s), altura de ola (m), índice UV. Medias diarias.',

        // Cross-species analytics page (Phase 4)
        'Cross-species analytics': 'Análisis entre especies',
        'Species comparison': 'Comparación de especies',
        'Year × SPUE': 'Año × SPUE',
        'SST × group size': 'Temp. superficial × tamaño de grupo',
        'Chlorophyll-a × group size': 'Clorofila-a × tamaño de grupo',
        'Tour effort × sightings': 'Esfuerzo × avistamientos',
        'Pooled fit': 'Regresión agrupada',
        '(all species)': '(todas las especies)',
        'slope': 'pendiente',
        '< min_n (no fit)': '< min_n (sin ajuste)',

        'desc.regression.page': 'Cuatro diagramas de dispersión sobre todas las especies, cada uno con una línea de regresión por especie (color) y una regresión agrupada sobre todos los puntos (discontinua negra). Si el signo o la pendiente de la línea agrupada se separa de las líneas de color, estamos ante la paradoja de Simpson — la vista agrupada contradice las tendencias por especie. Las especies con < 10 puntos siguen apareciendo como puntos pero sin su propia línea.',
        'desc.reg.year_spue': 'Tasa de encuentro corregida por esfuerzo por año y especie. X = año natural, Y = avistamientos ÷ horas de salida en ese año. Revela tendencias multianuales que el esfuerzo desigual ocultaría.',
        'desc.reg.sst_groupsize': 'Temperatura superficial del agua frente al tamaño de grupo. Un avistamiento = un punto. Caso clásico de Simpson: agregado puede parecer débil mientras que por especie es fuerte — diferentes especies habitan diferentes rangos térmicos.',
        'desc.reg.chl_groupsize': 'Clorofila-a (proxy de productividad) frente al tamaño de grupo. Mayor Chl-a indica aguas productivas — comprueba si los grupos grandes usan zonas más productivas.',
        'desc.reg.effort': 'Horas de salida mensuales frente a avistamientos de la misma especie ese mes. Una curva de saturación (pendiente sub-lineal) indicaría que más esfuerzo no rinde proporcionalmente más avistamientos; una relación lineal sugiere muestreo limitado por esfuerzo.',

        // Earthquake admin page (Phase 5)
        'Earthquakes': 'Terremotos',
        'Events': 'Eventos',
        'Period from': 'Periodo desde',
        'Period to': 'Periodo hasta',
        'Min magnitude': 'Magnitud mín.',
        'Apply': 'Aplicar',
        'Import now': 'Importar ahora',
        'Import done': 'Importación lista',
        'Reload': 'Recargar',
        'When': 'Cuándo',
        'Mag': 'Mag.',
        'Depth (km)': 'Profundidad (km)',
        'Place': 'Lugar',
        'Source': 'Fuente',
        'Backfill from': 'Retroactivo desde',
        'Recorrelate all': 'Recorrelacionar todo',
        'Recorrelate done': 'Recorrelación completada',
        'Recorrelate confirm': '¿Recorrelacionar todos los avistamientos con todos los terremotos almacenados? En bases grandes puede tardar — ver registro.',

        // Species Profile — seismic exposure
        'Seismic exposure': 'Exposición sísmica',
        'Sightings w/ event': 'Avistamientos con evento',
        'Sighting × event pairs': 'Pares avistamiento × evento',
        'Max magnitude': 'Magnitud máx.',
        'Median distance': 'Distancia mediana',
        'Magnitude': 'Magnitud',
        'Distance to epicenter (km)': 'Distancia al epicentro (km)',
        'Offset (h, +event before sighting)': 'Desfase (h, +evento antes del avistamiento)',
        'desc.seismic': 'Correlaciones de la tabla `sighting_seismic`: cada avistamiento de esta especie se ha emparejado con terremotos a ≤ 200 km y ±14 días. KPI a la izquierda: número de avistamientos con al menos un evento cercano, total de pares avistamiento × evento, magnitud máxima, mediana de distancia. Los histogramas muestran la distribución de magnitud, distancia y desfase temporal — desfases positivos = evento previo al avistamiento. Una asimetría positiva del desfase es interesante para detectar respuestas conductuales.'
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