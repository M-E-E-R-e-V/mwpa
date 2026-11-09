/* global JQuery */
import {RightEntry, RoleRightEntry as RoleRightWire} from '../../../Api/Acl';
import {Lang} from '../../../Lang';
import {RoleRightAreaDef, RoleRightCatalog, RoleRightSectionDef} from './RoleRightCatalog';
import {RoleRightEntry} from './RoleRightEntry';

/**
 * One rendered area block (full-access checkbox + action checkboxes).
 */
type RenderedArea = {
    element: JQuery;
    sectionId: string;
    searchText: string;
    full: RoleRightEntry | null;
    actions: RoleRightEntry[];
};

/**
 * Role-right list (v2 / Bootstrap 5): rights grouped into sections (basic
 * access, working area, master data, administration) → areas → actions, each
 * with a translated label and a hint which page / menu entry it unlocks. The
 * area right ("full access") grants all actions of the area on the backend,
 * so its actions are shown ticked + locked while it is set.
 */
export class RoleRightListWidget {

    protected _element: JQuery;

    protected _roleId: number = 0;

    protected _entries: RoleRightEntry[] = [];

    protected _areas: RenderedArea[] = [];

    protected _sections: Map<string, JQuery> = new Map();

    /**
     * Constructor
     * @param {JQuery} element
     */
    public constructor(element: JQuery) {
        this._element = jQuery('<div class="p-3"/>').appendTo(element);
    }

    /**
     * Set role id
     * @param {number} id
     */
    public setRoleId(id: number): void {
        this._roleId = id;
    }

    /**
     * Return role id
     * @return {number}
     */
    public getRoleId(): number {
        return this._roleId;
    }

    /**
     * Build the list from the right catalog sent by the backend.
     * @param {RightEntry[]} rights
     */
    public setRights(rights: RightEntry[]): void {
        this._element.empty();
        this._entries = [];
        this._areas = [];
        this._sections.clear();

        const byKey = new Map(rights.map((right) => [right.key, right]));
        const known = RoleRightCatalog.getKnownKeys();

        for (const section of RoleRightCatalog.SECTIONS) {
            const areas = section.areas.filter((area) => byKey.has(area.key) || area.actions.some((a) => byKey.has(a.key)));

            if (areas.length > 0) {
                const body = this._renderSection(section);

                for (const area of areas) {
                    this._renderArea(body, section.id, area, byKey);
                }
            }
        }

        // rights the backend knows but the catalog doesn't describe yet
        const unknown = rights.filter((right) => !known.has(right.key)).sort((a, b) => a.key.localeCompare(b.key));

        if (unknown.length > 0) {
            const body = this._renderSection({
                id: RoleRightCatalog.SECTION_OTHER,
                label: 'Other',
                icon: 'fas fa-question-circle',
                hint: 'Rights without a description.',
                areas: []
            });

            const block = jQuery('<div class="py-2"/>').appendTo(body);
            const actions = unknown.map((right) => this._createEntry(block, right, right.key, ''));

            this._areas.push({
                element: block,
                sectionId: RoleRightCatalog.SECTION_OTHER,
                searchText: '',
                full: null,
                actions
            });
        }
    }

    /**
     * Apply the role's grants.
     * @param {RoleRightWire[]} roleRights
     */
    public setRoleRights(roleRights: RoleRightWire[]): void {
        const granted = new Set(roleRights.filter((r) => r.hasRight).map((r) => r.right_id));

        for (const entry of this._entries) {
            entry.setChecked(granted.has(entry.getRightId()));
        }

        for (const area of this._areas) {
            this._syncInherited(area);
        }
    }

    /**
     * Collect every right with its stored state (wire format for the backend).
     * @return {RoleRightWire[]}
     */
    public getRoleRights(): RoleRightWire[] {
        return this._entries.map((entry) => ({
            right_id: entry.getRightId(),
            hasRight: entry.getChecked()
        }));
    }

    /**
     * Filter by a search term. An area whose name matches stays complete;
     * otherwise only the matching rows stay. Empty areas/sections hide.
     * @param {string} search
     */
    public filterByName(search: string): void {
        const term = search.trim().toLowerCase();
        const visibleSections = new Set<string>();

        for (const area of this._areas) {
            const areaMatch = term === '' || area.searchText.includes(term);
            let anyVisible = false;

            const rows = area.full === null ? area.actions : [area.full, ...area.actions];

            for (const row of rows) {
                const visible = areaMatch || row.getSearchText().includes(term);
                row.setVisible(visible);
                anyVisible ||= visible;
            }

            area.element.toggleClass('d-none', !anyVisible);

            if (anyVisible) {
                visibleSections.add(area.sectionId);
            }
        }

        for (const [id, section] of this._sections) {
            section.toggleClass('d-none', !visibleSections.has(id));
        }
    }

