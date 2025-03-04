// App.tsx
import React from 'react';
import { auth } from './src/config/firebase';
import { User } from 'firebase/auth';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [user, setUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    console.log('Setting up auth listener'); // Debug log
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log('Auth state changed:', user?.email); // Debug log
      setUser(user);
    });
    return unsubscribe;
  }, []);

  return <AppNavigator user={user} />;
}