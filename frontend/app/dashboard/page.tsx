'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Stats {
  totalCards: number
  uniqueCards: number
  totalDecks: number
  collectionValue: number
}

interface ValueAnalysis {
  current_value: number
  purchase_value: number
  total_gain_loss: number
  percentage_change: number
  card_count: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalCards: 0,
    uniqueCards: 0,
    totalDecks: 0,
    collectionValue: 0
  })
  const [valueAnalysis, setValueAnalysis] = useState<ValueAnalysis | null>(null)
  const [loadingValue, setLoadingValue] = useState(false)
  const [loadingStats, setLoadingStats] = useState(true)
  const [updatingPrices, setUpdatingPrices] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoadingStats(true)
    try {
      // Fetch basic stats
      const statsRes = await fetch(`${API_URL}/api/collection/stats`)
      const statsData = await statsRes.json()
      
      setStats(prev => ({
        ...prev,
        totalCards: statsData.total_cards || 0,
        uniqueCards: statsData.unique_cards || 0,
        totalDecks: statsData.total_decks || 0
      }))
      setLoadingStats(false)
      
      // Fetch collection value analysis (this may take longer)
      setLoadingValue(true)
      const valueRes = await fetch(`${API_URL}/api/collection/value-analysis`)
      const valueData = await valueRes.json()
      
      setValueAnalysis(valueData)
      setStats(prev => ({
        ...prev,
        collectionValue: valueData.current_value || 0
      }))
      setLoadingValue(false)
      
    } catch (error) {
      console.error('Error fetching stats:', error)
      setLoadingStats(false)
      setLoadingValue(false)
    }
  }

  const updatePrices = async () => {
    setUpdatingPrices(true)
    try {
      const response = await fetch(`${API_URL}/api/collection/update-prices`, {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.status === 'success') {
        // Refresh stats after price update
        await fetchStats()
      } else {
        console.error('Price update failed:', data.message)
      }
    } catch (error) {
      console.error('Error updating prices:', error)
    } finally {
      setUpdatingPrices(false)
    }
  }

  const isPositive = valueAnalysis && valueAnalysis.total_gain_loss >= 0
  const percentageDisplay = valueAnalysis ? Math.abs(valueAnalysis.percentage_change).toFixed(2) : '0.00'

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Welcome back, Planeswalker</h1>
          <p className="dashboard-subtitle">Here's what's happening with your collection today</p>
        </div>
        <button onClick={fetchStats} className="btn btn-ghost" disabled={loadingStats}>
          {loadingStats ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="rotating">
              <path d="M12 4V1L8 5L12 9V6C15.31 6 18 8.69 18 12C18 13.01 17.75 13.97 17.3 14.8L18.76 16.26C19.54 15.03 20 13.57 20 12C20 7.58 16.42 4 12 4Z" fill="currentColor"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4.01 7.58 4.01 12C4.01 16.42 7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z" fill="currentColor"/>
            </svg>
          )} Refresh
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card-primary">
          <div className="stat-icon-wrapper">
            <div className="stat-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C13.28 6.9 13.94 7.75 14 9H16.21C16.14 7.28 15.09 5.7 13 5.19V3H10V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.44 17.1 8.63 16.18 8.52 15H6.32C6.44 17.19 8.08 18.42 10 18.83V21H13V18.85C14.95 18.48 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.49 11.8 10.9Z" fill="currentColor"/>
              </svg>
            </div>
          </div>
          <div className="stat-content">
            <div className="stat-label">Collection Value</div>
            {loadingValue ? (
              <div className="stat-value skeleton-text">$0.00</div>
            ) : (
              <>
                <div className="stat-value">${stats.collectionValue.toFixed(2)}</div>
                {valueAnalysis && valueAnalysis.purchase_value > 0 && (
                  <div style={{ 
                    marginTop: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem'
                  }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      Purchase: ${valueAnalysis.purchase_value.toFixed(2)}
                    </span>
                    <span style={{
                      color: isPositive ? '#10b981' : '#ef4444',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      {isPositive ? '▲' : '▼'} {percentageDisplay}%
                    </span>
                  </div>
                )}
                {valueAnalysis && (
                  <div style={{
                    marginTop: '0.25rem',
                    fontSize: '0.75rem',
                    color: isPositive ? '#10b981' : '#ef4444',
                    fontWeight: '500'
                  }}>
                    {isPositive ? '+' : ''}${valueAnalysis.total_gain_loss.toFixed(2)} {isPositive ? 'gain' : 'loss'}
                  </div>
                )}
              </>
            )}
            <div className="stat-sublabel">
              {loadingValue ? 'Calculating current prices...' : 'Current market value'}
            </div>
            <button 
              onClick={updatePrices} 
              disabled={updatingPrices}
              className="btn btn-sm btn-ghost"
              style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}
            >
              {updatingPrices ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="rotating" style={{ marginRight: '4px' }}>
                    <path d="M12 4V1L8 5L12 9V6C15.31 6 18 8.69 18 12C18 13.01 17.75 13.97 17.3 14.8L18.76 16.26C19.54 15.03 20 13.57 20 12C20 7.58 16.42 4 12 4Z" fill="currentColor"/>
                  </svg>
                  Updating prices...
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '4px' }}>
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4.01 7.58 4.01 12C4.01 16.42 7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z" fill="currentColor"/>
                  </svg>
                  Update Prices
                </>
              )}
            </button>
          </div>
        </div>

        <div className="stat-card stat-card-secondary">
          <div className="stat-icon-wrapper">
            <div className="stat-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 13H15V11H3V13ZM3 17H11V15H3V17ZM3 9H15V7H3V9ZM16 17H18V13H22V11H18V7H16V17Z" fill="currentColor"/>
              </svg>
            </div>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Cards</div>
            {loadingStats ? (
              <div className="stat-value skeleton-text">0</div>
            ) : (
              <div className="stat-value">{stats.totalCards.toLocaleString()}</div>
            )}
            <div className="stat-sublabel">{stats.uniqueCards} unique cards</div>
          </div>
        </div>

        <div className="stat-card stat-card-accent">
          <div className="stat-icon-wrapper">
            <div className="stat-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z" fill="currentColor"/>
              </svg>
            </div>
          </div>
          <div className="stat-content">
            <div className="stat-label">Decks</div>
            {loadingStats ? (
              <div className="stat-value skeleton-text">0</div>
            ) : (
              <div className="stat-value">{stats.totalDecks}</div>
            )}
            <div className="stat-sublabel">Ready to play</div>
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">Quick Actions</h2>
          <p className="section-description">Jump into what you need</p>
        </div>
        <div className="actions-grid">
          <Link href="/search" className="action-card action-card-hover">
            <div className="action-icon-circle">
              <span className="action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" fill="currentColor"/>
                </svg>
              </span>
            </div>
            <h3 className="action-title">Search Cards</h3>
            <p className="action-description">Find and add cards from Scryfall's extensive database</p>
            <div className="action-arrow">→</div>
          </Link>

          <Link href="/collection" className="action-card action-card-hover">
            <div className="action-icon-circle">
              <span className="action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 2H4C3 2 2 2.9 2 4V7.01C2 7.73 2.43 8.35 3 8.7V20C3 21.1 4.1 22 5 22H19C19.9 22 21 21.1 21 20V8.7C21.57 8.35 22 7.73 22 7.01V4C22 2.9 21 2 20 2ZM19 20H5V9H19V20ZM20 7H4V4H20V7Z" fill="currentColor"/>
                </svg>
              </span>
            </div>
            <h3 className="action-title">My Collection</h3>
            <p className="action-description">Organize your cards into folders and manage quantities</p>
            <div className="action-arrow">→</div>
          </Link>

          <Link href="/decks" className="action-card action-card-hover">
            <div className="action-icon-circle">
              <span className="action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2ZM18 11.09C18 15.09 15.45 18.79 12 19.92C8.55 18.79 6 15.1 6 11.09V6.39L12 4.14L18 6.39V11.09ZM7.5 11L6 12.5L10 16.5L18 8.5L16.5 7L10 13.5L7.5 11Z" fill="currentColor"/>
                </svg>
              </span>
            </div>
            <h3 className="action-title">Build Decks</h3>
            <p className="action-description">Create powerful decks from your collection</p>
            <div className="action-arrow">→</div>
          </Link>
        </div>
      </div>

      {stats.totalCards === 0 && !loadingStats && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z" fill="currentColor" opacity="0.3"/>
            </svg>
          </div>
          <h3 className="empty-state-title">Start Your Collection</h3>
          <p className="empty-state-description">
            You don't have any cards yet. Start by searching for cards and adding them to your collection.
          </p>
          <Link href="/search" className="btn btn-primary btn-lg">
            Search for Cards
          </Link>
        </div>
      )}
    </div>
  )
}
