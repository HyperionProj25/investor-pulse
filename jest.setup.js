// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Set up test environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.SESSION_SECRET = 'test-session-secret-for-testing-only-min-32-chars-long'
process.env.ADMIN_PIN_CHASE = '0000'
process.env.ADMIN_PIN_SHELDON = '0000'
