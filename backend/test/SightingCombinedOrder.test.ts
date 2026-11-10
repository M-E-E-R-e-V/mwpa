import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {SightingRepository} from '../src/Db/MariaDb/Repositories/SightingRepository.js';

describe('SightingRepository.combinedOrderBy', () => {

    it('falls back to the list default', () => {
        assert.equal(SightingRepository.combinedOrderBy({}), 'u.dt DESC, u.ts DESC, u.id DESC, u.is_old ASC');
    });

    it('follows the list sort in priority order', () => {
        assert.equal(
            SightingRepository.combinedOrderBy({date: 'ASC', tour_start: 'ASC'}),
            'u.dt ASC, u.ts ASC, u.id DESC, u.is_old ASC'
        );
        assert.equal(
            SightingRepository.combinedOrderBy({create_datetime: 'DESC'}),
            'u.cdt DESC, u.id DESC, u.is_old ASC'
        );
    });

    it('keeps an explicit id sort and ignores unknown keys', () => {
        assert.equal(
            SightingRepository.combinedOrderBy({id: 'ASC', 'x; DROP TABLE': 'DESC'} as Record<string, 'ASC' | 'DESC'>),
            'u.id ASC, u.is_old ASC'
        );
    });

});