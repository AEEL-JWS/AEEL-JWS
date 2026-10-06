import {createHash} from 'node:crypto';

// These keys are also stored in frontmatter so Pages CMS (which sorts one field)
// shows the same order as the site. The site always recomputes the key from data.
const pad = (value, length) => String(value).padStart(length, '0');
const datePart = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10).replaceAll('-', '');
};
const creationPart = (id) => /^\d{14}-/.exec(id)?.[0].slice(0, -1) ?? '';
const legacyPart = (order) => order === undefined || order === null || order === ''
  ? '000000' : pad(999999 - Number(order), 6);
const tie = (id) => {
  const slug = String(id).toLowerCase();
  return `${slug.slice(0, 8)}-${createHash('sha256').update(slug).digest('hex').slice(0, 10)}`;
};

export function paperSortKey(data, id) {
  const year = pad(data.year, 4);
  const exactDate = datePart(data.sortDate);
  if (exactDate) return `${year}-2-${exactDate}999999-${tie(id)}`;
  const created = creationPart(id);
  if (created) return `${year}-2-${created}-${tie(id)}`;
  return `${year}-1-${legacyPart(data.order)}-${tie(id)}`;
}

export function patentEffectiveDate(data) {
  return data.registrationDate || data.applicationDate;
}

export function patentSortKey(data, id) {
  const effectiveDate = datePart(patentEffectiveDate(data));
  const created = creationPart(id);
  const secondary = created ? `2-${created}` : `1-${legacyPart(data.order)}`;
  return `${effectiveDate}-${secondary}-${tie(id)}`;
}

export function conferenceYear(data) {
  return data.eventDate ? Number(datePart(data.eventDate).slice(0, 4)) : Number(data.year);
}

export function conferenceSortKey(data, id) {
  const year = pad(conferenceYear(data), 4);
  const exactDate = datePart(data.eventDate);
  if (exactDate) return `${year}-2-${exactDate}999999-${tie(id)}`;
  const created = creationPart(id);
  if (created) return `${year}-2-${created}-${tie(id)}`;
  return `${year}-1-${legacyPart(data.order)}-${tie(id)}`;
}

export function newestFirst(key) {
  return (a, b) => key(b.data, b.id).localeCompare(key(a.data, a.id), 'en');
}
