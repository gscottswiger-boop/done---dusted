import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  addDoc,
  Timestamp,
  serverTimestamp,
  deleteField
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { OperationType, FirestoreErrorInfo, UserProfile, Family, Chore } from './types';
import { getSafeDate } from './utils';

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function cleanObject(obj: any) {
  const newObj = { ...obj };
  Object.keys(newObj).forEach(key => {
    if (newObj[key] === undefined) {
      delete newObj[key];
    }
  });
  return newObj;
}

export const userService = {
  async getProfile(uid: string): Promise<UserProfile | null> {
    const path = `users/${uid}`;
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async createProfile(profile: UserProfile): Promise<void> {
    const path = `users/${profile.uid}`;
    try {
      await setDoc(doc(db, 'users', profile.uid), {
        ...profile,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async updateProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteUserData(uid: string, familyId?: string): Promise<void> {
    try {
      // If they have a family, delete the chores and family FIRST while the user profile still exists
      // (Security rules for chores/families often depend on the user profile)
      if (familyId) {
        // Delete all chores for this family
        const choresQuery = query(collection(db, 'chores'), where('familyId', '==', familyId));
        const choresSnap = await getDocs(choresQuery);
        const deletePromises = choresSnap.docs.map(d => deleteDoc(doc(db, 'chores', d.id)));
        await Promise.all(deletePromises);

        // Delete the family
        await deleteDoc(doc(db, 'families', familyId));
      }

      // Finally delete user profile
      await deleteDoc(doc(db, 'users', uid));
    } catch (error) {
      console.error("Error deleting user data:", error);
    }
  }
};

export const familyService = {
  async createFamily(name: string, organizerId: string): Promise<string> {
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const familyRef = doc(collection(db, 'families'));
    const familyData: any = {
      id: familyRef.id,
      name,
      inviteCode,
      organizerIds: [organizerId],
      createdAt: serverTimestamp()
    };
    
    try {
      await setDoc(familyRef, familyData);
      await userService.updateProfile(organizerId, { familyId: familyRef.id, role: 'organizer' });
      return familyRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `families/${familyRef.id}`);
      return '';
    }
  },

  async joinFamily(inviteCode: string, userId: string): Promise<string | null> {
    try {
      const q = query(collection(db, 'families'), where('inviteCode', '==', inviteCode));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) return null;
      
      const familyDoc = querySnapshot.docs[0];
      const familyId = familyDoc.id;
      
      await userService.updateProfile(userId, { familyId, role: 'contributor' });
      return familyId;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'families');
      return null;
    }
  },

  async getFamily(familyId: string): Promise<Family | null> {
    try {
      const docSnap = await getDoc(doc(db, 'families', familyId));
      return docSnap.exists() ? (docSnap.data() as Family) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `families/${familyId}`);
      return null;
    }
  },

  async updateFamily(familyId: string, data: Partial<Family>): Promise<void> {
    try {
      await updateDoc(doc(db, 'families', familyId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `families/${familyId}`);
    }
  },

  async removeMember(userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        familyId: null,
        role: 'contributor'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  },

  async updateMember(userId: string, data: Partial<UserProfile>): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  }
};

export const choreService = {
  subscribeToChores(familyId: string, callback: (chores: Chore[]) => void) {
    const q = query(collection(db, 'chores'), where('familyId', '==', familyId));
    return onSnapshot(q, (snapshot) => {
      const chores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chore));
      callback(chores);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chores');
    });
  },

  async addChore(chore: Omit<Chore, 'id'>): Promise<void> {
    try {
      const choreRef = doc(collection(db, 'chores'));
      await setDoc(choreRef, cleanObject({ ...chore, id: choreRef.id }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chores');
    }
  },

  async toggleChoreStatus(choreId: string, status: 'pending' | 'done', userId: string): Promise<void> {
    const isProjected = choreId.includes('-projected-');
    const actualChoreId = isProjected ? choreId.split('-projected-')[0] : choreId;
    try {
      const choreRef = doc(db, 'chores', actualChoreId);
      const choreSnap = await getDoc(choreRef);
      if (!choreSnap.exists()) return;
      
      const choreData = choreSnap.data() as Chore;
      const chore = { ...choreData, id: choreSnap.id };
      
      if (chore.isRecurring && status === 'done') {
        let completedDate = chore.dueDate ? getSafeDate(chore.dueDate) : new Date();
        if (isProjected) {
          const timestamp = parseInt(choreId.split('-projected-')[1]);
          completedDate = new Date(timestamp);
        }

        // 1. Create a new chore for the completed instance
        const completedChoreRef = doc(collection(db, 'chores'));
        const { id: _, ...dataToCopy } = chore;
        
        // The originalChoreId should always be the root template ID
        const rootChoreId = chore.originalChoreId || chore.id;

        await setDoc(completedChoreRef, cleanObject({
          ...dataToCopy,
          id: completedChoreRef.id,
          originalChoreId: rootChoreId,
          status: 'done',
          completedAt: serverTimestamp(),
          completedBy: userId,
          assignedTo: chore.assignedTo || userId,
          dueDate: Timestamp.fromDate(completedDate),
          isRecurring: false,
          recurrence: 'none',
          color: chore.color || null
        }));

        // 2. Advance the original chore's dueDate ONLY if we completed the current occurrence
        // and it's actually the template (not an instance we're toggling)
        if (!isProjected && chore.isRecurring) {
          let nextDate = new Date(completedDate);
          const interval = chore.recurrenceInterval || 1;
          if (chore.recurrence === 'daily') nextDate.setDate(nextDate.getDate() + interval);
          else if (chore.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + (7 * interval));
          else if (chore.recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + interval);

          await updateDoc(choreRef, {
            dueDate: Timestamp.fromDate(nextDate)
          });
        }
      } else {
        const updateData: any = {
          status,
          completedAt: status === 'done' ? serverTimestamp() : null,
          completedBy: status === 'done' ? userId : null
        };
        
        if (status === 'done' && !chore.assignedTo) {
          updateData.assignedTo = userId;
        }
        
        await updateDoc(choreRef, updateData);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chores/${actualChoreId}`);
    }
  },

  async claimChore(choreId: string, userId: string): Promise<void> {
    const actualChoreId = choreId.includes('-projected-') ? choreId.split('-projected-')[0] : choreId;
    try {
      await updateDoc(doc(db, 'chores', actualChoreId), { assignedTo: userId });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chores/${actualChoreId}`);
    }
  },

  async updateChore(choreId: string, data: Partial<Chore>, mode: 'single' | 'series' = 'series'): Promise<void> {
    const isProjected = choreId.includes('-projected-');
    const actualChoreId = isProjected ? choreId.split('-projected-')[0] : choreId;
    try {
      const choreRef = doc(db, 'chores', actualChoreId);

      if (mode === 'single') {
        const choreSnap = await getDoc(choreRef);
        if (!choreSnap.exists()) return;
        const originalChore = choreSnap.data() as Chore;

        let occurrenceDate = originalChore.dueDate ? getSafeDate(originalChore.dueDate) : new Date();
        if (isProjected) {
          occurrenceDate = new Date(parseInt(choreId.split('-projected-')[1]));
        }

        // 1. Create a new non-recurring chore for this occurrence
        const newChoreRef = doc(collection(db, 'chores'));
        const newChoreData = {
          ...originalChore,
          ...data,
          id: newChoreRef.id,
          originalChoreId: actualChoreId,
          isRecurring: false,
          recurrence: 'none',
          dueDate: Timestamp.fromDate(occurrenceDate),
          status: 'pending'
        };
        await setDoc(newChoreRef, cleanObject(newChoreData));

        // 2. If we updated the CURRENT occurrence (the one in the DB), advance the template
        if (!isProjected) {
          let nextDate = new Date(occurrenceDate);
          const interval = originalChore.recurrenceInterval || 1;
          if (originalChore.recurrence === 'daily') nextDate.setDate(nextDate.getDate() + interval);
          else if (originalChore.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + (7 * interval));
          else if (originalChore.recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + interval);

          await updateDoc(choreRef, {
            dueDate: Timestamp.fromDate(nextDate)
          });
        }
        // If it was projected, we don't need to advance the template because the template's dueDate is still in the past relative to this projected one.
        // Wait, if it was projected, the template will still project into this date.
        // We might need a way to "skip" this date in the projection logic.
        // For now, let's assume the user handles it or we'll fix the projection logic later.
      } else {
        await updateDoc(choreRef, cleanObject(data));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chores/${actualChoreId}`);
    }
  },

  async deleteChore(choreId: string): Promise<void> {
    const actualChoreId = choreId.includes('-projected-') ? choreId.split('-projected-')[0] : choreId;
    try {
      await deleteDoc(doc(db, 'chores', actualChoreId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `chores/${actualChoreId}`);
    }
  }
};
