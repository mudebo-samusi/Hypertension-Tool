
import sqlite3

# Connect to the database
conn = sqlite3.connect('hypertension.db')
cursor = conn.cursor()

# Check if column exists
cursor.execute("PRAGMA table_info(user)")
columns = cursor.fetchall()
column_names = [column[1] for column in columns]

# Add the column if it doesn't exist
if 'profile_image' not in column_names:
    cursor.execute("ALTER TABLE user ADD COLUMN profile_image TEXT")
    print("Column 'profile_image' added to the user table")
else:
    print("Column 'profile_image' already exists")

# Commit and close
conn.commit()
conn.close()