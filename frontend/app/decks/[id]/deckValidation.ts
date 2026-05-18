import { Deck, DeckCard } from './types'

export interface ValidationResult {
  valid: boolean
  violations: string[]
}

/**
 * Validates a deck based on its format rules
 */
export const validateDeck = (deck: Deck): ValidationResult => {
  const violations: string[] = []
  const format = deck.format?.toLowerCase()
  
  if (!format) {
    return { valid: true, violations: [] }
  }

  const mainDeckCards = deck.cards.filter(c => !c.is_sideboard)
  const totalCards = mainDeckCards.reduce((sum, card) => sum + card.quantity, 0)

  switch (format) {
    case 'standard':
      return validateStandard(mainDeckCards, totalCards)
    case 'commander':
      return validateCommander(mainDeckCards, totalCards)
    case 'modern':
      return validateModern(mainDeckCards, totalCards)
    case 'pioneer':
      return validatePioneer(mainDeckCards, totalCards)
    case 'legacy':
      return validateLegacy(mainDeckCards, totalCards)
    case 'vintage':
      return validateVintage(mainDeckCards, totalCards)
    case 'pauper':
      return validatePauper(mainDeckCards, totalCards)
    case 'brawl':
      return validateBrawl(mainDeckCards, totalCards)
    default:
      // Unknown format, no validation
      return { valid: true, violations: [] }
  }
}

/**
 * Standard: 60 cards minimum, max 4 copies (except basic lands)
 */
const validateStandard = (cards: DeckCard[], totalCards: number): ValidationResult => {
  const violations: string[] = []
  
  if (totalCards < 60) {
    violations.push(`Deck must have at least 60 cards (currently ${totalCards})`)
  }
  
  const cardCounts = getCardCounts(cards, false)
  cardCounts.forEach((count, name) => {
    if (count > 4) {
      violations.push(`"${name}" has ${count} copies (max 4 allowed)`)
    }
  })
  
  return {
    valid: violations.length === 0,
    violations
  }
}

/**
 * Commander: Exactly 100 cards, max 1 copy (except basic lands), must have 1 commander
 */
const validateCommander = (cards: DeckCard[], totalCards: number): ValidationResult => {
  const violations: string[] = []
  
  if (totalCards !== 100) {
    violations.push(`Commander deck must have exactly 100 cards (currently ${totalCards})`)
  }
  
  const cardCounts = getCardCounts(cards, true)
  cardCounts.forEach((count, name) => {
    if (count > 1) {
      violations.push(`"${name}" has ${count} copies (max 1 allowed in Commander)`)
    }
  })
  
  const commanderCount = cards.filter(c => c.is_commander).length
  if (commanderCount === 0) {
    violations.push('Deck must have a commander')
  } else if (commanderCount > 1) {
    violations.push(`Deck has ${commanderCount} commanders (only 1 allowed)`)
  }
  
  return {
    valid: violations.length === 0,
    violations
  }
}

/**
 * Modern: 60 cards minimum, max 4 copies (except basic lands)
 */
const validateModern = (cards: DeckCard[], totalCards: number): ValidationResult => {
  const violations: string[] = []
  
  if (totalCards < 60) {
    violations.push(`Deck must have at least 60 cards (currently ${totalCards})`)
  }
  
  const cardCounts = getCardCounts(cards, false)
  cardCounts.forEach((count, name) => {
    if (count > 4) {
      violations.push(`"${name}" has ${count} copies (max 4 allowed)`)
    }
  })
  
  return {
    valid: violations.length === 0,
    violations
  }
}

/**
 * Pioneer: 60 cards minimum, max 4 copies (except basic lands)
 */
