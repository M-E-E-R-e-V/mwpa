/* global JQuery */
import {Lang} from '../../Lang';
import {
    FormRow2,
    Input2,
    InputType2,
    ModalDialog2,
    ModalDialogType2,
    Select2
} from 'bambooo';
import {SpeciesGroupEntry} from '../../Api/SpeciesGroup';
import {UtilSpeciesSilhouette} from '../../Utils/UtilSpeciesSilhouette';
import {FormLayout} from '../../Widget/FormLayout';

/**
 * Create / edit a species (v2): general data (name, group), the taxonomy
 * ids (WoRMS AphiaID, OTT) with links to the external databases, and the
 * species image. A chosen image file is only kept here (pending) and
 * uploaded by the page after the species itself was saved; without an own
 * image the preview shows the built-in silhouette matched by name.
 */
export class SpeciesEditModal extends ModalDialog2 {

    /**
     * id of entry
     * @protected
     */
    protected _id: number|null = null;

    /**
     * input name
     * @protected
     */
    protected _inputName: Input2;

    /**
     * Input ott id
     * @protected
     */
    protected _ottId: Input2;

    /**
     * Input WoRMS aphia id
     * @protected
     */
    protected _aphiaId: Input2;

    /**
     * Link to the marinespecies.org page of the entered aphia id
     * @protected
     */
    protected _aphiaLink: JQuery<HTMLAnchorElement>;

    /**
     * Link to the Open Tree of Life page of the entered ott id
     * @protected
     */
    protected _ottLink: JQuery<HTMLAnchorElement>;

    /**
     * Select species group
     * @protected
     */
    protected _selectSpeciesGroup: Select2;

    /**
     * Image preview (<img>)
     * @protected
     */
    protected _imagePreview: JQuery<HTMLImageElement>;

    /**
     * Status text under the preview
     * @protected
     */
    protected _imageStatus: JQuery;

    /**
     * File input
     * @protected
     */
    protected _imageFile: JQuery<HTMLInputElement>;

    /**
     * Remove button
     * @protected
     */
    protected _imageRemoveBtn: JQuery<HTMLButtonElement>;

    /**
     * Hint shown for new species (upload only after the first save)
     * @protected
     */
    protected _imageNewHint: JQuery;

    /**
     * Url of the currently stored image (null = none)
     * @protected
     */
    protected _imageUrl: string | null = null;

    /**
     * File chosen but not yet uploaded
     * @protected
     */
    protected _pendingFile: File | null = null;

    /**
     * Object url for the pending file preview
     * @protected
     */
    protected _pendingUrl: string | null = null;

    /**
     * The stored image should be removed on save
     * @protected
     */
    protected _removeImage: boolean = false;

    /**
     * Validation message of the last chosen file ('' = none)
     * @protected
     */
    protected _imageError: string = '';

    /**
     * Max image size (same as the backend limit)
     * @protected
     */
    protected static readonly _MAX_IMAGE_SIZE = 5 * 1024 * 1024;

