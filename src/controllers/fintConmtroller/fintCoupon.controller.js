
import Joi from "joi";
import Coupon from "../../models/coupon/coupon.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import mongoose from "mongoose";

// ✅ 1. Joi schema for coupon validation
const couponSchema = Joi.object({
  couponTitle: Joi.string().trim().required(),
  logo: Joi.string().uri().optional().allow(null, ""),
  offerTitle: Joi.string().trim().required(),
  offerDescription: Joi.string().trim().required(),
  termsAndConditions: Joi.string().trim().required(),
  expiryDate: Joi.date().required(),
  offerDetails: Joi.string().optional().allow(""),
  aboutCompany: Joi.string().optional().allow(""),
  claimPercentage: Joi.number().min(0).max(100).optional(),
  createdBy: Joi.string().optional(), // ✅ make optional
}).unknown(true); // ✅ Allow extra fields like createdBy


const editCouponSchema = Joi.object({
  couponTitle: Joi.string().min(3).optional(),
  couponCode: Joi.string().alphanum().min(3).optional(),
  discountType: Joi.string().optional(),
  discountValue: Joi.number().min(0).optional(),
  expiryDate: Joi.date().optional(),

  logo: Joi.string().optional().allow(null, ""),

  // ✅ Add the following fields
  offerTitle: Joi.string().optional(),
  offerDescription: Joi.string().optional(),
  termsAndConditions: Joi.string().optional(),
  offerDetails: Joi.string().optional(),
  aboutCompany: Joi.string().optional(),
});


// ✅ 2. Controller to handle creation
export const createCoupon = asyncHandler(async (req, res) => {
  const logoUrl = req.file ? req.file.path || req.file.location : null;
  const ventureId = req.venture?._id;

  const formData = {
    ...req.body,
    logo: logoUrl,
    createdBy: ventureId.toString(), // ✅ Convert to string
  };

  const { error, value } = couponSchema.validate(formData, { abortEarly: false });

  if (error) {
    throw new ApiError(
      400,
      "Validation error",
      error.details.map((err) => err.message)
    );
  }

  const newCoupon = new Coupon(value);
  const savedCoupon = await newCoupon.save();

  res
    .status(201)
    .json(new ApiResponse(201, savedCoupon, "Coupon created successfully"));
});

export const getVentureCouponsById = asyncHandler(async (req, res) => {
  console.log("🔐 Venture details from token middleware");

  const ventureId = req.venture?._id;
  console.log("🚀 ~ getVentureCouponsById ~ ventureId:", ventureId);

  if (!mongoose.Types.ObjectId.isValid(ventureId)) {
    throw new ApiError(400, "Invalid Venture ID");
  }

  // ✅ Fetch all coupons created by this venture
  const coupons = await Coupon.find({ createdBy: ventureId }).sort({ createdAt: -1 });

  // ✅ Count by status
  const statusCounts = {
    active: 0,
    expired: 0,
    deleted: 0,
    rejected: 0, 
    claimed: 0
  };

  coupons.forEach((coupon) => {
    const status = coupon.status;
    if (statusCounts[status] !== undefined) {
      statusCounts[status]++;
    }
  });

  // ✅ Response
  res.status(200).json(
    new ApiResponse(
      200,
      {
        total: coupons.length,
        statusCounts,
        coupons,
      },
      `Coupons created by Venture ${ventureId} fetched successfully`
    )
  );
});
export const editCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existingCoupon = await Coupon.findById(id);
  if (!existingCoupon) {
    throw new ApiError(404, "Coupon not found");
  }

  // 🖼️ Handle logo update (optional)
  const logoUrl = req.file ? req.file.path || req.file.location : existingCoupon.logo;

  // Combine fields from request
  const updatedData = {
    ...req.body,
    logo: logoUrl,
  };

  // Joi Validation
  const { error, value } = editCouponSchema.validate(updatedData, { abortEarly: false });

  if (error) {
    throw new ApiError(
      400,
      "Validation failed",
      error.details.map((err) => err.message)
    );
  }

  // Perform the update
  const updatedCoupon = await Coupon.findByIdAndUpdate(id, value, {
    new: true,
    runValidators: true,
  });

  res
    .status(200)
    .json(new ApiResponse(200, updatedCoupon, "Coupon updated successfully"));
});

