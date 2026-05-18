'use client'

interface ManageTagsModalProps {
  isOpen: boolean
  onClose: () => void
  tagInput: string
  setTagInput: (value: string) => void
  onCreateTag: () => void
  allTags: string[]
  existingTags: string[]
  defaultTags: string[]
  onDeleteTag: (tag: string) => void
  cardsCount: (tag: string) => number
}

export default function ManageTagsModal({
  isOpen,
  onClose,
  tagInput,
  setTagInput,
  onCreateTag,
  allTags,
  existingTags,
  defaultTags,
  onDeleteTag,
  cardsCount
}: ManageTagsModalProps) {
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>Manage Tags</h2>
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

        {/* Create new tag section */}
        <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
            Create New Tag
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="e.g., Removal, Ramp, Draw..."
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                color: '#1f2937',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#10b981'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && tagInput.trim()) {
                  onCreateTag()
                }
              }}
              autoFocus
            />
            <button
              onClick={onCreateTag}
              disabled={!tagInput.trim()}
              style={{
                padding: '0.75rem 1.25rem',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: 'white',
                backgroundColor: !tagInput.trim() ? '#d1d5db' : '#10b981',
                cursor: !tagInput.trim() ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Create
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
            Tags created here will be available for assignment to cards.
          </p>
          {defaultTags.length > 0 && (
            <p style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '0.25rem', fontStyle: 'italic' }}>
              Note: "{defaultTags.join('", "')}" tag{defaultTags.length > 1 ? 's are' : ' is'} provided by default for this format.
            </p>
          )}
        </div>

        {/* All tags section */}
        <div>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
            All Tags ({allTags.length})
          </h3>
          {allTags.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
              {allTags.map(tag => {
                const isPending = !existingTags.includes(tag)
                const isDefault = defaultTags.includes(tag)
                const count = cardsCount(tag)
                
                return (
                  <div 
                    key={tag}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem',
                      backgroundColor: isDefault ? '#dbeafe' : (isPending ? '#fef3c7' : '#f9fafb'),
                      borderRadius: '8px',
                      border: isDefault ? '1px solid #60a5fa' : (isPending ? '1px solid #fcd34d' : '1px solid #e5e7eb')
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500' }}>
                          {tag}
                        </span>
                        {isDefault && (
                          <span style={{
                            fontSize: '0.625rem',
                            fontWeight: '600',
                            color: '#2563eb',
                            backgroundColor: '#eff6ff',
                            padding: '0.125rem 0.375rem',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.025em'
                          }}>
                            Default
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {isPending ? 'Not assigned yet' : `Used on ${count} card${count !== 1 ? 's' : ''}`}
                      </span>
                    </div>
                    {!isDefault && (
                      <button
                        onClick={() => onDeleteTag(tag)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#ef4444',
                          fontSize: '1.25rem',
                          padding: '0.25rem',
                          lineHeight: '1',
                          fontWeight: '700'
                        }}
                        title={`Delete tag "${tag}"`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
              No tags created yet. Create tags above to get started.
            </p>
          )}
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
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
            Done
          </button>
        </div>
      </div>
    </>
  )
}
