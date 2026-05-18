from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from starlette.responses import StreamingResponse
import httpx
import csv
import io
import asyncio
import json
from ..db.database import get_db
from ..db.models import CollectionCard, Folder, Deck

router = APIRouter(prefix="/api/collection", tags=["collection"])

class FolderCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#f97316"

class FolderResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    color: str
    created_at: str
    card_count: int = 0

    class Config:
        from_attributes = True

class CardCreate(BaseModel):
    scryfall_id: str
    name: str
    folder_id: Optional[int] = None
    set_code: Optional[str] = None
    set_name: Optional[str] = None
    collector_number: Optional[str] = None
    rarity: Optional[str] = None
    mana_cost: Optional[str] = None
    cmc: Optional[int] = None
    type_line: Optional[str] = None
    oracle_text: Optional[str] = None
    colors: Optional[str] = None
    image_uri: Optional[str] = None
    price: Optional[str] = None
    purchase_price: Optional[str] = None
    quantity: int = 1

class CardResponse(BaseModel):
    id: int
    scryfall_id: str
    name: str
    folder_id: Optional[int]
    set_code: Optional[str]
    set_name: Optional[str]
    collector_number: Optional[str]
    rarity: Optional[str]
    mana_cost: Optional[str]
    cmc: Optional[int]
    type_line: Optional[str]
    oracle_text: Optional[str]
    colors: Optional[str]
    image_uri: Optional[str]
    price: Optional[str]
    purchase_price: Optional[str]
    quantity: int
    added_at: str

    class Config:
        from_attributes = True

# Folder endpoints
@router.get("/folders", response_model=List[FolderResponse])
async def get_folders(db: Session = Depends(get_db)):
    """Get all folders with card counts"""
    folders = db.query(Folder).all()
    return [FolderResponse(
        id=folder.id,
        name=folder.name,
        description=folder.description,
        color=folder.color,
        created_at=folder.created_at.isoformat(),
        card_count=len(folder.cards)
    ) for folder in folders]

@router.post("/folders", response_model=FolderResponse)
async def create_folder(folder: FolderCreate, db: Session = Depends(get_db)):
    """Create a new folder"""
    new_folder = Folder(**folder.dict())
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)
    
    return FolderResponse(
        id=new_folder.id,
        name=new_folder.name,
        description=new_folder.description,
        color=new_folder.color,
        created_at=new_folder.created_at.isoformat(),
        card_count=0
    )

@router.put("/folders/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: int,
    folder: FolderCreate,
    db: Session = Depends(get_db)
):
    """Update a folder"""
    db_folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not db_folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    for field, value in folder.dict().items():
        setattr(db_folder, field, value)
    
    db.commit()
    db.refresh(db_folder)
    
    return FolderResponse(
        id=db_folder.id,
        name=db_folder.name,
        description=db_folder.description,
        color=db_folder.color,
        created_at=db_folder.created_at.isoformat(),
        card_count=len(db_folder.cards)
    )

