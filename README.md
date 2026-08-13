# KC Connect

PRODUCT REQUIREMENTS DOCUMENT
KC Meeting Platform
Version 1.0  •  Product Definition  •  August 2026

1. Executive Summary
The KC Meeting Platform is a secure, professional online meeting platform designed for organizations that need to host live meetings where participants can authenticate, join quickly, watch a live host broadcast, interact through chat, raise their hands, ask questions, and have attendance automatically monitored.
Unlike Zoom or Google Meet, the platform is broadcast-oriented rather than a fully open video-conferencing system. The host controls the live video stream while participants interact through live chat, hand raising, questions, meeting reactions, attendance tracking, participant status, and notifications.
2. Product Vision
To provide a simple, reliable, low-bandwidth and highly controlled meeting experience where participants can join a live meeting in seconds while administrators have complete visibility over participation and engagement.
Vision statement: “One account. One login. One click into the meeting.”
3. Problem Statement
Traditional video-conferencing platforms can be unnecessarily complex for large organizational meetings. Participants may have to receive meeting links, enter meeting IDs or passwords, configure microphones and cameras, navigate complicated interfaces, deal with unstable connections, and consume significant mobile data.
Administrators also have limited control over organization-specific participant information and attendance reporting. The KC Meeting Platform solves this by creating a controlled environment where every participant has an organizational identity.
4. Product Objectives
1.Allow users to create accounts.
2.Identify users using their unique KC Handle.
3.Allow users to authenticate securely.
4.Automatically take authenticated users to the active meeting.
5.Display participant information during meetings.
6.Provide reliable live video streaming.
7.Optimize video delivery for low bandwidth.
8.Track participant login time.
9.Track participant logout/leave time.
10.Determine whether participants are currently inside the meeting.
11.Provide live participant monitoring.
12.Provide real-time chat.
13.Allow users to raise their hands.
14.Allow hosts/moderators to manage questions.
15.Provide detailed meeting attendance reports.
16.Provide a rich administrative backend.
17.Scale to large numbers of participants.
18.Maintain strong security and privacy controls.
5. Target Users
Participant
A registered person attending meetings. Required information: title, first name, last name, phone number, church, church email, KC Handle, password, account status, and optional profile photo.
Host
Responsible for conducting the live meeting. Can start/end meetings, broadcast live, monitor participants, manage questions, manage raised hands, moderate chat, and view attendance.
Moderator
Assists the host by monitoring participants, managing chat, reviewing questions, managing raised hands, removing participants where authorized, and viewing attendance.
Administrator
Manages users, meetings, hosts, moderators, churches, attendance, analytics, reports, streaming, and system settings.
Super Administrator
Has complete access including administrator management, roles and permissions, system configuration, audit logs, streaming configuration, and platform settings.
6. User Registration
Users should have a dedicated registration page.
Field	Required
Title	Yes
First Name	Yes
Last Name	Yes
Phone Number	Yes
Church	Yes
Church Email	Yes
KC Handle	Yes
Password	Yes
Confirm Password	Yes
7. KC Handle
The KC Handle is the user's unique organizational identifier. It must be unique, case-insensitively validated, and indexed at the database level. Example: KC123456.
The KC Handle can be supported as the primary login identifier, while church email remains the user's registered email identity.
8. Login Experience
The login experience should be extremely simple. Users should be able to log in with their registered church email or KC Handle and password, subject to the final authentication configuration.
KC MEETING

Church Email / KC Handle
[ user@church.org             ]

Password
[ •••••••••••                 ]

[ LOGIN ]

