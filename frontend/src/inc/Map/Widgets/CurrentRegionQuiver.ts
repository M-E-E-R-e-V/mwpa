import {SightingCurrentRegionGrid} from '../../Api/SightingCurrentRegion';

/**
 * Render a regional CMEMS u/v patch as an SVG quiver plot — one arrow
 * per grid cell, length encoding magnitude, hue encoding direction (so
 * the eye can follow streamline-like patterns without needing colour
 * for magnitude on top of the length).
 *
 * Pure SVG, no D3 / no charting lib. The map page already vendors a
 * lot of OpenLayers / Bootstrap; we keep this off the dependency graph
 * since the geometry is trivial.
 */
export class CurrentRegionQuiver {

    /**
     * Build the full SVG document for the patch. The caller injects it
     * directly via `.html(svg)`.
     *
     * Layout: latitudes increase upward (north on top); longitudes
     * increase to the right. The sighting position is marked with a
     * small white-stroked circle at the centre cell.
     */
    public static render(grid: SightingCurrentRegionGrid, width: number = 360, height: number = 360): string {
        const nLat = grid.grid_lat.length;
        const nLon = grid.grid_lon.length;

        if (nLat === 0 || nLon === 0) {
            return '<div class="text-muted">No grid data.</div>';
        }

        const padding = 32;
        const plotW = width - (2 * padding);
        const plotH = height - (2 * padding);
        const stepX = plotW / Math.max(1, nLon - 1);
        const stepY = plotH / Math.max(1, nLat - 1);
        const cellMin = Math.min(stepX, stepY);

        // Scale arrows so the largest finite vector maps to ~80 % of a
        // cell. That keeps neighbouring arrows visually separated even
        // in a strong jet.
        let maxSpeed = 0;

        for (let i = 0; i < nLat; i++) {
            const uRow = grid.u[i];
            const vRow = grid.v[i];

            if (!uRow || !vRow) {
                continue;
            }

            for (let j = 0; j < nLon; j++) {
                const u = uRow[j];
                const v = vRow[j];

                if (u !== null && v !== null && Number.isFinite(u) && Number.isFinite(v)) {
                    const sp = Math.sqrt((u * u) + (v * v));

                    if (sp > maxSpeed) {
                        maxSpeed = sp;
                    }
                }
            }
        }

        const arrowMax = cellMin * 0.8;
        const speedToLen = maxSpeed > 0 ? arrowMax / maxSpeed : 0;
        const arrows: string[] = [];

        for (let i = 0; i < nLat; i++) {
            const uRow = grid.u[i];
            const vRow = grid.v[i];

            if (!uRow || !vRow) {
                continue;
            }

            for (let j = 0; j < nLon; j++) {
                const u = uRow[j];
                const v = vRow[j];

                // Top of SVG = north → flip row index
                const cx = padding + (j * stepX);
                const cy = padding + ((nLat - 1 - i) * stepY);

                if (u === null || v === null || !Number.isFinite(u) || !Number.isFinite(v)) {
                    arrows.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1.5" fill="#bbb"/>`);
                    continue;
                }

                const speed = Math.sqrt((u * u) + (v * v));
                const len = speed * speedToLen;

                if (len < 0.6) {
                    arrows.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1.5" fill="#666"/>`);
                    continue;
                }

                // SVG y grows downward → north is +y in math, so dy is negated.
                const dx = u * speedToLen;
                const dy = -v * speedToLen;
                const x2 = cx + dx;
                const y2 = cy + dy;
                const colour = CurrentRegionQuiver._hueForDirection(u, v);
                arrows.push(
                    `<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" `
                    + `stroke="${colour}" stroke-width="1.5" marker-end="url(#qarrow)"/>`
                );
            }
        }

        const centreLat = grid.grid_lat[Math.floor(nLat / 2)];
        const centreLon = grid.grid_lon[Math.floor(nLon / 2)];
        const cxCentre = padding + (Math.floor(nLon / 2) * stepX);
        const cyCentre = padding + ((nLat - 1 - Math.floor(nLat / 2)) * stepY);

        const axisLabels = [
            `<text x="${(padding).toFixed(0)}" y="${(height - 8).toFixed(0)}" font-size="10" fill="#777">${CurrentRegionQuiver._fmtLon(grid.grid_lon[0])}</text>`,
            `<text x="${(width - padding - 4).toFixed(0)}" y="${(height - 8).toFixed(0)}" font-size="10" fill="#777" text-anchor="end">${CurrentRegionQuiver._fmtLon(grid.grid_lon[nLon - 1])}</text>`,
            `<text x="4" y="${(padding + 4).toFixed(0)}" font-size="10" fill="#777">${CurrentRegionQuiver._fmtLat(grid.grid_lat[nLat - 1])}</text>`,
            `<text x="4" y="${(height - padding).toFixed(0)}" font-size="10" fill="#777">${CurrentRegionQuiver._fmtLat(grid.grid_lat[0])}</text>`,
            `<text x="${(width / 2).toFixed(0)}" y="14" font-size="10" fill="#444" text-anchor="middle">`
                + `centre ${CurrentRegionQuiver._fmtLat(centreLat)}, ${CurrentRegionQuiver._fmtLon(centreLon)}`
                + ` · max ${maxSpeed.toFixed(2)} m/s</text>`
        ];

        return `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background:#fafbfc;border:1px solid #e5e7eb;border-radius:4px;">
                <defs>
                    <marker id="qarrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                        <path d="M0,0 L10,5 L0,10 z" fill="currentColor"/>
                    </marker>
                </defs>
                ${arrows.join('\n')}
                <circle cx="${cxCentre.toFixed(1)}" cy="${cyCentre.toFixed(1)}" r="3.5" fill="none" stroke="#fff" stroke-width="1.5"/>
                <circle cx="${cxCentre.toFixed(1)}" cy="${cyCentre.toFixed(1)}" r="3.5" fill="none" stroke="#222" stroke-width="0.8"/>
                ${axisLabels.join('\n')}
            </svg>
        `;
    }

    /**
     * HSL hue from the bearing of (u, v) — 0° = east, 90° = north, …
     * Gives a stable colour wheel: northward currents shift to green,
     * westward to blue, etc., so streamline-like structures pop out.
     */
    private static _hueForDirection(u: number, v: number): string {
        const angleRad = Math.atan2(v, u);
        const angleDeg = (angleRad * 180 / Math.PI + 360) % 360;
        const hue = angleDeg;
        return `hsl(${hue.toFixed(0)}, 70%, 45%)`;
    }

    /**
     * 4-decimal latitude with N/S suffix.
     */
    private static _fmtLat(lat: number): string {
        const abs = Math.abs(lat).toFixed(2);
        const suffix = lat >= 0 ? 'N' : 'S';
        return `${abs}°${suffix}`;
    }

    /**
     * 4-decimal longitude with E/W suffix.
     */
    private static _fmtLon(lon: number): string {
        const abs = Math.abs(lon).toFixed(2);
        const suffix = lon >= 0 ? 'E' : 'W';
        return `${abs}°${suffix}`;
    }

}