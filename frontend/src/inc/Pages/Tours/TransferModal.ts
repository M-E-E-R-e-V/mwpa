import {
    ButtonClass,
    ButtonDefault,
    ComponentType,
    FormGroup,
    FormRow,
    InputBottemBorderOnly2,
    InputType,
    LangText,
    ModalDialog,
    ModalDialogType
} from 'bambooo';
import moment from 'moment';
import {ToursTrackingNeighborTour} from '../../Api/Tours';

export type TransferModalConfirmFn = (targetTourId: number) => void;

/**
 * Modal that lets an admin pick the target tour for transferring a
 * brushed range of tracking points. Auto-fills with previous/next
 * tours of the same vehicle when available; otherwise the admin can
 * type a Tour-ID by hand.
 */
export class TransferModal extends ModalDialog {

    protected _radioPrev: JQuery<HTMLInputElement>;
    protected _radioNext: JQuery<HTMLInputElement>;
    protected _radioManual: JQuery<HTMLInputElement>;
    protected _inputManual: InputBottemBorderOnly2;

    protected _btnConfirm: ButtonDefault;

    protected _prev?: ToursTrackingNeighborTour;
    protected _next?: ToursTrackingNeighborTour;

    protected _rangeInfo: JQuery<HTMLDivElement>;

    protected _onConfirm: TransferModalConfirmFn | null = null;

    public constructor(elementObject: ComponentType) {
        super(elementObject, 'tourstrackingtransfermodal', ModalDialogType.large);

        this.setTitle(new LangText('Transfer tracking points'));

        const body = jQuery('<div class="card-body"/>').appendTo(this._body);

        this._rangeInfo = jQuery<HTMLDivElement>('<div class="text-muted small pb-2"/>').appendTo(body);

        const escape = (s: string): string => s.replace(/[&<>"']/g, (ch) =>
            ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;'})[ch] ?? ch);

        const radioName = `tourstrackingtransfer-${Math.random().toString(36).slice(2, 8)}`;

        const prevWrap = jQuery('<div class="form-check"/>').appendTo(body);
        this._radioPrev = jQuery<HTMLInputElement>(
            `<input class="form-check-input" type="radio" name="${escape(radioName)}" value="prev" disabled>`
        ).appendTo(prevWrap);
        jQuery('<label class="form-check-label"/>').text('Previous tour (no candidate)').appendTo(prevWrap);

        const nextWrap = jQuery('<div class="form-check"/>').appendTo(body);
        this._radioNext = jQuery<HTMLInputElement>(
            `<input class="form-check-input" type="radio" name="${escape(radioName)}" value="next" disabled>`
        ).appendTo(nextWrap);
        jQuery('<label class="form-check-label"/>').text('Next tour (no candidate)').appendTo(nextWrap);

        const manualWrap = jQuery('<div class="form-check"/>').appendTo(body);
        this._radioManual = jQuery<HTMLInputElement>(
            `<input class="form-check-input" type="radio" name="${escape(radioName)}" value="manual">`
        ).appendTo(manualWrap);
        jQuery('<label class="form-check-label"/>').text('Other tour by ID').appendTo(manualWrap);

        const row = new FormRow(body);
        const groupManual = new FormGroup(row.createCol(4), new LangText('Tour ID'));
        this._inputManual = new InputBottemBorderOnly2(groupManual, undefined, InputType.number);
        this._inputManual.setPlaceholder('e.g. 12345');

        this.addButtonClose(new LangText('Close'));
        this._btnConfirm = new ButtonDefault(this._footer, 'Transfer', 'fas fa-exchange-alt', ButtonClass.primary);
        this._btnConfirm.setOnClickFn(() => {
            const targetId = this._resolveTargetId();
            if (targetId <= 0) {
                return;
            }
            if (this._onConfirm) {
                this._onConfirm(targetId);
            }
        });

        const updateState = (): void => this._updateConfirmEnabled();

        this._radioPrev.on('change', updateState);
        this._radioNext.on('change', updateState);
        this._radioManual.on('change', updateState);
        this._inputManual.getElement().on('input', updateState);

        this._updateConfirmEnabled();
    }

    public setRange(timestampFrom: number, timestampTo: number, count: number): void {
        const from = moment(timestampFrom).format('YYYY-MM-DD HH:mm:ss');
        const to = moment(timestampTo).format('YYYY-MM-DD HH:mm:ss');
        this._rangeInfo.text(`Range: ${from} → ${to} · ${count} points`);
    }

    public setNeighbors(prev: ToursTrackingNeighborTour | undefined, next: ToursTrackingNeighborTour | undefined): void {
        this._prev = prev;
        this._next = next;

        const fmtLabel = (label: string, n?: ToursTrackingNeighborTour): string => {
            if (!n) {
                return `${label} (no candidate)`;
            }
            const range = n.tour_start && n.tour_end ? ` ${n.tour_start}–${n.tour_end}` : '';
            return `${label}: #${n.id} · ${n.date}${range} · ${n.count_trackings} pts`;
        };

        this._radioPrev.next('label').text(fmtLabel('Previous tour', prev));
        this._radioNext.next('label').text(fmtLabel('Next tour', next));

        if (prev) {
            this._radioPrev.removeAttr('disabled');
        } else {
            this._radioPrev.attr('disabled', 'disabled').prop('checked', false);
        }

        if (next) {
            this._radioNext.removeAttr('disabled');
        } else {
            this._radioNext.attr('disabled', 'disabled').prop('checked', false);
        }

        // Preselect the better candidate if exactly one is offered.
        if (prev && !next) {
            this._radioPrev.prop('checked', true);
        } else if (next && !prev) {
            this._radioNext.prop('checked', true);
        }

        this._updateConfirmEnabled();
    }

    public setOnConfirm(fn: TransferModalConfirmFn): void {
        this._onConfirm = fn;
    }

    public override resetValues(): void {
        this._prev = undefined;
        this._next = undefined;
        this._radioPrev.prop('checked', false).attr('disabled', 'disabled');
        this._radioNext.prop('checked', false).attr('disabled', 'disabled');
        this._radioManual.prop('checked', false);
        this._inputManual.setValue('');
        this._rangeInfo.text('');
        this._updateConfirmEnabled();
    }

    private _resolveTargetId(): number {
        if (this._radioPrev.is(':checked') && this._prev) {
            return this._prev.id;
        }
        if (this._radioNext.is(':checked') && this._next) {
            return this._next.id;
        }
        if (this._radioManual.is(':checked')) {
            const n = parseInt(this._inputManual.getValue(), 10);
            return Number.isFinite(n) && n > 0 ? n : 0;
        }
        return 0;
    }

    private _updateConfirmEnabled(): void {
        const id = this._resolveTargetId();
        const el = this._btnConfirm.getElement();
        if (id > 0) {
            el.removeAttr('disabled');
        } else {
            el.attr('disabled', 'disabled');
        }
    }

}