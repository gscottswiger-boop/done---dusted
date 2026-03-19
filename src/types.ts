export type UserRole = 'organizer' | 'contributor';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  familyId?: string;
  role: UserRole;
  photoURL?: string;
  createdAt?: any;
}

export interface Family {
  id: string;
  name: string;
  inviteCode: string;
  organizerIds: string[];
  createdAt?: any;
}

export interface Chore {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  assignedTo?: string;
  status: 'pending' | 'done';
  dueDate?: any; // Firestore Timestamp
  points?: number;
  createdBy: string;
  completedAt?: any; // Firestore Timestamp
  completedBy?: string;
  isRecurring?: boolean;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  recurrenceInterval?: number;
  isProjected?: boolean;
  originalChoreId?: string;
  color?: string;
  endDate?: any; // Firestore Timestamp for date ranges
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
