import {User as UserAPI} from '../Api/User';
import {Card, CardBodyType, CardLine, CardType} from '../Bambooo/Content/Card/Card';
import {ContentCol, ContentColSize} from '../Bambooo/Content/ContentCol';
import {ContentRow, ContentRowClass} from '../Bambooo/Content/ContentRow';
import {FormGroup} from '../Bambooo/Content/Form/FormGroup';
import {InputBottemBorderOnly2, InputType} from '../Bambooo/Content/Form/InputBottemBorderOnly2';
import {Image, ImageArt, ImageType} from '../Bambooo/Content/Image/Image';
import {PText, PTextType} from '../Bambooo/Content/Text/PText';
import {Text, TextAlignment} from '../Bambooo/Content/Text/Text';
import {Lang} from '../Lang';
import {UtilAvatarGenerator} from '../Utils/UtilAvatarGenerator';
import {UtilColor} from '../Utils/UtilColor';
import {UtilShorname} from '../Utils/UtilShorname';
import {BasePage} from './BasePage';

/**
 * Profil
 */
export class Profil extends BasePage {

    /**
     * page name
     * @protected
     */
    protected _name: string = 'profil';

    /**
     * constructor
     */
    public constructor() {
        super();
    }

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {
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
            const detailsCard = new Card(colForm, CardBodyType.none);
            detailsCard.setTitle('Details');

            const groupEMail = new FormGroup(detailsCard, 'EMail');
            const emailInput = new InputBottemBorderOnly2(groupEMail);
            emailInput.setValue(currentuser!.user!.email);

            const passwordCard = new Card(colForm, CardBodyType.none);
            passwordCard.setTitle('Change password');

            const groupNewPassword = new FormGroup(passwordCard, 'New password');
            const newpasswordInput = new InputBottemBorderOnly2(groupNewPassword, undefined, InputType.password);
            newpasswordInput.show();

            const groupRepeatPassword = new FormGroup(passwordCard, 'Repeat password');
            const repeatpasswordInput = new InputBottemBorderOnly2(groupRepeatPassword, undefined, InputType.password);
            repeatpasswordInput.show();

            const mobilePinCard = new Card(colForm, CardBodyType.none);
            mobilePinCard.setTitle('Change mobile app pin');

            Lang.i().lAll();
        };

        // load table
        this._onLoadTable();
    }
}