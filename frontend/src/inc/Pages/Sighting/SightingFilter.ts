import {ButtonDefault, Card, FormGroup, FormRow, LangText, SelectBottemBorderOnly2} from 'bambooo';

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
        const selectFilterPeriod = new SelectBottemBorderOnly2(groupFilterPeriod);

        selectFilterPeriod.addValue({
            key: '',
            value: 'None'
        });

        selectFilterPeriod.addValue({
            key: 'current_week',
            value: 'Current week'
        });

        selectFilterPeriod.addValue({
            key: 'current_month',
            value: 'Current month'
        });

        selectFilterPeriod.addValue({
            key: 'last_month',
            value: 'Last month'
        });

        selectFilterPeriod.addValue({
            key: 'last_3_month',
            value: 'Last 3 month'
        });

        selectFilterPeriod.addValue({
            key: 'current_year',
            value: 'Current year'
        });

        selectFilterPeriod.addValue({
            key: 'last_year',
            value: 'Last Year'
        });

        selectFilterPeriod.addValue({
            key: 'custom',
            value: 'Custom Range'
        });
    }

}