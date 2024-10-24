import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../assets/styles/UserSection.css';  // Assuming you create a CSS file for UserSection styling

const UserSection = () => {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Fetch users when the component is mounted
    const fetchUsers = async () => {
      try {
        const response = await axios.get('/api/users');
        setUsers(response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
        setMessage('Error fetching user data.');
      }
    };

    fetchUsers();
  }, []);

  const deleteUser = async (userId) => {
    try {
      await axios.delete(`/api/users/${userId}`);
      // Filter out the deleted user from the state
      setUsers(users.filter((user) => user.id !== userId));
      setMessage('User deleted successfully.');
    } catch (error) {
      console.error('Error deleting user:', error);
      setMessage('Error deleting user.');
    }
  };

  return (
    <div className="user-section">
      <h2>Registered Users</h2>
      {message && <p className="message">{message}</p>}
      <table className="table table-striped">
        <thead>
          <tr>
            <th>ID</th>
            <th>Full Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length > 0 ? (
            users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.full_name}</td>
                <td>{user.email}</td>
                <td>{user.phone_number}</td>
                <td>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => deleteUser(user.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5">No users found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UserSection;
