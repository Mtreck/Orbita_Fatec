import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

import { firebaseConfig } from "../core/firebase-config.js";


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { doc, getDoc, updateDoc };

// CRUD Helpers
export async function getAll(colName) {
  const q = query(collection(db, colName), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getActive(colName) {
  const q = query(collection(db, colName), where('active', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getById(colName, id) {
  const snap = await getDoc(doc(db, colName, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function create(colName, data) {
  return await addDoc(collection(db, colName), {
    ...data,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function update(colName, id, data) {
  const ref = doc(db, colName, id);
  return await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function remove(colName, id) {
  return await deleteDoc(doc(db, colName, id));
}

export async function toggleActive(colName, id, currentState) {
  return await update(colName, id, { active: !currentState });
}

// Specific Queries
export async function getCalendarEntries(filters = {}) {
  let q = collection(db, 'calendarEntries');
  const constraints = [where('active', '==', true)];
  
  if (filters.courseId) constraints.push(where('courseId', '==', filters.courseId));
  if (filters.classId) constraints.push(where('classId', '==', filters.classId));
  if (filters.roomId) constraints.push(where('roomId', '==', filters.roomId));
  if (filters.weekday) constraints.push(where('weekday', '==', parseInt(filters.weekday)));

  const snap = await getDocs(query(q, ...constraints));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function checkConflict(weekday, periods, roomId, classId, excludeId = null) {
  const q = query(
    collection(db, 'calendarEntries'),
    where('active', '==', true),
    where('weekday', '==', parseInt(weekday))
  );
  
  const snap = await getDocs(q);
  const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const conflicts = [];
  
  for (const entry of entries) {
    if (excludeId && entry.id === excludeId) continue;
    
    // Check if periods overlap
    const hasPeriodOverlap = entry.periods.some(p => periods.includes(p));
    
    if (hasPeriodOverlap) {
      const entryClassIds = entry.classIds || [entry.classId];
      if (entryClassIds.includes(classId)) {
        conflicts.push(`A turma já possui aula neste período.`);
      }
      if (roomId && entry.roomId === roomId) {
        conflicts.push(`A sala já está ocupada neste período.`);
      }
    }
  }
  
  return conflicts;
}
