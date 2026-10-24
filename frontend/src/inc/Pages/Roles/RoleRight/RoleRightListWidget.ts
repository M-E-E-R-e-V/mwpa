/* global JQuery */
import {
    CardBodyType2,
    CardLine2,
    CardType2,
    CollectionCardWidget2,
    Component2,
    LangTextV2,
    Table2,
    Th2,
    Tr2
} from 'bambooo';
import {RightEntry, RoleRightEntry as RoleRightWire} from '../../../Api/Acl';
import {RoleRightEntry} from './RoleRightEntry';

/**
 * Suffix tokens that represent an action on a right.
 */
const ACTION_TOKENS = new Set([
    'read', 'write', 'delete', 'create', 'use', 'edit',
    'status', 'start', 'stop', 'invoke'
]);

/**
 * Explicit display order for action rows inside a group (meta first).
 */
const ACTION_ORDER = [
    '', 'read', 'write', 'create', 'edit', 'use', 'delete',
    'status', 'start', 'stop', 'invoke'
];

/**
 * FontAwesome classes per action.
 * @param {string} action
 * @param {boolean} isMeta
 * @param {boolean} hasSub
 * @return {string}
 */
const iconForAction = (action: string | undefined, isMeta: boolean, hasSub: boolean): string => {
    if (isMeta) {
        return hasSub ? 'fas fa-folder text-primary' : 'fas fa-folder-open text-primary';
    }

    switch (action) {
        case 'read': return 'fas fa-eye text-info';
        case 'write': return 'fas fa-pen text-warning';
        case 'edit': return 'fas fa-pen text-warning';
        case 'delete': return 'fas fa-trash text-danger';
        case 'create': return 'fas fa-plus text-success';
        case 'use': return 'fas fa-paper-plane text-primary';
        case 'status': return 'fas fa-info-circle text-info';
        case 'start': return 'fas fa-play text-success';
        case 'stop': return 'fas fa-stop text-danger';
        case 'invoke': return 'fas fa-paper-plane text-primary';
        default: return 'fas fa-dot-circle text-muted';
    }
};

/**
 * Parsed representation of a right key.
 */
type RightDescriptor = {
    parent: string;
    sub?: string;
    action?: string;
    isMeta: boolean;
};

/**
 * Parse a right key into parent group, optional sub-group and optional action.
 * e.g. `sightings` → {parent, meta}; `sightings_read` → {parent, action:read};
 * `sightings_mobile_read` → {parent, sub:mobile, action:read};
 * `sightings_mobile` → {parent, sub:mobile, meta}.
 * @param {string} rightKey
 * @return {RightDescriptor}
 */
const describeRight = (rightKey: string): RightDescriptor => {
    const tokens = rightKey.split('_');
    const parent = tokens[0];

    if (tokens.length === 1) {
        return {parent, isMeta: true};
    }

    const lastToken = tokens[tokens.length - 1];
    const lastIsAction = ACTION_TOKENS.has(lastToken);

    if (tokens.length === 2) {
        if (lastIsAction) {
            return {parent, action: lastToken, isMeta: false};
        }
        return {parent, sub: lastToken, isMeta: true};
    }

    if (lastIsAction) {
        const sub = tokens.slice(1, tokens.length - 1).join('_');
        return {parent, sub, action: lastToken, isMeta: false};
    }

    const sub = tokens.slice(1).join('_');
    return {parent, sub, isMeta: true};
};

/**
 * Role-right list widget (v2): a grouped, searchable access table. Top-level
 * groups (parent) → optional sub-groups → per-action rows with an access
 * checkbox each. Mirrors the kavula role-rights editor look.
 */
export class RoleRightListWidget extends CollectionCardWidget2<RoleRightEntry> {

    protected _table: Table2;

    protected _roleId: number = 0;

    protected _parentHeaders: Map<string, JQuery<HTMLTableRowElement>> = new Map();

    protected _subHeaders: Map<string, JQuery<HTMLTableRowElement>> = new Map();

    protected _sectionEntries: Map<string, RoleRightEntry[]> = new Map();

    /**
     * Constructor
     * @param {Component2|JQuery|string} element
     * @param {boolean} editable
     */
    public constructor(element: Component2 | JQuery | string, editable: boolean = false) {
        super({
            target: element,
            editable,
            entryClass: RoleRightEntry,
            bodyType: CardBodyType2.none,
            cardType: CardType2.none,
            cardLine: CardLine2.none
        });

        this._element.hideHeader();

        this._table = new Table2({striped: true});
        this._table.appendTo(this._element.getBodyElement());

        const tr = new Tr2();
        tr.appendTo(this._table.getThead());

        new Th2({value: new LangTextV2({text: 'name'})}).appendTo(tr);
        new Th2({value: new LangTextV2({text: 'access'}), width: '120px'}).appendTo(tr);
    }

    /**
     * Get the table element.
     * @return {Table2}
     */
    public getTable(): Table2 {
        return this._table;
    }

    /**
     * Create a new entry object.
     * @return {RoleRightEntry}
     * @protected
     */
    protected override _createObject(): RoleRightEntry {
        return new RoleRightEntry(this);
    }

