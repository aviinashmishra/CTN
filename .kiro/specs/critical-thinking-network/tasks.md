# Implementation Plan: Critical Thinking Network (CTN)

## Overview

This implementation plan breaks down the CTN platform into incremental, testable steps. The platform will be built using Next.js (TypeScript) for the frontend, NestJS for the backend, and a multi-database architecture (PostgreSQL, MongoDB, Redis). The implementation follows a bottom-up approach, starting with core infrastructure, then building authentication with unique usernames, followed by the three main modules (National Panel, College Panel, Resource System), user profiles and search, and finally the dashboards.

Key features include:
- Unique username system for all users (like Twitter)
- Personal profile pages with bio, profile picture, and activity statistics
- User search functionality to discover other users
- Role-based access control (Guest, General_User, College_User, Moderator, Admin)
- National and college-specific discussion panels
- Hierarchical academic resource system with paid cross-college access

## Tasks

- [x] 1. Set up project infrastructure and database connections
  - Initialize Next.js frontend project with TypeScript
  - Initialize NestJS backend project with TypeScript
  - Configure PostgreSQL connection and create initial schema
  - Configure MongoDB connection and create collections
  - Configure Redis connection for caching
  - Set up environment variables and configuration management
  - _Requirements: 10.1, 10.2, 10.3_

- [-] 2. Implement authentication system and role management
  - [x] 2.1 Create User model and database schema in PostgreSQL
    - Define User table with id, email, username (unique), displayName, passwordHash, role, collegeId, bio, profilePictureUrl, timestamps
    - Define UserProfile table for activity statistics (postCount, commentCount, likesReceived, lastActive)
    - Define College table with id, name, emailDomain, logoUrl, timestamps
    - Define Moderator table for role assignments
    - Add unique constraint on username
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 11.1, 11.2_

  - [x] 2.2 Implement AuthService with registration and login
    - Create registration endpoint requiring email, username, and password
    - Validate username uniqueness before registration
    - Validate username format (alphanumeric, underscore, hyphen only)
    - Validate username length (3-30 characters)
    - Create registration endpoint for college emails with domain verification
    - Implement password hashing and validation
    - Implement JWT token generation and validation
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 2.3 Write property test for normal email registration
    - **Property 1: Normal email registration creates general users**
    - **Validates: Requirements 1.2**

  - [x] 2.4 Write property test for college email domain verification
    - **Property 2: College email domain verification**
    - **Validates: Requirements 1.3**

  - [x] 2.5 Write property test for college email registration
    - **Property 3: College email registration creates college users**
    - **Validates: Requirements 1.4**

  - [x] 2.6 Write property test for role assignment consistency
    - **Property 4: Role assignment consistency**
    - **Validates: Requirements 1.5**

  - [x] 2.7 Write property test for username uniqueness validation
    - **Property 45: Username uniqueness validation**
    - **Validates: Requirements 11.2, 11.3**

  - [x] 2.8 Write property test for username character validation
    - **Property 46: Username character validation**
    - **Validates: Requirements 11.4**

  - [x] 2.9 Write property test for username length validation
    - **Property 47: Username length validation**
    - **Validates: Requirements 11.5**

  - [x] 2.10 Implement college domain registry management
    - Create endpoints for adding/removing approved domains
    - Implement domain verification logic
    - _Requirements: 1.6_

  - [x] 2.11 Write property test for domain registry persistence
    - **Property 5: Domain registry persistence**
    - **Validates: Requirements 1.6**

- [x] 3. Checkpoint - Ensure authentication tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 4. Implement National Discussion Panel
  - [x] 4.1 Create Post and Comment models in MongoDB
    - Define Post schema with author, title, content, likes, comments, panel type
    - Define Comment schema with author, content, likes, threading
    - Define Like schema for posts and comments
    - Define Report schema for content moderation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 4.2 Implement PostService for National Panel
    - Create endpoint for creating posts (authenticated users only)
    - Create endpoint for fetching national feed with pagination
    - Implement post validation (title and content required)
    - Implement author identity tracking with username
    - Include username in post and comment responses
    - _Requirements: 2.3, 2.4, 11.9_

  - [x] 4.3 Write property test for guest interaction prevention
    - **Property 6: Guest interaction prevention**
    - **Validates: Requirements 2.2**

  - [x] 4.4 Write property test for post creation validation
    - **Property 7: Post creation validation**
    - **Validates: Requirements 2.3**

  - [x] 4.5 Write property test for author identity preservation
    - **Property 8: Author identity preservation**
    - **Validates: Requirements 2.4**

  - [x] 4.6 Implement comment and like functionality
    - Create endpoint for adding comments with threading support
    - Create endpoint for liking posts and comments
    - Implement like count aggregation
    - _Requirements: 2.5, 2.6_

  - [x] 4.7 Write property test for comment threading and like counts
    - **Property 9: Comment threading and like counts**
    - **Validates: Requirements 2.5**

  - [x] 4.8 Write property test for authenticated user interaction access
    - **Property 10: Authenticated user interaction access**
    - **Validates: Requirements 2.6**

  - [x] 4.9 Implement report functionality
    - Create endpoint for reporting posts and comments
    - Store reports with PENDING status
    - _Requirements: 2.7_

  - [x] 4.10 Write property test for report creation
    - **Property 11: Report creation**
    - **Validates: Requirements 2.7**

  - [x] 4.11 Write property test for username display in content
    - **Property 51: Username display in content**
    - **Validates: Requirements 11.9**

  - [x] 4.12 Build National Panel frontend component
    - Create post feed UI with infinite scroll
    - Create post creation form
    - Create comment thread UI
    - Implement like and report buttons
    - Add role-based UI controls (hide interactions for guests)
    - Display usernames on posts and comments
    - _Requirements: 2.1, 2.2, 2.6, 11.9_

