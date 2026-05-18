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
  mana_cost?: string
  type_line: string
  oracle_text?: string
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

interface CollectionCard {
  id: number
  scryfall_id: string
  name: string
  folder_id?: number
  set_code?: string
  set_name?: string
  rarity?: string
  mana_cost?: string
  type_line?: string
  image_uri?: string
  quantity: number
  colors?: string
}

interface Folder {
  id: number
  name: string
  description?: string
  color: string
  created_at: string
  card_count: number
}

export default function CollectionPage() {
  const [collection, setCollection] = useState<CollectionCard[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null)
  const [collectionFilter, setCollectionFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [colorFilters, setColorFilters] = useState<Set<string>>(new Set())
  const [showNewFolderForm, setShowNewFolderForm] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderDescription, setNewFolderDescription] = useState('')
  const [newFolderColor, setNewFolderColor] = useState('#f97316')
  const [selectedCardForMove, setSelectedCardForMove] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set())
  const [showBulkMoveMenu, setShowBulkMoveMenu] = useState(false)
  const [selectedCardDetails, setSelectedCardDetails] = useState<ScryfallCard | null>(null)
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0)
  const [loadingCardDetails, setLoadingCardDetails] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importingCSV, setImportingCSV] = useState(false)
  const [importResult, setImportResult] = useState<any | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })

  useEffect(() => {
    fetchData()
  }, [selectedFolder])

  // Reset face index when card details change
  useEffect(() => {
    setCurrentFaceIndex(0)
  }, [selectedCardDetails])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchCollection(), fetchFolders()])
    setLoading(false)
  }

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
      let url = `${API_URL}/api/collection/`
      if (selectedFolder !== null) {
        url += `?folder_id=${selectedFolder}`
      }
      const response = await fetch(url)
      const data = await response.json()
      setCollection(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching collection:', error)
      setCollection([])
    }
  }

  const fetchCardDetails = async (scryfallId: string) => {
    setLoadingCardDetails(true)
    try {
      const response = await fetch(`https://api.scryfall.com/cards/${scryfallId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedCardDetails(data)
      }
    } catch (error) {
      console.error('Error fetching card details:', error)
    } finally {
      setLoadingCardDetails(false)
    }
  }

  // Helper functions for double-sided cards
  const getCardImage = (card: ScryfallCard, size: 'small' | 'normal' | 'large' = 'normal', faceIndex: number = 0) => {
    if (card.image_uris) {
      return card.image_uris[size]
    }
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
    if (selectedCardDetails && isDoubleSided(selectedCardDetails)) {
      setCurrentFaceIndex((prev) => (prev + 1) % selectedCardDetails.card_faces!.length)
    }
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    
    try {
      const response = await fetch(`${API_URL}/api/collection/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName,
          description: newFolderDescription,
          color: newFolderColor
        })
      })
      
      if (response.ok) {
        fetchFolders()
        setNewFolderName('')
        setNewFolderDescription('')
        setNewFolderColor('#3b82f6')
        setShowNewFolderForm(false)
      }
    } catch (error) {
      console.error('Error creating folder:', error)
    }
  }

  const deleteFolder = async (folderId: number) => {
    if (!confirm('Delete this folder? Cards will be moved to "All Cards".')) return
    
    try {
      const response = await fetch(`${API_URL}/api/collection/folders/${folderId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        fetchFolders()
        if (selectedFolder === folderId) {
          setSelectedFolder(null)
        }
        fetchCollection()
      }
    } catch (error) {
      console.error('Error deleting folder:', error)
    }
  }

  const moveCardToFolder = async (cardId: number, folderId: number | null) => {
    try {
      const response = await fetch(
        `${API_URL}/api/collection/${cardId}/folder?folder_id=${folderId ?? ''}`,
        { method: 'PATCH' }
      )
      
      if (response.ok) {
        fetchCollection()
        fetchFolders()
        setSelectedCardForMove(null)
      }
    } catch (error) {
      console.error('Error moving card:', error)
    }
  }

  const bulkMoveToFolder = async (folderId: number | null) => {
    try {
      const promises = Array.from(selectedCards).map(cardId =>
        fetch(
          `${API_URL}/api/collection/${cardId}/folder?folder_id=${folderId ?? ''}`,
          { method: 'PATCH' }
        )
      )
      
      await Promise.all(promises)
      fetchCollection()
      fetchFolders()
      setSelectedCards(new Set())
      setShowBulkMoveMenu(false)
      setSelectionMode(false)
    } catch (error) {
      console.error('Error moving cards:', error)
    }
  }

  const bulkDeleteCards = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedCards.size} card(s) from your collection? This cannot be undone.`)) {
      return
    }

    try {
      const promises = Array.from(selectedCards).map(cardId =>
        fetch(`${API_URL}/api/collection/${cardId}`, {
          method: 'DELETE'
        })
      )
      
      await Promise.all(promises)
      fetchCollection()
      fetchFolders()
      setSelectedCards(new Set())
      setSelectionMode(false)
    } catch (error) {
      console.error('Error deleting cards:', error)
    }
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

  const selectAllCards = () => {
    setSelectedCards(new Set(filteredCollection.map(c => c.id)))
  }

  const deselectAllCards = () => {
    setSelectedCards(new Set())
  }

  const updateQuantity = async (cardId: number, newQuantity: number) => {
    try {
      const response = await fetch(
        `${API_URL}/api/collection/${cardId}/quantity?quantity=${newQuantity}`,
        { method: 'PATCH' }
      )
      if (response.ok) {
        fetchCollection()
        fetchFolders()
      }
    } catch (error) {
      console.error('Error updating quantity:', error)
    }
  }

  const removeFromCollection = async (cardId: number) => {
    if (!confirm('Remove this card from your collection?')) return
    
    try {
      const response = await fetch(`${API_URL}/api/collection/${cardId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        fetchCollection()
        fetchFolders()
      }
    } catch (error) {
      console.error('Error removing card:', error)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file)
      setImportResult(null)
      setImportProgress({ current: 0, total: 0 })
    } else if (file) {
      alert('Please select a CSV file')
      event.target.value = ''
      setSelectedFile(null)
    }
  }

  const startImport = async () => {
    if (!selectedFile) return

    setImportingCSV(true)
    setImportResult(null)
    setImportProgress({ current: 0, total: 0 })

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const url = selectedFolder 
        ? `${API_URL}/api/collection/import-csv?folder_id=${selectedFolder}`
        : `${API_URL}/api/collection/import-csv`

      // Use fetch to POST the file, then read the SSE stream from the response
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to start import')
      }

      // Read the SSE stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) {
        throw new Error('No response body')
      }

      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        
        // Process complete SSE messages
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || '' // Keep incomplete message in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.substring(6))
            
            if (data.type === 'start') {
              setImportProgress({ current: 0, total: data.total })
            } else if (data.type === 'progress') {
              setImportProgress({ current: data.current, total: data.total })
            } else if (data.type === 'complete') {
              setImportResult(data)
              fetchCollection()
              fetchFolders()
              
              // Auto-close modal after 2 seconds on success
              setTimeout(() => {
                setShowImportModal(false)
                setImportResult(null)
                setSelectedFile(null)
                setImportProgress({ current: 0, total: 0 })
              }, 2000)
            } else if (data.type === 'error') {
              setImportResult({
                status: 'error',
                message: data.message || 'Failed to import CSV'
              })
            }
          }
        }
      }
    } catch (error) {
      console.error('Error importing CSV:', error)
      setImportResult({
        status: 'error',
        message: 'An error occurred while importing'
      })
    } finally {
      setImportingCSV(false)
    }
  }

  const closeImportModal = () => {
    setShowImportModal(false)
    setImportResult(null)
    setSelectedFile(null)
    setImportProgress({ current: 0, total: 0 })
    setImportingCSV(false)
    // Reset file input
    const fileInput = document.getElementById('csv-upload') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
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
    setCollectionFilter('')
  }

  const filteredCollection = collection.filter(card => {
    // Name filter
    if (!card.name.toLowerCase().includes(collectionFilter.toLowerCase())) {
      return false
    }

    // Type filter
    if (typeFilter !== 'all') {
      const typeLine = card.type_line?.toLowerCase() || ''
      if (typeFilter === 'creature' && !typeLine.includes('creature')) return false
      if (typeFilter === 'instant' && !typeLine.includes('instant')) return false
      if (typeFilter === 'sorcery' && !typeLine.includes('sorcery')) return false
      if (typeFilter === 'artifact' && !typeLine.includes('artifact')) return false
      if (typeFilter === 'enchantment' && !typeLine.includes('enchantment')) return false
      if (typeFilter === 'planeswalker' && !typeLine.includes('planeswalker')) return false
      if (typeFilter === 'land' && !typeLine.includes('land')) return false
    }

    // Color filter - multi-color cards only show if ALL their colors are selected
    if (colorFilters.size > 0) {
      const cardColors = card.colors ? card.colors.split(',') : []
      
      // If card has no colors (colorless), only show if no colors are selected
      // or if user hasn't selected any colors
      if (cardColors.length === 0) {
        // Colorless cards don't match any color filter
        return false
      }
      
      // Check if ALL card colors are in the selected filters
      const allColorsSelected = cardColors.every((color: string) => colorFilters.has(color))
      if (!allColorsSelected) {
        return false
      }
    }

    return true
  })

  const totalCards = collection.reduce((sum, card) => sum + card.quantity, 0)

  const folderColors = [
    '#f97316', '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#ec4899', '#14b8a6', '#7c3aed', '#06b6d4', '#84cc16'
  ]

  return (
    <div className="collection-page">
      <div className="collection-header">
        <div>
          <h1 className="page-title">My Collection</h1>
          <p className="page-subtitle">
            {totalCards.toLocaleString()} total cards across {filteredCollection.length} unique
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button 
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowImportModal(true)
            }}
            className="btn btn-primary"
            type="button"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 16V10H5L12 3L19 10H15V16H9ZM5 20V18H19V20H5Z" fill="currentColor"/>
            </svg>
            Import CSV
          </button>
          <div className="collection-search-bar">
            <span className="search-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" fill="currentColor"/>
              </svg>
            </span>
            <input
              type="text"
              value={collectionFilter}
              onChange={(e) => setCollectionFilter(e.target.value)}
              placeholder="Search your collection..."
              className="search-input-inline"
            />
            {collectionFilter && (
              <button 
                onClick={() => setCollectionFilter('')}
                className="btn-clear"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters Section */}
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

        {(typeFilter !== 'all' || colorFilters.size > 0 || collectionFilter !== '') && (
          <button onClick={clearAllFilters} className="btn btn-sm btn-secondary clear-filters-btn">
            Clear Filters
          </button>
        )}
      </div>
      
      <div className="collection-actions">
        {selectionMode ? (
          <div className="selection-toolbar">
            <button onClick={() => { setSelectionMode(false); setSelectedCards(new Set()); }} className="btn btn-sm">
              Cancel
            </button>
            <button onClick={selectAllCards} className="btn btn-sm">
              Select All
            </button>
            <button onClick={deselectAllCards} className="btn btn-sm">
              Deselect All
            </button>
            <span className="selection-count">{selectedCards.size} selected</span>
            {selectedCards.size > 0 && (
              <>
                <button onClick={() => setShowBulkMoveMenu(!showBulkMoveMenu)} className="btn btn-sm btn-orange">
                  Move to Folder
                </button>
                <button 
                  onClick={bulkDeleteCards} 
                  className="btn btn-sm"
                  style={{ 
                    backgroundColor: '#ef4444', 
                    borderColor: '#dc2626',
                    color: 'white'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '4px' }}>
                    <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z" fill="currentColor"/>
                  </svg>
                  Delete Selected
                </button>
              </>
            )}
          </div>
        ) : (
          <button onClick={() => setSelectionMode(true)} className="btn btn-sm btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '4px' }}>
              <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM17.99 9L16.58 7.58L9.99 14.17L7.41 11.6L5.99 13.01L9.99 17L17.99 9Z" fill="currentColor"/>
            </svg>
            Select Multiple
          </button>
        )}
      </div>
      
      <div className="collection-layout">
        {/* Folders Sidebar */}
        <div className="folders-sidebar">
          <div className="sidebar-header">
            <h2>Folders</h2>
            <button 
              onClick={() => setShowNewFolderForm(!showNewFolderForm)}
              className="btn-icon btn-icon-primary"
              title="Create new folder"
            >
              {showNewFolderForm ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor"/>
                </svg>
              )}
            </button>
          </div>

          {showNewFolderForm && (
            <div className="new-folder-form">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="input input-sm"
              />
              <textarea
                value={newFolderDescription}
                onChange={(e) => setNewFolderDescription(e.target.value)}
                placeholder="Description (optional)"
                className="textarea input-sm"
                rows={2}
              />
              <div className="color-picker">
                <label>Choose color:</label>
                <div className="color-options">
                  {folderColors.map(color => (
                    <button
                      key={color}
                      className={`color-option ${newFolderColor === color ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewFolderColor(color)}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
              </div>
              <button onClick={createFolder} className="btn btn-sm btn-primary w-full">
                Create Folder
              </button>
            </div>
          )}

          <div className="folder-list">
            <div 
              className={`folder-item ${selectedFolder === null ? 'active' : ''}`}
              onClick={() => setSelectedFolder(null)}
            >
              <span className="folder-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 13H15V11H3V13ZM3 17H11V15H3V17ZM3 9H15V7H3V9ZM16 17H18V13H22V11H18V7H16V17Z" fill="currentColor"/>
                </svg>
              </span>
              <div className="folder-info">
                <span className="folder-name">All Cards</span>
                <span className="folder-count">{totalCards}</span>
              </div>
            </div>

            {folders.length > 0 && <div className="folder-divider" />}

            {folders.map(folder => (
              <div 
                key={folder.id}
                className={`folder-item ${selectedFolder === folder.id ? 'active' : ''}`}
                onClick={() => setSelectedFolder(folder.id)}
              >
                <span className="folder-icon" style={{ color: folder.color }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6H12L10 4Z" fill="currentColor"/>
                  </svg>
                </span>
                <div className="folder-info">
                  <span className="folder-name">{folder.name}</span>
                  <span className="folder-count">{folder.card_count}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteFolder(folder.id)
                  }}
                  className="folder-delete"
                  aria-label="Delete folder"
                >
                  ✕
                </button>
              </div>
            ))}

            {folders.length === 0 && !showNewFolderForm && (
              <div className="empty-folders">
                <p>No folders yet</p>
                <span className="text-hint">Click + to create one</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="collection-main">
          {loading ? (
            <div className="loading-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card-skeleton">
                  <div className="skeleton-image" />
                  <div className="skeleton-text" />
                  <div className="skeleton-text skeleton-text-sm" />
                </div>
              ))}
            </div>
          ) : filteredCollection.length === 0 ? (
            <div className="empty-state-large">
              <div className="empty-state-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z" fill="currentColor" opacity="0.3"/>
                </svg>
              </div>
              <h3 className="empty-state-title">
                {collectionFilter ? 'No cards match your search' : 'No cards here yet'}
              </h3>
              <p className="empty-state-description">
                {collectionFilter ? (
                  <>Try a different search term or clear your filter</>
                ) : (
                  <>Head to the <a href="/search" className="link-primary">Search page</a> to find and add cards to your collection</>
                )}
              </p>
              {collectionFilter && (
                <button 
                  onClick={() => setCollectionFilter('')}
                  className="btn btn-primary"
                >
                  Clear Filter
                </button>
              )}
            </div>
          ) : (
            <div className="card-grid card-grid-collection">
              {showBulkMoveMenu && (
                <div className="bulk-move-menu">
                  <div className="bulk-move-menu-content">
                    <h3>Move {selectedCards.size} card(s) to:</h3>
                    <div className="bulk-move-folders">
                      <button onClick={() => bulkMoveToFolder(null)} className="bulk-move-option">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 13H15V11H3V13ZM3 17H11V15H3V17ZM3 9H15V7H3V9ZM16 17H18V13H22V11H18V7H16V17Z" fill="currentColor"/>
                        </svg>
                        All Cards (No Folder)
                      </button>
                      {folders.map(folder => (
                        <button key={folder.id} onClick={() => bulkMoveToFolder(folder.id)} className="bulk-move-option">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: folder.color }}>
                            <path d="M10 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6H12L10 4Z" fill="currentColor"/>
                          </svg>
                          {folder.name}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setShowBulkMoveMenu(false)} className="btn btn-sm" style={{ marginTop: '1rem' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {filteredCollection.map(card => (
                <div key={card.id} className={`collection-card ${selectedCards.has(card.id) ? 'selected' : ''}`}>
                  {selectionMode && (
                    <div className="card-checkbox-wrapper">
                      <input
                        type="checkbox"
                        checked={selectedCards.has(card.id)}
                        onChange={() => toggleCardSelection(card.id)}
                        className="card-checkbox"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                  <div 
                    className="card-image-wrapper" 
                    onClick={() => selectionMode ? toggleCardSelection(card.id) : fetchCardDetails(card.scryfall_id)}
                    style={{ cursor: 'pointer' }}
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
                    <div className="card-quantity-badge">{card.quantity}x</div>
                  </div>
                  
                  <div className="quantity-controls">
                    <button 
                      onClick={() => updateQuantity(card.id, Math.max(0, card.quantity - 1))}
                      className="btn-quantity"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="quantity-display">{card.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(card.id, card.quantity + 1)}
                      className="btn-quantity"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => removeFromCollection(card.id)}
                    className="btn-delete-card"
                    title="Remove card"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z" fill="white"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
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
                    {getCardImage(selectedCardDetails, 'normal', currentFaceIndex) && (
                      <div style={{ position: 'relative' }}>
                        <img 
                          src={getCardImage(selectedCardDetails, 'normal', currentFaceIndex)!} 
                          alt={getCurrentFace(selectedCardDetails, currentFaceIndex).name} 
                          className="card-image-large" 
                        />
                        {isDoubleSided(selectedCardDetails) && (
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
                      <h3 className="card-detail-name">{getCurrentFace(selectedCardDetails, currentFaceIndex).name}</h3>
                      <div className="card-icons">
                        <span className="card-mana-symbols">{getCurrentFace(selectedCardDetails, currentFaceIndex).mana_cost || ''}</span>
                      </div>
                    </div>
                    
                    <p className="card-type-large">{getCurrentFace(selectedCardDetails, currentFaceIndex).type_line}</p>
                    
                    {getCurrentFace(selectedCardDetails, currentFaceIndex).oracle_text && (
                      <div className="oracle-text-clean">
                        <p>{getCurrentFace(selectedCardDetails, currentFaceIndex).oracle_text}</p>
                      </div>
                    )}

                    {selectedCardDetails.prices?.usd && (
                      <div className="card-price-display">
                        <span className="price-label">Market Price:</span>
                        <span className="price-value">${selectedCardDetails.prices.usd}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <>
          <div 
            className="modal-backdrop" 
            onClick={closeImportModal}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              zIndex: 9998,
              backdropFilter: 'blur(4px)'
            }}
          ></div>
          <div 
            className="modal-container"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1rem'
            }}
          >
            <div className="modal-content" style={{ 
              maxWidth: '600px',
              width: '100%',
              backgroundColor: '#1f2937',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative'
            }}>
              <div className="modal-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                position: 'sticky',
                top: 0,
                backgroundColor: '#1f2937',
                zIndex: 10
              }}>
                <h2 className="modal-title" style={{ fontSize: '1.5rem', fontWeight: '600', margin: 0, color: 'white' }}>Import Cards from CSV</h2>
                <button 
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    closeImportModal()
                  }} 
                  type="button" 
                  style={{
                    background: '#ef4444',
                    border: '2px solid #dc2626',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    minWidth: '40px',
                    minHeight: '40px',
                    fontSize: '20px',
                    fontWeight: 'bold'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#dc2626'
                    e.currentTarget.style.transform = 'scale(1.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ef4444'
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body" style={{ padding: '1.5rem' }}>
                {!importResult ? (
                  <>
                    <p style={{ marginBottom: '1rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                      Upload a CSV file to import cards into your collection.
                      {selectedFolder && (
                        <span style={{ display: 'block', marginTop: '0.5rem', color: '#60a5fa' }}>
                          Cards will be added to: {folders.find(f => f.id === selectedFolder)?.name || 'selected folder'}
                        </span>
                      )}
                    </p>
                    
                    <div style={{ 
                      border: '2px dashed rgba(255, 255, 255, 0.2)', 
                      borderRadius: '8px', 
                      padding: '2rem',
                      textAlign: 'center',
                      marginBottom: '1rem',
                      backgroundColor: selectedFile ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                      borderColor: selectedFile ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.2)'
                    }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto 1rem', opacity: 0.5 }}>
                        <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20ZM8 15.01L9.41 16.42L11 14.84V19H13V14.84L14.59 16.43L16 15.01L12.01 11L8 15.01Z" fill="currentColor"/>
                      </svg>
                      
                      {selectedFile ? (
                        <div style={{ marginBottom: '1rem' }}>
                          <div style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            marginBottom: '0.5rem'
                          }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#10b981' }}>
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
                            </svg>
                            <span style={{ fontWeight: '600', color: '#10b981' }}>{selectedFile.name}</span>
                          </div>
                          <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                            {(selectedFile.size / 1024).toFixed(2)} KB
                          </div>
                        </div>
                      ) : (
                        <label 
                          htmlFor="csv-upload" 
                          className="btn btn-primary"
                          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 16V10H5L12 3L19 10H15V16H9ZM5 20V18H19V20H5Z" fill="currentColor"/>
                          </svg>
                          Choose CSV File
                        </label>
                      )}
                      
                      <input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        disabled={importingCSV}
                        style={{ display: 'none' }}
                      />
                      
                      {selectedFile && !importingCSV && (
                        <div style={{ marginTop: '1rem' }}>
                          <label 
                            htmlFor="csv-upload" 
                            className="btn btn-ghost"
                            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                          >
                            Choose Different File
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Progress with Real-time Updates */}
                    {importingCSV && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '0.5rem'
                        }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>Importing cards from CSV...</span>
                          <span style={{ fontSize: '0.875rem', color: '#60a5fa' }}>
                            {importProgress.current} / {importProgress.total}
                          </span>
                        </div>
                        <div style={{ 
                          width: '100%', 
                          height: '8px', 
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%`,
                            backgroundColor: '#60a5fa',
                            transition: 'width 0.3s ease',
                            borderRadius: '4px'
                          }}></div>
                        </div>
                        <div style={{ 
                          marginTop: '0.75rem',
                          padding: '0.75rem',
                          backgroundColor: 'rgba(96, 165, 250, 0.1)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.875rem',
                          color: 'rgba(255, 255, 255, 0.7)'
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="rotating">
                            <path d="M12 4V1L8 5L12 9V6C15.31 6 18 8.69 18 12C18 13.01 17.75 13.97 17.3 14.8L18.76 16.26C19.54 15.03 20 13.57 20 12C20 7.58 16.42 4 12 4Z" fill="currentColor"/>
                          </svg>
                          Fetching card details from Scryfall...
                        </div>
                      </div>
                    )}

                    <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '1.5rem' }}>
                      <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Expected CSV Format:</p>
                      <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
                        <li>Name - Card name</li>
                        <li>Scryfall ID - Unique card identifier (required)</li>
                        <li>Quantity - Number of copies</li>
                        <li>Purchase price - Original purchase price (optional)</li>
                        <li>Set code, Set name, Rarity, etc.</li>
                      </ul>
                    </div>

                    {/* Import Button - Bottom Right */}
                    {selectedFile && !importingCSV && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button 
                          onClick={startImport}
                          className="btn btn-primary"
                          style={{ 
                            paddingLeft: '1.5rem', 
                            paddingRight: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 16V10H5L12 3L19 10H15V16H9ZM5 20V18H19V20H5Z" fill="currentColor"/>
                          </svg>
                          Import
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    {importResult.status === 'success' ? (
                      <div style={{ textAlign: 'center' }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto 1rem', color: '#10b981' }}>
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
                        </svg>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Import Complete!</h3>
                        <div style={{ 
                          backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: '8px',
                          padding: '1rem',
                          marginBottom: '1rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                            <div>
                              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>
                                {importResult.imported}
                              </div>
                              <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                                Imported
                              </div>
                            </div>
                            {importResult.skipped > 0 && (
                              <div>
                                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>
                                  {importResult.skipped}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                                  Updated
                                </div>
                              </div>
                            )}
                            {importResult.failed > 0 && (
                              <div>
                                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444' }}>
                                  {importResult.failed}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                                  Failed
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {importResult.failed_cards && importResult.failed_cards.length > 0 && (
                          <div style={{ 
                            textAlign: 'left',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '8px',
                            padding: '1rem',
                            marginTop: '1rem'
                          }}>
                            <p style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                              Failed imports (showing first 10):
                            </p>
                            <ul style={{ fontSize: '0.75rem', paddingLeft: '1.5rem', lineHeight: '1.6', color: 'rgba(255, 255, 255, 0.7)' }}>
                              {importResult.failed_cards.map((fail: any, idx: number) => (
                                <li key={idx}>
                                  Row {fail.row}: {fail.name || fail.scryfall_id} - {fail.reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <button 
                          onClick={closeImportModal}
                          className="btn btn-primary"
                          style={{ marginTop: '1.5rem', width: '100%' }}
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto 1rem', color: '#ef4444' }}>
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
                        </svg>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#ef4444' }}>Import Failed</h3>
                        <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1.5rem' }}>
                          {importResult.message}
                        </p>
                        <button 
                          onClick={() => setImportResult(null)}
                          className="btn btn-primary"
                          style={{ width: '100%' }}
                        >
                          Try Again
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
