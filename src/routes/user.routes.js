import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
import { multerUpload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from '../middlewares/auth.middleware';

const router = Router();

router.route("/register").post(
  multerUpload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route('/login').post(loginUser);
router.route('/logout').post(verifyJWT, logoutUser);
export default router;
