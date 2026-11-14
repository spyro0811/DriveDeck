export const featuredDeckIds = ['modular', 'lyrics'];

export function sanitizeViewedDecks(value) {
  return Array.isArray(value) ? featuredDeckIds.filter(id => value.includes(id)) : [];
}

export function deckLibraryOrder(decks, viewed) {
  const newDecks = featuredDeckIds.filter(id => !viewed.has(id));
  const featured = newDecks.map(id => decks.find(deck => deck.id === id)).filter(Boolean);
  return [...featured.map(deck => ({ ...deck, isNew: true })),
    ...decks.filter(deck => !newDecks.includes(deck.id))];
}
