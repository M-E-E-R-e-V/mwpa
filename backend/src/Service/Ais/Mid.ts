/**
 * Maritime Identification Digits (MID) — first 3 digits of an MMSI
 * tell you the flag state of the radio license. Lookup table per
 * ITU-R M.585 (truncated to commonly-seen flags around the Canary
 * Islands; unknown MIDs fall back to '').
 *
 * Full list would be ~300 entries — covering all-the-time-seen ones
 * gives near-100% hit rate for our region without the bulk.
 */
const MID_TO_FLAG: Record<string, string> = {
    '201': 'ALB', '202': 'AND', '203': 'AUT', '204': 'AZO', '205': 'BEL',
    '206': 'BLR', '207': 'BGR', '208': 'VAT', '209': 'CYP', '210': 'CYP',
    '211': 'DEU', '212': 'CYP', '213': 'GEO', '214': 'MDA', '215': 'MLT',
    '216': 'ARM', '218': 'DEU', '219': 'DNK', '220': 'DNK', '224': 'ESP',
    '225': 'ESP', '226': 'FRA', '227': 'FRA', '228': 'FRA', '229': 'MLT',
    '230': 'FIN', '231': 'FRO', '232': 'GBR', '233': 'GBR', '234': 'GBR',
    '235': 'GBR', '236': 'GIB', '237': 'GRC', '238': 'HRV', '239': 'GRC',
    '240': 'GRC', '241': 'GRC', '242': 'MAR', '243': 'HUN', '244': 'NLD',
    '245': 'NLD', '246': 'NLD', '247': 'ITA', '248': 'MLT', '249': 'MLT',
    '250': 'IRL', '251': 'ISL', '252': 'LIE', '253': 'LUX', '254': 'MCO',
    '255': 'POR', '256': 'MLT', '257': 'NOR', '258': 'NOR', '259': 'NOR',
    '261': 'POL', '262': 'MNE', '263': 'PRT', '264': 'ROU', '265': 'SWE',
    '266': 'SWE', '267': 'SVK', '268': 'SMR', '269': 'CHE', '270': 'CZE',
    '271': 'TUR', '272': 'UKR', '273': 'RUS', '274': 'MKD',
    '303': 'USA', '304': 'ATG', '305': 'ATG', '306': 'NLD', '307': 'ABW',
    '308': 'BHS', '309': 'BHS', '310': 'BMU', '311': 'BHS', '312': 'BLZ',
    '316': 'CAN', '319': 'CYM',
    '338': 'USA', '341': 'KNA', '345': 'MEX', '351': 'PAN', '352': 'PAN',
    '353': 'PAN', '354': 'PAN', '355': 'PAN', '356': 'PAN', '357': 'PAN',
    '358': 'PRI', '359': 'SLV', '361': 'SPM', '366': 'USA', '367': 'USA',
    '368': 'USA', '369': 'USA', '370': 'PAN', '371': 'PAN', '372': 'PAN',
    '373': 'PAN', '374': 'PAN', '376': 'VCT', '377': 'VCT', '378': 'VCT',
    '512': 'NZL', '525': 'IDN', '533': 'MYS', '538': 'MHL',
    '563': 'SGP', '564': 'SGP', '565': 'SGP', '566': 'SGP',
    '603': 'AGO', '617': 'CPV',
    '620': 'COM', '624': 'CIV', '625': 'BEN', '626': 'GAB', '627': 'COG',
    '631': 'GNQ', '633': 'GMB', '634': 'GHA', '636': 'LBR', '637': 'LBR',
    '642': 'LBY', '649': 'MRT',
    '671': 'TGO', '672': 'TUN'
};

/**
 * Map an MMSI to its flag ISO-3 code via the MID lookup. Returns ''
 * when the MID isn't in the table.
 */
export const flagFromMmsi = (mmsi: string): string => {
    if (mmsi.length < 3) {
        return '';
    }
    return MID_TO_FLAG[mmsi.substring(0, 3)] ?? '';
};
