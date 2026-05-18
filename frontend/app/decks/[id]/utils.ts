import { DeckCard, Deck } from './types'

export const categorizeCardsByTags = (deck: Deck) => {
  const categories: Record<string, DeckCard[]> = {
    Untagged: []
  }
  
  deck.cards.forEach((card: DeckCard) => {
    // Only show non-sideboard cards (is_sideboard is legacy, use Sideboard tag instead)
    if (card.is_sideboard) {
      return
    }
    
    // Skip basic lands
    if (card.type_line && card.type_line.includes('Basic Land')) {
      return
    }
    
    if (card.tags && card.tags.trim()) {
      const tag = card.tags.trim()
      if (!categories[tag]) {
        categories[tag] = []
      }
      categories[tag].push(card)
    } else {
      categories.Untagged.push(card)
    }
  })
  
  // Sort cards alphabetically within each category
  Object.keys(categories).forEach(key => {
    categories[key].sort((a, b) => a.name.localeCompare(b.name))
  })
  
  // Sort categories - put Commander first for Commander/Brawl formats
  const format = deck.format?.toLowerCase()
  const isCommanderFormat = format === 'commander' || format === 'brawl'
  
  const sortedCategories: Record<string, DeckCard[]> = {}
  const keys = Object.keys(categories)
  
  if (isCommanderFormat && categories['Commander'] && categories['Commander'].length > 0) {
    // Put Commander first
    sortedCategories['Commander'] = categories['Commander']
  }
  
  // Add remaining categories in alphabetical order
  keys.sort().forEach(key => {
    if (key !== 'Commander' || !isCommanderFormat) {
      sortedCategories[key] = categories[key]
    }
  })
  
  return sortedCategories
}

export const categorizeCardsByType = (deck: Deck) => {
  const categories: Record<string, DeckCard[]> = {
    Commander: [],
    Planeswalkers: [],
    Creatures: [],
    Instants: [],
    Sorceries: [],
    Artifacts: [],
    Enchantments: [],
    Lands: []
  }
  
  deck.cards.forEach((card: DeckCard) => {
    const typeLine = (card.type_line || '').toLowerCase()
    
    // Only show non-sideboard cards (is_sideboard is legacy, use Sideboard tag instead)
    if (card.is_sideboard) {
      return
    }
    
    // Skip basic lands
    if (typeLine.includes('basic land')) {
      return
    }
    
    if (card.is_commander) {
      categories.Commander.push(card)
    } else if (typeLine.includes('planeswalker')) {
      categories.Planeswalkers.push(card)
    } else if (typeLine.includes('creature')) {
      categories.Creatures.push(card)
    } else if (typeLine.includes('instant')) {
      categories.Instants.push(card)
    } else if (typeLine.includes('sorcery')) {
      categories.Sorceries.push(card)
    } else if (typeLine.includes('artifact')) {
      categories.Artifacts.push(card)
    } else if (typeLine.includes('enchantment')) {
      categories.Enchantments.push(card)
    } else if (typeLine.includes('land')) {
      categories.Lands.push(card)
    } else {
      categories.Artifacts.push(card)
    }
  })
  
  // Sort cards alphabetically within each category
  Object.keys(categories).forEach(key => {
    categories[key].sort((a, b) => a.name.localeCompare(b.name))
  })
  
  return categories
}

export const getCategoryCount = (cards: DeckCard[]) => {
  return cards.reduce((sum, card) => sum + card.quantity, 0)
}

export const getExistingTags = (deck: Deck | null): string[] => {
  if (!deck) return []
  const tags = new Set<string>()
  deck.cards.forEach((card: DeckCard) => {
    if (card.tags && card.tags.trim()) {
      tags.add(card.tags.trim())
    }
  })
  return Array.from(tags).sort()
}

export const getDefaultTagsForFormat = (format: string | undefined): string[] => {
  if (!format) return ['Sideboard']
  
  const formatLower = format.toLowerCase()
  
  if (formatLower === 'commander' || formatLower === 'brawl') {
    return ['Commander', 'Sideboard']
  }
  
  // All formats have Sideboard as default tag
  return ['Sideboard']
}

export const getAllTags = (deck: Deck | null, pendingTags: Set<string>): string[] => {
  const existing = getExistingTags(deck)
  const defaultTags = getDefaultTagsForFormat(deck?.format)
  const all = new Set([...defaultTags, ...existing])
  pendingTags.forEach(tag => all.add(tag))
  return Array.from(all).sort()
}
