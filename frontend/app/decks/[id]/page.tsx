'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DeckCard, CollectionCard, Deck, ScryfallCard } from './types'
import { categorizeCardsByTags, categorizeCardsByType, getCategoryCount, getExistingTags, getAllTags, getDefaultTagsForFormat } from './utils'
import { validateDeck } from './deckValidation'
import CardListItem from './components/CardListItem'
import AssignTagModal from './components/AssignTagModal'
import ManageTagsModal from './components/ManageTagsModal'
import BasicLandsSection from './components/BasicLandsSection'
import Toast from './components/Toast'
import QuickAddSearch from './components/QuickAddSearch'
import DeckStatistics from './components/DeckStatistics'
import ManaCurve from './components/ManaCurve'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function DeckDetailPage() {
  const params = useParams()
  const router = useRouter()
  const deckId = params.id as string
  
  const [deck, setDeck] = useState<Deck | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'deck' | 'mana-curve' | 'add-cards'>('deck')
  
  // Add Cards tab state
  const [collection, setCollection] = useState<CollectionCard[]>([])
  const [allDecks, setAllDecks] = useState<Deck[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [colorFilters, setColorFilters] = useState<Set<string>>(new Set())
  const [loadingCollection, setLoadingCollection] = useState(false)
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set())
  const [selectedCardDetails, setSelectedCardDetails] = useState<ScryfallCard | null>(null)
  const [loadingCardDetails, setLoadingCardDetails] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<DeckCard | null>(null)
  
  // Deck tab multi-select state
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [selectedDeckCards, setSelectedDeckCards] = useState<Set<number>>(new Set())
  
  // Tags view state
  const [tagsViewMode, setTagsViewMode] = useState(true)
  const [showAssignTagModal, setShowAssignTagModal] = useState(false)
  const [showManageTagModal, setShowManageTagModal] = useState(false)
  const [selectedTagForAssign, setSelectedTagForAssign] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [pendingTags, setPendingTags] = useState<Set<string>>(new Set())
  const [cardMenuOpen, setCardMenuOpen] = useState<number | null>(null)
  const [singleCardForTag, setSingleCardForTag] = useState<number | null>(null)
  const [showViolationsTooltip, setShowViolationsTooltip] = useState(false)
  
  // Toast notification state
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null)

  useEffect(() => {
    if (deckId) {
      fetchDeck()
      fetchCollection()
      fetchAllDecks()
    }
  }, [deckId])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      // Ctrl/Cmd + K: Focus quick-add search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const quickAddInput = document.querySelector('input[placeholder*="Quick add"]') as HTMLInputElement
        if (quickAddInput && activeTab === 'deck') {
          quickAddInput.focus()
        }
        return
      }

      // Number keys for tab switching
      if (e.key === '1') {
        setActiveTab('deck')
      } else if (e.key === '2') {
        setActiveTab('mana-curve')
      } else if (e.key === '3') {
        setActiveTab('add-cards')
      }

      // Tab-specific shortcuts
      if (activeTab === 'add-cards') {
        if (e.key === 'a' || e.key === 'A') {
          if (selectedCards.size > 0) {
            addCardsToDeck()
          }
        }
      }

      if (activeTab === 'deck' && multiSelectMode) {
        if (e.key === 'd' || e.key === 'D') {
          if (selectedDeckCards.size > 0) {
            removeSelectedCardsFromDeck()
          }
        } else if (e.key === 't' || e.key === 'T') {
          if (selectedDeckCards.size > 0) {
            setShowAssignTagModal(true)
          }
        }
      }

      // Escape: Clear selections and close modals
      if (e.key === 'Escape') {
        setSelectedCards(new Set())
        setSelectedDeckCards(new Set())
        setShowAssignTagModal(false)
        setShowManageTagModal(false)
        setSelectedCardDetails(null)
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [activeTab, multiSelectMode, selectedCards, selectedDeckCards, deckId])

  const fetchDeck = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/decks/${deckId}`)
      if (response.ok) {
        const data = await response.json()
        setDeck(data)
      } else {
        console.error('Deck not found')
        router.push('/decks')
      }
    } catch (error) {
      console.error('Error fetching deck:', error)
      router.push('/decks')
    }
    setLoading(false)
  }

  const fetchCollection = async () => {
    setLoadingCollection(true)
    try {
      const response = await fetch(`${API_URL}/api/collection/`)
      const data = await response.json()
      setCollection(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching collection:', error)
      setCollection([])
    }
    setLoadingCollection(false)
  }

  const fetchAllDecks = async () => {
    try {
      const response = await fetch(`${API_URL}/api/decks/`)
      const data = await response.json()
      setAllDecks(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching decks:', error)
      setAllDecks([])
    }
  }

  const getCardUsageInDecks = (scryfallId: string) => {
    let totalUsed = 0
    const decksUsing: string[] = []
    
    allDecks.forEach(d => {
      const cardInDeck = d.cards.find(c => c.scryfall_id === scryfallId)
      if (cardInDeck) {
        totalUsed += cardInDeck.quantity
        decksUsing.push(d.name)
      }
    })
    
    return { totalUsed, decksUsing }
  }

  const getAvailableQuantity = (card: CollectionCard) => {
    const usage = getCardUsageInDecks(card.scryfall_id)
    return Math.max(0, card.quantity - usage.totalUsed)
  }

  const fetchCardDetails = async (scryfallId: string) => {
    setLoadingCardDetails(true)
    try {
      const response = await fetch(`https://api.scryfall.com/cards/${scryfallId}`)
      const data = await response.json()
      setSelectedCardDetails(data)
    } catch (error) {
      console.error('Error fetching card details:', error)
    }
    setLoadingCardDetails(false)
  }

  const toggleCardSelection = (cardId: number) => {
    const newSelection = new Set(selectedCards)
    if (newSelection.has(cardId)) {
      newSelection.delete(cardId)
    } else {
      newSelection.add(cardId)
    }
    setSelectedCards(newSelection)
  }

  const addCardsToDeck = async () => {
    if (selectedCards.size === 0) return
    
    const cardsToAdd = collection.filter(c => selectedCards.has(c.id))
    const cardsWithAvailability = cardsToAdd.filter(c => getAvailableQuantity(c) > 0)
    
    if (cardsWithAvailability.length === 0) {
      setToast({
        message: 'No available copies to add',
        type: 'error'
      })
      return
    }
    
    // Optimistic update: Add cards to UI immediately
    const optimisticCards: DeckCard[] = cardsWithAvailability.map((card, index) => ({
      id: -(Date.now() + index), // Temporary negative ID
      deck_id: parseInt(deckId),
      scryfall_id: card.scryfall_id,
      name: card.name,
      quantity: 1,
      is_commander: false,
      is_sideboard: false,
      mana_cost: card.mana_cost || undefined,
      type_line: card.type_line || undefined,
      image_uri: card.image_uri || undefined,
      colors: card.colors || undefined,
      tags: undefined
    }))
    
    setDeck(prevDeck => {
      if (!prevDeck) return prevDeck
      return {
        ...prevDeck,
        cards: [...prevDeck.cards, ...optimisticCards]
      }
    })
    
    // Clear selection and show toast immediately
    setSelectedCards(new Set())
    setToast({
      message: `Adding ${cardsWithAvailability.length} card${cardsWithAvailability.length > 1 ? 's' : ''}...`,
      type: 'info'
    })
    
    try {
      // Use bulk API endpoint for efficiency
      const cardsData = cardsWithAvailability.map(card => ({
        scryfall_id: card.scryfall_id,
        name: card.name,
        quantity: 1,
        is_commander: false,
        is_sideboard: false,
        mana_cost: card.mana_cost,
        type_line: card.type_line,
        image_uri: card.image_uri,
        colors: card.colors
      }))

      const response = await fetch(`${API_URL}/api/decks/${deckId}/cards/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardsData)
      })

      if (!response.ok) {
        throw new Error('Failed to add cards')
      }
      
      // Refresh deck with real data from server
      await fetchDeck()
      await fetchAllDecks()
      
      // Show success toast
      setToast({
        message: `Added ${cardsWithAvailability.length} card${cardsWithAvailability.length > 1 ? 's' : ''} to ${deck?.name || 'deck'}`,
        type: 'success'
      })
    } catch (error) {
      console.error('Error adding cards to deck:', error)
      
      // Rollback optimistic update on error
      await fetchDeck()
      
      setToast({
        message: 'Failed to add cards to deck',
        type: 'error'
      })
    }
  }

  const toggleColorFilter = (color: string) => {
    const newFilters = new Set(colorFilters)
    if (newFilters.has(color)) {
      newFilters.delete(color)
    } else {
      newFilters.add(color)
    }
    setColorFilters(newFilters)
  }

  const clearAllFilters = () => {
    setTypeFilter('all')
    setColorFilters(new Set())
    setSearchQuery('')
  }

  // Deck tab multi-select functions
  const toggleMultiSelectMode = () => {
    setMultiSelectMode(!multiSelectMode)
    setSelectedDeckCards(new Set()) // Clear selection when toggling mode
  }

  const toggleDeckCardSelection = (cardId: number) => {
    const newSelection = new Set(selectedDeckCards)
    if (newSelection.has(cardId)) {
      newSelection.delete(cardId)
    } else {
      newSelection.add(cardId)
    }
    setSelectedDeckCards(newSelection)
  }

  const removeSelectedCardsFromDeck = async () => {
    if (selectedDeckCards.size === 0) return
    
    const count = selectedDeckCards.size
    
    try {
      // Remove each selected card
      const cardIds = Array.from(selectedDeckCards)
      for (const cardId of cardIds) {
        await fetch(`${API_URL}/api/decks/${deckId}/cards/${cardId}`, {
          method: 'DELETE'
        })
      }
      
      // Refresh deck and clear selection
      await fetchDeck()
      await fetchAllDecks()
      setSelectedDeckCards(new Set())
      setMultiSelectMode(false)
      
      setToast({
        message: `Removed ${count} card${count > 1 ? 's' : ''} from deck`,
        type: 'success'
      })
    } catch (error) {
      console.error('Error removing cards from deck:', error)
      setToast({
        message: 'Failed to remove cards',
        type: 'error'
      })
    }
  }

  const addTagsToSelectedCards = async () => {
    // If it's for a single card, use the single card handler
    if (singleCardForTag !== null) {
      await addTagToSingleCard()
      return
    }
    
    if (selectedDeckCards.size === 0 || !selectedTagForAssign.trim()) return
    
    try {
      const cardIds = Array.from(selectedDeckCards)
      for (const cardId of cardIds) {
        await fetch(`${API_URL}/api/decks/${deckId}/cards/${cardId}/tags`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: selectedTagForAssign.trim() })
        })
      }
      
      // Refresh deck and clear selection
      await fetchDeck()
      setSelectedDeckCards(new Set())
      setShowAssignTagModal(false)
      setSelectedTagForAssign('')
      
      // Remove from pending tags if it was there
      if (pendingTags.has(selectedTagForAssign.trim())) {
        setPendingTags(prev => {
          const newSet = new Set(prev)
          newSet.delete(selectedTagForAssign.trim())
          return newSet
        })
      }
      
      setToast({
        message: `Tag "${selectedTagForAssign.trim()}" added to ${cardIds.length} card${cardIds.length > 1 ? 's' : ''}`,
        type: 'success'
      })
    } catch (error) {
      console.error('Error adding tags to cards:', error)
      setToast({
        message: 'Failed to add tag',
        type: 'error'
      })
    }
  }

  // Single card operations
  const addCardToTag = async (cardId: number, tag: string) => {
    try {
      await fetch(`${API_URL}/api/decks/${deckId}/cards/${cardId}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: tag })
      })
      
      await fetchDeck()
      
      setToast({
        message: `Card moved to ${tag}`,
        type: 'success'
      })
    } catch (error) {
      console.error('Error adding tag to card:', error)
      setToast({
        message: 'Failed to add tag',
        type: 'error'
      })
    }
  }

  const promoteCardAsCommander = async (cardId: number) => {
    try {
      await fetch(`${API_URL}/api/decks/${deckId}/cards/${cardId}/commander`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_commander: true })
      })
      
      await fetchDeck()
      
      setToast({
        message: 'Card promoted as Commander',
        type: 'success'
      })
    } catch (error) {
      console.error('Error promoting card as commander:', error)
      setToast({
        message: 'Failed to promote as commander',
        type: 'error'
      })
    }
  }

  const removeSingleCardFromDeck = async (cardId: number) => {
    try {
      await fetch(`${API_URL}/api/decks/${deckId}/cards/${cardId}`, {
        method: 'DELETE'
      })
      
      await fetchDeck()
      setCardMenuOpen(null)
      
      setToast({
        message: 'Card removed from deck',
        type: 'success'
      })
    } catch (error) {
      console.error('Error removing card from deck:', error)
      setToast({
        message: 'Failed to remove card',
        type: 'error'
      })
    }
  }

  const openTagModalForSingleCard = (cardId: number) => {
    setSingleCardForTag(cardId)
    setShowAssignTagModal(true)
    setCardMenuOpen(null)
  }

  const addTagToSingleCard = async () => {
    if (!singleCardForTag || !selectedTagForAssign.trim()) return
    
    try {
      await fetch(`${API_URL}/api/decks/${deckId}/cards/${singleCardForTag}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: selectedTagForAssign.trim() })
      })
      
      await fetchDeck()
      setShowAssignTagModal(false)
      setSelectedTagForAssign('')
      setSingleCardForTag(null)
      
      // Remove from pending tags if it was there
      if (pendingTags.has(selectedTagForAssign.trim())) {
        setPendingTags(prev => {
          const newSet = new Set(prev)
          newSet.delete(selectedTagForAssign.trim())
          return newSet
        })
      }
    } catch (error) {
      console.error('Error adding tag to card:', error)
    }
  }

  const createNewTag = () => {
    if (!tagInput.trim()) return
    
    const newTag = tagInput.trim()
    const allTags = getAllTags(deck, pendingTags)
    
    if (allTags.includes(newTag)) {
      alert(`Tag "${newTag}" already exists`)
      setTagInput('')
      return
    }
    
    setPendingTags(prev => {
      const newSet = new Set(prev)
      newSet.add(newTag)
      return newSet
    })
    setTagInput('')
  }

  const deleteTag = async (tagName: string) => {
    const defaultTags = getDefaultTagsForFormat(deck?.format)
    
    // Prevent deletion of default tags
    if (defaultTags.includes(tagName)) {
      alert(`"${tagName}" is a default tag for this format and cannot be deleted`)
      return
    }
    
    const existingTags = getExistingTags(deck)
    const isPending = !existingTags.includes(tagName)
    
    if (isPending) {
      // Just remove from pending tags
      if (confirm(`Delete tag "${tagName}"? (Not assigned to any cards)`)) {
        setPendingTags(prev => {
          const newSet = new Set(prev)
          newSet.delete(tagName)
          return newSet
        })
      }
      return
    }
    
    // Tag is assigned to cards
    if (!confirm(`Remove tag "${tagName}" from all cards?`)) return
    
    try {
      // Remove tag from all cards that have it
      const cardsWithTag = deck?.cards.filter(card => card.tags === tagName) || []
      for (const card of cardsWithTag) {
        await fetch(`${API_URL}/api/decks/${deckId}/cards/${card.id}/tags`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: '' })
        })
      }
      
      await fetchDeck()
    } catch (error) {
      console.error('Error deleting tag:', error)
    }
  }

  const filteredCollection = collection.filter(card => {
    if (searchQuery && !card.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    
    if (typeFilter !== 'all') {
      const typeLine = (card.type_line || '').toLowerCase()
      if (typeFilter === 'creature' && !typeLine.includes('creature')) return false
      if (typeFilter === 'instant' && !typeLine.includes('instant')) return false
      if (typeFilter === 'sorcery' && !typeLine.includes('sorcery')) return false
      if (typeFilter === 'artifact' && !typeLine.includes('artifact')) return false
      if (typeFilter === 'enchantment' && !typeLine.includes('enchantment')) return false
      if (typeFilter === 'planeswalker' && !typeLine.includes('planeswalker')) return false
      if (typeFilter === 'land' && !typeLine.includes('land')) return false
    }

    if (colorFilters.size > 0) {
      const cardColors = card.colors ? card.colors.split(',') : []
      if (cardColors.length === 0) return false
      const allColorsSelected = cardColors.every((color: string) => colorFilters.has(color))
      const noExtraColors = cardColors.length <= colorFilters.size
      return allColorsSelected && noExtraColors
    }

    return true
  })

  const categorizeCards = () => {
    if (!deck) return {}
    return tagsViewMode ? categorizeCardsByTags(deck) : categorizeCardsByType(deck)
  }

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '400px',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div className="spinner"></div>
          <p>Loading deck...</p>
        </div>
      </div>
    )
  }

  if (!deck) {
    return (
      <div className="page-container">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '400px',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <p>Deck not found</p>
          <button onClick={() => router.push('/decks')} className="btn btn-primary">
            Back to Decks
          </button>
        </div>
      </div>
    )
  }

  const totalCards = deck.cards.filter(c => !c.is_sideboard).reduce((sum, card) => sum + card.quantity, 0)
  const sideboardCards = deck.cards.filter(c => c.is_sideboard).reduce((sum, card) => sum + card.quantity, 0)
  const commander = deck.cards.find(c => c.is_commander)

  // Deck validation
  const deckValidation = validateDeck(deck)

  return (
    <div className="page-container">
      {/* Header with Deck Name on Top Left */}
      <div className="deck-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => router.push('/decks')}
            className="btn btn-ghost"
            style={{ 
              padding: '0.5rem',
              minWidth: 'auto'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
            </svg>
          </button>
          <div>
            <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>{deck.name}</h1>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem',
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.6)'
            }}>
              {deck.format && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.75rem',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    color: '#f97316',
                    borderRadius: '4px',
                    fontWeight: '600'
                  }}>
                    {deck.format}
                  </span>
                  <span style={{ 
                    fontWeight: '600',
                    color: deckValidation.valid ? 'rgba(255, 255, 255, 0.7)' : '#ef4444'
                  }}>
                    {totalCards} cards
                  </span>
                  {!deckValidation.valid && (
                    <div 
                      style={{ 
                        position: 'relative',
                        display: 'inline-flex',
                        cursor: 'help'
                      }}
                      onMouseEnter={() => setShowViolationsTooltip(true)}
                      onMouseLeave={() => setShowViolationsTooltip(false)}
                    >
                      <svg 
                        width="20" 
                        height="20" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ color: '#ef4444' }}
                      >
                        <path 
                          d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" 
                          fill="currentColor"
                        />
                      </svg>
                      {showViolationsTooltip && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginTop: '0.5rem',
                            padding: '0.75rem',
                            backgroundColor: 'rgba(20, 20, 20, 0.98)',
                            border: '1px solid #ef4444',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                            zIndex: 1000,
                            minWidth: '250px',
                            maxWidth: '400px',
                            whiteSpace: 'normal'
                          }}
                        >
                          <div style={{
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#ef4444',
                            marginBottom: '0.5rem'
                          }}>
                            Deck Violations:
                          </div>
                          <ul style={{
                            margin: 0,
                            padding: '0 0 0 1.25rem',
                            fontSize: '0.75rem',
                            color: 'rgba(255, 255, 255, 0.9)',
                            lineHeight: '1.5'
                          }}>
                            {deckValidation.violations.map((violation, index) => (
                              <li key={index} style={{ marginBottom: '0.25rem' }}>
                                {violation}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {!deck.format && <span>{totalCards} cards</span>}
              {sideboardCards > 0 && (
                <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  + {sideboardCards} sideboard
                </span>
              )}
              {commander && (
                <span style={{ color: '#f97316' }}>
                  Commander: {commander.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="decks-tabs" style={{ marginTop: '1.5rem' }}>
        <button
          className={`decks-tab ${activeTab === 'deck' ? 'active' : ''}`}
          onClick={() => setActiveTab('deck')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z" fill="currentColor"/>
          </svg>
          Deck
        </button>

        <button
          className={`decks-tab ${activeTab === 'mana-curve' ? 'active' : ''}`}
          onClick={() => setActiveTab('mana-curve')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill="currentColor"/>
          </svg>
          Stats
        </button>
        <button
          className={`decks-tab ${activeTab === 'add-cards' ? 'active' : ''}`}
          onClick={() => setActiveTab('add-cards')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
          </svg>
          Add Cards
        </button>
      </div>

      {/* Deck Content */}
      <div style={{ marginTop: '2rem' }}>
        {activeTab === 'deck' && (
          <>
            {/* Quick Add Search */}
            <div style={{ marginBottom: '1.5rem' }}>
              <QuickAddSearch
                collection={collection}
                deckId={deckId}
                onCardAdded={async () => {
                  await fetchDeck()
                  await fetchAllDecks()
                }}
                onShowToast={(message, type) => setToast({ message, type })}
                getAvailableQuantity={getAvailableQuantity}
              />
            </div>

            {/* Basic Lands Section */}
            <BasicLandsSection
              deckId={deckId}
              deckCards={deck.cards}
              onUpdate={fetchDeck}
            />

            {/* Multi-select controls */}
            {deck.cards.length > 0 && (
              <div style={{ 
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                {/* Left side - Multi-select controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.9375rem',
                    fontWeight: '500'
                  }}>
                    <input
                      type="checkbox"
                      checked={multiSelectMode}
                      onChange={toggleMultiSelectMode}
                      style={{ 
                        width: '18px', 
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                    Multi-select
                  </label>

                  {multiSelectMode && (
                    <>
                      <button
                        onClick={removeSelectedCardsFromDeck}
                        disabled={selectedDeckCards.size === 0}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: selectedDeckCards.size === 0 ? 'rgba(239, 68, 68, 0.3)' : '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: selectedDeckCards.size === 0 ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          opacity: selectedDeckCards.size === 0 ? 0.5 : 1
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                        </svg>
                        Remove from Deck ({selectedDeckCards.size})
                      </button>
                      <button
                        onClick={() => setShowAssignTagModal(true)}
                        disabled={selectedDeckCards.size === 0}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: selectedDeckCards.size === 0 ? 'rgba(59, 130, 246, 0.3)' : '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: selectedDeckCards.size === 0 ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          opacity: selectedDeckCards.size === 0 ? 0.5 : 1
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.63 5.84C17.27 5.33 16.67 5 16 5H5C3.9 5 3 5.9 3 7v10c0 1.1.9 2 2 2h11c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z" fill="currentColor"/>
                        </svg>
                        Add Tag ({selectedDeckCards.size})
                      </button>
                    </>
                  )}
                </div>

                {/* Right side - Tags view controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.9375rem',
                    fontWeight: '500'
                  }}>
                    <input
                      type="checkbox"
                      checked={tagsViewMode}
                      onChange={(e) => setTagsViewMode(e.target.checked)}
                      style={{ 
                        width: '18px', 
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                    Tags View
                  </label>
                  <button
                    onClick={() => setShowManageTagModal(true)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.63 5.84C17.27 5.33 16.67 5 16 5H5C3.9 5 3 5.9 3 7v10c0 1.1.9 2 2 2h11c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z" fill="currentColor"/>
                    </svg>
                    Manage Tags
                  </button>
                </div>
              </div>
            )}

            {deck.cards.length > 0 ? (
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
                        color: 'rgba(0, 0, 0, 0.9)',
                        minHeight: '60px'
                      }}>
                        <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                          {(hoveredCard || commander)!.name}
                        </div>
                        {(hoveredCard || commander)!.mana_cost && (
                          <div style={{ 
                            fontSize: '0.875rem',
                            marginTop: '0.25rem',
                            color: 'rgba(0, 0, 0, 0.6)'
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
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1.5rem',
                  alignItems: 'start'
                }}>
                  {Object.entries(categorizeCards()).map(([category, cards]) => {
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
                              allTags={getAllTags(deck, pendingTags)}
                              deckFormat={deck?.format}
                              onAddToTag={addCardToTag}
                              onPromoteCommander={promoteCardAsCommander}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div style={{ 
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
                  Start adding cards to your deck
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'mana-curve' && (
          <>
            {/* Deck Statistics */}
            <DeckStatistics deck={deck} />
            
            {/* Mana Curve */}
            <ManaCurve deck={deck} />
          </>
        )}

        {activeTab === 'add-cards' && (
          <div>
            {/* Search Bar and Filters */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="collection-search-bar" style={{ marginBottom: '1rem' }}>
                <span className="search-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" fill="currentColor"/>
                  </svg>
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your collection..."
                  className="search-input-inline"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="btn-clear"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
                    </svg>
                  </button>
                )}
              </div>

              <div className="collection-filters">
                <div className="filter-group">
                  <label className="filter-label">Type:</label>
                  <select 
                    value={typeFilter} 
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="filter-select"
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
                </div>

                <div className="filter-group filter-group-colors">
                  <label className="filter-label">Colors:</label>
                  <div className="color-filters">
                    <button
                      className={`color-filter-btn ${colorFilters.has('W') ? 'active' : ''}`}
                      onClick={() => toggleColorFilter('W')}
                      title="White"
                      style={{ backgroundColor: colorFilters.has('W') ? '#f9fafb' : 'transparent', color: colorFilters.has('W') ? '#1f2937' : '#9ca3af' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" fill="currentColor"/>
                      </svg>
                    </button>
                    <button
                      className={`color-filter-btn ${colorFilters.has('U') ? 'active' : ''}`}
                      onClick={() => toggleColorFilter('U')}
                      title="Blue"
                      style={{ backgroundColor: colorFilters.has('U') ? '#3b82f6' : 'transparent', color: colorFilters.has('U') ? 'white' : '#9ca3af' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" fill="currentColor"/>
                      </svg>
                    </button>
                    <button
                      className={`color-filter-btn ${colorFilters.has('B') ? 'active' : ''}`}
                      onClick={() => toggleColorFilter('B')}
                      title="Black"
                      style={{ backgroundColor: colorFilters.has('B') ? '#1f2937' : 'transparent', color: colorFilters.has('B') ? 'white' : '#9ca3af' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" fill="currentColor"/>
                      </svg>
                    </button>
                    <button
                      className={`color-filter-btn ${colorFilters.has('R') ? 'active' : ''}`}
                      onClick={() => toggleColorFilter('R')}
                      title="Red"
                      style={{ backgroundColor: colorFilters.has('R') ? '#ef4444' : 'transparent', color: colorFilters.has('R') ? 'white' : '#9ca3af' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" fill="currentColor"/>
                      </svg>
                    </button>
                    <button
                      className={`color-filter-btn ${colorFilters.has('G') ? 'active' : ''}`}
                      onClick={() => toggleColorFilter('G')}
                      title="Green"
                      style={{ backgroundColor: colorFilters.has('G') ? '#10b981' : 'transparent', color: colorFilters.has('G') ? 'white' : '#9ca3af' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {(typeFilter !== 'all' || colorFilters.size > 0 || searchQuery !== '') && (
                  <button onClick={clearAllFilters} className="btn btn-sm btn-secondary clear-filters-btn">
                    Clear Filters
                  </button>
                )}
                
                {/* Add to Deck Button */}
                <button 
                  onClick={addCardsToDeck}
                  disabled={selectedCards.size === 0}
                  className="btn btn-orange"
                  style={{ 
                    opacity: selectedCards.size === 0 ? 0.5 : 1,
                    cursor: selectedCards.size === 0 ? 'not-allowed' : 'pointer',
                    marginLeft: 'auto'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.25rem' }}>
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
                  </svg>
                  Add to Deck ({selectedCards.size})
                </button>
              </div>
            </div>

            {/* Card Grid */}
            {loadingCollection ? (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                padding: '3rem',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div className="spinner"></div>
                <p>Loading collection...</p>
              </div>
            ) : filteredCollection.length === 0 ? (
              <div style={{ 
                textAlign: 'center',
                padding: '3rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px'
              }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto 1rem', opacity: 0.3 }}>
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z" fill="currentColor"/>
                </svg>
                <h3 style={{ marginBottom: '0.5rem' }}>
                  {collection.length === 0 ? 'No Cards in Collection' : 'No Cards Found'}
                </h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  {collection.length === 0 
                    ? 'Add cards to your collection first'
                    : 'Try adjusting your filters'}
                </p>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '1rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                  Showing {filteredCollection.length} cards
                </div>
                <div className="card-grid card-grid-collection">
                  {filteredCollection.map(card => {
                    const availableQty = getAvailableQuantity(card)
                    const usage = getCardUsageInDecks(card.scryfall_id)
                    const isAvailable = availableQty > 0
                    
                    return (
                      <div 
                        key={card.id} 
                        className={`collection-card ${selectedCards.has(card.id) ? 'selected' : ''}`}
                        style={{ opacity: isAvailable ? 1 : 0.6 }}
                      >
                        {/* Checkbox */}
                        <div className="card-checkbox-wrapper">
                          <input
                            type="checkbox"
                            checked={selectedCards.has(card.id)}
                            onChange={() => toggleCardSelection(card.id)}
                            className="card-checkbox"
                            onClick={(e) => e.stopPropagation()}
                            disabled={!isAvailable}
                            style={{ cursor: isAvailable ? 'pointer' : 'not-allowed' }}
                          />
                        </div>
                        
                        <div 
                          className="card-image-wrapper" 
                          style={{ cursor: 'pointer' }}
                          onClick={() => fetchCardDetails(card.scryfall_id)}
                        >
                          {card.image_uri || card.scryfall_id ? (
                            <img 
                              src={card.image_uri || `https://api.scryfall.com/cards/${card.scryfall_id}?format=image&version=normal`} 
                              alt={card.name} 
                              className="card-image" 
                            />
                          ) : (
                            <div className="card-placeholder">
                              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z" fill="currentColor" opacity="0.5"/>
                              </svg>
                            </div>
                          )}
                          <div 
                            className="card-quantity-badge"
                            style={{
                              backgroundColor: isAvailable ? 'rgba(249, 115, 22, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                              color: 'white'
                            }}
                          >
                            {availableQty}x
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Details Modal */}
      {selectedCardDetails && (
        <>
          <div className="modal-overlay" onClick={() => setSelectedCardDetails(null)} />
          <div className="modal">
            <div className="modal-header">
              <h2>Card Details</h2>
              <button 
                className="btn-close"
                onClick={() => setSelectedCardDetails(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-content">
              {loadingCardDetails ? (
                <div className="loading-spinner">Loading...</div>
              ) : (
                <div className="modal-two-column">
                  <div className="modal-image-section">
                    {selectedCardDetails.image_uris?.normal ? (
                      <img 
                        src={selectedCardDetails.image_uris.normal} 
                        alt={selectedCardDetails.name}
                        className="card-image-large"
                      />
                    ) : (
                      <div className="card-placeholder">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor" opacity="0.3"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="modal-details-section">
                    <div className="card-title-row">
                      <h3 className="card-detail-name">{selectedCardDetails.name}</h3>
                      <div className="card-icons">
                        <span className="card-mana-symbols">{selectedCardDetails.mana_cost || ''}</span>
                      </div>
                    </div>
                    
                    <p className="card-type-large">{selectedCardDetails.type_line}</p>
                    
                    {selectedCardDetails.oracle_text && (
                      <div className="oracle-text-clean">
                        <p>{selectedCardDetails.oracle_text}</p>
                      </div>
                    )}

                    {selectedCardDetails.prices?.usd && (
                      <div className="card-price-display">
                        <span className="price-label">Market Price:</span>
                        <span className="price-value">${selectedCardDetails.prices.usd}</span>
                      </div>
                    )}

                    {/* Show deck usage information */}
                    {collection.find(c => c.scryfall_id === selectedCardDetails.id) && (
                      <div style={{ 
                        marginTop: '1.5rem',
                        padding: '1rem',
                        backgroundColor: 'rgba(96, 165, 250, 0.1)',
                        borderRadius: '8px',
                        border: '1px solid rgba(96, 165, 250, 0.3)'
                      }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: '#60a5fa' }}>
                          Usage Information
                        </h3>
                        {(() => {
                          const collectionCard = collection.find(c => c.scryfall_id === selectedCardDetails.id)!
                          const usage = getCardUsageInDecks(selectedCardDetails.id)
                          const available = getAvailableQuantity(collectionCard)
                          
                          return (
                            <>
                              <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '0.5rem' }}>
                                <strong>In Collection:</strong> {collectionCard.quantity}x
                              </div>
                              {usage.totalUsed > 0 && (
                                <>
                                  <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '0.5rem' }}>
                                    <strong>Used in Decks:</strong> {usage.totalUsed}x
                                  </div>
                                  <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', marginLeft: '1rem' }}>
                                    {usage.decksUsing.map((deckName, idx) => (
                                      <div key={idx}>• {deckName}</div>
                                    ))}
                                  </div>
                                </>
                              )}
                              <div style={{ fontSize: '0.875rem', color: available > 0 ? '#10b981' : '#ef4444', marginTop: '0.5rem', fontWeight: '600' }}>
                                <strong>Available:</strong> {available}x
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <AssignTagModal
        isOpen={showAssignTagModal}
        onClose={() => {
          setShowAssignTagModal(false)
          setSelectedTagForAssign('')
          setSingleCardForTag(null)
        }}
        selectedTagForAssign={selectedTagForAssign}
        setSelectedTagForAssign={setSelectedTagForAssign}
        allTags={getAllTags(deck, pendingTags)}
        onAssign={addTagsToSelectedCards}
        isSingleCard={singleCardForTag !== null}
        selectedCardsCount={selectedDeckCards.size}
      />

      <ManageTagsModal
        isOpen={showManageTagModal}
        onClose={() => {
          setShowManageTagModal(false)
          setTagInput('')
        }}
        tagInput={tagInput}
        setTagInput={setTagInput}
        onCreateTag={createNewTag}
        allTags={getAllTags(deck, pendingTags)}
        existingTags={getExistingTags(deck)}
        defaultTags={getDefaultTagsForFormat(deck?.format)}
        onDeleteTag={deleteTag}
        cardsCount={(tag) => deck?.cards.filter(card => card.tags === tag).length || 0}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Keyboard Shortcuts Help */}
      <div 
        style={{
          position: 'fixed',
          bottom: '2rem',
          left: '2rem',
          zIndex: 1000
        }}
      >
        <div 
          style={{
            position: 'relative',
            cursor: 'help'
          }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'rgba(59, 130, 246, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.125rem',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}
          onMouseEnter={(e) => {
            const tooltip = e.currentTarget.nextElementSibling as HTMLElement
            if (tooltip) tooltip.style.display = 'block'
          }}
          onMouseLeave={(e) => {
            const tooltip = e.currentTarget.nextElementSibling as HTMLElement
            if (tooltip) tooltip.style.display = 'none'
          }}
          >
            ⌨️
          </div>
          <div style={{
            display: 'none',
            position: 'absolute',
            bottom: '50px',
            left: 0,
            minWidth: '280px',
            backgroundColor: '#1f2937',
            color: 'white',
            padding: '1rem',
            borderRadius: '8px',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
            fontSize: '0.75rem',
            lineHeight: '1.6'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              Keyboard Shortcuts
            </div>
            <div style={{ display: 'grid', gap: '0.25rem' }}>
              <div><kbd style={{backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '3px'}}>⌘/Ctrl + K</kbd> Focus quick-add</div>
              <div><kbd style={{backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '3px'}}>1-3</kbd> Switch tabs</div>
              <div><kbd style={{backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '3px'}}>A</kbd> Add selected cards</div>
              <div><kbd style={{backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '3px'}}>D</kbd> Delete selected</div>
              <div><kbd style={{backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '3px'}}>T</kbd> Add tag</div>
              <div><kbd style={{backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '3px'}}>Esc</kbd> Clear/Close</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
