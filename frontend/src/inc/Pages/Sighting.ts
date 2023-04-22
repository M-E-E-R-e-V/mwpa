import moment from 'moment';
import {BehaviouralStateEntry, BehaviouralStates as BehaviouralStatesAPI} from '../Api/BehaviouralStates';
import {VehicleDriver as VehicleDriverAPI, VehicleDriverEntry} from '../Api/VehicleDriver';
import {EncounterCategorieEntry, EncounterCategories as EncounterCategoriesAPI} from '../Api/EncounterCategories';
import {Sightings as SightingsAPI, SightingsEntry} from '../Api/Sightings';
import {Species as SpeciesAPI, SpeciesEntry} from '../Api/Species';
import {Vehicle as VehicleAPI, VehicleEntry} from '../Api/Vehicle';
import {ColumnContent} from '../Bambooo/ColumnContent';
import {ButtonClass} from '../Bambooo/Content/Button/ButtonDefault';
import {Card} from '../Bambooo/Content/Card/Card';
import {ContentCol, ContentColSize} from '../Bambooo/Content/ContentCol';
import {ContentRow} from '../Bambooo/Content/ContentRow';
import {DialogConfirm} from '../Bambooo/Content/Dialog/DialogConfirm';
import {ButtonType} from '../Bambooo/Content/Form/Button';
import {ButtonMenu} from '../Bambooo/Content/Form/ButtonMenu';
import {IconFa} from '../Bambooo/Content/Icon/Icon';
import {Table} from '../Bambooo/Content/Table/Table';
import {Td} from '../Bambooo/Content/Table/Td';
import {Th} from '../Bambooo/Content/Table/Th';
import {Tr} from '../Bambooo/Content/Table/Tr';
import {LangText} from '../Bambooo/Lang/LangText';
import {ModalDialogType} from '../Bambooo/Modal/ModalDialog';
import {LeftNavbarLink} from '../Bambooo/Navbar/LeftNavbarLink';
import {Lang} from '../Lang';
import {UtilDistanceCoast} from '../Utils/UtilDistanceCoast';
import {UtilDownload} from '../Utils/UtilDownload';
import {UtilLocation} from '../Utils/UtilLocation';
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
            this._sightingDialog.resetValues();
            this._sightingDialog.show();
            return false;
        });
    }

    /*protected createSightingCard(sighting: SightingsEntry): Promise<void> {

    }*/

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol(row1, ContentColSize.col12));

        card.setTitle(new LangText('Sighting'));

        const btnMenu = new ButtonMenu(
            card.getToolsElement(),
            IconFa.bars,
            true,
            ButtonType.borderless
        );

        btnMenu.addMenuItem(
            new LangText('to Excel'),
            (): void => {
                UtilDownload.download('/json/sightings/list/excel', 'sightings_list.xlsx');
            },
            IconFa.edit);

        const divResp = jQuery('<div class="table-responsive"></div>').appendTo(card.getElement());

        const table = new Table(divResp);
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, new ColumnContent([
            new LangText('Id'),
            new LangText('TourId'),
            new LangText('Date')
        ]));

        // eslint-disable-next-line no-new
        new Th(trhead, new ColumnContent([
            new LangText('Vehicle'),
            new LangText('Driver')
        ]));

        // eslint-disable-next-line no-new
        new Th(trhead, new ColumnContent([
            new LangText('Species'),
            new LangText('Other species')
        ]));

        // eslint-disable-next-line no-new
        new Th(trhead, new ColumnContent([
            new LangText('Group-Size'),
            new LangText('Subgroups')
        ]));

        // eslint-disable-next-line no-new
        new Th(trhead, new ColumnContent([
            new LangText('Time begin-end'),
            new LangText('Duration')
        ]));

        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Location'));

        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Distance<br>(Miles)'));

        // eslint-disable-next-line no-new
        new Th(trhead, new ColumnContent([
            new LangText('Photos taken'),
            new LangText('E. without GPS')
        ]));

        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Behaviour'));

        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Encounter'));

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

                this._sightingDialog.setSpeciesList(species);
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

                this._sightingDialog.setVehicleList(vehicles);
            }

            // drivers -------------------------------------------------------------------------------------------------

            const drivers = await VehicleDriverAPI.getList();
            const mdrivers = new Map<number, VehicleDriverEntry>();

            if (drivers) {
                for (const tdriver of drivers) {
                    mdrivers.set(tdriver.id, tdriver);
                }

                this._sightingDialog.setVehicleDriverList(drivers);
            }

            // behaviours ----------------------------------------------------------------------------------------------

            const behaviours = await BehaviouralStatesAPI.getList();
            const mbehaviours = new Map<number, BehaviouralStateEntry>();

            if (behaviours) {
                for (const behaviour of behaviours) {
                    mbehaviours.set(behaviour.id, behaviour);
                }
            }

            // sightings -----------------------------------------------------------------------------------------------

            const onLoadsightings = async(sightings: SightingsEntry[]): Promise<void> => {
                for (const entry of sightings) {
                    let encounterCategorieName = '';
                    let specieName = '';
                    let vehicleName = '';
                    let vehicleDriverName = '';

                    const specie = mspecies.get(entry.species_id!);

                    if (specie) {
                        specieName = specie.name.split(',')[0];
                    }

                    // const encCate = mencates.get(entry.encounter_categorie_id);

                    // if (encCate) {
                       // encounterCategorieName = encCate.name;
                    // }

                    const vehicle = mvehicles.get(entry.vehicle_id!);

                    if (vehicle) {
                        vehicleName = vehicle.name;
                    }

                    const driver = mdrivers.get(entry.vehicle_driver_id!);

                    if (driver) {
                        vehicleDriverName = driver.user.name;
                    }

                    // table -------------------------------------------------------------------------------------------

                    const trbody = new Tr(table.getTbody());

                    const date = moment(entry.date);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `<b>#${entry.id}</b><br>#${entry.tour_id}<br>${date.format('YYYY.MM.DD')}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${vehicleName}<br>${vehicleDriverName}`);

                    let otherSpecies = '';

                    try {
                        const otherSpeciesList = JSON.parse(entry.other_species!);

                        if (otherSpeciesList) {
                            for (const otherSpeciesKey in otherSpeciesList) {
                                const otherSpecie = otherSpeciesList[otherSpeciesKey];

                                if (otherSpecie.trim() !== '') {
                                    const totherSpecie = mspecies.get(parseInt(otherSpecie, 10));

                                    if (totherSpecie) {
                                        if (otherSpecies.length > 0) {
                                            otherSpecies += ', ';
                                        }

                                        otherSpecies += totherSpecie.name.split(',')[0];
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.log(`JSON Parse::other_species: `);
                        console.log(e);
                        console.log(entry);
                        console.log('');
                    }

                    // eslint-disable-next-line no-new
                    new Td(trbody, `<b>${specieName}</b><br>${otherSpecies}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `<b>${entry.species_count}</b><br>${entry.subgroups! > 0 ? 'Yes' : 'No'}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `<b>${entry.tour_start} - ${entry.tour_end}</b><br>${entry.duration_from} - ${entry.duration_until}`);

                    try {
                        const location = JSON.parse(entry.location_begin!);
                        const begin_lat = UtilLocation.ddToDm(location.latitude, true);
                        const begin_lon = UtilLocation.ddToDm(location.longitude, false);

                        const beginLatStr = `${begin_lat.direction}: ${begin_lat.degree}º ${begin_lat.minute.toFixed(3)}`;
                        const beginLonStr = `${begin_lon.direction}: ${begin_lon.degree}º ${begin_lon.minute.toFixed(3)}`;

                        new Td(trbody, `<dl class="row"><dt class="col-sm-1"><i class="fas fa-map-marker-alt mr-1"></i></dt><dd class="col-sm-5">${beginLatStr}<br>${beginLonStr}</dd></dl>`);
                    } catch (e) {
                        console.log(`JSON Parse::location_begin: `);
                        console.log(e);
                        console.log(entry);
                        console.log('');

                        new Td(trbody, '?');
                    }

                    const floatDistance = parseFloat(entry.distance_coast!) | 0;

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${UtilDistanceCoast.meterToM(floatDistance, true)}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `<b>${entry.photo_taken! > 0 ? 'Yes' : 'No'}</b><br>${entry.distance_coast_estimation_gps! > 0 ? 'Yes' : 'No'}`);

                    let behaviourStr = '';

                    try {
                        const ebehaviours = JSON.parse(entry.behaviours!);

                        if (ebehaviours) {
                            for (const ebehaviourKey in ebehaviours) {
                                const tbehviour = mbehaviours.get(Number(ebehaviours[ebehaviourKey]));

                                if (tbehviour) {
                                    behaviourStr += `${tbehviour.name} <br>`;
                                }
                            }
                        }
                    } catch (e) {
                        console.log(`JSON Parse::behaviours: `);
                        console.log(e);
                        console.log(entry);
                        console.log('');
                    }

                    // eslint-disable-next-line no-new
                    new Td(trbody, behaviourStr);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${encounterCategorieName}`);

                    // action
                    const tdAction = new Td(trbody, '');
                    const btnMenu = new ButtonMenu(tdAction, IconFa.bars, true, ButtonType.borderless);

                    btnMenu.addMenuItem(
                        'Edit',
                        async(): Promise<void> => {
                            this._sightingDialog.setTitle('Edit Sighting');
                            this._sightingDialog.resetValues();
                            this._sightingDialog.setId(entry.id);
                            this._sightingDialog.setVehicle(entry.vehicle_id!);
                            this._sightingDialog.setVehicleDriver(entry.vehicle_driver_id!);
                            this._sightingDialog.setBeaufortWind(entry.beaufort_wind!);
                            this._sightingDialog.setDateSight(entry.date!);
                            this._sightingDialog.setSpecie(entry.species_id!);
                            this._sightingDialog.setSpeciesCount(entry.species_count!);
                            this._sightingDialog.show();
                        },
                        IconFa.edit);

                    btnMenu.addDivider();

                    btnMenu.addMenuItem(
                        'Delete',
                        (): void => {
                            DialogConfirm.confirm(
                                'dcDeleteSighting',
                                ModalDialogType.large,
                                'Delete sighting',
                                `Are you sure you want to delete the sighting?`,
                                async(_, dialog) => {
                                    try {
                                        if (await SightingsAPI.delete({id: entry.id})) {
                                            this._toast.fire({
                                                icon: 'success',
                                                title: 'Sighting delete success.'
                                            });
                                        }
                                    } catch ({message}) {
                                        this._toast.fire({
                                            icon: 'error',
                                            title: message
                                        });
                                    }

                                    dialog.hide();

                                    if (this._onLoadTable) {
                                        this._onLoadTable();
                                    }
                                },
                                undefined,
                                'Delete',
                                ButtonClass.danger
                            );
                        }, IconFa.trash);
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