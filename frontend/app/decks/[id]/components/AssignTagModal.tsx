'use client'

interface AssignTagModalProps {
  isOpen: boolean
  onClose: () => void
  selectedTagForAssign: string
  setSelectedTagForAssign: (tag: string) => void
  allTags: string[]
  onAssign: () => void
  isSingleCard: boolean
  selectedCardsCount: number
}

export default function AssignTagModal({
  isOpen,
  onClose,
  selectedTagForAssign,
  setSelectedTagForAssign,
  allTags,
  onAssign,
  isSingleCard,
  selectedCardsCount
}: AssignTagModalProps) {
  if (!isOpen) return null

  return (
    <>
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}
        onClick={onClose}
      />
      <div 
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          width: '90%',
          maxWidth: '500px',
          zIndex: 10000,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>Add Tag to Cards</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0.25rem'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
            Select Tag
          </label>
          <select
            value={selectedTagForAssign}
            onChange={(e) => setSelectedTagForAssign(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '1rem',
              color: '#1f2937',
              outline: 'none',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
            autoFocus
          >
            <option value="">Select a tag...</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
            {isSingleCard 
              ? 'This tag will replace the existing tag on this card'
              : `This tag will replace existing tags on ${selectedCardsCount} selected card${selectedCardsCount > 1 ? 's' : ''}`
            }
          </p>
          {allTags.length === 0 && (
            <p style={{ fontSize: '0.75rem', color: '#f97316', marginTop: '0.5rem', fontWeight: '600' }}>
              No tags available. Use "Manage Tags" to create new tags.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.625rem 1.25rem',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#6b7280',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onAssign}
            disabled={!selectedTagForAssign.trim()}
            style={{
              padding: '0.625rem 1.25rem',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: 'white',
              backgroundColor: !selectedTagForAssign.trim() ? '#d1d5db' : '#f97316',
              cursor: !selectedTagForAssign.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            Add Tag
          </button>
        </div>
      </div>
    </>
  )
}