const validatePioneer = (cards: DeckCard[], totalCards: number): ValidationResult => {
  const violations: string[] = []
  
  if (totalCards < 60) {
    violations.push(`Deck must have at least 60 cards (currently ${totalCards})`)
  }
  
  const cardCounts = getCardCounts(cards, false)
  cardCounts.forEach((count, name) => {
    if (count > 4) {
      violations.push(`"${name}" has ${count} copies (max 4 allowed)`)
    }
  })
  
  return {
    valid: violations.length === 0,
    violations
  }
}

/**
 * Legacy: 60 cards minimum, max 4 copies (except basic lands)
 */
const validateLegacy = (cards: DeckCard[], totalCards: number): ValidationResult => {
  const violations: string[] = []
  
  if (totalCards < 60) {
    violations.push(`Deck must have at least 60 cards (currently ${totalCards})`)
  }
  
  const cardCounts = getCardCounts(cards, false)
  cardCounts.forEach((count, name) => {
    if (count > 4) {
      violations.push(`"${name}" has ${count} copies (max 4 allowed)`)
    }
  })
  
  return {
    valid: violations.length === 0,
    violations
  }
}

/**
 * Vintage: 60 cards minimum, max 4 copies (except basic lands)
 */
const validateVintage = (cards: DeckCard[], totalCards: number): ValidationResult => {
  const violations: string[] = []
  
  if (totalCards < 60) {
    violations.push(`Deck must have at least 60 cards (currently ${totalCards})`)
  }
  
  const cardCounts = getCardCounts(cards, false)
  cardCounts.forEach((count, name) => {
    if (count > 4) {
      violations.push(`"${name}" has ${count} copies (max 4 allowed)`)
    }
  })
  
  return {
    valid: violations.length === 0,
    violations
  }
}

/**
 * Pauper: 60 cards minimum, max 4 copies (except basic lands), commons only
 */
const validatePauper = (cards: DeckCard[], totalCards: number): ValidationResult => {
  const violations: string[] = []
  
  if (totalCards < 60) {
    violations.push(`Deck must have at least 60 cards (currently ${totalCards})`)
  }
  
  const cardCounts = getCardCounts(cards, false)
  cardCounts.forEach((count, name) => {
    if (count > 4) {
      violations.push(`"${name}" has ${count} copies (max 4 allowed)`)
    }
  })
  
  return {
    valid: violations.length === 0,
    violations
  }
}

/**
 * Brawl: Exactly 60 cards (or 100 for Historic Brawl), max 1 copy (except basic lands), must have 1 commander
 */
const validateBrawl = (cards: DeckCard[], totalCards: number): ValidationResult => {
  const violations: string[] = []
  
  // Brawl can be 60 or 100 cards (Historic Brawl)
  if (totalCards !== 60 && totalCards !== 100) {
    violations.push(`Brawl deck must have exactly 60 cards (or 100 for Historic Brawl) (currently ${totalCards})`)
  }
  
  const cardCounts = getCardCounts(cards, true)
  cardCounts.forEach((count, name) => {
    if (count > 1) {
      violations.push(`"${name}" has ${count} copies (max 1 allowed in Brawl)`)
    }
  })
  
  const commanderCount = cards.filter(c => c.is_commander).length
  if (commanderCount === 0) {
    violations.push('Brawl deck must have a commander')
  } else if (commanderCount > 1) {
    violations.push(`Deck has ${commanderCount} commanders (only 1 allowed)`)
  }
  
  return {
    valid: violations.length === 0,
    violations
  }
}

/**
 * Helper function to count card copies, excluding basic lands and optionally commanders
 */
const getCardCounts = (cards: DeckCard[], excludeCommanders: boolean): Map<string, number> => {
  const cardCounts = new Map<string, number>()
  
  cards.forEach(card => {
    const isBasicLand = card.type_line?.includes('Basic Land')
    const isCommander = excludeCommanders && card.is_commander
    
    if (!isBasicLand && !isCommander) {
      const currentCount = cardCounts.get(card.name) || 0
      cardCounts.set(card.name, currentCount + card.quantity)
    }
  })
  
  return cardCounts
}
