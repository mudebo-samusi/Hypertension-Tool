
from flask import Flask
from flask_migrate import Migrate, MigrateCommand
from flask_script import Manager
from db import db
from models.user import User
from models.bp_reading import BPReading
from models.review import Review
from models.subscription import Subscription
from models.payments import Payment
from models.ad import Ad
from models.post import Post
from models.comment import Comment
from models.like import Like

# Create a minimal app for migrations
app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///hypertension.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize extensions
db.init_app(app)
migrate = Migrate(app, db)
manager = Manager(app)
manager.add_command('db', MigrateCommand)

if __name__ == '__main__':
    manager.run()