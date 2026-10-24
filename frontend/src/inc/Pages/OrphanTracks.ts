import {
    Badge2,
    BadgeType2,
    ButtonMenu2,
    Card2,
    ContentCol2,
    ContentColSize2,
    ContentRow2,
    IconFa,
    LangTextV2,
    Table2,
    TableWrapper2,
    Td2,
    Th2,
    Tooltip2,
    Tr2
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
        this._modal = new AssignModal();
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

        this._modal.setOnDeleteRequest(async(tourFid, deviceId) => {
            const response = await OrphanTracksAPI.dropBucket({tour_fid: tourFid, device_id: deviceId});
            if (response && response.statusCode === '200') {
                this._modal.hide();
                if (this._onLoadTable) {
                    await this._onLoadTable();
                }
            } else {
                alert(response?.msg ?? 'Delete failed');
            }
        });

        // List card -----------------------------------------------------------------------------
        const row1 = new ContentRow2(this._wrapper.getContentWrapper().getContent().getElement());
        const card = new Card2({});
        card.appendTo(new ContentCol2(row1, ContentColSize2.col12).getElement());
        card.setTitle(new LangTextV2({text: 'Orphan Tracks'}));

        const tableWrapper = new TableWrapper2<OrphanTrackEntry>({tableOptions: {head_fixed: true}});
        tableWrapper.appendTo(card.getBodyElement());
        const table = tableWrapper.getTable();
        const trhead = new Tr2();
        trhead.appendTo(table.getThead());

        new Th2({value: new LangTextV2({text: 'Tour-Fid'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Device'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Vehicle / Driver'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Date / Start'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'Points'})}).appendTo(trhead);
        new Th2({value: new LangTextV2({text: 'First / Last seen'})}).appendTo(trhead);
        new Th2({value: ''}).appendTo(trhead);

        const renderRow = (_t: Table2, entry: OrphanTrackEntry): void => {
            const trbody = new Tr2();
            trbody.appendTo(table.getTbody());

            new Td2({value: `<code>${escapeHtml(entry.tour_fid)}</code>`}).appendTo(trbody);

            new Td2({value: `#${entry.device_id}`}).appendTo(trbody);

            const vName = this._vehicles.get(entry.vehicle_id)?.name ?? `#${entry.vehicle_id}`;
            const dName = this._drivers.get(entry.vehicle_driver_id)?.user.name ?? `#${entry.vehicle_driver_id}`;
            new Td2({value: `${escapeHtml(vName)}<br>${escapeHtml(dName)}`}).appendTo(trbody);

            new Td2({value: `${escapeHtml(entry.date)}<br><b>${escapeHtml(entry.tour_start)}</b>`}).appendTo(trbody);

            const tdCount = new Td2({value: ''});
            tdCount.appendTo(trbody);
            new Badge2({text: `${entry.count}`, type: BadgeType2.info}).appendTo(tdCount);

            const minDt = moment(entry.min_create_datetime * 1000).format('YYYY.MM.DD HH:mm');
            const maxDt = moment(entry.max_create_datetime * 1000).format('YYYY.MM.DD HH:mm');
            new Td2({value: `${minDt}<br>${maxDt}`}).appendTo(trbody);

            const tdAction = new Td2({value: ''});
            tdAction.appendTo(trbody);
            const abtnMenu = new ButtonMenu2({icon: IconFa.bars, positionRight: true});
            abtnMenu.appendTo(tdAction);
            abtnMenu.addMenuItem('Assign to tour', () => {
                this._modal.setTitle(new LangTextV2({text: 'Assign orphan tracks'}));
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
                void (async(): Promise<void> => {
                    const pointsRes = await OrphanTracksAPI.getPoints({
                        tour_fid: entry.tour_fid,
                        device_id: entry.device_id
                    });
                    this._modal.setPoints(pointsRes?.points ?? []);
                })();
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
                    Tooltip2.init();
                }
            },
            renderRow
        );
    }

}