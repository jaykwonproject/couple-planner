// src/components/SettingsDropdown.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Settings } from 'lucide-react-native';

interface SettingsDropdownProps {
  coupleSpaceId: string;
  onLeaveSpace: () => void;
  onLogout: () => void;
}

const SettingsDropdown = ({ coupleSpaceId, onLeaveSpace, onLogout }: SettingsDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setIsOpen(!isOpen)} style={styles.iconButton}>
        <Settings size={24} color="#333" />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdown}>
          <TouchableOpacity 
            style={styles.dropdownItem}
            onPress={() => {
              navigator.clipboard.writeText(coupleSpaceId);
              alert('Join code copied to clipboard!');
              setIsOpen(false);
            }}
          >
            <Text style={styles.dropdownText}>Copy Join Code</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dropdownItem}
            onPress={() => {
              onLeaveSpace();
              setIsOpen(false);
            }}
          >
            <Text style={styles.dropdownText}>Leave Space</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dropdownItem}
            onPress={() => {
              onLogout();
              setIsOpen(false);
            }}
          >
            <Text style={styles.dropdownText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1000,
  },
  iconButton: {
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 150,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
});

export default SettingsDropdown;