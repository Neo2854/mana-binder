'use client'

import { Deck, DeckCard } from '../types'

interface DeckStatisticsProps {
  deck: Deck
}

export default function DeckStatistics({ deck }: DeckStatisticsProps) {
  const mainDeckCards = deck.cards.filter(c => !c.is_sideboard)
  
  // Calculate average CMC
  const cardsWithCMC = mainDeckCards.filter(c => {
    if (!c.mana_cost) return false
    // Parse mana cost to get CMC
    const matches = c.mana_cost.match(/\d+|[WUBRG]/g)
    return matches && matches.length > 0
  })
  
  const totalCMC = cardsWithCMC.reduce((sum, card) => {
    const matches = card.mana_cost?.match(/\d+|[WUBRG]/g) || []
    const cmc = matches.reduce((acc, match) => {
      return acc + (isNaN(Number(match)) ? 1 : Number(match))
    }, 0)
    return sum + (cmc * card.quantity)
  }, 0)
  
  const totalCardsWithCMC = cardsWithCMC.reduce((sum, card) => sum + card.quantity, 0)
  const avgCMC = totalCardsWithCMC > 0 ? (totalCMC / totalCardsWithCMC).toFixed(2) : 'N/A'
  
  // Color distribution
  const colorCounts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }
  mainDeckCards.forEach(card => {
    if (card.colors) {
      const colors = card.colors.split(',')
      colors.forEach(color => {
        if (colorCounts[color] !== undefined) {
          colorCounts[color] += card.quantity
        }
      })
    } else {
      colorCounts.C += card.quantity // Colorless
    }
  })
  
  const totalCards = mainDeckCards.reduce((sum, card) => sum + card.quantity, 0)
  
  // Card type distribution
  const typeCounts: Record<string, number> = {
    Creature: 0,
    Instant: 0,
    Sorcery: 0,
    Artifact: 0,
    Enchantment: 0,
    Planeswalker: 0,
    Land: 0
  }
  
  mainDeckCards.forEach(card => {
    const type = card.type_line?.toLowerCase() || ''
    if (type.includes('creature')) typeCounts.Creature += card.quantity
    if (type.includes('instant')) typeCounts.Instant += card.quantity
    if (type.includes('sorcery')) typeCounts.Sorcery += card.quantity
    if (type.includes('artifact')) typeCounts.Artifact += card.quantity
    if (type.includes('enchantment')) typeCounts.Enchantment += card.quantity
    if (type.includes('planeswalker')) typeCounts.Planeswalker += card.quantity
    if (type.includes('land')) typeCounts.Land += card.quantity
  })
  
  const colorSymbols: Record<string, string> = {
    W: '⚪',
    U: '🔵',
    B: '⚫',
    R: '🔴',
    G: '🟢',
    C: '◇'
  }
  
  const colorNames: Record<string, string> = {
    W: 'White',
    U: 'Blue',
    B: 'Black',
    R: 'Red',
    G: 'Green',
    C: 'Colorless'
  }
  
  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '1.5rem'
    }}>
      <h3 style={{
        fontSize: '1rem',
        fontWeight: '600',
        marginBottom: '1rem',
        color: 'black'
      }}>
        Deck Statistics
      </h3>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        {/* Total Cards */}
        <div style={{
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)', marginBottom: '0.25rem' }}>
            Total Cards
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
            {totalCards}
          </div>
        </div>
        
        {/* Average CMC */}
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid rgba(16, 185, 129, 0.3)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)', marginBottom: '0.25rem' }}>
            Average CMC
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
            {avgCMC}
          </div>
        </div>
        
        {/* Unique Cards */}
        <div style={{
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid rgba(249, 115, 22, 0.3)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)', marginBottom: '0.25rem' }}>
            Unique Cards
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f97316' }}>
            {mainDeckCards.length}
          </div>
        </div>
      </div>
      
      {/* Color Distribution */}
      <div style={{ marginTop: '1.5rem' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: 'black' }}>
          Color Distribution
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {Object.entries(colorCounts).filter(([_, count]) => count > 0).map(([color, count]) => (
            <div 
              key={color}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>{colorSymbols[color]}</span>
              <span style={{ color: 'rgba(0, 0, 0, 0.7)' }}>{colorNames[color]}</span>
              <span style={{ fontWeight: 'bold', color: 'black' }}>{count}</span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.5)' }}>
                ({((count / totalCards) * 100).toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Card Type Breakdown */}
      <div style={{ marginTop: '1.5rem' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: 'black' }}>
          Card Types
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
          {Object.entries(typeCounts).filter(([_, count]) => count > 0).map(([type, count]) => (
            <div 
              key={type}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                fontSize: '0.8125rem'
              }}
            >
              <span style={{ color: 'rgba(0, 0, 0, 0.7)' }}>{type}</span>
              <span style={{ fontWeight: 'bold', color: 'black' }}>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
