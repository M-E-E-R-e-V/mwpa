import {Lang} from '../../Lang';
import {
    FormGroup2,
    Input2,
    InputType2,
    LangTextV2,
    ModalDialog2,
    ModalDialogType2,
    Switch2
} from 'bambooo';
import {MovementConfigEntry} from '../../Api/SightingMovement';

/**
 * MovementSettingsModal
 *
 * Admin dialog for the persisted MovementConfig (`sighting_movement.config`
 * settings row). Edits the rebuild tunables that decide how long the
 * lead/trail window around each sighting is, whether the recorded
 * duration is preferred or strict, the GPS-jump speed threshold, and
 * the IANA zone the legacy HH:MM fallback parses against.
 *
 * The page is the source of truth for what's currently persisted —
 * fetch via `SightingMovement.getConfig()`, push back via
 * `SightingMovement.saveConfig()`. The modal only edits an in-memory
 * snapshot; the page closes it on a successful save.
 */
export class MovementSettingsModal extends ModalDialog2 {

    protected _inputLeadMinutes: Input2;

    protected _inputTrailMinutes: Input2;

    protected _switchPreferDuration: Switch2;

    protected _inputOutlierKmh: Input2;

    protected _inputLocalTz: Input2;

    public constructor() {
        super({id: 'movementsettingsmodaldialog', modalType: ModalDialogType2.large});

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this.getBody());

        const groupLead = new FormGroup2({
            label: new LangTextV2({text: 'Lead buffer (minutes before sighting start)'})
        });
        groupLead.appendTo(bodyCard);
        this._inputLeadMinutes = new Input2({type: InputType2.number});
        this._inputLeadMinutes.appendTo(groupLead);
        this._inputLeadMinutes.setPlaceholder('5');

        const groupTrail = new FormGroup2({
            label: new LangTextV2({text: 'Trail buffer (minutes after sighting end)'})
        });
        groupTrail.appendTo(bodyCard);
        this._inputTrailMinutes = new Input2({type: InputType2.number});
        this._inputTrailMinutes.appendTo(groupTrail);
        this._inputTrailMinutes.setPlaceholder('5');

        const groupPrefer = new FormGroup2({
            label: new LangTextV2({text: 'Apply lead/trail around recorded duration (off = strict)'})
        });
        groupPrefer.appendTo(bodyCard);
        this._switchPreferDuration = new Switch2({});
        this._switchPreferDuration.appendTo(groupPrefer);

        const groupOutlier = new FormGroup2({
            label: new LangTextV2({text: 'Outlier speed threshold (km/h, segments above are bad)'})
        });
        groupOutlier.appendTo(bodyCard);
        this._inputOutlierKmh = new Input2({type: InputType2.number});
        this._inputOutlierKmh.appendTo(groupOutlier);
        this._inputOutlierKmh.setPlaceholder('50');

        const groupTz = new FormGroup2({
            label: new LangTextV2({text: 'Local timezone for legacy HH:MM (IANA, e.g. Atlantic/Canary)'})
        });
        groupTz.appendTo(bodyCard);
        this._inputLocalTz = new Input2({type: InputType2.text});
        this._inputLocalTz.appendTo(groupTz);
        this._inputLocalTz.setPlaceholder('Atlantic/Canary');

        this.addButtonClose(Lang.i().l('Close'));
        this.addButtonSave(Lang.i().l('Save changes'), true);
    }

    /**
     * Hydrate the inputs from a config payload — called by the page
     * right before `show()` after fetching the current values.
     */
    public setConfig(config: MovementConfigEntry): void {
        this._inputLeadMinutes.setValue(`${config.default_lead_minutes}`);
        this._inputTrailMinutes.setValue(`${config.default_trail_minutes}`);
        this._switchPreferDuration.setEnable(config.prefer_sighting_duration);
        this._inputOutlierKmh.setValue(`${config.outlier_speed_kmh}`);
        this._inputLocalTz.setValue(config.default_local_tz);
    }

    /**
     * Read the current inputs as a payload ready for `saveConfig()`.
     * Numbers are parsed permissively (empty / NaN → 0); the backend
     * does the real range validation and surfaces a clean error.
     */
    public getConfig(): MovementConfigEntry {
        const lead = parseFloat(this._inputLeadMinutes.getValue());
        const trail = parseFloat(this._inputTrailMinutes.getValue());
        const outlier = parseFloat(this._inputOutlierKmh.getValue());

        return {
            default_lead_minutes: Number.isFinite(lead) ? lead : 0,
            default_trail_minutes: Number.isFinite(trail) ? trail : 0,
            prefer_sighting_duration: this._switchPreferDuration.isEnable(),
            outlier_speed_kmh: Number.isFinite(outlier) ? outlier : 0,
            default_local_tz: this._inputLocalTz.getValue().trim()
        };
    }

    public override resetValues(): void {
        this._inputLeadMinutes.setValue('');
        this._inputTrailMinutes.setValue('');
        this._switchPreferDuration.setEnable(true);
        this._inputOutlierKmh.setValue('');
        this._inputLocalTz.setValue('');
    }

}