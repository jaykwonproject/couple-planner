// src/screens/LoginScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuthRequest } from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { auth } from '../config/firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

WebBrowser.maybeCompleteAuthSession();

const LoginScreen = () => {
  const [request, response, promptAsync] = useAuthRequest({
    expoClientId: '', // We'll add this later for mobile
    webClientId: '1080020552403-n6r1eks24fippimvh87cmb4u8urb6ap4.apps.googleusercontent.com',
    responseType: 'id_token', // Add this line
    redirectUri: makeRedirectUri({
        scheme: 'your-scheme',
        path: 'redirect'
      })
  });
  console.log('Redirect URI:', makeRedirectUri({ // Add this to see what redirect URI is being used
    scheme: 'your-scheme',
    path: 'redirect'
  }));
  React.useEffect(() => {
    if (response?.type === 'success') {
      console.log('Auth Response:', response); // Debug log
      const { id_token } = response.params;
      console.log('ID Token received:', !!id_token); // Debug log
      
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .then((result) => {
          console.log('Sign in successful:', result.user.email); // Debug log
        })
        .catch((error) => {
          console.error('Sign in error:', error); // Debug log
        });
    }
  }, [response]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Couple Planner</Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => {
          console.log('Sign in button pressed'); // Debug log
          promptAsync();
        }}
      >
        <Text style={styles.buttonText}>Sign in with Google</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 5,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
});

export default LoginScreen;