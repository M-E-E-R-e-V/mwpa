import {SightingCurrentRegion} from '../../Api/SightingCurrentRegion';
import {CurrentRegionQuiver} from './CurrentRegionQuiver';

/**
 * Standalone Bootstrap modal that loads + renders the regional CMEMS
 * u/v patch for one sighting on demand.
 *
 * Kept off bambooo's `ModalDialog` because that class is designed for
 * edit dialogs with footer Save/Close buttons — this is a read-only
 * detail viewer that disposes itself when the user closes it. The
 * lighter raw-Bootstrap-markup approach also lets us drop the modal
 * cleanly after `hidden.bs.modal` so repeated opens don't leak DOM.
 */
export class CurrentRegionQuiverModal {

    /**
     * Open the modal for a sighting. Fetches lazily once the modal is
     * on screen — the modal shows a small spinner first, then either
     * the SVG quiver or a "no patch yet" message.
     */
    public static show(sightingId: number, headerLine: string): void {
        const id = `cmems-currents-modal-${Date.now()}`;
        const html = `
            <div class="modal fade" id="${id}" tabindex="-1" role="dialog">
                <div class="modal-dialog modal-dialog-centered" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Regional currents · Sighting #${sightingId}</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body" style="text-align:center;">
                            <div class="text-muted" style="font-size:0.85em;margin-bottom:8px;">${headerLine}</div>
                            <div class="cmems-quiver-target">
                                <div class="text-muted">Loading regional currents …</div>
                            </div>
                            <div class="cmems-quiver-meta text-muted" style="font-size:0.75em;margin-top:8px;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        const $modal = jQuery(html).appendTo('body');
        const $target = $modal.find('.cmems-quiver-target');
        const $meta = $modal.find('.cmems-quiver-meta');

        $modal.on('hidden.bs.modal', () => {
            $modal.remove();
        });

        ($modal as unknown as {modal: (action: string) => void;}).modal('show');

        void CurrentRegionQuiverModal._loadAndRender(sightingId, $target, $meta);
    }

    /**
     * Issue the API call, update the modal body. Errors land as a
     * neutral message — for this read-only viewer we don't surface
     * full error details, the user can re-open and check the network
     * tab if they care.
     */
    private static async _loadAndRender(sightingId: number, $target: JQuery, $meta: JQuery): Promise<void> {
        try {
            const entry = await SightingCurrentRegion.get(sightingId);

            if (entry === null) {
                $target.html('<div class="text-danger">Failed to load regional currents.</div>');
                return;
            }

            if (entry === undefined) {
                $target.html(
                    '<div class="text-muted">No regional patch has been fetched yet for this sighting. '
                    + 'The background service (CurrentFieldService) fills patches one sighting per hour; '
                    + 'check back later.</div>'
                );
                return;
            }

            $target.html(CurrentRegionQuiver.render(entry.grid));
            $meta.html(
                `Source: ${entry.source} · ${entry.grid_n_lat}×${entry.grid_n_lon} cells @ `
                + `${entry.grid_step_deg.toFixed(3)}° step · valid ${entry.valid_at.slice(0, 10)} `
                + `· fetched ${entry.fetched_at.slice(0, 10)}`
            );
        } catch (e) {
            $target.html(`<div class="text-danger">Error: ${(e as Error).message}</div>`);
        }
    }

}