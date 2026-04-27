export function generateTestOTP() {
  // For testing, always return 1234
  // In production, this would be handled by backend
  return "1234";
}

export function validateOTP(entered, generated) {
  return entered === generated;
}