// ——————————————————————————————————————————————————
// Shared TypeScript types for Momo
// ——————————————————————————————————————————————————

export type MemoryType = 'text' | 'photo' | 'voice' | 'video';

export interface Memory {
  id: string;
  archive_id: string;
  author_name: string;
  author_email?: string | null;
  memory_type: MemoryType;
  text_content?: string | null;
  media_url?: string | null;
  duration_seconds?: number | null;
  caption?: string | null;
  created_at: string;
}

export interface Archive {
  id: string;
  home_id: string | null;
  subject_name: string;
  subject_dates: string | null;
  cover_photo_url: string | null;
  share_slug: string;
  family_contact_email: string | null;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface ArchiveWithMemories extends Archive {
  memories: Memory[];
}

export interface FuneralHome {
  id: string;
  name: string;
  owner_email: string | null;
  subscription_tier: 'trial' | 'independent' | 'mid' | 'high_volume' | 'enterprise';
  stripe_customer_id: string | null;
  created_at: string;
}

export interface Staff {
  id: string;
  home_id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'director' | 'staff';
  auth_user_id: string | null;
  created_at: string;
}

export type GenerationTool =
  | 'obit_traditional'
  | 'obit_celebratory'
  | 'obit_personal'
  | 'eulogy'
  | 'death_notice'
  | 'memorial_card'
  | 'order_of_service'
  | 'memorial_program'
  | 'service_timeline'
  | 'reading_music_suggestions'
  | 'thank_yous'
  | 'acknowledgment_letter'
  | 'grief_resources'
  | 'slideshow'
  | 'program';

export interface Generation {
  id: string;
  archive_id: string;
  generated_by: string | null;
  tool: GenerationTool;
  content: string | null;
  edited_content: string | null;
  status: 'draft' | 'edited' | 'finalized';
  created_at: string;
}

export type VendorType =
  | 'florist'
  | 'clergy'
  | 'musician'
  | 'caterer'
  | 'transportation'
  | 'cemetery'
  | 'photographer'
  | 'reception_venue'
  | 'pallbearer'
  | 'other';

export type VendorStatus =
  | 'not_contacted'
  | 'contacted'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export interface Vendor {
  id: string;
  archive_id: string;
  vendor_type: VendorType;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  status: VendorStatus;
  notes: string | null;
  needed_at: string | null;
  created_at: string;
  updated_at: string;
}