@router.get("/", response_model=List[CardResponse])
async def get_collection(
    skip: int = 0,
    limit: int = 1000,
    search: Optional[str] = None,
    folder_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get all cards in collection"""
    query = db.query(CollectionCard)
    
    if folder_id is not None:
        if folder_id == -1:
            # Special case: get cards with no folder
            query = query.filter(CollectionCard.folder_id == None)
        else:
            query = query.filter(CollectionCard.folder_id == folder_id)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (CollectionCard.name.ilike(search_pattern)) |
            (CollectionCard.type_line.ilike(search_pattern)) |
            (CollectionCard.oracle_text.ilike(search_pattern))
        )
    
    cards = query.offset(skip).limit(limit).all()
    return [CardResponse(
        id=card.id,
        scryfall_id=card.scryfall_id,
        name=card.name,
        folder_id=card.folder_id,
        set_code=card.set_code,
        set_name=card.set_name,
        collector_number=card.collector_number,
        rarity=card.rarity,
        mana_cost=card.mana_cost,
        cmc=card.cmc,
        type_line=card.type_line,
        oracle_text=card.oracle_text,
        colors=card.colors,
        image_uri=card.image_uri,
        price=card.price,
        purchase_price=card.purchase_price,
        quantity=card.quantity,
        added_at=card.added_at.isoformat()
    ) for card in cards]

@router.post("/", response_model=CardResponse)
async def add_card_to_collection(card: CardCreate, db: Session = Depends(get_db)):
    """Add a card to collection or update quantity if exists"""
    existing_card = db.query(CollectionCard).filter(
        CollectionCard.scryfall_id == card.scryfall_id
    ).first()
    
    if existing_card:
        existing_card.quantity += card.quantity
        # Update current price if provided, but keep original purchase_price
        if card.price:
            existing_card.price = card.price
        db.commit()
        db.refresh(existing_card)
        return CardResponse(
            id=existing_card.id,
            scryfall_id=existing_card.scryfall_id,
            name=existing_card.name,
            folder_id=existing_card.folder_id,
            set_code=existing_card.set_code,
            set_name=existing_card.set_name,
            collector_number=existing_card.collector_number,
            rarity=existing_card.rarity,
            mana_cost=existing_card.mana_cost,
            cmc=existing_card.cmc,
            type_line=existing_card.type_line,
            oracle_text=existing_card.oracle_text,
            colors=existing_card.colors,
            image_uri=existing_card.image_uri,
            price=existing_card.price,
            purchase_price=existing_card.purchase_price,
            quantity=existing_card.quantity,
            added_at=existing_card.added_at.isoformat()
        )
    
    # For new cards, set purchase_price to current price
    card_data = card.dict()
    if card_data['price'] and not card_data.get('purchase_price'):
        card_data['purchase_price'] = card_data['price']
    
    new_card = CollectionCard(**card_data)
    db.add(new_card)
    db.commit()
    db.refresh(new_card)
    
    return CardResponse(
        id=new_card.id,
        scryfall_id=new_card.scryfall_id,
        name=new_card.name,
        folder_id=new_card.folder_id,
        set_code=new_card.set_code,
        set_name=new_card.set_name,
        collector_number=new_card.collector_number,
        rarity=new_card.rarity,
        mana_cost=new_card.mana_cost,
        cmc=new_card.cmc,
        type_line=new_card.type_line,
        oracle_text=new_card.oracle_text,
        colors=new_card.colors,
        image_uri=new_card.image_uri,
        price=new_card.price,
        purchase_price=new_card.purchase_price,
        quantity=new_card.quantity,
        added_at=new_card.added_at.isoformat()
    )

@router.delete("/{card_id}")
async def remove_card_from_collection(card_id: int, db: Session = Depends(get_db)):
    """Remove a card from collection"""
    card = db.query(CollectionCard).filter(CollectionCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    db.delete(card)
    db.commit()
    return {"success": True, "message": "Card removed from collection"}

@router.patch("/{card_id}/quantity")
async def update_card_quantity(
    card_id: int,
    quantity: int,
    db: Session = Depends(get_db)
):
    """Update card quantity"""
    card = db.query(CollectionCard).filter(CollectionCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    if quantity <= 0:
        db.delete(card)
    else:
        card.quantity = quantity
    
    db.commit()
    return {"success": True, "quantity": quantity if quantity > 0 else 0}

@router.patch("/{card_id}/folder")
async def move_card_to_folder(
    card_id: int,
    folder_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Move card to a folder"""
    card = db.query(CollectionCard).filter(CollectionCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    if folder_id is not None:
        folder = db.query(Folder).filter(Folder.id == folder_id).first()
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")
    
    card.folder_id = folder_id
    db.commit()
    return {"success": True, "folder_id": folder_id}

@router.get("/stats")
async def get_collection_stats(db: Session = Depends(get_db)):
    """Get collection statistics"""
    cards = db.query(CollectionCard).all()
    decks = db.query(Deck).all()
    
    total_cards = sum(card.quantity for card in cards)
    unique_cards = len(cards)
    total_decks = len(decks)
    
    return {
        "total_cards": total_cards,
        "unique_cards": unique_cards,
        "total_decks": total_decks
    }

@router.get("/value")
async def get_collection_value(db: Session = Depends(get_db)):
    """Calculate collection value from stored prices"""
    cards = db.query(CollectionCard).all()
    
    if not cards:
        return {"total_value": 0.0, "card_count": 0}
    
    total_value = 0.0
    processed_count = 0
    
    for card in cards:
        if card.price:
            try:
                price_float = float(card.price)
                card_value = price_float * card.quantity
                total_value += card_value
                processed_count += 1
            except (ValueError, TypeError):
                pass
    
    return {
        "total_value": round(total_value, 2),
        "card_count": processed_count,
        "total_cards": len(cards)
    }

@router.get("/value-analysis")
async def get_collection_value_analysis(db: Session = Depends(get_db)):
    """
    Calculate collection value analysis with purchase vs current price comparison
    Like stock portfolio tracking
    """
    cards = db.query(CollectionCard).all()
    
    if not cards:
        return {
            "current_value": 0.0,
            "purchase_value": 0.0,
            "total_gain_loss": 0.0,
            "percentage_change": 0.0,
            "card_count": 0
        }
    
    current_value = 0.0
    purchase_value = 0.0
    processed_count = 0
    
    for card in cards:
        try:
            # Calculate current value
            if card.price:
                current_price = float(card.price)
                current_value += current_price * card.quantity
            
            # Calculate purchase value (what we paid for it)
            if card.purchase_price:
                purchase_price = float(card.purchase_price)
                purchase_value += purchase_price * card.quantity
                processed_count += 1
            elif card.price:
                # Fallback: if no purchase_price, assume we bought at current price
                current_price = float(card.price)
                purchase_value += current_price * card.quantity
                processed_count += 1
                
        except (ValueError, TypeError):
            continue
    
    # Calculate gain/loss
    total_gain_loss = current_value - purchase_value
    
    # Calculate percentage change
    percentage_change = 0.0
    if purchase_value > 0:
        percentage_change = (total_gain_loss / purchase_value) * 100
    
    return {
        "current_value": round(current_value, 2),
        "purchase_value": round(purchase_value, 2),
        "total_gain_loss": round(total_gain_loss, 2),
        "percentage_change": round(percentage_change, 2),
        "card_count": processed_count,
        "total_cards": len(cards)
    }

@router.post("/update-prices")
async def update_prices_endpoint():
    """Manually trigger price update for all cards in collection"""
    from ..services.price_updater import update_all_prices
    
    try:
        await update_all_prices()
        return {"status": "success", "message": "Price update completed"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/import-csv")
async def import_collection_from_csv(
    file: UploadFile = File(...),
    folder_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Import cards from a CSV file into the collection with real-time SSE progress updates.
    Expected CSV format: Name, Set code, Set name, Collector number, Foil, Rarity, 
    Quantity, ManaBox ID, Scryfall ID, Purchase price, ...
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    async def event_generator():
        try:
            # Read the CSV file
            contents = await file.read()
            csv_text = contents.decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(csv_text))
            rows = list(csv_reader)
            total_rows = len(rows)
            
            # Send initial event with total count
            yield f"data: {json.dumps({'type': 'start', 'total': total_rows})}\n\n"
            
            imported_count = 0
            failed_count = 0
            skipped_count = 0
            failed_cards = []
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                for row_num, row in enumerate(rows, start=2):  # Start at 2 (1 is header)
                    try:
                        # Extract data from CSV
                        scryfall_id = row.get('Scryfall ID', '').strip()
                        name = row.get('Name', '').strip()
                        quantity = int(row.get('Quantity', '1'))
                        purchase_price = row.get('Purchase price', '').strip()
                        set_code = row.get('Set code', '').strip()
                        
                        if not scryfall_id:
                            failed_cards.append({
                                'row': row_num,
                                'name': name,
                                'reason': 'Missing Scryfall ID'
                            })
                            failed_count += 1
                            # Send progress update
                            yield f"data: {json.dumps({'type': 'progress', 'current': row_num - 1, 'total': total_rows, 'imported': imported_count, 'skipped': skipped_count, 'failed': failed_count, 'status': 'failed', 'card': name})}\n\n"
                            continue
                        
                        if not name:
                            failed_cards.append({
                                'row': row_num,
                                'scryfall_id': scryfall_id,
                                'reason': 'Missing card name'
                            })
                            failed_count += 1
                            # Send progress update
                            yield f"data: {json.dumps({'type': 'progress', 'current': row_num - 1, 'total': total_rows, 'imported': imported_count, 'skipped': skipped_count, 'failed': failed_count, 'status': 'failed', 'card': scryfall_id})}\n\n"
                            continue
                        
                        # Check if card already exists in collection
                        existing_card = db.query(CollectionCard).filter(
                            CollectionCard.scryfall_id == scryfall_id
                        ).first()
                        
                        if existing_card:
                            # Update quantity instead of creating new entry
                            existing_card.quantity += quantity
                            if purchase_price and not existing_card.purchase_price:
                                existing_card.purchase_price = purchase_price
                            skipped_count += 1
                            # Send progress update
                            yield f"data: {json.dumps({'type': 'progress', 'current': row_num - 1, 'total': total_rows, 'imported': imported_count, 'skipped': skipped_count, 'failed': failed_count, 'status': 'updated', 'card': name})}\n\n"
                            continue
                        
                        # Fetch card details from Scryfall
                        response = await client.get(
                            f"https://api.scryfall.com/cards/{scryfall_id}"
                        )
                        
                        if response.status_code != 200:
                            failed_cards.append({
                                'row': row_num,
                                'name': name,
                                'scryfall_id': scryfall_id,
                                'reason': f'Scryfall API error: {response.status_code}'
                            })
                            failed_count += 1
                            # Send progress update
                            yield f"data: {json.dumps({'type': 'progress', 'current': row_num - 1, 'total': total_rows, 'imported': imported_count, 'skipped': skipped_count, 'failed': failed_count, 'status': 'failed', 'card': name})}\n\n"
                            continue
                        
                        card_data = response.json()
                        
                        # Extract card information
                        image_uri = None
                        if card_data.get('image_uris'):
                            image_uri = card_data['image_uris'].get('normal')
                        elif card_data.get('card_faces') and card_data['card_faces'][0].get('image_uris'):
                            image_uri = card_data['card_faces'][0]['image_uris'].get('normal')
                        
                        colors = card_data.get('colors', [])
                        colors_str = ','.join(colors) if colors else None
                        
                        current_price = card_data.get('prices', {}).get('usd')
                        
                        # If no purchase price in CSV, use current price
                        if not purchase_price and current_price:
                            purchase_price = current_price
                        
                        # Create new card entry
                        new_card = CollectionCard(
                            folder_id=folder_id,
                            scryfall_id=scryfall_id,
                            name=card_data.get('name', name),
                            set_code=card_data.get('set', set_code),
                            set_name=card_data.get('set_name'),
                            collector_number=card_data.get('collector_number'),
                            rarity=card_data.get('rarity'),
                            mana_cost=card_data.get('mana_cost'),
                            cmc=card_data.get('cmc'),
                            type_line=card_data.get('type_line'),
                            oracle_text=card_data.get('oracle_text'),
                            colors=colors_str,
                            image_uri=image_uri,
                            price=current_price,
                            purchase_price=purchase_price,
                            quantity=quantity
                        )
                        
                        db.add(new_card)
                        imported_count += 1
                        
                        # Send progress update
                        yield f"data: {json.dumps({'type': 'progress', 'current': row_num - 1, 'total': total_rows, 'imported': imported_count, 'skipped': skipped_count, 'failed': failed_count, 'status': 'imported', 'card': name})}\n\n"
                        
                        # Rate limiting: Scryfall allows ~10 requests per second
                        if imported_count % 10 == 0:
                            await asyncio.sleep(1.1)
                        else:
                            await asyncio.sleep(0.11)
                        
                    except Exception as e:
                        failed_cards.append({
                            'row': row_num,
                            'name': row.get('Name', 'Unknown'),
                            'reason': str(e)
                        })
                        failed_count += 1
                        db.rollback()
                        # Send progress update
                        yield f"data: {json.dumps({'type': 'progress', 'current': row_num - 1, 'total': total_rows, 'imported': imported_count, 'skipped': skipped_count, 'failed': failed_count, 'status': 'error', 'card': row.get('Name', 'Unknown')})}\n\n"
                        continue
            
            # Batch commit all changes at once
            db.commit()
            
            # Send completion event
            yield f"data: {json.dumps({'type': 'complete', 'status': 'success', 'imported': imported_count, 'skipped': skipped_count, 'failed': failed_count, 'failed_cards': failed_cards[:10]})}\n\n"
            
        except Exception as e:
            db.rollback()
            yield f"data: {json.dumps({'type': 'error', 'status': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")
