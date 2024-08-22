import {
    Card,
    CardBodyType,
    CardLine,
    CardType,
    ContentCol,
    ContentColSize,
    ContentRow,
    ContentRowClass, ImageArt, ImageType,
    Image,
    TextAlignment,
    Text, PText, PTextType, FormGroup, InputBottemBorderOnly2, InputType, UtilAvatarGenerator, UtilShorname, UtilColor
} from 'bambooo';
import {User as UserAPI} from '../Api/User';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';

/**
 * Profil
 */
export class Profil extends BasePage {

    /**
     * page name
     * @protected
     */
    protected override _name: string = 'profil';

    /**
     * constructor
     */
    public constructor() {
        super();
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        const row1 = new ContentRow(this._wrapper, ContentRowClass.mb2);

        const colHead = new ContentCol(row1, ContentColSize.colSm12);
        colHead.getElement().append('<h1>Profile</h1>');

        const row2 = new ContentRow(this._wrapper);

        const colProfile = new ContentCol(row2, ContentColSize.colMd3);
        const colForm = new ContentCol(row2, ContentColSize.colMd9);

        this._onLoadTable = async(): Promise<void> => {
            colProfile.empty();
            colForm.empty();

            const currentuser = await UserAPI.getUserInfo();

            // profile
            const cardProfile = new Card(
                colProfile,
                CardBodyType.none,
                CardType.primary,
                CardLine.outline
            );

            cardProfile.hideHeader();

            const mProfileElement = cardProfile.getElement();
            const imageText = new Text(mProfileElement, TextAlignment.center);

            // eslint-disable-next-line no-new
            new Image(
                imageText,
                UtilAvatarGenerator.generateAvatar(
                    UtilShorname.getShortname(currentuser!.user!.fullname),
                    'white',
                    UtilColor.getColor(currentuser!.user!.username)
                ),
                ImageArt.profile,
                ImageType.fluidCircle
            );

            imageText.getElement().append(`<h3 class="profile-username text-center">${currentuser!.user!.fullname}</h3>`);
            const ptext = new PText(imageText, PTextType.muted, TextAlignment.center);
            ptext.addValue(`${currentuser!.user!.username}`);

            const ulElement = jQuery('<ul class="list-group list-group-unbordered mb-3"></ul>').appendTo(mProfileElement);
            jQuery(`<li class="list-group-item"><b>Main-Group</b> <a class="float-right">${currentuser!.group!.name}</a></li>`).appendTo(ulElement);
            jQuery(`<li class="list-group-item"><b>Organization</b> <a class="float-right">${currentuser!.organization!.name}</a></li>`).appendTo(ulElement);

            // form
            const detailsCard = new Card(colForm, CardBodyType.none, CardType.secondary, CardLine.outline);
            detailsCard.setTitle('Details');

            const groupEMail = new FormGroup(detailsCard, 'EMail');
            const emailInput = new InputBottemBorderOnly2(groupEMail);
            emailInput.setValue(currentuser!.user!.email);

            // password ------------------------------------------------------------------------------------------------

            const passwordCard = new Card(colForm, CardBodyType.none, CardType.secondary, CardLine.outline);
            passwordCard.setTitle('Change password');

            const groupNewPassword = new FormGroup(passwordCard, 'New password');
            const newpasswordInput = new InputBottemBorderOnly2(groupNewPassword, undefined, InputType.password);
            newpasswordInput.show();

            const groupRepeatPassword = new FormGroup(passwordCard, 'Repeat password');
            const repeatpasswordInput = new InputBottemBorderOnly2(groupRepeatPassword, undefined, InputType.password);
            repeatpasswordInput.show();

            const btnSavePassword = jQuery('<button type="button" class="btn btn-primary">Save password</button>').appendTo(passwordCard.getMainElement());
            btnSavePassword.on('click', async(): Promise<void> => {
                try {
                    if (await UserAPI.saveNewPassword({
                        password: newpasswordInput.getValue(),
                        repeatpassword: repeatpasswordInput.getValue()
                    })) {
                        this._toast.fire({
                            icon: 'success',
                            title: 'New password is save.'
                        });

                        newpasswordInput.setValue('');
                        repeatpasswordInput.setValue('');
                    }
                } catch (message) {
                    this._toast.fire({
                        icon: 'error',
                        title: message
                    });
                }
            });

            // pin -----------------------------------------------------------------------------------------------------

            const mobilePinCard = new Card(colForm, CardBodyType.none, CardType.secondary, CardLine.outline);
            mobilePinCard.setTitle('Change mobile app pin');

            const groupNewPin = new FormGroup(mobilePinCard, 'New pin');
            const newPinInput = new InputBottemBorderOnly2(groupNewPin, undefined, InputType.password);
            newPinInput.show();

            const groupRepeatPin = new FormGroup(mobilePinCard, 'Repeat pin');
            const repeatPinInput = new InputBottemBorderOnly2(groupRepeatPin, undefined, InputType.password);
            repeatPinInput.show();

            const btnSavePin = jQuery('<button type="button" class="btn btn-primary">Save pin</button>').appendTo(mobilePinCard.getMainElement());
            btnSavePin.on('click', async(): Promise<void> => {
                try {
                    if (await UserAPI.saveNewPin({
                        pin: newPinInput.getValue(),
                        repeatpin: repeatPinInput.getValue()
                    })) {
                        this._toast.fire({
                            icon: 'success',
                            title: 'New pin is save.'
                        });

                        newPinInput.setValue('');
                        repeatPinInput.setValue('');
                    }
                } catch (message) {
                    this._toast.fire({
                        icon: 'error',
                        title: message
                    });
                }
            });

            Lang.i().lAll();
        };

        // load table
        this._onLoadTable();
    }

}