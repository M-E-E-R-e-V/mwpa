import {
    ComponentType,
    FormGroup,
    InputBottemBorderOnly2,
    InputType,
    LangText,
    ModalDialog,
    ModalDialogType,
    Switch
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
export class MovementSettingsModal extends ModalDialog {

    protected _inputLeadMinutes: InputBottemBorderOnly2;

    protected _inputTrailMinutes: InputBottemBorderOnly2;

    protected _switchPreferDuration: Switch;

    protected _inputOutlierKmh: InputBottemBorderOnly2;

    protected _inputLocalTz: InputBottemBorderOnly2;

    public constructor(elementObject: ComponentType) {
        super(elementObject, 'movementsettingsmodaldialog', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);

        const groupLead = new FormGroup(
            bodyCard,
            new LangText('Lead buffer (minutes before sighting start)')
        );
        this._inputLeadMinutes = new InputBottemBorderOnly2(groupLead, undefined, InputType.number);
        this._inputLeadMinutes.setPlaceholder('5');

        const groupTrail = new FormGroup(
            bodyCard,
            new LangText('Trail buffer (minutes after sighting end)')
        );
        this._inputTrailMinutes = new InputBottemBorderOnly2(groupTrail, undefined, InputType.number);
        this._inputTrailMinutes.setPlaceholder('5');

        const groupPrefer = new FormGroup(
            bodyCard,
            new LangText('Apply lead/trail around recorded duration (off = strict)')
        );
        this._switchPreferDuration = new Switch(groupPrefer, 'movementpreferduration');

        const groupOutlier = new FormGroup(
            bodyCard,
            new LangText('Outlier speed threshold (km/h, segments above are bad)')
        );
        this._inputOutlierKmh = new InputBottemBorderOnly2(groupOutlier, undefined, InputType.number);
        this._inputOutlierKmh.setPlaceholder('50');

        const groupTz = new FormGroup(
            bodyCard,
            new LangText('Local timezone for legacy HH:MM (IANA, e.g. Atlantic/Canary)')
        );
        this._inputLocalTz = new InputBottemBorderOnly2(groupTz);
        this._inputLocalTz.setPlaceholder('Atlantic/Canary');

        this.addButtonClose(new LangText('Close'));
        this.addButtonSave(new LangText('Save changes'), true);
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