'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface DeckCard {
  id: number
  scryfall_id: string
  name: string
  quantity: number
  is_commander: boolean
  mana_cost?: string
  type_line?: string
  image_uri?: string
  colors?: string
}

interface Deck {
  id: number
  name: string
  description?: string
  format?: string
  created_at: string
  updated_at: string
  cards: DeckCard[]
}

export default function DecksPage() {
  const router = useRouter()
  const [decks, setDecks] = useState<Deck[]>([])
  const [showNewDeckForm, setShowNewDeckForm] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')
  const [newDeckFormat, setNewDeckFormat] = useState('Commander')
  const [newDeckDescription, setNewDeckDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'my-decks' | 'community'>('my-decks')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFormat, setSelectedFormat] = useState('All Formats')

  useEffect(() => {
    fetchDecks()
  }, [])

  const fetchDecks = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/decks/`)
      const data = await response.json()
      setDecks(data)
    } catch (error) {
      console.error('Error fetching decks:', error)
    }
    setLoading(false)
  }

  const createDeck = async () => {
    if (!newDeckName.trim()) return

    try {
      const response = await fetch(`${API_URL}/api/decks/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDeckName,
          format: newDeckFormat,
          description: newDeckDescription
        })
      })
      
      if (response.ok) {
        const newDeck = await response.json()
        setDecks([...decks, newDeck])
        setNewDeckName('')
        setNewDeckFormat('Commander')
        setNewDeckDescription('')
        setShowNewDeckForm(false)
      }
    } catch (error) {
      console.error('Error creating deck:', error)
    }
  }

  const deleteDeck = async (deckId: number) => {
    if (!confirm('Delete this deck?')) return

    try {
      const response = await fetch(`${API_URL}/api/decks/${deckId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setDecks(decks.filter(d => d.id !== deckId))
      }
    } catch (error) {
      console.error('Error deleting deck:', error)
    }
  }

  const getTotalCards = (deck: Deck) => {
    return deck.cards.reduce((sum, card) => sum + card.quantity, 0)
  }

  const getCommanderImage = (deck: Deck) => {
    const commander = deck.cards.find(c => c.is_commander)
    return commander?.image_uri
  }

  const decksByFormat = decks.reduce((acc, deck) => {
    const format = deck.format || 'Casual'
    if (!acc[format]) acc[format] = []
    acc[format].push(deck)
    return acc
  }, {} as Record<string, Deck[]>)

  const filteredDecks = decks.filter(deck => {
    const matchesSearch = deck.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFormat = selectedFormat === 'All Formats' || deck.format === selectedFormat
    return matchesSearch && matchesFormat
  })

  const filteredDecksByFormat = filteredDecks.reduce((acc, deck) => {
    const format = deck.format || 'Casual'
    if (!acc[format]) acc[format] = []
    acc[format].push(deck)
    return acc
  }, {} as Record<string, Deck[]>)

  return (
    <div className="page-container decks-page-new">
      {/* Header */}
      <div className="decks-header">
        <div className="decks-header-top">
          <div>
            <h1 className="page-title">Decks</h1>
            <p className="page-subtitle">Build and manage your strategies.</p>
          </div>
        </div>

        <div className="decks-header-controls">
          <div className="decks-search-bar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="search-icon">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
            </svg>
            <input
              type="text"
              placeholder="Search decks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="decks-search-input"
            />
          </div>

          <select 
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="format-select"
          >
            <option>All Formats</option>
            <option>Standard</option>
            <option>Modern</option>
            <option>Commander</option>
            <option>Legacy</option>
            <option>Vintage</option>
            <option>Pioneer</option>
            <option>Pauper</option>
            <option>Casual</option>
          </select>

          <button className="btn btn-secondary btn-import">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/>
            </svg>
            Import
          </button>

          <button 
            onClick={() => setShowNewDeckForm(true)}
            className="btn btn-orange"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor"/>
            </svg>
            New Deck
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="decks-tabs">
        <button
          className={`decks-tab ${activeTab === 'my-decks' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-decks')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
          </svg>
          My Decks
        </button>
        <button
          className={`decks-tab ${activeTab === 'community' ? 'active' : ''}`}
          onClick={() => setActiveTab('community')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM7.07 18.28c.43-.9 3.05-1.78 4.93-1.78s4.51.88 4.93 1.78C15.57 19.36 13.86 20 12 20s-3.57-.64-4.93-1.72zm11.29-1.45c-1.43-1.74-4.9-2.33-6.36-2.33s-4.93.59-6.36 2.33C4.62 15.49 4 13.82 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.82-.62 3.49-1.64 4.83zM12 6c-1.94 0-3.5 1.56-3.5 3.5S10.06 13 12 13s3.5-1.56 3.5-3.5S13.94 6 12 6zm0 5c-.83 0-1.5-.67-1.5-1.5S11.17 8 12 8s1.5.67 1.5 1.5S12.83 11 12 11z" fill="currentColor"/>
          </svg>
          Community Decks
        </button>
      </div>

      {/* Deck Content */}
      <div className="decks-content">
        {activeTab === 'my-decks' ? (
          loading ? (
            <div className="decks-loading">
              <div className="spinner"></div>
              <p>Loading decks...</p>
            </div>
          ) : Object.keys(filteredDecksByFormat).length === 0 ? (
            <div className="decks-empty-state">
              <div className="empty-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z" fill="currentColor" opacity="0.3"/>
                </svg>
              </div>
              <h2>No Decks Yet</h2>
              <p>Create your first deck to get started building your collection of strategies.</p>
              <button onClick={() => setShowNewDeckForm(true)} className="btn btn-orange">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor"/>
                </svg>
                Create Your First Deck
              </button>
            </div>
          ) : (
            Object.entries(filteredDecksByFormat).map(([format, formatDecks]) => (
              <div key={format} className="format-section">
                <div className="format-header">
                  <h2 className="format-title">{format}</h2>
                  <span className="format-count">{formatDecks.length}</span>
                </div>
                
                <div className="decks-grid">
                  {formatDecks.map(deck => {
                    const totalCards = getTotalCards(deck)
                    const commanderImage = getCommanderImage(deck)
                    
                    return (
                      <div key={deck.id} className="deck-card-gallery">
                        <div 
                          className="deck-card-image"
                          style={{
                            backgroundImage: commanderImage 
                              ? `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url(${commanderImage})`
                              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          }}
                          onClick={() => router.push(`/decks/${deck.id}`)}
                        >
                          <div className="deck-card-badges">
                            <span className="badge-private">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="currentColor"/>
                              </svg>
                              PRIVATE
                            </span>
                          </div>

                          <button 
                            className="deck-card-menu"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteDeck(deck.id)
                            }}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/>
                            </svg>
                          </button>

                          <div className="deck-card-info">
                            <h3 className="deck-card-name">{deck.name}</h3>
                            <p className="deck-card-author">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
                              </svg>
                              Pavan Santhosh
                            </p>
                          </div>
                        </div>

                        <div className="deck-card-details">
                          <p className="deck-card-description">
                            {deck.description || 'No description provided.'}
                          </p>

                          <div className="deck-card-footer">
                            <div className="deck-card-stats-row">
                              <span className="deck-stat">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z" fill="currentColor"/>
                                </svg>
                                {totalCards}
                              </span>
                              <span className="deck-price">$0.{String(Math.floor(Math.random() * 100)).padStart(2, '0')}</span>
                            </div>

                            <button 
                              className="btn-view-deck"
                              onClick={() => router.push(`/decks/${deck.id}`)}
                            >
                              View
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )
        ) : (
          <div className="community-coming-soon">
            <div className="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM7.07 18.28c.43-.9 3.05-1.78 4.93-1.78s4.51.88 4.93 1.78C15.57 19.36 13.86 20 12 20s-3.57-.64-4.93-1.72zm11.29-1.45c-1.43-1.74-4.9-2.33-6.36-2.33s-4.93.59-6.36 2.33C4.62 15.49 4 13.82 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.82-.62 3.49-1.64 4.83zM12 6c-1.94 0-3.5 1.56-3.5 3.5S10.06 13 12 13s3.5-1.56 3.5-3.5S13.94 6 12 6zm0 5c-.83 0-1.5-.67-1.5-1.5S11.17 8 12 8s1.5.67 1.5 1.5S12.83 11 12 11z" fill="currentColor" opacity="0.3"/>
              </svg>
            </div>
            <h2>Community Decks Coming Soon</h2>
            <p>Share and discover decks from the community.</p>
          </div>
        )}
      </div>

      {/* New Deck Modal */}
      {showNewDeckForm && (
        <div className="new-deck-modal-overlay" onClick={() => setShowNewDeckForm(false)}>
          <div className="new-deck-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Deck</h2>
              <button onClick={() => setShowNewDeckForm(false)} className="btn-close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
                </svg>
              </button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label>Deck Name*</label>
                <input
                  type="text"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="Enter deck name..."
                  className="form-input"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Format*</label>
                <select 
                  value={newDeckFormat}
                  onChange={(e) => setNewDeckFormat(e.target.value)}
                  className="form-select"
                >
                  <option>Standard</option>
                  <option>Modern</option>
                  <option>Commander</option>
                  <option>Legacy</option>
                  <option>Vintage</option>
                  <option>Pioneer</option>
                  <option>Pauper</option>
                  <option>Casual</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  value={newDeckDescription}
                  onChange={(e) => setNewDeckDescription(e.target.value)}
                  placeholder="Describe your deck strategy..."
                  className="form-textarea"
                  rows={4}
                />
              </div>
              <div className="modal-actions">
                <button onClick={() => setShowNewDeckForm(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button onClick={createDeck} className="btn btn-orange" disabled={!newDeckName.trim()}>
                  Create Deck
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
