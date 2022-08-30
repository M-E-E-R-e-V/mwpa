import {User as UserAPI} from '../Api/User';
import {Card, CardBodyType, CardLine, CardType} from '../Bambooo/Content/Card/Card';
import {ContentCol, ContentColSize} from '../Bambooo/Content/ContentCol';
import {ContentRow, ContentRowClass} from '../Bambooo/Content/ContentRow';
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
        // @ts-ignore
        const colForm = new ContentCol(row2, ContentColSize.colMd9);

        // profile
        const cardProfile = new Card(
            colProfile,
            CardBodyType.none,
            CardType.primary,
            CardLine.outline
            );

        cardProfile.hideHeader();

        // form

        this._onLoadTable = async(): Promise<void> => {
            const currentuser = await UserAPI.getUserInfo();

            const mProfileElement = cardProfile.getMainElement();
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

            Lang.i().lAll();
        };

        // load table
        this._onLoadTable();
    }
}