    /**
     * constructor
     */
    public constructor() {
        super({modalType: ModalDialogType2.large});

        const body = jQuery('<div class="card-body"/>').appendTo(this.getBody());

        // general -----------------------------------------------------------------------------------------------------

        const general = FormLayout.section(body, 'fas fa-paw', 'General');
        const rowGeneral = new FormRow2({});
        rowGeneral.appendTo(general);

        this._inputName = FormLayout.input(rowGeneral.createCol(8), 'Species name', {
            icon: 'fas fa-paw',
            placeholder: 'English, German (Latin) – e.g. Bottlenose Dolphin, Großer Tümmler (Tursiops truncatus)',
            required: true
        });

        this._selectSpeciesGroup = FormLayout.select(rowGeneral.createCol(4), 'Species group', {
            icon: 'fas fa-layer-group'
        });

        // taxonomy ----------------------------------------------------------------------------------------------------

        const taxonomy = FormLayout.section(
            body,
            'fas fa-sitemap',
            'Taxonomy',
            'IDs in external taxonomy databases. They identify the species unambiguously, e.g. for the Darwin Core export (GBIF/OBIS).'
        );

        const rowTaxonomy = new FormRow2({});
        rowTaxonomy.appendTo(taxonomy);

        this._aphiaId = FormLayout.input(rowTaxonomy.createCol(6), 'WoRMS AphiaID', {
            icon: 'fas fa-fish',
            type: InputType2.number,
            placeholder: 'e.g. 137111'
        });
        this._aphiaId.getElement().attr('min', '0');
        this._aphiaLink = FormLayout.link(FormLayout.fieldOf(this._aphiaId), 'Open on marinespecies.org');
        this._aphiaId.getElement().on('input change', (): void => this._updateLinks());

        this._ottId = FormLayout.input(rowTaxonomy.createCol(6), 'OTT ID (Open Tree of Life)', {
            icon: 'fas fa-tree',
            type: InputType2.number
        });
        this._ottId.getElement().attr('min', '0');
        this._ottLink = FormLayout.link(FormLayout.fieldOf(this._ottId), 'Open on Open Tree of Life');
        this._ottId.getElement().on('input change', (): void => this._updateLinks());

        // image -------------------------------------------------------------------------------------------------------

        const image = FormLayout.section(
            body,
            'fas fa-image',
            'Image',
            'Shown e.g. in the map popup of a sighting. Without an own image a built-in silhouette is chosen by the species name.'
        );

        const rowImage = jQuery('<div class="d-flex flex-wrap gap-3 align-items-start"/>').appendTo(image);

        const previewBox = jQuery('<div class="border rounded bg-body-tertiary d-flex align-items-center justify-content-center p-2"/>')
        .css({width: '160px', height: '120px'})
        .appendTo(rowImage);

        this._imagePreview = jQuery<HTMLImageElement>('<img alt=""/>')
        .css({'max-width': '100%', 'max-height': '100%', 'object-fit': 'contain'})
        .appendTo(previewBox);

        const controls = jQuery('<div class="flex-grow-1" style="min-width:220px;"/>').appendTo(rowImage);

        this._imageStatus = jQuery('<div class="small fw-semibold mb-2"/>').appendTo(controls);

        this._imageFile = jQuery<HTMLInputElement>('<input type="file" class="form-control form-control-sm mb-2" accept="image/png,image/jpeg,image/gif,image/webp">')
        .appendTo(controls);

        this._imageRemoveBtn = jQuery<HTMLButtonElement>('<button type="button" class="btn btn-sm btn-outline-danger"/>')
        .appendTo(controls);
        jQuery('<i class="fas fa-trash me-1"/>').appendTo(this._imageRemoveBtn);
        jQuery('<span/>').text(Lang.i().l('Remove image')).appendTo(this._imageRemoveBtn);

        jQuery('<div class="form-text small"/>')
        .text(Lang.i().l('PNG, JPEG, GIF or WebP, max. 5 MB. Best a cut-out picture on a transparent background. It is uploaded when saving.'))
        .appendTo(controls);

        this._imageNewHint = jQuery('<div class="form-text small text-warning-emphasis"/>')
        .text(Lang.i().l('Save the new species first, then the image can be uploaded.'))
        .appendTo(controls);

        this._imageFile.on('change', (): void => {
            const file = this._imageFile[0]?.files?.[0] ?? null;

            if (file !== null && file.size > SpeciesEditModal._MAX_IMAGE_SIZE) {
                this._setPendingFile(null);
                this._imageError = 'The file is too large (max. 5 MB).';
                this._renderImage();
                return;
            }

            if (file !== null && !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
                this._setPendingFile(null);
                this._imageError = 'Unsupported image format (PNG, JPEG, GIF or WebP)';
                this._renderImage();
                return;
            }

            this._setPendingFile(file);
        });

        this._imageRemoveBtn.on('click', (): void => {
            this._setPendingFile(null);
            this._removeImage = true;
            this._renderImage();
        });

        this._inputName.getElement().on('input change', (): void => this._renderImage());

        // buttons -----------------------------------------------------------------------------------------------------

        this.addButtonClose(Lang.i().l('Close'));
        this.addButtonSave(Lang.i().l('Save changes'), true);
    }

    /**
     * getId
     */
    public getSpecieId(): number|null {
        return this._id;
    }

    /**
     * setId
     * @param id
     */
    public setSpecieId(id: number|null): void {
        this._id = id;
        this._renderImage();
    }

    /**
     * getName
     */
    public override getName(): string {
        return this._inputName.getValue();
    }

    /**
     * setName
     * @param name
     */
    public override setName(name: string): void {
        this._inputName.setValue(name);
        this._renderImage();
    }

    /**
     * Set the url of the stored species image (null = none).
     * @param {string|null} url
     */
    public setImageUrl(url: string | null): void {
        this._imageUrl = url;
        this._removeImage = false;
        this._setPendingFile(null);
    }

    /**
     * File chosen to upload on save (null = none).
     * @return {File|null}
     */
    public getPendingImage(): File | null {
        return this._pendingFile;
    }

