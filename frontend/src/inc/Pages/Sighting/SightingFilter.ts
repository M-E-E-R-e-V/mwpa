import {ButtonDefault, Card, FormGroup, FormRow, LangText, SearchWidget, Icon} from 'bambooo';
import {Species as SpeciesAPI} from '../../Api/Species';
import {DateRangeButton} from '../../Widget/DateRangeButton';
import {InputGroup} from '../../Widget/InputGroup';

/**
 * Sighting Filter Card
 */
export class SightingFilter extends Card {

    /**
     * Species
     * @protected
     */
    protected _selectSpecies: SearchWidget;

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

        const rowFilterLine = new FormRow(bodyFilterCard);
        const groupFilterPeriod = new FormGroup(rowFilterLine.createCol(1), 'Period');
        const inputGroup = new InputGroup(groupFilterPeriod);
        const drb = new DateRangeButton(inputGroup);
        drb.show();

        const groupFilterSpecies = new FormGroup(rowFilterLine.createCol(1), new LangText('Species'));
        this._selectSpecies = new SearchWidget(groupFilterSpecies);
        this._selectSpecies.setOnTemplateSelection((entryData): any => {
            const span = jQuery('<span />');

            // eslint-disable-next-line no-new
            new Icon(span, 'fa fa-solid fa-tags');

            span.append(` <span>${entryData.text}</span>`);

            return span;
        });

        this._selectSpecies.setRequestTransport(async(
            params,
            success,
            failure
        ): Promise<void> => {
            if (params.data.term) {
                try {
                    const list = [];

                    const species = await SpeciesAPI.getList();

                    if (species) {
                        for (const tspecies of species) {
                            if (tspecies.name.toLowerCase().indexOf(params.data.term.toLowerCase()) !== -1) {
                                list.push({
                                    id: tspecies.id,
                                    test: tspecies.name
                                });
                            }
                        }
                    }

                    success({
                        results: list,
                        pagination: {
                            more: false
                        }
                    });
                } catch (e) {
                    failure(undefined, 'not found', '');
                    console.log(e);
                }
            }
        });
    }

}