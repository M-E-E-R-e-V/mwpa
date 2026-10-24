import {
    Card2,
    CardBodyType2,
    CardLine2,
    CardType2,
    ContentCol2,
    ContentColSize2,
    ContentRow2,
    ContentRowClass2,
    FormGroup2,
    Image2,
    ImageArt2,
    ImageType2,
    Input2,
    InputType2,
    LangTextV2,
    PText2,
    PTextType2,
    Text2,
    TextAlignment2,
    UtilAvatarGenerator,
    UtilColor,
    UtilShorname
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
        const content = this._wrapper.getContentWrapper().getContent();

        const row1 = new ContentRow2(content.getElement(), ContentRowClass2.mb2);

        const colHead = new ContentCol2(row1, ContentColSize2.colSm12);
        colHead.getElement().append('<h1>Profile</h1>');

        const row2 = new ContentRow2(content.getElement());

        const colProfile = new ContentCol2(row2, ContentColSize2.colMd3);
        const colForm = new ContentCol2(row2, ContentColSize2.colMd9);

        this._onLoadTable = async(): Promise<void> => {
            colProfile.empty();
            colForm.empty();

            const currentuser = await UserAPI.getUserInfo();

            // profile
            const cardProfile = new Card2({
                bodyType: CardBodyType2.none,
                cardType: CardType2.primary,
                cardLine: CardLine2.outline
            });
            cardProfile.appendTo(colProfile.getElement());

            cardProfile.hideHeader();

            const mProfileElement = cardProfile.getBodyElement();
            const imageText = new Text2({align: TextAlignment2.center});
            imageText.appendTo(mProfileElement);

            const avatar = new Image2({
                url: UtilAvatarGenerator.generateAvatar(
                    UtilShorname.getShortname(currentuser!.user!.fullname),
                    'white',
                    UtilColor.getColor(currentuser!.user!.username)
                ),
                art: ImageArt2.profile,
                type: ImageType2.fluidCircle
            });
            avatar.appendTo(imageText);

            imageText.getElement().append(`<h3 class="profile-username text-center">${currentuser!.user!.fullname}</h3>`);
            const ptext = new PText2({type: PTextType2.muted, align: TextAlignment2.center});
            ptext.appendTo(imageText);
            ptext.addValue(`${currentuser!.user!.username}`);

            const ulElement = jQuery('<ul class="list-group list-group-unbordered mb-3"></ul>').appendTo(mProfileElement);
            jQuery(`<li class="list-group-item"><b>Main-Group</b> <a class="float-right">${currentuser!.group!.name}</a></li>`).appendTo(ulElement);
            jQuery(`<li class="list-group-item"><b>Organization</b> <a class="float-right">${currentuser!.organization!.name}</a></li>`).appendTo(ulElement);

            // form
            const detailsCard = new Card2({
                bodyType: CardBodyType2.none,
                cardType: CardType2.secondary,
                cardLine: CardLine2.outline
            });
            detailsCard.appendTo(colForm.getElement());
            detailsCard.setTitle('Details');

            const groupEMail = new FormGroup2({label: new LangTextV2({text: 'EMail'})});
            groupEMail.appendTo(detailsCard.getBodyElement());
            const emailInput = new Input2({});
            emailInput.appendTo(groupEMail);
            emailInput.setValue(currentuser!.user!.email);

            // password ------------------------------------------------------------------------------------------------

            const passwordCard = new Card2({
                bodyType: CardBodyType2.none,
                cardType: CardType2.secondary,
                cardLine: CardLine2.outline
            });
            passwordCard.appendTo(colForm.getElement());
            passwordCard.setTitle('Change password');

            const groupNewPassword = new FormGroup2({label: new LangTextV2({text: 'New password'})});
            groupNewPassword.appendTo(passwordCard.getBodyElement());
            const newpasswordInput = new Input2({type: InputType2.password});
            newpasswordInput.appendTo(groupNewPassword);
            newpasswordInput.show();

            const groupRepeatPassword = new FormGroup2({label: new LangTextV2({text: 'Repeat password'})});
            groupRepeatPassword.appendTo(passwordCard.getBodyElement());
            const repeatpasswordInput = new Input2({type: InputType2.password});
            repeatpasswordInput.appendTo(groupRepeatPassword);
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

            const mobilePinCard = new Card2({
                bodyType: CardBodyType2.none,
                cardType: CardType2.secondary,
                cardLine: CardLine2.outline
            });
            mobilePinCard.appendTo(colForm.getElement());
            mobilePinCard.setTitle('Change mobile app pin');

            const groupNewPin = new FormGroup2({label: new LangTextV2({text: 'New pin'})});
            groupNewPin.appendTo(mobilePinCard.getBodyElement());
            const newPinInput = new Input2({type: InputType2.password});
            newPinInput.appendTo(groupNewPin);
            newPinInput.show();

            const groupRepeatPin = new FormGroup2({label: new LangTextV2({text: 'Repeat pin'})});
            groupRepeatPin.appendTo(mobilePinCard.getBodyElement());
            const repeatPinInput = new Input2({type: InputType2.password});
            repeatPinInput.appendTo(groupRepeatPin);
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