    /**
     * True when the stored image should be removed on save.
     * @return {boolean}
     */
    public isImageRemoved(): boolean {
        return this._removeImage && this._imageUrl !== null;
    }

    /**
     * Keep a chosen file as pending (preview via object url).
     * @param {File|null} file
     * @protected
     */
    protected _setPendingFile(file: File | null): void {
        if (this._pendingUrl !== null) {
            URL.revokeObjectURL(this._pendingUrl);
            this._pendingUrl = null;
        }

        this._pendingFile = file;
        this._imageError = '';

        if (file === null) {
            this._imageFile.val('');
        } else {
            this._pendingUrl = URL.createObjectURL(file);
            this._removeImage = false;
        }

        this._renderImage();
    }

    /**
     * Update preview, status text and buttons.
     * @protected
     */
    protected _renderImage(): void {
        const isNew = this._id === null || this._id === 0;
        const hasStored = this._imageUrl !== null && !this._removeImage;

        let src: string;
        let status: string;
        let cls: string;

        if (this._imageError !== '') {
            src = hasStored ? this._imageUrl ?? '' : UtilSpeciesSilhouette.url(this.getName());
            status = this._imageError;
            cls = 'text-danger';
        } else if (this._pendingUrl !== null) {
            src = this._pendingUrl;
            status = 'New image selected – will be uploaded when saving.';
            cls = 'text-primary';
        } else if (hasStored) {
            src = this._imageUrl ?? '';
            status = 'Own image';
            cls = 'text-success';
        } else {
            src = UtilSpeciesSilhouette.url(this.getName());
            status = this._removeImage
                ? 'Image will be removed when saving – the silhouette is used then.'
                : 'No own image – automatic silhouette by name.';
            cls = this._removeImage ? 'text-danger' : 'text-body-secondary';
        }

        this._imagePreview.attr('src', src);
        this._imageStatus
        .removeClass('text-primary text-success text-danger text-body-secondary')
        .addClass(cls)
        .text(Lang.i().l(status));

        this._imageFile.prop('disabled', isNew);
        this._imageNewHint.toggleClass('d-none', !isNew);
        this._imageRemoveBtn.toggleClass('d-none', !(hasStored || this._pendingUrl !== null));
    }

    /**
     * Set the Ott ID
     * @param {number} id
     */
    public setOttId(id: number): void {
        this._ottId.setValue(id === 0 ? '' : `${id}`);
        this._updateLinks();
    }

    /**
     * Return the Ott ID
     * @returns {number}
     */
    public getOttId(): number {
        return parseInt(this._ottId.getValue(), 10) || 0;
    }

    /**
     * Set the WoRMS aphia ID
     * @param {number} id
     */
    public setAphiaId(id: number): void {
        this._aphiaId.setValue(id === 0 ? '' : `${id}`);
        this._updateLinks();
    }

    /**
     * Return the WoRMS aphia ID
     * @returns {number}
     */
    public getAphiaId(): number {
        return parseInt(this._aphiaId.getValue(), 10) || 0;
    }

    /**
     * Show/hide the WoRMS and Open Tree of Life links for the entered ids.
     * @protected
     */
    protected _updateLinks(): void {
        const aphiaId = this.getAphiaId();
        const ottId = this.getOttId();

        FormLayout.setLink(this._aphiaLink, aphiaId > 0 ? `https://www.marinespecies.org/aphia.php?p=taxdetails&id=${aphiaId}` : null);
        FormLayout.setLink(this._ottLink, ottId > 0 ? `https://tree.opentreeoflife.org/taxonomy/browse?id=${ottId}` : null);
    }

    /**
     * Set species group list
     * @param {SpeciesGroupEntry[]} groups
     */
    public setSpeciesGroupList(groups: SpeciesGroupEntry[]): void {
        this._selectSpeciesGroup.clearValues();

        for (const group of groups) {
            this._selectSpeciesGroup.addValue({
                key: `${group.id}`,
                value: group.name
            });
        }
    }

    /**
     * Set the species group
     * @param {number} speciesGroupId
     */
    public setSpeciesGroup(speciesGroupId: number): void {
        this._selectSpeciesGroup.setSelectedValue(`${speciesGroupId}`);
    }

    /**
     * Return the species group
     * @returns {number}
     */
    public getSpeciesGroup(): number {
        return parseInt(this._selectSpeciesGroup.getSelectedValue(), 10) || 0;
    }

    /**
     * resetValues
     */
    public override resetValues(): void {
        this.setSpecieId(null);
        this.setName('');
        this.setImageUrl(null);
        this.setOttId(0);
        this.setAphiaId(0);
        this.setSpeciesGroup(0);
    }

}