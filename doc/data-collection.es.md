# Recogida de datos y uso científico — MWPA

Esta guía describe **cómo** se registran los datos de observación en MWPA, **qué** significa cada campo y **cómo utilizarlos** en análisis científicos sin extraer del conjunto de datos más de lo que realmente sostiene.

El sistema se construyó en torno al flujo de trabajo de [M.E.E.R. e.V.](https://m-e-e-r.de/) — observaciones oportunistas de cetáceos desde embarcaciones de investigación frente a La Gomera (Islas Canarias). El modelo de datos es genérico; esta guía utiliza La Gomera como ejemplo recurrente.

> ⚠ Este conjunto de datos es **oportunista** y no controla el esfuerzo de muestreo. Antes de hacer afirmaciones sobre abundancia absoluta, densidad o tendencias, lea la sección [Uso científico → Limitaciones](#limitaciones).

## Índice

1. [Fuentes de datos](#fuentes-de-datos)
2. [Modelo del dominio](#modelo-del-dominio)
3. [Referencia de campos](#referencia-de-campos)
4. [Convenciones de coordenadas y tiempo](#convenciones-de-coordenadas-y-tiempo)
5. [Datos derivados — Trayectos de movimiento](#datos-derivados--trayectos-de-movimiento)
6. [Indicadores de calidad](#indicadores-de-calidad)
7. [Uso científico](#uso-científico)
8. [Formatos de exportación](#formatos-de-exportación)
9. [Lista para la reproducibilidad](#lista-para-la-reproducibilidad)
10. [Citar el conjunto de datos](#citar-el-conjunto-de-datos)

## Fuentes de datos

| Fuente | Uso | Notas |
|---|---|---|
| **App móvil** (Flutter, repositorio aparte) | Captura en vivo a bordo — inicio/fin de salida, eventos de avistamiento, traza GPS cada pocos segundos, fotos | Funciona sin conexión; sincroniza con el backend cuando hay red |
| **Frontend web** (`frontend/`) | Edición de registros existentes, importación de datos heredados, exportación | Flujo de admin / revisor; correcciones tras la salida |
| **Importador IM2020** | Importación puntual de CSV de columnas fijas preexistentes | Se ejecuta con `--import` al arrancar el backend |
| **Servicios proveedores** (`backend/src/Service/`) | Enriquecen cada avistamiento con profundidad del mar (EMODnet / NOAA-ETOPO) y meteorología (Open-Meteo) en el lugar/hora del avistamiento | Tareas cron en segundo plano; campos en `sighting_extended` |

## Modelo del dominio

```
SightingTour                      una salida con un barco en un día
 ├── SightingTourTracking[]       puntos GPS crudos cada pocos segundos durante toda la salida
 └── Sighting[]                   una fila por evento de avistamiento real
      ├── SightingExtended        batimetría + meteorología derivadas (1:1)
      └── SightingMovement        trayecto de movimiento derivado por avistamiento (1:1) — §5
           └── SightingMovementTrack[]   segmentos calculados
```

Una **salida** (tour) contiene los metadatos de toda la travesía (barco, patrón, fecha, estado del mar). Un **avistamiento** es un encuentro concreto con cetáceos dentro de esa salida. Los **puntos de tracking** son pings GPS de fondo que permiten al sistema reconstruir el recorrido del barco durante cada avistamiento.

## Referencia de campos

### Salida (`sighting_tour`)

| Columna | Significado |
|---|---|
| `date` | Fecha de calendario `YYYY-MM-DD` |
| `tour_start` / `tour_end` | Hora de salida / regreso, `HH:MM` hora local Atlántico/Canarias |
| `vehicle_id` | Embarcación usada (`vehicle.in_use=true` = flota activa) |
| `vehicle_driver_id` | Patrón |
| `creater_id` | Observador que creó el registro |
| `record_by_persons` | Lista JSON de tripulantes/observadores adicionales no registrados como usuarios |
| `beaufort_wind` | Estado del mar (escala Beaufort) |
| `organization_id` | Organización propietaria |

### Avistamiento (`sighting`)

| Columna | Significado |
|---|---|
| `tour_id` / `tour_fid` | Salida padre (id interno + id foráneo de la app) |
| `date` | Fecha del avistamiento — debe coincidir con la de la salida |
| `tour_start` / `tour_end` | Copia desde la salida padre (denormalizado para filtros rápidos) |
| `duration_from` / `duration_until` | Hora de inicio / fin del avistamiento, `HH:MM` local |
| `location_begin` / `location_end` | JSON `{latitude, longitude, timestamp, accuracy, heading, speed, …}` capturado por el móvil al inicio/fin. `timestamp` es `Date.now()` en ms UTC |
| `species_id` | Especie principal — obligatorio para que la fila cuente como avistamiento real |
| `species_count` | Número estimado de animales (tamaño del grupo) |
| `juveniles` / `calves` / `newborns` | Recuentos de clases de edad |
| `behaviours` | Mapa JSON de ids de `BehaviouralStates` observados |
| `group_structure_id` | 1 = ampliamente disperso, 2 = disperso, 3 = laxo, 4 = compacto |
| `subgroups` | Número de subgrupos distinguibles |
| `reaction_id` | `EncounterCategories` — reacción de los animales (interacción / sin respuesta / evasión / aproximación / desconocido) |
| `freq_behaviour` | Comportamientos individuales frecuentes, JSON libre |
| `photo_taken` | Selector: sí / no / desconocido |
| `recognizable_animals` | Texto libre — identificadores de individuos foto-reconocibles (p. ej. marcas en la aleta) |
| `other_species` | Mapa JSON de especies secundarias observadas |
| `other_vehicle` | Otras embarcaciones presentes, texto libre. Opcionalmente con un entero al inicio para "barcos máximos" |
| `note` | Texto libre — cualquier otra observación |
| `sighting_type` | NORMAL / SHORT / NOTICE / FREE |
| `unid` / `hash` | Id único de la app / hash de contenido (deduplicación al sincronizar) |

### Sighting Extended (`sighting_extended`, autocompletado)

Datos ambientales por avistamiento, refrescados por servicios en segundo plano:

- `depth_m`, `depth_provider`, `depth_status` — batimetría en la posición del avistamiento
- `sst_c_day`, `sst_c_hour` — temperatura superficial del mar (media diaria + a la hora del avistamiento)
- `air_temperature_c_day` / `_hour`, `uv_index_day` / `_hour`
- `wave_height_m_*`, `wave_period_s_*`, `wave_direction_deg_*`
- `weather_hour_used` — hora local de la que se tomaron las muestras *_hour
- `provenance` — JSON: qué proveedor generó qué columna

## Convenciones de coordenadas y tiempo

- **Coordenadas** en **WGS84 grados decimales**. La longitud es signada (oeste = negativo).
- **Marcas de tiempo de tracking** (`sighting_tour_tracking.create_datetime`, `location_*.timestamp`) son **UTC absoluto** — segundos Unix, o bien, en `location_*`, milisegundos Unix en el campo `timestamp` del JSON.
- **Cadenas HH:MM** (`tour_start`, `duration_from`, …) son **hora local Atlántico/Canarias** — escritas por el observador en el móvil. No llevan zona horaria en la base de datos. Cualquier herramienta que combine HH:MM con marcas UTC debe convertir explícitamente.
- El mapeo corregido de ejes `UtilPosition.LatDec/LonDec` está vigente desde 2026-05-08. Exportaciones Excel anteriores pueden tener lat/lon intercambiados en las columnas de coordenadas; las exportaciones actuales de la aplicación son correctas.

## Datos derivados — Trayectos de movimiento

Cada avistamiento con especie válida obtiene una **fila de movimiento** calculada (`sighting_movement` + `sighting_movement_track`) que describe el recorrido del barco durante la ventana del avistamiento. Son **datos derivados**, se regeneran automáticamente desde los datos crudos — **nunca editar a mano**.

Cómo se calculan (`SightingMovementService`):

1. **Ventana temporal** por avistamiento:
   - Preferentemente desde las marcas GPS en `location_begin.timestamp` + `location_end.timestamp` (ms UTC — misma fuente de reloj que los puntos de tracking).
   - Como respaldo: `duration_from`/`duration_until` (HH:MM local) interpretadas con `sighting.date`, cuando faltan las marcas (p. ej. importaciones CSV). Esta vía es sensible a la zona horaria.
   - La ventana se amplía con `default_lead_minutes` / `default_trail_minutes` (por defecto 5 + 5 min) para dar contexto.
2. Se cargan los **puntos de tracking** de la salida padre que caen dentro de la ventana y se ordenan por tiempo.
3. Se construyen **segmentos** entre cada par consecutivo: distancia (Haversine), duración, velocidad, rumbo (azimut inicial), ángulo de giro frente al segmento anterior.
4. **Valores atípicos** — segmentos cuya velocidad supera `outlier_speed_kmh` (por defecto 50 km/h) se marcan `quality='bad'`; se conservan pero no entran en los agregados.
5. **Agregados** (fila cabecera): distancia / duración total, velocidad media / máxima, media circular de rumbos (rumbo dominante), bounding box, etiqueta de fuente.

Los avistamientos sin puntos de tracking caen en `source='manual_begin_end'`: un único segmento de `location_begin` → `location_end`.

## Indicadores de calidad

- `vehicle.in_use=false` — embarcación retirada de los selectores operativos (los avistamientos históricos la siguen referenciando)
- `sighting.deleted=true` — observación borrada (soft-delete); excluida del cálculo de movimientos
- `sighting_movement.source` — `tracking` (recorrido real), `manual_begin_end` (respaldo de 2 puntos), `hybrid` (reservado)
- `sighting_movement_track.quality` — `good` o `bad` (sospecha de salto GPS)
- Columnas `*_status` (`depth_status`, `weather_status`) — `ok` / `land` / `invalid_location` / `no_data` / vacío (= nunca intentado)

## Uso científico

### Análisis recomendados

- **Presencia de especies**: filtrar avistamientos por `species_id` y periodo; exportar a Excel para procesamiento en R / Python / GIS.
- **Tamaño de grupo y demografía**: `species_count`, `juveniles`, `calves`, `newborns`, `subgroups`, `group_structure_id`.
- **Distribución espacial**: `location_begin` de todos los avistamientos, en combinación con `sighting_extended.depth_m` y SST para análisis de asociación a hábitat.
- **Patrones de comportamiento**: `behaviours` (JSON sobre `BehaviouralStates`), `reaction_id` (`EncounterCategories`).
- **Movimiento / cinemática**: segmentos `sighting_movement_track` — distribuciones de velocidad, histogramas de ángulo de giro, diagramas en rosa de rumbo, proxies de tiempo de permanencia.
- **Comparación anual**: la pestaña Year-comparison usa el mismo conjunto cargado que el mapa.

### Limitaciones

- **No se mide el esfuerzo.** La frecuencia de avistamientos depende del recorrido, del tiempo, de la experiencia del observador y del tiempo real de observación. Normalizar por horas o distancia de salida antes de informar tasas.
- **Sesgo de detección.** Especies grandes, especies con mucha actividad superficial y especies que permanecen cerca de la superficie están sobre-representadas.
- **Precisión posicional.** El GPS del móvil varía (~3–10 m típico, peor al inicio de la salida o cerca de acantilados). El campo `accuracy` del JSON `location_*` es la estimación del propio dispositivo.
- **Advertencia de zona horaria.** Los campos HH:MM están en hora local Atlántico/Canarias; al cruzarlos con marcas UTC, convertir explícitamente.
- **Identificación individual.** `recognizable_animals` es texto libre; **no** es una base de foto-ID estructurada. Tratarlo como un puntero a trabajo externo de foto-ID, no como identificador primario.
- **Movimientos derivados** requieren tanto `location_begin.timestamp` como puntos de tracking; los avistamientos sin marcas caen en una recta de 2 puntos que no es un trayecto real.
- **Segmentos con salto GPS** (`quality='bad'`) se marcan, no se eliminan. Para distribuciones de velocidad / rumbo filtrar siempre `quality='good'`.

## Formatos de exportación

- **Excel — Lista de avistamientos** (`/json/sightings/list/excel`): tabla completa por avistamiento con selector de columnas + formato de coordenadas. Incluye una hoja **Info** con el filtro activo, marca de tiempo de generación y nota sobre la corrección lat/lon. **Exportación científica primaria.**
- **Informe AROC** (`/json/officereport/create_export`): rellena la plantilla `PLANTILLA_AVISTAMIENTOS_AROC.xlsx` de la autoridad canaria. Un archivo por barco y semestre, con `datos GENERALES` y `datos SALIDAS` precargados. Entregable regulatorio a AROC.
- **Hoja de datos (PDF)**: una hoja imprimible con Mapa + Análisis + Comparación anual — usa el diálogo de impresión del navegador ("Guardar como PDF").

## Lista para la reproducibilidad

Al citar o compartir un resultado numérico derivado de MWPA:

1. **Anotar el filtro de exportación** (periodo, especie, organización, embarcación, patrón, término de búsqueda). La hoja Info del Excel lo registra automáticamente.
2. **Anotar la marca de tiempo de exportación** — los avistamientos pueden corregirse después y una re-exportación reflejará esas correcciones.
3. **Anotar el número de filas** — está en la hoja Info.
4. **Indicar si se incluyeron segmentos `quality='bad'`** en cualquier métrica derivada de movimiento.
5. **Indicar la interpretación de zona horaria** usada para campos HH:MM.
6. Conservar el Excel crudo junto con la publicación — así el análisis es reproducible desde el mismo punto de partida.

## Citar el conjunto de datos

Para publicaciones basadas en datos de MWPA, por favor:

1. **Reconocer a M.E.E.R. e.V.** como proveedor de datos — [m-e-e-r.de](https://m-e-e-r.de/).
2. Citar el **periodo de recogida** (fecha inicio / fin de los avistamientos incluidos), no la versión de la herramienta.
3. Antes de publicar, acordar un convenio de uso de datos específico con M.E.E.R. e.V.

---

Más información: [Esquema de la base de datos](https://dbdiagram.io/d/5dfa98f1edf08a25543f3bcc) · [Documentación de la API REST](https://swe.stoplight.io/docs/mwpa/) · [Wiki del proyecto](https://github.com/M-E-E-R-e-V/mwpa/wiki)