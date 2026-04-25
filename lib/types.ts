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
  is_last_words?: boolean;
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
  donation_charity_name: string | null;
  donation_url: string | null;
  donation_note: string | null;
  theme: string;
  status: 'active' | 'completed' | 'archived';
  service_type?: 'traditional' | 'cremation' | 'direct_cremation' | 'memorial_only' | null;
  package_price_cents?: number | null;
  package_price_label?: string | null;
  physician_name?: string | null;
  physician_email?: string | null;
  physician_reminded_at?: string | null;
  physician_reminded_count?: number | null;
  created_at: string;
  updated_at: string;
}

export interface WallNote {
  id: string;
  archive_id: string;
  author_name: string | null;
  message: string;
  created_at: string;
}

export interface Candle {
  id: string;
  archive_id: string;
  lit_by: string | null;
  dedication: string | null;
  created_at: string;
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

  print_supplier_name?: string | null;
  print_supplier_email?: string | null;
  print_supplier_notes?: string | null;
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


export interface HomeVendor {
  id: string;
  home_id: string;
  vendor_type: VendorType;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  is_preferred: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  archive_id: string;
  home_vendor_id?: string | null;
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

export type AnnouncementStatus = 'draft' | 'sending' | 'sent' | 'failed';
export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'bounced';

export interface Announcement {
  id: string;
  archive_id: string;
  subject: string;
  body: string;
  status: AnnouncementStatus;
  recipient_count: number;
  delivered_count: number;
  failed_count: number;
  sent_at: string | null;
  created_at: string;
}

export interface AnnouncementDelivery {
  id: string;
  announcement_id: string;
  recipient_email: string;
  recipient_name: string | null;
  delivery_status: DeliveryStatus;
  resend_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface AnnouncementRecipient {
  email: string;
  name: string | null;
}
