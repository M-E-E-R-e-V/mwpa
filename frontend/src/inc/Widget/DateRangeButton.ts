import {Element} from 'bambooo';
import moment from 'moment';

export interface InputDateRanges {
    [key: string]: string|any;
}

export class DateRangeButton extends Element {

    protected _label: any;

    public constructor(element: any|Element) {
        super();

        const telement = this._getAnyElement(element);
        this._element = jQuery('<button type="button" class="btn btn-default float-right" />').appendTo(telement);
        this._element.append('<i class="far fa-calendar-alt"></i> Date Range picker <i class="fas fa-caret-down"></i>');
        this._label = jQuery('<span></span>').appendTo(this._element);

        const start = moment().subtract(29, 'days');
        const end = moment();

        this._element.daterangepicker({
            startDate: start,
            endDate: end,
            showDropdowns: true,
            format: 'de',
            ranges: {
                'Today': [moment(), moment()],
                'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
                'Last 7 Days': [moment().subtract(6, 'days'), moment()],
                'Last 30 Days': [moment().subtract(29, 'days'), moment()],
                'This Month': [moment().startOf('month'), moment().endOf('month')],
                'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
            }
        }, (astart: moment.Moment, aend: moment.Moment) => {
            this._label.html(`${astart.format('MMMM D, YYYY')} - ${aend.format('MMMM D, YYYY')}`);
        });
    }

}