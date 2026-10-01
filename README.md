# Online Verification System for Weighing & Measuring Instruments

### Smart India Hackathon 2026 — Problem Statement 26036

An online system for digitizing the verification and certification process of weighing and measuring instruments under Legal Metrology.

The system is designed to reduce manual paperwork, improve transparency, simplify certificate management, and provide a way to verify certificates online using QR codes.

---

## Project Status

### Current Status: Core System Completed | Tracking & Monitoring in Progress

The main verification and certification workflow has been implemented.

The remaining development is mainly focused on building a more complete tracking, monitoring, notification, and analytics layer around the verification process.

---

# What Has Been Implemented

## 1. Authentication & Role-Based Access

The system supports different user roles:

- Admin
- Legal Metrology Officer (LMO)
- Government Approved Test Centre (GATC)
- Business/User

Each role has different permissions and access to different parts of the system.

### Implemented

- Login system
- JWT-based authentication
- Role-based access control
- Protected API routes
- Role-specific dashboards
- Business ownership protection
- Officer ownership protection

---

## 2. Business/User Management

LMO and GATC users can onboard business users into the system.

### Implemented

- Add Business User
- Business registration
- Business information management
- Role restrictions
- Business-specific access control
- Prevention of unauthorized access to another business's records

---

## 3. Instrument Management

Businesses can maintain their weighing and measuring instruments in the system.

### Instrument Information

Examples include:

- Instrument ID
- Instrument type
- Manufacturer
- Model
- Serial number
- Capacity
- Location
- Status
- Verification history

---

### Workflow

```text
Business
   |
   v
LMO / GATC
   |
   v
Select Instrument
   |
   v
Verification
   |
   v
Observations
   |
   v
PASS / FAIL
   |
   +----------------+
   |                |
  PASS              FAIL
   |                |
   v                v
Certificate       Re-verification
   |
   v
QR Verification