- [x] 5. Checkpoint - Ensure National Panel tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement College Discussion Panel
  - [x] 6.1 Extend PostService for College Panel
    - Create endpoint for creating college posts (college users only)
    - Create endpoint for fetching college feed with college filtering
    - Implement college-based access control
    - _Requirements: 3.1, 3.3, 3.4_

  - [x] 6.2 Write property test for non-college user access denial
    - **Property 12: Non-college user access denial**
    - **Validates: Requirements 3.2**

  - [x] 6.3 Write property test for college post filtering
    - **Property 13: College post filtering**
    - **Validates: Requirements 3.3**

  - [x] 6.4 Write property test for college post isolation
    - **Property 14: College post isolation**
    - **Validates: Requirements 3.4, 3.5**

  - [x] 6.5 Implement college branding in responses
    - Add college logo and name to College Panel responses
    - _Requirements: 3.6_

  - [x] 6.6 Write property test for college branding inclusion
    - **Property 15: College branding inclusion**
    - **Validates: Requirements 3.6**

  - [x] 6.7 Write property test for college user interaction access
    - **Property 16: College user interaction access**
    - **Validates: Requirements 3.7**

  - [x] 6.8 Build College Panel frontend component
    - Create college-specific post feed UI
    - Add college branding display (logo and name)
    - Reuse post creation, comment, and like components
    - Add access control checks
    - _Requirements: 3.1, 3.6, 3.7_

- [x] 7. Checkpoint - Ensure College Panel tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement Academic Resource System structure
  - [x] 8.1 Create Resource model in PostgreSQL
    - Define Resource table with hierarchy fields (collegeId, resourceType, department, batch)
    - Define ResourceAccess table for tracking access and payments
    - Add file metadata fields (fileName, fileUrl, uploadedBy, description, uploadDate)
    - _Requirements: 4.1, 4.6_

  - [x] 8.2 Implement ResourceService for hierarchy management
    - Create endpoint for browsing resource hierarchy by college
    - Implement five-level hierarchy traversal (College → Type → Dept → Batch → Files)
    - Add resource type validation
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

  - [x] 8.3 Write property test for five-level hierarchy completeness
    - **Property 17: Five-level hierarchy completeness**
    - **Validates: Requirements 4.1**

  - [x] 8.4 Write property test for resource type validation
    - **Property 18: Resource type validation**
    - **Validates: Requirements 4.3**

  - [x] 8.5 Write property test for department organization
    - **Property 19: Department organization**
    - **Validates: Requirements 4.4**

  - [x] 8.6 Write property test for batch organization
    - **Property 20: Batch organization**
    - **Validates: Requirements 4.5**

  - [x] 8.7 Write property test for file metadata completeness
    - **Property 21: File metadata completeness**
    - **Validates: Requirements 4.6**

- [ ] 9. Implement own college resource access
  - [x] 9.1 Add access control for own college resources
    - Implement endpoint for viewing own college files (no payment)
    - Implement endpoint for downloading own college files (no payment)
    - Block general users from resource access
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 9.2 Write property test for own college folder access
    - **Property 22: Own college folder access**
    - **Validates: Requirements 5.1**

  - [x] 9.3 Write property test for own college file access without payment
    - **Property 23: Own college file access without payment**
    - **Validates: Requirements 5.2, 5.3**

  - [x] 9.4 Write property test for general user resource denial
    - **Property 24: General user resource denial**
    - **Validates: Requirements 5.4**

  - [x] 9.5 Implement access tracking for own college
    - Create ResourceAccess records for own college access
    - Track access without payment data
    - _Requirements: 5.5_

  - [x] 9.6 Write property test for own college access tracking
    - **Property 25: Own college access tracking**
    - **Validates: Requirements 5.5**

