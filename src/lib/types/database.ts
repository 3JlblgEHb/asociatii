export type UserRole =
  | "super_admin"
  | "association_admin"
  | "manager"
  | "owner"
  | "resident";

export type DocumentCategory =
  | "protocol"
  | "invoice"
  | "report"
  | "statute"
  | "other";

export type VoteStatus = "draft" | "active" | "closed";

export type RequestCategory =
  | "repair"
  | "cleaning"
  | "elevator"
  | "water"
  | "electricity"
  | "other";

export type RequestStatus = "new" | "in_progress" | "resolved" | "rejected";

export type MemberStatus = "active" | "pending" | "inactive";

export type InvitationStatus = "pending" | "accepted" | "expired" | "cancelled";

export type NotificationType =
  | "announcement"
  | "vote"
  | "request"
  | "invitation"
  | "system";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  global_role: UserRole | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  logo_url: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  status: MemberStatus;
  apartment_id: string | null;
  created_at: string;
  updated_at: string;
  users_profiles?: UserProfile;
}

export interface Building {
  id: string;
  organization_id: string;
  name: string;
  address: string;
  floors: number | null;
  entrance_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface Apartment {
  id: string;
  organization_id: string;
  building_id: string;
  number: string;
  floor: number | null;
  area_sqm: number | null;
  has_voting_rights: boolean;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  buildings?: Building;
  users_profiles?: UserProfile;
}

export interface Document {
  id: string;
  organization_id: string;
  uploaded_by: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  organization_id: string;
  created_by: string;
  title: string;
  content: string;
  is_published: boolean;
  email_sent: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vote {
  id: string;
  organization_id: string;
  created_by: string;
  title: string;
  description: string | null;
  status: VoteStatus;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoteOption {
  id: string;
  vote_id: string;
  organization_id: string;
  label: string;
  sort_order: number;
  created_at: string;
}

export interface VoteResponse {
  id: string;
  vote_id: string;
  organization_id: string;
  apartment_id: string;
  option_id: string;
  voter_id: string;
  created_at: string;
}

export interface ServiceRequest {
  id: string;
  organization_id: string;
  apartment_id: string | null;
  created_by: string;
  category: RequestCategory;
  title: string;
  description: string;
  status: RequestStatus;
  attachments: string[];
  created_at: string;
  updated_at: string;
}

export interface ServiceRequestComment {
  id: string;
  request_id: string;
  organization_id: string;
  user_id: string;
  content: string;
  created_at: string;
  users_profiles?: UserProfile;
}

export interface Notification {
  id: string;
  organization_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: UserRole;
  invited_by: string;
  token: string;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      users_profiles: { Row: UserProfile; Insert: Partial<UserProfile>; Update: Partial<UserProfile>; Relationships: [] };
      organizations: { Row: Organization; Insert: Partial<Organization>; Update: Partial<Organization>; Relationships: [] };
      organization_members: { Row: OrganizationMember; Insert: Partial<OrganizationMember>; Update: Partial<OrganizationMember>; Relationships: [] };
      buildings: { Row: Building; Insert: Partial<Building>; Update: Partial<Building>; Relationships: [] };
      apartments: { Row: Apartment; Insert: Partial<Apartment>; Update: Partial<Apartment>; Relationships: [] };
      documents: { Row: Document; Insert: Partial<Document>; Update: Partial<Document>; Relationships: [] };
      announcements: { Row: Announcement; Insert: Partial<Announcement>; Update: Partial<Announcement>; Relationships: [] };
      votes: { Row: Vote; Insert: Partial<Vote>; Update: Partial<Vote>; Relationships: [] };
      vote_options: { Row: VoteOption; Insert: Partial<VoteOption>; Update: Partial<VoteOption>; Relationships: [] };
      vote_responses: { Row: VoteResponse; Insert: Partial<VoteResponse>; Update: Partial<VoteResponse>; Relationships: [] };
      service_requests: { Row: ServiceRequest; Insert: Partial<ServiceRequest>; Update: Partial<ServiceRequest>; Relationships: [] };
      service_request_comments: { Row: ServiceRequestComment; Insert: Partial<ServiceRequestComment>; Update: Partial<ServiceRequestComment>; Relationships: [] };
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification>; Relationships: [] };
      audit_logs: { Row: AuditLog; Insert: Partial<AuditLog>; Update: Partial<AuditLog>; Relationships: [] };
      organization_invitations: { Row: OrganizationInvitation; Insert: Partial<OrganizationInvitation>; Update: Partial<OrganizationInvitation>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      create_organization: {
        Args: {
          p_name: string;
          p_slug: string;
          p_address?: string | null;
          p_phone?: string | null;
          p_email?: string | null;
          p_description?: string | null;
        };
        Returns: Organization;
      };
      accept_organization_invitation: {
        Args: { p_token: string };
        Returns: string;
      };
      cast_vote: { Args: { p_vote_id: string; p_option_id: string }; Returns: string };
      write_management_audit_log: {
        Args: {
          p_organization_id: string;
          p_action: string;
          p_entity_type: string;
          p_entity_id?: string;
          p_metadata?: Record<string, unknown>;
        };
        Returns: string;
      };
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
      can_manage_org: { Args: { org_id: string }; Returns: boolean };
      user_has_voting_rights: { Args: { org_id: string }; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      document_category: DocumentCategory;
      vote_status: VoteStatus;
      request_category: RequestCategory;
      request_status: RequestStatus;
      member_status: MemberStatus;
      invitation_status: InvitationStatus;
      notification_type: NotificationType;
    };
    CompositeTypes: Record<string, never>;
  };
}
