import mongoose from "mongoose";

/**
 * Converts a string to a Mongoose ObjectId if valid.
 * @param {string} id - The string to convert.
 * @returns {mongoose.Types.ObjectId|null} - Returns ObjectId or null if invalid.
 */
const toObjectId = (id) => {
  if (!id) return null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return null;
};

export default toObjectId;
