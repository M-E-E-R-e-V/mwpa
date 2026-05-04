import {Component, ComponentType} from 'bambooo';

export class InputGroup extends Component<HTMLDivElement> {

    public constructor(element: ComponentType) {
        super();

        const telement = this._getAnyElement(element);
        this._element = jQuery<HTMLDivElement>('<div class="input-group" />').appendTo(telement);
    }

}