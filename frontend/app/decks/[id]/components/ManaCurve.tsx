'use client'

import { Deck } from '../types'

interface ManaCurveProps {
  deck: Deck
}

export default function ManaCurve({ deck }: ManaCurveProps) {
  const mainDeckCards = deck.cards.filter(c => !c.is_sideboard)
  
  // Calculate CMC for each card
  const cmcDistribution: Record<number, number> = {}
  let landsCount = 0
  
  mainDeckCards.forEach(card => {
    const type = card.type_line?.toLowerCase() || ''
    
    // Count lands separately
    if (type.includes('land')) {
      landsCount += card.quantity
      return
    }
    
    if (!card.mana_cost) {
      // Cards without mana cost (like some special cards)
      cmcDistribution[0] = (cmcDistribution[0] || 0) + card.quantity
      return
    }
    
    // Parse mana cost to get CMC
    const matches = card.mana_cost.match(/\d+|[WUBRG]/g) || []
    const cmc = matches.reduce((acc, match) => {
      return acc + (isNaN(Number(match)) ? 1 : Number(match))
    }, 0)
    
    cmcDistribution[cmc] = (cmcDistribution[cmc] || 0) + card.quantity
  })
  
  // Get max CMC for scaling
  const maxCMC = Math.max(...Object.keys(cmcDistribution).map(Number), 7)
  const maxCount = Math.max(...Object.values(cmcDistribution), 1)
  
  // Create array for all CMCs 0-7+
  const cmcArray = Array.from({ length: maxCMC + 1 }, (_, i) => ({
    cmc: i,
    count: cmcDistribution[i] || 0
  }))
  
  // Combine 7+ into one bar
  const sevenPlus = Object.entries(cmcDistribution)
    .filter(([cmc]) => Number(cmc) >= 7)
    .reduce((sum, [_, count]) => sum + count, 0)
  
  const displayCMC = cmcArray.slice(0, 7)
  if (sevenPlus > 0) {
    displayCMC.push({ cmc: 7, count: sevenPlus })
  }
  
  const totalNonLand = mainDeckCards.reduce((sum, card) => {
    const type = card.type_line?.toLowerCase() || ''
    return sum + (type.includes('land') ? 0 : card.quantity)
  }, 0)
  
  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '2rem'
    }}>
      <h2 style={{
        fontSize: '1.25rem',
        fontWeight: '600',
        marginBottom: '2rem',
        color: 'black'
      }}>
        Mana Curve
      </h2>
      
      {/* Summary */}
      <div style={{
        display: 'flex',
        gap: '2rem',
        marginBottom: '2rem',
        padding: '1rem',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px'
      }}>
        <div>
          <div style={{ fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)', marginBottom: '0.25rem' }}>
            Non-Land Cards
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
            {totalNonLand}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)', marginBottom: '0.25rem' }}>
            Lands
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
            {landsCount}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)', marginBottom: '0.25rem' }}>
            Average CMC
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f97316' }}>
            {totalNonLand > 0 ? (
              Object.entries(cmcDistribution).reduce((sum, [cmc, count]) => sum + (Number(cmc) * count), 0) / totalNonLand
            ).toFixed(2) : 'N/A'}
          </div>
        </div>
      </div>
      
      {/* Bar Chart */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '0.75rem',
        height: '300px',
        padding: '1rem',
        borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
        borderLeft: '2px solid rgba(255, 255, 255, 0.2)'
      }}>
        {displayCMC.map(({ cmc, count }) => {
          const heightPercent = (count / maxCount) * 100
          return (
            <div
              key={cmc}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {/* Count label */}
              <div style={{
                fontSize: '0.875rem',
                fontWeight: 'bold',
                color: count > 0 ? 'black' : 'rgba(0, 0, 0, 0.3)',
                minHeight: '1.25rem'
              }}>
                {count > 0 ? count : ''}
              </div>
              
              {/* Bar */}
              <div
                style={{
                  width: '100%',
                  height: `${heightPercent}%`,
                  backgroundColor: count > 0 ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px 4px 0 0',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  cursor: 'default'
                }}
                title={`${count} cards with CMC ${cmc}${cmc >= 7 ? '+' : ''}`}
              >
                {count > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '-2px',
                    left: 0,
                    right: 0,
                    height: '2px',
                    backgroundColor: '#60a5fa'
                  }} />
                )}
              </div>
              
              {/* CMC label */}
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: 'rgba(0, 0, 0, 0.7)',
                marginTop: '0.5rem'
              }}>
                {cmc >= 7 ? '7+' : cmc}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Card List by CMC */}
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{
          fontSize: '1rem',
          fontWeight: '600',
          marginBottom: '1rem',
          color: 'black'
        }}>
          Cards by Mana Cost
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '1rem'
        }}>
          {displayCMC.filter(({ count }) => count > 0).map(({ cmc, count }) => {
            const cardsAtCMC = mainDeckCards.filter(card => {
              const type = card.type_line?.toLowerCase() || ''
              if (type.includes('land')) return false
              
              if (!card.mana_cost) return cmc === 0
              
              const matches = card.mana_cost.match(/\d+|[WUBRG]/g) || []
              const cardCMC = matches.reduce((acc, match) => {
                return acc + (isNaN(Number(match)) ? 1 : Number(match))
              }, 0)
              
              return cmc >= 7 ? cardCMC >= 7 : cardCMC === cmc
            })
            
            return (
              <div
                key={cmc}
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#3b82f6'
                }}>
                  CMC {cmc >= 7 ? '7+' : cmc} ({count} cards)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.7)' }}>
                  {cardsAtCMC.map(card => (
                    <div key={card.id} style={{ marginBottom: '0.25rem' }}>
                      {card.quantity}x {card.name}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
