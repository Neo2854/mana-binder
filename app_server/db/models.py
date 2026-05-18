from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Folder(Base):
    """Folders for organizing collection"""
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    color = Column(String, default="#f97316")  # Hex color for folder
    created_at = Column(DateTime, default=datetime.utcnow)
    
    cards = relationship("CollectionCard", back_populates="folder")

class CollectionCard(Base):
    """Cards in user's collection"""
    __tablename__ = "collection_cards"

    id = Column(Integer, primary_key=True, index=True)
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True)
    scryfall_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, index=True, nullable=False)
    set_code = Column(String)
    set_name = Column(String)
    collector_number = Column(String)
    rarity = Column(String)
    mana_cost = Column(String)
    cmc = Column(Integer)
    type_line = Column(String)
    oracle_text = Column(Text)
    colors = Column(String)  # JSON string of color array
    image_uri = Column(String)
    price = Column(String)  # USD price from Scryfall (current market price)
    purchase_price = Column(String)  # Price when first added to collection
    quantity = Column(Integer, default=1)
    added_at = Column(DateTime, default=datetime.utcnow)
    
    folder = relationship("Folder", back_populates="cards")

class Deck(Base):
    """User's decks"""
    __tablename__ = "decks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    format = Column(String)  # Standard, Modern, Commander, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    cards = relationship("DeckCard", back_populates="deck", cascade="all, delete-orphan")

class DeckCard(Base):
    """Cards in a deck"""
    __tablename__ = "deck_cards"

    id = Column(Integer, primary_key=True, index=True)
    deck_id = Column(Integer, ForeignKey("decks.id"), nullable=False)
    scryfall_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    quantity = Column(Integer, default=1)
    is_commander = Column(Boolean, default=False)
    is_sideboard = Column(Boolean, default=False)
    
    # Card data snapshot (to avoid re-fetching)
    mana_cost = Column(String)
    type_line = Column(String)
    image_uri = Column(String)
    colors = Column(String)
    tags = Column(String)  # Single tag for categorization
    
    deck = relationship("Deck", back_populates="cards")
