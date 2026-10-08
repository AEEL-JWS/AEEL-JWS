// Add a section name here to give any new page its own header image.
// Paths are relative to public/; positions keep the subject visible at each size.
export const heroImages: Record<string, { image: string; position?: string; mobilePosition?: string }> = {
  Research: { image: '/images/refresh/research-hero.jpg', position: 'center 53%', mobilePosition: '48% center' },
  Members: { image: '/images/refresh/members-hero.jpg', position: 'center 54%', mobilePosition: '63% center' },
  'Members / Professor': { image: '/images/editorial/professor-hero.png', position: 'center 56%', mobilePosition: '55% center' },
  'Members / Researchers': { image: '/images/editorial/researchers-hero.png', position: '63% center', mobilePosition: '64% center' },
  'Members / Alumni': { image: '/images/editorial/alumni-hero.png', position: '60% center', mobilePosition: '59% center' },
  Publications: { image: '/images/refresh/publications-hero.jpg', position: 'center 58%', mobilePosition: '64% center' },
  Board: { image: '/images/refresh/board-hero.jpg', position: 'center 55%', mobilePosition: '62% center' },
  Contact: { image: '/images/refresh/contact-hero.jpg', position: 'center 55%', mobilePosition: '60% center' },
};