    /**
     * Empty the collection element.
     * @protected
     */
    protected override _emptyCollectionElement(): void {
        this._table.getTbody().empty();
        this._parentHeaders.clear();
        this._subHeaders.clear();
        this._sectionEntries.clear();
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
     * Filter rows by a search term (matches raw key or label). Empty groups hide.
     * @param {string} search
     */
    public filterByName(search: string): void {
        const term = search.trim().toLowerCase();
        const parentHasVisible = new Map<string, boolean>();

        for (const [sectionKey, entries] of this._sectionEntries) {
            let sectionVisible = false;

            for (const entry of entries) {
                const visible = term === ''
                    || entry.getRightKey().toLowerCase().includes(term)
                    || entry.getSearchText().includes(term);

                entry.setVisible(visible);
                if (visible) {
                    sectionVisible = true;
                }
            }

            const slashIdx = sectionKey.indexOf('/');
            const parent = slashIdx === -1 ? sectionKey : sectionKey.substring(0, slashIdx);
            if (sectionVisible) {
                parentHasVisible.set(parent, true);
            }

            if (slashIdx !== -1) {
                const subHeader = this._subHeaders.get(sectionKey);
                if (subHeader) {
                    subHeader.toggle(sectionVisible);
                }
            }
        }

        for (const [parent, header] of this._parentHeaders) {
            header.toggle(parentHasVisible.get(parent) === true);
        }
    }

    /**
     * Populate the table from the right catalog, grouped + sorted.
     * @param {RightEntry[]} rights
     */
    public setRights(rights: RightEntry[]): void {
        this.removeAll();
        this._parentHeaders.clear();
        this._subHeaders.clear();
        this._sectionEntries.clear();

        const buckets = new Map<string, Map<string, RightEntry[]>>();

        for (const right of rights) {
            const desc = describeRight(right.key);
            if (!buckets.has(desc.parent)) {
                buckets.set(desc.parent, new Map());
            }
            const subBucket = buckets.get(desc.parent)!;
            const subKey = desc.sub ?? '';
            if (!subBucket.has(subKey)) {
                subBucket.set(subKey, []);
            }
            subBucket.get(subKey)!.push(right);
        }

        const sortedParents = Array.from(buckets.keys()).sort((a, b) => a.localeCompare(b));
        const tbody = this._table.getTbody();
        let isFirstParent = true;

        for (const parent of sortedParents) {
            const topPadding = isFirstParent ? '12px' : '28px';
            isFirstParent = false;

            const parentHeader = jQuery<HTMLTableRowElement>(
                '<tr class="table-active">' +
                '<td colspan="2" style="background-color:#e7f1ff;border-top:3px solid #007bff;' +
                `padding:${topPadding} 14px 12px 14px;font-weight:700;font-size:1.1em;` +
                'letter-spacing:0.3px;text-transform:uppercase;">' +
                `<i class="fas fa-folder-open mr-2 text-primary"></i><span>${parent}</span></td></tr>`
            );
            tbody.append(parentHeader);
            this._parentHeaders.set(parent, parentHeader);

            const subBucket = buckets.get(parent)!;
            const sortedSubs = Array.from(subBucket.keys()).sort((a, b) => {
                if (a === '' && b !== '') {
                    return -1;
                }
                if (a !== '' && b === '') {
                    return 1;
                }
                return a.localeCompare(b);
            });

            for (const sub of sortedSubs) {
                if (sub !== '') {
                    const subHeader = jQuery<HTMLTableRowElement>(
                        '<tr class="table-secondary">' +
                        '<td colspan="2" style="background-color:#f1f3f5;border-top:1px dashed #adb5bd;' +
                        'padding:8px 12px 8px 28px;font-weight:600;color:#495057;">' +
                        `<i class="fas fa-folder mr-2 text-primary"></i><span>${sub}</span></td></tr>`
                    );
                    tbody.append(subHeader);
                    this._subHeaders.set(`${parent}/${sub}`, subHeader);
                }

                const indent = sub !== '';
                const items = subBucket.get(sub)!.slice().sort((a, b) => {
                    const da = describeRight(a.key);
                    const db = describeRight(b.key);
                    const oa = ACTION_ORDER.indexOf(da.isMeta ? '' : da.action ?? '');
                    const ob = ACTION_ORDER.indexOf(db.isMeta ? '' : db.action ?? '');
                    return oa - ob;
                });

                const entries: RoleRightEntry[] = [];
                for (const right of items) {
                    const desc = describeRight(right.key);
                    const rrc = this._createObject();
                    rrc.setRight(right);

                    const label = desc.isMeta ? desc.sub ?? parent : desc.action ?? '';
                    const icon = iconForAction(desc.action, desc.isMeta, Boolean(desc.sub));
                    rrc.setDisplay(icon, label, right.key, indent);

                    this.addObject(rrc);
                    entries.push(rrc);
                }

                this._sectionEntries.set(sub === '' ? parent : `${parent}/${sub}`, entries);
            }
        }
    }

    /**
     * Uncheck every row.
     */
    public resetAllRoleRights(): void {
        for (const entry of this._objects) {
            entry.setChecked(false);
        }
    }

    /**
     * Apply the role's grants to the rows.
     * @param {RoleRightWire[]} roleRights
     */
    public setRoleRights(roleRights: RoleRightWire[]): void {
        this.resetAllRoleRights();

        const granted = new Map(roleRights.map((r) => [r.right_id, r.hasRight]));
        for (const entry of this._objects) {
            if (granted.get(entry.getRightId()) === true) {
                entry.setChecked(true);
            }
        }
    }

    /**
     * Collect every right with its checked state (wire format for the backend).
     * @return {RoleRightWire[]}
     */
    public getRoleRights(): RoleRightWire[] {
        return this._objects.map((entry) => ({
            right_id: entry.getRightId(),
            hasRight: entry.getChecked()
        }));
    }

}