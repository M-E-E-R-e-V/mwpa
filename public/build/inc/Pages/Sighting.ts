import moment from 'moment';
import {EncounterCategorieEntry, EncounterCategories as EncounterCategoriesAPI} from '../Api/EncounterCategories';
import {Sightings as SightingsAPI} from '../Api/Sightings';
import {Species as SpeciesAPI, SpeciesEntry} from '../Api/Species';
import {Card} from '../PageComponents/Content/Card/Card';
import {ContentCol12} from '../PageComponents/Content/ContentCol12';
import {ContentRow} from '../PageComponents/Content/ContentRow';
import {Table} from '../PageComponents/Content/Table/Table';
import {Td} from '../PageComponents/Content/Table/Td';
import {Th} from '../PageComponents/Content/Table/Th';
import {Tr} from '../PageComponents/Content/Table/Tr';
import {LeftNavbarLink} from '../PageComponents/Navbar/LeftNavbarLink';
import {BasePage} from './BasePage';
import {SightingEditModal} from './Sighting/SightingEditModal';

/**
 * Sighting
 */
export class Sighting extends BasePage {

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
            this._wrapper.getContentWrapper().getContent()
        );

        // Navbar Left -------------------------------------------------------------------------------------------------

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Add sighting', () => {
            this._sightingDialog.setTitle('Add new sighting');
            this._sightingDialog.show();
            return false;
        });
    }

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol12(row1));

        card.setTitle('Sighting');

        const table = new Table(card.getElement());
        const trhead = new Tr(table.getThead());
        // eslint-disable-next-line no-new
        new Th(trhead, 'Id');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Date');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Boat');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Species');
        // eslint-disable-next-line no-new
        new Th(trhead, 'Group-Size');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Time start');
        // eslint-disable-next-line no-new
        new Th(trhead, 'Time stop');
        // eslint-disable-next-line no-new
        new Th(trhead, 'Duration');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Location');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Encounter');

        // eslint-disable-next-line no-new
        new Th(trhead, 'Other species');

        /**
         * onLoadList
         */
        const onLoadList = async(): Promise<void> => {
            card.showLoading();

            const species = await SpeciesAPI.getList();
            const mspecies = new Map<number, SpeciesEntry>();

            if (species) {
                for (const tspecies of species) {
                    mspecies.set(tspecies.id, tspecies);
                }
            }

            // -----------------------------------------------------

            const encates = await EncounterCategoriesAPI.getList();
            const mencates = new Map<number, EncounterCategorieEntry>();

            if (encates) {
                for (const tencat of encates) {
                    mencates.set(tencat.id, tencat);
                }
            }

            // -----------------------------------------------------

            const sightings = await SightingsAPI.getList();

            if (sightings) {
                card.setTitle(`Sighting (${sightings.count})`);

                for (const entry of sightings.list) {
                    let encounterCategorieName = '';
                    let specieName = '';
                    const specie = mspecies.get(entry.species_id);

                    if (specie) {
                        specieName = specie.name;
                    }

                    const encCate = mencates.get(entry.encounter_categorie_id);

                    if (encCate) {
                        encounterCategorieName = encCate.name;
                    }

                    const trbody = new Tr(table.getTbody());

                    // eslint-disable-next-line no-new
                    new Td(trbody, entry.id);

                    const date = moment(entry.sigthing_datetime * 1000);

                    // eslint-disable-next-line no-new
                    new Td(trbody, date.format('LLLL'));

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${entry.vehicle_id}`);

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
                    new Td(trbody, `N: ${entry.location_gps_n} <br>E: ${entry.location_gps_e}`);

                    // eslint-disable-next-line no-new
                    new Td(trbody, `${encounterCategorieName}`);

                }
            }

            card.hideLoading();
        };


        // load table
        await onLoadList();
    }

}