export const displayCoupons = asyncHandler(async (req, res) => {
  try {
    // 1. Auto-expire any outdated coupons (optional, but useful)
    const now = new Date();
    await Coupon.updateMany(
      { expiryDate: { $lte: now }, status: "active" },
      { $set: { status: "expired" } }
    );

    // 2. Fetch all coupons, sorted by newest first
    const couponsRaw = await Coupon.find().sort({ createdAt: -1 });

    // 3. Format for frontend (optional)
    const coupons = couponsRaw.map((coupon) => ({
      id: coupon._id,
      title: coupon.couponTitle,
      logo: coupon.logo,
      offerTitle: coupon.offerTitle,
      offerDescription: coupon.offerDescription,
      expiryDate: coupon.expiryDate,
      status: coupon.status,
      claimPercentage: coupon.claimPercentage,
      viewCount: coupon.viewCount,
      createdAt: coupon.createdAt,
    }));

    // 4. Group by status
    const statusCounts = await Coupon.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const statusSummary = statusCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // 5. Return response
    res.status(200).json(
      new ApiResponse(200, {
        couponCount: coupons.length,
        statusSummary, // { active: X, expired: Y, ... }
        coupons,
      }, "Coupons fetched successfully.")
    );
  } catch (error) {
    throw new ApiError(500, "Failed to fetch coupons", [error.message]);
  }
});

export const displayDeletedCoupons = asyncHandler(async (req, res) => {
  // 1. Fetch coupons with status "deleted"
  const deletedCoupons = await Coupon.find({ status: "deleted" }).sort({ createdAt: -1 });

  // 2. Format response (optional - customize fields)
  const coupons = deletedCoupons.map(coupon => ({
    id: coupon._id,
    title: coupon.couponTitle,
    logo: coupon.logo,
    offerTitle: coupon.offerTitle,
    offerDescription: coupon.offerDescription,
    expiryDate: coupon.expiryDate,
    claimPercentage: coupon.claimPercentage,
    viewCount: coupon.viewCount,
    createdAt: coupon.createdAt,
    status: coupon.status
  }));

  // 3. Respond
  res.status(200).json(
    new ApiResponse(200, {
      count: coupons.length,
      coupons,
    }, "Deleted coupons fetched successfully.")
  );
});

export const displayVentureExpiredCoupons = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // ✅ Validate ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid Venture ID");
  }

  // ✅ Find all expired coupons for that venture
  const expiredCoupons = await Coupon.find({
    createdByVenture: id,
    status: "expired",
  }).sort({ expiryDate: -1 });

  // ✅ Return response
  res.status(200).json(
    new ApiResponse(200, expiredCoupons, "Expired coupons fetched successfully.")
  );
});

export const displayActiveCoupons = asyncHandler(async (req, res) => {
  // 1. Find coupons with status "active"
  const activeCoupons = await Coupon.find({ status: "active" }).sort({ createdAt: -1 });

  // 2. Format response data
  const coupons = activeCoupons.map(coupon => ({
    id: coupon._id,
    title: coupon.couponTitle,
    logo: coupon.logo,
    offerTitle: coupon.offerTitle,
    offerDescription: coupon.offerDescription,
    expiryDate: coupon.expiryDate,
    claimPercentage: coupon.claimPercentage,
    viewCount: coupon.viewCount,
    createdAt: coupon.createdAt,
    status: coupon.status
  }));

  // 3. Send response
  res.status(200).json(
    new ApiResponse(200, {
      count: coupons.length,
      coupons,
    }, "Active coupons fetched successfully.")
  );
});

export const displayExpiredCoupons = asyncHandler(async (req, res) => {
  // 1. Find coupons with status "expired"
  const expiredCoupons = await Coupon.find({ status: "expired" }).sort({ createdAt: -1 });

  // 2. Format response data if needed
  const coupons = expiredCoupons.map(coupon => ({
    id: coupon._id,
    title: coupon.couponTitle,
    logo: coupon.logo,
    offerTitle: coupon.offerTitle,
    offerDescription: coupon.offerDescription,
    expiryDate: coupon.expiryDate,
    claimPercentage: coupon.claimPercentage,
    viewCount: coupon.viewCount,
    createdAt: coupon.createdAt,
    status: coupon.status
  }));

  // 3. Send response
  res.status(200).json(
    new ApiResponse(200, {
      count: coupons.length,
      coupons,
    }, "Expired coupons fetched successfully.")
  );
});

export const getUserCouponsById = () =>{

}
export const displayCouponDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    console.error("❌ Error fetching coupon details:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});




export const rejectCouponById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // 1. Find the coupon
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    throw new ApiError(404, "Coupon not found");
  }

  // 2. Update status to "rejected"
  coupon.status = "rejected";
  await coupon.save();

  // 3. Send response
  res.status(200).json(
    new ApiResponse(200, coupon, "Coupon status updated to 'rejected'")
  );
});
export const deleteCouponById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // 1. Find the coupon by ID
  const coupon = await Coupon.findById(id);

  // 2. Handle not found
  if (!coupon) {
    throw new ApiError(404, "Coupon not found");
  }

  // 3. Update status to "deleted"
  coupon.status = "deleted";
  await coupon.save();

  // 4. Respond
  res.status(200).json(
    new ApiResponse(200, coupon, "Coupon status updated to 'deleted'")
  );
});

