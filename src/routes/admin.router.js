import { Router } from "express";
// import  {verifyJWT}  from "../middlewares/auth.middleware.js";

// Import controller functions (make sure these are defined in the correct files)
import { login_Admin ,forgotPasswordAdmin ,resetPasswordAdmin ,refreshAccessTokenAdmin ,logoutAdmin} from "../controllers/adminController/auth.controller.js";
import {  dashboardAdmin, getAdminAdvertisements, getAdminCoupons, getAdminPayments, getEChangeRequests, getExpenseTrackerData, getPetInsuranceRequests, getRedDropRequests, getUserList, updateAdminProfile } from "../controllers/adminController/dashboard.controller.js";
import {adminverifyJWT, verifyAdminRefreshToken} from "../middlewares/auth.admin.middleware.js";
import { getAdminProfile } from "../controllers/adminController/getAdminProfile.controller.js";

const router = Router();

/* --------------------- 🔐 Auth Routes --------------------- */
router.post("/login", login_Admin);
// router.post("/forgot-password", forgotPasswordAdmin);
router.post("/refresh-token",verifyAdminRefreshToken, refreshAccessTokenAdmin);
router.post("/logout", adminverifyJWT, logoutAdmin);
router.post("/reset-password",adminverifyJWT, resetPasswordAdmin);

/* --------------------- 📊 Dashboard --------------------- */
// router.post("/dashboard", verifyJWT, dashboardAdmin);

/* --------------------- 👤 Profile --------------------- */
router.get("/profile", adminverifyJWT, getAdminProfile);
router.patch("/editProfile", adminverifyJWT, updateAdminProfile);

/* --------------------- 💳 Payment --------------------- */
// router.get("/payments", verifyJWT, getAdminPayments);

/* --------------------- 🔁 E-Change Requests --------------------- */
// router.get("/echange-requests", verifyJWT, getEChangeRequests);

/* --------------------- 🎟️ Coupons --------------------- */
// router.get("/coupons", verifyJWT, getAdminCoupons);

/* --------------------- 📢 Advertisements --------------------- */
// router.get("/advertisements", verifyJWT, getAdminAdvertisements);

/* --------------------- 🩸 Red Drop --------------------- */
// router.get("/red-drop", verifyJWT, getRedDropRequests);

/* --------------------- 🐶 Pet Insurance --------------------- */
// router.get("/pet-insurance", verifyJWT, getPetInsuranceRequests);

/* --------------------- 👥 User Management --------------------- */
// router.get("/users", verifyJWT, getUserList);

/* --------------------- 💰 Expense Tracker --------------------- */
// router.get("/expense-tracker", verifyJWT, getExpenseTrackerData);

export default router;
