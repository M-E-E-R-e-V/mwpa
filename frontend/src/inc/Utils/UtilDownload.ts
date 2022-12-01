/**
 * UtilDownload
 */
export class UtilDownload {

    /**
     * download
     * @param url
     * @param filename
     */
    public static download(url: string, filename: string): void {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
    }
}