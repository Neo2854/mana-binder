'use client'

import { useRef } from 'react'
import { CollectionCard, DeckCard } from '../types'

interface StandardCollectionViewProps {
  collection: CollectionCard[]
  totalCards: number
  getAvailableQuantity: (card: CollectionCard) => number
  quickAddCardToDeck: (card: CollectionCard) => Promise<void>
  setHoveredCard: (card: DeckCard | null) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  typeFilter: string
  setTypeFilter: (filter: string) => void
  colorFilters: Set<string>
  toggleColorFilter: (color: string) => void
  clearAllFilters: () => void
}

export default function StandardCollectionView({
  collection,
  totalCards,
  getAvailableQuantity,
  quickAddCardToDeck,
  setHoveredCard,
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  colorFilters,
  toggleColorFilter,
  clearAllFilters
}: StandardCollectionViewProps) {
  const collectionScrollRef = useRef<HTMLDivElement>(null)

  const scrollCollection = (direction: 'left' | 'right') => {
    if (collectionScrollRef.current) {
      const scrollAmount = 800 // Scroll by approximately 4-5 cards
      const newPosition = direction === 'left' 
        ? collectionScrollRef.current.scrollLeft - scrollAmount
        : collectionScrollRef.current.scrollLeft + scrollAmount
      
      collectionScrollRef.current.scrollTo({
        left: newPosition,
        behavior: 'smooth'
      })
    }
  }

  return (
    <>
      {/* Horizontal Scrollable Collection */}
      <div style={{ 
        marginBottom: '2rem',
        position: 'relative'
      }}>
        {/* Collection Header with Inline Filters */}
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          gap: '1rem'
        }}>
          <h3 style={{ 
            fontSize: '1.125rem', 
            fontWeight: '600', 
            color: '#000000',
            margin: 0,
            flexShrink: 0
          }}>
            Collection
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            {/* Color Filters */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                className={`color-filter-btn ${colorFilters.has('W') ? 'active' : ''}`}
                onClick={() => toggleColorFilter('W')}
                title="White"
                style={{ 
                  backgroundColor: '#f9fafb',
                  border: colorFilters.has('W') ? '2px solid #1f2937' : '2px solid #d1d5db',
                  color: '#1f2937',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: colorFilters.has('W') ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>W</span>
              </button>
              <button
                className={`color-filter-btn ${colorFilters.has('U') ? 'active' : ''}`}
                onClick={() => toggleColorFilter('U')}
                title="Blue"
                style={{ 
                  backgroundColor: '#3b82f6',
                  border: colorFilters.has('U') ? '2px solid #1e40af' : '2px solid #60a5fa',
                  color: 'white',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: colorFilters.has('U') ? 1 : 0.6,
                  boxShadow: colorFilters.has('U') ? '0 2px 8px rgba(59,130,246,0.4)' : 'none'
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>U</span>
              </button>
              <button
                className={`color-filter-btn ${colorFilters.has('B') ? 'active' : ''}`}
                onClick={() => toggleColorFilter('B')}
                title="Black"
                style={{ 
                  backgroundColor: '#1f2937',
                  border: colorFilters.has('B') ? '2px solid #6b7280' : '2px solid #374151',
                  color: 'white',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: colorFilters.has('B') ? 1 : 0.6,
                  boxShadow: colorFilters.has('B') ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>B</span>
              </button>
              <button
                className={`color-filter-btn ${colorFilters.has('R') ? 'active' : ''}`}
                onClick={() => toggleColorFilter('R')}
                title="Red"
                style={{ 
                  backgroundColor: '#ef4444',
                  border: colorFilters.has('R') ? '2px solid #b91c1c' : '2px solid #f87171',
                  color: 'white',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: colorFilters.has('R') ? 1 : 0.6,
                  boxShadow: colorFilters.has('R') ? '0 2px 8px rgba(239,68,68,0.4)' : 'none'
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>R</span>
              </button>
              <button
                className={`color-filter-btn ${colorFilters.has('G') ? 'active' : ''}`}
                onClick={() => toggleColorFilter('G')}
                title="Green"
                style={{ 
                  backgroundColor: '#10b981',
                  border: colorFilters.has('G') ? '2px solid #047857' : '2px solid #34d399',
                  color: 'white',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: colorFilters.has('G') ? 1 : 0.6,
                  boxShadow: colorFilters.has('G') ? '0 2px 8px rgba(16,185,129,0.4)' : 'none'
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>G</span>
              </button>
            </div>
            
            <div style={{ width: '1px', height: '24px', backgroundColor: '#e5e7eb' }}></div>
            
            {/* Type Filter */}
            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)}
              className="filter-select"
              style={{ 
                fontSize: '0.875rem', 
                padding: '0.5rem 2rem 0.5rem 0.75rem', 
                height: '36px', 
                minWidth: '140px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <option value="all">All Types</option>
              <option value="creature">Creatures</option>
              <option value="instant">Instants</option>
              <option value="sorcery">Sorceries</option>
              <option value="artifact">Artifacts</option>
              <option value="enchantment">Enchantments</option>
              <option value="planeswalker">Planeswalkers</option>
              <option value="land">Lands</option>
            </select>
            
            {/* Search */}
            <div className="collection-search-bar" style={{ 
              width: '280px', 
              minWidth: '280px', 
              maxWidth: '280px', 
              margin: 0, 
              padding: '0 0.75rem', 
              height: '36px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#9ca3af', flexShrink: 0 }}>
                <path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" fill="currentColor"/>
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cards..."
                style={{ 
                  fontSize: '0.875rem', 
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  flex: 1,
                  padding: 0
                }}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  style={{ 
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9ca3af',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                    flexShrink: 0
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
                  </svg>
                </button>
              )}
            </div>
            
            {/* Clear Filters Button - Always visible but disabled when no filters */}
            <button 
              onClick={clearAllFilters} 
              disabled={typeFilter === 'all' && colorFilters.size === 0 && searchQuery === ''}
              style={{ 
                fontSize: '0.875rem', 
                padding: '0.5rem 1rem', 
                height: '36px', 
                whiteSpace: 'nowrap',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: 'white',
                color: '#6b7280',
                cursor: (typeFilter === 'all' && colorFilters.size === 0 && searchQuery === '') ? 'not-allowed' : 'pointer',
                opacity: (typeFilter === 'all' && colorFilters.size === 0 && searchQuery === '') ? 0.5 : 1,
                transition: 'all 0.2s',
                fontWeight: '500'
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>
        
        <div style={{ position: 'relative' }}>
          {/* Left Arrow */}
          <button
            onClick={() => scrollCollection('left')}
            style={{
              position: 'absolute',
              left: '-20px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.9)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="currentColor"/>
            </svg>
          </button>

          {/* Collection Cards Horizontal Scroll */}
          <div 
            ref={collectionScrollRef}
            style={{
              display: 'flex',
              gap: '1rem',
              overflowX: 'auto',
              overflowY: 'hidden',
              padding: '1rem 0',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
            className="hide-scrollbar"
          >
            {collection.filter(card => getAvailableQuantity(card) > 0).map(card => (
              <div
                key={card.id}
                onClick={() => quickAddCardToDeck(card)}
                style={{
                  flex: '0 0 150px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'transform 0.2s',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)'
                  // Set hovered card for preview
                  setHoveredCard({
                    id: card.id,
                    scryfall_id: card.scryfall_id,
                    name: card.name,
                    quantity: getAvailableQuantity(card),
                    is_commander: false,
                    is_sideboard: false,
                    mana_cost: card.mana_cost,
                    type_line: card.type_line,
                    image_uri: card.image_uri,
                    colors: card.colors,
                    tags: undefined
                  })
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  setHoveredCard(null)
                }}
              >
                <img
                  src={card.image_uri || `https://api.scryfall.com/cards/${card.scryfall_id}?format=image&version=normal`}
                  alt={card.name}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                  }}
                />
                {/* Available quantity badge */}
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  backgroundColor: 'rgba(249, 115, 22, 0.95)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                }}>
                  {getAvailableQuantity(card)}x
                </div>
              </div>
            ))}
          </div>

          {/* Right Arrow */}
          <button
            onClick={() => scrollCollection('right')}
            style={{
              position: 'absolute',
              right: '-20px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.9)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 6L8.59 7.41L13.17 12L8.59 16.59L10 18L16 12L10 6Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Deck Section Title */}
      <h3 style={{ 
        fontSize: '1.125rem', 
        fontWeight: '600', 
        marginBottom: '1rem',
        color: '#000000'
      }}>
        Deck ({totalCards} cards)
      </h3>
    </>
  )
}
