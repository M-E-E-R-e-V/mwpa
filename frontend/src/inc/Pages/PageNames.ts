/**
 * Page name constants shared across pages. Kept in a neutral module so a page
 * can reference another page's menu key (e.g. to highlight the originating
 * sidebar entry) without importing that page's class — which would otherwise
 * form an import cycle through the navigation graph.
 */
export const SPECIES_PAGE_NAME: string = 'admin-species';
export const TOURS_PAGE_NAME: string = 'tours';