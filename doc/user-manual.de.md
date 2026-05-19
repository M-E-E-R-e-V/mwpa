# MWPA — Benutzerhandbuch

<p align="center">
  <img src="public/whale-ico.png" width="100" alt="MWPA" />
</p>

Dieses Handbuch führt Seite für Seite durch das MWPA-Webfrontend.
Datenmodell, Feldbedeutung und wissenschaftliche Nutzung der Daten
sind in [Datenerhebung & wissenschaftliche Nutzung](data-collection.de.md)
beschrieben.

> Sprachen: [English](user-manual.en.md) · **Deutsch** · [Español](user-manual.es.md)

## Inhalt

1. [Anmeldung](#1-anmeldung)
2. [Navigation](#2-navigation)
3. [Sichtungsliste](#3-sichtungsliste)
4. [Touren](#4-touren)
5. [Externe Touren](#5-externe-touren)
6. [Ozean- & Fischerei-Karte](#6-ozean--fischerei-karte)
7. [Live-AIS-Karte](#7-live-ais-karte)
8. [Admin → Benutzer](#8-admin--benutzer)
9. [Admin → Benutzergruppen](#9-admin--benutzergruppen)
10. [Admin → Rollen](#10-admin--rollen)
11. [Admin → Organisation](#11-admin--organisation)
12. [Admin → Arten](#12-admin--arten)
13. [Admin → Fahrzeuge](#13-admin--fahrzeuge)
14. [Admin → Begegnungen](#14-admin--begegnungen)
15. [Admin → Geräte](#15-admin--geräte)
16. [Admin → Externe Tour-Quellen](#16-admin--externe-tour-quellen)
17. [Admin → Services](#17-admin--services)

---

## 1. Anmeldung

Die Webanwendung im Browser öffnen (Standard `https://localhost:3000/`)
und mit E-Mail-Adresse und Passwort anmelden. Eine frische Installation
bringt standardmäßig folgendes Administratorkonto mit:

| Feld     | Wert                 |
|----------|----------------------|
| E-Mail   | `admin@mwpa.org`     |
| Passwort | `changeMyPassword`   |

> **Dieses Passwort unmittelbar nach der ersten Anmeldung ändern.**

<p align="center">
  <img src="screenshots/manual/00-login.png" width="640" alt="Anmeldebildschirm" />
</p>

Nach erfolgreicher Anmeldung landet man auf der **Sichtungsliste**.

---

## 2. Navigation

Das Interface folgt dem AdminLTE-Layout:

- **Linke Seitenleiste** — Hauptnavigation. Übergeordnete Gruppen (z. B. *Tours*, *Admin*) klappen per Klick aus.
- **Topleiste rechts** — Sprachumschalter (EN / DE / ES), Vollbild, Abmelden.
- **Benutzer-Panel** in der Seitenleiste — aktueller Benutzer; Klick öffnet das Profil.
- **Fußzeile** — Versionsnummer und Link zum GitHub-Projekt.

Die Schaltfläche (≡) neben dem Seitentitel klappt die Seitenleiste auf
einen reinen Icon-Modus zusammen — für mehr Platz auf kleinen Displays.

---

## 3. Sichtungsliste

Standard-Startseite. Jede auf einer Tour erfasste Beobachtung erscheint hier als Zeile.

<p align="center">
  <img src="screenshots/manual/01-sighting.png" width="900" alt="Sichtungsliste" />
</p>

Angezeigt werden u. a. Tour-Id, Datum, Fahrzeug/Organisation, Art,
Gruppengröße, Dauer, Position, Verhalten und Reaktion. Die Tabs über
der Tabelle wechseln zwischen:

- **List** — Tabellenansicht (siehe oben), pro Spalte sortierbar, Suche in jeder Spalten-Kopfzeile.
- **Map** — Sichtungs-Marker auf der Karte plus die abgeleiteten Bewegungstracks.
- **Analytics** — Crossfilter-Dashboard (Datum, Art, Fahrzeug, Skipper, …).
- **Year comparison** — Verteilungs-Diagramme Jahr für Jahr.
- **Export** — Excel-Export mit Spaltenauswahl und Koordinatenformat.

Die Schaltfläche **+ Add tour** legt eine neue Tour an (Sichtungen
werden normalerweise mobil eingegeben, aber der Tour-Rahmen kann
hier ergänzt werden).

Das Aktionsmenü (☰) am Zeilenende öffnet das Modal **Sichtung
bearbeiten** mit allen Feldern, Bildergalerie und den abgeleiteten
Bathymetrie-/Wetterdaten.

---

## 4. Touren

Jede Zeile ist eine Fahrt auf einem Boot an einem Tag — siehe
[Datenmodell](data-collection.de.md#domänenmodell).

<p align="center">
  <img src="screenshots/manual/02-tours.png" width="900" alt="Tourenliste" />
</p>

Sichtbare Spalten: Tour-Id, Datum, Fahrzeug + Skipper, Start-/Endzeit,
Anzahl Sichtungen, Anzahl GPS-Tracking-Punkte, Personen an Bord,
Quell-Gerät und Anleger. **+ Add tour** legt manuell eine Tour an; das
Aktionsmenü erlaubt Bearbeiten, Löschen oder Export der Tour.

---

## 5. Externe Touren

Unterbereich von *Tours*, der von externen Anbietern (z. B. FareHarbor)
importierte Fahrten anzeigt. Die Tabelle entspricht der normalen
Tour-Liste, ergänzt um die Spalten **Externe Quelle** und **Externe Id**.
Diese Zeilen sind gegenüber der Quelle schreibgeschützt; ein lokales
Fahrzeug / ein lokaler Skipper kann jedoch zugeordnet werden.

<p align="center">
  <img src="screenshots/manual/03-tours-external.png" width="900" alt="Externe Touren" />
</p>

---

## 6. Ozean- & Fischerei-Karte

Zeigt jede Sichtung auf einer Bathymetrie-Basiskarte mit Layern für
Oberflächensalinität, Chlorophyll-a, Meeresspiegel-Anomalie und
Oberflächenströmungen (ERDDAP) sowie dem GFW-Fischereiaufwand.

<p align="center">
  <img src="screenshots/manual/04-ocean-fishing-map.png" width="900" alt="Ozean- & Fischerei-Karte" />
</p>

Über das Panel **Data sources** rechts lassen sich Basiskarten und
Overlays umschalten. Der Streifen unten zeigt Verteilungs-,
Fischereiaufwands- und Monatsmittel-Diagramme für die sichtbaren
Sichtungen.

---

## 7. Live-AIS-Karte

Aktuelle Schiffspositionen von AISStream.io auf der gleichen Basiskarte.
Klick auf einen Marker zeigt die jüngste Spur des Schiffes.

<p align="center">
  <img src="screenshots/manual/05-ais-live-map.png" width="900" alt="Live-AIS-Karte" />
</p>

---

## 8. Admin → Benutzer

Verwaltung der Operator-Konten.

<p align="center">
  <img src="screenshots/manual/06-admin-users.png" width="900" alt="Benutzerverwaltung" />
</p>

Jeder Benutzer hat Id, Benutzername, vollen Namen, E-Mail, Hauptgruppe,
ein Admin-Flag und einen Status (*aktiv / deaktiviert*). **+ Add User**
öffnet das Bearbeitungs-Modal — dort lassen sich zusätzliche Gruppen
zuweisen und Passwörter zurücksetzen.

---

## 9. Admin → Benutzergruppen

Gruppen verbinden eine *Rolle* (admin / importer / driver / guide …) mit
einer *Organisation*. Ein Benutzer kann mehreren Gruppen angehören,
hat aber genau eine *Hauptgruppe*.

<p align="center">
  <img src="screenshots/manual/07-admin-user-groups.png" width="900" alt="Benutzergruppen" />
</p>

---

## 10. Admin → Rollen

Rollen bündeln die im System verfügbaren Rechte (RBAC). Neue Rechte
werden in [`schemas/schemas.json`](../schemas/schemas.json) über den
vtseditor ergänzt — keine Freitexte.

<p align="center">
  <img src="screenshots/manual/08-admin-roles.png" width="900" alt="Rollen" />
</p>

---

## 11. Admin → Organisation

Eigentümer von Fahrzeugen, Skippern, Touren und Sichtungen. Eine
MWPA-Instanz kann mehrere Organisationen bedienen.

<p align="center">
  <img src="screenshots/manual/09-admin-organization.png" width="900" alt="Organisation" />
</p>

---

## 12. Admin → Arten

Stammdaten der Wal-/Delfinarten (und weiterer Tiere), aus denen
Beobachter wählen können. Jede Art gehört zu einer **Artengruppe**
(Odontoceti / Mysticeti / …) und kann eine externe **OTT-Id** für die
Taxonomie tragen.

<p align="center">
  <img src="screenshots/manual/10-admin-species.png" width="900" alt="Arten" />
</p>

---

## 13. Admin → Fahrzeuge

Die Boote der Flotte. Nur Einträge mit **In use** = wahr werden beim
Anlegen einer neuen Tour angeboten.

<p align="center">
  <img src="screenshots/manual/11-admin-vehicle.png" width="900" alt="Fahrzeuge" />
</p>

---

## 14. Admin → Begegnungen

Begegnungs-Kategorien für das Feld **Reaktion** einer Sichtung —
*Interaction*, *No Response*, *Avoidance*, *Proximity*, *Unknown* usw.

<p align="center">
  <img src="screenshots/manual/12-admin-encounters.png" width="900" alt="Begegnungen" />
</p>

---

## 15. Admin → Geräte

Mobile Geräte, die sich mit dem Backend synchronisiert haben (eine
Zeile pro Installation). Hilfreich, um zu sehen, welches Handy / Tablet
eine Tour hochgeladen hat.

<p align="center">
  <img src="screenshots/manual/13-admin-devices.png" width="900" alt="Geräte" />
</p>

---

## 16. Admin → Externe Tour-Quellen

Konfiguriert Drittanbieter (z. B. FareHarbor), die die
[Externen Touren](#5-externe-touren) liefern. Jede Zeile speichert
Anbieter-Typ, Zugangsdaten und ein Poll-Intervall.

<p align="center">
  <img src="screenshots/manual/14-admin-external-tour.png" width="900" alt="Externe Tour-Quellen" />
</p>

---

## 17. Admin → Services

Status-Dashboard des Service-Managers im Backend. **Runner** (z. B.
`mariadb`, `httpserver`) halten die Plattform am Laufen; **Scheduler**
(`depth`, `weather`, `ocean`, `fishing-effort`, `external-tour`,
`live-ais`) aktualisieren abgeleitete Daten per Cron.

<p align="center">
  <img src="screenshots/manual/15-admin-services.png" width="900" alt="Services" />
</p>

Über das Aktionsmenü einer Zeile lässt sich ein manueller Lauf
auslösen oder das Log des letzten Laufs inspizieren.

---

## Weiterführend

- [Datenerhebung & wissenschaftliche Nutzung](data-collection.de.md) — was jedes Feld bedeutet und wie die Exporte wissenschaftlich genutzt werden.
- [Projekt-Wiki](https://github.com/M-E-E-R-e-V/mwpa/wiki) — Installation, Deployment, AROC-Workflow.
- [REST-API-Referenz](https://swe.stoplight.io/docs/mwpa/) — vollständige Endpunkt-Dokumentation.