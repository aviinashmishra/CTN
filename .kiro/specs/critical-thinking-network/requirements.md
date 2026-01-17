# Requirements Document

## Introduction

Critical Thinking Network (CTN) is a role-based social media platform designed for college students that combines national-level critical discourse, college-specific private discussions, and a structured academic resource system with paid cross-college access. The platform uses Next.js (TypeScript) for the frontend, NestJS for the backend, and a multi-database architecture (PostgreSQL for users/relationships, MongoDB for posts/activity, Redis for caching).

## Glossary

- **CTN**: Critical Thinking Network - the platform system
- **Guest**: A user who is not logged in
- **General_User**: A user logged in with a normal email (Gmail, Outlook, etc.)
- **College_User**: A user logged in with a verified college email
- **Moderator**: A campus ambassador with resource management permissions for their college
- **Admin**: A super administrator with full platform control
- **National_Panel**: The public discussion feed for critical discourse
- **College_Panel**: The private, college-specific discussion space
- **Resource_System**: The hierarchical academic resource repository
- **Resource_Type**: Categories like Topper Notes, PYQs, Case Competition Decks, Presentations, Study Strategies
- **Cross_College_Access**: Paid access to view/download resources from other colleges
- **Username**: A unique identifier for each user across the platform (like Twitter handle)
- **User_Profile**: A personal profile page displaying user information and activity
- **User_Search**: A search feature to find and view other users' profiles

## Requirements

### Requirement 1: User Authentication and Role Management

**User Story:** As a platform user, I want to authenticate using different email types, so that I can access appropriate platform features based on my verification level.

#### Acceptance Criteria

1. WHEN a user visits the platform without logging in, THE CTN SHALL display the National_Panel in read-only mode
2. WHEN a user registers with a normal email address, THE CTN SHALL create a General_User account with access to the National_Panel
3. WHEN a user registers with a college email address, THE CTN SHALL verify the email domain against approved college domains
4. WHEN a college email is verified, THE CTN SHALL create a College_User account and map the user to their college
5. WHEN a user logs in, THE CTN SHALL assign the appropriate role based on their email type and verification status
6. THE CTN SHALL maintain a registry of approved college email domains for verification

### Requirement 2: National Critical Discourse Module

**User Story:** As a logged-in user, I want to participate in national-level discussions, so that I can engage in critical thinking and debate on current affairs.

#### Acceptance Criteria

1. WHEN any user visits the platform, THE CTN SHALL display the National_Panel with all posts visible
2. WHEN a Guest views the National_Panel, THE CTN SHALL prevent all interaction capabilities (posting, commenting, liking)
3. WHEN a General_User or College_User creates a post, THE CTN SHALL require a title and content
4. WHEN a post is created, THE CTN SHALL display the author's identity (no anonymous posting)
5. WHEN a logged-in user views a post, THE CTN SHALL display threaded comments with like counts
6. WHEN a logged-in user interacts with content, THE CTN SHALL enable posting, commenting, and liking
7. WHEN a user reports content, THE CTN SHALL flag the content for moderator review
8. THE CTN SHALL store all National_Panel posts and activity in MongoDB

### Requirement 3: College-Specific Discussion Panel

**User Story:** As a college student, I want a private discussion space for my college, so that I can communicate with verified peers from my institution.

#### Acceptance Criteria

1. WHEN a College_User logs in, THE CTN SHALL display their college-specific College_Panel
2. WHEN a General_User or Guest attempts to access any College_Panel, THE CTN SHALL deny access
3. WHEN a College_User views their College_Panel, THE CTN SHALL display only posts from users of the same college
4. WHEN a College_User creates a post in the College_Panel, THE CTN SHALL restrict visibility to users from the same college
5. THE CTN SHALL prevent cross-college viewing of College_Panel content
6. WHEN a College_Panel is displayed, THE CTN SHALL show the college branding (logo and name)
7. THE CTN SHALL enable posting, commenting, and liking within the College_Panel for College_User members
8. THE CTN SHALL store all College_Panel posts and activity in MongoDB with college association