Forgot Password?
9. Post-Login Experience
If there is an active meeting, the participant should automatically be redirected to the live meeting. If there is no active meeting, the participant should see the next scheduled meeting and upcoming meetings.
10. Meeting Interface
The meeting interface should be clean, modern, responsive, and optimized for desktop and mobile.
┌─────────────────────────────────────────────────────┐
│ KC MEETING                     🔴 LIVE    245 Users │
├─────────────────────────────────────────────────────┤
│                                                     │
│                 HOST LIVE VIDEO                     │
│                                                     │
│              ┌──────────────────┐                   │
│              │    LIVE HOST     │                   │
│              └──────────────────┘                   │
│                                                     │
├───────────────────────────┬─────────────────────────┤
│ Participant Card          │ Chat                    │
│ Pastor John Doe           │ User: Welcome sir      │
│ Pastor                    │                         │
│ Christ Embassy            │ User: Thank you        │
│ 🟢 In Meeting             │ [Type message...]      │
├───────────────────────────┴─────────────────────────┤
│ [ 🙋 Raise Hand ]       [ 💬 Chat ]       [ Leave ] │
└─────────────────────────────────────────────────────┘
11. Participant Information Card
Every authenticated participant should have a small identity card displaying title, name, church, and online status. Optional future fields include KC Handle, profile photo, and role.
12. Live Streaming Architecture
The platform should use a one-to-many live broadcasting architecture. The host is the primary broadcaster; participants are viewers. Laravel should not directly process or distribute video. A dedicated streaming infrastructure should handle ingest, transcoding, packaging, and CDN delivery.
HOST
 │
 │ Camera / Encoder
 ▼
Streaming Server
 │
 ├── 1080p
 ├── 720p
 ├── 480p
 ├── 360p
 └── 240p
 │
 ▼
CDN
 │
 ├─────────────┬─────────────┐
 ▼             ▼             ▼
Participant  Participant  Participant
13. Low Data Mode
The platform must support Adaptive Bitrate Streaming (ABR), allowing the player to move between multiple renditions based on network conditions. Suggested profiles are 240p/360p for data saver, 480p for standard, and 720p for high quality.
The system should avoid forcing every participant to consume the highest available quality. Video and audio should be encoded efficiently, with H.264/AAC as a broad-compatibility baseline.
14. Picture-in-Picture (PiP) Video Player
The video player must support Picture-in-Picture (PiP) where supported by the user's browser or device. PiP allows the live host video to remain visible in a floating window while the participant navigates to another application or page, subject to browser and operating-system restrictions.
PiP should be implemented as a player control, with graceful fallback when the browser/device does not support it. The player should also support fullscreen, play/pause where appropriate, volume/mute, quality selection or automatic quality, reconnect/recovery, and a clear LIVE indicator.
The product should prioritize native browser/device PiP capabilities rather than implementing a custom floating video window. On supported mobile browsers and desktop browsers, the PiP button should appear only when the capability is available.
For future Flutter applications, native platform Picture-in-Picture support should be evaluated separately for Android and iOS rather than assuming browser PiP behavior will carry over.
15. Meeting Creation
Administrators should be able to create meetings with title, description, date, start time, end time, host, moderators, status, streaming URL/embed URL, participant access, chat setting, and hand-raise setting.
16. Embedded Stream
The admin backend should provide a streaming configuration section where an authorized administrator can configure a provider, stream URL, embed URL, playback type, and connection status. The application should remain provider-agnostic so the streaming provider can be changed without redesigning the meeting system.
17. Meeting States
Scheduled
Starting Soon
Live
Ended
Archived
18. Participant Attendance Monitoring
The system should monitor login time, meeting entry time, last activity, exit time, current status, total duration, and connection state. Suggested statuses are In Meeting, Idle, Left Meeting, and Logged Out.
A heartbeat/presence mechanism should determine whether a participant remains connected. The system should not rely only on a browser logout event because users may close a browser, lose connectivity, or lose power.
19. Multiple Attendance Sessions
If a participant leaves and rejoins, the system should retain separate sessions and aggregate them into a total meeting duration rather than creating duplicate attendance records.
20. Live Attendance Monitor
Administrators should have a real-time participant monitor showing total registered users, currently online users, total joined, users who have left, participant identity, status, and join time. The monitor should update without requiring a manual page refresh.
21. Chat
The platform should provide real-time chat. Participants can send and read messages with timestamps. Administrators and moderators can delete messages, hide messages, restrict users, clear chat, disable chat, and pin important messages.
22. Raise Hand
Participants should have a prominent Raise Hand button. The host/moderator receives the event in real time. The system should maintain a queue of raised hands with participant identity, time raised, and status.
Host actions: acknowledge, call participant, mark answered, lower hand, or dismiss.
23. Questions
A dedicated question feature should be separate from general chat. Participants can submit questions and hosts/moderators can review a queue with Pending, Answered, and Dismissed states.
24. Host Dashboard
The host dashboard should show live viewers, total joined, questions, raised hands, chat messages, and controls for the broadcast, participants, chat, questions, raised hands, announcements, and moderators.
25. Professional Admin Backend
The admin backend should be a full management system with Dashboard, Meetings, Participants, Churches, Live Monitor, Attendance, Streaming, Notifications, Audit Logs, and Settings.
Dashboard analytics should include total users, active users, total meetings, live meetings, total attendance, current participants, questions, chat messages, attendance trends, daily participants, average duration, returning participants, church participation, and peak concurrent users.
26. User Management
Administrators should be able to create, edit, view, search, filter, deactivate, reactivate, reset passwords, and inspect attendance and meeting history for users. Filters should include name, KC Handle, church, email, status, and registration date.
27. Church Management
Administrators should manage churches/branches with church name, branch, location, church code, and status.
28. Meeting Management
Administrators can create, edit, delete/cancel, schedule, assign hosts and moderators, configure streams, enable/disable chat and hand raising, start/end meetings, and archive meetings.
29. Attendance Reports
Reports should provide registered participants, joined participants, peak attendance, average duration, individual join/leave times, and total duration. Reports must be exportable to Excel, CSV, and PDF.
30. Analytics
Analytics should cover attendance, engagement, church participation, average duration, peak attendance, questions, raised hands, chat activity, and returning participants.
31. Notifications
The platform should support email and future push notifications for registration confirmation, password reset, meeting reminders, meeting starting, meeting live, important announcements, and question responses.
32. Security
Secure password hashing
CSRF protection
Rate limiting
Session security
Role-based access control
Permission management
Input validation
API authentication
Secure cookies
Audit logs
Login attempt monitoring
Account lockout/rate limiting
Secure streaming URLs
33. Role-Based Access Control
Recommended roles: Super Admin, Admin, Meeting Manager, Host, Moderator, Participant. Permissions should be granular, including manage_users, manage_meetings, start_meeting, end_meeting, manage_chat, manage_questions, manage_attendance, view_reports, export_reports, manage_stream, and manage_admins.
34. Audit Log
The system should maintain an audit trail for login, logout, user creation/modification, meeting creation/changes/start/end, chat moderation, participant removal, role changes, and configuration changes.
35. Database Structure
Initial core tables:
users
churches
roles
permissions
meetings
meeting_hosts
meeting_moderators
meeting_participants
attendance_sessions
chat_messages
questions
raised_hands
notifications
stream_configurations
audit_logs
36. Core User Table
users

