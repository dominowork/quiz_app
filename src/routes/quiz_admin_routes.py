from flask import Blueprint, request, jsonify
from src.models.quiz_models import db, Question, Option, User
import functools

quiz_admin_bp = Blueprint('quiz_admin_bp', __name__)

def admin_required(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        admin_user_id = request.headers.get('X-Admin-User-ID')
        if not admin_user_id:
            return jsonify({'message': 'Admin user ID required'}), 401
        try:
            user = User.query.get(int(admin_user_id))
            if not user or not user.is_admin:
                return jsonify({'message': 'Admin privileges required'}), 403
        except ValueError:
             return jsonify({'message': 'Invalid Admin User ID format'}), 400
        return fn(*args, **kwargs)
    return wrapper

@quiz_admin_bp.route('/questions', methods=['POST'])
@admin_required
def create_question():
    data = request.get_json()
    question_text = data.get('text')
    options_data = data.get('options')

    if not question_text or not options_data:
        return jsonify({'message': 'Missing question text or options'}), 400
    if not isinstance(options_data, list) or len(options_data) < 2:
        return jsonify({'message': 'At least two options are required'}), 400

    correct_options_count = sum(1 for opt in options_data if opt.get('is_correct') is True)
    if correct_options_count != 1:
        return jsonify({'message': 'Exactly one option must be correct'}), 400

    new_question = Question(text=question_text)
    db.session.add(new_question)
    db.session.flush() # Ensure new_question.id is available for options

    for opt_data in options_data:
        if not opt_data.get('text'):
            db.session.rollback()
            return jsonify({'message': 'Option text cannot be empty'}), 400
        option = Option(
            text=opt_data['text'],
            is_correct=opt_data.get('is_correct', False),
            question_id=new_question.id
        )
        db.session.add(option)
    
    db.session.commit()
    return jsonify(new_question.to_dict()), 201

@quiz_admin_bp.route('/questions', methods=['GET'])
@admin_required
def get_all_questions():
    questions = Question.query.all()
    return jsonify([q.to_dict() for q in questions]), 200

@quiz_admin_bp.route('/questions/<int:question_id>', methods=['GET'])
@admin_required
def get_question(question_id):
    question = Question.query.get_or_404(question_id)
    return jsonify(question.to_dict()), 200

@quiz_admin_bp.route('/questions/<int:question_id>', methods=['PUT'])
@admin_required
def update_question(question_id):
    question = Question.query.get_or_404(question_id)
    data = request.get_json()
    updated = False

    if 'text' in data:
        question.text = data['text']
        updated = True
    
    if 'options' in data:
        options_data = data['options']
        if not isinstance(options_data, list) or len(options_data) < 2:
            return jsonify({'message': 'At least two options are required'}), 400
        
        correct_options_count = sum(1 for opt in options_data if opt.get('is_correct') is True)
        if correct_options_count != 1:
            return jsonify({'message': 'Exactly one option must be correct'}), 400

        # Remove old options
        for old_option in question.options:
            db.session.delete(old_option)
        
        # Add new options
        for opt_data in options_data:
            if not opt_data.get('text'):
                # db.session.rollback() # Consider implications of partial update
                return jsonify({'message': 'Option text cannot be empty'}), 400
            option = Option(
                text=opt_data['text'], 
                is_correct=opt_data.get('is_correct', False), 
                question_id=question.id
            )
            db.session.add(option)
        updated = True
            
    if updated:
        db.session.commit()
    return jsonify(question.to_dict()), 200

@quiz_admin_bp.route('/questions/<int:question_id>', methods=['DELETE'])
@admin_required
def delete_question(question_id):
    question = Question.query.get_or_404(question_id)
    db.session.delete(question)
    db.session.commit()
    return jsonify({'message': 'Question deleted successfully'}), 200

