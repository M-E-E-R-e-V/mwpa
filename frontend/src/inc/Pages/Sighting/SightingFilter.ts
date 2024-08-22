import {ButtonDefault, Card, FormGroup, FormRow, InputBottemBorderOnly2, InputType, LangText} from 'bambooo';

/**
 * Sighting Filter Card
 */
export class SightingFilter extends Card {

    /**
     * Constructor
     * @param elementObject
     */
    public constructor(elementObject: any) {
        super(elementObject);

        this.setTitle(new LangText('Filter'));
        // default is hide
        this.hide();

        const btnFilterClose = new ButtonDefault(this.getToolsElement(), undefined, 'fa fa-times');
        btnFilterClose.setOnClickFn(() => {
            this.hide();
        });

        const bodyFilterCard = jQuery('<div class="card-body"/>').appendTo(this.getBodyElement());
        const rowFilterTime = new FormRow(bodyFilterCard);
        const groupFilterPeriod = new FormGroup(rowFilterTime.createCol(1), 'Period');
        const selectFilterPeriod = new InputBottemBorderOnly2(
            groupFilterPeriod,
            undefined,
            InputType.daterange,
            {
                ranges: {
                    'Today': 'today',
                    'Yesterday': 'yesterday',
                    'Last 7 Days': 'last7days',
                    'Last 30 Days': 'last30days',
                    'This Month': 'thismonth',
                    'Last Month': 'lastmonth'
                }
            }
        );

        selectFilterPeriod.show();
    }

}