'use client'

interface DeckTabsProps {
  activeTab: 'deck' | 'mana-curve' | 'add-cards'
  setActiveTab: (tab: 'deck' | 'mana-curve' | 'add-cards') => void
  isStandardFormat: boolean
}

export default function DeckTabs({
  activeTab,
  setActiveTab,
  isStandardFormat
}: DeckTabsProps) {
  return (
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
      
      {/* Only show Add Cards tab for non-Standard formats */}
      {!isStandardFormat && (
        <button
          className={`decks-tab ${activeTab === 'add-cards' ? 'active' : ''}`}
          onClick={() => setActiveTab('add-cards')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
          </svg>
          Add Cards
        </button>
      )}
    </div>
  )
}
