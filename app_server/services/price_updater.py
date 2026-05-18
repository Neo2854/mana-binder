"""
Background service to update card prices from Scryfall
"""
import asyncio
import httpx
from datetime import datetime
from sqlalchemy.orm import Session
from ..db.database import SessionLocal
from ..db.models import CollectionCard

async def update_all_prices():
    """Update prices for all cards in collection from Scryfall"""
    db = SessionLocal()
    try:
        cards = db.query(CollectionCard).all()
        
        if not cards:
            print("No cards in collection to update prices for")
            return
        
        print(f"Starting price update for {len(cards)} cards...")
        updated_count = 0
        failed_count = 0
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            for i, card in enumerate(cards):
                try:
                    # Fetch card data from Scryfall
                    response = await client.get(
                        f"https://api.scryfall.com/cards/{card.scryfall_id}"
                    )
                    
                    if response.status_code == 200:
                        card_data = response.json()
                        price = card_data.get("prices", {}).get("usd")
                        
                        if price:
                            card.price = price
                            updated_count += 1
                        
                    # Respect Scryfall's rate limit (10 requests per second)
                    # Wait 100ms between requests to be safe
                    if (i + 1) % 10 == 0:
                        await asyncio.sleep(1.1)
                    else:
                        await asyncio.sleep(0.11)
                        
                except Exception as e:
                    print(f"Error fetching price for card {card.name} ({card.scryfall_id}): {e}")
                    failed_count += 1
                    continue
        
        db.commit()
        print(f"✓ Price update complete: {updated_count} updated, {failed_count} failed")
        
    except Exception as e:
        print(f"Error during price update: {e}")
        db.rollback()
    finally:
        db.close()

async def price_update_loop():
    """Run price updates immediately, then every 24 hours"""
    # Run initial update immediately in background
    try:
        print(f"[{datetime.now().isoformat()}] Running initial price update in background...")
        await update_all_prices()
    except Exception as e:
        print(f"Error in initial price update: {e}")
    
    # Continue with periodic updates
    while True:
        try:
            # Wait 24 hours before next update
            await asyncio.sleep(24 * 60 * 60)
            print(f"[{datetime.now().isoformat()}] Running scheduled price update...")
            await update_all_prices()
        except Exception as e:
            print(f"Error in price update loop: {e}")
            # Wait 1 hour before retrying after an error
            await asyncio.sleep(60 * 60)

def start_price_updater():
    """Start the background price updater task"""
    asyncio.create_task(price_update_loop())
