'use client';

import { useState, useEffect, useCallback } from 'react';
import { loadUsers, saveUsers, deleteMessages } from '@/lib/storage';

/**
 * Manages the list of saved users and which one is currently active.
 * Persists to localStorage so users survive page reloads.
 */
export default function useUsers() {
  const [data, setData] = useState({ users: [], activeUserId: null });
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setData(loadUsers());
    setLoaded(true);
  }, []);

  // Persist every change
  useEffect(() => {
    if (loaded) saveUsers(data);
  }, [data, loaded]);

  const addUser = useCallback(({ id, label, email, name, source }) => {
    setData((prev) => {
      if (prev.users.some((u) => u.id === id)) {
        return { ...prev, activeUserId: id };
      }
      return {
        users: [
          ...prev.users,
          {
            id,
            label: label || `User ${prev.users.length + 1}`,
            email: email || null,
            name: name || null,
            source: source || 'chat',
            createdAt: new Date().toISOString(),
          },
        ],
        activeUserId: id,
      };
    });
  }, []);

  const selectUser = useCallback((id) => {
    setData((prev) => ({ ...prev, activeUserId: id }));
  }, []);

  const startNewUser = useCallback(() => {
    setData((prev) => ({ ...prev, activeUserId: null }));
  }, []);

  const removeUser = useCallback((id) => {
    deleteMessages(id);
    setData((prev) => ({
      users: prev.users.filter((u) => u.id !== id),
      activeUserId: prev.activeUserId === id ? null : prev.activeUserId,
    }));
  }, []);

  const renameUser = useCallback((id, newLabel) => {
    setData((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === id ? { ...u, label: newLabel } : u)),
    }));
  }, []);

  return {
    users: data.users,
    activeUserId: data.activeUserId,
    activeUser: data.users.find((u) => u.id === data.activeUserId) || null,
    loaded,
    addUser,
    selectUser,
    startNewUser,
    removeUser,
    renameUser,
  };
}
