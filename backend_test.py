#!/usr/bin/env python3
"""
EduAdapt Backend API Testing Script
Tests all backend API endpoints for waitlist, demo request, and parent account functionality.
"""

import requests
import json
import sys
import os
import uuid
from datetime import datetime
from pymongo import MongoClient

# Get base URL from environment or use default
BASE_URL = "https://eduadapt-learn.preview.emergentagent.com/api"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "your_database_name"

def print_test_result(test_name, success, details=""):
    """Print formatted test results"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"    {details}")
    print()

def setup_mongo():
    """Setup MongoDB connection"""
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        return client, db
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        return None, None

def cleanup_test_data(db, email, parent_id=None):
    """Clean up test data from MongoDB"""
    try:
        if db is not None:
            # Remove parent
            db.parents.delete_many({"email": email})
            # Remove children if parent_id provided
            if parent_id:
                children = db.children.find({"parent_id": parent_id})
                for child in children:
                    print(f"    Cleaning up child: {child.get('name', 'Unknown')}")
                db.children.delete_many({"parent_id": parent_id})
            print(f"    Cleaned up test data for {email}")
    except Exception as e:
        print(f"    ⚠️ Cleanup warning: {e}")

def test_root_endpoint():
    """Test GET /api/ - Root endpoint"""
    print("🔍 Testing Root Endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data and "status" in data:
                print_test_result("Root endpoint", True, f"Response: {data}")
                return True
            else:
                print_test_result("Root endpoint", False, f"Missing expected fields in response: {data}")
                return False
        else:
            print_test_result("Root endpoint", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        print_test_result("Root endpoint", False, f"Exception: {str(e)}")
        return False

def test_waitlist_post_success():
    """Test POST /api/waitlist - Success case"""
    print("🔍 Testing Waitlist POST - Success...")
    try:
        test_data = {
            "name": "Sarah Johnson",
            "email": f"sarah.johnson.{datetime.now().timestamp()}@example.com",
            "role": "Parent"
        }
        
        response = requests.post(f"{BASE_URL}/waitlist", 
                               json=test_data, 
                               headers={"Content-Type": "application/json"},
                               timeout=10)
        
        if response.status_code == 201:
            data = response.json()
            if "message" in data and "data" in data:
                entry = data["data"]
                if (entry.get("name") == test_data["name"] and 
                    entry.get("email") == test_data["email"].lower() and
                    entry.get("role") == test_data["role"] and
                    "id" in entry and "created_at" in entry):
                    print_test_result("Waitlist POST success", True, f"Entry created: {entry['id']}")
                    return True, entry
                else:
                    print_test_result("Waitlist POST success", False, f"Invalid response data: {data}")
                    return False, None
            else:
                print_test_result("Waitlist POST success", False, f"Missing expected fields: {data}")
                return False, None
        else:
            print_test_result("Waitlist POST success", False, f"Status: {response.status_code}, Response: {response.text}")
            return False, None
            
    except Exception as e:
        print_test_result("Waitlist POST success", False, f"Exception: {str(e)}")
        return False, None

def test_waitlist_post_validations():
    """Test POST /api/waitlist - Validation errors"""
    print("🔍 Testing Waitlist POST - Validations...")
    
    test_cases = [
        ({"email": "test@example.com", "role": "Parent"}, "missing name"),
        ({"name": "John Doe", "role": "Parent"}, "missing email"),
        ({"name": "John Doe", "email": "invalid-email", "role": "Parent"}, "invalid email format"),
        ({"name": "John Doe", "email": "test@example.com"}, "missing role"),
        ({"name": "John Doe", "email": "test@example.com", "role": "InvalidRole"}, "invalid role"),
    ]
    
    all_passed = True
    for test_data, expected_error in test_cases:
        try:
            response = requests.post(f"{BASE_URL}/waitlist", 
                                   json=test_data, 
                                   headers={"Content-Type": "application/json"},
                                   timeout=10)
            
            if response.status_code == 400:
                data = response.json()
                if "error" in data:
                    print_test_result(f"Waitlist validation - {expected_error}", True, f"Error: {data['error']}")
                else:
                    print_test_result(f"Waitlist validation - {expected_error}", False, f"No error field in response: {data}")
                    all_passed = False
            else:
                print_test_result(f"Waitlist validation - {expected_error}", False, f"Expected 400, got {response.status_code}")
                all_passed = False
                
        except Exception as e:
            print_test_result(f"Waitlist validation - {expected_error}", False, f"Exception: {str(e)}")
            all_passed = False
    
    return all_passed

def test_waitlist_duplicate_email():
    """Test POST /api/waitlist - Duplicate email (409)"""
    print("🔍 Testing Waitlist POST - Duplicate Email...")
    try:
        # First, create an entry
        test_email = f"duplicate.test.{datetime.now().timestamp()}@example.com"
        test_data = {
            "name": "Test User",
            "email": test_email,
            "role": "Teacher"
        }
        
        # First request should succeed
        response1 = requests.post(f"{BASE_URL}/waitlist", 
                                json=test_data, 
                                headers={"Content-Type": "application/json"},
                                timeout=10)
        
        if response1.status_code != 201:
            print_test_result("Waitlist duplicate email setup", False, f"First request failed: {response1.status_code}")
            return False
        
        # Second request with same email should fail with 409
        response2 = requests.post(f"{BASE_URL}/waitlist", 
                                json=test_data, 
                                headers={"Content-Type": "application/json"},
                                timeout=10)
        
        if response2.status_code == 409:
            data = response2.json()
            if "error" in data:
                print_test_result("Waitlist duplicate email", True, f"Correctly rejected: {data['error']}")
                return True
            else:
                print_test_result("Waitlist duplicate email", False, f"No error field in 409 response: {data}")
                return False
        else:
            print_test_result("Waitlist duplicate email", False, f"Expected 409, got {response2.status_code}")
            return False
            
    except Exception as e:
        print_test_result("Waitlist duplicate email", False, f"Exception: {str(e)}")
        return False

def test_waitlist_get():
    """Test GET /api/waitlist - Retrieve entries"""
    print("🔍 Testing Waitlist GET...")
    try:
        response = requests.get(f"{BASE_URL}/waitlist", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_test_result("Waitlist GET", True, f"Retrieved {len(data)} entries")
                
                # Verify structure of entries if any exist
                if len(data) > 0:
                    entry = data[0]
                    required_fields = ["id", "name", "email", "role", "created_at"]
                    missing_fields = [field for field in required_fields if field not in entry]
                    if missing_fields:
                        print_test_result("Waitlist GET structure", False, f"Missing fields: {missing_fields}")
                        return False
                    else:
                        print_test_result("Waitlist GET structure", True, "All required fields present")
                
                return True
            else:
                print_test_result("Waitlist GET", False, f"Expected array, got: {type(data)}")
                return False
        else:
            print_test_result("Waitlist GET", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        print_test_result("Waitlist GET", False, f"Exception: {str(e)}")
        return False

def test_demo_request_post_success():
    """Test POST /api/demo-request - Success case"""
    print("🔍 Testing Demo Request POST - Success...")
    try:
        test_data = {
            "name": "Michael Chen",
            "school_name": "Melbourne Primary School",
            "role": "Principal",
            "email": f"michael.chen.{datetime.now().timestamp()}@school.edu.au",
            "phone": "+61 3 9876 5432"
        }
        
        response = requests.post(f"{BASE_URL}/demo-request", 
                               json=test_data, 
                               headers={"Content-Type": "application/json"},
                               timeout=10)
        
        if response.status_code == 201:
            data = response.json()
            if "message" in data and "data" in data:
                entry = data["data"]
                if (entry.get("name") == test_data["name"] and 
                    entry.get("school_name") == test_data["school_name"] and
                    entry.get("email") == test_data["email"].lower() and
                    entry.get("phone") == test_data["phone"] and
                    "id" in entry and "created_at" in entry):
                    print_test_result("Demo request POST success", True, f"Entry created: {entry['id']}")
                    return True, entry
                else:
                    print_test_result("Demo request POST success", False, f"Invalid response data: {data}")
                    return False, None
            else:
                print_test_result("Demo request POST success", False, f"Missing expected fields: {data}")
                return False, None
        else:
            print_test_result("Demo request POST success", False, f"Status: {response.status_code}, Response: {response.text}")
            return False, None
            
    except Exception as e:
        print_test_result("Demo request POST success", False, f"Exception: {str(e)}")
        return False, None

def test_demo_request_post_validations():
    """Test POST /api/demo-request - Validation errors"""
    print("🔍 Testing Demo Request POST - Validations...")
    
    test_cases = [
        ({"school_name": "Test School", "role": "Teacher", "email": "test@example.com"}, "missing name"),
        ({"name": "John Doe", "role": "Teacher", "email": "test@example.com"}, "missing school_name"),
        ({"name": "John Doe", "school_name": "Test School", "email": "test@example.com"}, "missing role"),
        ({"name": "John Doe", "school_name": "Test School", "role": "Teacher"}, "missing email"),
        ({"name": "John Doe", "school_name": "Test School", "role": "Teacher", "email": "invalid-email"}, "invalid email format"),
    ]
    
    all_passed = True
    for test_data, expected_error in test_cases:
        try:
            response = requests.post(f"{BASE_URL}/demo-request", 
                                   json=test_data, 
                                   headers={"Content-Type": "application/json"},
                                   timeout=10)
            
            if response.status_code == 400:
                data = response.json()
                if "error" in data:
                    print_test_result(f"Demo request validation - {expected_error}", True, f"Error: {data['error']}")
                else:
                    print_test_result(f"Demo request validation - {expected_error}", False, f"No error field in response: {data}")
                    all_passed = False
            else:
                print_test_result(f"Demo request validation - {expected_error}", False, f"Expected 400, got {response.status_code}")
                all_passed = False
                
        except Exception as e:
            print_test_result(f"Demo request validation - {expected_error}", False, f"Exception: {str(e)}")
            all_passed = False
    
    return all_passed

def test_demo_request_get():
    """Test GET /api/demo-request - Retrieve entries"""
    print("🔍 Testing Demo Request GET...")
    try:
        response = requests.get(f"{BASE_URL}/demo-request", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_test_result("Demo request GET", True, f"Retrieved {len(data)} entries")
                
                # Verify structure of entries if any exist
                if len(data) > 0:
                    entry = data[0]
                    required_fields = ["id", "name", "school_name", "role", "email", "created_at"]
                    missing_fields = [field for field in required_fields if field not in entry]
                    if missing_fields:
                        print_test_result("Demo request GET structure", False, f"Missing fields: {missing_fields}")
                        return False
                    else:
                        print_test_result("Demo request GET structure", True, "All required fields present")
                
                return True
            else:
                print_test_result("Demo request GET", False, f"Expected array, got: {type(data)}")
                return False
        else:
            print_test_result("Demo request GET", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        print_test_result("Demo request GET", False, f"Exception: {str(e)}")
        return False

def test_register_parent_success():
    """Test POST /api/register-parent - Success case"""
    print("🔍 Testing Parent Registration POST - Success...")
    try:
        test_data = {
            "name": "Sarah Johnson",
            "email": f"sarah.johnson.{datetime.now().timestamp()}@example.com",
            "password": "SecurePass123",
            "phone": "0412345678"
        }
        
        response = requests.post(f"{BASE_URL}/register-parent", 
                               json=test_data, 
                               headers={"Content-Type": "application/json"},
                               timeout=10)
        
        if response.status_code == 201:
            data = response.json()
            if "message" in data and "data" in data:
                parent = data["data"]
                required_fields = ['id', 'name', 'email', 'children', 'created_at']
                missing_fields = [field for field in required_fields if field not in parent]
                
                if missing_fields:
                    print_test_result("Parent registration success", False, f"Missing fields: {missing_fields}")
                    return False, None, None
                
                # Verify password not in response
                if 'password' in parent:
                    print_test_result("Parent registration success", False, "Password should not be in response")
                    return False, None, None
                
                # Verify phone included
                if 'phone' not in parent:
                    print_test_result("Parent registration success", False, "Phone field missing from response")
                    return False, None, None
                
                # Verify UUID format
                try:
                    uuid.UUID(parent['id'])
                except ValueError:
                    print_test_result("Parent registration success", False, "Invalid UUID format for parent ID")
                    return False, None, None
                
                # Verify children array is empty
                if parent['children'] != []:
                    print_test_result("Parent registration success", False, "Children array should be empty for new parent")
                    return False, None, None
                
                print_test_result("Parent registration success", True, f"Parent created: {parent['id']}")
                return True, parent['id'], test_data['email']
            else:
                print_test_result("Parent registration success", False, f"Missing expected fields: {data}")
                return False, None, None
        else:
            print_test_result("Parent registration success", False, f"Status: {response.status_code}, Response: {response.text}")
            return False, None, None
            
    except Exception as e:
        print_test_result("Parent registration success", False, f"Exception: {str(e)}")
        return False, None, None

def test_register_parent_validations():
    """Test POST /api/register-parent - Validation errors"""
    print("🔍 Testing Parent Registration POST - Validations...")
    
    test_cases = [
        ({"email": "test@example.com", "password": "SecurePass123"}, "missing name"),
        ({"name": "Test User", "password": "SecurePass123"}, "missing email"),
        ({"name": "Test User", "email": "invalid-email", "password": "SecurePass123"}, "invalid email format"),
        ({"name": "Test User", "email": "test@example.com"}, "missing password"),
        ({"name": "Test User", "email": "test@example.com", "password": "123"}, "password too short"),
    ]
    
    all_passed = True
    for test_data, expected_error in test_cases:
        try:
            response = requests.post(f"{BASE_URL}/register-parent", 
                                   json=test_data, 
                                   headers={"Content-Type": "application/json"},
                                   timeout=10)
            
            if response.status_code == 400:
                data = response.json()
                if "error" in data:
                    print_test_result(f"Parent registration validation - {expected_error}", True, f"Error: {data['error']}")
                else:
                    print_test_result(f"Parent registration validation - {expected_error}", False, f"No error field in response: {data}")
                    all_passed = False
            else:
                print_test_result(f"Parent registration validation - {expected_error}", False, f"Expected 400, got {response.status_code}")
                all_passed = False
                
        except Exception as e:
            print_test_result(f"Parent registration validation - {expected_error}", False, f"Exception: {str(e)}")
            all_passed = False
    
    return all_passed

def test_register_parent_duplicate():
    """Test POST /api/register-parent - Duplicate email (409)"""
    print("🔍 Testing Parent Registration POST - Duplicate Email...")
    try:
        # First, create a parent
        test_email = f"duplicate.parent.{datetime.now().timestamp()}@example.com"
        test_data = {
            "name": "Test Parent",
            "email": test_email,
            "password": "SecurePass123"
        }
        
        # First request should succeed
        response1 = requests.post(f"{BASE_URL}/register-parent", 
                                json=test_data, 
                                headers={"Content-Type": "application/json"},
                                timeout=10)
        
        if response1.status_code != 201:
            print_test_result("Parent registration duplicate email setup", False, f"First request failed: {response1.status_code}")
            return False, None
        
        # Second request with same email should fail with 409
        response2 = requests.post(f"{BASE_URL}/register-parent", 
                                json=test_data, 
                                headers={"Content-Type": "application/json"},
                                timeout=10)
        
        if response2.status_code == 409:
            data = response2.json()
            if "error" in data:
                print_test_result("Parent registration duplicate email", True, f"Correctly rejected: {data['error']}")
                return True, test_email
            else:
                print_test_result("Parent registration duplicate email", False, f"No error field in 409 response: {data}")
                return False, test_email
        else:
            print_test_result("Parent registration duplicate email", False, f"Expected 409, got {response2.status_code}")
            return False, test_email
            
    except Exception as e:
        print_test_result("Parent registration duplicate email", False, f"Exception: {str(e)}")
        return False, None

def test_add_child_success(parent_id):
    """Test POST /api/add-child - Success case"""
    print("🔍 Testing Add Child POST - Success...")
    
    if not parent_id:
        print_test_result("Add child success", False, "No parent_id provided")
        return False, None
    
    test_data = {
        "parent_id": parent_id,
        "child_name": "Emma Johnson",
        "grade": "Grade 3",
        "avatar": "🦊"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/add-child", 
                               json=test_data, 
                               headers={"Content-Type": "application/json"},
                               timeout=10)
        
        if response.status_code == 201:
            data = response.json()
            if "message" in data and "data" in data:
                child = data["data"]
                required_fields = ['id', 'parent_id', 'name', 'username', 'pin', 'grade', 'avatar', 
                                 'coins', 'xp', 'level', 'streak', 'sessions_completed', 'created_at']
                missing_fields = [field for field in required_fields if field not in child]
                
                if missing_fields:
                    print_test_result("Add child success", False, f"Missing fields: {missing_fields}")
                    return False, None
                
                # Verify UUID format
                try:
                    uuid.UUID(child['id'])
                except ValueError:
                    print_test_result("Add child success", False, "Invalid UUID format for child ID")
                    return False, None
                
                # Verify username format (child name + year)
                expected_username = "emmajohnson2026"  # Current year is 2026
                if child['username'] != expected_username:
                    print_test_result("Add child success", False, f"Username format incorrect. Expected: {expected_username}, Got: {child['username']}")
                    return False, None
                
                # Verify PIN format (4 digits)
                pin = child['pin']
                if not (pin.isdigit() and len(pin) == 4 and 1000 <= int(pin) <= 9999):
                    print_test_result("Add child success", False, f"PIN format incorrect. Expected 4-digit number, got: {pin}")
                    return False, None
                
                # Verify initial values
                expected_values = {
                    'coins': 100,
                    'xp': 0,
                    'level': 1,
                    'streak': 0,
                    'sessions_completed': 0,
                    'avatar': '🦊'
                }
                
                for field, expected in expected_values.items():
                    if child[field] != expected:
                        print_test_result("Add child success", False, f"{field} incorrect. Expected: {expected}, Got: {child[field]}")
                        return False, None
                
                print_test_result("Add child success", True, f"Child created: {child['id']}")
                return True, child['id']
            else:
                print_test_result("Add child success", False, f"Missing expected fields: {data}")
                return False, None
        else:
            print_test_result("Add child success", False, f"Status: {response.status_code}, Response: {response.text}")
            return False, None
            
    except Exception as e:
        print_test_result("Add child success", False, f"Exception: {str(e)}")
        return False, None

def test_add_child_validations():
    """Test POST /api/add-child - Validation errors"""
    print("🔍 Testing Add Child POST - Validations...")
    
    test_cases = [
        ({"child_name": "Test Child", "grade": "Grade 1"}, "missing parent_id"),
        ({"parent_id": "test-uuid", "grade": "Grade 1"}, "missing child_name"),
        ({"parent_id": "test-uuid", "child_name": "Test Child"}, "missing grade"),
    ]
    
    all_passed = True
    for test_data, expected_error in test_cases:
        try:
            response = requests.post(f"{BASE_URL}/add-child", 
                                   json=test_data, 
                                   headers={"Content-Type": "application/json"},
                                   timeout=10)
            
            if response.status_code == 400:
                data = response.json()
                if "error" in data:
                    print_test_result(f"Add child validation - {expected_error}", True, f"Error: {data['error']}")
                else:
                    print_test_result(f"Add child validation - {expected_error}", False, f"No error field in response: {data}")
                    all_passed = False
            else:
                print_test_result(f"Add child validation - {expected_error}", False, f"Expected 400, got {response.status_code}")
                all_passed = False
                
        except Exception as e:
            print_test_result(f"Add child validation - {expected_error}", False, f"Exception: {str(e)}")
            all_passed = False
    
    return all_passed

def test_add_child_default_avatar(parent_id):
    """Test POST /api/add-child - Default Avatar"""
    print("🔍 Testing Add Child POST - Default Avatar...")
    
    if not parent_id:
        print_test_result("Add child default avatar", False, "No parent_id provided")
        return False, None
    
    test_data = {
        "parent_id": parent_id,
        "child_name": "Default Avatar Child",
        "grade": "Grade 2"
        # No avatar provided
    }
    
    try:
        response = requests.post(f"{BASE_URL}/add-child", 
                               json=test_data, 
                               headers={"Content-Type": "application/json"},
                               timeout=10)
        
        if response.status_code == 201:
            data = response.json()
            child = data.get('data', {})
            
            if child.get('avatar') == '🦊':
                print_test_result("Add child default avatar", True, "Default avatar correctly set to 🦊")
                return True, child['id']
            else:
                print_test_result("Add child default avatar", False, f"Default avatar incorrect. Expected: 🦊, Got: {child.get('avatar')}")
                return False, None
        else:
            print_test_result("Add child default avatar", False, f"Status: {response.status_code}, Response: {response.text}")
            return False, None
            
    except Exception as e:
        print_test_result("Add child default avatar", False, f"Exception: {str(e)}")
        return False, None

def verify_mongodb_data(db, parent_email, parent_id, child_ids):
    """Verify MongoDB data integrity"""
    print("🔍 Testing MongoDB Data Verification...")
    
    if db is None:
        print_test_result("MongoDB verification", False, "No database connection")
        return False
    
    try:
        # Verify parent in database
        parent = db.parents.find_one({"email": parent_email})
        if not parent:
            print_test_result("MongoDB verification - parent", False, f"Parent not found with email: {parent_email}")
            return False
        
        # Verify parent data structure
        required_parent_fields = ['id', 'name', 'email', 'password', 'children', 'created_at']
        missing_fields = [field for field in required_parent_fields if field not in parent]
        if missing_fields:
            print_test_result("MongoDB verification - parent fields", False, f"Parent missing fields: {missing_fields}")
            return False
        
        # Verify password is stored
        if not parent.get('password'):
            print_test_result("MongoDB verification - password", False, "Password not properly stored")
            return False
        
        # Verify children array
        if child_ids:
            stored_children = parent.get('children', [])
            for child_id in child_ids:
                if child_id not in stored_children:
                    print_test_result("MongoDB verification - children array", False, f"Child {child_id} not in parent's children array")
                    return False
        
        # Verify children in database
        if child_ids:
            for child_id in child_ids:
                child = db.children.find_one({"id": child_id})
                if not child:
                    print_test_result("MongoDB verification - child", False, f"Child {child_id} not found in children collection")
                    return False
                
                # Verify child data structure
                required_child_fields = ['id', 'parent_id', 'name', 'username', 'pin', 'grade', 
                                       'avatar', 'coins', 'xp', 'level', 'streak', 'sessions_completed', 'created_at']
                missing_child_fields = [field for field in required_child_fields if field not in child]
                if missing_child_fields:
                    print_test_result("MongoDB verification - child fields", False, f"Child missing fields: {missing_child_fields}")
                    return False
                
                # Verify parent_id link
                if child.get('parent_id') != parent_id:
                    print_test_result("MongoDB verification - parent link", False, f"Child {child_id} parent_id mismatch")
                    return False
        
        print_test_result("MongoDB verification", True, "All data verified in MongoDB")
        return True
        
    except Exception as e:
        print_test_result("MongoDB verification", False, f"Exception: {str(e)}")
        return False

def test_parent_child_end_to_end():
    """Test End-to-End Parent → Child Flow"""
    print("🔍 Testing End-to-End Parent → Child Flow...")
    
    # Setup MongoDB
    mongo_client, db = setup_mongo()
    
    parent_id = None
    parent_email = None
    child_ids = []
    
    try:
        # Step 1: Create parent account
        success, parent_id, parent_email = test_register_parent_success()
        if not success:
            print_test_result("End-to-end flow", False, "Parent creation failed")
            return False
        
        # Step 2: Add first child
        success, child1_id = test_add_child_success(parent_id)
        if success and child1_id:
            child_ids.append(child1_id)
        
        # Step 3: Add second child with default avatar
        success, child2_id = test_add_child_default_avatar(parent_id)
        if success and child2_id:
            child_ids.append(child2_id)
        
        # Step 4: Verify MongoDB data
        if db is not None:
            mongodb_success = verify_mongodb_data(db, parent_email, parent_id, child_ids)
        else:
            mongodb_success = False
            print_test_result("End-to-end flow - MongoDB", False, "No MongoDB connection")
        
        if len(child_ids) >= 1 and mongodb_success:
            print_test_result("End-to-end flow", True, f"Parent + {len(child_ids)} children created and verified")
            return True
        else:
            print_test_result("End-to-end flow", False, f"Incomplete flow: {len(child_ids)} children, MongoDB: {mongodb_success}")
            return False
        
    finally:
        # Cleanup
        if parent_email and db is not None:
            cleanup_test_data(db, parent_email, parent_id)
        if mongo_client:
            mongo_client.close()

def main():
    """Run all backend API tests"""
    print("🚀 Starting EduAdapt Backend API Tests")
    print(f"📍 Testing against: {BASE_URL}")
    print("=" * 60)
    
    test_results = []
    
    # Test existing endpoints
    test_results.append(("Root endpoint", test_root_endpoint()))
    test_results.append(("Waitlist POST success", test_waitlist_post_success()[0]))
    test_results.append(("Waitlist POST validations", test_waitlist_post_validations()))
    test_results.append(("Waitlist duplicate email", test_waitlist_duplicate_email()))
    test_results.append(("Waitlist GET", test_waitlist_get()))
    test_results.append(("Demo request POST success", test_demo_request_post_success()[0]))
    test_results.append(("Demo request POST validations", test_demo_request_post_validations()))
    test_results.append(("Demo request GET", test_demo_request_get()))
    
    # Test new parent account flow endpoints
    print("\n" + "=" * 60)
    print("🔍 TESTING PARENT ACCOUNT FLOW")
    print("=" * 60)
    
    test_results.append(("Parent registration validations", test_register_parent_validations()))
    test_results.append(("Add child validations", test_add_child_validations()))
    
    # Test duplicate parent email
    duplicate_success, duplicate_email = test_register_parent_duplicate()
    test_results.append(("Parent registration duplicate email", duplicate_success))
    if duplicate_email:
        mongo_client, db = setup_mongo()
        if db is not None:
            cleanup_test_data(db, duplicate_email)
        if mongo_client:
            mongo_client.close()
    
    # Test comprehensive end-to-end flow
    test_results.append(("Parent → Child end-to-end flow", test_parent_child_end_to_end()))
    
    # Summary
    print("=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in test_results if result)
    total = len(test_results)
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
    
    print(f"\n🎯 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Backend API is working correctly.")
        return True
    else:
        print("⚠️  Some tests failed. Check the details above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)