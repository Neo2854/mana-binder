'use client'

import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface CardFace {
  name: string
  mana_cost?: string
  type_line: string
  oracle_text?: string
  colors?: string[]
  image_uris?: {
    small: string
    normal: string
    large: string
  }
}

interface ScryfallCard {
  id: string
  name: string
  set: string
  set_name: string
  collector_number: string
  rarity: string
  mana_cost?: string
  cmc: number
  type_line: string
  oracle_text?: string
  colors?: string[]
  color_identity?: string[]
  image_uris?: {
    small: string
    normal: string
    large: string
  }
  card_faces?: CardFace[]
  prices?: {
    usd?: string
  }
}

interface Folder {
  id: number
  name: string
  description?: string
  color: string
  created_at: string
  card_count: number
}

interface CollectionCard {
  id: number
  scryfall_id: string
  quantity: number
  folder_id?: number
}

interface ScryfallSet {
  code: string
  name: string
  released_at: string
  icon_svg_uri: string
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ScryfallCard[]>([])
  const [loading, setLoading] = useState(false)
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [totalCards, setTotalCards] = useState(0)
  const [collectionMap, setCollectionMap] = useState<Map<string, CollectionCard>>(new Map())
  const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null)
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0)
  const [updatingCards, setUpdatingCards] = useState<Set<string>>(new Set())
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())
  const [sets, setSets] = useState<ScryfallSet[]>([])
  const [selectedSet, setSelectedSet] = useState<string>('')
  const [loadingSets, setLoadingSets] = useState(false)
  const [setFilterSearch, setSetFilterSearch] = useState('')
  const [isSetDropdownOpen, setIsSetDropdownOpen] = useState(false)

  useEffect(() => {
    fetchFolders()
    fetchCollection()
    fetchSets()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (isSetDropdownOpen && !target.closest('.custom-dropdown')) {
        setIsSetDropdownOpen(false)
        setSetFilterSearch('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSetDropdownOpen])

  // Reset face index when selected card changes
  useEffect(() => {
    setCurrentFaceIndex(0)
  }, [selectedCard])

  const fetchFolders = async () => {
    try {
      const response = await fetch(`${API_URL}/api/collection/folders`)
      const data = await response.json()
      setFolders(data)
    } catch (error) {
      console.error('Error fetching folders:', error)
    }
  }

  const fetchCollection = async () => {
    try {
      const response = await fetch(`${API_URL}/api/collection/`)
      const data = await response.json()
      if (Array.isArray(data)) {
        const map = new Map<string, CollectionCard>()
        data.forEach((card: CollectionCard) => {
          map.set(card.scryfall_id, card)
        })
        setCollectionMap(map)
      }
    } catch (error) {
      console.error('Error fetching collection:', error)
    }
  }

  const fetchSets = async () => {
    setLoadingSets(true)
    try {
      const response = await fetch('https://api.scryfall.com/sets')
      const data = await response.json()
      if (data.object === 'list') {
        // Sort sets by release date (newest first)
        const sortedSets = (data.data || []).sort((a: ScryfallSet, b: ScryfallSet) => {
          return new Date(b.released_at).getTime() - new Date(a.released_at).getTime()
        })
        setSets(sortedSets)
      }
    } catch (error) {
      console.error('Error fetching sets:', error)
    }
    setLoadingSets(false)
  }

  const searchScryfall = async () => {
    if (!searchQuery.trim() && selectedTypes.size === 0 && !selectedSet) return
    
    setLoading(true)
    try {
      // Build query with card type filters and set filter
      let query = searchQuery.trim()
      if (selectedTypes.size > 0) {
        const typeQuery = Array.from(selectedTypes).map(t => `t:${t}`).join(' OR ')
        query = query ? `(${query}) (${typeQuery})` : typeQuery
      }
      if (selectedSet) {
        query = query ? `(${query}) set:${selectedSet}` : `set:${selectedSet}`
      }
      
      const response = await fetch(
        `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=art&order=name`
      )
      const data = await response.json()
      
      if (data.object === 'list') {
        setSearchResults(data.data || [])
        setHasMore(data.has_more || false)
        setTotalCards(data.total_cards || 0)
      } else {
        setSearchResults([])
        setHasMore(false)
        setTotalCards(0)
      }
    } catch (error) {
      console.error('Error searching Scryfall:', error)
      setSearchResults([])
      setHasMore(false)
      setTotalCards(0)
    }
    setLoading(false)
  }

  const updateCardQuantity = async (card: ScryfallCard, newQuantity: number) => {
    // Prevent concurrent updates to the same card
    if (updatingCards.has(card.id)) {
      return
    }
    
    const newUpdating = new Set(updatingCards)
    newUpdating.add(card.id)
    setUpdatingCards(newUpdating)
    
    const existingCard = collectionMap.get(card.id)
    
    if (newQuantity === 0 && existingCard) {
      // Remove from collection
      try {
        const response = await fetch(`${API_URL}/api/collection/${existingCard.id}`, {
          method: 'DELETE'
        })
        if (response.ok) {
          const newMap = new Map(collectionMap)
          newMap.delete(card.id)
          setCollectionMap(newMap)
          fetchFolders()
        }
      } catch (error) {
        console.error('Error removing card:', error)
      } finally {
        const newUpdating = new Set(updatingCards)
        newUpdating.delete(card.id)
        setUpdatingCards(newUpdating)
      }
    } else if (existingCard) {
      // Update existing card quantity
      try {
        const response = await fetch(
          `${API_URL}/api/collection/${existingCard.id}/quantity?quantity=${newQuantity}`,
          { method: 'PATCH' }
        )
        if (response.ok) {
          const newMap = new Map(collectionMap)
          newMap.set(card.id, { ...existingCard, quantity: newQuantity })
          setCollectionMap(newMap)
          fetchFolders()
        }
      } catch (error) {
        console.error('Error updating quantity:', error)
      } finally {
        const newUpdating = new Set(updatingCards)
        newUpdating.delete(card.id)
        setUpdatingCards(newUpdating)
      }
    } else {
      // Add new card to collection
      try {
        const response = await fetch(`${API_URL}/api/collection/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scryfall_id: card.id,
            name: card.name,
            folder_id: selectedFolder,
            set_code: card.set,
            set_name: card.set_name,
            collector_number: card.collector_number,
            rarity: card.rarity,
            mana_cost: card.mana_cost,
            cmc: card.cmc,
            type_line: card.type_line,
            oracle_text: card.oracle_text,
            colors: card.colors ? JSON.stringify(card.colors) : null,
            image_uri: getCardImage(card, 'normal', 0),
            price: card.prices?.usd || null,
            quantity: newQuantity
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          const newMap = new Map(collectionMap)
          newMap.set(card.id, {
            id: data.id,
            scryfall_id: card.id,
            quantity: newQuantity,
            folder_id: selectedFolder ?? undefined
          })
          setCollectionMap(newMap)
          fetchFolders()
        }
      } catch (error) {
        console.error('Error adding card:', error)
      } finally {
        const newUpdating = new Set(updatingCards)
        newUpdating.delete(card.id)
        setUpdatingCards(newUpdating)
      }
    }
  }

  const addOneToCollection = async (card: ScryfallCard) => {
    const currentQuantity = getCardQuantity(card.id)
    await updateCardQuantity(card, currentQuantity + 1)
  }

  const getCardQuantity = (scryfallId: string): number => {
    return collectionMap.get(scryfallId)?.quantity || 0
  }

  // Helper functions for double-sided cards
  const getCardImage = (card: ScryfallCard, size: 'small' | 'normal' | 'large' = 'normal', faceIndex: number = 0) => {
    // If card has image_uris, it's a single-faced card
    if (card.image_uris) {
      return card.image_uris[size]
    }
    // If card has card_faces, it's a double-sided card
    if (card.card_faces && card.card_faces[faceIndex]?.image_uris) {
      return card.card_faces[faceIndex].image_uris[size]
    }
    return undefined
  }

  const isDoubleSided = (card: ScryfallCard) => {
    return card.card_faces && card.card_faces.length > 1
  }

  const getCurrentFace = (card: ScryfallCard, faceIndex: number = 0): CardFace | ScryfallCard => {
    if (card.card_faces && card.card_faces[faceIndex]) {
      return card.card_faces[faceIndex]
    }
    return card
  }

  const flipCard = () => {
    if (selectedCard && isDoubleSided(selectedCard)) {
      setCurrentFaceIndex((prev) => (prev + 1) % selectedCard.card_faces!.length)
    }
  }

  const cardTypes = [
    { label: 'Creature', value: 'creature' },
    { label: 'Instant', value: 'instant' },
    { label: 'Sorcery', value: 'sorcery' },
    { label: 'Artifact', value: 'artifact' },
    { label: 'Enchantment', value: 'enchantment' },
    { label: 'Planeswalker', value: 'planeswalker' },
    { label: 'Land', value: 'land' },
    { label: 'Legendary', value: 'legendary' },
  ]

  const toggleCardType = (type: string) => {
    const newTypes = new Set(selectedTypes)
    if (newTypes.has(type)) {
      newTypes.delete(type)
    } else {
      newTypes.add(type)
    }
    setSelectedTypes(newTypes)
  }

  return (
    <div className="page-container">
      <div className="search-page-header">
        <div className="search-bar-main">
          <div className="search-input-wrapper">
            <span className="search-icon-large">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" fill="currentColor"/>
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchScryfall()}
              placeholder="Search for Magic: The Gathering cards..."
              className="search-input-main"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="btn-clear-search"
              >
                ✕
              </button>
            )}
          </div>
          <button 
            onClick={searchScryfall} 
            disabled={loading} 
            className="btn btn-primary btn-search"
          >
            {loading ? '⏳ Searching...' : 'Search'}
          </button>
        </div>

        {/* Card Type Filters */}
        <div className="filter-section">
          <div className="filter-label">Filter by Type:</div>
          <div className="filter-chips">
            {cardTypes.map(type => (
              <button
                key={type.value}
                onClick={() => toggleCardType(type.value)}
                className={`filter-chip ${selectedTypes.has(type.value) ? 'active' : ''}`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Set Filter */}
        <div className="filter-section">
          <div className="filter-label">Filter by Set:</div>
          <div className="filter-dropdown-wrapper">
            <div className="custom-dropdown">
              <div 
                className="dropdown-trigger"
                onClick={() => setIsSetDropdownOpen(!isSetDropdownOpen)}
              >
                {selectedSet ? (
                  <div className="selected-set">
                    <img 
                      src={sets.find(s => s.code === selectedSet)?.icon_svg_uri} 
                      alt="" 
                      className="set-icon"
                    />
                    <span>{sets.find(s => s.code === selectedSet)?.name} ({selectedSet.toUpperCase()})</span>
                  </div>
                ) : (
                  <span className="dropdown-placeholder">All Sets</span>
                )}
                <span className="dropdown-arrow">{isSetDropdownOpen ? '▲' : '▼'}</span>
              </div>
              
              {isSetDropdownOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-search">
                    <input
                      type="text"
                      value={setFilterSearch}
                      onChange={(e) => setSetFilterSearch(e.target.value)}
                      placeholder="Search sets..."
                      className="dropdown-search-input"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="dropdown-options">
                    <div 
                      className="dropdown-option"
                      onClick={() => {
                        setSelectedSet('')
                        setIsSetDropdownOpen(false)
                        setSetFilterSearch('')
                      }}
                    >
                      <span>All Sets</span>
                    </div>
                    {sets
                      .filter(set => 
                        set.name.toLowerCase().includes(setFilterSearch.toLowerCase()) ||
                        set.code.toLowerCase().includes(setFilterSearch.toLowerCase())
                      )
                      .map(set => (
                        <div 
                          key={set.code}
                          className="dropdown-option"
                          onClick={() => {
                            setSelectedSet(set.code)
                            setIsSetDropdownOpen(false)
                            setSetFilterSearch('')
                          }}
                        >
                          <img src={set.icon_svg_uri} alt="" className="set-icon" />
                          <span>{set.name} ({set.code.toUpperCase()})</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="search-page-layout">
        {/* Search Section */}
        <div className="search-main">
          {/* Search Results */}
          {loading && (
            <div className="search-results-section">
              <div className="results-header">
                <h2>Searching Scryfall...</h2>
              </div>
              <div className="card-grid">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="card-skeleton">
                    <div className="skeleton-image" />
                    <div className="skeleton-text" />
                    <div className="skeleton-text skeleton-text-sm" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && searchResults.length > 0 && (
            <div className="search-results-section">
              <div className="results-header">
                <h2>
                  Search Results 
                  <span className="results-count">
                    Showing {searchResults.length} of {totalCards.toLocaleString()} cards
                  </span>
                </h2>
                {hasMore && (
                  <p className="results-note">
                    ℹ️ Showing first {searchResults.length} results. Refine your search for more specific results.
                  </p>
                )}
              </div>
              
              <div className="card-grid card-grid-search">
                {searchResults.map(card => {
                  const ownedCount = getCardQuantity(card.id)
                  return (
                    <div 
                      key={card.id} 
                      className="card-item search-result clickable"
                      onClick={() => setSelectedCard(card)}
                    >
                      {ownedCount > 0 && (
                        <div className="owned-badge">{ownedCount}</div>
                      )}
                      {getCardImage(card, 'small', 0) && (
                        <img 
                          src={getCardImage(card, 'small', 0)} 
                          alt={card.name} 
                          className="card-image" 
                        />
                      )}
                      <div className="card-info">
                        <h4>{card.name}</h4>
                        {card.prices?.usd && (
                          <p className="card-price">${card.prices.usd}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* No Results State */}
          {!loading && searchQuery && searchResults.length === 0 && (
            <div className="empty-state">
              <p>No cards found for "{searchQuery}"</p>
              <p className="empty-state-hint">Try adjusting your search terms or check the syntax help above.</p>
            </div>
          )}

          {/* Initial State */}
          {!loading && !searchQuery && searchResults.length === 0 && (
            <div className="empty-state">
              <h3>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }}>
                  <path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" fill="currentColor"/>
                </svg>
                Start Searching
              </h3>
              <p>Enter a search query above to find Magic: The Gathering cards</p>
              <p className="empty-state-hint">
                Try searching by card name, type, color, or use quick searches above
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Card Details Modal */}
      {selectedCard && (
        <>
          <div className="modal-overlay" onClick={() => setSelectedCard(null)} />
          <div className="modal">
            <div className="modal-header">
              <h2>Card Details</h2>
              <button 
                className="btn-close"
                onClick={() => setSelectedCard(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-content">
              <div className="modal-two-column">
                <div className="modal-image-section">
                  {getCardImage(selectedCard, 'normal', currentFaceIndex) && (
                    <div style={{ position: 'relative' }}>
                      <img 
                        src={getCardImage(selectedCard, 'normal', currentFaceIndex)!} 
                        alt={getCurrentFace(selectedCard, currentFaceIndex).name} 
                        className="card-image-large" 
                      />
                      {isDoubleSided(selectedCard) && (
                        <button
                          className="flip-card-btn"
                          onClick={flipCard}
                          aria-label="Flip card"
                          title="Flip card"
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7.11 8.53L5.7 7.11C4.8 8.27 4.24 9.61 4.07 11h2.02c.14-.87.49-1.72 1.02-2.47zM6.09 13H4.07c.17 1.39.72 2.73 1.62 3.89l1.41-1.42c-.52-.75-.87-1.59-1.01-2.47zm1.01 5.32c1.16.9 2.51 1.44 3.9 1.61V17.9c-.87-.15-1.71-.49-2.46-1.03L7.1 18.32zM13 4.07V1L8.45 5.55 13 10V6.09c2.84.48 5 2.94 5 5.91s-2.16 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93s-3.05-7.44-7-7.93z" fill="currentColor"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="modal-details-section">
                  <div className="card-title-row">
                    <h3 className="card-detail-name">{getCurrentFace(selectedCard, currentFaceIndex).name}</h3>
                    <div className="card-icons">
                      <span className="card-mana-symbols">{getCurrentFace(selectedCard, currentFaceIndex).mana_cost || ''}</span>
                    </div>
                  </div>
                  
                  <p className="card-type-large">{getCurrentFace(selectedCard, currentFaceIndex).type_line}</p>
                  
                  {getCurrentFace(selectedCard, currentFaceIndex).oracle_text && (
                    <div className="oracle-text-clean">
                      <p>{getCurrentFace(selectedCard, currentFaceIndex).oracle_text}</p>
                    </div>
                  )}

                  {selectedCard.prices?.usd && (
                    <div className="card-price-display">
                      <span className="price-label">Market Price:</span>
                      <span className="price-value">${selectedCard.prices.usd}</span>
                    </div>
                  )}

                  <div className="modal-actions">
                    <div className="quantity-controls">
                      <button 
                        className="btn btn-sm"
                        onClick={() => updateCardQuantity(selectedCard, Math.max(0, getCardQuantity(selectedCard.id) - 1))}
                        disabled={updatingCards.has(selectedCard.id) || getCardQuantity(selectedCard.id) === 0}
                      >
                        −
                      </button>
                      <span className="quantity">
                        {updatingCards.has(selectedCard.id) ? '⏳' : getCardQuantity(selectedCard.id)}
                      </span>
                      <button 
                        className="btn btn-sm btn-orange"
                        onClick={() => updateCardQuantity(selectedCard, getCardQuantity(selectedCard.id) + 1)}
                        disabled={updatingCards.has(selectedCard.id)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
