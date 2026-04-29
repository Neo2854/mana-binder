"""
Migration script to add price column to collection_cards table
"""
import sqlite3
import os

# Database path - same as in app_server/db/database.py
DATABASE_DIR = os.path.join(os.path.dirname(__file__), "database")
DB_PATH = os.path.join(DATABASE_DIR, "mana_binder.db")

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"✗ Database not found at {DB_PATH}")
        print("  Please start the server first to create the database.")
        return
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(collection_cards)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'price' not in columns:
            print("Adding price column to collection_cards table...")
            cursor.execute("ALTER TABLE collection_cards ADD COLUMN price TEXT")
            conn.commit()
            print("✓ Successfully added price column")
        else:
            print("✓ Price column already exists")
            
    except Exception as e:
        print(f"✗ Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
