import test from 'node:test';
import assert from 'node:assert/strict';
import {conferenceSortKey, conferenceYear, newestFirst, paperSortKey, patentEffectiveDate, patentSortKey} from '../src/lib/publicationSort.mjs';

const sorted = (records, key) => records.sort(newestFirst(key)).map(record => record.id);

test('papers group by year, use exact dates, and preserve old undated order', () => {
  const records = [
    {id:'old-first', data:{year:2026, order:1}},
    {id:'old-second', data:{year:2026, order:2}},
    {id:'dated', data:{year:2026, sortDate:'2026-09-01'}},
    {id:'20261006120000-new-paper', data:{year:2026}},
    {id:'last-year', data:{year:2025, order:1}},
  ];
  assert.deepEqual(sorted(records, paperSortKey), ['20261006120000-new-paper','dated','old-first','old-second','last-year']);
});

test('patents use registration date when present, otherwise application date', () => {
  const registered = {applicationDate:new Date('2024-01-01'), registrationDate:new Date('2026-07-22')};
  const application = {applicationDate:new Date('2026-06-01')};
  assert.equal(patentEffectiveDate(registered).toISOString().slice(0,10), '2026-07-22');
  assert.equal(patentEffectiveDate(application).toISOString().slice(0,10), '2026-06-01');
  assert.deepEqual(sorted([{id:'application',data:application},{id:'registered',data:registered}],patentSortKey), ['registered','application']);
});

test('conferences prefer exact event dates and keep year-only legacy order', () => {
  const records = [
    {id:'old-first', data:{year:2026,order:1}},
    {id:'old-second', data:{year:2026,order:2}},
    {id:'dated-april', data:{eventDate:'2026-04-01'}},
    {id:'dated-october', data:{eventDate:'2026-10-01'}},
    {id:'last-year', data:{year:2025,order:1}},
  ];
  assert.equal(conferenceYear(records[2].data), 2026);
  assert.deepEqual(sorted(records, conferenceSortKey), ['dated-october','dated-april','old-first','old-second','last-year']);
});

test('equal dates resolve by stable filename', () => {
  const data = {applicationDate:'2026-10-01'};
  assert.deepEqual(sorted([{id:'a',data},{id:'b',data}],patentSortKey), ['b','a']);
});
