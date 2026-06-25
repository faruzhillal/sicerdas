import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: 'complaint' | 'scholarship' | 'system',
  link?: string
) {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      message,
      type,
      link: link || '',
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

export async function createAdminNotification(
  title: string,
  message: string,
  type: 'complaint' | 'scholarship' | 'system',
  link?: string
) {
  return createNotification('admin', title, message, type, link);
}
