import {ComponentType, Component} from 'bambooo';
import moment from 'moment';

export interface InputDateRanges {
    [key: string]: string|any;
}

export type DateRangeChangeFn = (start: moment.Moment|null, end: moment.Moment|null) => void;

const PLACEHOLDER_LABEL = 'Date Range picker';

export class DateRangeButton extends Component<HTMLButtonElement> {

    protected _label: any;
    protected _start: moment.Moment|null = null;
    protected _end: moment.Moment|null = null;
    protected _onChange: DateRangeChangeFn|null = null;

    public constructor(element: ComponentType) {
        super();

        const telement = this._getAnyElement(element);
        this._element = jQuery<HTMLButtonElement>('<button type="button" class="btn btn-default" />').appendTo(telement);
        this._element.append(`<i class="far fa-calendar-alt"></i> <span class="label">${PLACEHOLDER_LABEL}</span> <i class="fas fa-caret-down"></i>`);
        this._label = this._element.find('span.label');

        // @ts-ignore
        this._element.daterangepicker({
            autoUpdateInput: false,
            showDropdowns: true,
            format: 'YYYY-MM-DD',
            ranges: {
                'Today': [moment(), moment()],
                'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
                'Last 7 Days': [moment().subtract(6, 'days'), moment()],
                'Last 30 Days': [moment().subtract(29, 'days'), moment()],
                'This Month': [moment().startOf('month'), moment().endOf('month')],
                'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
            }
        });

        this._element.on('apply.daterangepicker', (_event: unknown, picker: {startDate: moment.Moment; endDate: moment.Moment}) => {
            this._start = picker.startDate.clone();
            this._end = picker.endDate.clone();
            this._label.text(`${this._start.format('YYYY-MM-DD')} – ${this._end.format('YYYY-MM-DD')}`);

            if (this._onChange) {
                this._onChange(this._start, this._end);
            }
        });

        this._element.on('cancel.daterangepicker', () => {
            this.clear();
        });
    }

    /**
     * Currently selected start date (or null when nothing was picked / it was cleared).
     * @return {moment.Moment|null}
     */
    public getStart(): moment.Moment|null {
        return this._start;
    }

    /**
     * Currently selected end date (or null).
     * @return {moment.Moment|null}
     */
    public getEnd(): moment.Moment|null {
        return this._end;
    }

    /**
     * ISO YYYY-MM-DD start, or empty string when no range is set.
     * @return {string}
     */
    public getStartIso(): string {
        return this._start ? this._start.format('YYYY-MM-DD') : '';
    }

    /**
     * ISO YYYY-MM-DD end, or empty string when no range is set.
     * @return {string}
     */
    public getEndIso(): string {
        return this._end ? this._end.format('YYYY-MM-DD') : '';
    }

    /**
     * Reset the picker to "no range" — used by the filter's reset button.
     */
    public clear(): void {
        this._start = null;
        this._end = null;
        this._label.text(PLACEHOLDER_LABEL);

        if (this._onChange) {
            this._onChange(null, null);
        }
    }

    /**
     * Subscribe to range changes (fires on apply and on clear).
     * @param {DateRangeChangeFn} fn
     */
    public setOnChange(fn: DateRangeChangeFn): void {
        this._onChange = fn;
    }

}