from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from ..db.database import get_db
from ..db.models import Deck, DeckCard, CollectionCard

router = APIRouter(prefix="/api/decks", tags=["decks"])

class DeckCardCreate(BaseModel):
    scryfall_id: str
    name: str
    quantity: int = 1
    is_commander: bool = False
    mana_cost: Optional[str] = None
    type_line: Optional[str] = None
    image_uri: Optional[str] = None
    colors: Optional[str] = None

class DeckCardResponse(BaseModel):
    id: int
    scryfall_id: str
    name: str
    quantity: int
    is_commander: bool
    mana_cost: Optional[str]
    type_line: Optional[str]
    image_uri: Optional[str]
    colors: Optional[str]

    class Config:
        from_attributes = True

class DeckCreate(BaseModel):
    name: str
    description: Optional[str] = None
    format: Optional[str] = None

class DeckUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    format: Optional[str] = None

class DeckResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    format: Optional[str]
    created_at: str
    updated_at: str
    cards: List[DeckCardResponse] = []

    class Config:
        from_attributes = True

@router.get("/", response_model=List[DeckResponse])
async def get_decks(db: Session = Depends(get_db)):
    """Get all decks"""
    decks = db.query(Deck).all()
    return [DeckResponse(
        id=deck.id,
        name=deck.name,
        description=deck.description,
        format=deck.format,
        created_at=deck.created_at.isoformat(),
        updated_at=deck.updated_at.isoformat(),
        cards=[DeckCardResponse(
            id=card.id,
            scryfall_id=card.scryfall_id,
            name=card.name,
            quantity=card.quantity,
            is_commander=card.is_commander,
            mana_cost=card.mana_cost,
            type_line=card.type_line,
            image_uri=card.image_uri,
            colors=card.colors
        ) for card in deck.cards]
    ) for deck in decks]

@router.get("/{deck_id}", response_model=DeckResponse)
async def get_deck(deck_id: int, db: Session = Depends(get_db)):
    """Get a specific deck with all its cards"""
    deck = db.query(Deck).filter(Deck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    return DeckResponse(
        id=deck.id,
        name=deck.name,
        description=deck.description,
        format=deck.format,
        created_at=deck.created_at.isoformat(),
        updated_at=deck.updated_at.isoformat(),
        cards=[DeckCardResponse(
            id=card.id,
            scryfall_id=card.scryfall_id,
            name=card.name,
            quantity=card.quantity,
            is_commander=card.is_commander,
            mana_cost=card.mana_cost,
            type_line=card.type_line,
            image_uri=card.image_uri,
            colors=card.colors
        ) for card in deck.cards]
    )

@router.post("/", response_model=DeckResponse)
async def create_deck(deck: DeckCreate, db: Session = Depends(get_db)):
    """Create a new deck"""
    new_deck = Deck(**deck.dict())
    db.add(new_deck)
    db.commit()
    db.refresh(new_deck)
    
    return DeckResponse(
        id=new_deck.id,
        name=new_deck.name,
        description=new_deck.description,
        format=new_deck.format,
        created_at=new_deck.created_at.isoformat(),
        updated_at=new_deck.updated_at.isoformat(),
        cards=[]
    )

@router.put("/{deck_id}", response_model=DeckResponse)
async def update_deck(
    deck_id: int,
    deck_update: DeckUpdate,
    db: Session = Depends(get_db)
):
    """Update deck details"""
    deck = db.query(Deck).filter(Deck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    for field, value in deck_update.dict(exclude_unset=True).items():
        setattr(deck, field, value)
    
    db.commit()
    db.refresh(deck)
    
    return DeckResponse(
        id=deck.id,
        name=deck.name,
        description=deck.description,
        format=deck.format,
        created_at=deck.created_at.isoformat(),
        updated_at=deck.updated_at.isoformat(),
        cards=[DeckCardResponse(
            id=card.id,
            scryfall_id=card.scryfall_id,
            name=card.name,
            quantity=card.quantity,
            is_commander=card.is_commander,
            mana_cost=card.mana_cost,
            type_line=card.type_line,
            image_uri=card.image_uri,
            colors=card.colors
        ) for card in deck.cards]
    )

@router.delete("/{deck_id}")
async def delete_deck(deck_id: int, db: Session = Depends(get_db)):
    """Delete a deck"""
    deck = db.query(Deck).filter(Deck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    db.delete(deck)
    db.commit()
    return {"success": True, "message": "Deck deleted"}

@router.post("/{deck_id}/cards", response_model=DeckCardResponse)
async def add_card_to_deck(
    deck_id: int,
    card: DeckCardCreate,
    db: Session = Depends(get_db)
):
    """Add a card to a deck"""
    deck = db.query(Deck).filter(Deck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    # Check if card exists in deck
    existing_card = db.query(DeckCard).filter(
        DeckCard.deck_id == deck_id,
        DeckCard.scryfall_id == card.scryfall_id
    ).first()
    
    if existing_card:
        existing_card.quantity += card.quantity
        db.commit()
        db.refresh(existing_card)
        return DeckCardResponse(
            id=existing_card.id,
            scryfall_id=existing_card.scryfall_id,
            name=existing_card.name,
            quantity=existing_card.quantity,
            is_commander=existing_card.is_commander,
            mana_cost=existing_card.mana_cost,
            type_line=existing_card.type_line,
            image_uri=existing_card.image_uri,
            colors=existing_card.colors
        )
    
    new_card = DeckCard(deck_id=deck_id, **card.dict())
    db.add(new_card)
    db.commit()
    db.refresh(new_card)
    
    return DeckCardResponse(
        id=new_card.id,
        scryfall_id=new_card.scryfall_id,
        name=new_card.name,
        quantity=new_card.quantity,
        is_commander=new_card.is_commander,
        mana_cost=new_card.mana_cost,
        type_line=new_card.type_line,
        image_uri=new_card.image_uri,
        colors=new_card.colors
    )

@router.delete("/{deck_id}/cards/{card_id}")
async def remove_card_from_deck(
    deck_id: int,
    card_id: int,
    db: Session = Depends(get_db)
):
    """Remove a card from a deck"""
    card = db.query(DeckCard).filter(
        DeckCard.id == card_id,
        DeckCard.deck_id == deck_id
    ).first()
    
    if not card:
        raise HTTPException(status_code=404, detail="Card not found in deck")
    
    db.delete(card)
    db.commit()
    return {"success": True, "message": "Card removed from deck"}

@router.patch("/{deck_id}/cards/{card_id}/quantity")
async def update_deck_card_quantity(
    deck_id: int,
    card_id: int,
    quantity: int,
    db: Session = Depends(get_db)
):
    """Update card quantity in deck"""
    card = db.query(DeckCard).filter(
        DeckCard.id == card_id,
        DeckCard.deck_id == deck_id
    ).first()
    
    if not card:
        raise HTTPException(status_code=404, detail="Card not found in deck")
    
    if quantity <= 0:
        db.delete(card)
    else:
        card.quantity = quantity
    
    db.commit()
    return {"success": True, "quantity": quantity if quantity > 0 else 0}
