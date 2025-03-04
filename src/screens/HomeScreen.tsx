// src/screens/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { auth, db } from '../config/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot} from 'firebase/firestore';
import WeekendPlan from '../components/WeekendPlan';
import PlannerLayout from '../components/PlannerLayout';

interface CoupleSpace {
  id: string;
  creator: string;
  partner?: string;
  createdAt: number;
}

const HomeScreen = () => {
  const [coupleSpace, setCoupleSpace] = useState<CoupleSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [showingPlanner, setShowingPlanner] = useState(false);
  useEffect(() => {
    let unsubscribeSpace: (() => void) | null = null;

    const checkCoupleSpace = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().coupleSpaceId) {
          const spaceRef = doc(db, 'coupleSpaces', userDoc.data().coupleSpaceId);
          
          // Set up real-time listener
          unsubscribeSpace = onSnapshot(spaceRef, (spaceDoc) => {
            if (spaceDoc.exists()) {
              setCoupleSpace(spaceDoc.data() as CoupleSpace);
            }
          });
        }
        setLoading(false);
      } catch (error) {
        console.error('Error checking couple space:', error);
        setLoading(false);
      }
    };

    checkCoupleSpace();

    // Cleanup listener on unmount
    return () => {
      if (unsubscribeSpace) {
        unsubscribeSpace();
      }
    };
  }, []);

  const checkCoupleSpace = async () => {
    if (!auth.currentUser) return;
    
    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists() && userDoc.data().coupleSpaceId) {
        const spaceRef = doc(db, 'coupleSpaces', userDoc.data().coupleSpaceId);
        const spaceDoc = await getDoc(spaceRef);
        if (spaceDoc.exists()) {
          setCoupleSpace(spaceDoc.data() as CoupleSpace);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error checking couple space:', error);
      setLoading(false);
    }
  };

  const createCoupleSpace = async () => {
    if (!auth.currentUser) return;
    setError('');
    
    try {
      const newSpaceId = auth.currentUser.uid;
      const spaceData: CoupleSpace = {
        id: newSpaceId,
        creator: auth.currentUser.uid,
        createdAt: Date.now()
      };
      
      await setDoc(doc(db, 'coupleSpaces', newSpaceId), spaceData);
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        coupleSpaceId: newSpaceId,
        email: auth.currentUser.email
      });
      
      setCoupleSpace(spaceData);
    } catch (error) {
      setError('Failed to create couple space. Please try again.');
      console.error('Error creating couple space:', error);
    }
  };

  const resetCoupleSpace = async () => {
    if (!auth.currentUser) return;
    
    try {
      // First, remove the coupleSpaceId from user document
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, {
        email: auth.currentUser.email,
        coupleSpaceId: null  // Explicitly set to null
      }, { merge: true });  // Use merge to only update specified fields

      // If user created the space, delete it
      if (coupleSpace && coupleSpace.creator === auth.currentUser.uid) {
        const spaceRef = doc(db, 'coupleSpaces', coupleSpace.id);
        await deleteDoc(spaceRef);
      }
      
      // Reset local state
      setCoupleSpace(null);
      setError('');
      setJoinCode('');  // Clear join code input if exists
    } catch (error) {
      console.error('Error resetting couple space:', error);
      setError('Failed to reset. Please try again.');
    }
  };
  

  const joinCoupleSpace = async () => {
    if (!auth.currentUser || !joinCode) return;
    setError('');
    console.log('Starting join process...'); // Debug log
  
    try {
      const spaceRef = doc(db, 'coupleSpaces', joinCode);
      console.log('Checking space:', joinCode); // Debug log
      
      const spaceDoc = await getDoc(spaceRef);
      console.log('Space exists:', spaceDoc.exists()); // Debug log
  
      if (!spaceDoc.exists()) {
        setError('Invalid couple space code');
        return;
      }
  
      const spaceData = spaceDoc.data() as CoupleSpace;
      console.log('Space data:', spaceData); // Debug log
  
      if (spaceData.partner) {
        setError('This couple space is already full');
        return;
      }
  
      // Update the space first
      console.log('Updating space...'); // Debug log
      await updateDoc(spaceRef, {
        partner: auth.currentUser.uid
      });
  
      console.log('Space updated, updating user...'); // Debug log
      // Then update the user
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        coupleSpaceId: joinCode,
        email: auth.currentUser.email
      });
  
      console.log('Join complete!'); // Debug log
      setCoupleSpace({ ...spaceData, partner: auth.currentUser.uid });
      
    } catch (error) {
      console.error('Error joining couple space:', error);
      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      setError('Failed to join couple space. Please try again.');
    }
  };

  const signOut = () => {
    auth.signOut();
  };

   if (loading) {
    return <View style={styles.container}><Text>Loading...</Text></View>;
  }


  return (
    <View style={styles.container}>
      {coupleSpace && coupleSpace.partner ? (
        // Replace the Welcome message and WeekendPlan with PlannerLayout
        <PlannerLayout
          coupleSpaceId={coupleSpace.id}
          onLeaveSpace={resetCoupleSpace}
          onLogout={signOut}
        />
      ) : !coupleSpace ? (
        // Keep the create/join space view
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to Couple Planner!</Text>
          
          <View style={styles.section}>
            <Text style={styles.subtitle}>Create your couple space</Text>
            <TouchableOpacity 
              style={[styles.button, styles.createButton]}
              onPress={createCoupleSpace}
            >
              <Text style={styles.buttonText}>Create Couple Space</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.subtitle}>Or join existing space</Text>
            <TextInput
              style={styles.input}
              value={joinCode}
              onChangeText={setJoinCode}
              placeholder="Enter couple space code"
              placeholderTextColor="#666"
            />
            <TouchableOpacity 
              style={[styles.button, styles.joinButton]}
              onPress={joinCoupleSpace}
            >
              <Text style={styles.buttonText}>Join Space</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      ) : !coupleSpace.partner ? (
        // Keep the waiting for partner view
        <View style={styles.content}>
          <Text style={styles.title}>Share this code with your partner:</Text>
          <Text style={styles.codeText}>{coupleSpace.id}</Text>
          <Text style={styles.subtitle}>Waiting for partner to join...</Text>
          
          <TouchableOpacity 
            style={[styles.button, styles.backButton]}
            onPress={resetCoupleSpace}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      
      {/* Remove the sign out button since it's now in the settings dropdown */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  section: {
    width: '100%',
    marginVertical: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
    color: '#666',
  },
  codeText: {
    fontSize: 24,
    marginVertical: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    color: '#333',
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 10,
    fontSize: 16,
  },
  button: {
    width: '100%',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 5,
  },
  createButton: {
    backgroundColor: '#4CAF50',
  },
  joinButton: {
    backgroundColor: '#2196F3',
  },
  signOutButton: {
    backgroundColor: '#f44336',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    color: '#f44336',
    marginTop: 10,
    textAlign: 'center',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 20,
  },
  backButton: {
    backgroundColor: '#666',
    marginTop: 20,
  },
});

export default HomeScreen;