import React from "react";
import { useState } from "react";

const Settings = () => {
  const [email, setEmail] = useState("user@example.com");
  const [notifications, setNotifications] = useState(true);

  const handleSave = () => {
    alert("Settings saved successfully!");
  };

  return (
    <div>
      <h2>User Settings</h2>
      <label>Email: </label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      
      <br /><br />

      <label>
        <input type="checkbox" checked={notifications} onChange={() => setNotifications(!notifications)} />
        Receive BP Alerts
      </label>

      <br /><br />
      <button onClick={handleSave}>Save Changes</button>
    </div>
  );
};

export default Settings;
