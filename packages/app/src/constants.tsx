
import { PasswordEntry, Category } from '@premium-password-manager/core';

export const CATEGORIES: Category[] = ['All', 'Personal', 'Work', 'Others'];

export const MOCK_PASSWORDS: PasswordEntry[] = [
  {
    id: '1',
    title: 'Google Account',
    username: 'alex.doe@gmail.com',
    website: 'google.com',
    category: 'Work',
    tags: ['Primary', 'Email', '2FA'],
    strength: 'Secure',
    lastUpdated: '2 days ago',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    favorite: true
  },
  {
    id: '2',
    title: 'Netflix',
    username: 'alex_streaming',
    website: 'netflix.com',
    category: 'Personal',
    tags: ['Entertainment', 'Family'],
    strength: 'Medium',
    lastUpdated: '1 month ago',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    favorite: false
  },
  {
    id: '3',
    title: 'Bank of America',
    username: 'alex_bank_2024',
    website: 'bankofamerica.com',
    category: 'Others',
    tags: ['Banking', 'Credit Card'],
    strength: 'Secure',
    lastUpdated: '5 days ago',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    favorite: true
  },
  {
    id: '4',
    title: 'Instagram',
    username: 'alex_visuals',
    website: 'instagram.com',
    category: 'Personal',
    tags: ['Social Media', 'Photos'],
    strength: 'Weak',
    lastUpdated: 'Just now',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    favorite: false
  },
  {
    id: '5',
    title: 'Amazon Shopping',
    username: 'alex.doe@outlook.com',
    website: 'amazon.com',
    category: 'Others',
    tags: ['Shopping', 'Prime'],
    strength: 'Strong',
    lastUpdated: '2 weeks ago',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    favorite: false
  }
];