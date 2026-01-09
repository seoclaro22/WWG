export type EventPublic = {
  id: string
  name: string
  description: string | null
  start_at: string
  end_at: string | null
  genres: string[] | null
  price_min: number | null
  price_max: number | null
  images: any | null
  url_referral: string | null
  sponsored?: boolean | null
  status: string
  created_at: string
  club_id: string | null
  club_name: string | null
}

export type Club = {
  id: string
  name: string
  description: string | null
  description_i18n?: Record<string, string> | null
  address: string | null
  status: string
}
