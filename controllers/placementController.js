import Batch from "../models/Batch.js";
import Placement from "../models/Placement.js";
import toObjectId  from "../util/toObjectId.js";
// GET placements (students see their batch, admins see all)
export const getPlacements = async (req, res) => {
  try {
    let placements;

    if (req.user.role === "Student") {
      // Student → only see placements for their batch
      placements = await Placement.find({ batches: req.user.batch })
        .sort({ createdAt: -1 })
        .lean();
    } else if (req.user.role === "DepartmentAdmin") {
      // Department Admin → only see placements for their department
      placements = await Placement.find({ department: req.user.department })
        .sort({ createdAt: -1 })
        .lean();
    } else {
      // HOD or Admin → see all placements
      placements = await Placement.find().sort({ createdAt: -1 }).lean();
    }

    res.json(placements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
// POST a new placement (Dept Admin only)
export const addPlacement = async (req, res) => {
  try {
    if (req.user.role !== "DepartmentAdmin") {
      return res.status(403).json({ message: "Only department admins can add placements" });
    }

    const { company, role, package: pkg, eligibility, description, date, batches } = req.body;

    if (!company || !role || !pkg || !eligibility || !date || !batches || batches.length === 0) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    const newPlacement = new Placement({
      company,
      role,
      package: pkg,
      eligibility,
      description,
      date,
      batches,
      department:req.user.department,
      addedBy: req.user._id,
    });

    await newPlacement.save();
    res.status(201).json({ message: "Placement added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE a placement
export const deletePlacement = async (req, res) => {
  try {
    if (req.user.role !== "DepartmentAdmin") {
      return res.status(403).json({ message: "Only department admins can delete placements" });
    }

    const placement = await Placement.findById(req.params.id);
    if (!placement) return res.status(404).json({ message: "Placement not found" });

    await placement.deleteOne();
    res.json({ message: "Placement deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
export const updatePlacement = async (req, res) => {
  try {
    if (req.user.role !== "DepartmentAdmin") {
      return res.status(403).json({ message: "Only department admins can update placements" });
    }

    const { id } = req.params;
    const { company, role, package: pkg, eligibility, description, date, batches } = req.body;

    const placementId = toObjectId(id); // validate MongoDB ID
    if (!placementId) return res.status(400).json({ message: "Invalid placement ID" });

    const placement = await Placement.findById(placementId);
    if (!placement) return res.status(404).json({ message: "Placement not found" });

    // Only update fields if provided
    if (company) placement.company = company;
    if (role) placement.role = role;
    if (pkg) placement.package = pkg;
    if (eligibility) placement.eligibility = eligibility;
    if (description !== undefined) placement.description = description;
    if (date) placement.date = date;
    if (batches && batches.length > 0) placement.batches = batches;

    await placement.save();

    res.status(200).json({ message: "Placement updated successfully", placement });
  } catch (err) {
    console.error("updatePlacement Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
