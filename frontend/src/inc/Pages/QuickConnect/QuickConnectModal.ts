import {
    ComponentType,
    LangText,
    ModalDialog,
    ModalDialogType
} from 'bambooo';
import QRCode from 'qrcode';
import {QuickConnectPayload} from 'mwpa_schemas';
import {QuickConnect} from '../../Api/QuickConnect';

/**
 * QuickConnectModal
 *
 * Renders the QR code the Flutter app scans to log in. Asks the backend for a
 * fresh OTP on every show and on every "Refresh" click; the OTP is single-use
 * and TTL-bound on the server side, so the modal does not have to track expiry
 * any more strictly than a friendly countdown.
 */
export class QuickConnectModal extends ModalDialog {

    /**
     * Pixel size of the rendered QR PNG. 280px fits the bootstrap default modal
     * width with comfortable quiet-zone padding on either side.
     */
    private static readonly QR_PIXEL_SIZE = 280;

    private readonly _qrImg: JQuery<HTMLImageElement>;

    private readonly _infoUsername: JQuery<HTMLDivElement>;

    private readonly _infoServer: JQuery<HTMLDivElement>;

    private readonly _infoCountdown: JQuery<HTMLDivElement>;

    private readonly _errorBox: JQuery<HTMLDivElement>;

    private _countdownInterval: ReturnType<typeof setInterval> | null = null;

    private _currentExpiresAt: number = 0;

    public constructor(elementObject: ComponentType) {
        super(elementObject, 'quickconnectmodal', ModalDialogType.small);

        this.setTitle(new LangText('App Quick Connect'));

        const body = jQuery<HTMLDivElement>('<div class="text-center" />').appendTo(this._body);

        jQuery<HTMLParagraphElement>('<p class="text-muted" />')
            .text('Scan this code with the MWPA mobile app to sign in.')
            .appendTo(body);

        const qrWrap = jQuery<HTMLDivElement>('<div class="my-3" />').appendTo(body);
        this._qrImg = jQuery<HTMLImageElement>('<img alt="Quick Connect QR" />')
            .css({width: `${QuickConnectModal.QR_PIXEL_SIZE}px`, height: `${QuickConnectModal.QR_PIXEL_SIZE}px`})
            .appendTo(qrWrap) as JQuery<HTMLImageElement>;

        this._infoUsername = jQuery<HTMLDivElement>('<div class="font-weight-bold" />').appendTo(body);
        this._infoServer = jQuery<HTMLDivElement>('<div class="small text-muted" />').appendTo(body);
        this._infoCountdown = jQuery<HTMLDivElement>('<div class="small text-muted mt-2" />').appendTo(body);

        this._errorBox = jQuery<HTMLDivElement>('<div class="alert alert-danger mt-3" style="display:none;" />').appendTo(body);

        const btnRefresh = this.addButtonSave(new LangText('Refresh'), true);
        btnRefresh.setOnClickFn(async() => {
            await this._loadAndRender();
        });
        this.setOnSave(async() => {
            await this._loadAndRender();
        });

        this.addButtonClose(new LangText('Close'));

        // Bind directly to the bootstrap event so we don't steal the public
        // setOnHidden slot from callers that want to e.g. destroy() on close.
        this._element.on('hidden.bs.modal', () => {
            this._stopCountdown();
        });
    }

    /**
     * Open the modal and immediately request a fresh OTP. Errors are surfaced
     * in the inline error box rather than as a toast so the user sees them in
     * context (and can hit Refresh to retry).
     */
    public async open(): Promise<void> {
        this.show();
        await this._loadAndRender();
    }

    private async _loadAndRender(): Promise<void> {
        this._errorBox.hide().text('');
        this._stopCountdown();

        try {
            const payload = await QuickConnect.generate();
            await this._renderPayload(payload);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to generate Quick Connect code.';
            this._errorBox.text(msg).show();
            this._qrImg.removeAttr('src');
            this._infoUsername.text('');
            this._infoServer.text('');
            this._infoCountdown.text('');
        }
    }

    private async _renderPayload(payload: QuickConnectPayload): Promise<void> {
        const dataUrl = await QRCode.toDataURL(JSON.stringify(payload), {
            width: QuickConnectModal.QR_PIXEL_SIZE,
            margin: 1,
            errorCorrectionLevel: 'M'
        });

        this._qrImg.attr('src', dataUrl);
        this._infoUsername.text(payload.username);
        this._infoServer.text(payload.server);
        this._currentExpiresAt = payload.expires_at;
        this._tickCountdown();
        this._countdownInterval = setInterval(() => this._tickCountdown(), 1000);
    }

    private _tickCountdown(): void {
        const remaining = Math.max(0, Math.floor((this._currentExpiresAt - Date.now()) / 1000));

        if (remaining === 0) {
            this._infoCountdown.text('Code expired - click Refresh to generate a new one.');
            this._stopCountdown();
            return;
        }

        this._infoCountdown.text(`Valid for ${remaining}s`);
    }

    private _stopCountdown(): void {
        if (this._countdownInterval !== null) {
            clearInterval(this._countdownInterval);
            this._countdownInterval = null;
        }
    }

}
