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

export type PropertyUnitType =
  | "apartment"
  | "commercial"
  | "parking"
  | "storage"
  | "other";

export type OccupancyType =
  | "tenant"
  | "resident"
  | "commercial_occupant"
  | "other";

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
  created_at: string;
  updated_at: string;
  users_profiles?: UserProfile;
}

export interface Building {
  id: string;
  organization_id: string;
  condominium_id: string;
  name: string;
  address: string;
  floors: number | null;
  entrance_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface Condominium {
  id: string;
  organization_id: string;
  name: string;
  address: string;
  cadastral_number: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyUnit {
  id: string;
  organization_id: string;
  condominium_id: string;
  building_id: string;
  number: string;
  unit_type: PropertyUnitType;
  cadastral_number: string | null;
  entrance: string | null;
  floor: number | null;
  area_sqm: number | null;
  common_share: number | null;
  has_voting_rights: boolean;
  created_at: string;
  updated_at: string;
  buildings?: Building;
  condominiums?: Condominium;
  property_ownerships?: (PropertyOwnership & { persons?: Person })[];
}

export interface Person {
  id: string;
  organization_id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyOwnership {
  id: string;
  organization_id: string;
  property_unit_id: string;
  person_id: string;
  ownership_share: number;
  valid_from: string;
  valid_to: string | null;
  document_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyOccupancy {
  id: string;
  organization_id: string;
  property_unit_id: string;
  person_id: string;
  occupancy_type: OccupancyType;
  valid_from: string;
  valid_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyMandate {
  id: string;
  organization_id: string;
  grantor_person_id: string;
  representative_person_id: string;
  property_unit_id: string | null;
  scopes: string[];
  valid_from: string;
  valid_to: string;
  document_reference: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
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
  property_unit_id: string;
  option_id: string;
  voter_id: string;
  created_at: string;
}

export interface ServiceRequest {
  id: string;
  organization_id: string;
  property_unit_id: string | null;
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
      condominiums: { Row: Condominium; Insert: Partial<Condominium>; Update: Partial<Condominium>; Relationships: [] };
      buildings: { Row: Building; Insert: Partial<Building>; Update: Partial<Building>; Relationships: [] };
      property_units: { Row: PropertyUnit; Insert: Partial<PropertyUnit>; Update: Partial<PropertyUnit>; Relationships: [] };
      persons: { Row: Person; Insert: Partial<Person>; Update: Partial<Person>; Relationships: [] };
      property_ownerships: { Row: PropertyOwnership; Insert: Partial<PropertyOwnership>; Update: Partial<PropertyOwnership>; Relationships: [] };
      property_occupancies: { Row: PropertyOccupancy; Insert: Partial<PropertyOccupancy>; Update: Partial<PropertyOccupancy>; Relationships: [] };
      property_mandates: { Row: PropertyMandate; Insert: Partial<PropertyMandate>; Update: Partial<PropertyMandate>; Relationships: [] };
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
      create_property_unit: {
        Args: {
          p_organization_id: string;
          p_condominium_id: string;
          p_building_id: string;
          p_number: string;
          p_unit_type?: PropertyUnitType;
          p_cadastral_number?: string | null;
          p_floor?: number | null;
          p_area_sqm?: number | null;
          p_has_voting_rights?: boolean;
          p_owner_user_id?: string | null;
        };
        Returns: PropertyUnit;
      };
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
      property_unit_type: PropertyUnitType;
      occupancy_type: OccupancyType;
      invitation_status: InvitationStatus;
      notification_type: NotificationType;
    };
    CompositeTypes: Record<string, never>;
  };
}
