import {Circle, Fill, Icon, Stroke, Style} from 'ol/style';

/**
 * Stable identifiers for the built-in sighting-domain styles. Layer
 * modules look up a {@link Style} from {@link SightingStyles} via these
 * names; features carry the matching value on their `pointtype`
 * property so the style function can pick the right rendering.
 *
 * Keep in sync with the species_group names produced by the backend
 * (lower-case): 'mysticeti', 'odontoceti', 'testudines'. Sub-route
 * variants are emitted by the Tour page when drawing per-sighting
 * tracks.
 */
export enum SightingMapObjectType {
    Route = 'route',
    RouteOdontoceti = 'route_odontoceti',
    RouteMysticeti = 'route_mysticeti',
    Start = 'start',
    End = 'end',
    Mysticeti = 'mysticeti',
    Odontoceti = 'odontoceti',
    Testudines = 'testudines',
    Boat = 'boat',
    MovementSegment = 'movement_segment',
    MovementSegmentBad = 'movement_segment_bad'
}

/**
 * Built-in style registry shared by every sighting/tour map. Centralised
 * so a colour or icon change applies everywhere at once.
 */
export class SightingStyles {

    /**
     * @protected
     */
    protected static _styles: Map<string, Style> = new Map<string, Style>([
        [SightingMapObjectType.Route, new Style({
            stroke: new Stroke({
                width: 2
            }),
            fill: new Fill({
                color: 'rgba(255,0,0,0.5)'
            })
        })],
        [SightingMapObjectType.RouteOdontoceti, new Style({
            stroke: new Stroke({
                width: 10,
                color: '#85C1E9'
            })
        })],
        [SightingMapObjectType.RouteMysticeti, new Style({
            stroke: new Stroke({
                width: 10,
                color: '#2471A3'
            })
        })],
        [SightingMapObjectType.Start, new Style({
            image: new Circle({
                radius: 7,
                fill: new Fill({color: '#69e356'}),
                stroke: new Stroke({
                    color: 'black',
                    width: 1
                })
            })
        })],
        [SightingMapObjectType.End, new Style({
            image: new Circle({
                radius: 7,
                fill: new Fill({color: 'red'}),
                stroke: new Stroke({
                    color: 'black',
                    width: 1
                })
            })
        })],
        [SightingMapObjectType.Mysticeti, new Style({
            image: new Icon({
                src: 'images/marker-mysticeti.png',
                anchor: [0.5, 1],
                rotateWithView: false,
                size: [500, 500],
                scale: 0.1
            })
        })],
        [SightingMapObjectType.Odontoceti, new Style({
            image: new Icon({
                src: 'images/marker-odontoceti.png',
                anchor: [0.5, 1],
                rotateWithView: false,
                size: [500, 500],
                scale: 0.1
            })
        })],
        [SightingMapObjectType.Testudines, new Style({
            image: new Icon({
                src: 'images/marker-testudines.png',
                anchor: [0.5, 1],
                rotateWithView: false,
                size: [500, 500],
                scale: 0.1
            })
        })],
        [SightingMapObjectType.MovementSegment, new Style({
            stroke: new Stroke({
                width: 3,
                color: 'rgba(40, 116, 240, 0.85)'
            })
        })],
        [SightingMapObjectType.MovementSegmentBad, new Style({
            stroke: new Stroke({
                width: 2,
                color: 'rgba(220, 53, 69, 0.85)',
                lineDash: [6, 4]
            })
        })]
    ]);

    public static get(name: string): Style | undefined {
        return SightingStyles._styles.get(name);
    }

}