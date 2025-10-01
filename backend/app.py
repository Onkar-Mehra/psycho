from flask import Flask, request, jsonify, session
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import bcrypt
import uuid
from datetime import datetime, timedelta
import json
import os
from functools import wraps

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this'
CORS(app, 
     supports_credentials=True,
     origins=['http://localhost:3000', 'http://127.0.0.1:3000'],
     allow_headers=['Content-Type'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

# Database configuration
DATABASE_URL = "postgresql+psycopg2://postgres:root@localhost:5432/psycho"
DB_CONFIG = {
    'host': 'localhost',
    'database': 'psycho',
    'user': 'postgres',
    'password': 'root',
    'port': 5432
}

def get_db_connection():
    """Get database connection"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

# Authentication Routes

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')
        
        if not all([username, password, email]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Check if user already exists
        cursor.execute("SELECT user_id FROM users WHERE username = %s OR email = %s", (username, email))
        if cursor.fetchone():
            return jsonify({'error': 'Username or email already exists'}), 400
        
        # Hash password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Insert new user
        user_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO users (user_id, username, password, email) VALUES (%s, %s, %s, %s)",
            (user_id, username, hashed_password, email)
        )
        
        # Initialize form progress for all three forms
        forms = ['HowGard', 'Attitude', 'Motivational']
        for form_name in forms:
            cursor.execute(
                "INSERT INTO form_progress (user_id, form_name) VALUES (%s, %s)",
                (user_id, form_name)
            )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        session['user_id'] = user_id
        session['username'] = username
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'username': username,
            'message': 'Registration successful'
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not all([username, password]):
            return jsonify({'error': 'Missing username or password'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get user by username or email
        cursor.execute(
            "SELECT user_id, username, password, email FROM users WHERE username = %s OR email = %s",
            (username, username)
        )
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Fix: Ensure both password and hash are bytes
        password_bytes = password.encode('utf-8')
        stored_hash = user['password']
        
        # Handle if stored_hash is already bytes or needs encoding
        if isinstance(stored_hash, str):
            stored_hash_bytes = stored_hash.encode('utf-8')
        else:
            stored_hash_bytes = stored_hash
            
        # Verify password
        if not bcrypt.checkpw(password_bytes, stored_hash_bytes):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        session['user_id'] = str(user['user_id'])
        session['username'] = user['username']
        
        return jsonify({
            'success': True,
            'user_id': str(user['user_id']),
            'username': user['username'],
            'email': user['email']
        }), 200
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'}), 200

@app.route('/api/check-auth', methods=['GET'])
def check_auth():
    if 'user_id' in session:
        return jsonify({
            'authenticated': True,
            'user_id': session['user_id'],
            'username': session['username']
        }), 200
    return jsonify({'authenticated': False}), 401

# User Details Routes

@app.route('/api/user-details', methods=['POST'])
@require_auth
def save_user_details():
    try:
        data = request.get_json()
        user_id = session['user_id']
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Check if user details already exist
        cursor.execute("SELECT detail_id FROM user_details WHERE user_id = %s", (user_id,))
        existing = cursor.fetchone()
        
        if existing:
            # Update existing details
            cursor.execute("""
                UPDATE user_details SET
                name = %s, age = %s, gender = %s, date_of_birth = %s,
                contact_number = %s, email_id = %s, address = %s,
                educational_qualification = %s, organization_company = %s,
                any_illness = %s, signature_confirmation = %s
                WHERE user_id = %s
            """, (
                data.get('name'), data.get('age'), data.get('gender'),
                data.get('date_of_birth'), data.get('contact_number'),
                data.get('email_id'), data.get('address'),
                data.get('educational_qualification'), data.get('organization_company'),
                data.get('any_illness'), data.get('signature_confirmation'), user_id
            ))
        else:
            # Insert new details
            cursor.execute("""
                INSERT INTO user_details (
                    user_id, name, age, gender, date_of_birth, contact_number,
                    email_id, address, educational_qualification, organization_company,
                    any_illness, signature_confirmation
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                user_id, data.get('name'), data.get('age'), data.get('gender'),
                data.get('date_of_birth'), data.get('contact_number'),
                data.get('email_id'), data.get('address'),
                data.get('educational_qualification'), data.get('organization_company'),
                data.get('any_illness'), data.get('signature_confirmation')
            ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': 'User details saved successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/user-details', methods=['GET'])
@require_auth
def get_user_details():
    try:
        user_id = session['user_id']
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT * FROM user_details WHERE user_id = %s", (user_id,))
        details = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        # If no details found, return success=False
        if not details:
            return jsonify({'success': False, 'data': None, 'message': 'No user details found'}), 200
        
        # Convert date to string for JSON serialization
        if details['date_of_birth']:
            details['date_of_birth'] = details['date_of_birth'].isoformat()
        if details['created_at']:
            details['created_at'] = details['created_at'].isoformat()
        
        return jsonify({'success': True, 'data': dict(details)}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Questions Routes

@app.route('/api/questions/<form_type>', methods=['GET'])
@require_auth
def get_questions(form_type):
    try:
        form_type_lower = form_type.lower()
        if form_type_lower not in ['howgard', 'attitude', 'motivational']:
            return jsonify({'error': 'Invalid form type'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Try to execute query with proper column name quoting
        query = f'SELECT "Serial Number" as id, "Question" as question FROM {form_type_lower} ORDER BY "Serial Number"'
        
        print(f"Executing query: {query}")
        cursor.execute(query)
        questions = cursor.fetchall()
        
        print(f"Found {len(questions)} questions for {form_type_lower}")
        
        cursor.close()
        conn.close()
        
        if not questions:
            print(f"WARNING: No questions found in {form_type_lower} table")
            return jsonify({
                'success': True,
                'questions': [],
                'warning': f'No questions found in {form_type_lower} table'
            }), 200
        
        # Convert to proper format
        questions_list = []
        for q in questions:
            questions_list.append({
                'id': q['id'],
                'question': q['question']
            })
        
        return jsonify({
            'success': True,
            'questions': questions_list
        }), 200
        
    except psycopg2.Error as db_err:
        print(f"Database error fetching questions: {str(db_err)}")
        return jsonify({'error': f'Database error: {str(db_err)}'}), 500
    except Exception as e:
        print(f"Error fetching questions: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Progress and Responses Routes

@app.route('/api/save-progress', methods=['POST'])
@require_auth
def save_progress():
    try:
        data = request.get_json()
        user_id = session['user_id']
        form_name = data.get('form_name')
        current_progress = data.get('current_progress', 0)
        responses = data.get('responses', {})
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Update form progress
        cursor.execute("""
            UPDATE form_progress 
            SET current_progress = %s, progress_status = %s, last_updated = %s
            WHERE user_id = %s AND form_name = %s
        """, (current_progress, 'in_progress', datetime.now(), user_id, form_name))
        
        # Get form_id
        cursor.execute("SELECT form_id FROM form_progress WHERE user_id = %s AND form_name = %s", (user_id, form_name))
        form_id = cursor.fetchone()[0]
        
        # Save or update responses
        cursor.execute("SELECT id FROM records WHERE user_id = %s AND form_name = %s", (user_id, form_name))
        existing = cursor.fetchone()
        
        if existing:
            cursor.execute("""
                UPDATE records 
                SET responses = %s, updated_at = %s
                WHERE user_id = %s AND form_name = %s
            """, (json.dumps(responses), datetime.now(), user_id, form_name))
        else:
            cursor.execute("""
                INSERT INTO records (user_id, form_id, form_name, responses)
                VALUES (%s, %s, %s, %s)
            """, (user_id, form_id, form_name, json.dumps(responses)))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Progress saved successfully'}), 200
        
    except Exception as e:
        print(f"Error saving progress: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/responses/<form_name>', methods=['GET'])
@require_auth
def get_saved_responses(form_name):
    """Get saved responses for a specific form"""
    try:
        user_id = session['user_id']
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get saved responses for this form
        cursor.execute("""
            SELECT responses FROM records 
            WHERE user_id = %s AND form_name = %s
        """, (user_id, form_name))
        
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if result and result['responses']:
            return jsonify({
                'success': True,
                'responses': result['responses']
            }), 200
        else:
            return jsonify({
                'success': True,
                'responses': {}
            }), 200
            
    except Exception as e:
        print(f"Error loading responses: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/submit-form', methods=['POST'])
@require_auth
def submit_form():
    try:
        data = request.get_json()
        user_id = session['user_id']
        form_name = data.get('form_name')
        responses = data.get('responses', {})
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Update form progress to submitted
        cursor.execute("""
            UPDATE form_progress 
            SET progress_status = %s, last_updated = %s
            WHERE user_id = %s AND form_name = %s
        """, ('submitted', datetime.now(), user_id, form_name))
        
        # Get form_id
        cursor.execute("SELECT form_id FROM form_progress WHERE user_id = %s AND form_name = %s", (user_id, form_name))
        form_id = cursor.fetchone()[0]
        
        # Save final responses
        cursor.execute("SELECT id FROM records WHERE user_id = %s AND form_name = %s", (user_id, form_name))
        existing = cursor.fetchone()
        
        if existing:
            cursor.execute("""
                UPDATE records 
                SET responses = %s, updated_at = %s
                WHERE user_id = %s AND form_name = %s
            """, (json.dumps(responses), datetime.now(), user_id, form_name))
        else:
            cursor.execute("""
                INSERT INTO records (user_id, form_id, form_name, responses)
                VALUES (%s, %s, %s, %s)
            """, (user_id, form_id, form_name, json.dumps(responses)))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Form submitted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/progress', methods=['GET'])
@require_auth
def get_progress():
    try:
        user_id = session['user_id']
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT form_name, current_progress, progress_status, last_updated
            FROM form_progress 
            WHERE user_id = %s
        """, (user_id,))
        progress = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        progress_data = {}
        for p in progress:
            progress_data[p['form_name']] = {
                'current_progress': p['current_progress'],
                'status': p['progress_status'],
                'last_updated': p['last_updated'].isoformat() if p['last_updated'] else None
            }
        
        return jsonify({'success': True, 'progress': progress_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)