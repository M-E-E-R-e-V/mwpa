import moment from 'moment';
import {Driver as DriverAPI, DriverEntry} from '../Api/Driver';
import {EncounterCategorieEntry, EncounterCategories as EncounterCategoriesAPI} from '../Api/EncounterCategories';
import {Sightings as SightingsAPI, SightingsEntry} from '../Api/Sightings';
import {Species as SpeciesAPI, SpeciesEntry} from '../Api/Species';
import {Vehicle as VehicleAPI, VehicleEntry} from '../Api/Vehicle';
import {ColumnContent} from '../Bambooo/ColumnContent';
import {Card} from '../Bambooo/Content/Card/Card';
import {ContentCol, ContentColSize} from '../Bambooo/Content/ContentCol';
import {ContentRow} from '../Bambooo/Content/ContentRow';
import {Button, ButtonType} from '../Bambooo/Content/Form/Button';
import {Table} from '../Bambooo/Content/Table/Table';
import {Td} from '../Bambooo/Content/Table/Td';
import {Th} from '../Bambooo/Content/Table/Th';
import {Tr} from '../Bambooo/Content/Table/Tr';
import {LangText} from '../Bambooo/Lang/LangText';
import {LeftNavbarLink} from '../Bambooo/Navbar/LeftNavbarLink';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';
import {SightingEditModal} from './Sighting/SightingEditModal';

/**
 * Sighting
 */
export class Sighting extends BasePage {

    /**
     * page name
     * @protected
     */
    protected _name: string = 'sighting';

    /**
     * sighting dialog
     * @protected
     */
    protected _sightingDialog: SightingEditModal;

    /**
     * constructor
     */
    public constructor() {
        super();

        // sighting modal ----------------------------------------------------------------------------------------------

        this._sightingDialog = new SightingEditModal(
            this._wrapper.getContentWrapper().getContent().getElement()
        );

        // Navbar Left -------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), new LangText('Add sighting'), () => {
            this._sightingDialog.setTitle(new LangText('Add new sighting'));
            this._sightingDialog.show();
            return false;
        });
    }

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol(row1, ContentColSize.col12));

        card.setTitle(new LangText('Sighting'));

        const table = new Table(card.getElement());
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, new ColumnContent([
            new LangText('Id'),
            new LangText('TourId'),
        ]));

        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Date'));

        // eslint-disable-next-line no-new
        new Th(trhead, new ColumnContent([
            new LangText('Vehicle'),
            new LangText('Driver')
        ]));

        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Species'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Group-Size'));

        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Time begin'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Time end'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Duration'));

        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Location'));

        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Encounter'));

        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Other species'));

        // eslint-disable-next-line no-new
        new Th(trhead, '');

        /**
         * onLoadList
         */
        const onLoadList = async(): Promise<void> => {
            card.showLoading();

            // species -------------------------------------------------------------------------------------------------

            const species = await SpeciesAPI.getList();
            const mspecies = new Map<number, SpeciesEntry>();

            if (species) {
                for (const tspecies of species) {
                    mspecies.set(tspecies.id, tspecies);
                }
            }

            // encounters ----------------------------------------------------------------------------------------------

            const encates = await EncounterCategoriesAPI.getList();
            const mencates = new Map<number, EncounterCategorieEntry>();

            if (encates) {
                for (const tencat of encates) {
                    mencates.set(tencat.id, tencat);
                }
            }

            // vehicles ------------------------------------------------------------------------------------------------

            const vehicles = await VehicleAPI.getList();
            const mvehicles = new Map<number, VehicleEntry>();

            if (vehicles) {
                for (const tvehicle of vehicles) {
                    mvehicles.set(tvehicle.id, tvehicle);
                }
            }

            // drivers -------------------------------------------------------------------------------------------------

            const drivers = await DriverAPI.getList();
            const mdrivers = new Map<number, DriverEntry>();

            if (drivers) {
                for (const tdriver of drivers) {
                    mdrivers.set(tdriver.id, tdriver);
                }
            }

            // sightings -----------------------------------------------------------------------------------------------

            const onLoadsightings = async(sightings: SightingsEntry[]): Promise<void> => {
                for (const entry of sightings) {
                    let encounterCategorieName = '';
                    let specieName = '';
                    let vehicleName = '';
                    let vehicleDriverName = '';

                    const specie = mspecies.get(entry.species_id);

                    if (specie) {
                        specieName = specie.name;
                    }

                    const encCate = mencates.get(entry.encounter_categorie_id);

                    if (encCate) {
                        encounterCategorieName = encCate.name;
                    }

                    const vehicle = mvehicles.get(entry.vehicle_id);

                    if (vehicle) {
                        vehicleName = vehicle.name;
                    }

                    const driver = mdrivers.get(entry.vehicle_driver_id);

                    if (driver) {
                        vehicleDriverName = driver.name;
                    }

                    // table -------------------------------------------------------------------------------------------

                    const trbody = new Tr(table.getTbody());

                    // eslint-disable-next-line no-new
                    new Td(trbody, `#${entry.id}<br>#${entry.sighting_tour_id}`);

                    const date = moment(new Date(entry.sigthing_datetime * 1000));

                    // eslint-disable-next-line no-new
                    new Td(trbody, date.format('YYYY.MM.DD HH:mm'));

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${vehicleName}<br>${vehicleDriverName}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${specieName}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${entry.individual_count}`);

                    if (entry.tour_start_date === 0) {
                        // eslint-disable-next-line no-new
                        new Td(trbody, 'Empty');
                    } else {
                        const time_start = moment(entry.tour_start_date * 1000);

                        // eslint-disable-next-line no-new
                        new Td(trbody, time_start.format('HH:mm'));
                    }

                    if (entry.tour_end_date === 0) {
                        // eslint-disable-next-line no-new
                        new Td(trbody, 'Empty');
                    } else {
                        const time_end = moment(entry.tour_end_date * 1000);

                        // eslint-disable-next-line no-new
                        new Td(trbody, time_end.format('HH:mm'));
                    }

                    // eslint-disable-next-line no-new
                    new Td(trbody, '');

                    // eslint-disable-next-line no-new
                    new Td(trbody, `<dl class="row"><dt class="col-sm-1"><i class="fas fa-map-marker-alt mr-1"></i></dt><dd class="col-sm-5">N: ${entry.location_gps_n} <br>W: ${entry.location_gps_w}</dd></dl>`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${encounterCategorieName}`);

                    // other species
                    // eslint-disable-next-line no-new
                    new Td(trbody, '');

                    // action
                    const actionTd = new Td(trbody, '');

                    const editBtn = new Button(actionTd.getElement(),  ButtonType.borderless);
                    editBtn.getElement().append('<i class="fa fa-edit"></i>');
                    editBtn.setOnClickFn((): void => {
                        alert('TODO');
                    });
                }
            };

            let offset = 0;
            const limit = 20;

            const sightings = await SightingsAPI.getList({
                limit,
                offset
            });

            if (sightings) {
                card.setTitle(`Sighting (${sightings.count})`);

                await onLoadsightings(sightings.list);

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

                        const tsightings = await SightingsAPI.getList({
                            limit,
                            offset
                        });

                        if (tsightings) {
                            await onLoadsightings(tsightings.list);
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