import {DialogInfo, ModalDialogType} from 'bambooo';

/**
 * UtilOttLink
 */
export class UtilOttLink {

    /**
     * Set the dialog for ott-id iframe infos
     * @param {any} element
     * @param {string} titleName
     * @param {string|number} ottid
     */
    public static setDialog(element: any, titleName: string, ottid: string|number): void {
        const tooltpSpecStr = 'Click for more Information';

        element.attr('data-toggle', 'tooltip');
        element.attr('data-html', 'true');
        element.attr('data-original-title', tooltpSpecStr);
        element.css({
            cursor: 'pointer'
        });

        element.on('click', () => {
            let infoStr = 'You can learn more about the species at the following links:&nbsp;';
            infoStr += `<a href="https://tree.opentreeoflife.org/taxonomy/browse?id=${ottid}" target="_blank">Opentreeoflife.org</a><br>`;
            infoStr += `<iframe style="width: 100%; height: 400px; border: 0" src="https://www.onezoom.org/life.html/@=${ottid}""></iframe>`;

            DialogInfo.info(
                'sightspeciesinfo',
                ModalDialogType.xlarge,
                `More Information over "${titleName}"`,
                infoStr,
                (_, modal: DialogInfo) => {
                    modal.hide();
                }
            );
        });
    }

}