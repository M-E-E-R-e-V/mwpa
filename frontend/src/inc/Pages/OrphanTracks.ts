import {
    Badge,
    BadgeType,
    ButtonMenu,
    ButtonType,
    Card,
    ContentCol,
    ContentColSize,
    ContentRow,
    IconFa,
    LangText,
    TableWrapper,
    Td,
    Th,
    Tooltip,
    Tr
} from 'bambooo';
import moment from 'moment';
import {OrphanTrackEntry, OrphanTracks as OrphanTracksAPI} from '../Api/OrphanTracks';
import {Vehicle as VehicleAPI, VehicleEntry} from '../Api/Vehicle';
import {VehicleDriver as VehicleDriverAPI, VehicleDriverEntry} from '../Api/VehicleDriver';
import {Lang} from '../Lang';
import {BasePage} from './BasePage';
import {AssignModal} from './OrphanTracks/AssignModal';

const PAGE_SIZE = 50;

/**
 * OrphanTracks (admin-only)
 *
 * Lists pending-track buckets that have no matching SightingTour. Each row
 * opens the AssignModal where the admin picks the four tour_fid components
 * (vehicle, driver, date, tour_start), the dialog re-queries the candidate
 * list as the pickers change, and a Save promotes the bucket into the
 * chosen tour.
 */
export class OrphanTracks extends BasePage {

    public static NAME: string = 'orphan-tracks';

    protected override _name: string = OrphanTracks.NAME;

    protected _modal: AssignModal;
    protected _vehicles: Map<number, VehicleEntry> = new Map();
    protected _drivers: Map<number, VehicleDriverEntry> = new Map();

    public constructor() {
        super();
        this._modal = new AssignModal(this._wrapper.getContentWrapper().getContent().getElement());
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        const escapeHtml = (s: string): string => s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        // Resolve vehicle / driver names once.
        const [vehicles, drivers] = await Promise.all([
            VehicleAPI.getList(),
            VehicleDriverAPI.getList()
        ]);

        if (vehicles) {
            for (const v of vehicles) {
                this._vehicles.set(v.id, v);
            }
            this._modal.setVehicleList(vehicles);
        }

        if (drivers) {
            for (const d of drivers) {
                this._drivers.set(d.id, d);
            }
            this._modal.setDriverList(drivers);
        }

        // Wire the modal's picker-change → re-query candidates.
        const refreshCandidates = async(): Promise<void> => {
            const v = this._modal.getVehicleId();
            const d = this._modal.getDriverId();
            const date = this._modal.getDate();
            const start = this._modal.getTourStart();

            const request: import('../Api/OrphanTracks').OrphanTracksMatchRequest = {};
            if (v > 0) {
                request.vehicle_id = v;
            }
            if (d > 0) {
                request.vehicle_driver_id = d;
            }
            if (date !== '') {
                request.date = date;
            }
            if (start !== '') {
                request.tour_start = start;
            }

            const response = await OrphanTracksAPI.match(request);
            this._modal.setCandidates(response?.list ?? []);
        };

        this._modal.setOnPickerChange(() => {
            void refreshCandidates();
        });

        this._modal.setOnSave(async() => {
            const values = this._modal.getValues();
            if (values.target_tour_id <= 0) {
                return;
            }

            const response = await OrphanTracksAPI.assign({
                tour_fid: values.tour_fid,
                device_id: values.device_id,
                target_tour_id: values.target_tour_id
            });

            if (response && response.statusCode === '200') {
                this._modal.hide();
                if (this._onLoadTable) {
                    await this._onLoadTable();
                }
            } else {
                alert(response?.msg ?? 'Assign failed');
            }
        });

        // List card -----------------------------------------------------------------------------
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol(row1, ContentColSize.col12));
        card.setTitle(new LangText('Orphan Tracks'));

        const tableWrapper = new TableWrapper<OrphanTrackEntry>(card.getElement(), {head_fixed: true});
        const table = tableWrapper.getTable();
        const trhead = new Tr(table.getThead());

        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Tour-Fid'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Device'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Vehicle / Driver'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Date / Start'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('Points'));
        // eslint-disable-next-line no-new
        new Th(trhead, new LangText('First / Last seen'));
        // eslint-disable-next-line no-new
        new Th(trhead, '');

        const renderRow = (_t: import('bambooo').Table, entry: OrphanTrackEntry): void => {
            const trbody = new Tr(table.getTbody());

            // eslint-disable-next-line no-new
            new Td(trbody, `<code>${escapeHtml(entry.tour_fid)}</code>`);

            // eslint-disable-next-line no-new
            new Td(trbody, `#${entry.device_id}`);

            const vName = this._vehicles.get(entry.vehicle_id)?.name ?? `#${entry.vehicle_id}`;
            const dName = this._drivers.get(entry.vehicle_driver_id)?.user.name ?? `#${entry.vehicle_driver_id}`;
            // eslint-disable-next-line no-new
            new Td(trbody, `${escapeHtml(vName)}<br>${escapeHtml(dName)}`);

            // eslint-disable-next-line no-new
            new Td(trbody, `${escapeHtml(entry.date)}<br><b>${escapeHtml(entry.tour_start)}</b>`);

            const tdCount = new Td(trbody, '');
            // eslint-disable-next-line no-new
            new Badge(tdCount, `${entry.count}`, BadgeType.info);

            const minDt = moment(entry.min_create_datetime * 1000).format('YYYY.MM.DD HH:mm');
            const maxDt = moment(entry.max_create_datetime * 1000).format('YYYY.MM.DD HH:mm');
            // eslint-disable-next-line no-new
            new Td(trbody, `${minDt}<br>${maxDt}`);

            const tdAction = new Td(trbody, '');
            const abtnMenu = new ButtonMenu(tdAction, IconFa.bars, true, ButtonType.borderless);
            abtnMenu.addMenuItem('Assign to tour', () => {
                this._modal.setTitle(new LangText('Assign orphan tracks'));
                this._modal.setSource(
                    entry.tour_fid,
                    entry.device_id,
                    entry.vehicle_id,
                    entry.vehicle_driver_id,
                    entry.date,
                    entry.tour_start
                );
                this._modal.show();
                void refreshCandidates();
            }, IconFa.add);
        };

        this._onLoadTable = async(): Promise<void> => {
            await tableWrapper.reset();
        };

        tableWrapper.setDataSource(
            async(page) => {
                card.showLoading();

                try {
                    const offset = page * PAGE_SIZE;
                    const response = await OrphanTracksAPI.getList({
                        limit: PAGE_SIZE,
                        offset
                    });

                    if (!response || !response.list) {
                        return [];
                    }

                    const count = response.count ?? 0;
                    card.setTitle(`Orphan Tracks (${count})`);

                    return response.list;
                } finally {
                    card.hideLoading();
                    Lang.i().lAll();
                    Tooltip.init();
                }
            },
            renderRow
        );
    }

}