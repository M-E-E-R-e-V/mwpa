import {
    ButtonClass2,
    ButtonDefault2,
    Card2,
    ContentCol2,
    ContentColSize2,
    ContentRow2,
    LangTextV2
} from 'bambooo';
import {SightingMovement as SightingMovementAPI} from '../Api/SightingMovement';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';
import {MovementSettingsModal} from './Sighting/MovementSettingsModal';

/**
 * Admin → Calculations page — admin-only maintenance of derived data.
 *
 * Currently hosts the movement-track tooling that used to sit in the
 * Sighting list's card menu:
 *   - full rebuild of sighting_movement + sighting_movement_track
 *   - the persisted MovementConfig (lead/trail/outlier/tz)
 *
 * The backend routes (`/json/sighting/movement/rebuild_all`,
 * `/json/sighting/movement/config`) check `isAdmin` themselves; the menu
 * entry is gated with Session.ADMIN_ONLY so non-admins don't see it.
 */
export class Calculations extends BasePage {

    /**
     * name — must match the sidebar menu entry name.
     * @protected
     */
    protected override _name: string = 'admin-calculations';

    protected _movementSettingsDialog: MovementSettingsModal;

    /**
     * Rebuild in progress — blocks double clicks while the synchronous
     * server-side rebuild is running.
     * @protected
     */
    protected _rebuildRunning: boolean = false;

    public constructor() {
        super();

        this._movementSettingsDialog = new MovementSettingsModal();

        this._movementSettingsDialog.setOnSave(async(): Promise<void> => {
            try {
                await SightingMovementAPI.saveConfig(this._movementSettingsDialog.getConfig());
                this._toast.fire({
                    icon: 'success',
                    title: Lang.i().l('Settings saved') ?? 'Settings saved'
                });
                this._movementSettingsDialog.hide();
            } catch (err) {
                this._toast.fire({
                    icon: 'error',
                    title: `${Lang.i().l('Save failed') ?? 'Save failed'}: ${(err as Error).message}`
                });
            }
        });
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        const content = this._wrapper.getContentWrapper().getContent();

        const row1 = new ContentRow2(content.getContentFluidElement());
        const card = new Card2({});
        card.appendTo(new ContentCol2(row1, ContentColSize2.col12).getElement());
        card.setTitle(new LangTextV2({text: 'Movement tracks'}));

        const body = jQuery('<div class="card-body"/>').appendTo(card.getElement());

        const desc = 'Derived movement tracks per sighting (lead/trail window, outlier filter, timezone fallback).';

        jQuery('<p/>').text(Lang.i().l(desc) ?? desc).appendTo(body);

        const btnBar = jQuery('<div class="d-flex gap-2"/>').appendTo(body);

        const btnRebuild = new ButtonDefault2({
            title: Lang.i().l('Rebuild movements') ?? 'Rebuild movements',
            icon: 'fa fa-route',
            btnClass: ButtonClass2.warning
        });

        btnRebuild.appendTo(btnBar);
        btnRebuild.setOnClickFn((): void => {
            this._triggerRebuildMovements().catch(() => undefined);
        });

        const btnSettings = new ButtonDefault2({
            title: Lang.i().l('Movement settings') ?? 'Movement settings',
            icon: 'fa fa-cog',
            btnClass: ButtonClass2.default
        });

        btnSettings.appendTo(btnBar);
        btnSettings.setOnClickFn((): void => {
            this._openMovementSettings().catch(() => undefined);
        });

        Lang.i().lAll();
    }

    /**
     * Trigger a full rebuild of derived movement data. Synchronous on the
     * server side, so the promise resolves once all sightings are processed.
     * @protected
     */
    protected async _triggerRebuildMovements(): Promise<void> {
        if (this._rebuildRunning) {
            return;
        }

        const question = 'Rebuild every sighting\'s movement track now? This may take a while.';

        if (!window.confirm(Lang.i().l(question) ?? question)) {
            return;
        }

        this._rebuildRunning = true;

        this._toast.fire({
            icon: 'info',
            title: Lang.i().l('Rebuilding movements…') ?? 'Rebuilding movements…'
        });

        try {
            const msg = await SightingMovementAPI.rebuildAll();

            this._toast.fire({
                icon: 'success',
                title: `${Lang.i().l('Rebuild done') ?? 'Rebuild done'} (${msg})`
            });
        } catch (err) {
            this._toast.fire({
                icon: 'error',
                title: `${Lang.i().l('Rebuild failed') ?? 'Rebuild failed'}: ${(err as Error).message}`
            });
        } finally {
            this._rebuildRunning = false;
        }
    }

    /**
     * Open the MovementConfig editor. Fetched fresh on each open so a change
     * from another tab doesn't get clobbered.
     * @protected
     */
    protected async _openMovementSettings(): Promise<void> {
        try {
            const cfg = await SightingMovementAPI.getConfig();
            this._movementSettingsDialog.setTitle(new LangTextV2({text: 'Movement settings'}));
            this._movementSettingsDialog.setConfig(cfg);
            this._movementSettingsDialog.show();
        } catch (err) {
            this._toast.fire({
                icon: 'error',
                title: `${Lang.i().l('Load failed') ?? 'Load failed'}: ${(err as Error).message}`
            });
        }
    }

}