
import React, { useState, useEffect } from "react";
import { X, Search, UserPlus, Check, UserMinus } from "lucide-react";
import api from "../services/api";

export default function ContactSelectionModal({ isOpen, onClose, onContactsChanged }) {
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState({});
  const [removing, setRemoving] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [allUsers, myContacts] = await Promise.all([
          api.get('/api/chat/users'),
          api.getContacts()
        ]);
        const currentUser = api.getCurrentUser();
        setUsers(allUsers.filter(u => u.id !== currentUser?.id));
        setContacts(myContacts.map(c => c.id));
      } catch (e) {
        setError("Failed to load users or contacts.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isOpen]);

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(search.toLowerCase()) ||
    user.name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase())
  );

  const isContact = (userId) => contacts.includes(userId);

  const handleAddContact = async (userId) => {
    setAdding(prev => ({ ...prev, [userId]: true }));
    try {
      await api.addContact(userId);
      setContacts(prev => [...prev, userId]);
      onContactsChanged && onContactsChanged();
    } catch (e) {
      setError("Failed to add contact.");
    } finally {
      setAdding(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleRemoveContact = async (userId) => {
    setRemoving(prev => ({ ...prev, [userId]: true }));
    try {
      await api.removeContact(userId);
      setContacts(prev => prev.filter(id => id !== userId));
      onContactsChanged && onContactsChanged();
    } catch (e) {
      setError("Failed to remove contact.");
    } finally {
      setRemoving(prev => ({ ...prev, [userId]: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Manage Contacts</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 border-b">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {error && (
            <div className="mt-2 text-red-600 text-sm">{error}</div>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No users found</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <li key={user.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-violet-400 flex items-center justify-center mr-3">
                      <span className="text-white font-medium">
                        {(user.name || user.username || "U").substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{user.name || user.username}</h4>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div>
                    {isContact(user.id) ? (
                      <button
                        className="flex items-center px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                        disabled={removing[user.id]}
                        onClick={() => handleRemoveContact(user.id)}
                      >
                        <UserMinus size={16} className="mr-1" />
                        {removing[user.id] ? "Removing..." : "Remove"}
                      </button>
                    ) : (
                      <button
                        className="flex items-center px-2 py-1 bg-violet-100 text-violet-700 rounded hover:bg-violet-200"
                        disabled={adding[user.id]}
                        onClick={() => handleAddContact(user.id)}
                      >
                        <UserPlus size={16} className="mr-1" />
                        {adding[user.id] ? "Adding..." : "Add"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}