// Landing-card imagery is separate from the hero used by each destination page.
// Add or replace a card image here without changing its text, URL, or page hero.
type LandingImage = { image: string; alt: string; position?: string; mobilePosition?: string };

export const landingImages: Record<string, Record<string, LandingImage>> = {
  Members: {
    Professor: { image: '/images/refresh/professor-card.jpg', alt: 'Books, research papers, and awards on a sunlit academic desk', position: 'center 58%' },
    Researchers: { image: '/images/editorial/members-hero.png', alt: 'Researchers working together in a bright electronic devices laboratory', position: '76% center', mobilePosition: '75% center' },
    Alumni: { image: '/images/editorial/board-hero.png', alt: 'People walking through a tree-lined university campus', position: '70% center' },
  },
  Publications: {
    Papers: { image: '/images/refresh/papers-card.jpg', alt: 'Research manuscripts with electron microscopy figures on a laboratory desk' },
    Patents: { image: '/images/refresh/patents-card.jpg', alt: 'Electronic device prototype and technical drawings on a laboratory worktable' },
    Conferences: { image: '/images/refresh/conferences-card.jpg', alt: 'Academic conference audience listening to a materials research presentation', position: 'center 58%' },
  },
  Board: {
    Notices: { image: '/images/refresh/notices-card.jpg', alt: 'An organized laboratory notice board and desk', position: '61% center' },
    News: { image: '/images/refresh/news-card.jpg', alt: 'Researchers discussing a device sample in a laboratory' },
    Gallery: { image: '/images/refresh/gallery-card.jpg', alt: 'A collection of photographs showing research equipment and laboratory activities' },
  },
};
