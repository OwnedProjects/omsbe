const constants = {
  MAINTAIN_SESSION: process.env.MAINTAIN_SESSION,
  DATABASE_CONNECTION_FAILED: "Database connection failed",
  DATABASE_QUERY_ISSUE:
    "Database query issue, please check logs for more details",
  NO_DATA_FOUND: "No Data Found",
  FAILED_TRANSACTION: "Insert Transaction Failed",
  NO_FIELDS_TO_UPDATE: "No fields to update",
  FAILED_TO_COMMIT_TRANSACTION: "Failed to commit transaction",
  INVALID_PATIENT_ID: "Invalid Patient ID",
  NO_FILES_UPLOADED: "No Files Uploaded",
  FILES_UPLOADED_SUCCESSFULLY: "Files Uploaded Successfully",
  PATIENT_FILES_DELETED_SUCCESSFULLY: "Patient files deleted successfully.",
  NO_FILES_TO_DELETE: "No files found to delete for the given patient.",
  TREATMENT_SUBMITTED_SUCCESSFULLY: "Treatment submitted successfully.",
  TREATMENT_SUBMISSION_FAILED:
    "Something went wrong, Treatment is NOT submitted.",
};

module.exports = constants;