### Requirement 4: Academic Resource System - Hierarchical Structure

**User Story:** As a college user, I want to access organized academic resources, so that I can find study materials structured by type, department, and batch.

#### Acceptance Criteria

1. THE Resource_System SHALL organize all resources in a five-level hierarchy: College → Resource_Type → Department → Batch → Files
2. WHEN a College_User accesses the Resource_System, THE CTN SHALL default to displaying their own college's resources
3. THE Resource_System SHALL support these Resource_Type categories: Topper Notes, Previous Year Questions, Case Competition Winning Decks, Presentations, Study Strategies
4. WHEN browsing resources, THE CTN SHALL display departments/programs (Mechanical, CSE, Electrical, MBA, IPM, etc.)
5. WHEN a department is selected, THE CTN SHALL display batch/year folders (2020 Batch, 2021 Batch, Year 1, Year 2, etc.)
6. WHEN a batch folder is opened, THE CTN SHALL display files with metadata (uploaded by, batch, description, upload date)
7. THE CTN SHALL store resource metadata in PostgreSQL and file references with college associations

### Requirement 5: Own College Resource Access

**User Story:** As a college user, I want to freely access my own college's academic resources, so that I can download study materials without payment.

#### Acceptance Criteria

1. WHEN a College_User views their own college's resources, THE CTN SHALL enable full browsing of all folders
2. WHEN a College_User selects a file from their own college, THE CTN SHALL allow viewing without payment
3. WHEN a College_User downloads a file from their own college, THE CTN SHALL allow download without payment
4. WHEN a General_User attempts to access any Resource_System content, THE CTN SHALL deny access
5. THE CTN SHALL track resource access for own college users without payment requirements

### Requirement 6: Cross-College Resource Discovery and Payment

**User Story:** As a college user, I want to browse and purchase resources from other colleges, so that I can access valuable academic materials beyond my institution.

#### Acceptance Criteria

1. WHEN a College_User accesses the Resource_System, THE CTN SHALL provide a college selection dropdown
2. WHEN a College_User selects a different college, THE CTN SHALL display that college's resource hierarchy
3. WHEN browsing another college's resources, THE CTN SHALL display Resource_Type, Department, and Batch folders without restriction
4. WHEN browsing another college's resources, THE CTN SHALL display file names as preview only
5. WHEN a College_User attempts to open a file from another college, THE CTN SHALL display a payment prompt
6. WHEN a College_User attempts to download a file from another college, THE CTN SHALL require payment completion
7. WHEN a payment is completed for a file, THE CTN SHALL unlock viewing and downloading for that specific file
8. THE CTN SHALL maintain a record of paid resource unlocks per user in PostgreSQL
9. THE CTN SHALL prevent access to other colleges' College_Panel content regardless of payment

### Requirement 7: Moderator Dashboard and Permissions

**User Story:** As a campus ambassador, I want to manage my college's academic resources, so that I can organize and upload materials for my peers.

#### Acceptance Criteria

1. WHEN a Moderator logs in, THE CTN SHALL display the Moderator Dashboard with college-specific controls
2. WHEN a Moderator uploads a resource, THE CTN SHALL require selection of Resource_Type, Department, and Batch
3. WHEN a Moderator uploads a file, THE CTN SHALL store it in the correct hierarchical location for their college
4. WHEN a Moderator views the College_Panel, THE CTN SHALL enable content moderation flags
5. THE CTN SHALL restrict Moderator permissions to their assigned college only
6. WHEN a Moderator attempts to access another college's resources for management, THE CTN SHALL deny access
7. THE CTN SHALL prevent Moderators from assigning roles or overriding Admin actions

### Requirement 8: Admin Dashboard and Platform Control

**User Story:** As a platform administrator, I want full control over the platform, so that I can manage colleges, users, content, and permissions.

#### Acceptance Criteria