id
title
first_name
last_name
phone
church_id
church_email
kc_handle
password
status
last_login_at
created_at
updated_at
37. Meeting Table
meetings

id
title
description
scheduled_at
started_at
ended_at
host_id
status
stream_url
embed_url
chat_enabled
questions_enabled
hand_raise_enabled
created_at
updated_at
38. Attendance Session Table
attendance_sessions

id
meeting_id
user_id
joined_at
left_at
last_seen_at
duration_seconds
status
created_at
updated_at
39. Chat, Questions and Raised Hands
chat_messages
id
meeting_id
user_id
message
status
created_at
updated_at

questions
id
meeting_id
user_id
question
status
submitted_at
answered_at
answered_by
created_at
updated_at

raised_hands
id
meeting_id
user_id
raised_at
acknowledged_at
answered_at
status
created_at
updated_at
40. Real-Time Infrastructure
Real-time functionality is required for participant presence, chat, hand raising, questions, live counters, notifications, and host controls.
Laravel
   │
   ├── Laravel Reverb / WebSockets
   ├── Redis
   └── Queue Workers
          │
          ▼
      Real-time Clients
41. Recommended Technology Stack
Backend
Laravel 12
PHP 8.4
Laravel Sanctum
Laravel Reverb
Laravel Queues
Redis
MySQL
Web Frontend
Livewire
Tailwind CSS
Alpine.js
Vite
Mobile
Flutter
REST API
Sanctum/API authentication
Streaming
HLS / LL-HLS
H.264
AAC
FFmpeg where required
CDN
42. API Architecture
The system should expose a versioned API under /api/v1/.
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/me

GET    /api/v1/meetings
GET    /api/v1/meetings/live
GET    /api/v1/meetings/{meeting}

POST   /api/v1/meetings/{meeting}/join
POST   /api/v1/meetings/{meeting}/leave

GET    /api/v1/meetings/{meeting}/chat
POST   /api/v1/meetings/{meeting}/chat

POST   /api/v1/meetings/{meeting}/raise-hand
DELETE /api/v1/meetings/{meeting}/raise-hand