- [ ] 10. Implement cross-college resource access and payment
  - [x] 10.1 Add college selection and cross-college browsing
    - Create endpoint for listing all colleges
    - Implement cross-college hierarchy browsing (folders visible)
    - Show file metadata as preview only for other colleges
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 10.2 Write property test for cross-college hierarchy browsing
    - **Property 26: Cross-college hierarchy browsing**
    - **Validates: Requirements 6.2**

  - [x] 10.3 Write property test for cross-college folder visibility
    - **Property 27: Cross-college folder visibility**
    - **Validates: Requirements 6.3**

  - [x] 10.4 Write property test for cross-college file preview
    - **Property 28: Cross-college file preview**
    - **Validates: Requirements 6.4**

  - [x] 10.5 Implement payment flow for locked resources
    - Create endpoint for initiating payment (returns payment session)
    - Block view/download for unpaid files from other colleges
    - _Requirements: 6.5, 6.6_

  - [x] 10.6 Write property test for locked file access prevention
    - **Property 29: Locked file access prevention**
    - **Validates: Requirements 6.5, 6.6**

  - [x] 10.7 Implement payment verification and unlock
    - Create endpoint for verifying payment completion
    - Grant access to specific file after payment
    - Create ResourceAccess record with payment data
    - _Requirements: 6.7, 6.8_

  - [x] 10.8 Write property test for payment unlocks file access
    - **Property 30: Payment unlocks file access**
    - **Validates: Requirements 6.7**

  - [x] 10.9 Write property test for unlock record persistence
    - **Property 31: Unlock record persistence**
    - **Validates: Requirements 6.8**

  - [x] 10.10 Write property test for payment does not grant college panel access
    - **Property 32: Payment does not grant college panel access**
    - **Validates: Requirements 6.9**

  - [x] 10.11 Build Resource Browser frontend component
    - Create college selection dropdown
    - Create hierarchical folder navigation UI
    - Display file metadata with lock indicators
    - Implement payment modal for locked files
    - Add download functionality
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 11. Checkpoint - Ensure Resource System tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement Moderator Dashboard
  - [x] 12.1 Create moderator role assignment system
    - Add endpoint for assigning moderator role to users
    - Link moderators to specific colleges
    - _Requirements: 7.1_

  - [x] 12.2 Implement resource upload for moderators
    - Create endpoint for uploading resources (moderators only)
    - Validate hierarchy fields (resourceType, department, batch)
    - Store files in correct hierarchical location
    - Restrict uploads to moderator's assigned college
    - _Requirements: 7.2, 7.3, 7.5_

  - [x] 12.3 Write property test for resource upload validation
    - **Property 33: Resource upload validation**
    - **Validates: Requirements 7.2**

  - [x] 12.4 Write property test for resource hierarchical placement
    - **Property 34: Resource hierarchical placement**
    - **Validates: Requirements 7.3**

  - [x] 12.5 Write property test for moderator college restriction
    - **Property 35: Moderator college restriction**
    - **Validates: Requirements 7.5, 7.6**

  - [x] 12.6 Add moderation flags for college panel
    - Add moderation actions to college posts (flag, hide)
    - Restrict moderation to moderator's college
    - _Requirements: 7.4_

  - [x] 12.7 Write property test for moderator permission boundaries
    - **Property 36: Moderator permission boundaries**
    - **Validates: Requirements 7.7**

  - [ ] 12.8 Build Moderator Dashboard frontend
    - Create resource upload form with hierarchy selection
    - Create college panel moderation interface
    - Add college-specific controls
    - _Requirements: 7.1, 7.2, 7.4_

