'use client'

import { Deck } from '../types'

interface ManaCurveProps {
  deck: Deck
}

export default function ManaCurve({ deck }: ManaCurveProps) {
  const mainDeckCards = deck.cards.filter(c => !c.is_sideboard)
  
  // Calculate CMC for each card
  const cmcDistribution: Record<number, number> = {}
  // Calculate CMC and color distribution for stacked bar chart
  const cmcColorDistribution: Record<number, Record<string, number>> = {}
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
      
      // Track color distribution
      if (!cmcColorDistribution[0]) cmcColorDistribution[0] = {}
      const colors = card.colors ? card.colors.split(',') : ['C']
      colors.forEach(color => {
        cmcColorDistribution[0][color] = (cmcColorDistribution[0][color] || 0) + card.quantity
      })
      return
    }
    
    // Parse mana cost to get CMC
    const matches = card.mana_cost.match(/\d+|[WUBRG]/g) || []
    const cmc = matches.reduce((acc, match) => {
      return acc + (isNaN(Number(match)) ? 1 : Number(match))
    }, 0)
    
    cmcDistribution[cmc] = (cmcDistribution[cmc] || 0) + card.quantity
    
    // Track color distribution for each CMC
    if (!cmcColorDistribution[cmc]) cmcColorDistribution[cmc] = {}
    const colors = card.colors ? card.colors.split(',') : ['C']
    colors.forEach(color => {
      cmcColorDistribution[cmc][color] = (cmcColorDistribution[cmc][color] || 0) + card.quantity
    })
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
      
      {/* Stacked Color Bar Graph */}
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{
          fontSize: '1rem',
          fontWeight: '600',
          marginBottom: '1.5rem',
          color: 'black'
        }}>
          Color Distribution by Mana Cost
        </h3>
        
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: '0.4rem',
          height: '280px',
          padding: '1rem 2rem',
          borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
          borderLeft: '2px solid rgba(255, 255, 255, 0.2)'
        }}>
          {Array.from({ length: 16 }, (_, i) => i).map(cmc => {
            const colorCounts = cmcColorDistribution[cmc] || {}
            const totalAtCMC = Object.values(colorCounts).reduce((sum, count) => sum + count, 0)
            const maxCountOverall = Math.max(...Object.values(cmcDistribution), 1)
            // Improve scaling: use logarithmic scale for better visualization
            const heightPercent = totalAtCMC > 0 ? Math.max((totalAtCMC / maxCountOverall) * 100, 5) : 0
            
            const colorHexMap: Record<string, string> = {
              W: '#F0E68C',
              U: '#0E68AB',
              B: '#150B00',
              R: '#D3202A',
              G: '#00733E',
              C: '#BEB9B2'
            }
            
            const colorOrder = ['W', 'U', 'B', 'R', 'G', 'C']
            const sortedColors = colorOrder.filter(color => (colorCounts[color] || 0) > 0)
            
            return (
              <div
                key={cmc}
                style={{
                  width: '40px',
                  maxWidth: '40px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {/* Count label */}
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  color: totalAtCMC > 0 ? 'black' : 'rgba(0, 0, 0, 0.3)',
                  minHeight: '1rem'
                }}>
                  {totalAtCMC > 0 ? totalAtCMC : ''}
                </div>
                
                {/* Stacked Bar */}
                <div
                  style={{
                    width: '100%',
                    height: `${heightPercent}%`,
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    borderRadius: '4px 4px 0 0',
                    overflow: 'hidden',
                    backgroundColor: totalAtCMC === 0 ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
                  }}
                  title={`CMC ${cmc}: ${totalAtCMC} cards`}
                >
                  {sortedColors.map((color) => {
                    const count = colorCounts[color] || 0
                    const colorPercent = (count / totalAtCMC) * 100
                    
                    return (
                      <div
                        key={color}
                        style={{
                          height: `${colorPercent}%`,
                          backgroundColor: colorHexMap[color],
                          borderTop: '1px solid rgba(255, 255, 255, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.6rem',
                          color: color === 'B' ? 'white' : 'rgba(0, 0, 0, 0.7)',
                          fontWeight: 'bold'
                        }}
                        title={`${color}: ${count} cards`}
                      >
                        {count > 0 && colorPercent > 15 ? count : ''}
                      </div>
                    )
                  })}
                </div>
                
                {/* CMC label */}
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: 'rgba(0, 0, 0, 0.7)',
                  marginTop: '0.5rem'
                }}>
                  {cmc}
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Color Legend */}
        <div style={{ 
          marginTop: '1rem', 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {[
            { code: 'W', name: 'White', hex: '#F0E68C' },
            { code: 'U', name: 'Blue', hex: '#0E68AB' },
            { code: 'B', name: 'Black', hex: '#150B00' },
            { code: 'R', name: 'Red', hex: '#D3202A' },
            { code: 'G', name: 'Green', hex: '#00733E' },
            { code: 'C', name: 'Colorless', hex: '#BEB9B2' }
          ].map(({ code, name, hex }) => (
            <div key={code} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: hex,
                borderRadius: '3px',
                border: '1px solid rgba(0, 0, 0, 0.2)'
              }} />
              <span style={{ fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.7)' }}>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
