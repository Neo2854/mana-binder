'use client'

interface MultiSelectControlsProps {
  isStandardFormat: boolean
  hasDeckCards: boolean
  multiSelectMode: boolean
  selectedDeckCards: Set<number>
  tagsViewMode: boolean
  toggleMultiSelectMode: () => void
  removeSelectedCardsFromDeck: () => Promise<void>
  setShowAssignTagModal: (show: boolean) => void
  setTagsViewMode: (mode: boolean) => void
  setShowManageTagModal: (show: boolean) => void
}

export default function MultiSelectControls({
  isStandardFormat,
  hasDeckCards,
  multiSelectMode,
  selectedDeckCards,
  tagsViewMode,
  toggleMultiSelectMode,
  removeSelectedCardsFromDeck,
  setShowAssignTagModal,
  setTagsViewMode,
  setShowManageTagModal
}: MultiSelectControlsProps) {
  if (!hasDeckCards) {
    return null
  }

  return (
    <div style={{ 
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      flexWrap: 'wrap'
    }}>
      {/* Left side - Multi-select controls (for both formats) */}
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

      {/* Right side - Tags view controls (for both formats) */}
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
  )
}