- [ ] 13. Implement Admin Dashboard
  - [ ] 13.1 Create admin role and permissions
    - Add admin role to user system
    - Implement admin-level access control checks
    - _Requirements: 8.1_

  - [ ] 13.2 Implement admin post management
    - Add endpoints for creating/deleting posts in any panel
    - Enable cross-panel post management
    - _Requirements: 8.2_

  - [ ] 13.3 Write property test for admin cross-panel post management
    - **Property 37: Admin cross-panel post management**
    - **Validates: Requirements 8.2**

  - [ ] 13.4 Implement admin resource management
    - Add endpoints for creating/deleting resources in any college
    - Enable cross-college resource management
    - _Requirements: 8.3_

  - [ ] 13.5 Write property test for admin cross-college resource management
    - **Property 38: Admin cross-college resource management**
    - **Validates: Requirements 8.3**

  - [ ] 13.6 Implement college management
    - Create endpoint for adding new colleges
    - Create endpoint for deleting colleges
    - Add college entity creation with domain verification
    - _Requirements: 8.4_

  - [ ] 13.7 Write property test for college creation workflow
    - **Property 39: College creation workflow**
    - **Validates: Requirements 8.4**

  - [ ] 13.8 Implement domain approval system
    - Create endpoint for approving email domains
    - Add domains to verification registry
    - _Requirements: 8.5_

  - [ ] 13.9 Write property test for domain approval workflow
    - **Property 40: Domain approval workflow**
    - **Validates: Requirements 8.5**

  - [ ] 13.10 Implement moderator role management
    - Create endpoint for assigning moderator role
    - Create endpoint for revoking moderator role
    - _Requirements: 8.6_

  - [ ] 13.11 Write property test for moderator role management
    - **Property 41: Moderator role management**
    - **Validates: Requirements 8.6**

  - [ ] 13.12 Add payment and unlock record viewing
    - Create endpoint for viewing all payment records
    - Create endpoint for viewing all unlock records
    - _Requirements: 8.7_

  - [ ] 13.13 Write property test for admin platform-wide moderation
    - **Property 42: Admin platform-wide moderation**
    - **Validates: Requirements 8.8**

  - [ ] 13.14 Build Admin Dashboard frontend
    - Create college management interface
    - Create domain approval interface
    - Create moderator assignment interface
    - Create payment/unlock records viewer
    - Create platform-wide content moderation interface
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [ ] 14. Implement User Dashboard and navigation
  - [ ] 14.1 Create role-based navigation system
    - Implement navigation component with role-based visibility
    - Show appropriate panels based on user role
    - Add user search link in navigation
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 12.1_

  - [ ] 14.2 Write property test for role-based navigation
    - **Property 43: Role-based navigation**
    - **Validates: Requirements 9.4**

  - [ ] 14.3 Implement user profile system
    - Create endpoint for fetching user profile (own and others)
    - Include role, college, username, and statistics
    - Hide private information (email) from public profiles
    - Create endpoint for updating profile (bio, display name, profile picture)
    - Implement profile picture upload
    - _Requirements: 9.5, 11.6, 11.7, 11.8_

  - [ ] 14.4 Write property test for own profile data completeness
    - **Property 48: Own profile data completeness**
    - **Validates: Requirements 11.6**

  - [ ] 14.5 Write property test for public profile data visibility
    - **Property 49: Public profile data visibility**
    - **Validates: Requirements 11.7**

  - [ ] 14.6 Write property test for profile update persistence
    - **Property 50: Profile update persistence**
    - **Validates: Requirements 11.8**

  - [ ] 14.7 Implement user search functionality
    - Create endpoint for searching users by username, display name, and college
    - Implement multi-field search with relevance ordering
    - Limit results to 50 users
    - Restrict access to logged-in users only
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.6, 12.7_

  - [ ] 14.8 Write property test for search access control
    - **Property 52: Search access control**
    - **Validates: Requirements 12.1, 12.7**

  - [ ] 14.9 Write property test for multi-field search
    - **Property 53: Multi-field search**
    - **Validates: Requirements 12.2**

  - [ ] 14.10 Write property test for search result data completeness
    - **Property 54: Search result data completeness**
    - **Validates: Requirements 12.3**

  - [ ] 14.11 Write property test for search result relevance ordering
    - **Property 55: Search result relevance ordering**
    - **Validates: Requirements 12.4**

  - [ ] 14.12 Write property test for search result limit
    - **Property 56: Search result limit**
    - **Validates: Requirements 12.6**

  - [ ] 14.13 Build unified dashboard UI
    - Create main dashboard layout
    - Add navigation between panels
    - Create profile view and edit form
    - Create user search interface
    - Add login/signup forms with username field
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 11.6, 11.7, 11.8, 12.1, 12.2, 12.3_

  - [ ] 14.14 Write property test for profile information completeness (legacy)
    - **Property 44: Profile information completeness**
    - **Validates: Requirements 9.5**

- [ ] 15. Implement caching with Redis
  - [ ] 15.1 Add Redis caching for frequently accessed data
    - Cache user sessions
    - Cache resource hierarchy structures
    - Cache post feeds (national and college)
    - Cache user unlock records
    - _Requirements: 9.6_

  - [ ] 15.2 Implement cache invalidation logic
    - Invalidate caches on data updates
    - Set appropriate TTLs for different data types
    - _Requirements: 9.6_

- [ ] 16. Final checkpoint - Integration testing
  - [ ] 16.1 Write integration tests for complete user journeys
    - Test guest browsing national panel
    - Test general user registration and posting
    - Test college user registration and college panel access
    - Test college user resource browsing and payment
    - Test moderator resource upload
    - Test admin college and moderator management

  - [ ] 16.2 Ensure all tests pass
    - Run full test suite (unit + property + integration)
    - Fix any failing tests
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: infrastructure → auth → modules → dashboards
