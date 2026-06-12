import { DeckCard, Deck } from './types'

// Helper function to calculate CMC from mana cost string
const calculateCMC = (manaCost?: string): number => {
  if (!manaCost) return 0
  
  let cmc = 0
  const symbols = manaCost.match(/\{[^}]+\}/g) || []
  
  symbols.forEach(symbol => {
    const inner = symbol.replace(/[{}]/g, '')
    // Handle numbers
    if (/^\d+$/.test(inner)) {
      cmc += parseInt(inner, 10)
    }
    // Handle X (count as 0)
    else if (inner.toLowerCase() === 'x') {
      cmc += 0
    }
    // Handle hybrid mana like W/U or 2/W (counts as 1)
    else if (inner.includes('/')) {
      cmc += 1
    }
    // Handle single color symbols (W, U, B, R, G, C)
    else {
      cmc += 1
    }
  })
  
  return cmc
}

// Helper function to sort cards by CMC then alphabetically
const sortCardsByCMC = (cards: DeckCard[]): DeckCard[] => {
  return cards.sort((a, b) => {
    const cmcA = calculateCMC(a.mana_cost)
    const cmcB = calculateCMC(b.mana_cost)
    
    // First sort by CMC
    if (cmcA !== cmcB) {
      return cmcA - cmcB
    }
    
    // Then sort alphabetically
    return a.name.localeCompare(b.name)
  })
}

// Helper to check if a card is a basic land
const isBasicLand = (card: DeckCard) => {
  const basicLandNames = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest']
  return card.type_line?.toLowerCase().includes('basic land') && basicLandNames.includes(card.name)
}

export const categorizeCardsByTags = (deck: Deck) => {
  const categories: Record<string, DeckCard[]> = {
    Untagged: []
  }
  
  deck.cards.forEach((card: DeckCard) => {
    // Skip basic lands
    if (isBasicLand(card)) {
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
  
  // Sort cards by CMC then alphabetically within each category
  Object.keys(categories).forEach(key => {
    categories[key] = sortCardsByCMC(categories[key])
  })
  
  // Sort categories - put Commander first, Sideboard last
  const format = deck.format?.toLowerCase()
  const isCommanderFormat = format === 'commander' || format === 'brawl'
  
  const sortedCategories: Record<string, DeckCard[]> = {}
  const keys = Object.keys(categories)
  
  if (isCommanderFormat && categories['Commander'] && categories['Commander'].length > 0) {
    // Put Commander first
    sortedCategories['Commander'] = categories['Commander']
  }
  
  // Add remaining categories in alphabetical order (except Sideboard which goes last)
  keys.sort().forEach(key => {
    if (key !== 'Commander' && key !== 'Sideboard') {
      sortedCategories[key] = categories[key]
    }
  })
  
  // Add Sideboard at the end if it exists
  if (categories['Sideboard'] && categories['Sideboard'].length > 0) {
    sortedCategories['Sideboard'] = categories['Sideboard']
  }
  
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
    Lands: [],
    Sideboard: []
  }
  
  deck.cards.forEach((card: DeckCard) => {
    const typeLine = (card.type_line || '').toLowerCase()
    
    // Skip basic lands
    if (isBasicLand(card)) {
      return
    }
    
    // Check if card is in sideboard
    if (card.tags === 'Sideboard' || card.is_sideboard) {
      categories.Sideboard.push(card)
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
  
  // Sort cards by CMC then alphabetically within each category
  Object.keys(categories).forEach(key => {
    categories[key] = sortCardsByCMC(categories[key])
  })
  
  // Return in proper order: Commander, others, then Sideboard last
  const orderedCategories: Record<string, DeckCard[]> = {}
  const categoryOrder = ['Commander', 'Planeswalkers', 'Creatures', 'Instants', 'Sorceries', 'Artifacts', 'Enchantments', 'Lands', 'Sideboard']
  
  categoryOrder.forEach(key => {
    if (categories[key] && categories[key].length > 0) {
      orderedCategories[key] = categories[key]
    }
  })
  
  return orderedCategories
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