    /**
     * Render a section header and return its body element.
     * @param {RoleRightSectionDef} section
     * @return {JQuery}
     * @protected
     */
    protected _renderSection(section: RoleRightSectionDef): JQuery {
        const wrapper = jQuery('<div class="mb-4"/>').appendTo(this._element);

        const header = jQuery('<div class="border-bottom border-primary border-2 pb-1 mb-1"/>').appendTo(wrapper);
        const title = jQuery('<h6 class="mb-0 text-primary fw-bold"/>').appendTo(header);
        jQuery('<i class="me-2"/>').addClass(section.icon).appendTo(title);
        jQuery('<span/>').text(Lang.i().l(section.label)).appendTo(title);

        jQuery('<div class="small text-body-secondary mb-2"/>').text(Lang.i().l(section.hint)).appendTo(wrapper);

        this._sections.set(section.id, wrapper);

        return wrapper;
    }

    /**
     * Render one area: name on the left, checkboxes on the right.
     * @param {JQuery} parent
     * @param {string} sectionId
     * @param {RoleRightAreaDef} area
     * @param {Map<string, RightEntry>} byKey
     * @protected
     */
    protected _renderArea(parent: JQuery, sectionId: string, area: RoleRightAreaDef, byKey: Map<string, RightEntry>): void {
        const label = Lang.i().l(area.label);
        const row = jQuery('<div class="row g-2 py-2 border-bottom"/>').appendTo(parent);

        const nameCol = jQuery('<div class="col-12 col-md-4"/>').appendTo(row);
        const name = jQuery('<div class="fw-bold"/>').appendTo(nameCol);
        jQuery('<i class="me-2 text-primary" style="width:1.25em;text-align:center;"/>').addClass(area.icon).appendTo(name);
        jQuery('<span/>').text(label).appendTo(name);

        const rightCol = jQuery('<div class="col-12 col-md-8"/>').appendTo(row);

        const areaRight = byKey.get(area.key);
        let full: RoleRightEntry | null = null;

        if (area.actions.length === 0) {
            // single-right area (web, mobile): the area right is the only checkbox
            if (areaRight) {
                full = this._createEntry(rightCol, areaRight, Lang.i().l('Allowed'), Lang.i().l(area.hint ?? ''));
            }
        } else if (areaRight) {
            full = this._createEntry(
                rightCol,
                areaRight,
                Lang.i().l('Full access'),
                Lang.i().l('All rights of this area, including ones added later.')
            );
        }

        const actions: RoleRightEntry[] = [];

        if (area.actions.length > 0) {
            const actionWrap = full === null ? rightCol : jQuery('<div class="ms-4 ps-2 border-start"/>').appendTo(rightCol);

            for (const action of area.actions) {
                const right = byKey.get(action.key);

                if (right) {
                    actions.push(this._createEntry(actionWrap, right, Lang.i().l(action.label), Lang.i().l(action.hint)));
                }
            }
        }

        /*
         * A single-right area (no actions) has no full-access row to sync —
         * its one checkbox is treated as a plain action row.
         */
        const isSingle = area.actions.length === 0;
        let rowActions = actions;

        if (isSingle) {
            rowActions = full === null ? [] : [full];
        }

        const rendered: RenderedArea = {
            element: row,
            sectionId,
            searchText: `${area.key} ${label}`.toLowerCase(),
            full: isSingle ? null : full,
            actions: rowActions
        };

        if (rendered.full !== null) {
            rendered.full.setOnChange((): void => {
                this._syncInherited(rendered);
            });
        }

        this._areas.push(rendered);
    }

    /**
     * Create an entry and register it for save.
     * @param {JQuery} parent
     * @param {RightEntry} right
     * @param {string} label
     * @param {string} hint
     * @return {RoleRightEntry}
     * @protected
     */
    protected _createEntry(parent: JQuery, right: RightEntry, label: string, hint: string): RoleRightEntry {
        const entry = new RoleRightEntry(parent, right.id, right.key, label, hint);
        this._entries.push(entry);
        return entry;
    }

    /**
     * Lock the action rows while the area's full access is granted.
     * @param {RenderedArea} area
     * @protected
     */
    protected _syncInherited(area: RenderedArea): void {
        const inherited = area.full?.getChecked() === true;

        for (const action of area.actions) {
            action.setInherited(inherited);
        }
    }

}