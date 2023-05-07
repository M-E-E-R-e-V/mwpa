import moment from 'moment';
import {Vehicle as VehicleAPI, VehicleEntry} from '../Api/Vehicle';
import {VehicleDriver as VehicleDriverAPI, VehicleDriverEntry} from '../Api/VehicleDriver';
import {TourEntry, Tours as ToursAPI} from '../Api/Tours';
import {ColumnContent} from '../Bambooo/ColumnContent';
import {LangText} from '../Bambooo/Lang/LangText';
import {Td} from '../Bambooo/Content/Table/Td';
import {Card} from '../Bambooo/Content/Card/Card';
import {ContentCol, ContentColSize} from '../Bambooo/Content/ContentCol';
import {ContentRow} from '../Bambooo/Content/ContentRow';
import {Table} from '../Bambooo/Content/Table/Table';
import {Th} from '../Bambooo/Content/Table/Th';
import {Tr} from '../Bambooo/Content/Table/Tr';
import {LeftNavbarLink} from '../Bambooo/Navbar/LeftNavbarLink';
import {ButtonType} from '../Bambooo/Content/Form/Button';
import {ButtonMenu} from '../Bambooo/Content/Form/ButtonMenu';
import {IconFa} from '../Bambooo/Content/Icon/Icon';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';
import {TourEditModal} from './Tours/TourEditModal';

/**
 * Tours
 */
export class Tours extends BasePage {

    /**
     * page name
     * @protected
     */
    protected _name: string = 'tours';

    /**
     * tour dialog
     * @protected
     */
    protected _tourDialog: TourEditModal;

    /**
     * constructor
     */
    public constructor() {
        super();

        // tour modal --------------------------------------------------------------------------------------------------

        this._tourDialog = new TourEditModal(
            this._wrapper.getContentWrapper().getContent().getElement()
        );

        // Navbar Left -------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add tour', () => {
            this._tourDialog.setTitle('Add new tour');
            this._tourDialog.show();
            return false;
        });
    }

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol(row1, ContentColSize.col12));

        card.setTitle('Tours');

        const table = new Table(card.getElement());
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, 'Id<br>Date');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Vehicle<br>Driver');

        // eslint-disable-next-line no-new
        new Th(trhead, new ColumnContent([
            new LangText('Time begin-end')
        ]));

        // eslint-disable-next-line no-new
        new Th(trhead, 'Count sighting');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Count tracking-points');

        // eslint-disable-next-line no-new
        new Th(trhead, '');

        /**
         * onLoadList
         */
        const onLoadList = async(): Promise<void> => {
            card.showLoading();

            // vehicles ------------------------------------------------------------------------------------------------

            const vehicles = await VehicleAPI.getList();
            const mvehicles = new Map<number, VehicleEntry>();

            if (vehicles) {
                for (const tvehicle of vehicles) {
                    mvehicles.set(tvehicle.id, tvehicle);
                }
            }

            // drivers -------------------------------------------------------------------------------------------------

            const drivers = await VehicleDriverAPI.getList();
            const mdrivers = new Map<number, VehicleDriverEntry>();

            if (drivers) {
                for (const tdriver of drivers) {
                    mdrivers.set(tdriver.id, tdriver);
                }
            }

            // sightings -----------------------------------------------------------------------------------------------

            const onLoadtours = async(tours: TourEntry[]): Promise<void> => {
                for (const entry of tours) {
                    let vehicleName = '';
                    let vehicleDriverName = '';

                    const vehicle = mvehicles.get(entry.vehicle_id!);

                    if (vehicle) {
                        vehicleName = vehicle.name;
                    }

                    const driver = mdrivers.get(entry.vehicle_driver_id!);

                    if (driver) {
                        vehicleDriverName = driver.user.name;
                    }

                    const trbody = new Tr(table.getTbody());

                    const date = moment(entry.date?.split(' ')[0]);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `<b>#${entry.id}</b><br>${date.format('YYYY.MM.DD')}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${vehicleName}<br>${vehicleDriverName}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `<b>${entry.tour_start} - ${entry.tour_end}</b>`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${entry.count_sightings}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${entry.count_trackings}`);

                    // action
                    const tdAction = new Td(trbody, '');
                    const abtnMenu = new ButtonMenu(tdAction, IconFa.bars, true, ButtonType.borderless);

                    abtnMenu.addMenuItem(
                        'Delete',
                        (): void => {
                            alert('Delete todo');
                        },
                        IconFa.trash
                    );
                }
            };

            let offset = 0;
            const limit = 50;

            const tours = await ToursAPI.getList({
                limit,
                offset
            });

            if (tours) {
                card.setTitle(`Tours (${tours.count})`);

                await onLoadtours(tours.list!);

                jQuery(window).on('scroll', async() => {
                    const h = jQuery(window).height()!;
                    const sh = jQuery(window).scrollTop()!;

                    /*
                     *
                     * if (sh > h) {
                     *     table.getThead().css({
                     *         'position': 'fixed',
                     *         'top': 0,
                     *         'z-index': 9000,
                     *         'background': 'white',
                     *         'width': table.getThead().width()
                     *     });
                     * } else {
                     *     table.getThead().css({
                     *         'position': '',
                     *         'top': '',
                     *         'z-index': '',
                     *         'background': '',
                     *         'width': ''
                     *     });
                     * }
                     */

                    if (sh >= h - 5) {
                        offset += limit;

                        const ttours = await ToursAPI.getList({
                            limit,
                            offset
                        });

                        if (ttours) {
                            await onLoadtours(ttours.list!);
                        }
                    }
                });
            }

            card.hideLoading();
            Lang.i().lAll();
        };


        // load table
        await onLoadList();
    }

}