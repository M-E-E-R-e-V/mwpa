/**
 * DefaultReturn
 */
import {StatusCodes} from '../Status/StatusCodes';

/**
 * DefaultReturn
 */
export type DefaultReturn = {
    statusCode: string|StatusCodes;
    msg?: string;
};