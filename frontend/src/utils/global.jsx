// utils/global.js
import { users } from "../models/model";

// Function to login
export function loginUser(email, password) {
  const user = users.find(
    (u) => u.email === email && u.password === password
  );
  if (user) {
    if (!user.is_verified) {
      return { success: false, message: "Account not verified" };
    }
    return { success: true, message: "Login successful", user };
  }
  return { success: false, message: "Invalid credentials" };
}
