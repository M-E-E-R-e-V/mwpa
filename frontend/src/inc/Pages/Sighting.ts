import {Organization as OrganizationAPI, OrganizationEntry} from '../Api/Organization';
import {DialogConfirm} from '../Bambooo/Content/Dialog/DialogConfirm';
import {ButtonClass} from '../Bambooo/Content/Button/ButtonDefault';
import {DialogInfo} from '../Bambooo/Content/Dialog/DialogInfo';
import moment from 'moment';
import {BehaviouralStateEntry, BehaviouralStates as BehaviouralStatesAPI} from '../Api/BehaviouralStates';
import {EncounterCategorieEntry, EncounterCategories as EncounterCategoriesAPI} from '../Api/EncounterCategories';
import {Sightings as SightingsAPI, SightingsEntry} from '../Api/Sightings';
import {Species as SpeciesAPI, SpeciesEntry} from '../Api/Species';
import {Vehicle as VehicleAPI, VehicleEntry} from '../Api/Vehicle';
import {VehicleDriver as VehicleDriverAPI, VehicleDriverEntry} from '../Api/VehicleDriver';
import {ColumnContent} from '../Bambooo/ColumnContent';
import {Badge, BadgeType} from '../Bambooo/Content/Badge/Badge';
import {Card} from '../Bambooo/Content/Card/Card';
import {ContentCol, ContentColSize} from '../Bambooo/Content/ContentCol';
import {ContentRow} from '../Bambooo/Content/ContentRow';
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
import {UtilColor} from '../Utils/UtilColor';
import {UtilDistanceCoast} from '../Utils/UtilDistanceCoast';
import {UtilDownload} from '../Utils/UtilDownload';
import {UtilSelect} from '../Utils/UtilSelect';
import {LocationDisplay} from '../Widget/LocationDisplay';
import {BasePage} from './BasePage';
import {SightingDeletedModal} from './Sighting/SightingDeletedModal';
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
     * @member {SightingDeletedModal}
     * @protected
     */
    protected _sightingDeletedDialog: SightingDeletedModal;

    /**
     * turtles
     * @protected
     */
    protected _turtles: string[] = [
        'Caretta caretta',
        'Dermochelys coriacea',
        'Chelonia mydas',
        'Eretmochelys imbricata',
        'Unknown sea turtle',
        'Eretmochelys imbricata - Hawksbill sea turtle',
        'Chelonia mydas - Green sea turtle',
        'Dermochelys coriacea - Leatherback sea turtle',
        'Caretta caretta - Loggerhead sea turtle'
    ];

    /**
     * constructor
     */
    public constructor() {
        super();

        // sighting modal ----------------------------------------------------------------------------------------------

        this._sightingDialog = new SightingEditModal(
            this._wrapper.getContentWrapper().getContent().getElement()
        );

        this._sightingDeletedDialog = new SightingDeletedModal(
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

        // save --------------------------------------------------------------------------------------------------------

        this._sightingDeletedDialog.setOnSave(async(): Promise<void> => {
            const tid = this._sightingDeletedDialog.getId();

            if (tid === null) {
                this._toast.fire({
                    icon: 'error',
                    title: 'ID is not set!'
                });
                this._sightingDeletedDialog.hide();
                return;
            }

            try {
                if (await SightingsAPI.delete({
                    id: tid,
                    description: this._sightingDeletedDialog.getDescription()
                })) {
                    if (this._onLoadTable) {
                        this._onLoadTable();
                    }

                    this._toast.fire({
                        icon: 'success',
                        title: 'Sighting delete success.'
                    });
                }
            } catch (message) {
                this._toast.fire({
                    icon: 'error',
                    title: message
                });
            }

            this._sightingDeletedDialog.hide();
        });
    }

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
            IconFa.edit
        );

        btnMenu.addDivider();

        btnMenu.addMenuItem(
            new LangText('Set sighting date by GPS (only Admin)'),
            (): void => {
                DialogConfirm.confirm(
                    'dcsetgpsdate',
                    ModalDialogType.large,
                    'Set sighting date by GPS (only Admin)',
                    'Only intended for the transition! Do not use!',
                    async(_, dialog) => {
                        try {
                            const data = await SightingsAPI.setDateByGPS();

                            if (data) {
                                console.log(data);

                                this._toast.fire({
                                    icon: 'success',
                                    title: 'Data set, check log.'
                                });
                            } else {
                                this._toast.fire({
                                    icon: 'error',
                                    title: 'Data empty!'
                                });
                            }
                        } catch (message) {
                            this._toast.fire({
                                icon: 'error',
                                title: message
                            });
                        }

                        dialog.hide();
                    },
                    undefined,
                    'Start process',
                    ButtonClass.danger
                );
            },
            IconFa.alert
        );

        const divResp = jQuery('<div class="table-responsive"></div>').appendTo(card.getElement());

        const table = new Table(divResp);
        const trhead = new Tr(table.getThead());

        const sortingColum = (element: LangText, currentVal: string): string => {
            switch (currentVal) {
                case 'asc':
                    element.setClass('mwpa_sorting mwpa_sorting_desc');
                    return 'desc';

                case 'desc':
                    element.setClass('mwpa_sorting');
                    return '';

                default:
                    element.setClass('mwpa_sorting mwpa_sorting_asc');
                    return 'asc';
            }
        };

        const order = {
            id: '',
            tour_id: '',
            date: 'desc',
            tour_start: 'desc',
            create_datetime: '',
            update_datetime: ''
        };

        let offset = 0;
        const limit = 20;

        const onLoadListOrder = async(): Promise<void> => {
            offset = 0;

            if (this._onLoadTable) {
                await this._onLoadTable();
            }
        };

        // eslint-disable-next-line no-new
        new Th(trhead, new ColumnContent([
            new LangText('Id', 'mwpa_sorting', (element) => {
                order.id = sortingColum(element, order.id);
                onLoadListOrder();
            }),
            new LangText('TourId', 'mwpa_sorting', (element) => {
                order.tour_id = sortingColum(element, order.tour_id);
                onLoadListOrder();
            }),
            new LangText('Date', 'mwpa_sorting mwpa_sorting_desc', (element) => {
                order.date = sortingColum(element, order.date);
                onLoadListOrder();
            })
        ]));

        // eslint-disable-next-line no-new
        new Th(trhead, new ColumnContent([
            new LangText('Vehicle'),
            new LangText('Driver'),
            new LangText('Organization')
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
            new LangText('Time begin-end', 'mwpa_sorting mwpa_sorting_desc', (element) => {
                order.tour_start = sortingColum(element, order.tour_start);
                onLoadListOrder();
            }),
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
        new Th(trhead, new ColumnContent([
            new LangText('Behaviour'),
            new LangText('Reaction')
        ]));

        // eslint-disable-next-line no-new
        new Th(trhead, new ColumnContent([
            new LangText('Created', 'mwpa_sorting', (element) => {
                order.create_datetime = sortingColum(element, order.create_datetime);
                onLoadListOrder();
            }),
            new LangText('Created by'),
            new LangText('Updated', 'mwpa_sorting', (element) => {
                order.update_datetime = sortingColum(element, order.update_datetime);
                onLoadListOrder();
            })
        ]));

        // eslint-disable-next-line no-new
        new Th(trhead, '');

        this._onLoadTable = async(): Promise<void> => {
            card.showLoading();
            table.getTbody().empty();

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

                this._sightingDialog.setReactionList(encates);
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

            // organization --------------------------------------------------------------------------------------------

            const organizations = await OrganizationAPI.getOrganizationByUser();
            const morganizations = new Map<number, OrganizationEntry>();

            if (organizations) {
                for (const organization of organizations) {
                    morganizations.set(organization.id, organization);
                }
            }

            // sightings -----------------------------------------------------------------------------------------------

            const onLoadsightings = async(sightings: SightingsEntry[]): Promise<void> => {
                for (const entry of sightings) {
                    let reactionName = 'not set';
                    let specieName = '';
                    let specieColor = '#ffffff';
                    let vehicleName = '';
                    let vehicleDriverName = '';

                    const specie = mspecies.get(entry.species_id!);

                    if (specie) {
                        specieName = specie.name.split(',')[0];

                        if (specie.species_group) {
                            specieColor = specie.species_group?.color;
                        }
                    } else {
                        specieName = 'not set';
                        specieColor = 'red';

                        if (entry.other) {
                            if (this._turtles.includes(entry.other?.trim())) {
                                specieName = entry.other?.trim();
                                specieColor = '#27AE60';
                            }
                        }
                    }

                    if (entry.reaction_id) {
                        const encCate = mencates.get(entry.reaction_id);

                        if (encCate) {
                            reactionName = encCate.name;
                        }
                    }

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

                    const date = moment(entry.date?.split(' ')[0]);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `<b>#${entry.id}</b><br>#${entry.tour_id}<br>${date.format('YYYY.MM.DD')}`);

                    let orgStr = '';

                    if (entry.organization_id) {
                        const organisation = morganizations.get(entry.organization_id);

                        if (organisation) {
                            orgStr = organisation.description;
                        }
                    }

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${vehicleName}<br>${vehicleDriverName}<br>${orgStr}`);

                    let otherSpecies = '';

                    try {
                        const otherSpeciesList = JSON.parse(entry.other_species!);

                        if (otherSpeciesList) {
                            // eslint-disable-next-line guard-for-in
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
                        console.log('JSON Parse::other_species: ');
                        console.log(e);
                        console.log(entry);
                        console.log('');
                    }

                    // eslint-disable-next-line no-new
                    const speciesTd = new Td(trbody);
                    // eslint-disable-next-line no-new
                    new Badge(speciesTd, `<b style="color: ${UtilColor.getContrastYIQ(specieColor)}">${specieName}</b>`, BadgeType.info, specieColor);
                    speciesTd.append(`<br>${otherSpecies}`);

                    // eslint-disable-next-line no-new
                    const speciesCountGroupTd = new Td(trbody);

                    if (entry.species_count === 0) {
                        // eslint-disable-next-line no-new
                        new Badge(speciesCountGroupTd, `<b style="color: white">${entry.species_count}</b>`, BadgeType.info, 'red');
                    } else {
                        speciesCountGroupTd.append(`<b>${entry.species_count}</b>`);
                    }

                    speciesCountGroupTd.append(`<br>${UtilSelect.getSelectStr(entry.subgroups!)}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `<b>${entry.tour_start} - ${entry.tour_end}</b><br>${entry.duration_from} - ${entry.duration_until}`);

                    const tdLocation = new Td(trbody, '');

                    // eslint-disable-next-line no-new
                    new LocationDisplay(tdLocation, entry.location_begin!);

                    const floatDistance = parseFloat(entry.distance_coast!) || 0;

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${UtilDistanceCoast.meterToM(floatDistance, true)}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `<b>${UtilSelect.getSelectStr(entry.photo_taken!)}</b><br>${UtilSelect.getSelectStr(entry.distance_coast_estimation_gps!)}`);

                    let behaviourStr = '';

                    try {
                        const ebehaviours = JSON.parse(entry.behaviours!);

                        if (ebehaviours) {
                            for (const ebehaviourKey of ebehaviours) {
                                const tbehviour = mbehaviours.get(Number(ebehaviours[ebehaviourKey]));

                                if (tbehviour) {
                                    behaviourStr += `${tbehviour.name} <br>`;
                                }
                            }
                        }
                    } catch (e) {
                        console.log('JSON Parse::behaviours: ');
                        console.log(e);
                        console.log(entry);
                        console.log('');
                    }

                    if (behaviourStr === '') {
                        behaviourStr = 'not set<br>';
                    }

                    const tdbehRex = new Td(trbody, behaviourStr);
                    // eslint-disable-next-line no-new
                    new Badge(tdbehRex, `${reactionName}`, BadgeType.secondary);

                    const createDate = moment(entry.create_datetime * 1000);
                    const updateDate = moment(entry.update_datetime * 1000);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `<b>${createDate.format('YYYY.MM.DD hh:mm:ss')}</b><br>${entry.creater_name}<br>${updateDate.format('YYYY.MM.DD hh:mm:ss')}`);

                    // action
                    const tdAction = new Td(trbody, '');
                    const abtnMenu = new ButtonMenu(tdAction, IconFa.bars, true, ButtonType.borderless);

                    abtnMenu.addMenuItem(
                        'Edit',
                        async(): Promise<void> => {
                            const fDistance = parseFloat(entry.distance_coast!) || 0;

                            this._sightingDialog.setTitle('Edit Sighting');
                            this._sightingDialog.resetValues();
                            this._sightingDialog.setId(entry.id);
                            this._sightingDialog.setVehicle(entry.vehicle_id!);
                            this._sightingDialog.setVehicleDriver(entry.vehicle_driver_id!);
                            this._sightingDialog.setBeaufortWind(entry.beaufort_wind!);
                            this._sightingDialog.setDateSight(entry.date!);
                            this._sightingDialog.setTourStart(entry.tour_start!);
                            this._sightingDialog.setTourEnd(entry.tour_end!);
                            this._sightingDialog.setDurationFrom(entry.duration_from!);
                            this._sightingDialog.setDurationUntil(entry.duration_until!);
                            this._sightingDialog.setPositionBegin(entry.location_begin!);
                            this._sightingDialog.setPositionEnd(entry.location_end!);
                            this._sightingDialog.setDistanceCoast(UtilDistanceCoast.meterToM(fDistance, true));
                            this._sightingDialog.setSpecie(entry.species_id!);
                            this._sightingDialog.setSpeciesCount(entry.species_count!);
                            this._sightingDialog.setReaction(entry.reaction_id!);
                            this._sightingDialog.setOther(entry.other!);
                            this._sightingDialog.setOtherBoats(entry.other_vehicle!);
                            this._sightingDialog.setNote(entry.note!);
                            this._sightingDialog.show();
                        },
                        IconFa.edit
                    );

                    abtnMenu.addDivider();

                    abtnMenu.addMenuItem(
                        'Delete',
                        (): void => {
                            this._sightingDeletedDialog.setTitle('Delete a sighting');
                            this._sightingDeletedDialog.resetValues();
                            this._sightingDeletedDialog.setId(entry.id);
                            this._sightingDeletedDialog.show();
                        },
                        IconFa.trash
                    );

                    if (entry.files.length > 0) {
                        tdAction.append('<br>');
                        const btnAttachment = new ButtonMenu(tdAction, IconFa.paperclip, true, ButtonType.borderless);

                        for (const afiel of entry.files) {
                            btnAttachment.addMenuItem(
                                afiel,
                                (): void => {
                                    const aImage = new Image();
                                    aImage.src = `/json/sightings/getimage/${entry.id}/${afiel}`;
                                    aImage.style.width = '100%';

                                    DialogInfo.info(
                                        'sightimage',
                                        ModalDialogType.xlarge,
                                        `Image for Sighting #${entry.id}`,
                                        aImage,
                                        (_, modal: DialogInfo) => {
                                            modal.hide();
                                        }
                                    );
                                },
                                IconFa.camera
                            );
                        }
                    }
                }
            };

            const sightings = await SightingsAPI.getList({
                order,
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
        this._onLoadTable();
    }

}