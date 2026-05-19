# MWPA — Manual de usuario

<p align="center">
  <img src="public/whale-ico.png" width="100" alt="MWPA" />
</p>

Esta guía recorre el frontend web de MWPA página por página.
Para el modelo de datos, el significado de cada campo y el uso
científico del conjunto de datos consulta
[Recogida de datos y uso científico](data-collection.es.md).

> Idiomas: [English](user-manual.en.md) · [Deutsch](user-manual.de.md) · **Español**

## Contenido

1. [Inicio de sesión](#1-inicio-de-sesión)
2. [Navegación](#2-navegación)
3. [Lista de avistamientos](#3-lista-de-avistamientos)
4. [Salidas](#4-salidas)
5. [Salidas externas](#5-salidas-externas)
6. [Mapa Ocean & Fishing](#6-mapa-ocean--fishing)
7. [Mapa AIS en vivo](#7-mapa-ais-en-vivo)
8. [Admin → Usuarios](#8-admin--usuarios)
9. [Admin → Grupos de usuarios](#9-admin--grupos-de-usuarios)
10. [Admin → Roles](#10-admin--roles)
11. [Admin → Organización](#11-admin--organización)
12. [Admin → Especies](#12-admin--especies)
13. [Admin → Embarcación](#13-admin--embarcación)
14. [Admin → Encuentros](#14-admin--encuentros)
15. [Admin → Dispositivos](#15-admin--dispositivos)
16. [Admin → Fuentes externas de salidas](#16-admin--fuentes-externas-de-salidas)
17. [Admin → Servicios](#17-admin--servicios)

---

## 1. Inicio de sesión

Abre la aplicación web en tu navegador (por defecto
`https://localhost:3000/`) e inicia sesión con tu correo electrónico y
contraseña. La cuenta de administrador que viene con una instalación
nueva es:

| Campo      | Valor                |
|------------|----------------------|
| Correo     | `admin@mwpa.org`     |
| Contraseña | `changeMyPassword`   |

> **Cambia esta contraseña inmediatamente después del primer inicio de sesión.**

<p align="center">
  <img src="screenshots/manual/00-login.png" width="640" alt="Pantalla de inicio de sesión" />
</p>

Tras iniciar sesión correctamente aterrizas en la lista de **Avistamientos**.

---

## 2. Navegación

La interfaz sigue el diseño AdminLTE:

- **Barra lateral izquierda** — navegación principal. Los grupos de primer nivel (p. ej. *Tours*, *Admin*) se despliegan al hacer clic.
- **Barra superior (derecha)** — selector de idioma (EN / DE / ES), pantalla completa, cerrar sesión.
- **Panel de usuario** en la barra lateral — usuario actual; un clic abre el perfil.
- **Pie de página** — número de versión y enlace al proyecto en GitHub.

El botón (≡) junto al título de la página colapsa la barra lateral a
modo solo-iconos para liberar espacio en pantallas pequeñas.

---

## 3. Lista de avistamientos

Página de inicio por defecto. Cada observación registrada durante una
salida aparece como una fila.

<p align="center">
  <img src="screenshots/manual/01-sighting.png" width="900" alt="Lista de avistamientos" />
</p>

Las columnas incluyen id de salida, fecha, embarcación / organización,
especie, tamaño de grupo, duración, posición, comportamiento y reacción.
Las pestañas sobre la tabla cambian entre:

- **List** — vista tabular (mostrada arriba), ordenable por columna y con búsqueda en cada cabecera.
- **Map** — marcadores de avistamientos sobre el mapa más las trayectorias derivadas.
- **Analytics** — panel crossfilter (fecha, especie, embarcación, patrón, …).
- **Year comparison** — gráficos de distribución año a año.
- **Export** — exportación a Excel con selector de columnas y formato de coordenadas.

El botón **+ Add tour** crea una nueva salida (los avistamientos se
introducen normalmente desde la app móvil, pero el contenedor de salida
puede añadirse aquí).

El menú de acciones (☰) al final de cada fila abre el modal **Editar
avistamiento** con la lista completa de campos, galería de fotos y los
datos derivados de batimetría / meteorología.

---

## 4. Salidas

Cada fila es un viaje de un barco en un día — consulta el
[modelo de datos](data-collection.es.md#modelo-de-dominio).

<p align="center">
  <img src="screenshots/manual/02-tours.png" width="900" alt="Lista de salidas" />
</p>

Columnas visibles: id de salida, fecha, embarcación + patrón,
hora de inicio / fin, número de avistamientos, número de puntos GPS,
personas a bordo, dispositivo origen y autor. **+ Add tour** crea una
entrada manual; el menú de acciones permite editar, eliminar o exportar.

---

## 5. Salidas externas

Subsección de *Tours* que lista los viajes importados de proveedores
externos (p. ej. FareHarbor). La tabla es como la de Salidas normales
pero con las columnas adicionales **Fuente externa** e **Id externo**.
Estas filas son de solo lectura respecto a la fuente; se puede asignar
una embarcación / patrón local para enriquecer el registro.

<p align="center">
  <img src="screenshots/manual/03-tours-external.png" width="900" alt="Salidas externas" />
</p>

---

## 6. Mapa Ocean & Fishing

Muestra cada avistamiento sobre un mapa base de batimetría con capas
de salinidad superficial, clorofila-a, anomalía del nivel del mar y
corrientes superficiales (ERDDAP), además del esfuerzo pesquero de GFW.

<p align="center">
  <img src="screenshots/manual/04-ocean-fishing-map.png" width="900" alt="Mapa Ocean & Fishing" />
</p>

El panel **Data sources** a la derecha permite alternar mapas base y
superposiciones. La franja inferior muestra gráficos de distribución,
esfuerzo pesquero y media mensual para los avistamientos visibles.

---

## 7. Mapa AIS en vivo

Posiciones de embarcaciones en tiempo real desde AISStream.io sobre el
mismo mapa base. Haz clic en un marcador para abrir su rastro reciente.

<p align="center">
  <img src="screenshots/manual/05-ais-live-map.png" width="900" alt="Mapa AIS en vivo" />
</p>

---

## 8. Admin → Usuarios

Gestiona las cuentas de operador.

<p align="center">
  <img src="screenshots/manual/06-admin-users.png" width="900" alt="Administración de usuarios" />
</p>

Cada usuario tiene id, nombre de usuario, nombre completo, correo,
grupo principal, indicador de admin y estado (*activo / deshabilitado*).
**+ Add User** abre el modal de edición, donde también se asignan
grupos secundarios y se restablecen contraseñas.

---

## 9. Admin → Grupos de usuarios

Los grupos asocian un *rol* (admin / importer / driver / guide …) con
una *organización*. Un usuario puede pertenecer a varios grupos pero
siempre tiene exactamente un *grupo principal*.

<p align="center">
  <img src="screenshots/manual/07-admin-user-groups.png" width="900" alt="Grupos de usuarios" />
</p>

---

## 10. Admin → Roles

Los roles agrupan los permisos (RBAC) disponibles en el sistema. Los
nuevos permisos se añaden en
[`schemas/schemas.json`](../schemas/schemas.json) mediante el vtseditor;
no son texto libre.

<p align="center">
  <img src="screenshots/manual/08-admin-roles.png" width="900" alt="Roles" />
</p>

---

## 11. Admin → Organización

Entidad propietaria de embarcaciones, patrones, salidas y avistamientos.
Una sola instancia MWPA puede atender a varias organizaciones.

<p align="center">
  <img src="screenshots/manual/09-admin-organization.png" width="900" alt="Organización" />
</p>

---

## 12. Admin → Especies

Lista maestra de cetáceos (y otros animales) entre los que el
observador puede elegir. Cada especie pertenece a un **grupo de
especies** (Odontoceti / Mysticeti / …) y puede llevar un **OTT id**
externo para enlazar con la taxonomía.

<p align="center">
  <img src="screenshots/manual/10-admin-species.png" width="900" alt="Especies" />
</p>

---

## 13. Admin → Embarcación

Las embarcaciones de la flota. Solo las entradas con **In use** = true
se ofrecen al crear una nueva salida.

<p align="center">
  <img src="screenshots/manual/11-admin-vehicle.png" width="900" alt="Embarcación" />
</p>

---

## 14. Admin → Encuentros

Categorías de encuentro utilizadas en el campo **Reacción** de un
avistamiento — *Interaction*, *No Response*, *Avoidance*, *Proximity*,
*Unknown*, etc.

<p align="center">
  <img src="screenshots/manual/12-admin-encounters.png" width="900" alt="Encuentros" />
</p>

---

## 15. Admin → Dispositivos

Dispositivos móviles que se han sincronizado con el backend (una fila
por instalación). Útil para rastrear qué teléfono / tableta subió cada
salida.

<p align="center">
  <img src="screenshots/manual/13-admin-devices.png" width="900" alt="Dispositivos" />
</p>

---

## 16. Admin → Fuentes externas de salidas

Configura proveedores externos (p. ej. FareHarbor) que alimentan la
lista de [Salidas externas](#5-salidas-externas). Cada fila guarda el
tipo de proveedor, las credenciales y un intervalo de sondeo.

<p align="center">
  <img src="screenshots/manual/14-admin-external-tour.png" width="900" alt="Fuentes externas de salidas" />
</p>

---

## 17. Admin → Servicios

Panel de estado del gestor de servicios del backend. Los **runners**
(p. ej. `mariadb`, `httpserver`) mantienen la plataforma en marcha; los
**schedulers** (`depth`, `weather`, `ocean`, `fishing-effort`,
`external-tour`, `live-ais`) refrescan los datos derivados según una
expresión cron.

<p align="center">
  <img src="screenshots/manual/15-admin-services.png" width="900" alt="Servicios" />
</p>

Desde el menú de acciones de cada fila se puede lanzar una ejecución
manual o inspeccionar el registro de la última ejecución.

---

## Más información

- [Recogida de datos y uso científico](data-collection.es.md) — qué significa cada campo y cómo usar las exportaciones para investigación.
- [Wiki del proyecto](https://github.com/M-E-E-R-e-V/mwpa/wiki) — instalación, despliegue, flujo AROC.
- [Referencia REST API](https://swe.stoplight.io/docs/mwpa/) — documentación completa de los endpoints.