1. WHEN an Admin logs in, THE CTN SHALL display the Admin Dashboard with platform-wide controls
2. THE Admin Dashboard SHALL enable creating and deleting posts across all panels (National and College)
3. THE Admin Dashboard SHALL enable creating and deleting resources across all colleges
4. WHEN an Admin adds a college, THE CTN SHALL create the college entity and enable email domain verification
5. WHEN an Admin approves a college email domain, THE CTN SHALL add it to the verification registry
6. THE Admin Dashboard SHALL enable assigning and revoking Moderator access for any college
7. THE Admin Dashboard SHALL display payment and unlock records for cross-college resource access
8. THE Admin Dashboard SHALL enable platform-wide content moderation across all modules

### Requirement 9: User Dashboard and Navigation

**User Story:** As a platform user, I want a unified dashboard, so that I can access all features appropriate to my role.

#### Acceptance Criteria

1. WHEN a Guest visits the platform, THE CTN SHALL display the National_Panel and login/signup options
2. WHEN a General_User logs in, THE CTN SHALL display the National_Panel and profile creation options
3. WHEN a College_User logs in, THE CTN SHALL display the National_Panel, College_Panel, and Resource_System
4. THE CTN SHALL provide navigation between National_Panel, College_Panel (if authorized), and Resource_System (if authorized)
5. WHEN a user views their profile, THE CTN SHALL display their role and associated college (if applicable)
6. THE CTN SHALL cache frequently accessed data using Redis for improved performance

### Requirement 10: Data Storage and Architecture

**User Story:** As a system architect, I want a multi-database architecture, so that the platform can efficiently handle different data types and access patterns.

#### Acceptance Criteria

1. THE CTN SHALL store user accounts, relationships, and resource metadata in PostgreSQL
2. THE CTN SHALL store posts, comments, likes, and activity feeds in MongoDB
3. THE CTN SHALL cache frequently accessed data in Redis
4. WHEN a user authenticates, THE CTN SHALL query PostgreSQL for user credentials and role information
5. WHEN posts are displayed, THE CTN SHALL query MongoDB for post content and activity
6. WHEN resources are accessed, THE CTN SHALL query PostgreSQL for metadata and access permissions
7. THE CTN SHALL maintain referential integrity between databases using application-level logic

### Requirement 11: User Profiles and Usernames

**User Story:** As a platform user, I want a unique username and personal profile, so that I can establish my identity and be discoverable by other users.

#### Acceptance Criteria

1. WHEN a user registers, THE CTN SHALL require a unique username
2. THE CTN SHALL validate that the username is unique across all users
3. WHEN a username is already taken, THE CTN SHALL reject registration with a clear error message
4. THE CTN SHALL allow usernames containing alphanumeric characters, underscores, and hyphens
5. THE CTN SHALL enforce username length between 3 and 30 characters
6. WHEN a user views their profile, THE CTN SHALL display username, email, role, college (if applicable), join date, and activity statistics
7. WHEN any user views another user's profile, THE CTN SHALL display public profile information (username, role, college, join date, post count)
8. THE CTN SHALL allow users to edit their profile information (bio, profile picture, display name)
9. WHEN a user creates a post or comment, THE CTN SHALL display their username alongside the content

### Requirement 12: User Search and Discovery

**User Story:** As a platform user, I want to search for other users, so that I can discover and connect with peers across the platform.

#### Acceptance Criteria

1. THE CTN SHALL provide a user search feature accessible to all logged-in users
2. WHEN a user enters a search query, THE CTN SHALL search by username, display name, and college name
3. WHEN search results are displayed, THE CTN SHALL show username, display name, profile picture, role, and college (if applicable)
4. THE CTN SHALL return search results sorted by relevance (exact matches first, then partial matches)
5. WHEN a user clicks on a search result, THE CTN SHALL navigate to that user's profile page
6. THE CTN SHALL limit search results to 50 users per query
7. WHEN a Guest user attempts to access user search, THE CTN SHALL deny access and prompt for login

