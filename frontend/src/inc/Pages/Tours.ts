import {
    Badge,
    BadgeType,
    ButtonMenu,
    ButtonType,
    Card,
    ColumnContent,
    ContentCol,
    ContentColSize,
    ContentRow,
    IconFa,
    LangText,
    LeftNavbarLink,
    Table,
    Td,
    Th,
    Tr
} from 'bambooo';
import moment from 'moment';
import {TourEntry, Tours as ToursAPI, ToursCreater, ToursDevice} from '../Api/Tours';
import {Vehicle as VehicleAPI, VehicleEntry} from '../Api/Vehicle';
import {VehicleDriver as VehicleDriverAPI, VehicleDriverEntry} from '../Api/VehicleDriver';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';
import {TourEditModal} from './Tours/TourEditModal';
import {ToursMap} from './Tours/TourMap';

/**
 * Tours
 */
export class Tours extends BasePage {

    public static NAME: string = 'tours';

    /**
     * page name
     * @protected
     */
    protected override _name: string = Tours.NAME;

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
        }, 'btn btn-block btn-default btn-sm', IconFa.add);
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol(row1, ContentColSize.col12));

        card.setTitle('Tours');

        const table = new Table(card.getElement());
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, new ColumnContent([
            new LangText('Id'),
            new LangText('Date')
        ]));

        // eslint-disable-next-line no-new
        new Th(trhead, new ColumnContent([
            new LangText('Vehicle'),
            new LangText('Driver')
        ]));

        // eslint-disable-next-line no-new
        new Th(trhead, new ColumnContent([
            new LangText('Time begin-end'),
            new LangText('Count sighting')
        ]));

        // eslint-disable-next-line no-new
        new Th(trhead, 'Count tracking-points');

        // eslint-disable-next-line no-new
        new Th(trhead, new ColumnContent([
            new LangText('from Device'),
            new LangText('Created by')
        ]));

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

            const onLoadtours = async(tours: TourEntry[], devices: ToursDevice[], creaters: ToursCreater[]): Promise<void> => {
                // devices ---------------------------------------------------------------------------------------------

                const mdevices = new Map<number, ToursDevice>();

                for (const device of devices) {
                    mdevices.set(device.id, device);
                }

                // creaters --------------------------------------------------------------------------------------------

                const mcreaters = new Map<number, ToursCreater>();

                for (const creater of creaters) {
                    mcreaters.set(creater.id, creater);
                }

                // -----------------------------------------------------------------------------------------------------

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
                    const tdTimeCount = new Td(trbody, `<b>${entry.tour_start} - ${entry.tour_end}</b><br>`);

                    // eslint-disable-next-line no-new
                    new Badge(
                        tdTimeCount,
                        `${entry.count_sightings}`,
                        entry.count_sightings > 0 ? BadgeType.success : BadgeType.secondary
                    );

                    // eslint-disable-next-line no-new
                    const tdTrackingCount = new Td(trbody, '');

                    if (entry.count_trackings > 0) {
                        const badgeTracking = new Badge(tdTrackingCount, `${entry.count_trackings}`, BadgeType.info);
                        badgeTracking.getElement().on('click', () => {
                            if (this._loadPageFn) {
                                this._loadPageFn(new ToursMap(entry.id));
                            }
                        });

                        badgeTracking.getElement().css({
                            cursor: 'pointer'
                        });
                    } else {
                        tdTrackingCount.addValue(`${entry.count_trackings}`);
                    }

                    let deviceCreaterStr = '';

                    const device = mdevices.get(entry.device_id);

                    if (device) {
                        deviceCreaterStr += `${device.name}`;
                    } else {
                        deviceCreaterStr += 'not set';
                    }

                    deviceCreaterStr += '<br>';

                    const creater = mcreaters.get(entry.creater_id);

                    if (creater) {
                        deviceCreaterStr += `${creater.name}`;
                    } else {
                        deviceCreaterStr += 'not set';
                    }

                    // eslint-disable-next-line no-new
                    new Td(trbody, deviceCreaterStr);

                    // action
                    const tdAction = new Td(trbody, '');
                    const abtnMenu = new ButtonMenu(tdAction, IconFa.bars, true, ButtonType.borderless);

                    abtnMenu.addMenuItem(
                        'Show Map',
                        (): void => {
                            if (this._loadPageFn) {
                                this._loadPageFn(new ToursMap(entry.id));
                            }
                        },
                        IconFa.hockeypuck
                    );

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

                await onLoadtours(tours.list!, tours.devices!, tours.creaters ?? []);

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
                            await onLoadtours(ttours.list!, ttours.devices!, ttours.creaters!);
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