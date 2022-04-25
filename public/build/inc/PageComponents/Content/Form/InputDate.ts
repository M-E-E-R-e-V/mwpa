import {Element} from '../../Element';

/**
 * InputDateType
 */
export enum InputDateType {
    date,
    dateTime,
}

/**
 * InputDate
 */
export class InputDate extends Element {

    /**
     * input
     * @protected
     */
    protected _input: any;

    /**
     * constructor
     * @param element
     * @param id
     * @param type
     */
    public constructor(element: any, id?: string) {
        super();

        let aid: string = '';

        if (!id) {
            aid = id!;
        }

        const div = jQuery(`<div class="input-group date" id="${aid}" data-target-input="nearest" />`).appendTo(element);
        this._input = jQuery(`<input type="text" class="form-control datetimepicker-input" data-target="#${aid}">`).appendTo(div);
    }

}