export interface DeckCard {
  id: number
  scryfall_id: string
  name: string
  quantity: number
  is_commander: boolean
  is_sideboard: boolean
  mana_cost?: string
  type_line?: string
  image_uri?: string
  colors?: string
  tags?: string
}

export interface CollectionCard {
  id: number
  scryfall_id: string
  name: string
  folder_id?: number
  set_code?: string
  set_name?: string
  rarity?: string
  mana_cost?: string
  type_line?: string
  oracle_text?: string
  image_uri?: string
  quantity: number
  colors?: string
}

export interface Deck {
  id: number
  name: string
  description?: string
  format?: string
  created_at: string
  updated_at: string
  cards: DeckCard[]
}

export interface ScryfallCard {
  id: string
  name: string
  mana_cost?: string
  type_line: string
  oracle_text?: string
  image_uris?: {
    small: string
    normal: string
    large: string
  }
  card_faces?: Array<{
    name: string
    mana_cost?: string
    type_line: string
    oracle_text?: string
    image_uris?: {
      small: string
      normal: string
      large: string
    }
  }>
  prices?: {
    usd?: string
  }
}
