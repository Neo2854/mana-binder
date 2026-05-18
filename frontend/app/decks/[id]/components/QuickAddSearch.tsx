'use client'

import { useState, useEffect, useRef } from 'react'
import { CollectionCard } from '../types'

interface QuickAddSearchProps {
  collection: CollectionCard[]
  deckId: string
  onCardAdded: () => void
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void
  getAvailableQuantity: (card: CollectionCard) => number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function QuickAddSearch({ 
  collection, 
  deckId, 
  onCardAdded, 
  onShowToast,
  getAvailableQuantity 
}: QuickAddSearchProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<CollectionCard[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (query.trim().length >= 2) {
      const filtered = collection.filter(card =>
        card.name.toLowerCase().includes(query.toLowerCase()) &&
        getAvailableQuantity(card) > 0
      ).slice(0, 10) // Limit to 10 suggestions
      setSuggestions(filtered)
      setIsOpen(filtered.length > 0)
      setSelectedIndex(0)
    } else {
      setSuggestions([])
      setIsOpen(false)
    }
  }, [query, collection, getAvailableQuantity])

  const addCard = async (card: CollectionCard) => {
    try {
      await fetch(`${API_URL}/api/decks/${deckId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scryfall_id: card.scryfall_id,
          name: card.name,
          quantity: 1,
          is_commander: false,
          is_sideboard: false,
          mana_cost: card.mana_cost,
          type_line: card.type_line,
          image_uri: card.image_uri,
          colors: card.colors
        })
      })
      
      onShowToast(`Added ${card.name} to deck`, 'success')
      setQuery('')
      setIsOpen(false)
      onCardAdded()
    } catch (error) {
      console.error('Error adding card:', error)
      onShowToast('Failed to add card', 'error')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % suggestions.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
        break
      case 'Enter':
        e.preventDefault()
        if (suggestions[selectedIndex]) {
          addCard(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setQuery('')
        break
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Quick add card... (type name and press Enter)"
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            paddingLeft: '2.5rem',
            fontSize: '0.875rem',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: 'black',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true)
          }}
        />
        <svg 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          style={{
            position: 'absolute',
            left: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: 0.5
          }}
        >
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
        </svg>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '0.25rem',
          backgroundColor: '#1f2937',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          maxHeight: '400px',
          overflowY: 'auto',
          zIndex: 1000,
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)'
        }}>
          {suggestions.map((card, index) => {
            const available = getAvailableQuantity(card)
            return (
              <div
                key={card.id}
                onClick={() => addCard(card)}
                style={{
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  backgroundColor: index === selectedIndex ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
                  borderBottom: index < suggestions.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '600',
                    color: 'black',
                    marginBottom: '0.25rem'
                  }}>
                    {card.name}
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.6)'
                  }}>
                    {card.type_line}
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{
                    fontSize: '0.75rem',
                    color: '#10b981',
                    fontWeight: '600'
                  }}>
                    {available}x available
                  </span>
                  {card.mana_cost && (
                    <span style={{
                      fontSize: '0.75rem',
                      color: 'rgba(255, 255, 255, 0.7)'
                    }}>
                      {card.mana_cost}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
