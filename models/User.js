import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },

    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true 
    },

    mobile: { 
      type: String, 
      // required: true, 
      // unique: true 
    },

    password: { 
      type: String, 
      required: true 
    },

    role: {
      type: String,
      enum: ["Student", "Teacher", "Admin", "DepartmentAdmin"],
      default: "Student",
    },

    // 🔹 Student-specific fields
    rollNo: { 
      type: String, 
      unique: true, 
      sparse: true 
    }, 

    batch: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Batch" 
    },
    department: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Department" 
    },
    semester: {  //only for student
      type: Number, 
      min: 1 ,
      default:1
    },

    // 🔹 Staff-specific fields (Teacher, DeptAdmin)
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // 🔹 Common field for all users
    profileUrl: { 
      type: String, 
      default: "" 
    },
    outcome: {
      type: {
        type: String,
        enum: ["NET-JRF", "IT", "GovtJob"],
      },
      certificate: {
        type: String, // URL or file path of certificate
        default: "",
      },
    },
    refreshToken: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", userSchema);
