from flask import Flask
from db import db, init_db
import sqlalchemy as sa
import logging

logging.basicConfig(level=logging.INFO)

# Create a minimal app for database operations
app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///hypertension.db"

# Initialize the database
with app.app_context():
    init_db(app)
    
    try:
        # Check if is_active column exists
        inspector = sa.inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns('User')]
        
        if 'is_active' not in columns:
            logging.info("Adding 'is_active' column to User table...")
            
            try:
                # SQLite has limited ALTER TABLE support, but this should work for adding a column with default
                db.session.execute(sa.text("ALTER TABLE user ADD COLUMN is_active BOOLEAN DEFAULT 1 NOT NULL"))
                db.session.commit()
                logging.info("Successfully added 'is_active' column with default value True")
            except Exception as alter_error:
                logging.error(f"Error with ALTER TABLE: {alter_error}")
                logging.info("Attempting alternative migration approach...")
                
                # Alternative approach: Create new table with desired schema, copy data, rename tables
                # This would be more complex and is not implemented here
                # For SQLite, often the simplest approach is to manually modify the schema
                
                # We'll provide instructions for a manual fix if automated migration fails
                logging.info("Manual migration may be required. Please run:")
                logging.info("1. sqlite3 hypertension.db")
                logging.info("2. ALTER TABLE user ADD COLUMN is_active BOOLEAN DEFAULT 1 NOT NULL;")
                logging.info("3. .exit")
        else:
            logging.info("The 'is_active' column already exists in the User table")
    
    except Exception as e:
        logging.error(f"Error updating database schema: {e}")
        db.session.rollback()

print("Database migration complete. Run this script only once.")