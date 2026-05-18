'use client'

import { DeckCard } from '../types'

interface CardListItemProps {
  card: DeckCard
  hoveredCard: DeckCard | null
  setHoveredCard: (card: DeckCard | null) => void
  multiSelectMode: boolean
  selectedDeckCards: Set<number>
  toggleDeckCardSelection: (cardId: number) => void
  cardMenuOpen: number | null
  setCardMenuOpen: (cardId: number | null) => void
  onRemove: (cardId: number) => void
  allTags: string[]
  deckFormat: string | undefined
  onAddToTag: (cardId: number, tag: string) => void
  onPromoteCommander: (cardId: number) => void
}

export default function CardListItem({
  card,
  hoveredCard,
  setHoveredCard,
  multiSelectMode,
  selectedDeckCards,
  toggleDeckCardSelection,
  cardMenuOpen,
  setCardMenuOpen,
  onRemove,
  allTags,
  deckFormat,
  onAddToTag,
  onPromoteCommander
}: CardListItemProps) {
  const isCommanderFormat = deckFormat?.toLowerCase() === 'commander' || deckFormat?.toLowerCase() === 'brawl'
  
  return (
    <div
      onMouseEnter={() => setHoveredCard(card)}
      onMouseLeave={() => setHoveredCard(null)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.15rem 0.5rem',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        backgroundColor: hoveredCard?.id === card.id ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
        minHeight: '28px',
        position: 'relative'
      }}
    >
      {multiSelectMode && (
        <input
          type="checkbox"
          checked={selectedDeckCards.has(card.id)}
          onChange={(e) => {
            e.stopPropagation()
            toggleDeckCardSelection(card.id)
          }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '16px',
            height: '16px',
            cursor: 'pointer',
            flexShrink: 0
          }}
        />
      )}
      <span style={{ 
        fontSize: '0.875rem',
        color: 'rgba(0, 0, 0, 0.6)',
        width: '1.25rem',
        textAlign: 'right',
        flexShrink: 0
      }}>
        {card.quantity}
      </span>
      <span style={{ 
        fontSize: '0.9375rem',
        color: 'rgba(0, 0, 0, 0.9)',
        textDecorationLine: hoveredCard?.id === card.id ? 'underline' : 'none',
        textDecorationThickness: '1px',
        textUnderlineOffset: '2px',
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        lineHeight: '1.2'
      }}>
        {card.name}
      </span>
      {card.is_commander && (
        <span style={{
          fontSize: '0.75rem',
          padding: '0.125rem 0.5rem',
          backgroundColor: 'rgba(249, 115, 22, 0.2)',
          color: '#f97316',
          borderRadius: '4px',
          fontWeight: '600',
          flexShrink: 0,
          lineHeight: '1'
        }}>
          ★
        </span>
      )}
      
      {/* Card menu button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setCardMenuOpen(cardMenuOpen === card.id ? null : card.id)
        }}
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          border: '1px solid rgba(0, 0, 0, 0.2)',
          backgroundColor: cardMenuOpen === card.id ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          padding: 0,
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)'}
        onMouseLeave={(e) => {
          if (cardMenuOpen !== card.id) {
            e.currentTarget.style.backgroundColor = 'transparent'
          }
        }}
      >
        <span style={{ fontSize: '0.75rem', lineHeight: '1', color: 'rgba(0, 0, 0, 0.6)' }}>⋯</span>
      </button>

      {/* Dropdown menu */}
      {cardMenuOpen === card.id && (
        <>
          {/* Backdrop to close menu */}
          <div
            onClick={(e) => {
              e.stopPropagation()
              setCardMenuOpen(null)
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: '0.5rem',
              top: '100%',
              marginTop: '0.25rem',
              backgroundColor: 'white',
              border: '1px solid rgba(0, 0, 0, 0.15)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              zIndex: 1000,
              minWidth: '180px',
              overflow: 'hidden',
              maxHeight: '400px',
              overflowY: 'auto'
            }}
          >
            {/* Promote as Commander option - only for commander formats */}
            {isCommanderFormat && !card.is_commander && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onPromoteCommander(card.id)
                  setCardMenuOpen(null)
                }}
                style={{
                  width: '100%',
                  padding: '0.625rem 1rem',
                  border: 'none',
                  backgroundColor: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: 'rgba(0, 0, 0, 0.9)',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(249, 115, 22, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                ★ Promote as Commander
              </button>
            )}
            
            {/* Tag options */}
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={(e) => {
                  e.stopPropagation()
                  onAddToTag(card.id, tag)
                  setCardMenuOpen(null)
                }}
                style={{
                  width: '100%',
                  padding: '0.625rem 1rem',
                  border: 'none',
                  backgroundColor: card.tags === tag ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: card.tags === tag ? '#3b82f6' : 'rgba(0, 0, 0, 0.9)',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                  fontWeight: card.tags === tag ? '600' : '400'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'}
                onMouseLeave={(e) => {
                  if (card.tags === tag) {
                    e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'
                  } else {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                Add to '{tag}'
              </button>
            ))}
            
            {/* Remove from Deck option */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(`Remove ${card.name} from deck?`)) {
                  onRemove(card.id)
                }
              }}
              style={{
                width: '100%',
                padding: '0.625rem 1rem',
                border: 'none',
                backgroundColor: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: '#ef4444',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Remove from Deck
            </button>
          </div>
        </>
      )}
    </div>
  )
}
