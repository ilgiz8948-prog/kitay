import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the specific database ID if provided in config, otherwise default
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

export { db };

// Helper to save a single batch to Firestore
export async function saveBatchToCloud(batch: any) {
  try {
    const docRef = doc(db, 'batches', batch.id);
    await setDoc(docRef, batch);
  } catch (error) {
    console.error('Error saving batch to cloud:', error);
    throw error;
  }
}

// Helper to delete a single batch from Firestore
export async function deleteBatchFromCloud(batchId: string) {
  try {
    const docRef = doc(db, 'batches', batchId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting batch from cloud:', error);
    throw error;
  }
}

// Helper to load all batches from Firestore
export async function loadBatchesFromCloud() {
  try {
    const colRef = collection(db, 'batches');
    const snapshot = await getDocs(colRef);
    const batches: any[] = [];
    snapshot.forEach(docSnap => {
      batches.push({ id: docSnap.id, ...docSnap.data() });
    });
    return batches;
  } catch (error: any) {
    console.warn('Unable to load batches from cloud (offline mode active):', error?.message || error);
    return null;
  }
}

// Helper to save settings
export async function saveSettingsToCloud(settings: any) {
  try {
    const docRef = doc(db, 'app', 'settings');
    await setDoc(docRef, settings);
  } catch (error) {
    console.error('Error saving settings to cloud:', error);
    throw error;
  }
}

// Helper to load settings
export async function loadSettingsFromCloud() {
  try {
    const docRef = doc(db, 'app', 'settings');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error: any) {
    console.warn('Unable to load settings from cloud (offline mode active):', error?.message || error);
    return null;
  }
}

// Helper to save a single debt to Firestore
export async function saveDebtToCloud(debt: any) {
  try {
    const docRef = doc(db, 'debts', debt.id);
    await setDoc(docRef, debt);
  } catch (error) {
    console.error('Error saving debt to cloud:', error);
    throw error;
  }
}

// Helper to delete a debt from Firestore
export async function deleteDebtFromCloud(debtId: string) {
  try {
    const docRef = doc(db, 'debts', debtId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting debt from cloud:', error);
    throw error;
  }
}

// Helper to load all debts from Firestore
export async function loadDebtsFromCloud() {
  try {
    const colRef = collection(db, 'debts');
    const snapshot = await getDocs(colRef);
    const debts: any[] = [];
    snapshot.forEach(docSnap => {
      debts.push({ id: docSnap.id, ...docSnap.data() });
    });
    return debts;
  } catch (error: any) {
    console.warn('Unable to load debts from cloud (offline mode active):', error?.message || error);
    return null;
  }
}

// Helper to save a single sale record to Firestore
export async function saveSaleToCloud(sale: any) {
  try {
    const docRef = doc(db, 'sales', sale.id);
    await setDoc(docRef, sale);
  } catch (error) {
    console.error('Error saving sale to cloud:', error);
    throw error;
  }
}

// Helper to delete a sale record from Firestore
export async function deleteSaleFromCloud(saleId: string) {
  try {
    const docRef = doc(db, 'sales', saleId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting sale from cloud:', error);
    throw error;
  }
}

// Helper to load all sales from Firestore
export async function loadSalesFromCloud() {
  try {
    const colRef = collection(db, 'sales');
    const snapshot = await getDocs(colRef);
    const sales: any[] = [];
    snapshot.forEach(docSnap => {
      sales.push({ id: docSnap.id, ...docSnap.data() });
    });
    return sales;
  } catch (error: any) {
    console.warn('Unable to load sales from cloud (offline mode active):', error?.message || error);
    return null;
  }
}

