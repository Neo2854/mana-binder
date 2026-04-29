# Mana Binder

A professional Magic: The Gathering collection manager and deckbuilder with FastAPI backend, Next.js frontend, and SQLite database.

## Features

### Collection Management
- Search cards using the [Scryfall API](https://scryfall.com/docs/api)
- Add cards to your personal collection
- Track card quantities
- Filter and search your collection
- View card images and details

### Deck Building
- Create multiple decks with different formats (Standard, Modern, Commander, etc.)
- Build decks from your collection
- Track card quantities in each deck
- Organize decks by format and description
- Easy card management (add, remove, adjust quantities)

### Single User
- No authentication required
- Personal collection manager
- Local SQLite database storage

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: Next.js 14 with React and TypeScript
- **Database**: SQLite (stored in `database/` folder)
- **Card Data**: Scryfall API

## Project Structure

```
mana-binder/
├── app_server/          # FastAPI backend
│   ├── app.py          # Main application entry point
│   ├── db/             # Database configuration and models
│   │   ├── database.py # SQLAlchemy setup
│   │   └── models.py   # CollectionCard, Deck, DeckCard models
│   └── routes/         # API route handlers
│       ├── collection.py  # Collection management endpoints
│       └── decks.py       # Deck management endpoints
├── database/           # SQLite database files
├── frontend/           # Next.js frontend
│   └── app/           # Next.js App Router
│       ├── page.tsx          # Collection page
│       ├── decks/page.tsx    # Decks page
│       └── components/       # React components
└── requirements.txt    # Python dependencies
```

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm or yarn

### Backend Setup

1. **Create and activate virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the FastAPI server**:
   ```bash
   python -m app_server.app
   ```
   
   The API will be available at `http://localhost:8000`
   - API docs: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

### Frontend Setup

1. **Install Node.js dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```
   
   The frontend will be available at `http://localhost:3000`

## API Endpoints

### Collection
- `GET /api/collection/` - Get all cards in collection
- `POST /api/collection/` - Add card to collection
- `DELETE /api/collection/{card_id}` - Remove card from collection
- `PATCH /api/collection/{card_id}/quantity` - Update card quantity

### Decks
- `GET /api/decks/` - Get all decks
- `GET /api/decks/{deck_id}` - Get specific deck with cards
- `POST /api/decks/` - Create new deck
- `PUT /api/decks/{deck_id}` - Update deck details
- `DELETE /api/decks/{deck_id}` - Delete deck
- `POST /api/decks/{deck_id}/cards` - Add card to deck
- `DELETE /api/decks/{deck_id}/cards/{card_id}` - Remove card from deck
- `PATCH /api/decks/{deck_id}/cards/{card_id}/quantity` - Update card quantity in deck

## Usage

### Managing Your Collection

1. Navigate to the Collection page (default home page)
2. Use the search bar to find cards on Scryfall using:
   - Card names: `Lightning Bolt`
   - Card types: `t:creature`
   - Mana cost: `cmc:3`
   - Colors: `c:red`
   - Complex queries: `t:creature cmc<=3 c:green`
3. Click "Add to Collection" to add cards
4. Adjust quantities using +/- buttons
5. Remove cards with the Remove button
6. Filter your collection using the filter input

### Building Decks

1. Navigate to the Decks page
2. Click "New Deck" to create a deck
3. Enter deck name, format, and optional description
4. Select a deck from the list to start building
5. Add cards from your collection to the deck
6. Adjust quantities with +/- buttons
7. Remove cards as needed

### Scryfall Search Tips

The search uses Scryfall's powerful search syntax:
- `t:creature` - Find creatures
- `c:blue` - Find blue cards
- `cmc:3` - Find cards with converted mana cost 3
- `o:flying` - Find cards with "flying" in oracle text
- `r:rare` - Find rare cards
- Combine queries: `t:instant c:red cmc<=2`

[Full Scryfall search syntax](https://scryfall.com/docs/syntax)

## Design

The application features a professional Magic: The Gathering themed design with:
- Dark color scheme inspired by MTG
- Gold accents for headings and highlights
- Red accent color for primary actions
- Responsive layout for desktop and mobile
- Clean card displays with hover effects
- Intuitive deck building interface

## Database

The SQLite database is stored in the `database/` folder and includes three tables:
- `collection_cards` - Your card collection
- `decks` - Your deck list
- `deck_cards` - Cards in each deck

The database is automatically created on first run and includes proper relationships and indexes for efficient queries.

## Development

### Backend Development

The backend uses:
- FastAPI for the web framework
- SQLAlchemy for database ORM
- Pydantic for data validation
- CORS middleware configured for Next.js frontend

### Frontend Development

The frontend uses:
- Next.js 14 with App Router
- React 18 with TypeScript
- Client-side data fetching
- Scryfall API integration

## Running Both Services

Open two terminal windows:

**Terminal 1 - Backend**:
```bash
source venv/bin/activate  # On Windows: venv\Scripts\activate
python -m app_server.app
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

Then visit `http://localhost:3000` in your browser.

## License

This project uses the [Scryfall API](https://scryfall.com/docs/api) for card data. Card images and data are property of Wizards of the Coast.
