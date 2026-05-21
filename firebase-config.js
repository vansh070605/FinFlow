// Firebase Configuration Template
// Replace the values below with your actual config details from the Firebase Console!
const firebaseConfig = {
  apiKey: "AIzaSyDZH4-DhvnEtJ6TDPtW9GSbK3EiglcEVhk",
  authDomain: "finflow-bb0fd.firebaseapp.com",
  projectId: "finflow-bb0fd",
  storageBucket: "finflow-bb0fd.firebasestorage.app",
  messagingSenderId: "701448552948",
  appId: "1:701448552948:web:9984b5c72c149ede9439a1"
};

let auth = null;
let firestore = null;

// Initialize Firebase only if the apiKey has been filled in by the user
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
  try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    firestore = firebase.firestore();
    
    // Enable offline persistence for firestore so data caches locally when offline
    firestore.enablePersistence().catch((err) => {
      if (err.code == 'failed-precondition') {
        console.warn("Firestore persistence failed: Multiple tabs open in the same browser.");
      } else if (err.code == 'unimplemented') {
        console.warn("Firestore persistence is not supported by this browser.");
      }
    });
  } catch (error) {
    console.error("Firebase Initialization Error:", error);
  }
}
