interface BasicLandType {
  name: string
  color: string
  icon: string
}

const BASIC_LANDS: BasicLandType[] = [
  { name: 'Plains', color: '#F0E8D8', icon: '' },
  { name: 'Island', color: '#AAE0FA', icon: '' },
  { name: 'Swamp', color: '#CBC2BF', icon: '' },
  { name: 'Mountain', color: '#F4B5A0', icon: '' },
  { name: 'Forest', color: '#9BD3AE', icon: '' },
]

interface BasicLandsSectionProps {
  basicLands: Record<string, number>
  onUpdateBasicLandCount: (landName: string, newCount: number) => void
}

export default function BasicLandsSection({ basicLands, onUpdateBasicLandCount }: BasicLandsSectionProps) {
  const getBasicLandCount = (landName: string): number => {
    return basicLands[landName] || 0
  }

  const handleIncrement = (landName: string) => {
    const currentCount = getBasicLandCount(landName)
    onUpdateBasicLandCount(landName, currentCount + 1)
  }

  const handleDecrement = (landName: string) => {
    const currentCount = getBasicLandCount(landName)
    onUpdateBasicLandCount(landName, currentCount - 1)
  }

  return (
    <div style={{
      marginBottom: '1.5rem',
      padding: '0.75rem',
      backgroundColor: 'rgba(0, 0, 0, 0.02)',
      borderRadius: '8px',
      border: '1px solid rgba(0, 0, 0, 0.1)'
    }}>
      <h3 style={{
        margin: '0 0 0.5rem 0',
        fontSize: '0.875rem',
        fontWeight: '600',
        color: 'rgba(0, 0, 0, 0.7)'
      }}>
        Basic Lands
      </h3>
      
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap'
      }}>
        {BASIC_LANDS.map((land) => {
          const count = getBasicLandCount(land.name)
          
          return (
            <div
              key={land.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.375rem 0.5rem',
                backgroundColor: land.color,
                borderRadius: '6px',
                border: '1px solid rgba(0, 0, 0, 0.15)'
              }}
            >
              <div style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                color: 'rgba(0, 0, 0, 0.8)',
                minWidth: '50px'
              }}>
                {land.name}
              </div>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                color: 'rgba(0, 0, 0, 0.7)',
                minWidth: '20px',
                textAlign: 'center'
              }}>
                {count}
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  onClick={() => handleDecrement(land.name)}
                  disabled={count === 0}
                  style={{
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: count === 0 ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.1)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: count === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    color: count === 0 ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.7)',
                    transition: 'all 0.2s',
                    opacity: count === 0 ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (count > 0) {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.15)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (count > 0) {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)'
                    }
                  }}
                >
                  −
                </button>
                <button
                  onClick={() => handleIncrement(land.name)}
                  style={{
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    color: 'rgba(0, 0, 0, 0.7)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)'
                  }}
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