POST   /api/v1/meetings/{meeting}/questions
43. User Journey
Registration
     ↓
Enter Details
     ↓
Validate Email/KC
     ↓
Create Account
     ↓
Login
     ↓
Active Meeting?
   ↙       ↘
 YES        NO
 ↓           ↓
Meeting    Upcoming
44. Returning User Journey
Open Platform
     ↓
Login
     ↓
Enter Password
     ↓
Authentication
     ↓
Active Meeting
     ↓
JOIN MEETING
45. Meeting Experience
LOGIN
  ↓
AUTHENTICATE
  ↓
CHECK ACTIVE MEETING
  ↓
CREATE ATTENDANCE SESSION
  ↓
LOAD LIVE STREAM
  ↓
DISPLAY USER CARD
  ↓
CONNECT REAL-TIME CHANNEL
  ↓
ENABLE CHAT / HAND RAISE
  ↓
HEARTBEAT MONITORING
  ↓
LEAVE
  ↓
CLOSE ATTENDANCE SESSION
46. Reliability Requirements
Automatic stream quality adaptation
CDN delivery
Reconnection support
Player recovery after temporary network loss
Graceful handling of poor network conditions
Persistent attendance tracking
WebSocket reconnection
Queue-based background processing
Database indexing
Redis caching
47. Scalability
The application should allow horizontal scaling of Laravel application servers behind a load balancer. Redis should support shared cache, queues, and real-time infrastructure. MySQL should be properly indexed and designed for growth.
Streaming traffic should be handled primarily by the streaming infrastructure and CDN rather than by the Laravel application server. This prevents large numbers of viewers from overwhelming the application servers.
48. Performance Requirements
Login response: target under 2 seconds under normal conditions.
Meeting page initial load: target under 3 seconds where network conditions permit.
Chat delivery: near real-time.
Hand raise notification: near real-time.
Participant status: near real-time.
Stream startup: target within several seconds.
Automatic stream recovery after temporary connection loss.
49. Admin Dashboard Navigation
DASHBOARD

MEETINGS
 ├── All Meetings
 ├── Live Meetings
 ├── Upcoming
 └── Past Meetings

PARTICIPANTS
 ├── All Users
 ├── Active Users
 └── Suspended Users

CHURCHES

LIVE MONITOR
 ├── Current Participants
 ├── Chat
 ├── Questions
 └── Raised Hands

ATTENDANCE
 ├── Reports
 ├── Analytics
 └── Exports

STREAMING

NOTIFICATIONS

AUDIT LOGS

SETTINGS
 ├── General
 ├── Authentication
 ├── Streaming
 ├── Notifications
 └── Roles & Permissions
50. Mobile Experience
The meeting interface must be responsive and mobile-first. The mobile experience should keep the live video, participant identity, chat, hand raise, and leave controls accessible without requiring complicated navigation.
51. Data Saver Strategy
Adaptive bitrate
240p fallback
360p mobile-data preference
Efficient HLS segments
CDN delivery
Lazy loading
Compressed assets
Minimal animations
Optimized JavaScript
Real-time connections only where necessary
52. Security & Privacy
The platform should protect personal information, church email, phone number, KC Handle, attendance records, chat messages, and meeting information. Administrators should only see information permitted by their role. Privacy policies and data retention rules should be defined before production deployment.
53. MVP Scope
Authentication
Registration
Login
Logout
Password reset
KC Handle
User profile
Meetings
Create meeting
Schedule meeting
Active meeting
Embedded live stream
End meeting
Participants
Participant card
Online status
Login monitoring
Join monitoring
Logout/leave monitoring
Interaction
Chat
Raise hand
Questions
Admin
Dashboard
User management
Meeting management
Live participant monitor
Attendance reports
Export
Streaming
Embedded stream
Adaptive playback
Low-data mode
Picture-in-Picture where supported
54. Phase 2
Flutter mobile application
Push notifications
Advanced analytics
Reactions
Polls
Meeting announcements
Question moderation
Advanced host controls
Meeting recordings
Replay/archive
Automated reminders
Church-level analytics
55. Phase 3
Native host broadcasting
Multiple hosts
Guest speakers
Breakout sessions
Screen sharing
Presentation sharing
Advanced moderation
AI meeting transcription
AI meeting summaries
Searchable meeting archives
Automatic question categorization
56. Success Metrics
Adoption
Registered users
Active users
Returning users
Meetings
Meetings created
Meetings completed
Average meeting duration
Attendance
Total participants
Average attendance
Peak attendance
Attendance duration
Engagement
Chat messages
Questions
Raised hands
Reactions
Technical
Stream startup time
Stream interruptions
Reconnection rate
Average delivered quality
Error rate
WebSocket disconnect rate
57. Acceptance Criteria
Area	Acceptance Criteria
Registration	A user can create an account; KC Handle cannot be duplicated; required information is validated.
Authentication	A registered user can log in; invalid credentials are rejected; users can securely log out.
Meeting	An authenticated participant with an active meeting is automatically taken to the meeting; the live host stream is displayed; title, name, and church are displayed.
Monitoring	The system records meeting entry and exit; administrators can see current participants; the system distinguishes active and inactive participants.
Chat	Users can send messages; messages appear in real time; moderators can moderate messages.
Raise Hand	Users can raise their hands; host/moderator receives the event in real time; host can acknowledge/lower the hand.
Administration	Administrators can create/manage meetings, manage users, view attendance, and export reports.
Streaming	Host stream can be embedded; player supports adaptive quality; low-data viewing is available; PiP is available where supported.
58. Recommended Development Architecture
                    ┌───────────────────┐
                    │   ADMIN DASHBOARD │
                    └─────────┬─────────┘
                              │
                              ▼
