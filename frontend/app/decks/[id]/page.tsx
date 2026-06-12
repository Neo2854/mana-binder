'use client'

import { useEffect, useState, useRef } from 'react'
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
import DeckTabs from './components/DeckTabs'
import StandardCollectionView from './components/StandardCollectionView'
import MultiSelectControls from './components/MultiSelectControls'
import StandardDeckDisplay from './components/StandardDeckDisplay'
import CommanderDeckDisplay from './components/CommanderDeckDisplay'

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
  
  // Standard format: Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Basic lands state (for Standard format - local until saved)
  const [basicLands, setBasicLands] = useState<Record<string, number>>({
    'Plains': 0,
    'Island': 0,
    'Swamp': 0,
    'Mountain': 0,
    'Forest': 0
  })

  useEffect(() => {
    if (deckId) {
      fetchDeck()
      fetchCollection()
      fetchAllDecks()
    }
  }, [deckId])

  // Reset to 'deck' tab if viewing Standard format and on 'add-cards' tab
  useEffect(() => {
    const isStandard = deck?.format?.toLowerCase() === 'standard'
    if (deck && isStandard && activeTab === 'add-cards') {
      setActiveTab('deck')
    }
  }, [deck, activeTab])

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
      
      // Ctrl/Cmd + S: Save deck changes (Standard format only)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        const isStandard = deck?.format?.toLowerCase() === 'standard'
        if (isStandard && hasUnsavedChanges && activeTab === 'deck') {
          saveDeckChanges()
        }
        return
      }

      // Number keys for tab switching
      const isStandard = deck?.format?.toLowerCase() === 'standard'
      if (e.key === '1') {
        setActiveTab('deck')
      } else if (e.key === '2') {
        setActiveTab('mana-curve')
      } else if (e.key === '3' && !isStandard) {
        // Only allow tab 3 for non-Standard formats
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, multiSelectMode, selectedCards, selectedDeckCards, deckId, deck, hasUnsavedChanges])
  
  // Initialize basic lands from deck cards (Standard format only)
  useEffect(() => {
    if (deck && deck.format?.toLowerCase() === 'standard') {
      const landsFromDeck: Record<string, number> = {
        'Plains': 0,
        'Island': 0,
        'Swamp': 0,
        'Mountain': 0,
        'Forest': 0
      }
      
      deck.cards.forEach(card => {
        const isBasicLand = card.type_line?.toLowerCase().includes('basic land')
        const landName = card.name
        if (isBasicLand && landsFromDeck.hasOwnProperty(landName) && !card.is_sideboard && card.tags !== 'Sideboard') {
          landsFromDeck[landName] = card.quantity
        }
      })
      
      setBasicLands(landsFromDeck)
    }
  }, [deck])

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
      // Use local deck state if we're checking the current deck (for unsaved changes)
      const deckToCheck = d.id === deck?.id ? deck : d
      const cardInDeck = deckToCheck.cards.find(c => c.scryfall_id === scryfallId)
      if (cardInDeck) {
        totalUsed += cardInDeck.quantity
        decksUsing.push(deckToCheck.name)
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

  // Quick add card to deck (for Standard format)
  const quickAddCardToDeck = async (card: CollectionCard) => {
    const availableQty = getAvailableQuantity(card)
    
    if (availableQty === 0) {
      setToast({
        message: 'No available copies to add',
        type: 'error'
      })
      return
    }
    
    // Check if card already exists in deck
    const existingCard = deck?.cards.find(c => c.scryfall_id === card.scryfall_id && !c.is_sideboard)
    
    if (existingCard) {
      // Increment quantity optimistically (UI only)
      setDeck(prevDeck => {
        if (!prevDeck) return prevDeck
        return {
          ...prevDeck,
          cards: prevDeck.cards.map(c => 
            c.id === existingCard.id 
              ? { ...c, quantity: c.quantity + 1 }
              : c
          )
        }
      })
      setHasUnsavedChanges(true)
    } else {
      // Add new card to deck optimistically (UI only)
      const newCard: DeckCard = {
        id: Date.now(), // Temporary ID for UI
        scryfall_id: card.scryfall_id,
        name: card.name,
        quantity: 1,
        is_commander: false,
        is_sideboard: false,
        mana_cost: card.mana_cost,
        type_line: card.type_line,
        image_uri: card.image_uri,
        colors: card.colors,
        tags: undefined
      }
      
      setDeck(prevDeck => {
        if (!prevDeck) return prevDeck
        return {
          ...prevDeck,
          cards: [...prevDeck.cards, newCard]
        }
      })
      setHasUnsavedChanges(true)
    }
  }
  
  // Save all deck changes to database
  const saveDeckChanges = async () => {
    if (!deck || !hasUnsavedChanges) return
    
    setIsSaving(true)
    try {
      // Get all cards (including sideboard) that need to be synced
      const cardsToSync = deck.cards
      
      // Delete all existing cards and re-add (simplest approach)
      // First, fetch current deck to get real card IDs
      const currentDeckResponse = await fetch(`${API_URL}/api/decks/${deckId}`)
      const currentDeck = await currentDeckResponse.json()
      
      // Delete all existing cards (both main deck and sideboard)
      for (const card of currentDeck.cards) {
        await fetch(`${API_URL}/api/decks/${deckId}/cards/${card.id}`, {
          method: 'DELETE'
        })
      }
      
      // Add all cards from current UI state (including sideboard)
      for (const card of cardsToSync) {
        await fetch(`${API_URL}/api/decks/${deckId}/cards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scryfall_id: card.scryfall_id,
            name: card.name,
            quantity: card.quantity,
            is_commander: card.is_commander,
            is_sideboard: card.tags === 'Sideboard' || card.is_sideboard,
            mana_cost: card.mana_cost,
            type_line: card.type_line,
            image_uri: card.image_uri,
            colors: card.colors,
            tags: card.tags
          })
        })
      }
      
      // Add basic lands (Standard format only)
      if (deck.format?.toLowerCase() === 'standard') {
        for (const [landName, count] of Object.entries(basicLands)) {
          if (count > 0) {
            // Fetch land data from Scryfall
            const scryfallResponse = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(landName)}`)
            const scryfallData = await scryfallResponse.json()
            
            await fetch(`${API_URL}/api/decks/${deckId}/cards`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                scryfall_id: scryfallData.id,
                name: landName,
                quantity: count,
                is_commander: false,
                is_sideboard: false,
                mana_cost: scryfallData.mana_cost || '',
                type_line: scryfallData.type_line,
                image_uri: scryfallData.image_uris?.normal || '',
                colors: scryfallData.colors?.join(',') || '',
                tags: null
              })
            })
          }
        }
      }
      
      // Refresh deck from server
      await fetchDeck()
      await fetchAllDecks()
      
      setHasUnsavedChanges(false)
      setToast({
        message: 'Deck saved successfully!',
        type: 'success'
      })
    } catch (error) {
      console.error('Error saving deck:', error)
      setToast({
        message: 'Failed to save deck',
        type: 'error'
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

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

  const addTagsToSelectedCards = () => {
    // If it's for a single card, use the single card handler
    if (singleCardForTag !== null) {
      addTagToSingleCard()
      return
    }
    
    if (selectedDeckCards.size === 0 || !selectedTagForAssign.trim()) return
    
    const tagToAssign = selectedTagForAssign.trim()
    const cardIds = Array.from(selectedDeckCards)
    
    // Update local state only - keep tags and is_sideboard in sync
    setDeck(prevDeck => {
      if (!prevDeck) return prevDeck
      return {
        ...prevDeck,
        cards: prevDeck.cards.map(c => 
          cardIds.includes(c.id) 
            ? { 
                ...c, 
                tags: tagToAssign,
                is_sideboard: tagToAssign === 'Sideboard'
              }
            : c
        )
      }
    })
    
    // Clear selection and close modal
    setSelectedDeckCards(new Set())
    setShowAssignTagModal(false)
    setSelectedTagForAssign('')
    
    // Remove from pending tags if it was there
    if (pendingTags.has(tagToAssign)) {
      setPendingTags(prev => {
        const newSet = new Set(prev)
        newSet.delete(tagToAssign)
        return newSet
      })
    }
    
    setHasUnsavedChanges(true)
    setToast({
      message: `Tag "${tagToAssign}" added to ${cardIds.length} card${cardIds.length > 1 ? 's' : ''}`,
      type: 'success'
    })
  }

  // Single card operations
  const addCardToTag = (cardId: number, tag: string) => {
    // Update local state only - keep tags and is_sideboard in sync
    setDeck(prevDeck => {
      if (!prevDeck) return prevDeck
      return {
        ...prevDeck,
        cards: prevDeck.cards.map(c => 
          c.id === cardId 
            ? { 
                ...c, 
                tags: tag,
                is_sideboard: tag === 'Sideboard'
              }
            : c
        )
      }
    })
    
    setHasUnsavedChanges(true)
    setToast({
      message: `Card moved to ${tag}`,
      type: 'success'
    })
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

  // Sideboard operations - only move 1 copy
  const addOneToSideboard = (cardId: number) => {
    setDeck(prevDeck => {
      if (!prevDeck) return prevDeck
      
      const card = prevDeck.cards.find(c => c.id === cardId)
      if (!card) return prevDeck
      
      // Check if there's already a sideboard entry for this card (same scryfall_id)
      const existingSideboardCard = prevDeck.cards.find(
        c => c.scryfall_id === card.scryfall_id && 
            (c.tags === 'Sideboard' || c.is_sideboard) &&
            c.id !== cardId
      )
      
      if (card.quantity === 1) {
        // If only 1 copy
        if (existingSideboardCard) {
          // Remove this card and increment existing sideboard
          return {
            ...prevDeck,
            cards: prevDeck.cards
              .filter(c => c.id !== cardId)
              .map(c => 
                c.id === existingSideboardCard.id
                  ? { ...c, quantity: c.quantity + 1 }
                  : c
              )
          }
        } else {
          // Just change tags to sideboard
          return {
            ...prevDeck,
            cards: prevDeck.cards.map(c => 
              c.id === cardId 
                ? { ...c, tags: 'Sideboard', is_sideboard: true }
                : c
            )
          }
        }
      } else {
        // If multiple copies
        if (existingSideboardCard) {
          // Reduce main quantity and increment existing sideboard
          return {
            ...prevDeck,
            cards: prevDeck.cards.map(c => {
              if (c.id === cardId) {
                return { ...c, quantity: c.quantity - 1 }
              }
              if (c.id === existingSideboardCard.id) {
                return { ...c, quantity: c.quantity + 1 }
              }
              return c
            }).filter(c => c.quantity > 0)
          }
        } else {
          // Create new sideboard entry
          const sideboardCard: DeckCard = {
            ...card,
            id: Date.now(), // Temporary ID
            quantity: 1,
            tags: 'Sideboard',
            is_sideboard: true
          }
          
          return {
            ...prevDeck,
            cards: [
              ...prevDeck.cards.map(c => 
                c.id === cardId 
                  ? { ...c, quantity: c.quantity - 1 }
                  : c
              ).filter(c => c.quantity > 0),
              sideboardCard
            ]
          }
        }
      }
    })
    
    setHasUnsavedChanges(true)
    setToast({
      message: '1 copy moved to Sideboard',
      type: 'success'
    })
  }

  // Move all copies to sideboard
  const addAllToSideboard = (cardId: number) => {
    setDeck(prevDeck => {
      if (!prevDeck) return prevDeck
      
      const card = prevDeck.cards.find(c => c.id === cardId)
      if (!card) return prevDeck
      
      return {
        ...prevDeck,
        cards: prevDeck.cards.map(c => 
          c.id === cardId 
            ? { ...c, tags: 'Sideboard', is_sideboard: true }
            : c
        )
      }
    })
    
    setHasUnsavedChanges(true)
    console.log('=== END ADD ALL TO SIDEBOARD ===')
    
    const card = deck?.cards.find(c => c.id === cardId)
    setToast({
      message: `All ${card?.quantity || 0} copies moved to Sideboard`,
      type: 'success'
    })
  }
  
  // Update basic land count (local only - saves with deck)
  const updateBasicLandCount = (landName: string, newCount: number) => {
    if (newCount < 0) return
    
    setBasicLands(prev => ({
      ...prev,
      [landName]: newCount
    }))
    
    setHasUnsavedChanges(true)
    setToast({
      message: `${landName}: ${newCount}`,
      type: 'info'
    })
  }

  const removeSingleCardFromDeck = async (cardId: number) => {
    const isStandardFormat = deck?.format?.toLowerCase() === 'standard'
    
    if (isStandardFormat) {
      // Standard format: Remove optimistically (UI only)
      setDeck(prevDeck => {
        if (!prevDeck) return prevDeck
        return {
          ...prevDeck,
          cards: prevDeck.cards.filter(c => c.id !== cardId)
        }
      })
      setCardMenuOpen(null)
      setHasUnsavedChanges(true)
    } else {
      // Commander format: Make API call immediately
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
  }
  
  // Remove one copy of a card from deck (for Standard format click-to-remove)
  const removeCardCopyFromDeck = (cardId: number) => {
    const isStandardFormat = deck?.format?.toLowerCase() === 'standard'
    
    if (!isStandardFormat) return // Only for Standard format
    
    setDeck(prevDeck => {
      if (!prevDeck) return prevDeck
      
      return {
        ...prevDeck,
        cards: prevDeck.cards.map(c => {
          if (c.id === cardId) {
            // If quantity is 1, we'll filter it out after
            return { ...c, quantity: c.quantity - 1 }
          }
          return c
        }).filter(c => c.quantity > 0) // Remove cards with 0 quantity
      }
    })
    
    setHasUnsavedChanges(true)
  }

  const openTagModalForSingleCard = (cardId: number) => {
    setSingleCardForTag(cardId)
    setShowAssignTagModal(true)
    setCardMenuOpen(null)
  }

  const addTagToSingleCard = () => {
    if (!singleCardForTag || !selectedTagForAssign.trim()) return
    
    const tagToAssign = selectedTagForAssign.trim()
    
    // Update local state only
    setDeck(prevDeck => {
      if (!prevDeck) return prevDeck
      return {
        ...prevDeck,
        cards: prevDeck.cards.map(c => 
          c.id === singleCardForTag 
            ? { ...c, tags: tagToAssign }
            : c
        )
      }
    })
    
    setShowAssignTagModal(false)
    setSelectedTagForAssign('')
    setSingleCardForTag(null)
    
    // Remove from pending tags if it was there
    if (pendingTags.has(tagToAssign)) {
      setPendingTags(prev => {
        const newSet = new Set(prev)
        newSet.delete(tagToAssign)
        return newSet
      })
    }
    
    setHasUnsavedChanges(true)
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

  const deleteTag = (tagName: string) => {
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
    
    // Update local state only - remove tag from all cards that have it
    setDeck(prevDeck => {
      if (!prevDeck) return prevDeck
      return {
        ...prevDeck,
        cards: prevDeck.cards.map(c => 
          c.tags === tagName 
            ? { ...c, tags: undefined }
            : c
        )
      }
    })
    
    setHasUnsavedChanges(true)
  }

  // Filter collection cards (for Standard format)
  const filteredCollection = collection.filter(card => {
    // Search filter: Check name, type_line, mana_cost, and oracle_text (card text)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const name = (card.name || '').toLowerCase()
      const typeLine = (card.type_line || '').toLowerCase()
      const manaCost = (card.mana_cost || '').toLowerCase()
      const oracleText = (card.oracle_text || '').toLowerCase()
      
      if (!name.includes(query) && !typeLine.includes(query) && !manaCost.includes(query) && !oracleText.includes(query)) {
        return false
      }
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

  // Check if deck is Standard format
  const isStandardFormat = deck.format?.toLowerCase() === 'standard'

  // Helper to check if a card is a basic land
  const isBasicLand = (card: DeckCard) => {
    const basicLandNames = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest']
    return card.type_line?.toLowerCase().includes('basic land') && basicLandNames.includes(card.name)
  }

  // For Standard format: exclude basic lands from deck.cards (they're tracked separately in basicLands state)
  // The "Deck (X cards)" count excludes basic lands for Standard since they're shown in separate counter
  // For other formats: count all cards normally
  const totalCards = deck.cards.filter(c => c.tags !== 'Sideboard' && !c.is_sideboard && !isBasicLand(c)).reduce((sum, card) => sum + card.quantity, 0)
  
  // Total including basic lands (for validation and comprehensive count display)
  const totalCardsWithBasicLands = isStandardFormat 
    ? totalCards + Object.values(basicLands).reduce((sum, count) => sum + count, 0)
    : totalCards
    
  const sideboardCards = deck.cards.filter(c => c.tags === 'Sideboard' || c.is_sideboard).reduce((sum, card) => sum + card.quantity, 0)
  const commander = deck.cards.find(c => c.is_commander)

  // Deck validation
  const deckValidation = validateDeck(deck)

  return (
    <div className="page-container">
      {/* Header with Deck Name on Top Left */}
      <div className="deck-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
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
                    {totalCardsWithBasicLands} cards
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
              {/* Deck card count with sideboard and Basic Lands */}
              {deck.format && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                      Deck ({totalCards}{sideboardCards > 0 && (
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {' + '}{sideboardCards} sideboard
                        </span>
                      )})
                    </span>
                    
                    {/* Basic lands counter - Standard format only */}
                    {isStandardFormat && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.25rem 0.75rem',
                        backgroundColor: 'rgba(249, 115, 22, 0.1)',
                        border: '1px solid rgba(249, 115, 22, 0.2)',
                        borderRadius: '6px'
                      }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                          Basic Lands:
                        </span>
                        {[
                          { name: 'Plains', symbol: 'ms ms-w' },
                          { name: 'Island', symbol: 'ms ms-u' },
                          { name: 'Swamp', symbol: 'ms ms-b' },
                          { name: 'Mountain', symbol: 'ms ms-r' },
                          { name: 'Forest', symbol: 'ms ms-g' }
                        ].map(land => (
                          <div key={land.name} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.25rem',
                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px'
                          }}>
                            <button
                              onClick={() => updateBasicLandCount(land.name, Math.max(0, basicLands[land.name] - 1))}
                              style={{
                                width: '20px',
                                height: '20px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0,
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-primary)'
                                e.currentTarget.style.borderColor = 'var(--accent-primary)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
                                e.currentTarget.style.borderColor = 'var(--border-color)'
                              }}
                            >
                              −
                            </button>
                            <i className={land.symbol} style={{ fontSize: '1rem', color: 'var(--text-primary)' }} />
                            <span style={{ 
                              fontSize: '0.875rem', 
                              color: 'var(--text-primary)',
                              minWidth: '1.25rem',
                              textAlign: 'center',
                              fontWeight: '500'
                            }}>
                              {basicLands[land.name]}
                            </span>
                            <button
                              onClick={() => updateBasicLandCount(land.name, basicLands[land.name] + 1)}
                              style={{
                                width: '20px',
                                height: '20px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0,
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-primary)'
                                e.currentTarget.style.borderColor = 'var(--accent-primary)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
                                e.currentTarget.style.borderColor = 'var(--border-color)'
                              }}
                            >
                              +
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!deck.format && <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{totalCards} cards</span>}
              {commander && (
                <span style={{ color: '#f97316' }}>
                  Commander: {commander.name}
                </span>
              )}
            </div>
          </div>
          </div>
          
          {/* Save Button (Standard format only) */}
          {isStandardFormat && activeTab === 'deck' && (
            <button
              onClick={saveDeckChanges}
              disabled={!hasUnsavedChanges || isSaving}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: hasUnsavedChanges ? '#10b981' : 'rgba(16, 185, 129, 0.3)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: hasUnsavedChanges && !isSaving ? 'pointer' : 'not-allowed',
                fontSize: '0.9375rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: hasUnsavedChanges ? 1 : 0.5,
                transition: 'all 0.2s',
                boxShadow: hasUnsavedChanges ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none'
              }}
            >
              {isSaving ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <DeckTabs 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isStandardFormat={isStandardFormat}
      />

      {/* Deck Content */}
      <div style={{ marginTop: '2rem' }}>
        {activeTab === 'deck' && (
          <>
            {isStandardFormat ? (
              /* Standard Format: Horizontal Collection View */
              <>
                <StandardCollectionView 
                  collection={filteredCollection}
                  totalCards={totalCards}
                  getAvailableQuantity={getAvailableQuantity}
                  quickAddCardToDeck={quickAddCardToDeck}
                  setHoveredCard={setHoveredCard}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  typeFilter={typeFilter}
                  setTypeFilter={setTypeFilter}
                  colorFilters={colorFilters}
                  toggleColorFilter={toggleColorFilter}
                  clearAllFilters={clearAllFilters}
                />
                
                {/* Unsaved Changes Indicator */}
                {hasUnsavedChanges && (
                  <div style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    border: '1px solid rgba(249, 115, 22, 0.3)',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: '0.875rem',
                    color: '#f97316'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
                    </svg>
                    <span style={{ fontWeight: '500' }}>
                      You have unsaved changes. Click the "Save Changes" button in the top right to save your deck.
                    </span>
                  </div>
                )}
              </>
            ) : (
              /* Commander Format: Original Layout */
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
              </>
            )}

            {/* Multi-select controls - Show for non-Standard or hide for Standard */}
            <MultiSelectControls
              isStandardFormat={isStandardFormat}
              hasDeckCards={deck.cards.length > 0}
              multiSelectMode={multiSelectMode}
              selectedDeckCards={selectedDeckCards}
              tagsViewMode={tagsViewMode}
              toggleMultiSelectMode={toggleMultiSelectMode}
              removeSelectedCardsFromDeck={removeSelectedCardsFromDeck}
              setShowAssignTagModal={setShowAssignTagModal}
              setTagsViewMode={setTagsViewMode}
              setShowManageTagModal={setShowManageTagModal}
            />

            {/* Deck Display Section */}
            {isStandardFormat ? (
              <StandardDeckDisplay
                deck={deck}
                hoveredCard={hoveredCard}
                commander={commander}
                setHoveredCard={setHoveredCard}
                multiSelectMode={multiSelectMode}
                selectedDeckCards={selectedDeckCards}
                toggleDeckCardSelection={toggleDeckCardSelection}
                cardMenuOpen={cardMenuOpen}
                setCardMenuOpen={setCardMenuOpen}
                removeSingleCardFromDeck={removeSingleCardFromDeck}
                removeCardCopyFromDeck={removeCardCopyFromDeck}
                addCardToTag={addCardToTag}
                promoteCardAsCommander={promoteCardAsCommander}
                onAddToSideboard={addOneToSideboard}
                onAddAllToSideboard={addAllToSideboard}
                allTags={getAllTags(deck, pendingTags)}
                tagsViewMode={tagsViewMode}
              />
            ) : (
              <CommanderDeckDisplay
                deck={deck}
                hoveredCard={hoveredCard}
                commander={commander}
                setHoveredCard={setHoveredCard}
                multiSelectMode={multiSelectMode}
                selectedDeckCards={selectedDeckCards}
                toggleDeckCardSelection={toggleDeckCardSelection}
                cardMenuOpen={cardMenuOpen}
                setCardMenuOpen={setCardMenuOpen}
                removeSingleCardFromDeck={removeSingleCardFromDeck}
                allTags={getAllTags(deck, pendingTags)}
                addCardToTag={addCardToTag}
                promoteCardAsCommander={promoteCardAsCommander}
                onAddToSideboard={addOneToSideboard}
                onAddAllToSideboard={addAllToSideboard}
                tagsViewMode={tagsViewMode}
              />
            )
          }
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
