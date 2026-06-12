'use client'

interface ManaCostProps {
  manaCost?: string
}

export default function ManaCost({ manaCost }: ManaCostProps) {
  if (!manaCost) return null

  // Handle split cards with " // " separator (e.g., "{1}{R} // {2}{G}")
  const splitCosts = manaCost.split(' // ')

  // Parse mana cost string like "{2}{U}{U}" into array of symbols
  const parseManaCost = (cost: string): string[] => {
    const symbols = cost.match(/\{[^}]+\}/g) || []
    return symbols.map(s => s.replace(/[{}]/g, ''))
  }

  // Map symbol to mana font class
  const getSymbolClass = (symbol: string): string => {
    const s = symbol.toLowerCase()
    
    // Basic mana colors
    if (s === 'w') return 'ms ms-w ms-cost'
    if (s === 'u') return 'ms ms-u ms-cost'
    if (s === 'b') return 'ms ms-b ms-cost'
    if (s === 'r') return 'ms ms-r ms-cost'
    if (s === 'g') return 'ms ms-g ms-cost'
    if (s === 'c') return 'ms ms-c ms-cost'
    
    // Generic/colorless mana (numbers)
    if (/^\d+$/.test(s)) return `ms ms-${s} ms-cost`
    
    // X cost
    if (s === 'x') return 'ms ms-x ms-cost'
    
    // Hybrid mana (e.g., W/U, 2/W)
    if (s.includes('/')) {
      const parts = s.split('/')
      return `ms ms-${parts[0]}${parts[1]} ms-cost`
    }
    
    // Phyrexian mana (e.g., W/P, U/P)
    if (s.includes('p')) {
      const color = s.replace(/p/g, '')
      return `ms ms-${color}p ms-cost`
    }
    
    // Snow mana
    if (s === 's') return 'ms ms-s ms-cost'
    
    // Default fallback
    return `ms ms-${s} ms-cost`
  }

  return (
    <span 
      style={{ 
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        flexShrink: 0,
        marginRight: '4px'
      }}
      title={manaCost}
    >
      {splitCosts.map((cost, costIndex) => {
        const symbols = parseManaCost(cost)
        return (
          <span 
            key={costIndex}
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px'
            }}
          >
            {symbols.map((symbol, symbolIndex) => (
              <i
                key={symbolIndex}
                className={getSymbolClass(symbol)}
                style={{
                  fontSize: '0.9rem',
                  lineHeight: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  filter: 'drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.3))'
                }}
              />
            ))}
            {costIndex < splitCosts.length - 1 && (
              <span 
                style={{ 
                  margin: '0 3px',
                  color: 'rgba(0, 0, 0, 0.5)',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}
              >
                /
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}
