#!/usr/bin/env python3

"""
Phase 2: Link - API Connectivity & Authentication Verification
Tests JIRA API and GROQ API connectivity
Usage: python3 connectivity-test.py
"""

import os
import sys
import json
import base64
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ===== CONFIGURATION =====
JIRA_CONFIG = {
    'baseUrl': os.getenv('JIRA_BASE_URL'),
    'email': os.getenv('JIRA_EMAIL'),
    'token': os.getenv('JIRA_API_TOKEN'),
    'issueId': os.getenv('TEST_ISSUE_ID', 'VWO-48'),
}

GROQ_CONFIG = {
    'apiKey': os.getenv('GROQ_API_KEY'),
    'model': os.getenv('GROQ_MODEL', 'openai/gpt-oss-120b'),
}

# ===== UTILITIES =====
class Logger:
    @staticmethod
    def info(msg):
        print(f'\n ℹ️  {msg}')

    @staticmethod
    def success(msg):
        print(f'\n ✅ {msg}')

    @staticmethod
    def error(msg):
        print(f'\n ❌ {msg}')

    @staticmethod
    def warn(msg):
        print(f'\n ⚠️  {msg}')

    @staticmethod
    def section(title):
        print(f'\n\n {"=" * 60}\n {title}\n {"=" * 60}')

log = Logger()

# ===== VALIDATION =====
def validate_configuration():
    log.section('Phase 2: Credential Validation')

    errors = []

    if not JIRA_CONFIG['baseUrl']:
        errors.append('❌ JIRA_BASE_URL not set')
    if not JIRA_CONFIG['email']:
        errors.append('❌ JIRA_EMAIL not set')
    if not JIRA_CONFIG['token']:
        errors.append('❌ JIRA_API_TOKEN not set')
    if not GROQ_CONFIG['apiKey']:
        errors.append('❌ GROQ_API_KEY not set')

    if errors:
        log.warn('Missing Configuration:')
        for error in errors:
            print(f' {error}')
        print(
            '\n📋 Create a .env file in the project root with the required variables.'
        )
        print('📄 Reference: .env.template\n')
        sys.exit(1)

    log.success('All required credentials are configured')

# ===== JIRA CONNECTIVITY TEST =====
def test_jira_connectivity():
    log.section('Phase 2.1: JIRA API Connectivity Test')

    try:
        url = f"{JIRA_CONFIG['baseUrl']}/rest/api/3/issue/{JIRA_CONFIG['issueId']}"
        
        # Create Basic Auth header
        credentials = f"{JIRA_CONFIG['email']}:{JIRA_CONFIG['token']}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()

        headers = {
            'Authorization': f'Basic {encoded_credentials}',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }

        log.info(f'Testing JIRA endpoint: {url}')
        log.info(f"Issue ID: {JIRA_CONFIG['issueId']}")

        req = Request(url, headers=headers)
        
        with urlopen(req) as response:
            data = json.loads(response.read().decode())
            
            log.success('JIRA connectivity verified ✓')
            log.info(f"Issue Key: {data['key']}")
            log.info(f"Summary: {data['fields']['summary']}")
            
            description = data['fields'].get('description', 'N/A')
            if description:
                preview = description[:100] if isinstance(description, str) else str(description)[:100]
                log.info(f'Description Preview: {preview}...')

            return {
                'status': 'success',
                'issue': {
                    'key': data['key'],
                    'summary': data['fields']['summary'],
                    'description': data['fields'].get('description'),
                    'type': data['fields'].get('issuetype', {}).get('name'),
                    'priority': data['fields'].get('priority', {}).get('name'),
                },
            }

    except HTTPError as e:
        log.error(f'JIRA API returned status {e.code}')
        try:
            error_data = json.loads(e.read().decode())
            log.warn(f"Error: {error_data}")
        except:
            pass
        return {'status': 'error', 'statusCode': e.code}
    
    except URLError as e:
        log.error(f'JIRA connection failed: {e.reason}')
        return {'status': 'error', 'error': str(e.reason)}
    
    except Exception as e:
        log.error(f'JIRA test error: {str(e)}')
        return {'status': 'error', 'error': str(e)}

# ===== GROQ CONNECTIVITY TEST =====
def test_groq_connectivity():
    log.section('Phase 2.2: GROQ API Connectivity Test')

    try:
        url = 'https://api.groq.com/openai/v1/chat/completions'
        
        payload = {
            'model': GROQ_CONFIG['model'],
            'messages': [
                {
                    'role': 'user',
                    'content': 'Respond with: "GROQ API connectivity verified"',
                }
            ],
            'temperature': 0.7,
            'max_tokens': 50,
        }

        headers = {
            'Authorization': f"Bearer {GROQ_CONFIG['apiKey']}",
            'Content-Type': 'application/json',
        }

        log.info(f'Testing GROQ endpoint: {url}')
        log.info(f"Model: {GROQ_CONFIG['model']}")

        req = Request(
            url,
            data=json.dumps(payload).encode(),
            headers=headers,
            method='POST',
        )

        with urlopen(req) as response:
            data = json.loads(response.read().decode())
            
            content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
            log.success('GROQ connectivity verified ✓')
            log.info(f'Response: {content}')
            
            usage = data.get('usage', {})
            total_tokens = usage.get('total_tokens', 'N/A')
            log.info(f'Tokens used: {total_tokens}')

            return {
                'status': 'success',
                'response': content,
                'usage': usage,
            }

    except HTTPError as e:
        log.error(f'GROQ API returned status {e.code}')
        try:
            error_data = json.loads(e.read().decode())
            log.warn(f"Error: {error_data}")
        except:
            pass
        return {'status': 'error', 'statusCode': e.code}
    
    except URLError as e:
        log.error(f'GROQ connection failed: {e.reason}')
        return {'status': 'error', 'error': str(e.reason)}
    
    except Exception as e:
        log.error(f'GROQ test error: {str(e)}')
        return {'status': 'error', 'error': str(e)}

# ===== MAIN EXECUTION =====
def main():
    print('\n🔗 PHASE 2: LINK - Connectivity & Authentication Verification\n')

    validate_configuration()

    jira_result = test_jira_connectivity()
    groq_result = test_groq_connectivity()

    # ===== RESULTS SUMMARY =====
    log.section('Phase 2: Test Results Summary')

    all_passed = (
        jira_result['status'] == 'success'
        and groq_result['status'] == 'success'
    )

    if all_passed:
        log.success('✓ All connectivity tests passed!')
        print(
            f"""
 📊 Summary:
   ✅ JIRA API: Connected
   ✅ GROQ API: Connected
   ✅ Authentication: Verified

 Ready for Phase 3: Architect
        """
        )
        sys.exit(0)
    else:
        log.error('❌ Some tests failed. Please review the errors above.')
        print(
            f"""
 📊 Summary:
   {'✅' if jira_result['status'] == 'success' else '❌'} JIRA API
   {'✅' if groq_result['status'] == 'success' else '❌'} GROQ API

 Fix the errors and rerun: python3 connectivity-test.py
        """
        )
        sys.exit(1)

if __name__ == '__main__':
    main()