┌──────────────┐       ┌───────────────┐
│ Web Users    │──────▶│   LARAVEL API │
└──────────────┘       │   + LIVEWIRE  │
                       └───────┬───────┘
┌──────────────┐               │
│ Flutter App  │───────────────┘
└──────────────┘
                                │
             ┌──────────────────┼─────────────────┐
             ▼                  ▼                 ▼
          MySQL              Redis            Reverb
                                                 │
                                                 ▼
                                          Real-time Events

                    HOST
                      │
                      ▼
              Streaming Service
                      │
                      ▼
                 Transcoding
                      │
                      ▼
                     CDN
                      │
                      ▼
                 PARTICIPANTS
59. Recommended Laravel Structure
app/
├── Models/
│   ├── User.php
│   ├── Church.php
│   ├── Meeting.php
│   ├── AttendanceSession.php
│   ├── ChatMessage.php
│   ├── Question.php
│   └── RaisedHand.php
│
├── Services/
│   ├── MeetingService.php
│   ├── AttendanceService.php
│   ├── StreamingService.php
│   ├── ChatService.php
│   └── ParticipantPresenceService.php
│
├── Events/
│   ├── ParticipantJoined.php
│   ├── ParticipantLeft.php
│   ├── ChatMessageSent.php
│   └── HandRaised.php
│
├── Jobs/
│   ├── ProcessAttendance.php
│   └── MeetingAnalytics.php
│
└── Livewire/
    ├── Admin/
    ├── Meetings/
    ├── Participants/
    ├── Attendance/
    └── Meeting/
60. Development Priority
19.Sprint 1 — Authentication + User Management
20.Sprint 2 — Meeting Management + Scheduling
21.Sprint 3 — Live Stream Integration
22.Sprint 4 — Participant Presence + Attendance
23.Sprint 5 — Real-Time Chat
24.Sprint 6 — Raise Hand + Questions
25.Sprint 7 — Admin Dashboard + Live Monitor
26.Sprint 8 — Reports + Analytics + Export
27.Sprint 9 — Security Hardening + Performance
28.Sprint 10 — Production Testing + Deployment
61. Final Product Positioning
The platform should not attempt to compete with Zoom technologically in the first release. Its differentiator should be: “A secure organizational meeting platform where every participant is identified, attendance is automatic, and joining a live meeting takes seconds.”
The platform combines Identity + Meeting + Streaming + Attendance + Engagement + Administration into one controlled ecosystem.
The architecture should prioritize Reliability → Simplicity → Low Data Usage → Security → Scalability → Engagement over unnecessary video-conferencing features.

3 things i want to add, first every error should be displayed at the center of the screen, second i want to use the real kingschat logo on the login button. Third how do i add kingschat client id?

show the admin login details.

This is the kc logo. 
Create the application with all the features.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kc-connect-stream.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7ca243b2-2153-48ec-b48d-878a0cfd3fc7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
