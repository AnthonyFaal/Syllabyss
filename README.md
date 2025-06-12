# LearnUp

# 📘 Course API Documentation

## 📌 Overview

The Course API allows users to **create**, **read**, **update**, and **delete** courses in the platform. Thumbnail generation is automatic based on the course title, difficulty, and duration.

---

## 🔐 Authentication

- **Public Routes**:
  - `GET /api/courses`
  - `GET /api/courses/:id`
  - `GET /api/courses/user/:userId?`

- **Protected Routes** (require Bearer Token in headers):
  - `POST /api/courses`
  - `PUT /api/courses/:id`
  - `DELETE /api/courses/:id`

---

## 📂 Endpoints

### ✅ Create Course

`POST /api/courses`

#### Headers:
