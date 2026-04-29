"""
Migration script to add purchase_price field to collection_cards table
This field stores the price when the card was first added to the collection
"""

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
import os
import sys

# Add parent directory to path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app_server.db.database import engine, Base, init_db
from app_server.db.models import CollectionCard

def migrate_add_purchase_price():
    """Add purchase_price column to collection_cards table"""
    
    print("Starting migration: Adding purchase_price column to collection_cards")
    
    try:
        # First, ensure all tables exist
        print("Creating tables if they don't exist...")
        Base.metadata.create_all(bind=engine)
        
        # Check if the column already exists
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('collection_cards')]
        
        if 'purchase_price' in columns:
            print("✓ Column 'purchase_price' already exists, skipping migration")
            return
        
        # Execute raw SQL to add column
        with engine.connect() as conn:
            # Add the column
            print("Adding purchase_price column...")
            conn.execute(text("""
                ALTER TABLE collection_cards 
                ADD COLUMN purchase_price VARCHAR
            """))
            
            # For existing cards, set purchase_price to current price
            # This assumes existing cards were purchased at their current price
            print("Setting purchase_price = price for existing cards...")
            conn.execute(text("""
                UPDATE collection_cards 
                SET purchase_price = price 
                WHERE purchase_price IS NULL
            """))
            
            conn.commit()
            
        print("✓ Migration completed successfully!")
        print("  - Added purchase_price column")
        print("  - Set purchase_price = price for existing cards")
        
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    migrate_add_purchase_price()
