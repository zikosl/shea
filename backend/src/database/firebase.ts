// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBO2W4odGXnl2d952ck-VyC98SB35mn5qo",
    authDomain: "glowy-41d72.firebaseapp.com",
    projectId: "glowy-41d72",
    storageBucket: "glowy-41d72.firebasestorage.app",
    messagingSenderId: "1061931426843",
    appId: "1:1061931426843:web:6e326bb50b3b93199f44be",
    measurementId: "G-WNEXCM3EXX"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);

