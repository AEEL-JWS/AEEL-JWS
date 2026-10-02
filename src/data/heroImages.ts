// Add a section name here to give any new page its own header image.
// Paths are relative to public/; positions keep the subject visible at each size.
export const heroImages: Record<string, { image: string; position?: string; mobilePosition?: string }> = {
  Research: { image: '/images/editorial/research-hero.png', position: 'center center', mobilePosition: '68% center' },
  Members: { image: '/images/editorial/members-hero.png', position: 'center center', mobilePosition: '70% center' },
  'Members / Professor': { image: '/images/editorial/professor-hero.png', position: 'center 56%', mobilePosition: '55% center' },
  'Members / Researchers': { image: '/images/editorial/researchers-hero.png', position: '63% center', mobilePosition: '64% center' },
  'Members / Alumni': { image: '/images/editorial/alumni-hero.png', position: '60% center', mobilePosition: '59% center' },
  Publications: { image: '/images/editorial/publications-hero.png', position: 'center center', mobilePosition: '72% center' },
  Board: { image: '/images/editorial/board-hero.png', position: 'center center', mobilePosition: '70% center' },
  Contact: { image: '/images/editorial/korea-university-main-building.jpg', position: 'center 36%', mobilePosition: '65% center' },
};
