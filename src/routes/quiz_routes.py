from flask import Blueprint, request, jsonify
from src.models.quiz_models import db, Question, Option, UserAnswer, User # Assuming User model is needed for user context
import random

# Placeholder for user identification - in a real app, use JWT or session
# For now, assume a header 'X-User-ID' is sent for user-specific actions.
# This is NOT secure for production.
def get_current_user_id():
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        return None
    try:
        return int(user_id)
    except ValueError:
        return None

quiz_user_bp = Blueprint('quiz_user_bp', __name__)

@quiz_user_bp.route('/question', methods=['GET'])
def get_quiz_question():
    """Fetches a random quiz question for the user.
    Optionally, can be extended to avoid showing already answered questions.
    """
    # Fetch all questions from the database
    all_questions = Question.query.all()
    if not all_questions:
        return jsonify({'message': 'No questions available'}), 404

    # Select a random question
    question = random.choice(all_questions)
    return jsonify(question.to_dict()), 200

@quiz_user_bp.route("/submit", methods=["POST"])
def submit_answer():
    """Submits an answer for a given question by the current user.
    Validates the answer and stores it.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({'message': 'User not authenticated'}), 401

    data = request.get_json()
    question_id = data.get('question_id')
    selected_option_id = data.get('selected_option_id')

    if not question_id or not selected_option_id:
        return jsonify({'message': 'Missing question_id or selected_option_id'}), 400

    question = Question.query.get(question_id)
    if not question:
        return jsonify({'message': 'Question not found'}), 404

    selected_option = Option.query.filter_by(id=selected_option_id, question_id=question_id).first()
    if not selected_option:
        return jsonify({'message': 'Invalid option for this question'}), 400

    # Check if user already answered this question - REMOVED TO ALLOW MULTIPLE SUBMISSIONS
    # existing_answer = UserAnswer.query.filter_by(user_id=user_id, question_id=question_id).first()
    # if existing_answer:
    #     return jsonify({"message": "You have already answered this question"}), 409

    is_correct = selected_option.is_correct
    user_answer = UserAnswer(
        user_id=user_id,
        question_id=question_id,
        selected_option_id=selected_option_id,
        is_correct=is_correct
    )
    db.session.add(user_answer)
    db.session.commit()

    return jsonify({
        'message': 'Answer submitted successfully',
        'answer_id': user_answer.id,
        'is_correct': is_correct,
        'correct_option_id': next((opt.id for opt in question.options if opt.is_correct), None)
    }), 201

@quiz_user_bp.route('/quiz/results', methods=['GET'])
def get_quiz_results():
    """Fetches the quiz results for the current user.
    Calculates score: total correct answers / total answered questions.
    """
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({'message': 'User not authenticated'}), 401

    user_answers = UserAnswer.query.filter_by(user_id=user_id).all()
    if not user_answers:
        return jsonify({'message': 'No answers submitted yet by this user'}), 404

    total_answered = len(user_answers)
    correct_answers = sum(1 for answer in user_answers if answer.is_correct)
    score = (correct_answers / total_answered) * 100 if total_answered > 0 else 0

    detailed_results = []
    for answer in user_answers:
        question = Question.query.get(answer.question_id)
        selected_option = Option.query.get(answer.selected_option_id)
        correct_option = Option.query.filter_by(question_id=question.id, is_correct=True).first()
        detailed_results.append({
            'question_id': question.id,
            'question_text': question.text,
            'selected_option_id': selected_option.id,
            'selected_option_text': selected_option.text,
            'is_correct': answer.is_correct,
            'correct_option_id': correct_option.id if correct_option else None,
            'correct_option_text': correct_option.text if correct_option else None
        })

    return jsonify({
        'user_id': user_id,
        'total_answered': total_answered,
        'correct_answers': correct_answers,
        'score_percentage': round(score, 2),
        'results': detailed_results
    }), 200

