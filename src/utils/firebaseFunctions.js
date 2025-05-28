import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';


 export const addUser = async (email, userId) => {

    const role = "doctor";

    try {
      await setDoc(doc(db, 'users', userId), {
        email,
        role,
        createdAt: new Date(),
      });
      console.log("Hospital user added successfully");
    } catch (error) {
      console.log('Failed to register: ' + error.message);
    }
  };

  

