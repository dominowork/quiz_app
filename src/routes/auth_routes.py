from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from src.models.quiz_models import db, User
import re

auth_bp = Blueprint('auth_bp', __name__)

def is_valid_email(email):
    # Basic email validation regex
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return re.match(pattern, email) is not None

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    is_admin = data.get('is_admin', False) # Default to non-admin

    if not username or not email or not password:
        return jsonify({'message': 'Missing username, email, or password'}), 400

    if not is_valid_email(email):
        return jsonify({'message': 'Invalid email format'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'Username already exists'}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'Email already exists'}), 409

    new_user = User(username=username, email=email, is_admin=is_admin)
    new_user.set_password(password) # Hash password
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'User registered successfully', 'user': new_user.to_dict()}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Missing username or password'}), 400

    user = User.query.filter_by(username=username).first()

    if user and user.check_password(password):
        # In a real app, you'd create a session or JWT token here
        return jsonify({'message': 'Login successful', 'user': user.to_dict(), 'is_admin': user.is_admin}), 200
    else:
        return jsonify({'message': 'Invalid username or password'}), 401

