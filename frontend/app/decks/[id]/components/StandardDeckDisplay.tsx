'use client'

import { DeckCard, Deck } from '../types'
import CardListItem from './CardListItem'
import { categorizeCardsByTags, categorizeCardsByType, getCategoryCount } from '../utils'

interface StandardDeckDisplayProps {
  deck: Deck
  hoveredCard: DeckCard | null
  commander: DeckCard | undefined
  setHoveredCard: (card: DeckCard | null) => void
  multiSelectMode: boolean
  selectedDeckCards: Set<number>
  toggleDeckCardSelection: (cardId: number) => void
  cardMenuOpen: number | null
  setCardMenuOpen: (cardId: number | null) => void
  removeSingleCardFromDeck: (cardId: number) => Promise<void>
  removeCardCopyFromDeck: (cardId: number) => void
  addCardToTag: (cardId: number, tag: string) => void
  promoteCardAsCommander: (cardId: number) => Promise<void>
  onAddToSideboard?: (cardId: number) => void
  onAddAllToSideboard?: (cardId: number) => void
  allTags: string[]
  tagsViewMode: boolean
}

export default function StandardDeckDisplay({
  deck,
  hoveredCard,
  commander,
  setHoveredCard,
  multiSelectMode,
  selectedDeckCards,
  toggleDeckCardSelection,
  cardMenuOpen,
  setCardMenuOpen,
  removeSingleCardFromDeck,
  removeCardCopyFromDeck,
  addCardToTag,
  promoteCardAsCommander,
  onAddToSideboard,
  onAddAllToSideboard,
  allTags,
  tagsViewMode
}: StandardDeckDisplayProps) {
  const categorizeCards = () => {
    return tagsViewMode ? categorizeCardsByTags(deck) : categorizeCardsByType(deck)
  }
  return (
    <div style={{ display: 'flex', gap: '2rem' }}>
      {/* Left side - Card Preview */}
      <div style={{ 
        flex: '0 0 300px',
        position: 'sticky',
        top: '2rem',
        alignSelf: 'flex-start',
        minHeight: '500px'
      }}>
        {(hoveredCard || commander) && (
          <div>
            <div style={{
              width: '100%',
              aspectRatio: '5/7',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
              backgroundColor: 'rgba(0, 0, 0, 0.05)'
            }}>
              <img 
                src={(hoveredCard || commander)!.image_uri || `https://api.scryfall.com/cards/${(hoveredCard || commander)!.scryfall_id}?format=image&version=normal`}
                alt={(hoveredCard || commander)!.name}
                style={{ 
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
            <div style={{ 
              marginTop: '1rem',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.9)',
              minHeight: '60px'
            }}>
              <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                {(hoveredCard || commander)!.name}
              </div>
              {(hoveredCard || commander)!.mana_cost && (
                <div style={{ 
                  fontSize: '0.875rem',
                  marginTop: '0.25rem',
                  color: 'rgba(255, 255, 255, 0.7)'
                }}>
                  {(hoveredCard || commander)!.mana_cost}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right side - Card List */}
      <div style={{ 
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        {deck.cards.length > 0 ? (
          Object.entries(categorizeCards()).map(([category, cards]) => {
            if (cards.length === 0) return null
            const totalCount = getCategoryCount(cards)
            
            return (
              <div key={category} style={{ marginBottom: '1rem' }}>
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  paddingBottom: '0.5rem',
                  borderBottom: '2px solid rgba(0, 0, 0, 0.1)'
                }}>
                  <h3 style={{ 
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: 'rgba(0, 0, 0, 0.9)'
                  }}>
                    {category}
                  </h3>
                  <span style={{ 
                    fontSize: '0.875rem',
                    color: 'rgba(0, 0, 0, 0.5)',
                    fontWeight: '500'
                  }}>
                    ({totalCount})
                  </span>
                </div>
                
                <div style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0rem'
                }}>
                  {cards.map(card => (
                    <CardListItem
                      key={card.id}
                      card={card}
                      hoveredCard={hoveredCard}
                      setHoveredCard={setHoveredCard}
                      multiSelectMode={multiSelectMode}
                      selectedDeckCards={selectedDeckCards}
                      toggleDeckCardSelection={toggleDeckCardSelection}
                      cardMenuOpen={cardMenuOpen}
                      setCardMenuOpen={setCardMenuOpen}
                      onRemove={removeSingleCardFromDeck}
                      onRemoveCopy={removeCardCopyFromDeck}
                      allTags={allTags}
                      deckFormat={deck?.format}
                      onAddToTag={addCardToTag}
                      onPromoteCommander={promoteCardAsCommander}
                      onAddToSideboard={onAddToSideboard}
                      onAddAllToSideboard={onAddAllToSideboard}
                    />
                  ))}
                </div>
              </div>
            )
          })
        ) : (
          <div style={{ 
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '3rem',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px'
          }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto 1rem', opacity: 0.3 }}>
              <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z" fill="currentColor"/>
            </svg>
            <h3 style={{ marginBottom: '0.5rem' }}>No Cards Yet</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Click on cards above to add them to your deck
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
